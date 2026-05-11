'use client'

import { useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Trash2, Upload } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn, formatDate } from '@/lib/utils'
import { PHOTO_PHASES, ROOM_TYPES, type PhotoPhase, type RoomType } from '@/lib/constants'
import { deletePhoto, recordPhoto } from '../../app/(app)/projects/[id]/actions'
import { createClient } from '@/lib/supabase/client'
import type { ProjectPhotoRow } from '@/types/project'

interface PhotoView extends ProjectPhotoRow {
  signedUrl: string | null
}

interface Props {
  projectId: string
  photos: PhotoView[]
}

export function PhotoGallery({ projectId, photos }: Props) {
  const [roomFilter, setRoomFilter] = useState<'all' | RoomType>('all')
  const [phaseFilter, setPhaseFilter] = useState<'all' | PhotoPhase>('all')
  const [pending, startTransition] = useTransition()
  const [phaseForUpload, setPhaseForUpload] = useState<PhotoPhase>('during')
  const [roomForUpload, setRoomForUpload] = useState<RoomType | ''>('')
  const [uploading, setUploading] = useState(false)

  const filtered = useMemo(
    () =>
      photos.filter((p) => {
        if (roomFilter !== 'all' && p.room_area !== roomFilter) return false
        if (phaseFilter !== 'all' && p.phase !== phaseFilter) return false
        return true
      }),
    [photos, roomFilter, phaseFilter]
  )

  async function handleFile(file: File) {
    setUploading(true)
    try {
      // 1. Request signed upload URL.
      const res = await fetch('/api/uploads/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bucket: 'project-photos',
          project_id: projectId,
          filename: file.name,
          phase: phaseForUpload,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Could not get signed URL.')
      }
      const { path, token } = (await res.json()) as { path: string; token: string }

      // 2. Upload directly to Supabase Storage.
      const supabase = createClient()
      const { error: uploadErr } = await supabase.storage
        .from('project-photos')
        .uploadToSignedUrl(path, token, file, { contentType: file.type })
      if (uploadErr) throw uploadErr

      // 3. Record the photo row.
      const result = await recordPhoto(projectId, {
        storage_path: path,
        room_area: roomForUpload || null,
        phase: phaseForUpload,
        caption: null,
        thumbnail_path: null,
        taken_at: null,
      })
      if ('error' in result) throw new Error(result.error)
      toast.success('Photo uploaded.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-md border bg-muted/30 p-4">
        <div className="grid gap-3 sm:grid-cols-3 sm:gap-4 flex-1">
          <FilterField label="Phase">
            <Select value={phaseForUpload} onValueChange={(v) => setPhaseForUpload(v as PhotoPhase)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PHOTO_PHASES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Room (optional)">
            <Select
              value={roomForUpload || '__none__'}
              onValueChange={(v) =>
                setRoomForUpload(!v || v === '__none__' ? '' : (v as RoomType))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {ROOM_TYPES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Upload">
            <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border bg-background px-3 text-sm hover:bg-muted">
              <Upload className="h-4 w-4" />
              {uploading ? 'Uploading…' : 'Choose file'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                className="sr-only"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFile(file)
                  e.target.value = ''
                }}
              />
            </label>
          </FilterField>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="text-muted-foreground">Filter:</span>
        <FilterPill active={phaseFilter === 'all'} onClick={() => setPhaseFilter('all')}>
          All phases
        </FilterPill>
        {PHOTO_PHASES.map((p) => (
          <FilterPill key={p} active={phaseFilter === p} onClick={() => setPhaseFilter(p)}>
            {p}
          </FilterPill>
        ))}
        <span className="mx-2 h-4 w-px bg-border" />
        <Select
          value={roomFilter}
          onValueChange={(v) => setRoomFilter(v as 'all' | RoomType)}
        >
          <SelectTrigger className="h-7 w-44 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All rooms</SelectItem>
            {ROOM_TYPES.map((r) => (
              <SelectItem key={r} value={r}>
                {r.replace(/_/g, ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-md border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          No photos yet. Upload the first one to start the photo log.
        </p>
      ) : (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((photo) => (
            <PhotoTile
              key={photo.id}
              photo={photo}
              projectId={projectId}
              pending={pending}
              onDelete={() =>
                startTransition(async () => {
                  const result = await deletePhoto(photo.id, projectId, photo.storage_path)
                  if ('error' in result) toast.error(result.error)
                })
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}

function PhotoTile({
  photo,
  pending,
  onDelete,
}: {
  photo: PhotoView
  projectId: string
  pending: boolean
  onDelete: () => void
}) {
  return (
    <div className="group relative overflow-hidden rounded-md border bg-card">
      {photo.signedUrl ? (
        // Using a plain <img> keeps the signed-URL flow simple without
        // configuring next.config remotePatterns for every preview URL.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo.signedUrl}
          alt={photo.caption ?? 'project photo'}
          className="aspect-square w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex aspect-square w-full items-center justify-center bg-muted text-xs text-muted-foreground">
          (preview unavailable)
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
        <div className="flex items-center justify-between">
          <div>
            {photo.phase ? <Badge variant="secondary">{photo.phase}</Badge> : null}
            {photo.room_area ? (
              <span className="ml-1">{photo.room_area.replace(/_/g, ' ')}</span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            aria-label="Delete photo"
            className="rounded p-1 hover:bg-white/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="mt-0.5 text-[10px] opacity-80">{formatDate(photo.created_at)}</p>
      </div>
    </div>
  )
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  )
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-2.5 py-0.5 transition-colors',
        active ? 'border-primary bg-primary/10' : 'border-transparent hover:bg-muted'
      )}
    >
      {children}
    </button>
  )
}

// Unused; keep to silence lint warning about Input import being optional.
void Input

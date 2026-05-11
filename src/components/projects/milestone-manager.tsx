'use client'

import { useState, useTransition } from 'react'
import { useForm, Controller, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn, formatDate } from '@/lib/utils'
import { MILESTONE_STATUSES, type MilestoneStatus } from '@/lib/constants'
import {
  milestoneInsertSchema,
  type MilestoneInput,
} from '@/types/schemas/milestone'
import { addMilestone, deleteMilestone, updateMilestone } from '../../app/(app)/projects/[id]/actions'
import type { ProjectMilestoneRow } from '@/types/project'

interface Props {
  projectId: string
  milestones: ProjectMilestoneRow[]
  contractors: { id: string; name: string; trade: string | null }[]
}

const STATUS_COLOR: Record<MilestoneStatus, string> = {
  not_started: 'bg-muted-foreground/30',
  in_progress: 'bg-blue-500',
  complete: 'bg-emerald-500',
  blocked: 'bg-red-500',
}

export function MilestoneManager({ projectId, milestones, contractors }: Props) {
  const [showAdd, setShowAdd] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {milestones.length} milestone{milestones.length === 1 ? '' : 's'}
        </h3>
        <Button size="sm" variant="outline" onClick={() => setShowAdd((v) => !v)}>
          <Plus className="h-4 w-4" />
          {showAdd ? 'Cancel' : 'Add milestone'}
        </Button>
      </div>

      {showAdd ? (
        <AddMilestoneForm
          projectId={projectId}
          contractors={contractors}
          onDone={() => setShowAdd(false)}
        />
      ) : null}

      {milestones.length > 0 ? <GanttStrip milestones={milestones} /> : null}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-6" />
              <TableHead>Milestone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>End</TableHead>
              <TableHead>Contractor</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {milestones.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                  No milestones yet. Add the first one to plot the timeline.
                </TableCell>
              </TableRow>
            ) : (
              milestones.map((m) => (
                <MilestoneRow
                  key={m.id}
                  projectId={projectId}
                  milestone={m}
                  contractors={contractors}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function MilestoneRow({
  projectId,
  milestone,
  contractors,
}: {
  projectId: string
  milestone: ProjectMilestoneRow
  contractors: { id: string; name: string; trade: string | null }[]
}) {
  const [pending, startTransition] = useTransition()
  const status = milestone.status as MilestoneStatus

  const update = (patch: { status?: MilestoneStatus }) => {
    startTransition(async () => {
      const result = await updateMilestone(milestone.id, projectId, patch)
      if ('error' in result) toast.error(result.error)
    })
  }

  const onDelete = () => {
    if (!confirm('Delete this milestone?')) return
    startTransition(async () => {
      const result = await deleteMilestone(milestone.id, projectId)
      if ('error' in result) toast.error(result.error)
    })
  }

  return (
    <TableRow>
      <TableCell>
        <span className={cn('inline-block h-2 w-2 rounded-full', STATUS_COLOR[status])} />
      </TableCell>
      <TableCell className="font-medium">{milestone.name}</TableCell>
      <TableCell>
        <Select
          value={status}
          onValueChange={(v) => update({ status: v as MilestoneStatus })}
          disabled={pending}
        >
          <SelectTrigger className="h-8 w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MILESTONE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace('_', ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="text-muted-foreground">{formatDate(milestone.start_date)}</TableCell>
      <TableCell className="text-muted-foreground">{formatDate(milestone.end_date)}</TableCell>
      <TableCell className="text-muted-foreground">
        {contractors.find((c) => c.id === milestone.contractor_id)?.name ?? '—'}
      </TableCell>
      <TableCell>
        <Button variant="ghost" size="icon" onClick={onDelete} disabled={pending}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  )
}

function AddMilestoneForm({
  projectId,
  contractors,
  onDone,
}: {
  projectId: string
  contractors: { id: string; name: string; trade: string | null }[]
  onDone: () => void
}) {
  const [pending, startTransition] = useTransition()
  const form = useForm<MilestoneInput>({
    resolver: zodResolver(milestoneInsertSchema) as unknown as Resolver<MilestoneInput>,
    defaultValues: {
      name: '',
      description: '',
      start_date: null,
      end_date: null,
      contractor_id: null,
      status: 'not_started',
      sort_order: 0,
      notes: null,
    },
    mode: 'onTouched',
  })

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await addMilestone(projectId, values)
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success('Milestone added.')
      form.reset()
      onDone()
    })
  })

  return (
    <form onSubmit={onSubmit} className="rounded-md border bg-muted/30 p-4 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" error={form.formState.errors.name?.message}>
          <Input placeholder="e.g. Demolition" {...form.register('name')} />
        </Field>
        <Field label="Contractor (optional)">
          <Controller
            name="contractor_id"
            control={form.control}
            render={({ field }) => (
              <Select
                value={field.value ?? ''}
                onValueChange={(v) => field.onChange(v === '' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  {contractors.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.trade ? `· ${c.trade}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <Field label="Start date">
          <Input type="date" {...form.register('start_date')} />
        </Field>
        <Field label="End date">
          <Input type="date" {...form.register('end_date')} />
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save milestone'}
        </Button>
      </div>
    </form>
  )
}

function GanttStrip({ milestones }: { milestones: ProjectMilestoneRow[] }) {
  // Compute timeline bounds from milestone start/end dates.
  const dates = milestones.flatMap((m) => [m.start_date, m.end_date]).filter(Boolean) as string[]
  if (dates.length < 2) return null
  const min = Math.min(...dates.map((d) => new Date(d).getTime()))
  const max = Math.max(...dates.map((d) => new Date(d).getTime()))
  const span = Math.max(1, max - min)

  return (
    <div className="space-y-2 rounded-md border p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Timeline
      </p>
      <div className="space-y-1.5">
        {milestones.map((m) => {
          if (!m.start_date || !m.end_date) {
            return (
              <div key={m.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-32 truncate">{m.name}</span>
                <span className="italic">(no dates)</span>
              </div>
            )
          }
          const start = new Date(m.start_date).getTime()
          const end = new Date(m.end_date).getTime()
          const left = ((start - min) / span) * 100
          const width = Math.max(2, ((end - start) / span) * 100)
          const status = m.status as MilestoneStatus
          return (
            <div key={m.id} className="flex items-center gap-2 text-xs">
              <span className="w-32 shrink-0 truncate" title={m.name}>
                {m.name}
              </span>
              <div className="relative h-3 flex-1 rounded-full bg-muted">
                <div
                  className={cn('absolute h-full rounded-full', STATUS_COLOR[status])}
                  style={{ left: `${left}%`, width: `${width}%` }}
                />
              </div>
              <span className="w-32 shrink-0 text-right text-muted-foreground">
                {formatDate(m.start_date)} → {formatDate(m.end_date)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}

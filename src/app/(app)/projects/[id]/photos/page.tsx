import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { PhotoGallery } from '@/components/projects/photo-gallery'
import type { ProjectPhotoRow } from '@/types/project'

export default async function PhotosPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const supabase = await createClient()
  const { data: project } = await supabase
    .from('project')
    .select('id')
    .eq('id', id)
    .single()
  if (!project) notFound()

  const { data: photos } = await supabase
    .from('project_photo')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: false })

  // Sign each photo's URL for viewing (5 min TTL).
  const withUrls = await Promise.all(
    (photos ?? []).map(async (p) => {
      const { data: signed } = await supabase.storage
        .from('project-photos')
        .createSignedUrl(p.storage_path, 300)
      return { ...p, signedUrl: signed?.signedUrl ?? null }
    })
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Photos</CardTitle>
      </CardHeader>
      <CardContent>
        <PhotoGallery
          projectId={id}
          photos={withUrls as (ProjectPhotoRow & { signedUrl: string | null })[]}
        />
      </CardContent>
    </Card>
  )
}

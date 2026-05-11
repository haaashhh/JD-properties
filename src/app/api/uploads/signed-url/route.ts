import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const bodySchema = z.object({
  bucket: z.enum(['project-photos']),
  project_id: z.string().uuid(),
  filename: z.string().min(1).max(200),
  phase: z.enum(['before', 'during', 'after']).optional(),
})

// Issues a one-shot signed upload URL for the project-photos bucket. The
// storage RLS policies enforce that the path's first segment is one of the
// user's org IDs; we build the path here so the client can't tamper with it.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })

  const json = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  // Confirm the user belongs to the org that owns this project.
  const { data: project } = await supabase
    .from('project')
    .select('organization_id')
    .eq('id', parsed.data.project_id)
    .single()
  if (!project) {
    return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
  }

  const ext = parsed.data.filename.split('.').pop()?.toLowerCase() ?? 'jpg'
  const safeExt = ext.replace(/[^a-z0-9]/g, '') || 'jpg'
  const uuid = crypto.randomUUID()
  const phasePart = parsed.data.phase ?? 'during'
  const path = `${project.organization_id}/${parsed.data.project_id}/${phasePart}/${uuid}.${safeExt}`

  const { data, error } = await supabase.storage
    .from(parsed.data.bucket)
    .createSignedUploadUrl(path)

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Could not sign URL.' }, { status: 500 })
  }

  return NextResponse.json({
    bucket: parsed.data.bucket,
    path,
    token: data.token,
    signedUrl: data.signedUrl,
  })
}

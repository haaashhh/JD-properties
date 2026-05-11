import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const bodySchema = z.object({
  bucket: z.enum(['project-photos', 'receipts']),
  project_id: z.string().uuid(),
  filename: z.string().min(1).max(200),
  phase: z.enum(['before', 'during', 'after']).optional(),
})

// Issues a one-shot signed upload URL for either the project-photos bucket
// (room/phase tagged) or the receipts bucket (per-expense). Storage RLS
// enforces that the path's first segment is one of the user's org IDs; we
// build the path server-side so the client can't tamper with it.
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

  // Confirm the user's org owns this project (RLS will reject reads otherwise).
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

  // Path layout per bucket:
  //   project-photos: {org_id}/{project_id}/{phase}/{uuid}.{ext}
  //   receipts:       {org_id}/{project_id}/expenses/{uuid}.{ext}
  const pathSegment =
    parsed.data.bucket === 'project-photos' ? parsed.data.phase ?? 'during' : 'expenses'
  const path = `${project.organization_id}/${parsed.data.project_id}/${pathSegment}/${uuid}.${safeExt}`

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

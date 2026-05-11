'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  projectFormSchema,
  stageUpdateSchema,
  type ProjectFormValues,
} from '@/types/schemas/project'

export type ActionResult<T = unknown> = ({ ok: true } & T) | { error: string }

type SessionFailure = { error: string }
type SessionSuccess = {
  supabase: Awaited<ReturnType<typeof createClient>>
  userId: string
  organizationId: string
  role: string
}

async function getSession(): Promise<SessionFailure | SessionSuccess> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: membership } = await supabase
    .from('organization_member')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .limit(1)
    .single()
  if (!membership) return { error: 'No organization found.' }

  return { supabase, userId: user.id, organizationId: membership.organization_id, role: membership.role }
}

export async function createProject(
  input: ProjectFormValues
): Promise<ActionResult<{ projectId: string }>> {
  const parsed = projectFormSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Invalid form: please review the highlighted fields.' }
  }

  const session = await getSession()
  if ('error' in session) return { error: session.error }
  const { supabase, userId, organizationId } = session

  let propertyId: string
  let createdPropertyId: string | null = null

  if (parsed.data.property_mode === 'existing') {
    if (!parsed.data.property_id) {
      return { error: 'Pick a property first.' }
    }
    propertyId = parsed.data.property_id
  } else {
    if (
      !parsed.data.address_line1 ||
      !parsed.data.city ||
      !parsed.data.state ||
      !parsed.data.zip
    ) {
      return { error: 'Address fields are required when creating a new property.' }
    }
    const { data: prop, error: propErr } = await supabase
      .from('property')
      .insert({
        organization_id: organizationId,
        address_line1: parsed.data.address_line1,
        address_line2: parsed.data.address_line2 ?? null,
        city: parsed.data.city,
        state: parsed.data.state.toUpperCase(),
        zip: parsed.data.zip,
        property_type: parsed.data.property_type,
        created_by: userId,
      })
      .select('id')
      .single()
    if (propErr) {
      if (propErr.code === '23505') {
        return {
          error: 'A property at this address already exists. Pick "Existing property" instead.',
        }
      }
      return { error: propErr.message }
    }
    propertyId = prop.id
    createdPropertyId = prop.id
  }

  const { data: project, error: projErr } = await supabase
    .from('project')
    .insert({
      organization_id: organizationId,
      property_id: propertyId,
      deal_analysis_id: parsed.data.deal_analysis_id ?? null,
      name: parsed.data.name,
      pipeline_stage: parsed.data.pipeline_stage,
      contingency_pct: parsed.data.contingency_pct,
      notes: parsed.data.notes ?? null,
      created_by: userId,
    })
    .select('id')
    .single()

  if (projErr || !project) {
    if (createdPropertyId) {
      await supabase.from('property').delete().eq('id', createdPropertyId)
    }
    return { error: projErr?.message ?? 'Could not create project.' }
  }

  revalidatePath('/projects')
  revalidatePath(`/projects/${project.id}`)
  redirect(`/projects/${project.id}`)
}

export async function moveProjectStage(
  projectId: string,
  stage: string
): Promise<ActionResult> {
  const parsed = stageUpdateSchema.safeParse({ pipeline_stage: stage })
  if (!parsed.success) return { error: 'Invalid stage.' }

  const session = await getSession()
  if ('error' in session) return { error: session.error }
  const { supabase } = session

  const { error } = await supabase
    .from('project')
    .update({ pipeline_stage: parsed.data.pipeline_stage })
    .eq('id', projectId)
  if (error) return { error: error.message }

  revalidatePath('/projects')
  revalidatePath(`/projects/${projectId}`)
  return { ok: true }
}

export async function archiveProject(projectId: string): Promise<ActionResult> {
  const session = await getSession()
  if ('error' in session) return { error: session.error }
  const { supabase } = session

  const { error } = await supabase
    .from('project')
    .update({ status: 'cancelled' })
    .eq('id', projectId)
  if (error) return { error: error.message }

  revalidatePath('/projects')
  revalidatePath(`/projects/${projectId}`)
  return { ok: true }
}

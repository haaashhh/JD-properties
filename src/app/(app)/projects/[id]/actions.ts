'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  milestoneInsertSchema,
  milestonePatchSchema,
  type MilestoneInput,
  type MilestonePatch,
} from '@/types/schemas/milestone'
import {
  taskInsertSchema,
  taskPatchSchema,
  type TaskInput,
  type TaskPatch,
} from '@/types/schemas/task'
import { photoInsertSchema, type PhotoInput } from '@/types/schemas/photo'

export type ActionResult<T = unknown> = ({ ok: true } & T) | { error: string }

type SessionFailure = { error: string }
type SessionSuccess = {
  supabase: Awaited<ReturnType<typeof createClient>>
  userId: string
  organizationId: string
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
  return { supabase, userId: user.id, organizationId: membership.organization_id }
}

// ─── Milestones ──────────────────────────────────────────────────────────
export async function addMilestone(
  projectId: string,
  input: MilestoneInput
): Promise<ActionResult<{ milestoneId: string }>> {
  const parsed = milestoneInsertSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid milestone.' }
  const session = await getSession()
  if ('error' in session) return { error: session.error }
  const { supabase, organizationId } = session

  const { data, error } = await supabase
    .from('project_milestone')
    .insert({ project_id: projectId, organization_id: organizationId, ...parsed.data })
    .select('id')
    .single()
  if (error || !data) return { error: error?.message ?? 'Could not save milestone.' }

  revalidatePath(`/projects/${projectId}/schedule`)
  return { ok: true, milestoneId: data.id }
}

export async function updateMilestone(
  id: string,
  projectId: string,
  patch: MilestonePatch
): Promise<ActionResult> {
  const parsed = milestonePatchSchema.safeParse(patch)
  if (!parsed.success) return { error: 'Invalid milestone patch.' }
  const session = await getSession()
  if ('error' in session) return { error: session.error }
  const { supabase } = session

  const { error } = await supabase.from('project_milestone').update(parsed.data).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/schedule`)
  return { ok: true }
}

export async function deleteMilestone(id: string, projectId: string): Promise<ActionResult> {
  const session = await getSession()
  if ('error' in session) return { error: session.error }
  const { supabase } = session
  const { error } = await supabase.from('project_milestone').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/schedule`)
  return { ok: true }
}

// ─── Tasks ───────────────────────────────────────────────────────────────
export async function addTask(
  projectId: string,
  input: TaskInput
): Promise<ActionResult<{ taskId: string }>> {
  const parsed = taskInsertSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid task.' }
  const session = await getSession()
  if ('error' in session) return { error: session.error }
  const { supabase, userId, organizationId } = session

  const { data, error } = await supabase
    .from('project_task')
    .insert({
      project_id: projectId,
      organization_id: organizationId,
      created_by: userId,
      ...parsed.data,
    })
    .select('id')
    .single()
  if (error || !data) return { error: error?.message ?? 'Could not save task.' }

  revalidatePath(`/projects/${projectId}/tasks`)
  return { ok: true, taskId: data.id }
}

export async function updateTask(
  id: string,
  projectId: string,
  patch: TaskPatch
): Promise<ActionResult> {
  const parsed = taskPatchSchema.safeParse(patch)
  if (!parsed.success) return { error: 'Invalid task patch.' }
  const session = await getSession()
  if ('error' in session) return { error: session.error }
  const { supabase } = session
  const { error } = await supabase.from('project_task').update(parsed.data).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/tasks`)
  return { ok: true }
}

export async function deleteTask(id: string, projectId: string): Promise<ActionResult> {
  const session = await getSession()
  if ('error' in session) return { error: session.error }
  const { supabase } = session
  const { error } = await supabase.from('project_task').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/tasks`)
  return { ok: true }
}

export async function toggleTaskStatus(
  id: string,
  projectId: string,
  status: 'todo' | 'in_progress' | 'done'
): Promise<ActionResult> {
  const session = await getSession()
  if ('error' in session) return { error: session.error }
  const { supabase } = session
  const { error } = await supabase.from('project_task').update({ status }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/tasks`)
  return { ok: true }
}

// ─── Photos ──────────────────────────────────────────────────────────────
export async function recordPhoto(
  projectId: string,
  input: PhotoInput
): Promise<ActionResult<{ photoId: string }>> {
  const parsed = photoInsertSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid photo metadata.' }
  const session = await getSession()
  if ('error' in session) return { error: session.error }
  const { supabase, userId, organizationId } = session

  const { data, error } = await supabase
    .from('project_photo')
    .insert({
      project_id: projectId,
      organization_id: organizationId,
      uploaded_by: userId,
      ...parsed.data,
    })
    .select('id')
    .single()
  if (error || !data) return { error: error?.message ?? 'Could not save photo.' }

  revalidatePath(`/projects/${projectId}/photos`)
  return { ok: true, photoId: data.id }
}

export async function deletePhoto(
  id: string,
  projectId: string,
  storagePath: string
): Promise<ActionResult> {
  const session = await getSession()
  if ('error' in session) return { error: session.error }
  const { supabase } = session
  await supabase.storage.from('project-photos').remove([storagePath])
  const { error } = await supabase.from('project_photo').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/photos`)
  return { ok: true }
}

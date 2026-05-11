'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  contractorInsertSchema,
  contractorPatchSchema,
  type ContractorInput,
  type ContractorPatch,
} from '@/types/schemas/contractor'

export type ActionResult<T = unknown> = ({ ok: true } & T) | { error: string }

type SessionFailure = { error: string }
type SessionSuccess = {
  supabase: Awaited<ReturnType<typeof createClient>>
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
  return { supabase, organizationId: membership.organization_id }
}

export async function addContractor(
  input: ContractorInput
): Promise<ActionResult<{ contractorId: string }>> {
  const parsed = contractorInsertSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid contractor.' }
  const session = await getSession()
  if ('error' in session) return { error: session.error }
  const { supabase, organizationId } = session

  const { data, error } = await supabase
    .from('contractor')
    .insert({ organization_id: organizationId, ...parsed.data })
    .select('id')
    .single()
  if (error || !data) return { error: error?.message ?? 'Could not save contractor.' }

  revalidatePath('/contacts')
  return { ok: true, contractorId: data.id }
}

export async function updateContractor(
  id: string,
  patch: ContractorPatch
): Promise<ActionResult> {
  const parsed = contractorPatchSchema.safeParse(patch)
  if (!parsed.success) return { error: 'Invalid contractor patch.' }
  const session = await getSession()
  if ('error' in session) return { error: session.error }
  const { supabase } = session

  const { error } = await supabase.from('contractor').update(parsed.data).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/contacts')
  return { ok: true }
}

export async function deleteContractor(id: string): Promise<ActionResult> {
  const session = await getSession()
  if ('error' in session) return { error: session.error }
  const { supabase } = session

  const { error } = await supabase.from('contractor').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/contacts')
  return { ok: true }
}

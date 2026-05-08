'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  organizationSettingsSchema,
  type OrganizationSettingsInput,
} from '@/types/schemas/organization-settings'

export type ActionResult = { ok: true } | { error: string }

export async function updateOrganizationSettings(
  input: OrganizationSettingsInput
): Promise<ActionResult> {
  const parsed = organizationSettingsSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Invalid settings: please check the values you entered.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: membership, error: memberErr } = await supabase
    .from('organization_member')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .limit(1)
    .single()
  if (memberErr || !membership) return { error: 'No organization found for this user.' }
  if (membership.role !== 'owner' && membership.role !== 'admin') {
    return { error: 'Only owners and admins can change workspace defaults.' }
  }

  const { error } = await supabase
    .from('organization_settings')
    .update(parsed.data)
    .eq('organization_id', membership.organization_id)
  if (error) return { error: error.message }

  revalidatePath('/settings')
  revalidatePath('/deals/new')
  return { ok: true }
}

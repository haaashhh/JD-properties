import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export function adminClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export const TEST_ADMIN_EMAIL = 'admin@properties-by-jd.local'

export async function getTestOrgAndUser() {
  const admin = adminClient()
  const { data: list } = await admin.auth.admin.listUsers()
  const user = list?.users.find((u) => u.email === TEST_ADMIN_EMAIL)
  if (!user) {
    throw new Error(
      `Test admin user not found. Run \`node --env-file=.env.local scripts/create-test-user.mjs\` first.`
    )
  }
  const { data: member } = await admin
    .from('organization_member')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .single()
  if (!member) throw new Error('Test admin has no organization_member row.')
  return { admin, userId: user.id, organizationId: member.organization_id, role: member.role }
}

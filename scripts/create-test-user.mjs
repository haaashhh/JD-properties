// One-off: provisions a confirmed admin user for local testing.
// Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from env.
// Usage: node --env-file=.env.local scripts/create-test-user.mjs

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const email = process.argv[2] ?? 'admin@properties-by-jd.local'
const password = process.argv[3] ?? 'JDAdmin2026!'
const fullName = process.argv[4] ?? 'JD Admin'

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: fullName },
})

if (error) {
  if (error.message?.includes('already been registered')) {
    console.log(`User ${email} already exists. Listing memberships…`)
    const { data: list } = await admin.auth.admin.listUsers()
    const existing = list?.users.find((u) => u.email === email)
    if (existing) {
      const { data: membership } = await admin
        .from('organization_member')
        .select('role, organization_id, organization(name, slug)')
        .eq('user_id', existing.id)
      console.log(JSON.stringify({ id: existing.id, email, membership }, null, 2))
      console.log(`\nLog in with:\n  ${email}\n  ${password}`)
      process.exit(0)
    }
  }
  console.error('Failed to create user:', error.message)
  process.exit(1)
}

const userId = data.user.id

// Verify the signup trigger fired and gave us an org with role=owner.
const { data: membership, error: mErr } = await admin
  .from('organization_member')
  .select('role, organization_id, organization(name, slug)')
  .eq('user_id', userId)

if (mErr) {
  console.error('Created user but membership lookup failed:', mErr.message)
  process.exit(1)
}

console.log('✓ Created confirmed admin user.')
console.log(JSON.stringify({ id: userId, email, fullName, membership }, null, 2))
console.log(`\nLog in at http://localhost:3000/login with:\n  ${email}\n  ${password}`)

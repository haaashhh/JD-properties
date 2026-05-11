import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { createClient } from '@/lib/supabase/server'
import { TemplatesList } from './templates-list'

export default async function TemplatesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: membership } = await supabase
    .from('organization_member')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .limit(1)
    .single()
  const orgId = membership?.organization_id ?? null

  const { data: templates } = orgId
    ? await supabase
        .from('budget_template')
        .select('id, name, scope_tier, description, is_archived, organization_id, created_at')
        .or(`organization_id.is.null,organization_id.eq.${orgId}`)
        .order('organization_id', { ascending: false, nullsFirst: false })
        .order('name')
    : { data: [] }

  const withCounts = await Promise.all(
    (templates ?? []).map(async (t) => {
      const { count } = await supabase
        .from('budget_template_line')
        .select('id', { count: 'exact', head: true })
        .eq('budget_template_id', t.id)
      return { ...t, line_count: count ?? 0 }
    })
  )

  const canManage = membership?.role === 'owner' || membership?.role === 'admin' || membership?.role === 'member'

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/settings" className="inline-flex items-center gap-1 hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" />
          Settings
        </Link>
      </div>
      <PageHeader
        title="Budget templates"
        description="System templates ship with the workspace. Org templates are editable by owners, admins, and members."
      />
      <TemplatesList templates={withCounts} canManage={canManage} />
    </div>
  )
}

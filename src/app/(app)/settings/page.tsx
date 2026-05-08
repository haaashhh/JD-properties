import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { createClient } from '@/lib/supabase/server'
import { SettingsForm } from './settings-form'

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('organization_member')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!membership) {
    return (
      <div className="space-y-6">
        <PageHeader title="Settings" description="Workspace preferences and integrations." />
        <p className="text-sm text-muted-foreground">No organization is linked to your account.</p>
      </div>
    )
  }

  const { data: settings } = await supabase
    .from('organization_settings')
    .select('*')
    .eq('organization_id', membership.organization_id)
    .single()

  const canEdit = membership.role === 'owner' || membership.role === 'admin'
  const initial = {
    default_arv_pct: Number(settings?.default_arv_pct ?? 70),
    default_contingency_pct: Number(settings?.default_contingency_pct ?? 10),
    default_holding_months: Number(settings?.default_holding_months ?? 6),
    default_sell_commission_pct: Number(settings?.default_sell_commission_pct ?? 5.5),
    over_budget_alert_pct: Number(settings?.over_budget_alert_pct ?? 90),
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Workspace preferences used as defaults across the dashboard."
      />
      <SettingsForm initialValues={initial} canEdit={canEdit} />
    </div>
  )
}

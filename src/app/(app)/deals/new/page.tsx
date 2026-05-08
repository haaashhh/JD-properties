import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { createClient } from '@/lib/supabase/server'
import { DealForm } from './deal-form'

export default async function NewDealPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('organization_member')
    .select('organization_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  const orgId = membership?.organization_id

  const [{ data: properties }, { data: settings }] = await Promise.all([
    orgId
      ? supabase
          .from('property')
          .select('id, address_line1, address_line2, city, state, zip')
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    orgId
      ? supabase
          .from('organization_settings')
          .select('default_arv_pct, default_holding_months, default_sell_commission_pct')
          .eq('organization_id', orgId)
          .single()
      : Promise.resolve({ data: null }),
  ])

  const defaults = {
    default_arv_pct: Number(settings?.default_arv_pct ?? 70),
    default_holding_months: Number(settings?.default_holding_months ?? 6),
    default_sell_commission_pct: Number(settings?.default_sell_commission_pct ?? 5.5),
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Deal"
        description="Run a flip or BRRRR analysis. Numbers update live as you type."
      />
      <DealForm properties={properties ?? []} defaults={defaults} />
    </div>
  )
}

import Link from 'next/link'
import { Calculator, Plus } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/empty-state'
import { createClient } from '@/lib/supabase/server'
import { DealListTable, type DealListRow } from './deal-list-table'

function formatAddress(p: {
  address_line1: string
  address_line2: string | null
  city: string
  state: string
} | null): string {
  if (!p) return '—'
  const line2 = p.address_line2 ? ` ${p.address_line2}` : ''
  return `${p.address_line1}${line2}, ${p.city}, ${p.state}`
}

export default async function DealsPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('deal_analysis_computed')
    .select(
      `id, name, analysis_type, is_archived, created_at, arv_cents, mpp_cents,
       net_profit_cents, roi_pct, profit_margin_pct,
       property:property_id(address_line1, address_line2, city, state)`
    )
    .order('created_at', { ascending: false })

  const rows: DealListRow[] = (data ?? []).map((r) => ({
    id: r.id ?? '',
    name: r.name ?? '',
    analysis_type: r.analysis_type ?? 'flip',
    is_archived: Boolean(r.is_archived),
    created_at: r.created_at,
    arv_cents: r.arv_cents,
    mpp_cents: r.mpp_cents,
    net_profit_cents: r.net_profit_cents,
    roi_pct: r.roi_pct,
    profit_margin_pct: r.profit_margin_pct,
    property_address: formatAddress(
      r.property as {
        address_line1: string
        address_line2: string | null
        city: string
        state: string
      } | null
    ),
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deal Analyzer"
        description="Run flip and BRRRR analyses on potential deals."
        actions={
          <Button
            nativeButton={false}
            render={
              <Link href="/deals/new">
                <Plus className="h-4 w-4" />
                New Deal
              </Link>
            }
          />
        }
      />

      {error ? (
        <p className="text-sm text-destructive">Could not load deals: {error.message}</p>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Calculator}
          title="No deals yet"
          description="Run your first analysis to see Maximum Purchase Price, projected profit, ROI, and the deal score."
          action={{ label: 'Run a deal', href: '/deals/new' }}
        />
      ) : (
        <DealListTable rows={rows} />
      )}
    </div>
  )
}

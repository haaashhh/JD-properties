import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Pencil } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate, formatPercentage } from '@/lib/utils'
import {
  DealResultsPanel,
  type ResultsViewModel,
} from '../deal-results-panel'
import { DealActionsMenu } from './deal-actions-menu'
import { CompTable } from './comps/comp-table'
import type { BRRRRResults, CompRow, FlipResults } from '@/types/deal'

export default async function DealDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: row, error } = await supabase
    .from('deal_analysis_computed')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !row) notFound()

  const { data: property } = row.property_id
    ? await supabase
        .from('property')
        .select('id, address_line1, address_line2, city, state, zip, sqft, bedrooms, bathrooms, year_built, property_type')
        .eq('id', row.property_id)
        .single()
    : { data: null }

  const { data: comps } = await supabase
    .from('comp')
    .select('*')
    .eq('deal_analysis_id', id)
    .order('created_at', { ascending: true })

  const isBrrrr = row.analysis_type === 'brrrr'
  const flipResults: FlipResults = {
    effective_loan_cents: row.effective_loan_cents ?? 0,
    mpp_cents: row.mpp_cents ?? 0,
    origination_fee_cents: row.origination_fee_cents ?? 0,
    total_interest_cents: row.total_interest_cents ?? 0,
    monthly_holding_cost_cents: row.monthly_holding_cost_cents ?? 0,
    total_holding_cents: row.total_holding_cents ?? 0,
    sell_commission_cents: row.sell_commission_cents ?? 0,
    buy_commission_cents: row.buy_commission_cents ?? 0,
    total_acquisition_cents: row.total_acquisition_cents ?? 0,
    total_selling_cents: row.total_selling_cents ?? 0,
    total_project_cost_cents: row.total_project_cost_cents ?? 0,
    net_profit_cents: row.net_profit_cents ?? 0,
    effective_cash_invested_cents: row.effective_cash_invested_cents ?? 0,
    roi_pct: row.roi_pct,
    annualized_roi_pct: row.annualized_roi_pct,
    profit_margin_pct: row.profit_margin_pct,
  }
  const results: FlipResults | BRRRRResults = isBrrrr
    ? {
        ...flipResults,
        refi_loan_amount_cents: row.refi_loan_amount_cents,
        effective_monthly_rent_cents: row.effective_monthly_rent_cents,
      }
    : flipResults

  const vm: ResultsViewModel = {
    analysis_type: (row.analysis_type ?? 'flip') as 'flip' | 'brrrr',
    arv_cents: row.arv_cents ?? 0,
    rehab_estimate_cents: row.rehab_estimate_cents ?? 0,
    purchase_price_cents: row.purchase_price_cents ?? 0,
    buying_closing_costs_cents: row.buying_closing_costs_cents ?? 0,
    selling_closing_costs_cents: row.selling_closing_costs_cents ?? 0,
    staging_costs_cents: row.staging_costs_cents ?? 0,
    other_loan_fees_cents: row.other_loan_fees_cents ?? 0,
    holding_taxes_cents: row.holding_taxes_cents ?? 0,
    holding_insurance_cents: row.holding_insurance_cents ?? 0,
    holding_utilities_cents: row.holding_utilities_cents ?? 0,
    holding_interest_cents: row.holding_interest_cents ?? 0,
    holding_hoa_cents: row.holding_hoa_cents ?? 0,
    holding_other_cents: row.holding_other_cents ?? 0,
    holding_period_months: row.holding_period_months,
    results,
    suggested_arv_cents: row.suggested_arv_cents,
    comp_count: row.comp_count,
  }

  const propertyAddress = property
    ? `${property.address_line1}${property.address_line2 ? ' ' + property.address_line2 : ''}, ${property.city}, ${property.state} ${property.zip}`
    : '—'

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/deals" className="inline-flex items-center gap-1 hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" />
          All deals
        </Link>
      </div>

      <PageHeader
        title={row.name ?? 'Deal'}
        description={propertyAddress}
        actions={
          <div className="flex items-center gap-2">
            {row.is_archived ? (
              <Badge variant="secondary">Archived</Badge>
            ) : null}
            <Badge variant="secondary" className="uppercase">
              {row.analysis_type}
            </Badge>
            <Button
              nativeButton={false}
              variant="outline"
              render={
                <Link href={`/deals/${id}/edit`}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </Link>
              }
            />
            <DealActionsMenu dealId={id} isArchived={row.is_archived ?? false} />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {property ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Property</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
                <Stat label="Address" value={propertyAddress} colSpan={3} />
                <Stat label="Type" value={property.property_type ?? '—'} />
                <Stat label="Square footage" value={property.sqft?.toString() ?? '—'} />
                <Stat label="Year built" value={property.year_built?.toString() ?? '—'} />
                <Stat
                  label="Bed / bath"
                  value={`${property.bedrooms ?? '—'} / ${property.bathrooms ?? '—'}`}
                />
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Inputs</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
              <Stat label="ARV" value={formatCurrency(row.arv_cents)} />
              <Stat label="Purchase price" value={formatCurrency(row.purchase_price_cents)} />
              <Stat label="Rehab estimate" value={formatCurrency(row.rehab_estimate_cents)} />
              <Stat label="ARV %" value={formatPercentage(row.arv_percentage)} />
              <Stat label="Financing" value={(row.financing_type ?? '—').replace('_', ' ')} />
              <Stat
                label="Loan basis"
                value={
                  row.financing_type === 'cash'
                    ? 'cash deal'
                    : row.loan_basis === 'ltv'
                    ? `${formatPercentage(row.loan_to_value_pct)} LTV`
                    : formatCurrency(row.loan_amount_cents)
                }
              />
              <Stat label="Interest rate" value={formatPercentage(row.interest_rate)} />
              <Stat
                label="Loan term"
                value={row.loan_term_months ? `${row.loan_term_months} mo` : '—'}
              />
              <Stat label="Origination" value={formatPercentage(row.origination_points)} />
              <Stat
                label="Holding period"
                value={row.holding_period_months ? `${row.holding_period_months} mo` : '—'}
              />
              <Stat label="Created" value={formatDate(row.created_at)} />
              <Stat label="Updated" value={formatDate(row.updated_at)} />
            </CardContent>
          </Card>

          <CompTable dealId={id} comps={(comps ?? []) as CompRow[]} />
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <DealResultsPanel vm={vm} />
        </aside>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  colSpan,
}: {
  label: string
  value: string
  colSpan?: number
}) {
  return (
    <div className={colSpan === 3 ? 'sm:col-span-3' : undefined}>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-medium">{value}</p>
    </div>
  )
}

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { cn, formatCurrency, formatPercentage } from '@/lib/utils'
import type { BRRRRResults, FlipResults } from '@/types/deal'
import { DealScoreBadge } from './deal-score-badge'

export interface ResultsViewModel {
  analysis_type: 'flip' | 'brrrr'
  arv_cents: number
  rehab_estimate_cents: number
  purchase_price_cents: number
  buying_closing_costs_cents: number
  selling_closing_costs_cents: number
  staging_costs_cents: number
  other_loan_fees_cents: number
  holding_taxes_cents: number
  holding_insurance_cents: number
  holding_utilities_cents: number
  holding_interest_cents: number
  holding_hoa_cents: number
  holding_other_cents: number
  holding_period_months: number | null
  results: FlipResults | BRRRRResults
  comp_count?: number | null
  suggested_arv_cents?: number | null
}

export function DealResultsPanel({ vm }: { vm: ResultsViewModel }) {
  const r = vm.results
  const isBrrrr = vm.analysis_type === 'brrrr'
  const totalHoldingDisplay = r.total_holding_cents + r.total_interest_cents
  const cashLeftInDeal =
    isBrrrr && (r as BRRRRResults).refi_loan_amount_cents != null
      ? r.effective_cash_invested_cents - ((r as BRRRRResults).refi_loan_amount_cents ?? 0)
      : null

  return (
    <Card>
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Projected results</CardTitle>
          <DealScoreBadge
            profitMarginPct={r.profit_margin_pct}
            roiPct={r.roi_pct}
            showLabel
          />
        </div>
        <div className="grid grid-cols-2 gap-3 pt-2 text-sm">
          <Stat label="ARV" value={formatCurrency(vm.arv_cents)} highlight />
          <Stat label="MPP" value={formatCurrency(r.mpp_cents)} highlight />
        </div>
      </CardHeader>
      <CardContent className="space-y-5 text-sm">
        <Section title="Acquisition">
          <Row label="Purchase price" value={formatCurrency(vm.purchase_price_cents)} />
          <Row label="Buying closing" value={formatCurrency(vm.buying_closing_costs_cents)} />
          <Row label="Origination fee" value={formatCurrency(r.origination_fee_cents)} />
          <Row label="Other loan fees" value={formatCurrency(vm.other_loan_fees_cents)} />
          <Row label="Buy commission" value={formatCurrency(r.buy_commission_cents)} />
          <Row label="Total acquisition" value={formatCurrency(r.total_acquisition_cents)} bold />
        </Section>

        <Section title="Rehab">
          <Row label="Rehab estimate" value={formatCurrency(vm.rehab_estimate_cents)} bold />
        </Section>

        <Section
          title={`Holding${
            vm.holding_period_months != null ? ` (over ${vm.holding_period_months} mo)` : ''
          }`}
        >
          <Row label="Taxes" value={formatCurrency(vm.holding_taxes_cents * (vm.holding_period_months ?? 0))} />
          <Row label="Insurance" value={formatCurrency(vm.holding_insurance_cents * (vm.holding_period_months ?? 0))} />
          <Row label="Utilities" value={formatCurrency(vm.holding_utilities_cents * (vm.holding_period_months ?? 0))} />
          <Row label="HOA" value={formatCurrency(vm.holding_hoa_cents * (vm.holding_period_months ?? 0))} />
          <Row label="Other" value={formatCurrency(vm.holding_other_cents * (vm.holding_period_months ?? 0))} />
          <Row label="Loan interest" value={formatCurrency(r.total_interest_cents)} />
          <Row label="Total holding" value={formatCurrency(totalHoldingDisplay)} bold />
        </Section>

        <Section title="Selling">
          <Row label="Selling closing" value={formatCurrency(vm.selling_closing_costs_cents)} />
          <Row label="Sell commission" value={formatCurrency(r.sell_commission_cents)} />
          <Row label="Staging" value={formatCurrency(vm.staging_costs_cents)} />
          <Row label="Total selling" value={formatCurrency(r.total_selling_cents)} bold />
        </Section>

        <Separator className="my-2" />

        <div className="space-y-2">
          <Row label="Total project cost" value={formatCurrency(r.total_project_cost_cents)} />
          <Row label="Cash invested" value={formatCurrency(r.effective_cash_invested_cents)} />
          <Row label="Effective loan" value={formatCurrency(r.effective_loan_cents)} />
        </div>

        <Separator className="my-2" />

        <div className="space-y-2">
          <Row
            label="Net profit"
            value={formatCurrency(r.net_profit_cents)}
            valueClassName={cn(
              'font-semibold',
              r.net_profit_cents < 0 ? 'text-destructive' : 'text-green-600'
            )}
            bold
          />
          <Row label="ROI" value={formatPercentage(r.roi_pct)} />
          <Row label="Annualized ROI" value={formatPercentage(r.annualized_roi_pct)} />
          <Row label="Profit margin" value={formatPercentage(r.profit_margin_pct)} />
        </div>

        {isBrrrr ? (
          <>
            <Separator className="my-2" />
            <Section title="BRRRR exit">
              <Row
                label="Refi loan amount"
                value={formatCurrency((r as BRRRRResults).refi_loan_amount_cents ?? null)}
              />
              <Row label="Cash left in deal" value={formatCurrency(cashLeftInDeal)} />
              <Row
                label="Effective monthly rent"
                value={formatCurrency((r as BRRRRResults).effective_monthly_rent_cents ?? null)}
              />
              <Row
                label="Equity captured"
                value={formatCurrency(
                  (r as BRRRRResults).refi_loan_amount_cents != null
                    ? vm.arv_cents - ((r as BRRRRResults).refi_loan_amount_cents ?? 0)
                    : null
                )}
              />
            </Section>
          </>
        ) : null}

        {vm.suggested_arv_cents != null && (vm.comp_count ?? 0) > 0 ? (
          <>
            <Separator className="my-2" />
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <p className="font-medium">Suggested ARV from comps</p>
              <p className="text-muted-foreground">
                {formatCurrency(vm.suggested_arv_cents)} averaged across {vm.comp_count} included
                comp{vm.comp_count === 1 ? '' : 's'}.
              </p>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  )
}

function Row({
  label,
  value,
  bold,
  valueClassName,
}: {
  label: string
  value: string
  bold?: boolean
  valueClassName?: string
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className={cn(bold ? 'font-medium' : 'text-muted-foreground')}>{label}</span>
      <span className={cn('tabular-nums', bold && 'font-semibold', valueClassName)}>{value}</span>
    </div>
  )
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className={cn('rounded-md border p-3', highlight && 'bg-muted/30')}>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-base font-semibold tabular-nums">{value}</p>
    </div>
  )
}

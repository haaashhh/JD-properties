import type {
  BRRRRInputs,
  BRRRRResults,
  DealScore,
  FlipInputs,
  FlipResults,
} from '@/types/deal'

// These functions MIRROR the SQL view `public.deal_analysis_computed`
// defined in supabase/migrations/0004_deal_analyzer_v1.sql. They are the
// preview oracle for the new-deal form. The view is the source of truth on
// read. When a formula changes, the same PR must update both this file and
// the view, and a manual parity check (form preview vs detail page on a
// freshly saved deal) is required.

// Postgres ::bigint truncates toward zero. Math.trunc mirrors that.
const toBigint = (n: number) => Math.trunc(n)

// MPP = (ARV * arv_percentage / 100) - rehab.
export function calculateMPP(
  arvCents: number,
  rehabCents: number,
  arvPct: number
): number {
  return toBigint((arvCents * arvPct) / 100) - rehabCents
}

function effectiveLoanCents(input: FlipInputs): number {
  if (input.loan_basis === 'ltv' && input.loan_to_value_pct != null) {
    return toBigint((input.purchase_price_cents * input.loan_to_value_pct) / 100)
  }
  return input.loan_amount_cents ?? 0
}

function monthlyHoldingCostCents(input: FlipInputs): number {
  return (
    (input.holding_taxes_cents ?? 0) +
    (input.holding_insurance_cents ?? 0) +
    (input.holding_utilities_cents ?? 0) +
    (input.holding_interest_cents ?? 0) +
    (input.holding_hoa_cents ?? 0) +
    (input.holding_other_cents ?? 0)
  )
}

export function calculateFlipResults(input: FlipInputs): FlipResults {
  const loanCents = effectiveLoanCents(input)
  const points = input.origination_points ?? 0
  const rate = input.interest_rate ?? 0
  const months = input.holding_period_months ?? 0

  const origination_fee_cents = toBigint((loanCents * points) / 100)
  const total_interest_cents = toBigint((loanCents * rate) / 100 / 12 * months)
  const monthly_holding_cost_cents = monthlyHoldingCostCents(input)
  const total_holding_cents = toBigint(monthly_holding_cost_cents * months)

  const sell_commission_cents = toBigint(
    (input.arv_cents * (input.sell_agent_commission_pct ?? 0)) / 100
  )
  const buy_commission_cents = toBigint(
    (input.purchase_price_cents * (input.buy_agent_commission_pct ?? 0)) / 100
  )

  const total_acquisition_cents =
    input.purchase_price_cents +
    (input.buying_closing_costs_cents ?? 0) +
    origination_fee_cents +
    (input.other_loan_fees_cents ?? 0) +
    buy_commission_cents

  const total_selling_cents =
    (input.selling_closing_costs_cents ?? 0) +
    sell_commission_cents +
    (input.staging_costs_cents ?? 0)

  const total_project_cost_cents =
    input.purchase_price_cents +
    (input.buying_closing_costs_cents ?? 0) +
    origination_fee_cents +
    (input.other_loan_fees_cents ?? 0) +
    buy_commission_cents +
    input.rehab_estimate_cents +
    total_holding_cents +
    total_interest_cents +
    (input.selling_closing_costs_cents ?? 0) +
    sell_commission_cents +
    (input.staging_costs_cents ?? 0)

  const net_profit_cents = input.arv_cents - total_project_cost_cents

  // Cash-invested override OR computed default = total cost - effective loan.
  const effective_cash_invested_cents =
    input.cash_invested_cents ?? total_project_cost_cents - loanCents

  // Null-safe denom guards mirror the SQL view. The view rounds each output
  // independently from the raw ratio — DO NOT compute annualized from the
  // already-rounded roi_pct; that introduces a 0.01 drift.
  const roiRaw =
    effective_cash_invested_cents <= 0
      ? null
      : (net_profit_cents / effective_cash_invested_cents) * 100
  const roi_pct = roiRaw == null ? null : round2(roiRaw)

  const annualized_roi_pct =
    months <= 0 || roiRaw == null
      ? null
      : round2((roiRaw * 365) / (months * 30.44))

  const profit_margin_pct =
    input.arv_cents === 0
      ? null
      : round2((net_profit_cents / input.arv_cents) * 100)

  return {
    effective_loan_cents: loanCents,
    mpp_cents: calculateMPP(input.arv_cents, input.rehab_estimate_cents, input.arv_percentage),
    origination_fee_cents,
    total_interest_cents,
    monthly_holding_cost_cents,
    total_holding_cents,
    sell_commission_cents,
    buy_commission_cents,
    total_acquisition_cents,
    total_selling_cents,
    total_project_cost_cents,
    net_profit_cents,
    effective_cash_invested_cents,
    roi_pct,
    annualized_roi_pct,
    profit_margin_pct,
  }
}

export function calculateBRRRRResults(input: BRRRRInputs): BRRRRResults {
  const flip = calculateFlipResults(input)

  const refi_loan_amount_cents =
    input.refinance_ltv_pct != null
      ? toBigint((input.arv_cents * input.refinance_ltv_pct) / 100)
      : null

  const effective_monthly_rent_cents =
    input.monthly_rent_cents != null
      ? toBigint(input.monthly_rent_cents * (1 - (input.vacancy_rate_pct ?? 0) / 100))
      : null

  return {
    ...flip,
    refi_loan_amount_cents,
    effective_monthly_rent_cents,
  }
}

// Traffic-light deal score per real-estate-flip-ops/deal-analysis.md §Deal Score.
//   Green:  margin > 15 AND roi > 20
//   Yellow: margin in [10, 15] OR roi in [10, 20]
//   Red:    margin < 10 OR roi < 10
// Null margin or null roi (cash-deal edge cases, ARV=0) score as red so
// the UI flags incomplete inputs rather than crashing.
export function scoreDeal({
  profit_margin_pct,
  roi_pct,
}: {
  profit_margin_pct: number | null
  roi_pct: number | null
}): DealScore {
  if (profit_margin_pct == null || roi_pct == null) return 'red'
  if (profit_margin_pct > 15 && roi_pct > 20) return 'green'
  if (profit_margin_pct < 10 || roi_pct < 10) return 'red'
  return 'yellow'
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// Pure budget calculations. No Supabase dependency. Server actions and UI
// import from here; tests assert the math.
//
// Sign convention (per real-estate-flip-ops/budget-categories.md):
//   variance = estimated - actual
//   positive = under budget; negative = over budget
// Stick to this everywhere — don't flip the sign in the UI.

export type CategoryStatus = 'not_started' | 'under' | 'warning' | 'over'

// Variance: estimated - actual. Positive → under budget.
export function calculateVariance(estimatedCents: number, actualCents: number): number {
  return Math.trunc(estimatedCents - actualCents)
}

// Auto-contingency line size: rehabBudget × contingencyPct / 100.
// Mirrors the formula a flipper expects when seeding a project's
// contingency reserve.
export function calculateContingencyLine(
  rehabBudgetCents: number,
  contingencyPct: number
): number {
  if (rehabBudgetCents <= 0 || contingencyPct <= 0) return 0
  return Math.trunc((rehabBudgetCents * contingencyPct) / 100)
}

// Per-category status for the Budget vs Actuals table color coding.
// Thresholds match the skill spec (budget-categories.md §Color Coding Rules):
//   not_started: actual = 0
//   over:        actual > estimated
//   warning:     actual >= 90% of estimated (and <= estimated)
//   under:       actual < 90% of estimated
// An expense without a budget line (estimated = 0) is treated as 'over' so
// it surfaces visually as a problem to triage.
export function categoryStatus({
  estimatedCents,
  actualCents,
}: {
  estimatedCents: number
  actualCents: number
}): CategoryStatus {
  if (actualCents <= 0) return 'not_started'
  if (estimatedCents <= 0) return 'over'
  if (actualCents > estimatedCents) return 'over'
  if (actualCents >= estimatedCents * 0.9) return 'warning'
  return 'under'
}

// Projected margin alert. Estimates final profit from current run-rate spend
// plus remaining budget plus remaining holding cost. Margin at risk fires
// when the projection drops more than `riskThresholdPct` below the
// underwriting figure.
export interface ProjectedMarginInput {
  arvCents: number
  underwrittenProfitCents: number | null
  totalSpentCents: number
  remainingBudgetCents: number
  holdingMonthsLeft: number
  monthlyHoldingCents: number
  monthlyInterestCents?: number
  riskThresholdPct?: number // default 15%
}
export interface ProjectedMarginResult {
  projectedTotalCostCents: number
  projectedProfitCents: number
  projectedRoiPct: number | null
  marginAtRisk: boolean
  driftFromUnderwritingPct: number | null
}

export function projectedMargin(input: ProjectedMarginInput): ProjectedMarginResult {
  const monthlyHolding = (input.monthlyHoldingCents ?? 0) + (input.monthlyInterestCents ?? 0)
  const projectedRemainingHolding = Math.max(0, input.holdingMonthsLeft) * monthlyHolding

  const projectedTotalCostCents =
    input.totalSpentCents +
    Math.max(0, input.remainingBudgetCents) +
    projectedRemainingHolding

  const projectedProfitCents = input.arvCents - projectedTotalCostCents

  const projectedRoiPct =
    projectedTotalCostCents > 0
      ? round2((projectedProfitCents / projectedTotalCostCents) * 100)
      : null

  let driftPct: number | null = null
  let marginAtRisk = false
  if (input.underwrittenProfitCents != null && input.underwrittenProfitCents > 0) {
    driftPct = round2(
      ((projectedProfitCents - input.underwrittenProfitCents) /
        input.underwrittenProfitCents) *
        100
    )
    const threshold = input.riskThresholdPct ?? 15
    marginAtRisk = driftPct <= -threshold
  } else if (projectedProfitCents < 0) {
    marginAtRisk = true
  }

  return {
    projectedTotalCostCents,
    projectedProfitCents,
    projectedRoiPct,
    marginAtRisk,
    driftFromUnderwritingPct: driftPct,
  }
}

// Apply-template math. Returns the budget lines that a server action will
// then upsert. Pure function so it's testable in isolation; the action
// wraps it with the actual INSERT/UPDATE.
export interface TemplateLineLike {
  budget_category_id: string
  default_amount_cents: number | null
  per_sqft_rate_cents: number | null
}

export interface AppliedTemplateLine {
  budget_category_id: string
  estimated_cents: number
}

export function applyTemplate(
  lines: TemplateLineLike[],
  sqft: number
): AppliedTemplateLine[] {
  if (sqft <= 0) {
    // No sqft — only flat-rate lines apply.
    return lines
      .filter((l) => (l.default_amount_cents ?? 0) > 0)
      .map((l) => ({
        budget_category_id: l.budget_category_id,
        estimated_cents: l.default_amount_cents ?? 0,
      }))
  }
  return lines.map((l) => {
    const perSqft = l.per_sqft_rate_cents ?? 0
    const flat = l.default_amount_cents ?? 0
    // Per-sqft drives the math when set; flat is a fallback.
    const estimated = perSqft > 0 ? Math.trunc(perSqft * sqft) : flat
    return {
      budget_category_id: l.budget_category_id,
      estimated_cents: estimated,
    }
  })
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

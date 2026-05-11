import { describe, expect, it } from 'vitest'
import {
  applyTemplate,
  calculateContingencyLine,
  calculateVariance,
  categoryStatus,
  projectedMargin,
} from '@/lib/calculations/budget'

describe('calculateVariance', () => {
  it('returns positive when under budget', () => {
    expect(calculateVariance(10_000_00, 7_500_00)).toBe(2_500_00)
  })
  it('returns negative when over budget', () => {
    expect(calculateVariance(10_000_00, 12_000_00)).toBe(-2_000_00)
  })
  it('returns 0 when exactly on budget', () => {
    expect(calculateVariance(5_000_00, 5_000_00)).toBe(0)
  })
  it('truncates fractional cents toward zero', () => {
    expect(calculateVariance(100, 33.5 as never as number)).toBe(66)
  })
})

describe('calculateContingencyLine', () => {
  it('returns 10% of rehab budget by default', () => {
    expect(calculateContingencyLine(100_000_00, 10)).toBe(10_000_00)
  })
  it('returns 15% when contingency pct is 15', () => {
    expect(calculateContingencyLine(80_000_00, 15)).toBe(12_000_00)
  })
  it('returns 0 when rehab is 0', () => {
    expect(calculateContingencyLine(0, 10)).toBe(0)
  })
  it('returns 0 when pct is 0', () => {
    expect(calculateContingencyLine(50_000_00, 0)).toBe(0)
  })
  it('truncates toward zero on fractional cents', () => {
    expect(calculateContingencyLine(33_333_00, 10)).toBe(3_333_30) // 333330 → trunc
  })
})

describe('categoryStatus', () => {
  it('not_started when actual is 0', () => {
    expect(categoryStatus({ estimatedCents: 5_000_00, actualCents: 0 })).toBe('not_started')
  })
  it('under when actual < 90% of estimated', () => {
    expect(categoryStatus({ estimatedCents: 10_000_00, actualCents: 5_000_00 })).toBe('under')
    expect(categoryStatus({ estimatedCents: 10_000_00, actualCents: 8_999_00 })).toBe('under')
  })
  it('warning when actual >= 90% and <= estimated', () => {
    expect(categoryStatus({ estimatedCents: 10_000_00, actualCents: 9_000_00 })).toBe('warning')
    expect(categoryStatus({ estimatedCents: 10_000_00, actualCents: 9_999_00 })).toBe('warning')
    expect(categoryStatus({ estimatedCents: 10_000_00, actualCents: 10_000_00 })).toBe('warning')
  })
  it('over when actual > estimated', () => {
    expect(categoryStatus({ estimatedCents: 10_000_00, actualCents: 10_000_01 })).toBe('over')
    expect(categoryStatus({ estimatedCents: 10_000_00, actualCents: 15_000_00 })).toBe('over')
  })
  it('over when estimated is 0 but actual > 0 (uncategorized overspend)', () => {
    expect(categoryStatus({ estimatedCents: 0, actualCents: 1_000_00 })).toBe('over')
  })
})

describe('projectedMargin', () => {
  it('flags margin-at-risk when projection drops more than 15% below underwriting', () => {
    const result = projectedMargin({
      arvCents: 400_000_00,
      underwrittenProfitCents: 60_000_00,
      totalSpentCents: 200_000_00,
      remainingBudgetCents: 60_000_00, // big remaining
      holdingMonthsLeft: 4,
      monthlyHoldingCents: 1_000_00,
      monthlyInterestCents: 2_000_00,
    })
    // projected total cost = 200k + 60k + (4 × 3k) = 272k. Profit = 128k. Way over underwriting.
    // Actually projected profit goes UP from underwriting — so not at risk.
    expect(result.marginAtRisk).toBe(false)
  })

  it('flags risk when remaining costs blow the projection', () => {
    const result = projectedMargin({
      arvCents: 400_000_00,
      underwrittenProfitCents: 60_000_00,
      totalSpentCents: 380_000_00, // already spent almost everything
      remainingBudgetCents: 0,
      holdingMonthsLeft: 1,
      monthlyHoldingCents: 0,
    })
    // projected profit = 400 - 380 = 20k vs underwriting 60k → drift -67%
    expect(result.marginAtRisk).toBe(true)
    expect(result.driftFromUnderwritingPct).toBe(-66.67)
  })

  it('flags risk when projected profit goes negative even without underwriting baseline', () => {
    const result = projectedMargin({
      arvCents: 300_000_00,
      underwrittenProfitCents: null,
      totalSpentCents: 350_000_00,
      remainingBudgetCents: 0,
      holdingMonthsLeft: 0,
      monthlyHoldingCents: 0,
    })
    expect(result.projectedProfitCents).toBe(-50_000_00)
    expect(result.marginAtRisk).toBe(true)
  })

  it('returns null ROI when projected total cost is 0', () => {
    const result = projectedMargin({
      arvCents: 100_000_00,
      underwrittenProfitCents: null,
      totalSpentCents: 0,
      remainingBudgetCents: 0,
      holdingMonthsLeft: 0,
      monthlyHoldingCents: 0,
    })
    expect(result.projectedRoiPct).toBe(null)
  })
})

describe('applyTemplate', () => {
  const heavyLines = [
    { budget_category_id: 'cat-kitchen', default_amount_cents: 0, per_sqft_rate_cents: 633 },
    { budget_category_id: 'cat-bath',    default_amount_cents: 0, per_sqft_rate_cents: 383 },
    { budget_category_id: 'cat-roof',    default_amount_cents: 0, per_sqft_rate_cents: 325 },
  ]

  it('scales per-sqft lines by the given sqft', () => {
    const result = applyTemplate(heavyLines, 1500)
    expect(result).toEqual([
      { budget_category_id: 'cat-kitchen', estimated_cents: 633 * 1500 },
      { budget_category_id: 'cat-bath',    estimated_cents: 383 * 1500 },
      { budget_category_id: 'cat-roof',    estimated_cents: 325 * 1500 },
    ])
  })

  it('uses default_amount_cents when per_sqft_rate_cents is 0', () => {
    const lines = [
      { budget_category_id: 'cat-permits', default_amount_cents: 250_000, per_sqft_rate_cents: 0 },
    ]
    expect(applyTemplate(lines, 1500)).toEqual([
      { budget_category_id: 'cat-permits', estimated_cents: 250_000 },
    ])
  })

  it('falls back to flat lines only when sqft is 0', () => {
    const lines = [
      { budget_category_id: 'cat-flat', default_amount_cents: 100_000, per_sqft_rate_cents: 0 },
      { budget_category_id: 'cat-rate', default_amount_cents: 0,       per_sqft_rate_cents: 500 },
    ]
    expect(applyTemplate(lines, 0)).toEqual([
      { budget_category_id: 'cat-flat', estimated_cents: 100_000 },
    ])
  })

  it('truncates fractional cents on per-sqft math', () => {
    const lines = [
      { budget_category_id: 'cat', default_amount_cents: 0, per_sqft_rate_cents: 333 },
    ]
    expect(applyTemplate(lines, 1234)).toEqual([
      { budget_category_id: 'cat', estimated_cents: Math.trunc(333 * 1234) }, // 411,122
    ])
  })
})

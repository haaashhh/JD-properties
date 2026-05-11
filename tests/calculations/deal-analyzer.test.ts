import { describe, it, expect } from 'vitest'
import {
  calculateBRRRRResults,
  calculateFlipResults,
  scoreDeal,
} from '@/lib/calculations/deal-analyzer'
import type { BRRRRResults, FlipResults } from '@/types/deal'
import { SCENARIOS, type Scenario } from '../fixtures/scenarios'
import parityFixtures from '../fixtures/parity.json'

type ParityRow = Record<string, number | null>
const fixtures = parityFixtures as Record<string, ParityRow>

const FLIP_KEYS = [
  'effective_loan_cents',
  'mpp_cents',
  'origination_fee_cents',
  'total_interest_cents',
  'monthly_holding_cost_cents',
  'total_holding_cents',
  'sell_commission_cents',
  'buy_commission_cents',
  'total_acquisition_cents',
  'total_selling_cents',
  'total_project_cost_cents',
  'net_profit_cents',
  'effective_cash_invested_cents',
  'roi_pct',
  'annualized_roi_pct',
  'profit_margin_pct',
] as const satisfies readonly (keyof FlipResults)[]

const BRRRR_EXTRA_KEYS = ['refi_loan_amount_cents', 'effective_monthly_rent_cents'] as const

function compute(scenario: Scenario): FlipResults | BRRRRResults {
  return scenario.type === 'brrrr'
    ? calculateBRRRRResults(scenario.input)
    : calculateFlipResults(scenario.input)
}

describe('deal-analyzer parity (TS calc layer ↔ deal_analysis_computed view)', () => {
  for (const scenario of SCENARIOS) {
    it(`${scenario.key} — ${scenario.description}`, () => {
      const fixture = fixtures[scenario.key]
      expect(fixture, `Missing fixture for ${scenario.key}`).toBeDefined()

      const ts = compute(scenario) as FlipResults & Partial<BRRRRResults>

      for (const key of FLIP_KEYS) {
        expect(
          ts[key],
          `${scenario.key}.${key}: TS=${ts[key]} DB=${fixture[key]}`
        ).toBe(fixture[key])
      }

      if (scenario.type === 'brrrr') {
        for (const key of BRRRR_EXTRA_KEYS) {
          expect(
            ts[key],
            `${scenario.key}.${key}: TS=${ts[key]} DB=${fixture[key]}`
          ).toBe(fixture[key])
        }
      } else {
        // Flip scenarios should have BRRRR-specific outputs as either undefined
        // (FlipResults shape) or null (when computed via the BRRRR helper). The
        // DB returns null in both cases.
        expect(fixture.refi_loan_amount_cents).toBeNull()
        expect(fixture.effective_monthly_rent_cents).toBeNull()
      }
    })
  }
})

describe('scoreDeal traffic light', () => {
  it('green when margin > 15 AND roi > 20', () => {
    expect(scoreDeal({ profit_margin_pct: 16, roi_pct: 21 })).toBe('green')
    expect(scoreDeal({ profit_margin_pct: 50, roi_pct: 100 })).toBe('green')
  })

  it('yellow when margin in [10, 15] OR roi in [10, 20] (but not both green)', () => {
    expect(scoreDeal({ profit_margin_pct: 12, roi_pct: 25 })).toBe('yellow')
    expect(scoreDeal({ profit_margin_pct: 16, roi_pct: 15 })).toBe('yellow')
    expect(scoreDeal({ profit_margin_pct: 13, roi_pct: 18 })).toBe('yellow')
  })

  it('red when margin < 10 OR roi < 10', () => {
    expect(scoreDeal({ profit_margin_pct: 9, roi_pct: 30 })).toBe('red')
    expect(scoreDeal({ profit_margin_pct: 30, roi_pct: 9 })).toBe('red')
    expect(scoreDeal({ profit_margin_pct: 0, roi_pct: 0 })).toBe('red')
  })

  it('red when either input is null (incomplete inputs)', () => {
    expect(scoreDeal({ profit_margin_pct: null, roi_pct: 25 })).toBe('red')
    expect(scoreDeal({ profit_margin_pct: 20, roi_pct: null })).toBe('red')
    expect(scoreDeal({ profit_margin_pct: null, roi_pct: null })).toBe('red')
  })
})

describe('null-safe ROI denominators (regression for the live trigger bug)', () => {
  it('returns null for ROI when effective_cash_invested_cents <= 0', () => {
    const result = calculateFlipResults({
      arv_cents: 30_000_000,
      purchase_price_cents: 18_000_000,
      rehab_estimate_cents: 4_000_000,
      arv_percentage: 70,
      financing_type: 'cash',
      loan_basis: 'amount',
      loan_amount_cents: null,
      loan_to_value_pct: null,
      interest_rate: null,
      loan_term_months: null,
      origination_points: null,
      other_loan_fees_cents: 0,
      buying_closing_costs_cents: 0,
      selling_closing_costs_cents: 0,
      holding_period_months: 6,
      holding_taxes_cents: 0,
      holding_insurance_cents: 0,
      holding_utilities_cents: 0,
      holding_interest_cents: 0,
      holding_hoa_cents: 0,
      holding_other_cents: 0,
      buy_agent_commission_pct: 0,
      sell_agent_commission_pct: 5.5,
      staging_costs_cents: 0,
      cash_invested_cents: 0, // explicit zero override → ROI must be null
    })
    expect(result.roi_pct).toBeNull()
    expect(result.annualized_roi_pct).toBeNull()
  })

  it('returns null for profit_margin_pct when arv_cents is 0', () => {
    const result = calculateFlipResults({
      arv_cents: 0,
      purchase_price_cents: 0,
      rehab_estimate_cents: 0,
      arv_percentage: 70,
      financing_type: 'cash',
      loan_basis: 'amount',
      loan_amount_cents: null,
      loan_to_value_pct: null,
      interest_rate: null,
      loan_term_months: null,
      origination_points: null,
      other_loan_fees_cents: 0,
      buying_closing_costs_cents: 0,
      selling_closing_costs_cents: 0,
      holding_period_months: 0,
      holding_taxes_cents: 0,
      holding_insurance_cents: 0,
      holding_utilities_cents: 0,
      holding_interest_cents: 0,
      holding_hoa_cents: 0,
      holding_other_cents: 0,
      buy_agent_commission_pct: 0,
      sell_agent_commission_pct: 0,
      staging_costs_cents: 0,
      cash_invested_cents: null,
    })
    expect(result.profit_margin_pct).toBeNull()
  })
})

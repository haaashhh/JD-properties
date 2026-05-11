import type { BRRRRInputs, FlipInputs } from '@/types/deal'

// Test scenarios. Each must produce identical numbers from the TS calc layer
// and the deal_analysis_computed view. Generated outputs live in
// tests/fixtures/parity.json; regenerate with `npx tsx tests/fixtures/generate.ts`.

export interface FlipScenario {
  key: string
  description: string
  type: 'flip'
  input: FlipInputs
}
export interface BRRRRScenario {
  key: string
  description: string
  type: 'brrrr'
  input: BRRRRInputs
}
export type Scenario = FlipScenario | BRRRRScenario

const baseFlip: FlipInputs = {
  arv_cents: 30_000_000, // $300,000
  purchase_price_cents: 18_000_000, // $180,000
  rehab_estimate_cents: 4_000_000, // $40,000
  arv_percentage: 70,
  financing_type: 'hard_money',
  loan_basis: 'amount',
  loan_amount_cents: 15_000_000,
  loan_to_value_pct: null,
  interest_rate: 12,
  loan_term_months: 6,
  origination_points: 2,
  other_loan_fees_cents: 50_000,
  buying_closing_costs_cents: 200_000,
  selling_closing_costs_cents: 250_000,
  holding_period_months: 6,
  holding_taxes_cents: 25_000,
  holding_insurance_cents: 15_000,
  holding_utilities_cents: 20_000,
  holding_interest_cents: 0,
  holding_hoa_cents: 0,
  holding_other_cents: 10_000,
  buy_agent_commission_pct: 0,
  sell_agent_commission_pct: 5.5,
  staging_costs_cents: 100_000,
  cash_invested_cents: null,
}

export const SCENARIOS: Scenario[] = [
  {
    key: 'flip-hard-money',
    description: 'Standard flip on hard money — $300K ARV, $180K purchase, $40K rehab',
    type: 'flip',
    input: baseFlip,
  },
  {
    key: 'flip-cash',
    description: 'Cash flip — no loan, no interest, holds for 4 months',
    type: 'flip',
    input: {
      ...baseFlip,
      financing_type: 'cash',
      loan_basis: 'amount',
      loan_amount_cents: null,
      loan_to_value_pct: null,
      interest_rate: null,
      loan_term_months: null,
      origination_points: null,
      other_loan_fees_cents: 0,
      holding_period_months: 4,
    },
  },
  {
    key: 'flip-ltv',
    description: 'Flip with LTV-based loan basis — 75% LTV instead of fixed loan amount',
    type: 'flip',
    input: {
      ...baseFlip,
      loan_basis: 'ltv',
      loan_amount_cents: null,
      loan_to_value_pct: 75,
    },
  },
  {
    key: 'flip-cash-override',
    description: 'Cash flip with explicit cash_invested_cents override',
    type: 'flip',
    input: {
      ...baseFlip,
      financing_type: 'cash',
      loan_basis: 'amount',
      loan_amount_cents: null,
      loan_to_value_pct: null,
      interest_rate: null,
      loan_term_months: null,
      origination_points: null,
      other_loan_fees_cents: 0,
      cash_invested_cents: 25_000_000, // user-provided override
    },
  },
  {
    key: 'brrrr-conservative',
    description: 'BRRRR with 75% refi LTV, $1,800/mo rent, 8% mgmt fee',
    type: 'brrrr',
    input: {
      ...baseFlip,
      // BRRRR fields:
      monthly_rent_cents: 180_000, // $1,800
      vacancy_rate_pct: 7,
      property_mgmt_fee_pct: 8,
      monthly_maintenance_cents: 9_000,
      refinance_ltv_pct: 75,
      refinance_interest_rate: 7,
      refinance_term_years: 30,
    },
  },
]

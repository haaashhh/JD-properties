import type { Database } from '@/types/database'

export type DealAnalysisRow = Database['public']['Tables']['deal_analysis']['Row']
export type DealAnalysisInsert = Database['public']['Tables']['deal_analysis']['Insert']
export type DealAnalysisUpdate = Database['public']['Tables']['deal_analysis']['Update']
export type DealAnalysisComputedRow =
  Database['public']['Views']['deal_analysis_computed']['Row']

export type PropertyRow = Database['public']['Tables']['property']['Row']
export type PropertyInsert = Database['public']['Tables']['property']['Insert']

export type CompRow = Database['public']['Tables']['comp']['Row']
export type CompInsert = Database['public']['Tables']['comp']['Insert']

export type AnalysisType = 'flip' | 'brrrr'
export type FinancingType = 'cash' | 'hard_money' | 'conventional' | 'private_money'
export type LoanBasis = 'amount' | 'ltv'
export type DealScore = 'green' | 'yellow' | 'red'

// Inputs the calc layer needs. Mirrors the writable subset of deal_analysis
// that the form collects. Cents values stay as JS numbers (safe up to ~9e15
// cents = ~$90 trillion, well above any flipping deal).
export interface FlipInputs {
  arv_cents: number
  purchase_price_cents: number
  rehab_estimate_cents: number
  arv_percentage: number

  financing_type: FinancingType
  loan_basis: LoanBasis
  loan_amount_cents: number | null
  loan_to_value_pct: number | null
  interest_rate: number | null
  loan_term_months: number | null
  origination_points: number | null
  other_loan_fees_cents: number

  buying_closing_costs_cents: number
  selling_closing_costs_cents: number
  holding_period_months: number | null

  holding_taxes_cents: number
  holding_insurance_cents: number
  holding_utilities_cents: number
  holding_interest_cents: number
  holding_hoa_cents: number
  holding_other_cents: number

  buy_agent_commission_pct: number
  sell_agent_commission_pct: number
  staging_costs_cents: number

  cash_invested_cents: number | null
}

export interface BRRRRInputs extends FlipInputs {
  monthly_rent_cents: number | null
  vacancy_rate_pct: number | null
  property_mgmt_fee_pct: number | null
  monthly_maintenance_cents: number | null
  refinance_ltv_pct: number | null
  refinance_interest_rate: number | null
  refinance_term_years: number | null
}

export interface FlipResults {
  effective_loan_cents: number
  mpp_cents: number
  origination_fee_cents: number
  total_interest_cents: number
  monthly_holding_cost_cents: number
  total_holding_cents: number
  sell_commission_cents: number
  buy_commission_cents: number

  total_acquisition_cents: number
  total_selling_cents: number
  total_project_cost_cents: number
  net_profit_cents: number

  effective_cash_invested_cents: number
  roi_pct: number | null
  annualized_roi_pct: number | null
  profit_margin_pct: number | null
}

export interface BRRRRResults extends FlipResults {
  refi_loan_amount_cents: number | null
  effective_monthly_rent_cents: number | null
}

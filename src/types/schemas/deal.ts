import { z } from 'zod'

const positiveCents = z.coerce.number().int().nonnegative()

// Flat schema (no discriminated union) so react-hook-form's type inference
// works cleanly. The existing-vs-new branch is enforced inside `superRefine`.
export const dealFormSchema = z
  .object({
    property_mode: z.enum(['existing', 'new']),
    property_id: z.string().uuid().nullable().optional(),

    address_line1: z.string().nullable().optional(),
    address_line2: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    zip: z.string().nullable().optional(),
    sqft: z.coerce.number().int().nonnegative().nullable().optional(),
    bedrooms: z.coerce.number().nonnegative().max(20).nullable().optional(),
    bathrooms: z.coerce.number().nonnegative().max(20).nullable().optional(),
    year_built: z.coerce.number().int().min(1800).max(2099).nullable().optional(),
    property_type: z.enum(['sfr', 'duplex', 'triplex', 'quadplex', 'townhome', 'condo']),

    name: z.string().min(1).max(120),
    analysis_type: z.enum(['flip', 'brrrr']),
    arv_cents: positiveCents,
    purchase_price_cents: positiveCents,
    rehab_estimate_cents: positiveCents,
    arv_percentage: z.coerce.number().min(50).max(100),

    financing_type: z.enum(['cash', 'hard_money', 'conventional', 'private_money']),
    loan_basis: z.enum(['amount', 'ltv']),
    loan_amount_cents: z.coerce.number().int().nonnegative().nullable(),
    loan_to_value_pct: z.coerce.number().min(0).max(100).nullable(),
    interest_rate: z.coerce.number().min(0).max(50).nullable(),
    loan_term_months: z.coerce.number().int().min(1).max(360).nullable(),
    origination_points: z.coerce.number().min(0).max(10).nullable(),
    other_loan_fees_cents: positiveCents,

    buying_closing_costs_cents: positiveCents,
    selling_closing_costs_cents: positiveCents,
    holding_period_months: z.coerce.number().min(0).max(60),

    holding_taxes_cents: positiveCents,
    holding_insurance_cents: positiveCents,
    holding_utilities_cents: positiveCents,
    holding_interest_cents: positiveCents,
    holding_hoa_cents: positiveCents,
    holding_other_cents: positiveCents,

    buy_agent_commission_pct: z.coerce.number().min(0).max(10),
    sell_agent_commission_pct: z.coerce.number().min(0).max(10),
    staging_costs_cents: positiveCents,

    cash_invested_cents: z.coerce.number().int().nonnegative().nullable(),

    monthly_rent_cents: z.coerce.number().int().nonnegative().nullable(),
    vacancy_rate_pct: z.coerce.number().min(0).max(50).nullable(),
    property_mgmt_fee_pct: z.coerce.number().min(0).max(20).nullable(),
    monthly_maintenance_cents: z.coerce.number().int().nonnegative().nullable(),
    refinance_ltv_pct: z.coerce.number().min(0).max(100).nullable(),
    refinance_interest_rate: z.coerce.number().min(0).max(20).nullable(),
    refinance_term_years: z.coerce.number().int().min(5).max(40).nullable(),
  })
  .superRefine((v, ctx) => {
    // Property step branch.
    if (v.property_mode === 'existing') {
      if (!v.property_id) {
        ctx.addIssue({
          path: ['property_id'],
          code: z.ZodIssueCode.custom,
          message: 'Pick a property.',
        })
      }
    } else {
      const required: [keyof typeof v, string][] = [
        ['address_line1', 'Required.'],
        ['city', 'Required.'],
        ['state', 'Required.'],
        ['zip', 'Required.'],
      ]
      for (const [key, message] of required) {
        if (!v[key] || (typeof v[key] === 'string' && v[key].trim() === '')) {
          ctx.addIssue({ path: [key], code: z.ZodIssueCode.custom, message })
        }
      }
      if (v.state && v.state.length !== 2) {
        ctx.addIssue({
          path: ['state'],
          code: z.ZodIssueCode.custom,
          message: 'Use the 2-letter state code.',
        })
      }
      if (v.zip && !/^\d{5}(-\d{4})?$/.test(v.zip)) {
        ctx.addIssue({
          path: ['zip'],
          code: z.ZodIssueCode.custom,
          message: 'ZIP must be 5 or 9 digits.',
        })
      }
    }

    // Loan XOR.
    if (v.financing_type !== 'cash') {
      const hasAmount = v.loan_amount_cents != null && v.loan_amount_cents > 0
      const hasLtv = v.loan_to_value_pct != null && v.loan_to_value_pct > 0
      if (hasAmount === hasLtv) {
        ctx.addIssue({
          path: ['loan_basis'],
          code: z.ZodIssueCode.custom,
          message: 'Pick exactly one: loan amount OR LTV %.',
        })
      }
    }

    // BRRRR-only required fields.
    if (v.analysis_type === 'brrrr') {
      if (v.monthly_rent_cents == null || v.monthly_rent_cents <= 0) {
        ctx.addIssue({
          path: ['monthly_rent_cents'],
          code: z.ZodIssueCode.custom,
          message: 'Monthly rent is required for BRRRR analyses.',
        })
      }
      if (v.refinance_ltv_pct == null) {
        ctx.addIssue({
          path: ['refinance_ltv_pct'],
          code: z.ZodIssueCode.custom,
          message: 'Refinance LTV is required for BRRRR analyses.',
        })
      }
    }
  })

export type DealFormValues = z.infer<typeof dealFormSchema>
export type CreateDealInput = DealFormValues
export const createDealSchema = dealFormSchema

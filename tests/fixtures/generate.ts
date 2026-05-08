// Generates tests/fixtures/parity.json by:
//   1. inserting each scenario into a throwaway property + deal_analysis row
//      via the service-role client (bypasses RLS)
//   2. reading the deal_analysis_computed view
//   3. dumping the computed columns
//   4. deleting the throwaway rows
//
// Run with: node --env-file=.env.local --experimental-strip-types tests/fixtures/generate.ts
// (Node 22+ supports stripping TS types natively.)

import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { SCENARIOS } from './scenarios.ts'
import type { Database } from '../../src/types/database.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const admin = createClient<Database>(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Find the test admin user's organization to scope the throwaway property.
async function getOrgId(): Promise<string> {
  const { data: list } = await admin.auth.admin.listUsers()
  const admin_user = list?.users.find((u) => u.email === 'admin@properties-by-jd.local')
  if (!admin_user) throw new Error('Test admin user not found. Run scripts/create-test-user.mjs first.')

  const { data: member } = await admin
    .from('organization_member')
    .select('organization_id')
    .eq('user_id', admin_user.id)
    .single()
  if (!member) throw new Error('No org membership for test admin.')
  return member.organization_id
}

const COMPUTED_COLUMNS = [
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
  'refi_loan_amount_cents',
  'effective_monthly_rent_cents',
] as const

async function main() {
  const orgId = await getOrgId()
  console.log(`Using org ${orgId}`)
  const out: Record<string, Record<string, number | null>> = {}

  for (const scenario of SCENARIOS) {
    const propertyAddress = `Test ${scenario.key} ${Date.now()} St`

    const { data: property, error: propErr } = await admin
      .from('property')
      .insert({
        organization_id: orgId,
        address_line1: propertyAddress,
        city: 'Austin',
        state: 'TX',
        zip: '78701',
      })
      .select('id')
      .single()
    if (propErr || !property) {
      console.error(`Failed to insert property for ${scenario.key}:`, propErr?.message)
      continue
    }

    const dealInsert = {
      property_id: property.id,
      organization_id: orgId,
      analysis_type: scenario.type,
      arv_cents: scenario.input.arv_cents,
      purchase_price_cents: scenario.input.purchase_price_cents,
      rehab_estimate_cents: scenario.input.rehab_estimate_cents,
      arv_percentage: scenario.input.arv_percentage,
      financing_type: scenario.input.financing_type,
      loan_basis: scenario.input.financing_type === 'cash' ? null : scenario.input.loan_basis,
      loan_amount_cents: scenario.input.loan_amount_cents,
      loan_to_value_pct: scenario.input.loan_to_value_pct,
      interest_rate: scenario.input.interest_rate,
      loan_term_months: scenario.input.loan_term_months,
      origination_points: scenario.input.origination_points,
      other_loan_fees_cents: scenario.input.other_loan_fees_cents,
      buying_closing_costs_cents: scenario.input.buying_closing_costs_cents,
      selling_closing_costs_cents: scenario.input.selling_closing_costs_cents,
      holding_period_months: scenario.input.holding_period_months,
      holding_taxes_cents: scenario.input.holding_taxes_cents,
      holding_insurance_cents: scenario.input.holding_insurance_cents,
      holding_utilities_cents: scenario.input.holding_utilities_cents,
      holding_interest_cents: scenario.input.holding_interest_cents,
      holding_hoa_cents: scenario.input.holding_hoa_cents,
      holding_other_cents: scenario.input.holding_other_cents,
      buy_agent_commission_pct: scenario.input.buy_agent_commission_pct,
      sell_agent_commission_pct: scenario.input.sell_agent_commission_pct,
      staging_costs_cents: scenario.input.staging_costs_cents,
      cash_invested_cents: scenario.input.cash_invested_cents,
      monthly_rent_cents: 'monthly_rent_cents' in scenario.input ? scenario.input.monthly_rent_cents : null,
      vacancy_rate_pct: 'vacancy_rate_pct' in scenario.input ? scenario.input.vacancy_rate_pct : null,
      property_mgmt_fee_pct: 'property_mgmt_fee_pct' in scenario.input ? scenario.input.property_mgmt_fee_pct : null,
      monthly_maintenance_cents:
        'monthly_maintenance_cents' in scenario.input ? scenario.input.monthly_maintenance_cents : null,
      refinance_ltv_pct: 'refinance_ltv_pct' in scenario.input ? scenario.input.refinance_ltv_pct : null,
      refinance_interest_rate:
        'refinance_interest_rate' in scenario.input ? scenario.input.refinance_interest_rate : null,
      refinance_term_years: 'refinance_term_years' in scenario.input ? scenario.input.refinance_term_years : null,
      name: `parity-${scenario.key}`,
    }

    const { data: deal, error: dealErr } = await admin
      .from('deal_analysis')
      .insert(dealInsert)
      .select('id')
      .single()
    if (dealErr || !deal) {
      console.error(`Failed to insert deal for ${scenario.key}:`, dealErr?.message)
      await admin.from('property').delete().eq('id', property.id)
      continue
    }

    const { data: computed } = await admin
      .from('deal_analysis_computed')
      .select(COMPUTED_COLUMNS.join(','))
      .eq('id', deal.id)
      .single()

    if (computed) {
      const slim: Record<string, number | null> = {}
      for (const col of COMPUTED_COLUMNS) {
        const value = (computed as unknown as Record<string, unknown>)[col]
        slim[col] = value == null ? null : Number(value)
      }
      out[scenario.key] = slim
      console.log(`✓ ${scenario.key}: net_profit=${slim.net_profit_cents}, roi=${slim.roi_pct}`)
    }

    await admin.from('deal_analysis').delete().eq('id', deal.id)
    await admin.from('property').delete().eq('id', property.id)
  }

  const dest = path.resolve(__dirname, 'parity.json')
  writeFileSync(dest, JSON.stringify(out, null, 2) + '\n', 'utf8')
  console.log(`Wrote ${dest}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

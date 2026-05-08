import { describe, it, expect } from 'vitest'
import { adminClient, getTestOrgAndUser } from './setup'

// Sanity tests against the live linked Supabase project.
// Confirms the migrations actually wired what the app code assumes.

describe('schema sanity (live database)', () => {
  it('the test admin user has an org with default settings (signup trigger fired)', async () => {
    const { admin, organizationId } = await getTestOrgAndUser()
    const { data: settings } = await admin
      .from('organization_settings')
      .select('default_arv_pct, default_contingency_pct')
      .eq('organization_id', organizationId)
      .single()
    expect(settings).toBeTruthy()
    expect(Number(settings?.default_arv_pct)).toBeGreaterThan(0)
  })

  it('seeded contingency budget category exists (system row)', async () => {
    const admin = adminClient()
    const { data } = await admin
      .from('budget_category')
      .select('id, name, group_name')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single()
    expect(data?.group_name).toBe('contingency')
  })

  it('deal_analysis_computed view returns the expected columns', async () => {
    const admin = adminClient()
    const { error } = await admin
      .from('deal_analysis_computed')
      .select(
        'id, mpp_cents, origination_fee_cents, total_interest_cents, ' +
          'total_holding_cents, sell_commission_cents, buy_commission_cents, ' +
          'total_acquisition_cents, total_selling_cents, total_project_cost_cents, ' +
          'net_profit_cents, effective_cash_invested_cents, effective_loan_cents, ' +
          'roi_pct, annualized_roi_pct, profit_margin_pct, ' +
          'refi_loan_amount_cents, effective_monthly_rent_cents, ' +
          'suggested_arv_cents, comp_count'
      )
      .limit(1)
    // Either zero rows (empty) or one row with all columns selectable; we only
    // care that the column list is valid against the view.
    expect(error).toBeNull()
  })
})

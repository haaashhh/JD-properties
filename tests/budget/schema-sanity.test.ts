import { describe, expect, it } from 'vitest'
import { adminClient, getTestOrgAndUser } from '../db/setup'

describe('Module 4 schema sanity', () => {
  it('seeds 25 default budget_category rows (system, organization_id IS NULL)', async () => {
    const admin = adminClient()
    const { data, count } = await admin
      .from('budget_category')
      .select('id, name, group_name', { count: 'exact' })
      .is('organization_id', null)
      .eq('is_default', true)
    expect(data).toBeTruthy()
    expect(count).toBe(25)
    const names = (data ?? []).map((r) => r.name).sort()
    expect(names).toContain('Kitchen')
    expect(names).toContain('Contingency')
    expect(names).toContain('Demo / Cleanup')
    expect(names).toContain('Architectural / Engineering')
  })

  it('seeds 3 system budget_templates (Cosmetic / Heavy / Gut)', async () => {
    const admin = adminClient()
    const { data } = await admin
      .from('budget_template')
      .select('id, name, scope_tier')
      .is('organization_id', null)
      .order('scope_tier')
    const names = (data ?? []).map((r) => r.name).sort()
    expect(names).toEqual(['Cosmetic Rehab', 'Full Gut', 'Heavy Rehab'])
    const tiers = (data ?? []).map((r) => r.scope_tier).sort()
    expect(tiers).toEqual(['cosmetic', 'gut', 'heavy'])
  })

  it("Heavy template's per-sqft rates sum to ~$42", async () => {
    const admin = adminClient()
    const { data } = await admin
      .from('budget_template_line')
      .select('per_sqft_rate_cents')
      .eq('budget_template_id', '00000000-0000-0000-0002-000000000002')
    const totalCents = (data ?? []).reduce(
      (sum, r) => sum + Number(r.per_sqft_rate_cents),
      0
    )
    // 4196 cents/sqft per the migration. Within $0.50 tolerance.
    expect(totalCents).toBeGreaterThanOrEqual(4150)
    expect(totalCents).toBeLessThanOrEqual(4250)
  })

  it('project_budget rows carry organization_id (denorm migration succeeded)', async () => {
    const { organizationId } = await getTestOrgAndUser()
    const admin = adminClient()
    const { count: nullOrgCount } = await admin
      .from('project_budget')
      .select('id', { count: 'exact', head: true })
      .is('organization_id', null)
    expect(nullOrgCount).toBe(0)
    const { count: withOrgCount } = await admin
      .from('project_budget')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
    expect(withOrgCount).toBeGreaterThan(0)
  })

  it('project_expense rows carry organization_id', async () => {
    const admin = adminClient()
    const { count: nullOrgCount } = await admin
      .from('project_expense')
      .select('id', { count: 'exact', head: true })
      .is('organization_id', null)
    expect(nullOrgCount).toBe(0)
  })

  it('project_budget_summary view returns expected columns and computes status', async () => {
    const { organizationId } = await getTestOrgAndUser()
    const admin = adminClient()
    const { data: project } = await admin
      .from('project')
      .select('id')
      .eq('organization_id', organizationId)
      .limit(1)
      .single()
    expect(project).toBeTruthy()
    const { data, error } = await admin
      .from('project_budget_summary')
      .select('budget_category_id, estimated_cents, actual_cents, variance_cents, percent_spent, status')
      .eq('project_id', project!.id)
      .limit(5)
    expect(error).toBeNull()
    expect(data).toBeTruthy()
    if ((data ?? []).length > 0) {
      const statuses = new Set((data ?? []).map((r) => r.status))
      const validStatuses = ['not_started', 'under', 'warning', 'over']
      for (const s of statuses) {
        expect(validStatuses).toContain(s)
      }
    }
  })

  it('receipts storage bucket exists with the right config', async () => {
    const admin = adminClient()
    const { data, error } = await admin.storage.getBucket('receipts')
    expect(error).toBeNull()
    expect(data?.id).toBe('receipts')
    expect(data?.public).toBe(false)
    expect(data?.file_size_limit).toBe(26214400) // 25 MB
    expect(data?.allowed_mime_types).toContain('application/pdf')
    expect(data?.allowed_mime_types).toContain('image/jpeg')
  })

  it('lender_draw + lender_draw_line tables exist (schema-prep)', async () => {
    const admin = adminClient()
    const { error: drawErr } = await admin
      .from('lender_draw')
      .select('id', { head: true, count: 'exact' })
    expect(drawErr).toBeNull()
    const { error: lineErr } = await admin
      .from('lender_draw_line')
      .select('id', { head: true, count: 'exact' })
    expect(lineErr).toBeNull()
  })
})

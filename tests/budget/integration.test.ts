import { afterEach, describe, expect, it } from 'vitest'
import { adminClient, getTestOrgAndUser } from '../db/setup'
import { applyTemplate } from '@/lib/calculations/budget'

const cleanup: Array<() => Promise<void>> = []

afterEach(async () => {
  while (cleanup.length) {
    try {
      await cleanup.pop()?.()
    } catch {
      // best-effort
    }
  }
})

function uniqueAddress(prefix: string) {
  return `${prefix} ${Date.now()}-${Math.random().toString(36).slice(2, 7)} St`
}

async function createSandboxProject() {
  const { organizationId } = await getTestOrgAndUser()
  const admin = adminClient()
  const { data: property } = await admin
    .from('property')
    .insert({
      organization_id: organizationId,
      address_line1: uniqueAddress('M4 budget'),
      city: 'Austin',
      state: 'TX',
      zip: '78701',
      sqft: 1500,
    })
    .select('id, sqft')
    .single()
  if (!property) throw new Error('property insert failed')
  cleanup.push(async () => {
    await adminClient().from('property').delete().eq('id', property.id)
  })

  const { data: project } = await admin
    .from('project')
    .insert({
      organization_id: organizationId,
      property_id: property.id,
      name: `M4 budget test ${Date.now()}`,
      pipeline_stage: 'purchased',
    })
    .select('id')
    .single()
  if (!project) throw new Error('project insert failed')
  // The seed_project_contingency trigger auto-inserts a contingency line —
  // we want it present so we can verify it survives template-apply.
  return { organizationId, propertyId: property.id, projectId: project.id, sqft: property.sqft ?? 1500 }
}

async function applyHeavyTemplate(projectId: string, organizationId: string, sqft: number, overwrite: boolean) {
  const admin = adminClient()
  const HEAVY_TEMPLATE_ID = '00000000-0000-0000-0002-000000000002'

  const { data: lines } = await admin
    .from('budget_template_line')
    .select('budget_category_id, default_amount_cents, per_sqft_rate_cents')
    .eq('budget_template_id', HEAVY_TEMPLATE_ID)
  if (!lines) throw new Error('Could not load heavy template lines')

  const computed = applyTemplate(
    lines.map((l) => ({
      budget_category_id: l.budget_category_id,
      default_amount_cents: l.default_amount_cents,
      per_sqft_rate_cents: l.per_sqft_rate_cents,
    })),
    sqft
  )

  if (overwrite) {
    const { error } = await admin
      .from('project_budget')
      .upsert(
        computed.map((c) => ({
          project_id: projectId,
          organization_id: organizationId,
          budget_category_id: c.budget_category_id,
          estimated_cents: c.estimated_cents,
        })),
        { onConflict: 'project_id,budget_category_id' }
      )
    if (error) throw error
  } else {
    // Insert-only: skip rows that already exist.
    const { data: existing } = await admin
      .from('project_budget')
      .select('budget_category_id')
      .eq('project_id', projectId)
    const existingIds = new Set((existing ?? []).map((r) => r.budget_category_id))
    const toInsert = computed.filter((c) => !existingIds.has(c.budget_category_id))
    if (toInsert.length > 0) {
      const { error } = await admin.from('project_budget').insert(
        toInsert.map((c) => ({
          project_id: projectId,
          organization_id: organizationId,
          budget_category_id: c.budget_category_id,
          estimated_cents: c.estimated_cents,
        }))
      )
      if (error) throw error
    }
  }
}

describe('apply template — server-action behaviour', () => {
  it('apply Heavy template to a 1,500 sqft project inserts the expected rows', async () => {
    const { organizationId, projectId } = await createSandboxProject()

    await applyHeavyTemplate(projectId, organizationId, 1500, /* overwrite */ false)

    const admin = adminClient()
    const { data: budget } = await admin
      .from('project_budget')
      .select('budget_category_id, estimated_cents')
      .eq('project_id', projectId)

    // Heavy template has 14 lines; the project also has the auto-seeded
    // contingency row from the BEFORE INSERT trigger. So we expect 15 total.
    expect((budget ?? []).length).toBe(15)

    // Spot-check Kitchen at 686 cents/sqft × 1500 = $10,290
    // (rate corrected in migration 0007 to land Heavy template at $42/sqft).
    const kitchen = budget?.find(
      (r) => r.budget_category_id === '00000000-0000-0000-0001-000000000016'
    )
    expect(kitchen?.estimated_cents).toBe(686 * 1500)

    // Total of the 14 template lines should land near $42 × 1500 = $63,000.
    const templateTotal = (budget ?? [])
      .filter((r) => r.budget_category_id !== '00000000-0000-0000-0000-000000000001')
      .reduce((sum, r) => sum + Number(r.estimated_cents), 0)
    expect(templateTotal).toBeGreaterThanOrEqual(62_000_00)
    expect(templateTotal).toBeLessThanOrEqual(64_000_00)
  })

  it('re-applying without overwrite is idempotent (no duplicates)', async () => {
    const { organizationId, projectId } = await createSandboxProject()

    await applyHeavyTemplate(projectId, organizationId, 1500, false)
    await applyHeavyTemplate(projectId, organizationId, 1500, false)

    const admin = adminClient()
    const { count } = await admin
      .from('project_budget')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
    expect(count).toBe(15) // 14 template + 1 auto-contingency
  })

  it('apply with overwrite=true updates estimated_cents but preserves contingency row', async () => {
    const { organizationId, projectId } = await createSandboxProject()
    const admin = adminClient()

    // Apply Heavy at 1500 sqft (gives a known shape).
    await applyHeavyTemplate(projectId, organizationId, 1500, false)

    // Re-apply Heavy at 2000 sqft with overwrite=true.
    await applyHeavyTemplate(projectId, organizationId, 2000, true)

    const { data: budget } = await admin
      .from('project_budget')
      .select('budget_category_id, estimated_cents')
      .eq('project_id', projectId)
    expect((budget ?? []).length).toBe(15)

    // Kitchen line should now reflect 2000 sqft scaling at the corrected rate.
    const kitchen = budget?.find(
      (r) => r.budget_category_id === '00000000-0000-0000-0001-000000000016'
    )
    expect(kitchen?.estimated_cents).toBe(686 * 2000)

    // Auto-contingency row still present.
    const contingency = budget?.find(
      (r) => r.budget_category_id === '00000000-0000-0000-0000-000000000001'
    )
    expect(contingency).toBeTruthy()
  })
})

describe('project_budget_summary view computes the right status per category', () => {
  it('classifies rows as not_started / under / warning / over correctly', async () => {
    const { organizationId, projectId } = await createSandboxProject()
    const admin = adminClient()

    // Use 4 fixed system categories so we know which rows to assert.
    const KITCHEN = '00000000-0000-0000-0001-000000000016'
    const FLOORING = '00000000-0000-0000-0001-000000000015'
    const PAINT = '00000000-0000-0000-0001-000000000014'
    const ROOF = '00000000-0000-0000-0001-000000000001'

    await admin
      .from('project_budget')
      .insert([
        { project_id: projectId, organization_id: organizationId, budget_category_id: KITCHEN,  estimated_cents: 10_000_00 },
        { project_id: projectId, organization_id: organizationId, budget_category_id: FLOORING, estimated_cents: 10_000_00 },
        { project_id: projectId, organization_id: organizationId, budget_category_id: PAINT,    estimated_cents: 10_000_00 },
        { project_id: projectId, organization_id: organizationId, budget_category_id: ROOF,     estimated_cents: 10_000_00 },
      ])
      .throwOnError()

    await admin
      .from('project_expense')
      .insert([
        { project_id: projectId, organization_id: organizationId, budget_category_id: KITCHEN,  amount_cents: 12_000_00, expense_date: '2026-05-01' },
        { project_id: projectId, organization_id: organizationId, budget_category_id: FLOORING, amount_cents:  9_500_00, expense_date: '2026-05-01' },
        { project_id: projectId, organization_id: organizationId, budget_category_id: PAINT,    amount_cents:  3_000_00, expense_date: '2026-05-01' },
        // ROOF gets no expenses → not_started
      ])
      .throwOnError()

    const { data } = await admin
      .from('project_budget_summary')
      .select('budget_category_id, status')
      .eq('project_id', projectId)
      .in('budget_category_id', [KITCHEN, FLOORING, PAINT, ROOF])

    const map = new Map((data ?? []).map((r) => [r.budget_category_id, r.status]))
    expect(map.get(KITCHEN)).toBe('over')
    expect(map.get(FLOORING)).toBe('warning') // 95% spent
    expect(map.get(PAINT)).toBe('under')
    expect(map.get(ROOF)).toBe('not_started')
  })

  it('surfaces expenses that have no matching budget line (estimated=0 → status=over)', async () => {
    const { organizationId, projectId } = await createSandboxProject()
    const admin = adminClient()
    const ELECTRICAL = '00000000-0000-0000-0001-000000000019'

    // Expense with no matching project_budget row.
    await admin
      .from('project_expense')
      .insert({
        project_id: projectId,
        organization_id: organizationId,
        budget_category_id: ELECTRICAL,
        amount_cents: 5_000_00,
        expense_date: '2026-05-01',
      })
      .throwOnError()

    const { data } = await admin
      .from('project_budget_summary')
      .select('estimated_cents, actual_cents, status')
      .eq('project_id', projectId)
      .eq('budget_category_id', ELECTRICAL)
      .single()
    expect(data?.estimated_cents).toBe(0)
    expect(data?.actual_cents).toBe(5_000_00)
    expect(data?.status).toBe('over')
  })
})

describe('expense + budget org auto-population', () => {
  it('trg_project_budget_set_org fills org_id when omitted', async () => {
    const { projectId } = await createSandboxProject()
    const admin = adminClient()
    const { data, error } = await admin
      .from('project_budget')
      .insert({
        project_id: projectId,
        budget_category_id: '00000000-0000-0000-0001-000000000016',
        estimated_cents: 1_000_00,
      } as never)
      .select('id, organization_id')
      .single()
    expect(error).toBeNull()
    expect(data?.organization_id).toBeTruthy()
  })

  it('trg_project_expense_set_org fills org_id when omitted', async () => {
    const { projectId } = await createSandboxProject()
    const admin = adminClient()
    const { data, error } = await admin
      .from('project_expense')
      .insert({
        project_id: projectId,
        amount_cents: 1_000_00,
        expense_date: '2026-05-01',
      } as never)
      .select('id, organization_id')
      .single()
    expect(error).toBeNull()
    expect(data?.organization_id).toBeTruthy()
  })
})

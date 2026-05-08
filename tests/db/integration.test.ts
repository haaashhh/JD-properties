import { afterEach, describe, expect, it } from 'vitest'
import { adminClient, getTestOrgAndUser } from './setup'

// Integration tests against the live linked Supabase project. Each test
// inserts via service-role (bypasses RLS) and tracks created IDs for cleanup.
// All cleanup is best-effort — if a test crashes, an orphaned property may
// linger but the dedupe_key uses a unique address per test so collisions are
// avoided.

const cleanup: Array<() => Promise<void>> = []

afterEach(async () => {
  while (cleanup.length) {
    const fn = cleanup.pop()
    try {
      await fn?.()
    } catch {
      // best-effort
    }
  }
})

function uniqueAddress(prefix: string) {
  return `${prefix} ${Date.now()}-${Math.random().toString(36).slice(2, 7)} St`
}

async function createProperty(orgId: string, address?: string) {
  const admin = adminClient()
  const { data, error } = await admin
    .from('property')
    .insert({
      organization_id: orgId,
      address_line1: address ?? uniqueAddress('Integration'),
      city: 'Austin',
      state: 'TX',
      zip: '78701',
    })
    .select('id')
    .single()
  if (error || !data) throw error ?? new Error('property insert failed')
  cleanup.push(async () => {
    await adminClient().from('property').delete().eq('id', data.id)
  })
  return data.id
}

async function createDeal(orgId: string, propertyId: string, name = 'Integration test') {
  const admin = adminClient()
  const { data, error } = await admin
    .from('deal_analysis')
    .insert({
      property_id: propertyId,
      organization_id: orgId,
      name,
      analysis_type: 'flip',
      arv_cents: 30_000_000,
      purchase_price_cents: 18_000_000,
      rehab_estimate_cents: 4_000_000,
      arv_percentage: 70,
      financing_type: 'cash',
      loan_basis: null,
    })
    .select('id')
    .single()
  if (error || !data) throw error ?? new Error('deal insert failed')
  cleanup.push(async () => {
    await adminClient().from('deal_analysis').delete().eq('id', data.id)
  })
  return data.id
}

describe('property dedupe_key partial unique index', () => {
  it('rejects a second property with the same normalized address+zip in the same org', async () => {
    const { organizationId } = await getTestOrgAndUser()
    const address = uniqueAddress('DedupeTest')
    await createProperty(organizationId, address)

    // Second insert at the same address — should fail with 23505 unique violation.
    const admin = adminClient()
    const { error } = await admin.from('property').insert({
      organization_id: organizationId,
      address_line1: address,
      city: 'Austin',
      state: 'TX',
      zip: '78701',
    })
    expect(error?.code).toBe('23505')
  })
})

describe('deal_analysis loan XOR check', () => {
  it('rejects financed deals that set both loan_amount_cents and loan_to_value_pct', async () => {
    const { organizationId } = await getTestOrgAndUser()
    const propertyId = await createProperty(organizationId)
    const admin = adminClient()
    const { error } = await admin.from('deal_analysis').insert({
      property_id: propertyId,
      organization_id: organizationId,
      name: 'Loan XOR test',
      analysis_type: 'flip',
      arv_cents: 30_000_000,
      purchase_price_cents: 18_000_000,
      rehab_estimate_cents: 4_000_000,
      arv_percentage: 70,
      financing_type: 'hard_money',
      loan_basis: 'amount',
      loan_amount_cents: 15_000_000,
      loan_to_value_pct: 75, // both set — should fail
    })
    expect(error).toBeTruthy()
    expect(error?.message).toMatch(/deal_analysis_loan_xor/i)
  })

  it('rejects financed deals that set neither loan_amount_cents nor loan_to_value_pct', async () => {
    const { organizationId } = await getTestOrgAndUser()
    const propertyId = await createProperty(organizationId)
    const admin = adminClient()
    const { error } = await admin.from('deal_analysis').insert({
      property_id: propertyId,
      organization_id: organizationId,
      name: 'Loan XOR neither',
      analysis_type: 'flip',
      arv_cents: 30_000_000,
      purchase_price_cents: 18_000_000,
      rehab_estimate_cents: 4_000_000,
      arv_percentage: 70,
      financing_type: 'hard_money',
      loan_basis: 'amount',
      // both null — should fail XOR
    })
    expect(error).toBeTruthy()
    expect(error?.message).toMatch(/deal_analysis_loan_xor/i)
  })
})

describe('comp adjustment_notes CHECK', () => {
  it('rejects a comp with non-zero adjustment_cents and empty adjustment_notes', async () => {
    const { organizationId } = await getTestOrgAndUser()
    const propertyId = await createProperty(organizationId)
    const dealId = await createDeal(organizationId, propertyId)

    const admin = adminClient()
    const { error } = await admin.from('comp').insert({
      deal_analysis_id: dealId,
      organization_id: organizationId,
      address: '99 Test Comp Lane',
      sale_price_cents: 25_000_000,
      adjustment_cents: 1_500_000, // non-zero
      adjustment_notes: null, // missing
    })
    expect(error).toBeTruthy()
    expect(error?.message).toMatch(/comp_adjustment_requires_notes/i)
  })

  it('accepts a comp with zero adjustment and no notes', async () => {
    const { organizationId } = await getTestOrgAndUser()
    const propertyId = await createProperty(organizationId)
    const dealId = await createDeal(organizationId, propertyId)

    const admin = adminClient()
    const { data, error } = await admin
      .from('comp')
      .insert({
        deal_analysis_id: dealId,
        organization_id: organizationId,
        address: '100 Test Comp Lane',
        sale_price_cents: 25_000_000,
        adjustment_cents: 0,
        adjustment_notes: null,
      })
      .select('id')
      .single()
    expect(error).toBeNull()
    expect(data?.id).toBeTruthy()
  })
})

describe('comp suggested_arv_cents from the view', () => {
  it('averages included comps and ignores excluded ones', async () => {
    const { organizationId } = await getTestOrgAndUser()
    const propertyId = await createProperty(organizationId)
    const dealId = await createDeal(organizationId, propertyId)
    const admin = adminClient()

    // Three comps: $300k, $310k, $320k. All included → expected avg = 310k.
    const comps = [
      { address: 'C1 Test St', sale_price_cents: 30_000_000, included_in_arv: true },
      { address: 'C2 Test St', sale_price_cents: 31_000_000, included_in_arv: true },
      { address: 'C3 Test St', sale_price_cents: 32_000_000, included_in_arv: true },
    ]
    for (const c of comps) {
      await admin
        .from('comp')
        .insert({
          deal_analysis_id: dealId,
          organization_id: organizationId,
          adjustment_cents: 0,
          ...c,
        })
        .throwOnError()
    }

    const { data: row } = await admin
      .from('deal_analysis_computed')
      .select('suggested_arv_cents, comp_count')
      .eq('id', dealId)
      .single()
    expect(row?.comp_count).toBe(3)
    expect(row?.suggested_arv_cents).toBe(31_000_000)

    // Exclude the cheapest. Avg = (310 + 320) / 2 = 315k.
    await admin
      .from('comp')
      .update({ included_in_arv: false })
      .eq('deal_analysis_id', dealId)
      .eq('address', 'C1 Test St')
      .throwOnError()

    const { data: row2 } = await admin
      .from('deal_analysis_computed')
      .select('suggested_arv_cents, comp_count')
      .eq('id', dealId)
      .single()
    expect(row2?.comp_count).toBe(2)
    expect(row2?.suggested_arv_cents).toBe(31_500_000)
  })
})

describe('deal_analysis_revision audit trigger', () => {
  it('writes a snapshot row when a deal is updated', async () => {
    const { organizationId } = await getTestOrgAndUser()
    const propertyId = await createProperty(organizationId)
    const dealId = await createDeal(organizationId, propertyId)
    const admin = adminClient()

    await admin
      .from('deal_analysis')
      .update({ arv_cents: 35_000_000 })
      .eq('id', dealId)
      .throwOnError()

    const { data: revisions, count } = await admin
      .from('deal_analysis_revision')
      .select('id, snapshot', { count: 'exact' })
      .eq('deal_analysis_id', dealId)
    expect(count).toBe(1)
    const snap = revisions?.[0]?.snapshot as Record<string, number>
    expect(snap?.arv_cents).toBe(30_000_000) // pre-update value
  })
})

describe('archive coherence CHECK', () => {
  it('rejects is_archived=true with archived_at=null', async () => {
    const { organizationId } = await getTestOrgAndUser()
    const propertyId = await createProperty(organizationId)
    const dealId = await createDeal(organizationId, propertyId)
    const admin = adminClient()

    const { error } = await admin
      .from('deal_analysis')
      .update({ is_archived: true, archived_at: null })
      .eq('id', dealId)
    expect(error).toBeTruthy()
    expect(error?.message).toMatch(/deal_analysis_archive_coherent/i)
  })
})

describe('property auto-populates organization_id on deal insert', () => {
  it('trg_deal_analysis_set_org fills organization_id when omitted', async () => {
    const { organizationId } = await getTestOrgAndUser()
    const propertyId = await createProperty(organizationId)
    const admin = adminClient()

    // Omit organization_id; the BEFORE INSERT trigger should fill it from
    // the parent property.
    const { data, error } = await admin
      .from('deal_analysis')
      .insert({
        property_id: propertyId,
        // organization_id intentionally omitted
        name: 'Org auto-populate test',
        analysis_type: 'flip',
        arv_cents: 30_000_000,
        purchase_price_cents: 18_000_000,
        rehab_estimate_cents: 4_000_000,
        arv_percentage: 70,
        financing_type: 'cash',
        loan_basis: null,
      } as never)
      .select('id, organization_id')
      .single()
    expect(error).toBeNull()
    expect(data?.organization_id).toBe(organizationId)
    if (data) {
      cleanup.push(async () => {
        await adminClient().from('deal_analysis').delete().eq('id', data.id)
      })
    }
  })
})

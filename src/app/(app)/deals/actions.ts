'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createDealSchema, dealFormSchema, type CreateDealInput } from '@/types/schemas/deal'

export type ActionResult<T = unknown> = ({ ok: true } & T) | { error: string }

type SessionFailure = { error: string }
type SessionSuccess = {
  supabase: Awaited<ReturnType<typeof createClient>>
  user: { id: string; email?: string | null }
  membership: { organization_id: string; role: string }
}

async function getUserAndOrg(): Promise<SessionFailure | SessionSuccess> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: membership } = await supabase
    .from('organization_member')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .limit(1)
    .single()
  if (!membership) return { error: 'No organization found.' }

  return { supabase, user: { id: user.id, email: user.email }, membership }
}

// Map normalized form values to the deal_analysis insert shape, dropping
// fields that don't apply (e.g. BRRRR fields on flip analyses).
function dealValuesToInsert(values: z.infer<typeof dealFormSchema>) {
  const isBrrrr = values.analysis_type === 'brrrr'
  return {
    name: values.name,
    analysis_type: values.analysis_type,
    arv_cents: values.arv_cents,
    purchase_price_cents: values.purchase_price_cents,
    rehab_estimate_cents: values.rehab_estimate_cents,
    arv_percentage: values.arv_percentage,
    financing_type: values.financing_type,
    loan_basis: values.financing_type === 'cash' ? null : values.loan_basis,
    loan_amount_cents:
      values.financing_type === 'cash' || values.loan_basis !== 'amount'
        ? null
        : values.loan_amount_cents,
    loan_to_value_pct:
      values.financing_type === 'cash' || values.loan_basis !== 'ltv'
        ? null
        : values.loan_to_value_pct,
    interest_rate: values.financing_type === 'cash' ? null : values.interest_rate,
    loan_term_months: values.financing_type === 'cash' ? null : values.loan_term_months,
    origination_points: values.financing_type === 'cash' ? null : values.origination_points,
    other_loan_fees_cents:
      values.financing_type === 'cash' ? 0 : values.other_loan_fees_cents,
    buying_closing_costs_cents: values.buying_closing_costs_cents,
    selling_closing_costs_cents: values.selling_closing_costs_cents,
    holding_period_months: values.holding_period_months,
    holding_taxes_cents: values.holding_taxes_cents,
    holding_insurance_cents: values.holding_insurance_cents,
    holding_utilities_cents: values.holding_utilities_cents,
    holding_interest_cents: values.holding_interest_cents,
    holding_hoa_cents: values.holding_hoa_cents,
    holding_other_cents: values.holding_other_cents,
    buy_agent_commission_pct: values.buy_agent_commission_pct,
    sell_agent_commission_pct: values.sell_agent_commission_pct,
    staging_costs_cents: values.staging_costs_cents,
    cash_invested_cents: values.cash_invested_cents,
    monthly_rent_cents: isBrrrr ? values.monthly_rent_cents : null,
    vacancy_rate_pct: isBrrrr ? values.vacancy_rate_pct : null,
    property_mgmt_fee_pct: isBrrrr ? values.property_mgmt_fee_pct : null,
    monthly_maintenance_cents: isBrrrr ? values.monthly_maintenance_cents : null,
    refinance_ltv_pct: isBrrrr ? values.refinance_ltv_pct : null,
    refinance_interest_rate: isBrrrr ? values.refinance_interest_rate : null,
    refinance_term_years: isBrrrr ? values.refinance_term_years : null,
  }
}

export async function createPropertyWithAnalysis(
  input: CreateDealInput
): Promise<ActionResult<{ dealId: string }>> {
  const parsed = createDealSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Invalid form: please review the highlighted fields.' }
  }

  const session = await getUserAndOrg()
  if ('error' in session) return { error: session.error }
  const { supabase, user, membership } = session

  let propertyId: string
  let createdPropertyId: string | null = null

  if (parsed.data.property_mode === 'existing') {
    if (!parsed.data.property_id) {
      return { error: 'Pick a property first.' }
    }
    propertyId = parsed.data.property_id
  } else {
    if (
      !parsed.data.address_line1 ||
      !parsed.data.city ||
      !parsed.data.state ||
      !parsed.data.zip
    ) {
      return { error: 'Address fields are required when creating a new property.' }
    }
    const { data: prop, error: propErr } = await supabase
      .from('property')
      .insert({
        organization_id: membership.organization_id,
        address_line1: parsed.data.address_line1,
        address_line2: parsed.data.address_line2 ?? null,
        city: parsed.data.city,
        state: parsed.data.state.toUpperCase(),
        zip: parsed.data.zip,
        sqft: parsed.data.sqft ?? null,
        bedrooms: parsed.data.bedrooms ?? null,
        bathrooms: parsed.data.bathrooms ?? null,
        year_built: parsed.data.year_built ?? null,
        property_type: parsed.data.property_type,
        created_by: user.id,
      })
      .select('id')
      .single()
    if (propErr) {
      if (propErr.code === '23505') {
        return {
          error:
            'A property at this address already exists. Pick "Existing property" in step 1 instead.',
        }
      }
      return { error: propErr.message }
    }
    propertyId = prop.id
    createdPropertyId = prop.id
  }

  const { data: deal, error: dealErr } = await supabase
    .from('deal_analysis')
    .insert({
      property_id: propertyId,
      organization_id: membership.organization_id,
      created_by: user.id,
      ...dealValuesToInsert(parsed.data),
    })
    .select('id')
    .single()

  if (dealErr || !deal) {
    // Roll back the property we just created if we owned it.
    if (createdPropertyId) {
      await supabase.from('property').delete().eq('id', createdPropertyId)
    }
    return { error: dealErr?.message ?? 'Could not save the analysis.' }
  }

  revalidatePath('/deals')
  revalidatePath(`/deals/${deal.id}`)
  redirect(`/deals/${deal.id}`)
}

export async function updateDealAnalysis(
  id: string,
  patch: z.infer<typeof dealFormSchema>
): Promise<ActionResult> {
  const parsed = dealFormSchema.safeParse(patch)
  if (!parsed.success) {
    return { error: 'Invalid form: please review the highlighted fields.' }
  }
  const session = await getUserAndOrg()
  if ('error' in session) return { error: session.error }
  const { supabase } = session

  const { error } = await supabase
    .from('deal_analysis')
    .update(dealValuesToInsert(parsed.data))
    .eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/deals')
  revalidatePath(`/deals/${id}`)
  return { ok: true }
}

export async function archiveDealAnalysis(id: string): Promise<ActionResult> {
  const session = await getUserAndOrg()
  if ('error' in session) return { error: session.error }
  const { supabase, user } = session

  const { error } = await supabase
    .from('deal_analysis')
    .update({
      is_archived: true,
      archived_at: new Date().toISOString(),
      archived_by: user.id,
    })
    .eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/deals')
  revalidatePath(`/deals/${id}`)
  return { ok: true }
}

export async function restoreDealAnalysis(id: string): Promise<ActionResult> {
  const session = await getUserAndOrg()
  if ('error' in session) return { error: session.error }
  const { supabase } = session

  const { error } = await supabase
    .from('deal_analysis')
    .update({ is_archived: false, archived_at: null, archived_by: null })
    .eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/deals')
  revalidatePath(`/deals/${id}`)
  return { ok: true }
}

// ─────────────────────────── Comp actions ───────────────────────────
import { compInsertSchema, compPatchSchema } from '@/types/schemas/comp'

export async function addComp(
  dealId: string,
  input: z.infer<typeof compInsertSchema>
): Promise<ActionResult<{ compId: string }>> {
  const parsed = compInsertSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid comp.' }

  const session = await getUserAndOrg()
  if ('error' in session) return { error: session.error }
  const { supabase, membership } = session

  const { data, error } = await supabase
    .from('comp')
    .insert({
      deal_analysis_id: dealId,
      organization_id: membership.organization_id,
      ...parsed.data,
    })
    .select('id')
    .single()
  if (error || !data) return { error: error?.message ?? 'Could not save comp.' }

  revalidatePath(`/deals/${dealId}`)
  return { ok: true, compId: data.id }
}

export async function updateComp(
  id: string,
  dealId: string,
  patch: z.infer<typeof compPatchSchema>
): Promise<ActionResult> {
  const parsed = compPatchSchema.safeParse(patch)
  if (!parsed.success) return { error: 'Invalid comp patch.' }

  const session = await getUserAndOrg()
  if ('error' in session) return { error: session.error }
  const { supabase } = session

  const { error } = await supabase.from('comp').update(parsed.data).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath(`/deals/${dealId}`)
  return { ok: true }
}

export async function deleteComp(id: string, dealId: string): Promise<ActionResult> {
  const session = await getUserAndOrg()
  if ('error' in session) return { error: session.error }
  const { supabase } = session

  const { error } = await supabase.from('comp').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath(`/deals/${dealId}`)
  return { ok: true }
}

export async function toggleCompIncluded(
  id: string,
  dealId: string,
  included: boolean
): Promise<ActionResult> {
  const session = await getUserAndOrg()
  if ('error' in session) return { error: session.error }
  const { supabase } = session

  const { error } = await supabase.from('comp').update({ included_in_arv: included }).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath(`/deals/${dealId}`)
  return { ok: true }
}

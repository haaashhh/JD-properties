'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { applyTemplate } from '@/lib/calculations/budget'
import {
  applyTemplateSchema,
  type ApplyTemplateInput,
} from '@/types/schemas/budget-template'
import {
  budgetLineUpsertSchema,
  type BudgetLineInput,
} from '@/types/schemas/budget-line'
import {
  expenseInsertSchema,
  expensePatchSchema,
  type ExpenseInput,
  type ExpensePatch,
} from '@/types/schemas/expense'

export type ActionResult<T = unknown> = ({ ok: true } & T) | { error: string }

type SessionFailure = { error: string }
type SessionSuccess = {
  supabase: Awaited<ReturnType<typeof createClient>>
  userId: string
  organizationId: string
  role: string
}

async function getSession(): Promise<SessionFailure | SessionSuccess> {
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
  return {
    supabase,
    userId: user.id,
    organizationId: membership.organization_id,
    role: membership.role,
  }
}

// ─── Budget line CRUD ────────────────────────────────────────────────────
export async function upsertBudgetLine(
  projectId: string,
  input: BudgetLineInput
): Promise<ActionResult> {
  const parsed = budgetLineUpsertSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid budget line.' }

  const session = await getSession()
  if ('error' in session) return { error: session.error }
  const { supabase, organizationId } = session

  // Upsert on (project_id, budget_category_id). The schema has a unique
  // constraint on this pair so onConflict triggers an UPDATE.
  const { error } = await supabase
    .from('project_budget')
    .upsert(
      {
        project_id: projectId,
        organization_id: organizationId,
        budget_category_id: parsed.data.budget_category_id,
        estimated_cents: parsed.data.estimated_cents,
        notes: parsed.data.notes ?? null,
      },
      { onConflict: 'project_id,budget_category_id' }
    )
  if (error) return { error: error.message }

  revalidatePath(`/projects/${projectId}/budget`)
  revalidatePath(`/projects/${projectId}`)
  return { ok: true }
}

export async function deleteBudgetLine(
  projectId: string,
  categoryId: string
): Promise<ActionResult> {
  const session = await getSession()
  if ('error' in session) return { error: session.error }
  const { supabase } = session

  const { error } = await supabase
    .from('project_budget')
    .delete()
    .eq('project_id', projectId)
    .eq('budget_category_id', categoryId)
  if (error) return { error: error.message }

  revalidatePath(`/projects/${projectId}/budget`)
  return { ok: true }
}

// ─── Apply template ──────────────────────────────────────────────────────
export async function applyBudgetTemplate(
  projectId: string,
  input: ApplyTemplateInput
): Promise<ActionResult<{ inserted: number; updated: number }>> {
  const parsed = applyTemplateSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid template apply input.' }

  const session = await getSession()
  if ('error' in session) return { error: session.error }
  const { supabase, organizationId } = session

  const { data: lines, error: linesErr } = await supabase
    .from('budget_template_line')
    .select('budget_category_id, default_amount_cents, per_sqft_rate_cents')
    .eq('budget_template_id', parsed.data.template_id)
  if (linesErr || !lines || lines.length === 0) {
    return { error: 'Template not found or has no lines.' }
  }

  const computed = applyTemplate(
    lines.map((l) => ({
      budget_category_id: l.budget_category_id,
      default_amount_cents: l.default_amount_cents,
      per_sqft_rate_cents: l.per_sqft_rate_cents,
    })),
    parsed.data.sqft
  )

  const { data: existing } = await supabase
    .from('project_budget')
    .select('budget_category_id')
    .eq('project_id', projectId)
  const existingIds = new Set((existing ?? []).map((r) => r.budget_category_id))

  const toInsert = computed.filter((c) => !existingIds.has(c.budget_category_id))
  const toUpdate = parsed.data.overwrite
    ? computed.filter((c) => existingIds.has(c.budget_category_id))
    : []

  let insertedCount = 0
  let updatedCount = 0

  if (toInsert.length > 0) {
    const { error } = await supabase.from('project_budget').insert(
      toInsert.map((c) => ({
        project_id: projectId,
        organization_id: organizationId,
        budget_category_id: c.budget_category_id,
        estimated_cents: c.estimated_cents,
      }))
    )
    if (error) return { error: error.message }
    insertedCount = toInsert.length
  }

  for (const c of toUpdate) {
    const { error } = await supabase
      .from('project_budget')
      .update({ estimated_cents: c.estimated_cents })
      .eq('project_id', projectId)
      .eq('budget_category_id', c.budget_category_id)
    if (error) return { error: error.message }
    updatedCount += 1
  }

  revalidatePath(`/projects/${projectId}/budget`)
  revalidatePath(`/projects/${projectId}`)
  return { ok: true, inserted: insertedCount, updated: updatedCount }
}

// ─── Expense CRUD ────────────────────────────────────────────────────────
export async function addExpense(
  projectId: string,
  input: ExpenseInput
): Promise<ActionResult<{ expenseId: string }>> {
  const parsed = expenseInsertSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid expense.' }

  const session = await getSession()
  if ('error' in session) return { error: session.error }
  const { supabase, userId, organizationId } = session

  const { data, error } = await supabase
    .from('project_expense')
    .insert({
      project_id: projectId,
      organization_id: organizationId,
      ...parsed.data,
      created_by: userId,
    })
    .select('id')
    .single()
  if (error || !data) return { error: error?.message ?? 'Could not save expense.' }

  revalidatePath(`/projects/${projectId}/budget`)
  revalidatePath(`/projects/${projectId}`)
  return { ok: true, expenseId: data.id }
}

export async function updateExpense(
  id: string,
  projectId: string,
  patch: ExpensePatch
): Promise<ActionResult> {
  const parsed = expensePatchSchema.safeParse(patch)
  if (!parsed.success) return { error: 'Invalid expense patch.' }

  const session = await getSession()
  if ('error' in session) return { error: session.error }
  const { supabase } = session

  const { error } = await supabase.from('project_expense').update(parsed.data).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath(`/projects/${projectId}/budget`)
  return { ok: true }
}

export async function deleteExpense(
  id: string,
  projectId: string
): Promise<ActionResult> {
  const session = await getSession()
  if ('error' in session) return { error: session.error }
  const { supabase } = session

  // If the expense has a receipt, clean it up from storage too.
  const { data: existing } = await supabase
    .from('project_expense')
    .select('receipt_url')
    .eq('id', id)
    .single()
  if (existing?.receipt_url) {
    await supabase.storage.from('receipts').remove([existing.receipt_url])
  }

  const { error } = await supabase.from('project_expense').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath(`/projects/${projectId}/budget`)
  return { ok: true }
}

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  budgetTemplateInsertSchema,
  budgetTemplateMetaPatchSchema,
  type BudgetTemplateInput,
  type BudgetTemplateMetaPatch,
} from '@/types/schemas/budget-template'

export type ActionResult<T = unknown> = ({ ok: true } & T) | { error: string }

type SessionFailure = { error: string }
type SessionSuccess = {
  supabase: Awaited<ReturnType<typeof createClient>>
  userId: string
  organizationId: string
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
  return { supabase, userId: user.id, organizationId: membership.organization_id }
}

export async function createBudgetTemplate(
  input: BudgetTemplateInput
): Promise<ActionResult<{ templateId: string }>> {
  const parsed = budgetTemplateInsertSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid template.' }

  const session = await getSession()
  if ('error' in session) return { error: session.error }
  const { supabase, userId, organizationId } = session

  const { data: template, error } = await supabase
    .from('budget_template')
    .insert({
      organization_id: organizationId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      scope_tier: parsed.data.scope_tier,
      created_by: userId,
    })
    .select('id')
    .single()
  if (error || !template) return { error: error?.message ?? 'Could not save template.' }

  const lineRows = parsed.data.lines.map((l, idx) => ({
    budget_template_id: template.id,
    budget_category_id: l.budget_category_id,
    default_amount_cents: l.default_amount_cents ?? 0,
    per_sqft_rate_cents: l.per_sqft_rate_cents ?? 0,
    sort_order: l.sort_order ?? idx * 10,
    notes: l.notes ?? null,
  }))
  const { error: linesErr } = await supabase.from('budget_template_line').insert(lineRows)
  if (linesErr) {
    await supabase.from('budget_template').delete().eq('id', template.id)
    return { error: linesErr.message }
  }

  revalidatePath('/settings/templates')
  return { ok: true, templateId: template.id }
}

export async function updateBudgetTemplateMeta(
  id: string,
  patch: BudgetTemplateMetaPatch
): Promise<ActionResult> {
  const parsed = budgetTemplateMetaPatchSchema.safeParse(patch)
  if (!parsed.success) return { error: 'Invalid template patch.' }

  const session = await getSession()
  if ('error' in session) return { error: session.error }
  const { supabase } = session

  const { error } = await supabase.from('budget_template').update(parsed.data).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/settings/templates')
  return { ok: true }
}

export async function archiveBudgetTemplate(id: string): Promise<ActionResult> {
  return updateBudgetTemplateMeta(id, { is_archived: true })
}

export async function deleteBudgetTemplate(id: string): Promise<ActionResult> {
  const session = await getSession()
  if ('error' in session) return { error: session.error }
  const { supabase } = session

  // RLS prevents deleting system templates (org_id IS NULL).
  const { error } = await supabase.from('budget_template').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/settings/templates')
  return { ok: true }
}

// Clone a project's current budget lines into a new template.
export async function saveTemplateFromProject(
  projectId: string,
  name: string,
  scopeTier: 'cosmetic' | 'heavy' | 'gut' | 'custom'
): Promise<ActionResult<{ templateId: string }>> {
  if (!name.trim()) return { error: 'Template name is required.' }
  const session = await getSession()
  if ('error' in session) return { error: session.error }
  const { supabase, userId, organizationId } = session

  const { data: existingLines } = await supabase
    .from('project_budget')
    .select('budget_category_id, estimated_cents, notes')
    .eq('project_id', projectId)
    .order('estimated_cents', { ascending: false })

  if (!existingLines || existingLines.length === 0) {
    return { error: 'Project has no budget lines to clone.' }
  }

  const { data: template, error: tplErr } = await supabase
    .from('budget_template')
    .insert({
      organization_id: organizationId,
      name: name.trim(),
      scope_tier: scopeTier,
      created_by: userId,
    })
    .select('id')
    .single()
  if (tplErr || !template) return { error: tplErr?.message ?? 'Could not save template.' }

  const lineRows = existingLines
    .filter((l) => Number(l.estimated_cents) > 0)
    .map((l, idx) => ({
      budget_template_id: template.id,
      budget_category_id: l.budget_category_id,
      default_amount_cents: Number(l.estimated_cents),
      per_sqft_rate_cents: 0,
      sort_order: idx * 10,
      notes: l.notes ?? null,
    }))
  if (lineRows.length === 0) {
    await supabase.from('budget_template').delete().eq('id', template.id)
    return { error: 'Project has no non-zero budget lines.' }
  }
  const { error: linesErr } = await supabase.from('budget_template_line').insert(lineRows)
  if (linesErr) {
    await supabase.from('budget_template').delete().eq('id', template.id)
    return { error: linesErr.message }
  }

  revalidatePath('/settings/templates')
  revalidatePath(`/projects/${projectId}/budget`)
  return { ok: true, templateId: template.id }
}

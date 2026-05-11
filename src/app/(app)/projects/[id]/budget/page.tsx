import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { BudgetTable, type BudgetRow } from '@/components/budget/budget-table'
import { ExpenseList, type ExpenseRow } from '@/components/budget/expense-list'
import { ExpenseForm } from '@/components/budget/expense-form'
import { BudgetPageActions } from './budget-page-actions'
import type { CategoryStatus } from '@/lib/calculations/budget'

interface CategoryLookupRow {
  id: string
  name: string
  group_name: string | null
  organization_id: string | null
  sort_order: number | null
}

export default async function ProjectBudgetPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('project')
    .select(
      `id, organization_id, contingency_pct,
       property:property_id(sqft)`
    )
    .eq('id', id)
    .single()
  if (!project) notFound()

  const property = project.property as { sqft: number | null } | null

  // Categories visible to this org: system (org_id NULL) + this org's.
  const { data: categoriesRaw } = await supabase
    .from('budget_category')
    .select('id, name, group_name, organization_id, sort_order')
    .or(`organization_id.is.null,organization_id.eq.${project.organization_id}`)
    .order('sort_order')
  const categories = (categoriesRaw ?? []) as CategoryLookupRow[]
  const categoryById = new Map(categories.map((c) => [c.id, c]))

  const [{ data: summary }, { data: budgetMeta }, { data: expenses }, { data: templates }] =
    await Promise.all([
      supabase
        .from('project_budget_summary')
        .select('budget_category_id, estimated_cents, actual_cents, variance_cents, percent_spent, status')
        .eq('project_id', id),
      supabase
        .from('project_budget')
        .select('budget_category_id, notes')
        .eq('project_id', id),
      supabase
        .from('project_expense')
        .select('id, amount_cents, expense_date, vendor_name, description, payment_method, budget_category_id, receipt_url')
        .eq('project_id', id)
        .order('expense_date', { ascending: false }),
      supabase
        .from('budget_template')
        .select('id, name, scope_tier, organization_id')
        .or(`organization_id.is.null,organization_id.eq.${project.organization_id}`)
        .eq('is_archived', false)
        .order('name'),
    ])

  const notesById = new Map((budgetMeta ?? []).map((r) => [r.budget_category_id, r.notes]))

  const rows: BudgetRow[] = (summary ?? []).map((r) => {
    const cat = categoryById.get(r.budget_category_id ?? '')
    return {
      budget_category_id: r.budget_category_id ?? '',
      category_name: cat?.name ?? 'Uncategorized',
      group_name: cat?.group_name ?? 'other',
      estimated_cents: Number(r.estimated_cents ?? 0),
      actual_cents: Number(r.actual_cents ?? 0),
      variance_cents: Number(r.variance_cents ?? 0),
      percent_spent: r.percent_spent != null ? Number(r.percent_spent) : null,
      status: (r.status ?? 'not_started') as CategoryStatus,
      notes: notesById.get(r.budget_category_id ?? '') ?? null,
    }
  })

  const expenseRows: ExpenseRow[] = (expenses ?? []).map((e) => ({
    id: e.id,
    amount_cents: Number(e.amount_cents),
    expense_date: e.expense_date,
    vendor_name: e.vendor_name,
    description: e.description,
    payment_method: e.payment_method,
    budget_category_id: e.budget_category_id,
    category_name: e.budget_category_id ? categoryById.get(e.budget_category_id)?.name ?? null : null,
    receipt_url: e.receipt_url,
  }))

  const totalBudget = rows.reduce((s, r) => s + r.estimated_cents, 0)
  const totalSpent = rows.reduce((s, r) => s + r.actual_cents, 0)
  const remaining = totalBudget - totalSpent
  const existingCategoryIds = new Set(rows.map((r) => r.budget_category_id).filter(Boolean))

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        <KpiCard label="Budget" value={formatCurrency(totalBudget)} />
        <KpiCard label="Spent" value={formatCurrency(totalSpent)} />
        <KpiCard
          label="Remaining"
          value={formatCurrency(remaining)}
          tone={remaining < 0 ? 'destructive' : 'positive'}
        />
        <KpiCard label="Contingency" value={`${project.contingency_pct ?? 10}%`} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Budget vs Actuals</CardTitle>
          <BudgetPageActions
            projectId={id}
            defaultSqft={property?.sqft ?? null}
            templates={templates ?? []}
            existingCategoryIds={existingCategoryIds}
          />
        </CardHeader>
        <CardContent>
          <BudgetTable projectId={id} rows={rows} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add expense</CardTitle>
        </CardHeader>
        <CardContent>
          <ExpenseForm
            projectId={id}
            categories={categories.map((c) => ({ id: c.id, name: c.name, group_name: c.group_name }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Expenses ({expenseRows.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ExpenseList
            projectId={id}
            expenses={expenseRows}
            categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          />
        </CardContent>
      </Card>
    </div>
  )
}

function KpiCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'positive' | 'destructive'
}) {
  return (
    <div className="rounded-md border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-xl font-semibold tabular-nums ${
          tone === 'destructive'
            ? 'text-destructive'
            : tone === 'positive'
              ? 'text-emerald-600'
              : 'text-foreground'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

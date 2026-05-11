// Quick sanity report on what the demo seed produced. Reads from project_summary
// and the major child tables, prints a few aggregate stats.

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../src/types/database.ts'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const admin = createClient<Database>(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function money(cents: number | null | undefined): string {
  if (cents == null) return '—'
  return `$${Math.round(cents / 100).toLocaleString('en-US')}`
}

async function main() {
  const { data: list } = await admin.auth.admin.listUsers()
  const adminUser = list?.users.find((u) => u.email === 'admin@properties-by-jd.local')
  if (!adminUser) throw new Error('admin not found')
  const { data: member } = await admin
    .from('organization_member')
    .select('organization_id')
    .eq('user_id', adminUser.id)
    .single()
  const orgId = member!.organization_id

  console.log('Organization:', orgId)

  const counts = await Promise.all(
    [
      'property',
      'contractor',
      'deal_analysis',
      'comp',
      'project',
      'project_milestone',
      'project_task',
      'project_budget',
      'project_expense',
    ].map(async (table) => {
      const { count } = await admin.from(table).select('*', { count: 'exact', head: true }).eq(
        // project_expense and project_budget don't have organization_id, so filter via project
        table === 'project_expense' || table === 'project_budget' ? 'project_id' : 'organization_id',
        // For child tables, we want to count rows belonging to org's projects. Quick hack: skip filter
        // and rely on the fact that this is a single-org dev DB.
        orgId
      )
      return { table, count }
    })
  )
  // Re-do project_expense / project_budget counts properly.
  const { data: projects } = await admin
    .from('project')
    .select('id')
    .eq('organization_id', orgId)
  const projectIds = (projects ?? []).map((p) => p.id)
  const { count: expenseCount } = await admin
    .from('project_expense')
    .select('*', { count: 'exact', head: true })
    .in('project_id', projectIds)
  const { count: budgetCount } = await admin
    .from('project_budget')
    .select('*', { count: 'exact', head: true })
    .in('project_id', projectIds)

  console.log('\nRecord counts:')
  for (const c of counts) {
    if (c.table === 'project_expense' || c.table === 'project_budget') continue
    console.log(`  ${c.table.padEnd(22)} ${c.count ?? 0}`)
  }
  console.log(`  project_budget         ${budgetCount ?? 0}`)
  console.log(`  project_expense        ${expenseCount ?? 0}`)

  console.log('\nProjects by phase (from project_summary):')
  const { data: summary } = await admin
    .from('project_summary')
    .select('name, pipeline_stage, pipeline_phase, total_budget_cents, total_spent_cents, arv_cents, projected_net_profit_cents, milestones_complete, milestones_total, tasks_open, target_close_date')
    .eq('organization_id', orgId)
    .order('pipeline_phase')

  for (const row of summary ?? []) {
    console.log(
      `  [${row.pipeline_phase}/${row.pipeline_stage}] ${row.name}`
    )
    console.log(
      `      budget=${money(row.total_budget_cents)}  spent=${money(row.total_spent_cents)}  ARV=${money(row.arv_cents)}  profit=${money(row.projected_net_profit_cents)}  milestones=${row.milestones_complete}/${row.milestones_total}  open_tasks=${row.tasks_open}  target=${row.target_close_date ?? '—'}`
    )
  }

  console.log('\nDeals with computed ROI (top of list):')
  const { data: deals } = await admin
    .from('deal_analysis_computed')
    .select('name, analysis_type, arv_cents, net_profit_cents, roi_pct, annualized_roi_pct, profit_margin_pct, suggested_arv_cents, comp_count')
    .eq('organization_id', orgId)
    .order('roi_pct', { ascending: false, nullsFirst: false })
    .limit(5)
  for (const d of deals ?? []) {
    console.log(
      `  ${d.name?.padEnd(36)} [${d.analysis_type}] ARV ${money(d.arv_cents)}  profit ${money(d.net_profit_cents)}  ROI ${d.roi_pct ?? '—'}%  annualized ${d.annualized_roi_pct ?? '—'}%  margin ${d.profit_margin_pct ?? '—'}%  suggestedARV ${money(d.suggested_arv_cents)} (n=${d.comp_count})`
    )
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

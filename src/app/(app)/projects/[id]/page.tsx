import { notFound } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate, formatPercentage } from '@/lib/utils'
import { labelForStage } from '@/lib/projects'
import { projectedMargin } from '@/lib/calculations/budget'
import { StageAgingDot } from '@/components/projects/stage-aging-dot'
import type { StageHistoryEntry } from '@/types/project'

export default async function ProjectOverviewPage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params
  const supabase = await createClient()

  const [{ data: summary }, { data: project }] = await Promise.all([
    supabase.from('project_summary').select('*').eq('id', id).single(),
    supabase
      .from('project')
      .select(
        `id, stage_history, target_close_date, purchase_date, rehab_start_date,
         rehab_end_date, listing_date, sale_date, notes`
      )
      .eq('id', id)
      .single(),
  ])

  if (!summary || !project) notFound()

  const history = (project.stage_history ?? []) as unknown as StageHistoryEntry[]

  // Margin-at-risk: project current run-rate spend forward to the target
  // close. Compares against the underwritten projected profit from the
  // linked deal_analysis. Fires when projection drops > 15% below the
  // underwriting figure.
  const totalSpentCents = Number(summary.total_spent_cents ?? 0)
  const totalBudgetCents = Number(summary.total_budget_cents ?? 0)
  const remainingBudgetCents = Math.max(0, totalBudgetCents - totalSpentCents)
  const monthsLeft = monthsBetween(new Date(), summary.target_close_date)
  const margin = projectedMargin({
    arvCents: Number(summary.arv_cents ?? 0),
    underwrittenProfitCents: summary.projected_net_profit_cents != null
      ? Number(summary.projected_net_profit_cents)
      : null,
    totalSpentCents,
    remainingBudgetCents,
    holdingMonthsLeft: monthsLeft,
    monthlyHoldingCents: 0, // not in project_summary yet — conservative
  })

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        {margin.marginAtRisk ? (
          <Card className="border-amber-500/60 bg-amber-50/40 dark:bg-amber-950/30">
            <CardContent className="flex items-start gap-3 pt-6">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
              <div className="flex-1">
                <p className="font-semibold text-amber-900 dark:text-amber-100">
                  Margin at risk
                </p>
                <p className="mt-0.5 text-sm text-amber-900/80 dark:text-amber-100/80">
                  Projected profit is {formatCurrency(margin.projectedProfitCents)}
                  {margin.driftFromUnderwritingPct != null
                    ? ` — ${Math.abs(margin.driftFromUnderwritingPct)}% below underwriting`
                    : ''}
                  . Projected ROI: {formatPercentage(margin.projectedRoiPct)}.
                </p>
              </div>
              <Badge variant="secondary" className="bg-amber-200 text-amber-900">
                Review
              </Badge>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Project at a glance</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3 text-sm">
            <Stat label="ARV" value={formatCurrency(summary.arv_cents)} />
            <Stat
              label="Projected profit"
              value={formatCurrency(summary.projected_net_profit_cents)}
            />
            <Stat label="Projected ROI" value={formatPercentage(summary.projected_roi_pct)} />
            <Stat label="Budget" value={formatCurrency(summary.total_budget_cents)} />
            <Stat label="Spent" value={formatCurrency(summary.total_spent_cents)} />
            <Stat
              label="Variance"
              value={formatCurrency(summary.budget_variance_cents)}
            />
            <Stat label="Milestones" value={`${summary.milestones_complete ?? 0} / ${summary.milestones_total ?? 0}`} />
            <Stat label="Open tasks" value={String(summary.tasks_open ?? 0)} />
            <Stat label="Photos" value={String(summary.photos_count ?? 0)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Key dates</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3 text-sm">
            <Stat label="Purchase" value={formatDate(project.purchase_date)} />
            <Stat label="Rehab start" value={formatDate(project.rehab_start_date)} />
            <Stat label="Rehab end" value={formatDate(project.rehab_end_date)} />
            <Stat label="Listed" value={formatDate(project.listing_date)} />
            <Stat label="Sold" value={formatDate(project.sale_date)} />
            <Stat label="Target close" value={formatDate(summary.target_close_date)} />
          </CardContent>
        </Card>

        {project.notes ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{project.notes}</p>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <aside className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pipeline history</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 flex items-center gap-2 text-sm">
              Currently <strong>{labelForStage(summary.pipeline_stage ?? 'lead')}</strong>
              <StageAgingDot stageChangedAt={summary.stage_changed_at} />
            </p>
            <ul className="space-y-2 text-xs">
              {history.length === 0 ? (
                <li className="text-muted-foreground">No transitions recorded yet.</li>
              ) : (
                history
                  .slice()
                  .reverse()
                  .map((entry, idx) => (
                    <li key={idx} className="flex items-center justify-between gap-2">
                      <span className="font-medium">{labelForStage(entry.stage)}</span>
                      <span className="text-muted-foreground">
                        {formatDate(entry.changed_at)}
                      </span>
                    </li>
                  ))
              )}
            </ul>
          </CardContent>
        </Card>
      </aside>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-medium">{value}</p>
    </div>
  )
}

function monthsBetween(from: Date, isoTarget: string | null | undefined): number {
  if (!isoTarget) return 0
  const target = new Date(isoTarget).getTime()
  if (Number.isNaN(target)) return 0
  const diff = target - from.getTime()
  if (diff <= 0) return 0
  return diff / (1000 * 60 * 60 * 24 * 30.44)
}

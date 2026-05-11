'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Pencil } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn, formatCurrency, formatPercentage } from '@/lib/utils'
import type { CategoryStatus } from '@/lib/calculations/budget'
import { BudgetLineDialog } from './budget-line-dialog'

export interface BudgetRow {
  budget_category_id: string
  category_name: string
  group_name: string
  estimated_cents: number
  actual_cents: number
  variance_cents: number
  percent_spent: number | null
  status: CategoryStatus
  notes: string | null
}

const STATUS_LABEL: Record<CategoryStatus, string> = {
  not_started: 'Not started',
  under: 'Under',
  warning: 'Warning',
  over: 'Over',
}
const STATUS_COLOR: Record<CategoryStatus, string> = {
  not_started: 'bg-muted-foreground/30',
  under: 'bg-emerald-500',
  warning: 'bg-amber-400',
  over: 'bg-red-500',
}

const GROUP_LABEL: Record<string, string> = {
  exterior: 'Exterior',
  interior: 'Interior',
  mechanical: 'Mechanical',
  soft_costs: 'Soft Costs',
  contingency: 'Contingency',
  other: 'Other',
}
const GROUP_ORDER = ['exterior', 'interior', 'mechanical', 'soft_costs', 'contingency', 'other']

interface Props {
  projectId: string
  rows: BudgetRow[]
}

export function BudgetTable({ projectId, rows }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<BudgetRow | null>(null)

  const grouped = useMemo(() => {
    const map = new Map<string, BudgetRow[]>()
    for (const r of rows) {
      const g = r.group_name ?? 'other'
      if (!map.has(g)) map.set(g, [])
      map.get(g)!.push(r)
    }
    // Stable per-group sort by name; preserve group order via GROUP_ORDER.
    const groups: { key: string; rows: BudgetRow[]; estimated: number; actual: number; variance: number }[] = []
    for (const key of GROUP_ORDER) {
      const items = map.get(key)
      if (!items || items.length === 0) continue
      items.sort((a, b) => a.category_name.localeCompare(b.category_name))
      const estimated = items.reduce((s, r) => s + r.estimated_cents, 0)
      const actual = items.reduce((s, r) => s + r.actual_cents, 0)
      groups.push({ key, rows: items, estimated, actual, variance: estimated - actual })
    }
    return groups
  }, [rows])

  const totals = useMemo(
    () => ({
      estimated: rows.reduce((s, r) => s + r.estimated_cents, 0),
      actual: rows.reduce((s, r) => s + r.actual_cents, 0),
      variance: rows.reduce((s, r) => s + r.variance_cents, 0),
    }),
    [rows]
  )

  const toggleGroup = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  return (
    <>
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Estimated</TableHead>
              <TableHead className="text-right">Actual</TableHead>
              <TableHead className="text-right">Variance</TableHead>
              <TableHead className="text-right">% Spent</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {grouped.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                  No budget lines yet. Apply a template or add lines manually.
                </TableCell>
              </TableRow>
            ) : (
              grouped.map((group) => (
                <GroupSection
                  key={group.key}
                  groupKey={group.key}
                  rows={group.rows}
                  estimated={group.estimated}
                  actual={group.actual}
                  variance={group.variance}
                  collapsed={collapsed.has(group.key)}
                  onToggle={() => toggleGroup(group.key)}
                  onEdit={(row) => setEditing(row)}
                />
              ))
            )}
          </TableBody>
          <tfoot>
            <tr className="border-t bg-muted/40 font-semibold">
              <td />
              <td className="px-3 py-2 text-sm">TOTAL</td>
              <td className="px-3 py-2 text-right text-sm tabular-nums">{formatCurrency(totals.estimated)}</td>
              <td className="px-3 py-2 text-right text-sm tabular-nums">{formatCurrency(totals.actual)}</td>
              <td
                className={cn(
                  'px-3 py-2 text-right text-sm tabular-nums',
                  totals.variance < 0 ? 'text-destructive' : 'text-emerald-600'
                )}
              >
                {formatCurrency(totals.variance)}
              </td>
              <td className="px-3 py-2 text-right text-sm tabular-nums">
                {totals.estimated > 0
                  ? formatPercentage((totals.actual / totals.estimated) * 100)
                  : '—'}
              </td>
              <td />
              <td />
            </tr>
          </tfoot>
        </Table>
      </div>

      {editing ? (
        <BudgetLineDialog
          projectId={projectId}
          initial={{
            budget_category_id: editing.budget_category_id,
            estimated_cents: editing.estimated_cents,
            notes: editing.notes ?? null,
            category_name: editing.category_name,
          }}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </>
  )
}

function GroupSection({
  groupKey,
  rows,
  estimated,
  actual,
  variance,
  collapsed,
  onToggle,
  onEdit,
}: {
  groupKey: string
  rows: BudgetRow[]
  estimated: number
  actual: number
  variance: number
  collapsed: boolean
  onToggle: () => void
  onEdit: (row: BudgetRow) => void
}) {
  const percent = estimated > 0 ? (actual / estimated) * 100 : null

  return (
    <>
      <TableRow className="bg-muted/30 hover:bg-muted/50">
        <TableCell>
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? 'Expand' : 'Collapse'}
            className="rounded p-1 hover:bg-background"
          >
            {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </TableCell>
        <TableCell className="font-semibold uppercase tracking-wide text-xs">
          {GROUP_LABEL[groupKey] ?? groupKey}
        </TableCell>
        <TableCell className="text-right tabular-nums font-medium">{formatCurrency(estimated)}</TableCell>
        <TableCell className="text-right tabular-nums font-medium">{formatCurrency(actual)}</TableCell>
        <TableCell
          className={cn(
            'text-right tabular-nums font-medium',
            variance < 0 ? 'text-destructive' : 'text-emerald-600'
          )}
        >
          {formatCurrency(variance)}
        </TableCell>
        <TableCell className="text-right tabular-nums font-medium">{formatPercentage(percent)}</TableCell>
        <TableCell />
        <TableCell />
      </TableRow>
      {!collapsed
        ? rows.map((r) => (
            <TableRow key={r.budget_category_id}>
              <TableCell />
              <TableCell className="pl-4">
                {r.category_name}
                {r.notes ? (
                  <p className="text-xs text-muted-foreground">{r.notes}</p>
                ) : null}
              </TableCell>
              <TableCell className="text-right tabular-nums">{formatCurrency(r.estimated_cents)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatCurrency(r.actual_cents)}</TableCell>
              <TableCell
                className={cn(
                  'text-right tabular-nums',
                  r.variance_cents < 0 ? 'text-destructive' : 'text-emerald-600'
                )}
              >
                {formatCurrency(r.variance_cents)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatPercentage(r.percent_spent)}
              </TableCell>
              <TableCell>
                <span className="inline-flex items-center gap-1.5 text-xs">
                  <span className={cn('h-2 w-2 rounded-full', STATUS_COLOR[r.status])} />
                  <Badge variant="secondary" className="text-[10px] uppercase">
                    {STATUS_LABEL[r.status]}
                  </Badge>
                </span>
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" onClick={() => onEdit(r)} aria-label="Edit line">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </TableCell>
            </TableRow>
          ))
        : null}
    </>
  )
}

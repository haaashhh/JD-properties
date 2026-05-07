'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
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
import { cn, formatCurrency, formatDate, formatPercentage } from '@/lib/utils'
import { DealScoreBadge } from './deal-score-badge'

export interface DealListRow {
  id: string
  name: string
  analysis_type: string
  is_archived: boolean
  created_at: string | null
  arv_cents: number | null
  mpp_cents: number | null
  net_profit_cents: number | null
  roi_pct: number | null
  profit_margin_pct: number | null
  property_address: string
}

type StatusFilter = 'active' | 'archived' | 'all'
type TypeFilter = 'all' | 'flip' | 'brrrr'

interface Props {
  rows: DealListRow[]
}

export function DealListTable({ rows }: Props) {
  const [status, setStatus] = useState<StatusFilter>('active')
  const [type, setType] = useState<TypeFilter>('all')

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (status === 'active' && r.is_archived) return false
      if (status === 'archived' && !r.is_archived) return false
      if (type !== 'all' && r.analysis_type !== type) return false
      return true
    })
  }, [rows, status, type])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <FilterPill active={status === 'active'} onClick={() => setStatus('active')}>
          Active
        </FilterPill>
        <FilterPill active={status === 'archived'} onClick={() => setStatus('archived')}>
          Archived
        </FilterPill>
        <FilterPill active={status === 'all'} onClick={() => setStatus('all')}>
          All
        </FilterPill>
        <span className="mx-2 h-5 w-px bg-border" />
        <FilterPill active={type === 'all'} onClick={() => setType('all')}>
          All types
        </FilterPill>
        <FilterPill active={type === 'flip'} onClick={() => setType('flip')}>
          Flip
        </FilterPill>
        <FilterPill active={type === 'brrrr'} onClick={() => setType('brrrr')}>
          BRRRR
        </FilterPill>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Property</TableHead>
              <TableHead>Scenario</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">ARV</TableHead>
              <TableHead className="text-right">MPP</TableHead>
              <TableHead className="text-right">Net Profit</TableHead>
              <TableHead className="text-right">ROI</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-sm text-muted-foreground">
                  No deals match the current filter.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(
                    'cursor-pointer hover:bg-muted/50',
                    row.is_archived && 'opacity-60'
                  )}
                >
                  <TableCell>
                    <DealScoreBadge
                      profitMarginPct={row.profit_margin_pct}
                      roiPct={row.roi_pct}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/deals/${row.id}`} className="hover:underline">
                      {row.property_address}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{row.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="uppercase">
                      {row.analysis_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(row.arv_cents)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(row.mpp_cents)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      'text-right tabular-nums font-medium',
                      row.net_profit_cents != null && row.net_profit_cents < 0
                        ? 'text-destructive'
                        : 'text-foreground'
                    )}
                  >
                    {formatCurrency(row.net_profit_cents)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPercentage(row.roi_pct)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(row.created_at)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Button
      type="button"
      variant={active ? 'secondary' : 'outline'}
      size="sm"
      onClick={onClick}
      className="rounded-full"
    >
      {children}
    </Button>
  )
}

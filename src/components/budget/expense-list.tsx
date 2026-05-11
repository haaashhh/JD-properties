'use client'

import { useMemo, useState, useTransition } from 'react'
import { Paperclip, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { deleteExpense } from '@/app/(app)/projects/[id]/budget/actions'
import { createClient } from '@/lib/supabase/client'

export interface ExpenseRow {
  id: string
  amount_cents: number
  expense_date: string
  vendor_name: string | null
  description: string | null
  payment_method: string | null
  budget_category_id: string | null
  category_name: string | null
  receipt_url: string | null
}

interface CategoryOption {
  id: string
  name: string
}

interface Props {
  projectId: string
  expenses: ExpenseRow[]
  categories: CategoryOption[]
}

export function ExpenseList({ projectId, expenses, categories }: Props) {
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [methodFilter, setMethodFilter] = useState<string>('all')
  const [vendorFilter, setVendorFilter] = useState<string>('')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      if (categoryFilter !== 'all' && (e.budget_category_id ?? '') !== categoryFilter) return false
      if (methodFilter !== 'all' && (e.payment_method ?? '') !== methodFilter) return false
      if (vendorFilter && !(e.vendor_name ?? '').toLowerCase().includes(vendorFilter.toLowerCase())) return false
      if (dateFrom && e.expense_date < dateFrom) return false
      if (dateTo && e.expense_date > dateTo) return false
      return true
    })
  }, [expenses, categoryFilter, methodFilter, vendorFilter, dateFrom, dateTo])

  const total = filtered.reduce((s, e) => s + e.amount_cents, 0)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3 rounded-md border bg-muted/30 p-3">
        <FilterField label="Category">
          <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? 'all')}>
            <SelectTrigger className="h-8 w-44 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
        <FilterField label="Payment">
          <Select value={methodFilter} onValueChange={(v) => setMethodFilter(v ?? 'all')}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All methods</SelectItem>
              <SelectItem value="credit_card">Credit card</SelectItem>
              <SelectItem value="debit_card">Debit card</SelectItem>
              <SelectItem value="check">Check</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="lender_draw">Lender draw</SelectItem>
              <SelectItem value="transfer">Transfer</SelectItem>
            </SelectContent>
          </Select>
        </FilterField>
        <FilterField label="Vendor">
          <Input
            type="text"
            placeholder="search…"
            className="h-8 w-40 text-xs"
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
          />
        </FilterField>
        <FilterField label="From">
          <Input
            type="date"
            className="h-8 w-36 text-xs"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </FilterField>
        <FilterField label="To">
          <Input
            type="date"
            className="h-8 w-36 text-xs"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </FilterField>
        <div className="ml-auto text-right text-sm">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Filtered total</p>
          <p className="font-semibold tabular-nums">{formatCurrency(total)}</p>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Method</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-12" />
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                  No expenses match these filters.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((e) => <ExpenseRowItem key={e.id} projectId={projectId} expense={e} />)
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function ExpenseRowItem({
  projectId,
  expense,
}: {
  projectId: string
  expense: ExpenseRow
}) {
  const [pending, startTransition] = useTransition()

  const onDelete = () => {
    if (!confirm(`Delete this $${(expense.amount_cents / 100).toFixed(2)} expense?`)) return
    startTransition(async () => {
      const result = await deleteExpense(expense.id, projectId)
      if ('error' in result) toast.error(result.error)
    })
  }

  const onViewReceipt = async () => {
    if (!expense.receipt_url) return
    const supabase = createClient()
    const { data, error } = await supabase.storage
      .from('receipts')
      .createSignedUrl(expense.receipt_url, 300)
    if (error || !data?.signedUrl) {
      toast.error('Could not open receipt.')
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <TableRow>
      <TableCell className="text-muted-foreground">{formatDate(expense.expense_date)}</TableCell>
      <TableCell className="font-medium">
        {expense.vendor_name ?? '—'}
        {expense.description ? (
          <p className="text-xs text-muted-foreground">{expense.description}</p>
        ) : null}
      </TableCell>
      <TableCell className="text-muted-foreground">{expense.category_name ?? 'Uncategorized'}</TableCell>
      <TableCell>
        {expense.payment_method ? (
          <Badge variant="secondary" className="capitalize">
            {expense.payment_method.replace(/_/g, ' ')}
          </Badge>
        ) : (
          '—'
        )}
      </TableCell>
      <TableCell className={cn('text-right tabular-nums font-medium')}>
        {formatCurrency(expense.amount_cents)}
      </TableCell>
      <TableCell>
        {expense.receipt_url ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onViewReceipt}
            aria-label="View receipt"
          >
            <Paperclip className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </TableCell>
      <TableCell>
        <Button variant="ghost" size="icon" onClick={onDelete} disabled={pending} aria-label="Delete">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  )
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      {children}
    </div>
  )
}

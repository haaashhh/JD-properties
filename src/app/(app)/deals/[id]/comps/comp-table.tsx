'use client'

import { useState, useTransition } from 'react'
import { useForm, Controller, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { CurrencyInput } from '@/components/shared/currency-input'
import { compInsertSchema, type CompInput } from '@/types/schemas/comp'
import type { CompRow } from '@/types/deal'
import { formatCurrency, formatDate, formatPercentage } from '@/lib/utils'
import { addComp, deleteComp, toggleCompIncluded } from '../../actions'

interface Props {
  dealId: string
  comps: CompRow[]
}

export function CompTable({ dealId, comps }: Props) {
  const [showForm, setShowForm] = useState(false)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Comparable sales ({comps.length})</CardTitle>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setShowForm((v) => !v)}
        >
          <Plus className="h-4 w-4" />
          {showForm ? 'Cancel' : 'Add comp'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm ? (
          <CompForm
            dealId={dealId}
            onDone={() => setShowForm(false)}
          />
        ) : null}

        {comps.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Add 3-5 sold comparables in the same neighborhood (within ~0.5 mi, sold in the last
            3-6 months) to drive a suggested ARV.
          </p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">Use</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead className="text-right">Sale price</TableHead>
                  <TableHead className="text-right">Adjusted</TableHead>
                  <TableHead>Sold</TableHead>
                  <TableHead className="text-right">SqFt</TableHead>
                  <TableHead className="text-right">$ / sqft</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {comps.map((c) => (
                  <CompRowItem key={c.id} dealId={dealId} comp={c} />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function CompRowItem({ dealId, comp }: { dealId: string; comp: CompRow }) {
  const [pending, startTransition] = useTransition()
  const adjusted = (comp.sale_price_cents ?? 0) + (comp.adjustment_cents ?? 0)
  const pricePerSqft =
    comp.sqft && comp.sqft > 0 && comp.sale_price_cents != null
      ? comp.sale_price_cents / comp.sqft
      : null

  const onToggle = (checked: boolean) => {
    startTransition(async () => {
      const result = await toggleCompIncluded(comp.id, dealId, checked)
      if ('error' in result) toast.error(result.error)
    })
  }
  const onDelete = () => {
    if (!confirm('Delete this comp?')) return
    startTransition(async () => {
      const result = await deleteComp(comp.id, dealId)
      if ('error' in result) toast.error(result.error)
    })
  }

  return (
    <TableRow className={comp.included_in_arv ? '' : 'opacity-60'}>
      <TableCell>
        <Checkbox
          checked={comp.included_in_arv}
          onCheckedChange={(v) => onToggle(Boolean(v))}
          disabled={pending}
          aria-label="Include in ARV"
        />
      </TableCell>
      <TableCell className="font-medium">
        {comp.address}
        {comp.adjustment_cents !== 0 && comp.adjustment_notes ? (
          <p className="mt-0.5 text-xs text-muted-foreground">
            Adj {formatCurrency(comp.adjustment_cents)}: {comp.adjustment_notes}
          </p>
        ) : null}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatCurrency(comp.sale_price_cents)}
      </TableCell>
      <TableCell className="text-right tabular-nums">{formatCurrency(adjusted)}</TableCell>
      <TableCell className="text-muted-foreground">{formatDate(comp.sale_date)}</TableCell>
      <TableCell className="text-right tabular-nums">{comp.sqft ?? '—'}</TableCell>
      <TableCell className="text-right tabular-nums">
        {pricePerSqft != null ? formatCurrency(pricePerSqft) : '—'}
        {pricePerSqft != null ? ' / sqft' : ''}
      </TableCell>
      <TableCell className="capitalize text-muted-foreground">{comp.condition ?? '—'}</TableCell>
      <TableCell>
        <Button variant="ghost" size="icon" onClick={onDelete} disabled={pending}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  )
}

function CompForm({ dealId, onDone }: { dealId: string; onDone: () => void }) {
  const [pending, startTransition] = useTransition()

  const form = useForm<CompInput>({
    resolver: zodResolver(compInsertSchema) as unknown as Resolver<CompInput>,
    defaultValues: {
      address: '',
      sale_price_cents: 0,
      sale_date: null,
      sqft: null,
      bedrooms: null,
      bathrooms: null,
      year_built: null,
      distance_miles: null,
      days_on_market: null,
      condition: null,
      adjustment_cents: 0,
      adjustment_notes: null,
      source_url: null,
      notes: null,
      included_in_arv: true,
    },
    mode: 'onTouched',
  })

  const errors = form.formState.errors as Record<string, { message?: string } | undefined>

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await addComp(dealId, values)
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success('Comp added.')
      form.reset()
      onDone()
    })
  })

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-md border bg-muted/30 p-4 space-y-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Address" error={errors.address?.message}>
          <Input {...form.register('address')} placeholder="123 Maple Ridge Dr, Austin, TX" />
        </Field>
        <Field label="Sale price" error={errors.sale_price_cents?.message}>
          <Controller
            name="sale_price_cents"
            control={form.control}
            render={({ field }) => (
              <CurrencyInput value={field.value} onChange={(v) => field.onChange(v ?? 0)} />
            )}
          />
        </Field>
        <Field label="Sale date">
          <Input type="date" {...form.register('sale_date')} />
        </Field>
        <Field label="Square footage">
          <Input type="number" min="0" {...form.register('sqft')} />
        </Field>
        <Field label="Beds">
          <Input type="number" min="0" step="0.5" {...form.register('bedrooms')} />
        </Field>
        <Field label="Baths">
          <Input type="number" min="0" step="0.5" {...form.register('bathrooms')} />
        </Field>
        <Field label="Distance (mi)">
          <Input type="number" min="0" step="0.1" {...form.register('distance_miles')} />
        </Field>
        <Field label="Days on market">
          <Input type="number" min="0" {...form.register('days_on_market')} />
        </Field>
        <Field label="Condition">
          <Controller
            name="condition"
            control={form.control}
            render={({ field }) => (
              <Select
                value={field.value ?? ''}
                onValueChange={(v) => field.onChange(v === '' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="renovated">Renovated</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="distressed">Distressed</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <Field label="Source URL">
          <Input type="url" {...form.register('source_url')} placeholder="https://…" />
        </Field>
        <Field label="Adjustment ($, +/−)">
          <Controller
            name="adjustment_cents"
            control={form.control}
            render={({ field }) => (
              <Input
                type="number"
                step="100"
                value={field.value ? (field.value / 100).toFixed(2) : ''}
                onChange={(e) => {
                  const dollars = parseFloat(e.target.value)
                  field.onChange(Number.isNaN(dollars) ? 0 : Math.round(dollars * 100))
                }}
              />
            )}
          />
        </Field>
        <Field label="Adjustment notes" error={errors.adjustment_notes?.message}>
          <Input {...form.register('adjustment_notes')} placeholder="Pool +$15K, busy street −$10K…" />
        </Field>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save comp'}
        </Button>
      </div>
    </form>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}

// Local pct formatter (avoid the unused-import warning)
void formatPercentage

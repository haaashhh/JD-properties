'use client'

import { useState, useTransition } from 'react'
import { useForm, Controller, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CurrencyInput } from '@/components/shared/currency-input'
import { expenseInsertSchema, type ExpenseInput } from '@/types/schemas/expense'
import { addExpense } from '@/app/(app)/projects/[id]/budget/actions'
import { createClient } from '@/lib/supabase/client'

interface CategoryOption {
  id: string
  name: string
  group_name: string | null
}

interface Props {
  projectId: string
  categories: CategoryOption[]
  defaultDate?: string
}

export function ExpenseForm({ projectId, categories, defaultDate }: Props) {
  const [pending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const [receiptName, setReceiptName] = useState<string | null>(null)

  const form = useForm<ExpenseInput>({
    resolver: zodResolver(expenseInsertSchema) as unknown as Resolver<ExpenseInput>,
    defaultValues: {
      budget_category_id: null,
      amount_cents: 0,
      expense_date: defaultDate ?? new Date().toISOString().slice(0, 10),
      vendor_name: null,
      description: null,
      receipt_url: null,
      payment_method: 'credit_card',
    },
    mode: 'onTouched',
  })

  async function handleReceiptFile(file: File) {
    setUploading(true)
    try {
      const res = await fetch('/api/uploads/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bucket: 'receipts',
          project_id: projectId,
          filename: file.name,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Could not get signed URL.')
      }
      const { path, token } = (await res.json()) as { path: string; token: string }
      const supabase = createClient()
      const { error } = await supabase.storage
        .from('receipts')
        .uploadToSignedUrl(path, token, file, { contentType: file.type })
      if (error) throw error
      form.setValue('receipt_url', path, { shouldDirty: true })
      setReceiptName(file.name)
      toast.success('Receipt uploaded.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await addExpense(projectId, values)
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success('Expense saved.')
      form.reset()
      setReceiptName(null)
    })
  })

  return (
    <form onSubmit={onSubmit} className="rounded-md border bg-card p-4 space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Amount" error={form.formState.errors.amount_cents?.message}>
          <Controller
            name="amount_cents"
            control={form.control}
            render={({ field }) => (
              <CurrencyInput value={field.value} onChange={(v) => field.onChange(v ?? 0)} />
            )}
          />
        </Field>
        <Field label="Date" error={form.formState.errors.expense_date?.message}>
          <Input type="date" {...form.register('expense_date')} />
        </Field>
        <Field label="Payment method">
          <Controller
            name="payment_method"
            control={form.control}
            render={({ field }) => (
              <Select
                value={field.value ?? 'credit_card'}
                onValueChange={(v) => field.onChange(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit_card">Credit card</SelectItem>
                  <SelectItem value="debit_card">Debit card</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="lender_draw">Lender draw</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <Field label="Category">
          <Controller
            name="budget_category_id"
            control={form.control}
            render={({ field }) => (
              <Select
                value={field.value ?? ''}
                onValueChange={(v) => field.onChange(v === '' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Uncategorized" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <Field label="Vendor">
          <Input placeholder="e.g. Apex Roofing & Restoration" {...form.register('vendor_name')} />
        </Field>
        <Field label="Receipt (image or PDF)">
          <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border bg-background px-3 text-sm hover:bg-muted">
            <Upload className="h-4 w-4" />
            {uploading
              ? 'Uploading…'
              : receiptName
                ? `Attached: ${receiptName}`
                : 'Attach receipt'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
              className="sr-only"
              disabled={uploading || pending}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleReceiptFile(file)
                e.target.value = ''
              }}
            />
          </label>
        </Field>
      </div>
      <Field label="Description (optional)">
        <Textarea rows={2} {...form.register('description')} />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending || uploading}>
          {pending ? 'Saving…' : 'Save expense'}
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

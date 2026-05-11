'use client'

import { useState, useTransition } from 'react'
import { useForm, Controller, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CurrencyInput } from '@/components/shared/currency-input'
import {
  budgetLineUpsertSchema,
  type BudgetLineInput,
} from '@/types/schemas/budget-line'
import { deleteBudgetLine, upsertBudgetLine } from '@/app/(app)/projects/[id]/budget/actions'

interface Props {
  projectId: string
  initial: {
    budget_category_id: string
    estimated_cents: number
    notes: string | null
    category_name: string
  }
  onClose: () => void
}

export function BudgetLineDialog({ projectId, initial, onClose }: Props) {
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(true)

  const form = useForm<BudgetLineInput>({
    resolver: zodResolver(budgetLineUpsertSchema) as unknown as Resolver<BudgetLineInput>,
    defaultValues: {
      budget_category_id: initial.budget_category_id,
      estimated_cents: initial.estimated_cents,
      notes: initial.notes,
    },
    mode: 'onTouched',
  })

  const close = () => {
    setOpen(false)
    onClose()
  }

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await upsertBudgetLine(projectId, values)
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success('Budget line saved.')
      close()
    })
  })

  const onDelete = () => {
    if (!confirm(`Delete the ${initial.category_name} budget line?`)) return
    startTransition(async () => {
      const result = await deleteBudgetLine(projectId, initial.budget_category_id)
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success('Budget line removed.')
      close()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(v) : close())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial.category_name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Estimated amount</Label>
            <Controller
              name="estimated_cents"
              control={form.control}
              render={({ field }) => (
                <CurrencyInput value={field.value} onChange={(v) => field.onChange(v ?? 0)} />
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea rows={3} {...form.register('notes')} />
          </div>
          <DialogFooter className="justify-between">
            <Button type="button" variant="ghost" onClick={onDelete} disabled={pending}>
              Delete line
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={close} disabled={pending}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

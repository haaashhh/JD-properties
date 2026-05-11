import { z } from 'zod'

const positiveCents = z.coerce.number().int().nonnegative()

// Bare object so .partial() works for the patch surface (Zod 4 doesn't allow
// .partial() after a .superRefine() — see comp.ts for the same workaround).
const expenseObjectSchema = z.object({
  budget_category_id: z.string().uuid().nullable().optional(),
  amount_cents: positiveCents,
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.'),
  vendor_name: z.string().max(200).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  receipt_url: z.string().max(500).nullable().optional(),
  payment_method: z
    .enum(['cash', 'check', 'credit_card', 'debit_card', 'lender_draw', 'transfer'])
    .nullable()
    .optional(),
})

export const expenseInsertSchema = expenseObjectSchema
export const expensePatchSchema = expenseObjectSchema.partial()

export type ExpenseInput = z.infer<typeof expenseInsertSchema>
export type ExpensePatch = z.infer<typeof expensePatchSchema>

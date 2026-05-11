import { z } from 'zod'

const positiveCents = z.coerce.number().int().nonnegative()

export const budgetLineUpsertSchema = z.object({
  budget_category_id: z.string().uuid(),
  estimated_cents: positiveCents,
  notes: z.string().max(1000).nullable().optional(),
})

export type BudgetLineInput = z.infer<typeof budgetLineUpsertSchema>

export const budgetLineBatchSchema = z.object({
  lines: z.array(budgetLineUpsertSchema).min(1),
  overwrite: z.boolean().default(false),
})

export type BudgetLineBatchInput = z.infer<typeof budgetLineBatchSchema>

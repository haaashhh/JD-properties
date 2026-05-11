import { z } from 'zod'

const positiveCents = z.coerce.number().int().nonnegative()

const templateLineSchema = z
  .object({
    budget_category_id: z.string().uuid(),
    default_amount_cents: positiveCents.default(0),
    per_sqft_rate_cents: positiveCents.default(0),
    sort_order: z.coerce.number().int().nonnegative().default(0),
    notes: z.string().max(500).nullable().optional(),
  })
  .superRefine((v, ctx) => {
    if ((v.default_amount_cents ?? 0) === 0 && (v.per_sqft_rate_cents ?? 0) === 0) {
      ctx.addIssue({
        path: ['default_amount_cents'],
        code: z.ZodIssueCode.custom,
        message: 'A template line needs either a flat amount or a per-sqft rate.',
      })
    }
  })

export const budgetTemplateInsertSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).nullable().optional(),
  scope_tier: z.enum(['cosmetic', 'heavy', 'gut', 'custom']).default('custom'),
  lines: z.array(templateLineSchema).min(1),
})

const budgetTemplateMetaObjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).nullable().optional(),
  scope_tier: z.enum(['cosmetic', 'heavy', 'gut', 'custom']).optional(),
  is_archived: z.boolean().optional(),
})

export const budgetTemplateMetaPatchSchema = budgetTemplateMetaObjectSchema.partial()

export const applyTemplateSchema = z.object({
  template_id: z.string().uuid(),
  sqft: z.coerce.number().int().positive().max(50000),
  overwrite: z.boolean().default(false),
})

export type BudgetTemplateInput = z.infer<typeof budgetTemplateInsertSchema>
export type BudgetTemplateMetaPatch = z.infer<typeof budgetTemplateMetaPatchSchema>
export type ApplyTemplateInput = z.infer<typeof applyTemplateSchema>
export type BudgetTemplateLineInput = z.infer<typeof templateLineSchema>

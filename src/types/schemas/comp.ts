import { z } from 'zod'

const positiveCents = z.coerce.number().int().nonnegative()

export const compInsertSchema = z
  .object({
    address: z.string().min(1, 'Address is required.').max(300),
    sale_price_cents: positiveCents,
    sale_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.')
      .nullable()
      .optional(),
    sqft: z.coerce.number().int().positive().nullable().optional(),
    bedrooms: z.coerce.number().nonnegative().max(20).nullable().optional(),
    bathrooms: z.coerce.number().nonnegative().max(20).nullable().optional(),
    lot_size_sqft: z.coerce.number().int().nonnegative().nullable().optional(),
    year_built: z.coerce.number().int().min(1800).max(2099).nullable().optional(),
    distance_miles: z.coerce.number().nonnegative().max(50).nullable().optional(),
    days_on_market: z.coerce.number().int().nonnegative().max(2000).nullable().optional(),
    condition: z.enum(['renovated', 'good', 'fair', 'distressed']).nullable().optional(),
    adjustment_cents: z.coerce.number().int().default(0),
    adjustment_notes: z.string().max(500).nullable().optional(),
    source_url: z.string().url().nullable().optional().or(z.literal('')).transform((v) => (v === '' ? null : v)),
    notes: z.string().max(500).nullable().optional(),
    included_in_arv: z.boolean().default(true),
  })
  .superRefine((v, ctx) => {
    if (v.adjustment_cents !== 0) {
      const notes = (v.adjustment_notes ?? '').trim()
      if (notes.length === 0) {
        ctx.addIssue({
          path: ['adjustment_notes'],
          code: z.ZodIssueCode.custom,
          message: 'Add a note explaining the adjustment.',
        })
      }
    }
  })

export const compPatchSchema = compInsertSchema.partial()

export type CompInput = z.infer<typeof compInsertSchema>
export type CompPatch = z.infer<typeof compPatchSchema>

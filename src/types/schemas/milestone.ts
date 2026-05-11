import { z } from 'zod'
import { MILESTONE_STATUSES } from '@/lib/constants'

export const milestoneInsertSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).nullable().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.').nullable().optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.').nullable().optional(),
  contractor_id: z.string().uuid().nullable().optional(),
  status: z.enum(MILESTONE_STATUSES).default('not_started'),
  sort_order: z.coerce.number().int().nonnegative().default(0),
  notes: z.string().max(1000).nullable().optional(),
})

export type MilestoneInput = z.infer<typeof milestoneInsertSchema>
export const milestonePatchSchema = milestoneInsertSchema.partial()
export type MilestonePatch = z.infer<typeof milestonePatchSchema>

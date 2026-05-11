import { z } from 'zod'
import { TASK_CATEGORIES, TASK_PRIORITIES, TASK_STATUSES } from '@/lib/constants'

export const taskInsertSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  milestone_id: z.string().uuid().nullable().optional(),
  assigned_to_user: z.string().uuid().nullable().optional(),
  assigned_to_contractor: z.string().uuid().nullable().optional(),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.')
    .nullable()
    .optional(),
  priority: z.enum(TASK_PRIORITIES).default('medium'),
  status: z.enum(TASK_STATUSES).default('todo'),
  category: z.enum(TASK_CATEGORIES).nullable().optional(),
})

export type TaskInput = z.infer<typeof taskInsertSchema>
export const taskPatchSchema = taskInsertSchema.partial()
export type TaskPatch = z.infer<typeof taskPatchSchema>

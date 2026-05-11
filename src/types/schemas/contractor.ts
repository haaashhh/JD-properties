import { z } from 'zod'

export const contractorInsertSchema = z.object({
  name: z.string().min(1).max(200),
  company: z.string().max(200).nullable().optional(),
  trade: z.string().max(100).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal('')).transform((v) => (v === '' ? null : v)),
  license_number: z.string().max(100).nullable().optional(),
  insurance_expiry: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.')
    .nullable()
    .optional(),
  rating: z.coerce.number().int().min(1).max(5).nullable().optional(),
  preferred_contact: z.enum(['sms', 'email', 'phone', 'none']).default('email'),
  do_not_contact: z.boolean().default(false),
  is_active: z.boolean().default(true),
  notes: z.string().max(2000).nullable().optional(),
})

export type ContractorInput = z.infer<typeof contractorInsertSchema>
export const contractorPatchSchema = contractorInsertSchema.partial()
export type ContractorPatch = z.infer<typeof contractorPatchSchema>

import { z } from 'zod'
import { PIPELINE_STAGES } from '@/lib/constants'

const pipelineStageValues = PIPELINE_STAGES.map((s) => s.value) as [
  string,
  ...string[],
]

export const projectFormSchema = z
  .object({
    name: z.string().min(1, 'Required.').max(200),
    property_mode: z.enum(['existing', 'new']),
    property_id: z.string().uuid().nullable().optional(),
    deal_analysis_id: z.string().uuid().nullable().optional(),

    address_line1: z.string().nullable().optional(),
    address_line2: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    zip: z.string().nullable().optional(),
    property_type: z
      .enum(['sfr', 'duplex', 'triplex', 'quadplex', 'townhome', 'condo'])
      .default('sfr'),

    pipeline_stage: z.enum(pipelineStageValues).default('lead'),
    contingency_pct: z.coerce.number().min(0).max(50).default(10),
    notes: z.string().nullable().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.property_mode === 'existing') {
      if (!v.property_id) {
        ctx.addIssue({
          path: ['property_id'],
          code: z.ZodIssueCode.custom,
          message: 'Pick a property.',
        })
      }
    } else {
      const required: [keyof typeof v, string][] = [
        ['address_line1', 'Required.'],
        ['city', 'Required.'],
        ['state', 'Required.'],
        ['zip', 'Required.'],
      ]
      for (const [key, message] of required) {
        const val = v[key]
        if (!val || (typeof val === 'string' && val.trim() === '')) {
          ctx.addIssue({ path: [key], code: z.ZodIssueCode.custom, message })
        }
      }
      if (v.state && v.state.length !== 2) {
        ctx.addIssue({
          path: ['state'],
          code: z.ZodIssueCode.custom,
          message: 'Use the 2-letter state code.',
        })
      }
      if (v.zip && !/^\d{5}(-\d{4})?$/.test(v.zip)) {
        ctx.addIssue({
          path: ['zip'],
          code: z.ZodIssueCode.custom,
          message: 'ZIP must be 5 or 9 digits.',
        })
      }
    }
  })

export type ProjectFormValues = z.infer<typeof projectFormSchema>

export const stageUpdateSchema = z.object({
  pipeline_stage: z.enum(pipelineStageValues),
})

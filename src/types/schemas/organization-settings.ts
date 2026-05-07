import { z } from 'zod'

export const organizationSettingsSchema = z.object({
  default_arv_pct: z.coerce.number().min(50).max(100),
  default_contingency_pct: z.coerce.number().min(0).max(50),
  default_holding_months: z.coerce.number().min(0).max(60),
  default_sell_commission_pct: z.coerce.number().min(0).max(15),
  over_budget_alert_pct: z.coerce.number().min(0).max(200),
})

export type OrganizationSettingsInput = z.infer<typeof organizationSettingsSchema>

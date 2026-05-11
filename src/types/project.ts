import type { Database } from '@/types/database'

export type ProjectRow = Database['public']['Tables']['project']['Row']
export type ProjectInsert = Database['public']['Tables']['project']['Insert']
export type ProjectUpdate = Database['public']['Tables']['project']['Update']
export type ProjectSummaryRow = Database['public']['Views']['project_summary']['Row']

export type ProjectMilestoneRow = Database['public']['Tables']['project_milestone']['Row']
export type ProjectMilestoneInsert = Database['public']['Tables']['project_milestone']['Insert']
export type ProjectMilestoneUpdate = Database['public']['Tables']['project_milestone']['Update']

export type ProjectTaskRow = Database['public']['Tables']['project_task']['Row']
export type ProjectTaskInsert = Database['public']['Tables']['project_task']['Insert']
export type ProjectTaskUpdate = Database['public']['Tables']['project_task']['Update']

export type ProjectPhotoRow = Database['public']['Tables']['project_photo']['Row']
export type ProjectPhotoInsert = Database['public']['Tables']['project_photo']['Insert']

export type ContractorRow = Database['public']['Tables']['contractor']['Row']
export type ContractorInsert = Database['public']['Tables']['contractor']['Insert']
export type ContractorUpdate = Database['public']['Tables']['contractor']['Update']

export interface StageHistoryEntry {
  stage: string
  changed_at: string
  changed_by: string | null
}

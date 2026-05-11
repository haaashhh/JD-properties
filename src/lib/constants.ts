// Domain constants. Values match the CHECK constraints in supabase/migrations.

export const PIPELINE_STAGES = [
  { value: 'lead', label: 'Lead' },
  { value: 'analyzing', label: 'Analyzing' },
  { value: 'offer_made', label: 'Offer Made' },
  { value: 'under_contract', label: 'Under Contract' },
  { value: 'purchased', label: 'Purchased' },
  { value: 'in_rehab', label: 'In Rehab' },
  { value: 'punch_list', label: 'Punch List' },
  { value: 'listed', label: 'Listed' },
  { value: 'under_contract_sale', label: 'Under Contract (Sale)' },
  { value: 'sold', label: 'Sold' },
  { value: 'portfolio', label: 'Portfolio' },
] as const

export type PipelineStage = (typeof PIPELINE_STAGES)[number]['value']

export const ROOM_TYPES = [
  'kitchen',
  'master_bath',
  'guest_bath',
  'powder_room',
  'living_room',
  'family_room',
  'dining_room',
  'master_bedroom',
  'bedroom',
  'office',
  'laundry',
  'mudroom',
  'foyer',
  'hallway',
  'basement',
  'attic',
  'garage',
  'exterior_front',
  'exterior_back',
  'landscaping',
  'whole_house',
] as const

export type RoomType = (typeof ROOM_TYPES)[number]

export const TRADE_TYPES = [
  'gc',
  'plumber',
  'electrician',
  'hvac',
  'roofer',
  'painter',
  'flooring',
  'drywall',
  'cabinetry',
  'countertops',
  'tile',
  'mason',
  'landscaper',
  'inspector',
  'designer',
] as const

export type TradeType = (typeof TRADE_TYPES)[number]

export const BUDGET_CATEGORY_GROUPS = [
  { value: 'exterior', label: 'Exterior' },
  { value: 'interior', label: 'Interior' },
  { value: 'mechanical', label: 'Mechanical' },
  { value: 'soft_costs', label: 'Soft Costs' },
  { value: 'contingency', label: 'Contingency' },
] as const

export type BudgetCategoryGroup = (typeof BUDGET_CATEGORY_GROUPS)[number]['value']

export const ORG_ROLES = ['owner', 'admin', 'member', 'designer'] as const
export type OrgRole = (typeof ORG_ROLES)[number]

// Pipeline phase mapping — collapses 11 fine-grained stages into 4 phases
// for the kanban (4 columns by default) and the dashboard donut. Keep in
// lockstep with the `pipeline_phase` CASE expression in the project_summary
// view (supabase/migrations/0005_projects_v1.sql).
export const PIPELINE_PHASES = {
  acquisition: ['lead', 'analyzing', 'offer_made', 'under_contract'],
  rehab: ['purchased', 'in_rehab', 'punch_list'],
  listing: ['listed', 'under_contract_sale'],
  sold: ['sold', 'portfolio'],
} as const

export type PipelinePhase = keyof typeof PIPELINE_PHASES

export const PIPELINE_PHASE_LABELS: Record<PipelinePhase, string> = {
  acquisition: 'Acquisition',
  rehab: 'Rehab',
  listing: 'Listing',
  sold: 'Sold',
}

// Reverse lookup: stage → phase.
export function phaseForStage(stage: PipelineStage): PipelinePhase | null {
  for (const [phase, stages] of Object.entries(PIPELINE_PHASES) as [
    PipelinePhase,
    readonly string[]
  ][]) {
    if (stages.includes(stage)) return phase
  }
  return null
}

// Stage-aging visual indicator thresholds (days at current stage).
export const STAGE_AGING_THRESHOLDS = {
  yellow: 30,
  orange: 60,
  red: 90,
} as const

export type StageAgingLevel = 'fresh' | 'yellow' | 'orange' | 'red'

export function stageAgingLevel(daysAtStage: number): StageAgingLevel {
  if (daysAtStage >= STAGE_AGING_THRESHOLDS.red) return 'red'
  if (daysAtStage >= STAGE_AGING_THRESHOLDS.orange) return 'orange'
  if (daysAtStage >= STAGE_AGING_THRESHOLDS.yellow) return 'yellow'
  return 'fresh'
}

// Task category / status / priority enums (mirror the DB CHECK constraints).
export const TASK_CATEGORIES = ['pre_purchase', 'rehab', 'pre_sale', 'admin'] as const
export type TaskCategory = (typeof TASK_CATEGORIES)[number]
export const TASK_STATUSES = ['todo', 'in_progress', 'done'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]
export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const
export type TaskPriority = (typeof TASK_PRIORITIES)[number]

export const MILESTONE_STATUSES = [
  'not_started',
  'in_progress',
  'complete',
  'blocked',
] as const
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number]

export const PHOTO_PHASES = ['before', 'during', 'after'] as const
export type PhotoPhase = (typeof PHOTO_PHASES)[number]

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

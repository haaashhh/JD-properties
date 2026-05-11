// Demo data seeder for Properties by JD.
// Wipes all data scoped to the test admin's organization and re-seeds with a
// realistic portfolio: 14 properties across 3 flipping markets, 12
// contractors, 9 deal analyses (with comps), 9 projects spread across every
// pipeline phase, full budgets + actuals + milestones + tasks for the active
// rehab projects, and back-dated stage_history so the timeline views look
// authentic.
//
// Run with:
//   node --env-file=.env.local --experimental-strip-types scripts/seed-demo.ts
//
// Re-runnable: each run wipes the org's data first (admin user + org +
// org_settings preserved).

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../src/types/database.ts'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const TEST_ADMIN_EMAIL = 'admin@properties-by-jd.local'
const TODAY = new Date('2026-05-11T12:00:00Z') // anchored so reruns produce identical dates

const admin: SupabaseClient<Database> = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function dollars(d: number): number {
  return Math.round(d * 100)
}
function daysAgo(n: number): string {
  return new Date(TODAY.getTime() - n * 86_400_000).toISOString()
}
function dateAgo(n: number): string {
  return new Date(TODAY.getTime() - n * 86_400_000).toISOString().slice(0, 10)
}

// ─── 1. Properties ───────────────────────────────────────────────────────
type PropKey =
  | 'P01' | 'P02' | 'P03' | 'P04' | 'P05'
  | 'P06' | 'P07' | 'P08' | 'P09' | 'P10'
  | 'P11' | 'P12' | 'P13' | 'P14'

const PROPERTIES: { key: PropKey; addr: string; city: string; state: string; zip: string; year: number; sqft: number; bed: number; bath: number; type: string }[] = [
  { key: 'P01', addr: '1428 Maple Ridge Dr', city: 'Indianapolis', state: 'IN', zip: '46237', year: 1962, sqft: 1340, bed: 3, bath: 1.5, type: 'sfr' },
  { key: 'P02', addr: '3207 Beechwood Ln', city: 'Indianapolis', state: 'IN', zip: '46237', year: 1978, sqft: 1580, bed: 3, bath: 2, type: 'sfr' },
  { key: 'P03', addr: '815 Cedar Hollow Ct', city: 'Indianapolis', state: 'IN', zip: '46237', year: 1955, sqft: 1180, bed: 2, bath: 1, type: 'sfr' },
  { key: 'P04', addr: '4412 Stonebridge Way', city: 'Indianapolis', state: 'IN', zip: '46237', year: 1991, sqft: 1820, bed: 4, bath: 2, type: 'sfr' },
  { key: 'P05', addr: '2244 Whitfield Ave', city: 'Indianapolis', state: 'IN', zip: '46237', year: 1949, sqft: 1420, bed: 3, bath: 1, type: 'duplex' },
  { key: 'P06', addr: '9018 Brookhaven Dr', city: 'Charlotte', state: 'NC', zip: '28215', year: 1968, sqft: 1510, bed: 3, bath: 2, type: 'sfr' },
  { key: 'P07', addr: '736 Ivy Ridge Rd', city: 'Charlotte', state: 'NC', zip: '28215', year: 1985, sqft: 1720, bed: 3, bath: 2, type: 'sfr' },
  { key: 'P08', addr: '5521 Magnolia Trace', city: 'Charlotte', state: 'NC', zip: '28215', year: 1997, sqft: 1640, bed: 3, bath: 2.5, type: 'townhome' },
  { key: 'P09', addr: '1109 Carriage Lake Dr', city: 'Charlotte', state: 'NC', zip: '28215', year: 2002, sqft: 2140, bed: 4, bath: 2.5, type: 'sfr' },
  { key: 'P10', addr: '4087 Sycamore Bend', city: 'Charlotte', state: 'NC', zip: '28215', year: 1973, sqft: 1360, bed: 3, bath: 1.5, type: 'sfr' },
  { key: 'P11', addr: '6612 W Verbena Ln', city: 'Phoenix', state: 'AZ', zip: '85033', year: 1981, sqft: 1460, bed: 3, bath: 2, type: 'sfr' },
  { key: 'P12', addr: '2918 N Saguaro Vista Dr', city: 'Phoenix', state: 'AZ', zip: '85033', year: 1965, sqft: 1280, bed: 3, bath: 1, type: 'sfr' },
  { key: 'P13', addr: '7733 W Catalina Pl', city: 'Phoenix', state: 'AZ', zip: '85033', year: 2005, sqft: 1150, bed: 2, bath: 2, type: 'condo' },
  { key: 'P14', addr: '5104 W Coronado Ranch Rd', city: 'Phoenix', state: 'AZ', zip: '85033', year: 1994, sqft: 1890, bed: 4, bath: 2, type: 'sfr' },
]

// ─── 2. Contractors ──────────────────────────────────────────────────────
type ContractorKey =
  | 'GC' | 'PLUMB' | 'ELEC' | 'HVAC' | 'ROOF' | 'PAINT'
  | 'FLOOR' | 'DRY' | 'CAB' | 'COUNT' | 'TILE' | 'INSP'

const CONTRACTORS: { key: ContractorKey; name: string; company: string; trade: string; phone: string; email: string }[] = [
  { key: 'GC',    name: 'Marcus Devlin',     company: 'Keystone Build Group LLC',     trade: 'gc',         phone: '(555) 214-0918', email: 'marcus@keystonebuildgrp.com' },
  { key: 'PLUMB', name: 'Travis Holloway',   company: 'Hill Country Plumbing LLC',    trade: 'plumber',    phone: '(555) 308-7742', email: 'travis@hillcountryplumb.com' },
  { key: 'ELEC',  name: 'Danielle Ortiz',    company: 'Voltmark Electric Co',         trade: 'electrician',phone: '(555) 441-2207', email: 'dortiz@voltmarkelectric.com' },
  { key: 'HVAC',  name: 'Kevin Brennan',     company: 'Northstar HVAC Solutions',     trade: 'hvac',       phone: '(555) 619-3380', email: 'kevin@northstarhvac.com' },
  { key: 'ROOF',  name: 'Luis Cabrera',      company: 'Apex Roofing & Restoration',   trade: 'roofer',     phone: '(555) 287-5511', email: 'luis@apexroof.com' },
  { key: 'PAINT', name: 'Priya Natarajan',   company: 'Sterling Painters LLC',        trade: 'painter',    phone: '(555) 730-4422', email: 'priya@sterlingpainters.com' },
  { key: 'FLOOR', name: 'Jordan Mackey',     company: 'Plank & Tile Floor Co',        trade: 'flooring',   phone: '(555) 552-8810', email: 'jordan@plankandtile.com' },
  { key: 'DRY',   name: 'Eddie Vaughn',      company: 'Smooth Finish Drywall LLC',    trade: 'drywall',    phone: '(555) 401-6634', email: 'eddie@smoothfinishdw.com' },
  { key: 'CAB',   name: 'Anna Lindqvist',    company: 'Heritage Cabinet Works',       trade: 'cabinetry',  phone: '(555) 826-1145', email: 'anna@heritagecabinets.com' },
  { key: 'COUNT', name: 'Rafael Mendoza',    company: 'Granite Edge Countertops',     trade: 'countertops',phone: '(555) 904-3318', email: 'rafael@graniteedgeco.com' },
  { key: 'TILE',  name: 'Sasha Petrov',      company: 'Rivertown Tile & Stone',       trade: 'tile',       phone: '(555) 312-7029', email: 'sasha@rivertowntile.com' },
  { key: 'INSP',  name: 'Greg Whitfield',    company: 'Cedarline Property Inspections', trade: 'inspector',phone: '(555) 668-2240', email: 'greg@cedarlineinspect.com' },
]

// ─── 3. Budget categories (org-scoped) ──────────────────────────────────
// Budget categories — looked up by name from the system rows seeded in
// migration 0006_budget_v1.sql (is_default=true, organization_id IS NULL).
// We no longer create org-scoped duplicates; the existing RLS on
// budget_category returns NULL-org rows to every authenticated user.
const BUDGET_CATEGORY_NAMES = [
  'Demo / Cleanup',
  'Permits',
  'Roof',
  'Siding / Exterior Walls',
  'Windows',
  'Electrical',
  'Plumbing',
  'HVAC',
  'Drywall',
  'Kitchen',
  'Bathrooms',
  'Flooring',
  'Interior Paint',
  'Landscaping',
] as const

// Heavy-rehab default amounts for a ~1,500 sqft house. Proportions match
// the per_sqft_rate_cents on the system 'Heavy Rehab' budget_template
// seeded in 0006.
const BUDGET_DEFAULTS: Record<string, number> = {
  'Demo / Cleanup': 4800,
  'Permits': 2400,
  'Roof': 9500,
  'Siding / Exterior Walls': 7200,
  'Windows': 6800,
  'Electrical': 8500,
  'Plumbing': 9200,
  'HVAC': 8800,
  'Drywall': 5400,
  'Kitchen': 18500,
  'Bathrooms': 11200,
  'Flooring': 10800,
  'Interior Paint': 6400,
  'Landscaping': 3800,
}

// ─── 4. Project scenarios ───────────────────────────────────────────────
interface Scenario {
  key: string
  propertyKey: PropKey
  scenarioName: string
  analysisType: 'flip' | 'brrrr'
  arvDollars: number
  purchaseDollars: number
  rehabDollars: number
  financing: 'cash' | 'hard_money'
  interestRate?: number
  loanPoints?: number
  loanAmountDollars?: number
  holdingMonths: number
  currentStage: string
  // Days ago each milestone-style date occurred (null = not yet)
  purchasedDaysAgo: number | null
  rehabStartDaysAgo: number | null
  rehabEndDaysAgo: number | null
  listingDaysAgo: number | null
  saleDaysAgo: number | null
  saleDollars: number | null
  buildBudget: boolean // whether to seed budget + actuals
  completedMilestoneCount: number // how many of the 12 milestones are complete
  brrrr?: { rentDollars: number; refiLtvPct: number; refiRate: number; refiTermYears: number }
  // Back-dated stage history. From oldest to newest.
  stageHistory: { stage: string; daysAgo: number }[]
}

// Note: purchase/rehab numbers tuned to the 70% rule (MPP ≈ ARV*0.70 - rehab)
// so the demo shows realistic flip-grade margins. A real flipper would target
// 15-22% margins on the wins and 5-12% on the tight ones; deliberate variance
// across scenarios to populate the deal-score traffic light.
const SCENARIOS: Scenario[] = [
  {
    key: 'S1',
    propertyKey: 'P03',
    scenarioName: '815 Cedar Hollow — Initial flip',
    analysisType: 'flip',
    arvDollars: 248000, purchaseDollars: 118000, rehabDollars: 50000,
    financing: 'cash', holdingMonths: 5,
    currentStage: 'lead',
    purchasedDaysAgo: null, rehabStartDaysAgo: null, rehabEndDaysAgo: null, listingDaysAgo: null, saleDaysAgo: null, saleDollars: null,
    buildBudget: false, completedMilestoneCount: 0,
    stageHistory: [{ stage: 'lead', daysAgo: 3 }],
  },
  {
    key: 'S2',
    propertyKey: 'P12',
    scenarioName: '2918 N Saguaro — Hard money flip',
    analysisType: 'flip',
    arvDollars: 355000, purchaseDollars: 178000, rehabDollars: 60000,
    financing: 'hard_money', interestRate: 12, loanPoints: 2, loanAmountDollars: 165000,
    holdingMonths: 6,
    currentStage: 'under_contract',
    purchasedDaysAgo: null, rehabStartDaysAgo: null, rehabEndDaysAgo: null, listingDaysAgo: null, saleDaysAgo: null, saleDollars: null,
    buildBudget: false, completedMilestoneCount: 0,
    stageHistory: [
      { stage: 'lead', daysAgo: 28 },
      { stage: 'analyzing', daysAgo: 24 },
      { stage: 'offer_made', daysAgo: 18 },
      { stage: 'under_contract', daysAgo: 13 },
    ],
  },
  {
    key: 'S3',
    propertyKey: 'P01',
    scenarioName: '1428 Maple Ridge — Closed, demo starting',
    analysisType: 'flip',
    arvDollars: 268000, purchaseDollars: 128000, rehabDollars: 52000,
    financing: 'hard_money', interestRate: 11.5, loanPoints: 2, loanAmountDollars: 118000,
    holdingMonths: 6,
    currentStage: 'purchased',
    purchasedDaysAgo: 7, rehabStartDaysAgo: null, rehabEndDaysAgo: null, listingDaysAgo: null, saleDaysAgo: null, saleDollars: null,
    buildBudget: true, completedMilestoneCount: 0,
    stageHistory: [
      { stage: 'lead', daysAgo: 60 },
      { stage: 'analyzing', daysAgo: 55 },
      { stage: 'offer_made', daysAgo: 47 },
      { stage: 'under_contract', daysAgo: 38 },
      { stage: 'purchased', daysAgo: 7 },
    ],
  },
  {
    key: 'S4',
    propertyKey: 'P07',
    scenarioName: '736 Ivy Ridge — Mid-rehab',
    analysisType: 'flip',
    arvDollars: 412000, purchaseDollars: 215000, rehabDollars: 80000,
    financing: 'hard_money', interestRate: 11, loanPoints: 1.5, loanAmountDollars: 200000,
    holdingMonths: 7,
    currentStage: 'in_rehab',
    purchasedDaysAgo: 76, rehabStartDaysAgo: 68, rehabEndDaysAgo: null, listingDaysAgo: null, saleDaysAgo: null, saleDollars: null,
    buildBudget: true, completedMilestoneCount: 6, // through insulation/drywall
    stageHistory: [
      { stage: 'lead', daysAgo: 120 },
      { stage: 'analyzing', daysAgo: 115 },
      { stage: 'offer_made', daysAgo: 102 },
      { stage: 'under_contract', daysAgo: 93 },
      { stage: 'purchased', daysAgo: 76 },
      { stage: 'in_rehab', daysAgo: 68 },
    ],
  },
  {
    key: 'S5',
    propertyKey: 'P11',
    scenarioName: '6612 W Verbena — Punch list',
    analysisType: 'flip',
    arvDollars: 398000, purchaseDollars: 200000, rehabDollars: 70000,
    financing: 'cash', holdingMonths: 5,
    currentStage: 'punch_list',
    purchasedDaysAgo: 124, rehabStartDaysAgo: 118, rehabEndDaysAgo: 12, listingDaysAgo: null, saleDaysAgo: null, saleDollars: null,
    buildBudget: true, completedMilestoneCount: 11, // everything except punch list
    stageHistory: [
      { stage: 'lead', daysAgo: 165 },
      { stage: 'analyzing', daysAgo: 160 },
      { stage: 'offer_made', daysAgo: 152 },
      { stage: 'under_contract', daysAgo: 144 },
      { stage: 'purchased', daysAgo: 124 },
      { stage: 'in_rehab', daysAgo: 118 },
      { stage: 'punch_list', daysAgo: 12 },
    ],
  },
  {
    key: 'S6',
    propertyKey: 'P04',
    scenarioName: '4412 Stonebridge — Listed',
    analysisType: 'flip',
    arvDollars: 328000, purchaseDollars: 165000, rehabDollars: 60000,
    financing: 'hard_money', interestRate: 11.5, loanPoints: 2, loanAmountDollars: 150000,
    holdingMonths: 6,
    currentStage: 'listed',
    purchasedDaysAgo: 158, rehabStartDaysAgo: 152, rehabEndDaysAgo: 22, listingDaysAgo: 14, saleDaysAgo: null, saleDollars: null,
    buildBudget: true, completedMilestoneCount: 12,
    stageHistory: [
      { stage: 'lead', daysAgo: 200 },
      { stage: 'analyzing', daysAgo: 195 },
      { stage: 'offer_made', daysAgo: 185 },
      { stage: 'under_contract', daysAgo: 175 },
      { stage: 'purchased', daysAgo: 158 },
      { stage: 'in_rehab', daysAgo: 152 },
      { stage: 'punch_list', daysAgo: 22 },
      { stage: 'listed', daysAgo: 14 },
    ],
  },
  {
    key: 'S7',
    propertyKey: 'P06',
    scenarioName: '9018 Brookhaven — Closed above ARV',
    analysisType: 'flip',
    arvDollars: 358000, purchaseDollars: 185000, rehabDollars: 66000,
    financing: 'hard_money', interestRate: 11.5, loanPoints: 2, loanAmountDollars: 172000,
    holdingMonths: 6,
    currentStage: 'sold',
    purchasedDaysAgo: 220, rehabStartDaysAgo: 214, rehabEndDaysAgo: 92, listingDaysAgo: 80, saleDaysAgo: 60, saleDollars: 385000,
    buildBudget: true, completedMilestoneCount: 12,
    stageHistory: [
      { stage: 'lead', daysAgo: 270 },
      { stage: 'analyzing', daysAgo: 263 },
      { stage: 'offer_made', daysAgo: 250 },
      { stage: 'under_contract', daysAgo: 238 },
      { stage: 'purchased', daysAgo: 220 },
      { stage: 'in_rehab', daysAgo: 214 },
      { stage: 'punch_list', daysAgo: 92 },
      { stage: 'listed', daysAgo: 80 },
      { stage: 'under_contract_sale', daysAgo: 75 },
      { stage: 'sold', daysAgo: 60 },
    ],
  },
  {
    key: 'S8',
    propertyKey: 'P14',
    scenarioName: '5104 W Coronado Ranch — Closed below ARV',
    analysisType: 'flip',
    arvDollars: 445000, purchaseDollars: 238000, rehabDollars: 84000,
    financing: 'cash', holdingMonths: 7,
    currentStage: 'sold',
    purchasedDaysAgo: 280, rehabStartDaysAgo: 272, rehabEndDaysAgo: 140, listingDaysAgo: 130, saleDaysAgo: 115, saleDollars: 432000,
    buildBudget: true, completedMilestoneCount: 12,
    stageHistory: [
      { stage: 'lead', daysAgo: 320 },
      { stage: 'analyzing', daysAgo: 315 },
      { stage: 'offer_made', daysAgo: 302 },
      { stage: 'under_contract', daysAgo: 293 },
      { stage: 'purchased', daysAgo: 280 },
      { stage: 'in_rehab', daysAgo: 272 },
      { stage: 'punch_list', daysAgo: 140 },
      { stage: 'listed', daysAgo: 130 },
      { stage: 'under_contract_sale', daysAgo: 125 },
      { stage: 'sold', daysAgo: 115 },
    ],
  },
  {
    key: 'S9',
    propertyKey: 'P02',
    scenarioName: '3207 Beechwood — BRRRR hold',
    analysisType: 'brrrr',
    arvDollars: 275000, purchaseDollars: 130000, rehabDollars: 42000,
    financing: 'hard_money', interestRate: 11, loanPoints: 2, loanAmountDollars: 120000,
    holdingMonths: 8,
    currentStage: 'portfolio',
    purchasedDaysAgo: 240, rehabStartDaysAgo: 232, rehabEndDaysAgo: 165, listingDaysAgo: null, saleDaysAgo: null, saleDollars: null,
    buildBudget: true, completedMilestoneCount: 12,
    stageHistory: [
      { stage: 'lead', daysAgo: 280 },
      { stage: 'analyzing', daysAgo: 274 },
      { stage: 'offer_made', daysAgo: 260 },
      { stage: 'under_contract', daysAgo: 252 },
      { stage: 'purchased', daysAgo: 240 },
      { stage: 'in_rehab', daysAgo: 232 },
      { stage: 'punch_list', daysAgo: 165 },
      { stage: 'portfolio', daysAgo: 155 },
    ],
    brrrr: { rentDollars: 1925, refiLtvPct: 75, refiRate: 7.25, refiTermYears: 30 },
  },
]

const COMPS_BY_SCENARIO: Record<string, { address: string; saleDollars: number; included: boolean; notes?: string }[]> = {
  S2: [
    { address: '4112 N Saguaro Vista Dr', saleDollars: 348000, included: true },
    { address: '2811 W Catalina Pl', saleDollars: 361000, included: true },
    { address: '3404 W Verbena Ln', saleDollars: 352500, included: true },
    { address: '2710 W Coronado Ranch Rd', saleDollars: 358000, included: true },
    { address: '6101 W Coronado Ranch Rd', saleDollars: 412000, included: false, notes: 'Premium pool home — exclude' },
  ],
  S3: [
    { address: '1612 Maple Ridge Dr', saleDollars: 264000, included: true },
    { address: '1218 Beechwood Ln', saleDollars: 271000, included: true },
    { address: '903 Cedar Hollow Ct', saleDollars: 267500, included: true },
    { address: '2010 Whitfield Ave', saleDollars: 269000, included: true },
  ],
  S4: [
    { address: '812 Ivy Ridge Rd', saleDollars: 408000, included: true },
    { address: '1024 Brookhaven Dr', saleDollars: 419500, included: true },
    { address: '645 Magnolia Trace', saleDollars: 401000, included: true },
    { address: '928 Sycamore Bend', saleDollars: 416750, included: true },
    { address: '2201 Carriage Lake Dr', saleDollars: 487000, included: false, notes: 'Premium lot, larger sqft — exclude' },
  ],
  S5: [
    { address: '6418 W Verbena Ln', saleDollars: 395000, included: true },
    { address: '7102 N Saguaro Vista', saleDollars: 402500, included: true },
    { address: '5840 W Catalina Pl', saleDollars: 389900, included: true },
    { address: '6907 W Coronado Ranch', saleDollars: 405000, included: true },
    { address: '4412 W Verbena Ln', saleDollars: 342000, included: false, notes: 'No garage, dated kitchen — exclude' },
  ],
  S6: [
    { address: '4216 Stonebridge Way', saleDollars: 325000, included: true },
    { address: '3914 Whitfield Ave', saleDollars: 331500, included: true },
    { address: '4708 Brookhaven Dr', saleDollars: 322750, included: true },
    { address: '5102 Maple Ridge', saleDollars: 334000, included: true },
    { address: '2801 Cedar Hollow', saleDollars: 278000, included: false, notes: 'Smaller, 1 bath — exclude' },
  ],
  S7: [
    { address: '8814 Brookhaven Dr', saleDollars: 384000, included: true },
    { address: '9220 Ivy Ridge Rd', saleDollars: 388500, included: true },
    { address: '8702 Magnolia Trace', saleDollars: 391000, included: true },
    { address: '9415 Sycamore Bend', saleDollars: 395750, included: true },
    { address: '10302 Carriage Lake', saleDollars: 448000, included: false, notes: 'New build comp — exclude' },
  ],
  S8: [
    { address: '4918 W Coronado Ranch', saleDollars: 448000, included: true },
    { address: '5230 W Verbena Ln', saleDollars: 452500, included: true },
    { address: '4715 N Saguaro Vista', saleDollars: 446000, included: true },
    { address: '5402 W Catalina Pl', saleDollars: 455250, included: true },
    { address: '6101 W Coronado Ranch', saleDollars: 512000, included: false, notes: 'Pool + casita — exclude' },
  ],
}

// ─── 5. Milestone catalog (ordered) ─────────────────────────────────────
const MILESTONE_TEMPLATE: { name: string; tradeKey?: ContractorKey; durationDays: number }[] = [
  { name: 'Demo & Haul-Off',                  tradeKey: 'GC',    durationDays: 5 },
  { name: 'Framing & Structural Repairs',     tradeKey: 'GC',    durationDays: 7 },
  { name: 'Rough Plumbing',                   tradeKey: 'PLUMB', durationDays: 5 },
  { name: 'Rough Electrical',                 tradeKey: 'ELEC',  durationDays: 4 },
  { name: 'HVAC Rough-In',                    tradeKey: 'HVAC',  durationDays: 4 },
  { name: 'Insulation & Drywall',             tradeKey: 'DRY',   durationDays: 8 },
  { name: 'Interior & Exterior Paint',        tradeKey: 'PAINT', durationDays: 7 },
  { name: 'Flooring Install',                 tradeKey: 'FLOOR', durationDays: 6 },
  { name: 'Kitchen Install',                  tradeKey: 'CAB',   durationDays: 7 },
  { name: 'Bathroom Tile & Fixtures',         tradeKey: 'TILE',  durationDays: 6 },
  { name: 'Trim, Doors & Final Fixtures',     tradeKey: 'GC',    durationDays: 5 },
  { name: 'Punch List & Listing Prep',        tradeKey: 'GC',    durationDays: 4 },
]

// ─── 6. Task templates per stage ────────────────────────────────────────
const TASK_TEMPLATES: Record<string, { title: string; priority: 'low' | 'medium' | 'high'; status: 'todo' | 'in_progress' | 'done'; category?: 'pre_purchase' | 'rehab' | 'pre_sale' | 'admin' }[]> = {
  purchased: [
    { title: 'Schedule final walkthrough with inspector', priority: 'high', status: 'todo', category: 'pre_purchase' },
    { title: 'Confirm utilities switched into LLC name', priority: 'medium', status: 'todo', category: 'admin' },
    { title: 'Order dumpster for demo week', priority: 'medium', status: 'todo', category: 'rehab' },
  ],
  in_rehab: [
    { title: 'Approve cabinet shop drawings', priority: 'high', status: 'in_progress', category: 'rehab' },
    { title: 'Submit electrical permit closeout package', priority: 'medium', status: 'todo', category: 'admin' },
    { title: 'Order kitchen appliances (3-week lead)', priority: 'high', status: 'done', category: 'rehab' },
    { title: 'Confirm tile selection with designer', priority: 'medium', status: 'done', category: 'rehab' },
    { title: 'Walk roof punch list with Apex', priority: 'low', status: 'todo', category: 'rehab' },
  ],
  punch_list: [
    { title: 'Touch-up paint after fixture install', priority: 'medium', status: 'in_progress', category: 'rehab' },
    { title: 'Schedule final cleaning crew', priority: 'high', status: 'todo', category: 'pre_sale' },
    { title: 'Order MLS photography', priority: 'high', status: 'todo', category: 'pre_sale' },
    { title: 'Confirm staging package delivery', priority: 'medium', status: 'todo', category: 'pre_sale' },
    { title: 'Final HVAC commissioning report', priority: 'low', status: 'done', category: 'rehab' },
  ],
  listed: [
    { title: 'Review weekend showing feedback', priority: 'medium', status: 'todo', category: 'pre_sale' },
    { title: 'Refresh listing photos (twilight set)', priority: 'low', status: 'todo', category: 'pre_sale' },
  ],
}

interface SeededProperty { id: string; key: PropKey }
interface SeededContractor { id: string; key: ContractorKey }
interface SeededDeal { id: string; key: string; propertyId: string }
interface SeededProject { id: string; key: string; scenario: Scenario; propertyId: string; dealId: string }

async function main() {
  console.log('Locating test admin organization…')
  const { data: list } = await admin.auth.admin.listUsers()
  const adminUser = list?.users.find((u) => u.email === TEST_ADMIN_EMAIL)
  if (!adminUser) {
    throw new Error(
      `Test admin user not found. Run scripts/create-test-user.mjs first.`
    )
  }
  const { data: membership } = await admin
    .from('organization_member')
    .select('organization_id')
    .eq('user_id', adminUser.id)
    .single()
  if (!membership) throw new Error('Test admin has no org membership.')
  const orgId = membership.organization_id
  const userId = adminUser.id
  console.log(`  org = ${orgId}, user = ${userId}`)

  console.log('\nWiping existing data in this org…')
  await wipeOrgData(orgId)

  console.log('\nLooking up system budget categories…')
  const categoryByName = await lookupSystemCategories()

  console.log('Seeding contractors…')
  const contractors = await seedContractors(orgId)
  const contractorById = new Map(contractors.map((c) => [c.key, c.id]))

  console.log('Seeding properties…')
  const properties = await seedProperties(orgId, userId)
  const propertyById = new Map(properties.map((p) => [p.key, p.id]))

  console.log('Seeding deal analyses + comps…')
  const deals = await seedDealsAndComps(orgId, userId, propertyById)
  const dealById = new Map(deals.map((d) => [d.key, d.id]))

  console.log('Seeding projects…')
  const projects = await seedProjects(orgId, userId, propertyById, dealById)

  console.log('Seeding budgets + expenses…')
  await seedBudgetsAndExpenses(orgId, userId, projects, categoryByName)

  console.log('Seeding milestones…')
  await seedMilestones(orgId, projects, contractorById)

  console.log('Seeding tasks…')
  await seedTasks(orgId, userId, projects, contractorById)

  console.log('Back-dating stage_history…')
  await backfillStageHistory(projects)

  console.log('\nDone. Summary:')
  console.log(`  properties:   ${properties.length}`)
  console.log(`  contractors:  ${contractors.length}`)
  console.log(`  deals:        ${deals.length}`)
  console.log(`  projects:     ${projects.length}`)
}

async function wipeOrgData(orgId: string) {
  // Tables with denormalized organization_id (delete in FK order).
  const orgScopedTables = [
    'project_photo',
    'project_task',
    'project_milestone',
    'project',
    'comp',
    'deal_analysis_revision',
    'deal_analysis',
    'document',
    'contractor',
    'property',
  ] as const

  // project_expense and project_budget have only project_id, but project is
  // cascade-deleted above, so PG drops their rows for us. Belt-and-braces:
  // explicitly delete any orphans before the cascade just in case the
  // project rows linger from a half-failed prior seed.
  const { data: projects } = await admin
    .from('project')
    .select('id')
    .eq('organization_id', orgId)
  const projectIds = (projects ?? []).map((p) => p.id)
  if (projectIds.length > 0) {
    await admin.from('project_expense').delete().in('project_id', projectIds)
    await admin.from('project_budget').delete().in('project_id', projectIds)
  }

  for (const table of orgScopedTables) {
    const { error } = await admin.from(table).delete().eq('organization_id', orgId)
    if (error) throw new Error(`Failed to wipe ${table}: ${error.message}`)
  }
  // Org-scoped budget categories (keep the universal system row).
  await admin.from('budget_category').delete().eq('organization_id', orgId)
}

async function lookupSystemCategories(): Promise<Map<string, string>> {
  const { data, error } = await admin
    .from('budget_category')
    .select('id, name')
    .is('organization_id', null)
    .eq('is_default', true)
  if (error || !data) throw new Error(`budget_category lookup failed: ${error?.message}`)
  const map = new Map(data.map((r) => [r.name as string, r.id as string]))
  // Sanity check: every name we plan to seed expenses against must exist.
  for (const name of BUDGET_CATEGORY_NAMES) {
    if (!map.has(name)) {
      throw new Error(
        `System category '${name}' missing. Did migration 0006 apply? Run \`supabase db push\` first.`
      )
    }
  }
  return map
}

async function seedContractors(orgId: string): Promise<SeededContractor[]> {
  const rows = CONTRACTORS.map((c) => ({
    organization_id: orgId,
    name: c.name,
    company: c.company,
    trade: c.trade,
    phone: c.phone,
    email: c.email,
    rating: 4 + Math.floor(Math.random() * 2), // 4 or 5
    preferred_contact: 'email' as const,
    do_not_contact: false,
    is_active: true,
  }))
  const { data, error } = await admin.from('contractor').insert(rows).select('id, email')
  if (error || !data) throw new Error(`contractor insert failed: ${error?.message}`)
  return CONTRACTORS.map((c) => ({
    key: c.key,
    id: data.find((r) => r.email === c.email)!.id,
  }))
}

async function seedProperties(orgId: string, userId: string): Promise<SeededProperty[]> {
  const rows = PROPERTIES.map((p) => ({
    organization_id: orgId,
    address_line1: p.addr,
    city: p.city,
    state: p.state,
    zip: p.zip,
    year_built: p.year,
    sqft: p.sqft,
    bedrooms: p.bed,
    bathrooms: p.bath,
    property_type: p.type,
    created_by: userId,
  }))
  const { data, error } = await admin.from('property').insert(rows).select('id, address_line1')
  if (error || !data) throw new Error(`property insert failed: ${error?.message}`)
  return PROPERTIES.map((p) => ({
    key: p.key,
    id: data.find((r) => r.address_line1 === p.addr)!.id,
  }))
}

async function seedDealsAndComps(
  orgId: string,
  userId: string,
  propertyById: Map<PropKey, string>
): Promise<SeededDeal[]> {
  const deals: SeededDeal[] = []
  for (const scenario of SCENARIOS) {
    const propertyId = propertyById.get(scenario.propertyKey)!
    const dealInsert = {
      property_id: propertyId,
      organization_id: orgId,
      created_by: userId,
      name: scenario.scenarioName.split(' — ')[1] ?? scenario.scenarioName,
      analysis_type: scenario.analysisType,
      arv_cents: dollars(scenario.arvDollars),
      purchase_price_cents: dollars(scenario.purchaseDollars),
      rehab_estimate_cents: dollars(scenario.rehabDollars),
      arv_percentage: 70,
      financing_type: scenario.financing,
      loan_basis: scenario.financing === 'cash' ? null : 'amount',
      loan_amount_cents: scenario.financing === 'cash' ? null : dollars(scenario.loanAmountDollars ?? 0),
      interest_rate: scenario.financing === 'cash' ? null : scenario.interestRate ?? null,
      loan_term_months: scenario.financing === 'cash' ? null : 6,
      origination_points: scenario.financing === 'cash' ? null : scenario.loanPoints ?? null,
      other_loan_fees_cents: scenario.financing === 'cash' ? 0 : 75000,
      buying_closing_costs_cents: dollars(scenario.purchaseDollars * 0.025),
      selling_closing_costs_cents: dollars(scenario.arvDollars * 0.015),
      holding_period_months: scenario.holdingMonths,
      holding_taxes_cents: dollars(220),
      holding_insurance_cents: dollars(140),
      holding_utilities_cents: dollars(180),
      holding_interest_cents: 0,
      holding_hoa_cents: 0,
      holding_other_cents: 80_00,
      buy_agent_commission_pct: 0,
      sell_agent_commission_pct: 5.5,
      staging_costs_cents: dollars(2500),
      monthly_rent_cents: scenario.brrrr ? dollars(scenario.brrrr.rentDollars) : null,
      vacancy_rate_pct: scenario.brrrr ? 7 : null,
      property_mgmt_fee_pct: scenario.brrrr ? 8 : null,
      monthly_maintenance_cents: scenario.brrrr ? dollars(90) : null,
      refinance_ltv_pct: scenario.brrrr ? scenario.brrrr.refiLtvPct : null,
      refinance_interest_rate: scenario.brrrr ? scenario.brrrr.refiRate : null,
      refinance_term_years: scenario.brrrr ? scenario.brrrr.refiTermYears : null,
    }

    const { data, error } = await admin
      .from('deal_analysis')
      .insert(dealInsert)
      .select('id')
      .single()
    if (error || !data) throw new Error(`deal_analysis insert failed for ${scenario.key}: ${error?.message}`)
    deals.push({ id: data.id, key: scenario.key, propertyId })

    // Insert comps for scenarios that have them.
    const compsForScenario = COMPS_BY_SCENARIO[scenario.key]
    if (compsForScenario && compsForScenario.length > 0) {
      const compRows = compsForScenario.map((c) => ({
        deal_analysis_id: data.id,
        organization_id: orgId,
        address: c.address,
        sale_price_cents: dollars(c.saleDollars),
        sale_date: dateAgo(60 + Math.floor(Math.random() * 60)),
        included_in_arv: c.included,
        adjustment_cents: 0,
        adjustment_notes: null,
        notes: c.notes ?? null,
        condition: 'good',
      }))
      const { error: compErr } = await admin.from('comp').insert(compRows)
      if (compErr) throw new Error(`comp insert failed for ${scenario.key}: ${compErr.message}`)
    }
  }
  return deals
}

async function seedProjects(
  orgId: string,
  userId: string,
  propertyById: Map<PropKey, string>,
  dealById: Map<string, string>
): Promise<SeededProject[]> {
  const seeded: SeededProject[] = []
  for (const scenario of SCENARIOS) {
    if (scenario.currentStage === 'lead' && scenario.purchasedDaysAgo == null) {
      // Lead-only scenarios don't become projects yet.
      continue
    }
    const propertyId = propertyById.get(scenario.propertyKey)!
    const dealId = dealById.get(scenario.key)!

    const projectInsert = {
      organization_id: orgId,
      property_id: propertyId,
      deal_analysis_id: dealId,
      name: scenario.scenarioName,
      pipeline_stage: scenario.currentStage,
      stage_changed_at: scenario.stageHistory.length > 0
        ? daysAgo(scenario.stageHistory[scenario.stageHistory.length - 1].daysAgo)
        : daysAgo(0),
      purchase_date: scenario.purchasedDaysAgo != null ? dateAgo(scenario.purchasedDaysAgo) : null,
      rehab_start_date: scenario.rehabStartDaysAgo != null ? dateAgo(scenario.rehabStartDaysAgo) : null,
      rehab_end_date: scenario.rehabEndDaysAgo != null ? dateAgo(scenario.rehabEndDaysAgo) : null,
      listing_date: scenario.listingDaysAgo != null ? dateAgo(scenario.listingDaysAgo) : null,
      sale_date: scenario.saleDaysAgo != null ? dateAgo(scenario.saleDaysAgo) : null,
      actual_purchase_price_cents: scenario.purchasedDaysAgo != null
        ? dollars(scenario.purchaseDollars)
        : null,
      actual_sale_price_cents: scenario.saleDollars != null ? dollars(scenario.saleDollars) : null,
      contingency_pct: 10,
      status: 'active',
      created_by: userId,
      created_at: daysAgo(scenario.stageHistory[0].daysAgo),
    }

    const { data, error } = await admin
      .from('project')
      .insert(projectInsert)
      .select('id')
      .single()
    if (error || !data) throw new Error(`project insert failed for ${scenario.key}: ${error?.message}`)
    seeded.push({ id: data.id, key: scenario.key, scenario, propertyId, dealId })
  }
  return seeded
}

async function seedBudgetsAndExpenses(
  orgId: string,
  userId: string,
  projects: SeededProject[],
  categoryByName: Map<string, string>
) {
  for (const p of projects) {
    if (!p.scenario.buildBudget) continue

    // Scale the heavy-rehab template to this project's rehab estimate.
    const baseTotal = Object.values(BUDGET_DEFAULTS).reduce((a, b) => a + b, 0)
    const scale = p.scenario.rehabDollars / baseTotal

    const budgetRows = BUDGET_CATEGORY_NAMES.map((name) => ({
      project_id: p.id,
      budget_category_id: categoryByName.get(name)!,
      estimated_cents: dollars(Math.round(BUDGET_DEFAULTS[name] * scale)),
      notes: null,
    }))
    const { error: budgetErr } = await admin.from('project_budget').insert(budgetRows)
    if (budgetErr) throw new Error(`project_budget insert failed for ${p.key}: ${budgetErr.message}`)

    // Generate expense rows for projects past 'purchased'. Spread across
    // categories with realistic variance — most under, one or two over.
    const ratio = expenseRatioForStage(p.scenario.currentStage)
    if (ratio === 0) continue

    const expenseRows: Array<{
      project_id: string
      budget_category_id: string
      amount_cents: number
      expense_date: string
      vendor_name: string
      description: string
      payment_method: 'credit_card' | 'check' | 'lender_draw'
      created_by: string
    }> = []
    for (const name of BUDGET_CATEGORY_NAMES) {
      const budget = BUDGET_DEFAULTS[name] * scale
      // Apply category-level variance: kitchen and bathrooms tend to come in over;
      // landscaping tends to come in under. Others scatter ±15%.
      let multiplier = ratio
      if (name === 'Kitchen') multiplier *= 1.12
      else if (name === 'Bathrooms') multiplier *= 1.08
      else if (name === 'Landscaping') multiplier *= 0.78
      else multiplier *= 0.88 + Math.random() * 0.2

      const actual = Math.round(budget * multiplier)
      if (actual < 100) continue // skip nearly-empty categories

      // Split into 1-3 line items per category for variety.
      const lineCount = Math.max(1, Math.min(3, Math.round(actual / 4000)))
      const perLine = Math.floor(actual / lineCount)

      for (let i = 0; i < lineCount; i++) {
        const vendor = vendorForCategory(name)
        const days = p.scenario.rehabStartDaysAgo
          ? Math.max(2, p.scenario.rehabStartDaysAgo - Math.floor(Math.random() * 60))
          : 30
        expenseRows.push({
          project_id: p.id,
          budget_category_id: categoryByName.get(name)!,
          amount_cents: dollars(perLine + (i === lineCount - 1 ? actual - perLine * lineCount : 0)),
          expense_date: dateAgo(days),
          vendor_name: vendor,
          description: `${name} — ${vendor}`,
          payment_method: name === 'Permits' ? 'check' : Math.random() > 0.4 ? 'credit_card' : 'lender_draw',
          created_by: userId,
        })
      }
    }
    if (expenseRows.length > 0) {
      const { error } = await admin.from('project_expense').insert(expenseRows)
      if (error) throw new Error(`project_expense insert failed for ${p.key}: ${error.message}`)
    }
  }
}

function expenseRatioForStage(stage: string): number {
  switch (stage) {
    case 'purchased':
      return 0.05 // earnest demo / dumpster only
    case 'in_rehab':
      return 0.55
    case 'punch_list':
      return 0.92
    case 'listed':
    case 'under_contract_sale':
    case 'sold':
    case 'portfolio':
      return 1.0
    default:
      return 0
  }
}

function vendorForCategory(name: string): string {
  switch (name) {
    case 'Demo / Cleanup':           return 'Keystone Build Group LLC'
    case 'Permits':                  return 'City Permitting Office'
    case 'Roof':                     return 'Apex Roofing & Restoration'
    case 'Siding / Exterior Walls':  return 'Apex Roofing & Restoration'
    case 'Windows':                  return 'Pella Window Solutions'
    case 'Electrical':               return 'Voltmark Electric Co'
    case 'Plumbing':                 return 'Hill Country Plumbing LLC'
    case 'HVAC':                     return 'Northstar HVAC Solutions'
    case 'Drywall':                  return 'Smooth Finish Drywall LLC'
    case 'Kitchen':                  return 'Heritage Cabinet Works'
    case 'Bathrooms':                return 'Rivertown Tile & Stone'
    case 'Flooring':                 return 'Plank & Tile Floor Co'
    case 'Interior Paint':           return 'Sterling Painters LLC'
    case 'Landscaping':              return 'Greenleaf Landscape Co'
    default:                         return 'Home Depot Pro'
  }
}

async function seedMilestones(
  orgId: string,
  projects: SeededProject[],
  contractorById: Map<ContractorKey, string>
) {
  for (const p of projects) {
    if (p.scenario.completedMilestoneCount === 0 && !p.scenario.rehabStartDaysAgo) {
      continue
    }
    // Anchor the rehab timeline at rehab_start, fall back to purchase + 6 days.
    const startBaseDaysAgo =
      p.scenario.rehabStartDaysAgo ??
      (p.scenario.purchasedDaysAgo ? p.scenario.purchasedDaysAgo - 6 : 30)

    let cursor = startBaseDaysAgo
    const rows = MILESTONE_TEMPLATE.map((m, idx) => {
      const startDays = cursor
      cursor -= m.durationDays
      const endDays = Math.max(0, cursor)
      const isComplete = idx < p.scenario.completedMilestoneCount
      const isInProgress = idx === p.scenario.completedMilestoneCount &&
        p.scenario.currentStage === 'in_rehab'
      return {
        project_id: p.id,
        organization_id: orgId,
        name: m.name,
        contractor_id: m.tradeKey ? contractorById.get(m.tradeKey) ?? null : null,
        start_date: dateAgo(startDays),
        end_date: dateAgo(endDays),
        status: isComplete ? 'complete' : isInProgress ? 'in_progress' : 'not_started',
        sort_order: idx,
      }
    })
    const { error } = await admin.from('project_milestone').insert(rows)
    if (error) throw new Error(`project_milestone insert failed for ${p.key}: ${error.message}`)
  }
}

async function seedTasks(
  orgId: string,
  userId: string,
  projects: SeededProject[],
  contractorById: Map<ContractorKey, string>
) {
  for (const p of projects) {
    const template = TASK_TEMPLATES[p.scenario.currentStage]
    if (!template) continue
    const rows = template.map((t) => ({
      project_id: p.id,
      organization_id: orgId,
      title: t.title,
      priority: t.priority,
      status: t.status,
      category: t.category ?? null,
      assigned_to_contractor:
        t.category === 'rehab' ? contractorById.get('GC') ?? null : null,
      created_by: userId,
    }))
    const { error } = await admin.from('project_task').insert(rows)
    if (error) throw new Error(`project_task insert failed for ${p.key}: ${error.message}`)
  }
}

async function backfillStageHistory(projects: SeededProject[]) {
  // Overwrite stage_history (the trigger only modifies it on pipeline_stage
  // changes; updating stage_history alone preserves the explicit value).
  for (const p of projects) {
    const history = p.scenario.stageHistory.map((entry) => ({
      stage: entry.stage,
      changed_at: daysAgo(entry.daysAgo),
      changed_by: null,
    }))
    const { error } = await admin
      .from('project')
      .update({ stage_history: history })
      .eq('id', p.id)
    if (error) throw new Error(`stage_history backfill failed for ${p.key}: ${error.message}`)
  }
}

main().catch((err) => {
  console.error('\nSeed failed:', err)
  process.exit(1)
})

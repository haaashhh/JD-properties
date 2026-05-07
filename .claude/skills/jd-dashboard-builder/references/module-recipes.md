# Module Recipes — Feature-Specific Implementation Guides

## Table of Contents
1. [Deal Analyzer Results Panel](#deal-analyzer-results)
2. [Pipeline Kanban Board](#pipeline-kanban)
3. [Budget vs Actuals Table](#budget-table)
4. [QuickBooks Transaction Mapper](#qb-mapper)
5. [Design Board Gallery](#design-gallery)
6. [Photo Upload Grid](#photo-grid)
7. [Deal Calculations Engine](#deal-calculations)

---

## Deal Analyzer Results

The right panel of the deal analyzer shows live-calculated results as the user fills in the form. Uses the calculation engine from `lib/calculations/deal-analyzer.ts`.

### Architecture
- Form inputs live in a client component with react-hook-form
- A `useMemo` recalculates outputs whenever inputs change
- Results panel is a sibling component that receives calculated values as props
- No server round-trip needed — calculations are pure math, run client-side

### Results Display
```tsx
'use client'
import { useMemo } from 'react'
import { calculateFlipProfit } from '@/lib/calculations/deal-analyzer'

export function DealResults({ inputs }: { inputs: DealFormValues }) {
  const results = useMemo(() => calculateFlipProfit(inputs), [inputs])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Analysis Results</CardTitle>
        <DealScore profit={results.netProfitCents} arv={inputs.arvCents} roi={results.roi} />
      </CardHeader>
      <CardContent className="space-y-3">
        <ResultRow label="Max Purchase Price" value={formatCurrency(results.mppCents)} highlight />
        <Separator />
        <ResultRow label="Total Acquisition" value={formatCurrency(results.totalAcquisitionCents)} />
        <ResultRow label="Total Rehab" value={formatCurrency(inputs.rehabEstimateCents)} />
        <ResultRow label="Total Holding" value={formatCurrency(results.totalHoldingCents)} />
        <ResultRow label="Total Selling" value={formatCurrency(results.totalSellingCents)} />
        <Separator />
        <ResultRow label="Net Profit" value={formatCurrency(results.netProfitCents)}
          className={results.netProfitCents >= 0 ? 'text-green-600' : 'text-red-600'} />
        <ResultRow label="ROI" value={`${results.roi.toFixed(1)}%`} />
        <ResultRow label="Annualized ROI" value={`${results.annualizedRoi.toFixed(1)}%`} />
      </CardContent>
    </Card>
  )
}

function ResultRow({ label, value, highlight, className }: {
  label: string; value: string; highlight?: boolean; className?: string
}) {
  return (
    <div className={cn('flex justify-between text-sm', highlight && 'text-base font-semibold')}>
      <span className="text-muted-foreground">{label}</span>
      <span className={className}>{value}</span>
    </div>
  )
}

function DealScore({ profit, arv, roi }: { profit: number; arv: number; roi: number }) {
  const margin = arv > 0 ? (profit / arv) * 100 : 0
  const color = margin >= 15 && roi >= 20 ? 'green' : margin >= 10 ? 'yellow' : 'red'
  const colors = { green: 'bg-green-500', yellow: 'bg-amber-500', red: 'bg-red-500' }

  return <div className={cn('h-3 w-3 rounded-full', colors[color])} title={`${margin.toFixed(1)}% margin`} />
}
```

---

## Pipeline Kanban

Drag-and-drop board using `@dnd-kit/core`.

### Dependencies
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### Architecture
```tsx
'use client'
import { DndContext, DragOverlay, closestCorners } from '@dnd-kit/core'
import { updateProjectStage } from './actions'

const VISIBLE_STAGES = [
  'lead', 'analyzing', 'offer_made', 'under_contract',
  'purchased', 'in_rehab', 'listed', 'sold'
]

export function PipelineBoard({ projects }: { projects: Project[] }) {
  const [items, setItems] = useState(projects)
  const [activeId, setActiveId] = useState<string | null>(null)

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return

    const projectId = active.id as string
    const newStage = over.id as string

    // Optimistic update
    setItems(prev =>
      prev.map(p => p.id === projectId
        ? { ...p, pipeline_stage: newStage, stage_changed_at: new Date().toISOString() }
        : p
      )
    )
    setActiveId(null)

    // Persist
    updateProjectStage(projectId, newStage)
  }

  return (
    <DndContext
      collisionDetection={closestCorners}
      onDragStart={(e) => setActiveId(e.active.id as string)}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {VISIBLE_STAGES.map((stage) => (
          <StageColumn
            key={stage}
            stage={stage}
            projects={items.filter(p => p.pipeline_stage === stage)}
          />
        ))}
      </div>
      <DragOverlay>
        {activeId && <ProjectCard project={items.find(p => p.id === activeId)!} />}
      </DragOverlay>
    </DndContext>
  )
}

function StageColumn({ stage, projects }: { stage: string; projects: Project[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex w-72 shrink-0 flex-col rounded-lg bg-muted/50 p-3',
        isOver && 'ring-2 ring-blue-400'
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <StageBadge stage={stage} />
        <span className="text-xs text-muted-foreground">{projects.length}</span>
      </div>
      <div className="flex flex-col gap-2">
        {projects.map(p => (
          <DraggableCard key={p.id} project={p} />
        ))}
      </div>
    </div>
  )
}
```

### Project Card (in Kanban)
```tsx
function ProjectCard({ project }: { project: Project }) {
  return (
    <Card className="cursor-grab active:cursor-grabbing">
      <CardContent className="p-3">
        <p className="font-medium text-sm">{project.name}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {project.property?.address_line1}, {project.property?.city}
        </p>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>ARV: {formatCurrency(project.deal_analysis?.arv_cents)}</span>
          <span>{formatCurrency(project.total_budget_cents)} budget</span>
        </div>
      </CardContent>
    </Card>
  )
}
```

---

## Budget Table

The budget vs actuals table is the core financial tracking view.

### Architecture
- Server component fetches budget + expenses
- Client component renders the interactive table
- Expandable rows for subcategories
- Color-coded variance

```tsx
'use client'
interface BudgetRow {
  categoryId: string
  categoryName: string
  group: string
  estimatedCents: number
  actualCents: number
  children?: BudgetRow[]
}

export function BudgetTable({ rows, projectId }: { rows: BudgetRow[]; projectId: string }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[300px]">Category</TableHead>
          <TableHead className="text-right">Budget</TableHead>
          <TableHead className="text-right">Actual</TableHead>
          <TableHead className="text-right">Variance</TableHead>
          <TableHead className="text-right w-[120px]">% Spent</TableHead>
          <TableHead className="w-[60px]">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const variance = row.estimatedCents - row.actualCents
          const pct = row.estimatedCents > 0 ? (row.actualCents / row.estimatedCents) * 100 : 0
          const status = getStatus(pct, row.actualCents)

          return (
            <TableRow key={row.categoryId}>
              <TableCell>
                <span className="font-medium">{row.categoryName}</span>
              </TableCell>
              <TableCell className="text-right">{formatCurrency(row.estimatedCents)}</TableCell>
              <TableCell className="text-right">{formatCurrency(row.actualCents)}</TableCell>
              <TableCell className={cn('text-right font-medium',
                variance >= 0 ? 'text-green-600' : 'text-red-600'
              )}>
                {variance >= 0 ? '+' : ''}{formatCurrency(variance)}
              </TableCell>
              <TableCell className="text-right">
                <BudgetProgressBar percent={pct} />
              </TableCell>
              <TableCell>
                <StatusDot status={status} />
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

function getStatus(pct: number, actual: number): 'not_started' | 'under' | 'warning' | 'over' {
  if (actual === 0) return 'not_started'
  if (pct > 100) return 'over'
  if (pct > 90) return 'warning'
  return 'under'
}

function StatusDot({ status }: { status: string }) {
  const colors = {
    not_started: 'bg-gray-300',
    under: 'bg-green-500',
    warning: 'bg-amber-500',
    over: 'bg-red-500',
  }
  return <div className={cn('h-2.5 w-2.5 rounded-full mx-auto', colors[status])} />
}

function BudgetProgressBar({ percent }: { percent: number }) {
  const color = percent > 100 ? 'bg-red-500' : percent > 90 ? 'bg-amber-500' : 'bg-blue-500'
  return (
    <div className="flex items-center gap-2 justify-end">
      <div className="h-1.5 w-16 rounded-full bg-muted">
        <div className={cn('h-1.5 rounded-full', color)}
             style={{ width: `${Math.min(100, percent)}%` }} />
      </div>
      <span className="text-xs text-muted-foreground w-8 text-right">{Math.round(percent)}%</span>
    </div>
  )
}
```

---

## QB Mapper

The transaction mapping UI for unreviewed QuickBooks transactions.

```tsx
'use client'
export function TransactionMapper({ transactions, projects, categories }: {
  transactions: QBTransaction[]
  projects: Project[]
  categories: BudgetCategory[]
}) {
  const [selections, setSelections] = useState<Record<string, { projectId: string; categoryId: string }>>({})

  async function confirmAll() {
    const entries = Object.entries(selections)
    for (const [txnId, mapping] of entries) {
      await confirmTransaction(txnId, mapping.projectId, mapping.categoryId)
    }
    toast.success(`Confirmed ${entries.length} transactions`)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {transactions.length} transactions need review
        </p>
        <Button onClick={confirmAll} disabled={Object.keys(selections).length === 0}>
          Confirm Selected ({Object.keys(selections).length})
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead>Memo</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((txn) => (
            <TableRow key={txn.id}>
              <TableCell className="text-sm">{formatDate(txn.qb_txn_date)}</TableCell>
              <TableCell className="text-sm font-medium">{txn.qb_vendor_name}</TableCell>
              <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                {txn.qb_memo}
              </TableCell>
              <TableCell className="text-right text-sm">
                {formatCurrency(txn.qb_amount_cents)}
              </TableCell>
              <TableCell>
                <Select
                  value={selections[txn.id]?.projectId ?? txn.mapped_project_id ?? ''}
                  onValueChange={(v) => setSelections(s => ({
                    ...s, [txn.id]: { ...s[txn.id], projectId: v }
                  }))}
                >
                  <SelectTrigger className="w-40 h-8 text-xs">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Select
                  value={selections[txn.id]?.categoryId ?? txn.mapped_budget_category_id ?? ''}
                  onValueChange={(v) => setSelections(s => ({
                    ...s, [txn.id]: { ...s[txn.id], categoryId: v }
                  }))}
                >
                  <SelectTrigger className="w-36 h-8 text-xs">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="sm"
                  onClick={() => ignoreTransaction(txn.id)}
                  className="text-xs text-muted-foreground">
                  Ignore
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
```

---

## Design Gallery

Mood board image gallery organized by room.

```tsx
'use client'
export function DesignGallery({ boards, rooms, projectId }: {
  boards: DesignBoard[]; rooms: string[]; projectId: string
}) {
  const [activeRoom, setActiveRoom] = useState(rooms[0] ?? 'kitchen')
  const roomBoards = boards.filter(b => b.room === activeRoom)

  return (
    <div className="space-y-4">
      {/* Room tabs */}
      <div className="flex gap-1 overflow-x-auto">
        {rooms.map(room => (
          <Button key={room} variant={activeRoom === room ? 'default' : 'ghost'}
            size="sm" onClick={() => setActiveRoom(room)}>
            {formatRoomName(room)}
            <Badge variant="secondary" className="ml-1.5 text-xs">
              {boards.filter(b => b.room === room).length}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Board grid */}
      {roomBoards.length === 0 ? (
        <EmptyState icon={Image} title="No boards yet"
          description={`Upload a mood board for the ${formatRoomName(activeRoom)}`} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roomBoards.map(board => (
            <Card key={board.id} className="overflow-hidden">
              <div className="aspect-[4/3] relative">
                <img src={board.image_url} alt={board.title}
                  className="h-full w-full object-cover" />
                <StageBadge stage={board.status}
                  className="absolute top-2 right-2" />
              </div>
              <CardContent className="p-3">
                <p className="font-medium text-sm">{board.title}</p>
                {board.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {board.description}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload button */}
      <BoardUpload projectId={projectId} room={activeRoom} />
    </div>
  )
}
```

---

## Deal Calculations Engine

All formulas live in one pure TypeScript file with no side effects.

```ts
// src/lib/calculations/deal-analyzer.ts

export interface FlipInputs {
  arvCents: number
  purchasePriceCents: number
  rehabEstimateCents: number
  arvPercentage: number  // default 70

  financingType: 'cash' | 'hard_money' | 'conventional' | 'private_money'
  loanAmountCents: number
  interestRate: number        // annual percentage
  loanTermMonths: number
  originationPoints: number   // percentage
  otherLoanFeesCents: number

  buyingClosingCostsCents: number
  sellingClosingCostsCents: number
  holdingPeriodMonths: number
  monthlyHoldingCostCents: number
  buyAgentCommissionPct: number
  sellAgentCommissionPct: number
}

export interface FlipResults {
  mppCents: number
  totalAcquisitionCents: number
  totalRehabCents: number
  totalHoldingCents: number
  totalSellingCents: number
  totalProjectCostCents: number
  totalCashInvestedCents: number
  netProfitCents: number
  roi: number
  annualizedRoi: number
  profitMargin: number
}

export function calculateFlipProfit(inputs: FlipInputs): FlipResults {
  const {
    arvCents, purchasePriceCents, rehabEstimateCents, arvPercentage,
    loanAmountCents, interestRate, loanTermMonths, originationPoints,
    otherLoanFeesCents, buyingClosingCostsCents, sellingClosingCostsCents,
    holdingPeriodMonths, monthlyHoldingCostCents,
    buyAgentCommissionPct, sellAgentCommissionPct,
  } = inputs

  // MPP = ARV × (arvPercentage/100) - rehab
  const mppCents = Math.round(arvCents * (arvPercentage / 100)) - rehabEstimateCents

  // Loan costs
  const loanOriginationCents = Math.round(loanAmountCents * (originationPoints / 100))
  const monthlyInterestCents = Math.round(loanAmountCents * (interestRate / 100) / 12)
  const totalLoanInterestCents = monthlyInterestCents * holdingPeriodMonths

  // Acquisition
  const totalAcquisitionCents = purchasePriceCents + buyingClosingCostsCents
    + loanOriginationCents + otherLoanFeesCents
    + Math.round(arvCents * (buyAgentCommissionPct / 100))

  // Holding
  const totalHoldingCents = (monthlyHoldingCostCents * holdingPeriodMonths) + totalLoanInterestCents

  // Selling
  const totalSellingCents = sellingClosingCostsCents
    + Math.round(arvCents * (sellAgentCommissionPct / 100))

  // Totals
  const totalProjectCostCents = totalAcquisitionCents + rehabEstimateCents + totalHoldingCents + totalSellingCents
  const downPaymentCents = purchasePriceCents - loanAmountCents
  const totalCashInvestedCents = downPaymentCents + buyingClosingCostsCents
    + loanOriginationCents + otherLoanFeesCents
    + (monthlyHoldingCostCents * holdingPeriodMonths)
    // Note: rehab may be funded by draws, so cash invested depends on draw timing
    // Simplified: assume investor fronts rehab then gets reimbursed via draws

  const netProfitCents = arvCents - totalProjectCostCents
  const roi = totalCashInvestedCents > 0 ? (netProfitCents / totalCashInvestedCents) * 100 : 0
  const daysHeld = holdingPeriodMonths * 30
  const annualizedRoi = daysHeld > 0 ? roi * (365 / daysHeld) : 0
  const profitMargin = arvCents > 0 ? (netProfitCents / arvCents) * 100 : 0

  return {
    mppCents, totalAcquisitionCents, totalRehabCents: rehabEstimateCents,
    totalHoldingCents, totalSellingCents, totalProjectCostCents,
    totalCashInvestedCents, netProfitCents, roi, annualizedRoi, profitMargin,
  }
}

export function calculateMPP(arvCents: number, rehabCents: number, pct: number = 70): number {
  return Math.round(arvCents * (pct / 100)) - rehabCents
}
```

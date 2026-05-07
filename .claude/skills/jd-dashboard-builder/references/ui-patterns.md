# UI Patterns — Styling, Components & Dashboard Aesthetic

## Table of Contents
1. [Design Language](#design-language)
2. [Color System](#color-system)
3. [Layout Patterns](#layout-patterns)
4. [Component Recipes](#component-recipes)
5. [Chart Patterns](#chart-patterns)
6. [Table Patterns](#table-patterns)
7. [Responsive Rules](#responsive-rules)

---

## Design Language

The dashboard follows the aesthetic from John's screenshot: **professional, data-dense, dark sidebar with light content area.** Think "fintech dashboard" — clean, numbers-forward, minimal decoration.

### Key Aesthetic Principles
- **Data density over whitespace.** Show more information per screen, not less. Flippers want to see everything at a glance.
- **Numbers are the hero.** Large, bold metric values. Supporting labels are smaller and muted.
- **Status via color.** Green = good/under budget/on track. Yellow = warning. Red = problem/over budget. Blue = in progress. Gray = not started.
- **Minimal borders.** Use background color shifts and subtle shadows to separate sections, not heavy borders.
- **Consistent card pattern.** Almost everything lives in a card: KPIs, tables, charts, forms.

---

## Color System

Use shadcn/ui's CSS variable system. Override in `globals.css`:

```css
@layer base {
  :root {
    /* Dashboard-specific semantic colors */
    --color-profit: 142 76% 36%;      /* green — profit, under budget */
    --color-loss: 0 84% 60%;          /* red — loss, over budget */
    --color-warning: 38 92% 50%;      /* amber — approaching limit */
    --color-info: 217 91% 60%;        /* blue — in progress, informational */
    --color-neutral: 215 20% 65%;     /* gray — not started, inactive */

    /* Pipeline stage colors */
    --color-stage-lead: 215 20% 65%;
    --color-stage-analyzing: 217 91% 60%;
    --color-stage-offer: 38 92% 50%;
    --color-stage-contract: 262 83% 58%;
    --color-stage-purchased: 217 91% 60%;
    --color-stage-rehab: 38 92% 50%;
    --color-stage-listed: 142 76% 36%;
    --color-stage-sold: 142 76% 36%;
  }
}
```

### Usage in Components
```tsx
// Status colors as Tailwind classes
const statusColors = {
  under_budget: 'text-green-600 bg-green-50',
  at_risk: 'text-amber-600 bg-amber-50',
  over_budget: 'text-red-600 bg-red-50',
  not_started: 'text-gray-500 bg-gray-50',
  in_progress: 'text-blue-600 bg-blue-50',
} as const
```

---

## Layout Patterns

### App Shell
```tsx
// src/app/(app)/layout.tsx
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto bg-muted/30 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
```

### Sidebar Structure
```tsx
// Dark sidebar — 256px wide, fixed height, scrollable nav
<aside className="flex h-full w-64 flex-col bg-slate-900 text-slate-300">
  {/* Logo */}
  <div className="flex h-16 items-center gap-2 px-4 border-b border-slate-800">
    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white text-sm font-bold">
      JD
    </div>
    <div>
      <p className="text-sm font-semibold text-white">Properties by JD</p>
      <p className="text-xs text-slate-500">LUXURY LIVING MADE EASY</p>
    </div>
  </div>

  {/* Navigation groups */}
  <nav className="flex-1 overflow-y-auto py-4">
    <NavGroup label="OVERVIEW">
      <NavItem href="/dashboard" icon={LayoutDashboard}>Dashboard</NavItem>
      <NavItem href="/reports" icon={BarChart3}>Reports</NavItem>
    </NavGroup>
    <NavGroup label="DEALS">
      <NavItem href="/deals" icon={Calculator}>Deal Analyzer</NavItem>
    </NavGroup>
    {/* ... more groups */}
  </nav>
</aside>
```

### NavItem Active State
```tsx
// Active item: white text + blue-tinted background
const isActive = pathname === href || pathname.startsWith(href + '/')
<Link
  href={href}
  className={cn(
    'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
    isActive
      ? 'bg-slate-800 text-white font-medium'
      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
  )}
>
```

### Page Layout Pattern
```tsx
// Every page follows: header → content grid
export default async function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Welcome back, John"
        description="3 active projects · 2 completed in the last 12 months"
        actions={
          <>
            <Button variant="outline">Run a deal</Button>
            <Button>View projects</Button>
          </>
        }
      />
      {/* KPI cards row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard ... />
      </div>
      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">{/* Chart */}</div>
        <div>{/* Side panel */}</div>
      </div>
    </div>
  )
}
```

---

## Component Recipes

### StatCard (KPI Card)
```tsx
interface StatCardProps {
  title: string
  value: string
  icon: LucideIcon
  trend?: { value: number; label: string }  // e.g., { value: 12, label: "STL avg progress" }
  variant?: 'default' | 'highlight'
}

export function StatCard({ title, value, icon: Icon, trend, variant = 'default' }: StatCardProps) {
  return (
    <Card className={cn(variant === 'highlight' && 'ring-2 ring-blue-500')}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="mt-2 text-2xl font-bold">{value}</p>
        {trend && (
          <p className={cn(
            'mt-1 text-xs',
            trend.value >= 0 ? 'text-green-600' : 'text-red-600'
          )}>
            {trend.value >= 0 ? '▲' : '▼'} {Math.abs(trend.value)}% {trend.label}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
```

### StageBadge (Pipeline Stage)
```tsx
const stageConfig: Record<string, { label: string; className: string }> = {
  lead: { label: 'Lead', className: 'bg-gray-100 text-gray-700' },
  analyzing: { label: 'Analyzing', className: 'bg-blue-100 text-blue-700' },
  offer_made: { label: 'Offer Made', className: 'bg-amber-100 text-amber-700' },
  under_contract: { label: 'Under Contract', className: 'bg-purple-100 text-purple-700' },
  purchased: { label: 'Purchased', className: 'bg-blue-100 text-blue-700' },
  in_rehab: { label: 'In Rehab', className: 'bg-amber-100 text-amber-700' },
  punch_list: { label: 'Punch List', className: 'bg-yellow-100 text-yellow-700' },
  listed: { label: 'Listed', className: 'bg-green-100 text-green-700' },
  under_contract_sale: { label: 'Under Contract', className: 'bg-purple-100 text-purple-700' },
  sold: { label: 'Sold', className: 'bg-green-100 text-green-800 font-semibold' },
  portfolio: { label: 'Portfolio', className: 'bg-slate-100 text-slate-700' },
}

export function StageBadge({ stage }: { stage: string }) {
  const config = stageConfig[stage] ?? { label: stage, className: 'bg-gray-100 text-gray-700' }
  return (
    <Badge variant="secondary" className={cn('text-xs', config.className)}>
      {config.label}
    </Badge>
  )
}
```

### EmptyState
```tsx
export function EmptyState({
  icon: Icon, title, description, action
}: {
  icon: LucideIcon; title: string; description: string
  action?: { label: string; href: string }
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
      <Icon className="h-10 w-10 text-muted-foreground/50" />
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      {action && (
        <Button asChild className="mt-4">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  )
}
```

### CurrencyInput (cents-aware)
```tsx
'use client'
export function CurrencyInput({
  value, onChange, ...props
}: {
  value: number  // cents
  onChange: (cents: number) => void
} & Omit<InputProps, 'value' | 'onChange'>) {
  const [display, setDisplay] = useState(value ? (value / 100).toFixed(2) : '')

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
      <Input
        {...props}
        type="text"
        inputMode="decimal"
        className="pl-7"
        value={display}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^0-9.]/g, '')
          setDisplay(raw)
          const cents = Math.round(parseFloat(raw || '0') * 100)
          if (!isNaN(cents)) onChange(cents)
        }}
        onBlur={() => {
          if (display) setDisplay((value / 100).toFixed(2))
        }}
      />
    </div>
  )
}
```

---

## Chart Patterns

Use **Recharts** for all charts. Wrap in a card.

### Revenue & Profit Bar Chart
```tsx
'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

export function RevenueChart({ data }: { data: { month: string; revenue: number; profit: number }[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Revenue & Profit</CardTitle>
        <CardDescription>Last 6 months — in $K</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v / 1000}K`} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <Legend />
            <Bar dataKey="revenue" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="profit" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
```

### Pipeline Donut Chart
```tsx
'use client'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts'

const STAGE_COLORS = {
  lead: '#94a3b8', analyzing: '#60a5fa', offer_made: '#f59e0b',
  under_contract: '#a78bfa', purchased: '#3b82f6', in_rehab: '#f59e0b',
  listed: '#22c55e', sold: '#16a34a',
}

export function PipelineChart({ data }: { data: { stage: string; count: number }[] }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Pipeline by Stage</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie data={data} dataKey="count" nameKey="stage" innerRadius={60} outerRadius={90}>
              {data.map((entry) => (
                <Cell key={entry.stage} fill={STAGE_COLORS[entry.stage] ?? '#94a3b8'} />
              ))}
            </Pie>
            <Legend iconType="square" />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
```

---

## Table Patterns

Use shadcn/ui `Table` components. For sortable/filterable tables, use `@tanstack/react-table`.

### Simple Data Table
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Property</TableHead>
      <TableHead>Stage</TableHead>
      <TableHead className="text-right">Budget</TableHead>
      <TableHead className="text-right">Spent</TableHead>
      <TableHead className="text-right">Progress</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {projects.map((p) => (
      <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50"
                onClick={() => router.push(`/projects/${p.id}`)}>
        <TableCell className="font-medium">{p.name}</TableCell>
        <TableCell><StageBadge stage={p.pipeline_stage} /></TableCell>
        <TableCell className="text-right">{formatCurrency(p.total_budget_cents)}</TableCell>
        <TableCell className="text-right">{formatCurrency(p.total_spent_cents)}</TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-2">
            <div className="h-2 w-16 rounded-full bg-muted">
              <div className="h-2 rounded-full bg-blue-500"
                   style={{ width: `${Math.min(100, (p.total_spent_cents / p.total_budget_cents) * 100)}%` }} />
            </div>
            <span className="text-xs text-muted-foreground">
              {Math.round((p.total_spent_cents / p.total_budget_cents) * 100)}%
            </span>
          </div>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

---

## Responsive Rules

| Breakpoint | Behavior |
|-----------|----------|
| `< 768px` (mobile) | Sidebar hidden behind hamburger menu (Sheet component). Single column layout. Tables scroll horizontally. |
| `768px-1024px` (tablet) | Sidebar collapsed to icons only (64px wide). Two-column grid where applicable. |
| `> 1024px` (desktop) | Full sidebar (256px). Dashboard uses 4-column KPI grid, 3-column content grid. |

### Mobile Sidebar Toggle
Use shadcn/ui `Sheet` component:
```tsx
// In topbar — mobile only
<Sheet>
  <SheetTrigger asChild>
    <Button variant="ghost" size="icon" className="lg:hidden">
      <Menu className="h-5 w-5" />
    </Button>
  </SheetTrigger>
  <SheetContent side="left" className="w-64 p-0">
    <Sidebar />
  </SheetContent>
</Sheet>
```

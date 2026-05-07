# Codebase Structure — File Tree, Patterns & Conventions

## Table of Contents
1. [Project File Tree](#project-file-tree)
2. [Naming Conventions](#naming-conventions)
3. [Component Patterns](#component-patterns)
4. [Data Fetching Patterns](#data-fetching-patterns)
5. [Environment Variables](#environment-variables)

---

## Project File Tree

```
properties-by-jd/
├── .env.local                    # Local secrets (never committed)
├── .env.example                  # Template for env vars
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── supabase/
│   ├── config.toml
│   ├── migrations/               # Versioned SQL (source of truth for DB)
│   │   ├── 0001_init.sql         # orgs, members, settings, signup trigger, RLS
│   │   └── 0002_operational_core.sql  # property, deal_analysis (persisted ROI), project, budgets, project_financials view
│   └── seed.sql                  # (optional) default budget categories, room types
├── public/
│   └── logo.svg
├── src/
│   ├── proxy.ts                  # Next.js 16 auth gate (renamed from middleware.ts; nodejs runtime, exports `proxy`, NOT `middleware`)
│   ├── app/                      # Next.js App Router
│   │   ├── layout.tsx            # Root layout (auth provider, sidebar)
│   │   ├── page.tsx              # Redirect to /dashboard
│   │   ├── globals.css
│   │   │
│   │   ├── (auth)/               # Route group: unauthenticated pages
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   └── layout.tsx        # Centered layout, no sidebar
│   │   │
│   │   ├── (app)/                # Route group: authenticated pages
│   │   │   ├── layout.tsx        # Sidebar + topbar layout
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx      # Main dashboard with KPIs
│   │   │   ├── deals/
│   │   │   │   ├── page.tsx      # Deal list / pipeline board
│   │   │   │   ├── new/page.tsx  # New deal analyzer form
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx  # Deal detail / analysis results
│   │   │   │       └── edit/page.tsx
│   │   │   ├── projects/
│   │   │   │   ├── page.tsx      # Project list / pipeline kanban
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx      # Project overview
│   │   │   │       ├── budget/page.tsx
│   │   │   │       ├── schedule/page.tsx
│   │   │   │       ├── tasks/page.tsx
│   │   │   │       ├── photos/page.tsx
│   │   │   │       ├── draws/page.tsx
│   │   │   │       └── design/page.tsx  # Design boards for this project
│   │   │   ├── design-boards/
│   │   │   │   └── page.tsx      # Global design board overview
│   │   │   ├── products/
│   │   │   │   └── page.tsx      # Product library
│   │   │   ├── contacts/
│   │   │   │   └── page.tsx      # Contractors list
│   │   │   ├── reports/
│   │   │   │   └── page.tsx      # Financial reports
│   │   │   ├── settings/
│   │   │   │   ├── page.tsx      # General settings
│   │   │   │   └── quickbooks/page.tsx  # QB connection management
│   │   │   └── lenders/
│   │   │       └── page.tsx      # Lender & draw overview
│   │   │
│   │   └── api/                  # API Route Handlers
│   │       ├── quickbooks/
│   │       │   ├── connect/route.ts    # OAuth2 initiate
│   │       │   ├── callback/route.ts   # OAuth2 callback
│   │       │   ├── sync/route.ts       # Trigger manual sync
│   │       │   ├── webhook/route.ts    # QBO webhook receiver
│   │       │   └── disconnect/route.ts
│   │       ├── deals/
│   │       │   └── [id]/
│   │       │       └── report/route.ts # Generate PDF investment report
│   │       ├── projects/
│   │       │   └── [id]/
│   │       │       ├── budget/route.ts
│   │       │       └── expenses/route.ts
│   │       └── uploads/
│   │           └── route.ts            # Signed URL generation for Supabase Storage
│   │
│   ├── components/
│   │   ├── ui/                   # shadcn/ui components (auto-generated)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── table.tsx
│   │   │   └── ...
│   │   ├── layout/
│   │   │   ├── sidebar.tsx       # App sidebar navigation
│   │   │   ├── topbar.tsx        # Top bar with search, user menu
│   │   │   └── page-header.tsx   # Page title + actions bar
│   │   ├── dashboard/
│   │   │   ├── stat-card.tsx     # KPI card (Active Projects, Capital, etc.)
│   │   │   ├── revenue-chart.tsx # Recharts revenue & profit over time
│   │   │   ├── pipeline-chart.tsx # Pipeline by stage donut
│   │   │   ├── active-projects-table.tsx
│   │   │   └── recent-activity.tsx
│   │   ├── deals/
│   │   │   ├── deal-form.tsx     # Flip/BRRRR analyzer input form
│   │   │   ├── deal-results.tsx  # Calculated outputs display
│   │   │   ├── comp-table.tsx    # Comparable sales table
│   │   │   └── deal-score.tsx    # Traffic light indicator
│   │   ├── projects/
│   │   │   ├── pipeline-board.tsx # Kanban drag-and-drop
│   │   │   ├── project-card.tsx   # Card in pipeline
│   │   │   └── stage-badge.tsx
│   │   ├── budget/
│   │   │   ├── budget-table.tsx       # Budget vs actuals table
│   │   │   ├── expense-form.tsx
│   │   │   ├── expense-list.tsx
│   │   │   └── category-status.tsx    # Color-coded status indicator
│   │   ├── schedule/
│   │   │   ├── gantt-chart.tsx
│   │   │   └── milestone-row.tsx
│   │   ├── design/
│   │   │   ├── board-gallery.tsx      # Mood board image grid
│   │   │   ├── board-upload.tsx
│   │   │   ├── product-card.tsx
│   │   │   ├── product-picker.tsx
│   │   │   └── shopping-list.tsx
│   │   ├── quickbooks/
│   │   │   ├── connect-button.tsx
│   │   │   ├── sync-status.tsx
│   │   │   └── transaction-mapper.tsx # UI for confirming QB mappings
│   │   └── shared/
│   │       ├── currency-input.tsx
│   │       ├── percentage-input.tsx
│   │       ├── file-upload.tsx
│   │       ├── data-table.tsx    # Generic sortable/filterable table
│   │       ├── empty-state.tsx
│   │       └── loading-skeleton.tsx
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts         # Browser Supabase client (createBrowserClient)
│   │   │   ├── server.ts         # Server-side Supabase client (createServerClient w/ async cookies())
│   │   │   ├── proxy.ts          # `updateSession` helper called by src/proxy.ts
│   │   │   └── admin.ts          # Service role client (API routes only)
│   │   ├── stores/
│   │   │   └── realtime-store.ts # Zustand per-row store, populated by useSupabaseChannel
│   │   ├── quickbooks/
│   │   │   ├── auth.ts           # OAuth2 helpers (token refresh, etc.)
│   │   │   ├── api.ts            # QB API wrapper (query, create, update)
│   │   │   ├── sync.ts           # Sync engine (fetch, diff, upsert)
│   │   │   └── mapping.ts        # Auto-match QB entities to dashboard entities
│   │   ├── calculations/
│   │   │   ├── deal-analyzer.ts  # All flip/BRRRR formulas
│   │   │   └── budget.ts         # Budget variance, margin calculations
│   │   ├── utils.ts              # formatCurrency, formatDate, cn(), etc.
│   │   └── constants.ts          # Pipeline stages, room types, trade types
│   │
│   ├── hooks/
│   │   ├── use-projects.ts
│   │   ├── use-deal-analysis.ts
│   │   ├── use-budget.ts
│   │   └── use-realtime.ts       # Supabase realtime subscription hook
│   │
│   └── types/
│       ├── database.ts           # Generated by `supabase gen types typescript --linked`
│       ├── deal.ts               # Deal analysis input/output types
│       ├── quickbooks.ts         # QB API response types
│       └── index.ts              # Re-exports
│
└── scripts/
    ├── seed-categories.ts        # Seed default budget categories
    └── migrate-flipperforce.ts   # Data migration from FlipperForce export
```

---

## Naming Conventions

| Thing | Convention | Example |
|-------|-----------|---------|
| Files & folders | kebab-case | `deal-form.tsx`, `budget-table.tsx` |
| React components | PascalCase | `DealForm`, `BudgetTable` |
| Database tables | snake_case | `project_expense`, `deal_analysis` |
| API routes | kebab-case paths | `/api/quickbooks/connect` |
| TypeScript types | PascalCase | `DealAnalysis`, `ProjectExpense` |
| Utility functions | camelCase | `formatCurrency()`, `calculateMPP()` |
| Constants | UPPER_SNAKE | `PIPELINE_STAGES`, `ROOM_TYPES` |
| CSS classes | Tailwind utilities only | No custom CSS files per component |

---

## Component Patterns

### Server Component (default — data fetching)
```tsx
// src/app/(app)/projects/[id]/budget/page.tsx
// Next.js 16: `params` is Promise<...> and must be awaited.
import { createClient } from '@/lib/supabase/server'
import { BudgetTable } from '@/components/budget/budget-table'

export default async function BudgetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: budget } = await supabase
    .from('project_budget')
    .select('*, budget_category(*)')
    .eq('project_id', id)

  const { data: expenses } = await supabase
    .from('project_expense')
    .select('*')
    .eq('project_id', id)

  return <BudgetTable budget={budget ?? []} expenses={expenses ?? []} projectId={id} />
}
```

### Client Component (interactivity)
```tsx
// src/components/budget/budget-table.tsx
'use client'

import { useState } from 'react'
// ... only 'use client' when the component needs state, effects, or event handlers
```

### Server Actions (mutations)
```tsx
// src/app/(app)/projects/[id]/budget/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addExpense(projectId: string, data: ExpenseInput) {
  const supabase = await createClient()
  const { error } = await supabase.from('project_expense').insert({
    project_id: projectId,
    amount_cents: Math.round(data.amount * 100),
    ...data,
  })
  if (error) throw error
  revalidatePath(`/projects/${projectId}/budget`)
}
```

---

## Data Fetching Patterns

| Scenario | Pattern |
|----------|---------|
| Page load data | Server Component with `await supabase.from()` |
| Form submission | Server Action (`'use server'`) — uses React 19 `useActionState` for client wiring |
| Real-time updates | `useSupabaseChannel({ table, filter })` merges row events into Zustand store; do NOT call `router.refresh()` |
| QB sync trigger | API Route Handler (`POST /api/quickbooks/sync`) |
| File upload | Client gets signed URL from API, uploads directly to Supabase Storage |
| Auth gate | `src/proxy.ts` (Next.js 16 — was `middleware.ts`); calls `supabase.auth.getUser()` early, redirects if unauth |

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxx
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxx

# QuickBooks
QB_CLIENT_ID=xxx
QB_CLIENT_SECRET=xxx
QB_REDIRECT_URI=https://yourdomain.com/api/quickbooks/callback
QB_ENVIRONMENT=sandbox  # or production

# App
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

`NEXT_PUBLIC_` prefix = exposed to browser. Everything else = server-only.

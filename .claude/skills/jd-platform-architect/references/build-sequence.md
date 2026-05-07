# Build Sequence — Module-by-Module Task Breakdown

This is the implementation plan. Each module lists the exact tasks to give Claude Code. Complete modules in order — each builds on the previous.

---

## Module 1: Shell (Auth, Layout, Navigation) — DONE in commit `feature/module-1-shell`

**Depends on**: Nothing
**Produces**: Working app skeleton with login, sidebar navigation, and the operational schema for Modules 2-5.

### Tasks (as actually executed)
1. Initialize Next.js 16 project with TypeScript, Tailwind v4, App Router (`create-next-app@latest .`).
2. Install shadcn/ui via `npx shadcn@latest init --defaults` (Neutral / base-nova preset). Add: button, card, input, label, dropdown-menu, avatar, dialog, sonner, skeleton, sheet, badge, separator, tabs, tooltip, select, textarea, popover, checkbox, table, sidebar, command. (`form` shadcn wrapper is not in base-nova — use react-hook-form directly.)
3. Set up Supabase CLI (`supabase init`), provision project, configure env vars from `.env.example`.
4. Write `supabase/migrations/0001_init.sql` (orgs, members, settings, signup trigger, RLS) and `0002_operational_core.sql` (property, deal_analysis with persisted ROI + holding-cost breakdown, contractor, project with auto-contingency trigger, budget_category, project_budget, project_expense, project_financials view, RLS). Run `supabase db push` and `npm run types:db`.
5. Implement Supabase Auth via `@supabase/ssr` (`getAll`/`setAll` cookies, async `cookies()`). Build `src/proxy.ts` (Next.js 16 rename of `middleware.ts`, exports `proxy`, NOT `middleware`) that calls `supabase.auth.getUser()` early, redirects unauth → `/login`, sets `Cache-Control: private, no-store`.
6. Auto-create the default org on signup via the `handle_new_user` Postgres trigger in `0001_init.sql` — populates `organization`, `organization_member(role='owner')`, `organization_settings`, `user_settings`.
7. Build sidebar component matching John's screenshot:
   - Logo area ("Properties by JD")
   - Nav groups: Overview (Dashboard, Reports), Deals (Deal Analyzer, Rehab Estimator), Projects (Projects, Design Boards, Product Library, Documents), People & Money (Contacts, Lenders & Draws), Account (Settings)
   - Collapsible on mobile
8. Build top bar: search input (placeholder for now), "New Deal" button, user avatar dropdown
9. Build authenticated layout: sidebar + topbar + main content area
10. Build page-header component (title + description + action buttons)
11. Create shared components: empty-state, loading-skeleton, currency-input, percentage-input
12. Create `lib/constants.ts` with PIPELINE_STAGES, ROOM_TYPES, TRADE_TYPES, BUDGET_CATEGORY_GROUPS
13. Create `lib/utils.ts` with formatCurrency, formatDate, formatPercentage, cn()
14. Deploy to Vercel, confirm working auth flow

### Acceptance Criteria
- User can sign up, log in, see sidebar, navigate between empty pages
- Auth middleware redirects unauthenticated users to login
- Responsive: sidebar collapses on mobile
- Dark sidebar matching screenshot aesthetic

---

## Module 2: Deal Analyzer

**Depends on**: Shell
**Produces**: Full deal analysis tool (flip + BRRRR) with comp management

### Tasks
1. Run Prisma migration: property, deal_analysis, comp tables
2. Build deal list page (`/deals`) — table of all analyses with key metrics (ARV, MPP, profit, ROI)
3. Build "New Deal" form (`/deals/new`):
   - Step 1: Property details (address, sqft, bed/bath, type)
   - Step 2: Analysis inputs (ARV, purchase price, rehab estimate, financing)
   - Step 3: Costs (closing costs, holding, commissions)
   - Toggle between Flip and BRRRR mode
4. Implement `lib/calculations/deal-analyzer.ts`:
   - `calculateMPP(arv, rehabEstimate, arvPercentage)`
   - `calculateFlipProfit(inputs)` → returns all calculated outputs
   - `calculateBRRRR(inputs)` → returns cash-on-cash, equity captured, etc.
   - All formulas from real-estate-flip-ops skill's deal-analysis.md
5. Build deal results component: calculated outputs table + deal score traffic light
6. Build comp table component: add/edit/remove comps, toggle include/exclude, auto-calculate ARV from included comps
7. Build deal detail page (`/deals/[id]`) showing full analysis results
8. Add user-level ARV percentage setting (default 70%, stored in organization settings)
9. Wire up Server Actions for CRUD on deals, properties, comps

### Acceptance Criteria
- User can create a flip analysis, see calculated MPP, profit, ROI
- User can toggle to BRRRR mode, see rental metrics
- User can add comps, include/exclude them, see ARV update
- Deal score shows green/yellow/red based on margins
- All math matches formulas in domain skill

---

## Module 3: Projects & Pipeline

**Depends on**: Shell, Deal Analyzer (for linking deals to projects)
**Produces**: Pipeline kanban board, project detail pages

### Tasks
1. Run Prisma migration: project, contractor tables
2. Build pipeline Kanban board (`/projects`):
   - Columns for each pipeline stage
   - Project cards showing: name, stage, key metric (budget remaining or profit)
   - Drag-and-drop between stages (use @dnd-kit/core)
   - Pipeline stage update via Server Action
3. Build project creation flow:
   - Create from scratch (enter property details)
   - Create from existing deal analysis (link deal → auto-populate)
4. Build project overview page (`/projects/[id]`):
   - Header: property name, address, stage badge, key dates
   - Quick stats: ARV, purchase price, budget, spent, projected profit
   - Tabbed sub-navigation: Overview, Budget, Schedule, Tasks, Photos, Draws, Design
5. Build contractor CRUD (`/contacts`): list, add, edit
6. Build project milestone/schedule page (`/projects/[id]/schedule`):
   - List of milestones with dates, status, assigned contractor
   - Simple Gantt-style timeline (horizontal bars)
7. Build project tasks page (`/projects/[id]/tasks`):
   - Task list with filters (status, priority, assignee)
   - Quick-add task form
8. Build project photos page (`/projects/[id]/photos`):
   - Photo grid with room/phase filters
   - Upload flow (signed URL → Supabase Storage)
   - Before/during/after tagging

### Acceptance Criteria
- Kanban board shows projects in correct stages, drag-and-drop updates stage
- Project can be created from a deal or from scratch
- Project detail shows all tabs with working content
- Photos upload to Supabase Storage and display in grid

---

## Module 4: Budget Tracker

**Depends on**: Projects
**Produces**: Budget vs actuals tracking per project

### Tasks
1. Run Prisma migration: budget_category (with seed data), project_budget, project_expense, budget_template, budget_template_line
2. Seed default budget categories (all categories from real-estate-flip-ops skill)
3. Build budget page (`/projects/[id]/budget`):
   - Budget vs Actuals table: category, estimated, actual, variance, % spent, status color
   - Totals row with contingency
   - Expandable rows for subcategories
4. Build "Apply Template" flow: select template, enter sqft, populate budget
5. Build expense entry form: amount, date, vendor, category, description, receipt upload
6. Build expense list: sortable, filterable by category/date/vendor
7. Build budget template management in settings:
   - Create template from scratch or from an existing project's budget
   - Edit template line items
8. Implement budget calculations in `lib/calculations/budget.ts`:
   - `calculateVariance(budget, expenses)` per category
   - `calculateContingency(totalBudget, contingencyPct)`
   - `calculateProjectMargin(project)` → projected profit from current spend rate

### Acceptance Criteria
- Budget table shows correct variance and color coding per category
- Expenses can be added manually with receipt uploads
- Templates can be created, saved, and applied to new projects
- Contingency auto-calculates from percentage setting

---

## Module 5: Dashboard

**Depends on**: Projects, Budget Tracker, Deal Analyzer (for data to display)
**Produces**: Main dashboard with KPIs, charts, activity feed

### Tasks
1. Create database view `project_summary` (see database-schema.md)
2. Build dashboard page (`/dashboard`) matching John's screenshot:
   - Welcome header with active/completed project counts
   - "Run a deal" + "View projects" action buttons
   - KPI stat cards: Active Projects, Capital Deployed, Projected Profit (Active), Avg ROI (Last 12 Mo)
   - Revenue & Profit chart (Recharts BarChart, last 6 months, toggleable: 6M/1Y/All)
   - Pipeline by Stage donut chart (Recharts PieChart)
   - Active Projects table: property name, stage, budget, spent, progress %, target close
   - Recent Activity feed (last 10 actions: stage changes, expenses added, draws approved)
3. Build stat-card component (reusable): value, label, trend indicator (up/down %), icon
4. Build revenue-chart component using Recharts
5. Build pipeline-chart donut component
6. Build recent-activity component (query from various tables by created_at)

### Acceptance Criteria
- Dashboard loads with real data from existing projects/deals
- KPIs calculate correctly from project_summary view
- Charts render and are interactive (tooltips, legend toggles)
- Activity feed shows recent actions chronologically
- Layout matches the screenshot structure

---

## Module 6: QuickBooks Integration

**Depends on**: Budget Tracker (expenses to link)
**Produces**: QB connect, sync, and transaction mapping

### Tasks
1. Run Prisma migration: qb_connection, qb_transaction, qb_sync_log
2. Register app at Intuit Developer Portal, get sandbox credentials
3. Implement `lib/quickbooks/auth.ts`: encrypt/decrypt, token refresh
4. Implement `lib/quickbooks/api.ts`: authenticated GET/POST wrapper with rate limiting
5. Build OAuth2 routes: `/api/quickbooks/connect`, `/api/quickbooks/callback`
6. Build QB settings page (`/settings/quickbooks`):
   - Connect button (if not connected)
   - Connection status, last sync time, realm ID (if connected)
   - Manual "Sync Now" button
   - Disconnect button
7. Implement `lib/quickbooks/sync.ts`: polling sync engine
8. Implement `lib/quickbooks/mapping.ts`: auto-match logic
9. Build transaction mapper UI:
   - Table of unmatched/needs_review transactions
   - Project + category dropdowns per row
   - Batch confirm / ignore actions
10. When user confirms a QB transaction mapping, auto-create the linked `project_expense`
11. Build sync status indicator in sidebar (green dot = synced, yellow = syncing, red = error)
12. Implement `/api/quickbooks/webhook` (post-MVP but scaffold it now)

### Acceptance Criteria
- User can connect to QuickBooks sandbox via OAuth2
- Manual sync pulls transactions from QBO
- Auto-matching correctly links transactions to projects by Class name
- User can review and confirm unmatched transactions
- Confirmed transactions appear as expenses in project budget

---

## Module 7: Design Boards

**Depends on**: Projects
**Produces**: Mood board uploads, product library, material selection tracking

### Tasks
1. Run Prisma migration: design_board, product, project_product_selection
2. Create Supabase Storage buckets: `design-boards`, `product-images`
3. Build design boards page per project (`/projects/[id]/design`):
   - Room selector tabs/dropdown
   - Mood board gallery per room (image grid)
   - Upload flow: select room, upload image, add title/description
   - Status controls: mark as draft/presented/approved
4. Build product library page (`/products`):
   - Product grid with image, name, brand, price, purchase link
   - Add product form: image upload, details, purchase URL
   - Filter by category, search by name
5. Build product picker for project rooms:
   - Browse/search global library
   - Add to project room with quantity
   - Track status: selected → approved → ordered → received → installed
6. Build shopping list view:
   - All products across all rooms for a project
   - Purchase links, total cost, order status
   - Filterable by room, status
7. Implement designer role access:
   - Designers can upload boards and manage products
   - Designers cannot see financial data (budget, expenses, deal analysis)

### Acceptance Criteria
- Designer can upload mood board images organized by room
- Products can be added to global library and selected for project rooms
- Shopping list aggregates all selections with purchase links
- Product status tracks through selection → installation lifecycle
- File uploads work via signed URLs to Supabase Storage

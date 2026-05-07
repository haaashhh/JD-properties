# Database Schema — Complete PostgreSQL Schema

> **Status (2026-05-07):** Migrations 0001-0004 are applied. The deal-analyzer
> slice was rebased in 0004 with four deviations from the original draft below
> — all driven by a Module 2 architecture review:
>
> 1. **Deal-analyzer math is computed-on-read.** `deal_analysis` no longer
>    stores `net_profit_cents` / `roi_pct` / `annualized_roi_pct`. The
>    `compute_deal_metrics` trigger is dropped (it had a div-by-zero bug on
>    cash deals). Use the `deal_analysis_computed` view (`security_invoker
>    = on`) instead. ROI returns NULL when the cash-invested denominator ≤
>    0 — there's no 1-cent hack.
> 2. **`organization_id` is denormalized** onto `deal_analysis`, `comp`,
>    `document`, and `deal_analysis_revision`. RLS is single-hop. Triggers
>    auto-populate on INSERT when not supplied.
> 3. **Documents are generic + polymorphic.** A single `document` table
>    with `(entity_type, entity_id)` and DocuSign envelope fields replaces
>    per-module document tables. The spec's `deal_analysis_document` was
>    folded into this.
> 4. **Holding costs stay broken-out.** Five line-item columns + a new
>    `holding_other_cents` catch-all + a generated `monthly_holding_cost_cents`
>    sum. QB reconciliation in Module 6 needs the breakdown.
>
> Other 0004 adds: `name`/`is_archived`/`archived_at`/`archived_by`/`is_active`/
> `cash_invested_cents`/`staging_costs_cents`/`loan_to_value_pct`/`loan_basis`
> on `deal_analysis`; `condition`/`adjustment_cents`/`adjustment_notes`/
> `source_url`/MLS-sync fields on `comp`; `mls_number`/`thumbnail_url`/
> `latitude`/`longitude`/`active_deal_analysis_id`/`dedupe_key` on `property`;
> `qb_class_name`/`qb_customer_id` on `project`; `preferred_contact`/
> `do_not_contact` on `contractor`; new `deal_analysis_revision` audit table
> populated by an AFTER UPDATE snapshot trigger.

## Table of Contents
1. [Schema Overview](#schema-overview)
2. [Migration Order](#migration-order)
3. [Table Definitions](#table-definitions)
4. [Row-Level Security Policies](#row-level-security-policies)
5. [Views](#views)
6. [Indexes](#indexes)

---

## Schema Overview

All tables belong to the `public` schema. Supabase Auth manages `auth.users`. Our tables reference `auth.users.id` as the ownership key.

### Entity Relationship Summary
```
User (auth.users)
 ├── Organization (multi-user team)
 │    └── OrganizationMember (join)
 ├── Property
 │    ├── DealAnalysis
 │    │    └── Comp
 │    └── Project
 │         ├── ProjectBudget (per category)
 │         ├── ProjectExpense
 │         ├── ProjectMilestone
 │         ├── ProjectTask
 │         ├── ProjectPhoto
 │         ├── LenderDraw
 │         │    └── LenderDrawLine
 │         ├── DesignBoard
 │         └── ProjectProductSelection → Product
 ├── Contractor
 ├── Product (global library)
 ├── BudgetTemplate
 │    └── BudgetTemplateLine
 └── QuickBooksConnection
      ├── QBTransaction
      └── QBSyncLog
```

---

## Migration Order (actual)

Live migration files in `supabase/migrations/`:

1. `0001_init.sql` — `organization`, `organization_member`, `organization_settings`, `user_settings`, `auth.users` signup trigger, RLS scaffolding.
2. `0002_operational_core.sql` — `property`, `deal_analysis`, `comp`, `contractor`, `budget_category` (seeded contingency row), `project` (with auto-contingency trigger), `project_budget`, `project_expense`, original `project_financials` view, role-aware RLS.
3. `0003_security_invoker_view.sql` — flips `project_financials` to `security_invoker = on` (Supabase advisor fix).
4. `0004_deal_analyzer_v1.sql` — Deal-Analyzer rebase per Module 2 architecture review (see status note above). Drops persisted ROI columns + `compute_deal_metrics` trigger. Adds `deal_analysis_computed` view. Denormalizes `organization_id`. Creates generic `document` table and `deal_analysis_revision` audit table. Closes spec gaps (mls_number, thumbnail, condition, adjustments, etc.) and folds in QB lineage anchors and MLS sync fields.

Future modules add migrations on top:
- Module 3: project_milestone, project_task, project_photo
- Module 4: budget_template, budget_template_line, lender_draw, lender_draw_line
- Module 6: qb_connection, qb_transaction, qb_sync_log
- Module 7: design_board, product, project_product_selection

---

## Table Definitions

### Organizations & Auth

```sql
-- Every user belongs to an organization (even solo users get a default org)
CREATE TABLE organization (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE organization_member (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'designer')),
  invited_at TIMESTAMPTZ DEFAULT now(),
  joined_at TIMESTAMPTZ,
  UNIQUE(organization_id, user_id)
);
```

### Properties

```sql
CREATE TABLE property (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip TEXT NOT NULL,
  county TEXT,
  sqft INTEGER,
  bedrooms NUMERIC(3,1),  -- supports 0.5 for studios
  bathrooms NUMERIC(3,1), -- supports 0.5 for half baths
  lot_size_sqft INTEGER,
  year_built INTEGER,
  property_type TEXT DEFAULT 'sfr' CHECK (property_type IN (
    'sfr', 'duplex', 'triplex', 'quadplex', 'townhome', 'condo'
  )),
  source TEXT, -- where lead came from: mls, wholesaler, direct_mail, etc.
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Deal Analysis

```sql
CREATE TABLE deal_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES property(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL DEFAULT 'flip' CHECK (analysis_type IN ('flip', 'brrrr')),

  -- Core values (stored as cents — integer)
  arv_cents BIGINT NOT NULL,
  purchase_price_cents BIGINT NOT NULL,
  rehab_estimate_cents BIGINT NOT NULL,

  -- User's personal ARV percentage (default 70)
  arv_percentage NUMERIC(5,2) DEFAULT 70.00,

  -- Financing
  financing_type TEXT DEFAULT 'hard_money' CHECK (financing_type IN (
    'cash', 'hard_money', 'conventional', 'private_money'
  )),
  loan_amount_cents BIGINT,
  interest_rate NUMERIC(5,2),       -- annual %
  loan_term_months INTEGER,
  origination_points NUMERIC(4,2),  -- e.g., 2.00 = 2 points
  other_loan_fees_cents BIGINT DEFAULT 0,

  -- Costs
  buying_closing_costs_cents BIGINT DEFAULT 0,
  selling_closing_costs_cents BIGINT DEFAULT 0,
  holding_period_months NUMERIC(4,1),
  monthly_holding_cost_cents BIGINT DEFAULT 0,
  buy_agent_commission_pct NUMERIC(4,2) DEFAULT 0,
  sell_agent_commission_pct NUMERIC(4,2) DEFAULT 5.50,

  -- BRRRR-specific fields
  monthly_rent_cents BIGINT,
  vacancy_rate_pct NUMERIC(4,2),
  property_mgmt_fee_pct NUMERIC(4,2),
  monthly_maintenance_cents BIGINT,
  refinance_ltv_pct NUMERIC(5,2),
  refinance_interest_rate NUMERIC(5,2),
  refinance_term_years INTEGER,

  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Comparable sales linked to a deal analysis
CREATE TABLE comp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_analysis_id UUID NOT NULL REFERENCES deal_analysis(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  sale_price_cents BIGINT NOT NULL,
  sale_date DATE,
  sqft INTEGER,
  bedrooms NUMERIC(3,1),
  bathrooms NUMERIC(3,1),
  lot_size_sqft INTEGER,
  year_built INTEGER,
  distance_miles NUMERIC(5,2),
  days_on_market INTEGER,
  included_in_arv BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Budget Categories & Project Budgets

```sql
-- Master list of budget categories (seeded with defaults, user can add custom)
CREATE TABLE budget_category (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organization(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES budget_category(id) ON DELETE SET NULL,
  group_name TEXT CHECK (group_name IN (
    'exterior', 'interior', 'mechanical', 'soft_costs'
  )),
  sort_order INTEGER DEFAULT 0,
  is_default BOOLEAN DEFAULT false,  -- true for system-seeded categories
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Budget plan per project per category
CREATE TABLE project_budget (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  budget_category_id UUID NOT NULL REFERENCES budget_category(id),
  estimated_cents BIGINT NOT NULL DEFAULT 0,
  notes TEXT,
  UNIQUE(project_id, budget_category_id)
);

-- Individual expense line items
CREATE TABLE project_expense (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  budget_category_id UUID REFERENCES budget_category(id),
  amount_cents BIGINT NOT NULL,
  expense_date DATE NOT NULL,
  vendor_name TEXT,
  description TEXT,
  receipt_url TEXT,
  payment_method TEXT CHECK (payment_method IN (
    'cash', 'check', 'credit_card', 'debit_card', 'lender_draw', 'transfer'
  )),
  qb_transaction_id UUID REFERENCES qb_transaction(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Projects & Pipeline

```sql
CREATE TABLE project (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES property(id),
  deal_analysis_id UUID REFERENCES deal_analysis(id),
  name TEXT NOT NULL,  -- friendly name, e.g., "1428 Maple Ridge"

  pipeline_stage TEXT NOT NULL DEFAULT 'lead' CHECK (pipeline_stage IN (
    'lead', 'analyzing', 'offer_made', 'under_contract',
    'purchased', 'in_rehab', 'punch_list', 'listed',
    'under_contract_sale', 'sold', 'portfolio'
  )),
  stage_changed_at TIMESTAMPTZ DEFAULT now(),

  -- Key dates
  offer_date DATE,
  contract_date DATE,
  purchase_date DATE,
  rehab_start_date DATE,
  rehab_end_date DATE,      -- target
  rehab_actual_end DATE,    -- actual
  listing_date DATE,
  sale_date DATE,

  -- Sale data (filled when sold)
  actual_purchase_price_cents BIGINT,
  actual_sale_price_cents BIGINT,
  actual_buyer_closing_cents BIGINT,
  actual_seller_closing_cents BIGINT,
  actual_agent_commission_cents BIGINT,
  loan_payoff_cents BIGINT,

  -- Contingency percentage for budget
  contingency_pct NUMERIC(4,2) DEFAULT 10.00,

  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Project Management (Milestones, Tasks, Photos)

```sql
CREATE TABLE project_milestone (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  contractor_id UUID REFERENCES contractor(id),
  status TEXT DEFAULT 'not_started' CHECK (status IN (
    'not_started', 'in_progress', 'complete', 'blocked'
  )),
  sort_order INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE project_task (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES project_milestone(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to_user UUID REFERENCES auth.users(id),
  assigned_to_contractor UUID REFERENCES contractor(id),
  due_date DATE,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  category TEXT CHECK (category IN ('pre_purchase', 'rehab', 'pre_sale', 'admin')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE project_photo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  room_area TEXT,  -- kitchen, master_bath, exterior_front, etc.
  phase TEXT CHECK (phase IN ('before', 'during', 'after')),
  caption TEXT,
  taken_at TIMESTAMPTZ,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Contractors

```sql
CREATE TABLE contractor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  company TEXT,
  trade TEXT, -- gc, plumber, electrician, hvac, roofer, painter, flooring, drywall, etc.
  phone TEXT,
  email TEXT,
  license_number TEXT,
  insurance_expiry DATE,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Lender Draws

```sql
CREATE TABLE lender_draw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  draw_number INTEGER NOT NULL,
  request_date DATE NOT NULL,
  amount_requested_cents BIGINT NOT NULL,
  inspection_date DATE,
  inspector_name TEXT,
  amount_approved_cents BIGINT,
  disbursement_date DATE,
  status TEXT DEFAULT 'requested' CHECK (status IN (
    'requested', 'inspection_scheduled', 'approved', 'disbursed', 'denied'
  )),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, draw_number)
);

CREATE TABLE lender_draw_line (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lender_draw_id UUID NOT NULL REFERENCES lender_draw(id) ON DELETE CASCADE,
  budget_category_id UUID NOT NULL REFERENCES budget_category(id),
  amount_cents BIGINT NOT NULL
);
```

### Design Boards & Products

```sql
CREATE TABLE design_board (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  room TEXT NOT NULL,  -- kitchen, master_bath, living_room, whole_house, etc.
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,  -- Supabase storage URL
  sort_order INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft', 'presented', 'approved', 'rejected'
  )),
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE product (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  brand TEXT,
  category TEXT,  -- faucets, lighting, cabinet_hardware, countertops, tile, etc.
  image_url TEXT,
  purchase_url TEXT,
  price_cents BIGINT,
  sku TEXT,
  vendor TEXT,
  finish TEXT,
  dimensions TEXT,
  notes TEXT,
  is_global BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE project_product_selection (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES product(id),
  room TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  status TEXT DEFAULT 'selected' CHECK (status IN (
    'selected', 'approved', 'ordered', 'received', 'installed'
  )),
  order_date DATE,
  tracking_number TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### QuickBooks Integration

```sql
CREATE TABLE qb_connection (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  realm_id TEXT NOT NULL,  -- QBO company ID
  access_token TEXT NOT NULL,  -- encrypted at rest
  refresh_token TEXT NOT NULL, -- encrypted at rest
  token_expires_at TIMESTAMPTZ NOT NULL,
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'active' CHECK (sync_status IN (
    'active', 'error', 'disconnected', 'pending_reauth'
  )),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id)  -- one QB connection per org
);

CREATE TABLE qb_transaction (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qb_connection_id UUID NOT NULL REFERENCES qb_connection(id) ON DELETE CASCADE,
  qb_entity_type TEXT NOT NULL,  -- Purchase, Bill, BillPayment, Invoice
  qb_entity_id TEXT NOT NULL,    -- QBO's internal ID
  qb_txn_date DATE,
  qb_vendor_name TEXT,
  qb_class_name TEXT,     -- project tag in QBO
  qb_account_name TEXT,   -- expense account name
  qb_amount_cents BIGINT,
  qb_memo TEXT,
  qb_last_updated TIMESTAMPTZ,

  -- Mapping to dashboard entities
  mapped_project_id UUID REFERENCES project(id) ON DELETE SET NULL,
  mapped_budget_category_id UUID REFERENCES budget_category(id) ON DELETE SET NULL,
  mapping_status TEXT DEFAULT 'needs_review' CHECK (mapping_status IN (
    'auto_matched', 'user_confirmed', 'needs_review', 'ignored', 'duplicate'
  )),
  linked_expense_id UUID REFERENCES project_expense(id) ON DELETE SET NULL,

  synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(qb_connection_id, qb_entity_type, qb_entity_id)
);

CREATE TABLE qb_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qb_connection_id UUID NOT NULL REFERENCES qb_connection(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  txns_fetched INTEGER DEFAULT 0,
  txns_new INTEGER DEFAULT 0,
  txns_updated INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]',
  status TEXT DEFAULT 'running' CHECK (status IN (
    'running', 'success', 'partial', 'failed'
  ))
);
```

### Budget Templates

```sql
CREATE TABLE budget_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  scope_tier TEXT CHECK (scope_tier IN ('cosmetic', 'heavy', 'gut', 'custom')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE budget_template_line (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES budget_template(id) ON DELETE CASCADE,
  budget_category_id UUID NOT NULL REFERENCES budget_category(id),
  default_amount_cents BIGINT,
  per_sqft_rate_cents BIGINT,  -- alternative: calculate from sqft
  sort_order INTEGER DEFAULT 0
);
```

---

## Row-Level Security Policies

All tables use organization-based RLS. Users can only see data belonging to their organization.

### Pattern (apply to every table with organization_id)
```sql
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own org data"
  ON <table> FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_member
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users insert own org data"
  ON <table> FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_member
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users update own org data"
  ON <table> FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_member
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users delete own org data"
  ON <table> FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_member
      WHERE user_id = auth.uid()
    )
  );
```

### Tables without direct org_id
For tables like `project_expense`, `project_milestone`, etc. that reference `project` instead of `organization` directly, use a join-based policy:

```sql
CREATE POLICY "Users see own org expenses"
  ON project_expense FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM project p
      JOIN organization_member om ON om.organization_id = p.organization_id
      WHERE om.user_id = auth.uid()
    )
  );
```

### Role-Based Access
The `designer` role should have limited write access:
- CAN: create/edit design_board, product, project_product_selection
- CANNOT: edit deal_analysis, project financials, project_budget

Implement via checking `role` in the policy WHERE clause.

---

## Views

### Dashboard Summary View
```sql
CREATE OR REPLACE VIEW project_summary AS
SELECT
  p.id,
  p.name,
  p.pipeline_stage,
  p.organization_id,
  p.actual_purchase_price_cents,
  da.arv_cents,
  COALESCE(SUM(pb.estimated_cents), 0) AS total_budget_cents,
  COALESCE(SUM(pe.amount_cents), 0) AS total_spent_cents,
  COALESCE(SUM(pb.estimated_cents), 0) - COALESCE(SUM(pe.amount_cents), 0) AS budget_variance_cents
FROM project p
LEFT JOIN deal_analysis da ON da.id = p.deal_analysis_id
LEFT JOIN project_budget pb ON pb.project_id = p.id
LEFT JOIN project_expense pe ON pe.project_id = p.id
GROUP BY p.id, p.name, p.pipeline_stage, p.organization_id,
         p.actual_purchase_price_cents, da.arv_cents;
```

---

## Indexes

```sql
-- Most common query patterns
CREATE INDEX idx_property_org ON property(organization_id);
CREATE INDEX idx_project_org ON project(organization_id);
CREATE INDEX idx_project_stage ON project(pipeline_stage);
CREATE INDEX idx_project_property ON project(property_id);
CREATE INDEX idx_deal_analysis_property ON deal_analysis(property_id);
CREATE INDEX idx_project_expense_project ON project_expense(project_id);
CREATE INDEX idx_project_expense_date ON project_expense(expense_date);
CREATE INDEX idx_project_expense_category ON project_expense(budget_category_id);
CREATE INDEX idx_qb_transaction_mapping ON qb_transaction(mapping_status);
CREATE INDEX idx_qb_transaction_project ON qb_transaction(mapped_project_id);
CREATE INDEX idx_project_photo_project ON project_photo(project_id);
CREATE INDEX idx_design_board_project ON design_board(project_id);
CREATE INDEX idx_product_org ON product(organization_id);
CREATE INDEX idx_project_budget_project ON project_budget(project_id);
CREATE INDEX idx_org_member_user ON organization_member(user_id);
```

-- Operational core schema: properties, deals, projects, budgets, expenses, view.
-- Built up-front (per plan) so Modules 2-5 ship UI against tables that already
-- have persisted ROI fields, holding-cost breakdown, auto-contingency, and the
-- project_financials view — avoiding retrofit migrations later.

-- ─────────────────────────────────────────────────────────────────────────
-- Properties
-- ─────────────────────────────────────────────────────────────────────────
create table public.property (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organization(id) on delete cascade,
  address_line1 text not null,
  address_line2 text,
  city text not null,
  state text not null,
  zip text not null,
  county text,
  sqft integer,
  bedrooms numeric(3,1),
  bathrooms numeric(3,1),
  lot_size_sqft integer,
  year_built integer,
  property_type text default 'sfr' check (property_type in ('sfr','duplex','triplex','quadplex','townhome','condo')),
  source text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_property_org on public.property(organization_id);
create trigger trg_property_updated_at before update on public.property
  for each row execute function public.touch_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- Deal analysis (Module 2 base) — persisted ROI fields + holding breakdown.
-- ─────────────────────────────────────────────────────────────────────────
create table public.deal_analysis (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.property(id) on delete cascade,
  analysis_type text not null default 'flip' check (analysis_type in ('flip', 'brrrr')),

  arv_cents bigint not null,
  purchase_price_cents bigint not null,
  rehab_estimate_cents bigint not null,

  arv_percentage numeric(5,2) not null default 70.00,

  financing_type text default 'hard_money' check (financing_type in ('cash','hard_money','conventional','private_money')),
  loan_amount_cents bigint,
  interest_rate numeric(5,2),
  loan_term_months integer,
  origination_points numeric(4,2),
  other_loan_fees_cents bigint default 0,

  buying_closing_costs_cents bigint default 0,
  selling_closing_costs_cents bigint default 0,
  holding_period_months numeric(4,1),

  -- Holding-cost breakdown (per domain spec)
  holding_taxes_cents bigint default 0,
  holding_insurance_cents bigint default 0,
  holding_utilities_cents bigint default 0,
  holding_interest_cents bigint default 0,
  holding_hoa_cents bigint default 0,
  monthly_holding_cost_cents bigint generated always as (
    coalesce(holding_taxes_cents,0)
    + coalesce(holding_insurance_cents,0)
    + coalesce(holding_utilities_cents,0)
    + coalesce(holding_interest_cents,0)
    + coalesce(holding_hoa_cents,0)
  ) stored,

  buy_agent_commission_pct numeric(4,2) default 0,
  sell_agent_commission_pct numeric(4,2) default 5.50,

  -- BRRRR
  monthly_rent_cents bigint,
  vacancy_rate_pct numeric(4,2),
  property_mgmt_fee_pct numeric(4,2),
  monthly_maintenance_cents bigint,
  refinance_ltv_pct numeric(5,2),
  refinance_interest_rate numeric(5,2),
  refinance_term_years integer,

  -- Persisted outputs (computed by trigger from inputs above)
  net_profit_cents bigint,
  roi_pct numeric(7,2),
  annualized_roi_pct numeric(7,2),

  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_deal_analysis_property on public.deal_analysis(property_id);
create trigger trg_deal_analysis_updated_at before update on public.deal_analysis
  for each row execute function public.touch_updated_at();

-- Compute net_profit / ROI / annualized ROI on insert/update.
-- Deliberately conservative: if essential inputs are missing we leave outputs null.
create or replace function public.compute_deal_metrics()
returns trigger language plpgsql as $$
declare
  total_holding_cents bigint;
  loan_origination_cents bigint;
  total_costs_cents bigint;
  cash_invested_cents bigint;
  days_held numeric;
begin
  total_holding_cents := coalesce(new.monthly_holding_cost_cents, 0)
                       * coalesce(new.holding_period_months, 0);

  loan_origination_cents := coalesce(round(coalesce(new.loan_amount_cents,0) * coalesce(new.origination_points,0) / 100.0), 0)
                          + coalesce(new.other_loan_fees_cents, 0);

  total_costs_cents := new.purchase_price_cents
                     + coalesce(new.buying_closing_costs_cents,0)
                     + new.rehab_estimate_cents
                     + total_holding_cents
                     + coalesce(new.selling_closing_costs_cents,0)
                     + loan_origination_cents
                     + coalesce(round(new.arv_cents * coalesce(new.sell_agent_commission_pct,0) / 100.0), 0)
                     + coalesce(round(new.purchase_price_cents * coalesce(new.buy_agent_commission_pct,0) / 100.0), 0);

  new.net_profit_cents := new.arv_cents - total_costs_cents;

  -- Cash invested approximation: total costs minus loan amount.
  cash_invested_cents := greatest(total_costs_cents - coalesce(new.loan_amount_cents, 0), 1);

  new.roi_pct := round((new.net_profit_cents::numeric / cash_invested_cents) * 100, 2);

  -- Annualized ROI uses holding period in days (months * 30.44).
  days_held := coalesce(new.holding_period_months,0) * 30.44;
  if days_held > 0 then
    new.annualized_roi_pct := round(new.roi_pct * (365.0 / days_held), 2);
  else
    new.annualized_roi_pct := null;
  end if;

  return new;
end;
$$;

create trigger trg_deal_analysis_compute
  before insert or update on public.deal_analysis
  for each row execute function public.compute_deal_metrics();

-- Comparable sales linked to a deal analysis
create table public.comp (
  id uuid primary key default gen_random_uuid(),
  deal_analysis_id uuid not null references public.deal_analysis(id) on delete cascade,
  address text not null,
  sale_price_cents bigint not null,
  sale_date date,
  sqft integer,
  bedrooms numeric(3,1),
  bathrooms numeric(3,1),
  lot_size_sqft integer,
  year_built integer,
  distance_miles numeric(5,2),
  days_on_market integer,
  included_in_arv boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);
create index idx_comp_deal on public.comp(deal_analysis_id);

-- ─────────────────────────────────────────────────────────────────────────
-- Contractors (Module 3 base)
-- ─────────────────────────────────────────────────────────────────────────
create table public.contractor (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organization(id) on delete cascade,
  name text not null,
  company text,
  trade text,
  phone text,
  email text,
  license_number text,
  insurance_expiry date,
  rating integer check (rating between 1 and 5),
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_contractor_org on public.contractor(organization_id);
create trigger trg_contractor_updated_at before update on public.contractor
  for each row execute function public.touch_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- Budget categories (seeded, system rows are org-agnostic)
-- ─────────────────────────────────────────────────────────────────────────
create table public.budget_category (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organization(id) on delete cascade,
  name text not null,
  parent_id uuid references public.budget_category(id) on delete set null,
  group_name text check (group_name in ('exterior','interior','mechanical','soft_costs','contingency')),
  sort_order integer default 0,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_budget_cat_org on public.budget_category(organization_id);

-- Insert one universal contingency category (used by the auto-contingency trigger)
insert into public.budget_category (id, organization_id, name, group_name, sort_order, is_default)
values ('00000000-0000-0000-0000-000000000001', null, 'Contingency', 'contingency', 9999, true)
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────────────────
-- Projects (Module 3) — with auto-contingency trigger
-- ─────────────────────────────────────────────────────────────────────────
create table public.project (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organization(id) on delete cascade,
  property_id uuid not null references public.property(id),
  deal_analysis_id uuid references public.deal_analysis(id),
  name text not null,
  pipeline_stage text not null default 'lead' check (pipeline_stage in (
    'lead','analyzing','offer_made','under_contract',
    'purchased','in_rehab','punch_list','listed',
    'under_contract_sale','sold','portfolio'
  )),
  stage_changed_at timestamptz not null default now(),
  offer_date date,
  contract_date date,
  purchase_date date,
  rehab_start_date date,
  rehab_end_date date,
  rehab_actual_end date,
  listing_date date,
  sale_date date,
  actual_purchase_price_cents bigint,
  actual_sale_price_cents bigint,
  actual_buyer_closing_cents bigint,
  actual_seller_closing_cents bigint,
  actual_agent_commission_cents bigint,
  loan_payoff_cents bigint,
  contingency_pct numeric(4,2) not null default 10.00,
  status text not null default 'active' check (status in ('active','completed','cancelled')),
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_project_org on public.project(organization_id);
create index idx_project_stage on public.project(pipeline_stage);
create index idx_project_property on public.project(property_id);
create trigger trg_project_updated_at before update on public.project
  for each row execute function public.touch_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- Budget plan + expenses
-- ─────────────────────────────────────────────────────────────────────────
create table public.project_budget (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project(id) on delete cascade,
  budget_category_id uuid not null references public.budget_category(id),
  estimated_cents bigint not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, budget_category_id)
);
create index idx_project_budget_project on public.project_budget(project_id);
create trigger trg_project_budget_updated_at before update on public.project_budget
  for each row execute function public.touch_updated_at();

create table public.project_expense (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project(id) on delete cascade,
  budget_category_id uuid references public.budget_category(id),
  amount_cents bigint not null,
  expense_date date not null,
  vendor_name text,
  description text,
  receipt_url text,
  payment_method text check (payment_method in ('cash','check','credit_card','debit_card','lender_draw','transfer')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_project_expense_project on public.project_expense(project_id);
create index idx_project_expense_date on public.project_expense(expense_date);
create index idx_project_expense_category on public.project_expense(budget_category_id);
create trigger trg_project_expense_updated_at before update on public.project_expense
  for each row execute function public.touch_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- Auto-contingency: when a project is inserted, seed a project_budget row of
-- category "Contingency" sized at the org's default contingency %.
-- (Estimated_cents = 0 initially; consumer code recomputes when budget lines
-- are added, but the line is guaranteed to exist.)
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.seed_project_contingency()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.project_budget (project_id, budget_category_id, estimated_cents, notes)
  values (new.id, '00000000-0000-0000-0000-000000000001', 0, 'Auto-seeded contingency line')
  on conflict (project_id, budget_category_id) do nothing;
  return new;
end;
$$;

create trigger trg_project_after_insert
  after insert on public.project
  for each row execute function public.seed_project_contingency();

-- ─────────────────────────────────────────────────────────────────────────
-- View: project_financials — feeds the Dashboard module without N+1.
-- ─────────────────────────────────────────────────────────────────────────
-- security_invoker = on ensures RLS policies on the underlying tables are
-- evaluated under the calling user, not the view's definer.
create or replace view public.project_financials
with (security_invoker = on)
as
select
  p.id,
  p.organization_id,
  p.name,
  p.pipeline_stage,
  p.actual_purchase_price_cents,
  da.arv_cents,
  da.net_profit_cents as projected_net_profit_cents,
  da.roi_pct as projected_roi_pct,
  coalesce(sum(pb.estimated_cents), 0) as total_budget_cents,
  coalesce(sum(pe.amount_cents), 0) as total_spent_cents,
  coalesce(sum(pb.estimated_cents), 0) - coalesce(sum(pe.amount_cents), 0) as budget_variance_cents,
  case
    when coalesce(sum(pb.estimated_cents), 0) = 0 then 0
    else round((coalesce(sum(pe.amount_cents), 0)::numeric
                / nullif(sum(pb.estimated_cents), 0)) * 100, 2)
  end as percent_spent
from public.project p
left join public.deal_analysis da on da.id = p.deal_analysis_id
left join public.project_budget pb on pb.project_id = p.id
left join public.project_expense pe on pe.project_id = p.id
group by p.id, p.organization_id, p.name, p.pipeline_stage,
         p.actual_purchase_price_cents, da.arv_cents, da.net_profit_cents, da.roi_pct;

-- ─────────────────────────────────────────────────────────────────────────
-- RLS: every operational table is org-scoped via membership.
-- Designer role: read-only on financial tables (deal_analysis, comp,
-- project_budget, project_expense, contractor, project_financials).
-- ─────────────────────────────────────────────────────────────────────────
alter table public.property enable row level security;
alter table public.deal_analysis enable row level security;
alter table public.comp enable row level security;
alter table public.contractor enable row level security;
alter table public.budget_category enable row level security;
alter table public.project enable row level security;
alter table public.project_budget enable row level security;
alter table public.project_expense enable row level security;

-- Helper: user role within a given organization (returns text or null).
create or replace function public.user_role_in_org(org uuid)
returns text language sql stable security definer set search_path = public as $$
  select role from public.organization_member where user_id = auth.uid() and organization_id = org limit 1
$$;

-- property
create policy property_select on public.property
  for select using (organization_id in (select public.user_organization_ids()));
create policy property_write on public.property
  for all using (
    organization_id in (select public.user_organization_ids())
    and public.user_role_in_org(organization_id) in ('owner','admin','member')
  ) with check (
    organization_id in (select public.user_organization_ids())
    and public.user_role_in_org(organization_id) in ('owner','admin','member')
  );

-- deal_analysis (read-only for designers)
create policy deal_analysis_select on public.deal_analysis
  for select using (
    property_id in (select id from public.property where organization_id in (select public.user_organization_ids()))
  );
create policy deal_analysis_write on public.deal_analysis
  for all using (
    exists (
      select 1 from public.property pr
      where pr.id = property_id
        and pr.organization_id in (select public.user_organization_ids())
        and public.user_role_in_org(pr.organization_id) in ('owner','admin','member')
    )
  ) with check (
    exists (
      select 1 from public.property pr
      where pr.id = property_id
        and pr.organization_id in (select public.user_organization_ids())
        and public.user_role_in_org(pr.organization_id) in ('owner','admin','member')
    )
  );

-- comp follows deal_analysis
create policy comp_select on public.comp
  for select using (
    deal_analysis_id in (
      select da.id from public.deal_analysis da
      join public.property pr on pr.id = da.property_id
      where pr.organization_id in (select public.user_organization_ids())
    )
  );
create policy comp_write on public.comp
  for all using (
    exists (
      select 1 from public.deal_analysis da
      join public.property pr on pr.id = da.property_id
      where da.id = deal_analysis_id
        and pr.organization_id in (select public.user_organization_ids())
        and public.user_role_in_org(pr.organization_id) in ('owner','admin','member')
    )
  ) with check (
    exists (
      select 1 from public.deal_analysis da
      join public.property pr on pr.id = da.property_id
      where da.id = deal_analysis_id
        and pr.organization_id in (select public.user_organization_ids())
        and public.user_role_in_org(pr.organization_id) in ('owner','admin','member')
    )
  );

-- contractor (designers cannot write)
create policy contractor_select on public.contractor
  for select using (organization_id in (select public.user_organization_ids()));
create policy contractor_write on public.contractor
  for all using (
    organization_id in (select public.user_organization_ids())
    and public.user_role_in_org(organization_id) in ('owner','admin','member')
  ) with check (
    organization_id in (select public.user_organization_ids())
    and public.user_role_in_org(organization_id) in ('owner','admin','member')
  );

-- budget_category: org rows visible to org members; system (NULL org) visible to all signed-in users.
create policy budget_category_select on public.budget_category
  for select using (
    organization_id is null
    or organization_id in (select public.user_organization_ids())
  );
create policy budget_category_write on public.budget_category
  for all using (
    organization_id in (select public.user_organization_ids())
    and public.user_role_in_org(organization_id) in ('owner','admin')
  ) with check (
    organization_id in (select public.user_organization_ids())
    and public.user_role_in_org(organization_id) in ('owner','admin')
  );

-- project
create policy project_select on public.project
  for select using (organization_id in (select public.user_organization_ids()));
create policy project_write on public.project
  for all using (
    organization_id in (select public.user_organization_ids())
    and public.user_role_in_org(organization_id) in ('owner','admin','member')
  ) with check (
    organization_id in (select public.user_organization_ids())
    and public.user_role_in_org(organization_id) in ('owner','admin','member')
  );

-- project_budget (designers read-only)
create policy project_budget_select on public.project_budget
  for select using (
    project_id in (select id from public.project where organization_id in (select public.user_organization_ids()))
  );
create policy project_budget_write on public.project_budget
  for all using (
    exists (
      select 1 from public.project p
      where p.id = project_id
        and p.organization_id in (select public.user_organization_ids())
        and public.user_role_in_org(p.organization_id) in ('owner','admin','member')
    )
  ) with check (
    exists (
      select 1 from public.project p
      where p.id = project_id
        and p.organization_id in (select public.user_organization_ids())
        and public.user_role_in_org(p.organization_id) in ('owner','admin','member')
    )
  );

-- project_expense (designers read-only)
create policy project_expense_select on public.project_expense
  for select using (
    project_id in (select id from public.project where organization_id in (select public.user_organization_ids()))
  );
create policy project_expense_write on public.project_expense
  for all using (
    exists (
      select 1 from public.project p
      where p.id = project_id
        and p.organization_id in (select public.user_organization_ids())
        and public.user_role_in_org(p.organization_id) in ('owner','admin','member')
    )
  ) with check (
    exists (
      select 1 from public.project p
      where p.id = project_id
        and p.organization_id in (select public.user_organization_ids())
        and public.user_role_in_org(p.organization_id) in ('owner','admin','member')
    )
  );

-- The view inherits the underlying table policies, no separate RLS needed.

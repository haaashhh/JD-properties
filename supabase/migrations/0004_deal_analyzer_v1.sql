-- Module 2 (Deal Analyzer) schema rebase.
-- Implements the v1.0 spec, with four explicit deviations approved by the
-- architect:
--   1. Holding costs stay BROKEN-OUT (taxes/insurance/utilities/interest/HOA
--      + a new `holding_other_cents` catch-all + generated total). Spec's
--      single-column collapse breaks QuickBooks expense-account
--      reconciliation in Module 6.
--   2. Documents move to a GENERIC polymorphic `document` table (not a
--      per-deal table). One envelope state machine for DocuSign across
--      every entity type.
--   3. ROI uses a `cash_invested_cents` override column with a documented
--      default formula; ROI returns NULL when the denominator is zero
--      instead of the live trigger's 1-cent hack.
--   4. `organization_id` is denormalized onto every operational table for
--      single-hop RLS instead of 3-hop joins.
--
-- All deal_analysis math is now computed-on-read via the new
-- `deal_analysis_computed` view. The persisted ROI columns and
-- `compute_deal_metrics` trigger are dropped (the trigger had a real bug:
-- `greatest(total - loan, 1)` produced garbage ROI on cash deals).

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Tear down dependents that reference soon-to-drop columns/triggers
-- ─────────────────────────────────────────────────────────────────────────
drop view if exists public.project_financials;
drop trigger if exists trg_deal_analysis_compute on public.deal_analysis;
drop function if exists public.compute_deal_metrics();

-- The generated `monthly_holding_cost_cents` will be recreated below to
-- include `holding_other_cents`.
alter table public.deal_analysis drop column if exists monthly_holding_cost_cents;

-- Drop persisted compute outputs.
alter table public.deal_analysis drop column if exists net_profit_cents;
alter table public.deal_analysis drop column if exists roi_pct;
alter table public.deal_analysis drop column if exists annualized_roi_pct;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. property — close spec gaps + integration anchors
-- ─────────────────────────────────────────────────────────────────────────
alter table public.property
  add column mls_number text,
  add column thumbnail_url text,
  add column latitude numeric(10,7),
  add column longitude numeric(10,7),
  add column external_id text,
  add column source_provider text,
  add column last_synced_at timestamptz,
  -- active_deal_analysis_id added below, after deal_analysis is in its final shape.
  add column dedupe_key text generated always as (
    lower(regexp_replace(address_line1 || '|' || zip, '\s+', '', 'g'))
  ) stored;

create unique index idx_property_org_dedupe
  on public.property(organization_id, dedupe_key)
  where dedupe_key is not null;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. deal_analysis — spec adds, denormalized org_id, holding-cost catch-all
-- ─────────────────────────────────────────────────────────────────────────
alter table public.deal_analysis
  add column organization_id uuid references public.organization(id) on delete cascade,
  add column name text,
  add column loan_to_value_pct numeric(5,2),
  add column loan_basis text default 'amount' check (loan_basis in ('amount', 'ltv')),
  add column staging_costs_cents bigint not null default 0,
  add column holding_other_cents bigint not null default 0,
  add column is_archived boolean not null default false,
  add column archived_at timestamptz,
  add column archived_by uuid references auth.users(id) on delete set null,
  add column is_active boolean not null default true,
  add column cash_invested_cents bigint;

-- Re-add `monthly_holding_cost_cents` as a generated total that includes
-- the new `holding_other_cents` bucket.
alter table public.deal_analysis
  add column monthly_holding_cost_cents bigint generated always as (
    coalesce(holding_taxes_cents, 0)
    + coalesce(holding_insurance_cents, 0)
    + coalesce(holding_utilities_cents, 0)
    + coalesce(holding_interest_cents, 0)
    + coalesce(holding_hoa_cents, 0)
    + coalesce(holding_other_cents, 0)
  ) stored;

-- Backfill organization_id from the parent property (no rows yet, but be safe).
update public.deal_analysis da
set organization_id = pr.organization_id
from public.property pr
where da.property_id = pr.id and da.organization_id is null;

alter table public.deal_analysis
  alter column organization_id set not null;

-- Default name to a stable, sortable label if the user doesn't supply one.
update public.deal_analysis
set name = 'Analysis ' || to_char(created_at, 'YYYY-MM-DD')
where name is null;

alter table public.deal_analysis
  alter column name set not null,
  alter column name set default 'Analysis',
  -- XOR: exactly one of (loan_amount_cents, loan_to_value_pct) is set.
  -- Cash deals leave both null and pick `loan_basis` regardless.
  add constraint deal_analysis_loan_xor check (
    financing_type = 'cash'
    or (loan_amount_cents is null) <> (loan_to_value_pct is null)
  ),
  -- Archive coherence: if archived, archived_at must be set.
  add constraint deal_analysis_archive_coherent check (
    is_archived = false or archived_at is not null
  );

-- One named scenario per property (case-insensitive).
create unique index idx_deal_analysis_property_name
  on public.deal_analysis(property_id, lower(name));

-- Auto-populate organization_id from the property when not supplied.
create or replace function public.set_deal_analysis_org()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.organization_id is null then
    select organization_id into new.organization_id
    from public.property where id = new.property_id;
  end if;
  return new;
end;
$$;

create trigger trg_deal_analysis_set_org
  before insert on public.deal_analysis
  for each row execute function public.set_deal_analysis_org();

-- Now that deal_analysis exists in its final shape, link the property's
-- "active scenario" pointer.
alter table public.property
  add column active_deal_analysis_id uuid
    references public.deal_analysis(id) on delete set null;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. comp — spec adds + denormalized org_id
-- ─────────────────────────────────────────────────────────────────────────
alter table public.comp
  add column organization_id uuid references public.organization(id) on delete cascade,
  add column condition text check (condition in ('renovated', 'good', 'fair', 'distressed')),
  add column adjustment_cents bigint not null default 0,
  add column adjustment_notes text,
  add column source_url text,
  add column external_id text,
  add column source_provider text,
  add column last_synced_at timestamptz,
  -- A non-zero adjustment without a reason is a future audit headache.
  add constraint comp_adjustment_requires_notes check (
    adjustment_cents = 0 or (adjustment_notes is not null and length(trim(adjustment_notes)) > 0)
  );

update public.comp c
set organization_id = da.organization_id
from public.deal_analysis da
where c.deal_analysis_id = da.id and c.organization_id is null;

alter table public.comp
  alter column organization_id set not null;

create or replace function public.set_comp_org()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.organization_id is null then
    select organization_id into new.organization_id
    from public.deal_analysis where id = new.deal_analysis_id;
  end if;
  return new;
end;
$$;

create trigger trg_comp_set_org
  before insert on public.comp
  for each row execute function public.set_comp_org();

-- ─────────────────────────────────────────────────────────────────────────
-- 5. project — QB lineage anchors
-- ─────────────────────────────────────────────────────────────────────────
alter table public.project
  add column qb_class_name text,
  add column qb_customer_id text;

-- A QB Class corresponds to exactly one project per org. Partial unique so
-- pre-QB-sync projects (qb_class_name null) don't collide.
create unique index idx_project_org_qb_class
  on public.project(organization_id, qb_class_name)
  where qb_class_name is not null;

-- ─────────────────────────────────────────────────────────────────────────
-- 6. contractor — TCPA / CAN-SPAM compliance hedge
-- ─────────────────────────────────────────────────────────────────────────
alter table public.contractor
  add column preferred_contact text not null default 'email'
    check (preferred_contact in ('sms', 'email', 'phone', 'none')),
  add column do_not_contact boolean not null default false;

-- ─────────────────────────────────────────────────────────────────────────
-- 7. document — generic polymorphic document store
--    Supersedes the spec's per-deal `deal_analysis_document` table.
-- ─────────────────────────────────────────────────────────────────────────
create table public.document (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organization(id) on delete cascade,

  entity_type text not null check (entity_type in (
    'deal_analysis', 'project', 'contractor', 'property'
  )),
  entity_id uuid not null,

  document_type text not null check (document_type in (
    'photo', 'inspection_report', 'scope_of_work', 'appraisal',
    'contract', 'draw_approval', 'sale_agreement', 'addendum',
    'invoice', 'receipt', 'other'
  )),

  file_name text not null,
  storage_path text not null, -- e.g. {org_id}/{entity_type}/{entity_id}/{uuid}.{ext}
  file_url text,              -- optional public URL, may be null for private buckets
  file_type text,             -- MIME type
  file_size_bytes bigint,

  -- E-signature lifecycle (DocuSign / Dropbox Sign). Null until envelope sent.
  external_provider text check (external_provider in ('docusign', 'dropbox_sign')),
  external_envelope_id text,
  signature_status text not null default 'none' check (signature_status in (
    'none', 'draft', 'sent', 'delivered', 'signed', 'declined', 'voided'
  )),
  signed_at timestamptz,
  signers jsonb,
  signing_url text,

  notes text,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_document_updated_at before update on public.document
  for each row execute function public.touch_updated_at();

create index idx_document_org on public.document(organization_id);
create index idx_document_entity on public.document(entity_type, entity_id);
create unique index idx_document_envelope
  on public.document(external_provider, external_envelope_id)
  where external_envelope_id is not null;

-- ─────────────────────────────────────────────────────────────────────────
-- 8. deal_analysis_revision — audit trail (JSONB snapshot on UPDATE)
-- ─────────────────────────────────────────────────────────────────────────
create table public.deal_analysis_revision (
  id uuid primary key default gen_random_uuid(),
  deal_analysis_id uuid not null references public.deal_analysis(id) on delete cascade,
  organization_id uuid not null references public.organization(id) on delete cascade,
  snapshot jsonb not null,
  edited_by uuid references auth.users(id) on delete set null,
  edited_at timestamptz not null default now()
);

create index idx_deal_revision_deal on public.deal_analysis_revision(deal_analysis_id, edited_at desc);
create index idx_deal_revision_org on public.deal_analysis_revision(organization_id);

create or replace function public.snapshot_deal_analysis()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.deal_analysis_revision (deal_analysis_id, organization_id, snapshot, edited_by)
  values (old.id, old.organization_id, to_jsonb(old), auth.uid());
  return new;
end;
$$;

create trigger trg_deal_analysis_audit
  after update on public.deal_analysis
  for each row execute function public.snapshot_deal_analysis();

-- ─────────────────────────────────────────────────────────────────────────
-- 9. Index additions per spec §6
-- ─────────────────────────────────────────────────────────────────────────
create index idx_deal_analysis_org on public.deal_analysis(organization_id);
create index idx_deal_analysis_type on public.deal_analysis(analysis_type);
create index idx_deal_analysis_created on public.deal_analysis(created_at desc);
create index idx_deal_analysis_active
  on public.deal_analysis(property_id) where is_archived = false;

create index idx_comp_org on public.comp(organization_id);
create index idx_comp_included
  on public.comp(deal_analysis_id, included_in_arv);

-- ─────────────────────────────────────────────────────────────────────────
-- 10. deal_analysis_computed — every metric, computed on read
-- ─────────────────────────────────────────────────────────────────────────
create or replace view public.deal_analysis_computed
with (security_invoker = on)
as
with comp_agg as (
  select
    c.deal_analysis_id,
    avg(c.sale_price_cents + coalesce(c.adjustment_cents, 0))::bigint as suggested_arv_cents,
    count(*)::int as comp_count
  from public.comp c
  where c.included_in_arv = true
  group by c.deal_analysis_id
),
base as (
  select
    da.*,

    -- Loan amount (back-computed from LTV when loan_basis = 'ltv').
    case
      when da.loan_basis = 'ltv' and da.loan_to_value_pct is not null
        then (da.purchase_price_cents * da.loan_to_value_pct / 100)::bigint
      else coalesce(da.loan_amount_cents, 0)
    end as effective_loan_cents,

    -- Maximum Purchase Price (shorthand: ARV × % - rehab).
    ((da.arv_cents * da.arv_percentage / 100)::bigint - da.rehab_estimate_cents) as mpp_cents,

    -- Loan origination fee (loan × points / 100).
    coalesce(((case
      when da.loan_basis = 'ltv' and da.loan_to_value_pct is not null
        then (da.purchase_price_cents * da.loan_to_value_pct / 100)::bigint
      else coalesce(da.loan_amount_cents, 0)
    end) * da.origination_points / 100)::bigint, 0) as origination_fee_cents,

    -- Total interest over the holding period (simple, per spec).
    coalesce(((case
      when da.loan_basis = 'ltv' and da.loan_to_value_pct is not null
        then (da.purchase_price_cents * da.loan_to_value_pct / 100)::bigint
      else coalesce(da.loan_amount_cents, 0)
    end) * da.interest_rate / 100 / 12 * da.holding_period_months)::bigint, 0) as total_interest_cents,

    -- Total holding (monthly × months).
    coalesce(da.monthly_holding_cost_cents * da.holding_period_months, 0)::bigint
      as total_holding_cents,

    -- Commissions.
    coalesce((da.arv_cents * da.sell_agent_commission_pct / 100)::bigint, 0)
      as sell_commission_cents,
    coalesce((da.purchase_price_cents * da.buy_agent_commission_pct / 100)::bigint, 0)
      as buy_commission_cents
  from public.deal_analysis da
)
select
  b.*,

  -- Acquisition: purchase + buying close + origination + other loan + buy commission.
  (b.purchase_price_cents
   + coalesce(b.buying_closing_costs_cents, 0)
   + b.origination_fee_cents
   + coalesce(b.other_loan_fees_cents, 0)
   + b.buy_commission_cents) as total_acquisition_cents,

  -- Selling: closing + sell commission + staging.
  (coalesce(b.selling_closing_costs_cents, 0)
   + b.sell_commission_cents
   + coalesce(b.staging_costs_cents, 0)) as total_selling_cents,

  -- Total project cost.
  (b.purchase_price_cents
   + coalesce(b.buying_closing_costs_cents, 0)
   + b.origination_fee_cents
   + coalesce(b.other_loan_fees_cents, 0)
   + b.buy_commission_cents
   + coalesce(b.rehab_estimate_cents, 0)
   + b.total_holding_cents
   + b.total_interest_cents
   + coalesce(b.selling_closing_costs_cents, 0)
   + b.sell_commission_cents
   + coalesce(b.staging_costs_cents, 0)) as total_project_cost_cents,

  -- Net profit.
  (b.arv_cents - (
    b.purchase_price_cents
    + coalesce(b.buying_closing_costs_cents, 0)
    + b.origination_fee_cents
    + coalesce(b.other_loan_fees_cents, 0)
    + b.buy_commission_cents
    + coalesce(b.rehab_estimate_cents, 0)
    + b.total_holding_cents
    + b.total_interest_cents
    + coalesce(b.selling_closing_costs_cents, 0)
    + b.sell_commission_cents
    + coalesce(b.staging_costs_cents, 0)
  )) as net_profit_cents,

  -- Cash invested: explicit override OR computed default.
  -- Default = total project cost - effective loan amount (down + holding out-of-pocket).
  coalesce(
    b.cash_invested_cents,
    (b.purchase_price_cents
     + coalesce(b.buying_closing_costs_cents, 0)
     + b.origination_fee_cents
     + coalesce(b.other_loan_fees_cents, 0)
     + b.buy_commission_cents
     + coalesce(b.rehab_estimate_cents, 0)
     + b.total_holding_cents
     + b.total_interest_cents
     + coalesce(b.selling_closing_costs_cents, 0)
     + b.sell_commission_cents
     + coalesce(b.staging_costs_cents, 0))
    - b.effective_loan_cents
  ) as effective_cash_invested_cents,

  -- ROI: NULL when denominator is non-positive (cash deal modelling edge case).
  case
    when coalesce(
      b.cash_invested_cents,
      (b.purchase_price_cents
       + coalesce(b.buying_closing_costs_cents, 0)
       + b.origination_fee_cents
       + coalesce(b.other_loan_fees_cents, 0)
       + b.buy_commission_cents
       + coalesce(b.rehab_estimate_cents, 0)
       + b.total_holding_cents
       + b.total_interest_cents
       + coalesce(b.selling_closing_costs_cents, 0)
       + b.sell_commission_cents
       + coalesce(b.staging_costs_cents, 0))
      - b.effective_loan_cents
    ) <= 0 then null
    else round(
      (b.arv_cents - (
        b.purchase_price_cents
        + coalesce(b.buying_closing_costs_cents, 0)
        + b.origination_fee_cents
        + coalesce(b.other_loan_fees_cents, 0)
        + b.buy_commission_cents
        + coalesce(b.rehab_estimate_cents, 0)
        + b.total_holding_cents
        + b.total_interest_cents
        + coalesce(b.selling_closing_costs_cents, 0)
        + b.sell_commission_cents
        + coalesce(b.staging_costs_cents, 0)
      ))::numeric
      / nullif(coalesce(
        b.cash_invested_cents,
        (b.purchase_price_cents
         + coalesce(b.buying_closing_costs_cents, 0)
         + b.origination_fee_cents
         + coalesce(b.other_loan_fees_cents, 0)
         + b.buy_commission_cents
         + coalesce(b.rehab_estimate_cents, 0)
         + b.total_holding_cents
         + b.total_interest_cents
         + coalesce(b.selling_closing_costs_cents, 0)
         + b.sell_commission_cents
         + coalesce(b.staging_costs_cents, 0))
        - b.effective_loan_cents
      ), 0)::numeric
      * 100, 2)
  end as roi_pct,

  -- Annualized ROI: ROI × (365 / days_held). Days = months × 30.44.
  case
    when b.holding_period_months is null or b.holding_period_months <= 0 then null
    when coalesce(
      b.cash_invested_cents,
      (b.purchase_price_cents
       + coalesce(b.buying_closing_costs_cents, 0)
       + b.origination_fee_cents
       + coalesce(b.other_loan_fees_cents, 0)
       + b.buy_commission_cents
       + coalesce(b.rehab_estimate_cents, 0)
       + b.total_holding_cents
       + b.total_interest_cents
       + coalesce(b.selling_closing_costs_cents, 0)
       + b.sell_commission_cents
       + coalesce(b.staging_costs_cents, 0))
      - b.effective_loan_cents
    ) <= 0 then null
    else round(
      ((b.arv_cents - (
        b.purchase_price_cents
        + coalesce(b.buying_closing_costs_cents, 0)
        + b.origination_fee_cents
        + coalesce(b.other_loan_fees_cents, 0)
        + b.buy_commission_cents
        + coalesce(b.rehab_estimate_cents, 0)
        + b.total_holding_cents
        + b.total_interest_cents
        + coalesce(b.selling_closing_costs_cents, 0)
        + b.sell_commission_cents
        + coalesce(b.staging_costs_cents, 0)
      ))::numeric
      / nullif(coalesce(
        b.cash_invested_cents,
        (b.purchase_price_cents
         + coalesce(b.buying_closing_costs_cents, 0)
         + b.origination_fee_cents
         + coalesce(b.other_loan_fees_cents, 0)
         + b.buy_commission_cents
         + coalesce(b.rehab_estimate_cents, 0)
         + b.total_holding_cents
         + b.total_interest_cents
         + coalesce(b.selling_closing_costs_cents, 0)
         + b.sell_commission_cents
         + coalesce(b.staging_costs_cents, 0))
        - b.effective_loan_cents
      ), 0)::numeric
      * 100
      * 365.0 / (b.holding_period_months * 30.44))::numeric, 2)
  end as annualized_roi_pct,

  -- Profit margin.
  case
    when b.arv_cents = 0 then null
    else round(
      ((b.arv_cents - (
        b.purchase_price_cents
        + coalesce(b.buying_closing_costs_cents, 0)
        + b.origination_fee_cents
        + coalesce(b.other_loan_fees_cents, 0)
        + b.buy_commission_cents
        + coalesce(b.rehab_estimate_cents, 0)
        + b.total_holding_cents
        + b.total_interest_cents
        + coalesce(b.selling_closing_costs_cents, 0)
        + b.sell_commission_cents
        + coalesce(b.staging_costs_cents, 0)
      ))::numeric
      / b.arv_cents * 100), 2)
  end as profit_margin_pct,

  -- BRRRR specifics (NULL outside brrrr analyses).
  case when b.analysis_type = 'brrrr' and b.refinance_ltv_pct is not null
    then (b.arv_cents * b.refinance_ltv_pct / 100)::bigint
    else null
  end as refi_loan_amount_cents,

  case when b.analysis_type = 'brrrr' and b.monthly_rent_cents is not null
    then (b.monthly_rent_cents * (1 - coalesce(b.vacancy_rate_pct, 0) / 100))::bigint
    else null
  end as effective_monthly_rent_cents,

  -- Comp-derived ARV recommendation.
  ca.suggested_arv_cents,
  coalesce(ca.comp_count, 0) as comp_count
from base b
left join comp_agg ca on ca.deal_analysis_id = b.id;

-- ─────────────────────────────────────────────────────────────────────────
-- 11. Recreate project_financials joining the new computed view
-- ─────────────────────────────────────────────────────────────────────────
create or replace view public.project_financials
with (security_invoker = on)
as
select
  p.id,
  p.organization_id,
  p.name,
  p.pipeline_stage,
  p.actual_purchase_price_cents,
  dac.arv_cents,
  dac.net_profit_cents as projected_net_profit_cents,
  dac.roi_pct as projected_roi_pct,
  coalesce(sum(pb.estimated_cents), 0) as total_budget_cents,
  coalesce(sum(pe.amount_cents), 0) as total_spent_cents,
  coalesce(sum(pb.estimated_cents), 0) - coalesce(sum(pe.amount_cents), 0)
    as budget_variance_cents,
  case
    when coalesce(sum(pb.estimated_cents), 0) = 0 then 0
    else round((coalesce(sum(pe.amount_cents), 0)::numeric
                / nullif(sum(pb.estimated_cents), 0)) * 100, 2)
  end as percent_spent
from public.project p
left join public.deal_analysis_computed dac on dac.id = p.deal_analysis_id
left join public.project_budget pb on pb.project_id = p.id
left join public.project_expense pe on pe.project_id = p.id
group by p.id, p.organization_id, p.name, p.pipeline_stage,
         p.actual_purchase_price_cents,
         dac.arv_cents, dac.net_profit_cents, dac.roi_pct;

-- ─────────────────────────────────────────────────────────────────────────
-- 12. RLS — simplify deal_analysis/comp to single-hop org check
-- ─────────────────────────────────────────────────────────────────────────
drop policy if exists deal_analysis_select on public.deal_analysis;
drop policy if exists deal_analysis_write on public.deal_analysis;
create policy deal_analysis_select on public.deal_analysis
  for select using (organization_id in (select public.user_organization_ids()));
create policy deal_analysis_write on public.deal_analysis
  for all using (
    organization_id in (select public.user_organization_ids())
    and public.user_role_in_org(organization_id) in ('owner', 'admin', 'member')
  ) with check (
    organization_id in (select public.user_organization_ids())
    and public.user_role_in_org(organization_id) in ('owner', 'admin', 'member')
  );

drop policy if exists comp_select on public.comp;
drop policy if exists comp_write on public.comp;
create policy comp_select on public.comp
  for select using (organization_id in (select public.user_organization_ids()));
create policy comp_write on public.comp
  for all using (
    organization_id in (select public.user_organization_ids())
    and public.user_role_in_org(organization_id) in ('owner', 'admin', 'member')
  ) with check (
    organization_id in (select public.user_organization_ids())
    and public.user_role_in_org(organization_id) in ('owner', 'admin', 'member')
  );

-- document — org-scoped, designer can read any but only write their own type rows
alter table public.document enable row level security;
create policy document_select on public.document
  for select using (organization_id in (select public.user_organization_ids()));
create policy document_write on public.document
  for all using (
    organization_id in (select public.user_organization_ids())
    and (
      public.user_role_in_org(organization_id) in ('owner', 'admin', 'member')
      or (
        public.user_role_in_org(organization_id) = 'designer'
        and entity_type in ('project', 'property')
      )
    )
  ) with check (
    organization_id in (select public.user_organization_ids())
    and (
      public.user_role_in_org(organization_id) in ('owner', 'admin', 'member')
      or (
        public.user_role_in_org(organization_id) = 'designer'
        and entity_type in ('project', 'property')
      )
    )
  );

-- deal_analysis_revision — read-only for org members (audit log).
alter table public.deal_analysis_revision enable row level security;
create policy deal_revision_select on public.deal_analysis_revision
  for select using (organization_id in (select public.user_organization_ids()));
-- No INSERT/UPDATE/DELETE policies — only the snapshot trigger writes.

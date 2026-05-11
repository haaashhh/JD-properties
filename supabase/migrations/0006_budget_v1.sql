-- Module 4: Budget Tracker.
-- Adds the canonical 25 system budget categories, denormalizes organization_id
-- onto project_budget / project_expense, ships budget_template +
-- budget_template_line tables with 3 system templates (Cosmetic / Heavy /
-- Gut at $15 / $42 / $80 per sqft), schema-preps lender_draw +
-- lender_draw_line for the deferred lender-draws UI, creates the `receipts`
-- storage bucket with org-scoped RLS, and exposes a per-category roll-up
-- view (project_budget_summary) so the page query stays flat.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. System budget categories (24 new; Contingency already exists from 0002).
--    Names match real-estate-flip-ops/budget-categories.md exactly. parent_id
--    stays NULL (two-level hierarchy deferred — flag was lifted by the
--    architect-skill audit). UUIDs are deterministic so future migrations
--    and the seed script can reference them by literal.
-- ─────────────────────────────────────────────────────────────────────────
insert into public.budget_category (id, organization_id, name, group_name, sort_order, is_default) values
  -- Exterior (9)
  ('00000000-0000-0000-0001-000000000001', null, 'Roof',                       'exterior',   100, true),
  ('00000000-0000-0000-0001-000000000002', null, 'Siding / Exterior Walls',    'exterior',   110, true),
  ('00000000-0000-0000-0001-000000000003', null, 'Windows',                    'exterior',   120, true),
  ('00000000-0000-0000-0001-000000000004', null, 'Exterior Doors',             'exterior',   130, true),
  ('00000000-0000-0000-0001-000000000005', null, 'Garage',                     'exterior',   140, true),
  ('00000000-0000-0000-0001-000000000006', null, 'Deck / Patio',               'exterior',   150, true),
  ('00000000-0000-0000-0001-000000000007', null, 'Landscaping',                'exterior',   160, true),
  ('00000000-0000-0000-0001-000000000008', null, 'Driveway / Walkway',         'exterior',   170, true),
  ('00000000-0000-0000-0001-000000000009', null, 'Foundation',                 'exterior',   180, true),

  -- Interior (9; Fireplace, Closets, Stairs / Railings deferred — niche)
  ('00000000-0000-0000-0001-000000000010', null, 'Demo / Cleanup',             'interior',   200, true),
  ('00000000-0000-0000-0001-000000000011', null, 'Framing / Structural',      'interior',   210, true),
  ('00000000-0000-0000-0001-000000000012', null, 'Insulation',                 'interior',   220, true),
  ('00000000-0000-0000-0001-000000000013', null, 'Drywall',                    'interior',   230, true),
  ('00000000-0000-0000-0001-000000000014', null, 'Interior Paint',             'interior',   240, true),
  ('00000000-0000-0000-0001-000000000015', null, 'Flooring',                   'interior',   250, true),
  ('00000000-0000-0000-0001-000000000016', null, 'Kitchen',                    'interior',   260, true),
  ('00000000-0000-0000-0001-000000000017', null, 'Bathrooms',                  'interior',   270, true),
  ('00000000-0000-0000-0001-000000000018', null, 'Interior Doors & Trim',     'interior',   280, true),

  -- Mechanical (3)
  ('00000000-0000-0000-0001-000000000019', null, 'Electrical',                 'mechanical', 300, true),
  ('00000000-0000-0000-0001-000000000020', null, 'Plumbing',                   'mechanical', 310, true),
  ('00000000-0000-0000-0001-000000000021', null, 'HVAC',                       'mechanical', 320, true),

  -- Soft Costs (3 + the existing Contingency)
  ('00000000-0000-0000-0001-000000000022', null, 'Permits',                    'soft_costs', 400, true),
  ('00000000-0000-0000-0001-000000000023', null, 'Architectural / Engineering','soft_costs', 410, true),
  ('00000000-0000-0000-0001-000000000024', null, 'Miscellaneous',              'soft_costs', 420, true)
on conflict (id) do update set
  name = excluded.name,
  group_name = excluded.group_name,
  sort_order = excluded.sort_order,
  is_default = excluded.is_default;

-- Bump the existing Contingency row's sort_order so it lands last in tables.
update public.budget_category
  set sort_order = 9999, group_name = 'contingency'
  where id = '00000000-0000-0000-0000-000000000001';

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Denormalize organization_id onto project_budget + project_expense
--    (matches the 0004/0005 pattern so RLS stays single-hop).
-- ─────────────────────────────────────────────────────────────────────────
alter table public.project_budget
  add column organization_id uuid references public.organization(id) on delete cascade;

update public.project_budget pb
set organization_id = p.organization_id
from public.project p
where pb.project_id = p.id and pb.organization_id is null;

alter table public.project_budget
  alter column organization_id set not null;

create index idx_project_budget_org on public.project_budget(organization_id);

create or replace function public.set_project_budget_org()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.organization_id is null then
    select organization_id into new.organization_id
    from public.project where id = new.project_id;
  end if;
  return new;
end;
$$;

create trigger trg_project_budget_set_org
  before insert on public.project_budget
  for each row execute function public.set_project_budget_org();

alter table public.project_expense
  add column organization_id uuid references public.organization(id) on delete cascade;

update public.project_expense pe
set organization_id = p.organization_id
from public.project p
where pe.project_id = p.id and pe.organization_id is null;

alter table public.project_expense
  alter column organization_id set not null;

create index idx_project_expense_org on public.project_expense(organization_id);

create or replace function public.set_project_expense_org()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.organization_id is null then
    select organization_id into new.organization_id
    from public.project where id = new.project_id;
  end if;
  return new;
end;
$$;

create trigger trg_project_expense_set_org
  before insert on public.project_expense
  for each row execute function public.set_project_expense_org();

-- Simplify RLS to single-hop org check (matches deal_analysis / comp).
drop policy if exists project_budget_select on public.project_budget;
drop policy if exists project_budget_write on public.project_budget;
create policy project_budget_select on public.project_budget
  for select using (organization_id in (select public.user_organization_ids()));
create policy project_budget_write on public.project_budget
  for all using (
    organization_id in (select public.user_organization_ids())
    and public.user_role_in_org(organization_id) in ('owner', 'admin', 'member')
  ) with check (
    organization_id in (select public.user_organization_ids())
    and public.user_role_in_org(organization_id) in ('owner', 'admin', 'member')
  );

drop policy if exists project_expense_select on public.project_expense;
drop policy if exists project_expense_write on public.project_expense;
create policy project_expense_select on public.project_expense
  for select using (organization_id in (select public.user_organization_ids()));
create policy project_expense_write on public.project_expense
  for all using (
    organization_id in (select public.user_organization_ids())
    and public.user_role_in_org(organization_id) in ('owner', 'admin', 'member')
  ) with check (
    organization_id in (select public.user_organization_ids())
    and public.user_role_in_org(organization_id) in ('owner', 'admin', 'member')
  );

-- ─────────────────────────────────────────────────────────────────────────
-- 3. budget_template + budget_template_line
-- ─────────────────────────────────────────────────────────────────────────
create table public.budget_template (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organization(id) on delete cascade,
  name text not null,
  description text,
  scope_tier text check (scope_tier in ('cosmetic', 'heavy', 'gut', 'custom')),
  is_archived boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Unique name per org (case-insensitive). System rows allowed in parallel.
create unique index idx_budget_template_name
  on public.budget_template(organization_id, lower(name));
create index idx_budget_template_org on public.budget_template(organization_id);
create trigger trg_budget_template_updated_at before update on public.budget_template
  for each row execute function public.touch_updated_at();

create table public.budget_template_line (
  id uuid primary key default gen_random_uuid(),
  budget_template_id uuid not null references public.budget_template(id) on delete cascade,
  budget_category_id uuid not null references public.budget_category(id) on delete cascade,
  default_amount_cents bigint not null default 0,
  per_sqft_rate_cents bigint not null default 0,
  sort_order integer not null default 0,
  notes text,
  -- At least one of the two amounts must drive the line.
  constraint budget_template_line_amount_check
    check (default_amount_cents > 0 or per_sqft_rate_cents > 0)
);
create index idx_budget_template_line_template on public.budget_template_line(budget_template_id, sort_order);
create unique index idx_budget_template_line_unique
  on public.budget_template_line(budget_template_id, budget_category_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 4. RLS: system templates (org_id IS NULL) visible to all signed-in users;
--    org templates scoped by membership. Designer role is read-only.
-- ─────────────────────────────────────────────────────────────────────────
alter table public.budget_template enable row level security;
alter table public.budget_template_line enable row level security;

create policy budget_template_select on public.budget_template
  for select using (
    organization_id is null
    or organization_id in (select public.user_organization_ids())
  );
create policy budget_template_write on public.budget_template
  for all using (
    organization_id in (select public.user_organization_ids())
    and public.user_role_in_org(organization_id) in ('owner', 'admin', 'member')
  ) with check (
    organization_id in (select public.user_organization_ids())
    and public.user_role_in_org(organization_id) in ('owner', 'admin', 'member')
  );

create policy budget_template_line_select on public.budget_template_line
  for select using (
    budget_template_id in (
      select id from public.budget_template
      where organization_id is null
        or organization_id in (select public.user_organization_ids())
    )
  );
create policy budget_template_line_write on public.budget_template_line
  for all using (
    budget_template_id in (
      select id from public.budget_template
      where organization_id in (select public.user_organization_ids())
        and public.user_role_in_org(organization_id) in ('owner', 'admin', 'member')
    )
  ) with check (
    budget_template_id in (
      select id from public.budget_template
      where organization_id in (select public.user_organization_ids())
        and public.user_role_in_org(organization_id) in ('owner', 'admin', 'member')
    )
  );

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Seed the 3 canonical system templates: Cosmetic / Heavy / Gut.
--    All amounts are per_sqft_rate_cents; default_amount_cents stays 0.
-- ─────────────────────────────────────────────────────────────────────────
insert into public.budget_template (id, organization_id, name, description, scope_tier) values
  (
    '00000000-0000-0000-0002-000000000001',
    null,
    'Cosmetic Rehab',
    'Paint, flooring, light fixtures, landscaping cleanup. No structural or mechanical work. Targets $15/sqft.',
    'cosmetic'
  ),
  (
    '00000000-0000-0000-0002-000000000002',
    null,
    'Heavy Rehab',
    'Cosmetic plus kitchen, bathrooms, exterior, minor mechanical updates. Targets $42/sqft.',
    'heavy'
  ),
  (
    '00000000-0000-0000-0002-000000000003',
    null,
    'Full Gut',
    'Down to studs: new roof, HVAC, electrical, plumbing, framing, foundation work. Targets $80/sqft.',
    'gut'
  )
on conflict (id) do update set
  description = excluded.description,
  scope_tier = excluded.scope_tier;

-- Cosmetic ($15/sqft) — paint + flooring + light fixtures + landscaping
insert into public.budget_template_line (budget_template_id, budget_category_id, per_sqft_rate_cents, sort_order) values
  ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0001-000000000010',   50, 10), -- Demo / Cleanup
  ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0001-000000000014',  350, 20), -- Interior Paint
  ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0001-000000000015',  400, 30), -- Flooring
  ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0001-000000000016',  250, 40), -- Kitchen (fixtures)
  ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0001-000000000017',  200, 50), -- Bathrooms (fixtures)
  ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0001-000000000007',  100, 60), -- Landscaping
  ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0001-000000000024',  150, 70)  -- Miscellaneous
on conflict (budget_template_id, budget_category_id) do update set
  per_sqft_rate_cents = excluded.per_sqft_rate_cents;

-- Heavy ($42/sqft) — full proportions across the 14 most common categories
insert into public.budget_template_line (budget_template_id, budget_category_id, per_sqft_rate_cents, sort_order) values
  ('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0001-000000000010',  164, 10), -- Demo / Cleanup
  ('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0001-000000000022',   82, 20), -- Permits
  ('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0001-000000000001',  325, 30), -- Roof
  ('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0001-000000000002',  246, 40), -- Siding / Exterior Walls
  ('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0001-000000000003',  233, 50), -- Windows
  ('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0001-000000000019',  291, 60), -- Electrical
  ('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0001-000000000020',  315, 70), -- Plumbing
  ('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0001-000000000021',  301, 80), -- HVAC
  ('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0001-000000000013',  185, 90), -- Drywall
  ('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0001-000000000016',  633, 100), -- Kitchen
  ('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0001-000000000017',  383, 110), -- Bathrooms
  ('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0001-000000000015',  369, 120), -- Flooring
  ('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0001-000000000014',  219, 130), -- Interior Paint
  ('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0001-000000000007',  130, 140)  -- Landscaping
on conflict (budget_template_id, budget_category_id) do update set
  per_sqft_rate_cents = excluded.per_sqft_rate_cents;

-- Gut ($80/sqft) — full distribution + Foundation + Framing + Insulation
insert into public.budget_template_line (budget_template_id, budget_category_id, per_sqft_rate_cents, sort_order) values
  ('00000000-0000-0000-0002-000000000003', '00000000-0000-0000-0001-000000000010',  400, 10), -- Demo
  ('00000000-0000-0000-0002-000000000003', '00000000-0000-0000-0001-000000000011',  350, 20), -- Framing / Structural
  ('00000000-0000-0000-0002-000000000003', '00000000-0000-0000-0001-000000000009',  250, 30), -- Foundation
  ('00000000-0000-0000-0002-000000000003', '00000000-0000-0000-0001-000000000012',  150, 40), -- Insulation
  ('00000000-0000-0000-0002-000000000003', '00000000-0000-0000-0001-000000000022',  150, 50), -- Permits
  ('00000000-0000-0000-0002-000000000003', '00000000-0000-0000-0001-000000000001',  500, 60), -- Roof
  ('00000000-0000-0000-0002-000000000003', '00000000-0000-0000-0001-000000000002',  450, 70), -- Siding
  ('00000000-0000-0000-0002-000000000003', '00000000-0000-0000-0001-000000000003',  400, 80), -- Windows
  ('00000000-0000-0000-0002-000000000003', '00000000-0000-0000-0001-000000000004',  150, 90), -- Exterior Doors
  ('00000000-0000-0000-0002-000000000003', '00000000-0000-0000-0001-000000000019',  600, 100), -- Electrical
  ('00000000-0000-0000-0002-000000000003', '00000000-0000-0000-0001-000000000020',  650, 110), -- Plumbing
  ('00000000-0000-0000-0002-000000000003', '00000000-0000-0000-0001-000000000021',  600, 120), -- HVAC
  ('00000000-0000-0000-0002-000000000003', '00000000-0000-0000-0001-000000000013',  400, 130), -- Drywall
  ('00000000-0000-0000-0002-000000000003', '00000000-0000-0000-0001-000000000016', 1200, 140), -- Kitchen
  ('00000000-0000-0000-0002-000000000003', '00000000-0000-0000-0001-000000000017',  800, 150), -- Bathrooms
  ('00000000-0000-0000-0002-000000000003', '00000000-0000-0000-0001-000000000015',  750, 160), -- Flooring
  ('00000000-0000-0000-0002-000000000003', '00000000-0000-0000-0001-000000000014',  400, 170), -- Interior Paint
  ('00000000-0000-0000-0002-000000000003', '00000000-0000-0000-0001-000000000018',  300, 180), -- Interior Doors & Trim
  ('00000000-0000-0000-0002-000000000003', '00000000-0000-0000-0001-000000000007',  200, 190), -- Landscaping
  ('00000000-0000-0000-0002-000000000003', '00000000-0000-0000-0001-000000000024',  250, 200)  -- Miscellaneous
on conflict (budget_template_id, budget_category_id) do update set
  per_sqft_rate_cents = excluded.per_sqft_rate_cents;

-- ─────────────────────────────────────────────────────────────────────────
-- 6. lender_draw + lender_draw_line — schema only, UI deferred.
-- ─────────────────────────────────────────────────────────────────────────
create table public.lender_draw (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project(id) on delete cascade,
  organization_id uuid not null references public.organization(id) on delete cascade,
  draw_number integer not null,
  request_date date not null,
  amount_requested_cents bigint not null,
  inspection_date date,
  inspector_name text,
  amount_approved_cents bigint,
  disbursement_date date,
  status text not null default 'requested' check (status in (
    'requested', 'inspection_scheduled', 'approved', 'disbursed', 'denied'
  )),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, draw_number)
);
create index idx_lender_draw_project on public.lender_draw(project_id, draw_number);
create index idx_lender_draw_org on public.lender_draw(organization_id);
create trigger trg_lender_draw_updated_at before update on public.lender_draw
  for each row execute function public.touch_updated_at();

create or replace function public.set_lender_draw_org()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.organization_id is null then
    select organization_id into new.organization_id
    from public.project where id = new.project_id;
  end if;
  return new;
end;
$$;
create trigger trg_lender_draw_set_org
  before insert on public.lender_draw
  for each row execute function public.set_lender_draw_org();

create table public.lender_draw_line (
  id uuid primary key default gen_random_uuid(),
  lender_draw_id uuid not null references public.lender_draw(id) on delete cascade,
  budget_category_id uuid not null references public.budget_category(id),
  amount_cents bigint not null
);
create index idx_lender_draw_line_draw on public.lender_draw_line(lender_draw_id);

alter table public.lender_draw enable row level security;
alter table public.lender_draw_line enable row level security;

create policy lender_draw_select on public.lender_draw
  for select using (organization_id in (select public.user_organization_ids()));
create policy lender_draw_write on public.lender_draw
  for all using (
    organization_id in (select public.user_organization_ids())
    and public.user_role_in_org(organization_id) in ('owner', 'admin', 'member')
  ) with check (
    organization_id in (select public.user_organization_ids())
    and public.user_role_in_org(organization_id) in ('owner', 'admin', 'member')
  );

create policy lender_draw_line_select on public.lender_draw_line
  for select using (
    lender_draw_id in (
      select id from public.lender_draw
      where organization_id in (select public.user_organization_ids())
    )
  );
create policy lender_draw_line_write on public.lender_draw_line
  for all using (
    lender_draw_id in (
      select id from public.lender_draw
      where organization_id in (select public.user_organization_ids())
        and public.user_role_in_org(organization_id) in ('owner', 'admin', 'member')
    )
  ) with check (
    lender_draw_id in (
      select id from public.lender_draw
      where organization_id in (select public.user_organization_ids())
        and public.user_role_in_org(organization_id) in ('owner', 'admin', 'member')
    )
  );

-- ─────────────────────────────────────────────────────────────────────────
-- 7. `receipts` Storage bucket + RLS (path: {org_id}/{project_id}/expenses/...)
-- ─────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts',
  'receipts',
  false,
  26214400,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
    'application/pdf'
  ]
) on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "receipts read" on storage.objects;
drop policy if exists "receipts insert" on storage.objects;
drop policy if exists "receipts update" on storage.objects;
drop policy if exists "receipts delete" on storage.objects;

create policy "receipts read" on storage.objects
  for select using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1]::uuid in (select public.user_organization_ids())
  );

create policy "receipts insert" on storage.objects
  for insert with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1]::uuid in (select public.user_organization_ids())
    and public.user_role_in_org(((storage.foldername(name))[1]::uuid))
        in ('owner', 'admin', 'member')
  );

create policy "receipts update" on storage.objects
  for update using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1]::uuid in (select public.user_organization_ids())
  ) with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1]::uuid in (select public.user_organization_ids())
  );

create policy "receipts delete" on storage.objects
  for delete using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1]::uuid in (select public.user_organization_ids())
    and public.user_role_in_org(((storage.foldername(name))[1]::uuid))
        in ('owner', 'admin', 'member')
  );

-- ─────────────────────────────────────────────────────────────────────────
-- 8. project_budget_summary — per-project-per-category rollup with status.
--    FULL OUTER JOIN so categories that have expenses but no budget line
--    still surface (uncategorized overspend visible). security_invoker = on
--    so RLS on project_budget/project_expense is enforced at query time.
-- ─────────────────────────────────────────────────────────────────────────
create or replace view public.project_budget_summary
with (security_invoker = on)
as
with expense_agg as (
  select project_id, budget_category_id, sum(amount_cents) as actual_cents
  from public.project_expense
  group by project_id, budget_category_id
)
select
  coalesce(pb.project_id, ea.project_id) as project_id,
  coalesce(pb.budget_category_id, ea.budget_category_id) as budget_category_id,
  coalesce(pb.estimated_cents, 0) as estimated_cents,
  coalesce(ea.actual_cents, 0) as actual_cents,
  coalesce(pb.estimated_cents, 0) - coalesce(ea.actual_cents, 0) as variance_cents,
  case
    when coalesce(pb.estimated_cents, 0) = 0 then null
    else round(
      coalesce(ea.actual_cents, 0)::numeric
      / nullif(pb.estimated_cents, 0)::numeric
      * 100, 2)
  end as percent_spent,
  case
    when coalesce(ea.actual_cents, 0) = 0 then 'not_started'
    when coalesce(pb.estimated_cents, 0) = 0 then 'over' -- expense without a budget line
    when ea.actual_cents > pb.estimated_cents then 'over'
    when ea.actual_cents >= pb.estimated_cents * 0.9 then 'warning'
    else 'under'
  end as status
from public.project_budget pb
full outer join expense_agg ea
  on ea.project_id = pb.project_id
  and ea.budget_category_id = pb.budget_category_id;

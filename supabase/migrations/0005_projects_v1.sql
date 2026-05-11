-- Module 3: Projects & Pipeline.
-- Adds the three operational tables (project_milestone, project_task,
-- project_photo) + stage_history audit + target_close_date generated column
-- + project_summary view + project-photos storage bucket with org-scoped
-- RLS. Matches the denormalized organization_id pattern from 0004 so RLS
-- stays single-hop.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. project additions: stage_history (audit), target_close_date (derived)
-- ─────────────────────────────────────────────────────────────────────────
alter table public.project
  add column stage_history jsonb not null default '[]'::jsonb,
  add column target_close_date date generated always as (
    coalesce(
      sale_date,
      listing_date + 45,
      rehab_end_date + 75
    )
  ) stored;

-- Detect stage transitions and append to stage_history. Also keeps
-- stage_changed_at in sync.
create or replace function public.snapshot_project_stage()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    -- Seed with the initial stage.
    new.stage_history := jsonb_build_array(jsonb_build_object(
      'stage', new.pipeline_stage,
      'changed_at', coalesce(new.stage_changed_at, now()),
      'changed_by', auth.uid()
    ));
    return new;
  end if;

  if tg_op = 'UPDATE' and new.pipeline_stage is distinct from old.pipeline_stage then
    new.stage_changed_at := now();
    new.stage_history := coalesce(old.stage_history, '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'stage', new.pipeline_stage,
        'changed_at', new.stage_changed_at,
        'changed_by', auth.uid()
      )
    );
  end if;
  return new;
end;
$$;

create trigger trg_project_stage_history
  before insert or update on public.project
  for each row execute function public.snapshot_project_stage();

-- ─────────────────────────────────────────────────────────────────────────
-- 2. project_milestone
-- ─────────────────────────────────────────────────────────────────────────
create table public.project_milestone (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project(id) on delete cascade,
  organization_id uuid not null references public.organization(id) on delete cascade,
  name text not null,
  description text,
  start_date date,
  end_date date,
  contractor_id uuid references public.contractor(id) on delete set null,
  status text not null default 'not_started' check (status in (
    'not_started', 'in_progress', 'complete', 'blocked'
  )),
  sort_order integer not null default 0,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_milestone_project on public.project_milestone(project_id, sort_order);
create index idx_milestone_org on public.project_milestone(organization_id);
create index idx_milestone_contractor on public.project_milestone(contractor_id);
create trigger trg_milestone_updated_at before update on public.project_milestone
  for each row execute function public.touch_updated_at();

create or replace function public.set_milestone_org()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.organization_id is null then
    select organization_id into new.organization_id
    from public.project where id = new.project_id;
  end if;
  -- Auto-set completed_at when status flips to complete.
  if new.status = 'complete' and (tg_op = 'INSERT' or old.status <> 'complete') then
    new.completed_at := coalesce(new.completed_at, now());
  elsif new.status <> 'complete' then
    new.completed_at := null;
  end if;
  return new;
end;
$$;

create trigger trg_milestone_set_org
  before insert or update on public.project_milestone
  for each row execute function public.set_milestone_org();

-- ─────────────────────────────────────────────────────────────────────────
-- 3. project_task
-- ─────────────────────────────────────────────────────────────────────────
create table public.project_task (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project(id) on delete cascade,
  organization_id uuid not null references public.organization(id) on delete cascade,
  milestone_id uuid references public.project_milestone(id) on delete set null,
  title text not null,
  description text,
  assigned_to_user uuid references auth.users(id) on delete set null,
  assigned_to_contractor uuid references public.contractor(id) on delete set null,
  due_date date,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  category text check (category in ('pre_purchase', 'rehab', 'pre_sale', 'admin')),
  completed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_task_project on public.project_task(project_id, status);
create index idx_task_org on public.project_task(organization_id);
create index idx_task_milestone on public.project_task(milestone_id);
create index idx_task_due on public.project_task(due_date) where status <> 'done';
create trigger trg_task_updated_at before update on public.project_task
  for each row execute function public.touch_updated_at();

create or replace function public.set_task_org()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.organization_id is null then
    select organization_id into new.organization_id
    from public.project where id = new.project_id;
  end if;
  if new.status = 'done' and (tg_op = 'INSERT' or old.status <> 'done') then
    new.completed_at := coalesce(new.completed_at, now());
  elsif new.status <> 'done' then
    new.completed_at := null;
  end if;
  return new;
end;
$$;

create trigger trg_task_set_org
  before insert or update on public.project_task
  for each row execute function public.set_task_org();

-- ─────────────────────────────────────────────────────────────────────────
-- 4. project_photo
-- ─────────────────────────────────────────────────────────────────────────
create table public.project_photo (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project(id) on delete cascade,
  organization_id uuid not null references public.organization(id) on delete cascade,
  storage_path text not null,
  thumbnail_path text,
  room_area text,
  phase text check (phase in ('before', 'during', 'after')),
  caption text,
  taken_at timestamptz,
  exif jsonb,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_photo_project on public.project_photo(project_id, created_at desc);
create index idx_photo_org on public.project_photo(organization_id);
create index idx_photo_room on public.project_photo(project_id, room_area)
  where room_area is not null;

create or replace function public.set_photo_org()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.organization_id is null then
    select organization_id into new.organization_id
    from public.project where id = new.project_id;
  end if;
  return new;
end;
$$;

create trigger trg_photo_set_org
  before insert on public.project_photo
  for each row execute function public.set_photo_org();

-- ─────────────────────────────────────────────────────────────────────────
-- 5. RLS — org-scoped, designer can read/write project_photo and tasks
--          (read-only on milestones for designers), member+ for everything.
-- ─────────────────────────────────────────────────────────────────────────
alter table public.project_milestone enable row level security;
alter table public.project_task enable row level security;
alter table public.project_photo enable row level security;

-- milestones
create policy project_milestone_select on public.project_milestone
  for select using (organization_id in (select public.user_organization_ids()));
create policy project_milestone_write on public.project_milestone
  for all using (
    organization_id in (select public.user_organization_ids())
    and public.user_role_in_org(organization_id) in ('owner', 'admin', 'member')
  ) with check (
    organization_id in (select public.user_organization_ids())
    and public.user_role_in_org(organization_id) in ('owner', 'admin', 'member')
  );

-- tasks (designers can SELECT but not write)
create policy project_task_select on public.project_task
  for select using (organization_id in (select public.user_organization_ids()));
create policy project_task_write on public.project_task
  for all using (
    organization_id in (select public.user_organization_ids())
    and public.user_role_in_org(organization_id) in ('owner', 'admin', 'member')
  ) with check (
    organization_id in (select public.user_organization_ids())
    and public.user_role_in_org(organization_id) in ('owner', 'admin', 'member')
  );

-- photos: designers CAN write (they document the design work)
create policy project_photo_select on public.project_photo
  for select using (organization_id in (select public.user_organization_ids()));
create policy project_photo_write on public.project_photo
  for all using (
    organization_id in (select public.user_organization_ids())
    and public.user_role_in_org(organization_id) in ('owner', 'admin', 'member', 'designer')
  ) with check (
    organization_id in (select public.user_organization_ids())
    and public.user_role_in_org(organization_id) in ('owner', 'admin', 'member', 'designer')
  );

-- ─────────────────────────────────────────────────────────────────────────
-- 6. Storage bucket for project photos
-- ─────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-photos',
  'project-photos',
  false, -- private; signed URLs only
  26214400, -- 25 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
) on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Path convention: {org_id}/{project_id}/{phase}/{uuid}.{ext}
-- Storage RLS checks that the first path segment is one of the user's orgs.
drop policy if exists "project photos read" on storage.objects;
drop policy if exists "project photos insert" on storage.objects;
drop policy if exists "project photos update" on storage.objects;
drop policy if exists "project photos delete" on storage.objects;

create policy "project photos read" on storage.objects
  for select using (
    bucket_id = 'project-photos'
    and (storage.foldername(name))[1]::uuid in (select public.user_organization_ids())
  );

create policy "project photos insert" on storage.objects
  for insert with check (
    bucket_id = 'project-photos'
    and (storage.foldername(name))[1]::uuid in (select public.user_organization_ids())
    and public.user_role_in_org(((storage.foldername(name))[1]::uuid))
        in ('owner', 'admin', 'member', 'designer')
  );

create policy "project photos update" on storage.objects
  for update using (
    bucket_id = 'project-photos'
    and (storage.foldername(name))[1]::uuid in (select public.user_organization_ids())
  ) with check (
    bucket_id = 'project-photos'
    and (storage.foldername(name))[1]::uuid in (select public.user_organization_ids())
  );

create policy "project photos delete" on storage.objects
  for delete using (
    bucket_id = 'project-photos'
    and (storage.foldername(name))[1]::uuid in (select public.user_organization_ids())
    and public.user_role_in_org(((storage.foldername(name))[1]::uuid))
        in ('owner', 'admin', 'member', 'designer')
  );

-- ─────────────────────────────────────────────────────────────────────────
-- 7. project_summary view — single-hop, joins property + deal_analysis_computed
--    + counts (milestones complete/total, tasks open, photo count) + derived
--    pipeline_phase. security_invoker so RLS on the underlying tables applies.
-- ─────────────────────────────────────────────────────────────────────────
create or replace view public.project_summary
with (security_invoker = on)
as
select
  p.id,
  p.organization_id,
  p.name,
  p.property_id,
  p.deal_analysis_id,
  p.pipeline_stage,
  case
    when p.pipeline_stage in ('lead', 'analyzing', 'offer_made', 'under_contract')
      then 'acquisition'
    when p.pipeline_stage in ('purchased', 'in_rehab', 'punch_list')
      then 'rehab'
    when p.pipeline_stage in ('listed', 'under_contract_sale')
      then 'listing'
    when p.pipeline_stage in ('sold', 'portfolio')
      then 'sold'
    else 'other'
  end as pipeline_phase,
  p.stage_changed_at,
  p.target_close_date,
  p.status,
  -- Property denorm for cards
  pr.address_line1, pr.address_line2, pr.city, pr.state, pr.zip,
  pr.sqft, pr.thumbnail_url,
  -- Deal computed
  dac.arv_cents,
  dac.net_profit_cents as projected_net_profit_cents,
  dac.roi_pct as projected_roi_pct,
  -- Budget rollups (preserve project_financials shape)
  coalesce(b.total_budget_cents, 0) as total_budget_cents,
  coalesce(e.total_spent_cents, 0) as total_spent_cents,
  coalesce(b.total_budget_cents, 0) - coalesce(e.total_spent_cents, 0)
    as budget_variance_cents,
  case
    when coalesce(b.total_budget_cents, 0) = 0 then 0
    else round(coalesce(e.total_spent_cents, 0)::numeric
               / nullif(b.total_budget_cents, 0) * 100, 2)
  end as percent_spent,
  -- Counts
  coalesce(ms.milestones_total, 0) as milestones_total,
  coalesce(ms.milestones_complete, 0) as milestones_complete,
  coalesce(ts.tasks_open, 0) as tasks_open,
  coalesce(ph.photos_count, 0) as photos_count,
  p.created_at,
  p.updated_at
from public.project p
left join public.property pr on pr.id = p.property_id
left join public.deal_analysis_computed dac on dac.id = p.deal_analysis_id
left join (
  select project_id, sum(estimated_cents) as total_budget_cents
  from public.project_budget group by project_id
) b on b.project_id = p.id
left join (
  select project_id, sum(amount_cents) as total_spent_cents
  from public.project_expense group by project_id
) e on e.project_id = p.id
left join (
  select project_id,
         count(*) as milestones_total,
         count(*) filter (where status = 'complete') as milestones_complete
  from public.project_milestone group by project_id
) ms on ms.project_id = p.id
left join (
  select project_id, count(*) as tasks_open
  from public.project_task where status <> 'done' group by project_id
) ts on ts.project_id = p.id
left join (
  select project_id, count(*) as photos_count
  from public.project_photo group by project_id
) ph on ph.project_id = p.id;

-- Keep project_financials in place for any code already using it. Once the
-- dashboard module is built we can decide whether to retire it.

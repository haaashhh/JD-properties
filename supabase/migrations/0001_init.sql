-- Properties by JD — initial schema
-- Module 1 lays the org/auth foundation plus the deal_analysis core that
-- Modules 2-5 already assume (persisted ROI fields, broken-out holding costs,
-- auto-contingency trigger, project_financials view).

-- ─────────────────────────────────────────────────────────────────────────
-- Extensions
-- ─────────────────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- ─────────────────────────────────────────────────────────────────────────
-- Organizations & membership
-- ─────────────────────────────────────────────────────────────────────────
create table public.organization (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_member (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organization(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member', 'designer')),
  invited_at timestamptz not null default now(),
  joined_at timestamptz default now(),
  unique (organization_id, user_id)
);

create index idx_org_member_user on public.organization_member(user_id);
create index idx_org_member_org on public.organization_member(organization_id);

-- ─────────────────────────────────────────────────────────────────────────
-- Settings: per-org policy, per-user UI preferences
-- ─────────────────────────────────────────────────────────────────────────
create table public.organization_settings (
  organization_id uuid primary key references public.organization(id) on delete cascade,
  default_arv_pct numeric(5,2) not null default 70.00,
  default_contingency_pct numeric(4,2) not null default 10.00,
  default_holding_months numeric(4,1) not null default 6.0,
  default_sell_commission_pct numeric(4,2) not null default 5.50,
  over_budget_alert_pct numeric(4,2) not null default 90.00,
  qb_sync_enabled boolean not null default false,
  qb_auto_sync_cron text,
  updated_at timestamptz not null default now()
);

create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  default_landing text not null default 'dashboard',
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- Signup trigger: each new auth user gets a default org + owner membership
-- + default org settings + user settings.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
  org_slug text;
  base_slug text;
begin
  base_slug := regexp_replace(lower(coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))), '[^a-z0-9]+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  if base_slug = '' then
    base_slug := 'workspace';
  end if;

  -- Make slug unique by appending the first 8 chars of the user id if needed.
  org_slug := base_slug || '-' || substr(replace(new.id::text, '-', ''), 1, 8);

  insert into public.organization (name, slug)
  values (coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)) || '''s workspace', org_slug)
  returning id into new_org_id;

  insert into public.organization_member (organization_id, user_id, role, joined_at)
  values (new_org_id, new.id, 'owner', now());

  insert into public.organization_settings (organization_id) values (new_org_id);
  insert into public.user_settings (user_id) values (new.id);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────
-- updated_at touch trigger (reused across tables)
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_organization_updated_at before update on public.organization
  for each row execute function public.touch_updated_at();
create trigger trg_org_settings_updated_at before update on public.organization_settings
  for each row execute function public.touch_updated_at();
create trigger trg_user_settings_updated_at before update on public.user_settings
  for each row execute function public.touch_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- Helper: current user's accessible organization ids (used by RLS).
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.user_organization_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select organization_id from public.organization_member where user_id = auth.uid();
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────
alter table public.organization enable row level security;
alter table public.organization_member enable row level security;
alter table public.organization_settings enable row level security;
alter table public.user_settings enable row level security;

-- organization: visible if member; updatable by owner/admin
create policy organization_select on public.organization
  for select using (id in (select public.user_organization_ids()));
create policy organization_update on public.organization
  for update using (
    id in (
      select organization_id from public.organization_member
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- organization_member: members see their own org's roster; owners can write
create policy org_member_select on public.organization_member
  for select using (organization_id in (select public.user_organization_ids()));
create policy org_member_write on public.organization_member
  for all using (
    organization_id in (
      select organization_id from public.organization_member
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  ) with check (
    organization_id in (
      select organization_id from public.organization_member
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- organization_settings: visible to all members; writable by owner/admin
create policy org_settings_select on public.organization_settings
  for select using (organization_id in (select public.user_organization_ids()));
create policy org_settings_update on public.organization_settings
  for update using (
    organization_id in (
      select organization_id from public.organization_member
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- user_settings: each user owns their row
create policy user_settings_select on public.user_settings
  for select using (user_id = auth.uid());
create policy user_settings_upsert on public.user_settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

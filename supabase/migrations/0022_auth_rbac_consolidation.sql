-- ============================================================================
-- Apex CallCRM — Migration 0022: Auth + RBAC Consolidation
-- Canonical roles: owner | manager | salesperson
-- Legacy remap: closer->salesperson, admin->manager, boss->owner
-- ============================================================================

-- 1) Persist org setup state directly on orgs so onboarding flow uses server truth.
alter table public.orgs
  add column if not exists setup_completed_at timestamptz,
  add column if not exists team_size text,
  add column if not exists primary_region text;

-- 2) Canonical role mapper for legacy-safe reads.
create or replace function public.canonicalize_role(raw_role text)
returns text
language sql
immutable
as $$
  select case coalesce(raw_role, '')
    when 'boss' then 'owner'
    when 'admin' then 'manager'
    when 'closer' then 'salesperson'
    when 'owner' then 'owner'
    when 'manager' then 'manager'
    when 'salesperson' then 'salesperson'
    else 'salesperson'
  end;
$$;

-- 3) Force role helper to always emit canonical values for RLS/function checks.
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select public.canonicalize_role(role)
  from public.profiles
  where user_id = auth.uid()
  limit 1;
$$;

-- 4) Data remap before tightening checks.
update public.profiles
set role = public.canonicalize_role(role)
where role in ('owner', 'manager', 'salesperson', 'closer', 'admin', 'boss');

update public.invitations
set role = public.canonicalize_role(role)
where role in ('owner', 'manager', 'salesperson', 'closer', 'admin', 'boss');

-- 5) Rebuild role checks on profiles/invitations to canonical-only.
do $$
declare
  rec record;
begin
  for rec in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'profiles'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%role%'
  loop
    execute format('alter table public.profiles drop constraint %I', rec.conname);
  end loop;

  for rec in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'invitations'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%role%'
  loop
    execute format('alter table public.invitations drop constraint %I', rec.conname);
  end loop;
end
$$;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('owner', 'manager', 'salesperson'));

alter table public.invitations
  add constraint invitations_role_check
  check (role in ('owner', 'manager', 'salesperson'));

-- 6) Role-change guard:
-- - keep self-role-change ban
-- - allow service-role/system updates (auth.uid() is null)
-- - allow only owner/manager for direct caller updates
create or replace function public.trg_guard_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    new.role := public.canonicalize_role(new.role);

    if auth.uid() = new.user_id then
      raise exception 'SELF_ROLE_CHANGE_FORBIDDEN';
    end if;

    if auth.uid() is not null
       and coalesce(public.current_user_role(), '') not in ('owner', 'manager') then
      raise exception 'ROLE_CHANGE_FORBIDDEN';
    end if;
  end if;

  return new;
end;
$$;

-- 7) Keep lead ownership guard canonical too.
create or replace function public.trg_force_lead_ownership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.salesperson_id is null then
    new.salesperson_id := auth.uid();
  elsif new.salesperson_id <> auth.uid()
        and coalesce(public.current_user_role(), 'salesperson') not in ('owner', 'manager') then
    new.salesperson_id := auth.uid();
  end if;
  return new;
end;
$$;

-- 8) Normalize existing RLS policy role lists from legacy sets to canonical sets.
do $$
declare
  p record;
  updated_qual text;
  updated_check text;
begin
  for p in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (
        coalesce(qual, '') ~ '\\(''owner''\\s*,\\s*''admin''\\s*,\\s*''boss''\\s*,\\s*''manager''\\)'
        or coalesce(qual, '') ~ '\\(''owner''\\s*,\\s*''admin''\\s*,\\s*''boss''\\)'
        or coalesce(qual, '') ~ '\\(''salesperson''\\s*,\\s*''closer''\\)'
        or coalesce(with_check, '') ~ '\\(''owner''\\s*,\\s*''admin''\\s*,\\s*''boss''\\s*,\\s*''manager''\\)'
        or coalesce(with_check, '') ~ '\\(''owner''\\s*,\\s*''admin''\\s*,\\s*''boss''\\)'
        or coalesce(with_check, '') ~ '\\(''salesperson''\\s*,\\s*''closer''\\)'
      )
  loop
    updated_qual := p.qual;
    updated_check := p.with_check;

    if updated_qual is not null then
      updated_qual := regexp_replace(updated_qual, '\\(''owner''\\s*,\\s*''admin''\\s*,\\s*''boss''\\s*,\\s*''manager''\\)', '(''owner'', ''manager'')', 'g');
      updated_qual := regexp_replace(updated_qual, '\\(''owner''\\s*,\\s*''admin''\\s*,\\s*''boss''\\)', '(''owner'')', 'g');
      updated_qual := regexp_replace(updated_qual, '\\(''salesperson''\\s*,\\s*''closer''\\)', '(''salesperson'')', 'g');
    end if;

    if updated_check is not null then
      updated_check := regexp_replace(updated_check, '\\(''owner''\\s*,\\s*''admin''\\s*,\\s*''boss''\\s*,\\s*''manager''\\)', '(''owner'', ''manager'')', 'g');
      updated_check := regexp_replace(updated_check, '\\(''owner''\\s*,\\s*''admin''\\s*,\\s*''boss''\\)', '(''owner'')', 'g');
      updated_check := regexp_replace(updated_check, '\\(''salesperson''\\s*,\\s*''closer''\\)', '(''salesperson'')', 'g');
    end if;

    if p.qual is not null and updated_qual is distinct from p.qual then
      execute format(
        'alter policy %I on %I.%I using (%s)',
        p.policyname,
        p.schemaname,
        p.tablename,
        updated_qual
      );
    end if;

    if p.with_check is not null and updated_check is distinct from p.with_check then
      execute format(
        'alter policy %I on %I.%I with check (%s)',
        p.policyname,
        p.schemaname,
        p.tablename,
        updated_check
      );
    end if;
  end loop;
end
$$;

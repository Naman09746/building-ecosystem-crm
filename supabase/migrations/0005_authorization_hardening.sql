-- ============================================================================
-- Ecosystem Realty — Migration 0005: Authorization Hardening
-- Fixes found in the Pass 6 security re-audit:
--   H2: manager->owner self-elevation via unrestricted profiles.role UPDATE
--   M3: permissive tasks FOR ALL policy defeated rep-scoping
--   M4: orgs INSERT open to all authenticated clients
--   M5: leads.salesperson_id assignable to arbitrary reps by any writer
-- ============================================================================

-- ---------------------------------------------------------------- H2 ----
-- Role changes require owner/admin AND can never be performed on yourself.
create or replace function public.trg_guard_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    if auth.uid() = new.user_id then
      raise exception 'SELF_ROLE_CHANGE_FORBIDDEN';
    end if;
    if coalesce(public.current_user_role(), '') not in ('owner', 'admin') then
      raise exception 'ROLE_CHANGE_FORBIDDEN';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_role_guard on public.profiles;
create trigger trg_profiles_role_guard
  before update on public.profiles
  for each row execute function public.trg_guard_role_change();

-- ---------------------------------------------------------------- M3 ----
-- Replace the org-wide "Tasks manage policy" with role-aware policies that
-- preserve rep isolation for SELECT/UPDATE while keeping team coordination.
drop policy if exists "Tasks manage policy" on public.tasks;
drop policy if exists "Tasks select policy" on public.tasks;

create policy "Tasks select policy (role-scoped)"
  on public.tasks for select
  using (
    org_id = public.current_org_id()
    and (
      salesperson_id = auth.uid()
      or public.current_user_role() in ('owner', 'admin', 'boss', 'manager')
    )
  );

create policy "Tasks insert policy"
  on public.tasks for insert
  with check (
    org_id = public.current_org_id()
    and (
      salesperson_id = auth.uid()
      or public.current_user_role() in ('owner', 'admin', 'boss', 'manager')
    )
  );

create policy "Tasks update policy (own or manager)"
  on public.tasks for update
  using (
    org_id = public.current_org_id()
    and (
      salesperson_id = auth.uid()
      or public.current_user_role() in ('owner', 'admin', 'boss', 'manager')
    )
  );

create policy "Tasks delete policy (manager only)"
  on public.tasks for delete
  using (
    org_id = public.current_org_id()
    and public.current_user_role() in ('owner', 'admin', 'boss', 'manager')
  );

-- ---------------------------------------------------------------- M4 ----
-- Tenant creation happens ONLY via the handle_new_user trigger (security
-- definer, bypasses RLS as table owner) or service-role. Client inserts denied.
drop policy if exists "Users can create their own organization during bootstrap"
  on public.orgs;

-- ---------------------------------------------------------------- M5 ----
-- Non-managers cannot assign leads to other reps; empty assignment resolves
-- to the creator. Runs as definer so it can read current_user_role() safely.
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
        and coalesce(public.current_user_role(), 'salesperson') not in ('owner', 'admin', 'boss', 'manager') then
    new.salesperson_id := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_leads_ownership on public.leads;
create trigger trg_leads_ownership
  before insert on public.leads
  for each row execute function public.trg_force_lead_ownership();

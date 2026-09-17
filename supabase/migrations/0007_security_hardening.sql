-- ============================================================================
-- Ecosystem Realty — Migration 0007: Security & Authorization Hardening
-- Hardens database-level authorization against unauthorized salesperson mutations
-- while preserving legitimate multi-tenant CRM workflows:
--   1. Lead reassignment protection on UPDATE (salesperson cannot reassign lead ownership)
--   2. People RLS hardening (salesperson DELETE denied; manager DELETE allowed)
--   3. Project units RLS & trigger hardening (salesperson price/config/spec changes denied; operational status updates allowed; DELETE manager only)
--   4. Documents RLS hardening (salesperson DELETE denied; manager DELETE allowed)
--   5. Tenant isolation protection against cross-org updates (org_id mutation blocked)
--   6. Activity user_id spoofing guard for client-side direct inserts
-- ============================================================================

-- ============================================================================
-- 1. LEADS: OWNERSHIP & REASSIGNMENT GUARD ON INSERT AND UPDATE
-- ============================================================================

create or replace function public.trg_guard_lead_ownership_and_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_caller uuid;
begin
  v_caller := auth.uid();
  v_role := coalesce(public.current_user_role(), 'salesperson');

  if tg_op = 'INSERT' then
    -- If org_id is omitted, default to caller's org
    if new.org_id is null then
      new.org_id := public.current_org_id();
    end if;

    -- Default salesperson_id to creator if unset or if non-manager specifies someone else
    if new.salesperson_id is null then
      new.salesperson_id := v_caller;
    elsif v_caller is not null
          and new.salesperson_id <> v_caller
          and v_role not in ('owner', 'admin', 'boss', 'manager') then
      new.salesperson_id := v_caller;
    end if;

  elsif tg_op = 'UPDATE' then
    -- Block tenant boundary manipulation
    if new.org_id is distinct from old.org_id then
      raise exception 'TENANT_CHANGE_FORBIDDEN: Cannot alter organization ownership of a lead'
        using errcode = '42501';
    end if;

    -- Block unauthorized lead ownership reassignment
    if new.salesperson_id is distinct from old.salesperson_id
       and v_caller is not null
       and v_role not in ('owner', 'admin', 'boss', 'manager') then
      raise exception 'LEAD_REASSIGNMENT_FORBIDDEN: Only managers and admins can reassign leads to another salesperson'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

-- Drop previous insert-only trigger and function
drop trigger if exists trg_leads_ownership on public.leads;
drop trigger if exists trg_guard_lead_ownership on public.leads;

create trigger trg_guard_lead_ownership
  before insert or update on public.leads
  for each row execute function public.trg_guard_lead_ownership_and_assignment();


-- ============================================================================
-- 2. PEOPLE (CUSTOMER MASTER DATA): SCOPED RLS & DELETE PROTECTION
-- ============================================================================

-- Drop overly permissive "FOR ALL" policies
drop policy if exists "Org members can manage people" on public.people;
drop policy if exists "Org members can view people" on public.people;
drop policy if exists "People select policy" on public.people;
drop policy if exists "People insert policy" on public.people;
drop policy if exists "People update policy" on public.people;
drop policy if exists "People delete policy (manager only)" on public.people;

create policy "People select policy"
  on public.people for select
  using (org_id = public.current_org_id());

create policy "People insert policy"
  on public.people for insert
  with check (org_id = public.current_org_id());

create policy "People update policy"
  on public.people for update
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

create policy "People delete policy (manager only)"
  on public.people for delete
  using (
    org_id = public.current_org_id()
    and public.current_user_role() in ('owner', 'admin', 'boss', 'manager')
  );

-- Guard people table against org_id alteration
create or replace function public.trg_guard_people_tenant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.org_id is distinct from old.org_id then
    raise exception 'TENANT_CHANGE_FORBIDDEN: Cannot alter organization ownership of a person'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_people_tenant_guard on public.people;
create trigger trg_people_tenant_guard
  before update on public.people
  for each row execute function public.trg_guard_people_tenant();


-- ============================================================================
-- 3. PROJECT UNITS (INVENTORY): SCOPED RLS & COMMERCIAL SPEC PROTECTION
-- ============================================================================

drop policy if exists "Org members can view units" on public.project_units;
drop policy if exists "Org members can update unit status" on public.project_units;
drop policy if exists "Units select policy" on public.project_units;
drop policy if exists "Units insert policy (manager only)" on public.project_units;
drop policy if exists "Units update policy" on public.project_units;
drop policy if exists "Units delete policy (manager only)" on public.project_units;

create policy "Units select policy"
  on public.project_units for select
  using (org_id = public.current_org_id());

create policy "Units insert policy (manager only)"
  on public.project_units for insert
  with check (
    org_id = public.current_org_id()
    and public.current_user_role() in ('owner', 'admin', 'boss', 'manager')
  );

create policy "Units update policy"
  on public.project_units for update
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

create policy "Units delete policy (manager only)"
  on public.project_units for delete
  using (
    org_id = public.current_org_id()
    and public.current_user_role() in ('owner', 'admin', 'boss', 'manager')
  );

-- Guard project_units: non-managers can ONLY update operational fields (status, assigned lead/buyer)
create or replace function public.trg_guard_project_unit_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_caller uuid;
begin
  v_caller := auth.uid();
  v_role := coalesce(public.current_user_role(), 'salesperson');

  -- Never allow tenant alteration
  if new.org_id is distinct from old.org_id then
    raise exception 'TENANT_CHANGE_FORBIDDEN: Cannot alter organization ownership of an inventory unit'
      using errcode = '42501';
  end if;

  -- If non-manager, protect commercial and structural inventory fields
  if v_caller is not null and v_role not in ('owner', 'admin', 'boss', 'manager') then
    if new.price is distinct from old.price then
      raise exception 'UNIT_PRICE_UPDATE_FORBIDDEN: Only managers can modify unit prices'
        using errcode = '42501';
    end if;

    if new.configuration is distinct from old.configuration then
      raise exception 'UNIT_CONFIG_UPDATE_FORBIDDEN: Only managers can modify unit configuration'
        using errcode = '42501';
    end if;

    if new.super_area_sq_ft is distinct from old.super_area_sq_ft then
      raise exception 'UNIT_AREA_UPDATE_FORBIDDEN: Only managers can modify unit super area'
        using errcode = '42501';
    end if;

    if new.tower is distinct from old.tower
       or new.unit_number is distinct from old.unit_number
       or new.floor is distinct from old.floor
       or new.project_id is distinct from old.project_id
       or new.facing is distinct from old.facing then
      raise exception 'UNIT_SPECS_UPDATE_FORBIDDEN: Only managers can modify core unit architectural specifications'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_project_units_guard on public.project_units;
create trigger trg_project_units_guard
  before update on public.project_units
  for each row execute function public.trg_guard_project_unit_update();


-- ============================================================================
-- 4. DOCUMENTS: SCOPED RLS & DELETE PROTECTION
-- ============================================================================

drop policy if exists "Documents manage policy" on public.documents;
drop policy if exists "Documents select policy" on public.documents;
drop policy if exists "Documents insert policy" on public.documents;
drop policy if exists "Documents update policy" on public.documents;
drop policy if exists "Documents delete policy (manager only)" on public.documents;

create policy "Documents select policy"
  on public.documents for select
  using (org_id = public.current_org_id());

create policy "Documents insert policy"
  on public.documents for insert
  with check (org_id = public.current_org_id());

create policy "Documents update policy"
  on public.documents for update
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

create policy "Documents delete policy (manager only)"
  on public.documents for delete
  using (
    org_id = public.current_org_id()
    and public.current_user_role() in ('owner', 'admin', 'boss', 'manager')
  );

-- Guard documents table against org_id alteration
create or replace function public.trg_guard_documents_tenant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.org_id is distinct from old.org_id then
    raise exception 'TENANT_CHANGE_FORBIDDEN: Cannot alter organization ownership of a document'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_documents_tenant_guard on public.documents;
create trigger trg_documents_tenant_guard
  before update on public.documents
  for each row execute function public.trg_guard_documents_tenant();


-- ============================================================================
-- 5. ACTIVITIES: ACTOR SPOOFING GUARD FOR DIRECT CLIENT INSERTS
-- ============================================================================

create or replace function public.trg_guard_activity_actor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_caller uuid;
begin
  v_caller := auth.uid();
  v_role := coalesce(public.current_user_role(), 'salesperson');

  if new.org_id is null then
    new.org_id := public.current_org_id();
  end if;

  -- If client omits user_id or non-manager tries to log as someone else, bind to caller
  if new.user_id is null then
    if v_caller is not null then
      new.user_id := v_caller;
    end if;
  elsif v_caller is not null
        and new.user_id <> v_caller
        and v_role not in ('owner', 'admin', 'boss', 'manager') then
    new.user_id := v_caller;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_activity_actor_guard on public.activities;
create trigger trg_activity_actor_guard
  before insert on public.activities
  for each row execute function public.trg_guard_activity_actor();

-- ============================================================================
-- Ecosystem Realty — Migration 0008: Phase 2 Core Features Schema
-- Core CRUD Foundations, Team Invitations, Immutable Audit Triggers,
-- Storage Bucket Provisioning, and Tenant Safety Controls.
-- ============================================================================

-- ============================================================================
-- 1. TEAM INVITATIONS TABLE & WORKFLOW
-- ============================================================================

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  email text not null,
  role text not null default 'salesperson' check (role in ('owner', 'manager', 'salesperson', 'closer', 'boss', 'admin')),
  region_id uuid references public.regions(id) on delete set null,
  token_hash text not null unique,
  invited_by uuid references public.profiles(user_id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_invitations_org on public.invitations(org_id);
create unique index if not exists idx_invitations_org_email_pending
  on public.invitations(org_id, lower(email))
  where status = 'pending';

-- Auto updated_at for invitations
drop trigger if exists trg_invitations_updated_at on public.invitations;
create trigger trg_invitations_updated_at
  before update on public.invitations
  for each row execute function public.trg_set_updated_at();

-- Seat quota verification on pending invitation creation
create or replace function public.assert_invitation_seat_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max integer;
  v_profiles_count integer;
  v_invites_count integer;
begin
  select coalesce(max_seats, 4) into v_max from public.orgs where id = new.org_id;
  select count(*) into v_profiles_count from public.profiles where org_id = new.org_id;
  select count(*) into v_invites_count from public.invitations where org_id = new.org_id and status = 'pending' and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

  if (v_profiles_count + v_invites_count + 1) > v_max then
    raise exception 'SEAT_QUOTA_EXCEEDED: Cannot invite member. Organization seat limit (%) reached', v_max
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_invitations_seat_quota on public.invitations;
create trigger trg_invitations_seat_quota
  before insert on public.invitations
  for each row
  when (new.status = 'pending')
  execute function public.assert_invitation_seat_quota();

-- RLS for Invitations
alter table public.invitations enable row level security;

create policy "Admins/Managers can view invitations"
  on public.invitations for select
  using (
    org_id = public.current_org_id()
    and public.current_user_role() in ('owner', 'admin', 'boss', 'manager')
  );

create policy "Admins/Managers can create invitations"
  on public.invitations for insert
  with check (
    org_id = public.current_org_id()
    and public.current_user_role() in ('owner', 'admin', 'boss', 'manager')
  );

create policy "Admins/Managers can update invitations"
  on public.invitations for update
  using (
    org_id = public.current_org_id()
    and public.current_user_role() in ('owner', 'admin', 'boss', 'manager')
  );

create policy "Admins/Managers can delete invitations"
  on public.invitations for delete
  using (
    org_id = public.current_org_id()
    and public.current_user_role() in ('owner', 'admin', 'boss', 'manager')
  );


-- ============================================================================
-- 2. IMMUTABLE DATABASE AUDIT LOGGING TRIGGERS
-- ============================================================================

-- Ensure audit_log is append-only for normal users
alter table public.audit_log enable row level security;

drop policy if exists "Audit log insert policy" on public.audit_log;
drop policy if exists "Admins/Managers can view audit logs" on public.audit_log;
drop policy if exists "Audit log update deny" on public.audit_log;
drop policy if exists "Audit log delete deny" on public.audit_log;

create policy "Admins/Managers can view audit logs"
  on public.audit_log for select
  using (
    org_id = public.current_org_id()
    and public.current_user_role() in ('owner', 'admin', 'boss', 'manager')
  );

create policy "Audit log insert policy"
  on public.audit_log for insert
  with check (org_id = public.current_org_id());

-- Zero update or delete policies granted: audit records cannot be mutated or dropped by clients.

-- Universal trigger function to log audit entries
create or replace function public.log_audit_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_actor uuid;
  v_action text;
  v_entity_type text;
  v_entity_id uuid;
  v_diff jsonb;
begin
  v_actor := auth.uid();
  v_entity_type := tg_table_name;
  v_action := tg_op;

  if tg_op = 'INSERT' then
    v_org := coalesce(new.org_id, public.current_org_id());
    v_entity_id := new.id;
    v_diff := jsonb_build_object('created', row_to_json(new)::jsonb);
  elsif tg_op = 'UPDATE' then
    v_org := coalesce(new.org_id, old.org_id, public.current_org_id());
    v_entity_id := new.id;
    v_diff := jsonb_build_object(
      'before', row_to_json(old)::jsonb,
      'after', row_to_json(new)::jsonb
    );
  elsif tg_op = 'DELETE' then
    v_org := coalesce(old.org_id, public.current_org_id());
    v_entity_id := old.id;
    v_diff := jsonb_build_object('deleted', row_to_json(old)::jsonb);
  end if;

  if v_org is not null then
    insert into public.audit_log (org_id, actor_id, action, entity_type, entity_id, diff, created_at)
    values (v_org, v_actor, v_action, v_entity_type, v_entity_id, coalesce(v_diff, '{}'::jsonb), now());
  end if;

  if tg_op = 'DELETE' then
    return old;
  else
    return new;
  end if;
exception
  when others then
    -- Fail safe: audit logging must not abort legitimate database transactions if actor context is anomalous
    return coalesce(new, old);
end;
$$;

-- Attach audit triggers
drop trigger if exists trg_audit_leads on public.leads;
create trigger trg_audit_leads
  after insert or update or delete on public.leads
  for each row execute function public.log_audit_event();

drop trigger if exists trg_audit_projects on public.projects;
create trigger trg_audit_projects
  after insert or update or delete on public.projects
  for each row execute function public.log_audit_event();

drop trigger if exists trg_audit_project_units on public.project_units;
create trigger trg_audit_project_units
  after insert or update or delete on public.project_units
  for each row execute function public.log_audit_event();

drop trigger if exists trg_audit_profiles on public.profiles;
create trigger trg_audit_profiles
  after update on public.profiles
  for each row execute function public.log_audit_event();

drop trigger if exists trg_audit_orgs on public.orgs;
create trigger trg_audit_orgs
  after update on public.orgs
  for each row execute function public.log_audit_event();

drop trigger if exists trg_audit_invitations on public.invitations;
create trigger trg_audit_invitations
  after insert or update or delete on public.invitations
  for each row execute function public.log_audit_event();

drop trigger if exists trg_audit_documents on public.documents;
create trigger trg_audit_documents
  after insert or delete on public.documents
  for each row execute function public.log_audit_event();

drop trigger if exists trg_audit_regions on public.regions;
create trigger trg_audit_regions
  after insert or update or delete on public.regions
  for each row execute function public.log_audit_event();


-- ============================================================================
-- 3. STORAGE BUCKET & OBJECT SECURITY (CRM DOCUMENTS)
-- ============================================================================

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values (
      'crm-documents',
      'crm-documents',
      false,
      15728640, -- 15MB
      array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    )
    on conflict (id) do update set
      public = false,
      file_size_limit = 15728640,
      allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
  end if;
end $$;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'objects') then
    alter table storage.objects enable row level security;
    
    drop policy if exists "Tenant scoped storage select" on storage.objects;
    drop policy if exists "Tenant scoped storage insert" on storage.objects;
    drop policy if exists "Tenant scoped storage delete" on storage.objects;

    create policy "Tenant scoped storage select"
      on storage.objects for select
      using (
        bucket_id = 'crm-documents'
        and (storage.foldername(name))[1] = (public.current_org_id())::text
      );

    create policy "Tenant scoped storage insert"
      on storage.objects for insert
      with check (
        bucket_id = 'crm-documents'
        and (storage.foldername(name))[1] = (public.current_org_id())::text
      );

    create policy "Tenant scoped storage delete"
      on storage.objects for delete
      using (
        bucket_id = 'crm-documents'
        and (storage.foldername(name))[1] = (public.current_org_id())::text
        and public.current_user_role() in ('owner', 'admin', 'boss', 'manager')
      );
  end if;
end $$;

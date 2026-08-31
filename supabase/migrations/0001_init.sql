-- ============================================================================
-- Apex CallCRM — Canonical Initial Migration (consolidated)
-- Base: tenant_isolation_rls schema (orgs/profiles bound to auth.users)
-- Ported from deprecated enterprise schema: normalize_phone, webhook_events,
--   ai_agent_executions, updated_at triggers.
-- Supersedes (archived in DOCS/archive/):
--   - 20260821_enterprise_schema.sql.deprecated.sql
--   - 20260821000001_tenant_isolation_rls.sql.source.sql
--   - schema.sql.deprecated.sql / seed.sql.deprecated.sql
-- ============================================================================

create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. Organizations (Tenants)
-- ============================================================================

create table if not exists public.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  plan text not null default 'starter' check (plan in ('starter', 'growth', 'enterprise')),
  billing_cycle text not null default 'monthly' check (billing_cycle in ('monthly', 'yearly')),
  reactivation_days integer not null default 60,
  trial_ends_at timestamptz default (now() + interval '14 days'),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Regional Operating Hubs
create table if not exists public.regions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  name text not null,
  code text not null,
  created_at timestamptz default now()
);

-- 3. Profiles (User Membership & RBAC)
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid not null references public.orgs(id) on delete cascade,
  role text not null default 'salesperson' check (role in ('owner', 'manager', 'salesperson', 'closer', 'boss', 'admin')),
  region_id uuid references public.regions(id) on delete set null,
  full_name text not null,
  phone text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. Pipeline Stages (Configurable per Organization)
create table if not exists public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  name text not null,
  slug text not null,
  sort_order integer not null default 0,
  color text default '#6366f1',
  created_at timestamptz default now()
);

-- 5. Projects (Development Catalogs)
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  region_id uuid references public.regions(id) on delete set null,
  name text not null,
  developer text not null,
  location text not null,
  price_range text,
  status text not null default 'active' check (status in ('active', 'launching_soon', 'completed')),
  created_at timestamptz default now()
);

-- 6. People (Master Contact Records with Normalized Phone Dedup Anchor)
create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  phone_normalized text,
  name text not null,
  phone text not null,
  email text,
  city text,
  source text default 'Direct',
  budget numeric(15, 2),
  preferred_configuration text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Unique index per organization for phone deduplication
create unique index if not exists idx_people_org_phone_norm on public.people(org_id, coalesce(phone_normalized, phone));

-- 7. Project Contacts (Join Table: Project <-> Person Stakeholders with Roles)
create table if not exists public.project_contacts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  role text not null default 'other' check (role in ('owner', 'builder', 'architect', 'engineer', 'guard', 'channel_partner', 'other')),
  notes text,
  created_at timestamptz default now()
);

-- 8. Project Units (Inventory Matrix)
create table if not exists public.project_units (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  tower text not null,
  unit_number text not null,
  floor integer not null,
  configuration text not null,
  super_area_sq_ft integer not null,
  price numeric(15, 2) not null,
  status text not null default 'available' check (status in ('available', 'hold', 'site_visit', 'negotiation', 'booked', 'sold')),
  facing text,
  assigned_lead_id uuid,
  assigned_buyer_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 9. Leads (Opportunities & Sales Dossier)
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  person_id uuid references public.people(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  stage_id uuid references public.pipeline_stages(id) on delete set null,
  salesperson_id uuid references public.profiles(user_id) on delete set null,
  person_name text not null,
  phone text not null,
  phone_normalized text,
  email text,
  project_name text,
  region_id uuid references public.regions(id) on delete set null,
  region_name text,
  budget numeric(15, 2) not null default 0,
  stage text not null default 'new' check (stage in ('new', 'contacted', 'qualified', 'site_visit', 'negotiation', 'won', 'lost')),
  source text default 'Portal Inbound',
  lead_score integer default 80 check (lead_score between 0 and 100),
  lead_score_label text default 'Warm' check (lead_score_label in ('Hot', 'Warm', 'Cold')),
  deal_health text default 'strong' check (deal_health in ('strong', 'neutral', 'at_risk')),
  deal_health_reason text,
  recommended_action text,
  configuration_preference text,
  preferred_floor text,
  facing_preference text,
  buyer_intent text,
  decision_makers text,
  buying_signals text[],
  objections text[],
  last_conversation_summary text,
  suggested_next_move text,
  assigned_unit_id uuid references public.project_units(id) on delete set null,
  assigned_unit_number text,
  days_in_stage integer default 0,
  last_activity_text text default 'Lead created',
  last_activity_at timestamptz default now(),
  next_follow_up_at text,
  follow_up_status text default 'upcoming' check (follow_up_status in ('due_today', 'upcoming', 'overdue', 'completed')),
  lost_at timestamptz,
  lost_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 10. Activities (Immutable Touchpoint Audit Trail)
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  person_id uuid references public.people(id) on delete set null,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  user_name text not null,
  person_name text not null,
  type text not null check (type in ('call', 'whatsapp', 'site_visit', 'meeting', 'note', 'stage_change', 'booking', 'ai_agent')),
  duration_seconds integer default 0,
  outcome text,
  outcome_label text,
  notes text,
  scheduled_follow_up_at text,
  occurred_at timestamptz default now(),
  created_at timestamptz default now()
);

-- 11. Tasks (Calling Queue & SLAs)
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  salesperson_id uuid not null references public.profiles(user_id) on delete cascade,
  person_name text not null,
  phone text not null,
  project_name text,
  title text not null,
  due_date text not null,
  due_time text,
  status text not null default 'due_today' check (status in ('due_today', 'upcoming', 'overdue', 'completed')),
  priority text not null default 'high' check (priority in ('high', 'medium', 'low')),
  created_from_activity_id uuid references public.activities(id) on delete set null,
  created_at timestamptz default now()
);

-- 12. Documents (Photos, Brochures, Floor Plans)
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  title text not null,
  file_url text not null,
  type text not null default 'brochure' check (type in ('brochure', 'floor_plan', 'cost_sheet', 'kyc', 'agreement', 'photo', 'other')),
  created_at timestamptz default now()
);

-- 13. Audit Log (Security & Compliance History)
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  actor_id uuid references public.profiles(user_id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  diff jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- 14. Webhook Events (Idempotent Ingestion Log) [ported from enterprise schema]
create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.orgs(id) on delete cascade,
  provider varchar(50) not null check (provider in ('whatsapp', 'meta_ads', 'website')),
  event_type varchar(100) not null,
  idempotency_key varchar(255) unique not null,
  payload jsonb not null,
  status varchar(30) not null default 'pending' check (status in ('pending', 'processed', 'failed')),
  error_message text,
  processed_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_webhooks_idempotency on public.webhook_events(idempotency_key);

-- 15. AI Agent Executions (Agent Telemetry & Cost Tracking) [ported]
create table if not exists public.ai_agent_executions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  session_id varchar(100) not null,
  agent_name varchar(100) not null check (agent_name in ('aria_intake', 'lost_lead_resurrector')),
  lead_id uuid references public.leads(id) on delete set null,
  tool_invoked varchar(100) not null,
  tool_input jsonb not null,
  tool_output jsonb not null,
  prompt_tokens integer default 0,
  completion_tokens integer default 0,
  latency_ms integer default 0,
  status varchar(30) not null default 'success' check (status in ('success', 'failed', 'timeout', 'cancelled')),
  executed_by_user_id uuid references public.profiles(user_id) on delete set null,
  executed_at timestamptz default now()
);
create index if not exists idx_ai_agent_org on public.ai_agent_executions(org_id, agent_name, executed_at desc);

-- 16. Webhook Sources (Tenant Resolution Map)
-- Maps an inbound provider identifier (WhatsApp phone_number_id / Meta page_id)
-- to the organization that owns it. Webhooks MUST resolve through this table
-- before writing any tenant data with the service-role client.
create table if not exists public.webhook_sources (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  provider varchar(50) not null check (provider in ('whatsapp', 'meta_ads')),
  external_id text not null,
  label text,
  created_at timestamptz default now(),
  unique (provider, external_id)
);
create index if not exists idx_webhook_sources_lookup on public.webhook_sources(provider, external_id);

-- ============================================================================
-- INDEXES FOR TENANT ISOLATION & QUERY PERFORMANCE
-- ============================================================================

create index if not exists idx_regions_org on public.regions(org_id);
create index if not exists idx_profiles_org on public.profiles(org_id);
create index if not exists idx_pipeline_stages_org on public.pipeline_stages(org_id, sort_order);
create index if not exists idx_projects_org on public.projects(org_id);
create index if not exists idx_project_contacts_org_proj on public.project_contacts(org_id, project_id);
create index if not exists idx_project_units_org_proj on public.project_units(org_id, project_id);
create index if not exists idx_leads_org_rep_stage on public.leads(org_id, salesperson_id, stage);
create index if not exists idx_activities_org_lead_date on public.activities(org_id, lead_id, occurred_at desc);
create index if not exists idx_tasks_org_rep_status on public.tasks(org_id, salesperson_id, status);
create index if not exists idx_documents_org_proj on public.documents(org_id, project_id);
create index if not exists idx_audit_log_org_created on public.audit_log(org_id, created_at desc);

-- ============================================================================
-- HELPER FUNCTIONS FOR FAST SECURE RLS EVALUATION
-- ============================================================================

create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from public.profiles where user_id = auth.uid() limit 1;
$$;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where user_id = auth.uid() limit 1;
$$;

-- Phone normalization [ported from enterprise schema]
create or replace function public.normalize_phone(phone_input text)
returns text
language plpgsql
immutable
as $$
declare
  cleaned text;
begin
  if phone_input is null then
    return null;
  end if;
  cleaned := regexp_replace(phone_input, '\D', '', 'g');
  if length(cleaned) = 10 then
    return '+91' || cleaned;
  elsif length(cleaned) = 12 and cleaned like '91%' then
    return '+' || cleaned;
  elsif length(cleaned) = 11 and cleaned like '0%' then
    return '+91' || substr(cleaned, 2);
  else
    return '+' || cleaned;
  end if;
end;
$$;

-- Function to seed default pipeline stages for a new organization
create or replace function public.seed_default_pipeline_stages(new_org_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.pipeline_stages (org_id, name, slug, sort_order, color)
  values
    (new_org_id, 'New Inflow', 'new', 1, '#3b82f6'),
    (new_org_id, 'Contacted', 'contacted', 2, '#6366f1'),
    (new_org_id, 'Qualified', 'qualified', 3, '#8b5cf6'),
    (new_org_id, 'Site Visit', 'site_visit', 4, '#ec4899'),
    (new_org_id, 'Negotiation', 'negotiation', 5, '#f59e0b'),
    (new_org_id, 'Won Deals', 'won', 6, '#10b981'),
    (new_org_id, 'Lost', 'lost', 7, '#ef4444')
  on conflict do nothing;
end;
$$;

-- ============================================================================
-- ORG BOOTSTRAP: new signup provisions org + profile automatically.
-- Org name/slug come from signup metadata (raw_user_meta_data.org_name).
-- The creating user becomes 'owner'. This runs as a security-definer trigger
-- because no RLS policy can allow INSERT into a tenant that doesn't exist yet.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  new_org_id uuid;
  org_slug text;
  v_full_name text;
  v_org_name text;
  v_phone text;
begin
  v_org_name := coalesce(nullif(new.raw_user_meta_data->>'org_name', ''), 'My Organization');
  v_full_name := coalesce(
    nullif(new.raw_user_meta_data->>'full_name', ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Real Estate Agent'
  );
  v_phone := nullif(new.raw_user_meta_data->>'phone', '');

  -- Generate unique slug from org name + short random suffix using built-in gen_random_uuid
  org_slug := lower(regexp_replace(v_org_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(gen_random_uuid()::text, 1, 6);

  insert into public.orgs (name, slug)
  values (v_org_name, org_slug)
  returning id into new_org_id;

  insert into public.profiles (user_id, org_id, role, full_name, phone)
  values (
    new.id,
    new_org_id,
    'owner',
    v_full_name,
    v_phone
  );

  perform public.seed_default_pipeline_stages(new_org_id);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================================
-- AUTOMATIC TRIGGERS & BUSINESS LOGIC
-- ============================================================================

-- Normalize + dedup anchor before writing to people
create or replace function public.trg_normalize_person_phone()
returns trigger
language plpgsql
as $$
begin
  new.phone_normalized := public.normalize_phone(new.phone);
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_people_phone_normalization on public.people;
create trigger trg_people_phone_normalization
  before insert or update on public.people
  for each row execute function public.trg_normalize_person_phone();

-- Auto updated_at
create or replace function public.trg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_orgs_updated_at on public.orgs;
create trigger trg_orgs_updated_at before update on public.orgs for each row execute function public.trg_set_updated_at();
drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles for each row execute function public.trg_set_updated_at();
drop trigger if exists trg_people_updated_at on public.people;
create trigger trg_people_updated_at before update on public.people for each row execute function public.trg_set_updated_at();
drop trigger if exists trg_project_units_updated_at on public.project_units;
create trigger trg_project_units_updated_at before update on public.project_units for each row execute function public.trg_set_updated_at();
drop trigger if exists trg_leads_updated_at on public.leads;
create trigger trg_leads_updated_at before update on public.leads for each row execute function public.trg_set_updated_at();

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY ACROSS ALL TENANT TABLES
-- ============================================================================

alter table public.orgs enable row level security;
alter table public.regions enable row level security;
alter table public.profiles enable row level security;
alter table public.pipeline_stages enable row level security;
alter table public.projects enable row level security;
alter table public.project_contacts enable row level security;
alter table public.project_units enable row level security;
alter table public.people enable row level security;
alter table public.leads enable row level security;
alter table public.activities enable row level security;
alter table public.tasks enable row level security;
alter table public.documents enable row level security;
alter table public.audit_log enable row level security;
alter table public.webhook_events enable row level security;
alter table public.ai_agent_executions enable row level security;
alter table public.webhook_sources enable row level security;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- 1. Orgs Policies
create policy "Users can view their own organization"
  on public.orgs for select
  using (id = public.current_org_id());

create policy "Users can create their own organization during bootstrap"
  on public.orgs for insert
  with check (true); -- constrained by handle_new_user trigger; service-role/webhooks use service key

create policy "Owners/Admins can update their organization"
  on public.orgs for update
  using (id = public.current_org_id() and public.current_user_role() in ('owner', 'admin', 'boss'));

-- 2. Profiles Policies
create policy "Users can view profiles in their organization"
  on public.profiles for select
  using (org_id = public.current_org_id());

create policy "Admins/Managers can update profiles in their organization"
  on public.profiles for update
  using (org_id = public.current_org_id() and public.current_user_role() in ('owner', 'admin', 'boss', 'manager'));

-- 3. Pipeline Stages Policies
create policy "Org members can view pipeline stages"
  on public.pipeline_stages for select
  using (org_id = public.current_org_id());

create policy "Admins/Managers can manage pipeline stages"
  on public.pipeline_stages for all
  using (org_id = public.current_org_id() and public.current_user_role() in ('owner', 'admin', 'boss', 'manager'));

-- 4. Regions Policies
create policy "Org members can view regions"
  on public.regions for select
  using (org_id = public.current_org_id());

create policy "Admins/Managers can manage regions"
  on public.regions for all
  using (org_id = public.current_org_id() and public.current_user_role() in ('owner', 'admin', 'boss', 'manager'));

-- 5. Projects & Stakeholders Policies
create policy "Org members can view projects"
  on public.projects for select
  using (org_id = public.current_org_id());

create policy "Admins/Managers can modify projects"
  on public.projects for all
  using (org_id = public.current_org_id() and public.current_user_role() in ('owner', 'admin', 'boss', 'manager'));

create policy "Org members can view project contacts"
  on public.project_contacts for select
  using (org_id = public.current_org_id());

create policy "Org members can manage project contacts"
  on public.project_contacts for all
  using (org_id = public.current_org_id());

create policy "Org members can view units"
  on public.project_units for select
  using (org_id = public.current_org_id());

create policy "Org members can update unit status"
  on public.project_units for update
  using (org_id = public.current_org_id());

-- 6. People / Contacts Policies
create policy "Org members can view people"
  on public.people for select
  using (org_id = public.current_org_id());

create policy "Org members can manage people"
  on public.people for all
  using (org_id = public.current_org_id());

-- 7. Leads Policies (Role-Aware Scoping)
-- Salespeople see assigned leads; Managers/Admins/Boss see all leads in org
create policy "Leads select policy with role scoping"
  on public.leads for select
  using (
    org_id = public.current_org_id()
    and (
      salesperson_id = auth.uid()
      or public.current_user_role() in ('owner', 'admin', 'boss', 'manager')
    )
  );

create policy "Leads insert policy"
  on public.leads for insert
  with check (org_id = public.current_org_id());

create policy "Leads update policy"
  on public.leads for update
  using (
    org_id = public.current_org_id()
    and (
      salesperson_id = auth.uid()
      or public.current_user_role() in ('owner', 'admin', 'boss', 'manager')
    )
  );

create policy "Leads delete policy"
  on public.leads for delete
  using (org_id = public.current_org_id() and public.current_user_role() in ('owner', 'admin', 'boss'));

-- 8. Activities Policies
create policy "Activities select policy"
  on public.activities for select
  using (org_id = public.current_org_id());

create policy "Activities insert policy"
  on public.activities for insert
  with check (org_id = public.current_org_id());

-- Activities are immutable: no update/delete policies granted to client roles.

-- 9. Tasks Policies
create policy "Tasks select policy"
  on public.tasks for select
  using (
    org_id = public.current_org_id()
    and (
      salesperson_id = auth.uid()
      or public.current_user_role() in ('owner', 'admin', 'boss', 'manager')
    )
  );

create policy "Tasks manage policy"
  on public.tasks for all
  using (org_id = public.current_org_id());

-- 10. Documents Policies
create policy "Documents select policy"
  on public.documents for select
  using (org_id = public.current_org_id());

create policy "Documents manage policy"
  on public.documents for all
  using (org_id = public.current_org_id());

-- 11. AI Agent Executions Policies
create policy "AI executions select policy"
  on public.ai_agent_executions for select
  using (org_id = public.current_org_id());

create policy "AI executions insert policy"
  on public.ai_agent_executions for insert
  with check (org_id = public.current_org_id());

-- 12. Webhook Events: NO client-facing policies.
-- Service-role only (used by API routes). Table remains RLS-enabled with zero
-- policies so anon/authenticated clients can never read raw webhook payloads.

-- 12b. Webhook Sources: owner/admin managed via the app
create policy "Admins can manage webhook sources"
  on public.webhook_sources for all
  using (org_id = public.current_org_id() and public.current_user_role() in ('owner', 'admin', 'boss'));

-- 13. Audit Log Policies
create policy "Admins/Managers can view audit logs"
  on public.audit_log for select
  using (org_id = public.current_org_id() and public.current_user_role() in ('owner', 'admin', 'boss', 'manager'));

create policy "Audit log insert policy"
  on public.audit_log for insert
  with check (org_id = public.current_org_id());

-- ====================================================================
-- MIGRATION 0018: Phase 12 — Real Estate Sales & Property Intelligence
-- Complete Domain Model: Area -> Society -> Tower -> Floor -> Unit
-- Flexible People & External Organizations, Temporal Relationship Graph,
-- Structured Sales Memory, Unit Price History & Server-Side Search RPCs
-- ====================================================================

create extension if not exists "pg_trgm";

-- ====================================================================
-- 1. PROPERTY AREAS / LOCALITIES
-- ====================================================================

create table if not exists public.property_areas (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  region_id uuid references public.regions(id) on delete set null,
  name text not null,
  slug text not null,
  city text not null default 'Gurugram',
  state text not null default 'Haryana',
  pincode text,
  tier text default 'luxury' check (tier in ('luxury', 'ultra_luxury', 'premium', 'affordable')),
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists idx_property_areas_org_slug on public.property_areas(org_id, slug);
create index if not exists idx_property_areas_region on public.property_areas(org_id, region_id);

-- Auto updated_at
drop trigger if exists trg_property_areas_updated_at on public.property_areas;
create trigger trg_property_areas_updated_at
  before update on public.property_areas
  for each row execute function public.trg_set_updated_at();

-- ====================================================================
-- 2. ENHANCE PROJECTS / SOCIETIES
-- ====================================================================

alter table public.projects
  add column if not exists area_id uuid references public.property_areas(id) on delete set null,
  add column if not exists society_type text default 'gated_community' check (society_type in ('gated_community', 'high_rise', 'luxury_township', 'builder_floors', 'commercial_hub', 'mixed_use')),
  add column if not exists total_towers integer default 1,
  add column if not exists total_units_count integer default 0,
  add column if not exists possession_year integer,
  add column if not exists gated_security_type text default '3_tier' check (gated_security_type in ('24x7_guards', '3_tier', 'biometric_smart', 'unrestricted')),
  add column if not exists rera_registration_number text,
  add column if not exists master_amenities text[] default array[]::text[],
  add column if not exists maintenance_contact_phone text,
  add column if not exists society_office_address text;

create index if not exists idx_projects_area on public.projects(org_id, area_id);

-- ====================================================================
-- 3. PROJECT TOWERS / BLOCKS
-- ====================================================================

create table if not exists public.project_towers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  tower_code text,
  total_floors integer not null default 1,
  units_per_floor integer default 4,
  elevators_count integer default 2,
  possession_date date,
  construction_status text default 'ready' check (construction_status in ('under_construction', 'ready', 'launching')),
  facing_direction text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists idx_project_towers_org_proj_name on public.project_towers(org_id, project_id, name);
create index if not exists idx_project_towers_project on public.project_towers(org_id, project_id);

drop trigger if exists trg_project_towers_updated_at on public.project_towers;
create trigger trg_project_towers_updated_at
  before update on public.project_towers
  for each row execute function public.trg_set_updated_at();

-- ====================================================================
-- 4. ENHANCE PROJECT UNITS / FLATS
-- ====================================================================

alter table public.project_units
  add column if not exists tower_id uuid references public.project_towers(id) on delete set null,
  add column if not exists unit_type text default 'apartment' check (unit_type in ('apartment', 'penthouse', 'villa', 'builder_floor', 'duplex', 'plot', 'commercial')),
  add column if not exists carpet_area_sq_ft integer,
  add column if not exists built_up_area_sq_ft integer,
  add column if not exists balconies_count integer default 1,
  add column if not exists bathrooms_count integer default 2,
  add column if not exists parking_slots integer default 1,
  add column if not exists parking_type text default 'covered' check (parking_type in ('covered', 'open', 'basement_stack', 'none')),
  add column if not exists is_corner_unit boolean default false,
  add column if not exists furnishing_status text default 'semi_furnished' check (furnishing_status in ('unfurnished', 'semi_furnished', 'fully_furnished', 'bare_shell')),
  add column if not exists physical_condition text default 'good' check (physical_condition in ('brand_new', 'excellent', 'good', 'needs_renovation')),
  add column if not exists view_type text,
  
  -- Commercial Intelligence
  add column if not exists asking_price numeric(15, 2),
  add column if not exists estimated_market_price numeric(15, 2),
  add column if not exists last_transacted_price numeric(15, 2),
  add column if not exists last_transacted_date date,
  add column if not exists maintenance_monthly numeric(10, 2),
  add column if not exists expected_monthly_rent numeric(10, 2),
  add column if not exists rental_yield_pct numeric(5, 2),
  
  -- Occupancy & Resale / Sale Intelligence
  add column if not exists occupancy_status text default 'unknown' check (occupancy_status in ('owner_occupied', 'rented', 'vacant', 'under_fitout', 'unknown')),
  add column if not exists seller_intent text default 'unknown' check (seller_intent in ('actively_selling', 'soft_testing_market', 'willing_to_sell_at_price', 'not_selling', 'distress_sale', 'unknown')),
  add column if not exists seller_target_timeline text,
  add column if not exists listing_status text default 'unlisted' check (listing_status in ('unlisted', 'exclusive_mandate', 'open_market', 'private_pocket', 'off_market')),
  add column if not exists verification_status text default 'unverified' check (verification_status in ('verified', 'unverified', 'stale', 'disputed')),
  add column if not exists last_verified_at timestamptz,
  add column if not exists verified_by_user_id uuid references public.profiles(user_id) on delete set null,
  add column if not exists key_location text,
  add column if not exists unit_amenities text[] default array[]::text[],
  add column if not exists notes text;

create index if not exists idx_project_units_tower_id on public.project_units(org_id, tower_id);
create index if not exists idx_project_units_seller_intent on public.project_units(org_id, seller_intent, status);
create index if not exists idx_project_units_listing_status on public.project_units(org_id, listing_status);

-- ====================================================================
-- 5. EXTERNAL ORGANIZATIONS
-- ====================================================================

create table if not exists public.external_organizations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  name text not null,
  org_type text not null check (org_type in ('developer', 'rwa', 'property_management', 'brokerage', 'architect', 'contractor', 'law_firm', 'channel_partner', 'vendor', 'other')),
  phone text,
  email text,
  website text,
  office_address text,
  city text,
  gstin text,
  rera_id text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists idx_ext_orgs_org_name on public.external_organizations(org_id, lower(name));
create index if not exists idx_ext_orgs_type on public.external_organizations(org_id, org_type);

drop trigger if exists trg_external_organizations_updated_at on public.external_organizations;
create trigger trg_external_organizations_updated_at
  before update on public.external_organizations
  for each row execute function public.trg_set_updated_at();

-- ====================================================================
-- 6. UNIVERSAL TEMPORAL RELATIONSHIP GRAPH (entity_relationships)
-- ====================================================================

create table if not exists public.entity_relationships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  
  -- Subject (Person / Org / User / Lead)
  subject_type text not null check (subject_type in ('person', 'organization', 'user', 'lead')),
  subject_id uuid not null,
  
  -- Predicate (Relationship Nature)
  relationship_type text not null check (relationship_type in (
    'owns', 'co_owns', 'previously_owned', 'rents', 'previously_rented', 'investor_in',
    'rwa_president', 'rwa_secretary', 'rwa_treasurer', 'rwa_member', 'facility_manager', 'society_guard', 'estate_manager',
    'exclusive_broker', 'channel_partner_for', 'representing_seller', 'representing_buyer', 'works_for', 'contractor_for',
    'developed_by', 'architect_of', 'constructed_by', 'managed_by',
    'family_member_of', 'referred_by', 'primary_contact_for', 'other'
  )),
  
  -- Target (Unit / Project / Person / Organization)
  target_type text not null check (target_type in ('unit', 'project', 'person', 'organization')),
  target_id uuid not null,
  
  -- Temporal Lifespan
  valid_from date,
  valid_until date,
  is_current boolean not null default true,
  
  -- Provenance, Confidence & Verification
  confidence_score integer default 100 check (confidence_score between 0 and 100),
  verification_status text default 'verified' check (verification_status in ('verified', 'historical', 'user_reported', 'inferred', 'disputed')),
  provenance_source text default 'salesperson_entry' check (provenance_source in (
    'salesperson_entry', 'registry_document', 'society_directory', 'owner_direct',
    'builder_data', 'broker_network', 'inbound_lead', 'ai_inferred'
  )),
  verified_at timestamptz,
  verified_by uuid references public.profiles(user_id) on delete set null,
  
  -- Commercial Terms & Metadata
  commercial_terms jsonb default '{}'::jsonb,
  notes text,
  
  created_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_rel_org_target on public.entity_relationships(org_id, target_type, target_id, is_current);
create index if not exists idx_rel_org_subject on public.entity_relationships(org_id, subject_type, subject_id, is_current);
create index if not exists idx_rel_org_type on public.entity_relationships(org_id, relationship_type, is_current);

drop trigger if exists trg_entity_relationships_updated_at on public.entity_relationships;
create trigger trg_entity_relationships_updated_at
  before update on public.entity_relationships
  for each row execute function public.trg_set_updated_at();

-- Ownership Transition Trigger: Automatically manage previous ownership when a new active 'owns' is inserted/updated
create or replace function public.trg_manage_unit_ownership_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- If setting a new current 'owns' relationship for a unit
  if (NEW.target_type = 'unit' and NEW.relationship_type = 'owns' and NEW.is_current = true) then
    -- Mark prior 'owns' relationships for this same unit as previously_owned
    update public.entity_relationships
    set
      is_current = false,
      relationship_type = 'previously_owned',
      valid_until = coalesce(valid_until, current_date),
      updated_at = now()
    where org_id = NEW.org_id
      and target_type = 'unit'
      and target_id = NEW.target_id
      and relationship_type = 'owns'
      and id <> coalesce(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      and is_current = true;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_ownership_lifecycle on public.entity_relationships;
create trigger trg_ownership_lifecycle
  after insert or update on public.entity_relationships
  for each row
  when (NEW.target_type = 'unit' and NEW.relationship_type = 'owns' and NEW.is_current = true)
  execute function public.trg_manage_unit_ownership_lifecycle();

-- ====================================================================
-- 7. STRUCTURED PROPERTY SALES MEMORY (property_facts)
-- ====================================================================

create table if not exists public.property_facts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  
  -- Entity Scope
  entity_type text not null check (entity_type in ('project', 'tower', 'unit', 'area')),
  entity_id uuid not null,
  
  -- Categorized Fact
  category text not null check (category in (
    'visitor_access_rules', 'society_regulations', 'owner_preferences', 'pricing_intelligence',
    'neighbourhood_context', 'construction_quality', 'amenity_status', 'legal_rera_status', 'general'
  )),
  title text not null,
  fact_statement text not null,
  
  -- Verification & Confidence
  verification_tier text not null default 'verified' check (verification_tier in (
    'verified', 'historical', 'user_provided', 'inferred', 'unknown'
  )),
  confidence_pct integer not null default 100 check (confidence_pct between 0 and 100),
  source_reference text,
  expires_at timestamptz,
  
  created_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_facts_org_entity on public.property_facts(org_id, entity_type, entity_id);
create index if not exists idx_facts_category on public.property_facts(org_id, category);

drop trigger if exists trg_property_facts_updated_at on public.property_facts;
create trigger trg_property_facts_updated_at
  before update on public.property_facts
  for each row execute function public.trg_set_updated_at();

-- ====================================================================
-- 8. UNIT PRICE HISTORY (unit_price_history)
-- ====================================================================

create table if not exists public.unit_price_history (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  unit_id uuid not null references public.project_units(id) on delete cascade,
  event_type text not null check (event_type in ('asking_price_change', 'market_valuation_update', 'transaction_closed', 'circle_rate_revision', 'rental_change')),
  old_price numeric(15, 2),
  new_price numeric(15, 2) not null,
  price_per_sq_ft numeric(10, 2),
  source text default 'salesperson_update',
  notes text,
  effective_date date not null default current_date,
  recorded_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists idx_price_hist_unit on public.unit_price_history(org_id, unit_id, effective_date desc);

-- Trigger: Automatically log asking price changes on project_units
create or replace function public.trg_log_unit_price_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (OLD.asking_price is distinct from NEW.asking_price and NEW.asking_price is not null) then
    insert into public.unit_price_history (
      org_id, unit_id, event_type, old_price, new_price, price_per_sq_ft, source, notes, effective_date, recorded_by
    ) values (
      NEW.org_id,
      NEW.id,
      'asking_price_change',
      OLD.asking_price,
      NEW.asking_price,
      case when coalesce(NEW.super_area_sq_ft, 0) > 0 then round(NEW.asking_price / NEW.super_area_sq_ft, 2) else null end,
      'unit_update',
      'Asking price modified via CRM',
      current_date,
      auth.uid()
    );
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_unit_price_change on public.project_units;
create trigger trg_unit_price_change
  after update on public.project_units
  for each row
  when (OLD.asking_price is distinct from NEW.asking_price)
  execute function public.trg_log_unit_price_change();

-- ====================================================================
-- 9. EXTENSIONS TO LEADS & ACTIVITIES
-- ====================================================================

alter table public.leads
  add column if not exists unit_id uuid references public.project_units(id) on delete set null,
  add column if not exists deal_type text default 'primary_sale' check (deal_type in ('primary_sale', 'resale', 'rental', 'investor_exit')),
  add column if not exists seller_lead_id uuid references public.leads(id) on delete set null;

alter table public.activities
  add column if not exists unit_id uuid references public.project_units(id) on delete set null;

alter table public.people
  add column if not exists occupation text,
  add column if not exists address text,
  add column if not exists vip_tier text default 'standard' check (vip_tier in ('standard', 'hni', 'ultra_hni', 'investor', 'nri')),
  add column if not exists tags text[] default array[]::text[];

-- ====================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

-- 10.1 Property Areas
alter table public.property_areas enable row level security;

create policy "Org members can view property areas"
  on public.property_areas for select
  using (org_id = public.current_org_id());

create policy "Managers can insert property areas"
  on public.property_areas for insert
  with check (
    org_id = public.current_org_id()
    and public.current_user_role() in ('owner', 'admin', 'boss', 'manager')
  );

create policy "Managers can update property areas"
  on public.property_areas for update
  using (
    org_id = public.current_org_id()
    and public.current_user_role() in ('owner', 'admin', 'boss', 'manager')
  );

create policy "Managers can delete property areas"
  on public.property_areas for delete
  using (
    org_id = public.current_org_id()
    and public.current_user_role() in ('owner', 'admin', 'boss', 'manager')
  );

-- 10.2 Project Towers
alter table public.project_towers enable row level security;

create policy "Org members can view project towers"
  on public.project_towers for select
  using (org_id = public.current_org_id());

create policy "Managers can insert project towers"
  on public.project_towers for insert
  with check (
    org_id = public.current_org_id()
    and public.current_user_role() in ('owner', 'admin', 'boss', 'manager')
  );

create policy "Managers can update project towers"
  on public.project_towers for update
  using (
    org_id = public.current_org_id()
    and public.current_user_role() in ('owner', 'admin', 'boss', 'manager')
  );

create policy "Managers can delete project towers"
  on public.project_towers for delete
  using (
    org_id = public.current_org_id()
    and public.current_user_role() in ('owner', 'admin', 'boss', 'manager')
  );

-- 10.3 External Organizations
alter table public.external_organizations enable row level security;

create policy "Org members can view external orgs"
  on public.external_organizations for select
  using (org_id = public.current_org_id());

create policy "Org members can insert external orgs"
  on public.external_organizations for insert
  with check (org_id = public.current_org_id());

create policy "Managers can update external orgs"
  on public.external_organizations for update
  using (org_id = public.current_org_id());

create policy "Managers can delete external orgs"
  on public.external_organizations for delete
  using (
    org_id = public.current_org_id()
    and public.current_user_role() in ('owner', 'admin', 'boss', 'manager')
  );

-- 10.4 Entity Relationships
alter table public.entity_relationships enable row level security;

create policy "Org members can view entity relationships"
  on public.entity_relationships for select
  using (org_id = public.current_org_id());

create policy "Org members can insert entity relationships"
  on public.entity_relationships for insert
  with check (org_id = public.current_org_id());

create policy "Org members can update entity relationships"
  on public.entity_relationships for update
  using (org_id = public.current_org_id());

create policy "Managers can delete entity relationships"
  on public.entity_relationships for delete
  using (
    org_id = public.current_org_id()
    and public.current_user_role() in ('owner', 'admin', 'boss', 'manager')
  );

-- 10.5 Property Facts
alter table public.property_facts enable row level security;

create policy "Org members can view property facts"
  on public.property_facts for select
  using (org_id = public.current_org_id());

create policy "Org members can insert property facts"
  on public.property_facts for insert
  with check (org_id = public.current_org_id());

create policy "Org members can update property facts"
  on public.property_facts for update
  using (org_id = public.current_org_id());

create policy "Managers can delete property facts"
  on public.property_facts for delete
  using (
    org_id = public.current_org_id()
    and public.current_user_role() in ('owner', 'admin', 'boss', 'manager')
  );

-- 10.6 Unit Price History
alter table public.unit_price_history enable row level security;

create policy "Org members can view unit price history"
  on public.unit_price_history for select
  using (org_id = public.current_org_id());

create policy "Org members can insert unit price history"
  on public.unit_price_history for insert
  with check (org_id = public.current_org_id());

-- ====================================================================
-- 11. AUDIT LOGGING ATTACHMENTS
-- ====================================================================

drop trigger if exists trg_audit_property_areas on public.property_areas;
create trigger trg_audit_property_areas
  after insert or update or delete on public.property_areas
  for each row execute function public.log_audit_event();

drop trigger if exists trg_audit_project_towers on public.project_towers;
create trigger trg_audit_project_towers
  after insert or update or delete on public.project_towers
  for each row execute function public.log_audit_event();

drop trigger if exists trg_audit_external_organizations on public.external_organizations;
create trigger trg_audit_external_organizations
  after insert or update or delete on public.external_organizations
  for each row execute function public.log_audit_event();

drop trigger if exists trg_audit_entity_relationships on public.entity_relationships;
create trigger trg_audit_entity_relationships
  after insert or update or delete on public.entity_relationships
  for each row execute function public.log_audit_event();

drop trigger if exists trg_audit_property_facts on public.property_facts;
create trigger trg_audit_property_facts
  after insert or update or delete on public.property_facts
  for each row execute function public.log_audit_event();

-- ====================================================================
-- 12. BACKWARD COMPATIBILITY VIEW (project_contacts)
-- ====================================================================

create or replace view public.project_contacts_view as
select
  er.id,
  er.org_id,
  er.target_id as project_id,
  er.subject_id as person_id,
  p.name,
  p.phone,
  er.relationship_type as role,
  er.notes,
  er.created_at
from public.entity_relationships er
join public.people p on p.id = er.subject_id and p.org_id = er.org_id
where er.target_type = 'project' and er.subject_type = 'person';

-- ====================================================================
-- 13. IDEMPOTENT DATA BACKFILL (Existing Towers & Relationships)
-- ====================================================================

do $$
declare
  r record;
  v_tower_id uuid;
begin
  -- 1. Create project_towers for existing distinct tower strings in project_units
  for r in
    select distinct org_id, project_id, tower
    from public.project_units
    where tower is not null and trim(tower) <> ''
  loop
    insert into public.project_towers (org_id, project_id, name, total_floors, construction_status)
    values (r.org_id, r.project_id, r.tower, 20, 'ready')
    on conflict (org_id, project_id, name) do nothing;

    select id into v_tower_id
    from public.project_towers
    where org_id = r.org_id and project_id = r.project_id and name = r.tower;

    if v_tower_id is not null then
      update public.project_units
      set tower_id = v_tower_id
      where org_id = r.org_id and project_id = r.project_id and tower = r.tower and tower_id is null;
    end if;
  end loop;

  -- 2. Migrate existing project_contacts into entity_relationships if not already migrated
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'project_contacts') then
    insert into public.entity_relationships (
      org_id, subject_type, subject_id, relationship_type, target_type, target_id, notes, is_current, confidence_score, verification_status, provenance_source
    )
    select
      pc.org_id,
      'person' as subject_type,
      pc.person_id as subject_id,
      case
        when pc.role in ('owner', 'builder', 'architect', 'engineer', 'guard', 'channel_partner') then
          case pc.role
            when 'owner' then 'owns'
            when 'builder' then 'developed_by'
            when 'architect' then 'architect_of'
            when 'guard' then 'society_guard'
            when 'channel_partner' then 'channel_partner_for'
            else 'primary_contact_for'
          end
        else 'other'
      end as relationship_type,
      'project' as target_type,
      pc.project_id as target_id,
      pc.notes,
      true as is_current,
      100 as confidence_score,
      'verified' as verification_status,
      'salesperson_entry' as provenance_source
    from public.project_contacts pc
    where not exists (
      select 1 from public.entity_relationships er
      where er.org_id = pc.org_id
        and er.subject_id = pc.person_id
        and er.target_id = pc.project_id
        and er.target_type = 'project'
    );
  end if;
end $$;

-- ====================================================================
-- 14. HIGH-PERFORMANCE MULTI-ENTITY SEARCH RPC (search_crm_entities)
-- ====================================================================

create or replace function public.search_crm_entities(
  p_org_id uuid,
  p_query text,
  p_limit integer default 15
)
returns table (
  id uuid,
  entity_type text,
  title text,
  subtitle text,
  badge text,
  metadata jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_q text;
begin
  v_q := trim(p_query);
  if v_q is null or length(v_q) = 0 then
    return;
  end if;

  return query
  -- 1. Units / Flats (Matched on unit_number, tower, configuration)
  select
    u.id,
    'unit'::text as entity_type,
    (p.name || ' • ' || u.tower || ' - ' || u.unit_number)::text as title,
    (u.configuration || ' • ' || u.super_area_sq_ft || ' sqft • ₹' || round(u.price / 10000000.0, 2) || ' Cr')::text as subtitle,
    u.status::text as badge,
    jsonb_build_object(
      'unitNumber', u.unit_number,
      'tower', u.tower,
      'projectId', u.project_id,
      'projectName', p.name,
      'price', u.price,
      'status', u.status,
      'sellerIntent', u.seller_intent,
      'floor', u.floor
    ) as metadata
  from public.project_units u
  join public.projects p on p.id = u.project_id and p.org_id = p_org_id
  where u.org_id = p_org_id
    and (
      u.unit_number ilike '%' || v_q || '%'
      or u.tower ilike '%' || v_q || '%'
      or (u.tower || ' ' || u.unit_number) ilike '%' || v_q || '%'
      or (u.tower || '-' || u.unit_number) ilike '%' || v_q || '%'
      or p.name ilike '%' || v_q || '%'
      or u.configuration ilike '%' || v_q || '%'
    )
  limit (p_limit / 2)

  union all

  -- 2. Projects / Societies
  select
    pr.id,
    'project'::text as entity_type,
    pr.name::text as title,
    (pr.developer || ' • ' || pr.location)::text as subtitle,
    pr.status::text as badge,
    jsonb_build_object(
      'developer', pr.developer,
      'location', pr.location,
      'societyType', pr.society_type,
      'totalTowers', pr.total_towers
    ) as metadata
  from public.projects pr
  where pr.org_id = p_org_id
    and (
      pr.name ilike '%' || v_q || '%'
      or pr.developer ilike '%' || v_q || '%'
      or pr.location ilike '%' || v_q || '%'
    )
  limit (p_limit / 3)

  union all

  -- 3. People (Owners, Buyers, Stakeholders, Phone Dedup)
  select
    pe.id,
    'person'::text as entity_type,
    pe.name::text as title,
    (pe.phone || coalesce(' • ' || pe.city, ''))::text as subtitle,
    coalesce(pe.vip_tier, 'Contact')::text as badge,
    jsonb_build_object(
      'phone', pe.phone,
      'email', pe.email,
      'city', pe.city,
      'budget', pe.budget,
      'vipTier', pe.vip_tier
    ) as metadata
  from public.people pe
  where pe.org_id = p_org_id
    and (
      pe.name ilike '%' || v_q || '%'
      or pe.phone ilike '%' || v_q || '%'
      or coalesce(pe.phone_normalized, '') ilike '%' || v_q || '%'
      or coalesce(pe.email, '') ilike '%' || v_q || '%'
    )
  limit (p_limit / 3);

end;
$$;

grant execute on function public.search_crm_entities(uuid, text, integer) to authenticated;

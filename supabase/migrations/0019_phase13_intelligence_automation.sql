-- ====================================================================
-- MIGRATION 0019: Phase 13 — Real Estate Intelligence & Automation
-- 1. Seller Opportunity Detection & Pipeline
-- 2. Site Visit Briefing Generator Cache & Protocols
-- 3. Stale Property Knowledge & Verification Engine
-- 4. Multi-Factor Reverse Matching RPCs & RLS Policies
-- ====================================================================

-- 1. SELLER OPPORTUNITIES TABLE
create table if not exists public.seller_opportunities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  unit_id uuid not null references public.project_units(id) on delete cascade,
  owner_id uuid references public.people(id) on delete set null,
  signal_type text not null check (signal_type in (
    'tenancy_expiring', 'vacant_unit', 'investor_exit_window', 'valuation_request',
    'repeated_price_enquiry', 'market_comp_transacted', 'distress_indicator', 'manual_prospect'
  )),
  signal_strength integer not null default 75 check (signal_strength between 0 and 100),
  estimated_valuation numeric(15, 2),
  suggested_pitch text,
  urgency text not null default 'medium' check (urgency in ('low', 'medium', 'high', 'urgent')),
  status text not null default 'detected' check (status in (
    'detected', 'assigned', 'contacted', 'valuation_presented', 'mandate_secured', 'dismissed', 'listed'
  )),
  assigned_to_user_id uuid references public.profiles(user_id) on delete set null,
  ai_rationale text,
  metadata jsonb default '{}'::jsonb,
  last_contacted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_seller_opps_org_status on public.seller_opportunities(org_id, status);
create index if not exists idx_seller_opps_unit on public.seller_opportunities(org_id, unit_id);
create index if not exists idx_seller_opps_assigned on public.seller_opportunities(org_id, assigned_to_user_id);

-- Auto updated_at
drop trigger if exists trg_seller_opportunities_updated_at on public.seller_opportunities;
create trigger trg_seller_opportunities_updated_at
  before update on public.seller_opportunities
  for each row execute function public.trg_set_updated_at();

-- Audit trigger
drop trigger if exists trg_audit_seller_opportunities on public.seller_opportunities;
create trigger trg_audit_seller_opportunities
  after insert or update or delete on public.seller_opportunities
  for each row execute function public.log_audit_event();

-- RLS for Seller Opportunities
alter table public.seller_opportunities enable row level security;

create policy "Org members can view seller opportunities"
  on public.seller_opportunities for select
  using (org_id = public.current_org_id());

create policy "Org members can insert seller opportunities"
  on public.seller_opportunities for insert
  with check (org_id = public.current_org_id());

create policy "Org members can update seller opportunities"
  on public.seller_opportunities for update
  using (org_id = public.current_org_id());

create policy "Managers can delete seller opportunities"
  on public.seller_opportunities for delete
  using (
    org_id = public.current_org_id()
    and public.current_user_role() in ('owner', 'admin', 'boss', 'manager')
  );

-- 2. ENHANCE LEADS TABLE FOR DIRECT UNIT RESERVATION & RESALE LINKING
alter table public.leads
  add column if not exists seller_opportunity_id uuid references public.seller_opportunities(id) on delete set null,
  add column if not exists unit_reservation_expires_at timestamptz,
  add column if not exists cost_sheet_breakdown jsonb default '{}'::jsonb;

-- 3. SITE VISIT PRE-BRIEFINGS TABLE (Immutable Briefing Log)
create table if not exists public.site_visit_briefings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  unit_id uuid not null references public.project_units(id) on delete cascade,
  activity_id uuid references public.activities(id) on delete set null,
  scheduled_at timestamptz not null,
  gate_access_protocol text,
  parking_instructions text,
  owner_expectations_summary text,
  buyer_preferences_summary text,
  previous_objections text[] default array[]::text[],
  talking_points text[] default array[]::text[],
  generated_by_ai boolean default true,
  viewed_by_salesperson_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_site_briefings_lead on public.site_visit_briefings(org_id, lead_id);
create index if not exists idx_site_briefings_sched on public.site_visit_briefings(org_id, scheduled_at);

alter table public.site_visit_briefings enable row level security;

create policy "Org members can view site visit briefings"
  on public.site_visit_briefings for select
  using (org_id = public.current_org_id());

create policy "Org members can insert site visit briefings"
  on public.site_visit_briefings for insert
  with check (org_id = public.current_org_id());

-- 4. AUTOMATED STALE FACT VERIFICATION RPC
create or replace function public.scan_and_flag_stale_property_knowledge(p_org_id uuid)
returns table (
  stale_facts_count integer,
  stale_units_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_facts_count integer := 0;
  v_units_count integer := 0;
begin
  -- 1. Flag property facts older than 180 days without update
  update public.property_facts
  set verification_tier = 'historical',
      updated_at = now()
  where org_id = p_org_id
    and verification_tier = 'verified'
    and created_at < (now() - interval '180 days');
  get diagnostics v_facts_count = row_count;

  -- 2. Flag units not verified in 180 days
  update public.project_units
  set verification_status = 'stale',
      updated_at = now()
  where org_id = p_org_id
    and verification_status = 'verified'
    and (last_verified_at is null or last_verified_at < (now() - interval '180 days'));
  get diagnostics v_units_count = row_count;

  return query select v_facts_count, v_units_count;
end;
$$;

grant execute on function public.scan_and_flag_stale_property_knowledge(uuid) to authenticated;

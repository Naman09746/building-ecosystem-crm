-- ====================================================================
-- MIGRATION 0020: EcosystemRealty 2.0 — Enterprise Real Estate Domain Model
-- 1. People Entity (Decoupled from Leads) & Multi-Contact Registry
-- 2. Structured Buyer Requirements (Multi-Requirement Profile Engine)
-- 3. Property Listings & Seller Mandates (Exclusive / Open Mandate Lifecycle)
-- 4. Chronological Negotiation Ledger & Bid Rounds
-- 5. Operational Site Visit Dispatches (Gate 2 Passes, Parking & Checklists)
-- 6. Financial Commission Ledgers (Brokerage Splits, GST, TDS, Invoices)
-- ====================================================================

-- ====================================================================
-- 1. PEOPLE REGISTRY (First-Class Identity decoupled from Leads)
-- ====================================================================

-- Ensure public.people exists and has all enterprise columns
create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  name text,
  phone text,
  phone_normalized text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.people
  add column if not exists full_name text,
  add column if not exists primary_phone text,
  add column if not exists secondary_phone text,
  add column if not exists whatsapp_number text,
  add column if not exists email text,
  add column if not exists secondary_email text,
  add column if not exists avatar_url text,
  add column if not exists preferred_language text default 'en',
  add column if not exists nationality text default 'Indian',
  add column if not exists is_nri boolean default false,
  add column if not exists resident_city text,
  add column if not exists resident_address text,
  add column if not exists pan_number text,
  add column if not exists aadhaar_last4 text,
  add column if not exists kyc_status text default 'pending' check (kyc_status in ('verified', 'pending', 'exempt', 'rejected')),
  add column if not exists kyc_verified_at timestamptz,
  add column if not exists wealth_tier text default 'hni' check (wealth_tier in ('uhni', 'hni', 'mass_affluent', 'retail', 'institutional')),
  add column if not exists primary_profession text,
  add column if not exists company_name text,
  add column if not exists designation text,
  add column if not exists primary_tags text[] default array[]::text[],
  add column if not exists notes text,
  add column if not exists is_vip boolean default false,
  add column if not exists do_not_contact boolean default false,
  add column if not exists created_by uuid references public.profiles(user_id) on delete set null;

-- Sync existing rows
update public.people set full_name = name where full_name is null and name is not null;
update public.people set primary_phone = coalesce(phone_normalized, phone) where primary_phone is null and phone is not null;

-- Bi-directional sync trigger for legacy name/phone vs full_name/primary_phone
create or replace function public.trg_sync_people_names_phones()
returns trigger language plpgsql as $$
begin
  if new.full_name is null and new.name is not null then
    new.full_name := new.name;
  elsif new.name is null and new.full_name is not null then
    new.name := new.full_name;
  end if;

  if new.primary_phone is null and new.phone is not null then
    new.primary_phone := coalesce(new.phone_normalized, new.phone);
  elsif new.phone is null and new.primary_phone is not null then
    new.phone := new.primary_phone;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_people_columns on public.people;
create trigger trg_sync_people_columns
  before insert or update on public.people
  for each row execute function public.trg_sync_people_names_phones();

create unique index if not exists idx_people_org_phone on public.people(org_id, coalesce(primary_phone, phone));
create index if not exists idx_people_org_name_trgm on public.people using gin(coalesce(full_name, name) gin_trgm_ops);
create index if not exists idx_people_org_email on public.people(org_id, email) where email is not null;
create index if not exists idx_people_wealth on public.people(org_id, wealth_tier);

drop trigger if exists trg_people_updated_at on public.people;
create trigger trg_people_updated_at
  before update on public.people
  for each row execute function public.trg_set_updated_at();

-- Link Leads to People
alter table public.leads
  add column if not exists person_id uuid references public.people(id) on delete set null,
  add column if not exists secondary_phone text,
  add column if not exists preferred_city text default 'Gurugram',
  add column if not exists preferred_micro_markets text[] default array[]::text[];

create index if not exists idx_leads_person_id on public.leads(org_id, person_id);

-- ====================================================================
-- 2. STRUCTURED BUYER REQUIREMENTS
-- ====================================================================

create table if not exists public.buyer_requirements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  
  -- Purpose & Intent
  property_category text not null default 'residential' check (property_category in ('residential', 'commercial', 'plot_land', 'penthouse', 'farmhouse', 'retail')),
  transaction_intent text not null default 'self_use' check (transaction_intent in ('self_use', 'long_term_investment', 'rental_yield', 'upgrade', 'downsizing', 'relocation')),
  market_segment text not null default 'secondary_resale' check (market_segment in ('primary_builder', 'secondary_resale', 'rental_lease', 'both')),
  
  -- Financial Constraints (INR)
  budget_min numeric(15, 2) not null,
  budget_preferred numeric(15, 2) not null,
  budget_max numeric(15, 2) not null,
  funding_source text default 'bank_loan' check (funding_source in ('self_funded', 'bank_loan', 'part_liquidation', 'unknown')),
  
  -- Configuration & Sizing
  configurations text[] not null default array['3 BHK', '4 BHK']::text[],
  carpet_area_min_sqft integer,
  carpet_area_max_sqft integer,
  super_area_min_sqft integer,
  super_area_max_sqft integer,
  
  -- Spatial & Floor Preferences
  preferred_floors text default 'high' check (preferred_floors in ('any', 'ground', 'low_1_5', 'mid_6_15', 'high_16_plus', 'penthouse_top')),
  facing_directions text[] default array[]::text[],
  view_preferences text[] default array[]::text[],
  is_vaastu_compliant_mandatory boolean default false,
  is_corner_unit_preferred boolean default false,
  servant_room_mandatory boolean default false,
  parking_slots_required integer default 2,
  
  -- Geographic Scope
  target_cities text[] not null default array['Gurugram']::text[],
  target_micro_markets text[] default array[]::text[],
  target_project_ids uuid[] default array[]::uuid[],
  
  -- Urgency & Timing
  timeline_urgency text default '30_days' check (timeline_urgency in ('immediate_7_days', '30_days', '3_months', '6_months', 'flexible')),
  
  -- State & Confidence
  confidence_score integer default 90 check (confidence_score between 0 and 100),
  is_active boolean default true,
  last_verified_at timestamptz default now(),
  verified_by uuid references public.profiles(user_id) on delete set null,
  
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_buyer_req_org_person on public.buyer_requirements(org_id, person_id);
create index if not exists idx_buyer_req_lead on public.buyer_requirements(org_id, lead_id);
create index if not exists idx_buyer_req_budget on public.buyer_requirements(org_id, budget_preferred, is_active);

drop trigger if exists trg_buyer_requirements_updated_at on public.buyer_requirements;
create trigger trg_buyer_requirements_updated_at
  before update on public.buyer_requirements
  for each row execute function public.trg_set_updated_at();

-- ====================================================================
-- 3. PROPERTY LISTINGS & SELLER MANDATES
-- ====================================================================

create table if not exists public.property_listings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  unit_id uuid not null references public.project_units(id) on delete cascade,
  
  -- Mandate Classification
  listing_type text not null default 'exclusive_mandate' check (listing_type in ('exclusive_mandate', 'semi_exclusive', 'open_market', 'builder_direct', 'pocket_listing')),
  listing_status text not null default 'active' check (listing_status in ('active', 'soft_hold', 'under_token', 'under_negotiation', 'sold', 'withdrawn', 'expired')),
  
  -- Pricing & Commercial Terms
  asking_price numeric(15, 2) not null,
  expected_price numeric(15, 2) not null,
  minimum_acceptable_price numeric(15, 2) not null, -- SENSITIVE SELLER PRICE FLOOR
  price_negotiable boolean default true,
  maintenance_charges_monthly numeric(10, 2),
  
  -- Mandate Validity
  mandate_start_date date not null default current_date,
  mandate_end_date date not null default (current_date + interval '90 days'),
  auto_renew boolean default false,
  
  -- Commission Terms
  seller_brokerage_pct numeric(4, 2) default 1.00,
  buyer_brokerage_pct numeric(4, 2) default 1.00,
  fixed_commission_amount numeric(15, 2),
  
  -- Key & Inspection Protocols
  keys_held_by text default 'owner' check (keys_held_by in ('agency_custody', 'society_guard', 'owner', 'tenant', 'caretaker')),
  key_location_details text,
  viewing_notice_required text default '2_hours' check (viewing_notice_required in ('instant', '2_hours', 'same_day', '24_hours')),
  gate_visitor_instructions text,
  
  -- Marketing Authorizations
  portal_syndication_allowed boolean default true,
  social_media_allowed boolean default true,
  photo_video_rights_verified boolean default true,
  
  -- Stakeholders
  owner_person_id uuid references public.people(id) on delete set null,
  assigned_agent_id uuid references public.profiles(user_id) on delete set null,
  
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_listings_org_unit on public.property_listings(org_id, unit_id);
create index if not exists idx_listings_status on public.property_listings(org_id, listing_status);
create index if not exists idx_listings_expiry on public.property_listings(org_id, mandate_end_date) where listing_status = 'active';

drop trigger if exists trg_property_listings_updated_at on public.property_listings;
create trigger trg_property_listings_updated_at
  before update on public.property_listings
  for each row execute function public.trg_set_updated_at();

-- ====================================================================
-- 3.5 DEALS & TRANSACTION CONTRACTS
-- ====================================================================

create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  unit_id uuid references public.project_units(id) on delete set null,
  deal_title text not null default 'Property Deal',
  status text not null default 'negotiation' check (status in ('active', 'negotiation', 'under_contract', 'won', 'lost')),
  deal_value numeric(15, 2) default 0,
  created_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_deals_org_lead on public.deals(org_id, lead_id);
create index if not exists idx_deals_org_unit on public.deals(org_id, unit_id);

alter table public.deals enable row level security;
drop policy if exists "Tenant isolation for deals" on public.deals;
create policy "Tenant isolation for deals" on public.deals
  for all using (org_id = (select org_id from public.profiles where user_id = auth.uid()));

-- ====================================================================
-- 4. CHRONOLOGICAL NEGOTIATION LEDGER & BID ROUNDS
-- ====================================================================

create table if not exists public.negotiation_rounds (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  deal_id uuid not null references public.deals(id) on delete cascade,
  unit_id uuid not null references public.project_units(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  
  -- Round Sequence & Bid Details
  round_number integer not null default 1,
  bidder_type text not null check (bidder_type in ('buyer_offer', 'seller_counter', 'mediator_compromise')),
  offered_price numeric(15, 2) not null,
  price_delta_from_ask numeric(15, 2),
  
  -- Payment Terms & Flexibility
  proposed_payment_plan text default 'clp' check (proposed_payment_plan in ('down_payment', 'clp', 'subvention', 'flexi_50_50', 'custom')),
  token_amount_proposed numeric(15, 2),
  token_cheque_available boolean default false,
  closing_timeline_days integer default 45,
  
  -- Special Conditions
  special_conditions text[] default array[]::text[],
  furnishing_inclusions text,
  car_parks_requested integer default 2,
  
  -- Outcome of this Round
  round_status text not null default 'pending_review' check (round_status in ('accepted', 'rejected', 'countered', 'pending_review', 'expired')),
  rejection_reason text,
  
  recorded_by uuid references public.profiles(user_id) on delete set null,
  recorded_at timestamptz default now()
);

create index if not exists idx_neg_rounds_deal on public.negotiation_rounds(org_id, deal_id, round_number);
create index if not exists idx_neg_rounds_unit on public.negotiation_rounds(org_id, unit_id);

-- ====================================================================
-- 5. OPERATIONAL SITE VISIT DISPATCHES
-- ====================================================================

create table if not exists public.site_visit_dispatches (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  unit_id uuid not null references public.project_units(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  
  -- Schedule & Dispatch
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  assigned_salesperson_id uuid not null references public.profiles(user_id) on delete cascade,
  backup_salesperson_id uuid references public.profiles(user_id) on delete set null,
  
  -- Gate & Logistics Intelligence
  gate_entry_name text default 'Gate 2 (Visitors)',
  digital_visitor_pass_pin text,
  visitor_parking_bay text,
  tower_elevator_access_card text,
  caretaker_contact_phone text,
  
  -- Operational Pre-Visit Checklist
  buyer_reconfirmed boolean default false,
  owner_access_cleared boolean default false,
  keys_verified boolean default false,
  cost_sheet_printed boolean default false,
  backup_units_selected uuid[] default array[]::uuid[],
  
  -- Status Machine
  dispatch_status text not null default 'scheduled' check (dispatch_status in ('scheduled', 'confirmed', 'en_route', 'in_progress', 'completed', 'rescheduled', 'no_show', 'cancelled')),
  
  -- Post-Visit Outcome & Survey
  buyer_feedback_sentiment text check (buyer_feedback_sentiment in ('loved_it', 'interested_needs_family', 'hesitant_on_price', 'disliked_layout', 'rejected')),
  buyer_liked_aspects text[] default array[]::text[],
  buyer_objections text[] default array[]::text[],
  offer_discussed numeric(15, 2),
  next_followup_date timestamptz,
  debrief_notes text,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_sv_dispatch_org_time on public.site_visit_dispatches(org_id, scheduled_start);
create index if not exists idx_sv_dispatch_rep on public.site_visit_dispatches(org_id, assigned_salesperson_id, scheduled_start);
create index if not exists idx_sv_dispatch_lead on public.site_visit_dispatches(org_id, lead_id);
create index if not exists idx_sv_dispatch_unit on public.site_visit_dispatches(org_id, unit_id);

drop trigger if exists trg_site_visit_dispatches_updated_at on public.site_visit_dispatches;
create trigger trg_site_visit_dispatches_updated_at
  before update on public.site_visit_dispatches
  for each row execute function public.trg_set_updated_at();

-- ====================================================================
-- 6. FINANCIAL COMMISSION LEDGERS
-- ====================================================================

create table if not exists public.commission_ledgers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  deal_id uuid not null references public.deals(id) on delete cascade,
  unit_id uuid not null references public.project_units(id) on delete cascade,
  
  -- Commercial Transaction Value
  final_transacted_value numeric(15, 2) not null,
  booking_date date not null default current_date,
  registration_date date,
  
  -- Total Brokerage Invoicing (Gross)
  buyer_brokerage_pct numeric(4, 2) default 1.00,
  buyer_brokerage_amount numeric(15, 2) not null,
  seller_brokerage_pct numeric(4, 2) default 1.00,
  seller_brokerage_amount numeric(15, 2) not null,
  total_gross_brokerage numeric(15, 2) not null,
  
  -- Statutory Indian Taxes
  gst_rate_pct numeric(4, 2) default 18.00,
  gst_amount numeric(15, 2) not null,
  tds_rate_pct numeric(4, 2) default 1.00,
  tds_deducted numeric(15, 2) not null,
  net_brokerage_receivable numeric(15, 2) not null,
  
  -- Distribution & Splits
  channel_partner_org_id uuid references public.external_organizations(id) on delete set null,
  channel_partner_commission_pct numeric(4, 2) default 0.00,
  channel_partner_payout numeric(15, 2) default 0.00,
  
  salesperson_user_id uuid references public.profiles(user_id) on delete set null,
  salesperson_incentive_pct numeric(4, 2) default 10.00,
  salesperson_incentive_amount numeric(15, 2) default 0.00,
  
  manager_user_id uuid references public.profiles(user_id) on delete set null,
  manager_override_pct numeric(4, 2) default 3.00,
  manager_override_amount numeric(15, 2) default 0.00,
  
  company_net_retention numeric(15, 2) not null,
  
  -- Invoicing & Payment Collection
  invoice_number text,
  invoice_date date,
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'partially_paid', 'paid', 'overdue', 'written_off')),
  amount_collected numeric(15, 2) default 0.00,
  outstanding_balance numeric(15, 2) not null,
  
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_comm_ledger_org_deal on public.commission_ledgers(org_id, deal_id);
create index if not exists idx_comm_ledger_status on public.commission_ledgers(org_id, payment_status);
create index if not exists idx_comm_ledger_rep on public.commission_ledgers(org_id, salesperson_user_id);

drop trigger if exists trg_commission_ledgers_updated_at on public.commission_ledgers;
create trigger trg_commission_ledgers_updated_at
  before update on public.commission_ledgers
  for each row execute function public.trg_set_updated_at();

-- ====================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES FOR ALL 6 NEW TABLES
-- ====================================================================

alter table public.people enable row level security;
alter table public.buyer_requirements enable row level security;
alter table public.property_listings enable row level security;
alter table public.negotiation_rounds enable row level security;
alter table public.site_visit_dispatches enable row level security;
alter table public.commission_ledgers enable row level security;

-- Tenant Isolation Policies for authenticated users
create policy "Tenant isolation for people" on public.people
  for all using (org_id = (select org_id from public.profiles where user_id = auth.uid()));

create policy "Tenant isolation for buyer_requirements" on public.buyer_requirements
  for all using (org_id = (select org_id from public.profiles where user_id = auth.uid()));

create policy "Tenant isolation for property_listings" on public.property_listings
  for all using (org_id = (select org_id from public.profiles where user_id = auth.uid()));

create policy "Tenant isolation for negotiation_rounds" on public.negotiation_rounds
  for all using (org_id = (select org_id from public.profiles where user_id = auth.uid()));

create policy "Tenant isolation for site_visit_dispatches" on public.site_visit_dispatches
  for all using (org_id = (select org_id from public.profiles where user_id = auth.uid()));

create policy "Tenant isolation for commission_ledgers" on public.commission_ledgers
  for all using (org_id = (select org_id from public.profiles where user_id = auth.uid()));

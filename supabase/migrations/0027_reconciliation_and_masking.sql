-- ============================================================================
-- Ecosystem Realty — Migration 0027: Reconciliation, People Backfill & Price Floor Masking
-- ============================================================================

-- 1. Ensure orgs schema completeness (industry, complexity_mode, vertical_settings)
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'orgs' and column_name = 'industry'
  ) then
    alter table public.orgs 
      add column industry text not null default 'real_estate'
      check (industry in ('real_estate', 'building_materials', 'interior_furniture', 'architecture_design', 'contractor_builder'));
  end if;

  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'orgs' and column_name = 'complexity_mode'
  ) then
    alter table public.orgs 
      add column complexity_mode text not null default 'deep'
      check (complexity_mode in ('simple', 'deep'));
  end if;

  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'orgs' and column_name = 'vertical_settings'
  ) then
    alter table public.orgs 
      add column vertical_settings jsonb not null default '{}'::jsonb;
  end if;
end $$;

-- 2. Reconcile People Registry (Backfill from 0001 initial schema to 0020 enterprise model)
do $$
begin
  -- Add enterprise columns if missing
  alter table public.people
    add column if not exists full_name text,
    add column if not exists primary_phone text,
    add column if not exists secondary_phone text,
    add column if not exists whatsapp_number text,
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
end $$;

-- Backfill legacy name and phone to canonical enterprise fields
update public.people
set full_name = coalesce(full_name, name)
where full_name is null and name is not null;

update public.people
set primary_phone = coalesce(primary_phone, phone_normalized, phone)
where primary_phone is null and (phone is not null or phone_normalized is not null);

-- Bi-directional sync trigger for legacy name/phone vs full_name/primary_phone
create or replace function public.trg_sync_people_names_phones()
returns trigger language plpgsql as $$
begin
  if (new.full_name is null or new.full_name = 'Unknown Person') and new.name is not null then
    new.full_name := new.name;
  elsif new.name is null and new.full_name is not null then
    new.name := new.full_name;
  end if;

  if (new.primary_phone is null or new.primary_phone = '+910000000000') and new.phone is not null then
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

-- Drop static defaults if any were set
alter table public.people alter column full_name drop default;
alter table public.people alter column primary_phone drop default;

-- Indexes on enterprise people columns
create index if not exists idx_people_org_phone on public.people(org_id, primary_phone);
create index if not exists idx_people_org_name_trgm on public.people using gin(full_name gin_trgm_ops);
create index if not exists idx_people_wealth on public.people(org_id, wealth_tier);

-- 3. Price Floor Masking Security View
-- Salespeople must never see the absolute minimum_acceptable_price seller floor directly.
create or replace view public.property_listings_masked with (security_invoker = true) as
select 
  id,
  org_id,
  unit_id,
  listing_type,
  listing_status,
  asking_price,
  expected_price,
  case 
    when public.current_user_role() in ('owner', 'manager') then minimum_acceptable_price
    else null
  end as minimum_acceptable_price,
  price_negotiable,
  maintenance_charges_monthly,
  mandate_start_date,
  mandate_end_date,
  auto_renew,
  seller_brokerage_pct,
  buyer_brokerage_pct,
  fixed_commission_amount,
  keys_held_by,
  key_location_details,
  viewing_notice_required,
  gate_visitor_instructions,
  portal_syndication_allowed,
  social_media_allowed,
  photo_video_rights_verified,
  owner_person_id,
  assigned_agent_id,
  notes,
  created_at,
  updated_at
from public.property_listings;

comment on view public.property_listings_masked is 'Tenant and role-aware view of property listings: masks seller minimum_acceptable_price floor for salesperson role.';

-- Grant access to authenticated users
grant select on public.property_listings_masked to authenticated;

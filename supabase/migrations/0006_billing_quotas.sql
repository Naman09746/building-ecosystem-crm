-- ============================================================================
-- Ecosystem Realty — Migration 0006: Billing Infrastructure & Quota Enforcement
-- Supports the subscription engine with REAL schema columns (the canonical
-- table is `orgs`, not `organizations`), fixes the webhook_events provider
-- CHECK, and enforces lead quotas at the DATABASE layer so both write paths
-- (browser -> Supabase direct AND REST API) are covered. Client-side or
-- API-only checks are never trusted alone.
-- ============================================================================

-- ------------------------------------------------------- orgs billing cols --
alter table public.orgs
  add column if not exists max_seats integer not null default 4,
  add column if not exists is_active boolean not null default true,
  add column if not exists custom_settings jsonb default '{}'::jsonb,
  add column if not exists subscription_status text
    default 'trialing'
    check (subscription_status in ('active', 'trialing', 'past_due', 'canceled')),
  add column if not exists billing_cycle text
    default 'monthly'
    check (billing_cycle in ('monthly', 'yearly'));

-- ------------------------------------------------- webhook provider check ---
alter table public.webhook_events drop constraint if exists webhook_events_provider_check;
alter table public.webhook_events
  add constraint webhook_events_provider_check
  check (provider in ('whatsapp', 'meta_ads', 'website', 'billing'));

-- ============================ LEAD QUOTA ENFORCEMENT =========================
-- Plan limits MUST stay in sync with Frontend/src/lib/server/subscription.ts.
create or replace function public.assert_lead_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_plan text;
  v_max integer;
  v_count integer;
begin
  v_org := coalesce(new.org_id, public.current_org_id());
  if v_org is null then
    raise exception 'LEAD_INSERT_NO_TENANT';
  end if;

  select plan into v_plan from orgs where id = v_org;

  v_max := case v_plan
    when 'starter'    then 300
    when 'enterprise' then 50000
    else 2500 -- growth + unknown plans fall back to growth limits
  end;

  select count(*) into v_count from leads where org_id = v_org;

  if v_count >= v_max then
    raise exception 'LEAD_QUOTA_EXCEEDED: plan % limit (%) reached', coalesce(v_plan, 'growth'), v_max
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_leads_quota on public.leads;
create trigger trg_leads_quota
  before insert on public.leads
  for each row execute function public.assert_lead_quota();

-- Seat quota: block profile inserts beyond the org's seat count.
create or replace function public.assert_seat_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max integer;
  v_count integer;
begin
  select coalesce(max_seats, 4) into v_max from orgs where id = new.org_id;
  select count(*) into v_count from profiles where org_id = new.org_id;

  if v_count >= v_max then
    raise exception 'SEAT_QUOTA_EXCEEDED: plan seat limit (%) reached', v_max
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_profiles_seat_quota on public.profiles;
create trigger trg_profiles_seat_quota
  before insert on public.profiles
  for each row execute function public.assert_seat_quota();

-- ============================================================================
-- Ecosystem Realty — Migration 0009: Phase 3 Production Billing & Subscription Lifecycle
-- Implements complete multi-tenant subscription domain model, billing customers,
-- invoices, refunds, GST fields, automated quota sync, and strict RLS policies.
-- ============================================================================

-- 1. Extend orgs table with GST and billing profile fields
alter table public.orgs
  add column if not exists legal_name text,
  add column if not exists gstin text,
  add column if not exists billing_email text,
  add column if not exists billing_address jsonb default '{}'::jsonb;

-- Extend subscription_status constraint on orgs
alter table public.orgs drop constraint if exists orgs_subscription_status_check;
alter table public.orgs
  add constraint orgs_subscription_status_check
  check (subscription_status in (
    'trialing', 'active', 'past_due', 'unpaid', 'paused', 'canceled', 'incomplete', 'incomplete_expired'
  ));

-- 2. Billing Customers Table
create table if not exists public.billing_customers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  provider text not null check (provider in ('stripe', 'razorpay', 'simulated', 'manual')),
  provider_customer_id text not null,
  billing_name text,
  billing_email text,
  billing_phone text,
  billing_address jsonb default '{}'::jsonb,
  gstin text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_billing_customers_org_provider unique (org_id, provider)
);

create index if not exists idx_billing_customers_org on public.billing_customers(org_id);
create index if not exists idx_billing_customers_provider on public.billing_customers(provider, provider_customer_id);

-- 3. Subscriptions Table
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  plan text not null check (plan in ('starter', 'growth', 'enterprise')),
  status text not null check (status in (
    'trialing', 'active', 'past_due', 'unpaid', 'paused', 'canceled', 'incomplete', 'incomplete_expired'
  )),
  billing_cycle text not null default 'monthly' check (billing_cycle in ('monthly', 'yearly')),
  provider text not null check (provider in ('stripe', 'razorpay', 'simulated', 'manual')),
  provider_customer_id text,
  provider_subscription_id text,
  provider_plan_id text,
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz not null default (now() + interval '30 days'),
  trial_start timestamptz,
  trial_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  cancellation_reason text,
  cancellation_requested_by uuid references auth.users(id) on delete set null,
  grace_period_until timestamptz,
  currency text not null default 'INR',
  amount numeric not null default 0,
  latest_payment_id text,
  latest_invoice_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_subscriptions_org unique (org_id)
);

create index if not exists idx_subscriptions_org on public.subscriptions(org_id);
create index if not exists idx_subscriptions_status on public.subscriptions(status);
create index if not exists idx_subscriptions_provider on public.subscriptions(provider, provider_subscription_id);

-- 4. Billing Invoices / Payments Table
create table if not exists public.billing_invoices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  invoice_number text not null unique,
  provider text not null check (provider in ('stripe', 'razorpay', 'simulated', 'manual')),
  provider_payment_id text,
  provider_invoice_id text,
  amount numeric not null check (amount >= 0),
  tax_amount numeric not null default 0 check (tax_amount >= 0),
  currency text not null default 'INR',
  status text not null check (status in (
    'draft', 'open', 'paid', 'uncollectible', 'void', 'failed', 'refunded', 'partially_refunded'
  )),
  plan text not null check (plan in ('starter', 'growth', 'enterprise')),
  billing_cycle text not null check (billing_cycle in ('monthly', 'yearly')),
  period_start timestamptz not null,
  period_end timestamptz not null,
  billing_name text,
  billing_email text,
  gstin text,
  paid_at timestamptz,
  receipt_url text,
  created_at timestamptz not null default now()
);

create index if not exists idx_billing_invoices_org on public.billing_invoices(org_id);
create index if not exists idx_billing_invoices_paid_at on public.billing_invoices(paid_at desc);
create index if not exists idx_billing_invoices_provider_pay on public.billing_invoices(provider, provider_payment_id);

-- 5. Billing Refunds Table
create table if not exists public.billing_refunds (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  invoice_id uuid not null references public.billing_invoices(id) on delete cascade,
  provider text not null check (provider in ('stripe', 'razorpay', 'simulated', 'manual')),
  provider_refund_id text,
  amount numeric not null check (amount > 0),
  currency text not null default 'INR',
  status text not null check (status in ('pending', 'processing', 'succeeded', 'failed', 'canceled')),
  reason text,
  requested_by uuid references auth.users(id) on delete set null,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_billing_refunds_org on public.billing_refunds(org_id);
create index if not exists idx_billing_refunds_invoice on public.billing_refunds(invoice_id);

-- 6. Trigger: Synchronize orgs subscription status & limits from subscriptions table
create or replace function public.sync_org_subscription_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seats integer;
  v_leads integer;
begin
  -- Resolve max seats and leads from plan
  case new.plan
    when 'starter' then
      v_seats := 1;
      v_leads := 300;
    when 'enterprise' then
      v_seats := 25;
      v_leads := 50000;
    else -- growth
      v_seats := 4;
      v_leads := 2500;
  end case;

  update public.orgs
  set
    plan = new.plan,
    subscription_status = new.status,
    billing_cycle = new.billing_cycle,
    max_seats = v_seats,
    is_active = (new.status in ('active', 'trialing', 'past_due')),
    custom_settings = coalesce(custom_settings, '{}'::jsonb) || jsonb_build_object(
      'max_leads', v_leads,
      'cancel_at_period_end', new.cancel_at_period_end,
      'current_period_end', new.current_period_end,
      'updated_at', now()
    ),
    updated_at = now()
  where id = new.org_id;

  return new;
end;
$$;

drop trigger if exists trg_sync_org_subscription on public.subscriptions;
create trigger trg_sync_org_subscription
  after insert or update on public.subscriptions
  for each row execute function public.sync_org_subscription_state();

-- 7. Update assert_lead_quota to account for expired/unpaid subscription statuses
create or replace function public.assert_lead_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_plan text;
  v_status text;
  v_max integer;
  v_count integer;
  v_grace timestamptz;
begin
  v_org := coalesce(new.org_id, public.current_org_id());
  if v_org is null then
    raise exception 'LEAD_INSERT_NO_TENANT';
  end if;

  select plan, subscription_status into v_plan, v_status from orgs where id = v_org;

  -- Check if subscription is expired/unpaid without active grace
  if v_status in ('unpaid', 'incomplete_expired') then
    select grace_period_until into v_grace from subscriptions where org_id = v_org;
    if v_grace is null or v_grace < now() then
      raise exception 'SUBSCRIPTION_INACTIVE: Account subscription is unpaid or expired. Please update payment method.'
        using errcode = 'P0001';
    end if;
  end if;

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

-- 8. Attach Universal Audit Logging to billing tables
drop trigger if exists trg_audit_subscriptions on public.subscriptions;
create trigger trg_audit_subscriptions
  after insert or update or delete on public.subscriptions
  for each row execute function public.log_audit_event();

drop trigger if exists trg_audit_billing_invoices on public.billing_invoices;
create trigger trg_audit_billing_invoices
  after insert or update or delete on public.billing_invoices
  for each row execute function public.log_audit_event();

drop trigger if exists trg_audit_billing_refunds on public.billing_refunds;
create trigger trg_audit_billing_refunds
  after insert or update or delete on public.billing_refunds
  for each row execute function public.log_audit_event();

drop trigger if exists trg_audit_billing_customers on public.billing_customers;
create trigger trg_audit_billing_customers
  after insert or update or delete on public.billing_customers
  for each row execute function public.log_audit_event();

-- 9. Row-Level Security (RLS) Policies
alter table public.billing_customers enable row level security;
alter table public.subscriptions enable row level security;
alter table public.billing_invoices enable row level security;
alter table public.billing_refunds enable row level security;

-- billing_customers RLS
drop policy if exists "billing_customers_select" on public.billing_customers;
create policy "billing_customers_select"
  on public.billing_customers for select
  using (org_id = public.current_org_id());

drop policy if exists "billing_customers_manager_all" on public.billing_customers;
create policy "billing_customers_manager_all"
  on public.billing_customers for all
  using (
    org_id = public.current_org_id()
    and public.current_user_role() in ('owner', 'admin', 'boss', 'manager')
  )
  with check (
    org_id = public.current_org_id()
    and public.current_user_role() in ('owner', 'admin', 'boss', 'manager')
  );

-- subscriptions RLS
drop policy if exists "subscriptions_select" on public.subscriptions;
create policy "subscriptions_select"
  on public.subscriptions for select
  using (org_id = public.current_org_id());

drop policy if exists "subscriptions_manager_all" on public.subscriptions;
create policy "subscriptions_manager_all"
  on public.subscriptions for all
  using (
    org_id = public.current_org_id()
    and public.current_user_role() in ('owner', 'admin', 'boss', 'manager')
  )
  with check (
    org_id = public.current_org_id()
    and public.current_user_role() in ('owner', 'admin', 'boss', 'manager')
  );

-- billing_invoices RLS
drop policy if exists "billing_invoices_select" on public.billing_invoices;
create policy "billing_invoices_select"
  on public.billing_invoices for select
  using (org_id = public.current_org_id());

drop policy if exists "billing_invoices_manager_insert" on public.billing_invoices;
create policy "billing_invoices_manager_insert"
  on public.billing_invoices for insert
  with check (
    org_id = public.current_org_id()
    and public.current_user_role() in ('owner', 'admin', 'boss', 'manager')
  );

-- billing_refunds RLS
drop policy if exists "billing_refunds_select" on public.billing_refunds;
create policy "billing_refunds_select"
  on public.billing_refunds for select
  using (org_id = public.current_org_id());

drop policy if exists "billing_refunds_manager_insert" on public.billing_refunds;
create policy "billing_refunds_manager_insert"
  on public.billing_refunds for insert
  with check (
    org_id = public.current_org_id()
    and public.current_user_role() in ('owner', 'admin', 'boss', 'manager')
  );

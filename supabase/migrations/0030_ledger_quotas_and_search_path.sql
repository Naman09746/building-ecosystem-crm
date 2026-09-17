-- ====================================================================
-- MIGRATION 0030: Phase 1 — Khata Ledger Cross-Tenant Check & Pessimistic Quota Locks
-- Patches vulnerabilities:
-- C-DB6: trg_update_khata_balance cross-tenant ledger corruption
-- H-DB1: assert_lead_quota and assert_seat_quota race condition
-- C-DB5 Audit: Voice notes tenant quarantine metadata flagging
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. KHATA LEDGER INTEGRITY CHECK & ORG BOUNDARY (C-DB6)
-- --------------------------------------------------------------------
create or replace function public.trg_update_khata_balance()
returns trigger as $$
declare
  v_rows_updated integer;
begin
  if new.type = 'credit' then
    update public.materials_khata_ledgers
    set outstanding_balance = outstanding_balance + new.amount,
        updated_at = now()
    where id = new.ledger_id
      and org_id = new.org_id;

    get diagnostics v_rows_updated = row_count;
    if v_rows_updated = 0 then
      raise exception 'KHATA_LEDGER_MISMATCH: ledger % does not belong to organization %', new.ledger_id, new.org_id
        using errcode = '42501';
    end if;

  elsif new.type = 'debit' then
    update public.materials_khata_ledgers
    set outstanding_balance = outstanding_balance - new.amount,
        last_payment_at = new.created_at,
        updated_at = now()
    where id = new.ledger_id
      and org_id = new.org_id;

    get diagnostics v_rows_updated = row_count;
    if v_rows_updated = 0 then
      raise exception 'KHATA_LEDGER_MISMATCH: ledger % does not belong to organization %', new.ledger_id, new.org_id
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$ language plpgsql;

-- --------------------------------------------------------------------
-- 2. PESSIMISTIC CONCURRENCY LOCKS ON QUOTAS (H-DB1)
-- --------------------------------------------------------------------
-- Update assert_lead_quota with SELECT ... FOR UPDATE on orgs
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

  -- Lock the org record to serialize concurrent lead inserts for this tenant
  select plan, subscription_status
  into v_plan, v_status
  from public.orgs
  where id = v_org
  for update;

  if not found then
    raise exception 'ORG_NOT_FOUND: organization % does not exist', v_org;
  end if;

  -- Check if subscription is expired/unpaid without active grace
  if v_status in ('unpaid', 'incomplete_expired') then
    select grace_period_until into v_grace from public.subscriptions where org_id = v_org;
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

  select count(*) into v_count from public.leads where org_id = v_org;

  if v_count >= v_max then
    raise exception 'LEAD_QUOTA_EXCEEDED: plan % limit (%) reached', coalesce(v_plan, 'growth'), v_max
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

-- Update assert_seat_quota with SELECT ... FOR UPDATE on orgs
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
  -- Lock the org record to serialize concurrent seat additions
  select coalesce(max_seats, 4) into v_max
  from public.orgs
  where id = new.org_id
  for update;

  if not found then
    raise exception 'ORG_NOT_FOUND: organization % does not exist', new.org_id;
  end if;

  select count(*) into v_count from public.profiles where org_id = new.org_id;

  if v_count >= v_max then
    raise exception 'SEAT_QUOTA_EXCEEDED: plan seat limit (%) reached', v_max
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

-- --------------------------------------------------------------------
-- 3. VOICE NOTES AUDIT & QUARANTINE METADATA (C-DB5 Audit)
-- --------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'storage' and table_name = 'objects'
  ) then
    -- Flag objects in voice-notes bucket where prefix directory doesn't match owner's profile org_id
    update storage.objects o
    set metadata = coalesce(o.metadata, '{}'::jsonb) || '{"quarantine": true, "reason": "tenant_mismatch"}'::jsonb
    where o.bucket_id = 'voice-notes'
      and (storage.foldername(o.name))[1] is distinct from (
        select p.org_id::text from public.profiles p where p.user_id = o.owner limit 1
      );
  end if;
end $$;

-- ====================================================================
-- MIGRATION 0033: Dealer Scheme Slab Accrual (Ambuja: MT/bags -> Rs/bag)
-- Single volume slab per month. Accrual = delivered bags in month * rate
-- ====================================================================

-- 1. Schemes (one row per dealer per month, or org-wide via dealer_id null)
create table if not exists public.dealer_schemes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  dealer_id uuid references public.dealers(id) on delete cascade, -- null = applies to all dealers in org
  period_month date not null, -- YYYY-MM-01
  name text not null default 'Monthly Volume Scheme',
  slabs jsonb not null default '[]'::jsonb, -- [{min_bags:int, max_bags:int|null, rate_per_bag:numeric}]
  created_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(org_id, dealer_id, period_month)
);
create trigger trg_dealer_schemes_updated_at before update on public.dealer_schemes for each row execute function public.trg_set_updated_at();
alter table public.dealer_schemes enable row level security;
create policy "Tenant isolation for dealer_schemes" on public.dealer_schemes for all using (org_id = (select org_id from public.profiles where user_id = auth.uid()));
create index idx_dealer_schemes_org_period on public.dealer_schemes(org_id, period_month);
create index idx_dealer_schemes_org_dealer on public.dealer_schemes(org_id, dealer_id);

-- 2. RPC: get_scheme_accrual — per dealer for a month (delivered only)
create or replace function public.get_scheme_accrual(p_org_id uuid, p_period_month date, p_dealer_id uuid)
returns table(period_month date, dealer_id uuid, dealer_name text, slabs jsonb, achieved_bags numeric, current_rate numeric, accrued_amount numeric, next_slab_min integer, bags_to_next integer, next_rate numeric) language plpgsql security definer set search_path = public as $$
declare
  v_slabs jsonb;
  v_achieved numeric := 0;
  v_rate numeric := 0;
  v_next_min int := null;
  v_next_rate numeric := null;
  v_bags_to_next int := null;
  v_dealer_name text;
begin
  -- slabs: dealer-specific else org-wide
  select ds.slabs into v_slabs from public.dealer_schemes ds where ds.org_id=p_org_id and ds.dealer_id=p_dealer_id and ds.period_month=date_trunc('month', p_period_month)::date limit 1;
  if v_slabs is null then
    select ds.slabs into v_slabs from public.dealer_schemes ds where ds.org_id=p_org_id and ds.dealer_id is null and ds.period_month=date_trunc('month', p_period_month)::date limit 1;
  end if;
  if v_slabs is null then v_slabs := '[]'::jsonb; end if;

  select coalesce(sum(di.quantity),0) into v_achieved
  from public.dispatch_challans dc
  join public.dispatch_items di on di.challan_id=dc.id
  join public.orders o on o.id=dc.order_id
  where dc.org_id=p_org_id and dc.status='delivered'
    and dc.delivered_at >= date_trunc('month', p_period_month)::date
    and dc.delivered_at < (date_trunc('month', p_period_month)::date + interval '1 month')
    and o.dealer_id = p_dealer_id;

  -- find current slab rate for achieved
  select (elem->>'rate_per_bag')::numeric into v_rate
  from jsonb_array_elements(v_slabs) elem
  where v_achieved >= (elem->>'min_bags')::numeric
    and (elem->>'max_bags' is null or (elem->>'max_bags')::text = 'null' or v_achieved <= (elem->>'max_bags')::numeric)
  limit 1;
  if v_rate is null then
    -- fallback: highest slab where min <= achieved, else 0
    select (elem->>'rate_per_bag')::numeric into v_rate
    from jsonb_array_elements(v_slabs) elem
    where v_achieved >= (elem->>'min_bags')::numeric
    order by (elem->>'min_bags')::numeric desc limit 1;
  end if;
  if v_rate is null then v_rate := 0; end if;

  -- next slab
  select (elem->>'min_bags')::int, (elem->>'rate_per_bag')::numeric into v_next_min, v_next_rate
  from jsonb_array_elements(v_slabs) elem
  where (elem->>'min_bags')::numeric > v_achieved
  order by (elem->>'min_bags')::numeric asc limit 1;

  if v_next_min is not null then v_bags_to_next := v_next_min - v_achieved::int; end if;

  select name into v_dealer_name from public.dealers where id=p_dealer_id;

  return query select date_trunc('month', p_period_month)::date, p_dealer_id, v_dealer_name, v_slabs, v_achieved, v_rate, round((v_achieved * v_rate)::numeric,2), v_next_min, v_bags_to_next, v_next_rate;
end;
$$;

-- 3. RPC: get_scheme_liability — org-wide for month (sum of all dealer accruals)
create or replace function public.get_scheme_liability(p_org_id uuid, p_period_month date)
returns table(total_accrued numeric, dealer_count bigint, hit_count bigint, within_300_count bigint) language plpgsql security definer set search_path = public as $$
declare
  v_total numeric := 0;
  v_row record;
begin
  for v_row in select id from public.dealers where org_id=p_org_id loop
    select accrued_amount into v_row from public.get_scheme_accrual(p_org_id, p_period_month, v_row.id) limit 1;
    -- use temporary? Instead sum via loop variable
  end loop;
  -- simpler aggregate via query
  return query
  with per_dealer as (
    select (public.get_scheme_accrual(p_org_id, p_period_month, d.id)).* from public.dealers d where d.org_id=p_org_id
  )
  select coalesce(sum(accrued_amount),0), count(*)::bigint, count(*) filter (where achieved_bags >= 100)::bigint, count(*) filter (where bags_to_next is not null and bags_to_next <= 300)::bigint from per_dealer;
end;
$$;

-- Fix above liability to be simple sql
create or replace function public.get_scheme_liability(p_org_id uuid, p_period_month date)
returns table(total_accrued numeric, dealer_count bigint, hit_count bigint, within_300_count bigint) language sql security definer set search_path = public as $$
  with per_dealer as (
    select (public.get_scheme_accrual(p_org_id, p_period_month, d.id)).accrued_amount,
           (public.get_scheme_accrual(p_org_id, p_period_month, d.id)).bags_to_next,
           (public.get_scheme_accrual(p_org_id, p_period_month, d.id)).achieved_bags
    from public.dealers d where d.org_id=p_org_id
  )
  select coalesce(sum(accrued_amount),0), count(*)::bigint, count(*) filter (where achieved_bags >= 100)::bigint, count(*) filter (where bags_to_next is not null and bags_to_next <= 300)::bigint from per_dealer;
$$;

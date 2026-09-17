-- ====================================================================
-- MIGRATION 0031: Cement Manufacturer — 7 MUST HAVEs (Ambuja Scale)
-- Dealer Network + Construction Site + Target vs Actual + Complaints
-- + hardens Khata/Order linkage, prepares for POD + Collections ageing
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. DEALER NETWORK MASTER (CFA → Stockist → Dealer → Retailer)
-- --------------------------------------------------------------------
create table if not exists public.dealers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  dealer_code text not null,
  name text not null,
  dealer_type text not null check (dealer_type in ('cfa','stockist','dealer','retailer','sub_dealer')),
  parent_dealer_id uuid references public.dealers(id) on delete set null,
  region_id uuid references public.regions(id) on delete set null,
  state text,
  district text,
  taluka text,
  beat text,
  salesperson_id uuid references public.profiles(user_id) on delete set null,
  phone text,
  gstin text,
  address text,
  city text,
  status text not null default 'active' check (status in ('active','dormant','blocked','new')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(org_id, dealer_code)
);
create trigger trg_dealers_updated_at before update on public.dealers for each row execute function public.trg_set_updated_at();
alter table public.dealers enable row level security;
create policy "Tenant isolation for dealers" on public.dealers for all using (org_id = (select org_id from public.profiles where user_id = auth.uid()));
create index if not exists idx_dealers_org_parent on public.dealers(org_id, parent_dealer_id);
create index if not exists idx_dealers_org_salesperson on public.dealers(org_id, salesperson_id);
create index if not exists idx_dealers_org_status on public.dealers(org_id, status);
create index if not exists idx_dealers_org_beat on public.dealers(org_id, beat);

-- Link Khata ledgers to dealer (nullable, gradual adoption)
do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='materials_khata_ledgers' and column_name='dealer_id') then
    alter table public.materials_khata_ledgers add column dealer_id uuid references public.dealers(id) on delete set null;
    create index idx_khata_ledgers_dealer on public.materials_khata_ledgers(org_id, dealer_id);
  end if;
end $$;

-- Link orders to dealer (which dealer fulfilled / primary dealer attribution)
do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='dealer_id') then
    alter table public.orders add column dealer_id uuid references public.dealers(id) on delete set null;
    alter table public.orders add column site_id uuid; -- FK added after construction_sites created
    create index idx_orders_dealer on public.orders(org_id, dealer_id);
  end if;
end $$;

-- --------------------------------------------------------------------
-- 2. CONSTRUCTION SITE (durable, 1 site → many orders)
-- --------------------------------------------------------------------
create table if not exists public.construction_sites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  site_name text not null,
  address text,
  gps_lat double precision,
  gps_lng double precision,
  site_type text not null default 'ihb' check (site_type in ('ihb','builder','infra','government')),
  stage text not null default 'excavation' check (stage in ('excavation','foundation','structure','finishing','roof')),
  estimated_total_cement_mt numeric(12,2),
  estimated_total_bags integer,
  current_brand text check (current_brand in ('ambuja','ultratech','acc','other')),
  owner_name text,
  owner_phone text,
  contractor_name text,
  contractor_phone text,
  mason_name text,
  architect_name text,
  responsible_salesperson_id uuid references public.profiles(user_id) on delete set null,
  dealer_id uuid references public.dealers(id) on delete set null,
  last_visited_at timestamptz,
  next_visit_at timestamptz,
  source text check (source in ('scouting','walkin','dealer_tip','other')),
  status text not null default 'active' check (status in ('active','completed','dormant')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_construction_sites_updated_at before update on public.construction_sites for each row execute function public.trg_set_updated_at();
alter table public.construction_sites enable row level security;
create policy "Tenant isolation for construction_sites" on public.construction_sites for all using (org_id = (select org_id from public.profiles where user_id = auth.uid()));
create index if not exists idx_sites_org_stage on public.construction_sites(org_id, stage);
create index if not exists idx_sites_org_brand on public.construction_sites(org_id, current_brand);
create index if not exists idx_sites_org_tso on public.construction_sites(org_id, responsible_salesperson_id);
create index if not exists idx_sites_org_nextvisit on public.construction_sites(org_id, next_visit_at);

-- Now add FK for orders.site_id
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='site_id')
     and not exists (select 1 from information_schema.table_constraints where constraint_name='orders_site_id_fkey') then
    alter table public.orders add constraint orders_site_id_fkey foreign key (site_id) references public.construction_sites(id) on delete set null;
    create index idx_orders_site on public.orders(org_id, site_id);
  end if;
end $$;

-- Link scouts to site
do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='materials_field_scouts' and column_name='site_id') then
    alter table public.materials_field_scouts add column site_id uuid references public.construction_sites(id) on delete set null;
    create index idx_scouts_site on public.materials_field_scouts(org_id, site_id);
  end if;
end $$;

-- Link footfalls to site
do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='materials_footfalls' and column_name='site_id') then
    alter table public.materials_footfalls add column site_id uuid references public.construction_sites(id) on delete set null;
  end if;
end $$;

-- Link khata transactions to site (which site's cement was credited)
do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='materials_khata_transactions' and column_name='site_id') then
    alter table public.materials_khata_transactions add column site_id uuid references public.construction_sites(id) on delete set null;
  end if;
end $$;

-- --------------------------------------------------------------------
-- 3. SALES TARGETS (MT/Bags, hierarchy rollup)
-- --------------------------------------------------------------------
create table if not exists public.sales_targets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  period_month date not null, -- YYYY-MM-01
  target_mt numeric(10,2) not null default 0,
  target_bags integer not null default 0,
  level text not null check (level in ('company','state','region','area','salesperson','dealer')),
  level_id text not null, -- org_id for company, state name for state, uuid text for others
  created_by uuid references public.profiles(user_id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(org_id, period_month, level, level_id)
);
create trigger trg_sales_targets_updated_at before update on public.sales_targets for each row execute function public.trg_set_updated_at();
alter table public.sales_targets enable row level security;
create policy "Manager can manage sales_targets" on public.sales_targets for all using (
  org_id = (select org_id from public.profiles where user_id = auth.uid())
  and (select role from public.profiles where user_id = auth.uid()) in ('owner','manager')
) with check (
  org_id = (select org_id from public.profiles where user_id = auth.uid())
  and (select role from public.profiles where user_id = auth.uid()) in ('owner','manager')
);
create policy "Tenant read sales_targets" on public.sales_targets for select using (org_id = (select org_id from public.profiles where user_id = auth.uid()));
create index idx_sales_targets_org_period on public.sales_targets(org_id, period_month);
create index idx_sales_targets_org_level on public.sales_targets(org_id, level, level_id);

-- --------------------------------------------------------------------
-- 4. COMPLAINTS (48h SLA, 6 types)
-- --------------------------------------------------------------------
create sequence if not exists public.complaint_case_seq;
create table if not exists public.complaints (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  case_no text not null default ('CMP-' || nextval('public.complaint_case_seq')::text) unique,
  reported_by_dealer_id uuid references public.dealers(id) on delete set null,
  reported_by_phone text,
  site_id uuid references public.construction_sites(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  dispatch_challan_id uuid references public.dispatch_challans(id) on delete set null,
  complaint_type text not null check (complaint_type in ('late_delivery','short_quantity','damaged_bags','wrong_grade','rate_difference','quality_doubt','service_behaviour')),
  description text,
  photo_url text,
  assigned_to_user_id uuid references public.profiles(user_id) on delete set null,
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  status text not null default 'open' check (status in ('open','in_progress','resolved','closed')),
  due_at timestamptz not null default (now() + interval '48 hours'),
  resolved_at timestamptz,
  closure_notes text,
  closure_photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_complaints_updated_at before update on public.complaints for each row execute function public.trg_set_updated_at();
alter table public.complaints enable row level security;
create policy "Tenant isolation for complaints" on public.complaints for all using (org_id = (select org_id from public.profiles where user_id = auth.uid()));
create index idx_complaints_org_status on public.complaints(org_id, status);
create index idx_complaints_org_due on public.complaints(org_id, due_at);
create index idx_complaints_org_dealer on public.complaints(org_id, reported_by_dealer_id);
create index idx_complaints_org_assigned on public.complaints(org_id, assigned_to_user_id);

-- --------------------------------------------------------------------
-- 5. RPC: Sales Target Achievement + Pace (MT/bags from delivered challans)
-- --------------------------------------------------------------------
create or replace function public.get_target_achievement(
  p_org_id uuid,
  p_period_month date,
  p_level text,
  p_level_id text
) returns table(target_mt numeric, target_bags integer, achieved_bags numeric, achieved_mt numeric, achievement_pct numeric, pace_pct numeric) language sql security definer set search_path = public as $$
  with t as (
    select target_mt, target_bags from public.sales_targets
    where org_id = p_org_id and period_month = date_trunc('month', p_period_month)::date and level = p_level and level_id = p_level_id
    limit 1
  ),
  delivered as (
    select coalesce(sum(di.quantity),0) as bags
    from public.dispatch_challans dc
    join public.dispatch_items di on di.challan_id = dc.id
    join public.orders o on o.id = dc.order_id
    left join public.dealers d on d.id = o.dealer_id
    where dc.org_id = p_org_id
      and dc.status = 'delivered'
      and dc.delivered_at >= date_trunc('month', p_period_month)::date
      and dc.delivered_at < (date_trunc('month', p_period_month)::date + interval '1 month')
      and (
        p_level = 'company'
        or (p_level = 'state' and d.state = p_level_id)
        or (p_level = 'region' and d.region_id::text = p_level_id)
        or (p_level = 'dealer' and o.dealer_id::text = p_level_id)
        or (p_level = 'salesperson' and d.salesperson_id::text = p_level_id)
      )
  )
  select
    t.target_mt, t.target_bags,
    delivered.bags as achieved_bags,
    round(delivered.bags / 20.0, 2) as achieved_mt,
    case when t.target_bags > 0 then round((delivered.bags / t.target_bags * 100)::numeric,1) else 0 end,
    case when t.target_bags > 0 and extract(day from now()) > 0 then round((delivered.bags / t.target_bags * 100 / (extract(day from now()) / extract(day from date_trunc('month', now()) + interval '1 month' - interval '1 day')))::numeric,1) else 0 end
  from t, delivered;
$$;

-- --------------------------------------------------------------------
-- 6. RPC: Dealer Performance buckets (Champion/Growing/Stable/Declining/Dormant/New/At Risk)
-- --------------------------------------------------------------------
create or replace function public.get_dealer_performance(p_org_id uuid, p_days integer default 90)
returns table(dealer_id uuid, dealer_name text, dealer_code text, dealer_type text, mt_sold numeric, bags_sold numeric, orders_count integer, growth_pct numeric, days_since_last_order integer, buckets text[], credit_used_pct numeric) language plpgsql security definer set search_path = public as $$
declare
  v_now timestamptz := now();
begin
  return query
  with dealer_orders as (
    select o.dealer_id, count(*)::int as cnt, coalesce(sum(di.quantity),0) as bags,
           max(dc.delivered_at) as last_delivered
    from public.orders o
    join public.dispatch_challans dc on dc.order_id = o.id and dc.status='delivered'
    join public.dispatch_items di on di.challan_id = dc.id
    where o.org_id = p_org_id and dc.delivered_at >= v_now - (p_days || ' days')::interval
    group by o.dealer_id
  ),
  prev_orders as (
    select o.dealer_id, coalesce(sum(di.quantity),0) as prev_bags
    from public.orders o
    join public.dispatch_challans dc on dc.order_id = o.id and dc.status='delivered'
    join public.dispatch_items di on di.challan_id = dc.id
    where o.org_id = p_org_id and dc.delivered_at >= v_now - (p_days*2 || ' days')::interval and dc.delivered_at < v_now - (p_days || ' days')::interval
    group by o.dealer_id
  )
  select
    d.id, d.name, d.dealer_code, d.dealer_type,
    round(coalesce(do.bags,0)/20.0,2) as mt_sold,
    coalesce(do.bags,0) as bags_sold,
    coalesce(do.cnt,0) as orders_count,
    case when coalesce(po.prev_bags,0) > 0 then round(((coalesce(do.bags,0) - po.prev_bags)/po.prev_bags*100)::numeric,1) else null end as growth_pct,
    case when do.last_delivered is null then null else extract(day from v_now - do.last_delivered)::int end as days_since_last_order,
    array_remove(array[
      case when coalesce(do.bags,0) >= (select percentile_cont(0.85) within group (order by coalesce(do2.bags,0)) from dealer_orders do2) and coalesce(do.bags,0) > 0 then 'Champion' else null end,
      case when coalesce(do.bags,0) > coalesce(po.prev_bags,0)*1.15 then 'Growing' else null end,
      case when coalesce(do.bags,0) < coalesce(po.prev_bags,0)*0.85 and coalesce(po.prev_bags,0) > 0 then 'Declining' else null end,
      case when coalesce(do.cnt,0)=0 and d.created_at >= v_now - interval '90 days' then 'New' else null end,
      case when do.last_delivered is null or do.last_delivered < v_now - interval '21 days' then 'Dormant' else null end,
      case when (coalesce(do.bags,0) < coalesce(po.prev_bags,0)*0.85 and coalesce(po.prev_bags,0) > 0) and exists (select 1 from public.materials_khata_ledgers l where l.dealer_id=d.id and l.org_id=p_org_id and l.outstanding_balance > 0 and l.status='overdue') then 'At Risk' else null end
    ], null) as buckets,
    case when k.credit_limit > 0 then round((k.outstanding_balance / k.credit_limit *100)::numeric,1) else 0 end as credit_used_pct
  from public.dealers d
  left join dealer_orders do on do.dealer_id = d.id
  left join prev_orders po on po.dealer_id = d.id
  left join public.materials_khata_ledgers k on k.dealer_id = d.id and k.org_id = p_org_id
  where d.org_id = p_org_id;
end;
$$;

-- --------------------------------------------------------------------
-- 7. RPC: Collections daily list (Money to Collect Today) + Ageing
-- --------------------------------------------------------------------
create or replace function public.get_collections_daily(p_org_id uuid)
returns table(dealer_id uuid, dealer_name text, dealer_phone text, outstanding numeric, overdue numeric, oldest_due_date timestamptz, days_overdue integer, ageing_bucket text, assigned_tso uuid) language sql security definer set search_path = public as $$
  select
    d.id, d.name, d.phone,
    k.outstanding_balance as outstanding,
    case when k.status='overdue' then k.outstanding_balance else 0 end as overdue,
    k.last_payment_at as oldest_due_date,
    coalesce(extract(day from now() - k.last_payment_at)::int, 0) as days_overdue,
    case
      when k.outstanding_balance = 0 then 'current'
      when now() - k.last_payment_at <= interval '15 days' then '1-15'
      when now() - k.last_payment_at <= interval '30 days' then '16-30'
      when now() - k.last_payment_at <= interval '60 days' then '31-60'
      else '60+'
    end as ageing_bucket,
    d.salesperson_id as assigned_tso
  from public.dealers d
  join public.materials_khata_ledgers k on k.dealer_id = d.id and k.org_id = p_org_id
  where d.org_id = p_org_id and k.outstanding_balance > 0
  order by case when k.status='overdue' then 0 else 1 end, k.outstanding_balance desc;
$$;

-- --------------------------------------------------------------------
-- 8. RPC: Khata Ageing summary (for Owner)
-- --------------------------------------------------------------------
create or replace function public.get_khata_ageing(p_org_id uuid)
returns table(bucket text, dealer_count bigint, outstanding numeric) language sql security definer set search_path = public as $$
  select
    case
      when outstanding_balance = 0 then 'current'
      when now() - last_payment_at <= interval '15 days' then '1-15'
      when now() - last_payment_at <= interval '30 days' then '16-30'
      when now() - last_payment_at <= interval '60 days' then '31-60'
      else '60+'
    end as bucket,
    count(*)::bigint,
    sum(outstanding_balance)
  from public.materials_khata_ledgers
  where org_id = p_org_id and outstanding_balance > 0
  group by bucket
  order by bucket;
$$;

-- --------------------------------------------------------------------
-- 9. RPC: Morning 4 Screens aggregator
-- --------------------------------------------------------------------
create or replace function public.get_morning_screens(p_org_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_sites jsonb; v_orders jsonb; v_collections jsonb; v_targets jsonb;
begin
  select jsonb_agg(jsonb_build_object('id', id, 'site_name', site_name, 'stage', stage, 'current_brand', current_brand, 'address', address, 'contractor_phone', contractor_phone, 'next_visit_at', next_visit_at))
  into v_sites from (select * from public.construction_sites where org_id=p_org_id and status='active' order by next_visit_at asc nulls last limit 20) s;

  select jsonb_build_object(
    'pending_dispatch', (select count(*) from public.orders o join public.dispatch_challans dc on dc.order_id=o.id where o.org_id=p_org_id and dc.status='pending'),
    'in_transit_24h', (select count(*) from public.dispatch_challans where org_id=p_org_id and status='in_transit' and dispatched_at < now() - interval '24 hours'),
    'low_stock_depots', (select count(*) from public.inventory_stock where org_id=p_org_id and quantity < 500)
  ) into v_orders;

  select jsonb_agg(jsonb_build_object('dealer', dealer_name, 'overdue', overdue, 'days', days_overdue))
  into v_collections from (select * from public.get_collections_daily(p_org_id) where overdue > 0 order by overdue desc limit 10) c;

  select jsonb_agg(jsonb_build_object('level', level, 'level_id', level_id, 'target_mt', target_mt, 'period_month', period_month))
  into v_targets from (select * from public.sales_targets where org_id=p_org_id and period_month = date_trunc('month', now())::date limit 20) t;

  return jsonb_build_object('sites', coalesce(v_sites,'[]'), 'orders', coalesce(v_orders,'{}'), 'collections', coalesce(v_collections,'[]'), 'targets', coalesce(v_targets,'[]'));
end;
$$;

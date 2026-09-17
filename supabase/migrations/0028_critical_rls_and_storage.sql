-- ====================================================================
-- MIGRATION 0028: Phase 0a — Critical RLS, Storage Isolation & Function Guards
-- Patches vulnerabilities identified in Deep Audit:
-- C-DB1: Notifications INSERT RLS anon forge gap
-- C-DB2: org_assignment_state missing RLS
-- C-DB5: Voice notes cross-tenant storage write gap
-- C-DB7 & C-DB8: Analytics & SLA RPC tenant isolation bypass
-- M-02: Global unique collisions on notifications and webhook_sources
-- M-05: Unsafe search_path on trigger functions
-- M-07: project_contacts_view missing security_invoker = true
-- ====================================================================

-- --------------------------------------------------------------------
-- 0. PRE-MIGRATION DATA INTEGRITY CHECKS
-- --------------------------------------------------------------------
do $$
declare
  v_orphan_leads integer;
  v_corrupted_khata integer;
begin
  select count(*) into v_orphan_leads from public.leads where person_id is null;
  if v_orphan_leads > 0 then
    raise notice 'Warning: % orphan leads detected with null person_id. Application mappers will enforce person_id on next sync.', v_orphan_leads;
  end if;

  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'materials_khata_transactions'
  ) then
    select count(*) into v_corrupted_khata
    from public.materials_khata_transactions t
    join public.materials_khata_ledgers l on t.ledger_id = l.id
    where t.org_id <> l.org_id;

    if v_corrupted_khata > 0 then
      raise exception 'Cross-tenant khata transactions detected (%). Manual reconciliation required.', v_corrupted_khata;
    end if;
  end if;
end $$;

-- --------------------------------------------------------------------
-- 1. NOTIFICATIONS RLS & DEDUP KEY UNIQUENESS (C-DB1, M-02)
-- --------------------------------------------------------------------
-- Drop existing insert policy that allowed auth.uid() IS NULL
drop policy if exists "notifications_insert_policy" on public.notifications;

-- Enforce strict tenant isolation on notification inserts
create policy "notifications_insert_policy" on public.notifications
  for insert
  with check (
    org_id = public.current_org_id()
  );

-- Fix M-02: Ensure notifications dedup_key is scoped per-org, not globally unique
alter table public.notifications drop constraint if exists notifications_dedup_key_key;
drop index if exists idx_notifications_dedup;
create unique index if not exists idx_notifications_org_dedup_key
  on public.notifications(org_id, dedup_key)
  where dedup_key is not null;

-- Fix M-02: Ensure webhook_sources external_id is scoped per-org
alter table public.webhook_sources drop constraint if exists webhook_sources_provider_external_id_key;
drop index if exists idx_webhook_sources_lookup;
create unique index if not exists idx_webhook_sources_org_provider_external
  on public.webhook_sources(org_id, provider, external_id);

-- --------------------------------------------------------------------
-- 2. ORG ASSIGNMENT STATE RLS (C-DB2)
-- --------------------------------------------------------------------
alter table public.org_assignment_state enable row level security;
alter table public.org_assignment_state force row level security;

revoke all on public.org_assignment_state from authenticated;
grant select, insert, update on public.org_assignment_state to authenticated;

drop policy if exists "Tenant isolation for org_assignment_state" on public.org_assignment_state;
create policy "Tenant isolation for org_assignment_state" on public.org_assignment_state
  for all
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

-- --------------------------------------------------------------------
-- 3. VOICE NOTES STORAGE POLICY (C-DB5)
-- --------------------------------------------------------------------
-- Ensure storage schema exists before patching storage.objects policies
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'storage' and table_name = 'objects'
  ) then
    drop policy if exists "org_members_insert_voice_notes" on storage.objects;
    create policy "org_members_insert_voice_notes" on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'voice-notes'
        and (storage.foldername(name))[1] = (public.current_org_id())::text
      );
  end if;
end $$;

-- --------------------------------------------------------------------
-- 4. ANALYTICS RPC SECURITY DEFINER GUARDS (C-DB7)
-- --------------------------------------------------------------------
-- Revoke execution from public/anon
revoke execute on function public.get_pipeline_analytics(uuid, timestamptz, timestamptz, uuid, uuid, uuid) from anon, public;
revoke execute on function public.get_rep_performance_analytics(uuid, timestamptz, timestamptz, uuid) from anon, public;
revoke execute on function public.get_time_series_analytics(uuid, timestamptz, timestamptz, text, uuid, uuid, uuid) from anon, public;
revoke execute on function public.get_pipeline_velocity_analytics(uuid, timestamptz, timestamptz) from anon, public;
revoke execute on function public.get_advanced_funnel_analytics(uuid, timestamptz, timestamptz, uuid, uuid, uuid) from anon, public;

grant execute on function public.get_pipeline_analytics(uuid, timestamptz, timestamptz, uuid, uuid, uuid) to authenticated;
grant execute on function public.get_rep_performance_analytics(uuid, timestamptz, timestamptz, uuid) to authenticated;
grant execute on function public.get_time_series_analytics(uuid, timestamptz, timestamptz, text, uuid, uuid, uuid) to authenticated;
grant execute on function public.get_pipeline_velocity_analytics(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.get_advanced_funnel_analytics(uuid, timestamptz, timestamptz, uuid, uuid, uuid) to authenticated;

-- Re-define get_pipeline_analytics with strict org check
create or replace function public.get_pipeline_analytics(
  p_org_id uuid,
  p_start_date timestamptz default null,
  p_end_date timestamptz default null,
  p_salesperson_id uuid default null,
  p_region_id uuid default null,
  p_project_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_summary record;
  v_stages jsonb;
  v_deal_health jsonb;
  v_forecast jsonb;
  v_total_pipeline_val numeric := 0;
  v_won_rev numeric := 0;
  v_total_leads integer := 0;
  v_active_leads integer := 0;
  v_won_leads integer := 0;
  v_lost_leads integer := 0;
  v_weighted_val numeric := 0;
begin
  if p_org_id is null then
    p_org_id := public.current_org_id();
  end if;

  if p_org_id is distinct from public.current_org_id() then
    raise exception 'TENANT_ISOLATION_VIOLATION: unauthorized org analytics access'
      using errcode = '42501';
  end if;

  -- 1. Summary aggregations across filtered leads
  select
    count(*)::integer as total_count,
    count(*) filter (where l.stage not in ('won', 'lost'))::integer as active_count,
    count(*) filter (where l.stage = 'won')::integer as won_count,
    count(*) filter (where l.stage = 'lost')::integer as lost_count,
    coalesce(sum(coalesce(l.budget, 0)) filter (where l.stage not in ('won', 'lost')), 0)::numeric as active_val,
    coalesce(sum(coalesce(l.budget, 0)) filter (where l.stage = 'won'), 0)::numeric as won_val,
    coalesce(avg(coalesce(l.budget, 0)) filter (where l.stage = 'won'), 0)::numeric as avg_won_val,
    coalesce(avg(coalesce(l.budget, 0)) filter (where l.stage not in ('won', 'lost')), 0)::numeric as avg_active_budget
  into v_summary
  from public.leads l
  where l.org_id = p_org_id
    and (p_salesperson_id is null or l.salesperson_id = p_salesperson_id)
    and (p_region_id is null or l.region_id = p_region_id)
    and (p_project_id is null or l.project_id = p_project_id)
    and (p_start_date is null or l.created_at >= p_start_date)
    and (p_end_date is null or l.created_at <= p_end_date);

  -- 2. Pipeline Stages Distribution
  with stage_counts as (
    select
      coalesce(ps.slug, l.stage) as slug,
      coalesce(ps.name, initcap(replace(l.stage, '_', ' '))) as name,
      coalesce(ps.color, '#64748b') as color,
      coalesce(ps.sort_order, 99) as sort_order,
      count(l.id)::integer as count,
      coalesce(sum(coalesce(l.budget, 0)), 0)::numeric as val
    from public.leads l
    left join public.pipeline_stages ps on ps.org_id = p_org_id and ps.slug = l.stage
    where l.org_id = p_org_id
      and (p_salesperson_id is null or l.salesperson_id = p_salesperson_id)
      and (p_region_id is null or l.region_id = p_region_id)
      and (p_project_id is null or l.project_id = p_project_id)
      and (p_start_date is null or l.created_at >= p_start_date)
      and (p_end_date is null or l.created_at <= p_end_date)
    group by coalesce(ps.slug, l.stage), coalesce(ps.name, initcap(replace(l.stage, '_', ' '))), ps.color, ps.sort_order
    order by sort_order asc
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'slug', sc.slug,
        'name', sc.name,
        'color', sc.color,
        'sort_order', sc.sort_order,
        'count', sc.count,
        'value', sc.val
      )
    ),
    '[]'::jsonb
  ) into v_stages
  from stage_counts sc;

  -- 3. Deal Health Breakdowns
  select jsonb_build_object(
    'healthy', count(*) filter (where l.health = 'healthy')::integer,
    'warning', count(*) filter (where l.health = 'warning')::integer,
    'critical', count(*) filter (where l.health = 'critical')::integer,
    'unresponsive', count(*) filter (where l.followup_status = 'unresponsive')::integer,
    'cooling_down', count(*) filter (where l.followup_status = 'cooling_down')::integer,
    'escalated', count(*) filter (where l.followup_status = 'escalated')::integer
  ) into v_deal_health
  from public.leads l
  where l.org_id = p_org_id
    and (p_salesperson_id is null or l.salesperson_id = p_salesperson_id)
    and (p_region_id is null or l.region_id = p_region_id)
    and (p_project_id is null or l.project_id = p_project_id);

  -- 4. Weighted Pipeline Forecast (Calculated with default probability heuristic)
  select coalesce(sum(
    coalesce(l.budget, 0) * (
      case l.stage
        when 'new' then 0.10
        when 'contacted' then 0.20
        when 'qualified' then 0.40
        when 'site_visit' then 0.60
        when 'negotiation' then 0.80
        when 'won' then 1.00
        else 0.00
      end
    )
  ), 0)::numeric
  into v_weighted_val
  from public.leads l
  where l.org_id = p_org_id
    and l.stage not in ('lost')
    and (p_salesperson_id is null or l.salesperson_id = p_salesperson_id)
    and (p_region_id is null or l.region_id = p_region_id)
    and (p_project_id is null or l.project_id = p_project_id);

  v_forecast := jsonb_build_object(
    'weighted_pipeline_value', v_weighted_val,
    'active_pipeline_value', v_summary.active_val,
    'won_revenue', v_summary.won_val
  );

  return jsonb_build_object(
    'summary', jsonb_build_object(
      'total_leads', v_summary.total_count,
      'active_leads', v_summary.active_count,
      'won_leads', v_summary.won_count,
      'lost_leads', v_summary.lost_count,
      'active_pipeline_value', v_summary.active_val,
      'won_revenue', v_summary.won_val,
      'avg_won_deal_value', v_summary.avg_won_val,
      'avg_active_budget', v_summary.avg_active_budget,
      'conversion_rate', case when v_summary.total_count > 0 then round((v_summary.won_count::numeric / v_summary.total_count::numeric) * 100, 2) else 0 end
    ),
    'stages', v_stages,
    'deal_health', v_deal_health,
    'forecast', v_forecast
  );
end;
$$;

-- Re-define get_rep_performance_analytics with strict org check
create or replace function public.get_rep_performance_analytics(
  p_org_id uuid,
  p_start_date timestamptz default null,
  p_end_date timestamptz default null,
  p_salesperson_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reps jsonb;
begin
  if p_org_id is null then
    p_org_id := public.current_org_id();
  end if;

  if p_org_id is distinct from public.current_org_id() then
    raise exception 'TENANT_ISOLATION_VIOLATION: unauthorized rep analytics access'
      using errcode = '42501';
  end if;

  with rep_leads as (
    select
      p.user_id,
      p.full_name as name,
      coalesce(u.email, '') as email,
      p.role,
      p.avatar_url,
      p.region_id,
      r.name as region_name,
      count(l.id)::integer as total_leads,
      count(l.id) filter (where l.stage = 'won')::integer as won_leads,
      count(l.id) filter (where l.stage = 'lost')::integer as lost_leads,
      count(l.id) filter (where l.stage not in ('won', 'lost'))::integer as active_leads,
      coalesce(sum(coalesce(l.budget, 0)) filter (where l.stage = 'won'), 0)::numeric as won_value,
      coalesce(sum(coalesce(l.budget, 0)) filter (where l.stage not in ('won', 'lost')), 0)::numeric as pipeline_value
    from public.profiles p
    left join auth.users u on u.id = p.user_id
    left join public.regions r on r.id = p.region_id
    left join public.leads l on l.salesperson_id = p.user_id
      and (p_start_date is null or l.created_at >= p_start_date)
      and (p_end_date is null or l.created_at <= p_end_date)
    where p.org_id = p_org_id
      and (p_salesperson_id is null or p.user_id = p_salesperson_id)
    group by p.user_id, p.full_name, u.email, p.role, p.avatar_url, p.region_id, r.name
  ),
  rep_activities as (
    select
      a.user_id,
      count(a.id)::integer as total_activities,
      count(a.id) filter (where a.type = 'call')::integer as total_calls,
      count(a.id) filter (where a.type = 'site_visit')::integer as total_site_visits,
      count(a.id) filter (where a.type = 'whatsapp')::integer as total_whatsapp
    from public.activities a
    where a.org_id = p_org_id
      and (p_start_date is null or a.created_at >= p_start_date)
      and (p_end_date is null or a.created_at <= p_end_date)
    group by a.user_id
  ),
  rep_tasks as (
    select
      t.salesperson_id as user_id,
      count(t.id)::integer as total_tasks,
      count(t.id) filter (where t.status = 'completed')::integer as completed_tasks,
      count(t.id) filter (where t.status = 'overdue')::integer as overdue_tasks
    from public.tasks t
    where t.org_id = p_org_id
      and (p_start_date is null or t.created_at >= p_start_date)
      and (p_end_date is null or t.created_at <= p_end_date)
    group by t.salesperson_id
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'user_id', rl.user_id,
        'name', rl.name,
        'email', rl.email,
        'role', rl.role,
        'avatar_url', rl.avatar_url,
        'region_id', rl.region_id,
        'region_name', rl.region_name,
        'total_leads', rl.total_leads,
        'active_leads', rl.active_leads,
        'won_leads', rl.won_leads,
        'lost_leads', rl.lost_leads,
        'won_value', rl.won_value,
        'pipeline_value', rl.pipeline_value,
        'conversion_rate', case when rl.total_leads > 0 then round((rl.won_leads::numeric / rl.total_leads::numeric) * 100, 1) else 0 end,
        'total_activities', coalesce(ra.total_activities, 0),
        'calls', coalesce(ra.total_calls, 0),
        'site_visits', coalesce(ra.total_site_visits, 0),
        'whatsapp', coalesce(ra.total_whatsapp, 0),
        'tasks_completed', coalesce(rt.completed_tasks, 0),
        'tasks_overdue', coalesce(rt.overdue_tasks, 0),
        'task_completion_rate', case when coalesce(rt.total_tasks, 0) > 0 then round((rt.completed_tasks::numeric / rt.total_tasks::numeric) * 100, 1) else 100 end
      )
    ),
    '[]'::jsonb
  ) into v_reps
  from rep_leads rl
  left join rep_activities ra on ra.user_id = rl.user_id
  left join rep_tasks rt on rt.user_id = rl.user_id;

  return coalesce(v_reps, '[]'::jsonb);
end;
$$;

-- Re-define get_time_series_analytics with strict org check
create or replace function public.get_time_series_analytics(
  p_org_id uuid,
  p_start_date timestamptz default null,
  p_end_date timestamptz default null,
  p_interval text default 'day',
  p_salesperson_id uuid default null,
  p_region_id uuid default null,
  p_project_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start timestamptz;
  v_end timestamptz;
  v_series jsonb;
begin
  if p_org_id is null then
    p_org_id := public.current_org_id();
  end if;

  if p_org_id is distinct from public.current_org_id() then
    raise exception 'TENANT_ISOLATION_VIOLATION: unauthorized time series analytics access'
      using errcode = '42501';
  end if;

  v_start := coalesce(p_start_date, now() - interval '30 days');
  v_end := coalesce(p_end_date, now());

  with time_buckets as (
    select generate_series(
      date_trunc(p_interval, v_start),
      date_trunc(p_interval, v_end),
      case p_interval
        when 'month' then interval '1 month'
        when 'week' then interval '1 week'
        else interval '1 day'
      end
    ) as bucket
  ),
  lead_aggregates as (
    select
      date_trunc(p_interval, l.created_at) as bucket,
      count(l.id)::integer as new_leads,
      coalesce(sum(coalesce(l.budget, 0)), 0)::numeric as new_pipeline_value
    from public.leads l
    where l.org_id = p_org_id
      and l.created_at >= v_start and l.created_at <= v_end
      and (p_salesperson_id is null or l.salesperson_id = p_salesperson_id)
      and (p_region_id is null or l.region_id = p_region_id)
      and (p_project_id is null or l.project_id = p_project_id)
    group by date_trunc(p_interval, l.created_at)
  ),
  won_aggregates as (
    select
      date_trunc(p_interval, l.updated_at) as bucket,
      count(l.id)::integer as won_leads,
      coalesce(sum(coalesce(l.budget, 0)), 0)::numeric as won_value
    from public.leads l
    where l.org_id = p_org_id
      and l.stage = 'won'
      and l.updated_at >= v_start and l.updated_at <= v_end
      and (p_salesperson_id is null or l.salesperson_id = p_salesperson_id)
      and (p_region_id is null or l.region_id = p_region_id)
      and (p_project_id is null or l.project_id = p_project_id)
    group by date_trunc(p_interval, l.updated_at)
  ),
  activity_aggregates as (
    select
      date_trunc(p_interval, a.created_at) as bucket,
      count(a.id)::integer as total_activities,
      count(a.id) filter (where a.type = 'call')::integer as calls,
      count(a.id) filter (where a.type = 'site_visit')::integer as site_visits
    from public.activities a
    where a.org_id = p_org_id
      and a.created_at >= v_start and a.created_at <= v_end
    group by date_trunc(p_interval, a.created_at)
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'date', to_char(tb.bucket, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'new_leads', coalesce(la.new_leads, 0),
        'new_pipeline_value', coalesce(la.new_pipeline_value, 0),
        'won_leads', coalesce(wa.won_leads, 0),
        'won_value', coalesce(wa.won_value, 0),
        'activities', coalesce(aa.total_activities, 0),
        'calls', coalesce(aa.calls, 0),
        'site_visits', coalesce(aa.site_visits, 0)
      ) order by tb.bucket asc
    ),
    '[]'::jsonb
  ) into v_series
  from time_buckets tb
  left join lead_aggregates la on la.bucket = tb.bucket
  left join won_aggregates wa on wa.bucket = tb.bucket
  left join activity_aggregates aa on aa.bucket = tb.bucket;

  return coalesce(v_series, '[]'::jsonb);
end;
$$;

-- Re-define get_pipeline_velocity_analytics with strict org check
create or replace function public.get_pipeline_velocity_analytics(
  p_org_id uuid,
  p_start_date timestamptz default null,
  p_end_date timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stage_velocity jsonb;
  v_overall_cycle numeric;
  v_total_won integer;
  v_total_leads integer;
begin
  if p_org_id is null then
    p_org_id := public.current_org_id();
  end if;

  if p_org_id is distinct from public.current_org_id() then
    raise exception 'TENANT_ISOLATION_VIOLATION: unauthorized velocity analytics access'
      using errcode = '42501';
  end if;

  select count(*)::integer into v_total_leads from public.leads where org_id = p_org_id;

  with stage_stats as (
    select
      coalesce(ps.slug, l.stage) as slug,
      coalesce(ps.name, initcap(replace(l.stage, '_', ' '))) as name,
      coalesce(ps.sort_order, 99) as sort_order,
      coalesce(ps.color, '#6366f1') as color,
      count(l.id)::integer as count,
      coalesce(sum(coalesce(l.budget, 0)), 0)::numeric as value,
      coalesce(round(avg(coalesce(l.days_in_stage, 0)), 1), 0.0) as avg_days_in_stage
    from public.leads l
    left join public.pipeline_stages ps on ps.org_id = p_org_id and ps.slug = l.stage
    where l.org_id = p_org_id
      and (p_start_date is null or l.created_at >= p_start_date)
      and (p_end_date is null or l.created_at <= p_end_date)
    group by coalesce(ps.slug, l.stage), coalesce(ps.name, initcap(replace(l.stage, '_', ' '))), ps.sort_order, ps.color
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'slug', ss.slug,
        'name', ss.name,
        'sort_order', ss.sort_order,
        'color', ss.color,
        'count', ss.count,
        'value', ss.value,
        'avg_days_in_stage', ss.avg_days_in_stage
      ) order by ss.sort_order asc
    ),
    '[]'::jsonb
  ) into v_stage_velocity
  from stage_stats ss;

  select
    count(l.id)::integer,
    coalesce(round(avg(extract(epoch from (l.updated_at - l.created_at)) / 86400)::numeric, 1), 0.0)
  into v_total_won, v_overall_cycle
  from public.leads l
  where l.org_id = p_org_id
    and l.stage = 'won'
    and (p_start_date is null or l.created_at >= p_start_date)
    and (p_end_date is null or l.created_at <= p_end_date);

  return jsonb_build_object(
    'stages', coalesce(v_stage_velocity, '[]'::jsonb),
    'avg_sales_cycle_days', coalesce(v_overall_cycle, 0.0),
    'total_won_deals', coalesce(v_total_won, 0),
    'total_leads_analyzed', coalesce(v_total_leads, 0)
  );
end;
$$;

-- Re-define get_advanced_funnel_analytics with strict org check
create or replace function public.get_advanced_funnel_analytics(
  p_org_id uuid,
  p_start_date timestamptz default null,
  p_end_date timestamptz default null,
  p_salesperson_id uuid default null,
  p_region_id uuid default null,
  p_project_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pipeline jsonb;
  v_reps jsonb;
  v_time_series jsonb;
  v_velocity jsonb;
  v_sla jsonb;
begin
  if p_org_id is null then
    p_org_id := public.current_org_id();
  end if;

  if p_org_id is distinct from public.current_org_id() then
    raise exception 'TENANT_ISOLATION_VIOLATION: unauthorized funnel analytics access'
      using errcode = '42501';
  end if;

  -- 1. Pipeline Summary & Stages
  v_pipeline := public.get_pipeline_analytics(p_org_id, p_start_date, p_end_date, p_salesperson_id, p_region_id, p_project_id);

  -- 2. Rep Performance
  v_reps := public.get_rep_performance_analytics(p_org_id, p_start_date, p_end_date, p_salesperson_id);

  -- 3. Time Series
  v_time_series := public.get_time_series_analytics(p_org_id, p_start_date, p_end_date, 'day', p_salesperson_id, p_region_id, p_project_id);

  -- 4. Velocity
  v_velocity := public.get_pipeline_velocity_analytics(p_org_id, p_start_date, p_end_date);

  -- 5. SLA & Follow-up Analytics
  select jsonb_build_object(
    'total_tasks', count(*)::integer,
    'upcoming_tasks', count(*) filter (where t.status = 'upcoming')::integer,
    'due_today_tasks', count(*) filter (where t.status = 'due_today')::integer,
    'overdue_tasks', count(*) filter (where t.status = 'overdue')::integer,
    'completed_tasks', count(*) filter (where t.status = 'completed')::integer,
    'overdue_percentage', case when count(*) > 0 then round((count(*) filter (where t.status = 'overdue')::numeric / count(*)::numeric) * 100, 1) else 0 end,
    'sla_compliance_percentage', case when count(*) > 0 then round(((count(*) - count(*) filter (where t.status = 'overdue'))::numeric / count(*)::numeric) * 100, 1) else 100.0 end
  )
  into v_sla
  from public.tasks t
  where t.org_id = p_org_id
    and (p_salesperson_id is null or t.salesperson_id = p_salesperson_id);

  return jsonb_build_object(
    'pipeline', v_pipeline->'summary',
    'stages', v_pipeline->'stages',
    'deal_health', v_pipeline->'deal_health',
    'forecast', v_pipeline->'forecast',
    'reps', v_reps,
    'time_series', v_time_series,
    'velocity', v_velocity,
    'sla', v_sla
  );
end;
$$;

-- --------------------------------------------------------------------
-- 5. SLA & DEAL HEALTH RECOMPUTATION FUNCTION GUARDS (C-DB8)
-- --------------------------------------------------------------------
revoke execute on function public.recompute_lead_health_and_slas(uuid) from anon, public;
grant execute on function public.recompute_lead_health_and_slas(uuid) to authenticated;

create or replace function public.recompute_lead_health_and_slas(
  p_org_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead record;
  v_health record;
  v_today_str text;
  v_time_str text;
  v_leads_checked integer := 0;
  v_leads_updated integer := 0;
  v_tasks_marked_overdue integer := 0;
  v_deals_at_risk integer := 0;
  v_notifications_created integer := 0;
  v_new_followup_status text;
  v_health_changed boolean;
  v_followup_changed boolean;
  v_days_in_stage integer;
  v_now timestamptz := now();
  v_today_date text;
  v_manager_id uuid;
begin
  -- Resolve tenant boundary: default to caller's org if not specified
  if p_org_id is null then
    p_org_id := public.current_org_id();
  end if;

  -- Block cross-tenant execution if called by authenticated user
  if auth.uid() is not null and p_org_id is distinct from public.current_org_id() then
    raise exception 'TENANT_ISOLATION_VIOLATION: unauthorized sla recomputation'
      using errcode = '42501';
  end if;

  -- Ensure p_org_id is present so we never loop unbounded across all orgs
  if p_org_id is null then
    raise exception 'ORGANIZATION_REQUIRED: p_org_id must be provided'
      using errcode = '22023';
  end if;

  v_today_str := to_char(v_now, 'YYYY-MM-DD');
  v_time_str := to_char(v_now, 'HH24:MI:SS');
  v_today_date := v_today_str;

  -- 1. Advance Tasks: past due tasks -> 'overdue' for this org
  with updated_overdue as (
    update public.tasks
    set status = 'overdue'
    where org_id = p_org_id
      and status in ('upcoming', 'due_today')
      and (
        due_date < v_today_str
        or (due_date = v_today_str and due_time is not null and due_time < v_time_str)
      )
    returning id
  )
  select count(*)::integer into v_tasks_marked_overdue from updated_overdue;

  -- 2. Evaluate Leads: Deal Health & Follow-up status for specified org
  for v_lead in
    select
      l.id,
      l.org_id,
      l.stage,
      l.health,
      l.followup_status,
      l.salesperson_id,
      l.created_at,
      l.updated_at,
      l.stage_entered_at,
      l.person_name,
      l.budget
    from public.leads l
    where l.org_id = p_org_id
      and l.stage not in ('won', 'lost')
  loop
    v_leads_checked := v_leads_checked + 1;
    v_health_changed := false;
    v_followup_changed := false;

    v_days_in_stage := greatest(
      0,
      extract(epoch from (v_now - coalesce(v_lead.stage_entered_at, v_lead.updated_at, v_lead.created_at)))::integer / 86400
    );

    v_health := public.compute_deal_health(v_lead.id);

    if v_health.health is distinct from v_lead.health then
      v_health_changed := true;
    end if;

    if v_health.health in ('warning', 'critical') and v_lead.health = 'healthy' then
      v_deals_at_risk := v_deals_at_risk + 1;
    end if;

    v_new_followup_status := v_lead.followup_status;
    if v_days_in_stage >= 14 and v_lead.stage in ('contacted', 'qualified') then
      v_new_followup_status := 'stale';
    elsif v_days_in_stage >= 7 and v_lead.stage = 'new' then
      v_new_followup_status := 'unresponsive';
    elsif v_health.health = 'critical' then
      v_new_followup_status := 'escalated';
    end if;

    if v_new_followup_status is distinct from v_lead.followup_status then
      v_followup_changed := true;
    end if;

    if v_health_changed or v_followup_changed then
      update public.leads
      set
        health = v_health.health,
        health_reason = v_health.primary_risk_factor,
        followup_status = v_new_followup_status,
        days_in_stage = v_days_in_stage,
        updated_at = v_now
      where id = v_lead.id;

      v_leads_updated := v_leads_updated + 1;

      -- Escalation notification to salesperson / manager if health critical
      if v_health.health = 'critical' and v_lead.salesperson_id is not null then
        insert into public.notifications (
          org_id,
          user_id,
          title,
          message,
          type,
          priority,
          entity_type,
          entity_id,
          dedup_key
        ) values (
          v_lead.org_id,
          v_lead.salesperson_id,
          'Critical Deal Health: ' || coalesce(v_lead.person_name, 'Lead'),
          coalesce(v_health.primary_risk_factor, 'Deal health has deteriorated to critical.'),
          'deal_at_risk',
          'high',
          'lead',
          v_lead.id,
          'deal_health_' || v_lead.id::text || '_' || v_today_str
        )
        on conflict do nothing;

        v_notifications_created := v_notifications_created + 1;
      end if;
    end if;
  end loop;

  return jsonb_build_object(
    'org_id', p_org_id,
    'leads_checked', v_leads_checked,
    'leads_updated', v_leads_updated,
    'tasks_marked_overdue', v_tasks_marked_overdue,
    'deals_at_risk', v_deals_at_risk,
    'notifications_created', v_notifications_created,
    'recomputed_at', v_now
  );
end;
$$;

-- --------------------------------------------------------------------
-- 6. SEARCH PATH HIJACKING MITIGATIONS (M-05)
-- --------------------------------------------------------------------
alter function public.maintain_lead_stage_timestamp() set search_path = '';
alter function public.trg_sync_people_names_phones() set search_path = '';

-- --------------------------------------------------------------------
-- 7. PROJECT CONTACTS VIEW SECURITY INVOKER (M-07)
-- --------------------------------------------------------------------
alter view public.project_contacts_view set (security_invoker = true);

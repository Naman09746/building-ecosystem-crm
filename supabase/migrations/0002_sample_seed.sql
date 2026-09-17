-- ============================================================================
-- Ecosystem Realty — Migration 0002: First-Run Sample Data Seeder
-- Callable by any authenticated user; seeds ONLY the caller's organization
-- (resolved via profiles -> current_org_id()). No-ops if already seeded.
-- ============================================================================

create or replace function public.seed_organization_sample_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_user uuid;
  v_user_name text;
  v_region_ggn uuid;
  v_region_sdl uuid;
  v_region_noi uuid;
  v_region_mum uuid;
begin
  v_org := public.current_org_id();
  if v_org is null then
    raise exception 'CALLER_HAS_NO_ORGANIZATION';
  end if;

  -- Idempotency guard: never seed twice
  if exists (select 1 from projects where org_id = v_org) then
    return;
  end if;

  select user_id, full_name into v_user, v_user_name
  from profiles where user_id = auth.uid() limit 1;
  if v_user is null then
    raise exception 'CALLER_HAS_NO_PROFILE';
  end if;

  -- ---------------------------------------------------------------- Regions
  insert into regions (org_id, name, code) values
    (v_org, 'Gurgaon', 'GGM'),
    (v_org, 'South Delhi', 'SDL'),
    (v_org, 'Noida', 'NOI'),
    (v_org, 'Mumbai', 'MUM');

  select id into v_region_ggn from regions where org_id = v_org and code = 'GGM';
  select id into v_region_sdl from regions where org_id = v_org and code = 'SDL';
  select id into v_region_noi from regions where org_id = v_org and code = 'NOI';
  select id into v_region_mum from regions where org_id = v_org and code = 'MUM';

  -- --------------------------------------------------------------- Projects
  insert into projects (org_id, region_id, name, developer, location, price_range, status) values
    (v_org, v_region_ggn, 'DLF The Camellias', 'DLF', 'Golf Course Road, Gurgaon', '₹18 - 42 Cr', 'active');
  insert into projects (org_id, region_id, name, developer, location, price_range, status) values
    (v_org, v_region_ggn, 'M3M Golf Estates', 'M3M India', 'Sector 65, Gurgaon', '₹6 - 14 Cr', 'active');
  insert into projects (org_id, region_id, name, developer, location, price_range, status) values
    (v_org, v_region_sdl, 'DLF The Aralias', 'DLF', 'Magnolias, DLF Phase V, Gurgaon', '₹15 - 30 Cr', 'active');
  insert into projects (org_id, region_id, name, developer, location, price_range, status) values
    (v_org, v_region_noi, 'Godrej Woods', 'Godrej Properties', 'Sector 43, Noida', '₹4 - 9 Cr', 'launching_soon');
  insert into projects (org_id, region_id, name, developer, location, price_range, status) values
    (v_org, v_region_mum, 'Lodha Altamount', 'Lodha Group', 'Altamount Road, Mumbai', '₹12 - 35 Cr', 'active');
  insert into projects (org_id, region_id, name, developer, location, price_range, status) values
    (v_org, v_region_mum, 'Oberoi Sky City', 'Oberoi Realty', 'Borivali East, Mumbai', '₹5 - 12 Cr', 'active');

  -- ------------------------------------------------------------------ Units
  -- ~8 units per project across two towers (procedural generation)
  insert into project_units (org_id, project_id, tower, unit_number, floor, configuration, super_area_sq_ft, price, status, facing)
  select
    v_org,
    p.id,
    params.tower,
    params.tower || '-' || f || '0' || u,
    f,
    case when f >= 3 then '4 BHK Penthouse' else '3 BHK Luxury' end,
    params.area + (f * 5),
    round(params.base_price * (1 + (f - 1) * 0.015))::numeric(15,2),
    'available',
    case when u = 1 then 'North-East' when u = 2 then 'Park Facing' else 'East' end
  from (values
    ('Camellias', 1850000000, 4200),
    ('Golf Estates', 85000000, 3100),
    ('Aralias', 210000000, 3850),
    ('Woods', 65000000, 2450),
    ('Altamount', 240000000, 3600),
    ('Sky City', 78000000, 2050)
  ) as params(tower, base_price, area)
  cross join generate_series(1, 4) as f
  cross join generate_series(1, 2) as u
  join projects p on p.org_id = v_org and p.name like '%' || params.tower || '%';

  -- mark a few units as hold/booked for realism
  update project_units set status = 'hold'
  where id in (
    select id from project_units where org_id = v_org order by random() limit 6
  );
  update project_units set status = 'booked'
  where id in (
    select id from project_units where org_id = v_org and status = 'available' order by random() limit 6
  );

  -- ----------------------------------------------------------------- People
  insert into people (org_id, name, phone, email, city, source, budget, preferred_configuration) values
    (v_org, 'Siddharth Verma', '+91 98110 99234', 'siddharth.v@example.in', 'Gurgaon', 'Portal Inbound', 38000000, '3 BHK + Servant'),
    (v_org, 'Ananya Singhania', '+91 98200 11456', 'ananya.s@example.in', 'Mumbai', 'Referral', 95000000, '4 BHK Duplex'),
    (v_org, 'Rajesh Nair', '+91 98450 12398', 'rajesh.nair@example.in', 'Gurgaon', 'Website Inbound', 45000000, '4 BHK Villa'),
    (v_org, 'Vikramaditya Oberoi', '+91 98710 44556', 'vikram.o@example.in', 'Dubai / Mumbai', 'NRI Campaign', 65000000, 'Penthouse'),
    (v_org, 'Kavita Rao', '+91 99100 22334', 'kavita.rao@example.in', 'New Delhi', 'WhatsApp Inbound', 28000000, '3 BHK Luxury'),
    (v_org, 'Arjun Malhotra', '+91 98730 55678', 'arjun.m@example.in', 'Noida', 'Channel Partner', 72000000, '4 BHK + Study'),
    (v_org, 'Meera Kapoor', '+91 98209 77665', 'meera.k@example.in', 'Mumbai', 'Site Visit Walk-in', 120000000, 'Sky Villa'),
    (v_org, 'Rohan Khanna', '+91 98183 33445', 'rohan.kh@example.in', 'Gurgaon', 'Google Ads', 55000000, '3 BHK + Servant');

  -- ------------------------------------------------------------------ Leads
  -- Spread across stages/scores so pipeline, priority & resurrection views work.
  with lead_src as (
    select * from (values
      ('Siddharth Verma', '+91 98110 99234', '%Camellias%', 'qualified', 92, 'Hot', 'strong', 3, 38000000, 'End-User (Primary Residence)'),
      ('Ananya Singhania', '+91 98200 11456', '%Altamount%', 'negotiation', 88, 'Hot', 'strong', 6, 95000000, 'End-User (Primary Residence)'),
      ('Rajesh Nair', '+91 98450 12398', '%Golf Estates%', 'site_visit', 85, 'Hot', 'strong', 2, 45000000, 'End-User (Primary Residence)'),
      ('Vikramaditya Oberoi', '+91 98710 44556', '%Altamount%', 'contacted', 76, 'Warm', 'neutral', 9, 65000000, 'High-yield Investor'),
      ('Kavita Rao', '+91 99100 22334', '%Woods%', 'new', 71, 'Warm', 'neutral', 1, 28000000, 'End-User (Primary Residence)'),
      ('Arjun Malhotra', '+91 98730 55678', '%Woods%', 'contacted', 74, 'Warm', 'strong', 16, 72000000, 'End-User (Primary Residence)'),
      ('Meera Kapoor', '+91 98209 77665', '%Camellias%', 'negotiation', 90, 'Hot', 'strong', 11, 120000000, 'End-User (Primary Residence)'),
      ('Rohan Khanna', '+91 98183 33445', '%Golf Estates%', 'qualified', 80, 'Warm', 'strong', 19, 55000000, 'Investor + Self-use'),
      ('Sanjay Gupta', '+91 98111 44556', '%Sky City%', 'lost', 40, 'Cold', 'at_risk', 25, 60000000, 'Investor'),
      ('Priya Desai', '+91 98201 88779', '%Sky City%', 'won', 95, 'Hot', 'strong', 1, 90000000, 'End-User (Primary Residence)'),
      ('Nikhil Bhatia', '+91 98993 22110', '%Aralias%', 'site_visit', 83, 'Hot', 'strong', 4, 150000000, 'End-User (Primary Residence)'),
      ('Shalini Iyer', '+91 98451 66778', '%Aralias%', 'lost', 45, 'Cold', 'at_risk', 30, 160000000, 'Investor')
    ) as t(name, phone, proj_like, stage, score, label, health, days, budget, intent)
  )
  insert into leads (
    org_id, person_name, phone, phone_normalized, email, project_id, project_name,
    region_id, region_name, budget, stage, source, lead_score, lead_score_label,
    deal_health, buyer_intent, days_in_stage, last_activity_text, last_activity_at,
    next_follow_up_at, follow_up_status
  )
  select
    v_org, ls.name, ls.phone, public.normalize_phone(ls.phone),
    lower(replace(ls.name, ' ', '.')) || '@example.in',
    pm.id, pm.name,
    pm.region_id, r.name,
    ls.budget, ls.stage::text, 'Portal Inbound', ls.score, ls.label,
    ls.health::text, ls.intent, ls.days,
    case when ls.stage = 'won' then 'Booking formalized' else 'Last touchpoint logged' end,
    now() - (ls.days || ' days')::interval,
    case when ls.stage in ('new','contacted','qualified','site_visit','negotiation') then 'Tomorrow, 11:00 AM' else null end,
    case when ls.stage in ('new','contacted','qualified','site_visit','negotiation') then 'upcoming' else 'completed' end
  from lead_src ls
  join projects pm on pm.org_id = v_org and pm.name like ls.proj_like
  join regions r on r.id = pm.region_id;

  -- Attach caller as the owning salesperson for all seeded leads
  update leads set salesperson_id = v_user where org_id = v_org and salesperson_id is null;

  -- ------------------------------------------------------- Activities/Tasks
  insert into activities (org_id, lead_id, person_id, user_id, user_name, person_name, type, outcome_label, notes, occurred_at)
  select l.org_id, l.id, null, v_user, v_user_name, l.person_name, 'call', 'Interested — sharing floor plans',
         format('Discovery call completed. Budget confirmed at %s.', to_char(l.budget, 'FM999999999')),
         now() - interval '2 hours'
  from leads l
  where l.org_id = v_org and l.stage in ('qualified', 'site_visit', 'negotiation')
  limit 8;

  insert into tasks (org_id, lead_id, salesperson_id, person_name, phone, project_name, title, due_date, due_time, status, priority)
  select l.org_id, l.id, coalesce(l.salesperson_id, v_user), l.person_name, l.phone, l.project_name,
         format('Follow-up: share %s floor plans', l.project_name),
         'Today', '04:30 PM', 'due_today', 'high'
  from leads l
  where l.org_id = v_org and l.stage in ('qualified', 'negotiation')
  limit 6;

end;
$$;

revoke execute on function public.seed_organization_sample_data() from anon;

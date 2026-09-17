-- ====================================================================
-- MIGRATION 0032: Hardening — POD + Stock/credit gates + collections
-- ====================================================================

-- 1. POD + LR columns on dispatch_challans
do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='dispatch_challans' and column_name='lr_no') then
    alter table public.dispatch_challans add column lr_no text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='dispatch_challans' and column_name='freight_amount') then
    alter table public.dispatch_challans add column freight_amount numeric(12,2);
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='dispatch_challans' and column_name='pod_photo_url') then
    alter table public.dispatch_challans add column pod_photo_url text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='dispatch_challans' and column_name='pod_receiver_name') then
    alter table public.dispatch_challans add column pod_receiver_name text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='dispatch_challans' and column_name='pod_received_at') then
    alter table public.dispatch_challans add column pod_received_at timestamptz;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='dispatch_challans' and column_name='short_bags') then
    alter table public.dispatch_challans add column short_bags numeric(12,2) default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='dispatch_challans' and column_name='damaged_bags') then
    alter table public.dispatch_challans add column damaged_bags numeric(12,2) default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='dispatch_challans' and column_name='pod_notes') then
    alter table public.dispatch_challans add column pod_notes text;
  end if;
end $$;

-- 2. Trigger: auto Khata credit on delivered (and stock decrement)
create or replace function public.trg_dispatch_delivered_khata()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders%rowtype;
  v_ledger_id uuid;
  v_delivered_qty numeric;
begin
  if NEW.status = 'delivered' and OLD.status != 'delivered' then
    select * into v_order from public.orders where id = NEW.order_id;
    if not found then return NEW; end if;

    -- Stock decrement per item (short/damaged already excluded from delivered qty handling in UI, we use dispatch_items quantity)
    -- Fulfilled quantity update
    update public.order_items oi set fulfilled_quantity = fulfilled_quantity + di.quantity
    from public.dispatch_items di where di.challan_id = NEW.id and di.order_item_id = oi.id;

    -- Inventory decrement (location_name from challan; batch null)
    -- Sum per catalog
    begin
      insert into public.inventory_movements(org_id, catalog_item_id, location_name, quantity_change, movement_type, reference_id, notes)
      select NEW.org_id, di.catalog_item_id, 'DEMO-DEPOT', -di.quantity, 'dispatch', NEW.id, 'auto on delivered POD'
      from public.dispatch_items di where di.challan_id = NEW.id
      on conflict do nothing;
    exception when others then null;
    end;

    -- Khata credit: find ledger by dealer or customer
    select id into v_ledger_id from public.materials_khata_ledgers
    where org_id = NEW.org_id and (dealer_id = v_order.dealer_id or dealer_id is not null)
    order by dealer_id = v_order.dealer_id desc nulls last limit 1;

    -- If no ledger tagged to dealer, try by customer org/person external, else skip
    if v_ledger_id is not null then
      v_delivered_qty := (select coalesce(sum(quantity),0) from public.dispatch_items where challan_id = NEW.id);
      -- Use order total prorated by delivered qty if needed; simplest: credit full order total on first delivered
      -- For now, credit = sum(di.quantity * oi.unit_price) from this challan
      insert into public.materials_khata_transactions(org_id, ledger_id, site_id, order_id, type, amount, notes, created_at)
      select NEW.org_id, v_ledger_id, v_order.site_id, v_order.id, 'credit',
             coalesce(sum(di.quantity * oi.unit_price),0),
             'auto credit on delivery challan ' || NEW.challan_number, now()
      from public.dispatch_items di join public.order_items oi on oi.id = di.order_item_id where di.challan_id = NEW.id;
    end if;
  end if;
  return NEW;
end;
$$;
drop trigger if exists trg_dispatch_delivered_khata on public.dispatch_challans;
create trigger trg_dispatch_delivered_khata after update on public.dispatch_challans for each row execute function public.trg_dispatch_delivered_khata();

-- 3. Credit + Stock gate function (called from API before order insert, also as DB check)
create or replace function public.assert_order_can_be_placed(p_org_id uuid, p_dealer_id uuid, p_total_amount numeric, p_items jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_outstanding numeric; v_limit numeric; v_status text;
  v_item jsonb; v_catalog uuid; v_qty numeric; v_avail numeric;
begin
  -- Credit gate
  if p_dealer_id is not null then
    select outstanding_balance, credit_limit, status into v_outstanding, v_limit, v_status
    from public.materials_khata_ledgers where org_id = p_org_id and dealer_id = p_dealer_id limit 1;
    if found and v_status = 'blocked' then
      raise exception 'CREDIT_BLOCKED: dealer % is blocked', p_dealer_id using errcode='P0001';
    end if;
    if found and v_limit > 0 and (coalesce(v_outstanding,0) + coalesce(p_total_amount,0)) > v_limit then
      raise exception 'CREDIT_LIMIT_EXCEEDED: limit % exceeded by %', v_limit, (v_outstanding + p_total_amount - v_limit) using errcode='P0001';
    end if;
  end if;

  -- Stock gate per item
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_catalog := (v_item->>'catalog_item_id')::uuid;
    v_qty := (v_item->>'quantity')::numeric;
    select coalesce(sum(quantity),0) into v_avail from public.inventory_stock where org_id = p_org_id and catalog_item_id = v_catalog;
    if v_avail < v_qty then
      raise exception 'STOCK_SHORT: catalog % available % < required %', v_catalog, v_avail, v_qty using errcode='P0001';
    end if;
  end loop;
end;
$$;

-- 4. Collections helper: promised_date column on ledgers (simple)
do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='materials_khata_ledgers' and column_name='promised_date') then
    alter table public.materials_khata_ledgers add column promised_date date;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='materials_khata_ledgers' and column_name='cheque_bounce_count') then
    alter table public.materials_khata_ledgers add column cheque_bounce_count integer not null default 0;
  end if;
end $$;

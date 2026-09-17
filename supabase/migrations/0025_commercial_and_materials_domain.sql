-- =================================================================================
-- PHASE 25: Commercial Core & Building Materials Domain
-- =================================================================================

-- ==========================================
-- SHARED CORE: CATALOG (Products/Services)
-- ==========================================
create table if not exists public.catalog_items (
    id uuid primary key default gen_random_uuid(),
    org_id uuid not null references public.orgs(id) on delete cascade,
    type text not null default 'material' check (type in ('material', 'service', 'furniture', 'appliance', 'other')),
    sku text not null,
    name text not null,
    category text,
    brand text,
    uom text not null, -- Unit of Measure (e.g., Bags, Pcs, Sq.Ft.)
    retail_price numeric(15, 2) not null default 0,
    wholesale_price numeric(15, 2) not null default 0,
    moq numeric(15, 2) not null default 1,
    specs jsonb default '{}'::jsonb,
    is_active boolean default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique(org_id, sku)
);

create trigger trg_catalog_items_updated_at before update on public.catalog_items for each row execute function public.trg_set_updated_at();

-- ==========================================
-- SHARED CORE: COMMERCIAL (Quotes & Orders)
-- ==========================================
create table if not exists public.quotes (
    id uuid primary key default gen_random_uuid(),
    org_id uuid not null references public.orgs(id) on delete cascade,
    lead_id uuid references public.leads(id) on delete set null, -- Optional link to opportunity pipeline
    customer_person_id uuid references public.people(id) on delete set null,
    customer_org_id uuid references public.external_organizations(id) on delete set null,
    quote_number text not null,
    status text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'rejected', 'expired')),
    total_amount numeric(15, 2) not null default 0,
    valid_until timestamptz,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique(org_id, quote_number),
    check (customer_person_id is not null or customer_org_id is not null)
);
create trigger trg_quotes_updated_at before update on public.quotes for each row execute function public.trg_set_updated_at();

create table if not exists public.quote_items (
    id uuid primary key default gen_random_uuid(),
    quote_id uuid not null references public.quotes(id) on delete cascade,
    catalog_item_id uuid references public.catalog_items(id) on delete set null,
    quantity numeric(15, 2) not null,
    unit_price numeric(15, 2) not null,
    total_price numeric(15, 2) not null,
    notes text
);

create table if not exists public.orders (
    id uuid primary key default gen_random_uuid(),
    org_id uuid not null references public.orgs(id) on delete cascade,
    quote_id uuid references public.quotes(id) on delete set null,
    lead_id uuid references public.leads(id) on delete set null,
    customer_person_id uuid references public.people(id) on delete set null,
    customer_org_id uuid references public.external_organizations(id) on delete set null,
    order_number text not null,
    status text not null default 'confirmed' check (status in ('confirmed', 'processing', 'partially_fulfilled', 'fulfilled', 'cancelled')),
    total_amount numeric(15, 2) not null default 0,
    expected_delivery_date timestamptz,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique(org_id, order_number),
    check (customer_person_id is not null or customer_org_id is not null)
);
create trigger trg_orders_updated_at before update on public.orders for each row execute function public.trg_set_updated_at();

create table if not exists public.order_items (
    id uuid primary key default gen_random_uuid(),
    order_id uuid not null references public.orders(id) on delete cascade,
    catalog_item_id uuid references public.catalog_items(id) on delete set null,
    quantity numeric(15, 2) not null,
    unit_price numeric(15, 2) not null,
    total_price numeric(15, 2) not null,
    fulfilled_quantity numeric(15, 2) not null default 0,
    notes text
);

-- ==========================================
-- DOMAIN: BUILDING MATERIALS (Inventory & Dispatch)
-- ==========================================
create table if not exists public.inventory_stock (
    id uuid primary key default gen_random_uuid(),
    org_id uuid not null references public.orgs(id) on delete cascade,
    catalog_item_id uuid not null references public.catalog_items(id) on delete cascade,
    location_name text not null,
    batch_lot text,
    quantity numeric(15, 2) not null default 0,
    last_updated timestamptz not null default now(),
    unique(org_id, catalog_item_id, location_name, batch_lot)
);

create table if not exists public.inventory_movements (
    id uuid primary key default gen_random_uuid(),
    org_id uuid not null references public.orgs(id) on delete cascade,
    catalog_item_id uuid not null references public.catalog_items(id) on delete cascade,
    location_name text not null,
    batch_lot text,
    quantity_change numeric(15, 2) not null, -- Positive for stock in, Negative for stock out
    movement_type text not null check (movement_type in ('receipt', 'dispatch', 'adjustment', 'return')),
    reference_id uuid, -- Could refer to a dispatch_challan ID or purchase order
    notes text,
    created_at timestamptz not null default now()
);

create table if not exists public.dispatch_challans (
    id uuid primary key default gen_random_uuid(),
    org_id uuid not null references public.orgs(id) on delete cascade,
    order_id uuid not null references public.orders(id) on delete cascade,
    challan_number text not null,
    vehicle_no text,
    driver_name text,
    driver_phone text,
    status text not null default 'in_transit' check (status in ('pending', 'in_transit', 'delivered', 'failed')),
    dispatched_at timestamptz not null default now(),
    delivered_at timestamptz,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique(org_id, challan_number)
);
create trigger trg_dispatch_challans_updated_at before update on public.dispatch_challans for each row execute function public.trg_set_updated_at();

create table if not exists public.dispatch_items (
    id uuid primary key default gen_random_uuid(),
    challan_id uuid not null references public.dispatch_challans(id) on delete cascade,
    order_item_id uuid not null references public.order_items(id) on delete cascade,
    catalog_item_id uuid not null references public.catalog_items(id) on delete cascade,
    quantity numeric(15, 2) not null
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================
alter table public.catalog_items enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.inventory_stock enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.dispatch_challans enable row level security;
alter table public.dispatch_items enable row level security;

-- Tenant Isolation Policies
create policy "Tenant isolation for catalog_items" on public.catalog_items
    for all using (org_id = (select org_id from public.profiles where user_id = auth.uid()));

create policy "Tenant isolation for quotes" on public.quotes
    for all using (org_id = (select org_id from public.profiles where user_id = auth.uid()));

create policy "Tenant isolation for quote_items" on public.quote_items
    for all using (quote_id in (select id from public.quotes where org_id = (select org_id from public.profiles where user_id = auth.uid())));

create policy "Tenant isolation for orders" on public.orders
    for all using (org_id = (select org_id from public.profiles where user_id = auth.uid()));

create policy "Tenant isolation for order_items" on public.order_items
    for all using (order_id in (select id from public.orders where org_id = (select org_id from public.profiles where user_id = auth.uid())));

create policy "Tenant isolation for inventory_stock" on public.inventory_stock
    for all using (org_id = (select org_id from public.profiles where user_id = auth.uid()));

create policy "Tenant isolation for inventory_movements" on public.inventory_movements
    for all using (org_id = (select org_id from public.profiles where user_id = auth.uid()));

create policy "Tenant isolation for dispatch_challans" on public.dispatch_challans
    for all using (org_id = (select org_id from public.profiles where user_id = auth.uid()));

create policy "Tenant isolation for dispatch_items" on public.dispatch_items
    for all using (challan_id in (select id from public.dispatch_challans where org_id = (select org_id from public.profiles where user_id = auth.uid())));


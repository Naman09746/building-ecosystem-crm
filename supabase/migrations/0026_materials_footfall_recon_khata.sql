-- =================================================================================
-- PHASE 26: Materials Vertical Expansion
-- Footfall Capture, Field Recon Scouting, Khata Credit Ledger & Daily Rates
-- =================================================================================

-- ==========================================
-- 1. RETAIL FOOTFALL & OUTLET VISITS
-- ==========================================
create table if not exists public.materials_footfalls (
    id uuid primary key default gen_random_uuid(),
    org_id uuid not null references public.orgs(id) on delete cascade,
    outlet_name text not null default 'Main Depot',
    person_name text not null,
    person_phone text,
    person_id uuid references public.people(id) on delete set null,
    handled_by uuid references public.profiles(user_id) on delete set null,
    visit_type text not null default 'walk_in' check (visit_type in ('walk_in', 'phone_inquiry', 'site_visitor', 'referral')),
    intent text not null default 'price_check' check (intent in ('price_check', 'bulk_order', 'sample_request', 'credit_khata', 'complaint', 'general')),
    conclusion text not null check (conclusion in ('browsing', 'quote_given', 'order_placed', 'needs_follow_up', 'lost', 'payment_received')),
    conclusion_notes text not null,
    estimated_value numeric(15, 2) default 0,
    follow_up_date timestamptz,
    follow_up_task_id uuid references public.tasks(id) on delete set null,
    activity_id uuid references public.activities(id) on delete set null,
    visited_at timestamptz not null default now(),
    created_at timestamptz not null default now()
);

-- Index for fast lookup by outlet, date, phone
create index if not exists idx_materials_footfalls_org_date on public.materials_footfalls(org_id, visited_at desc);
create index if not exists idx_materials_footfalls_phone on public.materials_footfalls(org_id, person_phone);

-- ==========================================
-- 2. FIELD RECON & SITE SCOUTING
-- ==========================================
create table if not exists public.materials_field_scouts (
    id uuid primary key default gen_random_uuid(),
    org_id uuid not null references public.orgs(id) on delete cascade,
    scouted_by uuid references public.profiles(user_id) on delete set null,
    scouted_by_name text,
    title text not null,
    geo_lat numeric(10, 7) not null,
    geo_long numeric(10, 7) not null,
    address_text text not null,
    photo_urls text[] default array[]::text[],
    voice_note_url text,
    ai_summary text,
    estimated_phase text not null default 'foundation' check (estimated_phase in ('excavation', 'foundation', 'superstructure', 'finishing', 'renovation', 'unknown')),
    estimated_material_needs text[] default array[]::text[],
    potential_value numeric(15, 2) default 0,
    status text not null default 'raw' check (status in ('raw', 'verified', 'contacted', 'converted_to_lead', 'dead')),
    converted_lead_id uuid references public.leads(id) on delete set null,
    contractor_contact_name text,
    contractor_contact_phone text,
    notes text,
    scouted_at timestamptz not null default now(),
    created_at timestamptz not null default now()
);

create index if not exists idx_materials_field_scouts_org_coords on public.materials_field_scouts(org_id, geo_lat, geo_long);
create index if not exists idx_materials_field_scouts_status on public.materials_field_scouts(org_id, status);

-- ==========================================
-- 3. KHATA CREDIT LEDGER & BALANCES
-- ==========================================
create table if not exists public.materials_khata_ledgers (
    id uuid primary key default gen_random_uuid(),
    org_id uuid not null references public.orgs(id) on delete cascade,
    person_id uuid references public.people(id) on delete set null,
    external_org_id uuid references public.external_organizations(id) on delete set null,
    customer_name text not null,
    customer_phone text,
    credit_limit numeric(15, 2) not null default 100000.00,
    outstanding_balance numeric(15, 2) not null default 0.00,
    last_payment_at timestamptz,
    status text not null default 'active' check (status in ('active', 'overdue', 'blocked', 'settled')),
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create trigger trg_materials_khata_ledgers_updated_at before update on public.materials_khata_ledgers for each row execute function public.trg_set_updated_at();
create index if not exists idx_materials_khata_org on public.materials_khata_ledgers(org_id, status);

-- ==========================================
-- 4. KHATA TRANSACTIONS (DEBITS & CREDITS)
-- ==========================================
create table if not exists public.materials_khata_transactions (
    id uuid primary key default gen_random_uuid(),
    ledger_id uuid not null references public.materials_khata_ledgers(id) on delete cascade,
    org_id uuid not null references public.orgs(id) on delete cascade,
    type text not null check (type in ('credit', 'debit')), -- 'credit' = goods dispatched on credit, 'debit' = payment received
    amount numeric(15, 2) not null check (amount > 0),
    order_id uuid references public.orders(id) on delete set null,
    payment_mode text default 'cash' check (payment_mode in ('cash', 'upi', 'cheque', 'bank_transfer', 'credit_note')),
    reference_number text,
    notes text,
    recorded_by uuid references public.profiles(user_id) on delete set null,
    created_at timestamptz not null default now()
);

create index if not exists idx_materials_khata_transactions_ledger on public.materials_khata_transactions(ledger_id, created_at desc);

-- Function to update running balance on transaction insert
create or replace function public.trg_update_khata_balance()
returns trigger as $$
begin
    if new.type = 'credit' then
        update public.materials_khata_ledgers
        set outstanding_balance = outstanding_balance + new.amount,
            updated_at = now()
        where id = new.ledger_id;
    elsif new.type = 'debit' then
        update public.materials_khata_ledgers
        set outstanding_balance = outstanding_balance - new.amount,
            last_payment_at = new.created_at,
            updated_at = now()
        where id = new.ledger_id;
    end if;
    return new;
end;
$$ language plpgsql;

create trigger trg_apply_khata_transaction
after insert on public.materials_khata_transactions
for each row execute function public.trg_update_khata_balance();

-- ==========================================
-- 5. DAILY RATES BOARD & BROADCAST
-- ==========================================
create table if not exists public.materials_daily_rates (
    id uuid primary key default gen_random_uuid(),
    org_id uuid not null references public.orgs(id) on delete cascade,
    catalog_item_id uuid not null references public.catalog_items(id) on delete cascade,
    rate numeric(15, 2) not null check (rate >= 0),
    effective_date date not null default current_date,
    published_by uuid references public.profiles(user_id) on delete set null,
    broadcast_sent boolean not null default false,
    broadcast_sent_at timestamptz,
    notes text,
    created_at timestamptz not null default now(),
    unique(org_id, catalog_item_id, effective_date)
);

create index if not exists idx_materials_daily_rates_lookup on public.materials_daily_rates(org_id, effective_date desc);

-- ==========================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ==========================================
alter table public.materials_footfalls enable row level security;
alter table public.materials_field_scouts enable row level security;
alter table public.materials_khata_ledgers enable row level security;
alter table public.materials_khata_transactions enable row level security;
alter table public.materials_daily_rates enable row level security;

create policy "Tenant isolation for materials_footfalls" on public.materials_footfalls
    for all using (org_id = (select org_id from public.profiles where user_id = auth.uid()));

create policy "Tenant isolation for materials_field_scouts" on public.materials_field_scouts
    for all using (org_id = (select org_id from public.profiles where user_id = auth.uid()));

create policy "Tenant isolation for materials_khata_ledgers" on public.materials_khata_ledgers
    for all using (org_id = (select org_id from public.profiles where user_id = auth.uid()));

create policy "Tenant isolation for materials_khata_transactions" on public.materials_khata_transactions
    for all using (org_id = (select org_id from public.profiles where user_id = auth.uid()));

create policy "Tenant isolation for materials_daily_rates" on public.materials_daily_rates
    for all using (org_id = (select org_id from public.profiles where user_id = auth.uid()));

-- ====================================================================
-- MIGRATION 0021: EcosystemRealty + n8n Event Bus, Transactional Outbox & Integration Health
-- Separation of Responsibilities Architecture:
-- 1. EcosystemRealty is the Self-Contained Source of Truth.
-- 2. n8n is the External Automation & Integration Orchestration Layer.
-- 3. Asynchronous Outbox with Idempotency, Retry Backoff & Circuit Breaker.
-- ====================================================================

-- ====================================================================
-- 1. CRM DOMAIN EVENTS (Transactional Outbox)
-- ====================================================================

create table if not exists public.crm_domain_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  
  -- Event Identity & Category
  event_name text not null check (event_name in (
    'LeadCreated', 'LeadAssigned', 'LeadQualified', 'LeadSLAApproaching', 'LeadSLABreached', 'LeadRevived',
    'RequirementUpdated',
    'PropertyCreated', 'PropertyPriceChanged', 'ListingCreated', 'MandateCreated', 'MandateExpiring',
    'SiteVisitScheduled', 'SiteVisitConfirmed', 'SiteVisitCompleted', 'SiteVisitCancelled',
    'DealCreated', 'DealStageChanged', 'DealStalled', 'NegotiationUpdated', 'NegotiationAgreed',
    'BookingCreated', 'PaymentStatusChanged', 'CommissionCreated',
    'DocumentUploaded', 'DocumentExpiring',
    'WhatsAppMessageReceived', 'WhatsAppMessageSent',
    'AiSuggestionGenerated'
  )),
  aggregate_type text not null check (aggregate_type in (
    'lead', 'person', 'property', 'listing', 'site_visit', 'deal', 'negotiation', 'commission', 'document', 'communication'
  )),
  aggregate_id uuid not null,
  
  -- Payload & Context (Authoritative CRM State Snapshot)
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text not null,
  
  -- Dispatch State to n8n / External Services
  dispatch_status text not null default 'pending' check (dispatch_status in (
    'pending', 'dispatched', 'delivered', 'failed', 'circuit_broken', 'dead_letter'
  )),
  retry_count integer not null default 0,
  max_retries integer not null default 5,
  next_retry_at timestamptz default now(),
  dispatched_at timestamptz,
  delivered_at timestamptz,
  
  -- Error & Diagnostics
  last_error_message text,
  last_error_code text,
  response_http_status integer,
  
  -- Provenance
  emitted_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz default now()
);

create unique index if not exists idx_domain_events_idempotency on public.crm_domain_events(org_id, idempotency_key);
create index if not exists idx_domain_events_pending on public.crm_domain_events(dispatch_status, next_retry_at) where dispatch_status in ('pending', 'failed');
create index if not exists idx_domain_events_aggregate on public.crm_domain_events(org_id, aggregate_type, aggregate_id);
create index if not exists idx_domain_events_event_name on public.crm_domain_events(org_id, event_name, created_at desc);

-- ====================================================================
-- 2. INTEGRATION ENDPOINTS & N8N CONNECTOR CONFIGURATION
-- ====================================================================

create table if not exists public.integration_endpoints (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  
  -- Connector Metadata
  name text not null default 'n8n Production Webhook Bus',
  provider text not null default 'n8n' check (provider in ('n8n', 'whatsapp_cloud', 'meta_ads', 'google_calendar', 'exotel_telephony', 'custom_webhook')),
  endpoint_url text not null,
  
  -- Security Credentials (Encrypted / Secret Token)
  auth_header_name text default 'X-EcosystemRealty-HMAC-SHA256',
  secret_token text not null,
  
  -- Subscriptions & Filters
  subscribed_events text[] default array[
    'LeadCreated', 'LeadAssigned', 'LeadSLABreached', 'SiteVisitScheduled', 'MandateExpiring', 'NegotiationAgreed', 'CommissionCreated'
  ]::text[],
  
  -- Circuit Breaker & Health
  is_active boolean not null default true,
  consecutive_failures integer not null default 0,
  circuit_breaker_tripped boolean not null default false,
  circuit_breaker_tripped_at timestamptz,
  last_successful_delivery_at timestamptz,
  last_failed_delivery_at timestamptz,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_integration_endpoints_org on public.integration_endpoints(org_id, is_active);

-- ====================================================================
-- 3. INTEGRATION INBOUND IDEMPOTENCY & AUDIT LOGS
-- ====================================================================

create table if not exists public.inbound_integration_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  
  -- External Provider Context
  source_provider text not null check (source_provider in ('n8n', 'meta_lead_ads', 'whatsapp_api', 'website_form', 'portal_99acres', 'portal_magicbricks', 'google_calendar', 'exotel')),
  external_event_id text not null,
  event_type text not null,
  
  -- Ingestion Payload
  raw_payload jsonb not null default '{}'::jsonb,
  sanitized_payload jsonb not null default '{}'::jsonb,
  
  -- Processing Result
  processing_status text not null default 'processed' check (processing_status in ('processed', 'duplicate_ignored', 'human_approval_queued', 'failed')),
  resulting_entity_type text,
  resulting_entity_id uuid,
  
  -- AI Extraction Context (if processed by n8n AI node)
  ai_confidence_score numeric(5, 2),
  ai_extracted_intent text,
  requires_human_approval boolean default false,
  is_human_approved boolean default false,
  approved_by_user_id uuid references public.profiles(user_id) on delete set null,
  approved_at timestamptz,
  
  created_at timestamptz default now()
);

create unique index if not exists idx_inbound_provider_event on public.inbound_integration_events(org_id, source_provider, external_event_id);
create index if not exists idx_inbound_events_status on public.inbound_integration_events(org_id, processing_status);

-- ====================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

alter table public.crm_domain_events enable row level security;
alter table public.integration_endpoints enable row level security;
alter table public.inbound_integration_events enable row level security;

create policy "Tenant isolation for crm_domain_events" on public.crm_domain_events
  for all using (org_id = (select org_id from public.profiles where user_id = auth.uid()));

create policy "Tenant isolation for integration_endpoints" on public.integration_endpoints
  for all using (org_id = (select org_id from public.profiles where user_id = auth.uid()));

create policy "Tenant isolation for inbound_integration_events" on public.inbound_integration_events
  for all using (org_id = (select org_id from public.profiles where user_id = auth.uid()));

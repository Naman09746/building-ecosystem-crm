# 04. Database & Data Model Specification — Apex Realty EcosystemRealty

**Engine:** PostgreSQL 15+ (Supabase)  
**Migration File:** `supabase/migrations/20260821_enterprise_schema.sql`  
**Seed File:** `supabase/seed.sql`  
**Security Model:** PostgreSQL Row-Level Security (RLS) on all 15 tables

---

## 1. Entity Relationship Diagram (Conceptual)

```
┌────────────────────────────────────────────────────────┐
│                   ORGANIZATIONS (Tenants)              │
│ (id, name, slug, plan, max_seats, custom_settings)    │
└──────┬───────────────────────┬───────────────────┬─────┘
       │ 1:N                   │ 1:N               │ 1:N
       ▼                       ▼                   ▼
┌──────────────┐       ┌──────────────┐     ┌──────────────┐
│   REGIONS    │       │    USERS     │     │    PEOPLE    │ (Master Dedup Anchor)
│ (id, name)   │       │ (id, role)   │     │ (phone_norm) │
└──────┬───────┘       └──────┬───────┘     └──────┬───────┘
       │                      │                    │
       │ 1:N                  │ 1:N (Assigned)     │ 1:N
       ▼                      ▼                    ▼
┌────────────────────────────────────────────────────────┐
│                    PROJECTS CATALOG                    │
│ (id, org_id, region_id, name, location, price_min/max) │
└──────┬─────────────────────────────────────────────────┘
       │ 1:N
       ▼
┌──────────────────────────────┐       ┌────────────────────────────────┐
│        PROJECT_UNITS         │       │             LEADS              │
│ (tower, unit_no, floor, price│◄──────┤ (person_id, project_id, stage, │
│  status: available/booked)   │       │  budget, score, deal_health)   │
└──────────────────────────────┘       └───────┬────────────────┬───────┘
                                               │ 1:N            │ 1:N
                                               ▼                ▼
                                      ┌────────────────┐ ┌──────────────┐
                                      │   ACTIVITIES   │ │    TASKS     │
                                      │ (occurred_at,  │ │ (due_at,     │
                                      │  type, outcome)│ │  priority)   │
                                      └────────────────┘ └──────────────┘
```

---

## 2. Table Schemas & Dictionary

### 2.1 `public.organizations` (Tenant Partition)
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY, default `uuid_generate_v4()` | Unique tenant identifier |
| `name` | VARCHAR(255) | NOT NULL | Commercial brokerage / builder name |
| `slug` | VARCHAR(100) | UNIQUE, NOT NULL | Subdomain or URL-safe slug |
| `plan` | org_plan_type | NOT NULL DEFAULT `'growth'` | Subscription tier: `'starter'`, `'growth'`, `'enterprise'` |
| `max_seats` | INT | NOT NULL DEFAULT 20 | Seat ceiling |
| `is_active` | BOOLEAN | NOT NULL DEFAULT true | Subscription billing status flag |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Timestamp |

### 2.2 `public.people` (Master Contact & Phone Dedup Anchor)
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | Person unique identifier |
| `org_id` | UUID | REFERENCES organizations(id) | Tenant owner |
| `name` | VARCHAR(255) | NOT NULL | Full customer name |
| `phone` | VARCHAR(30) | NOT NULL | Raw input phone string |
| `phone_normalized` | VARCHAR(30) | NOT NULL | E.164 normalized phone (`+91XXXXXXXXXX`) |
| `email` | VARCHAR(255) | NULLABLE | Email address |
| `source` | VARCHAR(100) | DEFAULT `'Direct Inbound'` | First acquisition touchpoint |
| **Constraint** | UNIQUE(org_id, phone_normalized) | Hard deduplication constraint per organization |

### 2.3 `public.projects` (Development Catalog)
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | Project ID |
| `org_id` | UUID | REFERENCES organizations(id) | Tenant owner |
| `region_id` | UUID | REFERENCES regions(id) | Regional hub |
| `name` | VARCHAR(255) | NOT NULL | E.g. *DLF The Camellias* |
| `developer_name`| VARCHAR(255) | NOT NULL | Builder brand name |
| `location` | VARCHAR(255) | NOT NULL | Micro-market |
| `price_min` | BIGINT | NOT NULL | Minimum pricing in INR |
| `price_max` | BIGINT | NOT NULL | Maximum pricing in INR |
| `status` | project_status_type | DEFAULT `'active'` | `'upcoming'`, `'active'`, `'sold_out'` |

### 2.4 `public.project_units` (Inventory Matrix)
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | Unit ID |
| `project_id` | UUID | REFERENCES projects(id) | Parent development |
| `tower` | VARCHAR(50) | NOT NULL | Tower name/number |
| `unit_number` | VARCHAR(50) | NOT NULL | Unit designation (e.g. `B-1402`) |
| `floor` | INT | NOT NULL | Floor number |
| `configuration` | VARCHAR(50) | NOT NULL | E.g. `4 BHK Penthouse` |
| `price` | BIGINT | NOT NULL | Total pricing in INR |
| `status` | unit_status_type | DEFAULT `'available'` | `'available'`, `'hold'`, `'site_visit'`, `'negotiation'`, `'booked'`, `'sold'` |

### 2.5 `public.leads` (Sales Opportunities)
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | Lead Opportunity ID |
| `person_id` | UUID | REFERENCES people(id) | Buyer master record |
| `project_id` | UUID | REFERENCES projects(id) | Targeted project |
| `assigned_salesperson_id` | UUID | REFERENCES users(id) | Assigned sales closer |
| `stage` | VARCHAR(50) | DEFAULT `'new'` | Pipeline stage |
| `budget` | BIGINT | NOT NULL DEFAULT 0 | Budget in INR |
| `lead_score` | INT | DEFAULT 70 | 0-100 propensity score |
| `lead_score_label` | VARCHAR(30) | DEFAULT `'Warm'` | `'Hot'`, `'Warm'`, `'Cold'` |
| `deal_health` | deal_health_type | DEFAULT `'neutral'` | `'strong'`, `'neutral'`, `'at_risk'` |
| `days_in_stage` | INT | DEFAULT 0 | Velocity tracker |
| `last_activity_at` | TIMESTAMPTZ | DEFAULT NOW() | Last touchpoint timestamp |

### 2.6 `public.activities` (Immutable Audit Stream)
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | Activity log ID |
| `lead_id` | UUID | REFERENCES leads(id) | Associated opportunity |
| `user_id` | UUID | REFERENCES users(id) | Sales rep or agent actor |
| `type` | activity_type | NOT NULL | `'call'`, `'whatsapp'`, `'meeting'`, `'site_visit'`, `'note'`, `'stage_change'`, `'ai_agent'` |
| `outcome` | VARCHAR(100) | NULLABLE | Standard outcome key |
| `outcome_label` | VARCHAR(100) | NULLABLE | Human-readable badge |
| `notes` | TEXT | NULLABLE | Interaction summary notes |
| `occurred_at` | TIMESTAMPTZ | DEFAULT NOW() | Event timestamp |

### 2.7 Supporting Infrastructure & Enterprise Domain Tables (Migrations 0020 & 0021)
- `public.people`: Decoupled real-world identity registry with multi-field deduplication.
- `public.buyer_requirements`: Structured multi-variable requirement profiles (budget, configuration, location, Vaastu).
- `public.property_listings`: Mandate listings with **role-protected seller price floors** (`minimum_acceptable_price`).
- `public.negotiation_rounds`: Chronological bidding ledger capturing buyer offers, seller counters, and token deposit state.
- `public.site_visit_dispatches`: Operational visit dispatches with digital Gate 2 visitor pass PINs and parking bays.
- `public.commission_ledgers`: Statutory Indian real estate brokerage engine with 1% buyer + 1% seller splits, 18% GST addition, and 1% TDS deduction (u/s 194H).
- `public.crm_domain_events`: Asynchronous transactional outbox for n8n webhook dispatch with HMAC signatures.
- `public.integration_endpoints`: Configuration for n8n webhooks, HMAC secrets, and circuit breaker trip counters.
- `public.inbound_integration_events`: Idempotent audit log for external webhook deliveries and AI extraction suggestions.
- `public.tasks`: Prioritized follow-ups with `due_at` and SLA status (`overdue`, `due_today`, `upcoming`, `completed`).
- `public.documents`: Floor plans, brochures, and KYC docs linked to projects and leads.
- `public.webhook_events`: Idempotent log of inbound WhatsApp, Meta Ads, and Stripe events.
- `public.ai_agent_executions`: Telemetry log storing prompts, tools, token counts, and latency.
- `public.audit_logs`: SOC2-compliant mutation log capturing actor ID, entity diffs, and IP addresses.

---

## 3. Database Indexes for Performance

```sql
CREATE INDEX idx_people_org_phone ON public.people(org_id, phone_normalized);
CREATE INDEX idx_leads_org_stage ON public.leads(org_id, stage, status);
CREATE INDEX idx_leads_org_rep ON public.leads(org_id, assigned_salesperson_id);
CREATE INDEX idx_units_project_status ON public.project_units(org_id, project_id, status);
CREATE INDEX idx_activities_org_lead ON public.activities(org_id, lead_id, occurred_at DESC);
CREATE INDEX idx_tasks_org_rep_status ON public.tasks(org_id, assigned_to_user_id, status);
CREATE INDEX idx_negotiations_deal ON public.negotiation_rounds(org_id, deal_id, round_number);
CREATE INDEX idx_dispatches_lead ON public.site_visit_dispatches(org_id, lead_id);
CREATE INDEX idx_commissions_deal ON public.commission_ledgers(org_id, deal_id);
CREATE INDEX idx_domain_events_dispatch ON public.crm_domain_events(org_id, dispatch_status, next_retry_at);
CREATE INDEX idx_inbound_events_idempotency ON public.inbound_integration_events(org_id, source_provider, external_event_id);
```

---

## 4. Automatic Database Triggers

1. **`trg_people_phone_normalization`:** Normalizes phone numbers before insert/update on `public.people` into standard E.164 (`+91XXXXXXXXXX`).
2. **`trg_set_updated_at`:** Automatically refreshes the `updated_at` timestamp on mutations across `leads`, `projects`, `tasks`, `people`, `property_listings`, and `organizations`.

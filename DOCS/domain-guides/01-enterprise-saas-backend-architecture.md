# Enterprise Multi-Tenant SaaS Backend Architecture — EcosystemRealty 2.0

This document details the production backend architecture for **EcosystemRealty 2.0** as implemented — multi-tenant isolation, cryptographic webhook verification, database-enforced quotas, the **EcosystemRealty + n8n Separation of Responsibilities Architecture**, transactional domain event outbox, and human-gated AI agent audit trails (migrations `0001`–`0021`).

---

## 1. Core Architectural Pillars

```
┌──────────────────────────────────────────────────────────────┐
│                    Next.js 15 Client UI                      │
│         (React 19, App Router, Supabase SSR Auth)            │
└──────────────┬───────────────────────────────┬───────────────┘
               │                               │
     Direct Database Calls            Server-Side Gated APIs
   (RLS-scoped, via crm-sync          (/api/people · /api/listings/* ·
    persistence bridge)                /api/deals/[id]/negotiations ·
               │                       /api/site-visits/dispatch ·
               │                       /api/finance/commissions ·
               │                       /api/integrations/* · /api/webhooks/*)
               │                               │
               ▼                               ▼
┌──────────────────────────────┐ ┌──────────────────────────────┐
│    PostgreSQL (Supabase)     │ │    Enterprise Security Layer │
│  - Row-Level Security (39 tbl│ │ - Cookie OR Bearer session   │
│  - Tenant isolation          │ │   verification (getApiAuth…) │
│  - Role-aware visibility     │ │ - Zod inbound validation     │
│  - Quota triggers (leads/    │ │ - Two-tier rate limiter      │
│    seats)                    │ │   (memory L1 + Postgres L2)  │
│  - Phone normalization trg   │ │ - HMAC-SHA256 verifier       │
│  - Transactional Event Outbox│ │ - Fail-closed webhooks       │
│  - DB-backed idempotency     │ │ - Protected Seller Floor     │
└──────────────┬───────────────┘ └──────────────────────────────┘
               │
               ▼ (HMAC Signed, Non-blocking Async Dispatch)
┌──────────────────────────────────────────────────────────────┐
│            n8n Automation & Integration Layer                │
│    (WhatsApp Cloud API, Meta Ads, Google Calendar, AI Drafts)│
└──────────────────────────────────────────────────────────────┘
```

1. **Database-Enforced Multi-Tenancy**: Isolation is guaranteed by PostgreSQL Row-Level Security on all 39 tables. `org_id` is resolved from verified sessions server-side.
2. **EcosystemRealty as Single Source of Truth**: Core CRM operations (People, Leads, Requirements, Properties, Listings, Mandates, Negotiations, Dispatches, Commissions) function 100% natively inside EcosystemRealty even if external services or n8n are offline.
3. **Transactional Domain Event Outbox (`crm_domain_events`)**: Emits business events (`LeadCreated`, `SiteVisitScheduled`, `NegotiationAgreed`, `MandateExpiring`, `CommissionCreated`) with HMAC signatures and exponential retry backoff.
4. **Idempotent Inbound Ingestion (`inbound_integration_events`)**: Webhooks from Meta, WhatsApp, or n8n are checked against unique `external_event_id` before processing, preventing duplicate contacts or deals.
5. **Role-Protected Seller Price Floors**: API routes automatically mask confidential seller price floors (`minimum_acceptable_price`) for junior sales reps while exposing full financial levers to Founders and Managers.
6. **Human-Gated AI Guardrails**: AI extractions cannot mutate deal stages, prices, or commission ledgers autonomously — explicit operator approval is enforced.

---

## 2. PostgreSQL Row-Level Security Matrix

Canonical schema: `supabase/migrations/0001_init.sql` through `0021_n8n_event_bus_and_integration_outbox.sql` (39 tables).

| Table | Scope | Security Policy |
| :--- | :--- | :--- |
| `orgs` | SELECT: own org (`current_org_id()`). UPDATE: owner/admin/boss only. INSERT: none (bootstrap trigger/service-role only) | Strict Tenant Isolation |
| `profiles` | SELECT/UPDATE within org. **Role changes guarded by trigger** — never self, owner/admin only | Role Escalation Shield |
| `people` | Decoupled identity registry with multi-field deduplication (phone, PAN, email) | Strict Tenant Isolation |
| `buyer_requirements` | Structured multi-variable requirement profiles linked to `leads` and `people` | Strict Tenant Isolation |
| `projects`, `project_towers`, `project_units` | 6-tier real estate hierarchy with pricing history and occupancy states | Tenant Scoped |
| `property_listings` | Mandate lifecycle with **masked `minimum_acceptable_price` for non-managers** | Column-Level & Role Scoped |
| `negotiation_rounds` | Chronological bidding ledger tracking buyer offers, seller counters, and token checks | Deal & Tenant Scoped |
| `site_visit_dispatches` | Operational visit dispatches with digital Gate 2 visitor pass PINs and parking bays | Salesperson & Tenant Scoped |
| `commission_ledgers` | Statutory Indian brokerage tracking with 18% GST, 1% TDS, CP shares, and rep incentives | Manager & Tenant Scoped |
| `crm_domain_events` | Asynchronous transactional outbox for n8n webhook dispatch | Service Role & Tenant Scoped |
| `integration_endpoints` | External n8n webhook URLs, HMAC secrets, and circuit breaker trip counters | Admin & Tenant Scoped |
| `inbound_integration_events`| Idempotency audit log for external webhook deliveries and AI extraction suggestions | Tenant Scoped |

---

## 3. Separation of Responsibilities Architecture

| Responsibility | EcosystemRealty Core Application | n8n Automation Engine |
| :--- | :--- | :--- |
| **Source of Truth** | **Yes** (Authoritative DB) | No (Stateless Bus) |
| **People & Lead Management** | **Yes** (Native PostgreSQL) | No |
| **Inventory & Unit 360** | **Yes** (Native PostgreSQL) | No |
| **Negotiations & Bidding** | **Yes** (Native PostgreSQL) | No |
| **Commission & Billing** | **Yes** (Native PostgreSQL) | No |
| **External WhatsApp API** | Consumes events / logs activity | **Yes** (Manages Cloud API session) |
| **Meta Lead Ads Ingestion** | Validates & de-duplicates | **Yes** (Receives ad webhook) |
| **Google Calendar Sync** | Emits `SiteVisitScheduled` | **Yes** (Creates calendar event) |
| **AI Message Classification** | Confirms & saves mutation | **Yes** (Calls LLM node & drafts suggestion) |
| **SLA & Escalation Timers** | Tracks SLA state machine | **Yes** (Dispatches external WhatsApp/SMS) |

---

## 4. Verification & Hardening
- **Vitest Suites**: 239 passed across 28 suites (`npm test`).
- **Production Build**: 83 Next.js App Router routes compiled cleanly with 0 type errors (`npm run build`).
- **Knowledge Graph**: Fully indexed in `graphify-out/` (2549 nodes, 5545 edges).

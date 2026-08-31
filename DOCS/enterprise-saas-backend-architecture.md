# Enterprise Multi-Tenant SaaS Backend Architecture

This document details the production backend architecture for **Apex Realty CallCRM** as implemented — multi-tenant isolation, cryptographic webhook verification, database-enforced quotas, and human-gated AI agent audit trails. It reflects the hardened codebase (migrations `0001`–`0006`).

---

## 1. Core Architectural Pillars

```
┌──────────────────────────────────────────────────────────────┐
│                    Next.js 15 Client UI                      │
│         (React 19, App Router, Supabase SSR Auth)            │
└──────────────┬───────────────────────────────┬───────────────┘
               │                               │
     Direct Database Calls            Server-Side Gated APIs
   (RLS-scoped, via crm-sync          (/api/chat · /api/leads ·
    persistence bridge)                /api/webhooks/* · /api/billing/*)
               │                               │
               ▼                               ▼
┌──────────────────────────────┐ ┌──────────────────────────────┐
│    PostgreSQL (Supabase)     │ │    Enterprise Security Layer │
│  - Row-Level Security (16 tbl)│ │ - Cookie OR Bearer session   │
│  - Tenant isolation          │ │   verification (getApiAuth…) │
│  - Role-aware visibility     │ │ - Zod inbound validation     │
│  - Quota triggers (leads/    │ │ - Two-tier rate limiter      │
│    seats)                    │ │   (memory L1 + Postgres L2)  │
│  - Phone normalization trg   │ │ - HMAC-SHA256 verifier       │
│  - DB-backed idempotency     │ │ - Fail-closed webhooks       │
└──────────────────────────────┘ └──────────────────────────────┘
```

1. **Database-Enforced Multi-Tenancy**: isolation is guaranteed by Row-Level Security on all tenant tables. `org_id` is resolved from the verified session server-side (or the `webhook_sources` map for provider events) — never from client request bodies.
2. **Zero-Trust Input Validation**: every request body is validated with strict Zod schemas; malformed types, injection payloads, and oversize inputs are rejected with structured errors.
3. **Idempotent Ingestion**: webhooks insert into `webhook_events` **before processing** — the unique index on `idempotency_key` drops duplicate deliveries before any state change.
4. **Cryptographic Webhook Handshake**: HMAC-SHA256 signatures are mandatory and timing-safe-verified. Missing secrets ⇒ endpoint refuses traffic (fail closed). Message timestamps older than ±5 minutes are dropped (replay protection).
5. **Plan Enforcement at the Database Layer**: `assert_lead_quota` / `assert_seat_quota` triggers enforce plan limits for *every* write path — browser-direct or REST API.
6. **Human-Gated AI**: AI tool calls have no server-side execute handler; proposals surface to operators behind explicit approval gates. Scans and executions are logged to `ai_agent_executions` (org-scoped).

---

## 2. PostgreSQL Row-Level Security Matrix

Canonical schema: `supabase/migrations/0001_init.sql` through `0018_phase12_property_intelligence_schema.sql` (32 tables).

| Table | Scope |
| :--- | :--- |
| `orgs` | SELECT: own org (`current_org_id()`). UPDATE: owner/admin/boss only. INSERT: none (bootstrap trigger/service-role only) |
| `profiles` | SELECT/UPDATE within org. **Role changes guarded by trigger** — never self, owner/admin only |
| `regions`, `pipeline_stages`, `projects` | Read: org members. Manage: manager+ |
| `property_areas` | Read: org members. Manage: manager+ (tier rating, slug, pincode) |
| `project_towers` | Read: org members. Manage: manager+ (floors, units/floor, elevator counts) |
| `people`, `project_contacts` | Org members (all operations org-scoped, unique phone normalizer anchor) |
| `external_organizations` | Read: org members. Manage: manager+ (developers, RWAs, brokerages) |
| `project_units` | Read: org. Status/details update: org members (atomic reserve RPC `FOR UPDATE`) |
| `entity_relationships` | Read: org. Manage: org members (temporal ownership transitions managed by trigger) |
| `property_facts` | Read/Insert: org members. Delete: manager+ (institutional sales memory with 5 verification tiers) |
| `unit_price_history` | Read: org members. Insert: automated via trigger on unit asking price changes |
| `leads` | SELECT/UPDATE: assigned rep **or** manager+. INSERT: org (ownership trigger forces non-managers to self). DELETE: boss+ only |
| `activities` | INSERT + SELECT within org. **Immutable** — no update/delete policies exist |
| `tasks` | SELECT/UPDATE: own or manager+; INSERT: self or manager+; DELETE: manager+ |
| `documents` | Org members (storage folder RLS per org) |
| `ai_agent_executions` | INSERT + SELECT within org |
| `audit_log` | INSERT: org. SELECT: manager+ only |
| `webhook_events` | **Zero client policies** — service-role only |
| `webhook_sources` | Manager+ manage; used to resolve inbound provider events to tenants |
| `rate_limit_buckets` | **Zero client policies** — service-role only |

Helper functions (`current_org_id()`, `current_user_role()`) are `security definer` with pinned `search_path`. Column defaults backstop `org_id` resolution.

---

## 3. Endpoints & Security Matrix

All routes live under `Frontend/src/app/api/`. Authentication = verified session via cookies (browser) or `Authorization: Bearer` (API clients), loaded with the caller's profile (`org_id`, `role`, plan).

| Endpoint | Auth | Rate Limit | Notes |
| :--- | :--- | :--- | :--- |
| `POST /api/chat` | ✅ session | 30/min per **user** (durable L2) | Plan gate (`402 PLAN_UPGRADE_REQUIRED` below Growth). Zod message bounds, `system` role rejected, `maxOutputTokens=1500`, 25s timeout. Tool has no execute handler |
| `GET /api/properties/areas` | ✅ session | 120/min per user | Locality catalog with tier rating, slug, and pincode |
| `GET /api/properties/towers` | ✅ session | 120/min per user | Tower block configs with floor counts & elevator stats |
| `GET /api/properties/units` | ✅ session | 120/min per user | Filterable unit inventory engine with price & intent filters |
| `GET /api/properties/units/[id]` | ✅ session | 120/min per user | Flat 360° Dossier aggregator (specs, owners, facts, price audit, buyer matches) |
| `GET /api/relationships` | ✅ session | 120/min per user | Temporal people & stakeholder graph query endpoint |
| `GET /api/properties/facts` | ✅ session | 120/min per user | Institutional property sales memory with verification tiers |
| `GET /api/search/global` | ✅ session | 60/min per user | Server-side multi-entity search RPC |
| `GET /api/leads` | ✅ session | 120/min per user | Pagination clamped (≤100). Reps restricted to own leads; explicit `org_id` filter alongside RLS |
| `POST /api/leads` | ✅ session | 30/min per user | Zod `createLeadSchema`; E.164 normalization; people dedup anchor per-org; `salesperson_id` forced to caller unless manager+ |
| `GET /api/activities` | ✅ session | 120/min per user | Limit clamped ≤200; org-scoped |
| `POST /api/activities` | ✅ session | 60/min per user | Immutable audit insert; `user_id`/`user_name` derived from session; lead must belong to caller's org (404 otherwise) |
| `POST /api/agent/resurrect` | ✅ manager+ role | 30/min per user | Plan gate. `daysThreshold` strict int 1–365 (kills PostgREST `.or()` injection). Read-only scan; logs executions |
| `GET /api/health` | public (minimal) / manager+ (verbose) | — | Public body: status + timestamp only. Verbose adds latency/memory/webhook readiness |
| `POST /api/billing/checkout` | ✅ manager+ | 10/min per user (durable) | Stripe / Razorpay order creation + simulated mode fallback |
| `POST /api/billing/webhook` | ✅ HMAC fail-closed | n/a | Insert-first idempotency in `webhook_events`; activation/cancellation event mapping; failures recorded |
| `POST /api/webhooks/whatsapp` | ✅ HMAC fail-closed | n/a | ±5min timestamp freshness; `phone_number_id` → `webhook_sources` tenant resolution |
| `POST /api/webhooks/meta-lead-ads` | ✅ HMAC fail-closed | n/a | Same pattern keyed on `page_id` |
| `GET /api/webhooks/*` | verify-token handshake | — | Timing-safe token comparison; 503 if tokens unconfigured |

---

## 4. Standardized API Response Contracts

### Success (`200 / 201`)
```json
{
  "success": true,
  "data": { },
  "meta": {
    "requestId": "req_a8f9c102",
    "timestamp": "2026-08-21T18:45:00.000Z",
    "page": 1,
    "limit": 50,
    "total": 142
  }
}
```

### Error (`400 / 401 / 403 / 404 / 422 / 429 / 503`)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed for input payload",
    "requestId": "req_7b3e198a",
    "details": [
      { "path": "phone", "message": "Invalid telephone format" }
    ]
  }
}
```
Internal stack traces, raw SQL, and provider error text are never returned — 5xx bodies are scrubbed and reported to the observability pipeline with the correlation ID.

---

## 5. Security Verification Checklist (verified state)

- [x] **Authentication bypass**: all protected routes return `401` without a valid session (cookie path reuses credential-carrying client for profile lookup)
- [x] **BOLA / IDOR**: cross-org reads/writes blocked by RLS **plus** explicit `org_id` filters in every query
- [x] **Privilege escalation**: profile role changes blocked for self and non-owner/admins (trigger); task scoping restored after permissive policy removal; leads ownership forced on insert
- [x] **Quota abuse**: lead/seat limits enforced by DB triggers regardless of write path; unknown plans degrade to starter at the API layer
- [x] **Webhook forgery/replay**: fail-closed secrets, mandatory timing-safe HMAC, timestamp freshness, insert-first idempotency
- [x] **Rate limiting**: durable Postgres-backed limiter on cost-critical endpoints with graceful memory fallback
- [x] **Audit trail**: immutable activities stream, org-scoped AI execution logs, audit_log (manager-read)
- [x] **Automated regression gate**: `npm run test:migrations` (CI job with real PostgreSQL) asserts bootstrap, seed idempotency, quota firing, role guard, and ownership forcing on every push

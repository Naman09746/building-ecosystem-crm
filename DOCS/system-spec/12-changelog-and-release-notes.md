# 12. Changelog & Release Notes — Apex Realty EcosystemRealty

All notable changes to the Apex Realty EcosystemRealty platform are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.0] - 2026-08-31 — EcosystemRealty 2.0 & n8n Separation of Responsibilities Architecture

### 🚀 Added
- **EcosystemRealty + n8n Separation of Responsibilities Architecture:**
  - EcosystemRealty is established as the self-contained, authoritative source of truth (PostgreSQL + RLS).
  - Transactional Outbox table `crm_domain_events` with non-blocking asynchronous dispatcher (`lib/server/domain-event-bus.ts`) using HMAC-SHA256 signatures, 3-second timeouts, and automatic circuit breakers.
  - Inbound idempotency audit log (`inbound_integration_events`) preventing duplicate lead or contact creation on repeated Meta/WhatsApp webhook deliveries.
  - Interactive `N8nIntegrationDrawer` UI showing live outbox depth, manual retry queue flush, and channel health.
- **Enterprise Domain Model (Migrations 0020 & 0021):**
  - **`people` Registry:** Decoupled from leads, enabling a single real-world identity to hold multiple inquiries, own properties, and refer clients without contact duplication.
  - **`buyer_requirements`:** Multi-criteria structured requirement engine (min/max budgets, floor preferences, Vaastu, parking).
  - **`property_listings` & `seller_mandates`:** Mandate lifecycle management with **role-protected seller price floor shielding** (`minimum_acceptable_price` masked from junior reps).
  - **`negotiation_rounds`:** Chronological bidding ledger tracking buyer offers, seller counters, ask price deltas, conditions, and token cheques (`NegotiationModal`).
  - **`site_visit_dispatches`:** Operational visit dispatching with digital Gate 2 visitor pass PINs, visitor parking bays, caretaker contacts, and pre-visit checklists (`SiteVisitDispatchModal`).
  - **`commission_ledgers`:** Statutory Indian real estate brokerage engine with 1% buyer + 1% seller splits, 18% GST addition, 1% TDS deduction (u/s 194H), and rep incentives (`CommissionModal`).
- **REST Endpoints & Testing:**
  - Added endpoints `/api/people`, `/api/listings/mandates`, `/api/deals/[id]/negotiations`, `/api/site-visits/dispatch`, `/api/finance/commissions`, and `/api/integrations/*`.
  - Expanded Vitest suite to 239 tests across 28 suites with 100% pass rate.
  - Next.js production build verified cleanly across all 83 routes.

---

## [1.0.0] - 2026-08-22 — Enterprise Production Release

### 🚀 Added
- **Master Multi-Tenant Database Architecture:**
  - 15 PostgreSQL tables with Row-Level Security (RLS) policies on all tables (`supabase/migrations/20260821_enterprise_schema.sql`).
  - Realistic multi-tenant luxury Indian real estate seed catalog (*DLF The Camellias*, *Godrej Aristocrat*, *Lodha World Towers* in `supabase/seed.sql`).
  - Database trigger `trg_people_phone_normalization` enforcing E.164 phone deduplication (`+91XXXXXXXXXX`).
- **Autonomous AI Agent Suite:**
  - **Aria Lead Qualifier:** Consultative conversational bot with Gemini 2.5 Flash (`api/chat/route.ts`).
  - **Human-in-the-Loop Approval Gate:** Interactive UI card requiring explicit sales manager approval before CRM insertion.
  - **Lost-Lead Resurrection Engine:** Background scanner matching dormant buyers to newly available units (`api/agent/resurrect/route.ts`).
- **Enterprise Security & Reliability Layer:**
  - Token-bucket rate limiter (30 writes/min, 120 reads/min) in `lib/server/api-security.ts`.
  - Idempotency key tracking (`X-Idempotency-Key`) for lead and payment mutations.
  - Cryptographic HMAC-SHA256 signature verification for Meta Lead Ads and WhatsApp Cloud API webhooks.
  - Standardized JSON responses with `requestId` (`req_...`) omitting stack traces and internal secrets.
  - 45-minute session idle timeout auto-lockout.
- **Subscription & Plan Quota Enforcement:**
  - Server-side plan limit checks (`Solo Closer`: 300 leads, `Boutique Team`: 2,500 leads, `Scale Desk`: 50,000 leads).
  - Stripe & Razorpay checkout session creator (`api/billing/checkout`) and webhook processor (`api/billing/webhook`).
- **Automated Test Suite:**
  - Vitest test runner integrated with 9 test suites (48/48 unit tests passing).
- **Developer & Agent Knowledge Graph:**
  - Integrated `graphify` AST knowledge graph (547 nodes, 1324 edges, 21 communities) with Git lifecycle hooks.

### 🔒 Security Hardening
- Removed unverified instant demo sign-up bypass in `auth-context.tsx`.
- Enforced hard `org_id` isolation across all frontend selectors in `crm-context.tsx`.
- Added 10-message rolling window and 1024 token output cap in `/api/chat` to eliminate prompt injection loops and runaway token costs.

### 🎨 UI/UX Enhancements
- Action-first Salesperson Priority Calling Queue with <10-second activity logger.
- Executive Boss Overview with Gross Pipeline Valuation and Rep SLA compliance metrics.
- Global Search Omnibar (`Ctrl + K` / `Cmd + K`) and Hotkey navigation.

---

## [0.5.0] - 2026-08-20 — Frontend Visual MVP Release

### 🚀 Added
- Initial 21 Next.js 15 routes for CRM navigation.
- Interactive 7-stage Drag-and-Drop Pipeline Kanban board.
- Projects Inventory Matrix and Tower Explorer.
- 10-second Quick Activity Logger with WhatsApp sales templates.
- 360° Lead Dossier drawer.

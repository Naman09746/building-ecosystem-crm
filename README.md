# Apex Realty CallCRM — Architectural Real Estate Sales & AI Agent Command Center

CallCRM is an enterprise sales operating system and AI agent platform engineered specifically for high-ticket Indian luxury real estate developers, brokerage houses, and advisory desks.

Built with **Next.js 15 App Router**, **React 19**, **TypeScript**, **Tailwind CSS**, **Vercel AI SDK**, **Google Gemini 2.5 Flash**, and **Supabase** (Postgres + Auth + RLS + Realtime), CallCRM bridges executive command visibility with human-gated AI lead qualification and frictionless salesperson execution.

---

## ⚡ Key Differentiators & Value Pillars

1. **Atomic Flat/Unit Asset Model & 360° Dossiers**: 6-tier real estate hierarchy (`Region` $\rightarrow$ `Area/Locality` $\rightarrow$ `Society/Project` $\rightarrow$ `Tower/Block` $\rightarrow$ `Floor` $\rightarrow$ `Flat/Unit`). The Flat/Unit is the core transactional asset holding pricing memory, cost sheets, and temporal ownership histories.
2. **Proactive Seller Intelligence Engine**: Identifies expiring lease agreements ($<60$ days), vacant units incurring maintenance holding costs, and 3+ year investor exit windows with 1-click conversion to active resale listings.
3. **100-Point Bi-Directional Matching Engine**: Algorithmic scoring across Location (30%), Budget (30%), Configuration (20%), Floor/Facing (10%), Mandate Exclusivity (10%). Includes reverse buyer matching when new units are onboarded.
4. **30-Minute Pre-Site-Visit Operational Briefings**: Synthesizes Gate 2 visitor pass digital PINs, visitor parking bays, owner price non-negotiables, talking points, and anticipated objections.
5. **Human-in-the-Loop Free-Text & Voice Meeting Structurer**: Parses raw sales rep notes into structured objections, buying signals, and sentiment. AI never mutates CRM state autonomously — all changes require explicit sales rep approval.
6. **Temporal People & Stakeholder Graphs**: Universal relationship model (`entity_relationships`) tracking current owners, historical ownership chains, tenants, and authorized brokers with automated ownership lifecycle triggers.
7. **Structured Institutional Sales Memory**: Property facts (`property_facts`) with 5 verification tiers (`verified`, `historical`, `user_provided`, `inferred`, `unknown`) and automated 180-day staleness flagging.
8. **Multi-Tenant Security by Construction**: Row-Level Security on all 34 tables, `org_id` always derived from the verified session, fail-closed HMAC webhooks, and DB-enforced plan quotas.

---

## 🧠 AI Agents & Automation Modules

> For the full architectural breakdown, see [`DOCS/ai-agents-and-automation.md`](./DOCS/ai-agents-and-automation.md).
> For every API key / external service the app uses, see [`DOCS/setup-and-apis.md`](./DOCS/setup-and-apis.md).

| Agent / Engine | Purpose | Trust Model |
| :--- | :--- | :--- |
| **Seller Intelligence** | Tenancy expiry, vacant units & investor exit signals | Server scanner (`/api/seller-opportunities`) · 1-click mandate conversion |
| **100-Point Bi-Directional Matcher** | Multi-factor inventory ↔ buyer matching | Algorithmic scoring · reverse matching on new units |
| **Site Visit Pre-Briefing** | 30-min pre-visit gate passes & owner boundaries | Synthesizer (`/api/properties/site-briefings`) · instant cockpit view |
| **Meeting Structurer** | Unstructured speech/notes → structured outcomes | Human-in-the-loop approval gate · zero autonomous DB writes |
| **Aria 2.0 Intelligence** | Property briefings, buyer matching & intake qualification | Gemini 2.5 Flash · read-only tools · human approval required |
| **Lost-Lead Resurrector** | Dormant-deal ↔ live-inventory matching | Server-side manager+ scan (read-only) · client applies via audited writes |
| **WhatsApp Sales Engine** | 1-click templated outreach & instant logging | Outbound `wa.me/` · inbound webhook HMAC + replay guard |
| **Live Sync Telemetry** | Cross-device convergence | Supabase Realtime `postgres_changes` on core tables |

---

## System Architecture

```
Real-estate/
├── supabase/migrations/            # Canonical DB — apply in order (0001 → 0019):
│   ├── 0001_init.sql               #   multi-tenant schema, RLS, org bootstrap trigger
│   ├── 0002_sample_seed.sql        #   first-run sample data RPC
│   ├── 0003_rate_limiting.sql      #   durable Postgres rate limiter
│   ├── ...                         #   phases 4-11 hardening, SLAs, analytics, billing
│   ├── 0018_phase12_property_intelligence_schema.sql # Areas, Towers, Units 360, Relationships, Facts
│   └── 0019_phase13_intelligence_automation.sql # Seller opportunities, site visit briefings, stale facts RPC
├── .github/workflows/ci.yml        # CI: lint → vitest → next build
├── DOCS/                           # Architecture blueprints & AI agent guides
└── Frontend/
    ├── Dockerfile                  # Multi-stage standalone production image (non-root)
    ├── .env.local.example          # Complete environment template
    └── src/
        ├── middleware.ts           # Edge route protection (JWT revalidation)
        ├── app/                    # App Router: marketing page, auth flow,
        │   │                       # CRM routes (thin AppShell wrappers), /api/* (63 endpoints)
        │   └── api/                # seller-opportunities · site-briefings · meeting-summary · properties/* · ...
        ├── components/crm/pages/   # Page bodies; routes are thin AppShell wrappers
        ├── context/                # auth-context (Supabase sessions) · crm-context
        ├── lib/
        │   ├── persistence/        # crm-sync (row↔domain mappers) · retry-queue
        │   ├── server/             # seller-intelligence · site-visit-briefing · aria-tools · api-security
        │   ├── mock-data.ts        # Demo dataset (unauthenticated mode only)
        │   └── utils.ts            # ₹ Lakh/Cr currency, phone formatters
        ├── types/crm.ts            # Domain TypeScript definitions
        └── __tests__/              # 222 tests across 23 suites: unit · security · state-machine · property & seller intelligence
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- npm 9+
- A Supabase project (free tier works)

### 1. Database setup
Apply migrations in numeric order (SQL Editor or Supabase CLI):
```
supabase/migrations/0001_init.sql        → 0019_phase13_intelligence_automation.sql
```
This provisions the multi-tenant schema, RLS policies, org auto-bootstrap on signup, first-run sample-data seeding, quota triggers, durable rate limiting, Property Intelligence, and Seller Opportunities Automation. All migrations are validated against real PostgreSQL.

### 2. Environment
```bash
cd Frontend
cp .env.local.example .env.local
# Fill in: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
# Optional: GEMINI_API_KEY, webhook secrets, BILLING_WEBHOOK_SECRET
```

### 3. Run
```bash
make install
make dev           # http://localhost:3000  (or: make help for all targets)
```
Signing up auto-provisions your organization, owner profile, default pipeline stages, and a representative sample dataset so the cockpit is usable immediately.

Without env configuration the app runs in demo mode (mock dataset, in-memory) for UI exploration only — authentication is never faked.

### Testing & CI
```bash
make ci             # everything CI runs: lint → DB validation → tests → build
make test           # 222 tests across 23 suites: unit, security primitives, mappers, state machine, seller intelligence
make test-migrations # full migration + RLS + quota validation against real Postgres
make test-e2e       # Playwright browser smoke suite (builds + serves the app)
```
GitHub Actions runs lint → dependency audit → vitest → build **and** a dedicated job that applies all migrations to PostgreSQL and asserts tenant isolation, quota triggers, and role guards on every push/PR.

### Production (Docker)
```bash
make docker-build
make docker-run      # expects Frontend/.env.production
# Non-root standalone runtime; HEALTHCHECK probes /api/health
```

---

## 🎹 Global Keyboard Shortcuts
- <kbd>L</kbd> — Open Rapid Activity Logger (10s)
- <kbd>F</kbd> — Jump to Tasks & Follow-ups
- <kbd>/</kbd> or <kbd>⌘K</kbd> — Open Command Palette & Global Search
- <kbd>Esc</kbd> — Close any open modal or drawer

---

## 📄 License & Copyright

© 2026 Apex Realty Technologies. All rights reserved.

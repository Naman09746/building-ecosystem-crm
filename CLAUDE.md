# CLAUDE.md — CallCRM 2.0 Developer & AI Agent Guidelines

This document outlines architectural principles, development commands, design rules, and domain standards for **CallCRM 2.0 (Apex Realty)**. It reflects the hardened multi-tenant Supabase backend, PostgreSQL RLS-enforced tenancy, the **CallCRM + n8n Separation of Responsibilities Architecture**, and human-gated AI agents.

---

## 1. Project Overview & Role

- **Project**: CallCRM 2.0 for Indian Real Estate Organizations
- **Domain**: High-ticket Indian luxury real estate sales operating system & daily salesperson cockpit with human-gated AI Agents and external n8n automation bus.
- **Application Directory**: `Frontend/` (Next.js 15 App Router)
- **Tech Stack**: Next.js 15, React 19, TypeScript, Tailwind CSS, Radix UI Primitives, Lucide React, Vercel AI SDK (`ai`, `@ai-sdk/react`), Google Gemini 2.5 Flash (`@ai-sdk/google`), Supabase (Postgres + Auth + RLS + Realtime), Vitest.
- **Deployment**: Docker standalone image (see `Frontend/Dockerfile`) or Vercel; CI via GitHub Actions (`.github/workflows/ci.yml`: lint → test → build).

---

## 2. Essential Commands

All development commands must be run from within the `Frontend/` directory — or use the root **Makefile** (`make help`):

```bash
# ── Makefile targets (from repo root) ─────────────────────────────
make install        # npm install (Frontend)
make dev            # dev server :3000
make build          # production build + typecheck (83 routes)
make lint           # ESLint
make test           # vitest suite (239 tests, 28 suites)
make test-migrations # DB migration + RLS + quota validation (needs local Postgres)
make ci             # lint → migrations → tests → build (what CI runs)
make graphify       # refresh code knowledge graph (AST-only)

# ── Equivalent raw commands (from Frontend/) ──────────────────────
npm install
npm run dev
npm run build
npm run start
npm run lint
npm test                 # unit · security · state-machine · property intelligence · n8n architecture (239 tests)
```

**Database**: apply `supabase/migrations/*.sql` in numeric order (`0001` → `0021`). Migrations are validated against real PostgreSQL and include RLS policies, quota triggers, org bootstrap logic, Property Intelligence, the Enterprise Domain Model, and n8n Outbox Event Bus. Never edit applied migrations — add a new numbered file.

---

## 3. Strict Operating Rules & Architectural Invariants

1. **CallCRM + n8n Separation of Responsibilities Axiom**:
   - **CallCRM Owns the Truth**: Core operations (*People, Leads, Buyer Requirements, Listings, Mandates, Units, Negotiations, Deals, Brokerage, and Audit Logs*) run natively inside CallCRM with PostgreSQL RLS.
   - **Zero Dependency**: CallCRM functions 100% uninterrupted even if n8n is offline.
   - **Transactional Outbox (`crm_domain_events`)**: Emits HMAC-SHA256 signed business events asynchronously with 3s timeouts and circuit breakers tripping after 5 consecutive failures.
   - **Inbound Idempotency (`inbound_integration_events`)**: Webhooks from Meta, WhatsApp, or n8n are checked against unique `external_event_id` to prevent duplicate contacts or deals.
2. **People Registry Decoupled from Leads**:
   - A Person is a real-world identity (*Rahul Sharma*); a Lead is a business inquiry. One Person can hold multiple requirements (Gurgaon 4BHK + Mumbai investment) without contact duplication.
3. **Role-Protected Seller Price Floors (Confidentiality Guardrail)**:
   - `minimum_acceptable_price` and seller price floors are masked from standard sales reps via API layer filtering, visible only to Managers and Founders.
4. **AI Safety Contract (CRITICAL)**:
   - AI agents NEVER mutate the database autonomously. AI may only summarize, recommend, rank, match, explain, and draft suggestions. Every state change requires explicit human review and approval.
5. **Real Estate Hierarchy Invariant (Flat/Unit as Atomic Asset)**:
   - Hierarchy: `Region` → `Area` → `Society/Project` → `Tower` → `Floor` → `Flat/Unit`.
   - The **Unit is the core atomic transactional asset**.

---

## 4. Architecture & Directory Layout

```
Real-estate/
├── supabase/
│   └── migrations/                # Canonical DB (apply in order 0001→0021):
│       ├── 0001_init.sql          #   multi-tenant schema + RLS + org bootstrap trigger
│       ├── 0002_sample_seed.sql   #   first-run sample data RPC (per-org, idempotent)
│       ├── ...                    #   phases 3-11 migrations
│       ├── 0018_phase12_property_intelligence_schema.sql # Areas, Towers, Units 360, Relationships, Facts
│       ├── 0019_phase13_intelligence_automation.sql # Seller opportunities, site visit briefings, stale facts
│       ├── 0020_enterprise_domain_model.sql # People, Requirements, Mandates, Bids, Dispatches, Commissions
│       └── 0021_n8n_event_bus_and_integration_outbox.sql # Outbox, Integration Endpoints, Inbound Idempotency
├── .github/workflows/ci.yml       # CI: lint → vitest → next build
├── DOCS/                          # Centralized Documentation & Specification Hub
│   ├── system-spec/               # 12-Part Canonical System Specifications (01 → 12)
│   ├── domain-guides/             # Deep-Dive Engineering & Automation Guides (01 → 11)
│   ├── ui-ux-spec/                # CRM UI/UX Redesign & Design System Specs (01 → 09)
│   ├── marketing-spec/            # Marketing Editorial Specifications (01 → 08)
│   ├── playbooks/                 # Executive Blueprints & Encyclopedias (01 → 04)
│   └── README.md                  # Master Documentation Index & Links
└── Frontend/
    ├── src/
        ├── middleware.ts          # Edge route protection (JWT revalidation)
        ├── app/                   # App Router: marketing page, auth flow, CRM routes, /api/* (83 endpoints)
        │   └── api/               # people · listings/mandates · deals/[id]/negotiations · site-visits/dispatch · finance/commissions · integrations/*
        ├── components/crm/        # Negotiation modal · Site visit dispatch · Commission modal · n8n drawer
        ├── context/               # auth-context · crm-context
        ├── lib/
        │   ├── server/            # domain-event-bus · seller-intelligence · site-visit-briefing · aria-tools · api-security
        │   └── persistence/       # crm-sync (row↔domain mappers) · retry-queue
        ├── types/crm.ts           # Domain TypeScript definitions
        └── __tests__/             # 239 tests across 28 suites
```

---

## 5. Verification & Testing Standards

- Always run `npm test` before declaring tasks complete. All 239 tests must pass with 0 failures.
- Always run `npm run build` to verify clean Next.js compilation across all 83 routes.
- After modifying code files, always run `graphify update .` to keep the AST knowledge graph synchronized.

# CLAUDE.md — CallCRM Developer & AI Agent Guidelines

This document outlines architectural principles, development commands, design rules, and domain standards for **CallCRM (Apex Realty)**. It reflects the codebase **as hardened** (multi-tenant Supabase backend, RLS-enforced tenancy, human-gated AI agents).

---

## 1. Project Overview & Role

- **Project**: CallCRM for Apex Realty
- **Domain**: High-ticket Indian luxury real estate sales operating system & daily salesperson cockpit with human-gated AI Agents.
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
make build          # production build + typecheck
make lint           # ESLint
make test           # vitest suite (222 tests, 23 suites)
make test-migrations # DB migration + RLS + quota validation (needs local Postgres)
make test-e2e       # Playwright browser smoke suite
make ci             # lint → migrations → tests → build (what CI runs)
make verify         # ci + e2e
make docker-build   # production image
make graphify       # refresh code knowledge graph

# ── Equivalent raw commands (from Frontend/) ──────────────────────
npm install
npm run dev
npm run build
npm run start
npm run lint
npm test                 # unit · security · state-machine · property intelligence · seller automation (222 tests)
npm run test:migrations  # DB behavior harness (scripts/validate-migrations.mjs)
npm run test:e2e         # Playwright smoke (e2e/smoke.spec.ts)

docker build -t callcrm:latest .
```

**Database**: apply `supabase/migrations/*.sql` in numeric order (0001 → 0019). Migrations are validated against real PostgreSQL and include RLS policies, quota triggers, org bootstrap logic, the Property Intelligence Layer, and Seller Opportunities Automation. Never edit applied migrations — add a new numbered file. `make test-migrations` re-validates the whole chain plus functional guarantees locally and in CI.

---

## 3. Strict Operating Rules & Constraints

1. **Git Policy (CRITICAL)**:
   - **DO NOT commit or push to Git** unless the user explicitly commands it in their prompt (`"commit and push"`).
2. **Real Estate Hierarchy Invariant (Flat/Unit as Atomic Asset)**:
   - Hierarchy: `Region` → `Area` → `Society/Project` → `Tower` → `Floor` → `Flat/Unit`.
   - The **Unit is the core atomic transactional asset**, not the society. Societies only store shared amenities, gate pass protocols, and RWA rules. Units store price memory, temporal ownership history, and cost sheets.
3. **Security Invariants (CRITICAL — never violate)**:
   - All API routes require a verified session (`getApiAuthContext`) or fail-closed HMAC verification (webhooks). No anonymous access, ever.
   - Secrets are **server-only**: never read `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `WHATSAPP_APP_SECRET`, `META_APP_SECRET`, or `BILLING_WEBHOOK_SECRET` into any `NEXT_PUBLIC_*` variable.
   - Webhooks **fail closed**: unsigned/unverified payloads are rejected (503 if secret unset).
   - `org_id` is derived from the verified session or webhook-source mapping — **never from client request bodies**.
   - Roles come from the `profiles` table (server-side). The client role is display-only perspective mapping; it grants nothing.
   - **AI Safety Contract**: AI agents NEVER mutate the database autonomously. AI may only summarize, recommend, rank, match, explain, and generate briefings. Every write/stage-transition requires explicit human review and confirmation.
   - Plan quotas are enforced by DB triggers (`assert_lead_quota`, `assert_seat_quota`) — do not add client-side-only quota checks and present them as enforcement.
4. **Design Language & Visual Identity**:
   - **Background**: Soft off-white (`#fcfcf9` / `hsl(60, 20%, 98%)`) with architectural blueprint touches.
   - **Cards & Surfaces**: Clean white (`#ffffff`) with subtle 1px border (`#e8e8e3`) and light box-shadow.
   - **Typography**: Crisp deep navy / charcoal (`#1a1f2c`).
   - **Card Compactness**: Keep cards relatively compact with readable, dense real-estate metrics.
5. **Data Reactivity & Synchronization**:
   - Live data flows browser → Supabase (RLS-enforced) via the persistence bridge (`lib/persistence/crm-sync.ts`). Mutations are optimistic locally + write-through remotely; failures enter an automatic retry queue (`lib/persistence/retry-queue.ts`).
   - Realtime: a `postgres_changes` channel on `leads`, `tasks`, `activities`, `property_areas`, `projects`, `project_units`, `entity_relationships`, `property_facts`, `seller_opportunities` triggers debounced refetches so all sessions/devices converge.
6. **Fast 10-Second Interaction Philosophy**:
   - Salesperson workflows must always prioritize speed: `SEE → ACT → LOG → SCHEDULE → MOVE ON`.
   - Modals provide 1-click presets (`Tomorrow`, `In 3 Days`, `In 1 Week`) and structured outcomes (`Connected`, `Interested`, `Site Visit Booked`, etc.).

---

## 4. Architecture & Directory Layout

```
Real-estate/
├── supabase/
│   └── migrations/                # Canonical DB (apply in order 0001→0019):
│       ├── 0001_init.sql          #   multi-tenant schema + RLS + org bootstrap trigger
│       ├── 0002_sample_seed.sql   #   first-run sample data RPC (per-org, idempotent)
│       ├── 0003_rate_limiting.sql #   durable Postgres-backed rate limiter
│       ├── 0004_tenant_defaults.sql # org_id column defaults (safety net)
│       ├── 0005_authorization_hardening.sql # role-guard, task scoping, lead ownership
│       ├── 0006_billing_quotas.sql # billing columns + lead/seat quota triggers
│       ├── ...                    # phases 7-11 migrations
│       ├── 0018_phase12_property_intelligence_schema.sql # Areas, Towers, Units 360, Relationships, Facts
│       └── 0019_phase13_intelligence_automation.sql # Seller opportunities, site visit briefings, stale facts RPC
├── .github/workflows/ci.yml       # CI: lint → vitest → next build
└── Frontend/
    ├── Dockerfile                 # Multi-stage standalone production image (non-root)
    ├── .env.local.example         # Complete env template with security notes
    ├── middleware.ts → src/       # Edge route protection (JWT revalidation via getUser())
    └── src/
        ├── app/
        │   ├── layout.tsx           # Fonts, AuthProvider, CRMProvider
        │   ├── page.tsx             # Public marketing landing page
        │   ├── error.tsx            # Global error boundary (retry + digest ref)
        │   ├── not-found.tsx        # 404 surface
        │   ├── (auth)/              # login · onboarding · choose-plan · setup-org
        │   ├── dashboard/page.tsx   # Thin AppShell wrapper
        │   ├── agent-live/page.tsx  # Thin AppShell wrapper (AI terminal tab)
        │   ├── leads|pipeline|tasks|projects|people|activities|
        │   │   reports|users|regions|settings/page.tsx  # ALL thin AppShell wrappers
        │   └── api/                 # 63 route handlers (all authenticated or fail-closed):
        │       ├── seller-opportunities/route.ts # Proactive seller signals & mandate conversion
        │       ├── properties/site-briefings/route.ts # 30-min pre-site-visit operational briefing
        │       ├── activities/meeting-summary/route.ts # AI free-text meeting structurer (approval-gated)
        │       ├── automation/stale-facts/route.ts # 180-day stale knowledge re-verification
        │       ├── properties/areas/route.ts # Locality & micro-market catalog
        │       ├── properties/towers/route.ts # Tower block configurations
        │       ├── properties/units/route.ts # Filterable inventory search
        │       ├── properties/units/[id]/route.ts # Flat 360° Dossier aggregator
        │       ├── relationships/route.ts   # Universal temporal relationship graph
        │       ├── properties/facts/route.ts # Property sales memory with verification tiers
        │       ├── search/global/route.ts   # Server-side multi-entity search
        │       ├── chat/route.ts            # Gemini streaming + property tools (human-gated)
        │       ├── leads/route.ts           # Tenant-scoped CRUD (org_id from session)
        │       ├── activities/route.ts      # Immutable audit stream
        │       ├── agent/resurrect/route.ts # Manager+ scan (validated, read-only)
        │       ├── health/route.ts          # Minimal public probe; verbose = manager+
        │       ├── billing/checkout/route.ts  # Stripe/Razorpay order creation + simulated
        │       ├── billing/webhook/route.ts   # Fail-closed HMAC; insert-first idempotency
        │       └── webhooks/{whatsapp,meta-lead-ads}/route.ts # HMAC + replay guard + tenant map
        ├── middleware.ts            # Page-route protection + auth-flow redirects
        ├── components/
        │   ├── crm/
        │   │   ├── pages/           # Page BODIES (route files are thin AppShell wrappers)
        │   │   ├── ai-agent-command-center.tsx  # Qualification terminal (approval-gated)
        │   │   ├── ai-lead-bot.tsx              # Floating intake widget (approval-gated)
        │   │   ├── ai-resurrection-modal.tsx    # Lost-lead matcher (client heuristics)
        │   │   ├── seller-opportunities-modal.tsx # Seller signals & mandate conversion modal
        │   │   ├── meeting-summary-modal.tsx    # Human-gated voice/free-text meeting summarizer
        │   │   ├── boss-overview.tsx            # Executive command center (real computed KPIs)
        │   │   ├── salesperson-home.tsx         # Action-first sales cockpit with 30m site visit briefing
        │   │   ├── quick-activity-modal.tsx     # 10s rapid disposition logger
        │   │   ├── unit-detail-modal.tsx        # Flat 360° dossier & ownership graph
        │   │   ├── lead-detail-modal.tsx        # 360° lead dossier & document vault
        │   │   ├── whatsapp-action-modal.tsx    # 1-click WhatsApp templating
        │   │   ├── global-search-dialog.tsx     # ⌘K command palette
        │   │   └── pipeline-board.tsx           # Stage board (select-based transitions)
        │   ├── layout/              # AppShell (auth gating + tabs), Sidebar, TopBar
        │   └── ui/                  # Radix primitives, status badges, action-card helper
        ├── context/
        │   ├── auth-context.tsx     # Supabase sessions ONLY (no localStorage identity)
        │   └── crm-context.tsx      # Hydration + write-through mutations (memoized value)
        ├── lib/
        │   ├── supabase.ts                  # Browser client (cookie sessions)
        │   ├── mock-data.ts                 # Demo dataset (ONLY used unauthenticated)
        │   ├── utils.ts                     # Currency (₹ Lakh/Cr), phone formatters
        │   ├── persistence/
        │   │   ├── crm-sync.ts              # Row↔domain mappers, hydration, write-through
        │   │   └── retry-queue.ts           # Failed-write auto-retry (online/focus/timer)
        │   ├── observability/reporter.ts    # Structured [CRM_ERROR] pipeline (Sentry hook)
        │   └── server/                      # Server-only modules:
        │       ├── seller-intelligence.ts   # Expiring tenancies, vacant units & investor exit scanner
        │       ├── site-visit-briefing.ts   # 30-minute pre-site visit briefing synthesizer
        │       ├── aria-tools.ts            # 100-point bi-directional matcher & free-text structurer
        │       ├── api-security.ts          # apiError/apiSuccess envelopes, HMAC, timing-safe
        │       ├── supabase-server.ts       # getApiAuthContext (cookie OR bearer), service-role
        │       ├── validations.ts           # Zod schemas for every inbound payload
        │       ├── rate-limit.ts            # Two-tier durable limiter (memory L1 + PG L2)
        │       └── subscription.ts          # Plan configs + feature gates + webhook updates
        └── __tests__/               # 222 tests: unit, security, mappers, state machine, property & seller intelligence (jsdom)
```

---

## 5. AI Agents & Automation Modules

### 1. **Aria — Lead Qualification Agent & 100-Point Matcher (Human-Gated)**
- **Endpoint**: `/api/chat/route.ts` — `streamText` via `@ai-sdk/google`.
- **Bi-Directional Matcher**: Algorithmic scoring across Location (30%), Budget (30%), Configuration (20%), Floor/Facing (10%), Mandate Exclusivity (10%). Reverse matches buyers to incoming units.
- **Strict Human Confirmation Gate**: AI proposals stage behind explicit Approve/Reject review cards.

### 2. **Seller Intelligence & Opportunity Engine**
- **Endpoint**: `/api/seller-opportunities` (`detectSellerSignals`).
- Scans for expiring lease agreements ($<60$ days), vacant units incurring carrying cost, and 3+ year investor capital gains harvesting windows.
- 1-Click Mandate Conversion to active resale inventory.

### 3. **30-Minute Pre-Site-Visit Briefing Synthesizer**
- **Endpoint**: `/api/properties/site-briefings` (`synthesizeSiteVisitBriefing`).
- Aggregates Gate 2 visitor pass protocols, assigned parking bays, owner price boundaries, talking points, and anticipated objections for field reps 30 minutes before client arrival.

### 4. **Free-Text & Voice Meeting Structurer**
- **Endpoint**: `/api/activities/meeting-summary` (`structureFreeTextMeetingNotes`).
- Parses unstructured speech/notes in English & Hinglish, extracts objections, buying signals, and sentiment. Sales reps edit and confirm before saving.

### 5. **Lost-Lead Resurrection Engine**
- **Server**: `/api/agent/resurrect` — manager/admin only, scans dormant/lost leads against live inventory.
- **Client**: `AiResurrectionModal` matches requirements to units, generating WhatsApp pitches for 1-click reactivation.

### 6. **WhatsApp Sales Engine**
- **Component**: `WhatsAppActionModal` — dynamic variable interpolation into luxury templates, direct `wa.me/` dispatch, automated activity logging.
- **Inbound**: `/api/webhooks/whatsapp` processes replies (fail-closed HMAC, timestamp freshness, `webhook_sources` tenant resolution, DB-backed idempotency).

### 7. **Billing & Entitlements**
- Plans: starter (1 seat / 300 leads) · growth (4 seats / 2,500 leads) · enterprise (25 seats / 50,000 leads).
- **Enforcement layers**: DB triggers (leads/seats) + API feature gates (`/api/chat`, `/api/agent/resurrect` return `402 PLAN_UPGRADE_REQUIRED` below growth).

---

## 6. Real Estate Conventions & Formatting

- **Currency**: Always use `formatCurrencyINR(val)` from `src/lib/utils.ts`.
  - $\ge 1\text{ Crore} \longrightarrow \text{₹X.XX Cr}$ (e.g. `₹6.50 Cr`)
  - $< 1\text{ Crore} \longrightarrow \text{₹XX.XX L}$ (e.g. `₹85.00 L`)
- **Phone Numbers**: Indian E.164 normalization (`98100 11122` → `+919810011122`, enforced by DB trigger too) with direct `tel:` and `https://wa.me/` links.
- **Vastu & Facings**: Common preferences include `North-East`, `East`, `Park Facing`, `Corner Unit`.
- **Keyboard Hotkeys**:
  - <kbd>L</kbd> — Open Rapid Activity Logger (10s)
  - <kbd>F</kbd> — Jump to Tasks / Follow-ups
  - <kbd>/</kbd> or <kbd>⌘K</kbd> — Open Command Palette
  - <kbd>Esc</kbd> — Close any modal or drawer

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- ALWAYS read graphify-out/GRAPH_REPORT.md before reading any source files, running grep/glob searches, or answering codebase questions. The graph is your primary map of the codebase.
- IF graphify-out/wiki/index.md EXISTS, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

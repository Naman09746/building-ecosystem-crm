# Quickstart & Startup Guide — Unified Ecosystem Realty

Welcome to the **Ecosystem Realty & Building Ecosystem** repository. This project is engineered as a unified Next.js 15 monorepo powering high-ticket real estate sales and building materials supply chain operations.

---

## 1. Architecture Overview

- **Frontend & API Routes:** Single Next.js 15 application (`apps/real-estate`) handling all pages, server components, and 50+ REST endpoints.
- **Backend Services:** **No standalone backend process is required.** Next.js API Routes and Server Actions talk directly to Supabase via Postgres RLS.
- **Database & Auth:** Supabase (PostgreSQL with Auth, Row Level Security, and Realtime).
- **Turborepo:** Shared packages for `@repo/core` (business logic, context, validations) and `@repo/ui` (design system components).

---

## 2. Prerequisites

- **Node.js:** v18.18+ or v20+
- **Package Manager:** `npm` or `yarn` (v1.22+)
- **Supabase Account:** Local CLI instance or cloud project.

---

## 3. Environment Configuration

Ensure `.env.local` exists in `apps/real-estate/` (and at repo root if needed):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional Integrations
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> **Note:** If Supabase credentials are missing, the CRM automatically provides a **fully interactive demo mode** with realistic Indian market seed data.

---

## 4. Starting the Application

### Development Mode
From the root directory, run:

```bash
npm run dev
```

Turborepo will boot the dev server:
- **Unified App:** `http://localhost:3000` (or `http://localhost:3001` if port 3000 is occupied).

### Production Build
To test or deploy the production build:

```bash
npm run build
npm run start
```

---

## 5. Domain Diversion & Testing

The app supports both **Real Estate** and **Building Materials** under the same unified domain:

### A. Signup Diversion
1. Navigate to `/login?mode=signup`.
2. Select your business domain:
   - **🏢 Real Estate:** Housing developments, builder mandates, high-ticket floorplan explorers.
   - **🧱 Building Materials:** Cement, marble, tiles, wholesale Khata ledger, and depot dispatching.
3. Complete organization setup (`/setup-org`) — your choice is persisted to Supabase and remembered.

### B. 1-Click Instant Demo Testing
From `/login`, you can immediately jump into pre-configured personas without entering passwords:

- **🏢 Real Estate Personas:**
  - **Rep (Rahul):** Field salesperson cockpit, today's call priority queue.
  - **Manager (Priya):** Team SLA velocity, pipeline review.
  - **Founder (Vikram):** Full DLF Gurugram executive cockpit.
- **🧱 Building Materials Personas:**
  - **Counter Rep (Ramesh):** Walk-in counter log, quick customer inquiries.
  - **Dispatch (Sunil):** Transport challans, SKU inventory.
  - **Yard Boss (Rajesh):** Jindal Materials & Marble Yard executive cockpit.

---

## 6. Key URLs & Direct Routes

| Route | Description |
|---|---|
| `/` | Unified Landing Page (Marketing & Industry Showcase) |
| `/login` | Authentication, Sign In & 1-Click Demo Testing |
| `/dashboard` | Executive Sales & Operations Cockpit (adapts to vertical) |
| `/leads` | Leads table, qualification scoring & resurrection |
| `/pipeline` | Interactive Kanban Deal / Supply Pipeline Board |
| `/tasks` | Follow-up call queue & SLA reminders |
| `/projects` | Real estate towers / Building materials SKU catalog |
| `/footfall` | *(Materials)* Counter walk-in log |
| `/scouting` | *(Materials)* Construction site scouting & GPS radar |
| `/khata` | *(Materials)* Contractor credit ledger & aging dunning |
| `/rates` | *(Materials)* Daily market commodity rates board |

---

## 7. Troubleshooting

- **Port in use:** If port 3000 is occupied by another local service, Next.js will automatically fall back to port 3001. Check terminal output for the active port.
- **Corrupted Cache:** If Fast Refresh or module errors appear after major dependency or package edits, purge the local Next.js cache:
  ```bash
  rm -rf apps/real-estate/.next
  npm run dev
  ```

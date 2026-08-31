# 02. System Architecture Document — CallCRM 2.0

**Document Version:** 2.0.0 (Production Release)  
**Architecture Style:** Modular Monolith with Asynchronous Integration Event Bus (Next.js 15 App Router + React 19 + Supabase PostgreSQL + n8n Orchestrator)  
**Classification:** Enterprise Multi-Tenant SaaS

---

## 1. High-Level Architecture Topology

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    CLIENT LAYER                                         │
│  - Next.js 15 App Router (React 19 Server & Client Components)                         │
│  - Tailwind CSS + Radix UI Primitives (Design Tokens: Slate, Blue, Emerald, Amber)      │
│  - State Management: CRMContext (Reactive in-memory cache + Optimistic UI updates)     │
│  - Realtime Layer: TanStack React Query + Supabase WebSocket Channels                   │
└───────────────────────────┬─────────────────────────────────┬───────────────────────────┘
                            │                                 │
                 Direct Database Calls                Protected REST APIs (83 Endpoints)
              (Supabase Client with JWT RLS)     (/api/people, /api/deals, /api/integrations)
                            │                                 │
                            ▼                                 ▼
┌───────────────────────────────────────────────┐ ┌───────────────────────────────────────┐
│          POSTGRESQL 15+ (SUPABASE)            │ │       ENTERPRISE SECURITY LAYER       │
│  - Row-Level Security (RLS) on all 39 Tables  │ │  - Token-Bucket Rate Limiter (Per IP) │
│  - Tenant Isolation Function: current_tenant()│ │  - Zod Inbound Schema Validation      │
│  - Phone Normalization Trigger (E.164)        │ │  - Idempotency Cache Lock (X-Idemp)   │
│  - Transactional Outbox (crm_domain_events)   │ │  - HMAC-SHA256 Signature Verifier     │
│  - Role-Protected Seller Price Floors         │ │  - Circuit Breaker Tripping Engine    │
└───────────────────────┬───────────────────────┘ └───────────────────┬───────────────────┘
                        │ (Non-blocking Async Outbox Dispatch)        │
                        ▼                                             ▼
┌───────────────────────────────────────────────┐ ┌───────────────────────────────────────┐
│            n8n AUTOMATION LAYER               │ │       AUTONOMOUS AI AGENT ENGINE      │
│  - External WhatsApp Cloud API Orchestration  │ │  - Vercel AI SDK 5 (streamText)       │
│  - Meta Lead Ads Webhook Receiver             │ │  - Google Gemini 2.5 Flash            │
│  - Google Calendar Site Visit Scheduling      │ │  - Human Approval Gate Interceptor    │
│  - AI Lead Intent Extraction Drafts           │ │  - Execution Telemetry & Audit Logs   │
└───────────────────────────────────────────────┘ └───────────────────────────────────────┘
```

---

## 2. Component Subsystems & Responsibilities

### 2.1 Web Application & Router (`Frontend/src/app/`)
- **Framework:** Next.js 15.2.0 with Turbopack and React 19.
- **Route Architecture:**
  - `/(auth)/`: Unauthenticated and onboarding workflows (`login`, `setup-org`, `choose-plan`, `onboarding`).
  - `/dashboard`: Role-aware redirect hub (Boss Executive Dashboard vs Salesperson Home).
  - `/leads`, `/pipeline`, `/projects`, `/tasks`, `/activities`, `/people`, `/reports`, `/regions`, `/users`, `/settings`: Core CRM operations.
  - `/api/`: Protected serverless API routes (83 endpoints).

### 2.2 Global State & Optimistic UI (`Frontend/src/context/crm-context.tsx`)
- Centralized reactive bridge managing organizational state (`leads`, `tasks`, `projects`, `units`, `activities`, `people`, `documents`).
- **Strict Multi-Tenant Verification:** Every filtered selector (`filteredLeads`, `filteredTasks`, `reactivationLeads`) strictly enforces `record.orgId === currentUser.orgId`.
- **Sub-10ms UI Feedback:** State updates optimistically in React before resolving over the network.

### 2.3 CallCRM + n8n Integration Layer (`Frontend/src/lib/server/domain-event-bus.ts`)
- **Transactional Outbox:** Dispatches domain events (`LeadCreated`, `SiteVisitScheduled`, `NegotiationAgreed`, `MandateExpiring`, `CommissionCreated`) with HMAC signatures.
- **Inbound Idempotency:** Webhook ingestion routes verify external event IDs against `inbound_integration_events` to drop repeated deliveries.
- **AI Safety Gate:** AI extracted drafts require explicit human approval before mutating CRM state.

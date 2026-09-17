# API Keys & Environment Setup Guide

Every external service EcosystemRealty uses, what it powers, where to get it, and what breaks without it.

**Rule of thumb:** variables starting with `NEXT_PUBLIC_` are safe for the browser. Everything else is **server-only** — never put them in a `NEXT_PUBLIC_*` variable, never commit them.

Copy `Frontend/.env.local.example` → `Frontend/.env.local` and fill in as you go.

---

## Quick Summary

| Priority | Service | Variables | Without it |
|---|---|---|---|
| 🔴 **Required** | Supabase | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | No login, no data — app runs in demo mode only |
| 🟠 For AI features | Google Gemini | `GEMINI_API_KEY` *(or* `GOOGLE_GENERATIVE_AI_API_KEY`*)* | `/api/chat` returns 503; AI surfaces run client-side simulation only |
| 🟡 Optional | n8n Orchestrator | `N8N_SERVICE_SECRET` | Inbound service dispatch falls back to default dev secret |
| 🟡 Optional | WhatsApp Cloud API | `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET` | Inbound webhook refuses traffic (by design) |
| 🟡 Optional | Meta Lead Ads | `META_LEAD_ADS_VERIFY_TOKEN`, `META_APP_SECRET` | Inbound webhook refuses traffic (by design) |
| 🟡 Optional | Payments (Stripe or Razorpay) | `BILLING_WEBHOOK_SECRET` + provider key | Checkout runs in "simulated" mode; no real charges |
| ⚪ Optional | Error tracking | Sentry DSN (when wired) | Errors log to structured console only |

---

## 1. 🔴 Supabase — REQUIRED (database + auth + realtime)

Powers: login/signup, all CRM data with Row-Level Security, org auto-bootstrap on signup, sample-data seeding, quota triggers, realtime sync.

**Where to get it:** [supabase.com](https://supabase.com) → New project (free tier works) → Project Settings → API

```env
# Client-safe (browser bundle) — "Project URL" and "anon public" key
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...   # the long "anon public" key

# SERVER-ONLY ("service_role" key) — bypasses RLS; used by webhooks & billing only
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
```

**Setup steps after creating the project:**
1. Apply migrations in order — SQL Editor → paste each file from `supabase/migrations/` (`0001_init.sql` through `0021_n8n_event_bus_and_integration_outbox.sql`). This creates all tables, RLS policies, triggers, quota enforcement, Property Intelligence, Seller Opportunities Automation, Enterprise Domain Layer, and n8n Outbox Event Bus.
2. Enable **Realtime**: Database → Replication → enable `postgres_changes` for tables `leads`, `tasks`, `activities`, `people`, `buyer_requirements`, `property_listings`, `negotiation_rounds`, `site_visit_dispatches`, `commission_ledgers`, `crm_domain_events`.
3. Auth providers: Email/password is on by default; add Google OAuth (Authentication → Providers) if you want the "Log in with Google" button to work.
4. If you allow open signups, consider enabling email confirmation (Auth → Providers → Email → "Confirm email").

> ⚠️ The service_role key must never reach the browser or a `NEXT_PUBLIC_` variable.

---

## 2. 🟠 Google Gemini — for the Aria AI agent

Powers: `/api/chat` streaming qualification assistant.

**Where to get it:** [Google AI Studio](https://aistudio.google.com/apikey) → Get API key (generous free tier)

```env
GEMINI_API_KEY=AIza...
# Alternative name also accepted:
# GOOGLE_GENERATIVE_AI_API_KEY=AIza...
```

Without it: authenticated users hitting the chat route get a clean `503 AI_PROVIDER_UNAVAILABLE`; the command center still works in simulation mode (client heuristics, still approval-gated).

Model used: `gemini-2.5-flash`. Usage is capped per request (`maxOutputTokens=1024`) and per user (20 req/min durable rate limit), so cost exposure is bounded.

---

## 3. 🟡 WhatsApp Cloud API — inbound message ingestion

Powers: `/api/webhooks/whatsapp` — customer replies create/update contacts + audit trail automatically.

**Where to get it:** [Meta for Developers](https://developers.facebook.com) → Create app → Add "WhatsApp" product

```env
WHATSAPP_VERIFY_TOKEN=<any long random string you invent>
WHATSAPP_APP_SECRET=<from App Settings → Basic → App Secret>
```

**Setup steps:**
1. Copy your phone number's **Phone Number ID** (WhatsApp → API Setup).
2. In Supabase SQL Editor, register the mapping so inbound messages resolve to your tenant:
   ```sql
   insert into webhook_sources (org_id, provider, external_id)
   values ('<your-org-uuid>', 'whatsapp', '<phone-number-id>');
   ```
3. In Meta App → WhatsApp → Configuration, set the webhook URL to
   `https://<your-domain>/api/webhooks/whatsapp` and paste your verify token.

> Both variables are mandatory — the endpoint fails closed (503) if either is missing, and rejects unsigned payloads (401).

---

## 4. 🟡 Meta Lead Ads — instant lead capture from Facebook/Instagram ads

Same pattern as WhatsApp:

```env
META_LEAD_ADS_VERIFY_TOKEN=<any long random string you invent>
META_APP_SECRET=<same Meta App Secret as above>
```

**Setup steps:**
1. Webhook URL: `https://<your-domain>/api/webhooks/meta-lead-ads`, subscribe to the **leadgen** field for your Page.
2. Register the Page ID:
   ```sql
   insert into webhook_sources (org_id, provider, external_id)
   values ('<your-org-uuid>', 'meta_ads', '<page-id>');
   ```

Skip this entirely if you don't run Meta lead ads.

---

## 5. 🟡 Payments & Billing — Stripe and Razorpay (Multi-Gateway + Sandbox)

Powers: multi-tier subscriptions, lead/seat quota synchronization, digital GST tax receipts, cancellation, and refund management.

### Common Configuration
```env
BILLING_WEBHOOK_SECRET=<long random string — used for HMAC SHA-256 signature verification>
```

### Option A: Stripe ([dashboard.stripe.com](https://dashboard.stripe.com))
```env
STRIPE_SECRET_KEY=sk_test_...        # use sk_live_... in production
STRIPE_WEBHOOK_SECRET=whsec_...      # optional alias for BILLING_WEBHOOK_SECRET
```
Webhook endpoint: `https://<your-domain>/api/billing/webhook`
(Events: `checkout.session.completed`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`, `charge.refunded`)

### Option B: Razorpay ([dashboard.razorpay.com](https://dashboard.razorpay.com))
```env
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
```
Webhook endpoint: `https://<your-domain>/api/billing/webhook`
(Events: `payment.captured`, `subscription.charged`, `subscription.cancelled`, `subscription.pending`, `refund.processed`)

### Local Sandbox Mode
When provider secret keys are absent, EcosystemRealty automatically uses **Secure Sandbox Mode**, generating cryptographically signed test checkout tokens and executing full server-side database lifecycle state transitions, invoice creations, and quota triggers without faking UI state.

---

### Billing API Endpoints

| Method | Endpoint | Authorization | Description |
|---|---|---|---|
| `POST` | `/api/billing/checkout` | Manager/Owner | Initiate provider checkout session |
| `POST` | `/api/billing/webhook` | Verified HMAC Signature | Ingest provider events and transition subscriptions |
| `GET` | `/api/billing/subscription` | Authenticated User | Get current subscription, plan limits, and real-time usage meters |
| `POST` | `/api/billing/cancel` | Manager/Owner | Schedule cancellation at period end or cancel immediately |
| `POST` | `/api/billing/reactivate` | Manager/Owner | Restore auto-renewal on scheduled cancellations |
| `POST` | `/api/billing/refunds` | Manager/Owner | Process full or partial refunds for paid invoices |
| `GET` | `/api/billing/refunds` | Authenticated User | List all organization refund records |
| `GET` | `/api/billing/invoices` | Authenticated User | List billing invoice history |
| `GET` | `/api/billing/invoices/:id/receipt` | Authenticated User | Download GST-ready tax invoice receipt |
| `POST` | `/api/billing/customer` | Manager/Owner | Update legal entity name, Indian GSTIN, and billing address |
| `POST` | `/api/billing/sandbox-confirm` | Manager/Owner (Signed token) | Authorize and confirm sandbox test checkout sessions |

---

### Real Estate Intelligence & Automation Endpoints

| Method | Endpoint | Authorization | Description |
|---|---|---|---|
| `GET` | `/api/seller-opportunities` | Authenticated User | List proactively detected seller signals (tenancy expiry, vacancy, investor exit) |
| `POST` | `/api/seller-opportunities` | Authenticated User | Create seller opportunity or trigger scan |
| `GET` | `/api/properties/site-briefings` | Authenticated User | Fetch synthesized 30-min pre-site-visit briefing (gate pass PIN, parking, owner price) |
| `POST` | `/api/properties/site-briefings` | Authenticated User | On-demand synthesize site visit briefing |
| `POST` | `/api/activities/meeting-summary` | Authenticated User | Structure raw speech/notes (proposal) OR save confirmed meeting disposition |
| `POST` | `/api/automation/stale-facts` | Manager/Owner | Trigger 180-day stale property knowledge scan and flagging |
| `GET`, `POST` | `/api/leads/[id]/bids` | Authenticated User | Multi-party bidding ledger & counter-offers |
| `GET`, `POST` | `/api/leads/[id]/site-visit-pass` | Authenticated User | Digital site visit pass & geofenced gate check-in |
| `GET`, `POST` | `/api/commissions` | Manager/Owner | Tiered broker commissions & TDS 194H deduction |
| `POST` | `/api/financials/cost-sheet` | Authenticated User | Compute Indian cost sheet (CLP, GST, Stamp duty) |
| `POST` | `/api/integrations/outbox/process` | Cron / Secret | Process queued domain events in integration outbox |

---

## 6. ⚪ Error Tracking (recommended before launch)

The observability pipeline (`lib/observability/reporter.ts`) currently emits structured `[CRM_ERROR]` console logs wired into the error boundary, all API 5xx, and failed syncs. To forward these to Sentry:

1. Create an account at [sentry.io](https://sentry.io), create a Next.js project, copy the DSN.
2. Install the SDK: `npm install @sentry/nextjs`
3. Wire it at the marked hook point in `reporter.ts` (`forwardToReporter`) and set:
   ```env
   NEXT_PUBLIC_SENTRY_DSN=https://...o.ingest.sentry.io/...
   ```

---

## Local Development Minimal Setup

Just want the app running locally with real auth/data?

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Apply the 21 migrations → sign up → your org, owner profile, pipeline stages, and sample data are created automatically. Everything else degrades gracefully.

Demo mode (no env at all): UI exploration only, mock dataset, no persistence, **no fake login**.

---

## Production Deployment Checklist

- [ ] All 🔴🟠 variables set in hosting provider (Vercel env settings or Docker `--env-file`)
- [ ] Secrets **not** committed anywhere; `.env*` is gitignored
- [ ] Migrations applied to production Supabase (0001→0021); validated locally first with `make test-migrations`
- [ ] Realtime replication enabled on leads/tasks/activities/outbox
- [ ] Webhook URLs configured in Meta/Stripe dashboards (if used)
- [ ] `webhook_sources` rows registered per connected channel
- [ ] CI green on main (lint · tests · build · DB migration validation) — or run `make ci` locally

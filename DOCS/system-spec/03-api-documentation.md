# 03. API Documentation — Apex Realty EcosystemRealty

**Base URL:** `https://your-domain.com/api` (or `http://localhost:3000/api` in local dev)  
**Protocol:** HTTPS / JSON  
**Authentication:** Bearer JWT Token (`Authorization: Bearer <token>`)

---

## 1. Global API Standards & Envelopes

### 1.1 Standard Success Envelope (`200 OK`, `201 Created`)
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "requestId": "req_f82a910c",
    "timestamp": "2026-08-22T06:00:00.000Z",
    "page": 1,
    "limit": 50,
    "total": 142
  }
}
```

### 1.2 Standard Error Envelope (`400`, `401`, `403`, `422`, `429`, `500`)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed for input payload",
    "requestId": "req_d31e847b",
    "details": [
      { "path": "phone", "message": "Phone number must be at least 10 digits" }
    ]
  }
}
```
*(Zero stack traces, raw SQL queries, or internal credentials are ever returned in client responses).*

---

## 2. API Endpoints Catalog

### 2.1 Leads Management API

#### `GET /api/leads`
Retrieve paginated, tenant-isolated sales opportunities.
- **Query Parameters:**
  - `stage` (string, optional): Filter by pipeline stage (`new`, `contacted`, `qualified`, `site_visit`, `negotiation`, `won`, `lost`, `all`).
  - `projectId` (string, optional): Filter by target project ID.
  - `repId` (string, optional): Filter by assigned sales representative.
  - `page` (number, default: 1): Page number.
  - `limit` (number, default: 50): Items per page.
- **Rate Limit:** 120 requests / min.
- **Response `200 OK`:** Array of enriched Lead objects.

#### `POST /api/leads`
Create a new sales opportunity with automatic phone normalization and deduplication.
- **Headers:** `X-Idempotency-Key` (string, recommended).
- **Rate Limit:** 30 requests / min.
- **Request Body (Zod Validated):**
```json
{
  "personName": "Vikramaditya Singhania",
  "phone": "+91 98101 23456",
  "email": "vikram@singhania.com",
  "projectId": "proj-camellias",
  "budget": 250000000,
  "stage": "qualified",
  "source": "Website Inbound",
  "configurationPreference": "4 BHK Penthouse",
  "timeline": "Immediate (Within 30 Days)",
  "leadScore": 96,
  "leadScoreLabel": "Hot"
}
```
- **Response `201 Created`:** The created lead object with normalized phone and linked master person ID.

---

### 2.2 Activity & Audit Stream API

#### `GET /api/activities`
Retrieve immutable chronological audit trail of calls, WhatsApp chats, and visits.
- **Query Parameters:** `leadId` (string, optional), `projectId` (string, optional), `limit` (number, default: 50).
- **Response `200 OK`:** Array of activity records with timestamps and actor details.

#### `POST /api/activities`
Log a sales interaction and update lead velocity.
- **Request Body:**
```json
{
  "leadId": "55555555-5555-5555-5555-555555550001",
  "type": "call",
  "outcome": "site_visit_booked",
  "outcomeLabel": "Site Visit Booked",
  "notes": "Spoke with client. Confirmed physical site walkthrough for Saturday 11:30 AM.",
  "durationSeconds": 145,
  "scheduledFollowUpAt": "Saturday, 11:30 AM"
}
```
- **Response `201 Created`:** Created activity record. Automatically updates `last_activity_at` on parent lead.

---

### 2.3 Autonomous AI Agent APIs

#### `POST /api/chat`
Streaming conversational AI lead qualification endpoint (Aria Agent).
- **Request Body:** `{ "messages": [ { "role": "user", "content": "Looking for 3 BHK in Gurgaon around 4 Cr" } ] }`
- **Features:** 10-message rolling window limit, max 1024 output tokens, temperature 0.3, tool invocation streaming.
- **Response:** `text/event-stream` UI Message Stream.

#### `POST /api/agent/resurrect`
Autonomous lost-lead resurrection scanner.
- **Request Body:** `{ "daysThreshold": 14 }`
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "totalScanned": 12,
    "resurrectableOpportunities": [
      {
        "leadId": "lead-lost-1",
        "buyerName": "Rajeev Agarwal",
        "phone": "+919811122334",
        "daysInactive": 24,
        "matchedUnit": { "tower": "Tower Camellias B", "unitNumber": "B-1204", "price": 245000000 },
        "suggestedAngle": "New Tower Allotment",
        "revivalScore": 94
      }
    ],
    "latencyMs": 42
  }
}
```

---

### 2.3 Multi-Party Bidding & Negotiation API

#### `GET /api/leads/[id]/bids`
Retrieve all structured offers and counter-offers logged for a lead.
- **Access:** Salesperson (assigned lead) or Manager/Admin.
- **Response `200 OK`:** Array of `LeadBid` objects with offer amount, token amount, validity timestamp, and status.

#### `POST /api/leads/[id]/bids`
Submit an offer, counter-offer, or update bid disposition.
- **Headers:** `X-Idempotency-Key` (string, optional).
- **Request Body:**
```json
{
  "offerAmount": 245000000,
  "tokenAmount": 2500000,
  "validUntil": "2026-09-15T18:00:00.000Z",
  "paymentTerms": "Construction-Linked Plan (CLP) with 10% booking advance",
  "status": "submitted",
  "counterOfferAmount": null,
  "notes": "Client requested inclusion of 3 covered parking slots in base price."
}
```
- **Response `201 Created`:** Created bid record. Automatically updates `deal_bids` and logs domain event `deal.bid_placed` to outbox.

---

### 2.4 Digital Site Visit Pass API

#### `GET /api/leads/[id]/site-visit-pass`
Fetch active and historical digital visitor gate passes for a buyer.
- **Response `200 OK`:** Array of `SiteVisitPass` objects with QR token, gate PIN, vehicle info, and verification state.

#### `POST /api/leads/[id]/site-visit-pass`
Generate an encrypted digital site visit pass with QR verification and gate PIN.
- **Request Body:**
```json
{
  "scheduledDate": "2026-09-02",
  "scheduledTime": "11:30 AM",
  "vehicleNumber": "HR 26 DQ 8899",
  "accompanyingCount": 2,
  "specialInstructions": "Client requested golf cart pickup from Tower B visitor lobby."
}
```
- **Response `201 Created`:** Created site visit pass containing `qrPassToken`, `gateSecurityPin`, and `qrCodeDataUrl`. Emits `site_visit.pass_generated` to domain outbox.

---

### 2.5 Broker Commission & Payout Engine API

#### `GET /api/commissions`
Retrieve broker commission statements, TDS deductions, and tranche payment schedules.
- **Query Parameters:** `leadId` (optional), `brokerId` (optional), `status` (optional: `pending`, `partially_paid`, `paid`).
- **Response `200 OK`:** Array of commission records with gross commission, 5% TDS deduction (Section 194H), net payable, and payment tranches.

#### `POST /api/commissions`
Register or update a broker commission agreement.
- **Request Body:**
```json
{
  "leadId": "55555555-5555-5555-5555-555555550001",
  "brokerId": "broker-rera-01",
  "grossCommissionRate": 2.0,
  "milestoneStructure": [
    { "milestone": "booking_token", "percentage": 50 },
    { "milestone": "agreement_signing", "percentage": 50 }
  ]
}
```
- **Response `201 Created`:** Stored commission record with automated TDS 194H calculations.

---

### 2.6 Enterprise Financials & Cost Sheet Calculator API

#### `POST /api/financials/cost-sheet`
Compute complete Indian real estate cost sheet with CLP milestones, GST, stamp duty, and payment breakdowns.
- **Request Body:**
```json
{
  "baseRatePerSqFt": 38500,
  "superAreaSqFt": 4200,
  "floorRisePerSqFt": 150,
  "floorNumber": 14,
  "plcPerSqFt": 1200,
  "parkingSlots": 3,
  "parkingCostPerSlot": 500000,
  "clubMembershipCost": 750000,
  "idcEdcPerSqFt": 850,
  "possessionCharges": 650000,
  "paymentPlanType": "construction_linked",
  "gstRatePercent": 5.0,
  "stampDutyRatePercent": 6.0,
  "registrationRatePercent": 1.0
}
```
- **Response `200 OK`:** Full structured financial breakdown including:
  - Basic Sale Price (BSP)
  - Floor Escalation Charges
  - Preferential Location Charges (PLC)
  - Total Agreement Value
  - GST (5% / 1%)
  - Stamp Duty & Registration Charges
  - Other Charges (Car parking, Club, IDC/EDC, IFMS)
  - Grand Total Cost in Crores (`₹X.XX Cr`)
  - Milestone-by-Milestone Payment Schedule (CLP, Down Payment, or Subvention)

---

### 2.7 Integration & Domain Event Outbox API

#### `POST /api/integrations/outbox/process`
Process pending events in `integration_outbox` for webhook delivery or n8n orchestration.
- **Headers:** `Authorization: Bearer <CRON_SECRET>`
- **Query Parameters:** `batchSize` (number, default: 50).
- **Behavior:** Fetches `status = 'pending'` or `retryable` outbox events, applies exponential backoff, checks circuit breaker state, and dispatches to configured destination webhooks.
- **Response `200 OK`:** `{ "processed": 14, "succeeded": 14, "failed": 0, "circuitState": "closed" }`

#### `GET /api/integrations/status`
Check operational telemetry for external integrations (n8n, Telephony, WhatsApp Cloud API).
- **Response `200 OK`:**
```json
{
  "n8n": { "status": "active", "pendingEvents": 0, "circuit": "CLOSED" },
  "telephony": { "provider": "Exotel", "status": "connected" },
  "whatsapp": { "status": "verified" }
}
```

---

### 2.8 Autonomous AI Agent APIs

#### `POST /api/chat`
Streaming conversational AI real estate intelligence endpoint (Aria Agent).
- **Request Body:** `{ "messages": [ { "role": "user", "content": "Looking for 4 BHK in Gurgaon with Golf Course view around 15 Cr" } ] }`
- **Server Tools (Aria 2.0):**
  - `generatePropertyBriefing`: Fetches Gate 2 PIN, parking bays, price floors, and verified specs.
  - `matchBuyersForUnit`: Bi-directional 100-point buyer matching for a property.
  - `searchAvailableInventory`: Multi-criteria inventory search.
  - `lookupExistingBuyer`: Contact deduplication against master `people` table.
  - `lookupDocuments`: Verified architectural floor plans and brochures.
  - `getCustomerDossier`: Full buyer journey and activity ledger briefing.
  - `recommendNextAction`: Strategic next moves with consultative scripts.
  - `qualifyAndCreateLead`: Human-gated lead qualification card.
- **Response:** `text/event-stream` UI Message Stream.

#### `POST /api/agent/resurrect`
Autonomous lost-lead resurrection scanner.
- **Request Body:** `{ "daysThreshold": 14, "minScore": 60, "limit": 20 }`
- **Response `200 OK`:** Ranked resurrectable buyer opportunities cross-matched against available inventory.

---

### 2.9 Webhooks API (Inbound Event Receivers)

#### `GET & POST /api/webhooks/whatsapp`
Meta WhatsApp Cloud API Webhook Handler.
- **GET (Verification Handshake):** Validates `hub.verify_token` against `WHATSAPP_VERIFY_TOKEN` and echoes `hub.challenge`.
- **POST (Inbound Message):** Validates `X-Hub-Signature-256` HMAC with `WHATSAPP_APP_SECRET`. Idempotently registers inbound touchpoint into `activities` and `webhook_events`.

#### `GET & POST /api/webhooks/meta-lead-ads`
Meta Instant Form Lead Ads Webhook Handler.
- **POST:** Validates HMAC signature, extracts `leadgen_id`, fetches form context from Graph API, and assigns lead via atomic round-robin stored procedure.

#### `GET & POST /api/webhooks/retry`
Manage failed or retryable inbound webhook events.
- **GET:** Lists failed/dead-letter events.
- **POST:** Retries specific webhook events with exponential backoff.

---

### 2.10 Centralized Notifications API

#### `GET /api/notifications`
Retrieve paginated notifications and unread counts for caller.
- **Query Parameters:** `page`, `limit`, `filter` (`all`, `unread`, `leads`, `tasks`, `billing`).
- **Response `200 OK`:** `{ "notifications": [...], "unreadCount": 3 }`

#### `PATCH /api/notifications/[id]/read`
Mark a single notification as read.

#### `POST /api/notifications/mark-all-read`
Mark all unread notifications for caller as read.

#### `GET & PATCH /api/notifications/preferences`
Inspect and update alert category preferences (lead assignments, task reminders, SLA alerts, deal health alerts, billing notifications).

---

### 2.11 Projects & Unit Matrix API

#### `GET /api/projects`
List projects with tower breakdowns, active unit counts, and region filters.

#### `GET & PATCH /api/projects/[id]`
Retrieve or update project details and society-level institutional memory.

#### `GET & POST /api/projects/[id]/units`
List or create inventory units for a project.

#### `GET & PATCH /api/projects/[id]/units/[unitId]`
Retrieve or update a unit's operational status, asking price, and ownership records.

#### `POST /api/projects/[id]/units/bulk-import`
Bulk import units from CSV with duplicate checks and validation.

---

### 2.12 Server-Side Analytics & Reports API

#### `GET /api/analytics/dashboard`
Consolidated single-query executive dashboard payload.

#### `GET /api/analytics/pipeline`
Pipeline summary and dynamic stage distributions.

#### `GET /api/analytics/reps`
Sales rep performance scorecard, conversion rates, and SLA compliance metrics.

#### `GET /api/analytics/timeseries`
Date-bucketed trends (leads, won, lost, revenue, visits, calls).

#### `GET /api/analytics/velocity`
Sales cycle length and stage dwell times.

#### `GET /api/reports/export`
Multi-section CSV export for executive reporting.

---

### 2.13 Billing & Subscriptions API

#### `POST /api/billing/checkout`
Create a Stripe / Razorpay checkout session for subscription upgrade.
- **Request Body:** `{ "planId": "growth", "billingCycle": "yearly", "orgId": "org-1" }`
- **Response `200 OK`:** `{ "sessionId": "cs_growth_...", "checkoutUrl": "..." }`

#### `POST /api/billing/webhook`
Handles payment provider lifecycle events (`checkout.session.completed`, `customer.subscription.deleted`).
- **Signature Verification:** Validates `stripe-signature` or `x-razorpay-signature`.
- **Action:** Updates `organizations` subscription tier and seat allocations.

---

### 2.14 Global Search & Telemetry API

#### `GET /api/search/global`
High-speed (<10ms) omnibar search across leads, buyers (people), projects, and units.
- **Query Parameters:** `q` (string).
- **Response `200 OK`:** Categorized search results with entity type badges.

#### `GET /api/health`
Deep health and operational telemetry check.
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "uptimeSeconds": 4120,
    "services": {
      "database": { "status": "healthy", "latencyMs": 14, "provider": "Supabase PostgreSQL 16" },
      "aiEngine": { "status": "ready", "model": "gemini-2.5-flash" },
      "outbox": { "status": "active", "pendingEvents": 0 },
      "memory": { "rssMb": 84, "heapUsedMb": 52 }
    }
  }
}
```

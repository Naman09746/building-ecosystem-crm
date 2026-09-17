# 01. Product Requirements Document (PRD) — Apex Realty EcosystemRealty

**Product Name:** Apex Realty EcosystemRealty  
**Document Version:** 1.0.0 (Production Release)  
**Target Market:** Luxury Indian High-Ticket Real Estate (Developers, Tier-1 Brokerages, Wealth Advisory Desks)  
**Classification:** Proprietary Multi-Tenant SaaS Platform

---

## 1. Executive Summary & Problem Statement

### 1.1 The High-Ticket Real Estate Challenge
High-ticket real estate sales in India (ticket sizes ₹2.5 Cr to ₹50 Cr+) suffer from severe operational friction:
1. **Speed-to-Lead Failure:** Inbound buyer leads from Meta Ads, website forms, and WhatsApp go uncontacted for hours or days. Conversion probability drops by 80% after 5 minutes.
2. **Context Fragmentation:** Sales closers switch between WhatsApp, phone calls, spreadsheets, and legacy CRM systems (Salesforce, LeadSquared) that require 2+ minutes to log a single interaction.
3. **Contact Duplication:** A single buyer often inquires across multiple projects and marketing channels using slightly different phone formats (`9810123456`, `+91 98101-23456`, `09810123456`), fragmenting history.
4. **Dormant / Lost Lead Waste:** Brokerages accumulate thousands of "Lost / Stale" leads without systematic re-engagement when new towers, inventory, or payment schemes launch.

### 1.2 The EcosystemRealty Solution
Apex Realty EcosystemRealty is a **high-velocity, AI-agentic sales cockpit** designed specifically for real estate closers and managing directors. It combines:
- **Sub-10-Second Quick Activity Logging** with one-click WhatsApp sales outreach.
- **Autonomous AI Lead Qualification (Aria)** with natural language multi-turn dialogue and a Human-in-the-Loop approval gate.
- **Autonomous Lost-Lead Resurrection Engine** that cross-matches dormant buyers against newly released project units.
- **Master Contact Deduplication (E.164 Anchor)** across all projects and marketing channels.
- **Multi-Party Bidding & Negotiation Ledger** with token verification, counter-offers, and stamp duty estimates.
- **Digital Site Visit Pass & Geofenced Check-in** with QR verification tokens, vehicle passes, and OTP site visit confirmation.
- **Tiered Broker Commission Engine** with TDS deduction (Sec 194H), milestone tranches, and RERA registration tracking.
- **Indian Real Estate Cost Sheet & Payment Plan Calculator** (Construction-Linked Plan CLP, GST 1%/5%, Stamp Duty, Subvention, and PDF/WhatsApp export).
- **PWA Offline Service Worker & Voice Note Dictation** with audio recording, Web Speech API transcription, and IndexedDB sync queue.
- **Visual Building Stacking Chart & Micro-market Unit Grid** for floor-by-floor occupancy visualization and price escalation.
- **Enterprise n8n Separation of Responsibilities Architecture** with domain event outbox, circuit breaker, and idempotency key validation.
- **Boss Executive Analytics & Salesperson Priority Calling Queues**.

---

## 2. User Personas & Roles

| Persona | Role | Key Jobs to Be Done | Primary Surface |
| :--- | :--- | :--- | :--- |
| **Vikram (Managing Director / Boss)** | `admin` / `manager` | Monitor gross pipeline value, pipeline velocity, rep SLA compliance, regional revenue, broker commissions, and approve agent actions. | Boss Executive Dashboard, Reports, Commission Ledger, Settings |
| **Rahul (Senior Sales Closer)** | `salesperson` | Clear prioritized daily follow-ups, log calls in <10s, record voice notes, initiate WhatsApp templates, generate cost sheets, issue site visit passes, log bids, and advance deals on the Kanban board. | Salesperson Home, Mobile Cockpit, Calling Queue, Kanban Pipeline, Stacking Chart |
| **Aria (Autonomous AI Agent)** | `agent` | Engage inbound web/WhatsApp traffic, qualify budget/location/configuration, extract structured intent, and queue lead proposals. | Floating AI Bot, Command Center, Webhooks, Server Tools |

---

## 3. Core Functional Requirements

### 3.1 Master Contact Identity & Phone Deduplication
- **REQ-1.1:** System MUST normalize all incoming phone numbers to E.164 format (`+91XXXXXXXXXX` for Indian mobile numbers).
- **REQ-1.2:** The `people` table serves as the immutable master identity anchor per organization. Multiple leads for the same buyer across different developments link to a single person record.
- **REQ-1.3:** Display total lifetime budget, associated projects, and full touchpoint history on the buyer's 360° Dossier.

### 3.2 7-Stage Luxury Sales Pipeline
- **REQ-2.1:** Pipeline MUST enforce the 7 industry standard stages:
  1. `New Inflow` → 2. `Contacted` → 3. `Qualified & Budget Fit` → 4. `Site Visit Done` → 5. `Price Negotiation` → 6. `Booking Won` → 7. `Lost / Dormant`.
- **REQ-2.2:** Drag-and-drop Kanban movement automatically synchronizes lead status, days-in-stage counter, and linked project unit availability (`available`, `site_visit`, `negotiation`, `booked`).

### 3.3 10-Second Quick Activity Logger & Voice Note Dictation
- **REQ-3.1:** Reps must be able to log any call, WhatsApp message, meeting, or site visit in under 10 seconds.
- **REQ-3.2:** Pre-configured outcome chips (`Connected: High Intent`, `Connected: Low Intent`, `Site Visit Scheduled`, `Negotiating`, `RNR / Busy`, `Not Interested`).
- **REQ-3.3:** Logging a scheduled next follow-up automatically generates a prioritized task in the rep's queue and completes previous overdue tasks for that lead.
- **REQ-3.4:** Voice Note Dictation allows audio recording via Web Audio API, transcription via Web Speech API, and auto-populates note fields with speech-to-text.

### 3.4 Multi-Party Bidding & Negotiation Ledger
- **REQ-4.1:** Structured bidding log (`lead_bids` / `deal_bids`) tracking offer amount, token amount, validity period, payment terms, and status (`submitted`, `under_review`, `counter_offered`, `accepted`, `rejected`, `expired`).
- **REQ-4.2:** Support for counter-offers, round numbering, and automatic calculation of stamp duty, registration charges, and net payable.

### 3.5 Digital Site Visit Pass & Geofenced Check-In
- **REQ-5.1:** Generate secure digital site visit passes (`site_visit_passes`) with QR verification tokens, vehicle number, accompanying guests, and scheduled arrival windows.
- **REQ-5.2:** Gate check-in verification via OTP / PIN, geofenced GPS coordinates (lat/lng), and security desk check-in confirmation.

### 3.6 Tiered Broker Commission & Payout Engine
- **REQ-6.1:** Broker and channel partner registry (`brokers` / `deal_commissions`) tracking RERA registration number, brokerage rate (%), and payment milestone splits (e.g. 50% on booking, 50% on agreement).
- **REQ-6.2:** Automated calculation of gross commission, mandatory TDS deduction (5% under Section 194H of Income Tax Act), net commission payable, and payout tranche ledger.

### 3.7 Indian Real Estate Cost Sheet & Payment Plan Calculator
- **REQ-7.1:** Support for Construction-Linked Plans (CLP), Down Payment Plans, and Subvention schemes.
- **REQ-7.2:** Precise calculation of Base Price, Floor Rise / Escalation, Preferential Location Charges (PLC), Covered Car Parking, Infrastructure Development Charges (IDC/EDC), Club Membership, GST (1% affordable / 5% luxury), Stamp Duty (5-7%), Registration (1%), and Maintenance Deposit.
- **REQ-7.3:** 1-click export to branded PDF quotation and structured WhatsApp summary pitch.

### 3.8 Visual Building Stacking Chart & Inventory Matrix
- **REQ-8.1:** Floor-by-floor interactive stacking visualization displaying unit numbers, BHK configurations, carpet area, facing, asking price in ₹ Cr, and operational availability.
- **REQ-8.2:** Instant filtering by budget, floor band (low/mid/high), corner units, and vastu compliance.

### 3.9 Enterprise Integration & n8n Separation of Responsibilities
- **REQ-9.1:** The CRM is the single transactional source of truth and security boundary.
- **REQ-9.2:** n8n coordinates third-party workflow automation, telephony routing (Exotel, Knowlarity, Twilio), multi-channel messaging (WhatsApp Cloud API, SendGrid), and CRM external synchronization.
- **REQ-9.3:** Domain event outbox (`integration_outbox`) guarantees reliable asynchronous event delivery with circuit breaker protection and exponential backoff retry.
- **REQ-9.4:** Inbound webhook endpoints strictly enforce idempotency key verification via `X-Idempotency-Key` headers.

### 3.10 Autonomous AI Agent Suite (Aria & Resurrection Engine)
- **REQ-10.1:** **Aria Intake Agent:** Multi-turn consultative conversational bot using Gemini 2.5 Flash. Collects buyer name, phone, budget, micro-market, and configuration.
- **REQ-10.2:** **Human Approval Gate:** AI-extracted qualifications display as an interactive proposal card. CRM database write requires explicit human operator confirmation.
- **REQ-10.3:** **Lost-Lead Resurrection Engine:** Scans leads dormant for >14 days or marked as lost, evaluates price and configuration fit against available project inventory, and generates personalized re-engagement pitches.

---

## 4. Non-Functional Requirements (NFRs)

- **Performance:** Initial page load under 1.5s; API response time under 100ms; full Next.js production build with 0 type errors.
- **Security:** 100% database-enforced Row-Level Security (RLS) across all 21 migrations; zero IDOR/BOLA vulnerability; cryptographic HMAC verification for webhooks; strict PII masking in structured logs.
- **Reliability:** 99.9% uptime; resilient local fallback store when database credentials are unconfigured; token-bucket rate limiting and circuit breakers to prevent cascade failures.
- **Offline & Mobile Support:** PWA service worker caching core assets, IndexedDB offline mutation queue with automated synchronization upon network restoration, and touch-optimized mobile bottom navigation.
- **Accessibility:** Keyboard-navigable workflows (`/` or `⌘K` global search, `L` rapid log, `C` new lead, `K` pipeline, `T` tasks); WCAG AA color contrast compliance.

---

## 5. Success Metrics & KPIs

1. **Lead Response Time:** Reduced from industry average of 4 hours to < 10 seconds via Aria Bot.
2. **Sales Logging Compliance:** Rep interaction logging compliance increased from ~40% to > 95%.
3. **Pipeline Re-Activation:** 12-18% of dormant leads successfully reactivated through automated inventory cross-matching.
4. **Site Visit Attendance:** Increased show-up rates by 35% through automated digital passes and Gate 2 navigation briefings.
5. **Data Isolation Integrity:** 0% cross-tenant data leakage incidents.

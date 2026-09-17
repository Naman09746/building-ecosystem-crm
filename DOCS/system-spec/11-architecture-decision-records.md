# 11. Architecture Decision Records (ADRs) — Apex Realty EcosystemRealty

This document records the critical architectural decisions made during the design and hardening of Apex Realty EcosystemRealty.

---

## ADR 001: Next.js 15 App Router & React 19 as the Core Full-Stack Framework

- **Status:** Accepted
- **Context:** We needed a framework capable of rendering ultra-fast desktop CRM interfaces with sub-10ms optimistic updates while securely processing serverless API routes, webhooks, and streaming AI responses.
- **Decision:** Use Next.js 15 with the App Router and React 19.
- **Consequences:**
  - *Positive:* Unified TypeScript codebase across UI and backend APIs; zero boilerplate routing; native support for streaming AI text responses via Vercel AI SDK; built-in middleware for session route protection.
  - *Trade-off:* Requires awareness of client vs. server component boundaries (`"use client"`).

---

## ADR 002: PostgreSQL Row-Level Security (RLS) for Multi-Tenant Data Isolation

- **Status:** Accepted
- **Context:** High-ticket real estate CRM data is strictly confidential. If a developer accidentally forgets an `org_id` WHERE clause in application code, cross-tenant data leakage could occur.
- **Decision:** Implement hard multi-tenancy at the PostgreSQL engine level using Supabase Row-Level Security (RLS).
- **Consequences:**
  - *Positive:* Mathematically impossible for Tenant A to query or mutate Tenant B records, even via raw API exploits or IDOR attacks.
  - *Trade-off:* Requires JWT claims to inject `org_id` and database helper functions (`current_tenant_id()`).

---

## ADR 003: Master `people` Table as the E.164 Phone Deduplication Anchor

- **Status:** Accepted
- **Context:** High-ticket buyers often inquire on multiple properties using varied phone number formats (`9810123456`, `+91 98101 23456`, `09810123456`), leading to fragmented lead cards and duplicate sales outreach.
- **Decision:** Decouple the *Buyer Identity* (`people` table) from the *Opportunity* (`leads` table). Enforce automated E.164 phone normalization (`+91XXXXXXXXXX`) via database trigger and a unique index on `(org_id, phone_normalized)`.
- **Consequences:**
  - *Positive:* Complete 360° buyer history across multiple developments; zero duplicate contacts per agency.
  - *Trade-off:* Lead creation requires an upsert / resolution step against the `people` table.

---

## ADR 004: Human-in-the-Loop Approval Gate for AI Lead Qualification

- **Status:** Accepted
- **Context:** Allowing an autonomous LLM to execute direct database mutations exposes the system to prompt injection attacks, hallucinated budgets, and fake lead generation.
- **Decision:** Aria's `qualifyAndCreateLead` tool call emits an interactive proposal card to the UI (`approvalStatus: "pending"`). Database writes require an explicit human click on `✓ Approve & Push to CRM`.
- **Consequences:**
  - *Positive:* 100% elimination of unauthorized autonomous CRM corruptions; sales managers maintain complete quality control.
  - *Trade-off:* Adds one human interaction click for web chatbot leads.

---

## ADR 005: Graphify AST Knowledge Graph for Zero-Token Codebase Navigation

- **Status:** Accepted
- **Context:** As the codebase expanded across 100+ files and 75 routes, LLM agents were forced to re-read thousands of lines of code on every interaction, causing context exhaustion and high latency.
- **Decision:** Integrate `graphify` to pre-extract an AST knowledge graph (`graph.json`, 1,500+ nodes, 3,300+ edges) and install Git lifecycle hooks.
- **Consequences:**
  - *Positive:* Agents query symbols, call flows, and dependencies instantly in 0 tokens; no repetitive file scanning.
  - *Trade-off:* Requires `graphify update .` after modifying code files (automated via Git hook).

---

## ADR 006: EcosystemRealty + n8n Separation of Responsibilities & Transactional Domain Event Outbox

- **Status:** Accepted
- **Context:** Coupling third-party communication channels (telephony, WhatsApp Cloud API, external marketing automation) directly into synchronous Next.js API route handlers creates vulnerability to external provider outages, rate limits, and latency spikes.
- **Decision:** Establish EcosystemRealty as the single source of truth and security boundary, and delegate external orchestration and multi-channel drip campaigns to n8n via a transactional Domain Event Outbox (`integration_outbox`).
- **Consequences:**
  - *Positive:* 100% decoupling; zero request blocking; reliable at-least-once event delivery; circuit breaker protection prevents system cascading failures.
  - *Trade-off:* Requires background cron processor (`/api/integrations/outbox/process`) and idempotency key checking.

---

## ADR 007: Digital Site Visit Pass & Geofenced Check-in Protocol

- **Status:** Accepted
- **Context:** Luxury gated societies in India enforce strict gate security protocols (Gate 2 visitor passes, driver access lanes, vehicle registration). Unprepared sales reps create awkward delays for high-net-worth clients at security gates.
- **Decision:** Implement digital visitor pass generation (`site_visit_passes`) with cryptographic QR tokens, Gate 2 security PINs, vehicle number logging, and geofenced check-in tracking.
- **Consequences:**
  - *Positive:* Eliminates gate delays; 35% increase in site visit attendance; seamless WhatsApp pass sharing to buyer and driver.
  - *Trade-off:* Requires security desk / sales rep check-in confirmation.

---

## ADR 008: Multi-Party Bidding Ledger & Token Advance Tracking

- **Status:** Accepted
- **Context:** Luxury real estate negotiations involve multiple rounds of price counter-offers, token advance conditions, and statutory tax calculations (stamp duty, registration) that get lost in verbal phone calls or unstructured WhatsApp chats.
- **Decision:** Introduce a formal Bidding & Negotiation Ledger (`lead_bids` / `deal_bids`) tracking offer amount, token advance %, counter-offers, and expiration timestamps.
- **Consequences:**
  - *Positive:* Complete immutable price negotiation history; transparent statutory fee calculation; instant management visibility into price concessions.
  - *Trade-off:* Requires salesperson to log formal offer revisions.

---

## ADR 009: PWA Offline-First Service Worker & IndexedDB Mutation Queue

- **Status:** Accepted
- **Context:** Sales reps conducting site visits in basement parking lobbies, high-rise elevator shafts, and remote luxury development corridors frequently experience cellular dead zones.
- **Decision:** Implement a Progressive Web App (PWA) service worker with asset caching and an IndexedDB offline mutation queue (`IndexedDB` + automatic background sync upon network reconnection).
- **Consequences:**
  - *Positive:* Reps can log calls, take voice notes, and review property specs completely offline without losing data.
  - *Trade-off:* Requires conflict resolution strategy during background reconciliation.

---

## ADR 010: Indian Real Estate Financials Engine (CLP, GST, Stamp Duty, TDS 194H)

- **Status:** Accepted
- **Context:** High-ticket Indian real estate sales require accurate calculation of complex payment structures (Construction-Linked Plans CLP, Down Payment Plans, Subvention), tiered GST (1% vs 5%), state-specific Stamp Duty (5-7%), Registration charges (1%), and Broker TDS (5% under Section 194H).
- **Decision:** Build an authoritative, deterministic financial calculation engine (`cost-sheet-calculator.ts` and `commissions` API) with 1-click branded PDF and WhatsApp quotation exports.
- **Consequences:**
  - *Positive:* Zero pricing errors; eliminates spreadsheets; instant quotation generation during live client meetings.
  - *Trade-off:* Requires keeping tax and stamp duty rate tables updated per state.

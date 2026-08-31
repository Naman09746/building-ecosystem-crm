# 08. Test Strategy & Test Plan — Apex Realty CallCRM

**Test Runner:** Vitest (`vitest run`)  
**Assertion Library:** Vitest Chai Assertions + React Testing Library  
**Current Test Coverage:** 100% Pass Rate across all 28 Test Suites (239 Tests)  
**Execution Speed:** ~1.8s for complete 239-test suite

---

## 1. Test Architecture & Strategy Pyramid

```
                ┌─────────────────────────────────┐
                │          E2E Journeys           │  (Signup → Onboarding → Lead Progression → Bidding)
                ├─────────────────────────────────┤
                │      Integration & API Tests    │  (Webhooks, RLS Isolation, Endpoints, Outbox)
                ├─────────────────────────────────┤
                │      Unit & Schema Tests        │  (Phone Dedup, Rate Limiter, Zod, Cost Sheet, DOM)
                └─────────────────────────────────┘
```

---

## 2. Automated Test Suites Catalog (28 Suites, 239 Tests)

| Suite File | Tests | Core Verification Domain |
| :--- | :---: | :--- |
| `cost-sheet-calculator.test.ts` | 4 | Indian real estate CLP calculation, GST 1%/5%, Stamp Duty, PLC, Car Parking |
| `crm-sync-mappers.test.ts` | 13 | Snake_case PostgreSQL $\leftrightarrow$ camelCase TypeScript model transforms |
| `phase2-crud.test.ts` | 16 | Core CRUD operations, projects, units, team invites, and document storage |
| `phase12-property-intelligence.test.ts` | 13 | 6-tier hierarchy, towers, property facts, and Gate 2 visitor pass retrieval |
| `phase3-billing.test.ts` | 12 | Plan quotas, subscription tiers, seat limits, and invoice generation |
| `phase13-intelligence-automation.test.ts` | 9 | Proactive seller signal detection, tenancy expiry, and 100-pt matcher |
| `phase8-deal-health.test.ts` | 11 | Deterministic 100-point deal health scoring and non-linear decay |
| `phase9-analytics.test.ts` | 12 | Server-side pipeline analytics, rep leaderboards, and revenue forecasting |
| `phase10-resurrection.test.ts` | 15 | 100-point multi-factor resurrection matching and atomic reactivation |
| `security-hardening.test.ts` | 20 | Salesperson pricing guards, lead reassignment blocks, and RLS validation |
| `phase5-notifications.test.ts` | 8 | In-app alerts, dedup keys, Realtime channel events, and preference toggles |
| `validations.test.ts` | 7 | Zod schemas, budget bounds, phone strings, and XSS sanitization |
| `phase6-aria.test.ts` | 11 | Aria 2.0 conversational tools, inventory search, and proposal cards |
| `phase4-sla-automation.test.ts` | 17 | Dynamic days in stage, task status transitions, and cron SLA monitor |
| `phase11-hardening.test.ts` | 8 | Atomic unit reservation RPC (`SELECT FOR UPDATE`) and race condition guards |
| `phase7-lead-ingestion.test.ts` | 10 | Meta Lead Ads, WhatsApp webhooks, and round-robin salesperson assignment |
| `audio-transcription.test.ts` | 3 | Web Audio recording, Web Speech API speech-to-text, and note structuring |
| `phone-dedup.test.ts` | 5 | E.164 normalization (`+91XXXXXXXXXX`), formatting, and master contact dedup |
| `role-mapping.test.ts` | 3 | Role-based navigation filtering (Boss vs Manager vs Salesperson) |
| `negotiation-and-commission.test.ts` | 3 | Multi-party bidding ledger, counter-offers, and broker TDS 194H deduction |
| `webhook-security.test.ts` | 8 | HMAC SHA-256 signature verification and replay prevention |
| `n8n-architecture.test.ts` | 3 | Separation of concerns, domain event outbox, and circuit breaker |
| `rate-limit-durable.test.ts` | 4 | Durable token bucket rate limiting with sliding windows |
| `people-dedup.test.ts` | 4 | Master person identity resolution across multi-project inquiries |
| `action-card.test.ts` | 3 | 1-click action triggers, dialer hotkeys (<kbd>L</kbd>), and completion states |
| `rate-limiting.test.ts` | 3 | Token bucket thresholds and 429 response handling |
| `subscription.test.ts` | 4 | Server-side quota ceilings and feature gating |
| `dom/crm-state-machine.test.tsx` | 10 | React 19 / DOM interactive state machine and Kanban transitions |

---

## 3. Running Test Suites

```bash
# Run all 239 tests in root
make test-unit

# Run full CI suite (migrations + unit tests + typecheck)
make ci

# Run specific test file
cd Frontend && npx vitest run src/__tests__/cost-sheet-calculator.test.ts
```

---

## 4. Continuous Integration (CI) Test Pipeline

Every Git commit and pull request executes:
1. `make test-migrations` (Validates all 21 Supabase migrations against real PostgreSQL engine).
2. `make verify` (Runs all 239 Vitest tests across 28 suites).
3. `npm run build` (Typechecks and compiles all 75 Next.js routes).
4. If any test or type check fails, the deployment halts automatically.

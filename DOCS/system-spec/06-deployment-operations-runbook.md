# 06. Deployment & Operations Runbook — Apex Realty EcosystemRealty

**Document Version:** 2.0.0 (Enterprise Release)  
**Hosting Platforms:** Vercel (Edge & Serverless Compute) + Supabase (Managed PostgreSQL 16)  
**Background Tasks:** Vercel Cron (`/api/cron/sla-monitor`, `/api/integrations/outbox/process`)  
**Monitoring:** `/api/health` + Uptime Monitoring + Sentry Error Tracking + Structured Logger

---

## 1. Production Deployment Workflow

### 1.1 Pre-Deployment Checklist
- [ ] Run migration validation harness: `make test-migrations` (or `node scripts/validate-migrations.mjs`).
- [ ] Run full test suite: `make verify` (verify all 239 unit/integration tests across 28 suites pass).
- [ ] Run build verification: `npm run build` (ensure 0 TypeScript or lint errors across 75 routes).
- [ ] Verify environment variables are configured in the Vercel Production Environment.
- [ ] Confirm all 21 database migrations (`0001` through `0021`) are executed in Supabase.

### 1.2 Step-by-Step Deployment Guide

```bash
# 1. Clone repository & navigate to root
cd /path/to/Real-estate

# 2. Run automated pre-flight CI pipeline
make ci

# 3. Navigate to Frontend
cd Frontend

# 4. Install production dependencies
npm ci

# 5. Compile optimized production build
npm run build

# 6. Deploy to Vercel (Production)
npx vercel --prod
```

---

## 2. Database Migration & Rollback Procedures

### 2.1 Applying Database Migrations (Supabase)
Migrations are sequentially numbered from `0001` to `0021`:
1. `0001_init.sql` — Base multi-tenant schema, RLS policies, E.164 phone normalization.
2. `0002_sample_seed.sql` — Architectural catalog and luxury project inventory.
3. `0003_rate_limiting.sql` — Sliding-window rate limiters.
4. `0004_tenant_defaults.sql` — Default 7 pipeline stages per org.
5. `0005_authorization_hardening.sql` — Self-elevation guards.
6. `0006_billing_quotas.sql` — Plan seat and lead quota triggers.
7. `0007_security_hardening.sql` — Salesperson pricing tampering guards.
8. `0008_phase2_core_features.sql` — Team invitations and document vault.
9. `0009_phase3_billing.sql` — Subscriptions, invoices, and payment tracking.
10. `0010_phase4_sla_automation.sql` — SLA monitor & automated deal health recomputation.
11. `0011_phase5_notifications_realtime.sql` — In-app notifications and preferences.
12. `0012_phase6_aria_intelligence.sql` — Aria composite search indexes.
13. `0013_phase7_lead_ingestion.sql` — Webhook ingestion & atomic round-robin routing.
14. `0014_phase8_deal_health.sql` — Deterministic 100-point deal health engine.
15. `0015_phase9_server_side_analytics.sql` — Real-time analytics aggregation RPCs.
16. `0016_phase10_resurrection_engine.sql` — 100-point multi-factor resurrection engine.
17. `0017_phase11_production_hardening.sql` — Atomic unit reservation RPC and check constraints.
18. `0018_phase12_property_intelligence_schema.sql` — 6-tier hierarchy, towers, property facts.
19. `0019_phase13_intelligence_automation.sql` — Proactive seller signals and automated mandates.
20. `0020_enterprise_domain_model.sql` — Multi-party bidding ledger, site visit passes, tiered broker commissions.
21. `0021_n8n_event_bus_and_integration_outbox.sql` — Integration outbox, circuit breaker, idempotency store.

To apply via Supabase CLI:
```bash
supabase db push
```

### 2.2 Migration Rollback Strategy
All table alterations and policies are backwards compatible. If a specific phase needs rollback:
```sql
-- Disable specific triggers if needed
ALTER TABLE public.leads DISABLE TRIGGER trg_lead_stage_recompute_deal_health;

-- Rollback domain extensions
DROP TABLE IF EXISTS public.integration_outbox CASCADE;
DROP TABLE IF EXISTS public.deal_commissions CASCADE;
DROP TABLE IF EXISTS public.site_visit_passes CASCADE;
DROP TABLE IF EXISTS public.deal_bids CASCADE;
```

---

## 3. Health Monitoring & Background Workers

### 3.1 Live Health Check Endpoint (`GET /api/health`)
Configure an external uptime monitor (e.g., BetterStack, UptimeRobot, Pingdom) to poll `https://your-domain.com/api/health` every 60 seconds.

**Expected Status 200 Response:**
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

### 3.2 Scheduled Background Workers (Vercel Cron)
Configure `vercel.json` crons to run on a continuous cadence:
- **SLA & Deal Health Recalculation**: `0 */2 * * *` (`/api/cron/sla-monitor`)
- **Domain Event Outbox Processor**: `*/1 * * * *` (`/api/integrations/outbox/process`)

---

## 4. 2 AM Incident Response Runbook

### Scenario A: Database Unreachable / Connection Pool Exhaustion
1. **Symptom:** API routes return `DB_QUERY_ERROR` or `/api/health` shows `dbStatus: unreachable`.
2. **Immediate Action:**
   - Log in to Supabase Dashboard → **Database** → **Connection Pooling**.
   - Verify connection pool mode is set to **Transaction Mode (Port 6543)**.
   - Check for long-running unindexed queries in **Query Performance**.

### Scenario B: AI Agent Rate Limit / Quota Exhaustion
1. **Symptom:** Aria bot returns `API_KEY_REQUIRED` or `RESOURCE_EXHAUSTED`.
2. **Immediate Action:**
   - Verify Google AI Studio / Gemini API quota.
   - Check `Frontend/.env.local` for valid `GEMINI_API_KEY`.
   - The frontend automatically switches to localized simulated conversational mode if the key is missing or exhausted, preventing user downtime.

### Scenario C: Outbox Delivery Circuit Breaker Triggered (OPEN)
1. **Symptom:** `/api/integrations/status` shows `circuit: OPEN` and events accumulate in `integration_outbox`.
2. **Immediate Action:**
   - Verify health of target n8n instance or webhook endpoints.
   - Check `integration_outbox` for error messages in `last_error`.
   - Once target recovers, trigger manual outbox sweep:
     ```bash
     curl -X POST "https://your-domain.com/api/integrations/outbox/process?batchSize=100" \
       -H "Authorization: Bearer ${CRON_SECRET}"
     ```

### Scenario D: Webhook Failure Storm
1. **Symptom:** Meta / WhatsApp reports delivery errors.
2. **Immediate Action:**
   - Inspect `/api/webhooks/whatsapp` and `/api/webhooks/meta-lead-ads` logs.
   - Check `webhook_events` table for dead-letter events.
   - Confirm `WHATSAPP_APP_SECRET` matches the Meta App Dashboard secret.
   - Replay failed events via `POST /api/webhooks/retry`.

---

## 5. Disaster Recovery & Backups

- **RPO (Recovery Point Objective):** < 1 hour (via Supabase Point-in-Time Recovery).
- **RTO (Recovery Time Objective):** < 15 minutes (via automated Vercel rollback).
- **Instant Deployment Rollback:** In the Vercel Dashboard, select **Deployments** → Locate the previous working build → Click **Instant Rollback**.

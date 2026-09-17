# Background Processing, SLA Monitoring & Automated Deal Health — Phase 4 Specification

## 1. Overview & Architecture

EcosystemRealty Phase 4 introduces a deterministic, server-side background engine that continuously monitors CRM health, SLA compliance, and pipeline velocity across all active tenant organizations.

The background engine runs without any dependency on an active browser session, executing bulk recalculations directly inside PostgreSQL for maximum efficiency and scale.

```
┌─────────────────────────┐
│       Vercel Cron       │ (Every 2 hours: '0 */2 * * *')
└────────────┬────────────┘
             │  Authorization: Bearer <CRON_SECRET>
             ▼
┌─────────────────────────┐
│ /api/cron/sla-monitor   │ (Tenant discovery & fault isolation)
└────────────┬────────────┘
             │  RPC per tenant
             ▼
┌─────────────────────────────────────────────────────────────┐
│ PostgreSQL Engine: recompute_lead_health_and_slas(p_org_id) │
├─────────────────────────────────────────────────────────────┤
│ 1. Dynamic days_in_stage calendar calculation              │
│ 2. Task status transitions (overdue / due_today)            │
│ 3. Deterministic deal health evaluation & explanations      │
│ 4. Meaningful audit logging (audit_log)                     │
│ 5. Idempotent deduplicated notifications (notifications)   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. SLA & Deal Health Rules Engine

### A. Stage Velocity (`days_in_stage`)
- Derived deterministically from `stage_entered_at`:
  $$\text{days\_in\_stage} = \max\left(0, \lfloor \text{now}() - \text{coalesce}(\text{stage\_entered\_at}, \text{created\_at}) \rfloor\right)$$
- The trigger `trg_maintain_stage_timestamp` automatically resets `stage_entered_at := now()` when a lead changes stages (`NEW.stage IS DISTINCT FROM OLD.stage`). Unrelated lead updates preserve `stage_entered_at`.

### B. Follow-Up Task Automation
- Future tasks: marked `upcoming`.
- Tasks with `due_date < today` (or matching today with past `due_time`): marked `overdue`.
- Tasks due today without a past time: marked `due_today`.
- **Immutability rule**: `completed` and `cancelled` tasks are never overwritten or marked overdue.

### C. Deterministic Deal Health Priority
Deal health is evaluated using strict, deterministic priority rules (no generative AI hallucination risk):

1. **Lost**: `neutral` ("Deal marked as lost.")
2. **Won**: `strong` ("Deal successfully closed and won.")
3. **At Risk (High Priority)**:
   - Inactivity: `days_inactive >= inactive_lead_stale_days` (default 5 days) $\rightarrow$ "At risk: no sales activity for X days."
   - Overdue tasks: `overdue_tasks_count >= 2` $\rightarrow$ "At risk: X overdue follow-up tasks."
   - Stalled stage: Stage is `site_visit` or `negotiation` for $\ge 14$ days with 0 activities $\rightarrow$ "At risk: stalled in [stage] for X days without movement."
4. **Strong**: Touchpoint logged within the last 48 hours and 0 overdue tasks $\rightarrow$ "Strong: sales touchpoint completed within 48h and no overdue tasks."
5. **Neutral**: Standard active pipeline progression $\rightarrow$ "Active deal with standard progression cadence."

---

## 3. In-App Notification System & Idempotency Strategy

### Schema (`public.notifications`)
- `id` (UUID, primary key)
- `org_id` (UUID, references orgs)
- `user_id` (UUID, references profiles)
- `title` (Text)
- `message` (Text)
- `type` (`sla_breach`, `overdue_task`, `deal_at_risk`, `lead_assigned`, `manager_escalation`, `system`)
- `priority` (`low`, `normal`, `high`, `urgent`)
- `entity_type` (`lead` | `task` | `project`)
- `entity_id` (UUID)
- `link` (Text)
- `read` (Boolean, default `false`)
- `dedup_key` (Text, UNIQUE)
- `created_at` (Timestamptz)

### Deduplication Keys
To prevent spam when cron runs every 2 hours, unique deterministic keys are generated:
- **New Lead SLA Breach**: `sla_new_resp_<lead_id>_<YYYY-MM-DD>`
- **Manager Escalation**: `sla_escalate_<lead_id>_<manager_id>_<YYYY-MM-DD>`
- **Overdue Task**: `task_overdue_<task_id>_<YYYY-MM-DD>`
- **High-Value Deal At Risk**: `at_risk_hival_<lead_id>_<YYYY-MM-DD>`

The database query uses `ON CONFLICT (dedup_key) DO NOTHING`, ensuring only 1 notification is sent per condition per day.

---

## 4. Audit Logging Integration

Automated state transitions write directly to `public.audit_log`:
- When deal health transitions to `at_risk`:
  - `action`: `deal_health_at_risk`
  - `diff`: `{"previous_health": "neutral", "new_health": "at_risk", "reason": "At risk: no sales activity for 6 days."}`
- When follow-up status transitions to `overdue`:
  - `action`: `follow_up_overdue`
  - `diff`: `{"previous_status": "upcoming", "new_status": "overdue"}`

No audit records are created if the deal status remains unchanged during cron execution.

---

## 5. Security & Multi-Tenant Isolation

1. **Cron Security**:
   - Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.
   - The endpoint `/api/cron/sla-monitor` validates the secret and fails closed (`401 UNAUTHORIZED_CRON`) if invalid.
   - Rejects any client-supplied `org_id` parameters to prevent unauthorized targeted executions.
2. **Tenant Fault Isolation**:
   - The cron worker fetches all active tenants and executes `recompute_lead_health_and_slas(p_org_id)` in individual try/catch loops.
   - If Tenant B throws an exception, Tenant C is unaffected and continues processing.
3. **Database RLS Policies**:
   - Salespersons can only view their own notifications (`user_id = auth.uid()`).
   - Managers and Admins can view notifications for their organization.
   - Automation logs are restricted to Managers and Admins.

---

## 6. Manual Testing & Invocation Instructions

### Testing the Cron Endpoints via CLI
```bash
# 1. Trigger SLA & Deal Health Monitor
curl -X GET http://localhost:3000/api/cron/sla-monitor \
  -H "Authorization: Bearer ${CRON_SECRET}"

# 2. Trigger Domain Event Outbox Processing
curl -X POST "http://localhost:3000/api/integrations/outbox/process?batchSize=50" \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

### Triggering On-Demand Recomputation (Manager Role)
```bash
curl -X POST http://localhost:3000/api/automation/recompute \
  -H "Cookie: <supabase_session_cookie>"
```

### Running the Test & Validation Suite
```bash
# 1. Run automated pre-flight CI pipeline
make ci

# 2. Run migration validation harness against real PostgreSQL
make test-migrations

# 3. Run all 239 Vitest tests across 28 suites
make verify
```

# Deterministic Deal Health Engine — Architecture & Scoring Specification

## Overview

The CallCRM Deterministic Deal Health Engine replaces subjective/static deal statuses with an automated, reproducible, activity-driven scoring framework. Every lead in the pipeline is continuously evaluated on a 0–100 numerical scale with full explainability, factor attribution, and deterministic next-best-action guidance.

---

## 1. Core Health Model

```
Score: 0 – 100
  ├── 80 – 100: STRONG   (High velocity, recent engagement, on schedule)
  ├── 50 – 79:  NEUTRAL  (Standard progression, routine cadence)
  └── 0 – 49:   AT_RISK  (Stalled outreach, overdue follow-ups, inactivity)
```

Base starting score for all active leads: **60**.

### Clamping & Invariants
- Mathematical bounds: `0 <= score <= 100` strictly enforced in PostgreSQL schema constraints and TypeScript runtime.
- Never produces `NaN`, null score, or negative values.
- AI / LLMs are **NOT** in the critical path for scoring; calculation is 100% deterministic and reproducible.

---

## 2. Factor Attribution Matrix

| Factor Category | Condition | Impact | Factor Type |
|---|---|---|---|
| **Activity Recency** | Touchpoint $\le 24$ hours | `+20` | `activity_recency` |
| | Touchpoint $\le 2$ days | `+15` | `activity_recency` |
| | Touchpoint $\le 5$ days | `+8` | `activity_recency` |
| | Inactive $6 - 10$ days | `-10` | `inactivity` |
| | Inactive $> 10$ days | `-20` | `inactivity` |
| **Overdue Follow-ups** | 1 overdue task | `-10` | `overdue_tasks` |
| | 2 overdue tasks | `-20` | `overdue_tasks` |
| | $\ge 3$ overdue tasks | `-30` | `overdue_tasks` |
| **Stage Stagnation** | Negotiation $> 14$ days without movement | `-20` | `stage_stagnation` |
| | Negotiation $> 7$ days | `-10` | `stage_stagnation` |
| | Site Visit $> 10$ days without progression | `-15` | `stage_stagnation` |
| | Site Visit $> 5$ days | `-5` | `stage_stagnation` |
| | New / Contacted $> 7$ days without qualification | `-15` | `stage_stagnation` |
| | Other stages $> 15$ days | `-10` | `stage_stagnation` |
| **Positive Signals** | Completed site visit in last 7 days | `+15` | `recent_site_visit` |
| | Inbound buyer message (WhatsApp/Call) in last 48h | `+10` | `buyer_engagement` |
| | Upcoming scheduled follow-up (0 overdue) | `+5` | `scheduled_followup` |
| | Formal booking / meeting logged in last 14 days | `+10` | `stage_progression` |
| **Terminal Stages** | Won | `100` (`strong`) | `stage_won` |
| | Lost | `0` (`neutral`) | `stage_lost` |

---

## 3. Structured Output & Explainability

Every evaluation returns structured metadata stored directly on `public.leads`:

```json
{
  "score": 42,
  "status": "at_risk",
  "reason": "At risk: 2 overdue follow-up tasks (-20). Site visit stage pending for 12 days without progression (-15).",
  "factors": [
    { "type": "inactivity", "impact": -10, "description": "No sales activity for 8 days" },
    { "type": "overdue_tasks", "impact": -20, "description": "2 overdue follow-up tasks" },
    { "type": "stage_stagnation", "impact": -15, "description": "Site visit stage pending for 12 days without progression" }
  ],
  "recommended_action": "Call buyer immediately to address overdue follow-up tasks and re-align property selection."
}
```

---

## 4. Execution Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Event Triggers                        │
├──────────────────────────────┬──────────────────────────────┤
│ Activities (INSERT)          │ Tasks (INSERT / UPDATE)      │
│ Lead Stage Change (UPDATE)   │ Cron / SLA Monitor (Hourly)  │
└──────────────┬───────────────┴──────────────┬───────────────┘
               │                              │
               ▼                              ▼
┌─────────────────────────────────────────────────────────────┐
│        public.calculate_lead_deal_health(lead_id, now)      │
│   • Base Score (60) + Recency + Stagnation + Overdue Tasks  │
│   • Clamp: [0, 100]                                         │
│   • Status: strong (>=80), neutral (50-79), at_risk (<50)   │
└──────────────────────────────┬──────────────────────────────┘
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│   Database Mutation (leads)  │ │     At-Risk Notification   │
│ • deal_health_score          │ │ • emit_notification()      │
│ • deal_health_factors        │ │ • Dedup key per lead/day   │
│ • deal_health_action         │ │ • Audit log entry          │
└──────────────────────────────┘ └────────────────────────────┘
```

### Stored Procedure Reference
- `public.calculate_lead_deal_health(p_lead_id uuid, p_now timestamptz default now())`: Pure deterministic single-lead evaluator.
- `public.recompute_lead_health_and_slas(p_org_id uuid default null)`: Bulk scheduled processor with automated task advancement, lead updates, audit logging, and in-app notifications.

### Event Triggers
- `trg_activity_recompute_deal_health`: Recomputes deal health when a call, site visit, WhatsApp message, or meeting is logged.
- `trg_task_recompute_deal_health`: Recomputes deal health when follow-up tasks are created, rescheduled, or marked complete/overdue.
- `trg_lead_stage_recompute_deal_health`: Recomputes score when a lead moves across pipeline stages (e.g. `site_visit` $\rightarrow$ `negotiation` $\rightarrow$ `won`).

---

## 5. Aria 2.0 & UI Integration

- **Aria 2.0**: Consumes authoritative `dealHealthScore`, `dealHealthFactors`, and `dealHealthRecommendedAction` from `getCustomerDossier` and `recommendNextAction`. Aria explains the score rather than hallucinating numbers.
- **DealHealthBadge**: Displays badge with score suffix (e.g. `Strong · 88/100`, `At Risk · 42/100`).
- **LeadDetailModal**: Houses the dedicated "Deal Health & Risk Intelligence" panel with health meter, factor pills, and 1-click execution actions.
- **SalespersonHome**: Ranks priorities using numeric deal health scores alongside SLA urgency.

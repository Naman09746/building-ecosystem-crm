# CallCRM — Phase 9: Server-Side Analytics & Reporting Architecture

## 1. Overview
In Phase 9, CallCRM transitioned from client-side array aggregations (`leads.reduce`, `leads.filter`, `leads.length`) to authoritative, tenant-isolated PostgreSQL aggregation stored procedures and dedicated Next.js API endpoints.

---

## 2. PostgreSQL Analytics RPCs (`supabase/migrations/0015_phase9_server_side_analytics.sql`)

### 1. `public.get_pipeline_analytics`
- **Parameters**: `p_org_id uuid`, `p_start_date timestamptz`, `p_end_date timestamptz`, `p_salesperson_id uuid`, `p_region_id uuid`, `p_project_id uuid`
- **Returns**:
  - `summary`: `total_leads`, `active_leads`, `won_leads`, `lost_leads`, `total_pipeline_value`, `won_revenue`, `avg_deal_value`, `avg_budget`, `conversion_rate`.
  - `stages`: Dynamic array of stages honoring `public.pipeline_stages` configured per organization with `lead_count`, `stage_value`, `percentage`, `color`, `sort_order`.
  - `deal_health`: Phase 8 health breakdown (`strong_count`, `neutral_count`, `at_risk_count`, `strong_value`, `neutral_value`, `at_risk_value`, `avg_health_score`).
  - `forecast`: Deterministic revenue projection (`current_pipeline_value`, `weighted_pipeline_value`, `won_revenue`, `projected_total_revenue`, `active_opportunities`).

### 2. `public.get_rep_performance_analytics`
- **Parameters**: `p_org_id uuid`, `p_start_date timestamptz`, `p_end_date timestamptz`, `p_salesperson_id uuid`
- **Returns**: Array of salesperson performance cards:
  - `user_id`, `name`, `email`, `role`, `avatar_url`, `region_id`, `region_name`
  - `total_assigned`, `active_leads`, `won_leads`, `lost_leads`, `conversion_rate`
  - `active_pipeline_value`, `won_revenue`, `avg_deal_value`, `avg_days_to_won`
  - `calls_count`, `site_visits_count`, `meetings_count`
  - `tasks_total`, `tasks_completed`, `tasks_overdue`, `sla_compliance_rate`

### 3. `public.get_time_series_analytics`
- **Parameters**: `p_org_id uuid`, `p_start_date timestamptz`, `p_end_date timestamptz`, `p_interval text` ('day'|'week'|'month'), `p_salesperson_id uuid`, `p_region_id uuid`, `p_project_id uuid`
- **Returns**: Continuous timeline series bucketed by interval with `leads`, `won`, `lost`, `revenue`, `visits`, `calls`.

### 4. `public.get_pipeline_velocity_analytics`
- **Parameters**: `p_org_id uuid`, `p_start_date timestamptz`, `p_end_date timestamptz`
- **Returns**: Stage dwell times (`avg_days_in_stage`), overall won cycle (`avg_sales_cycle_days`), and conversion telemetry across all pipeline stages.

### 5. `public.get_executive_dashboard_analytics`
- **Parameters**: `p_org_id uuid`, `p_start_date timestamptz`, `p_end_date timestamptz`, `p_salesperson_id uuid`, `p_region_id uuid`, `p_project_id uuid`
- **Returns**: Consolidated single-query payload bundling pipeline summary, stage distribution, rep scorecard, time series, velocity, SLA stats, and deal health distribution.

---

## 3. Server Endpoints

| Method | Endpoint | Description | RBAC Enforcement |
|---|---|---|---|
| `GET` | `/api/analytics/dashboard` | Consolidated executive dashboard payload | Salespeople scoped to own `salesperson_id` |
| `GET` | `/api/analytics/pipeline` | Pipeline summary & stage distribution | Salespeople scoped to own `salesperson_id` |
| `GET` | `/api/analytics/reps` | Sales rep performance & SLA compliance | Salespeople see own metrics only |
| `GET` | `/api/analytics/timeseries` | Date-bucketed trends | Scoped to caller tenant & filters |
| `GET` | `/api/analytics/velocity` | Pipeline dwell times & conversion cycle | Tenant scoped |
| `GET` | `/api/reports/export` | Authoritative multi-section CSV export | Tenant scoped, manager permissions |

---

## 4. Deterministic Forecasting Methodology
Pipeline forecasts are computed deterministically without relying on generative AI:
- **Base Probability per Stage**:
  - `new`: 10%
  - `contacted`: 20%
  - `qualified`: 40%
  - `site_visit`: 60%
  - `negotiation`: 80%
  - `won`: 100%
  - `lost`: 0%
- **Phase 8 Deal Health Multiplier**:
  - Health Score $\ge 80$: $+15\%$ ($1.15\times$)
  - Health Score $\le 49$: $-30\%$ ($0.70\times$)
  - Health Score $50-79$: $1.00\times$
- **Projected Revenue Formula**:
  $$\text{Projected Revenue} = \text{Won Revenue} + \sum_{i \in \text{Active Deals}} (\text{Budget}_i \times \text{StageWeight}_i \times \text{HealthMod}_i)$$

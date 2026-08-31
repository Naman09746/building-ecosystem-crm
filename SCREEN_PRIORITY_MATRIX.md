# CallCRM 2.0 — Screen Priority & Impact Matrix

> **Prioritization Framework**: Screens are ranked across **P0 (Critical)**, **P1 (Important)**, **P2 (Enhancement)**, and **P3 (Future)** based on daily sales velocity impact, revenue generation leverage, and user friction reduction.

---

## 1. Complete Screen Priority Matrix

| Screen / Surface | Tier | Persona Impact | Daily Frequency | Revenue & Usability Impact | Complexity | Dependencies |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Salesperson Home (`salesperson-home.tsx`)** | **P0 (Critical)** | Sales Rep, Specialist | 20+ times/day | **Direct Revenue Velocity**. Solves the morning priority dilemma and drives immediate call/visit execution. | Medium | Design tokens, Action card component |
| **Flat 360° Dossier (`unit-detail-modal.tsx`)** | **P0 (Critical)** | Rep, Manager, Founder | 15+ times/day | **Core Real Estate Asset**. Eliminates modal inception and turns units into actionable dossiers with instant buyer matching. | Medium | Slide-over drawer primitive |
| **Boss Executive Cockpit (`boss-overview.tsx`)** | **P0 (Critical)** | Agency Founder, VP | 5+ times/day | **Executive Decision Speed**. Replaces 836 lines of dense tables with high-impact revenue KPIs and risk radar. | High | Analytics API, Chart containers |
| **Leads Directory & Dossier (`leads-page.tsx`)** | **P0 (Critical)** | Rep, Manager | 30+ times/day | **Primary CRM Workflow**. Replaces cramped 8-column table with stacked rows and instant slide-over lead dossier. | Medium | Table component, Slide-over sheet |
| **Projects & Unit Matrix (`projects-page.tsx`)** | **P0 (Critical)** | Rep, Manager, Admin | 10+ times/day | **Inventory Liquidity**. Streamlines 1034 lines of complex state into modular society and tower selectors. | High | Unit status badges, Tower selector |
| **Seller Opportunities (`seller-opportunities-modal.tsx`)** | **P0 (Critical)** | Rep, Manager | 5+ times/day | **Exclusive Resale Inventory Capture**. Evidence-based resale intelligence with transparent factor scoring. | Low | Seller intelligence types |
| **Pipeline Kanban Board (`pipeline-board.tsx`)** | **P1 (Important)** | Rep, Manager | 10+ times/day | **Deal Progression**. Adds stage value headers, stage velocity indicators, and smoother drag-and-drop. | Medium | Pipeline status mappers |
| **Global Command Palette (`global-search-dialog.tsx`)** | **P1 (Important)** | All Personas | 25+ times/day | **10-Second Keyboard Navigation**. Instant <10ms lookup across leads, units, societies, and quick actions. | Low | Global search API endpoint |
| **Follow-up Queue & Tasks (`tasks-page.tsx`)** | **P1 (Important)** | Sales Rep | 10+ times/day | **SLA Compliance**. Streamlines overdue and due-today commitments with 1-click dialer triggers. | Low | Task completion mappers |
| **30m Pre-Site Briefing (`site-visit-briefing.ts`)** | **P1 (Important)** | Sales Rep (On-site) | 3+ times/day | **On-Site Operational Excellence**. Instant Gate 2 pass PIN, visitor parking, and owner price floor access. | Low | Briefing API endpoint |
| **AI Meeting Structurer (`meeting-summary-modal.tsx`)** | **P1 (Important)** | Sales Rep | 5+ times/day | **Frictionless Note Logging**. Converts voice/speech notes into structured dispositions with human approval. | Low | Meeting summary API |
| **Reports & Analytics (`reports-page.tsx`)** | **P1 (Important)** | Manager, Founder | 2+ times/week | **Performance Diagnostics**. High-fidelity SVG chart containers and team SLA compliance metrics. | Medium | Analytics RPC endpoints |
| **People Directory (`people-page.tsx`)** | **P1 (Important)** | Rep, Manager | 5+ times/day | **Multi-Unit Stakeholder Graph**. Highlights owner vs investor vs tenant roles with total inquired value. | Low | Table component |
| **Aria AI Live Agent (`ai-agent-command-center.tsx`)** | **P2 (Enhancement)** | All Personas | 2+ times/day | **Contextual Copilot**. Embeds conversational property intelligence into sidebar/dossiers. | Medium | Vercel AI SDK chat route |
| **Billing & Subscription (`billing-page.tsx`)** | **P2 (Enhancement)** | Admin, Founder | 1+ time/month | **SaaS Monetization**. Clean seat management, tier upgrade prompts, and invoice download ledger. | Low | Billing Stripe/Razorpay APIs |
| **Team & Users Management (`users-page.tsx`)** | **P2 (Enhancement)** | Admin, Founder | 1+ time/week | **Access Control**. Clean user allocation table with region and role management. | Low | User role mappers |
| **Organization Settings (`settings-page.tsx`)** | **P2 (Enhancement)** | Admin | 1+ time/month | **Tenant Configuration**. Webhook integrations, company branding, and security policies. | Low | Org settings APIs |
| **Regions & Micro-Markets (`regions-page.tsx`)** | **P3 (Future)** | Admin | Rare | **Macro Geography**. Geographic region configuration and locality mapping. | Low | Region CRUD |
| **Activities Audit Ledger (`activities-page.tsx`)** | **P3 (Future)** | Manager | Rare | **Historical Audit Feed**. Chronological timeline feed of all company communication logs. | Low | Activity stream |

---

## 2. Resource & Phasing Allocation

```
Total Scope Breakdown:
- P0 (Critical):    6 Screens (65% of daily user time)
- P1 (Important):   7 Screens (25% of daily user time)
- P2 (Enhancement): 4 Screens (8% of daily user time)
- P3 (Future):      2 Screens (2% of daily user time)
```

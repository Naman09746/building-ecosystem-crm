# CallCRM 2.0 — Architecture & Documentation Hub

Welcome to the official documentation and technical specifications library for **CallCRM 2.0 (Apex Realty)**.

---

## 📚 Documentation Directory Structure

```
DOCS/
├── system-spec/       # 12-Part System Specification Suite
├── domain-guides/     # Deep-Dive Engineering & Automation Guides
├── ui-ux-spec/        # CRM UI/UX Redesign & Architectural Ledger Specifications
├── marketing-spec/    # Marketing Website Editorial Specifications & Visual Strategy
└── playbooks/         # Executive Blueprints, Audits & Master Encyclopedias
```

---

## 1. 🏛️ System Specifications (`DOCS/system-spec/`)

The 12-part canonical engineering and architectural specification suite:

| # | Specification Document | Description |
| :---: | :--- | :--- |
| 01 | [01-product-requirements-document.md](file:///Users/namanjoshi/SAAS/Real-estate/DOCS/system-spec/01-product-requirements-document.md) | Product vision, target personas, functional requirements, and value pillars. |
| 02 | [02-system-architecture-document.md](file:///Users/namanjoshi/SAAS/Real-estate/DOCS/system-spec/02-system-architecture-document.md) | Full-stack Next.js 15, Supabase PostgreSQL, and n8n event bus architecture. |
| 03 | [03-api-documentation.md](file:///Users/namanjoshi/SAAS/Real-estate/DOCS/system-spec/03-api-documentation.md) | Complete 63+ authenticated REST & RPC route handlers catalog. |
| 04 | [04-database-data-model.md](file:///Users/namanjoshi/SAAS/Real-estate/DOCS/system-spec/04-database-data-model.md) | Database schema across 21 migrations and 34 RLS tables. |
| 05 | [05-security-and-threat-model.md](file:///Users/namanjoshi/SAAS/Real-estate/DOCS/system-spec/05-security-and-threat-model.md) | PostgreSQL RLS policies, HMAC webhook signatures, and data isolation models. |
| 06 | [06-deployment-operations-runbook.md](file:///Users/namanjoshi/SAAS/Real-estate/DOCS/system-spec/06-deployment-operations-runbook.md) | Deployment guides, health checks, cron schedules, and operational incident runbooks. |
| 07 | [07-ai-agent-system-specification.md](file:///Users/namanjoshi/SAAS/Real-estate/DOCS/system-spec/07-ai-agent-system-specification.md) | Aria 2.0 server tools suite, Grounded Triad, and human-in-the-loop safety boundaries. |
| 08 | [08-test-strategy-and-test-plan.md](file:///Users/namanjoshi/SAAS/Real-estate/DOCS/system-spec/08-test-strategy-and-test-plan.md) | Test automation plan covering all 28 Vitest suites (239 tests) and CI pipelines. |
| 09 | [09-ux-product-specification.md](file:///Users/namanjoshi/SAAS/Real-estate/DOCS/system-spec/09-ux-product-specification.md) | Design system tokens, mobile cockpit, stacking charts, and bidding ledgers. |
| 10 | [10-environment-configuration-reference.md](file:///Users/namanjoshi/SAAS/Real-estate/DOCS/system-spec/10-environment-configuration-reference.md) | Complete environment variable matrix, scopes, and fallback behaviors. |
| 11 | [11-architecture-decision-records.md](file:///Users/namanjoshi/SAAS/Real-estate/DOCS/system-spec/11-architecture-decision-records.md) | Architecture Decision Records (ADRs 001 through 010). |
| 12 | [12-changelog-and-release-notes.md](file:///Users/namanjoshi/SAAS/Real-estate/DOCS/system-spec/12-changelog-and-release-notes.md) | Version history, milestone progression, and production release notes. |

---

## 2. ⚡ Technical Domain Guides (`DOCS/domain-guides/`)

In-depth technical guides for specialized domain engines and infrastructure:

| # | Guide | Focus Area |
| :---: | :--- | :--- |
| 01 | [01-enterprise-saas-backend-architecture.md](file:///Users/namanjoshi/SAAS/Real-estate/DOCS/domain-guides/01-enterprise-saas-backend-architecture.md) | Multi-tenant RLS, transactional outbox, and n8n decoupling. |
| 02 | [02-ai-agents-and-automation.md](file:///Users/namanjoshi/SAAS/Real-estate/DOCS/domain-guides/02-ai-agents-and-automation.md) | AI Agent architecture, server tools, and human approval gates. |
| 03 | [03-deal-health-engine.md](file:///Users/namanjoshi/SAAS/Real-estate/DOCS/domain-guides/03-deal-health-engine.md) | Deterministic 100-point deal health risk scoring engine. |
| 04 | [04-resurrection-engine.md](file:///Users/namanjoshi/SAAS/Real-estate/DOCS/domain-guides/04-resurrection-engine.md) | Cold lead revival engine and multi-factor preference matching. |
| 05 | [05-lead-ingestion-automation.md](file:///Users/namanjoshi/SAAS/Real-estate/DOCS/domain-guides/05-lead-ingestion-automation.md) | Inbound Meta Lead Ads & WhatsApp webhook verification and round-robin rep routing. |
| 06 | [06-background-processing-and-sla-automation.md](file:///Users/namanjoshi/SAAS/Real-estate/DOCS/domain-guides/06-background-processing-and-sla-automation.md) | Vercel Cron heartbeat, SLA breach alerts, and outbox event batching. |
| 07 | [07-notifications-and-realtime.md](file:///Users/namanjoshi/SAAS/Real-estate/DOCS/domain-guides/07-notifications-and-realtime.md) | Centralized notification stream, realtime channel sync, and preferences. |
| 08 | [08-server-side-analytics.md](file:///Users/namanjoshi/SAAS/Real-estate/DOCS/domain-guides/08-server-side-analytics.md) | PostgreSQL aggregation stored procedures and executive analytics. |
| 09 | [09-setup-and-apis.md](file:///Users/namanjoshi/SAAS/Real-estate/DOCS/domain-guides/09-setup-and-apis.md) | API keys setup, external integrations, and local development minimal config. |
| 10 | [10-production-readiness-and-deployment.md](file:///Users/namanjoshi/SAAS/Real-estate/DOCS/domain-guides/10-production-readiness-and-deployment.md) | Production readiness checklist and verification verification summary. |
| 11 | [11-graphify-knowledge-graph.md](file:///Users/namanjoshi/SAAS/Real-estate/DOCS/domain-guides/11-graphify-knowledge-graph.md) | Graphify AST knowledge graph CLI commands and query helpers. |

---

## 3. 🎨 CRM UI/UX Redesign Specifications (`DOCS/ui-ux-spec/`)

Design system, user journey maps, and screen redesign blueprints:

| # | Specification Document | Focus Area |
| :---: | :--- | :--- |
| 01 | [01-ui-master-redesign-plan.md](file:///Users/namanjoshi/SAAS/Real-estate/DOCS/ui-ux-spec/01-ui-master-redesign-plan.md) | Master consolidated UI/UX redesign blueprint. |
| 02 | [02-ui-audit.md](file:///Users/namanjoshi/SAAS/Real-estate/DOCS/ui-ux-spec/02-ui-audit.md) | Surface inventory and interaction friction audit. |
| 03 | [03-ux-architecture.md](file:///Users/namanjoshi/SAAS/Real-estate/DOCS/ui-ux-spec/03-ux-architecture.md) | 4-tier navigation taxonomy and role-based workspaces. |
| 04 | [04-design-system.md](file:///Users/namanjoshi/SAAS/Real-estate/DOCS/ui-ux-spec/04-design-system.md) | Architectural Ledger color palette, typography scale, and elevation tokens. |
| 05 | [05-ui-redesign-plan.md](file:///Users/namanjoshi/SAAS/Real-estate/DOCS/ui-ux-spec/05-ui-redesign-plan.md) | Detailed screen-by-screen redesign specifications. |
| 06 | [06-screen-priority-matrix.md](file:///Users/namanjoshi/SAAS/Real-estate/DOCS/ui-ux-spec/06-screen-priority-matrix.md) | Screen priority ranking (P0 Critical through P3 Future). |
| 07 | [07-component-strategy.md](file:///Users/namanjoshi/SAAS/Real-estate/DOCS/ui-ux-spec/07-component-strategy.md) | Component layering and modal-to-drawer consolidation roadmap. |
| 08 | [08-before-after-map.md](file:///Users/namanjoshi/SAAS/Real-estate/DOCS/ui-ux-spec/08-before-after-map.md) | Screen-by-screen before & after transformation matrix. |
| 09 | [09-final-frontend-implementation-spec.md](file:///Users/namanjoshi/SAAS/Real-estate/DOCS/ui-ux-spec/09-final-frontend-implementation-spec.md) | Authoritative contract for all frontend components and state machines. |

---

## 4. 🌐 Marketing Website Specifications (`DOCS/marketing-spec/`)

Editorial specifications for the public-facing marketing and acquisition website:

| # | Specification Document | Focus Area |
| :---: | :--- | :--- |
| 01 | [01-marketing-master-redesign-plan.md](file:///Users/namanjoshi/SAAS/Real-estate/DOCS/marketing-spec/01-marketing-master-redesign-plan.md) | Master marketing redesign blueprint. |
| 02 | [02-marketing-site-audit.md](file:///Users/namanjoshi/SAAS/Real-estate/DOCS/marketing-spec/02-marketing-site-audit.md) | Visual & copy audit of the marketing experience. |
| 03 | [03-marketing-information-architecture.md](file:///Users/namanjoshi/SAAS/Real-estate/DOCS/marketing-spec/03-marketing-information-architecture.md) | 12-beat narrative storytelling structure. |
| 04 | [04-marketing-design-system.md](file:///Users/namanjoshi/SAAS/Real-estate/DOCS/marketing-spec/04-marketing-design-system.md) | Architectural Editorial marketing design tokens (Alabaster, Forest, Brass). |
| 05 | [05-landing-page-redesign.md](file:///Users/namanjoshi/SAAS/Real-estate/DOCS/marketing-spec/05-landing-page-redesign.md) | Section-by-section landing page implementation spec. |
| 06 | [06-marketing-component-strategy.md](file:///Users/namanjoshi/SAAS/Real-estate/DOCS/marketing-spec/06-marketing-component-strategy.md) | Marketing UI primitives and showcase components. |
| 07 | [07-marketing-implementation-plan.md](file:///Users/namanjoshi/SAAS/Real-estate/DOCS/marketing-spec/07-marketing-implementation-plan.md) | Phased execution roadmap for the marketing website. |
| 08 | [08-before-after-marketing-map.md](file:///Users/namanjoshi/SAAS/Real-estate/DOCS/marketing-spec/08-before-after-marketing-map.md) | Section-by-section before & after marketing transformation. |

---

## 5. 💼 Executive Playbooks & Audits (`DOCS/playbooks/`)

Master consolidated documents, pitch playbooks, and audits:

| # | Playbook Document | Description |
| :---: | :--- | :--- |
| 01 | [01-callcrm-complete-blueprint.md](file:///Users/namanjoshi/SAAS/Real-estate/DOCS/playbooks/01-callcrm-complete-blueprint.md) | Master Consolidated Product Audit, Selling Playbook & UI/UX Redesign Blueprint. |
| 02 | [02-callcrm-master-frontend-and-system-encyclopedia.md](file:///Users/namanjoshi/SAAS/Real-estate/DOCS/playbooks/02-callcrm-master-frontend-and-system-encyclopedia.md) | Single-file definitive encyclopedia of all frontend and system architecture. |
| 03 | [03-project-audit.md](file:///Users/namanjoshi/SAAS/Real-estate/DOCS/playbooks/03-project-audit.md) | Executive pitch, selling scripts, and verified production audit scorecard. |
| 04 | [04-implementation-audit.md](file:///Users/namanjoshi/SAAS/Real-estate/DOCS/playbooks/04-implementation-audit.md) | Technical implementation audit verifying all 14 engineering phases. |

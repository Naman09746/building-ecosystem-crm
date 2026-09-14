# Building Ecosystem CRM — Multi-Vertical Architecture & Extensibility Guide

This document serves as the canonical architectural guide for extending the **Building Ecosystem CRM** to new trades, supply chain sectors, and operational depths.

---

## 🏛️ Core Philosophy: Shared Primitives, Pluggable Verticals

The building industry is a collaborative chain of commerce:
1. **Real Estate Developers** plan projects and sell units to buyers.
2. **Architects & Engineers** design structures and issue Good-for-Construction (GFC) specifications.
3. **Building Material Suppliers** (Bricks, Cement, Marble, Tiles, Steel) supply raw and finished inventory.
4. **Contractors & Civil Builders** execute on-site construction milestones and manage labor.
5. **Interior & Furniture Studios** perform turnkey fit-outs, room staging, and space styling.

Rather than fragmenting this lifecycle into 5 disparate CRMs, **Building Ecosystem CRM** utilizes a **Unified Core Engine** with **Pluggable Vertical Packs**.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SHARED CORE PRIMITIVES                          │
│  • Unified Identity & People Directory (Buyers, Suppliers, Architects) │
│  • Inbound Omnichannel Pipeline (WhatsApp, Meta, Phone, Webhook)       │
│  • Configurable Stage Kanban & Deal Health                             │
│  • Communication Center (Voice Notes, WhatsApp Templates, Touchpoints) │
│  • Multi-Tenant RBAC (Owner, Manager, Sales Rep, Field Agent)          │
│  • Transactional Outbox & n8n Event Dispatcher                         │
└────────────────────────────────────────────────────────────────────────┘
                                    │
       ┌──────────────┬─────────────┼──────────────┬──────────────┐
       ▼              ▼             ▼              ▼              ▼
┌──────────────┐┌──────────────┐┌──────────────┐┌──────────────┐┌──────────────┐
│ REAL ESTATE  ││  MATERIALS   ││  INTERIORS   ││ ARCHITECTURE ││ CONTRACTORS  │
│ • Towers/Flats││ • SKU Matrix ││ • BOQ Builder││ • GFC Drawings││ • DSR Reports│
│ • Gate Passes││ • Dispatches ││ • Moodboards ││ • Sign-offs  ││ • Crew Logs  │
│ • Bidding Rm ││ • Credit Log ││ • Staging    ││ • Site Memos ││ • Milestones │
└──────────────┘└──────────────┘└──────────────┘└──────────────┘└──────────────┘
```

---

## 📂 Project Organization

```
building-ecosystem-crm/
├── Frontend/src/
│   ├── config/
│   │   ├── ecosystem.ts             # Registry of all verticals, navigation maps & terminology
│   │   └── pipeline-presets.ts      # Default deal stages per vertical (Simple vs Deep)
│   ├── types/
│   │   ├── ecosystem.ts             # EcosystemVertical, ComplexityMode, VerticalProfile types
│   │   └── crm.ts                   # Core CRM types (Organization, User, Lead, etc.)
│   ├── components/
│   │   ├── layout/                  # Dynamic AppShell, Sidebar, BottomNav
│   │   ├── core/                    # Shared CRM tables, modals & inputs
│   │   └── verticals/               # Pluggable Vertical Modules:
│   │       ├── real-estate/         # Stacking chart, Unit 360, Gate pass
│   │       ├── materials/           # SKU pricing, Wholesale quotes, Dispatches
│   │       ├── interior/            # Room-by-room staging, BOQ estimator
│   │       └── contracting/         # Daily Site Reports, Milestone progress
│   └── context/
│       ├── auth-context.tsx         # Organization industry & complexity mode state
│       └── crm-context.tsx          # Dynamic vertical getters and terminology
```

---

## ⚡ Adaptive Operational Modes

Organizations can select their **Operational Depth**:

### 1. Simple / High-Velocity Mode (`simple`)
- **Philosophy**: Zero bloat, instant logging, minimal clicks.
- **Features**:
  - 3-stage visual pipeline (`Inquiry` $\rightarrow$ `Quote Sent` $\rightarrow$ `Closed / Paid`).
  - 1-click WhatsApp quotes and voice note recordings.
  - Hides deep multi-tier hierarchies and statutory brokerage calculators.
  - Perfect for: Retail stone/marble dealers, independent contractors, boutique interior designers.

### 2. Deep / Enterprise Mode (`deep`)
- **Philosophy**: Comprehensive compliance, auditability, multi-tier approvals.
- **Features**:
  - Full 6-tier asset hierarchy (`Region` $\rightarrow$ `Area` $\rightarrow$ `Society` $\rightarrow$ `Tower` $\rightarrow$ `Floor` $\rightarrow$ `Flat`).
  - Chronological negotiation room & bidding ledger.
  - Digital gate pass dispatchers with Gate 2 PINs.
  - Transactional outbox with HMAC-SHA256 webhooks for n8n.
  - Perfect for: Luxury developers, conglomerate builders, multi-city dealership networks.

---

## 🛠️ How to Add a New Industry Vertical

Adding a new vertical (e.g., `electrical_plumbing` or `glass_facade`) requires just 3 steps:

### Step 1: Declare the Vertical Type
In `Frontend/src/types/ecosystem.ts`:
```typescript
export type EcosystemVertical =
  | "real_estate"
  | "building_materials"
  | "interior_furniture"
  | "architecture_design"
  | "contractor_builder"
  | "electrical_plumbing"; // Added
```

### Step 2: Register in Ecosystem Config
In `Frontend/src/config/ecosystem.ts`:
```typescript
electrical_plumbing: {
  id: "electrical_plumbing",
  name: "Electrical & Plumbing Supplies",
  tagline: "Wires, Conduits, Pipes & Sanitary Fittings",
  badge: "MEP Suppliers",
  color: "yellow",
  iconName: "Zap",
  description: "Built for electrical distributors and MEP suppliers.",
  terms: {
    inventoryItem: "Fittings SKU",
    inventoryPlural: "MEP Catalog",
    clientType: "Contractor / Electrician",
    dealLabel: "Supply Order",
    leadLabel: "MEP Indent",
    activityLabel: "Delivery Run",
  },
  primaryNav: [ ... ],
  inventoryNav: { ... },
  quickActions: [ ... ],
}
```

### Step 3: Register Pipeline Presets
In `Frontend/src/config/pipeline-presets.ts`:
```typescript
electrical_plumbing: {
  simple: [
    { id: "indent", name: "Indent Received", desc: "List of items from electrician" },
    { id: "quoted", name: "Rate Quote Sent", desc: "Wholesale discounted price" },
    { id: "supplied", name: "Supplied & Paid", desc: "Goods dispatched to site" },
  ],
  deep: [ ... ]
}
```

The sidebar, onboarding screen, organization settings, and mobile navigation will **automatically** adapt without changing any other component code.

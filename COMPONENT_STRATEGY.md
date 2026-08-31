# CallCRM 2.0 — Component Strategy & Architecture

> **Objective**: Establish a modular, reusable component hierarchy that consolidates fragmented modals, eliminates duplication, and enforces consistent architectural ledger styling across all surfaces.

---

## 1. Component Layering Architecture

```mermaid
graph TD
    PRIMITIVES[1. Base Primitives (Radix + Tailwind)]
    DOMAINS[2. Domain Badges & Micro-Components]
    COMPOSITES[3. Interactive Composite Components]
    DOSSIERS[4. Slide-Over Master Dossiers & Sheets]
    SCREENS[5. Role-Specific Workspaces & Pages]
    
    PRIMITIVES --> DOMAINS
    DOMAINS --> COMPOSITES
    COMPOSITES --> DOSSIERS
    DOSSIERS --> SCREENS
```

---

## 2. Component Inventory & Classification

### Layer 1: Core Primitives (`src/components/ui/*`)

| Component | Responsibility | Current Location | Enhancements Needed |
| :--- | :--- | :--- | :--- |
| **`Button`** | Standard interactive trigger with size/variant tokens and inline hotkey `<kbd>` support. | `src/components/ui/button.tsx` | Add `brass` luxury variant, tactile active pulse, and `<kbd>` badge slot. |
| **`StatusBadge`** | Domain badges for Lead Score, Deal Health, Pipeline Stage, Unit Status, and Verification Tier. | `src/components/ui/status-badge.tsx` | Enforce tabular fonts, pulse animations on `At Risk` and `Hot 🔥` states. |
| **`ActionCard`** | Clickable action container with icon, title, subtitle, priority score, and 1-click action button. | `src/components/ui/action-card.tsx` | Add swipe-to-complete on mobile and left border priority accent. |
| **`Sheet` / `Drawer`** | Slide-over drawer primitive for Master Dossiers (replaces cramped modal dialogs). | *New Primitive* (`src/components/ui/sheet.tsx`) | Right-side slide-over with backdrop blur, keyboard `Esc`, and sticky dock. |
| **`Table`** | Dense data table with stacked cell text, sort indicators, and row hover triggers. | `src/components/ui/table.tsx` | Add compact variant (`h-9`), horizontal divider subtleness, and sticky header. |
| **`EmptyState`** | Informative placeholder with explanation, icon, and direct action trigger. | `src/components/ui/empty-state.tsx` | Add real estate context illustrations and domain action prompts. |
| **`Skeleton`** | Shimmering placeholder matching exact card and table layouts. | `src/components/ui/skeleton.tsx` | Add high-fidelity metric and matrix grid skeletons. |

---

### Layer 2: Domain Composite Components (`src/components/crm/*`)

| Composite Component | Description & Functionality | Target Location |
| :--- | :--- | :--- |
| **`PriorityActionQueue`** | The heart of Salesperson Home: Renders prioritized action cards (calls, visits, overdue) with 1-click hotkey triggers. | `src/components/crm/priority-action-queue.tsx` |
| **`Flat360DossierSheet`** | Master property dossier slide-over: Specs, temporal ownership chain, verified facts, price ledger, and 100-point matching buyers. | `src/components/crm/flat-360-dossier-sheet.tsx` |
| **`LeadDossierSheet`** | Master client dossier slide-over: Requirements, communication ledger, matched inventory units, and 10s logger dock. | `src/components/crm/lead-dossier-sheet.tsx` |
| **`PreVisitBriefingCard`** | 30-minute operational cockpit card displaying Gate 2 visitor PIN, designated parking stall, and owner price boundaries. | `src/components/crm/pre-visit-briefing-card.tsx` |
| **`SellerOpportunityCard`** | Evidence-based resale opportunity card displaying transparent factor breakdown (+20 tenancy, +15 holding) and [Verify Intent] flow. | `src/components/crm/seller-opportunity-card.tsx` |
| **`SocietyInventoryMatrix`** | Visual tower selector and interactive floor/unit availability grid with status color coding. | `src/components/crm/society-inventory-matrix.tsx` |
| **`DealHealthRadar`** | Executive risk table ranking stalled negotiations by days-in-stage and capital value. | `src/components/crm/deal-health-radar.tsx` |
| **`QuickLoggerDock`** | Ephemeral 10-second activity logger supporting speech-to-text, quick disposition pills, and next follow-up scheduling. | `src/components/crm/quick-logger-dock.tsx` |

---

## 3. Consolidation & Deprecation Strategy

| Existing Component | Identified Redundancy / Friction | Action & Replacement |
| :--- | :--- | :--- |
| `UnitDetailModal` (`unit-detail-modal.tsx`) | 858 lines of modal dialog code; claustrophobic on laptops; causes modal inception. | **Refactor into `Flat360DossierSheet`** using Radix Sheet primitive for spacious slide-over layout. |
| `LeadDetailModal` (`lead-detail-modal.tsx`) | Deep tab hierarchy hides matching inventory; cramped on small screens. | **Refactor into `LeadDossierSheet`** with sticky bottom logger dock and prominent unit matching tab. |
| `AiLeadBot` (`ai-lead-bot.tsx`) | Floating bot widget overlaps with primary action buttons on lower-right screen. | **Consolidate into contextual triggers** inside dossiers and sidebar Copilot drawer. |
| `ReportsPage` charts | Hand-rolled CSS progress bars lack interactive tooltips and financial scaling. | **Consolidate into modular SVG chart containers** (`src/components/crm/charts/*`). |

---

## 4. State Management & Performance Boundary

- **Client State**: Retain `CRMProvider` (`crm-context.tsx`) with memoized selectors (`useMemo`, `useCallback`) and optimistic UI updates for instant 10ms hotkey interactions.
- **Drawer Unmounting**: Lazy-load heavy dossiers (`Flat360DossierSheet`, `LeadDossierSheet`) only when opened to keep initial page bundle sizes under 180kb.
- **Tabular Memory**: Memoize filtered unit matrices and lead lists by `[projectId, towerId, statusFilter]` to ensure zero lag during fast typing in search bars.

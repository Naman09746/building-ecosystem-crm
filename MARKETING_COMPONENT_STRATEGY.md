# CallCRM — Marketing Component Strategy & Architecture

> **Objective**: Define the reusable component hierarchy, editorial layout primitives, and visual asset consolidation strategy for the public marketing website of CallCRM.

---

## 1. Component Layering Architecture

```mermaid
graph TD
    PRIMITIVES[1. Marketing Primitives (Buttons, Badges, Dividers)]
    SHOWCASES[2. Editorial Product Showcase Containers]
    SECTIONS[3. Narrative Section Modules]
    PAGE[4. Landing Page Master Controller (page.tsx)]
    
    PRIMITIVES --> SHOWCASES
    SHOWCASES --> SECTIONS
    SECTIONS --> PAGE
```

---

## 2. Component Inventory & Classification

### Layer 1: Marketing Primitives (`src/components/marketing/primitives/*`)

| Primitive Name | Props & Responsibilities | Visual Style & Behavior |
| :--- | :--- | :--- |
| **`MktgButton`** | `variant: 'solid-ink' \| 'stone-outline' \| 'brass-accent'`, `size: 'sm' \| 'md' \| 'lg'`, `href?: string`. | Solid charcoal fill, subtle 1px border, 150ms hover ease. |
| **`ArchitecturalTag`** | `variant: 'forest' \| 'brass' \| 'stone'`, `children: React.ReactNode`. | Monospace uppercase tag with soft background tint and crisp 1px matched border. |
| **`ArchitecturalDivider`** | `orientation: 'horizontal' \| 'vertical'`, `variant: 'subtle' \| 'bold'`. | 1px crisp divider in `#e2ded6` or `#181a19`. |
| **`EditorialSection`** | `id?: string`, `eyebrow?: string`, `title: string`, `subtitle?: string`, `children: React.ReactNode`. | Standardized section container with max-w-6xl, generous padding, and centered/asymmetric title header. |

---

### Layer 2: Product Showcase Containers (`src/components/marketing/showcases/*`)

| Showcase Component | Responsibility & Content | Visual Pattern |
| :--- | :--- | :--- |
| **`HeroDossierShowcase`** | Grounded hero split view: Luxury architectural facade paired with live **Flat 360° Unit A-1402 dossier**. | High-contrast white card with verified owners, Gate 2 pass PIN, and active matching buyers. |
| **`MatcherMatrixShowcase`** | Interactive comparison linking Buyer Requirements (`Siddharth V. · ₹17 Cr`) to `Unit A-1402` (96/100 match). | 3-column connector card showing Location (30/30), Budget (30/30), Config (20/20), Facing (10/10). |
| **`PreVisitBriefingShowcase`** | 30-minute operational cockpit card displaying Gate 2 visitor PIN, parking bay B2-14, and owner price floor. | Clean amber/stone accented card with 1-tap navigation and battlecard pills. |
| **`BossCockpitShowcase`** | Executive revenue dashboard displaying Total Pipeline in `₹ Cr`, Won Revenue, and Deal Health Risk Radar. | 3-tier executive card with narrative bar and stalled deal warnings. |
| **`PricingTierCard`** | Plan tier card with billing cycle dynamic calculation (Monthly vs Annual 20% discount). | High-legibility price table with clear seat/project inclusions and trial CTA. |

---

## 3. Visual Asset Refactoring & Consolidation

| Existing Asset in `architectural-visuals.tsx` | Identified Deficiency | Refactored Replacement |
| :--- | :--- | :--- |
| `IsometricCityscape` | CSS 3D perspective towers look artificial, slow down rendering, and distract from the hero text. | **Replace with clean, high-resolution architectural facade composition** paired with a grounded interface dossier. |
| `MobileCompanionDeviceFrame` | Floating mobile mockup with fake reflections. | **Replace with a crisp on-site visit cockpit frame** highlighting the Gate 2 visitor pass digital PIN (#8492) and parking bay. |
| `ArchitecturalFloorplanVector` | Standalone CAD vector floor plan detached from unit data. | **Integrate directly into the Flat 360° showcase** as the interactive architectural layout tab. |

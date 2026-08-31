# CallCRM 2.0 — Architectural Ledger Design System Specification

> **System Name**: *Architectural Ledger*
> **Core Visual Philosophy**: Tailored for high-ticket Indian real estate sales organizations. Combines the timeless precision of high-end architectural blueprints and property deeds with the lightning-fast responsiveness of modern financial trading terminals.
> **Key Aesthetic Pillars**: **Authoritative · Architectural · Data-Rich · Warm Luxury · Uncompromising Speed**.

---

## 1. Color System & Semantic Tokens

The palette moves away from cold, generic SaaS blues/purples and adopts an **Architectural Heritage** color scheme rooted in premium physical assets (warm alabaster paper, deep obsidian ink, polished heritage brass, and oxidized verdigris).

### A. Core Neutral Ledger Palette

| Token Name | Hex Code | Purpose & Usage | Contrast Ratio on Light / Dark |
| :--- | :--- | :--- | :--- |
| **`paper-base`** | `#f8fafc` (Light) / `#0d0f12` (Dark) | Primary application canvas background. | Base Canvas |
| **`paper-card`** | `#ffffff` (Light) / `#13171d` (Dark) | Card, container, and table background surfaces. | Base Surface |
| **`paper-subtle`** | `#f1f4f8` (Light) / `#1a1f27` (Dark) | Hover states, table headers, secondary button fills. | 1.15:1 to card |
| **`ink-primary`** | `#0f172a` (Light) / `#f1f5f9` (Dark) | Headings, primary titles, critical metrics, high-emphasis text. | 14.2:1 (WCAG AAA) |
| **`ink-muted`** | `#64748b` (Light) / `#94a3b8` (Dark) | Secondary labels, timestamps, metadata, unit floor specs. | 5.8:1 (WCAG AA) |
| **`ink-subtle`** | `#94a3b8` (Light) / `#64748b` (Dark) | Placeholder text, hotkey indicators, disabled states. | 4.6:1 (WCAG AA) |
| **`border-ledger`** | `#e2e8f0` (Light) / `#222936` (Dark) | Standard architectural line dividers and card borders. | Crisp 1px structural stroke |
| **`border-subtle`** | `#f1f5f9` (Light) / `#19202b` (Dark) | Table inner row dividers and subtle card partitions. | Soft separation |

---

### B. Heritage Accent Palette

| Accent Name | Primary Hex | Light Tint Hex | Border Hex | Domain Meaning & Real Estate Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Heritage Brass** | `#a9812e` | `#fcf8ee` | `#e5cd97` | **High-Value Luxury / VIP / Won Deals / Resale Mandates**. Represents high capital and exclusive mandates. |
| **Verdigris Green** | `#245c4f` | `#eef7f3` | `#b4ddce` | **Available Inventory / Healthy Deals / Verified Evidence**. Represents positive asset liquidity. |
| **Architectural Navy** | `#1e293b` | `#f1f5f9` | `#cbd5e1` | **Structural Framework / Projects / Towers / Master Contacts**. Represents solid physical infrastructure. |

---

### C. Semantic Status Indicators

| Semantic State | Base Color | Background Fill | Border Stroke | Usage in CRM |
| :--- | :--- | :--- | :--- | :--- |
| **Success / Available / Verified** | `#059669` (Emerald 600) | `#ecfdf5` (Emerald 50) | `#a7f3d0` | Unit available, deal won, fact verified, SLA met. |
| **Warning / Hold / At Risk** | `#d97706` (Amber 600) | `#fffbeb` (Amber 50) | `#fde68a` | Deal at risk, unit on temporary hold, expiring tenancy. |
| **Danger / Overdue / Lost** | `#dc2626` (Red 600) | `#fef2f2` (Red 50) | `#fecaca` | SLA overdue follow-up, deal lost, unit blocked, stale fact. |
| **Info / Site Visit / Progress** | `#2563eb` (Blue 600) | `#eff6ff` (Blue 50) | `#bfdbfe` | Site visit scheduled, negotiation in progress, active call. |

---

## 2. Typography Hierarchy & Number Formatting

CallCRM relies on **high-legibility typography with tabular numerals** for rapid financial calculations and deal evaluations.

```
Font Stack:
Primary UI:      Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
Numeric / Monospace: ui-monospace, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", monospace
```

### Type Scale:

| Level | Size / Line Height | Weight | Letter Spacing | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Display 1 (Executive)** | `28px / 34px` (1.75rem) | 800 (Bold) | `-0.025em` | Boss Revenue KPIs (`₹48.5 Cr`), Top Dashboard Totals. |
| **Heading 1 (Page Title)** | `20px / 26px` (1.25rem) | 700 (Bold) | `-0.02em` | Main page titles (`Today's Priorities`, `Projects Directory`). |
| **Heading 2 (Section)** | `15px / 20px` (0.9375rem) | 600 (Semibold) | `-0.01em` | Section headers (`Next Best Actions`, `Available Units`). |
| **Body Primary** | `13px / 18px` (0.8125rem) | 500 (Medium) | `0em` | Table cell text, client names, primary buttons, descriptions. |
| **Body Secondary / Caption** | `11px / 15px` (0.6875rem) | 500 (Medium) | `+0.01em` | Unit specs (`3 BHK · 2,450 sq ft`), timestamp, sub-labels. |
| **Micro / Hotkey Badge** | `10px / 12px` (0.625rem) | 700 (Bold) | `+0.04em` | Status badges, keyboard hotkeys (<kbd>L</kbd>, <kbd>⌘K</kbd>), tags. |

### Tabular Numerals Requirement:
All monetary figures, carpet areas, unit numbers, and countdown timers **must use `font-mono tabular-nums`** to prevent visual jitter during realtime updates.

---

## 3. Elevation, Radius & Structural Lines

```css
/* Elevation Tiers */
--shadow-flat:     none;
--shadow-subtle:   0 1px 2px 0 rgba(15, 23, 42, 0.04);
--shadow-card:     0 1px 3px 0 rgba(15, 23, 42, 0.06), 0 1px 2px -1px rgba(15, 23, 42, 0.04);
--shadow-elevated: 0 4px 12px -2px rgba(15, 23, 42, 0.08), 0 2px 6px -2px rgba(15, 23, 42, 0.04);
--shadow-drawer:   0 20px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.08);

/* Border Radius Tokens */
--radius-sm: 4px;   /* Badges, micro-buttons, hotkey tags */
--radius-md: 6px;   /* Standard buttons, form inputs, dropdown items */
--radius-lg: 8px;   /* Cards, table containers, popovers */
--radius-xl: 12px;  /* Master dossiers, modal shells, hero cockpits */
```

---

## 4. Reusable Component Specifications

### A. Primary Action Button (`Button.tsx`)
- **Height**: `34px` (Desktop) / `42px` (Mobile touch target).
- **Default Fill**: `#0f172a` (Solid Obsidian) with `#ffffff` text and subtle `0 1px 2px` drop shadow.
- **Hover State**: `#1e293b` with smooth `150ms` transition.
- **Focus Ring**: `2px` offset ring in Heritage Brass (`#a9812e`).
- **Inline Hotkey**: Subtle `<kbd>` badge on the right edge (e.g., `Log Call [L]`).

### B. High-Density Data Table (`Table.tsx`)
- **Row Height**: Compact `40px` baseline with `1px border-b border-border-subtle`.
- **Header Style**: `bg-secondary/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground`.
- **Hover State**: `hover:bg-secondary/50 transition-colors cursor-pointer`.
- **Primary Column**: Bold `13px` title with `11px` muted subtitle stacked vertically (avoids horizontal column overflow).

### C. Status & Score Badges (`StatusBadge.tsx`)
- **Format**: Pill with soft background, 1px matched border, and crisp text.
- **Variants**:
  - `LeadScoreBadge`: `90+` (Hot 🔥, Red/Amber glow), `70-89` (Warm ⚡, Amber), `<70` (Cold ❄️, Slate).
  - `DealHealthBadge`: `Strong` (Green), `Fair` (Blue), `At Risk` (Red pulse).
  - `UnitStatusBadge`: `Available` (Emerald), `Hold` (Amber), `Booked/Sold` (Slate).

### D. Flat 360° Slide-Over Dossier (`UnitDossierSheet.tsx`)
- **Structure**: Replaces the cramped dialog with a right-hand slide-over drawer (`w-full max-w-2xl`).
- **Header**: Large Unit Name (`A-1402`), Tower & Society breadcrumb, Price in `₹ Cr` with Price Revision sparkline.
- **Segmented Control**: 4 tabs (`Specs & Amenities`, `Ownership Chain`, `Verified Facts`, `Matching Buyers`).
- **Sticky Footer Action Bar**: Direct triggers (`Assign to Buyer`, `Change Price`, `Schedule Site Visit`).

---

## 5. Motion & Micro-Interaction Principles

1. **Sub-150ms Easing**: All transitions (hover, focus, tab switch) must use `cubic-bezier(0.16, 1, 0.3, 1)` with durations between `100ms` and `150ms`.
2. **Action Confirmation Pulse**: When a user logs a call via hotkey <kbd>L</kbd> or advances a pipeline stage, the card flashes a subtle `bg-emerald-500/10` tint for `400ms` to provide immediate feedback.
3. **Reduced Motion Compliance**: Respect `@media (prefers-reduced-motion: reduce)` by disabling all transform and translate animations while retaining instant opacity shifts.

---

## 6. Accessibility & Contrast Standards

- **WCAG 2.1 AAA Contrast**: All primary body text achieves $\ge 7:1$ contrast against light/dark backgrounds.
- **Visible Keyboard Focus**: Every interactive control renders an unambiguous `ring-2 ring-primary ring-offset-1` outline on `<Tab>` navigation.
- **ARIA Live Regions**: Realtime notifications (new lead ingestion, SLA warning countdowns) announce via `aria-live="polite"`.
- **Screen Reader Tables**: All data tables include semantic `<caption>`, `<th> scope="col"`, and `aria-label` tags.

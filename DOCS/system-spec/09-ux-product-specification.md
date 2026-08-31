# 09. UX & Product Specification — Apex Realty CallCRM

**Design Philosophy:** "10-Second Sales Interaction & Grounded Property Intelligence"  
**Aesthetic Style:** Architectural Ledger — Off-White Paper Canvas & Precision Obsidian Typography  
**Design Tokens:** Obsidian (`#0f172a`), Heritage Brass (`#a9812e`), Verdigris (`#245c4f`), Slate Navy (`#1e293b`), Alabaster (`#f8fafc`)  
**Typography:** Modern Sans-Serif (Inter / System UI) + Monospace Tabular Numerals for Currency (`₹ Cr` / `₹ L`) and Square Footage

---

## 1. Core UX Principles

1. **Sub-10-Second Quick Activity Logging:** Sales reps must be able to log a phone call, voice note, WhatsApp conversation, or site visit in under 10 seconds without navigating away from their active queue.
2. **Atomic Property Asset (Flat 360° Dossier):** The unit is the atomic asset holding carpet area, temporal ownership chains, parking bays, price revision ledgers, and Gate 2 visitor pass rules.
3. **Context-Aware Information Density:** High-ticket real estate deals require immediate access to: Buyer Budget in Crores (`₹X.XX Cr`), Configuration, Target Tower/Unit, Lead Score, Days in Stage, Deal Health Score, and Next Scheduled Move.
4. **Optimistic Visual Feedback:** Every stage movement, task completion, and note entry updates the screen in <10ms before background server roundtrips.
5. **Mobile-First Cockpit for Field Agents:** Dedicated bottom navigation bar, 1-thumb touch targets, offline PWA synchronization, and voice note dictation for site visits.

---

## 2. Primary Product Surfaces & Modals

### 2.1 Boss Executive Cockpit (`boss-overview.tsx`)
- **Executive Narrative Summary Bar:** Dynamic textual briefing summarizing gross pipeline value, MoM growth velocity, and deals needing immediate management intervention.
- **Master KPI Cards:** Total Active Pipeline Value (`₹ Cr`), Won Revenue, Stalled Deals at Risk, and Active Resale Mandates.
- **Deal Health Risk Radar:** Table of at-risk deals with health score, days stalled in stage, and assigned rep.
- **Global Filter Bar:** Multi-dimensional filtering by Region, Salesperson, Project, and Date Range.

### 2.2 Salesperson Daily Action Cockpit (`salesperson-home.tsx`)
- **Morning Focus Banner:** Prominently highlights Top 3 High-Impact Priorities (urgent calls, VIP site visits, pending offers).
- **1-Click Rapid Execution:** Hotkey <kbd>L</kbd> opens instant logger; 1-tap WhatsApp trigger opens pre-formatted luxury templates.
- **Active 30m Site Visit Alert:** Surfaces Gate 2 security pass PIN, parking bay assignment (e.g. B2-14), and owner price floor 30 minutes before client arrival.

### 2.3 Mobile CRM Cockpit & Role-Aware Bottom Navigation
- **Fixed Bottom Navigation:** 5 primary touch destinations tailored to user role (`Today`, `Leads`, `Pipeline`, `Inventory`, `Menu`).
- **PWA Offline Sync Banner:** Displays connectivity status with animated sync badge when uploading queued offline activities from IndexedDB.
- **Touch-Optimized Lead Cards:** Swipeable and expandable cards with direct Call, WhatsApp, and Note action chips.

### 2.4 Visual Building Stacking Chart (`building-stacking-chart.tsx`)
- **Floor-by-Floor Interactive Elevation:** Visual architectural tower matrix rendering all units floor-by-floor.
- **Color-Coded Unit Statuses:**
  - `Available` (Verdigris / Emerald)
  - `Hold / Site Visit` (Amber)
  - `Negotiation / Bidding` (Blue)
  - `Booked / Sold` (Slate / Dark)
- **Unit Metadata Tooltips:** Asking price in `₹ Cr`, carpet area in sq ft, facing (North-East, Park, Golf Course), and vastu rating.

### 2.5 Multi-Party Bidding & Negotiation Ledger (`lead-bidding-modal.tsx`)
- **Offer Timeline Ledger:** Chronological trail of buyer offers, seller counter-offers, and token advances.
- **Disclose Breakdown:** Dynamic calculation of base offer, token advance %, estimated stamp duty (5-7%), registration fees, and net payable.
- **Action Buttons:** `Accept Bid`, `Submit Counter-Offer`, `Reject Bid`.

### 2.6 Digital Site Visit Pass Modal (`site-visit-pass-modal.tsx`)
- **Encrypted Visitor Pass Generator:** Generates a secure QR pass code, Gate 2 security PIN, vehicle number registration, and visitor headcount.
- **1-Click WhatsApp Pass Sharing:** Generates pre-formatted WhatsApp gate pass invitation with GPS Google Maps coordinates.

### 2.7 Indian Real Estate Cost Sheet Calculator Modal (`cost-sheet-calculator-modal.tsx`)
- **Dynamic Cost Sheet Engine:** Configurable parameters for Base Rate / sq ft, Floor Escalation, PLC, Covered Parking slots, Club Membership, IDC/EDC, IFMS, and Possession Charges.
- **Statutory Taxes:** Automated GST (1% / 5%), Stamp Duty (5-7%), and Registration Fee (1%).
- **Payment Plan Selector:** Toggles between Construction-Linked Plan (CLP), Down Payment Plan (10:80:10), and Subvention Scheme.
- **Export Options:** 1-click branded PDF quotation download and formatted WhatsApp text pitch.

---

## 3. Global Keyboard Navigation & Hotkeys

| Shortcut | Action | Scope |
| :--- | :--- | :--- |
| `Ctrl + K` or `Cmd + K` | Open Global Omnibar Search (search leads, buyers, projects, units) | Global |
| `L` | Open 10-Second Quick Activity & Call Logger | Global |
| `F` | Quick Filter Focus | Pipeline / Leads |
| `Ctrl + N` or `Cmd + N` | Open New Inbound Lead Modal | Global |
| `Escape` | Close active modal, slide-over sheet, or drawer | Global |

---

## 4. Accessibility & Responsive Standards

- **Semantic HTML:** Radix UI dialogs, sheets, dropdowns, tooltips, and tabs with appropriate ARIA roles and labels (`aria-label`, `role="dialog"`, `aria-describedby`).
- **Focus Rings:** Visible high-contrast focus rings (`ring-2 ring-indigo-500` / `ring-amber-500`) for full keyboard navigation.
- **Mobile Responsive:** Adaptive drawers and slide-over sheets (`UnitDossierSheet`, `LeadDossierSheet`) optimized for iPhone/Android touch and desktop 4K displays.

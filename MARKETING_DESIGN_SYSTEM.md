# CallCRM — Marketing Design System Specification

> **Brand Aesthetic Philosophy**: *Architectural Editorial*
> Inspired by premier architectural monographs, high-end property advisory journals, and understated enterprise technology. The marketing visual system establishes immediate credibility, quiet luxury, and uncompromising precision.

---

## 1. Color Palette & Material Hierarchy

```css
:root {
  /* Canvas & Paper Surfaces */
  --mktg-canvas:        #f8f7f4; /* Warm alabaster/ivory background */
  --mktg-surface-card:  #ffffff; /* Clean white card & showcase surface */
  --mktg-surface-stone: #f0ede6; /* Warm stone secondary surface & table headers */
  --mktg-surface-muted: #e7e3db; /* Subtle borders & architectural dividers */

  /* Text & Ink Tokens */
  --mktg-ink-primary:   #181a19; /* Deep charcoal (High emphasis, 14.8:1 contrast) */
  --mktg-ink-secondary: #4a4d4b; /* Editorial body copy & descriptions */
  --mktg-ink-muted:     #7a7d7b; /* Metadata, captions, timestamps */

  /* Architectural Heritage Accents */
  --mktg-forest:        #224a3e; /* Deep verdigris / forest (Credibility, verified status) */
  --mktg-forest-light:  #edf4f1; /* Soft tint for verification pills */
  --mktg-brass:         #a68138; /* Restrained heritage brass (High-value accents only) */
  --mktg-brass-light:   #faf5ec; /* Subtle brass highlight background */

  /* Architectural Divider & Line Strokes */
  --mktg-line-subtle:   #e2ded6; /* 1px crisp layout grid line */
  --mktg-line-bold:     #181a19; /* High-contrast section divider */
}
```

### Color Usage Rules:
1. **Brass is an Accent, Not the Atmosphere**: Brass is strictly limited to 5% of visual area (small badge borders, icons, and subtle metric accents). It must never dominate backgrounds or large headline gradients.
2. **Warm Paper over Pure Cold White**: The page canvas is a refined warm ivory (`#f8f7f4`), avoiding the clinical, blinding stark-white of cheap SaaS pages.
3. **No Cyberpunk Gradients**: Gradients are replaced with solid, confident ink and warm stone partitions.

---

## 2. Typography Hierarchy

```
Font Stacks:
Primary Sans:     Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
Editorial Serif:  Newsreader, "Playfair Display", "Times New Roman", Georgia, serif
Monospace:        ui-monospace, "SF Mono", Menlo, Monaco, Consolas, monospace
```

### Type Scale & Hierarchy:

| Element | Typeface | Size / Line Height | Weight | Tracking | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Hero Title** | Sans-serif | `42px / 50px` (sm: `56px / 64px`, lg: `64px / 72px`) | 700 (Bold) | `-0.025em` | Main hero statement ("Built for the way real estate is actually sold"). |
| **Section Title** | Sans-serif | `28px / 36px` (sm: `36px / 44px`) | 700 (Bold) | `-0.02em` | Major section headers ("Property Intelligence", "100-Point Matcher"). |
| **Editorial Quote / Statement** | Editorial Serif | `24px / 34px` (sm: `30px / 40px`) | 500 (Medium Italic) | `-0.01em` | Core philosophical statements and customer case quotes. |
| **Subtitle / Lead Paragraph** | Sans-serif | `16px / 26px` (sm: `18px / 28px`) | 400 (Regular) | `0em` | Explanatory lead copy below section titles. |
| **Body Text** | Sans-serif | `14px / 22px` | 400 (Regular) | `0em` | Product explanations, feature descriptions, FAQ answers. |
| **Architectural Tag / Pill** | Monospace | `11px / 14px` | 700 (Bold) | `+0.05em` | Category tags, unit specs (`[UNIT A-1402]`), status codes. |

---

## 3. Spacing, Grid & Container Architecture

- **Page Container**: `max-w-6xl mx-auto px-4 sm:px-8 lg:px-12` (Ensures optimal line length and generous gutters).
- **Section Padding**: `py-20 sm:py-28` (Gives content room to breathe without excessive empty space).
- **Grid Layouts**: Asymmetric 12-column grid (`grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12`) enabling editorial side-by-side compositions (e.g. 5-col narrative + 7-col product showcase).

---

## 4. UI Primitives & Button Tokens

### A. Primary Action Button (`[Start Free Trial]` / `[Request Private Walkthrough]`)
- **Background**: Solid Charcoal Ink (`#181a19`).
- **Text**: Warm Alabaster (`#f8f7f4`), `text-xs sm:text-sm font-semibold`.
- **Padding & Radius**: `py-3 px-6 rounded-lg` with subtle `0 1px 2px rgba(0,0,0,0.08)` drop shadow.
- **Hover State**: `#2d302e` with `150ms` ease-out transition.

### B. Secondary Button (`[Explore Interactive Platform]`)
- **Background**: Transparent / White on hover.
- **Border**: `1px solid #d8d3c8`.
- **Text**: Deep Charcoal (`#181a19`), `text-xs sm:text-sm font-semibold`.
- **Hover State**: `bg-[#f0ede6] border-[#181a19]`.

### C. Architectural Category Badge
- **Format**: Pill with soft tint background, `1px solid border`, and monospace text.
- **Forest Variant**: `bg-[#edf4f1] text-[#224a3e] border-[#b8d6cb]`.
- **Brass Variant**: `bg-[#faf5ec] text-[#a68138] border-[#e8d5b0]`.

---

## 5. Imagery & Product UI Presentation

1. **Architectural Photography Pairing**: Never float a screenshot alone on a plain background. Pair the software interface with real-world luxury residential architecture (facades, landscaped arrival courts, high-ceiling living spaces).
2. **Grounded Interface Frames**: Product screens are rendered in high-contrast, crisp white containers with subtle 1px stone borders (`border border-[#e2ded6]`), sharp typography, and realistic data (e.g., *DLF The Camellias, Oberoi 360 West, ₹16.5 Cr*).
3. **No Skewed 3D Perspectives**: Avoid 3D tilt effects that distort readability. Present interfaces head-on with authentic clarity.

---

## 6. Motion & Micro-Interactions

- **Duration**: `150ms` to `200ms` maximum.
- **Easing**: `cubic-bezier(0.16, 1, 0.3, 1)` (Dignified and snappy).
- **Reduced Motion**: Full compliance with `@media (prefers-reduced-motion: reduce)`.

---
name: ecosystemrealty-design-system
description: Enforces professional, production-ready design principles for EcosystemRealty (Next.js/React/Tailwind)
---

# EcosystemRealty Design System & UI/UX Guidelines

EcosystemRealty is a professional SaaS product. It must NOT look AI-generated, trendy, or like a generic template. It should convey the visual quality and restraint of mature platforms like Linear, Stripe, HubSpot, or Salesforce.

## Core Visual Principles
- **No AI-generated aesthetics:** No purple/blue gradients, no glassmorphism, no excessive rounded cards, no glowing effects, no "sparkle" icons.
- **Restraint & Professionalism:** Use a restrained professional color palette (mostly grays, pure white/black, with one semantic primary color). Avoid decorative blobs or gradient text.
- **Typography:** Consistent, modern typography (Inter, Roboto, or standard system fonts). Respect visual hierarchy.
- **Spacing & Grid:** Strong spacing using a strict 4px/8px grid system. Realistic information density—avoid over-spacing that looks like a landing page, and avoid cramped dashboards.
- **Shadows & Depth:** Minimal and realistic. Do not use excessive or colored shadows. Flat design with subtle borders is often better than elevated cards.

## Components & Icons
- **Icons:** Use exclusively **Lucide icons**. No random icon libraries or emojis for primary UI elements.
- **Data & Content:** Use realistic data patterns instead of fake/demo-looking content. Do not use generic "lorem ipsum" where real context can be provided.
- **Feedback States:** Polished empty states, error states, and loading states. Use proper skeleton loading instead of spinning wheels for layout content.
- **Motion:** Subtle purposeful motion. Only use animations that provide context (e.g., drawer sliding in, dropdown fading in). No excessive bouncing or spring animations.

## Accessibility & Responsiveness
- **WCAG 2.2 AA:** Ensure accessible contrast ratios for all text. Use semantic HTML elements.
- **Keyboard Navigation:** All interactive elements must be focusable and have visible focus states.
- **Mobile-First:** Ensure responsive mobile UX. Data tables and dashboards must gracefully degrade on smaller screens.

## Technical Implementation (Next.js/React)
- Use standard component architectures.
- Ensure strict design-system consistency across all views.

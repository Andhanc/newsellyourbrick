---
name: SellYourBrick
version: alpha
colors:
  surface: "#ffffff"
  surface-muted: "#f8fafc"
  surface-warm: "#f4f7f5"
  ink: "#0f172a"
  ink-soft: "#475569"
  ink-muted: "#64748b"
  line: "#e2e8f0"
  tiffany: "#0099A9"
  tiffany-dark: "#007d8a"
  tiffany-deep: "#006672"
  tiffany-soft: "#f0fafb"
  on-tiffany: "#ffffff"
  hero-overlay: "rgba(15, 23, 42, 0.62)"
typography:
  display:
    fontFamily: Playfair Display
    fontSize: 3.5rem
    fontWeight: "700"
    fontStyle: italic
    lineHeight: 1.08
    letterSpacing: 0.02em
  headline:
    fontFamily: Playfair Display
    fontSize: 2.25rem
    fontWeight: "700"
    fontStyle: italic
    lineHeight: 1.15
  title:
    fontFamily: Montserrat
    fontSize: 1.05rem
    fontWeight: "700"
    lineHeight: 1.35
  body:
    fontFamily: Montserrat
    fontSize: 1rem
    fontWeight: "400"
    lineHeight: 1.75
  body-lg:
    fontFamily: Montserrat
    fontSize: 1.125rem
    fontWeight: "400"
    lineHeight: 1.7
  label-caps:
    fontFamily: Montserrat
    fontSize: 0.75rem
    fontWeight: "700"
    lineHeight: 1.2
    letterSpacing: 0.14em
rounded:
  sm: 8px
  md: 12px
  lg: 16px
  xl: 20px
  full: 9999px
spacing:
  unit: 8px
  section: 88px
  container: 1160px
  gutter: 24px
  prose: 42rem
components:
  button-primary:
    backgroundColor: "{colors.tiffany}"
    textColor: "{colors.on-tiffany}"
    typography: "{typography.title}"
    rounded: "{rounded.full}"
    padding: 14px 22px
  button-primary-hover:
    backgroundColor: "{colors.tiffany-dark}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: 14px 22px
  button-ghost-light:
    backgroundColor: transparent
    textColor: "{colors.on-tiffany}"
    rounded: "{rounded.full}"
  card-editorial:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "{spacing.gutter}"
  card-property:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
  section-muted:
    backgroundColor: "{colors.surface-muted}"
---

## Overview

SellYourBrick reads like the **About** page of an international premium real estate brokerage — the editorial register of Knight Frank, Compass, or Sotheby's International Realty, not a SaaS startup landing.

The audience is buyers, sellers, and investors who expect **photography, calm hierarchy, and trust**. The page is photo-led, typographically restrained, and uses Tiffany green as a **single accent** for labels, links, key figures, and primary actions — never as a full-page wash or gradient headline fill.

Surfaces are warm white and soft gray. Typography pairs **Playfair Display** (display headlines, italic) with **Montserrat** (body, UI). Whitespace is generous; sections breathe.

## Colors

A neutral editorial base with one accent.

- **Surface** `{colors.surface}` — primary page canvas, cards on white.
- **Surface muted** `{colors.surface-muted}` — alternating section backgrounds; subtle, never tinted green.
- **Ink** `{colors.ink}` — headlines and primary text; deep slate, not pure black.
- **Ink soft** `{colors.ink-soft}` — body copy and descriptions.
- **Tiffany** `{colors.tiffany}` — accent only: kicker labels, stat figures, primary buttons, thin rules, link hover. Appears on **one element per viewport region**, not everywhere at once.
- **Tiffany soft** `{colors.tiffany-soft}` — callout backgrounds and CTA bands; use sparingly.
- **Hero overlay** `{colors.hero-overlay}` — bottom-weighted gradient on photography so white type remains legible.

## Typography

- **Display** — Playfair Display italic for page title and major section heads. One display size per viewport; no stacked display lines competing.
- **Title** — Montserrat semibold for card titles and table headers.
- **Body** — Montserrat regular, line-height 1.75; max measure ~42rem for long prose.
- **Label caps** — Montserrat bold, uppercase, letter-spaced kickers above section titles.

## Layout

- **Container** max-width `{spacing.container}`, horizontal gutter `{spacing.gutter}`.
- **Section** vertical padding ~`{spacing.section}`; alternate `surface` and `surface-muted`.
- **Split blocks** — 50/50 image and copy on desktop; image first on mobile for story sections.
- **Property direction cards** — 2×2 grid; **image on top, text below** (portal/card pattern, not horizontal thumbnails).
- **Metrics strip** — single row, vertical dividers, centered figures; no animation.

## Elevation & Depth

Flat editorial UI. Depth comes from **photography and typography**, not shadows.

- Cards: 1px `{colors.line}` border or none; no drop shadows on content cards.
- Hero and CTA: depth from photo + gradient overlay only.
- Hover: border-color shift to Tiffany at 45% opacity; no lift, scale, or glow.

## Shapes

- Cards and images: `{rounded.lg}` (16px).
- Buttons: `{rounded.full}` pills.
- No glassmorphism, no neon, no 3D scenes, no particle effects.

## Components

### Buttons

Primary: Tiffany fill, white label. Secondary: white fill on dark hero, ink text on light sections. Ghost: outline on hero only.

### Editorial cards

Property-type cards are full clickable surfaces with 4:3 image area and padded text block below.

### Pricing

Reuse existing subscription cards inside a clean white section; seller fees in a minimal bordered table.

## Do's and Don'ts

- **Do** lead with full-bleed property photography and serif headlines.
- **Do** keep Tiffany scarce — one accent role per block.
- **Do** use real listing/showcase imagery for property categories.
- **Do** respect `prefers-reduced-motion`; no decorative animation.
- **Don't** use Three.js, floating 3D, spinning rings, or parallax gimmicks.
- **Don't** use gradient text, glowing checkmarks, or startup-style feature grids with icons.
- **Don't** crowd sections; prefer fewer blocks with more air.
- **Don't** use mint-green full-page backgrounds or heavy callout pills.

---
name: design-md
description: Apply DESIGN.md visual identity to UI work. Use when building or redesigning pages, components, or styles for SellYourBrick. Read project DESIGN.md first; follow prose over raw tokens; respect Do's and Don'ts.
---

# DESIGN.md workflow

Before implementing UI, read the project root `DESIGN.md` (YAML tokens + markdown prose).

## Priority order

1. **Prose sections** (Overview, Do's and Don'ts) — define intent and reference aesthetic.
2. **Token names in prose** — map decisions to `{colors.*}`, `{typography.*}`, etc.
3. **YAML tokens** — exact values for CSS variables and components.
4. **Component tokens** — button/card recipes when present.

## Rules from DESIGN.md philosophy

- A **specific reference** beats adjectives ("premium brokerage About page" > "modern clean trustworthy").
- **Negative constraints** matter: if DESIGN.md says no gradients/3D/glow, do not add them.
- Tokens are **context**, not mandatory inline values — express intent in layout and hierarchy.
- One **accent color** per region; do not flood the UI with brand color.

## Implementation checklist

- [ ] Map `colors.*` to CSS custom properties on page root or shared theme.
- [ ] Use typography tokens: display = Playfair italic, body = Montserrat.
- [ ] Section rhythm: alternate `surface` / `surface-muted`, generous vertical padding.
- [ ] Photography-led hero with bottom gradient overlay, left-aligned editorial copy.
- [ ] Property cards: image on top, text below (portal pattern).
- [ ] No decorative animation; `prefers-reduced-motion` respected.
- [ ] Validate contrast for text on photos (overlay if needed).

## Lint (optional)

```bash
npx -p @google/design.md designmd lint DESIGN.md
```

## References

- `DESIGN.md` — SellYourBrick brand (project root)
- `PHILOSOPHY.md` — why prose leads tokens
- `spec.md` — format schema

# Mobile Home Strategy Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the four strategy cards on the routed home page into a compact smartphone-only swipe rail with quiet strategy-specific 3D artwork.

**Architecture:** Keep `HomeRedesignPage` and its existing `STRATEGIES` navigation contract. Add one decorative mobile asset per strategy and reveal the new artwork, labels, and CTA only inside the existing `max-width: 600px` layout while preserving the desktop and tablet grid.

**Tech Stack:** React 19, CSS scroll snap, Node test runner, Vite, generated WebP assets.

## Global Constraints

- Only the smartphone presentation changes.
- Desktop and tablet retain their current grid, artwork visibility, and behavior.
- Strategy routes and keyboard activation remain unchanged.
- Cards work from 320 to 480 px without page-level horizontal overflow.
- Decorative artwork contains no text, logos, or watermarks.

---

### Task 1: Smartphone artwork contract

**Files:**
- Create: `src/pages/home-redesign/HomeRedesignPage.mobile-strategies.test.js`
- Modify: `src/pages/home-redesign/HomeRedesignPage.jsx`
- Create: `public/images/home-sale-formats/mobile/sale-format-auction-3d.webp`
- Create: `public/images/home-sale-formats/mobile/sale-format-buy-now-3d.webp`
- Create: `public/images/home-sale-formats/mobile/sale-format-shares-3d.webp`
- Create: `public/images/home-sale-formats/mobile/sale-format-debts-3d.webp`

**Interfaces:**
- Consumes: each `STRATEGIES` item with its existing `id`, `headline`, `text`, `icon`, and `to` values.
- Produces: a new `mobileImage` path plus decorative `.hr-strategy-stat-card__visual`, number, and CTA children.

- [ ] **Step 1: Write the failing artwork test**

Assert that the routed page defines all four mobile WebP paths and renders the visual, number, and CTA elements.

- [ ] **Step 2: Verify RED**

Run: `node --test src/pages/home-redesign/HomeRedesignPage.mobile-strategies.test.js`

Expected: FAIL because the four images and mobile children are absent.

- [ ] **Step 3: Generate and persist the coordinated artwork**

Generate four square editorial 3D miniatures with soft studio lighting, matte ceramic architecture, subtle glass/metal details, warm restrained colors, subjects concentrated in the lower-right area, clean negative space for copy, and no typography or branding. Save them as 900×900 WebP files at the exact paths above.

- [ ] **Step 4: Add the mobile artwork children**

Add `mobileImage` to each strategy and render the decorative image with `alt=""`, `aria-hidden="true"`, lazy loading, and async decoding. Add the formatted `01–04` label and non-semantic CTA text without changing the article click or keyboard handlers.

- [ ] **Step 5: Verify GREEN**

Run: `node --test src/pages/home-redesign/HomeRedesignPage.mobile-strategies.test.js`

Expected: the artwork contract test passes.

### Task 2: Bounded smartphone swipe rail

**Files:**
- Modify: `src/pages/home-redesign/HomeRedesignPage.mobile-strategies.test.js`
- Modify: `src/pages/home-redesign/HomeRedesignPage.css`

**Interfaces:**
- Consumes: the existing strategy list and newly added decorative children.
- Produces: scroll-snap cards sized with `clamp(16.5rem, 86vw, 24rem)` and `clamp(20.5rem, 92vw, 24rem)`.

- [ ] **Step 1: Write failing responsive assertions**

Assert that the `max-width: 600px` block provides column flow, bounded width and height, horizontal scroll snap, muted artwork, and a separate `max-width: 359px` refinement.

- [ ] **Step 2: Verify RED**

Run: `node --test src/pages/home-redesign/HomeRedesignPage.mobile-strategies.test.js`

Expected: FAIL because the current phone layout is still a two-column grid.

- [ ] **Step 3: Implement the smartphone-only styles**

Inside `@media (max-width: 600px)`, change only the strategy cards to a hidden-scrollbar horizontal rail, reveal the background artwork at restrained opacity, keep copy and CTA above it, and expose the next-card edge. Add an extra `@media (max-width: 359px)` rule for smaller padding and type.

- [ ] **Step 4: Verify automated checks**

Run: `node --test src/pages/home-redesign/HomeRedesignPage.mobile-strategies.test.js`

Expected: both tests pass.

- [ ] **Step 5: Verify responsive rendering and build**

At 320, 360, 390, 430, and 480 px confirm that the next card is visible, card content remains inside its bounds, `scroll-snap-type` is active, and the document has no horizontal overflow. At 1440 px confirm four desktop columns and hidden mobile artwork.

Run: `npm run build`

Expected: Vite production build exits successfully.

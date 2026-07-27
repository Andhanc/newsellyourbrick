# Compact Mobile Property Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show two complete property cards and part of a third in every mobile home showcase without removing information or actions.

**Architecture:** Keep the shared auction, shares, and debts card markup unchanged. Add route-scoped overrides under `.hr-page .hr-showcases` in `HomeRedesignPage.css`, so only the routed home at `max-width: 600px` receives the dense card geometry.

**Tech Stack:** CSS flex scroller, container-aware property cards, Node test runner, Vite.

## Global Constraints

- Mobile slot width is `clamp(8.4rem, 43vw, 15rem)` with an 8 px gap, so two cards fit and the third remains partial from 320 through 600 px.
- All existing information and buttons remain in the DOM and visible.
- Long location and title copy are bounded with ellipsis or line clamp.
- Desktop and tablet styling remains unchanged.
- Changes cover auction, buy-now, shares, and debts showcases.

---

### Task 1: Mobile density contract

**Files:**
- Create: `src/pages/home-redesign/HomeRedesignPage.mobile-property-cards.test.js`
- Modify: `src/pages/home-redesign/HomeRedesignPage.css`

**Interfaces:**
- Consumes: `.home-showcase__slot`, `.auction-card`, `.shares-v2-card`, and `.debts-property-card` markup.
- Produces: a phone-only width contract and bounded text/media geometry.

- [ ] **Step 1: Write the failing layout test**

Assert that the `max-width: 600px` rules set 43vw bounded slots, 8 px gaps, 3:2 media, an overlaid timer, two-line titles, one-line locations, one-row price panels, and stacked actions.

- [ ] **Step 2: Verify RED**

Run: `node --test src/pages/home-redesign/HomeRedesignPage.mobile-property-cards.test.js`

Expected: FAIL because the current phone slot displays about 1.18 cards.

- [ ] **Step 3: Add the mobile-only showcase geometry**

Override slot width, media aspect ratio, body padding, typography, chips, price panels, buttons, and per-card metrics inside the existing phone breakpoint. Keep all selectors prefixed by `.hr-page .hr-showcases`.

- [ ] **Step 4: Verify GREEN**

Run: `node --test src/pages/home-redesign/HomeRedesignPage.mobile-property-cards.test.js`

Expected: all assertions pass.

### Task 2: Responsive browser verification

**Files:**
- Modify if needed: `src/pages/home-redesign/HomeRedesignPage.css`

- [ ] **Step 1: Check five phone widths**

At 320, 360, 390, 430, and 480 px verify page overflow is false, two slots fit, the next slot edge is visible when three fixtures exist, and each content block remains within its card.

- [ ] **Step 2: Check all card variants**

Inspect auction/buy-now, shares, and debts cards for readable title, location, metrics, prices, progress/timer, and every action button.

- [ ] **Step 3: Check desktop isolation**

At 1440 px verify the existing slot formula and card sizes remain active.

- [ ] **Step 4: Run final verification**

Run: `node --test src/pages/home-redesign/HomeRedesignPage.mobile-strategies.test.js src/pages/home-redesign/HomeRedesignPage.mobile-property-cards.test.js`

Run: `npm run build`

Expected: all tests and the production build pass.

# Auction App-First Mobile Marketplace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/auction` at 320–767px as a premium, photo-first mobile marketplace with truthful lot states, two cards per row, 16 lots per page, persistent favourites, and guided filters.

**Architecture:** Preserve the existing server data, auction guards, routes, desktop catalogue, and `PropertyFavoritesContext`. Add only auction-scoped mobile presentation: a compact photographic hero, deterministic 16-item pagination, a generated raster final-state tape, and mobile-only card/detail density rules. Reuse the existing animated filter drawer and buyer empty-state primitives.

**Tech Stack:** React 19, React Router 6, existing Montserrat/tokens, Lucide and React Icons, Framer Motion, Node `node:test`, Vite 5.

## Global Constraints

- Reference viewport is 390 × 844 CSS pixels and the route remains usable from 320px upward.
- Render exactly two catalogue cards per row from 320px through 767px.
- Render at most 16 lots per page and use explicit pagination after that.
- Do not invent ratings, discounts, review counts, yield, or availability.
- Keep favourites in `PropertyFavoritesContext`; do not introduce page-local favourites.
- Final lots distinguish sold from auction-ended, block stale money actions, and use the real raster caution-tape asset.
- Touch targets are at least 44 × 44px and motion respects `prefers-reduced-motion`.
- Desktop behaviour and non-auction routes remain unchanged.

---

### Task 1: Lock the mobile catalogue contract

**Files:**
- Create: `src/components/PropertyList.auction-app-first-mobile.test.js`
- Modify: `src/components/PropertyList.jsx`

**Interfaces:**
- Produces: `AUCTION_MOBILE_PAGE_SIZE = 16`, mobile pagination using the existing `auctionPage`, and an auction-mobile catalogue heading.

- [ ] Write source-contract tests for a 16-item mobile slice, no mobile load-more expansion, semantic pagination, and truthful result count.
- [ ] Run the focused test and confirm RED against the current 9-item load-more behaviour.
- [ ] Implement the smallest route-scoped pagination and heading change.
- [ ] Run the focused test and confirm GREEN.

### Task 2: Replace the compressed website hero with an app-first photographic hero

**Files:**
- Modify: `src/components/Hero.jsx`
- Modify: `src/components/Hero.css`
- Modify: `src/components/AuctionMobileHero.layout.test.js`

**Interfaces:**
- Consumes: existing `auctionScene` flag and real `AUCTION_HERO_BG` image.
- Produces: mobile-only hero copy, browse CTA, and compact guidance chips without synthetic property facts.

- [ ] Rewrite the existing hero layout test for the new photo-first mobile structure and run it RED.
- [ ] Render a dedicated auction mobile composition while preserving the current desktop cards.
- [ ] Add mobile-only measured typography and spacing with no page overflow.
- [ ] Run the focused test GREEN.

### Task 3: Give final lots a real caution-tape ribbon and premium two-column density

**Files:**
- Create: `public/images/auction/final-state-tape.png`
- Modify: `src/components/AuctionPropertyCard.jsx`
- Modify: `src/components/AuctionPropertyCard.css`
- Modify: `src/components/ui/AuctionMobileLayout.css`
- Create: `src/components/AuctionPropertyCard.app-first-mobile.test.js`

**Interfaces:**
- Consumes: `resolveBuyerListingState(property)` and the generated transparent raster tape.
- Produces: labelled sold/ended tape, 44px favourite/final actions, photo-first card body, and no stale bid/purchase controls.

- [ ] Write source-contract tests for the raster image, distinct state copy, two-column grid, and minimum mobile actions; run RED.
- [ ] Replace the auction-card shared CSS-pattern ribbon with the generated raster presentation.
- [ ] Refine the mobile card into a compact product-card hierarchy without removing real area/room/price data.
- [ ] Run focused tests GREEN.

### Task 4: Verification

**Files:**
- Create: `docs/superpowers/qa/2026-07-17-auction-app-first-mobile-qa.md`

- [ ] Run all focused auction/listing/ribbon tests and `git diff --check`.
- [ ] Run the production build.
- [ ] Inspect `/auction` in the in-app browser at 320, 390, 430, and 767px; verify no horizontal overflow, two columns, search, filter drawer, pagination, favourites, and final-state cards.
- [ ] If browser access is unavailable, record the exact blocker and do not claim visual QA passed.
- [ ] Do not commit; return changed files, verification evidence, and remaining risks to the parent task.

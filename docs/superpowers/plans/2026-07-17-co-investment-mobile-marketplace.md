# Co-Investment Mobile Marketplace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Follow TDD and keep the route composition distinct from Test Drive and generic catalogues.

**Goal:** Turn `/co-investment` into a truthful, app-first portfolio marketplace using only real API data, a 2×8 mobile grid, persistent favourites, final-state ribbons, and guided empty/error states.

**Architecture:** Keep API/filter ownership in `Shares.jsx`, extract deterministic presentation logic into a small tested utility, and append a route-specific `CoInvestment.mobile.css` after legacy `Shares.css` so mobile design does not leak into `/debts`. Reuse `PropertyFavoritesContext`, `BuyerStatusRibbon`, `resolveBuyerListingState`, `ListingPagePagination`, and existing accessible filter drawer APIs.

**Tech Stack:** React, React Router, react-icons, CSS, Node test runner, Vite.

## Global Constraints

- Mobile reference is 390×844 and must work without horizontal overflow at 320/375/390/430px.
- Show exactly two cards per row and at most 16 real properties per active page.
- Never pad API data with generated listings or present hardcoded users, AUM, return, or balance as live facts.
- Unknown values render as `—` or a truthful explanatory label; forecast return is labelled as forecast.
- Favourites use `PropertyFavoritesContext`; sold-out/final listings use the shared semantic resolver and diagonal `BuyerStatusRibbon`.
- Touch targets are at least 44×44px; visible mobile text is at least 11px; motion respects reduced motion.
- Do not modify Test Drive, Compare, Debts, Header, or shared global CSS.

### Task 1: Lock truthful catalogue behaviour

**Files:**
- Modify: `src/pages/Shares.mobile-catalog.test.js`
- Create: `src/utils/sharesMarketplacePresentation.test.js`
- Create: `src/utils/sharesMarketplacePresentation.js`

- [ ] Add failing tests proving no synthetic padding/demo list, no hardcoded portfolio facts, truthful unknown/forecast labels, `PAGE_SIZE = 16`, pure 16-item pagination, and final-state CTA blocking.
- [ ] Run the focused tests and record RED.
- [ ] Implement only pure normalisation/pagination/state helpers required by the tests.

### Task 2: Rebuild the route as a portfolio marketplace

**Files:**
- Modify: `src/pages/Shares.jsx`
- Create: `src/pages/CoInvestment.mobile.css`
- Modify: `src/components/SharesPropertyCard.jsx`
- Modify: `src/components/SharesPropertyCard.css`
- Modify: `src/pages/Shares.mobile-catalog.test.js`

- [ ] Remove generated catalogue padding and local pre-liked favourites.
- [ ] Wire `usePropertyFavorites`, real loading/error/empty states, and a functional portfolio/catalogue CTA.
- [ ] Add real pagination using 16 items, resetting page on query/filter/sort changes and scrolling to the grid on page changes.
- [ ] Render two-column mobile investment cards with photography, minimum entry, available share/progress, clearly labelled forecast return, 44px actions, and shared final-state ribbon. Sold-out cards must not offer invest.
- [ ] Use a compact dark-emerald/pearl portfolio header based only on confirmed API/user data; guests see an explanatory value proposition instead of invented account totals.
- [ ] Import `CoInvestment.mobile.css` after legacy styles and scope all rules under the route root.
- [ ] Run focused tests, `git diff --check`, and browser QA at 320/390/430px.

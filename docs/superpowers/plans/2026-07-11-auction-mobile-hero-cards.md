# Auction Mobile Hero Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enlarge the three mobile auction hero images, add an occasional staggered turquoise-blue surface shimmer, and remove the mobile auction breadcrumb row.

**Architecture:** Keep the existing `Hero` structure and scope the visual treatment through the existing `hero-features--static-mobile` auction-only class. Remove the breadcrumb render path and its viewport state from `Home.jsx`; verify the source contract with a focused Node test and then inspect the rendered mobile page.

**Tech Stack:** React 19, CSS media queries and keyframes, Node.js test runner, Vite.

## Global Constraints

- Apply the change only to the auction page at viewport widths up to 768px.
- Preserve desktop behavior and non-auction `Hero` behavior.
- Use 82px images at 481–768px and 68px images at widths up to 480px.
- Do not add a permanent glowing border or outline.
- Disable shimmer for `prefers-reduced-motion: reduce`.

---

### Task 1: Mobile auction hero contract

**Files:**
- Create: `src/components/AuctionMobileHero.layout.test.js`
- Modify: `src/pages/Home.jsx`
- Modify: `src/pages/Home.css`
- Modify: `src/components/Hero.css`
- Modify: `docs/superpowers/plans/2026-07-11-auction-mobile-hero-cards.md`

**Interfaces:**
- Consumes: `Hero`'s existing `staticMobileCards` prop and generated `.hero-features--static-mobile` class.
- Produces: auction-only mobile shimmer CSS, responsive image sizes, and a `Home` render tree without the mobile breadcrumb block.

- [x] **Step 1: Write the failing source/layout test**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const heroCss = await readFile(new URL('./Hero.css', import.meta.url), 'utf8')
const homeJsx = await readFile(new URL('../pages/Home.jsx', import.meta.url), 'utf8')

test('adds an occasional staggered shimmer to static mobile auction cards', () => {
  assert.match(heroCss, /@keyframes hero-auction-card-shimmer/)
  assert.match(heroCss, /animation:\s*hero-auction-card-shimmer 7\.5s/)
  assert.match(heroCss, /nth-child\(2\)[\s\S]*animation-delay:\s*2\.5s/)
  assert.match(heroCss, /nth-child\(3\)[\s\S]*animation-delay:\s*5s/)
  assert.match(heroCss, /prefers-reduced-motion:\s*reduce[\s\S]*animation:\s*none/)
})

test('enlarges static mobile auction artwork at both phone breakpoints', () => {
  assert.match(heroCss, /hero-feature-image__img[\s\S]*width:\s*82px;[\s\S]*height:\s*82px/)
  assert.match(heroCss, /@media \(max-width:\s*480px\)[\s\S]*hero-feature-image__img[\s\S]*width:\s*68px;[\s\S]*height:\s*68px/)
})

test('does not render a mobile auction breadcrumb block', () => {
  assert.doesNotMatch(homeJsx, /PageBreadcrumbs/)
  assert.doesNotMatch(homeJsx, /isMobileViewport/)
})
```

- [x] **Step 2: Run the focused test and verify RED**

Run: `node --test src/components/AuctionMobileHero.layout.test.js`

Expected: FAIL because shimmer keyframes are absent, image sizes are still 68px/54px, and `Home.jsx` still renders `PageBreadcrumbs`.

- [x] **Step 3: Remove the mobile breadcrumb render path**

Delete the `PageBreadcrumbs` import, `MOBILE_BREAKPOINT`, `isMobileViewport` state/effect, and the conditional breadcrumb JSX from `Home.jsx`. Remove the obsolete `.page-context-heading--home-auction` breadcrumb rules from `Home.css`, while preserving the mobile order of the hero and listing.

- [x] **Step 4: Add the auction-only surface shimmer and larger images**

In the mobile `.hero-features--static-mobile .hero-feature-card--static` rules, use an absolutely positioned `::after` pseudo-element with a low-opacity diagonal turquoise-blue-white gradient. Animate its horizontal translation for a short portion of a 7.5-second cycle, set 2.5s and 5s delays on cards two and three, keep it above the surface with non-interactive stacking, and disable the pseudo-element animation inside the reduced-motion query. Set the responsive image dimensions to 82px and 68px.

- [x] **Step 5: Run the focused test and verify GREEN**

Run: `node --test src/components/AuctionMobileHero.layout.test.js`

Expected: 3 tests pass, 0 fail.

- [x] **Step 6: Run build and visual verification**

Run: `npm run build`

Expected: Vite exits with status 0.

Start the existing local app if needed and inspect `/auction` at 390px and 585px widths. Confirm three visible cards, larger unclipped images, readable titles, surface-only shimmer, and no breadcrumb row.

- [x] **Step 7: Commit the focused change**

```bash
git add docs/superpowers/plans/2026-07-11-auction-mobile-hero-cards.md src/components/AuctionMobileHero.layout.test.js src/components/Hero.css src/pages/Home.jsx src/pages/Home.css
git commit -m "feat: refresh mobile auction hero cards"
```

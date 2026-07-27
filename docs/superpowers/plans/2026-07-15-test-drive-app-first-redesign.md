# Test Drive App-First Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/test-drive` as the approved immersive mobile travel-commerce experience while preserving desktop behaviour and existing integrations.

**Architecture:** Keep filtering, pagination, navigation, and API mapping in `TestDriveLandingPage.jsx`, but replace the mobile information hierarchy with an immersive hero and integrated action card. Reuse the real pool/property raster assets, accessible filter drawer, and pagination component. Route-specific CSS creates a phone composition without imposing it on other buyer pages.

**Tech Stack:** React 18, React Router, react-icons, CSS, Node test runner, Vite.

## Global Constraints

- Reference viewport is 390 × 844 and support begins at 320px.
- Selected concept 3 requires a full-bleed Mediterranean hero, integrated white action card, and two property cards per row.
- `PAGE_SIZE` is exactly `16`; `ListingPagePagination` appears for more than one page.
- Use real raster imagery and the existing icon library; no CSS art, emoji, inline SVG, or placeholders.
- Primary touch targets are at least 44 × 44px; the desktop floating header is not shown on phones.
- Hero CTA, search, filter drawer, favourites, property opening, and pagination remain functional.
- No horizontal overflow at 320, 375, 390, or 430px.
- Do not stage unrelated user changes or Vite metadata.

---

### Task 1: Lock the selected structure with tests

**Files:**
- Modify: `src/pages/TestDriveLandingPage.mobile.test.js`
- Test: `src/pages/TestDriveLandingPage.mobile.test.js`

**Interfaces:**
- Consumes: source strings from `TestDriveLandingPage.jsx` and `.css`.
- Produces: regression assertions for hero card/copy/CTA, two columns, page size, and narrow-phone support.

- [ ] Add assertions for `PAGE_SIZE = 16`, `.test-drive-hero-card`, approved copy, functional CTA target, and a two-column grid with no 374px one-column override.
- [ ] Run `node --test src/pages/TestDriveLandingPage.mobile.test.js`; expect failure on the new structure.

### Task 2: Build the immersive hero and action card

**Files:**
- Modify: `src/pages/TestDriveLandingPage.jsx`
- Modify: `src/pages/TestDriveLandingPage.css`
- Modify: `src/pages/TestDriveLandingPage.mobile.test.js`

**Interfaces:**
- Consumes: `HERO_IMAGE`, `navigate`, `Header`, catalogue id `test-drive-catalog`.
- Produces: `scrollToCatalog()` and `.test-drive-hero-card`.

- [ ] Add `scrollToCatalog()` using `scrollIntoView({ behavior: 'smooth', block: 'start' })`.
- [ ] Render compact hero utilities, approved title/context, destination “Марбелья, Испания”, dates “12 авг — 18 авг”, trust cues, CTA, and `/profile/bookings` link.
- [ ] At `max-width: 640px`, create a tall full-bleed image composition with readable overlay, integrated white card, 44px controls, and an organic lower edge.
- [ ] Run `node --test src/pages/TestDriveLandingPage.mobile.test.js`; expect pass.

### Task 3: Polish the two-column commerce grid

**Files:**
- Modify: `src/pages/TestDriveLandingPage.jsx`
- Modify: `src/pages/TestDriveLandingPage.css`
- Test: `src/pages/TestDriveLandingPage.mobile.test.js`

**Interfaces:**
- Consumes: `pageListings`, existing favourite/open handlers, `ListingPagePagination`.
- Produces: stable 2×8 active-page grid and app-like paging.

- [ ] Render “Дома, в которых можно пожить” once, followed by compact count and supporting copy.
- [ ] Use a deliberate image ratio, 14–18px radii, 11–15px mobile type, one-line location, and a 44px favourite target.
- [ ] Preserve two columns at 320px by reducing gaps/padding instead of collapsing; keep `PAGE_SIZE = 16` and existing drawer/pagination APIs.
- [ ] Run the focused test and `npm run build`; both must exit 0.
- [ ] Commit only the Test Drive JSX/CSS/test and these plan/spec files as `feat: rebuild mobile test drive experience`.

### Task 4: Browser interaction and visual QA

**Files:**
- Create or modify: `design-qa.md`

**Interfaces:**
- Consumes: selected concept image and rendered `/test-drive`.
- Produces: interaction evidence and passing visual QA.

- [ ] Capture hero, catalogue, and filter drawer at 390 × 844 in the configured in-app browser.
- [ ] Test hero CTA, search/clear, drawer open/close, favourite toggle, property opening, paging where available, and console errors.
- [ ] Place source and implementation screenshots in one comparison input; fix every P0/P1/P2 typography, spacing, colour, imagery, copy, or interaction issue and recapture.
- [ ] Check 320 × 844, 375 × 812, 390 × 844, and 430 × 932 for two columns and zero horizontal overflow.
- [ ] Record paths, states, comparison history, interaction and console checks in `design-qa.md` with exact final line `final result: passed`.


# Home News Editorial Block Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current home-page news mosaic with a polished single-row news rail that uses the site typography and has a purpose-built phone layout.

**Architecture:** Keep the feature local to `HomeRedesignNewsSection` so the shared seller-landing news component is unaffected. Render four equal stories from the existing localized news keys, then style the block in a dedicated CSS file as a single desktop row that becomes a mobile scroll-snap rail.

**Tech Stack:** React, React Router, react-i18next, CSS, Node test runner.

## Global Constraints

- Do not start a development server or any long-running process.
- Use the existing Montserrat site font and the home-page teal brand color.
- Preserve localized news copy and navigation to `/news`.
- Mobile cards must support touch scrolling, scroll snapping, safe tap targets, and reduced motion.

---

### Task 1: Lock the news-block contract with a regression test

**Files:**
- Create: `src/pages/home-redesign/HomeRedesignNewsSection.test.js`
- Read: `src/pages/home-redesign/HomeRedesignNewsSection.jsx`
- Read: `src/pages/home-redesign/HomeRedesignNewsSection.css`

**Interfaces:**
- Consumes: the source text of the news component and its dedicated stylesheet.
- Produces: assertions for four equal story cards, Montserrat typography, a single desktop row, and mobile scroll snapping.

- [ ] **Step 1: Write the failing source-contract test**

Use `node:test`, `node:assert/strict`, and `readFile` to assert the new `hr-editorial-news` markup and responsive CSS contract.

- [ ] **Step 2: Run the test and verify it fails**

Run: `node --test src/pages/home-redesign/HomeRedesignNewsSection.test.js`

Expected: FAIL because the dedicated component markup and stylesheet do not exist yet.

### Task 2: Implement the editorial news component

**Files:**
- Modify: `src/pages/home-redesign/HomeRedesignNewsSection.jsx`
- Create: `src/pages/home-redesign/HomeRedesignNewsSection.css`

**Interfaces:**
- Consumes: `useTranslation`, `Link`, existing `sybLandingNews*` localization keys, and `/news` navigation.
- Produces: `.hr-editorial-news` and four `.hr-editorial-news__card` articles in one rail.

- [ ] **Step 1: Build the localized article model**

Map the four existing localized titles and excerpts to their current public images as equal cards.

- [ ] **Step 2: Render accessible editorial cards**

Use links for the full card hit areas, meaningful heading hierarchy, decorative images with empty alt text, visible numbering, and an all-news CTA.

- [ ] **Step 3: Add desktop and phone styling**

Use a four-column single-row grid on desktop. At `max-width: 700px`, turn the same row into a horizontal `scroll-snap-type: x mandatory` rail sized around 78 viewport width, with 44px minimum CTA targets and a visible preview of the next card.

- [ ] **Step 4: Respect reduced motion**

Disable card/image transitions under `prefers-reduced-motion: reduce`.

### Task 3: Verify the implementation

**Files:**
- Test: `src/pages/home-redesign/HomeRedesignNewsSection.test.js`
- Verify: repository build output

- [ ] **Step 1: Run the focused regression test**

Run: `node --test src/pages/home-redesign/HomeRedesignNewsSection.test.js`

Expected: PASS with all news-block assertions successful.

- [ ] **Step 2: Run the production build without starting a server**

Run: `npm run build`

Expected: exit code 0 and a completed Vite production build.

- [ ] **Step 3: Review the final diff**

Run: `git diff --check` and `git diff -- src/pages/home-redesign/HomeRedesignNewsSection.jsx src/pages/home-redesign/HomeRedesignNewsSection.css src/pages/home-redesign/HomeRedesignNewsSection.test.js`

Expected: no whitespace errors and only the scoped news-block changes.

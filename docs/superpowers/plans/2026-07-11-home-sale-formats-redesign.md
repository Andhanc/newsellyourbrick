# Home Sale Formats Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the informational four-format block on the home page with a cinematic, conversion-focused, responsive showcase using four newly generated images.

**Architecture:** Keep `premiumModes` as the shared source for hero navigation and format data, but render the sale-format section through a focused `HomeSaleFormats` component. Give each format a full-card route link, generate project-local raster assets, and isolate a tall editorial carousel in the component stylesheet so legacy `MainPage.css` rules cannot control the redesigned block. The selected visual target is `/var/folders/c8/gpqh9xf946vd864n2qjcts640000gp/T/codex-clipboard-8b6753a3-51c3-4957-a705-7c2402bdbb03.png`.

**Tech Stack:** React 19, React Router, React Icons, CSS Grid, CSS scroll snap, Node test runner, Vite.

## Global Constraints

- Generate four new images from scratch; do not reuse the current format-card or About-page images.
- Do not change destination routes or backend/business logic.
- Keep the whole card keyboard accessible with a visible focus state.
- Respect `prefers-reduced-motion`.
- At 390 px, use a horizontal scroll-snap rail with the next card edge visible and no page-level horizontal overflow.
- Match the selected reference structure: oversized left-aligned heading, round previous/next controls, tall cards, compact pills above the title, image in the lower half, lime first card, warm-neutral remaining cards, and a partially visible next card.

---

### Task 1: Lock the component contract with a failing structure test

**Files:**
- Create: `src/components/HomeSaleFormats.layout.test.js`
- Create: `src/components/HomeSaleFormats.jsx`
- Create: `src/components/HomeSaleFormats.css`

**Interfaces:**
- Consumes: `modes: Array<{ id, number, eyebrow, benefit, proof, to, image }>`.
- Produces: `HomeSaleFormats({ modes })`, a section with one route link per mode.

- [ ] **Step 1: Write the failing test**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const jsx = await readFile(new URL('./HomeSaleFormats.jsx', import.meta.url), 'utf8')
const css = await readFile(new URL('./HomeSaleFormats.css', import.meta.url), 'utf8')

test('renders each format as one fully clickable route card', () => {
  assert.match(jsx, /sale-formats__card/)
  assert.match(jsx, /to=\{mode\.to\}/)
  assert.match(jsx, /Смотреть объекты/)
})

test('provides mobile scroll snap, focus visibility, and reduced motion', () => {
  assert.match(css, /scroll-snap-type:\s*x mandatory/)
  assert.match(css, /\.sale-formats__card:focus-visible/)
  assert.match(css, /prefers-reduced-motion:\s*reduce/)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test src/components/HomeSaleFormats.layout.test.js`

Expected: FAIL because `HomeSaleFormats.jsx` and `HomeSaleFormats.css` do not exist.

- [ ] **Step 3: Create the minimal semantic component and stylesheet**

Implement one `<Link className="sale-formats__card" to={mode.to}>` per mode, semantic heading order, benefit/proof text, a decorative image with meaningful alt text, CTA label, focus styles, mobile scroll snap, and reduced-motion rules.

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test src/components/HomeSaleFormats.layout.test.js`

Expected: 2 tests pass.

### Task 2: Generate and connect the new visual series

**Files:**
- Create: `public/images/home-sale-formats/sale-format-auction.webp`
- Create: `public/images/home-sale-formats/sale-format-buy-now.webp`
- Create: `public/images/home-sale-formats/sale-format-shares.webp`
- Create: `public/images/home-sale-formats/sale-format-debts.webp`
- Modify: `src/pages/MainPage.jsx`

**Interfaces:**
- Consumes: four 3:2 landscape image files at the paths above.
- Produces: `premiumModes` entries with `benefit`, `proof`, `imageAlt`, and the new `image` paths; `MainPage` renders `<HomeSaleFormats modes={premiumModes} />`.

- [ ] **Step 1: Extend the failing test for exact new asset paths and copy**

Add assertions that `MainPage.jsx` imports `HomeSaleFormats`, includes all four `/images/home-sale-formats/` paths, and includes the four approved benefit headlines.

- [ ] **Step 2: Run the test to verify the new assertions fail**

Run: `node --test src/components/HomeSaleFormats.layout.test.js`

Expected: FAIL because `MainPage.jsx` still renders the old block and old images.

- [ ] **Step 3: Generate and validate the four images**

Use built-in Image Gen with one shared art direction: cinematic editorial real-estate photography, warm natural light, deep teal and sand palette, no text, no logos, no watermark. Save each final selected image to its exact project path and inspect it for subject, crop, consistency, and accidental text.

- [ ] **Step 4: Connect the component and remove the old block markup**

Import `HomeSaleFormats` and its CSS, update the four mode records, replace only the existing `premium-models` section with `<HomeSaleFormats modes={premiumModes} />`, and preserve the hero rail and all destination routes. Update `HomeSaleFormats` so the selected reference is the visual truth: a horizontally scrollable rail of tall cards with tags and copy above an image occupying the lower half, a lime first card, neutral subsequent cards, circular functional previous/next buttons, and full-card links. At desktop width show approximately 3.4 cards; at mobile show approximately 1.1 cards.

- [ ] **Step 5: Run the tests and image verification**

Run: `node --test src/components/HomeSaleFormats.layout.test.js && npm run verify:images`

Expected: all layout tests pass and image verification exits 0.

### Task 3: Build and visually verify desktop and mobile

**Files:**
- Modify: `src/components/HomeSaleFormats.css`
- Create or replace: `design-qa.md`

**Interfaces:**
- Consumes: the rendered `/` route and original user screenshot as the before-state reference.
- Produces: verified screenshots at desktop and 390 px mobile plus `design-qa.md` with `final result: passed`.

- [ ] **Step 1: Run production checks**

Run: `node --test src/components/HomeSaleFormats.layout.test.js && npm run build`

Expected: tests pass and Vite reports a successful production build.

- [ ] **Step 2: Open the local home page and capture matching states**

Run the app, open `/` in the in-app Browser, scroll to `#landing-models`, and capture the section at 1440 px and 390 px.

- [ ] **Step 3: Compare and record design QA**

Check image crop, hierarchy, card balance, CTA prominence, text wrapping, focus state, scroll snap, overflow, and console errors. Write the evidence and prioritized findings to `design-qa.md`.

- [ ] **Step 4: Fix every P0–P2 finding and re-check**

Adjust only `HomeSaleFormats.css` or the component copy/markup necessary to resolve the recorded issue, then recapture both viewports.

- [ ] **Step 5: Confirm the final gate**

Run: `rg -n "final result: passed" design-qa.md && node --test src/components/HomeSaleFormats.layout.test.js && npm run build`

Expected: QA status is passed, tests pass, and build succeeds.

# Property AI Content and PDF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce useful structured Property AI answers and a richer branded PDF containing real listing photos and a clearly labelled generated 3D concept.

**Architecture:** Normalize report content at the server contract boundary, resolve listing media before multimodal model calls and PDF rendering, and keep generated concepts separate from listing evidence. The React drawer consumes the structured report instead of relying only on `shortAnswer`.

**Tech Stack:** Node.js, `node:test`, React 19, CSS, Puppeteer, OpenRouter, existing Pollinations image helper

## Global Constraints

- Never present generated imagery as a real listing photo.
- Never invent property facts, market data, legal status, or financial returns.
- Every answer exposes at least two strengths and two risks/checks.
- Real listing photos have priority over generated visuals.
- PDF palette is exactly Tiffany `#0099A9`, ink `#0F172A`, Tiffany soft `#F0FAFB`, white `#FFFFFF`, muted `#64748B`, and line `#E2E8F0`.
- A broken image must not fail PDF creation.

---

### Task 1: Rich report contract

**Files:**
- Modify: `server/services/propertyAiReportContract.test.js`
- Modify: `server/services/propertyAiReportContract.js`

**Interfaces:**
- Consumes: raw model JSON and `{ category, question, property }` context.
- Produces: normalized `directAnswer`, `shortAnswer`, `strengths`, `risks`, `metrics`, `visualPrompt`, `images`, and `pages`.

- [ ] **Step 1: Write failing contract tests**

Add tests proving sparse model output receives at least two factual strengths, two risks/checks, four property metrics when data exists, a direct-answer page, a real-photo gallery page, a visual-concept page, and seven or eight total pages.

- [ ] **Step 2: Verify red**

Run: `node --test server/services/propertyAiReportContract.test.js`
Expected: FAIL because the current contract allows empty strengths/risks and has no gallery or visual page.

- [ ] **Step 3: Implement normalization**

Add deterministic fallback builders using declared area, rooms, location, year, price, image count, and missing-data checks. Normalize `directAnswer` and `visualPrompt`; construct the richer page sequence while keeping listing images safe.

- [ ] **Step 4: Verify green**

Run: `node --test server/services/propertyAiReportContract.test.js`
Expected: PASS.

### Task 2: Listing-image resolution and richer model request

**Files:**
- Create: `server/services/propertyAiImages.js`
- Create: `server/services/propertyAiImages.test.js`
- Modify: `server/propertyAiRoutes.js`
- Modify: `server/services/propertyAiGenerate.js`
- Modify: `server/services/propertyAiGenerate.test.js`

**Interfaces:**
- Produces: `normalizePropertyAiImages(values)`, `propertyAiMediaBaseUrl(env)`, `resolvePropertyAiImageUrl(value, baseUrl)`.
- `requestPropertyAiModel(input, overrides?)` consumes resolved images and a fetch override for tests.
- `attachPropertyAiGeneratedVisual(report, property)` produces `generatedVisuals: [{ url, label, disclaimer }]`.

- [ ] **Step 1: Write failing image and generation tests**

Cover object photo entries (`{ url }`), `/uploads/...` resolution against a base URL, safe `https://` preservation, relative-image inclusion in OpenRouter multimodal content, required richer schema fields, and generated-concept separation.

- [ ] **Step 2: Verify red**

Run: `node --test server/services/propertyAiImages.test.js server/services/propertyAiGenerate.test.js`
Expected: FAIL because the helpers and richer request do not exist.

- [ ] **Step 3: Implement image normalization and model request**

Normalize photos at the route boundary, resolve up to four listing images for Gemini, require `directAnswer`, minimum list/metric content and `visualPrompt` in the JSON schema, strengthen the prompt, and attach one Pollinations concept URL after normalization.

- [ ] **Step 4: Verify green**

Run: `node --test server/services/propertyAiImages.test.js server/services/propertyAiGenerate.test.js`
Expected: PASS.

### Task 3: Branded PDF with real gallery and generated concept

**Files:**
- Modify: `server/services/propertyAiPdfRenderer.test.js`
- Modify: `server/services/propertyAiPdfRenderer.js`

**Interfaces:**
- `renderPropertyAiReportHtml({ report, property, mediaBaseUrl })` returns branded HTML with a safe `<base>` element.
- `waitForPropertyAiImages(page)` waits for every `<img>` to load or fail before printing.
- `renderPropertyAiReportPdf` uses both interfaces without failing on broken images.

- [ ] **Step 1: Write failing renderer tests**

Assert the safe media base, exact brand tokens, listing-gallery markup, `AI-КОНЦЕПТ · НЕ ФОТО ОБЪЕКТА`, listing-photo precedence, and the exported image-settling helper call.

- [ ] **Step 2: Verify red**

Run: `node --test server/services/propertyAiPdfRenderer.test.js`
Expected: FAIL because gallery, concept, base URL, and image-settling behavior are absent.

- [ ] **Step 3: Implement the renderer**

Render page types explicitly, add a real-photo grid and separately labelled concept page, replace legacy neutral colors with brand variables, add graceful placeholders, resolve relative media through `<base>`, and wait for images before calling `page.pdf()`.

- [ ] **Step 4: Verify green**

Run: `node --test server/services/propertyAiPdfRenderer.test.js`
Expected: PASS.

### Task 4: Structured chat answer

**Files:**
- Modify: `src/components/PropertyAiExperience.layout.test.js`
- Modify: `src/components/PropertyAiExperience.jsx`
- Modify: `src/components/PropertyAiExperience.css`

**Interfaces:**
- Consumes: `job.report.directAnswer`, `job.report.strengths`, and `job.report.risks`.
- Produces: direct answer paragraphs plus compact `.property-ai-answer-summary` groups.

- [ ] **Step 1: Write a failing component source test**

Assert the component renders labelled strengths and risks from `job.report` after the progressive direct answer.

- [ ] **Step 2: Verify red**

Run: `node --test src/components/PropertyAiExperience.layout.test.js`
Expected: FAIL because structured answer groups are not rendered.

- [ ] **Step 3: Implement structured rendering**

Prefer `report.directAnswer` for progressive text, fall back to `shortAnswer`, and render up to four strength/risk items in two branded compact cards.

- [ ] **Step 4: Verify green**

Run: `node --test src/components/PropertyAiExperience.layout.test.js src/components/PropertyAiExperience.colors.test.js`
Expected: PASS.

### Task 5: Full verification

**Files:**
- Review: all Property AI files modified above.

- [ ] **Step 1: Run focused tests**

Run: `node --test server/services/propertyAiImages.test.js server/services/propertyAiReportContract.test.js server/services/propertyAiGenerate.test.js server/services/propertyAiPdfRenderer.test.js src/components/PropertyAiExperience.layout.test.js src/components/PropertyAiExperience.colors.test.js`
Expected: all tests pass.

- [ ] **Step 2: Run production build**

Run: `npm run build`
Expected: exit code 0.

- [ ] **Step 3: Review scope and whitespace**

Run: `git diff --check`
Expected: no whitespace errors.

### Task 6: Verified neighborhood enrichment and legacy-process correction

**Files:**
- Create: `server/services/propertyAiNeighborhood.js`
- Create: `server/services/propertyAiNeighborhood.test.js`
- Modify: `server/services/propertyAiGenerate.js`
- Modify: `server/services/propertyAiGenerate.test.js`
- Modify: `server/services/propertyAiReportContract.js`
- Modify: `server/services/propertyAiReportContract.test.js`
- Modify: `server/services/propertyAiPdfRenderer.js`
- Modify: `server/services/propertyAiPdfRenderer.test.js`

**Interfaces:**
- Produces: `parsePropertyCoordinates(value)` and `enrichPropertyAiNeighborhood(property, overrides?)`.
- Adds `nearbyInfrastructure`, `neighborhoodSummary`, and `infrastructureHighlights` to the report pipeline.
- Produces a dedicated `neighborhood` PDF page using verified place names and distances.

- [ ] **Step 1: Write failing neighborhood, generation, contract, and renderer tests**

Cover coordinate parsing, deterministic nearby-place enrichment with fake fetchers, model access to verified infrastructure, `Возможный вывод:` prompt rules, eight/nine-page report composition, and branded infrastructure cards.

- [ ] **Step 2: Verify red**

Run: `node --test server/services/propertyAiNeighborhood.test.js server/services/propertyAiGenerate.test.js server/services/propertyAiReportContract.test.js server/services/propertyAiPdfRenderer.test.js`
Expected: FAIL because neighborhood enrichment and rendering do not exist.

- [ ] **Step 3: Implement verified enrichment and report page**

Use the existing Overpass service with an overall timeout, pass compact facts to Gemini, normalize the new narrative fields, add a dedicated page, and bump the report cache version to `property-ai-v3`.

- [ ] **Step 4: Restart backend and reproduce through the API**

Restart `node server/server.js`, create a report for the affected property, poll until completion, fetch its stored PDF, and verify that the new report model ends in `property-ai-v3`, contains listing images, and uses the current renderer.

- [ ] **Step 5: Verify green and build**

Run all focused Property AI tests and `npm run build`.
Expected: all tests pass and build exits 0.

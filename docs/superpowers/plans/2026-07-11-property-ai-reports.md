# Property AI Reports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an authenticated property-analysis chat that returns a short AI answer and a persistent branded PDF report.

**Architecture:** A focused React experience starts and polls report jobs. Express routes use a raw-SQL PostgreSQL store, a strict OpenRouter JSON generator, and a controlled Puppeteer HTML-to-PDF renderer. The model supplies content only; application code owns layout and file access.

**Tech Stack:** React 19, Express 4, Prisma PostgreSQL raw SQL, OpenRouter chat completions, Puppeteer 24, Node.js built-in test runner.

## Global Constraints

- Default model is `google/gemini-3.5-flash` through OpenRouter.
- Reports use real listing data and photos only.
- Reports contain 6–8 branded pages and label estimates as assumptions, not advice.
- Generation is available only to an existing numeric user ID.
- Existing unrelated worktree changes must remain untouched.

---

### Task 1: Report content contract

**Files:**
- Create: `server/services/propertyAiReportContract.js`
- Test: `server/services/propertyAiReportContract.test.js`

**Interfaces:**
- Produces: `PROPERTY_AI_CATEGORIES`, `normalizePropertyAiRequest(input)`, `normalizePropertyAiReport(input, context)`, and `parsePropertyAiModelContent(content, context)`.

- [ ] Write failing Node tests for category validation, custom-question validation, fenced JSON parsing, six-page normalization, and unsafe image removal.
- [ ] Run `node --test server/services/propertyAiReportContract.test.js` and verify failure because the module is missing.
- [ ] Implement the contract with deterministic fallbacks and bounded string/array lengths.
- [ ] Re-run the test and verify all cases pass.

### Task 2: Branded PDF renderer

**Files:**
- Create: `server/services/propertyAiPdfRenderer.js`
- Test: `server/services/propertyAiPdfRenderer.test.js`

**Interfaces:**
- Consumes: normalized report and normalized property snapshot.
- Produces: `renderPropertyAiReportHtml({ report, property })` and `renderPropertyAiReportPdf({ report, property })`.

- [ ] Write failing tests asserting HTML escaping, real-photo use, disclaimer content, exactly controlled page wrappers, and no scripts.
- [ ] Run the renderer tests and verify failure.
- [ ] Implement a self-contained A4 HTML/CSS report and lazy Puppeteer PDF generation.
- [ ] Re-run tests; additionally assert returned PDF starts with `%PDF` when Chrome is available.

### Task 3: PostgreSQL persistence and migration

**Files:**
- Create: `prisma/migrations/20260711120000_property_ai_reports/migration.sql`
- Create: `server/database/propertyAiReportsPrisma.js`
- Modify: `server/database/database.js`

**Interfaces:**
- Produces: create/find/update/list operations for conversations, messages, and reports, with ownership-scoped reads.

- [ ] Add SQL tables, indexes, foreign keys, status fields, JSON content, and `BYTEA` PDF storage.
- [ ] Implement raw-Prisma functions using parameterized tagged SQL.
- [ ] Export the store from the database entry point.
- [ ] Run `npx prisma validate` and verify the existing schema remains valid.

### Task 4: OpenRouter generation and API routes

**Files:**
- Create: `server/services/propertyAiGenerate.js`
- Create: `server/propertyAiRoutes.js`
- Test: `server/services/propertyAiGenerate.test.js`
- Modify: `server/server.js`

**Interfaces:**
- Consumes: report contract, store, property rows, PDF renderer, `OPENROUTER_API_KEY`.
- Produces: authenticated-by-existing-user start/history/status/PDF endpoints under `/api/property-ai`.

- [ ] Write failing generator tests with an injected model client and renderer, asserting status transitions and PDF-only retry behavior.
- [ ] Run tests and verify failure.
- [ ] Implement strict JSON-schema OpenRouter request, property normalization, status transitions, and timeout handling.
- [ ] Implement routes that validate numeric user IDs against `users`, load properties from the allowed property tables, prevent duplicate active jobs, and enforce report ownership.
- [ ] Register routes after core middleware initialization and run tests.

### Task 5: Frontend property AI experience

**Files:**
- Create: `src/services/propertyAiService.js`
- Create: `src/components/PropertyAiExperience.jsx`
- Create: `src/components/PropertyAiExperience.css`
- Modify: `src/pages/PropertyDetailClassic.jsx`

**Interfaces:**
- Consumes: a property record, existing `isAuthenticated`, `getStoredNumericUserId`, and `requestOpenLoginModal`.
- Produces: launcher, scenario picker, full-screen chat, job polling, report history, preview, and download actions.

- [ ] Implement API helpers with an `X-User-Id` header and normalized errors.
- [ ] Implement the component states `closed`, `picker`, and `chat`, plus `queued`, `analyzing`, `rendering`, `completed`, and `failed` jobs.
- [ ] Implement accessible responsive styling matching the supplied black launcher/picker and light chat references.
- [ ] Insert the component before related content on desktop and before internal links on mobile.
- [ ] Run `npm run build` and fix compile errors.

### Task 6: End-to-end verification

**Files:**
- Modify only files required by discovered verification failures.

**Interfaces:**
- Consumes: all prior tasks.
- Produces: verified feature with documented environment variables.

- [ ] Run all new Node tests.
- [ ] Run `npx prisma validate`.
- [ ] Run `npm run build`.
- [ ] Start the local app and verify launcher, picker, login gate, chat progress, failure retry, and responsive layouts with browser screenshots.
- [ ] Review `git diff --check` and `git status --short`, confirming unrelated changes were not modified.

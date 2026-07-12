# Property AI Tiffany Accent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Property AI's yellow accents with the SellYourBrick Tiffany color in both the chat UI and generated PDF.

**Architecture:** Keep the change scoped to the Property AI component by introducing local CSS custom properties. Mirror the solid brand color in the server-side PDF CSS template and guard both surfaces with one focused source-level test.

**Tech Stack:** CSS, Node.js (`node:test`), Vite

## Global Constraints

- Brand Tiffany is exactly `#0099A9` (case-insensitive in source).
- Dark text and icons remain on solid Tiffany for readable contrast.
- Translucency is used only for the picker hover state on a light/neutral surface.
- Unrelated yellow status colors remain unchanged.

---

### Task 1: Property AI accent regression test and implementation

**Files:**
- Create: `src/components/PropertyAiExperience.colors.test.js`
- Modify: `src/components/PropertyAiExperience.css`
- Modify: `server/services/propertyAiPdfRenderer.js`

**Interfaces:**
- Consumes: Property AI source files as UTF-8 text.
- Produces: local CSS variables `--property-ai-accent` and `--property-ai-accent-soft`; matching Tiffany accents in PDF output CSS.

- [x] **Step 1: Write the failing test**

Create a `node:test` test that reads both source files, rejects `#ffe000`, checks the CSS variable `--property-ai-accent: #0099a9`, and checks that the PDF renderer contains `#0099a9`.

- [x] **Step 2: Run test to verify it fails**

Run: `node --test src/components/PropertyAiExperience.colors.test.js`
Expected: FAIL because both files still contain `#ffe000`.

- [x] **Step 3: Write minimal implementation**

Add the two local custom properties to `.property-ai-experience`, replace solid component accents with `var(--property-ai-accent)`, use `var(--property-ai-accent-soft)` for picker action hover, and replace PDF-template yellow with `#0099a9`.

- [x] **Step 4: Run test and build**

Run: `node --test src/components/PropertyAiExperience.colors.test.js`
Expected: PASS.

Run: `npm run build`
Expected: exit code 0.

- [x] **Step 5: Review the scoped diff**

Run: `git diff -- src/components/PropertyAiExperience.css src/components/PropertyAiExperience.colors.test.js server/services/propertyAiPdfRenderer.js`
Expected: only Property AI accent changes and their regression test.

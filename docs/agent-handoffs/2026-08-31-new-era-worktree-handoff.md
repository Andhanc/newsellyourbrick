# New Era worktree changes — merge handoff

This document records every change included in the companion pull request. The work spans several independent product areas, so merge conflicts must be resolved by preserving each section below rather than treating the PR as a seller-page-only update.

## 1. Seller page Tiffany CTAs

Files:

- `src/pages/SellerPage.css`
- `apps/client/src/legacy/pages/SellerPage.css`

User-visible behavior:

- `Рассчитать продажу` uses white text and a white arrow on its Tiffany background.
- The savings-plan CTAs (`Проверить`, `Рассчитать`, `Подробнее`) use white text and arrows.
- The CTA inside the Tiffany `Маркетинг объекта` card uses a white background with Tiffany text and icon.
- The accent-card title, description, and icon remain white.

Merge note: shared `tiffany-shine-button.css` applies `!important` fill rules to `.seller-services-card a`. Keep the deliberate `!important` overrides for the accent service CTA, including the hover/focus rule and `animation: none`. Keep web and legacy copies synchronized while retaining their existing palette differences.

## 2. Profile history mobile category pagination

Files:

- `src/components/ProfileHistoryExperience.jsx`
- `src/components/ProfileHistoryExperience.css`
- `apps/client/src/legacy/components/ProfileHistoryExperience.jsx`
- `apps/client/src/legacy/components/ProfileHistoryExperience.css`
- `src/pages/BuyerAccountMobileExperience.test.js`

User-visible behavior:

- The horizontal category rail now shows home-style pagination dots below it on mobile.
- Scrolling the rail updates the active dot; clicking a dot smoothly scrolls to the matching rail position.
- Dots include accessible tab semantics, focus styling, and reduced-motion handling.

Merge note: the web and legacy JSX/CSS pairs are expected to remain byte-for-byte identical. Do not keep only one side during conflict resolution.

## 3. Property AI generation, error handling, and Tiffany PDF v2

Files:

- `server/propertyAiRoutes.js`
- `server/services/propertyAiGenerate.js`
- `server/services/propertyAiPdfRenderer.js`
- `server/services/propertyAiReportContract.js`
- their adjacent server tests
- `src/components/PropertyAiExperience.jsx` and adjacent tests
- `apps/client/src/legacy/components/PropertyAiExperience.jsx` and adjacent tests
- `src/services/propertyAiService.js`
- `apps/client/src/legacy/services/propertyAiService.js`

Behavior and contract changes:

- Generated PDFs use the new `tiffany-editorial-v2` landscape presentation system and 7–8 page contract.
- Reports add a dedicated conclusion page; the gallery page is omitted when only one listing image exists.
- Model/report versioning advances to `property-ai-v8:tiffany-editorial-v2` so old generated reports are not reused.
- PDF responses use a versioned filename, expose `X-Property-AI-Template`, and disable browser/proxy caching.
- Client PDF requests add a cache-busting query and use `cache: 'no-store'`.
- If neighborhood enrichment fails, generation continues with listing data.
- If the external model fails, the server builds a factual fallback report and still renders a PDF.
- If the job genuinely fails, both web and legacy chat UIs show an alert and retry action instead of an empty result.

Merge note: preserve the report schema, template version, route response headers, frontend copy (`PDF · 7–8 страниц`), and failure fallback as one coherent contract. Web and legacy Property AI component/service copies must stay synchronized.

## 4. Biometric session lock hardening

Files:

- `src/components/BiometricLockGate.jsx`
- `src/components/BiometricSecurityDrawer.jsx`
- `src/components/BiometricSecurityDrawer.contract.test.js`

Behavior:

- A device remembered as biometrically protected locks immediately instead of waiting for a delayed server check.
- The lock refreshes after Clerk database-user synchronization, storage changes, and window focus.
- Server status still confirms the device state in the background; known protection fails closed during outages.
- A locked drawer disables and hides the underlying app from interaction/accessibility traversal, locks body scrolling, restores previous state on close, and autofocuses the unlock action.

## 5. Compare-picker selection haptics

Files:

- `src/components/compare/CompareMobilePicker.jsx`
- `src/components/compare/CompareMobilePicker.test.js`
- `src/utils/haptics.js`
- `src/utils/haptics.test.js`

Behavior:

- Selection feedback is centralized in `triggerSelectionHaptic`.
- Android-capable browsers receive a 30 ms vibration pulse.
- WebKit receives a native switch-control fallback when the vibration API is unavailable or blocked.
- Drum haptics remain tied to touch scrolling and active-card changes; programmatic selection updates the active-index ref to prevent a false follow-up tick.

## Verification

- `npm run build`
- `git diff --check`
- Seller page computed-style checks at 390 × 844
- Seller CTA text/SVG colors verified as white; accent service CTA verified as white with Tiffany foreground
- Targeted Node test suites for Property AI, biometric lock, profile history, compare picker, and haptic utility: 76/79 passed
- The new profile-history pagination test passes. Three pre-existing assertions in `BuyerAccountMobileExperience.test.js` still fail because their expected legacy strings (`profile-cabinet__invite-row`, `Перейти к торгам`, and `Смотреть объекты`) are already absent from the current New Era implementation; this PR does not alter those product areas.

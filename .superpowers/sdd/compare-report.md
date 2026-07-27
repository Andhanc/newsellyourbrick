# Compare tasks 1–2 report

Status: **DONE**

## Implemented

- Added a deterministic comparison decision model with explicit left/right selection only.
- Added a mobile decision cockpit with a factual score, both property identities, two explicit calculator actions, and non-guarantee copy.
- Removed automatic AI requests when the pair changes.
- Removed the 480 ms automatic subscription drawer.
- Added an explicit AI idle/pending/error/result flow; the drawer can open only from the AI button.
- Persisted and routed only the property the buyer explicitly selected.
- Grouped mobile metrics into `Цена`, `Объект`, and `Комфорт`, with a dark-emerald sticky pair, mint winner cells, and coral incomplete-data notices.
- Kept the desktop comparison table and restored its investor handoff as two explicit object choices.
- Replaced the mobile AI comparison table with compact two-column result cards.

## RED evidence

- `node --test src/utils/compareDecision.test.js`
  - Failed with `ERR_MODULE_NOT_FOUND` for the intentionally absent `compareDecision.js`.
- `node --test src/components/compare/CompareDecisionSummary.test.js src/pages/Compare.explicit-actions.test.js src/components/compare/CompareMobileMetrics.test.js`
  - 6 expected failures: missing decision summary, automatic AI/paywall effects still present, and missing metric grouping/warning styles.
- `node --test src/pages/Compare.explicit-actions.test.js`
  - The added desktop explicit-choice contract failed before the left/right handoff buttons existed.

## GREEN evidence

- Focused command:
  - `node --test src/utils/compareDecision.test.js src/components/compare/CompareDecisionSummary.test.js src/pages/Compare.explicit-actions.test.js src/components/compare/CompareMobileMetrics.test.js src/pages/InvestmentCalculator.compare-context.test.js`
  - Result: **15 passed, 0 failed**.
- `git diff --check`
  - Result: clean.
- JSX parse check with the local esbuild binary for `Compare.jsx`, `CompareDecisionSummary.jsx`, and `CompareMobileMetrics.jsx`
  - Result: exit 0.
- Per parent instruction, no full build was run.

## Changed files

- `src/utils/compareDecision.js`
- `src/utils/compareDecision.test.js`
- `src/components/compare/CompareDecisionSummary.jsx`
- `src/components/compare/CompareDecisionSummary.css`
- `src/components/compare/CompareDecisionSummary.test.js`
- `src/components/compare/CompareMobileMetrics.jsx`
- `src/components/compare/CompareMobileMetrics.css`
- `src/components/compare/CompareMobileMetrics.test.js`
- `src/pages/Compare.jsx`
- `src/pages/Compare.css`
- `src/pages/Compare.explicit-actions.test.js`

No files from Test Drive, Wallet, Calculator, notifications, shared Header, or backend were edited by this task.

## Blocking review fixes — 2026-07-17

Status: **DONE**

- Added an abortable request-id guard for comparison AI requests. Pair changes, a newer request, and unmount all abort and invalidate the old request; stale resolve/reject/finally paths cannot update the active pair.
- Moved the sticky mobile pair below the fixed buyer header with a `96px + safe-area` offset and tightened the 320–360px layout.
- Added final, page-scoped compact AI overrides after the base rules so the cascade cannot restore desktop spacing.
- Added one shared positive-price resolver for the desktop table, decision summary, and mobile pair. Zero/invalid current bids now fall through to the next truthful positive value.
- Added `role="status"`/`aria-live="polite"` to AI pending states, `role="alert"` to errors, and an explicit explanation linked to disabled entitlement controls.
- Gave both replace controls property-specific accessible names.
- Restricted decision scoring to explicitly tagged price signals; area, year, rooms, comfort, display-only, neutral, and unknown rows no longer create an objective winner. Missing comfort source data is shown as `Нет данных`, distinct from a known zero.
- Reworded the summary as comparison signals/orientations and removed the incorrect score noun declension.

### RED evidence

- Focused review suite initially failed **9** checks, including missing request guard module/export, stale-request contracts, price fallback, accessibility roles, CSS order/offset, unique action names, and non-objective summary copy.
- The dedicated missing-comfort test failed before `hasComfortData` and `Нет данных` handling were restored.

### GREEN evidence

- `node --test src/utils/compareDecision.test.js src/utils/compareAiRequestGuard.test.js src/components/compare/CompareDecisionSummary.test.js src/pages/Compare.explicit-actions.test.js src/components/compare/CompareMobileMetrics.test.js src/pages/InvestmentCalculator.compare-context.test.js`
  - Result: **24 passed, 0 failed**.
- Scoped `git diff --check` for all Compare task files: clean.
- Full `git diff --check` is currently blocked by an unrelated concurrent edit in `src/pages/Shares.mobile-catalog.test.js:50` (`new blank line at EOF`); no Shares file was touched by this task.
- JSX bundle parse for `src/pages/Compare.jsx` via local esbuild with public image URLs externalized: exit 0.

Additional compare-only files added by the review fix:

- `src/utils/compareAiRequestGuard.js`
- `src/utils/compareAiRequestGuard.test.js`

## Independent review P1 follow-up — 2026-07-17

Status: **DONE**

- Removed the duplicated header-sized top padding from the mobile Compare container. `Header` already contributes `calc(safe-area + 84px)` through `.new-header-spacer`; Compare now adds only a 12px content gap.
- Kept the sticky pair below the fixed header through the shared `--compare-mobile-header-offset: calc(96px + safe-area)` variable and a safe fallback in the metrics stylesheet.
- Added shared `isAuctionListing()` truth recognition for boolean/numeric flags and backend strings `'1'` / `'true'` (case/whitespace tolerant).
- The same recognizer now determines both auction price precedence and whether Compare renders auction-specific rows through `shouldRenderAuctionRows(left, right)`.

### RED evidence

- Focused follow-up suite failed 4 checks before production changes: missing string auction export, old local auction recognizer, duplicated 96px container padding, and non-shared sticky offset.

### GREEN evidence

- `node --test src/utils/compareDecision.test.js src/components/compare/CompareMobileMetrics.test.js src/pages/Compare.explicit-actions.test.js`
  - Result: **18 passed, 0 failed**.
- `npm run build`
  - Result: exit 0; only pre-existing environment/dynamic-import/chunk-size warnings.
- `git diff --check`
  - Result: clean.

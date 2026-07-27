# Buyer Finance Mobile Flows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/compare`, `/calculator`, `/wallet`/`/deposit`, the notification centre, and global toasts into distinct, app-first buyer flows that guide the next financial decision without silently invoking AI, showing surprise paywalls, hiding the €3,000 deposit rule, or losing critical actions.

**Architecture:** Keep each route composition independent: `/compare` is a decision cockpit, `/calculator` is a guided scenario wizard, and `/wallet` is a calm ledger/balance surface. Extract only deterministic business decisions into small utilities, keep paid AI behind an explicit user action, carry an explicitly selected comparison object into the calculator, and use the existing buyer sheet shell for financial drawers. Notification actions are resolved by product priority before generic property links; the notification panel receives explicit loading/error/empty states and a proper focus shell; the toast queue becomes severity-aware without breaking the legacy API.

**Tech Stack:** React 19, React Router 6, existing buyer CSS tokens, `react-icons`/`lucide-react`, Framer Motion, Chart.js, Node `node:test`, Vite 5, existing `BuyerSheetShell` and `useDrawerDismiss` primitives.

## Global Constraints

- Reference viewport: 390 × 844 CSS pixels; every route remains usable from 320px upward.
- Montserrat stays as the product typeface for this release, with compact mobile sizing, strong hierarchy, and readable body line-height.
- Warm white and pearl surfaces, graphite text, Mediterranean teal primary actions; sea blue, green, violet, coral, and dark emerald are page-specific accents.
- Use real or generated raster imagery and the installed icon library. Never replace visible imagery with CSS art, emoji, placeholder boxes, decorative glyphs, or inline SVG approximations.
- Primary touch targets are at least 44 × 44px. Drawers and success panels animate purposefully and respect `prefers-reduced-motion`.
- Shared tokens unify quality, typography, navigation, action hierarchy, motion, drawer behaviour, and semantic states. They do not force every route into the same hero, card, or section template.
- Every primary CTA has one clear destination or state transition.
- Purchase, booking, deposit, and application completion open a guided success drawer with confirmation, next steps, expected timing, and one primary action.
- Empty states explain why data is absent and offer a safe recovery action.
- Status, price, and availability never imply guarantees unsupported by backend data.
- Conversion prompts appear at decision points, not as generic promotional blocks everywhere.
- Do not copy the Test Drive composition. `/compare` is a decision cockpit, `/calculator` is a guided financial flow, `/wallet` is a balance/ledger surface, and notifications are an account/inbox surface.
- Do not add a design-system dependency or a new icon package. Reuse the installed libraries and buyer tokens.
- No new text below 11px. No horizontal page overflow at 320, 375, 390, or 430px.
- All new async actions expose idle, pending, success, and recoverable error states. Disabled controls explain why they are disabled.
- Follow TDD for each task: add the focused test, run it to observe RED, make the smallest production change, rerun to GREEN, then commit only the task files.

## File Map

### Comparison decision cockpit

- Create `src/utils/compareDecision.js`: pure comparison-score and selected-object helpers.
- Create `src/utils/compareDecision.test.js`: executable tests for left/right/tie/unknown outcomes and explicit selection.
- Create `src/components/compare/CompareDecisionSummary.jsx`: mobile decision summary and explicit object-to-calculator chooser.
- Create `src/components/compare/CompareDecisionSummary.css`: dark-emerald cockpit summary, two object actions, and reduced-motion rules.
- Create `src/components/compare/CompareDecisionSummary.test.js`: source-contract test for non-guaranteed copy and both selection actions.
- Modify `src/pages/Compare.jsx`: remove automatic AI/paywall effects, add explicit AI state transition, render the decision summary, and persist the chosen object.
- Modify `src/pages/Compare.css`: compact app bar, segmented decision hierarchy, sticky pair, and non-table mobile AI/result cards.
- Modify `src/components/compare/CompareMobileMetrics.jsx`: add metric grouping and winner-count semantics without changing desktop tables.
- Modify `src/components/compare/CompareMobileMetrics.css`: sticky photo pair, calm metric cards, and 320px-safe two-column values.
- Modify `src/components/compare/CompareMobileMetrics.test.js`: assert grouping, semantic winner treatment, and no horizontal scroll.
- Create `src/pages/Compare.explicit-actions.test.js`: source-contract tests that AI and paywall are user-triggered.

### Smart Investor

- Create `src/components/investor/InvestorComparisonPicker.jsx`: shows both objects from comparison and requires/permits explicit leader switching.
- Create `src/components/investor/InvestorComparisonPicker.css`: compact photo chips and selected state distinct from Test Drive cards.
- Create `src/components/investor/InvestorComparisonPicker.test.js`: selection and unavailable-object source contracts.
- Modify `src/pages/InvestmentCalculator.jsx`: resolve both comparison objects, apply the selected one only, and keep the wizard/result state truthful.
- Modify `src/pages/InvestmentCalculator.css`: app-first scenario wizard, sticky action footer, and financial result hierarchy.
- Modify `src/components/investor/InvestorMobileStepHeader.jsx`: concise route-specific step framing.
- Modify `src/components/investor/InvestorMobileStepHeader.css`: compact step rail that clears the fixed mobile header.
- Modify `src/components/investor/InvestorMobileResultCard.jsx`: recommended next action and explicit assumptions/risk order.
- Modify `src/components/investor/InvestorMobileResultCard.css`: violet/teal financial composition, not a travel hero.
- Modify `src/pages/InvestmentCalculator.compare-context.test.js`: require explicit selected-key handling and switching.
- Modify `src/utils/investorScenarioContext.test.js`: preserve selected-key validation when the leader changes.

### Deposit and wallet

- Create `src/components/deposit/BuyerDepositWithdrawDrawer.jsx`: accessible amount form using `BuyerSheetShell`; no `window.prompt`.
- Create `src/components/deposit/BuyerDepositWithdrawDrawer.css`: focused financial bottom sheet.
- Create `src/components/deposit/BuyerDepositWithdrawDrawer.test.js`: form, validation, pending/error, and focus-shell contracts.
- Create `src/pages/Wallet.mobile-flow.test.js`: €3,000 disclosure, no prompt, safe balance labels, and drawer wiring.
- Modify `src/pages/Wallet.jsx`: clear deposit threshold/progress, controlled withdrawal state, inline load/retry state, and drawer integration.
- Modify `src/pages/Wallet.css`: calm dark-emerald balance card, pearl ledger, sticky primary action, and 320px-safe transaction rows.
- Modify `src/components/deposit/DepositZeroState.jsx`: state the fixed €3,000 participation threshold before checkout.
- Modify `src/components/deposit/DepositZeroState.css`: keep the generated wallet visual but tighten the first-viewport sales narrative.
- Modify `src/components/DepositInfoDrawer.jsx`: disclose the €3,000 rule and distinguish available funds from any backend-confirmed reservation state.
- Modify `src/components/DepositTopUpPicker.jsx`: remove handcrafted inline SVG icons and explain the fixed charge before choosing card/USDT.
- Modify `src/components/DepositTopUpPicker.css`: app-native payment-method rows and safe-area footer.
- Modify `src/components/DepositSuccessDrawer.jsx`: show the confirmed amount, threshold state, and context-aware next action.
- Modify `src/utils/auctionDeposit.js`: remain the single client constant for `AUCTION_DEPOSIT_MIN_EUR = 3000`; do not introduce a duplicate literal.
- Modify `src/i18n/locales/mainPage/ru.json`, `src/i18n/locales/mainPage/en.json`, `src/i18n/locales/mainPage/es.json`, `src/i18n/locales/mainPage/de.json`, `src/i18n/locales/mainPage/fr.json`, `src/i18n/locales/mainPage/sv.json`: add exact wallet/disclosure/form/error keys for every shipped locale.

### Notification centre and toasts

- Create `src/utils/notificationPrimaryAction.js`: product-priority CTA resolver separate from presentation.
- Create `src/utils/notificationPrimaryAction.test.js`: action priority and safe-route tests.
- Modify `src/context/SiteNotificationsContext.jsx`: persistent load error, retry function, structured owner-comment flow, and action pending/error state.
- Modify `src/context/SiteNotificationsPanel.jsx`: use the resolver, render error/retry, and install focus trap/return without changing safe route rules.
- Modify `src/context/SiteNotificationsPanel.css`: grouped inbox composition, visible urgent CTA, inline error, and panel motion.
- Modify `src/context/SiteNotificationsPanel.mobile.test.js`: error, retry, CTA priority, Escape/focus trap/focus return contracts.
- Modify `src/utils/groupBuyerNotifications.js`: keep group ordering but expose urgency rank for presentation.
- Modify `src/utils/groupBuyerNotifications.test.js`: verify payment deadlines/approved purchases stay above generic property events.
- Modify `src/utils/toastModel.js`: severity-aware queue ordering and persistent error treatment.
- Modify `src/utils/toastModel.test.js`: higher-priority interruption, dedupe stability, and queue promotion tests.
- Modify `src/components/Toast.jsx`: strong action hierarchy and progress timing that still pauses on interaction/visibility.
- Modify `src/components/Toast.css`: premium motion, compact mobile density, and reduced-motion fallback.
- Modify `src/components/ToastContainer.jsx`: preserve legacy `showToast(message, type, duration)` while consuming the severity-aware model.
- Modify `src/components/ToastContainer.css`: safe stacking below mobile chrome and max-height overflow protection.
- Modify `src/components/Toast.mobile.test.js`, `src/components/ToastContainer.model.test.js`: visual/accessibility and compatibility contracts.

## Blocking Security Gate — separate P0 task, not part of the UI commits

The repository currently exposes `GET /api/users/:id/deposit`, `POST /api/users/:id/deposit/top-up`, `POST /api/users/:id/deposit/withdraw`, and `GET /api/users/:id/transactions` in `server/server.js` using the path `:id`; the inspected route bodies do not establish that this ID belongs to the authenticated caller. The withdrawal route subtracts from `deposit_amount`, while `server/utils/auctionDeposit.js` contains an unused `userHasOpenAuctionParticipation` helper and there is no confirmed available-versus-reserved balance contract in the inspected response.

This is a release blocker for enabling the redesigned withdrawal control. Do not infer an authentication middleware, a reservation formula, or a response schema from client state. A security owner must first:

1. identify the canonical server-authenticated user identity and the project-approved authorization middleware;
2. require that identity on all four deposit/transaction endpoints and reject a mismatched path ID;
3. define from persisted data which amount is total, available, and reserved, including open bids/bookings and concurrent transactions;
4. make withdrawal atomic against the server-computed available amount;
5. add black-box tests proving unauthenticated access is rejected, cross-user access is rejected, reserved funds cannot be withdrawn, and concurrent withdrawals cannot overdraw;
6. publish the reviewed response contract consumed by `Wallet.jsx`.

**Blocking rule:** Tasks 5 and 6 may build/read-only visual states, but they must not ship an enabled withdrawal request or display a calculated “available”/“reserved” amount until this gate is complete. No backend file is edited by this finance-mobile plan.

---

### Task 1: Deterministic comparison decision model

**Files:**
- Create: `src/utils/compareDecision.js`
- Create: `src/utils/compareDecision.test.js`

**Interfaces:**
- Consumes: comparison rows shaped as `{ id, winner, displayOnly }` and pair items shaped as `{ key, property }`.
- Produces: `summarizeComparisonRows(rows)` and `selectComparisonItem(pair, side)`.

- [ ] **Step 1: Write the failing pure-unit tests**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { selectComparisonItem, summarizeComparisonRows } from './compareDecision.js'

test('summarizes only objective comparable rows', () => {
  assert.deepEqual(summarizeComparisonRows([
    { id: 'price', winner: 'left' },
    { id: 'area', winner: 'right' },
    { id: 'comfort', winner: 'left' },
    { id: 'material', winner: null, displayOnly: true },
  ]), { left: 2, right: 1, tie: 0, compared: 3, leader: 'left' })
})

test('reports tie and unknown without inventing a winner', () => {
  assert.equal(summarizeComparisonRows([{ winner: 'left' }, { winner: 'right' }]).leader, 'tie')
  assert.equal(summarizeComparisonRows([{ displayOnly: true, winner: null }]).leader, 'unknown')
})

test('returns only an explicitly selected side', () => {
  const pair = { left: { key: 'left:1' }, right: { key: 'right:2' } }
  assert.equal(selectComparisonItem(pair, 'right').key, 'right:2')
  assert.equal(selectComparisonItem(pair, 'auto'), null)
})
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `node --test src/utils/compareDecision.test.js`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `compareDecision.js`.

- [ ] **Step 3: Implement the pure functions**

```js
export function summarizeComparisonRows(rows = []) {
  const score = { left: 0, right: 0, tie: 0 }
  for (const row of Array.isArray(rows) ? rows : []) {
    if (row?.displayOnly) continue
    if (row?.winner === 'left' || row?.winner === 'right' || row?.winner === 'tie') {
      score[row.winner] += 1
    }
  }
  const compared = score.left + score.right + score.tie
  const leader = compared === 0
    ? 'unknown'
    : score.left === score.right
      ? 'tie'
      : score.left > score.right ? 'left' : 'right'
  return { ...score, compared, leader }
}

export function selectComparisonItem(pair, side) {
  if (side !== 'left' && side !== 'right') return null
  return pair?.[side] ?? null
}
```

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run: `node --test src/utils/compareDecision.test.js`

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/utils/compareDecision.js src/utils/compareDecision.test.js
git commit -m "test: define comparison decision model"
```

### Task 2: App-first comparison cockpit and explicit premium actions

**Files:**
- Create: `src/components/compare/CompareDecisionSummary.jsx`
- Create: `src/components/compare/CompareDecisionSummary.css`
- Create: `src/components/compare/CompareDecisionSummary.test.js`
- Create: `src/pages/Compare.explicit-actions.test.js`
- Modify: `src/pages/Compare.jsx`
- Modify: `src/pages/Compare.css`
- Modify: `src/components/compare/CompareMobileMetrics.jsx`
- Modify: `src/components/compare/CompareMobileMetrics.css`
- Modify: `src/components/compare/CompareMobileMetrics.test.js`

**Interfaces:**
- Consumes: `summarizeComparisonRows(tableRows)`, `selectComparisonItem(pair, side)`, `writeInvestorScenario({ source, propertyKeys, selectedKey })`, and existing `CompareInvestorProDrawer`.
- Produces: `CompareDecisionSummary({ pair, summary, onOpenCalculator })`; no AI request and no subscription drawer may open without a click.

- [ ] **Step 1: Write failing component/source contract tests**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const summary = await readFile(new URL('./CompareDecisionSummary.jsx', import.meta.url), 'utf8').catch(() => '')
const page = await readFile(new URL('../../pages/Compare.jsx', import.meta.url), 'utf8')

test('decision summary names a factual score but requires an explicit calculator object', () => {
  assert.match(summary, /По параметрам/)
  assert.match(summary, /onOpenCalculator\('left'\)/)
  assert.match(summary, /onOpenCalculator\('right'\)/)
  assert.match(summary, /Не является гарантией/)
})

test('AI and paid drawer are opened only from named click handlers', () => {
  assert.match(page, /const requestAiAnalysis = useCallback/)
  assert.match(page, /onClick=\{requestAiAnalysis\}/)
  assert.match(page, /setCompareInvestorDrawerOpen\(true\)/)
  assert.doesNotMatch(page, /setTimeout\([\s\S]{0,240}setCompareInvestorDrawerOpen\(true\)/)
  assert.doesNotMatch(page, /useEffect\([\s\S]{0,700}askPropertyCompareAssistant/)
})
```

- [ ] **Step 2: Run the tests and confirm RED**

Run: `node --test src/components/compare/CompareDecisionSummary.test.js src/pages/Compare.explicit-actions.test.js src/components/compare/CompareMobileMetrics.test.js`

Expected: the new component test fails because the file does not exist; explicit-action assertions fail against the automatic AI/paywall effects.

- [ ] **Step 3: Add the decision summary component**

Implement a score card with a dark-emerald header, both property thumbnails/titles, factual score (`left`, `right`, `tie`, `compared`), and two 44px actions. The copy must say that the score is based only on filled objective fields and is not a guarantee of yield, liquidity, or legal quality. Call `onOpenCalculator('left')` and `onOpenCalculator('right')`; never infer the calculator object from `summary.leader`.

- [ ] **Step 4: Replace automatic AI and paywall effects with an explicit state machine**

In `Compare.jsx`, remove the effect that calls `askPropertyCompareAssistant` when `pair` changes and remove the 480ms auto-open drawer effect. Keep a pair-change reset effect only. Add this interaction shape:

```js
const requestAiAnalysis = useCallback(async () => {
  if (!pair || aiLoading) return
  if (!subscriptionResolved) return
  if (!hasCalculatorAccess) {
    setCompareInvestorDrawerOpen(true)
    return
  }
  const controller = new AbortController()
  setAiLoading(true)
  setAiError(null)
  try {
    const result = await askPropertyCompareAssistant(
      serializePropertyForAi(pair.left.property),
      serializePropertyForAi(pair.right.property),
      { signal: controller.signal },
    )
    setAiResult(result)
  } catch (error) {
    if (error?.name !== 'AbortError') setAiError(error?.message || 'Не удалось получить AI-разбор')
  } finally {
    setAiLoading(false)
  }
}, [aiLoading, hasCalculatorAccess, pair, subscriptionResolved])
```

Render an idle AI card with one button “Получить AI-разбор”; render retry only after a real error. Do not show a modal merely because two objects were selected.

- [ ] **Step 5: Persist and route the object the buyer actually selected**

Replace the hard-coded `pair.left` route state with:

```js
const openInvestorPanel = useCallback((side) => {
  const selected = selectComparisonItem(pair, side)
  if (!selected) return
  const scenario = writeInvestorScenario({
    source: 'compare',
    propertyKeys: [pair.left.key, pair.right.key],
    selectedKey: selected.key,
  })
  navigate('/calculator', {
    state: {
      calculatorFromProperty: selected.property,
      calculatorSelectedKey: selected.key,
      calculatorStrategy: 'rent',
      calculatorScenarioCreatedAt: scenario?.createdAt ?? null,
    },
  })
}, [navigate, pair])
```

Render `CompareDecisionSummary` immediately after `CompareMobileMetrics` on mobile and before optional AI/market sections. Market calculation remains explicit and must not be renamed as a guaranteed valuation.

- [ ] **Step 6: Restructure mobile metrics without cloning Test Drive**

Keep the sticky two-photo pair, group metrics under “Цена”, “Объект”, and “Комфорт”, and keep both values visible without horizontal scroll. Use a pearl background, dark-emerald sticky pair, mint winner cells, and a coral warning only for incomplete data. Desktop retains the semantic table.

- [ ] **Step 7: Run focused tests and build**

Run: `node --test src/utils/compareDecision.test.js src/components/compare/CompareDecisionSummary.test.js src/pages/Compare.explicit-actions.test.js src/components/compare/CompareMobileMetrics.test.js src/pages/InvestmentCalculator.compare-context.test.js`

Expected: all focused tests pass.

Run: `npm run build`

Expected: build exits 0; existing environment/chunk warnings are allowed, new JSX/CSS errors are not.

- [ ] **Step 8: Commit**

```bash
git add src/pages/Compare.jsx src/pages/Compare.css src/pages/Compare.explicit-actions.test.js src/components/compare/CompareDecisionSummary.jsx src/components/compare/CompareDecisionSummary.css src/components/compare/CompareDecisionSummary.test.js src/components/compare/CompareMobileMetrics.jsx src/components/compare/CompareMobileMetrics.css src/components/compare/CompareMobileMetrics.test.js
git commit -m "feat: make comparison a guided decision cockpit"
```

### Task 3: Explicit comparison leader inside Smart Investor

**Files:**
- Create: `src/components/investor/InvestorComparisonPicker.jsx`
- Create: `src/components/investor/InvestorComparisonPicker.css`
- Create: `src/components/investor/InvestorComparisonPicker.test.js`
- Modify: `src/pages/InvestmentCalculator.jsx`
- Modify: `src/pages/InvestmentCalculator.compare-context.test.js`
- Modify: `src/utils/investorScenarioContext.test.js`

**Interfaces:**
- Consumes: `investorScenario.propertyKeys`, `investorScenario.selectedKey`, `favoriteAuctions`, `applyPropertyPreset(property, strategy)`, `writeInvestorScenario`.
- Produces: `InvestorComparisonPicker({ items, selectedKey, onSelect, onClear })` and a selected-key change that updates both calculator inputs and session context.

- [ ] **Step 1: Write failing selection tests**

Extend `InvestmentCalculator.compare-context.test.js` with:

```js
test('smart investor exposes both comparison objects and applies only the chosen key', () => {
  assert.match(calculatorSource, /InvestorComparisonPicker/)
  assert.match(calculatorSource, /investorScenario\.propertyKeys/)
  assert.match(calculatorSource, /handleComparisonPropertySelect/)
  assert.match(calculatorSource, /selectedKey:\s*item\.key/)
  assert.doesNotMatch(calculatorSource, /opened calculation for the first object/i)
})
```

Add a source-contract test requiring two buttons, `aria-pressed`, unavailable state, and `onSelect(item)` in `InvestorComparisonPicker.test.js`.

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `node --test src/components/investor/InvestorComparisonPicker.test.js src/pages/InvestmentCalculator.compare-context.test.js src/utils/investorScenarioContext.test.js`

Expected: new picker and handler assertions fail.

- [ ] **Step 3: Implement the comparison picker**

Resolve items in scenario key order:

```js
const comparisonItems = useMemo(() => {
  if (!investorScenario?.propertyKeys?.length) return []
  return investorScenario.propertyKeys.map(
    (key) => favoriteAuctions.find((item) => item.key === key) || { key, unavailable: true },
  )
}, [favoriteAuctions, investorScenario])
```

The picker renders both identities, photo, compact price, and selected state. An unresolved item says “Объект больше недоступен” and is disabled; it must not fall back to the first favourite.

- [ ] **Step 4: Apply a user-selected object and update safe session state**

```js
const handleComparisonPropertySelect = useCallback((item) => {
  if (!item?.property || !investorScenario?.propertyKeys?.includes(item.key)) return
  setSelectedFavoriteKey(item.key)
  setDataSource('favorites')
  applyPropertyPreset(item.property, investmentStrategy || 'rent')
  const next = writeInvestorScenario({
    source: 'compare',
    propertyKeys: investorScenario.propertyKeys,
    selectedKey: item.key,
  })
  if (next) setInvestorScenario(next)
}, [applyPropertyPreset, investmentStrategy, investorScenario])
```

The incoming router property may seed the selected object once, but the banner copy must say “Выбран объект …” rather than “открыли первый объект.” Place the picker before the result card so switching recalculates visibly.

- [ ] **Step 5: Run tests and commit**

Run: `node --test src/components/investor/InvestorComparisonPicker.test.js src/pages/InvestmentCalculator.compare-context.test.js src/utils/investorScenarioContext.test.js`

Expected: all pass.

```bash
git add src/components/investor/InvestorComparisonPicker.jsx src/components/investor/InvestorComparisonPicker.css src/components/investor/InvestorComparisonPicker.test.js src/pages/InvestmentCalculator.jsx src/pages/InvestmentCalculator.compare-context.test.js src/utils/investorScenarioContext.test.js
git commit -m "feat: let investors choose the compared object"
```

### Task 4: Smart Investor mobile wizard and result hierarchy

**Files:**
- Modify: `src/pages/InvestmentCalculator.jsx`
- Modify: `src/pages/InvestmentCalculator.css`
- Modify: `src/components/investor/InvestorMobileStepHeader.jsx`
- Modify: `src/components/investor/InvestorMobileStepHeader.css`
- Modify: `src/components/investor/InvestorMobileResultCard.jsx`
- Modify: `src/components/investor/InvestorMobileResultCard.css`
- Create: `src/pages/InvestmentCalculator.mobile-flow.test.js`

**Interfaces:**
- Consumes: existing wizard fields/calculation memo and the comparison picker from Task 3.
- Produces: one mobile scroll, clear three-step progress, one sticky primary action, and a result that separates outcome, assumptions, and risk.

- [ ] **Step 1: Write the failing mobile-flow source test**

Require: step order `Объект → Цель → Результат`; one sticky primary action per step; no duplicated mobile and desktop headings visible together; result labels “Базовый сценарий”, “Что учтено”, “Риск”; and no result copy containing “гарантирован”.

- [ ] **Step 2: Run test and confirm RED**

Run: `node --test src/pages/InvestmentCalculator.mobile-flow.test.js`

Expected: at least the new hierarchy/sticky-action assertions fail.

- [ ] **Step 3: Recompose the mobile wizard**

At `max-width: 768px`, use a pearl page, compact violet progress rail, white object/source cards, and a dark-emerald sticky action footer above `env(safe-area-inset-bottom)`. Keep all existing numeric inputs and calculations; this task changes hierarchy, not financial formulas. Use field labels above inputs, inline validation text, and never rely on placeholder-only meaning.

- [ ] **Step 4: Recompose the result screen**

The first visible card shows the selected object, strategy, one headline result, three supporting metrics, then assumptions and risk. Charts and detailed inputs follow below in collapsible visual sections; no number is labelled “recommended” unless it is a deterministic output of the current inputs. Keep the existing Chart.js data and reduced-motion behavior.

- [ ] **Step 5: Run tests/build and commit**

Run: `node --test src/pages/InvestmentCalculator.mobile-flow.test.js src/pages/InvestmentCalculator.compare-context.test.js src/components/investor/InvestorComparisonPicker.test.js`

Expected: all pass.

Run: `npm run build`

Expected: exit 0.

```bash
git add src/pages/InvestmentCalculator.jsx src/pages/InvestmentCalculator.css src/pages/InvestmentCalculator.mobile-flow.test.js src/components/investor/InvestorMobileStepHeader.jsx src/components/investor/InvestorMobileStepHeader.css src/components/investor/InvestorMobileResultCard.jsx src/components/investor/InvestorMobileResultCard.css
git commit -m "feat: redesign smart investor mobile flow"
```

### Task 5: Truthful €3,000 deposit disclosure and fintech wallet composition

**Dependency:** The read-only composition may be built before the Blocking Security Gate, but labels must remain “Депозит”/“Баланс депозита”; do not display invented available/reserved figures.

**Files:**
- Create: `src/pages/Wallet.mobile-flow.test.js`
- Modify: `src/pages/Wallet.jsx`
- Modify: `src/pages/Wallet.css`
- Modify: `src/components/deposit/DepositZeroState.jsx`
- Modify: `src/components/deposit/DepositZeroState.css`
- Modify: `src/components/DepositInfoDrawer.jsx`
- Modify: `src/components/DepositTopUpPicker.jsx`
- Modify: `src/components/DepositTopUpPicker.css`
- Modify: `src/components/DepositSuccessDrawer.jsx`
- Modify: `src/utils/auctionDeposit.js`
- Modify: locale files listed in the File Map.

**Interfaces:**
- Consumes: `AUCTION_DEPOSIT_MIN_EUR`, current server-confirmed `depositAmount`, `DepositTopUpPicker`, and `DepositSuccessDrawer`.
- Produces: threshold disclosure before checkout and a route-specific ledger layout; no write behavior changes in this task.

- [ ] **Step 1: Write failing wallet/disclosure tests**

```js
test('wallet discloses the fixed auction threshold before checkout', () => {
  assert.match(wallet, /AUCTION_DEPOSIT_MIN_EUR/)
  assert.match(zeroState, /3[\s\u00a0]?000\s*€/)
  assert.match(topUpPicker, /AUCTION_DEPOSIT_MIN_EUR/)
})

test('wallet never invents available or reserved balances', () => {
  assert.doesNotMatch(wallet, /depositAmount\s*-\s*.*reserved/)
  assert.doesNotMatch(wallet, /зарезервировано.*depositAmount/iu)
})

test('payment picker contains no handcrafted inline svg', () => {
  assert.doesNotMatch(topUpPicker, /<svg/)
  assert.match(topUpPicker, /FiCreditCard/)
})
```

- [ ] **Step 2: Run test and confirm RED**

Run: `node --test src/pages/Wallet.mobile-flow.test.js src/components/deposit/DepositZeroState.test.js src/components/DepositDrawers.buyer-shell.test.js src/components/DepositSuccessDrawer.mobile.test.js`

Expected: €3,000 and inline-SVG assertions fail.

- [ ] **Step 3: Make the threshold visible in all pre-payment states**

Import `AUCTION_DEPOSIT_MIN_EUR` in `Wallet.jsx`, `DepositZeroState.jsx`, `DepositInfoDrawer.jsx`, and `DepositTopUpPicker.jsx`. Format it with `Intl.NumberFormat`. State: “Для участия в аукционах нужен депозит 3 000 €. Это не комиссия: доступная часть остаётся вашей и может быть запрошена к возврату, если сервер не держит её за активным действием.” Do not promise immediate withdrawal.

- [ ] **Step 4: Replace payment-picker inline artwork and clarify charge**

Use `FiCreditCard` for card and the closest installed brand icon from `react-icons`; no inline SVG. The first sheet view shows the fixed amount above payment methods, then two full-width 44px method rows. Keep existing Stripe/TON handlers and pending/success behavior.

- [ ] **Step 5: Recompose wallet as a ledger, not a landing page**

Use a compact top bar, dark-emerald balance card, threshold progress (`Math.min(100, depositAmount / AUCTION_DEPOSIT_MIN_EUR * 100)`), one teal top-up CTA, an active-bids rail, and a white transaction timeline. The progress is only “порог участия”, never “available funds”. Replace inline loading styles with named skeleton/error/retry classes. Keep image assets real and existing.

- [ ] **Step 6: Run focused tests/build and commit**

Run: `node --test src/pages/Wallet.mobile-flow.test.js src/components/deposit/DepositZeroState.test.js src/components/DepositDrawers.buyer-shell.test.js src/components/DepositSuccessDrawer.mobile.test.js`

Expected: all pass.

Run: `npm run build`

Expected: exit 0.

```bash
git add src/pages/Wallet.jsx src/pages/Wallet.css src/pages/Wallet.mobile-flow.test.js src/components/deposit/DepositZeroState.jsx src/components/deposit/DepositZeroState.css src/components/DepositInfoDrawer.jsx src/components/DepositTopUpPicker.jsx src/components/DepositTopUpPicker.css src/components/DepositSuccessDrawer.jsx src/utils/auctionDeposit.js src/i18n/locales/mainPage/ru.json src/i18n/locales/mainPage/en.json src/i18n/locales/mainPage/es.json src/i18n/locales/mainPage/de.json src/i18n/locales/mainPage/fr.json src/i18n/locales/mainPage/sv.json
git commit -m "feat: clarify deposit threshold and wallet flow"
```

### Task 6: Accessible withdrawal drawer without `window.prompt`

**Dependency:** Do not execute or ship this task until the Blocking Security Gate publishes an authenticated, server-computed withdrawable amount contract.

**Files:**
- Create: `src/components/deposit/BuyerDepositWithdrawDrawer.jsx`
- Create: `src/components/deposit/BuyerDepositWithdrawDrawer.css`
- Create: `src/components/deposit/BuyerDepositWithdrawDrawer.test.js`
- Modify: `src/pages/Wallet.jsx`
- Modify: `src/pages/Wallet.mobile-flow.test.js`

**Interfaces:**
- Consumes: the reviewed server-provided withdrawable amount; `BuyerSheetShell`; `onSubmit(amount): Promise<{ ok, error? }>`.
- Produces: `BuyerDepositWithdrawDrawer({ isOpen, onClose, withdrawableAmount, currency, onSubmit })`.

- [ ] **Step 1: Write the failing drawer contract test**

Require `BuyerSheetShell`, labelled numeric input with `inputMode="decimal"`, max based only on the server-provided prop, inline validation, pending state, server error, and no `prompt(` in `Wallet.jsx`.

- [ ] **Step 2: Run test and confirm RED**

Run: `node --test src/components/deposit/BuyerDepositWithdrawDrawer.test.js src/pages/Wallet.mobile-flow.test.js`

Expected: missing component and `prompt(` assertion fail.

- [ ] **Step 3: Implement the controlled form**

The drawer owns `amount`, `submitting`, and `submitError`. Validation accepts a finite amount greater than zero and no greater than `withdrawableAmount`. The footer primary button says “Запросить возврат”, is disabled while invalid/pending, and keeps the drawer open on server error. A secondary “Отмена” closes it. `BuyerSheetShell` provides Escape, focus trap, scroll lock, and focus return.

- [ ] **Step 4: Replace `handleWithdraw` prompt flow**

`Wallet.jsx` opens the drawer from a secondary action. `handleWithdraw(amount)` returns a structured result to the drawer, uses the authenticated endpoint contract from the security gate, reloads data on success, and emits a structured success/error toast. Do not close on failure and do not use client `depositAmount` as an authorization check.

- [ ] **Step 5: Run tests and commit**

Run: `node --test src/components/deposit/BuyerDepositWithdrawDrawer.test.js src/pages/Wallet.mobile-flow.test.js src/components/Toast.mobile.test.js`

Expected: all pass.

```bash
git add src/components/deposit/BuyerDepositWithdrawDrawer.jsx src/components/deposit/BuyerDepositWithdrawDrawer.css src/components/deposit/BuyerDepositWithdrawDrawer.test.js src/pages/Wallet.jsx src/pages/Wallet.mobile-flow.test.js
git commit -m "feat: add safe buyer deposit withdrawal drawer"
```

### Task 7: Notification CTA priority, retry state, and focus shell

**Files:**
- Create: `src/utils/notificationPrimaryAction.js`
- Create: `src/utils/notificationPrimaryAction.test.js`
- Modify: `src/context/SiteNotificationsContext.jsx`
- Modify: `src/context/SiteNotificationsPanel.jsx`
- Modify: `src/context/SiteNotificationsPanel.css`
- Modify: `src/context/SiteNotificationsPanel.mobile.test.js`
- Modify: `src/utils/groupBuyerNotifications.js`
- Modify: `src/utils/groupBuyerNotifications.test.js`

**Interfaces:**
- Consumes: `safeNotificationRoute`, parsed notification data, property metadata, existing navigation/respond handlers.
- Produces: `resolveNotificationPrimaryAction({ notification, data, propertyMeta })` returning `{ kind, label, route } | null`; panel props `notificationsError`, `retryNotifications`, `actionPendingId`, `actionErrorById`.

- [ ] **Step 1: Write failing action-priority unit tests**

```js
test('purchase approval wins over a generic property link', () => {
  assert.deepEqual(resolveNotificationPrimaryAction({
    notification: { type: 'buy_now_approved' },
    data: { property_id: 42 },
    propertyMeta: { id: 42 },
  }), { kind: 'route', label: 'Открыть покупки', route: '/history' })
})

test('payment deadline keeps a safe explicit route and urgent label', () => {
  assert.deepEqual(resolveNotificationPrimaryAction({
    notification: { type: 'payment_deadline' },
    data: { action_path: '/history?payment=7' },
    propertyMeta: { id: 7 },
  }), { kind: 'route', label: 'Перейти к оплате', route: '/history?payment=7' })
})

test('unsafe explicit routes never outrank a safe property fallback', () => {
  assert.deepEqual(resolveNotificationPrimaryAction({
    notification: { type: 'bid_outbid' },
    data: { action_path: 'https://evil.example', property_id: 8 },
    propertyMeta: { id: 8 },
  }), { kind: 'property', label: 'Вернуться к торгам', propertyId: 8 })
})
```

- [ ] **Step 2: Run and confirm RED**

Run: `node --test src/utils/notificationPrimaryAction.test.js src/context/SiteNotificationsPanel.mobile.test.js src/utils/groupBuyerNotifications.test.js`

Expected: missing resolver and error/focus assertions fail.

- [ ] **Step 3: Implement the resolver before presentation changes**

Order rules: direct workflow actions (`test_drive_request`) first; urgent money/purchase types second; safe explicit internal routes third; type-specific property fallback fourth; mark-read last. This prevents `propertyMeta.id` from swallowing `buy_now_approved` and `payment_deadline` CTAs.

- [ ] **Step 4: Add a real load error and retry path**

In context, add `notificationsError`. Set it to `null` before loading, set a user-safe message in catch, and do not convert a failed request into the empty state. Expose a stable `retryNotifications()` that forces a new fetch. In the panel render `role="alert"`, message, and a 44px “Повторить” button before the empty-state branch.

- [ ] **Step 5: Add per-action pending/error behavior**

For test-drive approve/reject and mark-all, disable only the action currently pending, set `aria-busy`, show an inline error beside the affected notification, and leave the item unread on failure. Replace the owner-comment `window.prompt` with an inline textarea sheet/state in the panel; confirmation is disabled until trimmed text is non-empty.

- [ ] **Step 6: Install focus management in the notification shell**

On open, capture `document.activeElement`, focus the panel close button, trap Tab/Shift+Tab inside `panelRef`, close on Escape through `closePanel`, lock body scroll for all viewport sizes while modal, and restore focus only after the closing animation unmounts. Add `tabIndex={-1}` to the panel. Do not pass click events as callbacks.

- [ ] **Step 7: Run tests and commit**

Run: `node --test src/utils/notificationPrimaryAction.test.js src/context/SiteNotificationsPanel.mobile.test.js src/utils/groupBuyerNotifications.test.js`

Expected: all pass.

```bash
git add src/utils/notificationPrimaryAction.js src/utils/notificationPrimaryAction.test.js src/context/SiteNotificationsContext.jsx src/context/SiteNotificationsPanel.jsx src/context/SiteNotificationsPanel.css src/context/SiteNotificationsPanel.mobile.test.js src/utils/groupBuyerNotifications.js src/utils/groupBuyerNotifications.test.js
git commit -m "feat: prioritize and recover buyer notifications"
```

### Task 8: Severity-aware, animated global toasts

**Files:**
- Modify: `src/utils/toastModel.js`
- Modify: `src/utils/toastModel.test.js`
- Modify: `src/components/Toast.jsx`
- Modify: `src/components/Toast.css`
- Modify: `src/components/ToastContainer.jsx`
- Modify: `src/components/ToastContainer.css`
- Modify: `src/components/Toast.mobile.test.js`
- Modify: `src/components/ToastContainer.model.test.js`

**Interfaces:**
- Consumes: normalized events `{ type, title, message, action, duration, persistent, dedupeKey, announcement }` and legacy `showToast(message, type, duration)`.
- Produces: `toastPriority(type)` and a queue where urgent errors/warnings are visible before informational events while IDs/dedupe remain stable.

- [ ] **Step 1: Write failing priority tests**

```js
test('urgent error displaces the lowest-priority visible toast without losing it', () => {
  const state = {
    visible: [
      { id: 1, type: 'info', message: 'i' },
      { id: 2, type: 'success', message: 's' },
      { id: 3, type: 'warning', message: 'w' },
    ],
    queued: [],
  }
  const next = enqueueToast(state, { id: 4, type: 'error', message: 'e' })
  assert.deepEqual(next.visible.map((event) => event.id), [4, 3, 2])
  assert.deepEqual(next.queued.map((event) => event.id), [1])
})
```

Also retain existing tests for dedupe stable ID, maximum three visible, legacy React content, and queue promotion.

- [ ] **Step 2: Run and confirm RED**

Run: `node --test src/utils/toastModel.test.js src/components/Toast.mobile.test.js src/components/ToastContainer.model.test.js`

Expected: priority-order test fails against FIFO.

- [ ] **Step 3: Implement stable severity ordering**

Use `error: 4`, `warning: 3`, `success: 2`, `info: 1`. Deduplicate before ranking. When full, a higher-priority incoming event displaces only the lowest-priority visible event into the queue; equal-priority events remain stable/FIFO. `removeToast` promotes the highest-priority queued event, preserving FIFO within equal priority.

- [ ] **Step 4: Polish toast motion and action hierarchy**

Use transform/opacity entrance, a subtle type-colour accent, one clear full-width action on mobile, 44px close/action targets, safe-area top offset, and no more than three visible cards. Error events use `role="alert"`; other types remain `status`. Pause timing on hover, focus, and hidden document. Under `prefers-reduced-motion`, remove transform animation and shorten exit to effectively immediate without removing content.

- [ ] **Step 5: Run tests/build and commit**

Run: `node --test src/utils/toastModel.test.js src/components/Toast.mobile.test.js src/components/ToastContainer.model.test.js`

Expected: all pass.

Run: `npm run build`

Expected: exit 0.

```bash
git add src/utils/toastModel.js src/utils/toastModel.test.js src/components/Toast.jsx src/components/Toast.css src/components/ToastContainer.jsx src/components/ToastContainer.css src/components/Toast.mobile.test.js src/components/ToastContainer.model.test.js
git commit -m "feat: prioritize and animate buyer toasts"
```

### Task 9: Cross-flow verification and visual QA

**Files:**
- Create: `docs/superpowers/qa/2026-07-15-buyer-finance-mobile-design-qa.md`
- Modify only if defects are found: files owned by Tasks 1–8.

**Interfaces:**
- Consumes: completed focused commits and the approved art-direction spec.
- Produces: reproducible screenshots/interaction notes and a QA file whose last line is `final result: passed` only after all P0/P1/P2 visual issues are fixed.

- [ ] **Step 1: Run the full safe test set**

Run: `rg --files src server -g '*.test.js' | xargs node --test`

Expected: all new finance-flow tests pass. Record any pre-existing unrelated failures separately; do not describe the suite as fully green if any test fails.

- [ ] **Step 2: Run production build**

Run: `npm run build`

Expected: exit 0 with no new compile errors.

- [ ] **Step 3: Inspect each route in the in-app browser**

At 390 × 844 and 320 × 700, verify:

- `/compare`: two-object identity remains sticky, score is factual, AI is idle until clicked, subscription drawer appears only after a premium click, both calculator-object CTAs work, and no horizontal page scroll exists;
- `/calculator`: comparison picker shows both objects, switching the selected object changes inputs/results, all three wizard steps have one primary action, and risk/assumptions remain visible;
- `/wallet` and `/deposit`: €3,000 is visible before payment-method selection, balance labels do not invent reserved funds, checkout methods remain functional, and withdrawal remains disabled unless the Security Gate is complete;
- notification bell: focus enters panel, loops, Escape closes, focus returns, load failure shows retry rather than empty, urgent CTA outranks generic property CTA;
- toasts: an error becomes visible ahead of info, actions are tappable, timer pauses on focus, and reduced motion is respected.

- [ ] **Step 4: Check all target widths and accessibility**

Inspect 320, 375, 390, and 430px widths. Confirm no clipped labels, minimum 44px targets, minimum 11px text, no content hidden under fixed actions, visible focus rings, correct `aria-live`, and no new console errors.

- [ ] **Step 5: Fix defects and rerun the affected focused tests**

For every P0/P1/P2 defect, write the observed route/state/viewport in the QA file, patch the owning task file, rerun its focused test command, and recapture the same state at the same viewport. Do not accept screenshots alone; compare before/after together.

- [ ] **Step 6: Finalize and commit QA evidence**

End `docs/superpowers/qa/2026-07-15-buyer-finance-mobile-design-qa.md` with exactly:

```text
final result: passed
```

only when every listed acceptance check passes.

```bash
git add docs/superpowers/qa/2026-07-15-buyer-finance-mobile-design-qa.md
git commit -m "test: verify buyer finance mobile flows"
```


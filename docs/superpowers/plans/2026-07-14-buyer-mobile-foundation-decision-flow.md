# Buyer Mobile Foundation & Decision Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan.

**Goal:** Deliver the first production-ready mobile buyer slice: a coherent visual foundation, animated actionable notifications, a readable two-property comparison, a guided Smart Investor handoff, and a persuasive deposit experience.

**Architecture:** Introduce small reusable buyer-mobile primitives and pure state helpers, then adapt existing pages without rewriting their data-loading and financial logic. Keep desktop rendering intact above 767 px. All drawers share one accessible shell; all notifications share one structured event contract; comparison hands an allowlisted scenario into the calculator; deposit preserves a safe return path.

**Tech Stack:** React 18, React Router, CSS, Node built-in test runner, Vite, existing REST APIs, existing i18n and icon libraries.

## Global Constraints

- Source of truth: `docs/superpowers/specs/2026-07-14-buyer-mobile-experience-redesign.md`.
- Mobile scope is `320px–767px`; desktop behavior must not regress.
- Primary visual references are the existing Bonuses, Buyer, and Seller pages.
- Use Montserrat for headings/numbers/CTAs and Inter for body/form copy.
- Minimum interactive target is `44px`; sticky controls must include `env(safe-area-inset-bottom)`.
- Success states appear only after confirmed server responses.
- Money calculations remain in existing server/domain logic; presentation helpers never invent balances or returns.
- Motion must have `prefers-reduced-motion` fallbacks.
- Every task follows RED → GREEN → REFACTOR and ends with focused tests.
- The first wave is complete only after runtime screenshots at 320, 360, 390, 430 and 767 px are reviewed.

---

## Task 1: Establish buyer-mobile design tokens and layout utilities

**Files:**

- Create: `src/styles/buyer-mobile-tokens.css`
- Create: `src/styles/buyer-mobile-tokens.test.js`
- Modify: `src/App.jsx`

**Interface:** Global custom properties prefixed `--buyer-*` and utility classes `.buyer-mobile-only`, `.buyer-safe-bottom`, `.buyer-touch-target`.

1. Write a failing static contract test asserting the token file contains the approved colors, both font families, radii, 44px touch target, safe-area padding, and reduced-motion rules.

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const css = await readFile(new URL('./buyer-mobile-tokens.css', import.meta.url), 'utf8')

test('buyer mobile tokens expose the approved visual system', () => {
  for (const token of ['--buyer-ink: #050505', '--buyer-teal: #0099a9', '--buyer-mint: #eaf8f5', '--buyer-auction: #f4d63e']) {
    assert.match(css.toLowerCase(), new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
  assert.match(css, /--buyer-font-display:\s*['"]Montserrat/)
  assert.match(css, /--buyer-font-body:\s*['"]Inter/)
  assert.match(css, /--buyer-touch:\s*44px/)
  assert.match(css, /env\(safe-area-inset-bottom\)/)
  assert.match(css, /prefers-reduced-motion:\s*reduce/)
})
```

2. Run `node --test src/styles/buyer-mobile-tokens.test.js` and confirm it fails because the stylesheet does not exist.
3. Add the token set under `:root`, mobile utility classes, and motion fallback. Import the stylesheet after `App.css` so the variables are available globally.
4. Run the focused test, then `npm run build`.
5. Commit: `feat: add buyer mobile design foundation`.

## Task 2: Build one accessible drawer shell

**Files:**

- Create: `src/components/buyer-mobile/BuyerSheetShell.jsx`
- Create: `src/components/buyer-mobile/BuyerSheetShell.css`
- Create: `src/components/buyer-mobile/BuyerSheetShell.test.js`
- Reuse: `src/hooks/useDrawerDismiss.js`
- Reuse: `src/styles/drawerDismiss.css`

**Public component:**

```jsx
<BuyerSheetShell
  isOpen={boolean}
  onClose={function}
  titleId="stable-heading-id"
  labelledBy="stable-heading-id"
  tone="success|guard|choice|detail"
  closeLabel="Закрыть"
  dismissible={true}
  footer={<button>...</button>}
>
  {children}
</BuyerSheetShell>
```

1. Write a static contract test for `role="dialog"`, `aria-modal`, `aria-labelledby`, Escape handling, initial focus, focus return, body-scroll lock, backdrop click, `useDrawerDismiss`, and safe-area footer.
2. Run the test and confirm RED.
3. Implement the portal-based shell. Capture `document.activeElement` before opening, focus the close button or first focusable child, trap Tab/Shift+Tab inside, restore focus after the dismiss animation, and never close when `dismissible={false}`.
4. Style a mobile bottom sheet and centered desktop fallback. Use the approved ink/teal/mint palette and a restrained spring-like entrance; disable transforms under reduced motion.
5. Run the focused test and build.
6. Commit: `feat: add accessible buyer sheet shell`.

## Task 3: Centralize buyer listing states and status ribbons

**Files:**

- Create: `src/utils/resolveBuyerListingState.js`
- Create: `src/utils/resolveBuyerListingState.test.js`
- Create: `src/components/buyer-mobile/BuyerStatusRibbon.jsx`
- Create: `src/components/buyer-mobile/BuyerStatusRibbon.css`
- Create: `src/components/buyer-mobile/BuyerStatusRibbon.test.js`

**State contract:**

```js
resolveBuyerListingState(property, now) // => {
// state: 'available' | 'auction-live' | 'reserved' | 'sold' | 'auction-ended' | 'unavailable'
// label: string, tone: string, blocksPurchase: boolean, blocksBid: boolean
// }
```

1. Write utility tests for explicit sold/reserved flags, ended timestamps, live auctions, unavailable records, contradictory flags, and deterministic `now` injection. Sold wins over ended; unavailable wins only when no final commercial state exists.
2. Write component contract tests asserting sold uses a deep-teal diagonal band, ended auctions use a yellow/black warning-tape band, text remains selectable/accessible, and decorative slashes are CSS-only.
3. Run both tests and confirm RED.
4. Implement the pure resolver without UI assumptions, then the ribbon component with `aria-label` and no pointer-event interception.
5. Run tests and build.
6. Commit: `feat: add buyer listing state ribbons`.

## Task 4: Replace free-form toasts with a structured event model

**Files:**

- Create: `src/utils/toastModel.js`
- Create: `src/utils/toastModel.test.js`
- Modify: `src/components/ToastContainer.jsx`
- Modify: `src/utils/toastHelper.js`

**Toast event:**

```js
{
  id,
  type: 'success' | 'error' | 'warning' | 'info',
  title,
  message,
  action: { label, onClick } | null,
  duration: 5000,
  persistent: false,
  dedupeKey: null,
  announcement: 'polite' | 'assertive'
}
```

`showNotification(message, type, duration)` remains backward compatible; `showNotification(event)` becomes preferred.

1. Write pure tests for normalization, safe default durations, persistent events, assertive errors, dedupe by key, in-place updates, and a maximum of three visible events.
2. Run the utility test and confirm RED.
3. Implement `normalizeToastEvent` and `enqueueToast`. Preserve callbacks as references and generate IDs only at the container boundary.
4. Update the container listener to accept both signatures, dedupe active notifications, cap the visible stack at three, and promote queued items when one closes.
5. Run focused tests and build.
6. Commit: `refactor: structure buyer notifications`.

## Task 5: Redesign animated action toasts

**Files:**

- Modify: `src/components/Toast.jsx`
- Modify: `src/components/Toast.css`
- Modify: `src/components/ToastContainer.css`
- Create: `src/components/Toast.mobile.test.js`

1. Write a contract test asserting separate title/message, optional action button, close button label, `aria-live`, progress element, hover/focus pause handlers, 44px controls, safe mobile inset, and reduced-motion CSS.
2. Run the test and confirm RED.
3. Implement a compact card with semantic icon, title, one- or two-line explanation, optional action, close button, and progress bar. Pause auto-dismiss while hovered, focused, or while the page is hidden; resume with remaining time.
4. Animate entrance/exit with opacity and an 8–12px translation; progress is linear. Never use endless pulse. At mobile widths, place the stack below the top safe area with 12px side gutters and full available width.
5. Run focused tests, all existing toast tests, and build.
6. Commit: `feat: redesign animated buyer toasts`.

## Task 6: Make the notification center a guided mobile inbox

**Files:**

- Create: `src/utils/groupBuyerNotifications.js`
- Create: `src/utils/groupBuyerNotifications.test.js`
- Modify: `src/context/SiteNotificationsContext.jsx`
- Modify: `src/context/SiteNotificationsPanel.jsx`
- Create: `src/context/SiteNotificationsPanel.css`
- Modify: `src/pages/MainPage.css`
- Create: `src/context/SiteNotificationsPanel.mobile.test.js`

**Grouping:** `action`, `money`, `auction`, `booking`, `system`; each item exposes a primary action label/route only when the payload has an allowlisted internal route.

1. Write pure tests for grouping, newest-first stable ordering, actionable priority, unread counts, and rejecting external or malformed routes.
2. Write a component/CSS contract test for dialog semantics, grouped sections, empty/loading/error states, 44px actions, safe-area padding, and reduced motion.
3. Run tests and confirm RED.
4. Implement the grouping helper. Convert outbid/test-drive event toasts in the provider to structured events with `dedupeKey` and a relevant action.
5. Refactor the panel into a bottom sheet on mobile and right-side panel on desktop. Add heading, unread counter, “mark all read,” group labels, concise timestamps, item actions, and a persuasive empty state (“Важные шаги по сделке появятся здесь”).
6. Move `.notification-*` ownership from `MainPage.css` into the new local stylesheet; retain only unrelated MainPage selectors.
7. Run focused tests, notification tests, and build.
8. Commit: `feat: turn notifications into guided inbox`.

## Task 7: Add a readable mobile comparison surface

**Files:**

- Create: `src/components/compare/CompareMobileMetrics.jsx`
- Create: `src/components/compare/CompareMobileMetrics.css`
- Create: `src/components/compare/CompareMobileMetrics.test.js`
- Modify: `src/pages/Compare.jsx`
- Modify: `src/pages/Compare.css`
- Reuse: `src/hooks/useMobileLayout.js`

**Component:**

```jsx
<CompareMobileMetrics
  left={{ key, title, image, price }}
  right={{ key, title, image, price }}
  rows={tableRows}
  onReplace={(side) => {}}
/>
```

1. Write a contract test asserting two compact sticky object headers, metric cards instead of a table, winner labels, tie/plain states, replace actions, no horizontal overflow, and accessible row/column labels.
2. Run the test and confirm RED.
3. Extract the mobile surface. Each metric card renders the label first, then equal-width left/right values. Highlight only meaningful winners with mint fill and “Сильнее”; do not color neutral/display-only rows.
4. In `Compare.jsx`, use `useMobileLayout(767)` to render the new component only on mobile and preserve the current table on desktop. Keep the two-object same-type constraint and existing calculations unchanged.
5. Rewrite mobile CSS: 16px gutters, 20–24px section gaps, 16px card radius, sticky pair header below app chrome, and no `overflow-x:auto` for comparison content.
6. Run focused tests, existing Compare tests, and build.
7. Commit: `feat: redesign mobile property comparison`.

## Task 8: Persist an allowlisted Compare → Smart Investor scenario

**Files:**

- Create: `src/utils/investorScenarioContext.js`
- Create: `src/utils/investorScenarioContext.test.js`
- Modify: `src/pages/Compare.jsx`
- Modify: `src/pages/InvestmentCalculator.jsx`

**Contract:**

```js
writeInvestorScenario({ source: 'compare', propertyKeys: [leftKey, rightKey], selectedKey })
readInvestorScenario() // validates version, source, exactly two string keys and TTL
clearInvestorScenario()
```

1. Write tests for versioned serialization, 30-minute TTL, exactly two unique keys, string length limits, invalid JSON, external route rejection, and storage exceptions.
2. Run the test and confirm RED.
3. Implement the helper with `sessionStorage`, injected clock/storage for tests, and an explicit property-key allowlist shape. Store no prices or trusted financial results.
4. Before navigating from comparison, persist the pair and pass the existing calculator mapping through router state. On calculator mount, prefer valid router state, then valid session context, otherwise blank defaults.
5. Add visible mobile copy: “Сценарий из сравнения · 2 объекта” with a clear/reset action.
6. Run tests and build.
7. Commit: `feat: connect comparison to smart investor`.

## Task 9: Recompose Smart Investor into a guided mobile decision flow

**Files:**

- Create: `src/components/investor/InvestorMobileStepHeader.jsx`
- Create: `src/components/investor/InvestorMobileStepHeader.css`
- Create: `src/components/investor/InvestorMobileResultCard.jsx`
- Create: `src/components/investor/InvestorMobileResultCard.css`
- Create: `src/components/investor/InvestorMobileFlow.test.js`
- Modify: `src/pages/InvestmentCalculator.jsx`
- Modify: `src/pages/InvestmentCalculator.css`

1. Write a contract test for the three-step mobile path “Объект → Цель → Результат,” one primary action per viewport, visible assumptions, scenario cards, data-source labels, sticky safe-area CTA, and preserved Pro inputs.
2. Run the test and confirm RED.
3. Add a mobile-only step header with current-step copy and a compact progress bar. Keep desktop sections and existing calculation functions intact.
4. Reorder mobile content:
   - Step 1: selected/prefilled object summary and editable purchase inputs.
   - Step 2: goal chips (rent/resale/mixed), horizon, own funds, expenses, and a plain-language assumption summary.
   - Step 3: base/conservative/optimistic result cards, monthly cash flow, ROI/payback, risks, and AI explanation after deterministic values.
5. If a Pro gate opens, keep all entered values in component state and restore scroll/focus after dismissal. The gate explains the benefit and offers one primary upgrade CTA plus a secondary continue-with-basic action where existing entitlements permit it.
6. Add numeric input attributes (`inputMode`, `min`, `step`), inline validation, and never use placeholder-only labels.
7. Apply the design tokens, remove mobile decorative excess that competes with results, and add reduced-motion fallbacks.
8. Run focused tests, existing calculator tests, and build.
9. Commit: `feat: guide smart investor mobile flow`.

## Task 10: Create a persuasive, honest zero-deposit state

**Files:**

- Create: `src/components/deposit/DepositZeroState.jsx`
- Create: `src/components/deposit/DepositZeroState.css`
- Create: `src/components/deposit/DepositZeroState.test.js`
- Create asset: `public/images/buyer-mobile/deposit-zero-wallet.webp`
- Modify: `src/pages/Wallet.jsx`
- Modify: `src/pages/Wallet.css`

1. Write a contract test asserting the zero state appears only for a confirmed zero balance, has a non-misleading blurred preview labelled “Пример после пополнения,” explains what deposit unlocks, shows refundable/security copy, and has one primary top-up CTA.
2. Run the test and confirm RED.
3. Generate one original transparent-background 3D editorial illustration: a dark graphite wallet opening into a teal glass property token, soft mint glow, warm off-white ground, subtle yellow accent, no text, no logos, premium fintech/property marketplace style. Save WebP with enough detail for 2× mobile rendering.
4. Implement the empty state using the illustration, soft mint visual block, three concise benefits, a truthful blurred transaction preview, and a CTA that opens the existing top-up picker.
5. Render it only after wallet loading has resolved and `depositAmount === 0`; never flash it while data is unknown.
6. For non-zero balances, label available/reserved/required amounts separately whenever the backing data exists; do not derive reserved money from transaction history.
7. Run focused tests, wallet tests, and build.
8. Commit: `feat: redesign zero deposit conversion state`.

## Task 11: Add safe return context and migrate deposit drawers

**Files:**

- Create: `src/utils/buyerReturnContext.js`
- Create: `src/utils/buyerReturnContext.test.js`
- Modify: `src/components/DepositSuccessDrawer.jsx`
- Modify: `src/components/DepositSuccessDrawer.css`
- Modify: `src/components/DepositInfoDrawer.jsx`
- Modify: `src/components/DepositInfoDrawer.css`
- Modify: `src/pages/Wallet.jsx`

**Return contract:** Only internal paths beginning with `/property/`, `/auction`, `/compare`, `/favorites`, `/calculator`, or `/deposit` are accepted. Unknown/external paths fall back to `/auction`.

1. Write tests for allowlisted paths, encoded query strings, protocol-relative/external/JavaScript rejection, fallback behavior, and consuming context once.
2. Run the test and confirm RED.
3. Implement the pure validator plus session storage read/write helpers.
4. Migrate success and info drawers to `BuyerSheetShell`. Success copy states the confirmed amount when available, explains the next unlocked action, and uses a context-aware CTA such as “Вернуться к объекту” or “Продолжить выбор”.
5. Preserve the current Stripe/Ton confirmation boundary: the success drawer can open only from existing confirmed-success branches. Do not move success display into click handlers.
6. Prevent drawer nesting: close info/top-up choice before opening the next sheet, and restore focus to the triggering element.
7. Run focused tests, existing deposit drawer tests, and build.
8. Commit: `feat: guide confirmed deposit completion`.

## Task 12: Integrate, audit and visually polish the first wave

**Files:**

- Modify only files implicated by evidence from tests/screenshots.
- Add regression tests beside each corrected component.

1. Run all focused suites:

```bash
node --test \
  src/styles/buyer-mobile-tokens.test.js \
  src/components/buyer-mobile/*.test.js \
  src/utils/toastModel.test.js \
  src/components/Toast.mobile.test.js \
  src/utils/groupBuyerNotifications.test.js \
  src/context/SiteNotificationsPanel.mobile.test.js \
  src/components/compare/CompareMobileMetrics.test.js \
  src/utils/investorScenarioContext.test.js \
  src/components/investor/InvestorMobileFlow.test.js \
  src/components/deposit/DepositZeroState.test.js \
  src/utils/buyerReturnContext.test.js
```

2. Run the complete project test command used by the repository, then `npm run build`. Fix root causes; do not weaken assertions.
3. Start the local app and capture `/compare`, `/calculator`, `/deposit`, and the notification center at widths 320, 360, 390, 430 and 767 px. Use realistic buyer data or the existing mock/test route; create a local test buyer only if current fixtures cannot exercise the state.
4. For each viewport verify:
   - no horizontal overflow or clipped text;
   - headings and prices share a clean baseline;
   - 44px controls and safe-area spacing;
   - sticky UI never covers the final field/action;
   - drawers open/close logically and return focus;
   - notification progress/exit animations and reduced-motion mode;
   - zero, loading, error, partial-AI, and success states;
   - Compare → Smart Investor → Deposit context continuity.
5. Audit browser console and failed network requests. Confirm AI failure leaves deterministic comparison/calculator content usable.
6. Run a final build and relevant tests after every visual correction.
7. Use `superpowers:requesting-code-review`, address valid findings, then use `superpowers:verification-before-completion` before reporting the wave complete.
8. Commit final polish: `fix: polish buyer mobile decision flow`.

## Definition of Done for Wave 1

- The four target surfaces look like one product at 320–767 px and preserve desktop behavior.
- Comparison is readable without horizontal table scrolling.
- Smart Investor clearly explains inputs, assumptions, results, and next action.
- Deposit zero/success states are persuasive, honest, and context-aware.
- Toasts and the notification center are attractive, animated, actionable, deduplicated, and accessible.
- All success UI is server-confirmed; all return paths are allowlisted.
- Focus, Escape, backdrop, safe-area, touch-target, and reduced-motion checks pass.
- Tests and production build pass, and screenshots have been visually reviewed at all required widths.

## Follow-on Plans

After Wave 1 stabilizes, create separate plans for: (1) Favorites/catalog/listing-state cards, (2) property detail/auction/booking/purchase drawers, (3) buyer cabinet/bookings/history/subscriptions/bonuses, and (4) cross-flow business-logic hardening and final conversion audit. Each plan must reuse the primitives delivered here rather than create parallel visual or drawer systems.

# Purchased Property History Drawers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render a real partially paid property in `/profile` history and provide purchase-detail and seller-onboarding drawers.

**Architecture:** Normalize reservation payments in a pure helper, render them through focused card/drawer components, and keep only selection/action wiring in `TestPage`. Use the existing `property_reservation` Stripe payment contract and the existing property lookup endpoint so listing data remains authoritative.

**Tech Stack:** React 19, React Router, lucide/Feather icons, plain CSS, Node test runner, Prisma/PostgreSQL.

**Implementation status (2026-07-11):** Source changes and the idempotent database seed are implemented. The seed created payment ID `39` for real property ID `39`. Automated tests, build, dev server, and browser verification were intentionally not run because the user requested to perform runtime testing personally.

## Global Constraints

- Work only in the new buyer cabinet (`CabinetProfileRoute` → `TestPage`), never the legacy profile.
- The test purchase belongs to database user `5`, public user ID `12627`.
- The purchase references existing approved `properties_houses.id = 39` and uses its real listing data.
- Payment state is €45,000 paid out of €450,000 with €405,000 remaining.
- Do not start dev servers, watchers, builds, tests, or browser processes; the user performs runtime verification.
- Preserve unrelated dirty-worktree changes.

---

### Task 1: Reservation history normalization

**Files:**
- Create: `src/utils/cabinetPurchaseHistory.js`
- Create: `src/utils/cabinetPurchaseHistory.test.js`
- Modify: `src/hooks/useCabinetOverviewData.js`

**Interfaces:**
- Consumes: raw reservation rows returned by `/api/users/:userId/reservation-purchases`.
- Produces: `mapReservationPurchase(row)` with structured property and payment fields.

- [ ] **Step 1: Write the failing mapper tests**

Cover explicit totals, derived remaining amounts, clamped percentages, numeric strings, real location fallback (`city, country`), and invalid numeric input. Example contract:

```js
const item = mapReservationPurchase({
  id: 91,
  amount_cents: 4_500_000,
  currency: 'eur',
  paid_at: '2026-07-11T10:00:00.000Z',
  property_title: 'Пентхаус с тремя спальнями на продажу в Пальм-Мар',
  property_city: 'Palm-Mar',
  property_country: 'Spain',
  billing: {
    property_id: 39,
    property_type: 'house',
    minimum_sale_price: 450_000,
    total_paid_toward_price: 45_000,
    remaining_to_full_purchase: 405_000,
    policy_version: 'reservation_policy_v1',
  },
})
assert.equal(item.paymentPercent, 10)
assert.equal(item.location, 'Palm-Mar, Spain')
```

- [ ] **Step 2: Leave the documented RED command for user verification**

Run: `node --test src/utils/cabinetPurchaseHistory.test.js`

Expected before implementation: FAIL because `mapReservationPurchase` does not exist. Codex does not execute it per the global constraint.

- [ ] **Step 3: Implement the pure mapper**

Implement exported helpers:

```js
export function finiteMoney(value, fallback = null)
export function resolvePurchaseLocation(row)
export function mapReservationPurchase(row)
```

Return `propertyId`, `propertyType`, `title`, `location`, `imageSrc`, `paidAmount`, `totalAmount`, `remainingAmount`, `currency`, `paymentPercent`, `purchaseDateRaw`, `policyVersion`, and `purchaseChannel: 'buy_now'`. Clamp percent to `0..100` and remaining to at least zero.

- [ ] **Step 4: Connect the mapper to cabinet history**

Replace the inline reservation calculation inside `buildHistoryData` with `mapReservationPurchase`, while retaining the current formatted `amount`, `purchaseDate`, `href`, `dayKey`, and sorting fields.

- [ ] **Step 5: Leave the documented GREEN command for user verification**

Run: `node --test src/utils/cabinetPurchaseHistory.test.js`

Expected after implementation: PASS.

### Task 2: Purchased property card and drawer

**Files:**
- Create: `src/components/PurchasedPropertyHistoryCard.jsx`
- Create: `src/components/PurchasedPropertyHistoryCard.css`
- Create: `src/components/PurchasedPropertyHistoryCard.test.js`
- Create: `src/components/PurchasedPropertyDrawer.jsx`
- Create: `src/components/PurchasedPropertyDrawer.css`
- Create: `src/components/PurchasedPropertyDrawer.test.js`

**Interfaces:**
- Consumes: normalized history item from Task 1.
- Produces: `PurchasedPropertyHistoryCard({ item, onOpenDetails })` and `PurchasedPropertyDrawer({ item, view, onClose, onBack, onContactManager, onSell, onBecomeSeller })`.

- [ ] **Step 1: Write card and drawer contract tests first**

Use source-contract tests consistent with the repository to assert visible copy, semantic dialog attributes, the primary `Подробнее` action, both drawer actions, all six onboarding steps, Escape handling, overlay close, and responsive CSS selectors.

- [ ] **Step 2: Leave RED commands for user verification**

Run:

```bash
node --test src/components/PurchasedPropertyHistoryCard.test.js
node --test src/components/PurchasedPropertyDrawer.test.js
```

Expected before implementation: FAIL because the component files do not exist.

- [ ] **Step 3: Implement the history card**

Render the real image/title/location, `Купить сейчас`, `Оплачено 10%`, formatted paid/total values, progress bar, date, and one `Подробнее` button. Use a real `<button>` and expose the originating item to `onOpenDetails(item)`.

- [ ] **Step 4: Implement the two-view drawer**

For `view === 'details'`, render financial summary, remaining balance, rules, manager action, and sell action. For `view === 'sell'`, render six numbered steps, back action, and `Стать продавцом`. Add dialog labelling, Escape close, focus restoration, scroll locking, and reduced-motion behavior.

- [ ] **Step 5: Implement responsive styling**

Desktop: fixed right drawer up to 520px wide. Mobile: bottom/full-height sheet with safe-area padding. Follow existing white/teal/navy cabinet tokens and 44px minimum touch targets.

- [ ] **Step 6: Leave GREEN commands for user verification**

Expected after implementation: both component contract tests PASS.

### Task 3: Integrate drawers into the new profile

**Files:**
- Modify: `src/pages/TestPage.jsx`
- Modify: `src/pages/TestPage.css`
- Create: `src/pages/TestPage.purchase-history.test.js`

**Interfaces:**
- Consumes: components from Task 2 and `historySections` from `useCabinetOverviewData`.
- Produces: profile-level state transitions `closed → details → sell → details/closed`.

- [ ] **Step 1: Write the failing integration contract**

Assert that reserve items render `PurchasedPropertyHistoryCard`, details selection stores the entire item, manager action calls the existing `openManagerChatModal`, sell action changes the drawer view, and become-seller calls the existing seller handler.

- [ ] **Step 2: Leave the RED command for user verification**

Run: `node --test src/pages/TestPage.purchase-history.test.js`

Expected before implementation: FAIL because integration imports and state are absent.

- [ ] **Step 3: Add selection and view state**

Use:

```js
const [selectedPurchasedProperty, setSelectedPurchasedProperty] = useState(null)
const [purchaseDrawerView, setPurchaseDrawerView] = useState('details')
```

Opening details stores the item and resets the view to `details`. Closing clears the item. `Продать объект` changes the view to `sell`; back returns it to `details`.

- [ ] **Step 4: Replace only reservation purchase cards**

Inside the existing history section map, render `PurchasedPropertyHistoryCard` for `section.key === 'reserve'`. Preserve existing mini cards for auctions, shares, and bids.

- [ ] **Step 5: Wire drawer actions**

`Связаться с менеджером` closes the purchase drawer and calls the existing manager chat opener. `Стать продавцом` calls `handleSellObjectFromHistory`. Remove the obsolete `isSellObjectPromptOpen` confirmation modal and its unused handlers/styles.

- [ ] **Step 6: Leave the GREEN command for user verification**

Expected after implementation: the profile integration contract PASS.

### Task 4: Persist the real test purchase

**Files:**
- Create: `scripts/seed-profile-purchased-property.mjs`

**Interfaces:**
- Consumes: configured Prisma database and existing user/listing rows.
- Produces: exactly one idempotent `stripe_payments` row with dedupe key `codex-profile-real-property-39-user-5-v1`.

- [ ] **Step 1: Implement a guarded seed script**

The script must read user `5` and `properties_houses.id = 39`, assert public ID `12627`, approval status, real price `450000`, currency `EUR`, title, and at least one photo, then upsert only the payment row. Build `billing_reason` from the live property values:

```js
{
  type: 'property_reservation',
  minimum_sale_price: property.minimum_sale_price ?? property.price,
  ten_percent: total * 0.1,
  paid_stripe_cents: 4_500_000,
  property_id: property.id,
  property_type: property.property_type,
  policy_version: 'reservation_policy_test_v1',
  total_paid_toward_price: 45_000,
  remaining_to_full_purchase: 405_000,
}
```

- [ ] **Step 2: Run only the approved one-shot database seed**

Run: `node scripts/seed-profile-purchased-property.mjs`

Expected: prints the payment ID, user public ID, real property title, and `created` or `already exists`; it must not start a long-running process.

- [ ] **Step 3: Read the row back inside the same script**

Verify dedupe key, user ID, plan key, paid cents, property ID, total, and remaining amount before disconnecting Prisma.

### Task 5: User-run verification handoff

**Files:**
- Modify: `docs/superpowers/plans/2026-07-11-profile-purchased-property-drawers.md`

**Interfaces:**
- Consumes: all prior tasks.
- Produces: exact verification checklist without Codex launching processes.

- [ ] **Step 1: Provide automated commands without running them**

```bash
node --test src/utils/cabinetPurchaseHistory.test.js \
  src/components/PurchasedPropertyHistoryCard.test.js \
  src/components/PurchasedPropertyDrawer.test.js \
  src/pages/TestPage.purchase-history.test.js
npm run build
```

- [ ] **Step 2: Provide manual acceptance checks**

At `/profile`: open History, confirm the real Palm-Mar property and €45,000/€450,000 figures, open details, open manager chat, traverse details → sell → back, check `Стать продавцом`, close with Escape/overlay, and repeat at mobile width.

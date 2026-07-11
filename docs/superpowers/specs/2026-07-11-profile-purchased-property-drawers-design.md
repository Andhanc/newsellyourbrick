# Purchased property history and resale onboarding

## Goal

Show a real purchased property in the buyer cabinet served by `/profile`, let the buyer inspect the payment and transaction state in a polished drawer, and explain how to resell the property through a second seller-onboarding drawer.

The feature must use the new buyer cabinet (`CabinetProfileRoute` → `TestPage`) and must not modify the legacy profile page.

## Test data

The test purchase belongs to Vlad Tichonenko, public ID `12627`, database user ID `5`.

It references an existing approved listing rather than a fixture:

- table: `properties_houses`
- property ID: `39`
- title: `Пентхаус с тремя спальнями на продажу в Пальм-Мар`
- country: `Spain`
- price and minimum sale price: `€450,000`
- property type: `house`
- photos: existing listing photos stored in the database

The purchase is represented by the established `stripe_payments` reservation model:

- `plan_key`: `property_reservation`
- paid amount: `€45,000` (`4,500,000` cents)
- total price: `€450,000`
- remaining amount: `€405,000`
- payment status: `paid`
- a stable test-only deduplication key prevents duplicate rows
- `billing_reason` stores the real property ID/type and the existing reservation financial fields

The listing remains the source of truth for title, image, location, type, and detail URL. The payment row is the source of truth for paid, total, remaining, currency, policy version, and payment date.

## History card

Inside the existing History dropbox, a reservation purchase is rendered as an ownership-oriented card rather than a generic activity row.

The card contains:

- the real property cover image, title, and resolved location (`location`, then `city + country`, then `country`)
- a `Купить сейчас` badge and an `Оплачено 10%` status
- paid amount, full amount, and a compact payment progress bar
- payment date
- one primary `Подробнее` action

The card remains searchable by title and location. If optional property fields are absent, it degrades to the existing placeholder image and neutral text without breaking the History section.

## Purchase details drawer

Selecting `Подробнее` opens an accessible overlay drawer. It slides in from the right on desktop and becomes a bottom/full-height sheet on small screens.

The drawer contains:

- property cover, title, resolved location, and purchase status
- a prominent payment summary: `€45,000 из €450,000`
- a progress bar and remaining amount `€405,000`
- transaction date and purchase channel
- concise rules: the payment is the 10% reservation, the manager coordinates the documents and next payment, transaction terms follow the signed policy/agreement, and resale is available through a verified seller account
- `Связаться с менеджером`, which opens the existing manager chat
- `Продать объект`, which transitions to the resale onboarding drawer

Closing returns focus to the originating `Подробнее` button. Escape and overlay click close the active drawer. Background scrolling is locked while a drawer is open.

## Resale onboarding drawer

The second drawer explains the seller transition in six short steps:

1. Create or activate a seller account.
2. Verify identity and seller contact details.
3. Receive the purchased object as a draft in the seller cabinet.
4. Review the real listing data, photos, and ownership documents.
5. Choose the sale format, price, and publication conditions.
6. Submit the listing for moderation and publish after approval.

It has a back action to the purchase details and a primary `Стать продавцом` button. The button reuses the current seller-registration flow; an already linked seller is sent to new-property creation.

## Data contract

`useCabinetOverviewData` enriches reservation history items with structured fields used by the card and drawers:

- `propertyId`, `propertyType`, `href`, `imageSrc`, `title`, `location`
- `paidAmount`, `totalAmount`, `remainingAmount`, `currency`
- formatted card values remain available for existing consumers
- `paymentPercent`, clamped to `0..100`
- `purchaseDateRaw` and the existing day grouping key
- `policyVersion` and `purchaseChannel`

Financial calculations accept numeric strings, reject non-finite values, and never render negative remaining balances. A missing explicit total falls back to the reservation metadata; a missing remaining balance is derived from total minus paid.

## Component boundaries

- A pure history-data mapper owns normalization and financial derivation so it can be tested without React.
- A focused purchased-property card owns the compact history presentation.
- A focused drawer component owns both drawer views and their transition.
- `TestPage` owns selection state and connects actions to the existing manager chat and seller registration handlers.

This keeps the already-large profile page from absorbing all presentation and calculation logic.

## Styling and accessibility

The visuals follow the new cabinet language: white surfaces, restrained teal accents, dark navy type, soft borders, large radii, and subtle depth. Motion respects `prefers-reduced-motion`.

Both drawer views use dialog semantics, labelled headings, explicit close/back buttons, visible focus states, readable contrast, and touch targets of at least 44px on mobile.

## Verification scope

Automated tests should cover the pure mapper, purchase card contract, drawer content/actions, and required responsive/accessibility CSS contracts. The user explicitly requested that Codex not start dev servers, watchers, builds, tests, or browser processes, so runtime verification is left for the user.

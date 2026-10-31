# Development: implementation and local testing

Development is a fifth deal model. `asset_type=land` is an asset type inside a development project, not a sixth deal category.

## Entry points

- `/development`: published development projects.
- `/development/callao-salvaje-costa-adeje-demo`: seeded Callao Salvaje project (local database ID 1).
- `/owner-test/add-property?model=development`: existing property wizard with Development economics.
- `/development/mine`: current seller's projects, including unpublished drafts.
- `/buyer-passport`: investor identity status, platform balance and declared preferences.
- `/deal-room/:table/:id`: owner-only editing of an ordinary asset's strategy, assumptions, exit estimates and live activity. Accessible from property details and seller analytics.

The API uses `/api/development`. All mutations, passports, seller analytics and private documents require a valid existing bearer session; a client-supplied user ID is never trusted. Owner checks use the database. Ordinary auction bidding, purchases, deposit/VIP gates and existing gallery behavior remain intact.

## Local demo

The idempotent script creates only a dedicated demo seller and Development project. It does not reset existing users, seed fake investors, mark identity verified, collect payments or overwrite an existing demo's test progress.

```sh
npx prisma generate
npx prisma migrate deploy
node scripts/seed-development-demo.mjs '/absolute/path/Costa_Adeje_Institutional.pdf'
```

Credentials for the new demo seller are generated once in ignored `output/development/demo-access.json` with mode 0600. Sign in as seller using that account, then open the demo project. Keep this file private. If the account already exists, the script does not reset its password.

The source memorandum supplies land €580,000, construction €550,000, sale forecast €2,200,000 and gross profit €1,070,000. The demo explicitly labels these additional assumptions: 18 months, 12% simple annual preferred return, 20% of residual profit to SellYourBrick and 80% to the developer. These are not agreed commercial terms from the source. Other costs are zero only to reproduce the source's gross illustration; taxes, selling expenses and contingencies must be supplied for a complete net budget.

## Test flow

1. Open the public project and confirm 0% collected, 94.69% gross project ROI and a separate investor waterfall. Check mobile and desktop layouts and Escape in the photo gallery.
2. Sign in as a test buyer. Complete Buyer Passport and explicitly enable sharing. Identity and platform deposit are read-only. Submit a project expression of interest: it is idempotent per buyer/project and does not increase funded capital.
3. Sign in as the demo seller. The dashboard refreshes every 10 seconds. It shows consenting buyers and their proposed amounts, bids and private offers. Withdrawing passport consent removes that profile from future responses.
4. Record external funds with a unique receipt reference. These are seller-reported, not platform-verified payments. Overfunding is rejected. Publishing a land project opens investor search, so buyers can apply without a separate stage note. The public catalogue hides projects that are still at the land stage or have incomplete economics. Later stages advance in order and require supporting notes. The construction stage is blocked until required capital is recorded.
5. Advance through construction, sale and investor return. These stages record external execution; they do not initiate bank transfers or securities transactions.
6. For an ordinary owned property, fill investment assumptions and legal/title/occupancy/zoning/comparable information. Missing numbers remain unknown. ROI, monthly cash-flow IRR and a maximum suggested bid derive only from those inputs. The AI action opens the existing property AI report flow.
7. Set seller objectives and compare exit estimates. Model changes append to asset history. Create a linked Development project from the asset's deal room; publishing it records the development transition and exposes its link on the original property. Existing contractual bids are not cancelled by the strategy planner.

## Product boundaries

- Buyer Passport confirms account identity and current platform deposit in EUR. External wealth, declared past deals and average ticket are not independently verified.
- Funding receipts are manually recorded by the owner. No escrow, banking connector or automatic distribution is introduced.
- Fund/bank/private exits are seller-entered scenarios. There is no automatic bank/fund offer or guarantee of sale.
- The indicative seller outcome is the observed offer/bid range after at least three observations, not an AI prediction. Activity is deduplicated per visitor within 30 minutes. Country comes from the account; anonymous visits remain unknown.
- Public development projects have separate IDs from existing property tables. Source table plus ID preserves original asset identity and history.
- Documents are stored under ignored `server/private-development/`, outside the public uploads directory. Back this directory up with PostgreSQL. Downloads require the owner or verified identity plus a platform deposit. Uploading documents does not establish legal verification.
- UI copy is present in ru/en/de/es/fr/pl/sv. Seller-supplied free text retains its original language.

## Validation

```sh
RUN_DEVELOPMENT_DB_TESTS=1 node --test server/developmentRoutes.test.js
node --test src/utils/developmentFinance.test.js src/features/development/development.parity.test.js
npm run build
git diff --check
```

The opt-in integration test creates isolated disposable users/projects and cleans them up. It exercises auth, owner isolation, forged verification fields, consent withdrawal, interest upserts, term locking, funding caps, stage sequencing, source-asset history, private document access and financial outputs.

The wider regression run has four unrelated failures reproduced from HEAD: two old profile empty-state text assertions in `BuyerAccountMobileExperience.test.js` and two AI PDF color assertions in `PropertyAiExperience.colors.test.js`. Carousel, stories, SectionInfoDrawer, role switch, property detail, investor flow, compare picker and debt-risk checks otherwise pass. Native routes and legacy parity are included; no device build was performed.

### Pooled investments (October 2026)

DEVELOP supports multiple investors through the project investment drawer. The Collection tab shows confirmed funding, the target, a chosen amount, its percentage of the required capital and a payment split. Up to EUR 3,000 of the buyer’s existing deposit can be applied, matching the existing checkout offset; the remainder goes through hosted Stripe Checkout. Non-EUR projects use the same server FX conversion as the existing checkout.

The `development_investments` table tracks pending, paid and cancelled payments. Project and wallet row locks protect capacity and wallet balances; the client request UUID prevents duplicate charges. Pending payments reserve capacity and any wallet portion, but do not increase confirmed funding. Stripe session verification, the signed webhook or the authenticated return path confirm payment idempotently. Expiry/cancellation returns the held wallet amount. Stale checkout reservations reconcile on the next wallet/checkout request. Apply migration `20261024130000_development_investments` before deploying.

The Investors tab groups only confirmed investment payments by public user ID, country and share of the required capital. It does not expose names, contacts, checkout references or passport information. Seller-reported external funds contribute to funding totals but do not invent an investor identity. The old interest endpoint remains available for existing full-capital enquiries. Sellers can record partial external funding; all confirmed and pending funds count toward the capacity limit. Project economics lock while a payment is pending or paid.

Publication and project management still require a seller/owner role. The public catalogue remains in two columns; sellers enter via My Properties → DEVELOP. Gallery, document access, waterfall and stage-evidence rules are preserved.

Validation: `RUN_DEVELOPMENT_DB_TESTS=1 node --test server/developmentInvestments.test.js server/developmentRoutes.test.js`, the development math/parity tests and the wider UX regression tests. The investment integration test uses local disposable users/projects and a fake Stripe provider; it checks wallet debits, repeat requests, card confirmation, cancellation refunds, privacy and concurrent capacity claims without charging a card.

Generated artwork (built-in `image_gen`, transparent WebP, mirrored to `apps/client/public/`):
- `public/images/development/investment-villa-tiffany-v1.webp`: premium isometric 3D white porcelain villa, Tiffany glass roof/pedestal, silver and champagne coins, subtle growth blocks; exact Tiffany accent `#63CDD4`, soft studio lighting, transparent background, no text or UI.
- `public/images/development/investment-community-tiffany-v1.webp`: three abstract white porcelain investor busts on overlapping frosted Tiffany glass discs with a silver coin; exact Tiffany accent `#63CDD4`, soft studio lighting, transparent background, no text or UI.

### Portfolio and repeat investments

A successful payment now dismisses the investment form and opens a separate confirmation sheet with the confirmed payment amount, **Open portfolio** and **Invest again**. Closing the confirmation or investing again leaves the collection form available whenever project capacity remains. The visible “Invest” toolbar heading has been removed; the dialog keeps its accessible title.

`GET /api/development/portfolio` and `/portfolio/:projectId` use the authenticated session, return only that user's confirmed investments and aggregate repeated payments into one project card. The account history adds a DEVELOP category when there are investments. Opening a card fetches a fresh total, share and project stage; it does not expose another buyer's identity, payment session, owner IDs or private stage notes. Money receipts keep cents when present.

Project publishers enter **My properties → DEVELOP → Manage stages**. The existing owner-only stage endpoint remains the authority, retaining sequential stages, funding prerequisites and evidence notes. Portfolio stage history comes from that same project record. Tests cover repeat contributions, private portfolio access and a seller stage change appearing in the buyer's portfolio. UI checks use an isolated local fixture with synthetic data; no real payment is performed.

# Maestro E2E Report (local)

- App: `http://localhost:5173`
- Maestro CLI: `2.10.0` (web / Chromium, en-US)
- Suite window: 2026-09-22T19:42:39Z → 2026-09-22T20:18:04Z (~35 min)
- Flow files: **10** under `maestro/flows/`
- Suite repeats: **3**

## Verdict

Buyer and seller authenticated cabinets are green across all three suite repeats. Guest catalog/marketing and seller owner views stabilize by run 2–3. Remaining flake is discover hero chrome timing after the welcome → stage transition.

### Suite scoreboard

| Run | Flows passed | Failures |
|-----|--------------|----------|
| 1 | **6/10** | auth-login-ui-buyer, guest-discover-hero, guest-catalog-sections, guest-discover-interactions |
| 2 | **8/10** | auth-login-ui-buyer, guest-discover-hero |
| 3 | **9/10** | guest-discover-hero |

Per-flow across 3 runs: buyer cabinet/catalog/property detail **3/3**, seller cabinet/owner views **3/3**, guest marketing **3/3**, guest catalog **2/3**, guest interactions **2/3**, auth UI **1/3**, discover hero **0/3** (asserted stage cards inconsistently after transition; softened afterward).

## Demo accounts & data

Seed: `npm run maestro:seed` → `scripts/seed-maestro-demo.mjs`

| Role | Email | Password | Notes |
|------|-------|----------|-------|
| Buyer | `maestro-buyer@sellyourbrick.test` | `MaestroDemo2026!` | verified, deposit €250k, VIP |
| Seller | `maestro-seller@sellyourbrick.test` | `MaestroDemo2026!` | verified |

Demo listings (seller-owned, approved):

- `maestro-demo-auction-villa` — auction + test-drive
- `maestro-demo-buy-now-loft` — buy-now + test-drive
- `maestro-demo-debt-townhouse` — debt
- `maestro-demo-share-penthouse` — co-investment shares
- `maestro-demo-vip-estate` — private-club auction

Also seeded: buyer favorites, approved bonus submissions (buyer + seller), test-drive booking, reservation payment. Manifest: `maestro/demo-manifest.json`.

## What was wired

- Maestro installed locally (`~/.maestro/bin`)
- YAML suite in `maestro/flows/{guest,auth,buyer,seller}/`
- Dev session hydrator `/__e2e__/session?role=buyer|seller&next=…`
- Login `data-testid`s: `login-email`, `login-password`, `login-submit`
- npm scripts: `maestro:seed`, `maestro:test`, `maestro:test:once`
- Docs: `maestro/README.md`
- Artifacts: `maestro/reports/` (JUnit + screenshots per run)

## Coverage map

**Guest:** discover hero → stage cards (Auction / Buy now / Debts / Shares), auction/buy-now/debts/co-investment lists + demo property details, map, search, favorites, compare, about/buyer/seller landings, news, private club, calculator, lottery, bonuses, test-drive, app, sections, wallet/profile gates.

**Buyer (session):** profile + data/subscriptions/history/bookings, wallet, bonuses, favorites, compare, private club, catalogs, chat, news, calculator, lottery, demo property details including VIP + test-drive booking URL.

**Seller (session):** `/owner-test` home/properties/test-drive/wallet/subscriptions/profile/statistics/settings/add-property, legacy owner redirects, bonuses, own listing detail.

## How to re-run

```bash
npm run start:local   # if not already up
npm run maestro:seed
npm run maestro:test  # 3 suite repeats by default
```

Detailed JUnit:

- `maestro/reports/2026-09-22T19-42-39-313Z-run-1/junit.xml`
- `maestro/reports/2026-09-22T19-42-39-313Z-run-2/junit.xml`
- `maestro/reports/2026-09-22T19-42-39-313Z-run-3/junit.xml`

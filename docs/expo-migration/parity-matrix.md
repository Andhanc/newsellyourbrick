# Expo Migration — Route / Feature Parity Matrix

Status: living document. Updated as slices land.

## Scope decisions

| Surface | Android | Expo Web | Notes |
|---------|---------|----------|-------|
| Buyer public + account | Yes | Yes | Primary product |
| Seller cabinet + add property | Yes | Yes | After buyer slices |
| Admin / Marketer | No | Yes | `.web.tsx` only |
| SEO / SSR meta | N/A | Via Express adapter | Keep `server/seo*` |
| Owner-test / mock routes | No | Redirect only | Collapse to real cabinet |

## Public / Buyer routes

| Path | Platform | Slice | Status |
|------|----------|-------|--------|
| `/` MobileDiscover | both | A | live — Expo hero/stage on :8082 |
| `/auction` | both | A | live — list from API |
| `/auction/property/:slug` | both | A | use `/property/:slug` |
| `/debts` | both | A | live catalog filter |
| `/co-investment` + detail | both | A | live catalog + `/property` |
| `/property/:slug` | both | A | live + bid/favorite/compare |
| `/search-results*` | both | A | live |
| `/map` | both | A | stub (maps spike) |
| `/news`, `/news/:slug` | both | A | live from `/api/news/articles` |
| `/about` | both | A | stub |
| `/buyer`, `/seller` | both | A | live landings |
| `/test-drive*` | both | B | pending |
| `/profile*` | both | B | live session cabinet |
| `/wallet`, `/deposit` | both | B | live Stripe checkout + confirm |
| `/favorites`, `/compare` | both | B | live (API + local) |
| `/bonuses`, `/chat`, `/history` | both | B | chat stub; rest pending |
| `/subscriptions`, `/private-club` | both | B | stub |
| `/calculator` | both | B | pending |
| `/oauth-bridge`, telegram callback | both | B | pending |

## Seller routes

| Path | Platform | Slice | Status |
|------|----------|-------|--------|
| `/owner`, `/owner/property/new` | both | C | live 4-step create |
| `/owner/properties` | both | C | live from `/api/properties/user/:id` |
| `/property/:id/edit` | both | C | pending |
| Owner-test legacy redirects | web | C | redirect only |

## Web-only

| Path | Slice | Status |
|------|-------|--------|
| `/admin` | D | shell + listing count |
| `/marketer` | D | shell |

## Visual baseline checklist (browser)

| Screen | Baseline shot | Expo shot | Match |
|--------|---------------|-----------|-------|
| `/` hero mobile | pending | pending | — |
| `/` stage mobile | pending | pending | — |
| `/auction` mobile | pending | pending | — |
| Property detail mobile | pending | pending | — |
| `/debts` mobile | pending | pending | — |
| Desktop auction | pending | pending | — |

## Android build readiness gates

- [x] Expo app boots on web (`:8082`)
- [x] Expo web export succeeds (`dist-web`)
- [x] Absolute API / media URLs (`EXPO_PUBLIC_*`)
- [x] Android package + EAS profiles (`com.sellyourbrick.app`)
- [x] Email auth session + SecureStore adapter
- [x] Express `resolveWebDist` for Expo Web cutover flag
- [ ] Expo Android development build compiles on device/CI
- [ ] Secure auth (Clerk JWT / `REQUIRE_API_AUTH`) enabled in prod
- [ ] Deep links for Stripe / OAuth verified on device
- [ ] Maps / KYC / uploads spikes green
- [ ] Pixel parity acceptance for buyer public routes

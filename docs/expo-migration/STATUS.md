# Expo migration status

Updated: 2026-07-26 (continued session)

## Running

| App | URL |
|-----|-----|
| Vite reference | http://localhost:5173 |
| Expo Web | http://localhost:8082 |
| API | http://127.0.0.1:3000 |

## Routes in `apps/client` (live tree)

- `/` MobileDiscover (hero + stage + search → `/search-results`)
- `/auction`, `/debts`, `/co-investment` — catalogs from `/api/properties/approved`
- `/property/[slugOrId]` — detail + favorite/compare + auction bid
- `/search-results`, `/buyer`, `/seller`
- `/news`, `/news/[slug]`, `/about`, `/map`
- `/login` — email register/login (buyer/seller) via `/api/auth/email/*`
- `/profile`, `/favorites`, `/wallet` (Stripe checkout + confirm), `/compare`, `/subscriptions`, `/chat`
- `/owner`, `/owner/properties`, `/owner/property/new` — 4-step create wizard
- `/admin`, `/marketer` — web shells (Android unavailable)

## Backend

- CORS allowlist + optional Clerk JWT (`REQUIRE_API_AUTH=1`)
- `resolveWebDist` wired into production static + SEO 404 (`USE_EXPO_WEB=1` / `EXPO_WEB_DIST`)
- Existing Stripe/SEO Express modules kept

## Still open for “full complete”

- Pixel-perfect discover/catalog/detail vs Vite CSS
- Clerk Expo SDK (email auth works now; Clerk is optional gate)
- Full Stripe return deep-link QA on device
- Maps native, KYC camera, TON, SSE/push
- Full OAP wizard (media/docs/verification/test-drive steps)
- Full admin/marketer CRM port
- Production SEO cutover canary + crawl QA
- Signed Android release + device QA

Honesty gate: **not fully migrated**; buyer public + account + seller basics + SEO dist switch are substantially advanced.

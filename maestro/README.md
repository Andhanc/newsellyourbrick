# Maestro E2E (local web)

Local Chromium flows for buyer + seller paths on Vite (`http://localhost:5173`).

## Prerequisites

1. Install Maestro once:

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
export PATH="$PATH:$HOME/.maestro/bin"
```

2. Run API + Vite:

```bash
npm run start:local
```

## Seed demo data

```bash
npm run maestro:seed
```

Creates:

| Role | Email | Password |
|------|-------|----------|
| Buyer | `maestro-buyer@sellyourbrick.test` | `MaestroDemo2026!` |
| Seller | `maestro-seller@sellyourbrick.test` | `MaestroDemo2026!` |

Also seeds auction / buy-now / debt / share / VIP properties, favorites, bonuses, deposit, VIP, test-drive booking, and a reservation payment. Manifest: `maestro/demo-manifest.json`.

## Run suite

```bash
# 3 full suite passes (default)
npm run maestro:test

# custom repeat count
MAESTRO_RUNS=5 npm run maestro:test
```

Reports land in `maestro/reports/` (`LATEST.md`, JUnit XML per run).

## Single flow

```bash
maestro test maestro/flows/guest/01-discover-hero.yaml \
  --headless \
  -e APP_URL=http://localhost:5173
```

## Dev session helper

`/__e2e__/session?role=buyer&next=/profile` (dev only) logs in via API and hydrates `localStorage` for authenticated flows.

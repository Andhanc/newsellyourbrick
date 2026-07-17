# Auction App-First Mobile QA — 2026-07-17

## Automated evidence

- Focused auction, shared pagination, Test Drive, and Shares catalogue tests.
  - Result: 35 passed, 0 failed.
- Scoped `git diff --check` for every auction-wave source, test, plan, and asset consumer.
  - Result: passed.
- `npm run build`
  - Result: passed; Vite transformed 4,575 modules and built production output in 12.53s.
  - Existing warnings remain for mixed static/dynamic imports and large chunks; no new compile error was introduced.

## Contract verified by tests

- `/auction` uses a dedicated mobile photo-first hero and hides the generic three-card feature composition on phones.
- Mobile catalogue uses exactly two columns at 320–767px, including the former 374px one-column fallback.
- Mobile page size is 16 and further results use semantic pagination, not “show everything”.
- Pagination and primary card controls expose at least 44px touch targets.
- Favourites continue through `PropertyFavoritesContext`.
- Auction cards expose at most two compact real property specs.
- Sold and auction-ended states are resolved by existing business logic, suppress stale bid/purchase controls, and render the generated raster caution-tape asset.
- Private-club and feature-badge commercial affordances now consume the same `blocksBid` / `blocksPurchase` flags.
- Desktop pagination keeps its established class and layout contract; phones use `ListingPagePagination` with 44px controls.
- The card uses a non-interactive article shell, canonical media/title links, and sibling buttons; favourite state exposes a translated dynamic label and `aria-pressed`.
- Final-state ribbon and recovery copy are translated in Russian, English, Spanish, French, Swedish, and German.
- The existing animated filter drawer, loading state, error/empty state, auth guard, and property navigation remain wired.

## Visual and interaction QA

The in-app browser runtime returned `No browser is available` for the local `/auction` URL. Browser screenshots at 320, 390, 430, and 767px and direct interaction checks for the filter drawer, favourites, CTA scroll, and pagination are therefore blocked in this worker. The parent task must run those checks before declaring the overall design complete.

**Final result: blocked for browser-only visual comparison; automated implementation checks passed.**

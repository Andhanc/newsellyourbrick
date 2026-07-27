# Shares marketplace implementation report

Status: DONE

## Scope completed

- Removed the 87-item synthetic catalogue, demo padding, fabricated portfolio/platform facts, and local pre-liked state from `/co-investment`.
- Added pure, tested presentation helpers for truthful API normalisation, nullable values, forecast labelling, final-state blocking, and strict 16-item pagination.
- Rebuilt the route as a distinct dark-emerald/pearl portfolio marketplace with real API-derived summary facts only.
- Added stable `source_table` identity to the shares API so apartment/house ID collisions cannot share a favourite key; database-backed favourites now persist against the correct source table.
- Removed the legacy external-photo substitution from the API so missing photography is represented by the generated neutral marketplace artwork.
- Added globally ordered server pagination and client-side exhaustive API paging, removing the previous 100-item catalogue ceiling while retaining exactly 16 cards per UI page.
- Made active reservations honour `reserved_by`/`reserved_until`, allow expired reservations to return to sale, and made completed funding consistently read `Сбор завершён` across ribbon and CTA.
- Added loading skeletons, explicit network error recovery, guided empty/filter-empty states, functional catalogue/profile CTAs, filter reset, page reset, and scroll-on-pagination.
- Reworked share cards for real photography, minimum entry, available-share/progress disclosure, forecast labels, 44px actions, shared `BuyerStatusRibbon`, and disabled final-state CTA.
- Added route-scoped responsive CSS preserving exactly two columns at 320/375/390/430px, 44px interactive targets, and reduced-motion support.
- Added Escape-to-close, focus trap, focus restoration, focus-on-open, and scroll lock to the filters drawer.

## TDD evidence

RED command:

`node --test src/utils/sharesMarketplacePresentation.test.js src/pages/Shares.mobile-catalog.test.js`

RED result before implementation: 10 tests, 0 passed, 10 failed. Failures specifically identified the missing pure helper module, retained synthetic/demo catalogue, local `Set` favourites, fabricated facts, missing guided states, missing shared ribbon, and missing route CSS.

Initial GREEN command:

`node --test src/utils/sharesMarketplacePresentation.test.js src/pages/Shares.mobile-catalog.test.js`

Initial GREEN result: 10 tests, 10 passed, 0 failed.

Blocker-fix RED command:

`node --test server/database/shareMarketplaceQueries.test.js src/utils/sharesMarketplacePresentation.test.js src/pages/Shares.mobile-catalog.test.js src/components/SharesMobileFiltersDrawer.accessibility.test.js`

Blocker-fix RED result: 17 tests, 8 passed, 9 failed. The failures covered source-table collisions, global pagination, missing-photo honesty, reservation expiry, completed-funding copy, exhaustive client paging, drawer keyboard accessibility, and undersized touch targets.

Final GREEN command:

`node --test server/database/shareMarketplaceQueries.test.js src/utils/sharesMarketplacePresentation.test.js src/pages/Shares.mobile-catalog.test.js src/components/SharesMobileFiltersDrawer.accessibility.test.js src/components/buyer-mobile/BuyerStatusRibbon.test.js src/components/buyer-mobile/BuyerSheetShell.test.js`

Final GREEN result: 25 tests, 25 passed, 0 failed.

Additional verification:

- `npm run build` — passed; only existing Vite dynamic-import/chunk-size and missing optional production env warnings.
- `git diff --check` — passed with no whitespace errors.
- Controller visual QA covered 320/390/430px; its metric stacking, generated fallback asset, and scroll-margin refinements were preserved.

## Changed files

- `src/pages/Shares.jsx`
- `src/pages/Shares.mobile-catalog.test.js`
- `src/pages/CoInvestment.mobile.css` (new)
- `src/components/SharesPropertyCard.jsx`
- `src/components/SharesPropertyCard.css`
- `src/components/SharesMobileFiltersDrawer.jsx`
- `src/components/SharesMobileFiltersDrawer.css`
- `src/components/SharesMobileFiltersDrawer.accessibility.test.js` (new)
- `src/utils/sharesMarketplacePresentation.js` (new)
- `src/utils/sharesMarketplacePresentation.test.js` (new)
- `server/database/shareMarketplaceQueries.js` (new)
- `server/database/shareMarketplaceQueries.test.js` (new)
- `server/database/module2PropertyPrisma.js`
- `server/server.js`
- `.superpowers/sdd/shares-report.md` (this report)

No commit was created.

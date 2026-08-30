# Agent handoff — session polish on top of `new-era` (#23 + #24)

**Target branch:** `new-era`  
**This PR branch:** `codex/buyer-seller-session-polish`  
**Baseline already merged:** [#23](https://github.com/Andhanc/newsellyourbrick/pull/23) (buyer journeys), [#24](https://github.com/Andhanc/newsellyourbrick/pull/24) (seller Tiffany CTA, Property AI PDF, biometric lock, profile history pagination)

## Do not regress from #23 / #24

| Area | Keep from upstream |
|------|-------------------|
| Seller accent service card | **White CTA** on Tiffany card via `!important` (links **and** `.seller-listing-cta` buttons) — see merged block in `SellerPage.css` |
| Property AI PDF / service | Tiffany Editorial PDF v2, fallback report, cache bust — **do not revert** `server/services/propertyAi*`, `propertyAiRoutes.js` |
| Profile history | Mobile category dots + scroll sync in `ProfileHistoryExperience.*` |
| Biometric lock | Fail-closed gate + inert app under drawer (`BiometricLockGate.jsx`) |
| Compare drum haptics | Use `src/utils/haptics.js` — do not re-inline vibration logic |
| BuyerAccountMobileExperience.test.js | Three assertions may still fail (pre-existing per #24 handoff) — unrelated to this PR |

## What this PR adds (session work)

### 1. Seller / become-seller routing
- **New:** `src/utils/navigateSellerListingCta.js` (+ legacy mirror)
- **New:** `SellerListingCtaRedirect.jsx` — `/owner/property/new` → role-aware redirect
- **`SellerPage.tsx`:** CTAs use `navigateSellerListingCta` / become-seller flow (buyers → profile `?becomeSeller=1`, sellers → add-property test flow)
- **`App.jsx`:** route swap for legacy listing URL
- **`TestPage.jsx`:** opens become-seller drawer from query + session flags
- **`SellerPage.css`:** plan card button spacing (mobile `margin-top` ~20–22px); **merged** with #24 white accent CTA

### 2. Buyer profile (TestPage)
- Removed autosave-on-typing and auto step jump — save on blur only
- **Passport upload sheet:** Gallery / Camera / Google Drive split
- **Camera:** in-sheet `getUserMedia` preview (not file picker); gallery still uses file input
- **Property AI modal thumbs:** `normalizePropertyMediaFields` + image fallback (fixes broken URLs on server)

### 3. Default language English
- `src/i18n/config.js`: `DEFAULT_APP_LANGUAGE = 'en'`, detector **localStorage only** (no browser locale)
- `index.html`, SEO defaults `en_US`, `localeFromCountry` returns `en`
- Mirror: `apps/client/src/legacy/i18n/config.js`

### 4. AI FAB parity (main `/` vs auction `/auction`)
- Shared `--ai-fab-*` tokens in `Home.css` / `MainPage.css`
- Removed 70×70 override from `MobileDiscoverPage.css`
- Tests: `MobileDiscoverPage.aiDock.test.js`, `MobileDiscoverPage.aiFab.test.js`

### 5. Minor UI
- Search inputs: removed cyan focus outline on debts/auction/shares lists (`PropertyList.css`)
- Chat dock / manager modal CSS tweaks (if present in diff)

## Mirror rule (critical)

Any change under `src/` that affects product UI must have a matching edit under `apps/client/src/legacy/` when that file exists:

- `PropertyAiExperience.jsx`
- `SellerPage.tsx` + `.css`
- `TestPage.jsx`
- `App.jsx`
- `i18n/config.js`, `localeFromCountry.js`, `uiLanguages.js`
- `Home.css`, `MobileDiscoverPage.css` + tests

## Conflict hotspots if rebasing again

1. **`SellerPage.css`** — #24 white accent CTA vs session `.seller-listing-cta` buttons → **keep both** (resolved in this PR)
2. **`PropertyAiExperience.jsx`** — #24 error/retry UI + session image normalization → complementary, both kept
3. **`TestPage.jsx`** — #23 small edits + session passport/autosave → review both hunks
4. **`MobileDiscoverPage.css`** — #23 carousel + session AI FAB → FAB uses Home.css tokens only
5. **`ru.json` / `en.json`** — merge keys, do not drop passport or #23 investor strings

## Verification

```bash
npm run build
node --test src/i18n/config.test.js
node --test src/pages/MobileDiscoverPage.aiDock.test.js src/pages/MobileDiscoverPage.aiFab.test.js
node --test src/components/PropertyAiExperience.layout.test.js
```

Manual smoke:
- `/` and `/auction` — same AI FAB size/position
- Seller page CTAs — buyer → become seller; seller → add property
- Profile → Documents → Camera opens live preview
- Property detail → Property AI picker shows photos on production URLs

## Files unique to this PR (new)

- `src/utils/navigateSellerListingCta.js`
- `src/pages/SellerListingCtaRedirect.jsx`
- `src/i18n/config.test.js`
- legacy mirrors of the above where applicable

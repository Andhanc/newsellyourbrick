# Task 2 report — Home sale formats integration and selected-reference carousel

## Status

DONE_WITH_CONCERNS

## Commit

`245fe35` — `feat: integrate home sale formats carousel`

The commit contains only the sale-format component/test, `MainPage` integration, the four approved assets, and the updated home-sale-format plan/spec. Existing unrelated property-AI, database, server, and property-detail changes were not staged or committed.

## Files committed

- `src/pages/MainPage.jsx`
  - Imports and renders `HomeSaleFormats` in place of only the legacy `premium-models` markup.
  - Adds the four approved benefit/proof/alt strings and exact new image paths.
  - Preserves all four destination routes, the hero/search `premiumModes` consumers, and their existing object anchors.
- `src/components/HomeSaleFormats.jsx`
  - Implements the selected reference's split cards, two compact tags, lower-half media, circular CTA, and real previous/next buttons.
  - Scrolls exactly one measured card with `scrollBy`, respects reduced-motion preference, and keeps each card a route `Link`.
  - Preserves the prior hero strategy navigation by assigning each card its existing `anchorId`.
- `src/components/HomeSaleFormats.css`
  - Replaces the old 2×2 overlay grid with a tall horizontal rail showing 3.4 cards on desktop, 2.35 on tablet, and 1.1 on mobile.
  - Uses a lime first card, warm-neutral subsequent cards, solid copy panels, lower-half images, no gradients, scroll snap, focus states, hover states, and reduced-motion overrides.
- `src/components/HomeSaleFormats.layout.test.js`
  - Adds MainPage integration, exact asset/copy, functional rail, split-card, palette, partial-card, and no-gradient assertions.
- `public/images/home-sale-formats/sale-format-auction.webp`
- `public/images/home-sale-formats/sale-format-buy-now.webp`
- `public/images/home-sale-formats/sale-format-shares.webp`
- `public/images/home-sale-formats/sale-format-debts.webp`
- `docs/superpowers/plans/2026-07-11-home-sale-formats-redesign.md`
- `docs/superpowers/specs/2026-07-11-home-sale-formats-redesign.md`

## RED evidence

### MainPage integration RED

Command:

```text
node --test src/components/HomeSaleFormats.layout.test.js
```

Observed exit code: `1`.

```text
✔ renders each format as one fully clickable route card
✔ uses a flow content wrapper for the card heading
✔ provides mobile scroll snap, focus visibility, and reduced motion
✖ connects MainPage to the approved sale format content and image series
ℹ pass 3
ℹ fail 1
```

The expected assertion failed because the `HomeSaleFormats` import was absent from `MainPage.jsx`.

### Selected-reference contract RED

After adding the focused selected-reference assertions and before production edits, the same command exited `1`:

```text
✔ renders each format as one fully clickable route card
✔ uses a flow content wrapper for the card heading
✔ provides mobile scroll snap, focus visibility, and reduced motion
✖ connects MainPage to the approved sale format content and image series
✖ matches the selected reference with functional rail controls and split cards
✖ uses the selected reference palette and partial-card rail at desktop and mobile
ℹ pass 3
ℹ fail 3
```

The failures identified the three intended missing areas: MainPage integration, functional ref/`scrollBy` controls and split markup, and the new rail/palette contract (the old CSS still contained the 2×2 layout and gradient overlay).

## GREEN and verification evidence

Fresh pre-commit command:

```text
node --test src/components/HomeSaleFormats.layout.test.js && npm run verify:images && npm run build
```

Observed exit code: `0`.

```text
✔ renders each format as one fully clickable route card
✔ uses a flow content wrapper for the card heading
✔ provides mobile scroll snap, focus visibility, and reduced motion
✔ connects MainPage to the approved sale format content and image series
✔ matches the selected reference with functional rail controls and split cards
✔ uses the selected reference palette and partial-card rail at desktop and mobile
ℹ pass 6
ℹ fail 0

OK: 121 /images/ references resolve under public/

✓ 4490 modules transformed.
✓ built in 11.44s
```

`git diff --cached --check` also exited successfully before the commit.

## Asset inspection

- All four files are WebP images at exactly `1536×1024` (3:2).
- Direct visual inspection confirmed a consistent warm, editorial European-property series with distinct auction, immediate-purchase, fractional-investment, and debt/opportunity scenes.
- No visible text, logo, or watermark was found.
- The images were supplied before this task and were not regenerated or replaced.

## Self-review

- Only the old sale-format section markup was removed from `MainPage`; the surrounding hero and deferred content provider remain unchanged.
- The four routes remain exactly `/auction?filter=auction`, `/auction?filter=buy_now`, `/shares`, and `/debts`.
- `premiumModes.map` remains in both the quick filters and hero strategy rail.
- Existing `strategy-*` anchors remain functional through `id={mode.anchorId}` on the new cards; lower showcase `objectsId` targets are unchanged.
- Whole cards remain keyboard-accessible links, while the rail arrows are separate real buttons with Russian `aria-label`s and icon-library arrows.
- The JS scroll behavior switches to `auto` for `prefers-reduced-motion`; CSS disables hover/control transitions.
- The source contract explicitly rejects gradients and requires the 3.4/1.1 card visibility values.
- The staged diff contained exactly the ten intended files.

## Concerns

- Task 2 has source, asset, and production-build verification, but browser screenshot comparison at 1440/1024/768/390, live arrow/scroll-snap interaction testing, console inspection, and final `design-qa.md` are intentionally deferred to Task 3.
- The successful build still emits existing environment-variable, mixed static/dynamic import, and large-chunk warnings; none were introduced or addressed by this scoped task.

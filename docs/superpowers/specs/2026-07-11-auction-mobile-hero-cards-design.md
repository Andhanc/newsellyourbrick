# Mobile Auction Hero Cards Refresh

## Goal

Improve the three feature cards in the mobile auction hero so they feel more expressive without competing with the photographic background, and remove the mobile breadcrumb row below the hero.

## Scope

- The change applies only to the auction page at viewport widths up to 768px.
- Desktop cards and non-auction uses of `Hero` keep their current appearance and interaction.
- Existing card copy and image assets remain unchanged.

## Card design

- Keep the three cards in one row and preserve their white surfaces, rounded corners, and readable dark text.
- Increase the feature images to 82px at 481–768px and 68px at widths up to 480px.
- Rebalance image and copy spacing so the larger artwork does not crowd or clip the three-line titles.
- Do not add a permanently glowing border or outline.

## Animated shimmer

- Add a subtle turquoise-to-blue light wash that occasionally travels across each card surface.
- The shimmer is decorative, low-opacity, and does not reduce text contrast.
- Each pass is brief, followed by a longer quiet interval so the hero does not feel continuously animated.
- Stagger the animation delays between the three cards so they do not shimmer at the same time.
- Keep the effect clipped to each card's rounded shape and non-interactive.
- Disable the animation when `prefers-reduced-motion: reduce` is active.

## Breadcrumb removal

- Do not render the breadcrumb block below the hero on the mobile auction page.
- Preserve breadcrumb behavior on desktop auction listings and on unrelated pages.
- Remove the now-unused mobile ordering and spacing rules tied to the breadcrumb block if they no longer serve another element.

## Verification

- Add a focused source/layout test that first fails unless the mobile auction breadcrumb render path is absent and the auction-specific shimmer hooks are present.
- Run the focused test and the project build.
- Inspect the auction page at representative phone widths to confirm all three cards remain visible, titles are readable, images are larger, shimmer stays subtle, and no breadcrumb row remains below the hero.

# Deposit strategy modal — reference QA

final result: passed

## Evidence and scope

- Layout source: `docs/design/deposit-strategy-reference/layout-reference.png` (520 × 566). A photographed, perspective-tilted three-row recipe list; used for card composition, not literal content or device chrome.
- Illustration style source: `docs/design/deposit-strategy-reference/style-reference.png` (792 × 1382). Glossy rounded turquoise/ivory 3D forms.
- Implementation: `http://localhost:5173/wallet?walletPreview=1`, modal opened through “К торгам”. The wallet uses its existing development preview fixture; no transactions were made.
- Browser: Codex in-app browser, Russian locale, CSS viewports 390 × 844, 320 × 568 and 1024 × 900. Screenshots have matching pixel dimensions (1×).
- Full comparison: `docs/design/deposit-strategy-reference/comparison.png` shows layout reference, mobile implementation and style reference together. Sources were contained proportionally in 390 × 844 columns; photographed perspective was not treated as a UI geometry difference.
- Implementation evidence: `implementation-mobile.png`, `implementation-compact.png`, `implementation-desktop.png` in the same folder.
- No additional focused crop was needed: titles, rounded card edges, illustration materials and navigation arrows are readable in the combined comparison; all four original assets were also inspected together at 260 × 260 each.

## Findings and fidelity surfaces

No actionable P0/P1/P2 findings remain.

- Typography: Montserrat follows existing product typography; clear dark titles on ivory cards. Slightly heavier than recipe labels, intentionally grounded in the supplied test-drive reference. No metadata or promotional badges: earlier user feedback asked to reduce visual noise.
- Spacing and layout: one horizontal card per row; large square media alternates left/right; rounded media joins the outer rounded card. Four rows replace the three recipe rows because the product has four requested routes. Dark backing makes boundaries clear. The circular close action stays below the panel.
- Colors: charcoal backing and warm white cards match the layout hierarchy; green, coral, pink and periwinkle media grounds preserve distinct image regions. Ivory/turquoise objects match the second reference.
- Image quality: four new individual generated assets, optimized to 640 × 640 WebP. Rounded gavel, home/key, house puzzle and home/deed replace realistic architecture. No stretched images, transparency halos or baked UI text.
- Copy/content: only the purchase direction names are visible inside cards. Existing translations cover all seven locales. Routes and labels remain those requested by the user.

## Comparison history

The first mobile and desktop visual comparison found no substantive layout mismatch. The 320 × 568 check showed 3 px of internal panel overflow; compact row gaps were reduced from 10 px to 9 px. The post-fix compact capture confirms zero internal scroll and the close button bottom at 550 px within a 568 px viewport.

## Interaction and build checks

- All four images loaded and all four cards exposed as buttons.
- Clicking “Доли” navigated to `/co-investment`.
- Escape closed the modal and restored focus to “К торгам”. Existing focus-trap and body-scroll handling retained.
- Browser console: no captured error entries during verification.
- Five wallet/i18n tests passed; production build passed; `git diff --check` passed.
- JSX, CSS and all four new image assets match their legacy/public mirrors.

## Implementation checklist

- [x] Generate and inspect four separate matching 3D assets.
- [x] Implement alternating light horizontal cards on a dark modal panel.
- [x] Retain whole-card navigation and external close button.
- [x] Check mobile, compact and desktop views, interactions, build and parity.

No follow-up visual blockers.


## Requested follow-up: lighter panel and explanatory copy

The user subsequently requested replacing the dark modal background and filling the empty card areas with descriptions. These requests supersede the earlier dark-panel and title-only decisions.

- Current panel is pale Tiffany (`#dcefeb`), with dark heading and white cards. The muted description text is `#5b6e70`; typography remains Montserrat, with 12 px description text (11 px at compact size), 1.4 line height and no truncation.
- Each direction now has one explanatory sentence, localized into all seven supported languages and mirrored in legacy.
- Source screenshot for this iteration: `/var/folders/c8/gpqh9xf946vd864n2qjcts640000gp/T/codex-clipboard-20f04218-14df-4589-9d8b-4e9752b91fa3.png`.
- Combined before/after evidence: `comparison-light.png`. This is a requested color/copy revision, not an exact pixel clone of the prior dark screenshot.
- Rendered evidence: `implementation-light-mobile.png` (390 × 844) and `implementation-light-compact.png` (320 × 568), Codex in-app browser at 1× density.
- All four content areas have zero text overflow at 320 × 568; the close control ends at 550 px. Descriptions and arrows fit without overlap. Larger cards grow naturally for translated text.
- Generated illustrations, alternating placement and whole-card click targets remain intact.
- Production build, diff check, component parity and localization parity passed.
- No actionable P0/P1/P2 findings remain.

final result: passed

# Design QA

## Evidence

- Buy Now reference: `/var/folders/c8/gpqh9xf946vd864n2qjcts640000gp/T/codex-clipboard-71ff00e9-23e9-4c10-8415-3d32f607932f.png`
- Test-drive reference: `/var/folders/c8/gpqh9xf946vd864n2qjcts640000gp/T/codex-clipboard-daf1223b-8870-4b55-8f1d-26485bc622d9.png`
- Implementation route: `http://127.0.0.1:4173/auction/property/apartment-costamar-los-cristianos-293?property_type=apartment`
- Implementation screenshot: captured in the Codex in-app browser during the responsive QA pass at a 390 × 844 viewport.

## Comparison

| Area | Result |
| --- | --- |
| Buy Now hierarchy | Pass — one title, one concise description, and one prominent CTA. |
| Buy Now proportions | Pass — the shorter copy brings the measured mobile card height down to 168 px. |
| Buy Now description | Pass — concise two-line copy at 9.76 px with a 12.69 px line height. |
| Buy Now color | Pass — layered pale-Tiffany gradient with a restrained highlight and stronger Tiffany CTA. |
| Buy Now placement | Pass — follows detailed information and precedes amenities on the mobile property page. |
| Test-drive composition | Pass — one title, one short description, generated travel/property art, and one large date-selection CTA; the two small feature tiles were removed. |
| Test-drive color | Pass — a distinct layered sky-blue gradient and blue CTA separate it from the Buy Now offer. |
| Responsive behavior | Pass — verified at the mobile breakpoint; desktop rules remain separate. |
| Interaction | Pass — the Buy Now CTA selects the existing `buy_now` tab on mobile. |

## Intentional deviations

- The reference imagery is used as visual direction rather than copied; the final 3D assets are property-specific.
- Existing purchase, reservation, test-drive eligibility, and deposit rules remain unchanged.

Follow-up iteration: replaced the functional headline with the more persuasive “Объект может стать вашим”, added a direct reservation benefit to the supporting copy in every locale, and moved the card between detailed information and amenities. The compact mobile height remains 168 px, and the CTA still opens the existing Buy Now tab.

Final visual pass: added a soft radial highlight over the Tiffany Buy Now gradient. Rebuilt the test-drive card into the same focused hierarchy, with a separate sky-blue gradient and a 199.7 × 44 px mobile CTA. Browser measurements at 390 × 844 confirmed the 168 px Buy Now card, the 196.8 px test-drive card including its deposit hint, both generated WebP illustrations at their native dimensions, and the intended gradient layers.

Width correction: the test-drive wrapper now explicitly occupies the full available column instead of shrink-fitting inside the column flex layout. At the 616 px reference viewport, the wrapper measures 616 px and the card measures 576 px with the intended 20 px gutters on both sides; at 390 px, the card measures 350 px with the same 20 px gutters.

final result: passed

---

# Design QA — mobile «Купить сейчас» hub (2026-09-15)

## Evidence

- Source visual truth: `/var/folders/c8/gpqh9xf946vd864n2qjcts640000gp/T/codex-clipboard-3bcc26cb-5585-4da6-b920-5df004a623f1.png` — 538 × 926 px; Yandex Plus mobile composition.
- Source color reference: `/var/folders/c8/gpqh9xf946vd864n2qjcts640000gp/T/codex-clipboard-c5ca43e5-2e63-436f-938f-e4e3055c8d8a.png` — 698 × 402 px; Tiffany field.
- Browser-rendered implementation: `/Users/vtichonenko/newsellyourbrick/design-qa-buy-now-top.png` and `/Users/vtichonenko/newsellyourbrick/design-qa-buy-now-actions.png` — 393 × 852 px each.
- Same-input comparisons: `/Users/vtichonenko/newsellyourbrick/design-qa-comparison-full.png` — 786 × 852 px; `/Users/vtichonenko/newsellyourbrick/design-qa-comparison-focus.png` — 786 × 657 px.
- Route: `http://localhost:4173/property/900001?buyer_detail_preview=buy-now`.
- Viewport: 393 × 852 CSS px at DPR 1; additional narrow-width check at 320 × 800 CSS px.
- Density normalization: the 538 px source was resized to 393 px wide for the full comparison; the focused service/loyalty/title region was cropped from both captures and aligned at 393 px width.
- State: Russian locale, mobile auction property, «Купить сейчас» tab selected.

## Full-view comparison evidence

- The implementation follows the reference hierarchy: prominent section title, full amount replacing the reference icon row, rounded white object card, primary reservation action, service shortcuts, loyalty/bonuses row, large section heading, and horizontal card rail.
- Product-specific property media and the existing auction detail header intentionally remain above the recreated hub.
- The Tiffany field uses the product's established color, while the white cards, rounded geometry, compact labels, and strong dark type retain the reference's mobile density.

## Focused region comparison evidence

- The focused combined image confirms the same service-shortcut → loyalty row → large heading → carousel sequence.
- The generated shortcut assets now use the restrained glossy white/Tiffany/chrome treatment found in the product's profile and homepage rather than the rejected cartoon treatment.
- «Как проходит покупка» describes the actual cards below («Инструкция», «Оплата 10/90», «Личный менеджер») and is clamped to two lines. «AI недвижимость» stays on one line at both 393 px and 320 px.

## Required fidelity surfaces

- Fonts and typography: Montserrat remains the product font; the main price and headings use heavy optical weights, the guide heading is limited to two lines, and all four shortcut labels remain readable at the narrow breakpoint.
- Spacing and layout rhythm: the hub is edge-to-edge inside the mobile property tab, uses a large rounded white property card, an equal four-column shortcut grid, a compact loyalty row, and snap-aligned guide cards.
- Colors and visual tokens: Tiffany `#4ecdd6`, white surfaces, dark ink, muted gray support copy, and the existing Tiffany CTA token are used consistently.
- Image quality and asset fidelity: four transparent 256 × 256 generated PNG icons use the same glossy enamel/chrome visual language as `/public/images/profile/shortcuts/` and `/public/images/home-sale-formats/icons/`; the existing bonuses gift and guide-card assets remain sharp and correctly cropped.
- Copy and content: property title, description, full amount, 10% reservation amount, bonuses copy, and guide content are application data/localized strings rather than reference-brand text. The new guide heading is synchronized across all seven supported locales and legacy mirrors.

## Comparison history

1. Initial P1 — the first generated shortcuts were too cartoon-like for the existing product. Fix: regenerated all four as restrained glossy white/Tiffany/chrome product icons using the profile and homepage assets as direct style references. Post-fix evidence: `design-qa-buy-now-actions.png` and `design-qa-comparison-focus.png`.
2. Initial P2 — «Больше возможностей с опциями» was generic and could occupy too much vertical space. Fix: replaced it with «Как проходит покупка» (and localized equivalents) and applied a strict two-line clamp. Post-fix evidence: 393 px and 320 px browser checks.
3. Initial P2 — «AI недвижимость» could wrap in the four-column grid. Fix: added a responsive 7–9 px label size and `white-space: nowrap`; it remains a single line at 320 px.

## Interaction and console evidence

- The mobile «Купить сейчас» tab opens the new hub.
- The horizontal guide rail was scrolled from card 01 to card 02 and snapped correctly.
- The bonuses row remains a real navigation control to `/bonuses`; reservation and existing shortcut handlers were preserved.
- Console review found the known local missing `VITE_YANDEX_MAPS_API_KEY` map error and the existing `inert` warning; this hub introduced no new console errors.
- Targeted tests passed (5/5), production build passed, and `git diff --check` passed.

## Findings

- No actionable P0, P1, or P2 differences remain in the requested scope.

## Follow-up polish

- P3: the source uses five shortcuts while the product has four actions; retaining the four real actions is intentional.

final result: passed

---

# Design QA — full-bleed mobile top navigation

## Evidence

- Source visual truth: `/var/folders/c8/gpqh9xf946vd864n2qjcts640000gp/T/codex-clipboard-4edbdf6e-afca-422d-a4bc-cf7f1cf09f0e.png` — 576 × 1280 px.
- Transparency follow-up reference: `/var/folders/c8/gpqh9xf946vd864n2qjcts640000gp/T/codex-clipboard-d0398542-d882-4b12-b54c-b1de140705a7.png` — 722 × 270 px.
- Browser-rendered implementation: `/Users/vtichonenko/newsellyourbrick/.codex-artifacts/mobile-header-393x852.png` — 393 × 852 px.
- Browser-rendered transparency fix: `/Users/vtichonenko/newsellyourbrick/.codex-artifacts/mobile-header-transparent-corners-393x852.png` — 393 × 852 px.
- Expanded search state: `/Users/vtichonenko/newsellyourbrick/.codex-artifacts/mobile-header-search-393x852.png` — 393 × 852 px.
- Initial floating-card implementation: `/Users/vtichonenko/newsellyourbrick/.codex-artifacts/mobile-header-before-393x852.png` — 393 × 852 px.
- Combined focused comparison input: `/Users/vtichonenko/newsellyourbrick/.codex-artifacts/mobile-header-comparison.png` — 806 × 104 px; source on the left, implementation on the right.
- Route: `http://127.0.0.1:4174/`.
- Viewport: 393 × 852 CSS px at `deviceScaleFactor: 1`.
- Density normalization: the 576 px source was resized to 393 px wide; both top-navigation regions were then cropped to 393 × 104 px and placed in one comparison image.
- State: unauthenticated mobile discovery page; normal header, expanded search, and open/closed navigation drawer were tested.

## Full-view comparison evidence

- The source is a different product, so app-specific copy, logo, status-bar content, and actions were intentionally excluded from fidelity requirements.
- The requested composition is preserved: a white navigation surface touches the viewport top and both side edges, has square top corners, rounded lower corners, and a restrained downward shadow.
- Existing SellYourBrick controls, 44 px touch targets, page content, horizontal strategy carousel, and fixed behavior remain unchanged.

## Focused region comparison evidence

- The combined source/implementation image confirms the same full-bleed silhouette and bottom-only rounding after width normalization.
- The implementation uses a 28 px lower radius, no border, and no horizontal outer margin. The source's taller top region includes operating-system status chrome, which is intentionally not duplicated in web content.
- Expanded search remains inside the same full-width white sheet, and the navigation drawer still opens and closes from the burger control.

## Required fidelity surfaces

- Fonts and typography: existing product typography and control weights are preserved; the reference application's branding and address text are not copied.
- Spacing and layout rhythm: the header measures 393 × 72 CSS px, spans the entire viewport, uses 12 px horizontal safe padding, and keeps all interactive controls at 44 × 44 px.
- Colors and visual tokens: the established white surface, dark ink, pastel catalogue control, and subtle neutral shadow remain in use.
- Image quality and asset fidelity: no imagery, logos, or icons were replaced. Existing icon-library components and the product's avatar behavior are retained.
- Copy and content: no user-facing strings changed; all existing locale behavior remains intact.

## Comparison history

1. Initial P1 — the mobile header rendered as a floating rounded rectangle with side and top gaps, contradicting the selected full-bleed reference. Fix: removed mobile outer gutters, made the white surface edge-to-edge, removed its border, squared the top corners, and retained only 28 px lower rounding. Post-fix evidence: `/Users/vtichonenko/newsellyourbrick/.codex-artifacts/mobile-header-comparison.png` and measured bounds `left: 0`, `right: 393`, `width: 393`.
2. Follow-up P2 — the fixed outer wrapper still had an opaque white background, so it filled the cutouts outside the rounded lower corners. Fix: made the wrapper transparent and shadowless, moved safe-area spacing into the white inner panel, and retained the panel shadow. Live computed styles now report outer `background-color: rgba(0, 0, 0, 0)`, `box-shadow: none`, and inner `border-radius: 0 0 28px 28px`.
3. Post-fix interaction check — expanded search, menu open/close, and persistent header controls were exercised at 393 × 852. No new browser console errors were reported.

## Findings

- No actionable P0, P1, or P2 differences remain for the requested mobile-header silhouette.
- P3: the reference has a larger apparent total height because it includes Android status chrome; the implementation correctly leaves device/browser chrome to the runtime.

## Implementation checklist

- [x] Full-width mobile top surface with no side gutters.
- [x] Square top corners and 28 px lower corners.
- [x] Preserve safe-area padding and 44 px touch targets.
- [x] Preserve expanded search and navigation drawer behavior.
- [x] Keep web and legacy CSS in parity.
- [x] Check browser console, targeted tests, production build, and `git diff --check`.

final result: passed

---

# Design QA — full-width map selection panel refinement (2026-09-15)

- Source visual truth: `/var/folders/c8/gpqh9xf946vd864n2qjcts640000gp/T/codex-clipboard-6cd68cf7-546b-4e79-9963-b7f97af1b2ff.png`
- Source pixels: `396 × 146` at source density.
- Browser-rendered implementation screenshot: `/tmp/newsellyourbrick-map-popup-final.jpg`
- Implementation pixels and CSS viewport: `571 × 837`, DPR `1`.
- Same-input focused comparison: `/tmp/newsellyourbrick-map-popup-comparison.jpg`, `1158 × 196`; source normalized to `170px` height and implementation cropped to the top `180px` without density scaling.
- State: `/map`, Russian locale, selected object “я”, top panel open; Street View opened and closed during interaction verification.

**Full-view comparison evidence**

- The selected-object panel begins at viewport coordinate `top: 0`, spans the full map width, and ends with a soft rounded lower edge and shadow.
- Its primary “Открыть объект” action reproduces the reference language: Tiffany gradient, moving diagonal sheen, white type, bright outer contour, pill silhouette, and a translucent icon tile.
- The secondary “Погулять по улицам” action intentionally uses the user-requested white surface while retaining the same pill proportions, Tiffany outline, icon tile, typography, and elevation.
- Map controls move below the panel while it is open, so the full-width placement does not cover navigation or zoom controls.

**Focused region comparison evidence**

- The combined comparison shows the supplied button reference and the rendered top panel in one image. The primary action matches the reference's rounded geometry, bright Tiffany range, white foreground, highlight, and inset icon treatment. The white secondary action is an intentional product hierarchy choice requested after the initial pass.

**Required fidelity surfaces**

- Fonts and typography: Montserrat is retained; both action labels use a compact `750` weight and remain legible in one line at the inspected width.
- Spacing and layout rhythm: the panel is edge-to-edge at the top, uses a `72px` thumbnail, a `44px` close target, balanced `14px` internal spacing, and two equal action columns.
- Colors and visual tokens: primary action reuses the shared `btn-tiffany-shine` tokens (`#1f9aa6` through `#4ecdd6`); the secondary uses white with `#4ecdd6` border and Tiffany foreground.
- Image quality and asset fidelity: the real responsive property thumbnail remains sharp and cropped with the existing shared fallback; no synthetic replacement asset was introduced.
- Copy and content: property label, title, price, “Погулять по улицам”, and “Открыть объект” remain localized application text.

**Findings**

- No actionable P0, P1, or P2 differences remain in the requested scope.

**Interaction and console evidence**

- “Погулять по улицам” opens the shared interactive Google Street View panorama and Escape returns to the selected-object panel.
- The close control and “Открыть объект” remain available with touch-safe hit areas.
- Browser console review found only existing environment warnings and the known missing local `VITE_YANDEX_MAPS_API_KEY`; no new error was introduced by this refinement.

**Comparison history**

- Initial refinement used `12px` side insets and made both actions Tiffany-filled.
- User feedback requested an edge-to-edge top panel and one white action. The panel was moved to `top/left/right: 0`, the Street View action became the white Tiffany-outlined secondary, controls were moved below the open panel, and the revised browser capture was compared again.

**Implementation checklist**

- [x] Fix the panel to the very top at full map width.
- [x] Keep Street View white with Tiffany outline.
- [x] Keep the object action in the shared Tiffany shine style.
- [x] Preserve panorama and property navigation behavior.
- [x] Preserve web/legacy parity and responsive touch targets.

final result: passed

---

# Design QA — Buy Now tab in mobile share detail (2026-09-13)

Source visual truth: the existing mobile auction Buy Now subpage at `http://localhost:5173/auction/property/villa-ya-324` (browser capture reviewed in this run). Implementation: `http://localhost:5173/co-investment/house-test-327`, Buy Now tab selected (Codex in-app browser capture reviewed inline; the browser provider did not expose a persistent screenshot path). Viewport: 390 × 844 CSS px at DPR 1. Source and implementation were rendered at the same CSS target; the earlier source capture included a desktop shell, so fidelity judgments were limited to the shared Buy Now content pattern rather than outer property-header proportions. State: Russian locale, public share listing with Buy Now enabled and zero sold shares.

## Full-view and focused comparison evidence

- The implementation exposes the same tab-level information architecture as the auction detail: `Описание / Купить сейчас / Галерея`, with Buy Now rendered as a separate panel rather than inside the share purchase controls.
- The focused Buy Now region reuses the auction composition: Tiffany fixed-price card, 10% payment-today row, explanatory copy, pill CTA, service shortcuts, and the three pre-purchase guide cards.
- The share distribution chart and sticky share quantity bar are absent while the Buy Now tab is active, preventing two competing purchase flows on the same screen.
- A separate focused crop was not needed because price, deposit, explanatory copy, CTA, and all three tab labels were legible in the 390 px browser capture.

## Required fidelity surfaces

- Fonts and typography: existing Montserrat hierarchy, weights, line heights, and price numerals are inherited directly from the auction Buy Now component classes; no new font treatment was introduced.
- Spacing and layout rhythm: the implementation uses the same edge-to-edge mobile tab panel, 20 px content padding, rounded Tiffany price card, and vertical spacing as the auction pattern.
- Colors and visual tokens: established Tiffany gradients, dark ink, white surfaces, and muted explanatory text are reused. The locked share state uses a deliberately desaturated price card and neutral disabled CTA.
- Image quality and asset fidelity: the same existing 3D guide assets and icon-library components are reused; no placeholder or substitute imagery was added.
- Copy and content: existing localized share Buy Now and auction payment strings are reused. The unavailable state preserves the specific explanation that a whole-property purchase is blocked after any share is sold.

## Findings and comparison history

- Initial P1: Buy Now for shares appeared as a secondary action in the fixed share-purchase bar and had no dedicated content tab. Fix: added a conditional Buy Now tab and routed it to the existing auction Buy Now panel structure.
- Initial P2: the share ownership chart and fixed quantity bar remained conceptually adjacent to whole-property purchase. Fix: hide both while the Buy Now tab is active and remove the duplicate Buy Now CTA from the share bar.
- Post-fix browser evidence shows the three-tab structure and standalone Buy Now screen at 390 × 844. The tab interaction works, the primary CTA is present, there is no duplicate sticky share action, and the console contains no new errors.
- No actionable P0, P1, or P2 findings remain. The locked visual state is covered by component/unit assertions because the local data set has no Buy Now share listing with sold shares.

## Implementation checklist

- [x] Show the tab only when Buy Now is configured for the share listing.
- [x] Keep the tab visible but disable the action after the first share purchase.
- [x] Reuse the auction Buy Now payment and guide layout.
- [x] Remove competing share-purchase controls from the selected tab.
- [x] Keep web and legacy JSX/component CSS in parity.
- [x] Run targeted tests, browser interaction, console check, production build, and `git diff --check`.

final result: passed

---

# Design QA — mobile showcase header and auction cards (2026-09-13)

Source visual truth: `artifacts/mobile-showcase/header-reference.png` and `artifacts/mobile-showcase/auction-cards-reference.png`.
Implementation screenshots: `artifacts/mobile-showcase/header-implementation.png` and `artifacts/mobile-showcase/auction-cards-detail-v3.png`.
Combined evidence: `artifacts/mobile-showcase/header-comparison.png` and `artifacts/mobile-showcase/cards-comparison-v2.png`.
Viewport: 396×837 CSS px at DPR 1. The header reference is an 800×198 crop and was normalized to 400 px wide; the card reference is a 562×458 focused crop. State: Russian locale, authenticated mobile navigation, live auction and Buy Now properties.

## Findings

- No actionable P0, P1, or P2 differences remain in the requested scope.
- The page background now shows through around the white navigation sheet; its controls, radius, shadow and touch targets are preserved.
- Auction and Buy Now cards now use the established `discover-auction-cards` treatment shown in the reference: favorite control above the photo, glass timer/price strip on the photo, compact metadata, and outlined/filled actions.
- The cards are intentionally narrower than the supplied card crop because the previous accepted request asked to reduce their size. The proportions and visual treatment match at the 396 px viewport.

## Required fidelity surfaces

- Fonts and typography: Montserrat, heavy section titles, compact timer figures, price labels and card text match the existing approved card system.
- Spacing and layout rhythm: the navigation sheet ends directly over Tiffany; cards maintain the smaller 225.7 px rail width with a 12 px gap and no horizontal page overflow.
- Colors and visual tokens: the exposed header background uses the page Tiffany `#0099a9`; card accents use the existing Tiffany/red urgency tokens.
- Image quality and asset fidelity: live property photographs are preserved without replacement or generated substitutes. Image crops and rounded corners match the source treatment.
- Copy and content: existing localized card strings and live values are retained; no reference-only placeholder content was added.

## Comparison history

1. Initial P1: the page omitted the `discover-auction-cards` root class, so cards rendered with separate top timer pills. Fix: applied the existing approved card skin to the showcase listings.
2. Initial P1 after enabling the skin: a competing inset rule stretched the glass timer strip vertically over the photo. Fix: scoped the media strip inset and auto height to this page. Post-fix combined evidence shows a compact bottom strip matching the reference.
3. Initial P2: the navigation wrapper painted a white band behind the navigation sheet. Fix: made the page-level wrapper transparent. Post-fix header comparison shows Tiffany directly below and around the rounded white sheet.

## Interaction and implementation checks

- The page reached `document.readyState=complete` with three live auction and three live Buy Now cards.
- The measured document has zero horizontal overflow at 396 px.
- Existing card links, favorite controls, bid controls and Buy Now controls remain the shared production components.
- Web and legacy copies remain in parity.

final result: passed

---

# Design QA — mobile showcase top navigation refinement (2026-09-13)

- Source visual truth: `/var/folders/c8/gpqh9xf946vd864n2qjcts640000gp/T/codex-clipboard-2a681d62-827c-42dd-acb8-c2d3dd25721f.png`.
- Implementation screenshot: `/Users/vtichonenko/.codex/visualizations/2026/09/13/01a09bc9-7c41-7470-95b2-113f4e14608b/mobile-showcase-nav-390.png`.
- Side-by-side comparison: `/Users/vtichonenko/.codex/visualizations/2026/09/13/01a09bc9-7c41-7470-95b2-113f4e14608b/mobile-showcase-nav-comparison.png`.
- Viewport and density: 390 × 844 CSS px at DPR 1. The 576 px source was normalized to 390 px width; device chrome in the source was excluded from fidelity judgments.
- State: Russian locale, first carousel position, public route.

## Findings and comparison history

- The page-specific burger and profile controls were removed. The shared site `Header` now supplies the complete fixed top navigation used by the auction catalogue.
- Card descriptions, carousel dots and arrow controls were removed. The campaign rail remains horizontally swipeable.
- An intermediate bottom navigation interpretation was removed after clarification. The final implementation uses only the requested shared top navigation.
- The header spacer reserves the fixed navigation height so the centered Sell Your Brick wordmark and campaign rail remain fully visible at the top of the scroll container.
- No actionable P0, P1 or P2 findings remain.

## Required fidelity surfaces

- Typography: campaign titles and eyebrow text retain the existing Montserrat hierarchy; removed descriptions leave cleaner image areas.
- Spacing and layout: the shared white header sits above the centered wordmark; the carousel flows into the rounded content sheet with an 18 px Tiffany gutter.
- Colors: Tiffany hero and white content sheet remain unchanged; the navigation reuses the product's white shell and Tiffany account state.
- Image quality: all generated banner and shortcut assets remain uncropped and sharp; this refinement adds no placeholder art.
- Copy and content: card descriptions and pagination labels are absent as requested; accessible labels remain on all navigation destinations.

## Interaction and verification

- Browser accessibility tree confirms the custom header controls, descriptions, dots, arrows and the intermediate bottom navigation are absent.
- The shared top navigation exposes its standard menu, catalogue selector, search, profile and notifications actions.
- Existing strategy rail still uses touch scrolling and scroll snap.
- Mobile screenshot review found no horizontal overflow or navigation overlap with the visible primary content.
- Web and legacy JSX/CSS parity passed. `npm run build`, `git diff --check`, and 17 relevant regression tests passed.

final result: passed

---

# Design QA — mobile Buy Now header and filters

## Evidence

- Source visual truth: `/var/folders/c8/gpqh9xf946vd864n2qjcts640000gp/T/codex-clipboard-527244f6-ef9e-4575-94fa-bf75f82384a0.png`
- Rendered implementation: `/Users/vtichonenko/.codex/visualizations/2026/09/13/01a09af5-92a3-77b0-9d9e-588e4200a8b2/buy-now-header-after.png`
- Focused before/after comparison: `/Users/vtichonenko/.codex/visualizations/2026/09/13/01a09af5-92a3-77b0-9d9e-588e4200a8b2/buy-now-header-comparison.png`
- Filter drawer state: `/Users/vtichonenko/.codex/visualizations/2026/09/13/01a09af5-92a3-77b0-9d9e-588e4200a8b2/buy-now-filter-drawer-after.png`
- Route: `http://localhost:5173/auction/buy-now`
- Viewports checked: 360 × 823, 385 × 823, and 430 × 823 CSS px.
- Source pixels: 714 × 212. Implementation pixels: 385 × 823 at `deviceScaleFactor: 1`.
- Density normalization: the focused comparison renders both header regions at 393 × 118 CSS px at DPR 1. The source is scaled from its 714 × 212 capture; the implementation is cropped from the top of the 385 × 823 render.
- State: Russian locale, authenticated mobile header. The saved screenshot uses a deterministic mocked authenticated user; the real authenticated Chrome session was also checked at 385 px and confirmed the avatar and notification bell are present.

## Full-view comparison evidence

- The previous header allowed the catalogue pill to overflow left and cover the menu control.
- The rendered implementation gives the menu a dedicated 44 px track and constrains the remaining controls to the white shell.
- At 360, 385, and 430 px the document width equals the viewport width, every header action remains inside the container, and every primary touch target remains 44 × 44 px.
- The hero, Tiffany accent, typography, search row, and reused listing cards remain unchanged.
- The filter action now opens the same right-side `SharesMobileFiltersDrawer` used by the auction, shares, and debts catalogues.

## Focused region comparison evidence

- The combined header image was reviewed because the overlap and control density are too small to judge reliably in the full-page render.
- Before: the catalogue pill begins inside the menu's horizontal area, making the left control appear missing.
- After: menu, catalogue pill, search, avatar, and notification bell have distinct non-overlapping regions; the catalogue label remains readable at the supplied 385 px state.
- The drawer screenshot confirms the shared white panel, Tiffany active state and apply button, radio rows, close action, reset action, backdrop, and bottom safe-area treatment.

## Required fidelity surfaces

- Fonts and typography: Montserrat hierarchy is preserved; the catalogue label uses a responsive 12–14 px weight with ellipsis as a last-resort fallback for long translations.
- Spacing and layout rhythm: 44 px actions, 4 px container separation, 8 px side padding, and the existing 20 px shell radius retain the trading-page rhythm without overlap.
- Colors and visual tokens: the existing pastel catalogue gradient, white shell, dark ink, and Tiffany filter states are preserved.
- Image quality and asset fidelity: no imagery or icons were replaced. The live account avatar remains image-based; existing SVG icon components are reused.
- Copy and content: existing localized keys are reused; no new hard-coded user-facing strings were introduced.

## Comparison history

1. Initial P1 — the catalogue control overflowed into the burger/menu hit area. Fix: added an authenticated mobile layout with a fixed 44 px menu track, a shrinking catalogue track, and three fixed 44 px action tracks. Post-fix evidence: focused comparison plus measured bounds at 360/385/430 px show no overlap or horizontal overflow.
2. Initial P2 — the Buy Now filter button toggled a horizontal inline chip row, unlike the other trading pages. Fix: replaced the mobile toggle behavior with the shared right-side filters drawer, radio options, apply/reset actions, and an active-filter badge. Post-fix evidence: drawer screenshot and browser interaction test confirm open, select, apply, badge, reset, Escape/focus behavior from the shared component.

## Findings

- No actionable P0, P1, or P2 visual differences remain for the requested mobile scope.
- P3: very long translated catalogue names intentionally truncate below the available width instead of pushing persistent controls off-screen.

## Implementation checklist

- [x] Keep the menu action visible in authenticated mobile headers.
- [x] Preserve search, avatar, and notification actions at 44 px.
- [x] Prevent horizontal overflow at 360–430 px.
- [x] Reuse the established trading-page filter drawer.
- [x] Verify selection, apply, active badge, reset, focus handling, and responsive bounds.
- [x] Keep web and legacy files in parity.

## Console and interaction notes

- Primary interactions tested: open filter drawer, choose Villa, apply, observe active badge, reopen, reset, and apply.
- Console check found no new errors tied to this change. The local environment still reports pre-existing missing Yandex Maps API key messages and React Router/Clerk development warnings.

final result: passed

---

# Design QA — new mobile showcase (2026-09-13)

Source visual truth: `/var/folders/c8/gpqh9xf946vd864n2qjcts640000gp/T/codex-clipboard-2a681d62-827c-42dd-acb8-c2d3dd25721f.png`.
Brand reference: `/var/folders/c8/gpqh9xf946vd864n2qjcts640000gp/T/codex-clipboard-f9aa3024-e930-474b-9764-a62311918745.png`.
Route: `http://localhost:5173/mobile-showcase`.
Evidence directory: `/Users/vtichonenko/.codex/visualizations/2026/09/13/01a09bc9-7c41-7470-95b2-113f4e14608b/`.
Implementation evidence: `mobile-showcase-390.png`, `mobile-showcase-576.png`, `mobile-showcase-desktop.png`.
Combined full-view evidence: `mobile-showcase-comparison.png` (1152×1280).
Focused quick-action comparison: `mobile-showcase-detail-comparison.png` (1152×225).

Viewports: 360×800, 390×844, 576×1280, 1280×900 CSS px, screenshots at DPR 1. Source is 576×1280 pixels; equal-width 576px implementation used in the full comparison. Native Android status/navigation bars belong only to the source and were excluded from fidelity judgments. State: Russian, public route, first carousel card; fifth-card state checked separately.

## Findings and comparison history

- Fixed initial runtime failure by using the repository's `lazyWithRetry` route loader. No new console errors appeared after the fix; earlier error entries remained in the browser's accumulated log.
- Fixed P2 carousel density: initial 54vw cards showed fewer than two full items; final 36vw cards show two full cards and most of the third, like the reference. Rechecked in the combined full-view image.
- Fixed P2 shortcut wrapping: the Russian favorites label now fits a single line at 360 and 390px.
- Fixed P2 logo background: generated alpha wordmark removes the visible rectangular background. Inspected at mobile and desktop sizes.
- Fixed P2 caption contrast over light architecture with dark caption backing; inspected the final 390px capture.
- Fixed unused Tiffany area below short content by allowing the white content panel to fill the viewport.
- No actionable P0/P1/P2 findings remain. This is an intentional property-brand adaptation, not a literal food-ad clone.

## Required fidelity surfaces

- Typography: existing Montserrat family, heavy uppercase campaign titles, compact uppercase shortcut headings, small supporting captions. The supplied wordmark is recreated as a raster asset; localized campaign copy remains selectable HTML. No clipped Russian shortcut label remains.
- Layout: horizontal portrait campaign rail; rounded white lower panel; three equal quick-action tiles; two editorial cards. The Android system chrome and food-specific sections are intentionally omitted. Mobile widths and a wide desktop viewport inspected; no document overflow at 390px.
- Colors: site Tiffany token #0099a9 replaces navy; white lower panel and alternating dark/light quick-action tiles preserve the reference's visual hierarchy.
- Imagery: five individually generated real-estate campaigns and three individually generated 3D quick-action artworks, plus the generated wordmark. All images load. Nine optimized WebP assets total about 624 KB. Focused comparison confirms clear silhouettes and clean image placement.
- Content: all requested strategies, map, deposit and favorites are included. Seven locale namespaces (ru/en/de/es/fr/pl/sv) are complete and identical to legacy copies. Other locales checked structurally, not visually.

## Interaction and implementation checks

- First-to-fifth carousel navigation updates the selected indicator; Next is disabled on the fifth card.
- Menu opens, exposes eight destination links, and closes with Escape while restoring summary focus.
- Clicking the auction banner opens the existing auction catalogue; browser back returns to the new page.
- Shortcut hrefs verified as /map, /deposit and /favorites. Their existing downstream account/payment flows were not exercised.
- Web/legacy JSX, CSS and soft-launch access gate parity passed; locale namespace parity passed for all seven languages.
- Build passed; existing large-chunk warnings remain. `git diff --check` passed.
- 56 of 57 existing regression tests passed. Unrelated failure: `src/pages/PropertyDetailPage.mobile.test.js`, “guest buyer can express purchase intent before authentication”, expects `disabled={isReservedActive}` in existing property-detail markup. That component was not edited in this task.
- Existing homepage carousel, shared stories, buyer/role flows, gallery, debt risk assets and investment behavior remain unchanged by this new route.

final result: passed

---

# Design QA — mobile showcase Tiffany refinement (2026-09-13)

Source visual truth: `artifacts/mobile-showcase/tiffany-reference.png`, `artifacts/mobile-showcase/search-reference.png`, `artifacts/mobile-showcase/app-promo-reference.png`, and the previously supplied property-card reference.
Implementation screenshots: `artifacts/mobile-showcase/tiffany-search-cards-mobile.png`, `artifacts/mobile-showcase/smaller-cards-mobile.png`, and `artifacts/mobile-showcase/app-gradient-mobile.png`.
Combined comparison evidence: `artifacts/mobile-showcase/tiffany-comparison.png` (792×370), `artifacts/mobile-showcase/search-comparison.png` (736×80), and `artifacts/mobile-showcase/app-promo-comparison.png` (736×286).
Viewport: 396×837 CSS px at DPR 1. State: Russian locale, authenticated header, live property data.

## Findings

- No actionable P0, P1, or P2 differences remain in the requested scope.
- The hero now uses the supplied light Tiffany range (`#62d3da` to `#4ecdd6`) and visually matches the color reference.
- The search uses the reference's oversized white pill, muted placeholder, circular Tiffany action and search icon. The page keeps the search on white because the current section structure has no property-photo backdrop.
- Property cards are reduced from 225.7 px to 205.9 px at the inspected viewport; timer, price, metadata and actions remain readable.
- The app promo keeps the compact accepted composition while adding a visibly stronger deep-Tiffany-to-aqua gradient, highlight and elevation.

## Required fidelity surfaces

- Fonts and typography: Montserrat hierarchy and weights are unchanged; the larger search placeholder and app headline remain balanced at mobile width.
- Spacing and layout rhythm: the search is 70 px tall with a 54 px circular action; card rail width is 52vw with a 12 px gap; no page-level horizontal overflow exists.
- Colors and visual tokens: the hero uses the sampled light Tiffany palette; controls inherit `#4ecdd6`; the app promo uses deeper brand tones for contrast.
- Image quality and asset fidelity: existing campaign and live property images remain unchanged and sharp; no substitute assets were introduced.
- Copy and content: existing localized strings and live listing values remain unchanged.

## Interaction and implementation checks

- Search remains a native form and submits through the existing `/search-results` flow.
- Shared property card navigation, favorite, bid and Buy Now actions remain intact.
- Web and legacy JSX/CSS copies are identical.
- Browser measurements confirm a 396×837 viewport and zero horizontal page overflow.

final result: passed

---

# Design QA — map property hint and Street View action (2026-09-15)

- Source visual truth: `/var/folders/c8/gpqh9xf946vd864n2qjcts640000gp/T/codex-clipboard-a85f85ff-6764-4f37-b16c-91fc9da2fdd6.png`
- Source pixels: `600 × 280`
- Implementation screenshot: Codex in-app browser inline capture, `Map popup QA`, captured at `600 × 280`; the temporary isolated QA entry was removed after verification.
- Responsive evidence: Codex in-app browser inline capture at `390 × 320`; measured popup frame `366 × 158.84 CSS px` at `x: 12`, `y: 66`.
- CSS viewport: `600 × 280` for the direct comparison and `390 × 320` for the mobile check.
- Device scale factor: `1`; source and implementation were compared at equal pixel density without resampling.
- State: selected-property hint open; Street View action also tested in its open/loading state and closed with Escape.

**Full-view comparison evidence**

- The source was treated as the existing-state baseline because the requested outcome was a visual redesign, not a literal clone.
- The revised hint preserves the white floating-card composition, property thumbnail, title, price, and primary navigation from the baseline.
- Intentional improvements are a clearer three-column information row, a larger thumbnail, a dedicated close control, stronger title/price hierarchy, softer Tiffany framing, and a balanced two-action row.
- At `600 × 280`, both actions remain on one row and the full popup remains inside the viewport. At `390 × 320`, the long title stays within two lines and both actions remain touch-safe without horizontal overflow.

**Focused region comparison evidence**

- A separate crop was not needed: at the matched `600 × 280` viewport, the popup itself occupies the principal visible region and its typography, icons, image crop, button labels, spacing, radii, and shadows are directly readable.

**Required fidelity surfaces**

- Fonts and typography: Montserrat hierarchy is consistent with the product; label, title, and price use distinct weights and line heights; long titles clamp to two lines; action copy remains readable at the mobile breakpoint.
- Spacing and layout rhythm: `12–14px` outer insets, `64–72px` thumbnail, `10–14px` internal gaps, `22–24px` card radius, and `48px` actions form a consistent mobile rhythm.
- Colors and tokens: white translucent surface, deep Tiffany primary action, pale Tiffany Street View action, dark ink title, and teal price align with the existing buyer experience and retain sufficient contrast.
- Image quality and asset fidelity: the property thumbnail remains a real listing image, uses responsive sources sized for the larger slot, keeps `object-fit: cover`, and retains the shared fallback behavior.
- Copy and content: property title and formatted price are unchanged; the new Russian action is “Погулять по улицам” and all seven supported locales have synchronized translations.

**Findings**

- No actionable P0, P1, or P2 visual differences remain.

**Interaction evidence**

- “Погулять по улицам” opens the shared `PropertyStreetViewDrawer` in a fullscreen dialog.
- The loading state is announced, the close control receives focus, Escape closes the dialog, and focus returns to the trigger.
- “Открыть объект” retains the existing access gate and property-detail navigation.
- Console review found only the known local-environment error for a missing `VITE_YANDEX_MAPS_API_KEY` on the real map route; the isolated popup and Street View interaction introduced no new console errors.

**Comparison history**

- Initial browser capture used the default wide viewport and was rejected because clipping did not match the `600 × 280` source.
- The browser viewport was normalized to `600 × 280`, then checked again at `390 × 320`. No P0/P1/P2 fixes were required after the normalized comparison.

**Implementation checklist**

- [x] Preserve property-detail navigation and access gating.
- [x] Add pedestrian Street View action using the shared panorama drawer.
- [x] Keep controls at least `44px` and provide visible focus states.
- [x] Synchronize web and legacy implementations.
- [x] Add and verify all supported locale strings.

**Follow-up polish**

- None required for this scope.

final result: passed

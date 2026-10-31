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
- Follow-up source: `/var/folders/c8/gpqh9xf946vd864n2qjcts640000gp/T/codex-clipboard-571b4789-14ed-4a54-a28a-5dfc3ad0c14c.png` — shortcut and bonuses region before the circular-icon polish.
- Browser-rendered implementation: `/Users/vtichonenko/newsellyourbrick/design-qa-buy-now-top.png` and `/Users/vtichonenko/newsellyourbrick/design-qa-buy-now-actions.png` — 393 × 852 px each.
- Follow-up implementation: `/Users/vtichonenko/newsellyourbrick/design-qa-buy-now-circles.png` — 393 × 852 px; circular shortcuts, raised gift, and reduced guide heading.
- Same-input comparisons: `/Users/vtichonenko/newsellyourbrick/design-qa-comparison-full.png` — 786 × 852 px; `/Users/vtichonenko/newsellyourbrick/design-qa-comparison-focus.png` — 786 × 657 px.
- Follow-up focused comparison: `/Users/vtichonenko/newsellyourbrick/design-qa-buy-now-circles-comparison.png` — 806 × 306 px; supplied follow-up on the left and final implementation on the right.
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
4. Follow-up P2 — the four icon holders still read as rounded squares and the artworks were undersized. Fix: changed them to true circles (`border-radius: 50%`), increased the responsive holders to 62–74 px, and allowed each artwork to occupy 90% of the circle. Browser measurements confirm four 73.48 px circles at 393 px and four 62 px circles at 320 px.
5. Follow-up P2 — the gift sat too low in its crop. Fix: raised the artwork by 5 px while preserving the circular mask. The focused comparison shows the bow and box clearly. The guide heading was reduced from a 27–36 px range to 24–32 px and remains clamped to at most two lines (29.87 px/two lines at 393 px; 24.32 px/one line at 320 px).

## Interaction and console evidence

- The mobile «Купить сейчас» tab opens the new hub.
- The horizontal guide rail was scrolled from card 01 to card 02 and snapped correctly.
- The bonuses row remains a real navigation control to `/bonuses`; reservation and existing shortcut handlers were preserved.
- Console review found the known local missing `VITE_YANDEX_MAPS_API_KEY` map error and the existing `inert` warning; this hub introduced no new console errors.
- Targeted tests passed (5/5), production build passed, and `git diff --check` passed.
- Follow-up responsive measurements confirm zero horizontal overflow inside the hub and service grid at 320 px; the existing outer application shell retains an unrelated 11 px overflow outside the hub.

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


## Deposit strategy modal — supplied layout and 3D references

The latest full report and visual comparison are in [the deposit modal QA](docs/design/deposit-strategy-reference/design-qa.md). Reference and implementation were compared together; mobile, compact and desktop checks passed.

final result: passed

## Development stage ticket — 2026-09-27

- Source visual: `/var/folders/c8/gpqh9xf946vd864n2qjcts640000gp/T/codex-clipboard-ae44b54b-5e28-4bbe-82dd-dcaead4e6294.png` (1022 × 658 pixels).
- Implementation: `http://localhost:5173/development/callao-salvaje-costa-adeje-demo`.
- Implementation screenshot evidence: inline Codex in-app browser screenshot in the combined reference/implementation tool result titled “Сверяю композицию и положение текущей точки”. No screenshot file was exported by the browser tool. Viewport: 319 × 837 CSS px; screenshot: 319 × 837 pixels. A prior clipped browser capture had an incorrect density and was excluded from comparison.
- State: fundraising, second of five stages; next stage construction.
- Full-view and focused comparison: reference and full rendered capture opened together in one tool result; the stage component is fully visible. The reference contains a loyalty program, while this task explicitly adapts it to the existing development project. Two columns (35/65), white rounded ticket, central top/bottom cutouts, inset vertical divider, filled and outlined badges, bottom progress track and circular milestones are preserved. Mobile copy wraps to remain readable at the narrower width; it is not a pixel-identical recreation of the unrelated loyalty text.
- Typography: existing Montserrat maintained, regular/medium weights; current and next-stage headings and badges readable without clipping.
- Spacing/layout: current stage left, upcoming stage and progress right, footer aligned near the bottom; all five milestones fit, with no component overflow.
- Color/tokens: established Tiffany replaces reference pink; outlined lavender badge and neutral remaining track retained.
- Images/assets: no photographic or illustrated assets in the scoped component; the scale and dots are semantic live UI, and the arrow/check use existing Lucide icons. Loyalty brand mark intentionally omitted.
- Copy: project stage names, stage counter, next-stage explanation localized to seven languages. No loyalty percentages or prices copied into project progress.
- Current-state verification: `aria-current="step"` identifies “Сбор капитала”; 164px track has a 45.9375px fill, ending at the second milestone center. Completed state uses the final stage instead of referring to a nonexistent next stage.
- Browser console: no captured errors. Seven existing parity/localization/finance tests pass. Production code build passes with public asset copying disabled due to the previously documented disk-space limit; `git diff --check` passes.
- Findings: no actionable P0/P1/P2 issues in the inspected mobile state. Responsive text reflow and Tiffany palette are intentional product adaptations. Other project statuses were reviewed in code rather than by changing persisted project data.
- Comparison history: first full-view visual pass accepted; no visual correction loop required. Invalid clipped capture was replaced with full-viewport evidence before assessment.
- Checklist: integrated existing stage data; kept surrounding description, waterfall and document/history drawers; mirrored web/legacy files; preserved seven locales.
- final result: passed

## Expandable stages and pool background — 2026-09-27

- Scope update: user requested inline “Подробнее” expansion for all five stages and an additional swimming-pool background with a pink flamingo ring behind license and stages.
- Asset truth: `public/images/development/pool-flamingo-v1.webp`; exact built-in ImageGen prompt and saved paths in `docs/development-pool-artwork.md`.
- Rendered evidence: in-app browser screenshots in tool results “Проверяю фон лицензии и этапов” (1280 × 720), “Проверяю бассейн и текст на мобильном экране” and “Проверяю подробности этапов на фоне бассейна” (390 × 844). Browser did not export screenshot files. Temporary viewport override reset after verification.
- Typography/layout: Montserrat maintained; license copy sits on a translucent white panel; stage ticket and detailed list remain opaque white. The pink flamingo is visible to the right of the license on desktop and mobile. All five steps are readable in the expanded panel without horizontal overflow.
- Color/asset: generated turquoise pool photo with pink inflatable flamingo, no placeholder artwork. Image fades into the turquoise backdrop so expanding the content does not stretch the flamingo. Ticket cutouts now reveal the pool through a mask rather than showing the previous page-color circles.
- Behavior verified: button click expands the inline details, exposes all five descriptions and marks fundraising as current; “Свернуть” collapses; Enter also collapses. aria-expanded and aria-controls match panel visibility. Project status and persisted data remain unchanged.
- Verification: seven parity/localization/finance tests pass; diff check clean; production code build passes with static copying disabled due to known disk-space constraint.
- Findings: no actionable P0/P1/P2 findings in inspected collapsed/expanded states. New backdrop intentionally supersedes the original plain page surroundings.
- final result: passed

## DEVELOP catalogue, gallery and isolation — 2026-09-27

- Catalogue uses two columns: measured 171px + 171px at 390px, 135.5px + 135.5px at 319px. No page/card horizontal overflow. Buyer catalogue contains no publishing link.
- New full-ticket project card, fixed capital in application drawer, seller-only management entry under My Properties.
- Gallery uses auction desktop classes, mobile thumbnail styles and fullscreen viewer styles; opening, Escape and focus restoration checked in browser. Current demo has one source image, so multi-photo arrows are conditional.
- Binocular banner rendered directly before Documents / History. Desktop and mobile compositions reviewed; banner link leads to the project stages.
- Standard auction property `/property/house-abamah-golf-villa-110`: no development panels or investment decision block on mobile or desktop. Removed its unconditional integration from the shared PropertyDetailClassic template; legacy synced.
- Development API integration test passes with partial investment rejection, single full funding, closed enquiries after funding and buyer publication/management rejection. UI/property regression subset: 30 passed. Wider existing UX suite: 60 passed, 3 unrelated failures in profile history/bookings and favorites expectations.
- Full `npm run build` passed. `git diff --check` passed.

### Compact card and promo CTA refinement

- Removed the auction **page** class from the development gallery; it injected 100px of mobile bottom padding (and desktop shell padding). Gallery-only styles remain scoped to DEVELOP. Measured gallery padding 0px and 16px spacing to the heading at 390px.
- Catalogue now reuses AuctionPropertyCard and discoverAuctionCards styling, with 4:3 photo, capital dock, compact facts and primary CTA. Card height: 287px at 390px viewport, 260px at 319px; two columns and no horizontal overflow. Desktop photo capped at 260px, total card 425px.
- Promo CTA is centered across the banner, 52px tall on mobile, using the shared `btn-tiffany-shine` animation. Center offset measured below 0.01px; link still opens the project stages.
- Twelve affected parity/property tests pass, full build passes and diff whitespace check passes. No changes to other strategy cards.

### Mobile welcome photo promo cards

Historical iteration; replaced by the strategy carousel below.

- References: the 626 × 716 welcome-photo screenshot and 396 × 336 bento-layout screenshot supplied in this task. Implementation: [390 × 844 browser capture](qa-artifacts/mobile-discover-promos-390.jpg).
- Replaced the three locked shortcuts with five rounded, pale promo cards over the villa photo. The varied grid sizes, bold labels, and custom three-dimensional property illustrations follow the bento reference while keeping the existing search and photo.
- Verified legible text, complete illustrations, tap targets, and no overlap from the floating AI button at 390 px. The promo cards navigate directly to Auction, Buy Now, Shares, Debts, and Map. A browser click on Map reached `/map`.
- The local map canvas cannot initialize because `VITE_YANDEX_MAPS_API_KEY` is absent; its object list still renders. This is an environment limitation of the existing map route.
- Web and legacy JSX/CSS/assets match; all seven locales include promo text. Related tests: 17 passed. Production build and `git diff --check` passed.

### Mobile welcome photo strategy carousel — 2026-10-15

- Current implementation: [390 × 844 browser capture](qa-artifacts/mobile-discover-slider-390.png). The white “Покупать недвижимость — легко!” heading and lead remain above the villa photo. The four strategy cards, section heading, and pagination dots are inside the photo. The photo logo, photo search, and promo bento tiles were removed; the white section's search remains.
- In the in-app browser, checked 390 × 844 and 320 × 720 viewports. The four-card rail stays within the viewport without document-level horizontal overflow. The card copy, white “Подробнее” button, question control, and dots remain visible at 320 px.
- Swiping the rail selected “Долги”; tapping the first dot selected “Аукцион”. Vertical scrolling continued from the photo into the catalogue. The floating AI button did not cover the carousel.
- Web and legacy page files match. Unused promo images were removed. The shared search placeholder translation remains available to other search screens.

---

# Design QA — главная, блок способов покупки (2026-10-16)

## Evidence

- Source: `/var/folders/c8/gpqh9xf946vd864n2qjcts640000gp/T/codex-clipboard-599fcd7a-158c-4668-b7e3-be8a569b5a83.png`, 422 × 836 px.
- Implementation: the home formats section in the Codex in-app browser at `http://localhost:4173/`, captured at 422 × 836 px and checked at 320 × 800 px. Source and implementation were displayed together in the same comparison view.
- The existing villa background is intentionally retained from `/public/images/mobile-discover/welcome-summer.png`.

## Findings

- No actionable P0, P1, or P2 issues in the requested block. The reference's visual hierarchy, large white pill, alternating rounded-square/circle 2 × 2 tiles, and mobile spacing are present.
- The fixed site navigation remains over the top of the section and can cover its small brand label at some scroll positions. This is existing app navigation outside the replaced block; the heading, button, and all four tiles remain visible and usable.

## Fidelity and behavior

- Typography: large centered white heading, dark text on white controls, white text on green circles; product copy replaces the reference's unrelated game and money text.
- Spacing/layout: two equal columns, two rows, matching stagger-free checkerboard placement and large radii; the 320 px view has no clipped tile content.
- Colors: white cards and green circles follow the reference; the villa photo remains the user's requested background.
- Assets: existing local 3D strategy icons are sharp and correctly contained; no reference game artwork was reused.
- Content: all four real strategies and their destination links remain available. The catalog button opens `/search-results`.
- Interaction: the catalog link was clicked in the browser and reached its route. No browser console errors were observed.

final result: passed

## 2026-10-16 — SellYouBrick launch, Tiffany palette

Source visual truth: `/var/folders/c8/gpqh9xf946vd864n2qjcts640000gp/T/codex-clipboard-d1738687-a550-4913-87e5-f20406e4fc50.png` (736 × 1308).
Current-screen reference: `/var/folders/c8/gpqh9xf946vd864n2qjcts640000gp/T/codex-clipboard-41f2f67f-0fdc-4196-ad4a-a1076af00d3c.png`.
Implementation: `tmp/discover-reference-qa/mobile-390.png` (390 × 844 pixels, 390 × 844 CSS viewport, density 1).
State: Russian, main stage at scrollTop 0, first three launch cards visible, compass expanded.
Full-view evidence: `tmp/discover-reference-qa/comparison.png`, reference normalized to 390 px wide without changing aspect ratio; implementation captured in the in-app browser.
Focused evidence: `tmp/discover-reference-qa/comparison-detail.png`, paired card/wave/search crops.
Additional viewports: `tmp/discover-reference-qa/mobile-320.png`, `tmp/discover-reference-qa/desktop-1280.png`.
Restored live listing evidence: `tmp/discover-reference-qa/restored-properties.png`.

**Findings and comparison history**
- Initial P1: removing the earlier photo block left the catalog's negative overlap obscuring the compass. Restored the complete earlier lower layout and its associated overlap after the user's clarification; kept the new launch above it. Subsequent browser capture shows compass, the “Покупать недвижимость — легко!” block, and original photo composition in order.
- Initial P1: listing sections were empty because the local API was stopped. Started the existing local server; approved properties endpoint returned success with 114 entries. Browser DOM and rendered evidence confirm auction, buy-now, shares and debts sections with real listings.
- No remaining actionable P0/P1/P2 findings within the requested launch scope.

**Required fidelity surfaces**
- Typography: existing Montserrat retained; two-line headline follows the reference's hierarchy and position. Localized titles and captions wrap within cards at 320 and 390 px.
- Layout: card row starts at y=248 on the 390 px viewport, matching the normalized reference's y=249. Three full cards visible, five destinations reachable by horizontal scrolling and keyboard focus. Code-drawn asymmetric wave separates the opening from the search.
- Colors: intentional user-requested departure from purple to the established Tiffany/teal palette. First card white; remaining translucent teal cards use white text. Background is CSS, wave is SVG; no generated image is consumed.
- Imagery: existing property photographs render as overlapping circular crops; all fifteen thumbnail elements loaded successfully. Existing compass artwork and lower photo are preserved.
- Copy: SellYouBrick and “Хорошо быть дома” follow the user's branding/headline request. Eight new strings exist in all seven supported locales and corresponding legacy mirrors.

**Interaction and regression verification**
- Search submitted “Марбелья” to `/search-results?q=%D0%9C%D0%B0%D1%80%D0%B1%D0%B5%D0%BB%D1%8C%D1%8F`.
- Keyboard Tab reaches the fifth carousel card and scrolls the rail to show it. Horizontal gestures are excluded from vertical screen transitions.
- Header icons absent at opening; existing header reappears below the launch while browsing lower content.
- Browser error log after local server startup: no errors in the inspected window.
- 107 focused/regression tests passed, including stories, compass, property detail, buyer profile, role switch, investor flow, comparison picker, debt assets, carousel and mirror checks.
- `npm run build` passed; `git diff --check` passed.
- Physical-device touch/swipe behavior was not tested; browser keyboard scrolling and responsive rendering were verified.

**Implementation Checklist**
- [x] Preserve all lower blocks and the live listing catalog.
- [x] Synchronize JSX, CSS and seven locale files with legacy mirrors.
- [x] Verify responsive rendering, search and carousel reachability.
- [x] Compare reference and implementation together at full and focused scales.

final result: passed

## Follow-up — restore original compass and photo curve

User reference: `/var/folders/c8/gpqh9xf946vd864n2qjcts640000gp/T/codex-clipboard-8e058e14-e6af-4e27-9fd9-574153defe6d.png`.
Evidence: `tmp/discover-reference-qa/compass-comparison.png` (source and browser capture normalized to 450 px wide); `tmp/discover-reference-qa/restored-compass.png`; `tmp/discover-reference-qa/restored-curve.png`.
Restored the original compass CSS from the repository's HEAD: Tiffany background, diffuse highlight, white heading/body text, original compact proportions, right-hand compass and translucent white close button. Preserved current placement below search and existing click/dismiss behavior. Restored the existing white parabolic curve above the house photo; adjusted the brand spacing so white text remains below the curve while the headline and tiles keep their previous positions.
Typography, spacing, colors, imagery and copy checked against the supplied compass reference. Both CSS mirrors synchronized. Sixteen focused tests passed; diff whitespace check passed. No actionable P0/P1/P2 findings.
final result: passed

## 2026-10-17 — top listings and final mobile refinements

Requested changes: lighter Tiffany opening, five white pagination marks, grey search without click highlighting, up to five mixed real listings followed by a Tiffany catalog tile; then place the listing rail below the compass, add shared favorites, restore the AI FAB, show navigation on the first scroll, enlarge strategy cards and add existing section icons. Latest refinement lowers the AI FAB and restyles search as a grey capsule with a white search circle and a compact mint AI action.

Evidence: `tmp/discover-reference-qa/top-comparison.png` (earlier source vs light opening); `top-under-compass.png` (listing rail and hearts); `polish-main.png` (larger cards/icons); `polish-like-active.png` (active favorite); `search-final-320.png` and `search-final-390.png` (latest search and lowered FAB). All paths are relative to the project root. Main browser checks used 390 × 844 CSS pixels at density 1; narrow checks used 320 × 740. Desktop layout was inspected at 1280 × 900 in `top-desktop.png`.

**Findings and fixes**
- P1: conditionally mounting Header delayed the guest login modal host until the launch had scrolled away. Header now remains mounted on the stage; only its visual bar is hidden at scrollTop 0. Its existing portal and login-event handler remain available to favorite actions. The visible bar appears at scrollTop > 0; browser check confirmed it visible after 25.5 px of scroll.
- P1: the existing FAB visibility rule hid AI while search or either carousel was visible. It now stays available throughout the stage, retaining the existing hero/footer rules. Clicking it opened the real AI consultant drawer, which was closed after verification.
- P2: the shared FAB sat 90 px above the lower edge. The discover page now overrides only its bottom offset to 20 px plus the safe area, preserving shared size and interactions. Computed bottom verified as 20 px in the browser.
- P2: the new icon beside “Аукцион” caused a split word at 320 px. A narrow-screen icon size adjustment restores a single line; computed title height and line-height both 14.04 px after the fix.

**Required fidelity surfaces**
- Typography: existing Montserrat, stronger section hierarchy, compact localized strategy labels and two-line listing titles retained. Search uses restrained grey typography. At 320 px the full accessible search label remains available even when the placeholder is constrained by input width.
- Layout: enlarged strategy cards, five white dots, original wave and photo curve retained. Search → original compass → mixed top listing rail → original welcome/photo/catalog order confirmed in browser DOM. No document overflow at 320 or 1280 px.
- Colors: lighter Tiffany gradient, grey search (#f1f3f4), white search circle, mint AI action, white dots and Tiffany final catalog tile. Search border and shadow were identical before and after clicking the input.
- Imagery: all five existing 3D section icons loaded. Listing images use the existing image fallback for missing API media; no generated assets are used. The flame is a library icon.
- Copy/content: all new strings are present in ru/en/de/es/fr/pl/sv and mirrored locales. Listing selection alternates available format groups, deduplicates table/id identities, and caps listings at five. The sixth slot is the catalog action when five listings are available.

**Interaction and regression checks**
- Five listing cards, five independent favorite controls and one catalog tile confirmed.
- Favorite toggled true with pink button/heart fill, then false; original favorite state restored after testing. Existing shared favorites API/context handles persistence.
- Catalog tile navigated to `/search-results`.
- Scrolling/focusing the fifth strategy updated the fifth pagination mark.
- AI button opened the actual consultant drawer; no message was sent.
- Search remains functional and its container has no click focus highlight.
- 117 focused/regression tests passed, including Header touch, favorites, listing selection, carousels, compass, stories, buyer profile, role switch, property detail, investor flow, compare picker and debt assets.
- Web/legacy JSX, CSS, component, utility, AI positioning test and seven locale mirrors match. Production build and `git diff --check` passed.
- Physical iOS/Android touch and a signed-out Clerk session were not verified. The guest modal-host fix is covered by the always-mounted Header contract; logged-in favorites and actual AI interactions were exercised in the browser.

final result: passed

## Follow-up — Tiffany search icon

Matched the supplied search-button reference with a solid #49cbd6 circle and white magnifier. Size, layout and search behavior retained; both CSS mirrors updated. Browser computed colors verified. Evidence: `tmp/discover-reference-qa/search-tiffany-icon.png`. Six focused/parity tests and whitespace check passed.
final result: passed

## Follow-up — headline copy

Replaced “Хорошо быть дома” with “Легко найти своё”, keeping the two-line composition. Updated all seven locale pairs and legacy mirrors. Browser heading and capture verified: `tmp/discover-reference-qa/headline-find-yours.png`. Six relevant tests and `git diff --check` passed.
final result: passed

## 2026-10-17 — piggy bank page

Reference: `/var/folders/c8/gpqh9xf946vd864n2qjcts640000gp/T/codex-clipboard-fe324ed0-693f-4c3b-b0c4-067ee91bbfd3.png`. Visual evidence: `tmp/piggy-bank-qa/comparison.png`, `page-382.png`, `page-320.png`, `celebration-382.png`, `drawer-382.png`.

- The 382 × 726 render follows the reference's pastel gradient, centered total and pig, coral reward card, white savings goal card and blue gradient action. The reference includes native phone chrome and a photo avatar; this web route uses the signed-in avatar or an initial.
- Generated transparent pig, bicycle, RC car and gold coin assets are stored in both public image trees. The pig interaction produced a 32% dim overlay and 19 falling coin particles in browser verification.
- The Add goal drawer measured 0.800 of the viewport height at 382 × 726. Choosing a task filled its name and amount; submitting created a new goal card. At 320 × 700 there was no horizontal document overflow and the goal actions remained visible.
- Web/legacy JSX, CSS, App routing, access list, all seven locale sections and all four image assets match. The route is `/piggy-bank`; balances and actions are a local demo with no money movement.
- Production build and `git diff --check` passed. In a 80-test regression set, 79 passed; the sole failure is an existing `src/App.route-lazy.test.js` assertion about the home page's `ProfileStrategyStories` lazy import, which is unrelated to this new route.

final result: passed with known unrelated regression-test failure

## Follow-up — Tiffany task tickets in the piggy drawer

References: `/var/folders/c8/gpqh9xf946vd864n2qjcts640000gp/T/codex-clipboard-ac11ac9a-ffed-4738-9841-4892eea3aa60.png` and Tiffany swatch `/var/folders/c8/gpqh9xf946vd864n2qjcts640000gp/T/codex-clipboard-004b36d2-d98d-48c2-bcf3-ead41e39ba39.png`. Evidence: `tmp/piggy-bank-qa/tickets-drawer-382.png` and `tickets-drawer-320.png`.

Replaced the three static task steps with six numbered 3D ticket stacks, a day-by-day progress line, claimed and locked markers, a highlighted tomorrow state, and a Tiffany bonus CTA. The button opens the existing `/bonuses` route. The active preset and goal submit button in the same drawer now use Tiffany accents. On 320 px, all six labels remain readable without clipping or horizontal overflow; the drawer still measures exactly 80% of viewport height. Web and legacy files, ticket asset and seven locale pairs are synchronized. 26 focused tests, production build and `git diff --check` passed.

final result: passed

## 2026-10-17 — illustrated Test-drive and Map feature cards

User references: travel card (`codex-clipboard-2474caea-bcc8-48a7-8db7-a307de7b6e62.png`) and original lower Auction tile (`codex-clipboard-ed250d70-ba53-48aa-9290-1ccd7c352d29.png`). The user approved Test-drive and requested the same treatment for Map.

Replaced only the lower feature-grid Shares and Auction tiles with Test-drive and Map. The top strategy rail, property sections, compass, search and other main-page blocks remain present. Both new cards use live localized titles, a white Details capsule, a diagonal arrow, a light rounded background and optimized transparent 3D illustrations. Tiffany suitcase/yellow hat and folded ivory map/Tiffany house pin are generated assets stored identically in both public trees. Existing locale keys cover all seven languages. The approved Test-drive layout is preserved through shared feature-card CSS.

Evidence: `tmp/discover-reference-qa/map-feature-context.png`, `map-and-test-drive.png`, and `feature-comparison.png`. The last file compares the travel reference alongside the actual cards at the 383 × 827 browser viewport. Typography, spacing, rounded corners, Tiffany colors, image framing and live buttons were inspected together. Square card proportions preserve the established two-column grid. No actionable P0/P1/P2 findings.

Interaction: Map tile opened `/map` and the real map-results UI with 80 objects. Test-drive previously opened `/test-drive`. Map, Buy now, Debts and Test-drive all remain links with accessible names. Build passed (13.86s); 17 main-page/listing tests passed; JSX/CSS/asset mirrors match; `git diff --check` passed.

Known existing limitation: the unchanged TestDriveLandingPage.mobile.test.js expects the absent `testDriveLanding_heroMobileTitle` key in its page source; the earlier expanded Test-drive run had 16 passing tests and this one unrelated failure. No landing-page code was changed by these feature tiles.

final result: passed with known unrelated landing-page test limitation

## 2026-10-17 — lottery banner replacing the photo-section catalog button

Reference: `codex-clipboard-2baea8d5-b20e-4515-80c1-4f4f1855b921.png`. Replaced only the large Catalog objects link above the feature grid with a compact light-grey lottery banner: generated Tiffany 3D ticket, localized two-line copy and a dark rounded View action. The complete banner is one accessible link to the existing `/lottery` page. Other catalog entry points and all surrounding blocks remain available.

Evidence: `tmp/discover-reference-qa/lottery-banner-context.jpg`, `lottery-banner-320.jpg`, `lottery-banner-result.png`, and `lottery-banner-comparison.png`. Source and rendered banner were compared together: same icon/copy/action arrangement, soft grey background, rounded silhouette, dark action and compact typography. Tiffany ticket replaces the reference heart. At 320 px copy wraps to three lines without collisions or clipping; at 383 px it is two lines. The existing Map/Test-drive grid remains below.

The banner click loaded the real Lottery page, including its heading, 3D scene and ticket action. This check only navigated to the page. Page JSX/CSS, all seven locale files and optimized ticket WebP match their legacy counterparts. Seventeen relevant tests passed; production build passed (14.38s); whitespace check passed. No actionable P0/P1/P2 findings.

Built-in image_gen prompt and asset provenance: `tmp/discover-reference-qa/lottery-ticket-generation.json`; final asset: `public/images/mobile-discover/lottery-tiffany-ticket.webp`.

final result: passed

## 2026-10-17 — investor and VIP circles with light grey blur

Replaced the lower Buy now/Debts shortcuts with Smart investor panel (`/calculator`) and VIP properties (`/private-club`). Reused existing transparent 3D chart and premium villa artwork, optimized as small WebP assets in both public trees. The top launch strategies and catalog sections are retained. VIP label is localized in all seven locale mirrors; investor title reuses the existing calculator key.

The initial smoky circles were too dark for the user. Final treatment uses light translucent grey rgba(224,229,234,0.46), a subtle white highlight, actual 20px backdrop blur with reduced saturation, dark readable labels and a light inset edge. Round shapes remain. Evidence: `tmp/discover-reference-qa/glass-light-context.jpg`, `glass-light-320.jpg`, `glass-light-result.png`. Both 383px and 320px renders were visually checked; labels fit, icons load, grid and other features retain spacing. Computed backdrop filters and destination links were verified in the browser.

Seventeen relevant tests passed for the content replacement; fourteen page tests passed after the light-grey adjustment. Production build passed before that CSS-only lightening (14.03s). Page/style/seven-locale/new-image parity and final whitespace check passed. No actionable P0/P1/P2 issues remain.

final result: passed

## 2026-10-17 — coordinated Tiffany artwork and rectangular feature grid

Generated a glossy Tiffany/ivory calculator with growth bars for the investor panel and a stylized ivory house with Tiffany roof/diamond for VIP. The VIP image was edited to remove extraneous suitcase/map props. Both final transparent WebP assets are saved in the two public trees; full generation and cleanup prompts are in `tmp/discover-reference-qa/tiffany-feature-art-generation.json` (built-in image_gen).

Following the user's latest direction, both cards now use the same rounded rectangular feature layout as Map and Test-drive: title above, large illustration, white Details capsule and diagonal arrow below. The accepted light grey background and 20px backdrop blur remain on the investor/VIP cards. Their existing `/calculator` and `/private-club` destinations remain unchanged.

Evidence: `tmp/discover-reference-qa/rectangular-features-context.jpg`, `rectangular-features-320.jpg`, `rectangular-features-result.png`. All four cards were visually compared together at 383px and 320px. The new artwork matches the Tiffany resin/ivory materials of the suitcase and map; headings and live controls remain readable at both widths, with deliberate image cropping under the buttons consistent with the reference cards. No actionable P0/P1/P2 findings.

Seventeen relevant tests passed; final production build passed (14.63s); JSX/CSS/image mirrors and `git diff --check` passed. No other main-page blocks were removed.

final result: passed

## Follow-up — remove the heading above the lottery

Removed only the photo-section heading “Найдите свой дом удобным способом”, as requested. The SellYouBrick brand, lottery banner and all four illustrated feature cards remain. The lottery now follows the brand directly. Both JSX mirrors match; fourteen main-page tests and whitespace check passed. Browser verification: `tmp/discover-reference-qa/photo-without-heading.jpg` and `photo-without-heading-result.png`. No actionable P0/P1/P2 findings.

final result: passed

## Follow-up — emphasize You in both SellYouBrick wordmarks

Wrapped only “You” in the same rounded translucent Tiffany capsule on the top launch wordmark and the photo-section wordmark. Wordmark spelling remains SellYouBrick, with its complete accessible name. Existing sizes and placements remain. Browser verified both locations; evidence: `tmp/discover-reference-qa/brand-you-top.jpg`, `brand-you-photo.jpg`, `brand-you-both.png`. Fourteen relevant tests passed; JSX/CSS mirrors and whitespace check passed. No actionable P0/P1/P2 findings.

final result: passed

## Follow-up — tighten the You capsule

Reduced shared horizontal capsule padding from 0.24em to 0.16em and external spacing from 0.06em to 0.025em for both wordmarks. Browser checked the compact top wordmark: `tmp/discover-reference-qa/brand-you-tighter.png`. CSS mirrors and whitespace check passed.

final result: passed

## 2026-10-17 — stabilize the blurred feature-card edges

The user reported a blinking right edge on the VIP card. The glass cards combined backdrop filtering, rounded clipping and hover translation inside a sticky photo section. Moved the blur to an independent, stationary pseudo-element that filters a fixed copy of the existing welcome photograph. The layer extends 24px beyond the crop to keep its filter edges outside the visible card. Investor/VIP links no longer translate on hover; title, illustration and buttons remain separate from the filter. The light grey treatment and rounded shape remain.

Evidence: `tmp/discover-reference-qa/glass-edge-fixed.jpg` and `glass-edge-fixed.png`. Browser verification after scrolling down and back up showed a continuous grey card surface without the vertical edge strip. Computed link backdrop-filter is none, transition duration is 0s; the separate layer retains blur(20px) saturate(0.15) and the welcome image. Physical-device temporal flicker was not independently reproduced; the scrolling backdrop resampling and hover motion have been removed from this component.

Seventeen relevant tests passed; both JSX/CSS mirrors and whitespace check passed. Final production build passed. No actionable P0/P1/P2 findings in the inspected browser view.

final result: passed with physical-device temporal verification remaining

## Follow-up — larger photo-section wordmark

Increased only the SellYouBrick wordmark above the lottery from 1.35rem to responsive clamp(28px, 8vw, 36px), retaining the tightened You capsule. Verified visually in the browser; evidence: `tmp/discover-reference-qa/photo-brand-larger.png`. CSS mirrors and whitespace check passed.

final result: passed

## 2026-10-17 — Develop shortcut and reference-inspired glass finish

Replaced only the fifth top-rail Test-drive shortcut with Development, retaining the lower Test-drive feature. The new shortcut points to `/development`, uses an existing Tiffany construction illustration optimized to a mirrored 128px WebP, and a project cover as the first circular thumbnail. A short localized caption was added to all seven locale pairs. The launch destination contract now expects `/development`; clicking the tile opened the existing development catalogue.

The user's next reference replaces the flat grey investor/VIP background with glass: warm beige-to-grey/green tones, soft photographic variation, a light edge and subtle inner highlight. The separate static blurred photo layer remains, with no scrolling backdrop sampling or hover motion. Typography and the existing artwork/actions remain readable. Evidence: `tmp/discover-reference-qa/glass-reference-final.jpg`, `glass-reference-final.png`, `glass-reference-320.jpg`. Both 383px and 320px layouts were inspected alongside the user's glass reference.

Russian `develop.title` and the section-info title now read “Девелоп”. Remaining hardcoded Development labels in the hero, catalogue, project-header fallback and Buyer Passport backlink use the existing translation key, so other languages retain their existing spelling. Browser checked the Russian development navigation/hero and top-rail text “Девелоп / От идеи до объекта”.

Nineteen main-page/listing/development parity tests passed. All seven locale mirrors match; Russian title is Девелоп and English remains DEVELOP. Production build passed (16.92s), and whitespace check passed. No actionable P0/P1/P2 findings in the inspected views.

final result: passed

## 2026-10-17 — lottery banner opens an under-development modal

Changed the lottery banner from a navigation link to a button opening a native modal dialog. It displays the existing Tiffany ticket, localized “В разработке” title, short launch-preparation copy, Close and Got it controls. The actual lottery route remains available independently. The banner appearance and all surrounding blocks are preserved.

The dialog opens in the top layer, freezes the main stage scroll, initially focuses Got it, cycles Tab/Shift+Tab between the two controls, and returns focus to the banner on close. Browser tested Got it, Escape, backdrop close, focus return and stage overflow restoration. The page remains at `/`. No lottery participation action is performed.

Evidence: `tmp/discover-reference-qa/lottery-coming-soon-modal.jpg`, `lottery-coming-soon-modal.png`, `lottery-coming-soon-modal-320.jpg`. Inspected at 383px and 320px; title, copy and controls fit without clipping. Modal strings exist in all seven locale pairs. Nineteen page/listing/development parity tests, production build (14.29s), JSX/CSS/locale parity and whitespace check passed. No actionable P0/P1/P2 findings.

final result: passed

## 2026-10-17 — synchronization with current origin/new-era

Integrated upstream commit 600380c3 into `codex/new-era-discover-and-piggy-bank`, including all local product work and the Piggy Bank demo. Before rebasing, preserved 80 product files plus temporary QA artifacts in an external backup and local branch `codex/backup-new-era-ui-20261017` (snapshot 3ac512c8).

Preservation audit found no missing product files and retained all 444 locally changed locale values. Initially 59 files matched the snapshot byte-for-byte and 21 incorporated upstream edits; this QA document then received this additional report. All 36 existing changed web/legacy source and asset pairs match. The three debt risk images remain identical to upstream. All Piggy Bank source/images and generated discover images retain their original hashes.

Resolved locale conflicts semantically, retaining upstream assistant messages and the updated initial hero copy while preserving the requested Russian “Девелоп”. Removed an obsolete fifth lower strategy inserted by automatic merging: the approved lower grid remains Map/Investor/VIP/Test-drive, and Development remains in the five-card top rail. Added an executable factory regression for the four lower destinations. Updated the stale lazy-loading test to cover the current lazy listing sections; profile stories retain their independent tests.

Validation: 180 focused frontend tests across 40 files passed, covering main carousels/gestures, favorites, compass, stories, SectionInfoDrawer, buyer profile, seller role switch, property detail, investor flow, compare picker, risk presentation, development and mirrors. Forty-five upstream assistant tests passed. Production build and whitespace check passed. One unrelated TestDriveLandingPage mobile-hierarchy test still fails on unmodified upstream; source/test hashes match origin/new-era, and the same failure was reproduced from pristine copies (2 of 3 tests pass there).

Post-sync browser verification was unavailable because the browser URL policy rejected access to the current tab. No alternate browser access was attempted. Preservation was checked through source/asset hashes, semantic locale comparison, regression tests and production compilation; previous visual evidence remains in the local QA backup.

final result: synchronization verified; known upstream test and browser-verification limitations documented

## Related property deck — 2026-10-31

Scope: replace the vertical list inside PropertyDetailInternalLinks with a swipeable stack. The supplied task-app image is a composition reference; property photos, the site's Tiffany palette, pricing, favorites and existing property navigation are retained.

Evidence:
- Source visual truth: `/var/folders/c8/gpqh9xf946vd864n2qjcts640000gp/T/codex-clipboard-d5929db8-acde-46f5-9b7b-a3ef2c6e68a9.png`, 1200 × 1800 pixels. Original property block: `/var/folders/c8/gpqh9xf946vd864n2qjcts640000gp/T/codex-clipboard-b8b8eda8-ae70-4413-bddc-7cac0497d4fd.png`.
- Browser-rendered implementation: `artifacts/related-property-deck/mobile-auction.jpg` and `artifacts/related-property-deck/mobile-buy-now.jpg`, 390 × 844 CSS pixels and image pixels, density 1.
- Comparison: `artifacts/related-property-deck/comparison.jpg`. Reference card region scaled from 700 pixels to 330 pixels wide; implementation card region is shown at native width 330 pixels. Content differences are intentional: this is an adaptation of the stacked-card composition to property listings.
- Full implementation viewport reviewed, then the focused stack/timer/card region compared side by side. The reference phone chrome and unrelated task-app navigation are outside this change.
- Preview: `http://localhost:5173/tmp/related-deck-preview/index.html`, using the production RelatedPropertyDeck component with example listings and repository photos. The currently inspected real listing returns an empty geo-catalog response, so populated integration data was unavailable locally.

Primary interactions verified in the in-app browser: drag left advances, drag right goes back, right drag from item 1 wraps to item 3, next button wraps item 3 to item 1, keyboard ArrowRight advances, drag does not navigate, property anchors retain their detail URLs. Countdown changes every second; a non-auction card has no countdown. Shared state helpers cover expired/sold/reserved states. Web/legacy components and all seven locale additions match.

Comparison history:
1. Timer text inherited small global mobile rules. Increased selector specificity, removed the nested timer border/pulse, and verified readable digits in the 390 px screenshot.
2. 320 px test exposed minimum-content overflow. Added explicit section width and zero minimum width, reduced small-screen timer spacing, and rechecked the rendered section at exactly 320 px with the full card visible.
3. Added a minimum card height and a bottom-aligned price footer to keep controls stable between auction and non-auction cards; both screenshots confirm the same card footprint.

Findings: no actionable P0/P1/P2 visual issues remain. Fresh preview-tab console: no errors. Earlier development-tab errors from the temporary harness's initial async boot were corrected and did not reproduce on a clean tab. The real property page separately reports a pre-existing missing Yandex Maps key.

Validation: 53 focused tests passed; final parity tests passed; npm run build passed; git diff --check passed. Wider regression run: 76/79 passed. Existing unrelated failures concern ProfileStrategyStories step expectations, the main-page AI FAB expectation, and PropertyDetailPage recovery-copy expectations. Existing build warnings concern chunk sizes and outdated Browserslist data.

Preserved UX: only related properties in internal links; existing favorites and property-detail URLs; shared auction phase/availability logic; lazy geo-catalog loading; no changes to photo-gallery, access-gate, investor-flow or profile behavior.

final result: passed

## Follow-up: white cards directly on the page background

User correction: make the property card white, remove the outer card around the whole section, and ensure swipes work. Removed the outer block element and its border/background/padding. The section title, stacked white cards and navigation now sit directly on the existing page background. The auction countdown retains a pale Tiffany pill.

Gesture handling now starts from the entire stage through Framer Motion drag controls, including photo and title links; native link/image dragging is prevented. Favorite buttons remain independent. The stage and links allow vertical pan and pinch zoom.

Verified in the real project at `http://localhost:5173/property/apartment-hyde-residences-dubai-hills-estate-5`, viewport 390 × 844 CSS pixels, screenshot density 1. Evidence: `artifacts/related-property-deck/white-card-real-property.jpg` (390 × 844). Full viewport reviewed against the user's latest white-card/background correction, with focused review of card edges, section background and navigation. Photo drag left changes Marriott to Pelagos (1/2 to 2/2); title drag right returns to Marriott (1/2), without navigating. A subsequent normal title click opens the correct Marriott detail page. Browser back returns to Hyde. Horizontal gestures were exercised with the browser's drag input; physical-device touch was not separately exercised.

Validation: 25 focused property-detail/state/parity tests passed, production build passed and git diff --check passed. Existing unrelated map-key error remains outside the section.

final result: passed

## Follow-up: visible property previews and animated swipe guidance

The stack now exposes real next-property thumbnails and titles, rather than empty decorative layers. Two listings expose one following card; three or more expose two following cards. A single listing has no false backing cards or coach. The primary card remains white and the section remains directly on the page background.

On first entry with at least 60% of the stack in view, a Phosphor pointing-hand icon moves left and right twice with direction arrows and the existing localized swipe instruction. The overlay has no pointer interception. It disappears after 4.8 seconds, on any pointer/keyboard interaction in the deck, or when the stack leaves view; it does not reappear during that component visit. Reduced-motion preference gets a static hand. Observer and timeout clean up on unmount.

The property-opening arrow uses #42c4cc, the median color sampled from the supplied swatch `/var/folders/c8/gpqh9xf946vd864n2qjcts640000gp/T/codex-clipboard-18fcf74c-37d3-48b5-981e-13739221cede.png`. Browser computed color confirmed rgb(66, 196, 204).

Real-project visual evidence at 390 × 844 CSS pixels/density 1: `artifacts/related-property-deck/swipe-coach.jpg` captures the hand instruction on first scroll into view; `artifacts/related-property-deck/visible-property-stack.jpg` captures the unobstructed stack after dismissal. Source truth is the user's current request, supplied color swatch and previously approved white card. Full viewport and focused preview rows/coach/button reviewed: next listing title/photo clearly visible, white card and background preserved, coach readable, no actionable P0/P1/P2 findings. Automatic dismissal was observed (coach DOM count returned to 0), and native drag left/right changed the active listing 1/2 → 2/2 → 1/2 without navigating. Physical-device touch was not separately exercised.

Validation: 25 focused property-detail, state and web/legacy parity tests passed; production build passed; git diff --check passed. All existing localized instruction strings are reused, with no additional strings required.

final result: passed

## Follow-up: Tiffany coach and full-width animated CTA

Latest user corrections: the coach background is Tiffany with white text; the bottom action is a full-width “Перейти” pill with three chevrons flowing right. The final leading circle is white with a Tiffany arrow. The label is white and the CTA uses the existing site-wide `btn-tiffany-shine` effect rather than a separate shimmer implementation. Chevron animation stops with reduced-motion preference. Existing `goTo` translations are reused.

Real-project evidence: `artifacts/related-property-deck/tiffany-pill-final.jpg`, 390 × 844 CSS/image pixels, density 1, Hyde Residences page, primary listing active. Reviewed the full viewport and focused CTA against the supplied pill/chevron reference and latest color corrections. Browser computed styles confirmed a white label, white circular background, Tiffany icon (rgb(66,196,204)), and the shared `syb-tiffany-btn-sheen` animation. The coach color rule was changed to white after the earlier Tiffany-coach screenshot. The existing stack, white cards and gesture behavior are retained.

Validation: 25 focused property-detail, state and parity tests passed; npm run build passed; git diff --check passed.

final result: passed

# SellYourBrick App-First Buyer Mobile Art Direction

## Status and outcome

Approved for implementation on 2026-07-15. The user selected Test Drive concept 3 and delegated page-specific structure, colour emphasis, imagery, and composition. The buyer experience must feel like a polished native property-shopping app, not a desktop website compressed to a phone.

## Shared quality system

- Reference viewport: 390 × 844 CSS pixels; every route remains usable from 320px upward.
- Montserrat stays as the product typeface for this release, with compact mobile sizing, strong hierarchy, and readable body line-height.
- Warm white and pearl surfaces, graphite text, Mediterranean teal primary actions; sea blue, green, violet, coral, and dark emerald are page-specific accents.
- Use real or generated raster imagery and the installed icon library. Never replace visible imagery with CSS art, emoji, placeholder boxes, decorative glyphs, or inline SVG approximations.
- Primary touch targets are at least 44 × 44px. Drawers and success panels animate purposefully and respect `prefers-reduced-motion`.
- Shared tokens unify quality, typography, navigation, action hierarchy, motion, drawer behaviour, and semantic states. They do not force every route into the same hero, card, or section template.

## Different composition archetypes

| Archetype | Routes | Direction |
|---|---|---|
| Immersive travel | `/test-drive`, booking discovery | Full-bleed resort photography, translucent utilities, integrated white booking/action card |
| Dense commerce | auction, search, city catalogues | Compact app bar, chips and filters, two-column product grid, premium sold/ended ribbons |
| Curated collection | favorites | Wish-list hierarchy and sticky compare tray rather than a copy of search results |
| Photo-first decision | property and share details | Edge-to-edge gallery, white content sheet, proof blocks, persistent purchase/bid bar |
| Map-first | `/map` | Map canvas plus draggable results sheet; no marketing-page shell |
| Fintech marketplace | debts, co-investment | Risk/progress/return metrics lead; photography supports the financial decision |
| Decision cockpit | `/compare` | Swipeable comparison columns, winner highlights and sticky summary |
| Guided financial flow | `/calculator`, `/wallet` | Scenario wizard or balance/ledger surfaces with one recommended next action |
| Account and inbox | notifications, history, bookings, profile | Grouped lists, timelines, thumbnails, contextual next actions and guided states |
| Editorial campaigns | bonuses, private club, news, about, buyer pages | Page-specific art direction: rewards, premium, magazine, or brand storytelling |

## Test Drive selected target

1. Mobile `/test-drive` begins with a full-bleed Mediterranean pool/sea hero occupying most of the first viewport.
2. The desktop floating header is not shown on phones; compact translucent utility controls live over the image.
3. Copy: “Поживите здесь до покупки” and “Тест-драйв недвижимости · Коста-дель-Соль”.
4. An integrated white card titled “Ваш тест-драйв” shows destination, date range, trust cues, “Найти свободные объекты”, and access to current bookings.
5. The CTA scrolls to the catalogue and exposes functional search and filters.
6. The next section title is “Дома, в которых можно пожить”.
7. Phones show exactly two property cards per row, including 320px. Up to 16 render per page, followed by `ListingPagePagination` when needed.
8. Cards prioritise photography, favourite state, title/location, price, and rating. Secondary specifications remain legible without dominating.
9. Filters use the existing accessible mobile drawer; desktop retains the sidebar.
10. No duplicated headings, horizontal overflow, or text smaller than 11px.

## Guided business logic

- Every primary CTA has one clear destination or state transition.
- Purchase, booking, deposit, and application completion open a guided success drawer with confirmation, next steps, expected timing, and one primary action.
- Empty states explain why data is absent and offer a safe recovery action.
- Status, price, and availability never imply guarantees unsupported by backend data.
- Conversion prompts appear at decision points, not as generic promotional blocks everywhere.

## Acceptance

- Test Drive matches the selected concept composition at 390 × 844 and preserves two columns at 320px.
- No more than 16 cards render for the active catalogue page.
- Hero CTA, search, filter drawer, favourites, property opening, and pagination work.
- No page-level horizontal overflow at 320, 375, 390, or 430px.
- Focused tests and build pass; browser console has no new errors.
- Source concept and rendered screen are compared together; `design-qa.md` ends with `final result: passed` before handoff.


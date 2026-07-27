# SellYourBrick App-First Buyer Mobile Design System

## Intent

SellYourBrick on a phone must feel like a polished native property-shopping and investing application, not a desktop real-estate website squeezed into a narrow viewport. The experience is premium, persuasive and image-led, while every price, status and financial statement remains grounded in backend data.

This direction is approved for buyer-facing mobile pages. The selected Test Drive concept is the clearest reference implementation, but it is not a template to repeat blindly: each route uses the composition archetype best suited to the user decision.

## Reference interpretation

The supplied references consistently favor:

- full-bleed property or destination photography at the top of discovery/detail screens;
- compact translucent controls placed directly over photography;
- large, clean white or pearl sheets that overlap image areas;
- rounded product cards with excellent image crops, sparse metadata and clear prices;
- compact two-column shopping grids;
- map/list flows expressed as a map canvas with a draggable bottom results sheet;
- premium green/teal or blue accents on calm off-white surfaces;
- simple native-app navigation, generous radii, restrained shadows and very little visual noise;
- high-contrast primary actions placed exactly where the next decision happens;
- travel-app confidence and emotional imagery combined with real-estate proof and financial data.

Do not copy the references literally. Reuse their visual principles while preserving SellYourBrick content, truthful states and teal-led identity.

## Core principles

1. **Photo first, decision second.** Use a strong property, neighborhood or lifestyle image to establish desire; immediately follow it with the specific price, availability, return, risk or next action needed to decide.
2. **One primary action per decision state.** Secondary links can exist, but every viewport and every drawer must make the recommended next step unmistakable.
3. **Native-app density.** Phone screens are compact and information-rich without looking cramped: short copy, consistent alignment, 44px controls and deliberate white space.
4. **Different pages may look different.** Shared quality, tokens and interaction behavior create consistency. Hero shapes, card structures and accent colors may vary by route.
5. **No invented certainty.** Never fabricate ratings, reviews, scarcity, yields, winners, coordinates, deadlines or guarantees. Missing information gets a graceful “уточняется” state and a recovery action.
6. **Guidance is part of the design.** Booking, purchase, bid, deposit and application outcomes open a contextual drawer that confirms what happened, explains timing and gives one next step.
7. **Mobile first, resilient always.** Reference at 390 × 844; function cleanly at 320, 375, 390 and 430px without horizontal page overflow.

## Foundation

### Color

Use the implemented CSS variables as the source of truth:

- Primary teal: `--buyer-teal: #0099a9`
- Deep teal: `--buyer-teal-deep: #006f7b`
- Ink: `--buyer-ink: #050505`
- Warm canvas: `--buyer-warm: #faf8f5`
- Cloud surface: `--buyer-cloud: #f3f6f5`
- White surface: `--buyer-white: #ffffff`
- Soft mint: `--buyer-mint: #eaf8f5`
- Auction highlight: `--buyer-auction: #f4d63e`
- Success: `--buyer-success: #167568`
- Danger: `--buyer-danger: #c7473a`
- Muted text: `--buyer-text-muted: #66706e`

Page-specific accents are encouraged when they express the route:

- immersive Test Drive: sea cyan, Mediterranean turquoise and sunlight;
- auction: teal/graphite with controlled yellow live-auction signals;
- co-investment: deep emerald and mint with warm property photography;
- debts: graphite, burgundy/coral risk accents and calm neutral surfaces;
- comparison: restrained blue/teal highlights for decision evidence;
- wallet/deposit: dark emerald, mint and high-contrast white balance cards;
- bonuses: optimistic coral/yellow/teal campaign color;
- private club: deep emerald or midnight surfaces with warm metallic accents;
- editorial/news/about: image-led magazine palette derived from each story.

Never turn every screen into a gradient. Use a gradient only to improve legibility over a photograph or to create a specific premium campaign moment.

### Typography

- Display/product family: Montserrat.
- Compact body/data fallback: Inter, then system sans.
- Large campaign/hero title: 34–42px, 0.95–1.05 line-height, weight 700–800.
- Page title: 26–32px, 1.05–1.15, weight 700–800.
- Section title: 20–24px, 1.15–1.25, weight 700.
- Card title: 14–17px, 1.2–1.3, weight 650–750.
- Body: 14–16px, 1.45–1.65.
- Metadata: 12–13px; never below 11px.
- Financial numbers use tabular figures and remain visually dominant over labels.

Keep headings short. Do not center long paragraphs. Align related labels and values to a shared grid.

### Spacing, radius and elevation

- Page gutter: `--buyer-gutter`, normally 14–20px.
- Section gap: 24–36px.
- Compact internal card gap: 8–12px.
- Standard card radius: 18–26px.
- Full-width sheet radius: 30px at its exposed top edge.
- Primary control radius: 14–18px or pill only when the shape supports the content.
- Use soft teal/graphite shadows; avoid dark floating rectangles and stacked heavy shadows.
- Images integrate into cards with matching top radii and intentional crops. Never leave an image floating as an unrelated rectangle.

### Motion

- Fast feedback: 180ms.
- Drawer/content transition: 320ms.
- Easing: `cubic-bezier(0.22, 1, 0.36, 1)`.
- Motion communicates state: drawer entrance, successful action, favorite confirmation, card press or list/map transition.
- Respect `prefers-reduced-motion`; reduce transitions to effectively immediate.
- Avoid permanent pulsing, decorative bouncing or motion competing with listing content.

### Controls and accessibility

- Minimum target: 44 × 44px.
- Visible keyboard focus is mandatory.
- Use native buttons/links and accessible names; do not rely on icon shape alone.
- Maintain at least 4.5:1 text contrast for ordinary copy.
- Use `aria-live` for asynchronous success/error messages.
- Lock body scroll and trap/restore focus for modal drawers.
- Safe-area padding is mandatory for sticky bottom actions.

## Composition archetypes

### Immersive travel — Test Drive and booking discovery

- Full-bleed Mediterranean property/pool/sea photography fills most of the first viewport.
- Translucent menu/search/profile controls sit over the image.
- Headline: “Поживите здесь до покупки”.
- Supporting line: “Тест-драйв недвижимости · Коста-дель-Соль”.
- A compact white “Ваш тест-драйв” card overlaps the lower hero and contains destination, dates/trust cue and “Найти свободные объекты”.
- Below, “Дома, в которых можно пожить” starts a two-column grid.
- Do not duplicate the hero heading in the card.

### Dense commerce — Auction, search and city catalogues

- Compact app bar and search/filter controls.
- Useful chips stay horizontally scrollable within their own rail; the page itself never scrolls sideways.
- Exactly two property cards per row on phones, including 320px.
- Maximum 16 listings per page followed by accessible pagination.
- Card priority: image → state/favorite → title/location → price → one or two decisive specs.
- Sold, reserved or ended inventory receives a premium diagonal ribbon inspired by the supplied warning-tape reference, not a crude opaque banner.
- Keep live-auction color/state easy to scan without coating every card in yellow.

### Curated collection — Favorites

- Treat favorites as a private shortlist, not a duplicated search page.
- Emphasize saved collections, changed availability and comparison readiness.
- A sticky compare tray appears only when selection makes it useful.
- Empty state explains how to save a property and links to discovery.

### Photo-first decision — Property and co-investment details

- Edge-to-edge gallery with floating back/share/favorite controls.
- Main information sits in a rounded white sheet rising over the image.
- Show title/location/price first, then the proof required for the current format: bid state, buy-now terms, ownership share, forecast assumptions or availability.
- Persistent bottom action bar uses one dominant action and preserves the safe area.
- Long legal/technical content is grouped into disclosure sections; it does not compete with the first purchase decision.

### Map first — Map route

- The map is the canvas. Do not wrap it in a marketing header/hero.
- Results live in a draggable bottom sheet with collapsed, half and expanded states.
- Selecting a marker previews one compact card; opening the card reaches the canonical detail route.
- Never invent coordinates. Unknown locations are omitted or explicitly unresolved.

### Fintech marketplace — Debts and co-investment

- Lead with financial meaning: risk, return, progress, share price or debt amount.
- Photography supports trust but does not hide the numbers.
- Explain financial labels in plain Russian through contextual info drawers.
- Co-investment cards show forecast yield only when present, collection progress only from real totals and remaining shares only from backend values.
- Debt cards distinguish risk level from auction state and never imply guaranteed recovery.

### Decision cockpit — Compare

- Comparison columns are swipeable or horizontally contained; the page itself remains stable.
- Important metric rows stay aligned across selected properties.
- Highlight a leader only when the underlying metric is comparable and the rationale is visible.
- Sticky summary explains tradeoffs and lets the user open, replace or remove a property with unique accessible labels.
- AI analysis must cancel stale requests when selection changes and must be clearly marked as analysis, not objective truth.

### Guided finance — Smart Investor, wallet and deposit

- Smart Investor is a scenario wizard: goal → budget/horizon → assumptions → result → recommended property action.
- Wallet opens with a premium balance/deposit card, then a clear next action and transaction timeline.
- Zero deposit is a designed state with tasteful image/blur support, a plain explanation and one top-up action; do not simply disable purchase without telling the user why.
- Deposit success drawer states credited amount, what is now unlocked and where to continue.

### Account and inbox — Profile, bookings, history and notifications

- Use grouped lists, timelines, thumbnails and status chips.
- Every status includes its next meaningful action.
- Booking rows distinguish requested, confirmed, upcoming, checked-in, completed and cancelled states.
- Notifications are visually grouped by today/earlier and animate into place without distracting bounce.
- Empty/loading/error states preserve the app shell and give a safe recovery path.

### Editorial campaigns — Bonuses, private club, news, about and buyer pages

- Use route-specific campaign art direction.
- Bonuses can be bright and rewarding; private club dark and premium; news magazine-like; about narrative and image-led.
- Retain the same typography quality, action hierarchy and drawer behavior without forcing catalogue cards onto editorial pages.

## Catalogue card rules

- Phone grid: two columns at 320–430px.
- Up to 16 cards per active page.
- Recommended media aspect: 4:3 or slightly taller for commerce grids.
- Crop around the architecture; do not letterbox.
- One favorite control in the media corner; 44px hit area even when the visible icon is smaller.
- Primary title is two lines maximum; location is one or two compact lines.
- Price/financial value is the strongest text below the image.
- Use a ribbon for sold/ended/reserved states; visually suppress unavailable actions.
- No fake ratings, reviews, urgency, yields or “recommended” labels.
- Skeletons must match final card geometry to prevent layout jumps.

## Drawer and notification system

Use `BuyerSheetShell` for buyer mobile drawers whenever its interaction model fits.

### Required success drawer anatomy

1. Compact semantic illustration or check state.
2. Outcome title in plain language.
3. Specific confirmed value: object, booking slot, bid, amount or application.
4. Two or three “what happens next” steps with timing when known.
5. One primary action.
6. Optional secondary “later/close” action.

Use this pattern for:

- purchase completed;
- booking requested or confirmed;
- deposit credited;
- bid placed;
- investment application sent;
- favorite/compare onboarding where guidance is genuinely useful.

### Errors and blocked states

- Explain what failed and whether data/action is safe.
- Preserve user input when possible.
- Give a recovery action such as retry, choose another time, top up deposit or contact support.
- Never silently ignore guest actions; open an auth drawer/modal with return context.

### Toasts

- Toasts are for lightweight feedback, not multi-step guidance.
- Semantic icon, concise title, one short message and optional action.
- Pause on hover/focus, announce accessibly and animate in/out once.
- Escalate important purchase/booking/deposit outcomes to a drawer.

## Image direction

- Use real property photography or generated raster artwork when it materially strengthens desire or explanation.
- Preferred subjects: sunlit modern architecture, Mediterranean terraces/pools, authentic interiors, urban context and tasteful financial/editorial still lifes.
- Color-grade images to harmonize with the page accent; maintain natural materials and plausible architecture.
- Use dark-to-transparent overlays only where needed for text contrast.
- Decorative imagery belongs inside the composition: clipped into a hero, card, sheet or deliberate collage.
- Never substitute required imagery with emoji, CSS-drawn houses, placeholder blocks or decorative glyphs.
- Avoid stock-photo clichés with staged handshakes, floating coins or exaggerated luxury.

## Conversion and trust

- Place conversion prompts at decision points: after proof, at availability, after comparison or at a successful prerequisite.
- Clarify fees, deposit rules, forecast assumptions and booking timing before the final action.
- Show progress for multi-step flows.
- Preserve context across auth/deposit detours so the user returns to the property/action they chose.
- Confirmation always includes what the site did and what the user should do next.
- Use scarcity only when derived from real inventory/time data.

## Non-negotiable QA

- Visual comparison at 390 × 844 against the selected reference direction.
- Functional checks at 320, 375, 390 and 430px.
- No page-level horizontal overflow.
- No clipped text, overlapping sticky controls or content hidden below the home indicator.
- Hero/search/filter/favorite/open/pagination interactions work where present.
- Drawers trap focus, close correctly, restore focus and respect reduced motion.
- Focused tests and production build pass without new console errors.
- Source imagery and rendered implementation are reviewed together before design approval.

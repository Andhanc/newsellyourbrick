### Task 2: Generate and connect the new visual series

**Files:**
- Create: `public/images/home-sale-formats/sale-format-auction.webp`
- Create: `public/images/home-sale-formats/sale-format-buy-now.webp`
- Create: `public/images/home-sale-formats/sale-format-shares.webp`
- Create: `public/images/home-sale-formats/sale-format-debts.webp`
- Modify: `src/pages/MainPage.jsx`

**Interfaces:**
- Consumes: four 3:2 landscape image files at the paths above.
- Produces: `premiumModes` entries with `benefit`, `proof`, `imageAlt`, and the new `image` paths; `MainPage` renders `<HomeSaleFormats modes={premiumModes} />`.

- [ ] **Step 1: Extend the failing test for exact new asset paths and copy**

Add assertions that `MainPage.jsx` imports `HomeSaleFormats`, includes all four `/images/home-sale-formats/` paths, and includes the four approved benefit headlines.

- [ ] **Step 2: Run the test to verify the new assertions fail**

Run: `node --test src/components/HomeSaleFormats.layout.test.js`

Expected: FAIL because `MainPage.jsx` still renders the old block and old images.

- [ ] **Step 3: Generate and validate the four images**

Use built-in Image Gen with one shared art direction: cinematic editorial real-estate photography, warm natural light, deep teal and sand palette, no text, no logos, no watermark. Save each final selected image to its exact project path and inspect it for subject, crop, consistency, and accidental text.

- [ ] **Step 4: Connect the component and remove the old block markup**

Import `HomeSaleFormats` and its CSS, update the four mode records, replace only the existing `premium-models` section with `<HomeSaleFormats modes={premiumModes} />`, and preserve the hero rail and all destination routes. Update `HomeSaleFormats` so the selected reference is the visual truth: a horizontally scrollable rail of tall cards with tags and copy above an image occupying the lower half, a lime first card, neutral subsequent cards, circular functional previous/next buttons, and full-card links. At desktop width show approximately 3.4 cards; at mobile show approximately 1.1 cards.

- [ ] **Step 5: Run the tests and image verification**

Run: `node --test src/components/HomeSaleFormats.layout.test.js && npm run verify:images`

Expected: all layout tests pass and image verification exits 0.


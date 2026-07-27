# Real Test Drive Listings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/test-drive` render only real API listings while retaining the existing card design and decorative ratings.

**Architecture:** Move the pure API-record-to-card-data transformation into a small page-local module so it can be tested without rendering React. The page continues fetching the existing endpoint, enriches each real record with its normalized media and navigation metadata, and never creates demo records.

**Tech Stack:** React 19, Vite 5, JavaScript ES modules, Node.js built-in test runner.

## Global Constraints

- The only listing source is `GET /api/properties/test-drive`.
- Do not render demo objects for success, empty, or error responses.
- Preserve the current card markup, CSS, responsive grid, filters, sorting, favorites, pagination, and navigation.
- Real object fields must not be replaced; rating and review count may remain decorative.
- Preserve all existing unrelated uncommitted work.

---

### Task 1: Pure real-listing mapper

**Files:**
- Create: `src/pages/testDriveListingData.js`
- Create: `src/pages/testDriveListingData.test.js`

**Interfaces:**
- Consumes: a normalized property record, its zero-based API position, and `{ id, image }` derived by existing utilities.
- Produces: `mapRealTestDriveListing(property, index, media): TestDriveListing` and `realTestDriveListings(apiListings, mapListing): TestDriveListing[]`.

- [ ] **Step 1: Write failing mapper and collection tests**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { mapRealTestDriveListing, realTestDriveListings } from './testDriveListingData.js'

test('maps real property fields and test-drive daily price without demo substitutions', () => {
  const property = {
    id: 91,
    title: 'Casa Verde',
    location: 'Adeje, Tenerife',
    city: 'Adeje',
    property_type: 'villa',
    bedrooms: 4,
    bathrooms: 3,
    area: 240,
    price: 850000,
    test_drive_data: JSON.stringify({ price_per_day: 375 }),
  }

  const listing = mapRealTestDriveListing(property, 0, {
    id: 'houses:91',
    image: '/uploads/casa-verde.jpg',
  })

  assert.equal(listing.title, 'Casa Verde')
  assert.equal(listing.location, 'Adeje, Tenerife')
  assert.equal(listing.city, 'Adeje')
  assert.equal(listing.type, 'villa')
  assert.equal(listing.bedrooms, 4)
  assert.equal(listing.bathrooms, 3)
  assert.equal(listing.area, 240)
  assert.equal(listing.price, 375)
  assert.equal(listing.image, '/uploads/casa-verde.jpg')
  assert.equal(listing.originalProperty, property)
  assert.equal(listing.rating, 4.6)
  assert.equal(listing.reviews, 14)
})

test('returns only mapped API records and never pads with demo listings', () => {
  const mapped = realTestDriveListings([{ id: 1 }, { id: 2 }], (property) => ({ id: property.id }))
  assert.deepEqual(mapped, [{ id: 1 }, { id: 2 }])
  assert.deepEqual(realTestDriveListings([], () => ({ id: 'demo' })), [])
})
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `node --test src/pages/testDriveListingData.test.js`

Expected: FAIL because `testDriveListingData.js` does not exist.

- [ ] **Step 3: Implement the pure mapper**

```js
function parseTestDriveData(raw) {
  if (!raw) return {}
  if (typeof raw === 'object') return raw
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function mapRealTestDriveListing(property, index, { id, image }) {
  const testDriveData = parseTestDriveData(property.test_drive_data)
  return {
    ...property,
    id,
    image,
    title: property.title || property.name || '',
    location: property.location || property.address || '',
    city: property.city || property.location_city || '',
    type: property.type || property.property_type || '',
    bedrooms: property.bedrooms ?? property.rooms ?? property.beds ?? null,
    bathrooms: property.bathrooms ?? property.baths ?? null,
    area: property.area ?? property.sqft ?? property.living_area ?? null,
    price: Number(testDriveData.price_per_day ?? property.test_drive_price_per_day) || 0,
    rating: 4.6 + (index % 4) / 10,
    reviews: 14 + index,
    stayDays: 5,
    originalProperty: property,
  }
}

export function realTestDriveListings(apiListings, mapListing) {
  if (!Array.isArray(apiListings)) return []
  return apiListings.map(mapListing)
}
```

- [ ] **Step 4: Run the tests and verify GREEN**

Run: `node --test src/pages/testDriveListingData.test.js`

Expected: 2 tests pass.

---

### Task 2: Connect the page exclusively to real API listings

**Files:**
- Modify: `src/pages/TestDriveLandingPage.jsx`
- Test: `src/pages/testDriveListingData.test.js`

**Interfaces:**
- Consumes: `mapRealTestDriveListing(property, index, { id, image })` and `realTestDriveListings(apiListings, mapListing)` from Task 1.
- Produces: the existing `TestDriveLandingPage` UI backed only by the API response.

- [ ] **Step 1: Add a failing source regression test**

Append the test below to `src/pages/testDriveListingData.test.js` (the `readFile` import is already added at the top in Task 1):

```js
test('test-drive page does not declare or render generated demo listings', async () => {
  const pageSource = await readFile(new URL('./TestDriveLandingPage.jsx', import.meta.url), 'utf8')
  assert.doesNotMatch(pageSource, /GENERATED_LISTINGS|BASE_LISTINGS|CARD_IMAGES/)
  assert.match(pageSource, /realTestDriveListings\(apiListings/)
})
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `node --test src/pages/testDriveListingData.test.js`

Expected: the source regression test fails because the page still declares demo listing constants.

- [ ] **Step 3: Remove demo constants and map only real records**

In `src/pages/TestDriveLandingPage.jsx`:

```js
import { mapRealTestDriveListing, realTestDriveListings } from './testDriveListingData'

function mapApiPropertyToListing(property, index) {
  const image = getPropertyCardImage(property) || ''
  const formatted = formatPropertyForListingCard({
    ...property,
    image,
    images: image ? [image] : [],
    title: property.title || property.name || '',
  })

  return mapRealTestDriveListing(formatted, index, {
    id: auctionListingDedupeKey(formatted),
    image,
  })
}
```

Replace the padded `useMemo` with:

```js
const listings = useMemo(
  () => realTestDriveListings(apiListings, (property, index) => mapApiPropertyToListing(property, index)),
  [apiListings],
)
```

Initialize favorites without demo identifiers:

```js
const [favorites, setFavorites] = useState(() => new Set())
```

Delete `CARD_IMAGES`, `BASE_LISTINGS`, and `GENERATED_LISTINGS`. Keep the hero image and all existing card markup/CSS unchanged.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `node --test src/pages/testDriveListingData.test.js`

Expected: 3 tests pass.

- [ ] **Step 5: Build the application**

Run: `npm run build`

Expected: Vite build exits with code 0.

- [ ] **Step 6: Review the scoped diff**

Run: `git diff --check && git diff -- src/pages/TestDriveLandingPage.jsx src/pages/testDriveListingData.js src/pages/testDriveListingData.test.js`

Expected: no whitespace errors; the diff removes only demo data behavior and adds the tested mapper integration while preserving the pre-existing card styling changes.

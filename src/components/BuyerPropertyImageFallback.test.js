import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const projectRoot = path.resolve(import.meta.dirname, '../..')
const read = (relativePath) => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8')

test('buyer property cards share a local neutral image fallback', async () => {
  const propertyImageSource = read('src/utils/propertyImage.js')
  const listingCardSource = read('src/components/PropertyListingCard.jsx')
  const auctionCardSource = read('src/components/AuctionPropertyCard.jsx')
  const debtsCardSource = read('src/components/DebtsPropertyCard.jsx')

  assert.match(propertyImageSource, /export const PROPERTY_CARD_IMAGE_FALLBACK/)
  assert.match(listingCardSource, /fallbackSrc=\{PROPERTY_CARD_IMAGE_FALLBACK\}/)
  assert.match(auctionCardSource, /fallbackSrc=\{PROPERTY_CARD_IMAGE_FALLBACK\}/)
  assert.match(debtsCardSource, /fallbackSrc=\{PROPERTY_CARD_IMAGE_FALLBACK\}/)

  const { PROPERTY_CARD_IMAGE_FALLBACK } = await import('../utils/propertyImage.js')
  const publicPath = PROPERTY_CARD_IMAGE_FALLBACK.replace(/^\//, 'public/')
  assert.equal(fs.existsSync(path.join(projectRoot, publicPath)), true)
})

test('ImageWithSkeleton swaps a failed remote source for its fallback', () => {
  const source = read('src/components/ImageWithSkeleton.jsx')

  assert.match(source, /fallbackSrc/)
  assert.match(source, /setIsFallbackActive\(true\)/)
  assert.match(source, /srcSet:\s*undefined/)
  assert.match(source, /sizes:\s*undefined/)
})

test('buyer cards no longer use the stale external stock fallback', () => {
  for (const file of [
    'src/components/PropertyListingCard.jsx',
    'src/components/AuctionPropertyCard.jsx',
    'src/components/DebtsPropertyCard.jsx',
  ]) {
    assert.doesNotMatch(read(file), /photo-1560448204-e02f11c3d0e2/)
  }
})

test('city hero and map preview recover from failed API media', () => {
  const propertyImageSource = read('src/utils/propertyImage.js')
  const citySource = read('src/pages/CatalogCityPage.jsx')
  const mapSource = read('src/pages/MapPage.jsx')

  assert.match(propertyImageSource, /export function applyPropertyImageFallback/)
  assert.match(citySource, /onError=\{applyPropertyImageFallback\}/)
  assert.match(mapSource, /onError=\{applyPropertyImageFallback\}/)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const pairs = [
  'PropertyDetailBuyNowPromo.jsx',
  'PropertyDetailBuyNowPromo.css',
  'PropertyDetailTestDrivePromo.jsx',
  'PropertyDetailTestDriveActionPromo.css',
  'TestDriveSection.jsx',
]

test('property action promos stay focused and retain legacy parity', async () => {
  for (const file of pairs) {
    const web = await readFile(new URL(file, import.meta.url), 'utf8')
    const legacy = await readFile(
      new URL(`../../apps/client/src/legacy/components/${file}`, import.meta.url),
      'utf8',
    )
    assert.equal(legacy, web, `${file} legacy mirror differs`)
  }

  const buyNow = await readFile(new URL('./PropertyDetailBuyNowPromo.jsx', import.meta.url), 'utf8')
  const buyNowStyles = await readFile(
    new URL('./PropertyDetailBuyNowPromo.css', import.meta.url),
    'utf8',
  )
  const page = await readFile(new URL('../pages/PropertyDetailClassic.jsx', import.meta.url), 'utf8')

  assert.match(buyNow, /property-detail-buy-now-promo__title/)
  assert.match(buyNow, /propertyDetailBuyNowPromoTitle/)
  assert.match(buyNow, /property-detail-buy-now-promo__lead/)
  assert.match(buyNow, /property-detail-buy-now-promo__cta/)
  assert.doesNotMatch(buyNow, /property-detail-buy-now-promo__action/)
  assert.match(buyNowStyles, /radial-gradient\(circle at 82% 12%/)
  assert.match(buyNowStyles, /linear-gradient\(135deg, #d8f7f3/)
  assert.match(buyNowStyles, /min-height:\s*168px/)
  assert.match(page, /onOpen=\{\(\) => setAuctionMobileTab\('buy_now'\)\}/)

  const detailsIndex = page.indexOf("renderPropertyAdditionalDetailsBlock({ layout: 'mobile-about' })")
  const promoIndex = page.indexOf('<PropertyDetailBuyNowPromo', detailsIndex)
  const amenitiesIndex = page.indexOf(
    "renderPropertyAmenitiesBlock({ layout: 'mobile-about' })",
    detailsIndex,
  )
  assert.ok(detailsIndex < promoIndex, 'Buy Now promo must follow detailed information')
  assert.ok(promoIndex < amenitiesIndex, 'Buy Now promo must precede amenities')

  const testDrive = await readFile(
    new URL('./PropertyDetailTestDrivePromo.jsx', import.meta.url),
    'utf8',
  )
  const testDriveStyles = await readFile(
    new URL('./PropertyDetailTestDriveActionPromo.css', import.meta.url),
    'utf8',
  )
  assert.match(testDrive, /property-detail-test-drive-promo__title/)
  assert.match(testDrive, /property-detail-test-drive-promo__lead/)
  assert.match(testDrive, /<TestDriveSection/)
  assert.doesNotMatch(testDrive, /FiClock|FiHome|property-detail-test-drive-promo__feature/)
  assert.match(testDriveStyles, /radial-gradient\(circle at 10% 8%/)
  assert.match(testDriveStyles, /linear-gradient\(135deg, #e3f1ff/)
  assert.match(testDriveStyles, /\.property-detail-mobile-test-drive\s*\{[^}]*width:\s*100%/s)
  assert.match(testDriveStyles, /min-width:\s*168px/)
  assert.match(testDriveStyles, /min-height:\s*182px/)
})

test('generated promo images are valid non-empty WebP assets', async () => {
  for (const name of ['buy-now-action-3d.webp', 'test-drive-action-3d.webp']) {
    const image = await readFile(
      new URL(`../../public/images/property-detail/${name}`, import.meta.url),
    )
    assert.equal(image.subarray(0, 4).toString('ascii'), 'RIFF')
    assert.equal(image.subarray(8, 12).toString('ascii'), 'WEBP')
    assert.ok(image.length > 50_000)
  }
})

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
  const pageStyles = await readFile(
    new URL('../pages/PropertyDetailClassic.css', import.meta.url),
    'utf8',
  )

  assert.match(buyNow, /property-detail-buy-now-promo__title/)
  assert.match(buyNow, /propertyDetailBuyNowPromoTitle/)
  assert.match(buyNow, /property-detail-buy-now-promo__lead/)
  assert.match(buyNow, /property-detail-buy-now-promo__cta/)
  assert.match(buyNow, /propertyDetailBuyNowPay/)
  assert.match(buyNow, /priceLabel/)
  assert.match(buyNow, /buy-now-action-3d\.webp/)
  assert.doesNotMatch(buyNow, /property-detail-buy-now-promo__action/)
  assert.match(buyNowStyles, /radial-gradient\(circle at 82% 12%/)
  assert.match(buyNowStyles, /linear-gradient\(135deg, #d8f7f3/)
  assert.match(buyNowStyles, /min-height:\s*168px/)
  assert.match(page, /onOpen=\{\(\) => setAuctionMobileTab\('buy_now'\)\}/)
  assert.match(page, /priceLabel=\{buyNowPromoPriceLabel\}/)
  assert.match(page, /property-detail-mobile-badge--live/)
  assert.match(page, /auction-live-badge-3d\.png/)
  assert.match(page, /property-detail-mobile-badge__label/)
  assert.doesNotMatch(page, /property-detail-mobile-badge__cta/)
  assert.match(pageStyles, /property-detail-auction-live-sheen/)
  assert.match(pageStyles, /--syb-tiffany-btn-fill/)

  const descriptionIndex = page.indexOf(
    '<section className="property-detail-mobile-description">',
  )
  const promoIndex = page.indexOf('<PropertyDetailBuyNowPromo', descriptionIndex)
  const detailsIndex = page.indexOf(
    "renderPropertyMainDetailsBlock({ layout: 'mobile-about' })",
    descriptionIndex,
  )
  const amenitiesIndex = page.indexOf(
    "renderPropertyAmenitiesBlock({ layout: 'mobile-about' })",
    detailsIndex,
  )
  assert.ok(descriptionIndex < promoIndex, 'Buy Now promo must follow the description')
  assert.ok(promoIndex < detailsIndex, 'Buy Now promo must precede main details')
  assert.ok(detailsIndex < amenitiesIndex, 'Main details must precede amenities')

  const desktopIntroIndex = page.indexOf('<section className="pdx-intro">')
  const desktopPromoIndex = page.indexOf('<PropertyDetailBuyNowPromo', desktopIntroIndex)
  const desktopStatsIndex = page.indexOf('pageStats.length', desktopPromoIndex)
  assert.ok(desktopIntroIndex < desktopPromoIndex, 'Desktop Buy Now promo must follow the intro')
  assert.ok(desktopPromoIndex < desktopStatsIndex, 'Desktop Buy Now promo must precede stats')

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

  const badge = await readFile(
    new URL('../../public/images/property-detail/auction-live-badge-3d.png', import.meta.url),
  )
  const legacyBadge = await readFile(
    new URL(
      '../../apps/client/public/images/property-detail/auction-live-badge-3d.png',
      import.meta.url,
    ),
  )
  assert.equal(badge.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
  assert.deepEqual(badge, legacyBadge)
  assert.ok(badge.length > 50_000)
})

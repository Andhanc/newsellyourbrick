import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const WEB_ILLUSTRATION = new URL('./TestDrivePromoIllustration.jsx', import.meta.url)
const WEB_DRAWER = new URL('./TestDrivePromoDrawer.jsx', import.meta.url)
const LEGACY_ILLUSTRATION = new URL(
  '../../apps/client/src/legacy/components/TestDrivePromoIllustration.jsx',
  import.meta.url,
)
const LEGACY_DRAWER = new URL(
  '../../apps/client/src/legacy/components/TestDrivePromoDrawer.jsx',
  import.meta.url,
)
const WEB_STYLES = new URL('./TestDrivePromoDrawer.css', import.meta.url)
const LEGACY_STYLES = new URL(
  '../../apps/client/src/legacy/components/TestDrivePromoDrawer.css',
  import.meta.url,
)
const PALM_ASSET = new URL(
  '../../public/images/property-detail/test-drive-palm-tiffany-3d.png',
  import.meta.url,
)
const LEGACY_PALM_ASSET = new URL(
  '../../apps/client/public/images/property-detail/test-drive-palm-tiffany-3d.png',
  import.meta.url,
)

test('test-drive promo uses a polished white Tiffany composition and keeps legacy parity', async () => {
  const [drawer, legacyDrawer, illustration, legacyIllustration, styles, legacyStyles, asset, legacyAsset] =
    await Promise.all([
      readFile(WEB_DRAWER, 'utf8'),
      readFile(LEGACY_DRAWER, 'utf8'),
      readFile(WEB_ILLUSTRATION, 'utf8'),
      readFile(LEGACY_ILLUSTRATION, 'utf8'),
      readFile(WEB_STYLES, 'utf8'),
      readFile(LEGACY_STYLES, 'utf8'),
      readFile(PALM_ASSET),
      readFile(LEGACY_PALM_ASSET),
    ])

  assert.match(illustration, /test-drive-palm-tiffany-3d\.png/)
  assert.match(illustration, /<img/)
  assert.doesNotMatch(illustration, /<svg/)
  assert.match(drawer, /test-drive-promo-drawer__hero/)
  assert.match(drawer, /test-drive-promo-drawer__cta-icon/)
  assert.doesNotMatch(drawer, /Calendar|test-drive-promo-drawer__badge/)
  assert.match(styles, /background:\s*#ffffff/)
  assert.match(styles, /\.test-drive-promo-drawer__hero::before/)
  assert.deepEqual([...asset.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10])
  assert.ok(asset.length > 50_000)
  assert.equal(drawer, legacyDrawer)
  assert.equal(illustration, legacyIllustration)
  assert.equal(styles, legacyStyles)
  assert.deepEqual(asset, legacyAsset)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const WEB_MODAL = new URL('./TestDrivePromoModal.jsx', import.meta.url)
const LEGACY_MODAL = new URL(
  '../../apps/client/src/legacy/components/TestDrivePromoModal.jsx',
  import.meta.url,
)
const WEB_STYLES = new URL('./TestDrivePromoModal.css', import.meta.url)
const LEGACY_STYLES = new URL(
  '../../apps/client/src/legacy/components/TestDrivePromoModal.css',
  import.meta.url,
)
const SCENE_ASSET = new URL(
  '../../public/images/property-detail/test-drive-palm-lounger-3d.webp',
  import.meta.url,
)
const LEGACY_SCENE_ASSET = new URL(
  '../../apps/client/public/images/property-detail/test-drive-palm-lounger-3d.webp',
  import.meta.url,
)

test('test-drive promo uses the new centered modal and keeps legacy parity', async () => {
  const [modal, legacyModal, styles, legacyStyles, asset, legacyAsset] =
    await Promise.all([
      readFile(WEB_MODAL, 'utf8'),
      readFile(LEGACY_MODAL, 'utf8'),
      readFile(WEB_STYLES, 'utf8'),
      readFile(LEGACY_STYLES, 'utf8'),
      readFile(SCENE_ASSET),
      readFile(LEGACY_SCENE_ASSET),
    ])

  assert.match(modal, /test-drive-palm-lounger-3d\.webp/)
  assert.match(modal, /role="dialog"/)
  assert.match(modal, /test-drive-promo-modal__hero/)
  assert.match(modal, /test-drive-promo-modal__close/)
  assert.match(modal, /onClick=\{goToSection\}/)
  assert.match(styles, /place-items:\s*center/)
  assert.match(styles, /\.test-drive-promo-modal__illustration/)
  assert.equal(asset.subarray(0, 4).toString('ascii'), 'RIFF')
  assert.equal(asset.subarray(8, 12).toString('ascii'), 'WEBP')
  assert.ok(asset.length > 50_000)
  assert.equal(modal, legacyModal)
  assert.equal(styles, legacyStyles)
  assert.deepEqual(asset, legacyAsset)
})

test('property page waits five seconds from entry before showing the modal', async () => {
  const page = await readFile(new URL('../pages/PropertyDetailClassic.jsx', import.meta.url), 'utf8')
  const legacyPage = await readFile(
    new URL('../../apps/client/src/legacy/pages/PropertyDetailClassic.jsx', import.meta.url),
    'utf8',
  )

  assert.match(page, /5000 - \(Date\.now\(\) - testDrivePromoEnteredAtRef\.current\)/)
  assert.match(page, /querySelectorAll\('\[id="property-test-drive-section"\]'\)/)
  assert.match(page, /element\.getClientRects\(\)\.length > 0/)
  assert.match(page, /<TestDrivePromoModal/)
  assert.equal(page, legacyPage)
})

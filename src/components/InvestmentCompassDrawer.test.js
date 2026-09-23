import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const WEB_DRAWER = new URL('./InvestmentCompassDrawer.jsx', import.meta.url)
const WEB_STYLES = new URL('./InvestmentCompassDrawer.css', import.meta.url)
const LEGACY_DRAWER = new URL(
  '../../apps/client/src/legacy/components/InvestmentCompassDrawer.jsx',
  import.meta.url,
)
const LEGACY_STYLES = new URL(
  '../../apps/client/src/legacy/components/InvestmentCompassDrawer.css',
  import.meta.url,
)
const WEB_ICON = new URL(
  '../../public/images/home-sale-formats/icons/compass-3d.png',
  import.meta.url,
)
const LEGACY_ICON = new URL(
  '../../apps/client/public/images/home-sale-formats/icons/compass-3d.png',
  import.meta.url,
)

test('investment compass drawer uses the generated 3D icon and keeps legacy parity', async () => {
  const [drawer, legacyDrawer, styles, legacyStyles, icon, legacyIcon] = await Promise.all([
    readFile(WEB_DRAWER, 'utf8'),
    readFile(LEGACY_DRAWER, 'utf8'),
    readFile(WEB_STYLES, 'utf8'),
    readFile(LEGACY_STYLES, 'utf8'),
    readFile(WEB_ICON),
    readFile(LEGACY_ICON),
  ])

  assert.match(drawer, /COMPASS_ICON_SRC/)
  assert.match(drawer, /investment-compass-drawer__hero/)
  assert.match(drawer, /BuyerSheetShell/)
  assert.match(drawer, /compass_drawerCta/)
  assert.match(drawer, /InvestmentCompassPrice/)
  assert.match(styles, /investment-compass-drawer__icon/)
  assert.deepEqual([...icon.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10])
  assert.ok(icon.length > 40_000)
  assert.equal(drawer, legacyDrawer)
  assert.equal(styles, legacyStyles)
  assert.deepEqual(icon, legacyIcon)
})

test('automatic compass offer is a centered modal with the same artwork and price in both clients', async () => {
  for (const file of [
    'InvestmentCompassPromoModal.jsx',
    'InvestmentCompassPromoModal.css',
    'InvestmentCompassPrice.jsx',
    'InvestmentCompassPrice.css',
  ]) {
    const web = await readFile(new URL(file, import.meta.url), 'utf8')
    const legacy = await readFile(
      new URL(`../../apps/client/src/legacy/components/${file}`, import.meta.url),
      'utf8',
    )
    assert.equal(web, legacy, `${file} legacy mirror differs`)
  }

  const modal = await readFile(new URL('./InvestmentCompassPromoModal.jsx', import.meta.url), 'utf8')
  const price = await readFile(new URL('./InvestmentCompassPrice.jsx', import.meta.url), 'utf8')
  const priceStyles = await readFile(new URL('./InvestmentCompassPrice.css', import.meta.url), 'utf8')
  assert.match(modal, /COMPASS_BANNER_SRC/)
  assert.match(modal, /role="dialog"/)
  assert.match(modal, /investment-compass-promo-modal__close/)
  assert.match(modal, /InvestmentCompassPrice/)
  assert.match(price, /<del[^>]*>199 €<\/del>/)
  assert.match(price, /<span[^>]*>0 €<\/span>/)
  assert.match(priceStyles, /text-decoration:\s*line-through/)
})

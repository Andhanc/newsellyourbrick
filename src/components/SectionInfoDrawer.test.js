import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const component = await readFile(new URL('./SectionInfoDrawer.jsx', import.meta.url), 'utf8')
const styles = await readFile(new URL('./SectionInfoDrawer.css', import.meta.url), 'utf8')
const header = await readFile(new URL('./Header.jsx', import.meta.url), 'utf8')
const hero = await readFile(new URL('./Hero.jsx', import.meta.url), 'utf8')
const shares = await readFile(new URL('../pages/Shares.jsx', import.meta.url), 'utf8')
const debts = await readFile(new URL('../pages/Debts.jsx', import.meta.url), 'utf8')
const testDrive = await readFile(new URL('../pages/TestDriveLandingPage.jsx', import.meta.url), 'utf8')
const sharesMobileStyles = await readFile(new URL('../pages/CoInvestment.mobile.css', import.meta.url), 'utf8')
const auctionStyles = await readFile(new URL('./Hero.css', import.meta.url), 'utf8')
const testDriveStyles = await readFile(new URL('../pages/TestDriveLandingPage.css', import.meta.url), 'utf8')

test('section explainer reuses the generated 3D category icon family', () => {
  assert.match(component, /home-sale-formats\/icons\/auction-3d\.png/)
  assert.match(component, /home-sale-formats\/icons\/shares-3d\.png/)
  assert.match(component, /home-sale-formats\/icons\/debts-3d\.png/)
  assert.match(component, /home-sale-formats\/icons\/test-drive-3d\.png/)
  assert.match(component, /<img src=\{config\.iconSrc\} alt=""/)
})

test('mobile explainer exposes a real drag handle wired to sheet dismissal', () => {
  assert.match(component, /useBottomSheetDrag/)
  assert.match(component, /sheetHandleDragProps\(sheetDrag\)/)
  assert.match(component, /data-sheet-drag-zone/)
  assert.match(component, /applyVisual: isMobileSheet/)
  assert.match(styles, /\.section-info-panel__handle\s*\{[\s\S]*?touch-action:\s*none/)
  assert.match(styles, /\.section-info-panel--dragging/)
})

test('section explainer trigger is monochrome and lives beside each section heading', () => {
  assert.doesNotMatch(header, /OwnerSupportButton className="new-header__support-btn"/)
  assert.match(hero, /<SectionInfoDrawer section="auction" placement="heading" \/>/)
  assert.match(shares, /<SectionInfoDrawer section="shares" placement="heading" \/>/)
  assert.match(debts, /<SectionInfoDrawer section="debts" placement="heading" \/>/)
  assert.match(testDrive, /<SectionInfoDrawer section="testDrive" placement="heading" \/>/)
  assert.match(styles, /\.section-info-trigger--heading\s*\{[\s\S]*?position:\s*relative[\s\S]*?background:\s*#ffffff[\s\S]*?color:\s*#111111/)
  assert.match(styles, /\.section-info-trigger--heading \.section-info-trigger__halo\s*\{[\s\S]*?display:\s*none/)
})

test('section headings stay short and every explainer uses the Tiffany theme', () => {
  assert.match(hero, /<h1 className="hero-auction-mobile__title">\{t\('auction'\)\}<\/h1>/)
  assert.match(hero, /<h1 className="hero-auction-header__title">\{t\('auction'\)\}<\/h1>/)
  assert.match(shares, /\{t\('shares'\)\}/)
  assert.match(debts, /\{t\('debtsTitle'\)\}/)
  assert.equal(testDrive.match(/<h1>\{t\('testDrive'\)\}<\/h1>/g)?.length, 2)
  assert.match(component, /const TIFFANY_THEME = \{[\s\S]*?accent:\s*'#16a7b3'[\s\S]*?accentRgb:\s*'22, 167, 179'/)
  assert.equal(component.match(/\.\.\.TIFFANY_THEME/g)?.length, 4)
  assert.doesNotMatch(component, /#c99a45|#d47755|#2b9b78/)
})

test('shares mobile hero copy is lifted above the scroll control', () => {
  assert.match(
    sharesMobileStyles,
    /@media \(max-width: 768px\)[\s\S]*?\.shares-hero-scene__copy\s*\{[\s\S]*?margin-bottom:\s*1\.25rem/,
  )
})

test('auction mobile hero copy is lifted by the same amount as shares', () => {
  assert.match(
    auctionStyles,
    /@media \(max-width: 768px\)[\s\S]*?\.hero-auction-mobile__copy\s*\{[\s\S]*?margin-bottom:\s*1\.25rem/,
  )
})

test('test-drive mobile heading uses the shared 18px page edge', () => {
  assert.match(
    testDriveStyles,
    /@media \(max-width: 640px\)[\s\S]*?\.test-drive-hero__content\s*\{[\s\S]*?calc\(var\(--test-drive-header-offset\) \+ 6px\)\s*18px\s*72px/,
  )
  assert.match(
    testDriveStyles,
    /@media \(max-width: 374px\)[\s\S]*?\.test-drive-hero__content\s*\{[\s\S]*?padding-right:\s*18px;[\s\S]*?padding-left:\s*18px/,
  )
})

test('generated test-drive icon is persisted as a transparent PNG asset', async () => {
  const icon = await readFile(
    new URL('../../public/images/home-sale-formats/icons/test-drive-3d.png', import.meta.url),
  )
  assert.ok(icon.length > 100_000)
  assert.deepEqual([...icon.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10])
  assert.equal(icon.readUInt8(25), 6, 'PNG color type 6 means RGBA')
})

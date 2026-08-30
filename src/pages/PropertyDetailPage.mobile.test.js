import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('./PropertyDetailPage.jsx', import.meta.url), 'utf8')
const css = await readFile(new URL('./PropertyDetailPage.css', import.meta.url), 'utf8').catch(() => '')
const classicSource = await readFile(new URL('./PropertyDetailClassic.jsx', import.meta.url), 'utf8')
const classicCss = await readFile(new URL('./PropertyDetailClassic.css', import.meta.url), 'utf8')

test('property detail exposes a development-only buyer preview for visual QA', () => {
  assert.match(source, /import\.meta\.env\.DEV/)
  assert.match(source, /buyer_detail_preview/)
  assert.match(source, /buildBuyerDetailPreview/)
})

test('property load failure gives the buyer a guided recovery path', () => {
  assert.match(source, /BuyerEmptyState/)
  assert.match(source, /Вернуться к объектам/)
  assert.match(source, /Все направления/)
  assert.match(source, /navigate\('\/auction'\)/)
  assert.match(css, /\.property-detail-recovery__main/)
})

test('public property details do not force authentication before the buyer sees the offer', () => {
  assert.match(source, /requireAuthOnLoad=\{false\}/)
})

test('mobile property detail starts with media and the purchase offer before specifications', () => {
  assert.match(classicSource, /property-detail-about-section/)
  assert.match(classicCss, /@media \(max-width: 960px\)[\s\S]*\.property-detail-about-section\s*\{[^}]*order:\s*3/)
})

test('guest buyer can express purchase intent before authentication', () => {
  const buttonStart = classicSource.lastIndexOf('className={`property-detail-sidebar__buy-now-btn')
  const buttonEnd = classicSource.indexOf('</button>', buttonStart)
  const button = buttonStart >= 0 && buttonEnd > buttonStart
    ? classicSource.slice(buttonStart, buttonEnd)
    : ''

  assert.ok(button)
  assert.match(button, /onClick=\{handleBookNow\}/)
  assert.match(button, /disabled=\{isReservedActive\}/)
  assert.doesNotMatch(button, /!buyNowEmailOk/)
  assert.match(
    classicSource,
    /if \(!isClerkAuth && !isOldAuth\) \{[\s\S]*?if \(onRequireLogin\)[\s\S]*?onRequireLogin\(\)/,
  )
})

test('mobile documents and location use one combined access gate', () => {
  const documentsStart = classicSource.indexOf('const renderMobileAboutDocumentsContent')
  const restrictedStart = classicSource.indexOf('const renderMobileAboutRestrictedContent')
  const documentsBlock = classicSource.slice(documentsStart, restrictedStart)
  const restrictedEnd = classicSource.indexOf('const renderMobileAboutPropertyContent', restrictedStart)
  const restrictedBlock = classicSource.slice(restrictedStart, restrictedEnd)

  assert.ok(documentsStart >= 0 && restrictedStart > documentsStart)
  assert.doesNotMatch(documentsBlock, /<SubscriptionLock/)
  assert.match(restrictedBlock, /requiresDeposit: true/)
  assert.match(restrictedBlock, /requiresVip: processedDocuments\.length > 0/)
  assert.match(classicSource, /requiresDeposit && aboutDepositContentLocked[\s\S]*?'deposit'/)
  assert.match(classicSource, /requiresVip && docsLocked[\s\S]*?'subscription'/)
})

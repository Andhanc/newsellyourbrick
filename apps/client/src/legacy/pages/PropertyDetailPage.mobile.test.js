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

test('mobile auction puts the timer first and moves badges below the address', () => {
  const headStart = classicSource.indexOf('<div className="property-detail-mobile-sheet__head">')
  const headEnd = classicSource.indexOf('{renderAuctionContentTabs()}', headStart)
  const head = classicSource.slice(headStart, headEnd)

  assert.ok(headStart >= 0 && headEnd > headStart)
  const timerIndex = head.indexOf('property-detail-mobile-head__timer')
  const titleIndex = head.indexOf('property-detail-mobile-sheet__title')
  const addressIndex = head.indexOf('property-detail-mobile-sheet__address')
  const badgesIndex = head.indexOf('property-detail-mobile-sheet__badge-row')

  assert.ok(timerIndex < titleIndex)
  assert.ok(titleIndex < addressIndex)
  assert.ok(addressIndex < badgesIndex)
  assert.match(head, /renderAuctionTimerVisual\(\)/)
})

test('full-screen auction photos retain the mobile bid menu', () => {
  const lightboxStart = classicSource.indexOf('const renderGalleryLightbox')
  const lightboxEnd = classicSource.indexOf('const renderMobileBidsTab', lightboxStart)
  const lightbox = classicSource.slice(lightboxStart, lightboxEnd)

  assert.match(lightbox, /showAuctionBidBar = isAuctionProperty && !isVideo/)
  assert.match(lightbox, /property-detail-mobile-bottom-bar--lightbox/)
  assert.match(lightbox, /closeGalleryLightbox\(\)[\s\S]*tryOpenBidDrawer\(\)/)
  assert.match(classicCss, /property-detail-desktop-gallery-lightbox__panel--with-bid-bar/)
})

test('successful and outbid auction events use distinct haptic feedback', () => {
  assert.match(classicSource, /triggerAuctionBidHaptic\('placed'\)/)
  assert.match(classicSource, /triggerAuctionBidHaptic\('outbid'\)/)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const css = await readFile(new URL('./PrivateClub.css', import.meta.url), 'utf8')
const page = await readFile(new URL('./PrivateClub.jsx', import.meta.url), 'utf8')
const mobile = css.slice(css.indexOf('@media (max-width: 560px)'))

test('keeps compact VIP card groups readable on phones', () => {
  assert.match(
    mobile,
    /\.vip-club-benefits\s*\{[\s\S]*?display:\s*flex[\s\S]*?overflow-x:\s*auto[\s\S]*?scroll-snap-type:\s*x mandatory/,
  )
  assert.match(mobile, /\.vip-club-benefit\s*\{[\s\S]*?flex:\s*0 0 min\(80vw,\s*300px\)/)
  assert.match(
    mobile,
    /\.vip-club-info-cards__grid\s*\{[\s\S]*?display:\s*grid[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/,
  )
  assert.match(mobile, /\.vip-club-info-cards__grid\s*\{[\s\S]*?overflow:\s*visible/)
  assert.doesNotMatch(
    mobile,
    /\.vip-club-info-cards__grid\s*\{[\s\S]*?overflow-x:\s*auto[\s\S]*?\}/,
  )
  assert.match(mobile, /\.vip-club-story-card\s*\{[\s\S]*?flex:\s*0 0 min\(82vw,\s*320px\)/)
})

test('preserves readable mobile type and safe header spacing', () => {
  assert.match(
    mobile,
    /\.vip-club-fold\s*\{[\s\S]*?padding-top:\s*calc\(var\(--vip-header-h\) \+ 10px\)/,
  )
  assert.match(mobile, /\.vip-club-benefit p\s*\{[\s\S]*?font-size:\s*13px/)
  assert.match(mobile, /\.vip-club-info-card__copy p\s*\{[\s\S]*?font-size:\s*14px/)
  assert.match(mobile, /\.vip-club-story-card__body p\s*\{[\s\S]*?font-size:\s*13px/)
  assert.match(mobile, /\.vip-club-section-head h2 span\s*\{[\s\S]*?white-space:\s*normal/)
})

test('uses compact balanced hero copy instead of a forced text staircase', () => {
  assert.match(
    page,
    /t\('privateClubLanding_heroTitle1'\)[\s\S]*?t\('privateClubLanding_heroTitle2'\)/,
  )
  assert.match(page, /t\('privateClubLanding_heroLead'\)/)
  assert.match(
    mobile,
    /\.vip-club-hero h1 span\s*\{[\s\S]*?display:\s*inline[\s\S]*?white-space:\s*normal/,
  )
  assert.match(mobile, /\.vip-club-hero h1\s*\{[\s\S]*?text-wrap:\s*balance/)
})

test('places one centered hero action below the image', () => {
  assert.doesNotMatch(page, /Узнать больше/)
  assert.doesNotMatch(page, /scrollToSection/)
  assert.match(page, /className="vip-club-hero__stage"/)
  assert.match(page, /vip-club-hero__actions/)
  assert.match(page, /privateClubLanding_joinCta/)
  assert.match(page, /privateClubLanding_alreadyMemberCta/)
  assert.match(page, /useViewerVipAccess/)
  assert.match(page, /vip-club-btn--member/)
  assert.match(
    mobile,
    /\.vip-club-hero__actions\s*\{[\s\S]*?justify-content:\s*center[\s\S]*?max-width:\s*260px/,
  )
})

test('keeps supporting descriptions concise', () => {
  assert.match(page, /t\('privateClubLanding_aboutLead'\)/)
  assert.match(page, /t\('privateClubLanding_whatsappLead'\)/)
  assert.match(page, /t\('privateClubLanding_storiesLead'\)/)
  assert.doesNotMatch(page, /Мы объединили лучших инвесторов и экспертов/)
  assert.doesNotMatch(page, /Реальные сценарии:/)
})

test('restores main scroll on mount and avoids clipping the hero fold', () => {
  assert.match(page, /ensureMainScrollReady\(\)/)
  assert.match(page, /scrollMainTo\(0,\s*0,\s*'instant'\)/)
  assert.match(
    css,
    /\.vip-club-fold\s*\{[\s\S]*?overflow-y:\s*visible[\s\S]*?\}/,
  )
  assert.doesNotMatch(
    css,
    /\.vip-club-fold\s*\{[\s\S]*?max-height:\s*calc\(112svh[\s\S]*?\}/,
  )
  assert.match(
    css,
    /\.app-layout:has\(\.vip-club-page\)\s*\{[\s\S]*?overflow-y:\s*auto !important/,
  )
})

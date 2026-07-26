import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const card = await readFile(new URL('./AuctionPropertyCard.jsx', import.meta.url), 'utf8')
const cardCss = await readFile(new URL('./AuctionPropertyCard.css', import.meta.url), 'utf8')
const layoutCss = await readFile(new URL('./ui/AuctionMobileLayout.css', import.meta.url), 'utf8')
const ribbon = await readFile(new URL('./auction/AuctionFinalStateRibbon.jsx', import.meta.url), 'utf8')
const ribbonCss = await readFile(new URL('./auction/AuctionFinalStateRibbon.css', import.meta.url), 'utf8')
const localeNames = ['en', 'es', 'fr', 'sv']
const localeSources = await Promise.all(
  localeNames.map((locale) =>
    readFile(new URL(`../i18n/locales/mainPage/${locale}.json`, import.meta.url), 'utf8'),
  ),
)

test('closed listings share a premium sold presentation with check ribbon', async () => {
  assert.match(card, /AuctionFinalStateRibbon/)
  assert.match(card, /showSoldPresentation/)
  assert.match(card, /auction-card--sold-presentation/)
  assert.match(card, /auction-card__sold-cta/)
  assert.match(card, /auctionSoldFor/)
  assert.match(card, /auctionSoldBadge/)
  assert.doesNotMatch(card, /BuyerStatusRibbon/)
  assert.match(ribbon, /auctionFinalStateSold/)
  assert.match(ribbon, /Check/)
  assert.match(ribbon, /'auction-ended'/)
  assert.doesNotMatch(ribbon, /final-state-tape\.png/)
  assert.match(ribbonCss, /\.auction-final-ribbon--sold/)
  assert.match(ribbonCss, /rotate\(-16deg\)/)
  assert.match(ribbonCss, /#4ecdd6/)
  for (const locale of localeSources) {
    assert.match(locale, /"auctionFinalStateSold"/)
    assert.match(locale, /"auctionSoldBadge"/)
    assert.match(locale, /"auctionSoldFor"/)
    assert.doesNotMatch(locale.match(/"auctionFinalStateSold"\s*:\s*"([^"]+)"/g)?.join(' ') || '', /[А-Яа-яЁё]/)
  }
})

test('sold presentation dims photo and uses inactive ruled sold CTA', () => {
  assert.match(cardCss, /\.auction-card--sold-presentation \.auction-card__image/)
  assert.match(cardCss, /brightness\(0\.72\)/)
  assert.match(cardCss, /\.auction-card__sold-cta/)
  assert.match(cardCss, /\.auction-card__sold-cta-rule/)
  assert.match(layoutCss, /\.auction-mobile-sold-cta/)
})

test('phone catalogue keeps exactly two photo-first cards per row from 320 to 767', () => {
  assert.match(layoutCss, /grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/)
  assert.match(layoutCss, /@media \(max-width:\s*767px\)[\s\S]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/)
  assert.match(cardCss, /@media \(max-width:\s*767px\)[\s\S]*\.auction-card__media\s*\{[\s\S]*aspect-ratio:\s*3 \/ 2;/)
  assert.match(layoutCss, /align-items:\s*start/)
})

test('phone cards expose up to four portal specs and keep actions touch-safe', () => {
  assert.match(card, /\.slice\(0, 4\)/)
  assert.match(card, /auction-card__until-pill/)
  assert.match(card, /auction-card__countdown-pill/)
  assert.match(card, /auction-card__media-top/)
  assert.match(card, /auction-card__buy-now-value/)
  assert.match(card, /auction-card__btn--outline/)
  assert.match(card, /formatAuctionCardCountdown/)
  assert.match(cardCss, /@media \(max-width:\s*767px\)[\s\S]*\.auction-card__btn[\s\S]*min-height:\s*36px;/)
  assert.match(cardCss, /@media \(max-width:\s*767px\)[\s\S]*\.auction-card__favorite[\s\S]*width:\s*36px;[\s\S]*height:\s*36px;/)
  assert.match(cardCss, /@media \(max-width:\s*768px\)[\s\S]*\.auction-card__btn-text-short[\s\S]*display:\s*inline/)
})

test('auction cards use valid sibling interactions and accessible canonical links', () => {
  assert.match(card, /<article[\s\S]*className=\{cardClassName\}/)
  assert.doesNotMatch(card, /<a\s+[\s\S]{0,160}className=\{cardClassName\}/)
  assert.match(card, /className="auction-card__media-link"/)
  assert.match(card, /className="auction-card__title-link"/)
  assert.match(card, /aria-pressed=\{Boolean\(isFavorite\)\}/)
  assert.match(card, /isFavorite\s*\?\s*t\('auctionRemoveFavorite'\)/)
})

test('all final-state commercial affordances consume resolver blocking flags', () => {
  assert.match(card, /const showPrivateClubBand\s*=[\s\S]{0,220}!state\.blocksBid[\s\S]{0,100}!state\.blocksPurchase/)
  assert.match(card, /const showFeatureBadges\s*=[\s\S]{0,220}!state\.blocksBid[\s\S]{0,100}!state\.blocksPurchase/)
  assert.match(card, /state\.hasBuyNowPrice && !state\.blocksPurchase/)
  assert.match(card, /!showPrivateClubBand && !state\.blocksBid/)
})

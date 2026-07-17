import test from 'node:test'
import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'

const card = await readFile(new URL('./AuctionPropertyCard.jsx', import.meta.url), 'utf8')
const cardCss = await readFile(new URL('./AuctionPropertyCard.css', import.meta.url), 'utf8')
const layoutCss = await readFile(new URL('./ui/AuctionMobileLayout.css', import.meta.url), 'utf8')
const ribbon = await readFile(new URL('./auction/AuctionFinalStateRibbon.jsx', import.meta.url), 'utf8').catch(() => '')
const ribbonCss = await readFile(new URL('./auction/AuctionFinalStateRibbon.css', import.meta.url), 'utf8').catch(() => '')
const localeNames = ['en', 'es', 'fr', 'sv']
const localeSources = await Promise.all(
  localeNames.map((locale) =>
    readFile(new URL(`../i18n/locales/mainPage/${locale}.json`, import.meta.url), 'utf8'),
  ),
)

test('final auction states use a real raster tape with localized state copy', async () => {
  await access(new URL('../../public/images/auction/final-state-tape.png', import.meta.url))
  assert.match(card, /AuctionFinalStateRibbon/)
  assert.doesNotMatch(card, /BuyerStatusRibbon/)
  assert.match(ribbon, /\/images\/auction\/final-state-tape\.png/)
  assert.match(ribbon, /useTranslation/)
  assert.match(ribbon, /auctionFinalStateSold/)
  assert.match(ribbon, /auctionFinalStateEnded/)
  assert.doesNotMatch(ribbon, /listingState\.label/)
  assert.match(ribbon, /<img/)
  assert.doesNotMatch(ribbonCss, /repeating-linear-gradient/)
  for (const locale of localeSources) {
    assert.match(locale, /"auctionFinalStateSold"/)
    assert.match(locale, /"auctionFinalStateEnded"/)
    assert.doesNotMatch(locale.match(/"auctionFinalState(?:Sold|Ended)"\s*:\s*"([^"]+)"/g)?.join(' ') || '', /[А-Яа-яЁё]/)
  }
})

test('phone catalogue keeps exactly two photo-first cards per row from 320 to 767', () => {
  assert.match(layoutCss, /grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/)
  assert.match(layoutCss, /@media \(max-width:\s*767px\)/)
  assert.doesNotMatch(layoutCss, /@media \(max-width:\s*374px\)[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\)/)
  assert.match(cardCss, /@media \(max-width:\s*767px\)[\s\S]*\.auction-card__media\s*\{[\s\S]*aspect-ratio:\s*4 \/ 3;/)
})

test('phone cards expose no more than two specs and keep actions touch-safe', () => {
  assert.match(card, /\.slice\(0, 2\)/)
  assert.match(cardCss, /@media \(max-width:\s*767px\)[\s\S]*\.auction-card__btn[\s\S]*min-height:\s*44px;/)
  assert.match(cardCss, /@media \(max-width:\s*767px\)[\s\S]*\.auction-card__favorite[\s\S]*width:\s*44px;[\s\S]*height:\s*44px;/)
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

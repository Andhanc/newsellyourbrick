import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const css = await readFile(new URL('./discoverAuctionCards.css', import.meta.url), 'utf8')
const card = await readFile(new URL('../components/AuctionPropertyCard.jsx', import.meta.url), 'utf8')
const showcase = await readFile(
  new URL('../components/InvestorPropertyShowcaseSection.jsx', import.meta.url),
  'utf8',
)
const propertyList = await readFile(new URL('../components/PropertyList.jsx', import.meta.url), 'utf8')
const mobileLayout = await readFile(new URL('../components/ui/AuctionMobileLayout.jsx', import.meta.url), 'utf8')
const mobileLayoutCss = await readFile(
  new URL('../components/ui/AuctionMobileLayout.css', import.meta.url),
  'utf8',
)
const catalog = await readFile(new URL('../pages/MobileDiscoverCatalog.jsx', import.meta.url), 'utf8')

test('auction listing reuses discover-auction-cards theme from the main page', () => {
  assert.match(catalog, /discover-auction-cards/)
  assert.match(catalog, /discoverAuctionCards\.css/)
  assert.match(propertyList, /discover-auction-cards/)
  assert.match(propertyList, /invest-showcase--auction/)
  assert.match(propertyList, /discoverAuctionCards\.css/)
  assert.match(mobileLayout, /discover-auction-cards/)
  assert.match(mobileLayout, /invest-showcase--auction/)
  assert.match(mobileLayout, /discoverAuctionCards\.css/)
  assert.doesNotMatch(propertyList, /hrShowcaseAuctionCards/)
  assert.doesNotMatch(mobileLayout, /hrShowcaseAuctionCards/)
  assert.doesNotMatch(propertyList, /hr-showcases--auction-listing/)
  assert.doesNotMatch(mobileLayout, /hr-showcases--auction-listing/)
})

test('discover theme matches portal auction cards: pricing stack and tiffany CTAs', () => {
  assert.match(css, /--md-font:\s*'Montserrat'/)
  assert.match(css, /--md-sky:\s*#4ecdd6/)
  assert.match(css, /\.discover-auction-cards \.auction-card__pricing/)
  assert.match(css, /\.discover-auction-cards \.auction-card__btn--primary/)
  assert.match(css, /\.discover-auction-cards \.auction-card__btn--outline/)
  assert.match(css, /#0099A9/)
  assert.match(css, /#16a34a/)
  assert.match(css, /\.auction-card__btn-text-full[\s\S]*display:\s*inline\s*!important/)
  assert.match(css, /\.auction-card__btn-text-short[\s\S]*display:\s*none\s*!important/)
  assert.match(css, /aspect-ratio:\s*3\s*\/\s*2\s*!important/)
  assert.match(css, /\.auction-card__until-pill[\s\S]*display:\s*none\s*!important/)
  assert.match(css, /\.auction-card__countdown-pill[\s\S]*max-width:\s*100%\s*!important/)
})

test('stretches the single auction bid action across the full listing card', () => {
  assert.match(card, /auction-card__actions--single/)
  assert.match(css, /\.discover-auction-cards \.auction-card__actions--single[\s\S]*grid-template-columns:\s*1fr/)
})

test('keeps two columns when bid and buy-now actions are both present', () => {
  assert.match(
    css,
    /\.discover-auction-cards \.auction-card__actions\s*\{[\s\S]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/,
  )
})

test('main-page buy-now card swaps timer and favorite, widens timer, and stacks actions', () => {
  assert.match(
    css,
    /\.md-format-card\[data-md-format='buy_now'\][\s\S]*\.auction-card__favorite[\s\S]*top:\s*8px\s*!important[\s\S]*bottom:\s*auto\s*!important/,
  )
  assert.match(
    css,
    /\.md-format-card\[data-md-format='buy_now'\][\s\S]*\.auction-card__media-top[\s\S]*bottom:\s*10px\s*!important[\s\S]*width:\s*95%\s*!important/,
  )
  assert.match(
    css,
    /\.md-format-card\[data-md-format='buy_now'\][\s\S]*\.auction-card__actions[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*!important/,
  )
  assert.ok(
    card.includes('`${pad(days)}:${pad(hours)}:${pad(minutes)}:${pad(seconds)}`'),
  )
  assert.match(card, /auction-card__timer-prices/)
  assert.match(card, /auction-card--timer-pricing/)
  assert.doesNotMatch(card, /auction-card__timer-price--buy/)
  assert.match(
    css,
    /\.auction-card--timer-pricing[\s\S]*\.auction-card__pricing[\s\S]*display:\s*none\s*!important/,
  )
  assert.match(
    css,
    /\.md-format-card\[data-md-format='buy_now'\][\s\S]*\.auction-card__btn[\s\S]*font-size:\s*0\.88rem\s*!important/,
  )
})

test('main-page auction card mirrors the compact layout and keeps only a tiffany bid action', () => {
  assert.match(
    css,
    /\.md-format-card\[data-md-format='auction'\][\s\S]*\.auction-card__media-top[\s\S]*bottom:\s*10px\s*!important[\s\S]*width:\s*95%\s*!important/,
  )
  assert.match(showcase, /hideBuyNowAction=\{variant === 'auction'\}/)
  assert.match(card, /hideBuyNowAction = false/)
  assert.match(card, /!hideBuyNowAction &&[\s\S]*state\.hasBuyNowPrice/)
  assert.match(
    card,
    /hideBuyNowAction[\s\S]*\? 'auction-card__btn--primary'[\s\S]*: 'auction-card__btn--outline'/,
  )
  assert.match(card, /state\.showGreenTimer && 'auction-card--timer-pricing'/)
})

test('phone cards stack their actions and use the homepage tiffany shine', () => {
  assert.match(
    mobileLayoutCss,
    /\.auction-mobile-layout[\s\S]*--auction-tiffany:\s*#4ecdd6/,
  )
  assert.match(
    mobileLayoutCss,
    /\.auction-mobile-layout[\s\S]*\.auction-card__actions[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*!important/,
  )
  assert.match(mobileLayoutCss, /#8ee6ed\s+52%/)
  assert.match(card, /auction-card__btn-arrow/)
})

test('card view groups lots by visible action count and keeps sold lots openable', () => {
  assert.match(mobileLayout, /getAuctionCardActionGroup/)
  assert.match(mobileLayout, /actionGroup:\s*getAuctionCardActionGroup/)
  assert.match(card, /auction-card--actions-\$\{visibleActionCount\}/)
  assert.match(card, /auction-card__sold-cta-open/)
  assert.match(card, /onOpen\(property\)/)
})

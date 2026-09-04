import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const page = await readFile(new URL('./Shares.jsx', import.meta.url), 'utf8')
const mobileCss = await readFile(new URL('./CoInvestment.mobile.css', import.meta.url), 'utf8').catch(() => '')
const card = await readFile(new URL('../components/SharesPropertyCard.jsx', import.meta.url), 'utf8')
const cardCss = await readFile(
  new URL('../components/SharesPropertyCard.css', import.meta.url),
  'utf8',
)
const homeCss = await readFile(new URL('./MobileDiscoverPage.css', import.meta.url), 'utf8')
const sharedPaginationCss = await readFile(
  new URL('../components/ListingPagePagination.css', import.meta.url),
  'utf8',
)

test('uses only real API shares and a pure 16-item catalogue page', () => {
  assert.match(page, /SHARES_MARKETPLACE_PAGE_SIZE/)
  assert.match(page, /paginateSharesMarketplace\(filteredShares, page\)/)
  assert.doesNotMatch(page, /DEMO_SHARES|GENERATED_SHARES|visual-share|demo-share/)
  assert.doesNotMatch(page, /while \(merged\.length/)
  assert.match(page, /while \(true\)/)
  assert.match(page, /offset \+= payload\.data\.length/)
  assert.match(page, /if \(payload\.data\.length < API_PAGE_SIZE\) break/)
})

test('uses persistent favourites and the shared guided catalogue states', () => {
  assert.match(page, /usePropertyFavorites\(\)/)
  assert.match(page, /isFavorite\(share, getShareFavoriteCategory\(share\)\)/)
  assert.match(page, /toggleFavorite\(share, getShareFavoriteCategory\(share\)\)/)
  assert.match(page, /share\.source_table \? undefined : 'property'/)
  assert.match(page, /BuyerEmptyState/)
  assert.match(page, /shares-empty-illustration\.png/)
  assert.match(page, /sharesPage_seeOtherObjects/)
  assert.match(page, /SharesPropertyCardSkeleton/)
  assert.match(page, /ListingPagePagination/)
  assert.doesNotMatch(page, /useState\(\(\) => new Set/)
})

test('does not present invented portfolio or platform facts', () => {
  assert.doesNotMatch(page, /€52 480|€2 860|12 842|€128,6 млн|11,6%|\+320 за месяц/)
  assert.doesNotMatch(page, /portfolioFacts|Личный портфель|€52/)
})

test('renders photo-hero shares redesign aligned with debts and auction', () => {
  assert.match(page, /import '.\/CoInvestment\.mobile\.css'/)
  assert.match(page, /shares-page--shares-redesign/)
  assert.match(page, /shares-hero-scene/)
  assert.match(page, /debts-listing-search/)
  assert.match(page, /AuctionCategoryCtaCards/)
  assert.match(page, /MobileDiscoverFaq/)
  assert.match(mobileCss, /@media \(max-width: 768px\)[\s\S]*?\.shares-page--shares-redesign \.shares-invest-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/)
  assert.match(mobileCss, /@media \(max-width: 768px\)[\s\S]*?\.shares-page--shares-redesign \.shares-v2-card__media\s*\{[\s\S]*?aspect-ratio:\s*5\s*\/\s*4/)
  assert.match(mobileCss, /--shares-sky:\s*#4ecdd6/)
  assert.match(mobileCss, /@media \(max-width: 768px\)[\s\S]*?\.shares-page--shares-redesign \.shares-v2-card\s*\{[\s\S]*?aspect-ratio:\s*auto/)
  assert.match(mobileCss, /\.shares-page--shares-redesign \.shares-v2-card__favorite\s*\{[\s\S]*?min-width:\s*36px[\s\S]*?min-height:\s*36px/)
  assert.match(mobileCss, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(mobileCss, /#shares-invest-results\s*\{[\s\S]*?scroll-margin-top:/)
  assert.match(mobileCss, /\.shares-page--shares-redesign \.debts-listing-search__go[\s\S]*?width:\s*46px[\s\S]*?height:\s*46px/)
  assert.match(sharedPaginationCss, /@media \(max-width:\s*768px\)[\s\S]*min-width:\s*44px;[\s\S]*height:\s*44px;/)
  assert.match(sharedPaginationCss, /#4ecdd6/i)
})

test('share cards follow auction card dimensions on the homepage and catalogue', () => {
  assert.match(cardCss, /\.shares-v2-card__media\s*\{[\s\S]*?aspect-ratio:\s*5\s*\/\s*4/)
  assert.match(card, /shares-v2-card__shares-dock/)
  assert.match(card, /shares-v2-card__specs/)
  assert.match(card, /sharesCardCollected/)
  assert.match(card, /collectedPercent/)
  assert.match(homeCss, /invest-showcase--shares \.shares-v2-card__media\s*\{[\s\S]*?aspect-ratio:\s*5\s*\/\s*4/)
})

test('cards expose availability, are fully clickable, and use shared final-state ribbons', () => {
  assert.match(card, /BuyerStatusRibbon/)
  assert.match(card, /resolveShareMarketplaceState/)
  assert.match(card, /getCoInvestmentDetailPath/)
  assert.match(card, /handleCardOpen/)
  assert.match(card, /sharesCardCollected/)
  assert.doesNotMatch(card, /formatForecastYield/)
  assert.doesNotMatch(card, /Прогноз доходности/)
  assert.match(card, /aria-disabled=\{investmentState\.blocksInvestment/)
  assert.doesNotMatch(card, /shares-v2-card__sold-overlay/)
})

test('broken or missing listing photos fall back to a real neutral branded asset', () => {
  assert.match(card, /co-investment-card-fallback\.png/)
  assert.match(card, /onError=\{handleImageError\}/)
  assert.doesNotMatch(card, /shares-v2-card__image-missing/)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const page = await readFile(new URL('./Shares.jsx', import.meta.url), 'utf8')
const css = await readFile(new URL('./Shares.css', import.meta.url), 'utf8')
const directions = await readFile(new URL('../components/AuctionCategoryCtaCards.jsx', import.meta.url), 'utf8')

test('shows two compact investment cards per row on smartphones', () => {
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*?\.shares-invest-page \.shares-invest-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/)
  assert.match(css, /\.shares-invest-page \.shares-invest-card__media\s*\{[\s\S]*?aspect-ratio:\s*4 \/ 3/)
  assert.match(css, /\.shares-invest-page \.shares-invest-card__funding\s*\{[\s\S]*?grid-template-columns:\s*42px minmax\(0, 1fr\)/)
})

test('reuses the shares card from the home page and shows 16 objects per page', () => {
  assert.match(page, /import SharesPropertyCard from '..\/components\/SharesPropertyCard'/)
  assert.match(page, /const PAGE_SIZE = 16/)
  assert.match(page, /<SharesPropertyCard/)
  assert.doesNotMatch(page, /function ShareCard\(/)
})

test('matches the compact mobile card proportions used on the home page', () => {
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*?\.shares-invest-page \.shares-v2-card__media\s*\{[\s\S]*?aspect-ratio:\s*3 \/ 2/)
  assert.match(css, /\.shares-invest-page \.shares-v2-card__title\s*\{[\s\S]*?font-size:\s*0\.72rem/)
  assert.match(css, /\.shares-invest-page \.shares-v2-card__body\s*\{[\s\S]*?padding:\s*8px/)
  assert.match(css, /\.shares-invest-page \.shares-v2-card__invest-btn\s*\{[\s\S]*?background:\s*#0a0a0a/)
  assert.match(css, /\.shares-invest-page \.shares-v2-card__invest-btn\s*\{[\s\S]*?color:\s*#fff/)
  assert.match(css, /\.shares-invest-page \.shares-v2-card__invest-btn\s*\{[\s\S]*?min-height:\s*30px/)
  assert.match(css, /\.shares-invest-page \.shares-v2-card__invest-btn:hover:not\(:disabled\)\s*\{[\s\S]*?color:\s*#fff/)
})

test('keeps pagination compact without duplicating the last page', () => {
  assert.match(page, /const end = Math\.min\(totalPages, start \+ 2\)/)
  assert.match(page, /const showLastPage = !pageNumbers\.includes\(totalPages\)/)
  assert.match(page, /showTrailingEllipsis/)
  assert.match(page, /showLastPage \? <button/)
})

test('adds a named directions section and a polished mobile hero', () => {
  assert.match(page, /import AuctionCategoryCtaCards from '..\/components\/AuctionCategoryCtaCards'/)
  assert.match(page, /<AuctionCategoryCtaCards variant="sharesPage" \/>/)
  assert.match(directions, /const SHARES_PAGE_CTA_CARD_IDS = \['auction', 'debts', 'test-drive'\]/)
  assert.match(directions, /variant === 'sharesPage'/)
  assert.match(css, /@media \(max-width: 768px\)[\s\S]*?\.shares-invest-hero__copy\s*\{[\s\S]*?backdrop-filter:\s*blur\(18px\)/)
  assert.match(css, /\.shares-invest-stats__metrics\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/)
})

test('turns platform statistics into a selling conversion block', () => {
  assert.match(page, /shares-invest-stats__intro/)
  assert.match(page, /shares-invest-stats__title-line">Соберите портфель/)
  assert.match(page, /shares-invest-stats__title-pill">недвижимости/)
  assert.match(page, /shares-invest-stats__title-line">по частям/)
  assert.match(page, /Доступно от €100/)
  assert.match(page, /Доход от аренды/)
  assert.match(page, /Подобрать долю/)
  assert.match(css, /\.shares-invest-stats__intro/)
  assert.match(css, /\.shares-invest-stats__benefits/)
  assert.match(css, /\.shares-invest-stats__cta/)
})

test('removes the mobile hero copy card and lifts the selling block', () => {
  assert.match(css, /@media \(max-width: 768px\)[\s\S]*?\.shares-invest-page \.shares-invest-hero__copy\s*\{[\s\S]*?display:\s*none/)
  assert.match(css, /\.shares-invest-page \.shares-invest-hero\s*\{[\s\S]*?min-height:\s*280px/)
  assert.match(css, /\.shares-invest-page \.shares-invest-stats\s*\{[\s\S]*?margin:\s*-152px 0 26px/)
  assert.match(css, /\.shares-invest-stats__title-pill\s*\{[\s\S]*?background:\s*#4a96a6/)
  assert.match(css, /transform:\s*rotate\(-2deg\)/)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('./PropertyList.jsx', import.meta.url), 'utf8')
const css = await readFile(new URL('./PropertyList.css', import.meta.url), 'utf8')
const sharedPagination = await readFile(new URL('./ListingPagePagination.jsx', import.meta.url), 'utf8')
const sharedPaginationCss = await readFile(new URL('./ListingPagePagination.css', import.meta.url), 'utf8')

test('mobile auction paginates sixteen real listings instead of expanding the whole catalogue', () => {
  assert.match(source, /const AUCTION_MOBILE_PAGE_SIZE = 16/)
  assert.match(source, /isAuctionMobileFilters\s*\?\s*AUCTION_MOBILE_PAGE_SIZE/)
  assert.match(source, /filteredProperties\.slice\(start, start \+ auctionPageSize\)/)
  assert.doesNotMatch(source, /isMobile && isAuctionPage[\s\S]{0,100}filteredProperties\.slice\(0, visibleCount\)/)
  assert.doesNotMatch(source, /!isAuctionDesktop && filteredProperties\.length > visibleCount/)
})

test('auction pagination is semantic, touch-safe, and available on phones', () => {
  assert.match(source, /import ListingPagePagination from '\.\/ListingPagePagination'/)
  assert.match(source, /isAuctionMobileFilters && filteredProperties\.length > 0[\s\S]*<ListingPagePagination/)
  assert.match(sharedPagination, /aria-current=\{page === currentPage \? 'page'/)
  assert.match(sharedPaginationCss, /@media \(max-width:\s*768px\)[\s\S]*min-width:\s*44px;[\s\S]*height:\s*44px;/)
})

test('desktop auction preserves its established pagination classes and layout contract', () => {
  assert.match(source, /isAuctionDesktop && filteredProperties\.length > 0/)
  assert.match(source, /className="auction-desktop-pagination"/)
  assert.match(source, /className="auction-desktop-pagination__arrow"/)
  assert.match(source, /auction-desktop-pagination__page--active/)
  assert.match(css, /\.auction-desktop-pagination\s*\{/)
})

test('mobile auction introduces a route-specific catalogue header without fake ratings', () => {
  assert.match(source, /className="auction-mobile-catalog-head"/)
  assert.match(source, /filteredProperties\.length/)
  assert.doesNotMatch(source, /rating|reviews|discount/i)
})

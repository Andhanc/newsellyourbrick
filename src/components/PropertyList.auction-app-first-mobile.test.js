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

test('auction pagination uses the shared catalog control on phones and desktop', () => {
  assert.match(source, /import ListingPagePagination from '\.\/ListingPagePagination'/)
  assert.match(source, /isAuctionPage && filteredProperties\.length > 0[\s\S]*<ListingPagePagination/)
  assert.doesNotMatch(source, /Array\.from\(\{ length: auctionTotalPages \}/)
  assert.match(sharedPagination, /aria-current=\{item\.value === currentPage \? 'page'/)
  assert.match(sharedPaginationCss, /@media \(max-width:\s*768px\)[\s\S]*min-width:\s*44px;[\s\S]*height:\s*44px;/)
  assert.match(sharedPaginationCss, /#4ecdd6/i)
  assert.match(css, /\.auction-desktop-layout--filters-hidden \.listing-page-pagination/)
})

test('mobile auction introduces a route-specific catalogue header without fake ratings', () => {
  assert.match(source, /property-list--auction-mobile-page/)
  assert.match(source, /filteredProperties\.length/)
  assert.doesNotMatch(source, /auction-mobile-catalog-head__rating|fakeReviews|fakeDiscount/)
})

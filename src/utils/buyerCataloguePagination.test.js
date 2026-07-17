import test from 'node:test'
import assert from 'node:assert/strict'

import {
  BUYER_CATALOGUE_PAGE_SIZE,
  paginateBuyerCatalogue,
} from './buyerCataloguePagination.js'

test('buyer catalogues expose no more than sixteen truthful API items per page', () => {
  const items = Array.from({ length: 37 }, (_, index) => ({ id: index + 1 }))

  const firstPage = paginateBuyerCatalogue(items, 1)
  const lastPage = paginateBuyerCatalogue(items, 99)

  assert.equal(BUYER_CATALOGUE_PAGE_SIZE, 16)
  assert.deepEqual(firstPage.items.map((item) => item.id), Array.from({ length: 16 }, (_, index) => index + 1))
  assert.equal(firstPage.totalPages, 3)
  assert.equal(lastPage.currentPage, 3)
  assert.deepEqual(lastPage.items.map((item) => item.id), [33, 34, 35, 36, 37])
})

test('empty catalogues keep a stable page contract', () => {
  assert.deepEqual(paginateBuyerCatalogue([], 4), {
    items: [],
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    pageSize: 16,
  })
})

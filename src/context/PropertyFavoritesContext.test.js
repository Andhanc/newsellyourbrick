import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('./PropertyFavoritesContext.jsx', import.meta.url), 'utf8')

test('sold listings cannot be added to favorites', () => {
  assert.match(source, /isClosedForWishlist/)
  assert.match(source, /Проданный объект нельзя добавить в избранное/)
})

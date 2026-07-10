import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const jsx = await readFile(new URL('./HomeSaleFormats.jsx', import.meta.url), 'utf8')
const css = await readFile(new URL('./HomeSaleFormats.css', import.meta.url), 'utf8')

test('renders each format as one fully clickable route card', () => {
  assert.match(jsx, /sale-formats__card/)
  assert.match(jsx, /to=\{mode\.to\}/)
  assert.match(jsx, /Смотреть объекты/)
})

test('uses a flow content wrapper for the card heading', () => {
  assert.match(jsx, /<div className="sale-formats__content">/)
  assert.doesNotMatch(jsx, /<span className="sale-formats__content">/)
})

test('provides mobile scroll snap, focus visibility, and reduced motion', () => {
  assert.match(css, /scroll-snap-type:\s*x mandatory/)
  assert.match(css, /\.sale-formats__card:focus-visible/)
  assert.match(css, /prefers-reduced-motion:\s*reduce/)
})

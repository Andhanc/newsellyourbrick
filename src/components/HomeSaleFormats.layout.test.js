import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const jsx = await readFile(new URL('./HomeSaleFormats.jsx', import.meta.url), 'utf8')
const css = await readFile(new URL('./HomeSaleFormats.css', import.meta.url), 'utf8')
const mainPage = await readFile(new URL('../pages/MainPage.jsx', import.meta.url), 'utf8')
const mobileDiscoverPage = await readFile(
  new URL('../pages/MobileDiscoverPage.jsx', import.meta.url),
  'utf8',
)

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

test('connects MainPage to the approved sale format content and image series', () => {
  assert.match(
    mainPage,
    /import HomeSaleFormats from ['"]\.\.\/components\/HomeSaleFormats['"]/,
  )
  assert.match(mainPage, /<HomeSaleFormats modes=\{premiumModes\} \/>/)

  for (const image of [
    '/images/home-sale-formats/summer-2026/sale-format-auction-summer.webp',
    '/images/home-sale-formats/summer-2026/sale-format-buy-now-summer.webp',
    '/images/home-sale-formats/summer-2026/sale-format-shares-summer.webp',
    '/images/home-sale-formats/summer-2026/sale-format-debts-summer.webp',
  ]) {
    assert.match(mainPage, new RegExp(image.replaceAll('/', '\\/')))
  }

  for (const benefit of [
    'Поймайте цену ниже рынка',
    'Заберите подходящий объект без ожидания',
    'Начните с меньшего капитала',
    'Используйте дисконт за сложность',
  ]) {
    assert.match(mainPage, new RegExp(benefit))
  }
})

test('uses the same summer image series on the adaptive phone homepage', () => {
  for (const image of [
    'sale-format-auction-summer.webp',
    'sale-format-buy-now-summer.webp',
    'sale-format-shares-summer.webp',
    'sale-format-debts-summer.webp',
  ]) {
    assert.match(mobileDiscoverPage, new RegExp(image))
  }
  assert.doesNotMatch(mobileDiscoverPage, /images\/mobile-discover\/card-(auction|buy-now|shares|debts)/)
  assert.match(mobileDiscoverPage, /md-card__copy/)
  assert.match(mobileDiscoverPage, /const CardIcon = card\.Icon/)
})

test('matches the selected reference with functional rail controls and split cards', () => {
  assert.match(jsx, /useRef/)
  assert.match(jsx, /railRef/)
  assert.match(jsx, /\.scrollBy\(/)
  assert.match(jsx, /<button[\s\S]*aria-label="Предыдущие форматы"/)
  assert.match(jsx, /<button[\s\S]*aria-label="Следующие форматы"/)
  assert.match(jsx, /sale-formats__tag/)
  assert.match(jsx, /sale-formats__media/)
  assert.ok(
    jsx.indexOf('sale-formats__content') < jsx.indexOf('sale-formats__media'),
    'card copy should appear before the lower-half image',
  )
})

test('uses the selected reference palette and partial-card rail at desktop and mobile', () => {
  assert.match(css, /--sale-formats-visible:\s*3\.4/)
  assert.match(css, /grid-auto-columns:[^;]*var\(--sale-formats-visible\)/)
  assert.match(css, /\.sale-formats__card:first-child[\s\S]*background:\s*#[a-f\d]{3,6}/i)
  assert.match(css, /\.sale-formats__card:not\(:first-child\)[\s\S]*background:\s*#[a-f\d]{3,6}/i)
  assert.match(css, /\.sale-formats__media[\s\S]*height:\s*50%/)
  assert.match(css, /@media\s*\(max-width:\s*767px\)[\s\S]*--sale-formats-visible:\s*1\.1/)
  assert.doesNotMatch(css, /linear-gradient/)
})

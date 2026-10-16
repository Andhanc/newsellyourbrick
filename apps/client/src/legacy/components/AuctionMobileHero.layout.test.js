import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const heroCss = await readFile(new URL('./Hero.css', import.meta.url), 'utf8')
const heroJsx = await readFile(new URL('./Hero.jsx', import.meta.url), 'utf8')
const homeJsx = await readFile(new URL('../pages/Home.jsx', import.meta.url), 'utf8')

test('renders a dedicated photo-first mobile auction hero with a working catalogue action', () => {
  assert.match(heroJsx, /className="hero-auction-mobile"/)
  assert.match(heroJsx, /document\.getElementById\('properties-grid'\)/)
  assert.match(heroJsx, /hero-auction-mobile__cta/)
  assert.match(heroCss, /@media \(max-width:\s*768px\)[\s\S]*\.hero-auction-mobile\s*\{[\s\S]*display:\s*flex;/)
  assert.match(heroCss, /\.hero--auction-scene__bg[\s\S]*object-fit:\s*cover/)
})

test('uses the photo-first auction intro on desktop, without the three feature cards', () => {
  assert.match(heroJsx, /\{!auctionScene \? \(/)
  assert.doesNotMatch(heroJsx, /hero-auction-header/)
  assert.match(heroCss, /@media \(min-width:\s*769px\)[\s\S]*\.hero--auction-scene \.hero-features\s*\{[\s\S]*display:\s*none;/)
  assert.match(heroCss, /@media \(min-width:\s*769px\)[\s\S]*\.hero-auction-mobile\s*\{[\s\S]*display:\s*flex;/)
  assert.match(heroCss, /@media \(min-width:\s*769px\)[\s\S]*\.hero-auction-mobile__cta\s*\{[\s\S]*min-height:\s*56px;/)
  assert.match(heroCss, /@media \(min-width:\s*769px\)[\s\S]*min-height:\s*100dvh;/)
})

test('removes the generic three feature cards from the phone auction composition', () => {
  assert.match(heroCss, /@media \(max-width:\s*768px\)[\s\S]*\.hero--auction-scene \.hero-auction-header,[\s\S]*\.hero--auction-scene \.hero-features\s*\{[\s\S]*display:\s*none;/)
  assert.match(heroCss, /@media \(max-width:\s*768px\)[\s\S]*\.hero-auction-mobile__cta\s*\{[\s\S]*?min-height:\s*56px;/)
})

test('does not render a mobile auction breadcrumb block', () => {
  assert.doesNotMatch(homeJsx, /PageBreadcrumbs/)
  assert.doesNotMatch(homeJsx, /isMobileViewport/)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const drawer = await readFile(new URL('./StrategyRecommendationDrawer.jsx', import.meta.url), 'utf8')
const es = await readFile(new URL('../i18n/locales/mainPage/es.json', import.meta.url), 'utf8')
const ru = await readFile(new URL('../i18n/locales/mainPage/ru.json', import.meta.url), 'utf8')
const legacyDrawer = await readFile(
  new URL('../../apps/client/src/legacy/components/StrategyRecommendationDrawer.jsx', import.meta.url),
  'utf8',
)
const legacyEs = await readFile(
  new URL('../../apps/client/src/legacy/i18n/locales/mainPage/es.json', import.meta.url),
  'utf8',
)

test('strategy recommendation drawer uses i18n instead of ru/en hardcode', () => {
  assert.match(drawer, /useTranslation/)
  assert.match(drawer, /strategyRecommendation_title/)
  assert.match(drawer, /strategyRecommendation_watch/)
  assert.doesNotMatch(drawer, /Personal selection/)
  assert.doesNotMatch(drawer, /language\s*=/)
})

test('spanish locales cover strategy drawers', () => {
  assert.match(es, /"strategyRecommendation_title":\s*"¿Necesitas ayuda para elegir un inmueble\?"/)
  assert.match(es, /"strategyRecommendation_watch":\s*"Ver"/)
  assert.match(es, /"sectionInfo_auctionTitle":\s*"Subasta de inmuebles"/)
  assert.match(es, /"sectionInfo_understood":\s*"Entendido, gracias"/)
  assert.match(ru, /"strategyRecommendation_watch":\s*"Смотреть"/)
})

test('web and legacy strategy recommendation drawer stay in parity', () => {
  assert.equal(drawer, legacyDrawer)
  assert.match(legacyEs, /"strategyRecommendation_title":\s*"¿Necesitas ayuda para elegir un inmueble\?"/)
  assert.match(legacyEs, /"sectionInfo_buyNowTitle":\s*"Comprar ahora"/)
})

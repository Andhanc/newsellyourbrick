import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
const root = new URL('../../../', import.meta.url)
const read = path => readFileSync(new URL(path, root), 'utf8')
test('development web and legacy surfaces remain identical', () => {
  const files = ['components/PropertyAiExperience.jsx','utils/pinnedCatalogNav.js','utils/oapAddPropertyDraft.js','App.jsx', 'utils/developmentFinance.js', 'utils/oapPublishProperty.js', 'utils/softLaunchAccess.js', 'pages/MobileDiscoverPage.jsx', 'pages/OwnerAddPropertyTestPage.jsx', 'pages/OwnerAddPropertyStrategyStep.jsx', 'pages/OwnerPropertyAnalyticsTestPage.jsx', 'pages/PropertyDetailClassic.jsx', 'components/SectionInfoDrawer.jsx', 'components/HeaderMegaMenu.jsx', ...readdirSync(new URL('src/features/development/', root)).filter(f => !f.endsWith('.test.js')).map(f => `features/development/${f}`)]
  for (const file of files) assert.equal(read(`src/${file}`), read(`apps/client/src/legacy/${file}`), file)
})
test('every development message exists in all seven locales and mirrors', () => {
  const english = JSON.parse(read('src/i18n/locales/mainPage/en.json')).develop
  const keys = Object.keys(english).sort()
  for (const lang of ['ru', 'en', 'de', 'es', 'fr', 'pl', 'sv']) {
    const file = `i18n/locales/mainPage/${lang}.json`
    const data = JSON.parse(read(`src/${file}`))
    assert.deepEqual(Object.keys(data.develop).sort(), keys, lang)
    for (const k of keys) assert.ok(data.develop[k]?.length, `${lang}.${k}`)
    assert.equal(read(`src/${file}`), read(`apps/client/src/legacy/${file}`), lang)
  }
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const component = await readFile(new URL('./PropertyDetailInternalLinks.jsx', import.meta.url), 'utf8')
const propertyPage = await readFile(new URL('../pages/PropertyDetailClassic.jsx', import.meta.url), 'utf8')

test('removes location and buying-guide blocks from every property object mode', () => {
  assert.match(propertyPage, /<PropertyDetailInternalLinks property=\{displayProperty\} \/>/)
  assert.doesNotMatch(component, /seoGeoLinksTitle/)
  assert.doesNotMatch(component, /seoPurchaseGuidesTitle/)
  assert.doesNotMatch(component, /PURCHASE_GUIDE_LINKS/)
  assert.doesNotMatch(component, /buildPropertyGeoBreadcrumbItems/)
})

test('keeps related-property cards without links to unavailable catalog pages', () => {
  assert.match(component, /seoSimilarPropertiesTitle/)
  assert.match(component, /property-internal-links__grid/)
  assert.doesNotMatch(component, /geo\.cityCatalogPath/)
  assert.doesNotMatch(component, /geo\.typeCatalogPath/)
  assert.doesNotMatch(component, /<Link/)
})


test('related deck and internal links remain identical in web and legacy', async () => {
  for (const name of ['PropertyDetailInternalLinks.jsx', 'PropertyDetailInternalLinks.css', 'RelatedPropertyDeck.jsx', 'RelatedPropertyDeck.css']) {
    const web = await readFile(new URL(`./${name}`, import.meta.url), 'utf8')
    const legacy = await readFile(new URL(`../../apps/client/src/legacy/components/${name}`, import.meta.url), 'utf8')
    assert.equal(web, legacy, name)
  }
})

test('deck translations exist in every supported locale and its legacy mirror', async () => {
  for (const locale of ['ru', 'en', 'de', 'es', 'fr', 'pl', 'sv']) {
    const web = JSON.parse(await readFile(new URL(`../i18n/locales/mainPage/${locale}.json`, import.meta.url), 'utf8'))
    const legacy = JSON.parse(await readFile(new URL(`../../apps/client/src/legacy/i18n/locales/mainPage/${locale}.json`, import.meta.url), 'utf8'))
    for (const key of ['relatedDeckSwipeHint', 'relatedDeckPrevious', 'relatedDeckNext', 'relatedDeckPosition', 'relatedDeckCarousel']) {
      assert.ok(web[key], `${locale}: ${key}`)
      assert.equal(web[key], legacy[key], `${locale}: ${key}`)
    }
  }
})

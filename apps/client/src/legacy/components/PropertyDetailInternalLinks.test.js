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

test('keeps useful related-property and city catalog navigation', () => {
  assert.match(component, /seoSimilarPropertiesTitle/)
  assert.match(component, /geo\.cityCatalogPath/)
  assert.match(component, /property-internal-links__grid/)
})

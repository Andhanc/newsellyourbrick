import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const locales = ['ru', 'en', 'de', 'es', 'fr', 'pl', 'sv']
const required = [
  'compareNeedsLikes_titleZero',
  'compareNeedsLikes_titleOne',
  'compareNeedsLikes_lead',
  'compareNeedsLikes_metaCount',
  'compareNeedsLikes_metaHint',
  'compareNeedsLikes_cta',
  'compareNeedsLikes_close',
]

test('compare likes modal matches the compass promo and stays in both clients', async () => {
  const modal = await readFile(new URL('./CompareNeedsLikesModal.jsx', import.meta.url), 'utf8')
  const styles = await readFile(new URL('./CompareNeedsLikesModal.css', import.meta.url), 'utf8')
  const legacy = await readFile(
    new URL('../../apps/client/src/legacy/components/CompareNeedsLikesModal.jsx', import.meta.url),
    'utf8',
  )
  const favorites = await readFile(new URL('../pages/Favorites.jsx', import.meta.url), 'utf8')
  const legacyFavorites = await readFile(
    new URL('../../apps/client/src/legacy/pages/Favorites.jsx', import.meta.url),
    'utf8',
  )

  assert.equal(legacy, modal)
  assert.match(modal, /compare-favorites-3d\.webp/)
  assert.match(modal, /compareNeedsLikes_titleOne/)
  assert.match(modal, /compare-needs-likes-modal__close/)
  assert.match(styles, /compare-needs-likes-modal__cta/)
  assert.match(styles, /prefers-reduced-motion:\s*reduce/)
  assert.match(favorites, /onClick=\{openCompare\}/)
  assert.match(favorites, /if \(!needsMoreLikes\) return/)
  assert.match(favorites, /event\.preventDefault\(\)/)
  assert.match(legacyFavorites, /onClick=\{openCompare\}/)
})

test('compare likes copy exists in every locale and legacy mirror', async () => {
  for (const locale of locales) {
    const main = JSON.parse(
      await readFile(new URL(`../i18n/locales/mainPage/${locale}.json`, import.meta.url), 'utf8'),
    )
    const legacy = JSON.parse(
      await readFile(
        new URL(`../../apps/client/src/legacy/i18n/locales/mainPage/${locale}.json`, import.meta.url),
        'utf8',
      ),
    )
    for (const key of required) {
      assert.equal(typeof main[key], 'string', `${locale} missing ${key}`)
      assert.equal(legacy[key], main[key], `${locale} mirror differs for ${key}`)
    }
  }
})

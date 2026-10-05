import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  formatNewsArticleDate,
  localizeNewsArticle,
  NEWS_ARTICLE_SLUG_KEYS,
} from './localizeNewsArticle.js'

describe('localizeNewsArticle', () => {
  it('maps known slugs', () => {
    assert.equal(
      NEWS_ARTICLE_SLUG_KEYS['5-neobychnyh-postroek-v-barselone'],
      'barcelonaBuildings',
    )
  })

  it('formats dates by locale', () => {
    const iso = '2026-05-31T20:00:18.441Z'
    const es = formatNewsArticleDate(iso, 'es')
    const en = formatNewsArticleDate(iso, 'en')
    assert.match(es, /2026/)
    assert.match(en, /2026/)
    assert.notEqual(es, '31 мая 2026')
  })

  it('localizes badge title excerpt lead from i18n keys', () => {
    const strings = {
      newsPage_static_heroBadge: 'Ideas de viaje',
      newsArticle_barcelonaBuildings_title: '5 edificios inusuales en Barcelona',
      newsArticle_barcelonaBuildings_excerpt: 'Excerpt ES',
      newsArticle_barcelonaBuildings_lead: 'Lead ES',
    }
    const t = (key) => strings[key] || key
    const localized = localizeNewsArticle(
      {
        slug: '5-neobychnyh-postroek-v-barselone',
        badge: 'Идеи для поездок',
        title: 'RU title',
        excerpt: 'RU excerpt',
        lead: 'RU lead',
        publishedAt: '2026-05-31T20:00:18.441Z',
        date: '31 мая 2026',
      },
      t,
      'es',
    )
    assert.equal(localized.badge, 'Ideas de viaje')
    assert.equal(localized.title, '5 edificios inusuales en Barcelona')
    assert.equal(localized.excerpt, 'Excerpt ES')
    assert.equal(localized.lead, 'Lead ES')
    assert.notEqual(localized.date, '31 мая 2026')
  })

  it('keeps unknown articles but still formats date', () => {
    const t = (key) => key
    const localized = localizeNewsArticle(
      {
        slug: 'unknown-slug',
        badge: 'Custom',
        title: 'Hello',
        publishedAt: '2026-05-26T12:00:00.000Z',
        date: '26 мая 2026',
      },
      t,
      'en',
    )
    assert.equal(localized.title, 'Hello')
    assert.equal(localized.badge, 'Custom')
    assert.notEqual(localized.date, '26 мая 2026')
  })
})

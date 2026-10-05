/** Локализация карточек/мета новостей: badge, title, excerpt, lead, date. */

export const NEWS_ARTICLE_SLUG_KEYS = {
  '5-neobychnyh-postroek-v-barselone': 'barcelonaBuildings',
  '3-prichiny-kupit-dom-u-morya': 'seaHouse',
  'top-5-razvlecheniy-v-barselone-kak-provesti-nezabyvaemoe-vremya': 'barcelonaFun',
}

const BADGE_I18N_KEYS = {
  'Идеи для поездок': 'newsPage_static_heroBadge',
  '🌊 К морю!': 'newsPage_static_crimeaBadge',
  '🌊 К морю': 'newsPage_static_crimeaBadge',
}

function normalizeLang(language) {
  const raw = String(language || 'en').trim().toLowerCase()
  const base = raw.split(/[-_]/)[0] || 'en'
  if (['ru', 'en', 'de', 'es', 'fr', 'pl', 'sv'].includes(base)) return base
  return 'en'
}

export function formatNewsArticleDate(value, language) {
  if (value == null || value === '') return ''
  const date = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(date.getTime())) return String(value)
  const lang = normalizeLang(language)
  const locale =
    lang === 'en'
      ? 'en-GB'
      : lang === 'sv'
        ? 'sv-SE'
        : lang
  try {
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date)
  } catch {
    return date.toISOString().slice(0, 10)
  }
}

function resolveDate(article, language) {
  if (article?.publishedAt) return formatNewsArticleDate(article.publishedAt, language)
  if (article?.updatedAt) return formatNewsArticleDate(article.updatedAt, language)
  return article?.date || ''
}

function translateField(t, key, fallback) {
  if (!key) return fallback
  const value = t(key, { defaultValue: '' })
  if (!value || value === key) return fallback
  return value
}

/**
 * @param {object|null|undefined} article
 * @param {(key: string, options?: object) => string} t
 * @param {string} [language]
 */
export function localizeNewsArticle(article, t, language) {
  if (!article) return article
  const slugKey = NEWS_ARTICLE_SLUG_KEYS[article.slug]
  const badgeKey = BADGE_I18N_KEYS[String(article.badge || '').trim()]

  const title = slugKey
    ? translateField(t, `newsArticle_${slugKey}_title`, article.title)
    : article.title
  const excerpt = slugKey
    ? translateField(t, `newsArticle_${slugKey}_excerpt`, article.excerpt)
    : article.excerpt
  const lead = slugKey
    ? translateField(t, `newsArticle_${slugKey}_lead`, article.lead)
    : article.lead
  const badge = badgeKey
    ? translateField(t, badgeKey, article.badge)
    : article.badge

  return {
    ...article,
    badge,
    title,
    excerpt,
    lead,
    date: resolveDate(article, language),
  }
}

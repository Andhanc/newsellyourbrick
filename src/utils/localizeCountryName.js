import { countries } from '../data/countries.js'

export const SUPPORTED_COUNTRY_LOCALES = ['ru', 'en', 'de', 'es', 'fr', 'pl', 'sv']

/** Catalog / filter keys → ISO 3166-1 alpha-2 */
export const CATALOG_COUNTRY_ISO = {
  spain: 'ES',
  belarus: 'BY',
  uae: 'AE',
  russia: 'RU',
  portugal: 'PT',
  france: 'FR',
  germany: 'DE',
  italy: 'IT',
  turkey: 'TR',
  thailand: 'TH',
  uk: 'GB',
  usa: 'US',
  poland: 'PL',
  georgia: 'GE',
  armenia: 'AM',
  kazakhstan: 'KZ',
  cyprus: 'CY',
  austria: 'AT',
  greece: 'GR',
  montenegro: 'ME',
  serbia: 'RS',
  egypt: 'EG',
  israel: 'IL',
}

/** Phone dial-list composites stored as "A/B" Russian labels */
const COMPOSITE_PHONE_ISO = {
  'сша/канада': ['US', 'CA'],
  'россия/казахстан': ['RU', 'KZ'],
}

const displayNamesCache = new Map()
let russianNameToIso = null
let localizedNameToIso = null

export function normalizeCountryLocale(lang) {
  const base = String(lang || 'en')
    .split(/[-_]/)[0]
    .toLowerCase()
  return SUPPORTED_COUNTRY_LOCALES.includes(base) ? base : 'en'
}

function getDisplayNames(locale) {
  const key = normalizeCountryLocale(locale)
  let dn = displayNamesCache.get(key)
  if (!dn) {
    try {
      dn = new Intl.DisplayNames([key], { type: 'region' })
    } catch {
      dn = new Intl.DisplayNames(['en'], { type: 'region' })
    }
    displayNamesCache.set(key, dn)
  }
  return dn
}

function buildRussianNameIndex() {
  if (russianNameToIso) return russianNameToIso
  const map = new Map()
  for (const c of countries) {
    const key = String(c.name || '')
      .trim()
      .toLowerCase()
    if (key) map.set(key, c.code)
  }
  russianNameToIso = map
  return map
}

function buildLocalizedNameIndex() {
  if (localizedNameToIso) return localizedNameToIso
  const map = new Map()
  for (const c of countries) {
    for (const locale of SUPPORTED_COUNTRY_LOCALES) {
      try {
        const label = getDisplayNames(locale).of(c.code)
        if (label) {
          const key = label.trim().toLowerCase()
          if (!map.has(key)) map.set(key, c.code)
        }
      } catch {
        /* ignore unsupported */
      }
    }
    const ru = String(c.name || '')
      .trim()
      .toLowerCase()
    if (ru && !map.has(ru)) map.set(ru, c.code)
  }
  localizedNameToIso = map
  return map
}

/**
 * Resolve ISO alpha-2 from catalog key, ISO code, Russian or localized name.
 */
export function resolveCountryIso(value) {
  if (value == null) return null
  const raw = String(value).trim()
  if (!raw) return null

  if (/^[a-zA-Z]{2}$/.test(raw)) {
    const code = raw.toUpperCase()
    if (countries.some((c) => c.code === code)) return code
  }

  const lower = raw.toLowerCase()
  if (CATALOG_COUNTRY_ISO[lower]) return CATALOG_COUNTRY_ISO[lower]

  const byRu = buildRussianNameIndex().get(lower)
  if (byRu) return byRu

  const byLocalized = buildLocalizedNameIndex().get(lower)
  if (byLocalized) return byLocalized

  return null
}

function displayNameForIso(iso, locale) {
  if (!iso) return ''
  try {
    const label = getDisplayNames(locale).of(iso)
    if (label) return label
  } catch {
    /* fall through */
  }
  return countries.find((c) => c.code === iso)?.name || iso
}

/**
 * Localized country label for UI. Accepts ISO, catalog key, RU or any known localized name.
 * Composite phone labels like "США/Канада" are localized per part.
 */
export function getLocalizedCountryName(value, locale = 'en') {
  if (value == null) return ''
  const raw = String(value).trim()
  if (!raw) return ''

  const composite = COMPOSITE_PHONE_ISO[raw.toLowerCase()]
  if (composite) {
    return composite.map((iso) => displayNameForIso(iso, locale)).join('/')
  }

  if (raw.includes('/') && !resolveCountryIso(raw)) {
    const parts = raw.split('/').map((p) => p.trim()).filter(Boolean)
    if (parts.length > 1) {
      return parts.map((part) => getLocalizedCountryName(part, locale)).join('/')
    }
  }

  const iso = resolveCountryIso(raw)
  if (iso) return displayNameForIso(iso, locale)
  return raw
}

/** Prefer catalog key; fall back to stored label. */
export function getLocalizedCountryLabelFromOption(option, locale = 'en') {
  if (!option) return ''
  const fromKey = option.key ? getLocalizedCountryName(option.key, locale) : ''
  if (fromKey && fromKey !== option.key) return fromKey
  if (option.label) return getLocalizedCountryName(option.label, locale) || option.label
  return option.key || ''
}

export function localizeLocationCountryOptions(options = [], locale = 'en') {
  return (options || []).map((opt) => ({
    ...opt,
    label: getLocalizedCountryLabelFromOption(opt, locale),
  }))
}

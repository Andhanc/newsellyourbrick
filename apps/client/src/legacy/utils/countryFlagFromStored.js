import { countries as countryList } from '../components/CountrySelect'

const LOCALES = ['ru', 'en', 'de', 'es', 'fr', 'sv']

/** Флаг из двухбуквенного кода ISO 3166-1 alpha-2 (региональные индикаторы Unicode) */
export function flagEmojiFromAlpha2(code) {
  if (!code || String(code).length !== 2) return null
  const upper = String(code).toUpperCase()
  if (!/^[A-Z]{2}$/.test(upper)) return null
  const A = 0x1f1e6
  const chars = [...upper].map((ch) => A + (ch.charCodeAt(0) - 0x41))
  try {
    return String.fromCodePoint(...chars)
  } catch {
    return null
  }
}

let localizedNameCache = null

function buildLocalizedNameCache() {
  if (localizedNameCache) return localizedNameCache
  const map = new Map()
  for (const c of countryList) {
    for (const locale of LOCALES) {
      try {
        const dn = new Intl.DisplayNames(locale, { type: 'region' })
        const label = dn.of(c.code)
        if (label && typeof label === 'string') {
          const key = label.trim().toLowerCase()
          if (!map.has(key)) map.set(key, c.flag)
        }
      } catch {
        /* locale unsupported */
      }
    }
    const ruKey = (c.name || '').trim().toLowerCase()
    if (ruKey) map.set(ruKey, c.flag)
  }
  localizedNameCache = map
  return map
}

/**
 * Строка страны из профиля (users.country): русское имя, локализованное имя, код ISO2.
 */
export function flagEmojiForStoredCountry(country) {
  if (country == null) return null
  const s = String(country).trim()
  if (!s) return null

  const exact = countryList.find((c) => c.name === s)
  if (exact?.flag) return exact.flag

  const lower = s.toLowerCase()
  const byNameCi = countryList.find((c) => c.name.toLowerCase() === lower)
  if (byNameCi?.flag) return byNameCi.flag

  if (/^[a-zA-Z]{2}$/.test(s)) {
    const code = s.toUpperCase()
    const byCode = countryList.find((c) => c.code === code)
    if (byCode?.flag) return byCode.flag
    const fromIso = flagEmojiFromAlpha2(code)
    if (fromIso) return fromIso
  }

  const cache = buildLocalizedNameCache()
  const flag = cache.get(lower)
  if (flag) return flag

  return null
}

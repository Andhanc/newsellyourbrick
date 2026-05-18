const COUNTRY_ALIASES = {
  spain: ['spain', 'españa', 'espana', 'испания'],
  belarus: ['belarus', 'беларусь', 'белоруссия', 'by'],
  uae: [
    'uae',
    'united arab emirates',
    'оаэ',
    'эмираты',
    'emirates',
    'объединенные арабские эмираты',
    'united arab emirate',
  ],
  russia: ['russia', 'россия', 'rf', 'рф', 'rossiya'],
  portugal: ['portugal', 'португалия'],
  france: ['france', 'франция'],
  germany: ['germany', 'германия', 'deutschland'],
  italy: ['italy', 'италия', 'italia'],
  turkey: ['turkey', 'турция', 'türkiye', 'turkiye'],
  thailand: ['thailand', 'таиланд'],
  uk: ['uk', 'united kingdom', 'великобритания', 'england', 'англия'],
  usa: ['usa', 'united states', 'сша', 'america'],
  poland: ['poland', 'польша'],
  georgia: ['georgia', 'грузия'],
  armenia: ['armenia', 'армения'],
  kazakhstan: ['kazakhstan', 'казахстан'],
  cyprus: ['cyprus', 'кипр'],
  austria: ['austria', 'австрия'],
  greece: ['greece', 'греция'],
  montenegro: ['montenegro', 'черногория'],
  serbia: ['serbia', 'сербия'],
  egypt: ['egypt', 'египет'],
  israel: ['israel', 'израиль'],
}

const COUNTRY_LABELS = {
  spain: 'Испания',
  belarus: 'Беларусь',
  uae: 'ОАЭ',
  russia: 'Россия',
  portugal: 'Португалия',
  france: 'Франция',
  germany: 'Германия',
  italy: 'Италия',
  turkey: 'Турция',
  thailand: 'Таиланд',
  uk: 'Великобритания',
  usa: 'США',
  poland: 'Польша',
  georgia: 'Грузия',
  armenia: 'Армения',
  kazakhstan: 'Казахстан',
  cyprus: 'Кипр',
  austria: 'Австрия',
  greece: 'Греция',
  montenegro: 'Черногория',
  serbia: 'Сербия',
  egypt: 'Египет',
  israel: 'Израиль',
}

/** Известные города → страна (если в объявлении указан только город) */
const CITY_TO_COUNTRY = {
  dubai: { countryKey: 'uae', countryLabel: 'ОАЭ', regionKey: 'dubai', regionLabel: 'Дубай' },
  дубай: { countryKey: 'uae', countryLabel: 'ОАЭ', regionKey: 'dubai', regionLabel: 'Дубай' },
  дубаи: { countryKey: 'uae', countryLabel: 'ОАЭ', regionKey: 'dubai', regionLabel: 'Дубай' },
  'abu-dhabi': { countryKey: 'uae', countryLabel: 'ОАЭ', regionKey: 'abu-dhabi', regionLabel: 'Абу-Даби' },
  'abu dhabi': { countryKey: 'uae', countryLabel: 'ОАЭ', regionKey: 'abu-dhabi', regionLabel: 'Абу-Даби' },
  'абу-даби': { countryKey: 'uae', countryLabel: 'ОАЭ', regionKey: 'abu-dhabi', regionLabel: 'Абу-Даби' },
  sharjah: { countryKey: 'uae', countryLabel: 'ОАЭ', regionKey: 'sharjah', regionLabel: 'Шарджа' },
  шарджа: { countryKey: 'uae', countryLabel: 'ОАЭ', regionKey: 'sharjah', regionLabel: 'Шарджа' },
  barcelona: { countryKey: 'spain', countryLabel: 'Испания', regionKey: 'barcelona', regionLabel: 'Барселона' },
  барселона: { countryKey: 'spain', countryLabel: 'Испания', regionKey: 'barcelona', regionLabel: 'Барселона' },
  madrid: { countryKey: 'spain', countryLabel: 'Испания', regionKey: 'madrid', regionLabel: 'Мадрид' },
  мадрид: { countryKey: 'spain', countryLabel: 'Испания', regionKey: 'madrid', regionLabel: 'Мадрид' },
  moscow: { countryKey: 'russia', countryLabel: 'Россия', regionKey: 'moscow', regionLabel: 'Москва' },
  москва: { countryKey: 'russia', countryLabel: 'Россия', regionKey: 'moscow', regionLabel: 'Москва' },
  'saint-petersburg': {
    countryKey: 'russia',
    countryLabel: 'Россия',
    regionKey: 'saint-petersburg',
    regionLabel: 'Санкт-Петербург',
  },
  'санкт-петербург': {
    countryKey: 'russia',
    countryLabel: 'Россия',
    regionKey: 'saint-petersburg',
    regionLabel: 'Санкт-Петербург',
  },
}

/** Канонические ключи городов (латиница + кириллица → один ключ) */
const REGION_CANONICAL = {
  barcelona: { label: 'Барселона', aliases: ['barcelona', 'барселона'] },
  madrid: { label: 'Мадрид', aliases: ['madrid', 'мадрид'] },
  moscow: { label: 'Москва', aliases: ['moscow', 'москва'] },
  'saint-petersburg': {
    label: 'Санкт-Петербург',
    aliases: ['saint-petersburg', 'sankt-peterburg', 'санкт-петербург', 'spb', 'петербург'],
  },
  dubai: { label: 'Дубай', aliases: ['dubai', 'дубай', 'дубаи'] },
  'abu-dhabi': { label: 'Абу-Даби', aliases: ['abu-dhabi', 'abu dhabi', 'абу-даби'] },
  sharjah: { label: 'Шарджа', aliases: ['sharjah', 'шарджа'] },
}

const STREET_MARKERS =
  /\b(ул\.?|улица|просп\.?|проспект|пер\.?|переулок|наб\.?|набережн|шоссе|бульвар|бул\.?|дом\b|кв\.?|квартира|str\.?|street|st\.?\b|ave\.?|avenue|road|rd\.?|lane|ln\.?|drive|dr\.?|boulevard|blvd|way|plaza|paseo|calle|carrer|via|rua|rambla|embankment)\b/i

const DISTRICT_MARKERS = /\b(округ|district|район|область|oblast|province|county|municipality)\b/i

export function normalizeLocationText(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

export function normalizeLocationKey(value = '') {
  const n = normalizeLocationText(value)
  if (!n) return ''
  return n.replace(/[^a-z0-9\u0400-\u04ff]+/gi, '-').replace(/^-|-$/g, '')
}

function aliasMatchesNormalized(alias, n) {
  if (!alias || !n) return false
  if (n === alias) return true
  if (alias.length < 4) return n === alias
  if (!n.includes(alias)) return false
  const idx = n.indexOf(alias)
  const before = idx > 0 ? n[idx - 1] : ' '
  const after = idx + alias.length < n.length ? n[idx + alias.length] : ' '
  const boundary = /[\s,./\-–—]/
  return boundary.test(before) && boundary.test(after)
}

export function matchCountryKey(raw = '') {
  const trimmed = String(raw || '').trim()
  if (looksLikeStreet(trimmed)) return ''

  const n = normalizeLocationText(trimmed)
  if (!n || /^\d+$/.test(n) || n.length < 2) return ''

  for (const [key, aliases] of Object.entries(COUNTRY_ALIASES)) {
    if (aliases.some((a) => aliasMatchesNormalized(a, n))) {
      return key
    }
  }
  return ''
}

/** Единый ключ региона для фильтра и списка (Барселона / Barcelona → barcelona) */
export function getCanonicalRegionKey(raw = '') {
  const trimmed = String(raw || '').trim()
  if (!trimmed) return ''

  const n = normalizeLocationText(trimmed)
  const key = normalizeLocationKey(trimmed)

  if (CITY_TO_COUNTRY[n]) return CITY_TO_COUNTRY[n].regionKey

  for (const [canonical, meta] of Object.entries(REGION_CANONICAL)) {
    const hit = [canonical, ...meta.aliases].some(
      (alias) => normalizeLocationText(alias) === n || normalizeLocationKey(alias) === key
    )
    if (hit) return canonical
  }

  return key
}

export function getCanonicalRegionLabel(regionKey = '', fallback = '') {
  const canonical = getCanonicalRegionKey(regionKey) || regionKey
  if (REGION_CANONICAL[canonical]?.label) return REGION_CANONICAL[canonical].label
  return fallback || regionKey
}

export function isRecognizedCountry(raw = '') {
  return Boolean(matchCountryKey(raw))
}

function looksLikeStreet(value = '') {
  const raw = String(value || '').trim()
  if (!raw) return true
  if (/^\d+[\s/-]*\d*$/.test(raw)) return true
  if (STREET_MARKERS.test(raw)) return true
  if (raw.length > 55) return true
  return false
}

function looksLikeDistrictOnly(value = '') {
  return DISTRICT_MARKERS.test(String(value || ''))
}

/** Явное поле country в БД: не улица и не число */
function isPlausibleCountryName(raw = '') {
  const s = String(raw || '').trim()
  if (s.length < 2 || s.length > 48) return false
  if (/^\d+$/.test(s)) return false
  if (looksLikeStreet(s)) return false
  if (looksLikeDistrictOnly(s)) return false
  if (!/[\p{L}]/u.test(s)) return false
  return true
}

export function isValidCityLabel(value = '') {
  const raw = String(value || '').trim()
  if (!raw || raw.length < 2) return false
  if (/^\d+$/.test(raw)) return false
  if (matchCountryKey(raw)) return false
  if (looksLikeStreet(raw)) return false
  if (looksLikeDistrictOnly(raw)) return false
  return true
}

function resolveCountry(raw = '') {
  const trimmed = String(raw || '').trim()
  if (!trimmed || looksLikeStreet(trimmed)) return { countryKey: '', countryLabel: '' }

  const aliasKey = matchCountryKey(trimmed)
  if (aliasKey) {
    return {
      countryKey: aliasKey,
      countryLabel: COUNTRY_LABELS[aliasKey] || trimmed,
    }
  }

  if (isPlausibleCountryName(trimmed)) {
    return {
      countryKey: normalizeLocationKey(trimmed),
      countryLabel: trimmed,
    }
  }

  return { countryKey: '', countryLabel: '' }
}

function pickCityFromParts(parts = []) {
  for (const part of parts) {
    if (isValidCityLabel(part)) return part.trim()
  }
  return ''
}

function parseLocationString(location = '') {
  const parts = String(location || '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)

  if (!parts.length) return { countryKey: '', countryLabel: '', city: '' }

  const firstResolved = resolveCountry(parts[0])
  const lastResolved = resolveCountry(parts[parts.length - 1])

  const firstCountry = looksLikeStreet(parts[0]) ? { countryKey: '', countryLabel: '' } : firstResolved
  const lastCountry = looksLikeStreet(parts[parts.length - 1])
    ? { countryKey: '', countryLabel: '' }
    : lastResolved

  if (parts.length >= 2 && firstCountry.countryKey) {
    return {
      ...firstCountry,
      city: pickCityFromParts(parts.slice(1)),
    }
  }

  if (parts.length >= 2 && lastCountry.countryKey) {
    return {
      ...lastCountry,
      city: pickCityFromParts(parts.slice(0, -1)),
    }
  }

  if (parts.length === 1) {
    const single = normalizeLocationText(parts[0])
    if (CITY_TO_COUNTRY[single]) {
      return { ...CITY_TO_COUNTRY[single], city: CITY_TO_COUNTRY[single].regionLabel }
    }
    if (lastResolved.countryKey) {
      return { ...lastResolved, city: '' }
    }
    if (isValidCityLabel(parts[0])) {
      return { countryKey: '', countryLabel: '', city: parts[0] }
    }
  }

  return { countryKey: '', countryLabel: '', city: '' }
}

function resolveCityAlias(cityRaw = '') {
  const norm = normalizeLocationText(cityRaw)
  if (CITY_TO_COUNTRY[norm]) return CITY_TO_COUNTRY[norm]
  const key = normalizeLocationKey(cityRaw)
  return Object.values(CITY_TO_COUNTRY).find((c) => c.regionKey === key) || null
}

/**
 * Разбор адреса одного объявления (для фильтрации и агрегации).
 * @param {{ country?: string, city?: string, location?: string }} prop
 */
export function parsePropertyLocation(prop) {
  if (!prop) return null

  let countryRaw = String(prop.country || '').trim()
  let cityRaw = String(prop.city || '').trim()
  const location = String(prop.location || '').trim()

  if (countryRaw && !resolveCountry(countryRaw).countryKey) countryRaw = ''
  if (cityRaw && !isValidCityLabel(cityRaw)) cityRaw = ''

  const countryFromField = resolveCountry(countryRaw)
  if (countryFromField.countryKey && cityRaw) {
    const regionKey = getCanonicalRegionKey(cityRaw)
    return {
      countryKey: countryFromField.countryKey,
      countryLabel: countryFromField.countryLabel,
      regionKey,
      regionLabel: getCanonicalRegionLabel(regionKey, cityRaw),
    }
  }

  if (countryFromField.countryKey && !cityRaw) {
    return {
      countryKey: countryFromField.countryKey,
      countryLabel: countryFromField.countryLabel,
      regionKey: '',
      regionLabel: '',
    }
  }

  if (location) {
    const fromLoc = parseLocationString(location)
    if (!countryRaw && fromLoc.countryKey) {
      countryRaw = fromLoc.countryLabel || countryRaw
    }
    if (!cityRaw && fromLoc.city) {
      cityRaw = fromLoc.city
    }
    const locNorm = normalizeLocationText(location)
    if (CITY_TO_COUNTRY[locNorm]) {
      const c = CITY_TO_COUNTRY[locNorm]
      return {
        countryKey: c.countryKey,
        countryLabel: c.countryLabel,
        regionKey: c.regionKey,
        regionLabel: c.regionLabel,
      }
    }
  }

  const cityAlias = cityRaw ? resolveCityAlias(cityRaw) : null
  if (cityAlias) {
    return {
      countryKey: cityAlias.countryKey,
      countryLabel: cityAlias.countryLabel,
      regionKey: cityAlias.regionKey,
      regionLabel: cityAlias.regionLabel,
    }
  }

  const country = resolveCountry(countryRaw)
  if (!country.countryKey) return null

  const regionKey = cityRaw ? getCanonicalRegionKey(cityRaw) : ''
  const regionLabel = cityRaw ? getCanonicalRegionLabel(regionKey, cityRaw) : ''

  return {
    countryKey: country.countryKey,
    countryLabel: country.countryLabel,
    regionKey,
    regionLabel,
  }
}

/**
 * Страны и города только из переданных объектов (есть объект → есть пункт в списке).
 */
export function buildLocationOptionsFromProperties(properties = []) {
  const countriesMap = new Map()

  for (const prop of properties) {
    const parsed = parsePropertyLocation(prop)
    if (!parsed?.countryKey) continue

    if (!countriesMap.has(parsed.countryKey)) {
      countriesMap.set(parsed.countryKey, {
        key: parsed.countryKey,
        label: parsed.countryLabel,
        propertyCount: 0,
        regions: new Map(),
      })
    }

    const country = countriesMap.get(parsed.countryKey)
    country.propertyCount += 1

    if (parsed.regionKey && parsed.regionLabel && isValidCityLabel(parsed.regionLabel)) {
      const regionKey = getCanonicalRegionKey(parsed.regionKey) || parsed.regionKey
      const regionLabel = getCanonicalRegionLabel(regionKey, parsed.regionLabel)
      const existing = country.regions.get(regionKey)
      if (existing) {
        existing.propertyCount += 1
      } else {
        country.regions.set(regionKey, {
          key: regionKey,
          label: regionLabel,
          propertyCount: 1,
        })
      }
    }
  }

  return Array.from(countriesMap.values())
    .filter((c) => c.propertyCount > 0)
    .map((c) => ({
      key: c.key,
      label: c.label,
      propertyCount: c.propertyCount,
      regions: Array.from(c.regions.values())
        .filter((r) => r.propertyCount > 0)
        .sort((a, b) => a.label.localeCompare(b.label, 'ru'))
        .map(({ key, label, propertyCount }) => ({ key, label, propertyCount })),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'ru'))
}

/** Максимальная цена объявления: цена, старт аукциона и текущая ставка */
export function getPropertyListPrice(prop) {
  const candidates = [
    prop?.price,
    prop?.currentBid,
    prop?.current_bid,
    prop?.auction_current_bid,
    prop?.auction_starting_price,
    prop?.auctionStartingPrice,
    prop?.starting_price,
    prop?.buy_now_price,
    prop?.buyNowPrice,
    prop?.max_bid,
    prop?.highest_bid,
  ]

  let max = 0
  for (const raw of candidates) {
    const n = Number(raw)
    if (Number.isFinite(n) && n > 0) max = Math.max(max, n)
  }
  return max
}

export function buildPriceRangeFromProperties(properties = []) {
  const prices = properties.map(getPropertyListPrice).filter((n) => n > 0)
  if (!prices.length) {
    return { min: 1, max: 1_000_000 }
  }
  const max = Math.ceil(Math.max(...prices))
  return { min: 1, max: Math.max(1, max) }
}

export function propertyMatchesLocationFilter(prop, { country = '', region = '' } = {}) {
  if (!country && !region) return true

  const parsed = parsePropertyLocation(prop)
  if (!parsed) return false

  if (country && parsed.countryKey !== country) return false
  if (region) {
    const propRegion = getCanonicalRegionKey(parsed.regionKey) || parsed.regionKey
    const filterRegion = getCanonicalRegionKey(region) || region
    if (propRegion !== filterRegion) return false
  }
  return true
}

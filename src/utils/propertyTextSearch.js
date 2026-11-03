import { pickCityForAuctionCalculator } from './propertyCalculatorMapping.js'
import { CATALOG_COUNTRY_ISO, getLocalizedCountryName, SUPPORTED_COUNTRY_LOCALES } from './localizeCountryName.js'
import { matchCountryKey, normalizeLocationText } from './propertySearchLocation.js'

/**
 * Формы жилья и подписи на всех языках интерфейса.
 * Поиск «квартира», «Wohnung» или «piso» находит один и тот же тип.
 */
const PROPERTY_FORM_GROUPS = [
  {
    types: ['apartment', 'apartments', 'flat', 'flats', 'properties_apartments', 'penthouse'],
    synonyms: [
      'квартира', 'квартиры', 'квартиру', 'квартире',
      'апартаменты', 'апартамент',
      'apartment', 'apartments', 'flat', 'flats', 'penthouse', 'пентхаус',
      'wohnung', 'wohnungen',
      'piso', 'pisos', 'apartamento', 'apartamentos', 'atico',
      'appartement', 'appartements',
      'mieszkanie', 'mieszkania',
      'lagenhet',
    ],
  },
  {
    types: ['villa', 'villas'],
    synonyms: ['вилла', 'виллы', 'виллу', 'villa', 'villas', 'willa'],
  },
  {
    types: ['house', 'houses', 'properties_houses', 'townhouse'],
    synonyms: [
      'дом', 'дома', 'доме', 'дому',
      'house', 'houses', 'haus', 'hauser',
      'casa', 'casas', 'maison', 'maisons',
      'hus', 'dom',
    ],
  },
  {
    types: ['townhouse'],
    synonyms: ['таунхаус', 'townhouse', 'reihenhaus', 'adosada', 'radhus'],
  },
  {
    types: ['land'],
    synonyms: ['земля', 'земли', 'участок', 'участка', 'land', 'plot', 'grundstuck', 'terreno', 'terrain', 'mark', 'dzialka'],
  },
  {
    types: ['commercial'],
    synonyms: [
      'коммерческая', 'коммерческая недвижимость',
      'commercial', 'gewerbe', 'gewerbeimmobilie',
      'inmueble comercial', 'immobilier commercial', 'kommersiell',
    ],
  },
]

const EXTRA_CITY_ALIASES = {
  marbella: ['marbella', 'марбелья', 'марбелье', 'марбельи'],
}

const TEXT_FIELDS = [
  'title',
  'name',
  'location',
  'address',
  'city',
  'country',
  'country_name',
  'region',
  'district',
  'municipality',
  'state',
  'province',
  'description',
  'short_description',
  'shortDescription',
  'about',
  'search_corpus',
  'additional_amenities',
]

const TYPE_FIELDS = ['property_type', 'propertyType', 'type', 'typeKey']

let countryLabels = null

function countryLabelIndex() {
  if (countryLabels) return countryLabels
  const labels = []
  for (const key of Object.keys(CATALOG_COUNTRY_ISO)) {
    for (const locale of SUPPORTED_COUNTRY_LOCALES) {
      const label = normalizeLocationText(getLocalizedCountryName(key, locale))
      if (label) labels.push({ iso: CATALOG_COUNTRY_ISO[key], label })
    }
  }
  countryLabels = labels
  return labels
}

function sameStem(left, right) {
  if (left === right) return true
  const min = Math.min(left.length, right.length)
  if (min < 4) return false
  const stem = Math.max(4, min - 1)
  return left.slice(0, stem) === right.slice(0, stem) && Math.abs(left.length - right.length) <= 3
}

function sourcesOf(entity) {
  const list = []
  const push = (value) => {
    if (value && typeof value === 'object' && !list.includes(value)) list.push(value)
  }
  push(entity)
  push(entity?.raw)
  push(entity?.property)
  push(entity?.originalProperty)
  return list
}

function addText(parts, value, depth = 0) {
  if (value == null || depth > 2) return
  if (typeof value === 'string' || typeof value === 'number') {
    const text = String(value).trim()
    if (text) parts.push(text)
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item) => addText(parts, item, depth + 1))
    return
  }
  if (typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      if (/description|title|name|text|body|lead/i.test(key)) addText(parts, nested, depth + 1)
    }
  }
}

function isoFromText(value) {
  const key = matchCountryKey(value)
  if (key && CATALOG_COUNTRY_ISO[key]) return CATALOG_COUNTRY_ISO[key]
  return null
}

function tokenCountryIso(token) {
  const direct = isoFromText(token)
  if (direct) return direct
  for (const { iso, label } of countryLabelIndex()) {
    if (sameStem(token, label)) return iso
  }
  return null
}

function propertyCountryIsos(sources) {
  const isos = new Set()
  for (const source of sources) {
    for (const field of ['country', 'country_name', 'location', 'address', 'city']) {
      const iso = isoFromText(source?.[field])
      if (iso) isos.add(iso)
    }
  }
  return isos
}

function extraCitySlug(value) {
  const normalized = normalizeLocationText(value)
  if (!normalized) return ''
  for (const [slug, names] of Object.entries(EXTRA_CITY_ALIASES)) {
    if (names.some((name) => {
      const alias = normalizeLocationText(name)
      return normalized === alias || normalized.includes(alias) || sameStem(normalized, alias)
    })) return slug
  }
  return ''
}

function citySlug(source) {
  if (!source) return ''
  const known = pickCityForAuctionCalculator({
    city: source.city,
    location: source.location || source.address,
    address: source.address,
    title: source.title,
    name: source.name,
  })
  if (known) return known
  return extraCitySlug(`${source.city || ''} ${source.location || ''} ${source.address || ''} ${source.title || ''} ${source.name || ''}`)
}

function formGroupsForStoredType(value) {
  const normalized = normalizeLocationText(value)
  if (!normalized) return []
  return PROPERTY_FORM_GROUPS.filter((group) =>
    group.types.includes(normalized) ||
    group.synonyms.some((synonym) => sameStem(normalized, normalizeLocationText(synonym))),
  )
}

function formGroupsForToken(token) {
  return PROPERTY_FORM_GROUPS.filter((group) =>
    group.synonyms.some((synonym) => sameStem(token, normalizeLocationText(synonym))),
  )
}

function inflected(word, token) {
  if (word === token) return true
  const min = Math.min(word.length, token.length)
  if (min < 5 || Math.abs(word.length - token.length) > 2) return false
  const stem = min - 1
  return word.slice(0, stem) === token.slice(0, stem)
}

function textHasToken(haystack, token) {
  if (!token || !haystack) return false
  const words = haystack.split(' ')
  if (token.length < 5) return words.some((word) => word === token)
  return words.some((word) => inflected(word, token))
}

function buildProfile(entity, extraText = '') {
  const sources = sourcesOf(entity)
  const parts = []
  const forms = new Set()
  for (const source of sources) {
    for (const field of TEXT_FIELDS) addText(parts, source[field])
    for (const key of Object.keys(source)) {
      if (/^description[_-]/i.test(key)) addText(parts, source[key])
    }
    for (const field of TYPE_FIELDS) {
      for (const group of formGroupsForStoredType(source[field])) forms.add(group)
    }
  }
  addText(parts, extraText)
  const primary = sources[0] || {}
  return {
    haystack: normalizeLocationText(parts.join(' ')),
    countryIsos: propertyCountryIsos(sources),
    citySlug: citySlug(primary) || sources.slice(1).map(citySlug).find(Boolean) || '',
    forms,
  }
}

function tokenMatches(profile, token) {
  if (textHasToken(profile.haystack, token)) return true
  const countryIso = tokenCountryIso(token)
  if (countryIso && profile.countryIsos.has(countryIso)) return true
  const slug = citySlug({ city: token, location: token, title: '', name: '' })
  if (slug && slug === profile.citySlug) return true
  const groups = formGroupsForToken(token)
  if (groups.some((group) => profile.forms.has(group))) return true
  return groups.some((group) =>
    group.synonyms.some((synonym) => textHasToken(profile.haystack, normalizeLocationText(synonym))),
  )
}

/** Пустой запрос подходит ко всем. Иначе каждое слово ищется в локации, форме жилья или описании. */
export function propertyMatchesTextSearch(entity, query = '', extraText = '') {
  const normalized = normalizeLocationText(query)
  if (!normalized) return true
  const tokens = normalized.split(' ').filter((token) => token.length >= 2)
  if (!tokens.length) return true
  const profile = buildProfile(entity, extraText)
  const phraseGroups = formGroupsForToken(normalized)
  if (phraseGroups.some((group) => profile.forms.has(group))) return true
  return tokens.every((token) => tokenMatches(profile, token))
}

export function filterPropertiesByTextSearch(properties = [], query = '', extraTextFor = null) {
  const normalized = String(query || '').trim()
  if (!normalized) return properties
  return properties.filter((property) =>
    propertyMatchesTextSearch(property, normalized, extraTextFor ? extraTextFor(property) : ''),
  )
}

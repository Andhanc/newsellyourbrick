/**
 * Воронка диалога: цель → страна → город → тип → бюджет при большом выборе → подборка.
 * Логика housetenerife, критерии и этапы — под SellYourBrick.
 */

import { detectInvestmentTimeline, expandBudgetBand, wantsEscalation } from './botCoreRules.js'
import {
  citiesForCountry,
  detectCatalogCity,
  detectCatalogCountry,
  formatCatalogCities,
  formatCatalogCountries,
  indexCatalogLocations,
  normalizeLocationText,
  parseLocationParts,
} from './catalogLocations.js'
import { isDebtListing, isShareListing } from './propertyMatcher.js'

const INVEST_PURPOSE_RE =
  /инвест|invest|inversi[oó]n|доход|аренд|rental|alquiler|под\s+сдач|сдачу|бизнес|pour\s+investir/i
const LIVING_PURPOSE_RE =
  /для жизни|для себя|для семьи|личн(?:ой|ая)?\s+жизн|переезд|relocate|live in|residen|vivir|para vivir|holiday home|segunda residencia|second home/i

const SPAIN_RE =
  /испан|spain|españa|espan|tenerife|тенерифе|barcelona|барселон|madrid|мадрид|marbella|марбель|valencia|валенс|malaga|малаг|ibiza|ибиц|аликанте|alicante|costa|коста/i
const DUBAI_RE =
  /дуба[еяйю]|dubai|uae|оаэ|emirates|эмират|marina|downtown|palm|jbr|jumeirah/i

const APARTMENT_RE = /квартир|апартамент|apart|piso|flat|студи/i
const VILLA_RE = /вилл|villa/i
const HOUSE_RE = /дом\b|house|townhouse|таунхаус|коттедж/i

const AUCTION_FORMAT_RE = /аукцион|торг|ставк|auction|subasta|bidding/i
const BUY_NOW_FORMAT_RE = /купить\s+сейчас|buy\s*now|фиксированн|без\s+аукцион/i
const SHARES_FORMAT_RE = /дол[ияю]|shares?|соинвест|фракцион|долев/i

export function detectPurposeKind(text) {
  const s = String(text || '')
  const invest = INVEST_PURPOSE_RE.test(s)
  const living = LIVING_PURPOSE_RE.test(s)
  if (invest && !living) return /аренд|rental|alquiler|под\s+сдач|сдачу/i.test(s) ? 'rental' : 'investment'
  if (living && !invest) return 'living'
  if (invest && living) return 'investment'
  return null
}

export function detectLocationPreference(text) {
  const s = String(text || '')
  const spain = SPAIN_RE.test(s)
  const dubai = DUBAI_RE.test(s)
  if (spain && !dubai) return { hasLocation: true, location: 'spain', label: 'Испания' }
  if (dubai && !spain) return { hasLocation: true, location: 'dubai', label: 'Дубай' }
  if (spain && dubai) return { hasLocation: true, location: 'both', label: 'Испания и Дубай' }
  return { hasLocation: false, location: null, label: '' }
}

export function detectPropertyTypePreference(text) {
  const s = String(text || '')
  const types = []
  if (APARTMENT_RE.test(s)) types.push('apartment')
  if (VILLA_RE.test(s)) types.push('villa')
  if (HOUSE_RE.test(s) && !VILLA_RE.test(s)) types.push('house')
  const label = types.includes('villa')
    ? 'вилла'
    : types.includes('apartment')
      ? 'квартира'
      : types.includes('house')
        ? 'дом'
        : ''
  return { hasType: types.length > 0, types, label }
}

function propertyTypeForItem(item) {
  const blob = [
    item?.property_type,
    item?.propertyType,
    item?.title,
    item?.name,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  if (/(apart|квартир|flat|студи|piso)/i.test(blob)) return 'apartment'
  if (/(villa|вилл)/i.test(blob)) return 'villa'
  if (/(house|дом|town|коттедж)/i.test(blob)) return 'house'
  return null
}

function availablePropertyTypes(catalog, lang = 'ru') {
  const found = new Set((catalog || []).map(propertyTypeForItem).filter(Boolean))
  const labels = {
    ru: { apartment: 'квартиры', house: 'дома', villa: 'виллы' },
    en: { apartment: 'apartments', house: 'houses', villa: 'villas' },
    es: { apartment: 'pisos', house: 'casas', villa: 'villas' },
  }
  const pack = labels[lang] || labels.ru
  return ['apartment', 'house', 'villa']
    .filter((type) => found.has(type))
    .map((type) => ({ type, label: pack[type] }))
}

function resolveCountry(userMsgs, preferences, index) {
  const fromPreference = detectCatalogCountry(
    String(preferences.country || ''),
    index,
    { hasCountry: false, countryKey: null, countryLabel: '' },
  )
  let result = fromPreference
  for (const message of userMsgs || []) {
    result = detectCatalogCountry(message.text, index, result)
  }
  if (result.hasCountry) return result

  const allText = (userMsgs || []).map((message) => message.text).join(' ')
  const matchingCountries = new Map()
  for (const city of index?.cities || []) {
    if (city.aliases?.some((alias) => alias && normalizeLocationText(allText).includes(alias))) {
      matchingCountries.set(city.countryKey, city.countryLabel)
    }
  }
  if (matchingCountries.size === 1) {
    const [[countryKey, countryLabel]] = matchingCountries
    return { hasCountry: true, countryKey, countryLabel, inferredFromCity: true }
  }
  return result
}

function resolveCity(userMsgs, preferences, index, countryKey) {
  const fromPreference = detectCatalogCity(
    String(preferences.city || preferences.location || ''),
    index,
    countryKey,
    { hasCity: false, cityKey: null, cityLabel: '' },
  )
  let result = fromPreference
  for (const message of userMsgs || []) {
    result = detectCatalogCity(message.text, index, countryKey, result)
  }
  return result
}

export function detectDealFormat(text) {
  const s = String(text || '')
  if (SHARES_FORMAT_RE.test(s)) return { hasFormat: true, format: 'shares', label: 'доли' }
  if (BUY_NOW_FORMAT_RE.test(s)) return { hasFormat: true, format: 'buy_now', label: 'купить сейчас' }
  if (AUCTION_FORMAT_RE.test(s) && !/как\s+работ/i.test(s)) {
    return { hasFormat: true, format: 'auction', label: 'аукцион' }
  }
  return { hasFormat: false, format: null, label: '' }
}

function wordToNumber(word) {
  const map = {
    одного: 1,
    один: 1,
    одна: 1,
    one: 1,
    un: 1,
    una: 1,
    двух: 2,
    two: 2,
    dos: 2,
    трёх: 3,
    трех: 3,
    three: 3,
    tres: 3,
    четырех: 4,
    четырёх: 4,
    four: 4,
    пяти: 5,
    five: 5,
  }
  return map[String(word || '').toLowerCase()] ?? null
}

function parseBudgetNumber(numStr, unit) {
  const v = parseFloat(String(numStr || '').replace(',', '.'))
  if (!Number.isFinite(v) || v <= 0) return null
  const u = String(unit || '').toLowerCase()
  if (/млн|миллион|million|millon/.test(u)) return Math.round(v * 1_000_000)
  if (/тыс|thousand|^k$|^к$/.test(u)) return Math.round(v * 1000)
  if (v >= 1000) return Math.round(v)
  if (v >= 10) return Math.round(v * 1000)
  return Math.round(v * 1_000_000)
}

export function extractBudgetRange(text) {
  const s = String(text || '')
    .toLowerCase()
    .replace(/(\d)\s+(\d{3})\b/g, '$1$2')
    .replace(/\s+/g, ' ')
    .trim()

  let minPrice = null
  let maxPrice = null

  const take = (num, unit, mode) => {
    const v = parseBudgetNumber(num, unit)
    if (v == null) return
    if (mode === 'max') maxPrice = maxPrice == null ? v : Math.max(maxPrice, v)
    else if (mode === 'min') minPrice = minPrice == null ? v : Math.min(minPrice, v)
    else {
      maxPrice = v
      minPrice = null
    }
  }

  const range = s.match(
    /(?:от|from|desde)\s*(\d+(?:[.,]\d+)?)\s*(?:до|–|-|to|hasta)\s*(\d+(?:[.,]\d+)?)\s*(млн|миллион[а-яё]*|million[a-z]*|тыс[а-яё]*|thousand|k|к)?/i,
  )
  if (range) {
    take(range[1], range[3], 'min')
    take(range[2], range[3], 'max')
    return { minPrice, maxPrice }
  }

  const upToAll = [
    ...s.matchAll(
      /(?:до|макс(?:имум)?|не\s*более|up\s*to|hasta|under|below)\s*(\d+(?:[.,]\d+)?)\s*(млн|миллион[а-яё]*|million[a-z]*|тыс[а-яё]*|thousand|k|к)?/gi,
    ),
  ]
  if (upToAll.length) {
    const last = upToAll[upToAll.length - 1]
    take(last[1], last[2], 'max')
  }

  const fromAll = [
    ...s.matchAll(
      /(?:от|from|минимум|desde|starting)\s*(\d+(?:[.,]\d+)?)\s*(млн|миллион[а-яё]*|million[a-z]*|тыс[а-яё]*|k|к)?/gi,
    ),
  ]
  if (fromAll.length) {
    const last = fromAll[fromAll.length - 1]
    take(last[1], last[2], 'min')
  }

  const around = s.match(
    /(?:около|примерно|в\s+районе|around|about|cerca\s+de)\s*(\d+(?:[.,]\d+)?)\s*(млн|миллион[а-яё]*|million[a-z]*|тыс[а-яё]*|k|к)?/i,
  )
  if (around) take(around[1], around[2], 'target')

  const withUnit = [
    ...s.matchAll(
      /(\d+(?:[.,]\d+)?)\s*(млн|миллион[а-яё]*|million[a-z]*|тыс[а-яё]*|thousand|k|к)(?![а-яёa-z])/gi,
    ),
  ]
  if (withUnit.length && maxPrice == null && minPrice == null) {
    const m = withUnit[withUnit.length - 1]
    take(m[1], m[2], 'target')
  }

  if (minPrice == null && maxPrice == null) {
    const bare = [...s.matchAll(/\b(\d{1,3}(?:[.,\s]\d{3})+|\d{5,7})\b/g)]
    if (bare.length) {
      const digits = bare[bare.length - 1][1].replace(/[^\d]/g, '')
      const v = parseInt(digits, 10)
      if (Number.isFinite(v) && v >= 50000) maxPrice = v
    }
  }

  const wordMillions = s.match(
    /(?:до|около|бюджет|budget)?\s*(одного|один|двух|трёх|трех|четырех|четырёх|пяти|one|two|three|four|five|un|dos|tres)\s+(миллион\w*|million\w*)/i,
  )
  if (wordMillions && maxPrice == null && minPrice == null) {
    const n = wordToNumber(wordMillions[1])
    if (n != null) maxPrice = n * 1_000_000
  }

  if (minPrice == null && maxPrice == null) {
    if (
      /(?:бюджет|инвестиц|investment).{0,12}(?:миллион|million|млн)/i.test(s) ||
      /(?:миллион|million)\s*(?:€|eur|евро)/i.test(s)
    ) {
      maxPrice = 1_000_000
    }
  }

  return { minPrice, maxPrice }
}

export function wantsIgnoreBudget(text) {
  return /любой\s+бюджет|любой\s+цен|кроме\s+цен|без\s+(?:учёта|учета|лимита)\s+цен|any\s+price|any\s+budget|regardless\s+of\s+(?:the\s+)?price/i.test(
    String(text || ''),
  )
}

function budgetHasSignal(text, budget) {
  if (!text) return false
  if (budget?.minPrice != null || budget?.maxPrice != null) {
    return /бюджет|€|eur|евро|тыс|млн|миллион|thousand|million|k\b|инвест/i.test(text)
  }
  return false
}

function resolveEffectiveBudget(history, allUserText, lastUser) {
  const last = extractBudgetRange(lastUser)
  if (last.minPrice != null || last.maxPrice != null) return last
  for (const message of [...(history || [])].reverse()) {
    if (message?.sender !== 'user') continue
    const budget = extractBudgetRange(message.text)
    if (budget.minPrice != null || budget.maxPrice != null) return budget
  }
  return extractBudgetRange(allUserText)
}

function detectRooms(text) {
  const match = String(text || '').match(/(\d+)\s*(?:комнат|к\.?\s*кв|room|bed)/i)
  if (!match) return null
  const rooms = parseInt(match[1], 10)
  return Number.isFinite(rooms) && rooms > 0 ? rooms : null
}

export function analyzeConversation(history, lang = 'ru', preferences = {}, options = {}) {
  const userMsgs = (history || []).filter((m) => m.sender === 'user')
  const allUserText = userMsgs.map((m) => m.text).join('\n')
  const lastUser = userMsgs[userMsgs.length - 1]?.text || ''
  const catalog = options.catalog || []

  let purposeKind = detectPurposeKind(lastUser) || detectPurposeKind(allUserText)
  if (!purposeKind && preferences.purpose) {
    const pref = String(preferences.purpose).toLowerCase()
    if (pref.includes('инвест')) purposeKind = 'investment'
    else if (pref.includes('сдач') || pref.includes('аренд')) purposeKind = 'rental'
    else if (pref.includes('себя') || pref.includes('жизн')) purposeKind = 'living'
  }

  const hasPurpose = Boolean(purposeKind)
  const isInvestment = purposeKind === 'investment' || purposeKind === 'rental'
  const isLiving = purposeKind === 'living'
  const purposeCatalog =
    purposeKind === 'investment'
      ? catalog.filter((item) => isShareListing(item) || isDebtListing(item))
      : isLiving
        ? catalog.filter((item) => !isShareListing(item) && !isDebtListing(item))
        : catalog
  const lastBudget = extractBudgetRange(lastUser)
  const budgetFromPrefs =
    Number(preferences.budget) > 0
      ? { minPrice: null, maxPrice: Number(preferences.budget) }
      : { minPrice: null, maxPrice: null }
  const budget = resolveEffectiveBudget(history, allUserText, lastUser)
  const effectiveBudget =
    budget.minPrice != null || budget.maxPrice != null ? budget : budgetFromPrefs
  const ignoreBudget = wantsIgnoreBudget(lastUser) || wantsIgnoreBudget(allUserText)
  const lastHasBudget = budgetHasSignal(lastUser, lastBudget)
  const hasBudget =
    effectiveBudget.minPrice != null ||
    effectiveBudget.maxPrice != null ||
    ignoreBudget ||
    lastHasBudget

  const locationIndex = indexCatalogLocations(purposeCatalog)
  const countryPref = resolveCountry(userMsgs, preferences, locationIndex)
  const cityPref = countryPref.hasCountry
    ? resolveCity(userMsgs, preferences, locationIndex, countryPref.countryKey)
    : { hasCity: false, cityKey: null, cityLabel: '' }
  const availableCountries = locationIndex.countries.map((country) => country.label)
  const availableCities = countryPref.hasCountry
    ? citiesForCountry(locationIndex, countryPref.countryKey).map((city) => city.label)
    : []
  const locationCatalog = cityPref.hasCity
    ? purposeCatalog.filter((item) => {
        const parsed = parseLocationParts(item)
        return (
          normalizeLocationText(parsed.country) === countryPref.countryKey &&
          normalizeLocationText(parsed.city) === cityPref.cityKey
        )
      })
    : purposeCatalog
  const typeOptions = availablePropertyTypes(locationCatalog, lang)
  const typePrefLast = detectPropertyTypePreference(lastUser)
  const typePrefAll = detectPropertyTypePreference(allUserText)
  const typeFromPrefs = preferences.propertyType
    ? detectPropertyTypePreference(String(preferences.propertyType))
    : { hasType: false, types: [], label: '' }
  const requestedType = typePrefLast.hasType
    ? typePrefLast
    : typePrefAll.hasType
      ? typePrefAll
      : typeFromPrefs
  const typeIsAvailable =
    !requestedType.hasType ||
    requestedType.types.some((type) => typeOptions.some((option) => option.type === type))
  const typePref = typeIsAvailable
    ? requestedType
    : { hasType: false, types: [], label: '', unavailableLabel: requestedType.label }
  const matchingLocationCount = cityPref.hasCity
    ? locationCatalog.filter(
        (item) => !typePref.hasType || typePref.types.includes(propertyTypeForItem(item)),
      ).length
    : 0

  const formatLast = detectDealFormat(lastUser)
  const formatAll = detectDealFormat(allUserText)
  const dealFormat = formatLast.hasFormat ? formatLast : formatAll

  const rooms = detectRooms(lastUser) || detectRooms(allUserText) || Number(preferences.rooms) || null
  const hasTimeline = detectInvestmentTimeline(lastUser) || detectInvestmentTimeline(allUserText)
  const needsEscalation = wantsEscalation(lastUser)

  const lastUserLower = lastUser.toLowerCase()
  const pickingFromShortlist =
    /(?:понрав|нравит|выбира|беру|ближе|подходит|interested|like\s+this).{0,40}(?:вариант|объект|option|[1-5])/i.test(
      lastUserLower,
    )
  const wantsListings =
    !pickingFromShortlist &&
    /покаж|подбер|вариант|объект|каталог|рекоменд|найд|какие\s+есть|show me|options|listings|properties|mu[eé]strame|opciones/i.test(
      lastUserLower,
    )

  const preferInvestmentVehicles =
    purposeKind === 'investment' && dealFormat.format !== 'auction' && dealFormat.format !== 'buy_now'

  const needsBudget = matchingLocationCount > 5 && !hasBudget && !ignoreBudget
  const selectionReady = countryPref.hasCountry && cityPref.hasCity && typePref.hasType
  const readyForListings = hasPurpose && selectionReady && !needsBudget

  let stage
  if (!hasPurpose) {
    stage = 'NEED_PURPOSE'
  } else if (!countryPref.hasCountry) {
    stage = 'NEED_COUNTRY'
  } else if (!cityPref.hasCity) {
    stage = 'NEED_CITY'
  } else if (!typePref.hasType) {
    stage = 'NEED_PROPERTY_TYPE'
  } else if (needsBudget) {
    stage = 'NEED_BUDGET'
  } else {
    stage = 'SHOW_LISTINGS'
  }

  if (readyForListings) {
    stage = 'SHOW_LISTINGS'
  }

  if (needsEscalation) stage = 'OFFER_MANAGER_CALL'

  const priceTarget =
    hasBudget && !ignoreBudget ? expandBudgetBand(effectiveBudget) : null

  return {
    lang,
    stage,
    purposeKind,
    hasPurpose,
    isInvestment,
    isLiving,
    hasBudget,
    needsBudget,
    matchingLocationCount,
    ignoreBudget,
    budget: effectiveBudget,
    priceTarget,
    hasLocation: cityPref.hasCity,
    location: cityPref.cityKey || countryPref.countryKey || null,
    locationLabel: cityPref.cityLabel || countryPref.countryLabel || '',
    locationKind: cityPref.hasCity ? 'city' : countryPref.hasCountry ? 'country' : null,
    hasCountry: countryPref.hasCountry,
    countryKey: countryPref.countryKey || null,
    countryLabel: countryPref.countryLabel || '',
    hasCity: cityPref.hasCity,
    cityKey: cityPref.cityKey || null,
    cityLabel: cityPref.cityLabel || '',
    unknownLocation: null,
    availableCountries,
    availableCountriesLabel: formatCatalogCountries(locationIndex, lang),
    availableCities,
    availableCitiesLabel: formatCatalogCities(locationIndex, countryPref.countryKey, lang),
    availableLocations: availableCities,
    availableLocationsLabel: countryPref.hasCountry
      ? formatCatalogCities(locationIndex, countryPref.countryKey, lang)
      : formatCatalogCountries(locationIndex, lang),
    preferInvestmentVehicles,
    hasType: typePref.hasType,
    propertyTypes: typePref.types,
    propertyTypeLabel: typePref.label,
    unavailablePropertyType: typePref.unavailableLabel || null,
    availablePropertyTypes: typeOptions,
    availablePropertyTypesLabel: typeOptions.map((option) => option.label).join(', '),
    hasFormat: dealFormat.hasFormat,
    dealFormat: dealFormat.format,
    dealFormatLabel: dealFormat.label,
    rooms,
    hasTimeline,
    wantsListings,
    pickingFromShortlist,
    readyForListings: stage === 'SHOW_LISTINGS',
    needsEscalation,
    lastUser,
  }
}

export function dialogToPreferences(dialog, previous = {}) {
  const purpose =
    dialog.purposeKind === 'investment'
      ? 'инвестиции'
      : dialog.purposeKind === 'rental'
        ? 'под сдачу'
        : dialog.purposeKind === 'living'
          ? 'для себя'
          : previous.purpose ?? null

  const budget =
    dialog.budget?.maxPrice ??
    dialog.budget?.minPrice ??
    dialog.priceTarget?.anchor ??
    previous.budget ??
    null

  const country = dialog.countryLabel || previous.country || null
  const city = dialog.cityLabel || previous.city || null
  const location = city || country || previous.location || null

  const propertyType = dialog.propertyTypeLabel || previous.propertyType || null

  return {
    ...previous,
    purpose,
    budget,
    location,
    country,
    city,
    propertyType,
    rooms: dialog.rooms || previous.rooms || null,
    dealFormat: dialog.dealFormat || previous.dealFormat || null,
  }
}

export function formatCriteriaForPrompt(dialog) {
  const bits = []
  if (dialog.purposeKind) bits.push(`цель: ${dialog.purposeKind}`)
  if (dialog.hasBudget && dialog.priceTarget) {
    bits.push(
      `бюджет: €${dialog.priceTarget.floor.toLocaleString('en-US')}–€${dialog.priceTarget.ceiling.toLocaleString('en-US')} (±26%)`,
    )
  } else if (dialog.ignoreBudget) {
    bits.push('бюджет: любой')
  }
  if (dialog.countryLabel) bits.push(`страна: ${dialog.countryLabel}`)
  else if (dialog.availableCountriesLabel) bits.push(`страны каталога: ${dialog.availableCountriesLabel}`)
  if (dialog.cityLabel) bits.push(`город: ${dialog.cityLabel}`)
  else if (dialog.hasCountry) bits.push(`города в стране: ${dialog.availableCitiesLabel}`)
  if (dialog.preferInvestmentVehicles) bits.push('для инвестиций сразу доли и долги')
  if (dialog.propertyTypeLabel) bits.push(`тип: ${dialog.propertyTypeLabel}`)
  if (dialog.dealFormatLabel) bits.push(`формат: ${dialog.dealFormatLabel}`)
  if (dialog.rooms) bits.push(`комнат: ${dialog.rooms}`)
  return bits.length ? `**СОБРАННЫЕ КРИТЕРИИ (не переспрашивай):** ${bits.join('; ')}` : ''
}

export function formatStageInstruction(dialog, lang = 'ru') {
  const code = String(lang || 'ru').toLowerCase().slice(0, 2)
  const ru = {
    FIRST_CONTACT:
      'Поприветствуй коротко и спроси: инвестиции или недвижимость для себя. Объекты не предлагай.',
    NEED_PURPOSE:
      'Спроси: инвестиции или недвижимость для себя. Объясни кратко: инвестиции — доли и долги; для себя — аукцион и купить сейчас.',
    NEED_BUDGET: `В выбранном городе ${dialog.matchingLocationCount} объектов — спроси бюджет в евро, чтобы сузить выбор.`,
    NEED_LOCATION: 'Следуй отдельным этапам выбора страны и города.',
    NEED_PROPERTY_TYPE: `Спроси тип недвижимости и перечисли только доступные типы: ${dialog.availablePropertyTypesLabel || 'в текущем каталоге пока нет типов'}.`,
    NEED_COUNTRY: `Спроси страну и перечисли только страны с непроданными объектами выбранной ветки: ${dialog.availableCountriesLabel}.`,
    NEED_CITY: `Спроси город в стране ${dialog.countryLabel} и перечисли только города с подходящими объектами: ${dialog.availableCitiesLabel}.`,
    NEED_FORMAT: 'Мягко уточни формат: аукцион, купить сейчас или доли. Не читай лекцию.',
    SHOW_LISTINGS: dialog.preferInvestmentVehicles
      ? 'Клиент ищет инвестиции — сразу дай 3–5 объектов из долей и долгов каталога. Не выдумывай локации и id. Если нужной локации нет — скажи об этом и покажи доли/долги из доступных мест.'
      : 'Критерии готовы — дай 3–5 объектов из КАТАЛОГА в recommendations. Только локации, которые есть у нас. Не выдумывай id.',
    OFFER_MANAGER_CALL:
      'Предложи связь с менеджером. Не подменяй это новой подборкой.',
    REFINE: 'Уточни один недостающий критерий.',
  }
  const en = {
    FIRST_CONTACT: 'Greet briefly and ask: investment or a home for yourself. No listings.',
    NEED_PURPOSE: 'Ask: investment or a home for yourself. Explain the two catalog branches briefly.',
    NEED_BUDGET: `There are ${dialog.matchingLocationCount} listings in the selected city. Ask the EUR budget to narrow them down.`,
    NEED_LOCATION: 'Use separate country and city stages.',
    NEED_PROPERTY_TYPE: `Ask the property type and list only available types: ${dialog.availablePropertyTypesLabel || 'none in the current catalog'}.`,
    NEED_COUNTRY: `Ask the country and list only countries with unsold listings in the selected branch: ${dialog.availableCountriesLabel}.`,
    NEED_CITY: `Ask the city in ${dialog.countryLabel}; list only cities with matching listings: ${dialog.availableCitiesLabel}.`,
    NEED_FORMAT: 'Ask auction, buy now, or shares — briefly.',
    SHOW_LISTINGS:
      'Criteria are ready — return 3–5 catalog ids in recommendations. 1–2 sentences in text.',
    OFFER_MANAGER_CALL: 'Offer a manager. Do not replace it with a new shortlist.',
    REFINE: 'Ask one missing criterion.',
  }
  const es = {
    FIRST_CONTACT: 'Saluda y pregunta: inversión o vivienda para uso propio. Sin fichas.',
    NEED_PURPOSE: 'Pregunta: inversión o vivienda para uso propio. Explica brevemente las dos ramas.',
    NEED_BUDGET: `Hay ${dialog.matchingLocationCount} inmuebles en la ciudad elegida. Pregunta el presupuesto en euros.`,
    NEED_LOCATION: 'Usa etapas separadas para país y ciudad.',
    NEED_PROPERTY_TYPE: `Pregunta el tipo y muestra solo los disponibles: ${dialog.availablePropertyTypesLabel || 'ninguno en el catálogo actual'}.`,
    NEED_COUNTRY: `Pregunta el país y muestra solo países con inmuebles no vendidos de la rama elegida: ${dialog.availableCountriesLabel}.`,
    NEED_CITY: `Pregunta la ciudad en ${dialog.countryLabel} y muestra solo ciudades con inmuebles: ${dialog.availableCitiesLabel}.`,
    NEED_FORMAT: 'Pregunta subasta, compra ahora o participaciones.',
    SHOW_LISTINGS: 'Criterios listos — 3–5 id del catálogo en recommendations.',
    OFFER_MANAGER_CALL: 'Ofrece un gestor. No sustituyas con más fichas.',
    REFINE: 'Pide un criterio que falte.',
  }
  const pack = code === 'en' ? en : code === 'es' ? es : ru
  return pack[dialog.stage] || pack.REFINE
}

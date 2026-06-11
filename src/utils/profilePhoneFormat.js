import { AsYouType } from 'libphonenumber-js'
import { countries as countryList } from '../components/CountrySelect'
import { COUNTRY_CODES as phoneCountryCodes } from '../components/PhoneInput'

export function normalizeCountryNameForPhoneCode(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[().,'"`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function phoneDigits(s) {
  return (s || '').replace(/\D/g, '')
}

export function formatPhoneWithPlus(phone) {
  if (!phone) return ''
  const cleaned = phone.replace(/[^\d+]/g, '')
  if (cleaned && !cleaned.startsWith('+')) {
    return `+${cleaned}`
  }
  return cleaned
}

export function countryIsoFromStoredName(name) {
  const key = normalizeCountryNameForPhoneCode(name)
  if (!key) return null
  const hit = countryList.find((c) => normalizeCountryNameForPhoneCode(c.name) === key)
  return hit?.code || null
}

export function buildPhoneCodeByCountryName() {
  const map = new Map()
  for (const item of phoneCountryCodes) {
    const key = normalizeCountryNameForPhoneCode(item.name)
    if (!key || !item.code) continue
    if (!map.has(key)) map.set(key, `+${item.code}`)
  }
  map.set('сша', '+1')
  map.set('канада', '+1')
  map.set('сша канада', '+1')
  map.set('россия', '+7')
  map.set('казахстан', '+7')
  return map
}

export function buildCountryIsoByName() {
  const map = new Map()
  for (const country of countryList) {
    map.set(normalizeCountryNameForPhoneCode(country.name), country.code)
  }
  return map
}

export function formatPhoneAsYouType(raw, iso2) {
  const source = String(raw || '')
  const hasLeadingPlus = source.trim().startsWith('+')
  const digits = source.replace(/\D/g, '')
  if (!digits) return hasLeadingPlus ? '+' : ''

  if (hasLeadingPlus) {
    const formatter = new AsYouType()
    return formatter.input(`+${digits}`)
  }

  if (iso2) {
    const formatter = new AsYouType(iso2)
    return formatter.input(digits)
  }

  return digits
}

export function formatPhoneForDisplayByCountry(phone, countryName) {
  const base = formatPhoneWithPlus(phone)
  if (!base) return ''
  const iso2 = countryIsoFromStoredName(countryName)
  return formatPhoneAsYouType(base, iso2)
}

export function replacePhoneDialCodeByCountry({
  currentPhone,
  previousCountry,
  nextCountry,
  phoneCodeByCountryName,
}) {
  const nextDialCode =
    phoneCodeByCountryName.get(normalizeCountryNameForPhoneCode(nextCountry || '')) || ''
  if (!nextDialCode) return String(currentPhone || '')

  let localDigits = phoneDigits(currentPhone)
  if (!localDigits) return nextDialCode

  const previousDialCode =
    phoneCodeByCountryName.get(normalizeCountryNameForPhoneCode(previousCountry || '')) || ''
  const previousDialDigits = phoneDigits(previousDialCode)

  if (previousDialDigits && localDigits.startsWith(previousDialDigits)) {
    localDigits = localDigits.slice(previousDialDigits.length)
  } else {
    const allDialDigits = Array.from(phoneCodeByCountryName.values())
      .map((dial) => phoneDigits(dial))
      .filter(Boolean)
      .sort((a, b) => b.length - a.length)
    const detectedDial = allDialDigits.find((dial) => localDigits.startsWith(dial))
    if (detectedDial) localDigits = localDigits.slice(detectedDial.length)
  }

  const raw = localDigits ? `${nextDialCode} ${localDigits}` : `${nextDialCode}`
  const iso2 = countryIsoFromStoredName(nextCountry || '')
  return formatPhoneAsYouType(raw, iso2)
}

export function formatProfilePhoneInput(raw, countryName, countryIsoByName) {
  const iso2 =
    countryIsoByName.get(normalizeCountryNameForPhoneCode(countryName || '')) || null
  return formatPhoneAsYouType(raw, iso2)
}

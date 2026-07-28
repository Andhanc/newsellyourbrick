import { getCountryCallingCode } from 'libphonenumber-js'

function getPosition(timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('geolocation unavailable'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: timeoutMs,
      maximumAge: 10 * 60 * 1000,
    })
  })
}

async function reverseGeocodeIso(lat, lon) {
  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(
    lat,
  )}&longitude=${encodeURIComponent(lon)}&localityLanguage=en`
  const response = await fetch(url)
  if (!response.ok) return null
  const data = await response.json()
  const iso = String(data?.countryCode || '').trim().toUpperCase()
  return /^[A-Z]{2}$/.test(iso) ? iso : null
}

async function detectIsoByIp() {
  try {
    const response = await fetch('https://api.country.is/')
    if (!response.ok) return null
    const data = await response.json()
    const iso = String(data?.country || '').trim().toUpperCase()
    return /^[A-Z]{2}$/.test(iso) ? iso : null
  } catch {
    return null
  }
}

function detectIsoByLocale() {
  try {
    const locale =
      Intl.DateTimeFormat().resolvedOptions().locale ||
      (typeof navigator !== 'undefined' ? navigator.language : '') ||
      ''
    const match = String(locale).match(/[-_]([A-Za-z]{2})\b/)
    if (match) return match[1].toUpperCase()
  } catch {
    /* ignore */
  }
  return null
}

function callingCodeFromIso(iso) {
  if (!iso) return null
  try {
    return String(getCountryCallingCode(iso))
  } catch {
    return null
  }
}

/**
 * Detect ISO country + dial code.
 * Prefer GPS reverse-geocode, then IP, then browser locale.
 */
export async function detectPhoneDialByGeo() {
  let iso = null

  try {
    const position = await getPosition()
    iso = await reverseGeocodeIso(position.coords.latitude, position.coords.longitude)
  } catch {
    /* fall through */
  }

  if (!iso) iso = await detectIsoByIp()
  if (!iso) iso = detectIsoByLocale()

  const callingCode = callingCodeFromIso(iso)
  if (!iso || !callingCode) return null
  return { iso, callingCode }
}

export function pickPhoneCountryFromDial(countries, { iso, callingCode } = {}) {
  if (!Array.isArray(countries) || !callingCode) return null
  const matches = countries.filter((item) => item.code === callingCode)
  if (!matches.length) return null
  if (matches.length === 1) return matches[0]

  if (iso === 'KZ') return matches.find((item) => /казахстан/i.test(item.name)) || matches[0]
  if (iso === 'RU') return matches.find((item) => /россия/i.test(item.name)) || matches[0]
  if (iso === 'CA') return matches.find((item) => /канада|сша/i.test(item.name)) || matches[0]
  if (iso === 'US') return matches.find((item) => /сша/i.test(item.name)) || matches[0]
  return matches[0]
}

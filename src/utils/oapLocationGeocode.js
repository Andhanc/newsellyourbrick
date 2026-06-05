const NOMINATIM_HEADERS = { 'User-Agent': 'PropertyListingApp/1.0' }

export async function fetchNominatimFirst(query) {
  if (!query || !String(query).trim()) return null
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(String(query).trim())}&limit=1&accept-language=ru&addressdetails=1`,
      { headers: NOMINATIM_HEADERS }
    )
    if (!response.ok) return null
    const data = await response.json()
    return data[0] || null
  } catch {
    return null
  }
}

export async function fetchReverseGeocodeFields(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&accept-language=ru&addressdetails=1`
  const response = await fetch(url, { headers: NOMINATIM_HEADERS })
  if (!response.ok) return null
  const data = await response.json()
  const a = data.address || {}
  const country = a.country || ''
  const city = a.city || a.town || a.village || a.municipality || a.county || a.state || ''
  const road = a.road || a.street || ''
  const hn = a.house_number || ''
  const streetLine = [road, hn].filter(Boolean).join(', ')
  const display = typeof data.display_name === 'string' ? data.display_name : ''
  const shortAddr =
    streetLine ||
    display
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 2)
      .join(', ')
  const location =
    country && city && shortAddr ? `${country}, ${city}, ${shortAddr}` : display || shortAddr
  return {
    country,
    city,
    address: shortAddr,
    apartment: hn,
    location,
  }
}

export function formatShortAddress(suggestion) {
  const address = suggestion.address || {}
  const road = address.road || address.street || ''
  const suburb = address.suburb || ''
  const cityDistrict = address.city_district || ''
  const district = address.district || ''
  const neighbourhood = address.neighbourhood || ''
  const districtName = suburb || cityDistrict || district || neighbourhood || ''

  if (road) {
    const roadLower = road.toLowerCase().trim()
    const hasStreetPrefix =
      roadLower.startsWith('улица') || roadLower.startsWith('ул.') || roadLower.startsWith('ул ')
    let shortAddress = hasStreetPrefix ? road : `улица ${road}`
    if (districtName) shortAddress += `, ${districtName}`
    return shortAddress
  }

  const displayName = suggestion.display_name || ''
  const parts = displayName.split(',').map((p) => p.trim())
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].toLowerCase()
    if (
      part.includes('улица') ||
      part.includes('ул.') ||
      part.includes('ул ') ||
      part.includes('street') ||
      part.includes('проспект') ||
      part.includes('пр.')
    ) {
      return parts[i]
    }
  }
  return ''
}

export function formatShortAddressWithHouse(suggestion) {
  const address = suggestion.address || {}
  const country = address.country || ''
  const city = address.city || address.town || address.village || ''
  const houseNumber = address.house_number || ''
  const road = address.road || address.street || ''
  const parts = []
  if (country) parts.push(country)
  if (city) parts.push(city)
  if (road) {
    const roadLower = road.toLowerCase().trim()
    const hasStreetPrefix =
      roadLower.startsWith('улица') || roadLower.startsWith('ул.') || roadLower.startsWith('ул ')
    parts.push(hasStreetPrefix ? road : `улица ${road}`)
  }
  if (houseNumber) parts.push(houseNumber)
  if (parts.length > 0) return parts.join(', ')
  return suggestion.display_name || ''
}

export function getUniqueAddressSuggestions(suggestions) {
  const seenLabels = new Set()
  const unique = []
  suggestions.forEach((suggestion) => {
    const label = formatShortAddress(suggestion)
    if (!label || seenLabels.has(label)) return
    seenLabels.add(label)
    unique.push({ suggestion, label })
  })
  return unique
}

export async function searchCities(query, country = '') {
  if (!query || query.length < 2) return []
  let searchQuery = query.trim()
  if (country) searchQuery = `${query.trim()}, ${country}`
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=20&accept-language=ru&addressdetails=1`,
    { headers: NOMINATIM_HEADERS }
  )
  if (!response.ok) return []
  const data = await response.json()
  if (!data?.length) return []

  let cities = data.filter((item) => {
    const type = item.type || ''
    const classType = item.class || ''
    const importance = item.importance || 0
    const isCity =
      type === 'city' ||
      type === 'town' ||
      type === 'administrative' ||
      classType === 'place' ||
      type === 'village' ||
      type === 'hamlet' ||
      type === 'locality' ||
      type === 'suburb'
    return isCity && importance > 0.05
  })
  if (cities.length === 0) cities = data

  if (country && cities.length > 0) {
    const filtered = cities.filter((item) => {
      const itemCountry = item.address?.country || ''
      const displayName = item.display_name || ''
      return (
        itemCountry.toLowerCase().includes(country.toLowerCase()) ||
        country.toLowerCase().includes(itemCountry.toLowerCase()) ||
        displayName.toLowerCase().includes(country.toLowerCase())
      )
    })
    if (filtered.length > 0) cities = filtered
  }

  cities.sort((a, b) => (b.importance || 0) - (a.importance || 0))
  return cities.slice(0, 10)
}

export async function searchStreets(query, { city = '', country = '' } = {}) {
  if (!query || query.length < 2) return []
  let searchQuery = query.trim()
  if (city) {
    const cityName = city.split(',')[0].trim()
    searchQuery = `${query.trim()}, ${cityName}`
    if (country) searchQuery = `${query.trim()}, ${cityName}, ${country}`
  } else if (country) {
    searchQuery = `${query.trim()}, ${country}`
  }

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=10&accept-language=ru&addressdetails=1`,
    { headers: NOMINATIM_HEADERS }
  )
  if (!response.ok) return []
  const data = await response.json()

  let addresses = data
  if (city) {
    const cityName = city.split(',')[0].trim().toLowerCase()
    addresses = data.filter((item) => {
      const address = item.address || {}
      const displayName = item.display_name || ''
      const itemCity = (address.city || address.town || address.village || '').toLowerCase()
      return itemCity === cityName || displayName.toLowerCase().includes(cityName)
    })
    if (addresses.length === 0 && data.length > 0) addresses = data
  }

  addresses.sort((a, b) => (b.importance || 0) - (a.importance || 0))
  return addresses.slice(0, 10)
}

export async function searchHouses(houseValue, { street = '', city = '', country = '' } = {}) {
  if (!houseValue || !street || !city) return []
  const streetPart = street.split(',')[0].trim()
  const searchQuery = `${streetPart} ${houseValue}, ${city}, ${country}`.trim()
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=10&accept-language=ru&addressdetails=1`,
    { headers: NOMINATIM_HEADERS }
  )
  if (!response.ok) return []
  const data = await response.json()
  const houseRegex = new RegExp(`\\b${houseValue}\\b`, 'i')
  return data.filter((item) => {
    const address = item.address || {}
    const houseNumber = address.house_number || ''
    const displayName = item.display_name || ''
    if (houseNumber && houseNumber.toString().toLowerCase().includes(houseValue.toLowerCase())) {
      return true
    }
    if (houseRegex.test(displayName)) {
      const streetPartLower = streetPart.toLowerCase()
      const displayLower = displayName.toLowerCase()
      return (
        displayLower.startsWith(houseValue.toLowerCase()) ||
        (displayLower.includes(streetPartLower) && displayLower.includes(houseValue.toLowerCase()))
      )
    }
    return false
  })
}

export function buildFormattedLocation({ country, city, street, apartment }) {
  const tail = [street, apartment].filter(Boolean).join(', ')
  return country && city && tail ? `${country}, ${city}, ${tail}` : tail
}

export function validateLocationForm(form, addressSearch) {
  const errors = {}
  if (!form.country?.trim()) errors.country = 'Выберите страну'
  if (!form.city?.trim()) errors.city = 'Укажите город'
  const street = form.address?.trim() || addressSearch?.trim()
  if (!street) errors.address = 'Укажите улицу из подсказок'
  return errors
}

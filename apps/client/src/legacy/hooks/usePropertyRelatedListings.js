import { useEffect, useMemo, useState } from 'react'
import {
  buildCatalogCityPath,
  countryLabelToUrlSlug,
  cityLabelToUrlSlug,
  propertyTypeToCatalogPlural,
  resolvePropertyGeoFields,
} from '../utils/catalogGeoUrl'
import { getCanonicalRegionLabel } from '../utils/propertySearchLocation'
import { getApiBaseUrlSync } from '../utils/apiConfig'

/** Общий кэш — один запрос на geo-ключ, даже при двух монтированиях хука. */
const relatedListingsCache = new Map()
const relatedListingsInflight = new Map()

function buildRelatedListingsCacheKey(countrySlug, citySlug, typePlural, propertyId, limit) {
  return `${countrySlug}/${citySlug}/${typePlural || '_'}|${propertyId ?? '_'}|${limit}`
}

async function fetchRelatedListings({ countrySlug, citySlug, typePlural, propertyId, limit }) {
  const cacheKey = buildRelatedListingsCacheKey(countrySlug, citySlug, typePlural, propertyId, limit)
  if (relatedListingsCache.has(cacheKey)) {
    return relatedListingsCache.get(cacheKey)
  }

  const pending = relatedListingsInflight.get(cacheKey)
  if (pending) return pending

  const promise = (async () => {
    const apiBase = getApiBaseUrlSync().replace(/\/$/, '')
    let path = `${apiBase}/catalog/${countrySlug}/${citySlug}`
    if (typePlural) path += `/${typePlural}`

    const res = await fetch(path)
    if (!res.ok) {
      relatedListingsCache.set(cacheKey, [])
      return []
    }

    const json = await res.json()
    const rows = Array.isArray(json?.data?.properties) ? json.data.properties : []
    const filtered = rows
      .filter((row) => String(row.id) !== String(propertyId))
      .slice(0, limit)

    relatedListingsCache.set(cacheKey, filtered)
    return filtered
  })()
    .catch(() => {
      relatedListingsCache.set(cacheKey, [])
      return []
    })
    .finally(() => {
      relatedListingsInflight.delete(cacheKey)
    })

  relatedListingsInflight.set(cacheKey, promise)
  return promise
}

/**
 * Похожие объекты из geo-каталога (тот же город и тип).
 * @param {object | null} property
 * @param {{ limit?: number }} [options]
 */
export function usePropertyRelatedListings(property, { limit = 4 } = {}) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

  const geo = useMemo(() => {
    if (!property) return null
    const { country, city } = resolvePropertyGeoFields(property)
    const countrySlug = countryLabelToUrlSlug(country)
    const citySlug = cityLabelToUrlSlug(city)
    const typePlural = propertyTypeToCatalogPlural(property?.property_type)
    if (!countrySlug || !citySlug) return null

    const cityLabel = getCanonicalRegionLabel(citySlug, city)
    const cityCatalogPath = buildCatalogCityPath({ country, city, typePlural: null })
    const typeCatalogPath = typePlural
      ? buildCatalogCityPath({ country, city, typePlural })
      : cityCatalogPath

    return {
      countrySlug,
      citySlug,
      typePlural,
      cityLabel,
      cityCatalogPath,
      typeCatalogPath,
    }
  }, [
    property?.country,
    property?.city,
    property?.location,
    property?.property_type,
  ])

  const countrySlug = geo?.countrySlug
  const citySlug = geo?.citySlug
  const typePlural = geo?.typePlural
  const propertyId = property?.id

  useEffect(() => {
    if (!countrySlug || !citySlug) {
      setItems([])
      setLoading(false)
      return undefined
    }

    let cancelled = false
    const cacheKey = buildRelatedListingsCacheKey(countrySlug, citySlug, typePlural, propertyId, limit)
    const cached = relatedListingsCache.get(cacheKey)

    if (cached) {
      setItems(cached)
      setLoading(false)
      return undefined
    }

    setLoading(true)

    void fetchRelatedListings({ countrySlug, citySlug, typePlural, propertyId, limit })
      .then((rows) => {
        if (!cancelled) setItems(rows)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [countrySlug, citySlug, typePlural, propertyId, limit])

  return { items, loading, geo }
}

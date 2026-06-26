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
  }, [property])

  useEffect(() => {
    if (!geo?.countrySlug || !geo?.citySlug) {
      setItems([])
      setLoading(false)
      return undefined
    }

    let cancelled = false
    const controller = new AbortController()

    const load = async () => {
      setLoading(true)
      try {
        const apiBase = getApiBaseUrlSync().replace(/\/$/, '')
        let path = `${apiBase}/catalog/${geo.countrySlug}/${geo.citySlug}`
        if (geo.typePlural) path += `/${geo.typePlural}`

        const res = await fetch(path, { signal: controller.signal })
        if (!res.ok) {
          if (!cancelled) setItems([])
          return
        }
        const json = await res.json()
        const rows = Array.isArray(json?.data?.properties) ? json.data.properties : []
        const filtered = rows
          .filter((row) => String(row.id) !== String(property?.id))
          .slice(0, limit)
        if (!cancelled) setItems(filtered)
      } catch (err) {
        if (err?.name !== 'AbortError' && !cancelled) setItems([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [geo, property?.id, limit])

  return { items, loading, geo }
}

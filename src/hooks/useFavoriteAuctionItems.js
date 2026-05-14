import { useState, useEffect, useMemo, useCallback } from 'react'
import { properties } from '../data/properties'
import { MOCK_SECTIONS, readLocalFavoriteFlags } from '../data/favoriteMockLists'
import { usePropertyFavorites, PROPERTY_FAVORITES_CHANGED } from '../context/PropertyFavoritesContext'
import { favoriteCompositeKey } from '../utils/propertyFavoriteKey'
import { getApiBaseUrl } from '../utils/apiConfig'
import { getEffectiveAuctionEndTime } from '../utils/auctionReminderBounds'
import { normalizePropertyMediaFields } from '../utils/propertyImage'

export function useFavoriteAuctionItems() {
  const { favoriteRows } = usePropertyFavorites()
  const [catalogByKey, setCatalogByKey] = useState(() => new Map())
  const [catalogVersion, setCatalogVersion] = useState(0)
  const [mockTick, setMockTick] = useState(0)
  /** Первый запрос каталога с API — для скелетона карточек на «Понравилось» */
  const [catalogLoading, setCatalogLoading] = useState(true)

  const loadCatalog = useCallback(async () => {
    try {
      const apiBase = await getApiBaseUrl()
      const lang = (() => {
        try {
          if (typeof window === 'undefined') return 'ru'
          return (window.localStorage?.getItem('i18nextLng') || 'ru').split('-')[0] || 'ru'
        } catch {
          return 'ru'
        }
      })()
      const uidRaw = typeof window !== 'undefined' ? localStorage.getItem('userId') : null
      const viewerQ =
        uidRaw && /^\d+$/.test(String(uidRaw).trim())
          ? `&viewer_user_id=${encodeURIComponent(String(uidRaw).trim())}`
          : ''
      const [approvedRes, auctionsRes, debtsRes] = await Promise.all([
        fetch(`${apiBase}/properties/approved?lang=${lang}`),
        fetch(`${apiBase}/properties/auctions?lang=${lang}${viewerQ}`),
        fetch(`${apiBase}/properties/debts`),
      ])
      let approved = []
      let auctions = []
      let debts = []
      if (approvedRes.ok) {
        const json = await approvedRes.json()
        if (json?.success && Array.isArray(json.data)) approved = json.data
      }
      if (auctionsRes.ok) {
        const json = await auctionsRes.json()
        if (json?.success && Array.isArray(json.data)) auctions = json.data
      }
      if (debtsRes.ok) {
        const json = await debtsRes.json()
        if (json?.success && Array.isArray(json.data)) debts = json.data
      }
      const normalizeProperty = (prop, options = {}) => {
        const { forceAuction = null } = options
        const isAuction =
          forceAuction !== null ? forceAuction : (prop.isAuction === true || prop.is_auction === 1 || prop.is_auction === true)
        const priceNumber = prop.price != null && prop.price !== '' ? Number(prop.price) : 0
        const auctionStartingPrice =
          prop.auction_starting_price != null && prop.auction_starting_price !== ''
            ? Number(prop.auction_starting_price)
            : null
        const { image: normalizedImage, images: normalizedImages } = normalizePropertyMediaFields(prop)
        return {
          ...prop,
          isAuction,
          title: prop.title || prop.name || '',
          name: prop.name || prop.title || '',
          image: normalizedImage,
          images: normalizedImages,
          price: priceNumber,
          auction_starting_price: auctionStartingPrice,
          currentBid: prop.currentBid || prop.auction_current_bid || prop.auctionCurrentBid || null,
          endTime: getEffectiveAuctionEndTime(prop),
          beds: prop.beds || prop.rooms || prop.bedrooms || 0,
          baths: prop.baths || prop.bathrooms || 0,
          sqft: prop.sqft || prop.area || 0,
          area: prop.area || prop.sqft || 0,
          year_built: (() => {
            const y = prop.year_built ?? prop.yearBuilt
            if (y == null || y === '') return null
            const n = Number(y)
            return Number.isFinite(n) && n >= 1700 && n <= 2200 ? n : null
          })(),
          building_type: prop.building_type || prop.buildingType || null,
          description: prop.description || prop.description_ru || prop.description_en || '',
          latitude: prop.latitude ?? prop.lat ?? null,
          longitude: prop.longitude ?? prop.lng ?? null,
        }
      }
      const byKey = new Map()
      const add = (p, opts) => {
        const n = normalizeProperty(p, opts)
        if (n.id != null && n.source_table) {
          byKey.set(favoriteCompositeKey(n.id, n.source_table), n)
        }
      }
      approved.forEach((p) => add(p, {}))
      auctions.forEach((p) => add(p, { forceAuction: true }))
      debts.forEach((p) => add(p, { forceAuction: p?.is_auction === 1 || p?.is_auction === true }))
      setCatalogByKey(byKey)
      setCatalogVersion((v) => v + 1)
    } catch (e) {
      console.warn('useFavoriteAuctionItems loadCatalog:', e)
    } finally {
      setCatalogLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCatalog()
  }, [loadCatalog])

  useEffect(() => {
    const onCustom = () => setMockTick((x) => x + 1)
    window.addEventListener(PROPERTY_FAVORITES_CHANGED, onCustom)
    return () => window.removeEventListener(PROPERTY_FAVORITES_CHANGED, onCustom)
  }, [])

  const favoriteAuctions = useMemo(() => {
    const out = []
    const flags = readLocalFavoriteFlags()

    for (const row of favoriteRows) {
      if (row.property_id == null || row.property_table == null) continue
      const k = favoriteCompositeKey(row.property_id, row.property_table)
      const prop = catalogByKey.get(k)
      if (prop) {
        out.push({
          key: k,
          property: prop,
          mockCategory: null,
        })
      } else {
        out.push({
          key: k,
          property: {
            id: row.property_id,
            source_table: row.property_table,
            title: `Объект #${row.property_id}`,
            name: `Объект #${row.property_id}`,
            location: '',
              image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80',
          },
          mockCategory: null,
        })
      }
    }

    if (properties && Array.isArray(properties)) {
      properties.forEach((p) => {
        const k = `property:${p.id}`
        if (flags[`property-${p.id}`]) {
          out.push({
            key: k,
            property: { ...p, id: p.id },
            mockCategory: 'property',
          })
        }
      })
    }

    for (const { prefix, list, category } of MOCK_SECTIONS) {
      if (!list) continue
      list.forEach((p) => {
        const key = `${prefix}${p.id}`
        if (flags[key]) {
          out.push({
            key,
            property: { ...p },
            mockCategory: category,
          })
        }
      })
    }

    return out
  }, [favoriteRows, catalogByKey, catalogVersion, mockTick])

  return { favoriteAuctions, loadCatalog, catalogLoading }
}

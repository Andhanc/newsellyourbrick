import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Header from '../components/Header'
import PropertyTimer from '../components/PropertyTimer'
import { properties } from '../data/properties'
import { FiHeart, FiMapPin, FiArrowRight } from 'react-icons/fi'
import { MdBed, MdOutlineBathtub } from 'react-icons/md'
import { BiArea } from 'react-icons/bi'
import './Favorites.css'
import { usePropertyFavorites, PROPERTY_FAVORITES_CHANGED } from '../context/PropertyFavoritesContext'
import { favoriteCompositeKey, hasDbBackedProperty } from '../utils/propertyFavoriteKey'
import { getApiBaseUrl } from '../utils/apiConfig'

const recommendedProperties = [
  {
    id: 1,
    tag: 'House',
    name: 'Lakeshore Blvd West',
    location: '70 Washington Square South, New York, NY 10012, United States',
    price: 797500,
    image: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80',
    images: ['https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80'],
    beds: 2,
    baths: 2,
    sqft: 2000,
    isAuction: true,
    currentBid: 750000,
    endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000 + 58 * 60 * 1000 + 53 * 1000).toISOString(),
  },
  {
    id: 2,
    tag: 'House',
    name: 'Eleanor Pena Property',
    location: 'Costa Adeje, Tenerife, Spain',
    price: 1200,
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
    images: ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80'],
    beds: 2,
    baths: 1,
    sqft: 1500,
    isAuction: true,
    currentBid: 1100,
    endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000 + 58 * 60 * 1000 + 53 * 1000).toISOString(),
  },
]

const nearbyProperties = [
  {
    id: 1,
    tag: 'House',
    name: 'Bessie Cooper Property',
    location: 'Los Cristianos, Tenerife, Spain',
    price: 1000,
    image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80',
    images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80'],
    beds: 2,
    baths: 2,
    sqft: 1800,
    isAuction: true,
    currentBid: 950,
    endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000 + 58 * 60 * 1000 + 53 * 1000).toISOString(),
  },
  {
    id: 2,
    tag: 'Apartment',
    name: 'Darrell Steward Property',
    location: 'Puerto de la Cruz, Tenerife, Spain',
    price: 980,
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
    images: ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80'],
    beds: 1,
    baths: 1,
    sqft: 1200,
    isAuction: true,
    currentBid: 920,
    endTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000 + 11 * 60 * 60 * 1000 + 58 * 60 * 1000 + 53 * 1000).toISOString(),
  },
]

const apartmentsData = [
  {
    id: 1,
    name: 'Тропарево Парк',
    location: 'Costa Adeje, Tenerife',
    price: 8500372,
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80',
    images: ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80'],
    beds: 2,
    baths: 1,
    sqft: 850,
    isAuction: true,
    currentBid: 8000000,
    endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000 + 58 * 60 * 1000 + 53 * 1000).toISOString(),
  },
]

const villasData = [
  {
    id: 1,
    name: 'Villa Paradise',
    location: 'Costa Adeje, Tenerife',
    price: 12000000,
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
    images: ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80'],
    beds: 4,
    baths: 3,
    sqft: 2500,
    isAuction: true,
    currentBid: 11000000,
    endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000 + 58 * 60 * 1000 + 53 * 1000).toISOString(),
  },
]

const flatsData = [
  {
    id: 1,
    name: 'Современная квартира в центре',
    location: 'Москва, ул. Тверская, 15',
    price: 12500000,
    image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80',
    images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80'],
    isAuction: true,
    currentBid: 11800000,
    endTime: new Date(Date.now() + 92 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000 + 58 * 60 * 1000 + 53 * 1000).toISOString(),
    beds: 2,
    baths: 1,
    sqft: 65,
  },
]

const townhousesData = [
  {
    id: 1,
    name: 'Таунхаус в элитном поселке',
    location: 'Московская область, Одинцово, ул. Садовая, 15',
    price: 24500000,
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
    images: ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80'],
    isAuction: true,
    currentBid: 23500000,
    endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 7 * 60 * 60 * 1000 + 58 * 60 * 1000 + 53 * 1000).toISOString(),
    beds: 5,
    baths: 3,
    sqft: 180,
  },
]

const MOCK_SECTIONS = [
  { prefix: 'recommended-', list: recommendedProperties, category: 'recommended' },
  { prefix: 'nearby-', list: nearbyProperties, category: 'nearby' },
  { prefix: 'apartment-', list: apartmentsData, category: 'apartment' },
  { prefix: 'villa-', list: villasData, category: 'villa' },
  { prefix: 'flat-', list: flatsData, category: 'flat' },
  { prefix: 'townhouse-', list: townhousesData, category: 'townhouse' },
]

function readLocalFavoriteFlags() {
  try {
    const raw = localStorage.getItem('favoriteProperties')
    if (!raw) return {}
    return JSON.parse(raw)
  } catch (_) {
    return {}
  }
}

const Favorites = () => {
  const navigate = useNavigate()
  const { favoriteRows, toggleFavorite } = usePropertyFavorites()
  const [catalogByKey, setCatalogByKey] = useState(() => new Map())
  const [catalogVersion, setCatalogVersion] = useState(0)
  const [mockTick, setMockTick] = useState(0)

  const loadCatalog = useCallback(async () => {
    try {
      const apiBase = await getApiBaseUrl()
      const lang = 'ru'
      const [approvedRes, auctionsRes] = await Promise.all([
        fetch(`${apiBase}/properties/approved?lang=${lang}`),
        fetch(`${apiBase}/properties/auctions?lang=${lang}`),
      ])
      let approved = []
      let auctions = []
      if (approvedRes.ok) {
        const json = await approvedRes.json()
        if (json?.success && Array.isArray(json.data)) approved = json.data
      }
      if (auctionsRes.ok) {
        const json = await auctionsRes.json()
        if (json?.success && Array.isArray(json.data)) auctions = json.data
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
        return {
          ...prop,
          isAuction,
          title: prop.title || prop.name || '',
          name: prop.name || prop.title || '',
          image:
            prop.image ||
            (Array.isArray(prop.images) && prop.images[0]
              ? typeof prop.images[0] === 'string'
                ? prop.images[0]
                : prop.images[0].url
              : null),
          images: Array.isArray(prop.images) ? prop.images : prop.image ? [prop.image] : [],
          price: priceNumber,
          auction_starting_price: auctionStartingPrice,
          currentBid: prop.currentBid || prop.auction_current_bid || prop.auctionCurrentBid || null,
          endTime: prop.endTime || prop.auction_end_date || prop.auctionEndDate || prop.test_timer_end_date || null,
          beds: prop.beds || prop.rooms || prop.bedrooms || 0,
          baths: prop.baths || prop.bathrooms || 0,
          sqft: prop.sqft || prop.area || 0,
          area: prop.area || prop.sqft || 0,
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
      setCatalogByKey(byKey)
      setCatalogVersion((v) => v + 1)
    } catch (e) {
      console.warn('Favorites loadCatalog:', e)
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

  const formatPrice = (price) => {
    const n = Number(price)
    if (price == null || price === '' || Number.isNaN(n)) {
      return '$0'
    }
    if (n >= 1000000) {
      return `$${(n / 1000000).toFixed(1)}M`
    }
    return `$${n.toLocaleString('en-US')}`
  }

  const removeFavorite = (item) => {
    toggleFavorite(
      item.property,
      hasDbBackedProperty(item.property) ? undefined : item.mockCategory || 'property'
    )
  }

  const getPropertyRoute = (auction) => {
    return `/property/${auction.id}`
  }

  return (
    <div className="favorites-page">
      <Header />
      <div className="favorites-container">
        <div className="favorites-header">
          <h1 className="favorites-title">
            <FiHeart className="favorites-title-icon" />
            Понравилось
          </h1>
          <p className="favorites-subtitle">
            Все аукционы, которые вы добавили в избранное
          </p>
        </div>

        {favoriteAuctions.length > 0 ? (
          <div className="favorites-grid">
            {favoriteAuctions.map((item) => {
              const auction = item.property
              return (
                <div key={item.key} className="favorite-card">
                  <Link to={getPropertyRoute(auction)} className="favorite-card-link">
                    <div className="favorite-card-image">
                      <img
                        src={auction.image || auction.images?.[0]}
                        alt={auction.name || auction.title}
                        onError={(e) => {
                          e.target.src =
                            'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80'
                        }}
                      />
                      <button
                        className="favorite-card-heart active"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          removeFavorite(item)
                        }}
                        aria-label="Удалить из избранного"
                      >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <path
                            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                            stroke="currentColor"
                            strokeWidth="2"
                            fill="currentColor"
                          />
                        </svg>
                      </button>
                    </div>
                    <div className="favorite-card-content">
                      {auction.endTime && (
                        <div className="favorite-card-timer">
                          <PropertyTimer
                            endTime={
                              typeof auction.endTime === 'string'
                                ? auction.endTime
                                : auction.endTime.toISOString()
                            }
                            compact={true}
                          />
                        </div>
                      )}
                      <h3 className="favorite-card-title">{auction.name || auction.title}</h3>
                      <p className="favorite-card-location">
                        <FiMapPin size={14} />
                        {auction.location || '—'}
                      </p>
                      <div className="favorite-card-details">
                        {auction.beds ? (
                          <span className="favorite-card-detail">
                            <MdBed size={16} />
                            {auction.beds}
                          </span>
                        ) : null}
                        {auction.baths ? (
                          <span className="favorite-card-detail">
                            <MdOutlineBathtub size={16} />
                            {auction.baths}
                          </span>
                        ) : null}
                        {(auction.sqft || auction.area) ? (
                          <span className="favorite-card-detail">
                            <BiArea size={16} />
                            {auction.sqft || auction.area} м²
                          </span>
                        ) : null}
                      </div>
                      <div className="favorite-card-price">
                        {auction.isAuction && auction.currentBid ? (
                          <>
                            <span className="favorite-card-price-label">Текущая ставка:</span>
                            <span className="favorite-card-price-value">{formatPrice(auction.currentBid)}</span>
                          </>
                        ) : (
                          <>
                            <span className="favorite-card-price-label">Цена:</span>
                            <span className="favorite-card-price-value">{formatPrice(auction.price)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </Link>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="favorites-empty">
            <FiHeart size={64} className="favorites-empty-icon" />
            <h2 className="favorites-empty-title">У вас пока нет избранных аукционов</h2>
            <p className="favorites-empty-text">
              Добавляйте понравившиеся аукционы в избранное, чтобы не потерять их
            </p>
            <button className="favorites-empty-button" onClick={() => navigate('/auction')}>
              Перейти к аукционам
              <FiArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Favorites

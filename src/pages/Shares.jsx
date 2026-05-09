import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiSearch } from 'react-icons/fi'
import Header from '../components/Header'
import DepositButton from '../components/DepositButton'
import DepositButtonSkeleton from '../components/DepositButtonSkeleton'
import { AnimatedMarqueeHero } from '../components/ui/hero-3'
import { fetchUserDeposit } from '../utils/depositApi'
import { fetchNumericDbUserIdForApi, getStoredNumericUserId } from '../services/authService'
import './Shares.css'
import { getPropertyCardImage } from '../utils/propertyImage'
import { ShareCardSkeletonGrid } from '../components/ShareCardSkeletonGrid'

// Фотографии разных объектов недвижимости для бегущей строки
const HERO_MARQUEE_IMAGES = [
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=900&auto=format&fit=crop&q=70', // villa with pool
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&auto=format&fit=crop&q=70', // penthouse
  'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=900&auto=format&fit=crop&q=70', // mountain lodge
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=900&auto=format&fit=crop&q=70', // seaside apartment
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=900&auto=format&fit=crop&q=70', // downtown loft
  'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=900&auto=format&fit=crop&q=70', // family home
]

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

// Демо-объекты долей (показываются вместе с объектами из API)
const SHARE_CARD_FALLBACK =
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80'

const DEMO_SHARE_OBJECTS = [
  {
    id: 'share-demo-1',
    title: 'Квартира в центре, 2-комн.',
    location: 'Минск, ул. Примерная, 10',
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80',
    totalPrice: 120000,
    pricePerShare: 6000,
    totalShares: 20,
    sharesSold: 8,
    myShares: 0,
    area: 65,
    rooms: 2,
  },
  {
    id: 'share-demo-2',
    title: 'Апартаменты с видом на море',
    location: 'Барселона, Eixample',
    image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80',
    totalPrice: 250000,
    pricePerShare: 12500,
    totalShares: 20,
    sharesSold: 15,
    myShares: 2,
    area: 95,
    rooms: 3,
  },
  {
    id: 'share-demo-3',
    title: 'Студия в историческом центре',
    location: 'Вена, 1-й район',
    image: 'https://images.unsplash.com/photo-1502672023488-70e25813eb80?auto=format&fit=crop&w=800&q=80',
    totalPrice: 180000,
    pricePerShare: 9000,
    totalShares: 20,
    sharesSold: 20,
    myShares: 0,
    area: 42,
    rooms: 1,
  },
]

const Shares = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [apiShares, setApiShares] = useState([])
  const [loadingShares, setLoadingShares] = useState(true)
  const [compactShareCards, setCompactShareCards] = useState(false)
  const [dbUserId, setDbUserId] = useState(() => getStoredNumericUserId())
  const [userDeposit, setUserDeposit] = useState(0)
  const [depositLoading, setDepositLoading] = useState(() => Boolean(getStoredNumericUserId()))

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const update = () => setCompactShareCards(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const id = await fetchNumericDbUserIdForApi({ clerkUser: null, clerkUserLoaded: false })
      if (!cancelled && id) setDbUserId(id)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!dbUserId) {
      setDepositLoading(false)
      return
    }
    let cancelled = false
    setDepositLoading(true)

    ;(async () => {
      try {
        const deposit = await fetchUserDeposit(API_BASE, dbUserId, { ttlMs: 15000 })
        if (
          !cancelled &&
          deposit &&
          typeof deposit.depositAmount === 'number'
        ) {
          setUserDeposit(deposit.depositAmount || 0)
        }
      } catch {
        if (!cancelled) setUserDeposit(0)
      } finally {
        if (!cancelled) setDepositLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [dbUserId])

  const loadShares = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/properties/shares`)
      const json = await (res.ok ? res.json() : { success: false, data: [] })
      if (json.success && Array.isArray(json.data)) {
        setApiShares(json.data.map((p) => ({
          ...p,
          id: p.shareId || `${p.property_type}-${p.id}`,
          image: getPropertyCardImage(p, SHARE_CARD_FALLBACK),
        })))
      }
    } catch (_) {
      setApiShares([])
    } finally {
      setLoadingShares(false)
    }
  }, [])

  useEffect(() => {
    void loadShares()
  }, [loadShares])

  const allShareObjects = [...DEMO_SHARE_OBJECTS, ...apiShares]
  const filtered = allShareObjects.filter(
    (obj) =>
      !searchQuery ||
      (obj.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (obj.location || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatPrice = (n) => {
    if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
    return `$${Number(n).toLocaleString('en-US')}`
  }

  return (
    <div className="shares-page">
      <Header />
      <div className="shares-page__bg" />
      <AnimatedMarqueeHero
        title={
          <>
            {t('sharesHeroTitleLine1')}
            <br />
            <span className="shares-hero__title-marker">{t('sharesHeroTitleLine2')}</span>
          </>
        }
        description={t('sharesHeroDescription')}
        images={HERO_MARQUEE_IMAGES}
      />
      <main className="shares-container">
        <div className="shares-search-bar">
          <FiSearch className="shares-search-bar__icon" size={20} />
          <input
            type="text"
            className="shares-search-bar__input"
            placeholder={t('searchPlaceholderLong')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="shares-search-bar__clear"
              onClick={() => setSearchQuery('')}
              aria-label={t('clearSearch')}
            >
              ×
            </button>
          )}
        </div>

        <div id="shares-grid" className="shares-grid" aria-busy={loadingShares}>
          {loadingShares ? (
            <ShareCardSkeletonGrid count={6} />
          ) : filtered.length === 0 ? (
            <div className="shares-no-results">
              <p>{t('sharesEmpty')}</p>
            </div>
          ) : (
            filtered.map((obj) => {
              const rawSoldPercent = (obj.totalShares > 0) ? Math.round((obj.sharesSold / obj.totalShares) * 100) : 0
              const soldPercent = Math.max(0, Math.min(rawSoldPercent, 100))
              const isSoldOut = obj.sharesSold >= obj.totalShares
              const total = Math.max(1, Number(obj.totalShares) || 1)
              const sold = Math.min(obj.sharesSold || 0, total)
              const remaining = Math.max(total - sold, 0)
              return (
              <article
                key={obj.id}
                className={`share-card ${isSoldOut ? 'share-card--sold-out' : ''}`}
                onClick={() => navigate(`/shares/${obj.id}`, { state: { shareObject: obj } })}
              >
                <div className="share-card__badge">
                  {isSoldOut ? t('sharesSoldOut') : t('sharesBadgeShare')}
                </div>
                <div className="share-card__image-wrap">
                  <div className="share-card__scale" aria-hidden>
                    <div className="share-card__scale-track">
                      <div
                        className="share-card__scale-fill"
                        style={{ height: `${(sold / total) * 100}%` }}
                      />
                    </div>
                    <span className="share-card__scale-label share-card__scale-label--bottom">0%</span>
                    <span className="share-card__scale-label share-card__scale-label--top">100%</span>
                    <span className="share-card__scale-sold" style={{ bottom: `${soldPercent}%` }}>
                      {soldPercent}%
                    </span>
                  </div>
                  <img
                    src={getPropertyCardImage(obj, SHARE_CARD_FALLBACK)}
                    alt={obj.title}
                    className="share-card__image"
                  />
                  <div
                    className="share-card__sold-overlay"
                    style={{ height: `${soldPercent}%` }}
                    aria-hidden
                  >
                    {!isSoldOut && soldPercent > 0 && (
                      <span className="share-card__sold-percent">
                        {t(compactShareCards ? 'sharesRemainingCompact' : 'sharesRemainingCount', { remaining })}
                      </span>
                    )}
                  </div>
                  {isSoldOut && (
                    <div className="share-card__sold-out-label">{t('sharesSoldOut')}</div>
                  )}
                </div>
                <div className="share-card__content">
                  <h2 className="share-card__title">{obj.title}</h2>
                  <p className="share-card__location">{obj.location}</p>
                  {obj.area && (
                    <p className="share-card__specs">
                      {obj.area} {t('squareMeters')} · {obj.rooms} {t('roomsShort')}
                    </p>
                  )}
                  <div className="share-card__prices">
                    <div className="share-card__price-total">
                      {t('sharesTotalCost')} <strong>{formatPrice(obj.totalPrice)}</strong>
                    </div>
                    <div className="share-card__price-per-share">
                      {t('sharesPerShare')} <strong>{formatPrice(obj.pricePerShare)}</strong>
                    </div>
                  </div>
                  <div className="share-card__footer">
                    <span className="share-card__sold">
                      {isSoldOut ? t('sharesAllSold') : t('sharesSoldCount', { sold, total })}
                    </span>
                  </div>
                </div>
              </article>
              )
            })
          )}
        </div>
      </main>
      <div className="shares-floats">
        {dbUserId ? (
          depositLoading ? (
            <DepositButtonSkeleton />
          ) : (
            <DepositButton amount={userDeposit} />
          )
        ) : null}
        <button
          type="button"
          className="ai-button"
          onClick={() => navigate('/chat')}
          aria-label="AI Assistant"
        >
          AI
        </button>
      </div>
    </div>
  )
}

export default Shares

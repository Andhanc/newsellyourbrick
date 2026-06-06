import { useState, useEffect, useCallback, useLayoutEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { FiPlus, FiArrowLeft } from 'react-icons/fi'
import { useUser } from '@clerk/clerk-react'
import Header from '../components/Header'
import SharePurchaseModal from '../components/SharePurchaseModal'
import DepositRequiredModal from '../components/DepositRequiredModal'
import PropertyDetailGallery from '../components/property-detail/PropertyDetailGallery'
import PropertyDetailInfoSection from '../components/property-detail/PropertyDetailInfoSection'
import PropertyDetailMap from '../components/property-detail/PropertyDetailMap'
import { usePropertyFavorites } from '../context/PropertyFavoritesContext'
import { getUserData, isAuthenticated, getStoredNumericUserId, CLERK_DB_USER_SYNCED } from '../services/authService'
import { showNotification } from '../utils/toastHelper'
import { requestOpenLoginModal } from '../utils/requestOpenLoginModal'
import { fetchUserDeposit } from '../utils/depositApi'
import { isAuctionDepositSufficient } from '../utils/auctionDeposit'
import { getPropertyCardImage, normalizePropertyMediaFields } from '../utils/propertyImage'
import { buildDisplayProperty } from '../utils/buildDisplayProperty'
import { hasDbBackedProperty } from '../utils/propertyFavoriteKey'
import './PropertyDetailClassic.css'
import './ShareDetailPage.css'
import { formatPropertyPrice } from '../utils/currency'
import ShareDetailPageSkeleton from './ShareDetailPageSkeleton'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

function isShareDbRouteId(routeId) {
  return typeof routeId === 'string' && /^(apartment|commercial|house|villa)-(\d+)$/.test(routeId)
}

const DEMO_SHARE_OBJECTS = [
  {
    id: 'share-demo-1',
    title: 'Квартира в центре, 2-комн.',
    location: 'Минск, ул. Примерная, 10',
    description: 'Уютная двухкомнатная квартира в центре города. Ремонт, балкон, паркинг во дворе.',
    image: '/images/external/photo-1560448204-e02f11c3d0e2-54a1e4fab4.jpg',
    images: [
      '/images/external/photo-1560448204-e02f11c3d0e2-54a1e4fab4.jpg',
      '/images/external/photo-1502672260266-1c1ef2d93688-97c7b765e8.jpg',
      '/images/external/photo-1522708323590-d24dbb6b0267-cf542d6d64.jpg',
    ],
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
    description: 'Просторные апартаменты с панорамным видом. Терраса, консьерж.',
    image: '/images/external/photo-1502672260266-1c1ef2d93688-97c7b765e8.jpg',
    images: [
      '/images/external/photo-1502672260266-1c1ef2d93688-97c7b765e8.jpg',
      '/images/external/photo-1560448204-e02f11c3d0e2-54a1e4fab4.jpg',
      '/images/external/photo-1493809842364-78817add7ffb-5344392301.jpg',
    ],
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
    description: 'Компактная студия в самом центре Вены. Полная меблировка, вид во двор.',
    image: '/images/external/photo-1502672023488-70e25813eb80-62911a5aab.jpg',
    images: [
      '/images/external/photo-1502672023488-70e25813eb80-62911a5aab.jpg',
      '/images/external/photo-1502672260266-1c1ef2d93688-97c7b765e8.jpg',
    ],
    totalPrice: 180000,
    pricePerShare: 9000,
    totalShares: 20,
    sharesSold: 20,
    myShares: 0,
    area: 42,
    rooms: 1,
  },
]

const ShareDetailPage = () => {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const fromState = location.state?.shareObject
  const { user, isLoaded: userLoaded } = useUser()

  const [shareObject, setShareObject] = useState(() => {
    if (fromState) return fromState
    return DEMO_SHARE_OBJECTS.find((o) => o.id === id) || null
  })
  const [buyCount, setBuyCount] = useState(1)
  const [loadingShare, setLoadingShare] = useState(() => isShareDbRouteId(id))
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false)
  const [userId, setUserId] = useState(() => getStoredNumericUserId())
  const [userDeposit, setUserDeposit] = useState(0)
  const [isDepositRequiredOpen, setIsDepositRequiredOpen] = useState(false)
  const [mySharesOwned, setMySharesOwned] = useState(0)
  const { isFavorite: isFavoriteInStore, toggleFavorite } = usePropertyFavorites()

  const isDbShare = shareObject && typeof shareObject.id === 'number' && shareObject.property_type

  const displayProperty = useMemo(
    () => (shareObject ? buildDisplayProperty(shareObject) : null),
    [shareObject],
  )

  const galleryImages = useMemo(() => {
    if (!shareObject) return []
    const { images } = normalizePropertyMediaFields(shareObject)
    if (images.length > 0) return images
    if (Array.isArray(shareObject.images) && shareObject.images.length > 0) return shareObject.images
    if (shareObject.image) return [shareObject.image]
    return []
  }, [shareObject])

  const favoriteProperty = useMemo(() => {
    if (!shareObject) return null
    const sourceTable =
      shareObject.source_table ||
      (shareObject.property_type === 'house' || shareObject.property_type === 'villa'
        ? 'properties_houses'
        : 'properties_apartments')
    return {
      ...shareObject,
      source_table: sourceTable,
    }
  }, [shareObject])

  const isFavorite = favoriteProperty
    ? isFavoriteInStore(
        favoriteProperty,
        hasDbBackedProperty(favoriteProperty) ? undefined : 'property',
      )
    : false

  useEffect(() => {
    const apply = () => {
      const n = getStoredNumericUserId()
      if (n != null) setUserId(n)
    }
    apply()
    window.addEventListener(CLERK_DB_USER_SYNCED, apply)
    return () => window.removeEventListener(CLERK_DB_USER_SYNCED, apply)
  }, [])

  useEffect(() => {
    const syncUserId = async () => {
      const stored = getStoredNumericUserId()
      if (stored != null) {
        setUserId(stored)
        return
      }
      if (user && userLoaded) {
        const email = user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress
        if (email) {
          try {
            const userResponse = await fetch(`${API_BASE}/users/email/${encodeURIComponent(email)}`)
            if (userResponse.ok) {
              const userData = await userResponse.json()
              if (userData.success && userData.data?.id) {
                const numericId = userData.data.id
                setUserId(numericId)
                localStorage.setItem('userId', String(numericId))
              }
            }
          } catch {
            /* ignore */
          }
        }
      } else if (isAuthenticated()) {
        const userData = getUserData()
        if (userData?.id && /^\d+$/.test(String(userData.id))) {
          const n = parseInt(String(userData.id), 10)
          setUserId(n)
          localStorage.setItem('userId', String(n))
        }
      }
    }
    if (userLoaded || isAuthenticated()) syncUserId()
  }, [user, userLoaded])

  const loadPropertyFromApi = useCallback(() => {
    if (!id) return Promise.resolve()
    const match = id.match(/^(apartment|commercial|house|villa)-(\d+)$/)
    if (!match) return Promise.resolve()
    const [, propertyType, propertyId] = match
    setLoadingShare(true)
    return fetch(`${API_BASE}/properties/${propertyId}?property_type=${propertyType}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Not found'))))
      .then((json) => {
        const p = json.data || json
        const { image, images } = normalizePropertyMediaFields(p)
        const cardImage = getPropertyCardImage(p, null) || image
        const totalShares = p.total_shares != null ? Number(p.total_shares) : 20
        const sharesSold = p.shares_sold != null ? Number(p.shares_sold) : 0
        const price = p.price != null ? Number(p.price) : 0
        const sourceTable =
          p.source_table ||
          (p.property_type === 'house' || p.property_type === 'villa'
            ? 'properties_houses'
            : 'properties_apartments')
        setShareObject({
          id: p.id,
          shareId: `${p.property_type}-${p.id}`,
          title: p.title,
          location: p.location || '',
          description: p.description || '',
          image: cardImage || null,
          images: images.length > 0 ? images : cardImage ? [cardImage] : [],
          source_table: sourceTable,
          totalPrice: price,
          pricePerShare: totalShares > 0 ? price / totalShares : 0,
          totalShares,
          sharesSold,
          myShares: 0,
          area: p.area,
          rooms: p.rooms,
          bedrooms: p.bedrooms,
          property_type: p.property_type,
          ...p,
        })
      })
      .catch(() => setShareObject(null))
      .finally(() => setLoadingShare(false))
  }, [id])

  useLayoutEffect(() => {
    setLoadingShare(isShareDbRouteId(id))
  }, [id])

  useEffect(() => {
    loadPropertyFromApi()
  }, [loadPropertyFromApi])

  useEffect(() => {
    if (!isDbShare || userId == null) {
      setMySharesOwned(0)
      return
    }
    const pid = shareObject.id
    const pt = shareObject.property_type
    let cancelled = false
    fetch(`${API_BASE}/users/${userId}/share-purchases`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled || !j.success || !Array.isArray(j.data)) return
        const sum = j.data
          .filter((row) => row.property_id === pid && row.property_type === pt)
          .reduce((acc, row) => acc + (Number(row.shares_count) || 0), 0)
        setMySharesOwned(sum)
      })
      .catch(() => {
        if (!cancelled) setMySharesOwned(0)
      })
    return () => {
      cancelled = true
    }
  }, [isDbShare, userId, shareObject?.id, shareObject?.property_type])

  useEffect(() => {
    if (userId == null) {
      setUserDeposit(0)
      return
    }
    let cancelled = false
    ;(async () => {
      const deposit = await fetchUserDeposit(API_BASE, userId, { ttlMs: 15000 })
      if (cancelled) return
      const amount = Number(deposit?.depositAmount) || 0
      setUserDeposit(amount)
    })()
    return () => {
      cancelled = true
    }
  }, [userId])

  const checkoutFlag = searchParams.get('share_checkout')
  const sessionIdQ = searchParams.get('session_id')

  useEffect(() => {
    if (checkoutFlag !== 'success' || !sessionIdQ || !sessionIdQ.startsWith('cs_')) return undefined
    const sessionId = sessionIdQ
    const uid = localStorage.getItem('userId')
    if (!uid || !/^\d+$/.test(uid)) {
      requestOpenLoginModal({ wizard: true })
      return undefined
    }
    const routeMatch = id?.match(/^(apartment|commercial|house|villa)-(\d+)$/)
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${API_BASE}/billing/confirm-share-purchase`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId, userId: uid }),
        })
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        const next = new URLSearchParams(searchParams)
        next.delete('share_checkout')
        next.delete('session_id')
        setSearchParams(next, { replace: true })
        if (res.ok && data.success) {
          showNotification('Оплата прошла успешно, доли зачислены')
          await loadPropertyFromApi()
          if (routeMatch) {
            const propertyType = routeMatch[1]
            const propertyIdNum = parseInt(routeMatch[2], 10)
            const r2 = await fetch(`${API_BASE}/users/${uid}/share-purchases`)
            const j2 = await r2.json().catch(() => ({}))
            if (j2.success && Array.isArray(j2.data)) {
              const sum = j2.data
                .filter((row) => row.property_id === propertyIdNum && row.property_type === propertyType)
                .reduce((acc, row) => acc + (Number(row.shares_count) || 0), 0)
              setMySharesOwned(sum)
            }
          }
        } else {
          showNotification(data.error || 'Не удалось подтвердить оплату')
        }
      } catch (e) {
        if (!cancelled) showNotification(e?.message || 'Ошибка подтверждения оплаты')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id, loadPropertyFromApi, checkoutFlag, sessionIdQ, searchParams, setSearchParams])

  const userEmail =
    user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || getUserData()?.email || ''

  if (loadingShare) {
    return <ShareDetailPageSkeleton />
  }

  if (!shareObject) {
    return (
      <div className="share-detail-page">
        <Header />
        <div className="share-detail-page__container">
          <p>{t('shareDetailNotFound')}</p>
          <button type="button" onClick={() => navigate('/shares')}>
            {t('shareDetailBackToShares')}
          </button>
        </div>
      </div>
    )
  }

  const totalShares = shareObject.totalShares || 20
  const sharesSold = shareObject.sharesSold || 0
  const myShares = isDbShare ? mySharesOwned : shareObject.myShares || 0
  const availableToBuy = totalShares - sharesSold
  const othersSold = Math.max(0, sharesSold - myShares)
  const isSoldOut = sharesSold >= totalShares

  const previewMyShares = myShares + Math.min(buyCount, availableToBuy)
  const previewAvailable = Math.max(0, availableToBuy - buyCount)
  const previewSold = sharesSold + Math.min(buyCount, availableToBuy)

  const pctOthers = totalShares > 0 ? (othersSold / totalShares) * 100 : 0
  const pctMyShares = totalShares > 0 ? (previewMyShares / totalShares) * 100 : 0
  const pctAvailable = totalShares > 0 ? (previewAvailable / totalShares) * 100 : 0

  const formatPrice = (n) => formatPropertyPrice(n, shareObject.currency, { compact: true })

  const handleShare = () => {
    if (!shareObject || !navigator.share) return
    navigator
      .share({
        title: shareObject.title,
        text: shareObject.description,
        url: window.location.href,
      })
      .catch(() => {})
  }

  const handleToggleFavorite = async () => {
    if (!favoriteProperty) return
    const isClerkAuth = user && userLoaded
    const isOldAuth = isAuthenticated()
    if (!isFavorite && !isClerkAuth && !isOldAuth) {
      requestOpenLoginModal({ wizard: true })
      return
    }
    await toggleFavorite(
      favoriteProperty,
      hasDbBackedProperty(favoriteProperty) ? undefined : 'property',
    )
  }

  const openPurchaseModal = async () => {
    const isClerkAuth = user && userLoaded
    const isOldAuth = isAuthenticated()
    if (!isClerkAuth && !isOldAuth) {
      requestOpenLoginModal({ wizard: true })
      return
    }
    if (!isDbShare) {
      showNotification('Это демо-карточка. Оплата доступна для объектов из каталога долей.')
      return
    }
    if (availableToBuy <= 0) return

    if (userId == null) {
      showNotification('Не удалось определить пользователя. Обновите страницу и попробуйте снова.')
      return
    }

    const freshDeposit = await fetchUserDeposit(API_BASE, userId, { force: true, ttlMs: 0 })
    const depositAmount = Number(freshDeposit?.depositAmount) || 0
    setUserDeposit(depositAmount)
    if (!isAuctionDepositSufficient(depositAmount)) {
      setIsDepositRequiredOpen(true)
      return
    }

    setPurchaseModalOpen(true)
  }

  return (
    <div className={`share-detail-page ${isSoldOut ? 'share-detail-page--sold-out' : ''}`}>
      <Header />
      <div className="share-detail-page__bg" />
      <div className="share-detail-page__container">
        <button type="button" className="share-detail-page__back" onClick={() => navigate('/shares')}>
          <FiArrowLeft size={20} /> {t('shareDetailBackToShares')}
        </button>

        <div className="share-detail__layout">
          <div className="share-detail__left-column">
            <div className="share-detail__gallery-wrap">
              <PropertyDetailGallery
                images={galleryImages}
                title={shareObject.title}
                onShare={handleShare}
                onToggleFavorite={handleToggleFavorite}
                isFavorite={isFavorite}
                alwaysShowNav
                overlay={
                  isSoldOut ? <div className="share-detail__hero-sold-overlay" aria-hidden /> : null
                }
              />
            </div>

            {displayProperty && (
              <PropertyDetailInfoSection
                displayProperty={displayProperty}
                property={shareObject}
              />
            )}
          </div>

          <div className="share-detail__sidebar">
            <div className="share-detail__meta-card share-detail__meta-card--sidebar">
              <h1 className="share-detail__title">{shareObject.title}</h1>
              {shareObject.description && (
                <p className="share-detail__description">{shareObject.description}</p>
              )}
            </div>

            {isSoldOut ? (
              <div className="share-detail__sold-out-block">
                <div className="share-detail__sold-out-icon" aria-hidden>
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <h3 className="share-detail__sold-out-title">Все доли проданы</h3>
                <p className="share-detail__sold-out-text">
                  Этот объект полностью выкуплен. Все {totalShares} долей находятся у совладельцев.
                </p>
                <p className="share-detail__sold-out-hint">Следите за новыми объектами — они появляются регулярно.</p>
                <button type="button" className="share-detail__sold-out-btn" onClick={() => navigate('/shares')}>
                  Смотреть другие объекты
                </button>
              </div>
            ) : null}

            {!isSoldOut ? (
              <>
                <div className="share-detail__chart-section">
                  <h3 className="share-detail__chart-title">Распределение долей</h3>
                  {buyCount > 0 && availableToBuy > 0 && (
                    <p className="share-detail__chart-preview-hint">
                      Превью: как будет после покупки {buyCount} {buyCount === 1 ? 'доли' : 'долей'}
                    </p>
                  )}
                  <div className="share-detail__chart-wrap">
                    <div
                      className="share-detail__pie"
                      style={{
                        background: `conic-gradient(
                          #5b6ee1 0% ${pctOthers}%,
                          #0ABAB5 ${pctOthers}% ${pctOthers + pctMyShares}%,
                          #dff7ff ${pctOthers + pctMyShares}% 100%
                        )`,
                      }}
                    />
                    <div className="share-detail__pie-center">
                      <span className="share-detail__pie-value">
                        {buyCount > 0 && availableToBuy > 0 ? previewSold : sharesSold}
                      </span>
                      <span className="share-detail__pie-label">из {totalShares}</span>
                      {buyCount > 0 && availableToBuy > 0 && (
                        <span className="share-detail__pie-sublabel">после покупки</span>
                      )}
                    </div>
                  </div>
                  <div className="share-detail__legend">
                    <div className="share-detail__legend-item share-detail__legend-item--gray">
                      <span className="share-detail__legend-dot" /> Можно купить:{' '}
                      {buyCount > 0 && availableToBuy > 0 ? previewAvailable : availableToBuy}
                    </div>
                    <div className="share-detail__legend-item share-detail__legend-item--teal">
                      <span className="share-detail__legend-dot" /> Ваши доли:{' '}
                      {buyCount > 0 && availableToBuy > 0 ? previewMyShares : myShares}
                    </div>
                    {othersSold > 0 && (
                      <div className="share-detail__legend-item share-detail__legend-item--dark">
                        <span className="share-detail__legend-dot" /> У других: {othersSold}
                      </div>
                    )}
                  </div>
                </div>

                <div className="share-detail__buy-block">
                  <div className="share-detail__buy-controls">
                    <label className="share-detail__buy-label">Количество долей:</label>
                    <div className="share-detail__buy-stepper-row">
                      <div className="share-detail__buy-stepper">
                        <button
                          type="button"
                          className="share-detail__stepper-btn"
                          onClick={() => setBuyCount((c) => Math.max(1, c - 1))}
                          disabled={buyCount <= 1}
                        >
                          −
                        </button>
                        <span className="share-detail__buy-count">{buyCount}</span>
                        <button
                          type="button"
                          className="share-detail__stepper-btn"
                          onClick={() => setBuyCount((c) => Math.min(availableToBuy, c + 1))}
                          disabled={buyCount >= availableToBuy}
                        >
                          +
                        </button>
                      </div>
                      <span
                        className="share-detail__buy-hint"
                        role="group"
                        aria-label={`Итого: ${formatPrice(shareObject.pricePerShare * buyCount)}`}
                      >
                        <span className="share-detail__buy-hint-label">Итого</span>
                        <span className="share-detail__buy-hint-value">
                          {formatPrice(shareObject.pricePerShare * buyCount)}
                        </span>
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="share-detail__buy-btn"
                    onClick={openPurchaseModal}
                    disabled={availableToBuy <= 0}
                  >
                    <FiPlus size={22} /> Купить долю{buyCount > 1 ? ` (${buyCount})` : ''}
                  </button>
                </div>
              </>
            ) : null}

            <div className="share-detail__map-card">
              <PropertyDetailMap property={shareObject} />
            </div>
          </div>
        </div>
      </div>

      <SharePurchaseModal
        isOpen={purchaseModalOpen}
        onClose={() => setPurchaseModalOpen(false)}
        shareObject={shareObject}
        buyCount={Math.min(Math.max(1, buyCount), availableToBuy)}
        userId={userId}
        userEmail={userEmail}
        userDeposit={userDeposit}
        returnPath={id ? `/shares/${id}` : undefined}
      />

      <DepositRequiredModal
        isOpen={isDepositRequiredOpen}
        onClose={() => setIsDepositRequiredOpen(false)}
        message={t('depositModal_messageShares')}
        onGoToDeposit={() => {
          setIsDepositRequiredOpen(false)
          navigate('/deposit')
        }}
      />
    </div>
  )
}

export default ShareDetailPage

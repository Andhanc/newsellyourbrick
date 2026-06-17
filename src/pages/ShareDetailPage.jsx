import { useState, useEffect, useCallback, useLayoutEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import SharePurchaseModal from '../components/SharePurchaseModal'
import DepositRequiredModal from '../components/DepositRequiredModal'
import PropertyDetailClassic from './PropertyDetailClassic'
import PropertyDetailClassicSkeleton from './PropertyDetailClassicSkeleton'
import { getUserData, isAuthenticated, getStoredNumericUserId, CLERK_DB_USER_SYNCED } from '../services/authService'
import { showNotification } from '../utils/toastHelper'
import { requestOpenLoginModal } from '../utils/requestOpenLoginModal'
import { fetchUserDeposit } from '../utils/depositApi'
import { isAuctionDepositSufficient } from '../utils/auctionDeposit'
import { getPropertyCardImage, normalizePropertyMediaFields } from '../utils/propertyImage'
import { buildDisplayProperty } from '../utils/buildDisplayProperty'
import { formatPropertyPrice } from '../utils/currency'
import './PropertyDetailClassic.css'
import './PropertyDetailClassic.desktopAuctionV3.css'

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
    property_type: 'apartment',
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
    property_type: 'apartment',
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
    property_type: 'apartment',
  },
]

const ShareDetailPage = () => {
  const { t, i18n } = useTranslation()
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

  const isDbShare = shareObject && typeof shareObject.id === 'number' && shareObject.property_type

  const classicProperty = useMemo(() => {
    if (!shareObject) return null
    const display = buildDisplayProperty(shareObject)
    const { images } = normalizePropertyMediaFields(shareObject)
    const gallery = images.length > 0 ? images : shareObject.images || (shareObject.image ? [shareObject.image] : [])

    return {
      ...shareObject,
      ...display,
      name: shareObject.title || display.name,
      title: shareObject.title || display.title,
      isAuction: false,
      is_auction: false,
      sale_type: 'share',
      is_shared_ownership: true,
      price: shareObject.totalPrice ?? display.price,
      photos: gallery,
      images: gallery,
      source_table:
        shareObject.source_table ||
        (shareObject.property_type === 'house' || shareObject.property_type === 'villa'
          ? 'properties_houses'
          : 'properties_apartments'),
    }
  }, [shareObject])

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
          currency: p.currency || 'EUR',
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
          showNotification(t('shareDetailPurchaseSuccess'))
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
          showNotification(data.error || t('shareDetailPurchaseConfirmError'))
        }
      } catch (e) {
        if (!cancelled) showNotification(e?.message || t('shareDetailPurchaseConfirmError'))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id, loadPropertyFromApi, checkoutFlag, sessionIdQ, searchParams, setSearchParams, t])

  const userEmail =
    user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || getUserData()?.email || ''

  const totalShares = shareObject?.totalShares || 20
  const sharesSold = shareObject?.sharesSold || 0
  const myShares = isDbShare ? mySharesOwned : shareObject?.myShares || 0
  const availableToBuy = Math.max(0, totalShares - sharesSold)
  const isSoldOut = sharesSold >= totalShares

  const openPurchaseModal = useCallback(async () => {
    const isClerkAuth = user && userLoaded
    const isOldAuth = isAuthenticated()
    if (!isClerkAuth && !isOldAuth) {
      requestOpenLoginModal({ wizard: true })
      return
    }
    if (!isDbShare) {
      showNotification(t('shareDetailDemoHint'))
      return
    }
    if (availableToBuy <= 0) return

    if (userId == null) {
      showNotification(t('shareDetailUserResolveError'))
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
  }, [user, userLoaded, isDbShare, availableToBuy, userId, t])

  const shareListingConfig = useMemo(() => {
    if (!shareObject) return null
    const numberLocale = i18n.language?.startsWith('ru') ? 'ru-RU' : 'en-US'
    return {
      totalShares,
      sharesSold,
      myShares,
      availableToBuy,
      buyCount,
      onBuyCountChange: setBuyCount,
      pricePerShare: shareObject.pricePerShare || 0,
      currency: shareObject.currency || 'EUR',
      isSoldOut,
      isDbShare: Boolean(isDbShare),
      onPurchase: openPurchaseModal,
      formatStickyTotal: () =>
        formatPropertyPrice((shareObject.pricePerShare || 0) * buyCount, shareObject.currency || 'EUR', {
          compact: true,
          locale: numberLocale,
        }),
    }
  }, [
    shareObject,
    totalShares,
    sharesSold,
    myShares,
    availableToBuy,
    buyCount,
    isSoldOut,
    isDbShare,
    openPurchaseModal,
    i18n.language,
  ])

  if (loadingShare) {
    return <PropertyDetailClassicSkeleton />
  }

  if (!shareObject || !classicProperty) {
    return (
      <div className="property-detail-page-new" style={{ padding: '48px 24px', textAlign: 'center' }}>
        <p>{t('shareDetailNotFound')}</p>
        <button type="button" onClick={() => navigate('/shares')}>
          {t('shareDetailBackToShares')}
        </button>
      </div>
    )
  }

  return (
    <>
      <PropertyDetailClassic
        property={classicProperty}
        onBack={() => navigate('/shares')}
        requireAuthOnLoad={false}
        shareListingConfig={shareListingConfig}
      />

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
    </>
  )
}

export default ShareDetailPage

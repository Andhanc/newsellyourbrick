import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Header from '../components/Header'
import Hero from '../components/Hero'
import PropertyList from '../components/PropertyList'
import DepositButton from '../components/DepositButton'
import DepositButtonSkeleton from '../components/DepositButtonSkeleton'
import {
  CLERK_DB_USER_SYNCED,
  fetchNumericDbUserIdForApi,
  getStoredNumericUserId,
} from '../services/authService'
import {
  getCachedList,
  hasCachedList,
  fetchAuctionList,
  setCachedList,
  resolveAuctionCurrentBidValue,
  patchCachedAuctionPropertyBid,
} from '../services/auctionListCache'
import { ensureCanOpenProperty } from '../utils/propertyAccessGuard'
import './Home.css'

import { getApiBaseUrl } from '../utils/apiConfig'
import { fetchUserDeposit } from '../utils/depositApi'
import { canShowBuyerDeposit } from '../utils/depositVisibility'
import { getEffectiveAuctionEndTime } from '../utils/auctionReminderBounds'
import { sortListingsByAuctionTimer } from '../utils/sortListingsByAuctionTimer'
import { getPropertyDetailPath } from '../utils/propertyDetailUrl'
import { isAuctionRoute as checkAuctionRoute } from '../utils/auctionFilterUrl'
import { useViewerVipAccess } from '../hooks/useViewerVipAccess'
import useSiteFooterNear from '../hooks/useSiteFooterNear'

const AuctionBelowFoldLazy = lazy(() => import('../components/AuctionPageBottomSections'))
const SiteChatDockLazy = lazy(() => import('../components/SiteChatDock'))

function formatPropertyForList(prop, isAuction) {
  return {
    ...prop,
    title: prop.title || prop.name || '',
    location: prop.location || '',
    price: prop.price || (isAuction ? prop.auction_starting_price : 0) || 0,
    currentBid: isAuction ? resolveAuctionCurrentBidValue(prop) : null,
    endTime: isAuction ? getEffectiveAuctionEndTime(prop) : null,
    isAuction,
    test_timer_end_date: prop.test_timer_end_date || null,
    images: prop.images || (prop.image ? [prop.image] : []),
    image: prop.image || (prop.images && prop.images[0] ? prop.images[0] : null),
    rooms: prop.rooms || prop.beds || 0,
    beds: prop.bedrooms || prop.rooms || prop.beds || 0,
    bedrooms: prop.bedrooms || prop.rooms || 0,
    bathrooms: prop.bathrooms || 0,
    area: prop.area || prop.sqft || 0,
    sqft: prop.area || prop.sqft || 0,
    floor: prop.floor || null,
    total_floors: prop.total_floors || prop.totalFloors || null,
    year_built: prop.year_built || null,
    land_area: prop.land_area || null,
    renovation: prop.renovation || null,
    condition: prop.condition || null,
    heating: prop.heating || null,
    water_supply: prop.water_supply || null,
    sewerage: prop.sewerage || null
  }
}

function Home() {
  const [auctionProperties, setAuctionProperties] = useState(() => getCachedList())
  const [loading, setLoading] = useState(() => !hasCachedList())
  const [userDeposit, setUserDeposit] = useState(0)
  const [depositLoading, setDepositLoading] = useState(() => Boolean(getStoredNumericUserId()))
  const [dbUserId, setDbUserId] = useState(() => getStoredNumericUserId())
  const navigate = useNavigate()
  const location = useLocation()
  const isAuctionRoute = checkAuctionRoute(location.pathname)
  const { cabinetVipActive, numericUserId } = useViewerVipAccess()
  const cabinetVipRef = useRef(false)
  const viewerUserIdRef = useRef(null)
  const [showFaq, setShowFaq] = useState(false)
  const faqSentinelRef = useRef(null)
  const floatWidgetsHiddenByFooter = useSiteFooterNear()

  useEffect(() => {
    cabinetVipRef.current = cabinetVipActive
  }, [cabinetVipActive])

  useEffect(() => {
    viewerUserIdRef.current =
      Number.isFinite(Number(numericUserId)) && Number(numericUserId) >= 1 ? Number(numericUserId) : null
  }, [numericUserId])

  // Загрузка объявлений: при наличии кэша — только фоновое обновление (без "Загрузка объявлений...")
  const loadProperties = useCallback(async (backgroundRefresh = false) => {
    if (!backgroundRefresh) setLoading(true)
    try {
      const viewerId = numericUserId ?? getStoredNumericUserId()
      const list = await fetchAuctionList(viewerId ?? undefined)
      setAuctionProperties(list)
    } catch (error) {
      console.error('❌ Ошибка загрузки объявлений:', error)
    } finally {
      setLoading(false)
    }
  }, [numericUserId])

  const homeListRef = useRef(null)

  // Сразу запрашиваем данные при монтировании (кэш уже может быть от prefetch в App)
  useEffect(() => {
    loadProperties(hasCachedList())
  }, [loadProperties])

  // Подписка на новые объекты аукциона по SSE — без polling, только push от сервера при одобрении админом
  useEffect(() => {
    let eventSource = null
    let reconnectTimer = null
    let cancelled = false

    const connect = async () => {
      const base = await getApiBaseUrl()
      if (cancelled) return // cleanup уже запущен — не создавать новое соединение
      const url = base.startsWith('http') ? `${base}/events/auction-updates` : `${window.location.origin}${base}/events/auction-updates`
      eventSource = new EventSource(url)
      eventSource.onopen = () => {
        if (reconnectTimer) clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
      eventSource.onmessage = (event) => {
        try {
          if (event.data.startsWith(':')) return
          const data = JSON.parse(event.data)
          if (data.type === 'test_timer_update' && data.property) {
            const patch = data.property
            const idNum = Number(patch.id)
            if (!Number.isFinite(idNum)) return
            const cleared = patch.test_timer_end_date == null || patch.test_timer_end_date === ''
            setAuctionProperties((prev) => {
              let found = false
              const mapped = prev.map((item) => {
                if (Number(item.id) !== idNum) return item
                found = true
                const merged = { ...item }
                if (cleared) {
                  merged.test_timer_end_date = null
                  merged.test_timer_duration = null
                } else {
                  merged.test_timer_end_date = patch.test_timer_end_date
                  merged.test_timer_duration =
                    patch.test_timer_duration != null ? patch.test_timer_duration : item.test_timer_duration
                }
                const hasTT = merged.test_timer_end_date != null && merged.test_timer_end_date !== ''
                const isAuction =
                  item.isAuction === true ||
                  hasTT ||
                  item.is_auction === true ||
                  item.is_auction === 1
                return formatPropertyForList(merged, isAuction)
              })
              if (!found && !cleared) {
                fetchAuctionList().then(setAuctionProperties).catch(() => {})
              } else {
                setCachedList(mapped)
              }
              return mapped
            })
            return
          }
          if (data.type !== 'new_auction_objects' || !Array.isArray(data.properties) || data.properties.length === 0) return
          const newFormatted = data.properties.map(p => formatPropertyForList(p, true))
          setAuctionProperties((prev) => {
            const prevIds = new Set(prev.map((x) => Number(x.id)))
            const toAdd = newFormatted.filter((p) => {
              if (p.id == null || prevIds.has(Number(p.id))) return false
              const pc = p.private_club_only === 1 || p.private_club_only === true || p.private_club_only === '1'
              const ownerId = Number(p.user_id)
              const isOwnLot =
                Number.isFinite(ownerId) &&
                Number.isFinite(viewerUserIdRef.current) &&
                ownerId === viewerUserIdRef.current
              if (pc && !cabinetVipRef.current && !isOwnLot) return false
              return true
            })
            if (toAdd.length === 0) return prev
            const merged = sortListingsByAuctionTimer([...toAdd, ...prev])
            return merged
          })
        } catch (_) {}
      }
      eventSource.onerror = () => {
        if (cancelled) return
        if (eventSource) {
          eventSource.close()
          eventSource = null
        }
        if (reconnectTimer) return
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null
          connect()
        }, 2000)
      }
    }
    connect()
    return () => {
      cancelled = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (eventSource) eventSource.close()
    }
  }, [])

  useEffect(() => {
    const applyBidToState = (propertyId, bid, sourceTable) => {
      if (!Number.isFinite(propertyId) || !Number.isFinite(bid)) return
      setAuctionProperties((prev) =>
        prev.map((item) => {
          if (Number(item?.id) !== propertyId) return item
          return {
            ...item,
            currentBid: Math.max(resolveAuctionCurrentBidValue(item), bid),
          }
        })
      )
      patchCachedAuctionPropertyBid(propertyId, bid, sourceTable)
    }

    const syncActualBidFromApi = async (propertyId, sourceTable) => {
      try {
        const apiBase = await getApiBaseUrl()
        const table =
          sourceTable ??
          auctionProperties.find((p) => Number(p?.id) === propertyId)?.source_table ??
          auctionProperties.find((p) => Number(p?.id) === propertyId)?.sourceTable
        const q =
          table != null
            ? `?property_table=${encodeURIComponent(String(table))}`
            : ''
        const response = await fetch(`${apiBase}/bids/property/${propertyId}${q}`)
        if (!response.ok) return
        const payload = await response.json()
        const bids = payload?.success && Array.isArray(payload?.data) ? payload.data : []
        if (bids.length === 0) return
        const maxBid = Math.max(
          ...bids
            .map((b) => Number(b?.bid_amount))
            .filter((n) => Number.isFinite(n))
        )
        if (Number.isFinite(maxBid)) {
          applyBidToState(propertyId, maxBid, table)
        }
      } catch {
        // ignore network sync errors
      }
    }

    const handleBidSync = (event) => {
      const propertyId = Number(event?.detail?.propertyId)
      const bid = Number(event?.detail?.currentBid)
      const propertyTable = event?.detail?.property_table
      if (!Number.isFinite(propertyId)) return
      if (Number.isFinite(bid)) applyBidToState(propertyId, bid, propertyTable)
      void syncActualBidFromApi(propertyId, propertyTable)
    }

    window.addEventListener('syb-auction-current-bid-updated', handleBidSync)
    return () => window.removeEventListener('syb-auction-current-bid-updated', handleBidSync)
  }, [])

  // Синхронизация числового userId после Clerk→БД (депозит не должен «обнуляться» из‑за user_xxx в storage)
  useEffect(() => {
    const applyNumericUserIdFromStorage = () => {
      const savedUserId = localStorage.getItem('userId')
      if (savedUserId && /^\d+$/.test(savedUserId)) {
        const n = parseInt(savedUserId, 10)
        setDbUserId((prev) => (prev === n ? prev : n))
      }
    }
    applyNumericUserIdFromStorage()
    window.addEventListener(CLERK_DB_USER_SYNCED, applyNumericUserIdFromStorage)
    return () => window.removeEventListener(CLERK_DB_USER_SYNCED, applyNumericUserIdFromStorage)
  }, [])

  // Числовой id БД — после idle, без ожидания Clerk
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const id = await fetchNumericDbUserIdForApi({ clerkUser: null, clerkUserLoaded: false })
      if (!cancelled && id != null) {
        setDbUserId((prev) => (prev === id ? prev : id))
      }
    }
    const schedule =
      typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function'
        ? () => window.requestIdleCallback(() => void run(), { timeout: 5000 })
        : () => window.setTimeout(() => void run(), 1200)
    const handle = schedule()
    return () => {
      cancelled = true
      if (typeof handle === 'number') {
        if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
          window.cancelIdleCallback(handle)
        } else if (typeof window !== 'undefined') {
          window.clearTimeout(handle)
        }
      }
    }
  }, [])

  // Загружаем депозит пользователя (после idle — не конкурирует с листингом)
  useEffect(() => {
    let cancelled = false

    const loadUserDeposit = async () => {
      if (!canShowBuyerDeposit()) {
        setUserDeposit(0)
        setDepositLoading(false)
        return
      }

      if (!dbUserId) {
        if (!localStorage.getItem('isLoggedIn') || localStorage.getItem('isLoggedIn') !== 'true') {
          setUserDeposit(0)
        }
        setDepositLoading(false)
        return
      }

      setDepositLoading(true)
      try {
        const API_BASE_URL = await getApiBaseUrl()
        const deposit = await fetchUserDeposit(API_BASE_URL, dbUserId, { ttlMs: 15000 })
        if (
          !cancelled &&
          deposit &&
          typeof deposit.depositAmount === 'number'
        ) {
          setUserDeposit(deposit.depositAmount || 0)
        }
      } catch (error) {
        console.error('Ошибка загрузки депозита:', error)
        if (!cancelled) setUserDeposit(0)
      } finally {
        if (!cancelled) setDepositLoading(false)
      }
    }

    const schedule =
      typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function'
        ? () => window.requestIdleCallback(() => void loadUserDeposit(), { timeout: 6000 })
        : () => window.setTimeout(() => void loadUserDeposit(), 1500)

    const handle = schedule()
    const onFocus = () => void loadUserDeposit()
    window.addEventListener('focus', onFocus)
    return () => {
      cancelled = true
      window.removeEventListener('focus', onFocus)
      if (typeof handle === 'number') {
        if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
          window.cancelIdleCallback(handle)
        } else if (typeof window !== 'undefined') {
          window.clearTimeout(handle)
        }
      }
    }
  }, [dbUserId])

  const canShowDeposit = canShowBuyerDeposit

  const openAiChat = useCallback(() => {
    window.dispatchEvent(new CustomEvent('openAIChat'))
  }, [])

  const handleRecommendationClick = useCallback(
    (property) => {
      if (!property || !ensureCanOpenProperty()) return
      navigate(getPropertyDetailPath(property.id ?? property.key, { property }), {
        state: { property },
      })
    },
    [navigate],
  )

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('configureAIChatHost', {
        detail: {
          recommendationProperties: auctionProperties,
          onRecommendationClick: handleRecommendationClick,
        },
      }),
    )
    return () => {
      window.dispatchEvent(
        new CustomEvent('configureAIChatHost', {
          detail: { recommendationProperties: [] },
        }),
      )
    }
  }, [auctionProperties, handleRecommendationClick])

  useEffect(() => {
    const node = faqSentinelRef.current
    if (!node || showFaq) return undefined
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShowFaq(true)
          observer.disconnect()
        }
      },
      { rootMargin: '240px 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [showFaq])

  return (
    <div className={isAuctionRoute ? 'home-page home-page--auction' : 'home-page'}>
      <Suspense fallback={null}>
        <SiteChatDockLazy
          wrapperClassName="home-auction-floats"
          footerNear={floatWidgetsHiddenByFooter}
        >
          {canShowDeposit() &&
            (depositLoading ? (
              <DepositButtonSkeleton />
            ) : (
              <DepositButton amount={userDeposit} />
            ))}
        </SiteChatDockLazy>
      </Suspense>

      <Header />
      <Hero staticMobileCards={isAuctionRoute} auctionScene={isAuctionRoute} />
      <div ref={homeListRef} className="home-list-wrap">
        <PropertyList
          auctionProperties={auctionProperties}
          onOpenAIChat={openAiChat}
          loading={loading}
          floatWidgetsHiddenByFooter={floatWidgetsHiddenByFooter}
          viewerHasVip={cabinetVipActive}
        />
      </div>
      {isAuctionRoute ? (
        <>
          <div ref={faqSentinelRef} aria-hidden="true" />
          {showFaq ? (
            <Suspense fallback={null}>
              <AuctionBelowFoldLazy />
            </Suspense>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

export default Home

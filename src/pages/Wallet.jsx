import { useNavigate, Link, useSearchParams, useLocation } from 'react-router-dom'
import { useState, useEffect, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { AUCTION_DEPOSIT_MIN_EUR } from '../utils/auctionDeposit'
import { FaArrowLeft, FaArrowUp, FaArrowDown } from 'react-icons/fa'
import { FiClock } from 'react-icons/fi'
import { useUser, useAuth } from '@clerk/clerk-react'
import {
  TonConnectUIProvider,
  useTonConnectUI,
  useTonAddress,
  useTonWallet,
} from '@tonconnect/ui-react'
import {
  getUserData,
  isAuthenticated,
  CLERK_DB_USER_SYNCED,
  fetchNumericDbUserIdForApi,
  getStoredNumericUserId,
} from '../services/authService'
import { getApiBaseUrl, getApiBaseUrlSync } from '../utils/apiConfig'
import UserBidHistoryModal from '../components/UserBidHistoryModal'
import BuyNowModal from '../components/BuyNowModal'
import DepositTopUpPicker from '../components/DepositTopUpPicker'
import DepositSuccessDrawer from '../components/DepositSuccessDrawer'
import SellerVerificationModal from '../components/SellerVerificationModal'
import { showNotification } from '../utils/toastHelper'
import { getCurrencySymbol } from '../utils/currency'
import { requestOpenLoginModal } from '../utils/requestOpenLoginModal'
import {
  startDepositWalletCheckout,
  confirmWalletDepositSession,
  confirmPropertyReservationSession,
} from '../utils/subscriptionCheckout'
import { getUsdtJettonWalletAddress, buildUsdtTransferTransaction } from '../utils/tonUsdt'
import { ensureCanOpenProperty } from '../utils/propertyAccessGuard'
import { isSiteUserSignedIn } from '../utils/siteAuthGate'
import { hasEmailForBuyNowFlow } from '../utils/buyNowEmailGate'
import PropertyListingCard from '../components/PropertyListingCard'
import { formatPropertyForListingCard } from '../utils/formatPropertyListingCard'
import { enrichBidsWithPropertySpecs } from '../utils/enrichBidsWithPropertySpecs'
import { isAuctionListingEnded } from '../utils/auctionReminderBounds'
import { getPropertyDetailPath } from '../utils/propertyDetailUrl'
import { getPropertyCardImage } from '../utils/propertyImage'
import { buildResponsiveImageProps } from '../utils/responsiveImage'
import ImageWithSkeleton from '../components/ImageWithSkeleton'
import '../components/PropertyListingGrid.css'
import '../components/PropertyList.css'
import {
  isSafeWalletFromPath,
  getWalletEntryFrom,
  clearWalletEntryFrom,
  setWalletEntryFrom,
} from '../utils/walletNavigation'
import './Wallet.css'

// Используем синхронную версию для инициализации, затем обновим при загрузке
let API_BASE_URL = getApiBaseUrlSync()

// Адрес кошелька для приёма оплаты (0.01 USDT приходит на этот TON-адрес)
const USDT_PAYMENT_RECIPIENT = 'UQA8j4T1Au4jDjWTfl_PrB4_Whoo15RZhszE9E6gxUvu7OTI'

const getTonManifestUrl = () =>
  typeof window !== 'undefined'
    ? `${window.location.origin}/tonconnect-manifest.json`
    : '/tonconnect-manifest.json'

const FOCUS_RELOAD_THROTTLE_MS = 15000

const isSameTransactionList = (prev = [], next = []) => {
  if (prev === next) return true
  if (!Array.isArray(prev) || !Array.isArray(next)) return false
  if (prev.length !== next.length) return false
  for (let i = 0; i < prev.length; i += 1) {
    const a = prev[i]
    const b = next[i]
    if (
      a?.id !== b?.id ||
      a?.amount !== b?.amount ||
      a?.type !== b?.type ||
      a?.description !== b?.description ||
      a?.created_at !== b?.created_at
    ) {
      return false
    }
  }
  return true
}

const isSameBid = (prev, next) => {
  if (prev === next) return true
  if (!prev || !next) return false
  return (
    prev.property_id === next.property_id &&
    prev.bid_amount === next.bid_amount &&
    prev.created_at === next.created_at &&
    prev.auction_end_date === next.auction_end_date &&
    prev.is_auction === next.is_auction &&
    prev.area === next.area &&
    prev.rooms === next.rooms &&
    prev.bedrooms === next.bedrooms &&
    prev.bathrooms === next.bathrooms
  )
}

const bidPropertyKey = (bid) =>
  `${bid.property_table || 'properties'}:${bid.property_id}`

/** API отдаёт все записи ставок по убыванию created_at — берём последнюю на каждый объект. */
const dedupeLatestBidPerProperty = (bids) => {
  const seen = new Set()
  const result = []
  for (const bid of bids) {
    const key = bidPropertyKey(bid)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(bid)
  }
  return result
}

/** Активная ставка на депозите — аукцион ещё не завершён (как на странице аукциона). */
const isDepositPageActiveBid = (bid) => {
  const property = formatPropertyForListingCard({
    ...bid,
    id: bid.property_id,
    endTime: bid.endTime ?? bid.auction_end_date ?? null,
  })
  return !isAuctionListingEnded(property)
}

const isSameBidList = (prev = [], next = []) => {
  if (prev === next) return true
  if (!Array.isArray(prev) || !Array.isArray(next)) return false
  if (prev.length !== next.length) return false
  for (let i = 0; i < prev.length; i += 1) {
    if (!isSameBid(prev[i], next[i])) return false
  }
  return true
}

const formatBidAsListingProperty = (bid) =>
  formatPropertyForListingCard({
    ...bid,
    id: bid.property_id,
    description: '',
    current_bid: bid.bid_amount,
    auction_current_bid: bid.bid_amount,
    currentBid: bid.bid_amount,
  })

const resolveWonPropertyFromBid = async (bid, dbUserId, apiBase) => {
  if (!bid.is_auction || !bid.auction_end_date) return null
  if (new Date(bid.auction_end_date).getTime() > Date.now()) return null
  try {
    const propertyBidsRes = await fetch(`${apiBase}/bids/property/${bid.property_id}`)
    if (!propertyBidsRes.ok) return null
    const propertyBidsData = await propertyBidsRes.json()
    if (!propertyBidsData.success || !propertyBidsData.data?.length) return null
    const maxBid = Math.max(...propertyBidsData.data.map((b) => b.bid_amount))
    const userBidsOnProperty = propertyBidsData.data.filter((b) => b.user_id === dbUserId)
    const userMaxBid =
      userBidsOnProperty.length > 0
        ? Math.max(...userBidsOnProperty.map((b) => b.bid_amount))
        : 0
    const isWinner = userMaxBid === maxBid && userMaxBid > 0
    if (!isWinner) return null
    return { ...bid, bid_amount: userMaxBid }
  } catch (error) {
    console.error('Ошибка проверки выигранного объекта:', error)
    return null
  }
}

const WalletInner = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const walletDepositHandledRef = useRef(null)
  const walletReservationHandledRef = useRef(null)
  const lastFocusReloadAtRef = useRef(0)
  const { user, isLoaded: userLoaded } = useUser()
  const buyNowEmailOk = useMemo(() => hasEmailForBuyNowFlow(user, userLoaded), [user, userLoaded])
  const { isSignedIn, isLoaded: authLoaded } = useAuth()
  const userData = getUserData()
  const [dbUserId, setDbUserId] = useState(() => getStoredNumericUserId())
  
  // Получаем числовой ID из БД
  const getUserId = () => {
    // Если уже есть числовой ID в состоянии, используем его
    if (dbUserId) {
      return dbUserId
    }
    
    // Проверяем, является ли ID из getUserData числовым
    const savedUserId = localStorage.getItem('userId')
    if (savedUserId && /^\d+$/.test(savedUserId)) {
      return parseInt(savedUserId)
    }
    
    // Если ID не числовой (Clerk ID), возвращаем null - нужно получить из БД
    const userId = userData?.id
    if (userId && /^\d+$/.test(userId.toString())) {
      return parseInt(userId)
    }
    
    return null
  }
  
  const userId = getUserId()

  // Сохраняем «откуда пришли» в sessionStorage — после Stripe location.state теряется
  useEffect(() => {
    const from = location.state?.from
    if (isSafeWalletFromPath(from)) {
      setWalletEntryFrom(from)
    }
  }, [location.state])

  useEffect(() => {
    if (!userLoaded) return
    if (!isSiteUserSignedIn(user, userLoaded)) {
      requestOpenLoginModal({ wizard: true })
      navigate('/', { replace: true })
    }
  }, [user, userLoaded, navigate])

  const [depositAmount, setDepositAmount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [analytics, setAnalytics] = useState({
    totalDeposit: 0,
    totalWithdrawal: 0
  })
  const [userBids, setUserBids] = useState([])
  const [bidForHistory, setBidForHistory] = useState(null)
  const [showBidHistory, setShowBidHistory] = useState(false)
  const [wonProperty, setWonProperty] = useState(null) // Выигранный объект
  const [isBuyNowModalOpen, setIsBuyNowModalOpen] = useState(false)
  const [showTopUpPicker, setShowTopUpPicker] = useState(false)
  const [stripeCheckoutLoading, setStripeCheckoutLoading] = useState(false)
  const [showVerificationAfterTopUp, setShowVerificationAfterTopUp] = useState(false)
  const [showDepositSuccessDrawer, setShowDepositSuccessDrawer] = useState(false)
  const [tonConnectUI] = useTonConnectUI()
  const tonAddress = useTonAddress()
  const tonWallet = useTonWallet()
  const [tonPaymentLoading, setTonPaymentLoading] = useState(false)
  const [tonPaymentSuccess, setTonPaymentSuccess] = useState(false)

  const shortenAddress = (addr) => {
    if (!addr || addr.length < 12) return addr || ''
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`
  }

  const handlePayUsdt = async () => {
    if (!tonConnectUI || !tonAddress) return
    setTonPaymentLoading(true)
    setTonPaymentSuccess(false)
    try {
      const apiBase = typeof API_BASE_URL === 'string' ? API_BASE_URL : ''
      const senderJettonWallet = await getUsdtJettonWalletAddress(tonAddress, apiBase)
      if (!senderJettonWallet) {
        showNotification(t('walletPage_tonUsdtWalletError'), 'error')
        setTonPaymentLoading(false)
        return
      }
      const transaction = buildUsdtTransferTransaction(
        senderJettonWallet,
        USDT_PAYMENT_RECIPIENT,
        tonAddress
      )
      if (!transaction) {
        showNotification(t('walletPage_tonTxBuildError'), 'error')
        setTonPaymentLoading(false)
        return
      }
      await tonConnectUI.sendTransaction(transaction)
      setTonPaymentSuccess(true)
      showNotification(t('walletPage_tonPaymentSuccess'))
    } catch (err) {
      const message = String(err?.message || '')
      const isRejected = /reject|cancel|denied/i.test(message)
      const isNotSent = /transaction was not sent|not sent/i.test(message)
      if (isRejected) return
      if (isNotSent) {
        showNotification(t('walletPage_tonTxNotSent'), 'error')
        return
      }
      showNotification(message || t('walletPage_tonTxFailed'), 'error')
    } finally {
      setTonPaymentLoading(false)
    }
  }

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

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const id = await fetchNumericDbUserIdForApi({
        clerkUser: user,
        clerkUserLoaded: userLoaded,
      })
      if (!cancelled && id != null) {
        setDbUserId((prev) => (prev === id ? prev : id))
      }
    }
    void run()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLoaded, user?.id, user?.primaryEmailAddress?.emailAddress])

  // Не оставляем кошелёк в вечной загрузке, если числовой id не удалось получить
  useEffect(() => {
    if (dbUserId) return
    const timer = window.setTimeout(() => {
      const raw = localStorage.getItem('userId')
      const hasNumeric = raw && /^\d+$/.test(raw)
      if (hasNumeric) return
      const guest = authLoaded && !isSignedIn && !isAuthenticated()
      if (guest) {
        setLoading(false)
        return
      }
      if (userLoaded && authLoaded) {
        setLoading(false)
      }
    }, 4000)
    return () => window.clearTimeout(timer)
  }, [dbUserId, userLoaded, authLoaded, isSignedIn])

  // Инициализируем API URL при монтировании компонента
  useEffect(() => {
    const initApiUrl = async () => {
      const url = await getApiBaseUrl()
      API_BASE_URL = url
    }
    initApiUrl()
  }, [])

  // Загружаем данные пользователя
  useEffect(() => {
    if (!dbUserId) {
      // Ждем получения числового ID из БД
      return
    }
    
    // Инициализируем API URL и загружаем данные
    const initAndLoad = async () => {
      if (!API_BASE_URL || API_BASE_URL.includes('localhost')) {
        const url = await getApiBaseUrl()
        API_BASE_URL = url
      }
      await loadUserData(true)
    }
    initAndLoad()
    
    const onFocus = () => {
      if (!API_BASE_URL || API_BASE_URL.includes('localhost')) return
      const now = Date.now()
      if (now - lastFocusReloadAtRef.current < FOCUS_RELOAD_THROTTLE_MS) return
      lastFocusReloadAtRef.current = now
      loadUserData(false)
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbUserId])

  const loadUserData = async (showLoading = false) => {
    if (!dbUserId) {
      return
    }
    
    try {
      if (showLoading) {
        setLoading(true)
      }
      
      // Делаем запросы независимо, чтобы ошибка одного не блокировала остальные
      const fetchWithErrorHandling = async (url, errorMessage) => {
        try {
          const response = await fetch(url)
          return { ok: response.ok, response }
        } catch (error) {
          console.warn(`${errorMessage}:`, error)
          return { ok: false, response: null, error }
        }
      }
      
      const [depositResult, transactionsResult, analyticsResult, bidsResult] = await Promise.allSettled([
        fetchWithErrorHandling(`${API_BASE_URL}/users/${dbUserId}/deposit`, 'Ошибка загрузки депозита'),
        fetchWithErrorHandling(`${API_BASE_URL}/users/${dbUserId}/transactions`, 'Ошибка загрузки транзакций'),
        fetchWithErrorHandling(`${API_BASE_URL}/users/${dbUserId}/analytics`, 'Ошибка загрузки аналитики'),
        fetchWithErrorHandling(`${API_BASE_URL}/bids/user/${dbUserId}`, 'Ошибка загрузки ставок')
      ])
      
      const depositRes = depositResult.status === 'fulfilled' ? depositResult.value.response : null
      const transactionsRes = transactionsResult.status === 'fulfilled' ? transactionsResult.value.response : null
      const analyticsRes = analyticsResult.status === 'fulfilled' ? analyticsResult.value.response : null
      const bidsRes = bidsResult.status === 'fulfilled' ? bidsResult.value.response : null

      if (depositRes && depositRes.ok) {
        const depositData = await depositRes.json()
        if (depositData.success) {
          const newDeposit = depositData.data.depositAmount || 0
          setDepositAmount(prev => {
            if (prev !== newDeposit) {
              return newDeposit
            }
            return prev
          })
        }
      }

      if (transactionsRes && transactionsRes.ok) {
        const transData = await transactionsRes.json()
        if (transData.success) {
          const newTransactions = transData.data || []
          setTransactions((prev) => (isSameTransactionList(prev, newTransactions) ? prev : newTransactions))
        }
      }

      if (analyticsRes && analyticsRes.ok) {
        const analyticsData = await analyticsRes.json()
        if (analyticsData.success) {
          const newAnalytics = {
            totalDeposit: analyticsData.data.totalDeposit || 0,
            totalWithdrawal: analyticsData.data.totalWithdrawal || 0
          }
          setAnalytics(prev => {
            if (prev.totalDeposit !== newAnalytics.totalDeposit || 
                prev.totalWithdrawal !== newAnalytics.totalWithdrawal) {
              return newAnalytics
            }
            return prev
          })
        }
      }

      // Загружаем ставки пользователя (по одному объекту — последняя ставка)
      if (bidsRes && bidsRes.ok) {
        const bidsData = await bidsRes.json()
        if (bidsData.success && bidsData.data && bidsData.data.length > 0) {
          const latestPerProperty = dedupeLatestBidPerProperty(bidsData.data)
          const wonChecks = await Promise.all(
            latestPerProperty.map((bid) =>
              resolveWonPropertyFromBid(bid, dbUserId, API_BASE_URL)
            )
          )
          const won = wonChecks.find(Boolean) ?? null
          const activeBids = latestPerProperty.filter((bid, index) => {
            if (wonChecks[index]) return false
            return isDepositPageActiveBid(bid)
          })
          const activeBidsWithSpecs = await enrichBidsWithPropertySpecs(
            activeBids,
            API_BASE_URL,
          )
          setUserBids((prev) =>
            isSameBidList(prev, activeBidsWithSpecs) ? prev : activeBidsWithSpecs,
          )
          setWonProperty((prev) => {
            if (!won && !prev) return prev
            if (won && prev && isSameBid(prev, won)) return prev
            if (!won) return null
            return won
          })
        } else {
          setUserBids((prev) => (prev.length === 0 ? prev : []))
          setWonProperty(null)
        }
      } else {
        setWonProperty(null)
      }
    } catch (error) {
      console.error('Ошибка загрузки данных:', error)
    } finally {
      if (showLoading) {
        setLoading(false)
        setIsInitialLoad(false)
      }
    }
  }

  const formatAmount = (amount) => {
    if (amount >= 1000000) {
      return `€${(amount / 1000000).toFixed(2)}M`
    }
    return `€${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  useEffect(() => {
    if (!dbUserId) return
    const status = searchParams.get('deposit_checkout')
    const sessionId = searchParams.get('session_id')
    if (status !== 'success' || !sessionId) return
    if (walletDepositHandledRef.current === sessionId) return
    walletDepositHandledRef.current = sessionId

    const run = async () => {
      try {
        const result = await confirmWalletDepositSession(sessionId, dbUserId)
        if (result.ok) {
          if (result.data?.credited && typeof result.data.amountEur === 'number') {
            let isVerified = false
            try {
              const resV = await fetch(`${API_BASE_URL}/users/${dbUserId}/verification-status`)
              if (resV.ok) {
                const json = await resV.json()
                isVerified = Boolean(json.success && json.data?.isVerified)
              }
            } catch {
              /* treat as unverified */
            }
            await loadUserData(false)
            if (isVerified) {
              setShowDepositSuccessDrawer(true)
            } else {
              showNotification(
                t('walletPage_paymentCredited', { amount: formatAmount(result.data.amountEur) }),
              )
              setShowVerificationAfterTopUp(true)
            }
          } else if (result.data?.already) {
            showNotification(t('walletPage_paymentAlreadyRecorded'))
            await loadUserData(false)
          } else {
            await loadUserData(false)
          }
        } else {
          showNotification(result.error || t('walletPage_paymentConfirmError'), 'error')
        }
      } catch (e) {
        showNotification(e?.message || t('walletPage_networkError'), 'error')
      } finally {
        const next = new URLSearchParams(searchParams)
        next.delete('deposit_checkout')
        next.delete('session_id')
        setSearchParams(next, { replace: true })
      }
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbUserId, searchParams, setSearchParams])

  useEffect(() => {
    if (!dbUserId) return
    const rc = searchParams.get('reservation_checkout')
    const sessionId = searchParams.get('session_id')
    if (rc !== 'success' || !sessionId || !sessionId.startsWith('cs_')) return
    if (walletReservationHandledRef.current === sessionId) return
    walletReservationHandledRef.current = sessionId

    const run = async () => {
      try {
        const result = await confirmPropertyReservationSession(sessionId, dbUserId)
        if (result.ok) {
          if (result.data?.already) {
            showNotification(t('walletPage_reservationAlreadyRecorded'))
          } else {
            showNotification(t('walletPage_reservationSuccess'))
          }
          await loadUserData(false)
        } else {
          showNotification(result.error || t('walletPage_reservationConfirmError'), 'error')
        }
      } catch (e) {
        showNotification(e?.message || t('walletPage_networkError'), 'error')
      } finally {
        const next = new URLSearchParams(searchParams)
        next.delete('reservation_checkout')
        next.delete('session_id')
        setSearchParams(next, { replace: true })
      }
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbUserId, searchParams, setSearchParams])

  const handleStripeDeposit = async () => {
    if (!dbUserId) {
      requestOpenLoginModal({ wizard: true })
      return
    }
    setStripeCheckoutLoading(true)
    try {
      const customerEmail =
        user?.primaryEmailAddress?.emailAddress ||
        user?.emailAddresses?.[0]?.emailAddress ||
        undefined
      const result = await startDepositWalletCheckout({
        userId: dbUserId,
        customerEmail,
      })
      if (!result.ok) {
        showNotification(result.error || t('walletPage_stripeCheckoutError'), 'error')
      }
    } finally {
      setStripeCheckoutLoading(false)
    }
  }

  const handleWithdraw = async () => {
    const amount = prompt(t('walletPage_withdrawPrompt'))
    if (!amount || parseFloat(amount) <= 0) {
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/users/${dbUserId}/deposit/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount: parseFloat(amount) })
      })

      const data = await response.json()
      if (data.success) {
        setDepositAmount(data.data.depositAmount)
        await loadUserData()
        showNotification(t('walletPage_withdrawSuccess', { amount }))
      } else {
        showNotification(data.error || t('walletPage_withdrawError'))
      }
    } catch (error) {
      console.error('Ошибка вывода:', error)
      showNotification(t('walletPage_withdrawError'))
    }
  }

  const navigateToWalletEntryOrigin = () => {
    const fromState = location.state?.from
    const from = isSafeWalletFromPath(fromState) ? fromState : getWalletEntryFrom()
    if (from) {
      clearWalletEntryFrom()
      navigate(from)
      return true
    }
    return false
  }

  const handleWalletBack = () => {
    if (navigateToWalletEntryOrigin()) return
    const idx = window.history.state?.idx
    if (typeof idx === 'number' && idx > 0) {
      navigate(-1)
      return
    }
    navigate('/auction')
  }

  const handleDepositSuccessContinue = () => {
    setShowDepositSuccessDrawer(false)
    if (navigateToWalletEntryOrigin()) return
    navigate('/auction')
  }

  const handleBookNow = () => {
    // Проверяем авторизацию
    const isClerkAuth = user && userLoaded
    const isOldAuth = isAuthenticated()
    
    if (!isClerkAuth && !isOldAuth) {
      requestOpenLoginModal({ wizard: true })
      return
    }
    
    // Проверяем, что пользователь не является продавцом
    const userRole = userData?.role || 'buyer'
    if (userRole === 'seller' || userRole === 'owner') {
      showNotification(t('walletPage_sellersCannotBuy'))
      return
    }

    if (!buyNowEmailOk) {
      showNotification(t('walletPage_emailRequiredBuy'))
      return
    }
    
    setIsBuyNowModalOpen(true)
  }

  // Показываем загрузку, если данные еще не загружены или dbUserId не получен
  if (loading || !dbUserId) {
    return (
      <div className="wallet-page">
        <div className="wallet-background">
          <div className="wallet-background__gradient"></div>
          <div className="wallet-background__pattern"></div>
        </div>
        {location.pathname === '/deposit' ? (
          <div className="wallet-page__footer-blend" aria-hidden />
        ) : null}
        <div className="wallet-container">
          <div style={{ 
            textAlign: 'center', 
            padding: '50px', 
            color: loadError ? '#dc2626' : '#1f2937',
            fontSize: '18px',
            fontWeight: '600',
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '12px',
            margin: '50px auto',
            maxWidth: '500px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)'
          }}>
            {loadError ? (
              <>
                <p style={{ marginBottom: '20px' }}>{loadError}</p>
                <button
                  onClick={() => window.location.reload()}
                  style={{
                    padding: '10px 20px',
                    background: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '600'
                  }}
                >
                  {t('walletPage_reloadPage')}
                </button>
              </>
            ) : (
              !dbUserId ? t('walletPage_loadingUser') : t('walletPage_loading')
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="wallet-page">
      <div className="wallet-background">
        <div className="wallet-background__gradient"></div>
        <div className="wallet-background__pattern"></div>
      </div>
      {location.pathname === '/deposit' ? (
        <div className="wallet-page__footer-blend" aria-hidden />
      ) : null}

      <div className="wallet-container">
        {/* Заголовок */}
        <div className="wallet-header">
          <button type="button" onClick={handleWalletBack} className="wallet-back-button">
            <FaArrowLeft />
            <span>{t('walletPage_back')}</span>
          </button>
          <h1 className="wallet-title">{t('walletPage_title')}</h1>
        </div>

        {/* Инструкция о депозите */}
        <div className="deposit-instruction">
          <div className="deposit-instruction__content">
            <h2>{t('walletPage_whatIsDepositTitle')}</h2>
            <p>{t('walletPage_whatIsDepositText', { amount: AUCTION_DEPOSIT_MIN_EUR })}</p>
          </div>
        </div>

        {/* Блок депозита и пополнения — карта скрыта, пополнение через Picker */}
        <div className="wallet-card-section deposit-main-block">
          <div className="deposit-info-block">
            <div className="deposit-info-label">{t('walletPage_depositLabel')}</div>
            <div className="deposit-info-amount">{formatAmount(depositAmount)}</div>
          </div>
          <div className="wallet-actions">
            <button
              className="wallet-action-btn deposit-action"
              onClick={() => setShowTopUpPicker(true)}
            >
              <div className="wallet-action-icon-wrapper">
                <FaArrowUp className="wallet-action-icon" />
              </div>
              <span>{t('walletPage_topUp')}</span>
            </button>
            <button
              className="wallet-action-btn withdraw-action"
              onClick={handleWithdraw}
            >
              <div className="wallet-action-icon-wrapper">
                <FaArrowDown className="wallet-action-icon" />
              </div>
              <span>{t('walletPage_withdraw')}</span>
            </button>
          </div>
        </div>

        {/* Picker и модалки пополнения */}
        <DepositTopUpPicker
          isOpen={showTopUpPicker}
          onClose={() => setShowTopUpPicker(false)}
          onSelectStripe={handleStripeDeposit}
          stripeCheckoutLoading={stripeCheckoutLoading}
          tonWallet={tonWallet}
          tonAddress={tonAddress}
          tonConnectUI={tonConnectUI}
          onPayUsdt={handlePayUsdt}
          tonPaymentLoading={tonPaymentLoading}
          tonPaymentSuccess={tonPaymentSuccess}
          shortenAddress={shortenAddress}
        />
        <DepositSuccessDrawer
          isOpen={showDepositSuccessDrawer}
          onClose={() => setShowDepositSuccessDrawer(false)}
          balanceFormatted={formatAmount(depositAmount)}
          onContinue={handleDepositSuccessContinue}
        />
        {dbUserId && (
          <SellerVerificationModal
            isOpen={showVerificationAfterTopUp}
            onClose={() => setShowVerificationAfterTopUp(false)}
            userId={dbUserId}
            required
            title={t('walletPage_verificationTitle')}
            subtitle={t('walletPage_verificationSubtitle')}
            onComplete={async () => {
              setShowVerificationAfterTopUp(false)
              return true
            }}
          />
        )}

        {/* Выигранный объект */}
        {wonProperty && (
          <div className="wallet-won-object">
            <div className="wallet-won-object__badge">
              <span className="wallet-won-object__badge-icon">🏆</span>
              <span className="wallet-won-object__badge-text">{t('walletPage_wonAuctionBadge')}</span>
            </div>
            <div className="wallet-won-object__content">
              <div className="wallet-won-object__image-wrapper">
                {(() => {
                  const photoUrl = getPropertyCardImage(wonProperty, null)
                  const imageProps = buildResponsiveImageProps(photoUrl, {
                    widths: [220, 320, 420],
                    sizes: '220px',
                    fit: 'cover',
                    quality: 72,
                    format: 'webp',
                  })
                  
                  return photoUrl ? (
                    <ImageWithSkeleton
                      imgProps={imageProps}
                      alt={wonProperty.title || t('walletPage_propertyAlt')}
                      className="wallet-won-object__image"
                      containerClassName="wallet-won-object__image"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="wallet-won-object__image-placeholder">
                      {t('walletPage_noPhoto')}
                    </div>
                  )
                })()}
              </div>
              <div className="wallet-won-object__info">
                <h3 className="wallet-won-object__title">{wonProperty.title}</h3>
                {wonProperty.location && (
                  <p className="wallet-won-object__location">{wonProperty.location}</p>
                )}
                <div className="wallet-won-object__bid-info">
                  <span className="wallet-won-object__bid-label">{t('walletPage_winningBidLabel')}</span>
                  <span className="wallet-won-object__bid-amount">
                    {getCurrencySymbol(wonProperty.currency)}
                    {wonProperty.bid_amount.toLocaleString(i18n.language, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <button
                  className="wallet-won-object__buy-btn"
                  onClick={handleBookNow}
                  disabled={!buyNowEmailOk}
                  title={!buyNowEmailOk ? t('walletPage_emailRequiredTitle') : undefined}
                  style={{
                    opacity: !buyNowEmailOk ? 0.5 : 1,
                    cursor: !buyNowEmailOk ? 'not-allowed' : 'pointer',
                  }}
                >
                  {t('walletPage_goToPurchase')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Объекты с активными ставками */}
        {userBids.length > 0 && !wonProperty && (
          <div className="wallet-bid-object">
            <h3 className="wallet-bid-object__heading">
              {userBids.length > 1
                ? t('walletPage_activeBidsHeading')
                : t('walletPage_activeBidHeading')}
            </h3>
            <div className="wallet-bid-objects properties-grid property-listing-grid">
              {userBids.map((bid) => {
                const listingProperty = formatBidAsListingProperty(bid)
                return (
                  <div key={bidPropertyKey(bid)} className="wallet-bid-object__panel">
                    <PropertyListingCard
                      property={listingProperty}
                      onOpen={() => {
                        if (!ensureCanOpenProperty()) return
                        navigate(
                          getPropertyDetailPath(bid.property_id, { property: listingProperty }),
                          { state: { property: listingProperty } }
                        )
                      }}
                      showFavorite={false}
                      showDescription={false}
                      showTimer={false}
                      showActions={false}
                      pinFooter
                      bidInfoLabel={t('walletPage_yourBidLabel')}
                      bidInfoAmount={bid.bid_amount}
                      imageTopRightAction={{
                        ariaLabel: t('walletPage_history'),
                        icon: <FiClock size={18} aria-hidden />,
                        onClick: () => {
                          setBidForHistory(bid)
                          setShowBidHistory(true)
                        },
                      }}
                      footerAction={
                        <Link
                          to={getPropertyDetailPath(bid.property_id, { property: listingProperty })}
                          className="wallet-bid-object__btn wallet-bid-object__btn--primary"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (!ensureCanOpenProperty()) {
                              e.preventDefault()
                            }
                          }}
                        >
                          {t('walletPage_goToProperty')}
                        </Link>
                      }
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Модальное окно истории ставок */}
        {bidForHistory && (
          <UserBidHistoryModal
            isOpen={showBidHistory}
            onClose={() => setShowBidHistory(false)}
            property={{
              id: bidForHistory.property_id,
              title: bidForHistory.title,
              location: bidForHistory.location,
            }}
            userId={dbUserId}
          />
        )}

        {/* Аналитика и Транзакции в одной строке */}
        <div className="wallet-stats-transactions">
          {/* Аналитика */}
          <div className="wallet-analytics-block">
            <h2 className="wallet-analytics-title">{t('walletPage_analyticsTitle')}</h2>
            <div className="wallet-stats">
              <div className="wallet-stat-card">
                <div className="wallet-stat-header">
                  <div className="wallet-stat-label">{t('walletPage_totalWithdrawn')}</div>
                  <div className="wallet-stat-icon">
                    <FaArrowDown />
                  </div>
                </div>
                <div className="wallet-stat-amount">{formatAmount(analytics.totalWithdrawal)}</div>
              </div>
              <div className="wallet-stat-card">
                <div className="wallet-stat-header">
                  <div className="wallet-stat-label">{t('walletPage_totalDeposited')}</div>
                  <div className="wallet-stat-icon">
                    <FaArrowUp />
                  </div>
                </div>
                <div className="wallet-stat-amount">{formatAmount(analytics.totalDeposit)}</div>
              </div>
            </div>
          </div>

          {/* Транзакции */}
          <div className="wallet-transactions-block">
            <div className="wallet-transactions-header">
              <h3 className="wallet-transactions-title">{t('walletPage_transactionsTitle')}</h3>
            </div>
            
            <div className="wallet-transactions-list">
              {transactions.length === 0 ? (
                <div className="wallet-transaction-empty">{t('walletPage_noTransactions')}</div>
              ) : (
                transactions.map((transaction, index) => (
                  <div key={transaction.id || index} className="wallet-transaction-item">
                    <div className="wallet-transaction-info">
                      <div className="wallet-transaction-name">{transaction.description || transaction.type}</div>
                      <div className="wallet-transaction-time">
                        {new Date(transaction.created_at).toLocaleString(i18n.language)}
                      </div>
                    </div>
                    <div className="wallet-transaction-right">
                      <div className={`wallet-transaction-amount ${transaction.amount > 0 ? 'positive' : 'negative'}`}>
                        {transaction.amount > 0 ? '+' : ''}{formatAmount(Math.abs(transaction.amount))}
                      </div>
                      <div className="wallet-transaction-type">
                        {transaction.type === 'deposit' ? t('walletPage_txDeposit') : t('walletPage_txWithdrawal')}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Модальное окно покупки для выигранного объекта */}
        {wonProperty && (
          <BuyNowModal
            isOpen={isBuyNowModalOpen}
            onClose={() => setIsBuyNowModalOpen(false)}
            variant="auctionWinner"
            winningBidAmount={wonProperty.bid_amount}
            stripeReturnPath="/deposit"
            property={{
              id: wonProperty.property_id,
              title: wonProperty.title,
              name: wonProperty.title,
              price: wonProperty.price ?? wonProperty.bid_amount,
              currency: wonProperty.currency || 'USD',
              property_type: wonProperty.property_type,
              isAuction: true,
              currentBid: wonProperty.bid_amount
            }}
          />
        )}
      </div>
    </div>
  )
}

const Wallet = () => (
  <TonConnectUIProvider manifestUrl={getTonManifestUrl()}>
    <WalletInner />
  </TonConnectUIProvider>
)

export default Wallet

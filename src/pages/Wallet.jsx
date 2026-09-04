import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { useState, useEffect, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { FaArrowUp, FaArrowDown } from 'react-icons/fa'
import { FiArrowLeft, FiArrowRight, FiArrowUpRight, FiEye, FiEyeOff, FiMaximize, FiMenu, FiPlus } from 'react-icons/fi'
import { CreditCard, Gavel } from 'lucide-react'
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
import BuyNowModal from '../components/BuyNowModal'
import DepositTopUpPicker from '../components/DepositTopUpPicker'
import DepositSuccessModal from '../components/DepositSuccessDrawer'
import DepositInfoDrawer from '../components/DepositInfoDrawer'
import WalletAuctionQrModal from '../components/WalletAuctionQrModal'
import { NotificationsBell } from '../context/SiteNotificationsContext'
import { writeDepositVerificationGateFlag } from '../utils/depositVerificationGate'
import { showNotification } from '../utils/toastHelper'
import { getCurrencySymbol } from '../utils/currency'
import { requestOpenLoginModal } from '../utils/requestOpenLoginModal'
import {
  startDepositWalletCheckout,
  confirmWalletDepositSession,
} from '../utils/subscriptionCheckout'
import { getUsdtJettonWalletAddress, buildUsdtTransferTransaction } from '../utils/tonUsdt'
import { isSiteUserSignedIn } from '../utils/siteAuthGate'
import { hasEmailForBuyNowFlow } from '../utils/buyNowEmailGate'
import { formatPropertyForListingCard } from '../utils/formatPropertyListingCard'
import { enrichBidsWithPropertySpecs } from '../utils/enrichBidsWithPropertySpecs'
import { isAuctionListingEnded } from '../utils/auctionReminderBounds'
import { getPropertyDetailPath } from '../utils/propertyDetailUrl'
import { DRAWER_DISMISS_MS } from '../hooks/useDrawerDismiss'
import '../components/PropertyListingGrid.css'
import '../components/PropertyList.css'
import {
  isSafeWalletFromPath,
  getWalletEntryFrom,
  clearWalletEntryFrom,
  setWalletEntryFrom,
} from '../utils/walletNavigation'
import { localizeWalletTransactionDescription } from '../utils/walletTransactionDescription'
import {
  fetchIsBuyerProfileCompleteForDeposit,
} from '../utils/depositProfileGate'
import { getCabinetDataPath, getCabinetProfilePath } from '../utils/cabinetRoutes'
import './Wallet.css'
import './Wallet.bank.css'

// Используем синхронную версию для инициализации, затем обновим при загрузке
let API_BASE_URL = getApiBaseUrlSync()

// Адрес кошелька для приёма оплаты (0.01 USDT приходит на этот TON-адрес)
const USDT_PAYMENT_RECIPIENT = 'UQA8j4T1Au4jDjWTfl_PrB4_Whoo15RZhszE9E6gxUvu7OTI'

const getTonManifestUrl = () =>
  typeof window !== 'undefined'
    ? `${window.location.origin}/tonconnect-manifest.json`
    : '/tonconnect-manifest.json'

const FOCUS_RELOAD_THROTTLE_MS = 15000

const WALLET_PREVIEW_TRANSACTIONS = [
  {
    id: 'preview-deposit',
    amount: 1099,
    type: 'deposit',
    description: 'Пополнение депозита',
    created_at: '2026-08-25T09:41:00.000Z',
  },
  {
    id: 'preview-reserve',
    amount: -120.75,
    type: 'withdrawal',
    description: 'Резерв по ставке',
    created_at: '2026-08-24T18:12:00.000Z',
  },
  {
    id: 'preview-return',
    amount: 45,
    type: 'deposit',
    description: 'Возврат резерва',
    created_at: '2026-08-23T14:20:00.000Z',
  },
]

const getWalletGreetingKey = () => {
  const hour = new Date().getHours()
  if (hour < 12) return 'walletPage_greetingMorning'
  if (hour < 18) return 'walletPage_greetingAfternoon'
  return 'walletPage_greetingEvening'
}

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
  const isDesignPreview = import.meta.env.DEV && searchParams.get('walletPreview') === '1'
  const walletDepositHandledRef = useRef(null)
  const lastFocusReloadAtRef = useRef(0)
  const walletMenuRef = useRef(null)
  const [walletMenuOpen, setWalletMenuOpen] = useState(false)
  const { user, isLoaded: userLoaded } = useUser()
  const buyNowEmailOk = useMemo(() => hasEmailForBuyNowFlow(user, userLoaded), [user, userLoaded])
  const { isSignedIn, isLoaded: authLoaded } = useAuth()
  const userData = getUserData()
  const [dbUserId, setDbUserId] = useState(() => isDesignPreview ? 1 : getStoredNumericUserId())
  
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
    if (isDesignPreview) return
    if (!userLoaded) return
    if (!isSiteUserSignedIn(user, userLoaded)) {
      requestOpenLoginModal({ wizard: true })
      navigate('/', { replace: true })
    }
  }, [isDesignPreview, user, userLoaded, navigate])

  useEffect(() => {
    if (!walletMenuOpen) return undefined

    const closeOnOutsidePress = (event) => {
      if (!walletMenuRef.current?.contains(event.target)) setWalletMenuOpen(false)
    }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setWalletMenuOpen(false)
    }

    document.addEventListener('pointerdown', closeOnOutsidePress)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [walletMenuOpen])

  const [depositAmount, setDepositAmount] = useState(isDesignPreview ? 124892.65 : 0)
  const [depositResolved, setDepositResolved] = useState(isDesignPreview)
  const [loading, setLoading] = useState(!isDesignPreview)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [transactions, setTransactions] = useState(isDesignPreview ? WALLET_PREVIEW_TRANSACTIONS : [])
  const [isDepositInfoOpen, setIsDepositInfoOpen] = useState(false)
  const [balanceVisible, setBalanceVisible] = useState(true)
  const [analytics, setAnalytics] = useState({
    totalDeposit: isDesignPreview ? 133576.85 : 0,
    totalWithdrawal: 0
  })
  const [userBids, setUserBids] = useState([])
  const [wonProperty, setWonProperty] = useState(null) // Выигранный объект
  const [isBuyNowModalOpen, setIsBuyNowModalOpen] = useState(false)
  const [showTopUpPicker, setShowTopUpPicker] = useState(
    isDesignPreview && searchParams.get('walletSheet') === 'topup',
  )
  const [stripeCheckoutLoading, setStripeCheckoutLoading] = useState(false)
  const [showDepositSuccessModal, setShowDepositSuccessModal] = useState(
    isDesignPreview && searchParams.get('walletSheet') === 'success',
  )
  const [confirmedDepositAmount, setConfirmedDepositAmount] = useState(
    isDesignPreview ? '€1,099.00' : null,
  )
  const [tonConnectUI] = useTonConnectUI()
  const tonAddress = useTonAddress()
  const tonWallet = useTonWallet()
  const [tonPaymentLoading, setTonPaymentLoading] = useState(false)
  const [tonPaymentSuccess, setTonPaymentSuccess] = useState(false)
  const [topUpGateLoading, setTopUpGateLoading] = useState(false)
  const [activityFilter, setActivityFilter] = useState('all')
  const [showAuctionQr, setShowAuctionQr] = useState(
    isDesignPreview && searchParams.get('walletQr') === '1',
  )

  const ensureProfileCompleteForTopUp = async () => {
    if (isDesignPreview) return true
    if (!dbUserId) {
      requestOpenLoginModal({ wizard: true })
      return false
    }
    const apiBase = typeof API_BASE_URL === 'string' ? API_BASE_URL : ''
    const { complete, checked } = await fetchIsBuyerProfileCompleteForDeposit(dbUserId, apiBase)
    // При сбое API не блокируем; при успешной проверке и неполном профиле — в данные.
    if (checked && !complete) {
      showNotification(t('walletPage_profileIncompleteForDeposit'), 'error')
      setShowTopUpPicker(false)
      navigate(getCabinetDataPath(), {
        state: { from: '/wallet', depositProfileGate: true },
      })
      return false
    }
    return true
  }

  const handleOpenTopUp = async () => {
    if (topUpGateLoading) return
    setTopUpGateLoading(true)
    try {
      const ok = await ensureProfileCompleteForTopUp()
      if (ok) setShowTopUpPicker(true)
    } finally {
      setTopUpGateLoading(false)
    }
  }

  const shortenAddress = (addr) => {
    if (!addr || addr.length < 12) return addr || ''
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`
  }

  const handlePayUsdt = async () => {
    if (!tonConnectUI || !tonAddress) return
    const profileOk = await ensureProfileCompleteForTopUp()
    if (!profileOk) return
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
    if (isDesignPreview) return
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
  }, [isDesignPreview, userLoaded, user?.id, user?.primaryEmailAddress?.emailAddress])

  // Не оставляем кошелёк в вечной загрузке, если числовой id не удалось получить
  useEffect(() => {
    if (isDesignPreview) return
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
  }, [isDesignPreview, dbUserId, userLoaded, authLoaded, isSignedIn])

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
    if (isDesignPreview) return
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
  }, [isDesignPreview, dbUserId])

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
          setDepositResolved(true)
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
              setConfirmedDepositAmount(formatAmount(result.data.amountEur))
              setShowDepositSuccessModal(true)
            } else {
              showNotification(
                t('walletPage_paymentCredited', { amount: formatAmount(result.data.amountEur) }),
              )
              writeDepositVerificationGateFlag(dbUserId, true)
              window.dispatchEvent(new Event('verification-status-update'))
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

  const handleStripeDeposit = async () => {
    if (!dbUserId) {
      requestOpenLoginModal({ wizard: true })
      return
    }
    const profileOk = await ensureProfileCompleteForTopUp()
    if (!profileOk) return
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
      // replace убирает /deposit из history, иначе «Назад» на объекте зацикливается deposit ↔ object
      navigate(from, { replace: true })
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
    setShowDepositSuccessModal(false)
    window.setTimeout(() => {
      if (navigateToWalletEntryOrigin()) return
      navigate('/auction')
    }, DRAWER_DISMISS_MS.panel)
  }

  const handleInfoTopUp = () => {
    setIsDepositInfoOpen(false)
    window.setTimeout(() => {
      void handleOpenTopUp()
    }, DRAWER_DISMISS_MS.panel)
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

  const walletDisplayName = isDesignPreview
    ? 'Ethan Carter'
    : user?.fullName || userData?.name || t('walletPage_guestName')
  const walletAvatar = user?.imageUrl || userData?.picture || '/images/profile/history-hero-man.png'
  const walletGreeting = t(getWalletGreetingKey())

  // Показываем загрузку, если данные еще не загружены или dbUserId не получен
  if (loading || !dbUserId) {
    return (
      <div className="wallet-page wallet-bank">
        <div className="wallet-bank__shell">
          <div className="wallet-bank__hero wallet-bank__hero--loading">
            <div className="wallet-bank__top">
              <button
                type="button"
                className="wallet-bank__back"
                onClick={handleWalletBack}
                aria-label={t('walletPage_back')}
              >
                <FiArrowLeft aria-hidden />
              </button>
              <span className="wallet-bank__loading-dot" aria-hidden />
            </div>
            <div className="wallet-bank__balance-block">
              <div className="wallet-bank__label-row">
                <span>{t('walletPage_balanceLabel')}</span>
              </div>
              <strong className="wallet-bank__amount">••••••</strong>
            </div>
          </div>
          <div className="wallet-bank__body">
            {loadError ? (
              <div className="wallet-bank__tx-empty">
                <p>{loadError}</p>
                <button type="button" className="wallet-bank__cta" onClick={() => window.location.reload()}>
                  {t('walletPage_reloadPage')}
                </button>
              </div>
            ) : (
              <div className="wallet-bank__tx-empty">
                {!dbUserId ? t('walletPage_loadingUser') : t('walletPage_loading')}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="wallet-page wallet-bank">
      <div className="wallet-bank__shell">
        <section className="wallet-bank__hero" aria-labelledby="wallet-balance-title">
          <div className="wallet-bank__top">
            <button
              type="button"
              className="wallet-bank__identity"
              onClick={() => navigate(getCabinetProfilePath())}
              aria-label={t('profile')}
            >
              <img className="wallet-bank__avatar" src={walletAvatar} alt="" />
              <span className="wallet-bank__identity-copy">
                <small>{walletGreeting}</small>
                <strong>{walletDisplayName}</strong>
              </span>
            </button>
            <div className="wallet-bank__top-actions">
              <NotificationsBell variant="wallet" />
              <div className="wallet-bank__menu-wrap" ref={walletMenuRef}>
                <button
                  type="button"
                  className={`wallet-bank__icon-button wallet-bank__menu-button${walletMenuOpen ? ' is-open' : ''}`}
                  onClick={() => setWalletMenuOpen((open) => !open)}
                  aria-label={t('menu')}
                  aria-haspopup="menu"
                  aria-expanded={walletMenuOpen}
                >
                  <FiMenu aria-hidden />
                </button>
                {walletMenuOpen && (
                  <nav className="wallet-bank__menu-popover" role="menu" aria-label={t('menu')}>
                    <button type="button" role="menuitem" onClick={() => { setWalletMenuOpen(false); navigate('/') }}>
                      {t('home')}
                    </button>
                    <button type="button" role="menuitem" onClick={() => { setWalletMenuOpen(false); navigate('/auction') }}>
                      {t('auction')}
                    </button>
                    <button type="button" role="menuitem" onClick={() => { setWalletMenuOpen(false); navigate('/favorites') }}>
                      {t('favorites')}
                    </button>
                    <button type="button" role="menuitem" onClick={() => { setWalletMenuOpen(false); navigate(getCabinetProfilePath()) }}>
                      {t('profile')}
                    </button>
                  </nav>
                )}
              </div>
            </div>
          </div>

          <div className="wallet-bank__balance-block">
            <div className="wallet-bank__label-row">
              <span id="wallet-balance-title">{t('walletPage_totalAsset')}</span>
            </div>
            <div className="wallet-bank__amount-row">
              <strong className={`wallet-bank__amount${balanceVisible ? '' : ' is-hidden'}`} aria-live="polite">
                <span className="wallet-bank__amount-value" aria-hidden={!balanceVisible}>
                  {formatAmount(depositAmount)}
                </span>
                <span className="wallet-bank__amount-placeholder" aria-hidden={balanceVisible}>
                  € ••••••
                </span>
              </strong>
              <button
                type="button"
                className="wallet-bank__eye"
                onClick={() => setBalanceVisible((prev) => !prev)}
                aria-label={
                  balanceVisible
                    ? t('walletPage_hideBalance')
                    : t('walletPage_showBalance')
                }
                aria-pressed={!balanceVisible}
              >
                {balanceVisible ? <FiEye aria-hidden /> : <FiEyeOff aria-hidden />}
              </button>
            </div>
            <span className="wallet-bank__mask">
              {depositResolved && depositAmount === 0
                ? t('walletPage_emptyHint')
                : balanceVisible
                  ? `+ ${t('walletPage_accountMask', { amount: formatAmount(analytics.totalDeposit) })}`
                  : t('walletPage_accountMaskHidden')}
            </span>
          </div>

          <div className="wallet-bank__cta-row">
            <button
              type="button"
              className="wallet-bank__cta wallet-bank__cta--primary"
              onClick={() => void handleOpenTopUp()}
              disabled={topUpGateLoading}
            >
              <FiPlus aria-hidden />
              <span>{t('walletPage_addMoney')}</span>
            </button>
            <button
              type="button"
              className="wallet-bank__cta wallet-bank__cta--secondary"
              onClick={handleWithdraw}
              disabled={depositAmount <= 0}
            >
              <FiArrowUpRight aria-hidden />
              <span>{t('walletPage_sendMoney')}</span>
            </button>
            <button
              type="button"
              className="wallet-bank__scan"
              onClick={() => setShowAuctionQr(true)}
              aria-label={t('walletPage_qrOpenLabel')}
              aria-haspopup="dialog"
            >
              <FiMaximize aria-hidden />
            </button>
          </div>
        </section>

        <div className="wallet-bank__body">
          <section className="wallet-bank__alert" aria-labelledby="wallet-start-title">
            <div className="wallet-bank__alert-heading">
              <span className="wallet-bank__alert-icon" aria-hidden><Gavel size={18} /></span>
              <h2 id="wallet-start-title">{t('walletPage_auctionAccessTitle')}</h2>
            </div>
            <p>{t('walletPage_auctionAccessDescription')}</p>
            <button type="button" className="wallet-bank__alert-action wallet-bank__auction-action" onClick={() => navigate('/auction')}>
              <span>{t('walletPage_auctionAccessCta')}</span>
              <FiArrowRight aria-hidden />
            </button>
            <div className="wallet-bank__payments" aria-labelledby="wallet-payment-methods-title">
              <div className="wallet-bank__payments-heading">
                <span className="wallet-bank__payments-icon" aria-hidden>
                  <CreditCard size={18} strokeWidth={2.1} />
                </span>
                <span className="wallet-bank__payments-copy">
                  <strong id="wallet-payment-methods-title">{t('walletPage_paymentMethodsTitle')}</strong>
                  <small>{t('walletPage_paymentMethodsSubtitle')}</small>
                </span>
              </div>
              <div className="wallet-bank__payment-brands" role="list" aria-label={t('walletPage_paymentMethodsAria')}>
                <span className="wallet-bank__payment-brand wallet-bank__payment-brand--visa" role="listitem" aria-label="Visa">VISA</span>
                <span className="wallet-bank__payment-brand wallet-bank__payment-brand--mastercard" role="listitem" aria-label="Mastercard">
                  <span className="wallet-bank__mastercard-mark" aria-hidden><i /><i /></span><b>mastercard</b>
                </span>
                <span className="wallet-bank__payment-brand wallet-bank__payment-brand--stablecoin" role="listitem" aria-label="USDT"><i aria-hidden>₮</i><b>USDT</b></span>
                <span className="wallet-bank__payment-brand wallet-bank__payment-brand--stablecoin wallet-bank__payment-brand--usdc" role="listitem" aria-label="USDC"><i aria-hidden>$</i><b>USDC</b></span>
              </div>
            </div>
          </section>

          <section className="wallet-bank__tx wallet-bank__quick" aria-labelledby="wallet-tx-title">
            <div className="wallet-bank__tx-head">
              <h2 id="wallet-tx-title" className="wallet-bank__section-title">
                {t('walletPage_transactionsTitle')}
              </h2>
            </div>
            <div className="wallet-bank__filters wallet-bank__quick-grid" role="tablist" aria-label={t('walletPage_transactionsTitle')}>
              <button
                type="button"
                role="tab"
                aria-selected={activityFilter === 'all'}
                className={activityFilter === 'all' ? 'is-active' : ''}
                onClick={() => setActivityFilter('all')}
              >
                {t('walletPage_allOperations')}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activityFilter === 'bids'}
                className={activityFilter === 'bids' ? 'is-active' : ''}
                onClick={() => setActivityFilter('bids')}
              >
                {t('walletPage_myBids')}
              </button>
            </div>
            <div className="wallet-bank__tx-list">
              {activityFilter === 'bids' ? (
                !wonProperty && userBids.length === 0 ? (
                  <button type="button" className="wallet-bank__tx-empty wallet-bank__tx-empty--action" onClick={() => navigate('/auction')}>
                    <span>{t('walletPage_noActiveBids')}</span>
                    <strong>{t('walletPage_goToTrading')} <FiArrowRight aria-hidden /></strong>
                  </button>
                ) : (
                  <>
                    {wonProperty ? (
                      <button
                        type="button"
                        className="wallet-bank__tx-item wallet-bank__tx-item--button"
                        onClick={handleBookNow}
                      >
                        <span className="wallet-bank__tx-avatar" aria-hidden><Gavel size={18} /></span>
                        <span className="wallet-bank__tx-info">
                          <strong className="wallet-bank__tx-name">{wonProperty.title || t('walletPage_propertyAlt')}</strong>
                          <small className="wallet-bank__tx-time">{t('walletPage_wonAuctionBadge')}</small>
                        </span>
                        <span className="wallet-bank__tx-right">
                          <strong className="wallet-bank__tx-amount">
                            {getCurrencySymbol(wonProperty.currency)}{Number(wonProperty.bid_amount || 0).toLocaleString(i18n.language)}
                          </strong>
                          <small className="wallet-bank__tx-type">{t('walletPage_goToProperty')}</small>
                        </span>
                      </button>
                    ) : null}
                    {userBids.map((bid) => {
                      const listingProperty = formatBidAsListingProperty(bid)
                      return (
                        <button
                          type="button"
                          key={bidPropertyKey(bid)}
                          className="wallet-bank__tx-item wallet-bank__tx-item--button"
                          onClick={() => navigate(getPropertyDetailPath(bid.property_id, { property: listingProperty }), { state: { property: listingProperty } })}
                        >
                          <span className="wallet-bank__tx-avatar" aria-hidden><Gavel size={18} /></span>
                          <span className="wallet-bank__tx-info">
                            <strong className="wallet-bank__tx-name">{listingProperty.title || t('walletPage_propertyAlt')}</strong>
                            <small className="wallet-bank__tx-time">{t('walletPage_yourBidLabel')}</small>
                          </span>
                          <span className="wallet-bank__tx-right">
                            <strong className="wallet-bank__tx-amount">{getCurrencySymbol(bid.currency)}{Number(bid.bid_amount || 0).toLocaleString(i18n.language)}</strong>
                            <small className="wallet-bank__tx-type">{t('walletPage_goToProperty')}</small>
                          </span>
                        </button>
                      )
                    })}
                  </>
                )
              ) : transactions.length === 0 ? (
                <div className="wallet-bank__tx-empty">{t('walletPage_noTransactions')}</div>
              ) : (
                transactions.map((transaction, index) => (
                  <div key={transaction.id || index} className="wallet-bank__tx-item">
                    <div className="wallet-bank__tx-avatar" aria-hidden>
                      {transaction.amount > 0 ? <FaArrowDown /> : <FaArrowUp />}
                    </div>
                    <div className="wallet-bank__tx-info">
                      <div className="wallet-bank__tx-name">
                        {localizeWalletTransactionDescription(transaction.description, t) || transaction.type}
                      </div>
                      <div className="wallet-bank__tx-time">
                        {new Date(transaction.created_at).toLocaleString(i18n.language)}
                      </div>
                    </div>
                    <div className="wallet-bank__tx-right">
                      <div
                        className={`wallet-bank__tx-amount ${
                          transaction.amount > 0 ? 'is-positive' : 'is-negative'
                        }`}
                      >
                        {transaction.amount > 0 ? '+' : '-'}
                        {formatAmount(Math.abs(transaction.amount))}
                      </div>
                      <div className="wallet-bank__tx-type">
                        {transaction.type === 'deposit'
                          ? t('walletPage_txDeposit')
                          : t('walletPage_txWithdrawal')}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <DepositInfoDrawer
          isOpen={isDepositInfoOpen}
          onClose={() => setIsDepositInfoOpen(false)}
          onTopUp={handleInfoTopUp}
        />
        <WalletAuctionQrModal
          isOpen={showAuctionQr}
          onClose={() => setShowAuctionQr(false)}
        />
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
        <DepositSuccessModal
          isOpen={showDepositSuccessModal}
          onClose={() => setShowDepositSuccessModal(false)}
          onContinue={handleDepositSuccessContinue}
          confirmedAmount={confirmedDepositAmount}
          returnPath={isSafeWalletFromPath(location.state?.from) ? location.state.from : getWalletEntryFrom() || '/auction'}
        />
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

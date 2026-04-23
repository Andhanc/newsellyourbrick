import { useNavigate, Link, useSearchParams, useLocation } from 'react-router-dom'
import { useState, useEffect, useRef, useMemo } from 'react'
import { FaArrowLeft, FaArrowUp, FaArrowDown } from 'react-icons/fa'
import { FiClock } from 'react-icons/fi'
import { useUser, useAuth } from '@clerk/clerk-react'
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
import { useTonConnectUI, useTonAddress, useTonWallet } from '@tonconnect/ui-react'
import DepositTopUpPicker from '../components/DepositTopUpPicker'
import SellerVerificationModal from '../components/SellerVerificationModal'
import { showNotification } from '../utils/toastHelper'
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
import { getPropertyCardImage } from '../utils/propertyImage'
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

const Wallet = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const walletDepositHandledRef = useRef(null)
  const walletReservationHandledRef = useRef(null)
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
  const [userBid, setUserBid] = useState(null)
  const [showBidHistory, setShowBidHistory] = useState(false)
  const [wonProperty, setWonProperty] = useState(null) // Выигранный объект
  const [isBuyNowModalOpen, setIsBuyNowModalOpen] = useState(false)
  const [showTopUpPicker, setShowTopUpPicker] = useState(false)
  const [stripeCheckoutLoading, setStripeCheckoutLoading] = useState(false)
  const [showVerificationAfterTopUp, setShowVerificationAfterTopUp] = useState(false)
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
        showNotification('Не удалось определить USDT-кошелёк. Убедитесь, что у вас есть USDT в TON.', 'error')
        setTonPaymentLoading(false)
        return
      }
      const transaction = buildUsdtTransferTransaction(
        senderJettonWallet,
        USDT_PAYMENT_RECIPIENT,
        tonAddress
      )
      if (!transaction) {
        showNotification('Ошибка формирования транзакции USDT', 'error')
        setTonPaymentLoading(false)
        return
      }
      await tonConnectUI.sendTransaction(transaction)
      setTonPaymentSuccess(true)
      showNotification('Оплата 0.01 USDT успешно отправлена!')
    } catch (err) {
      const message = String(err?.message || '')
      const isRejected = /reject|cancel|denied/i.test(message)
      const isNotSent = /transaction was not sent|not sent/i.test(message)
      if (isRejected) return
      if (isNotSent) {
        showNotification(
          'Транзакция не была отправлена. Проверьте баланс USDT и TON (на комиссию) и подтвердите перевод в кошельке.',
          'error'
        )
        return
      }
      showNotification(message || 'Не удалось отправить транзакцию', 'error')
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
      if (API_BASE_URL && !API_BASE_URL.includes('localhost')) loadUserData(false)
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
          setTransactions(prev => {
            const prevStr = JSON.stringify(prev)
            const newStr = JSON.stringify(newTransactions)
            if (prevStr !== newStr) {
              return newTransactions
            }
            return prev
          })
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

      // Загружаем ставки пользователя
      if (bidsRes && bidsRes.ok) {
        const bidsData = await bidsRes.json()
        if (bidsData.success && bidsData.data && bidsData.data.length > 0) {
          const newUserBid = bidsData.data[0]
          setUserBid(prev => {
            const prevStr = JSON.stringify(prev)
            const newStr = JSON.stringify(newUserBid)
            if (prevStr !== newStr) {
              return newUserBid
            }
            return prev
          })
          
          // Проверяем, выиграл ли пользователь объект
          if (newUserBid.is_auction && newUserBid.auction_end_date) {
            const now = new Date().getTime()
            const endTime = new Date(newUserBid.auction_end_date).getTime()
            const isExpired = endTime <= now
            
            if (isExpired) {
              // Проверяем, является ли пользователь лидером
              try {
                const propertyBidsRes = await fetch(`${API_BASE_URL}/bids/property/${newUserBid.property_id}`)
                if (propertyBidsRes.ok) {
                  const propertyBidsData = await propertyBidsRes.json()
                  if (propertyBidsData.success && propertyBidsData.data && propertyBidsData.data.length > 0) {
                    // Находим максимальную ставку среди всех ставок
                    const maxBid = Math.max(...propertyBidsData.data.map(b => b.bid_amount))
                    // Находим максимальную ставку пользователя
                    const userBids = propertyBidsData.data.filter(b => b.user_id === dbUserId)
                    const userMaxBid = userBids.length > 0 ? Math.max(...userBids.map(b => b.bid_amount)) : 0
                    // Проверяем, является ли пользователь лидером (его максимальная ставка равна максимальной ставке всех)
                    const isWinner = userMaxBid === maxBid && userMaxBid > 0
                    
                    if (isWinner) {
                      // Создаем объект выигранного объекта с максимальной ставкой пользователя
                      const wonPropertyData = {
                        ...newUserBid,
                        bid_amount: userMaxBid
                      }
                      setWonProperty(wonPropertyData)
                    } else {
                      setWonProperty(null)
                    }
                  } else {
                    setWonProperty(null)
                  }
                } else {
                  setWonProperty(null)
                }
              } catch (error) {
                console.error('Ошибка проверки выигранного объекта:', error)
                setWonProperty(null)
              }
            } else {
              setWonProperty(null)
            }
          } else {
            setWonProperty(null)
          }
        } else {
          setUserBid(prev => {
            if (prev !== null) {
              return null
            }
            return prev
          })
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
            showNotification(`Оплата прошла (тест или бой). Зачислено ${formatAmount(result.data.amountEur)}`)
            try {
              const resV = await fetch(`${API_BASE_URL}/users/${dbUserId}/verification-status`)
              if (resV.ok) {
                const json = await resV.json()
                if (!(json.success && json.data?.isVerified)) {
                  setShowVerificationAfterTopUp(true)
                }
              } else {
                setShowVerificationAfterTopUp(true)
              }
            } catch {
              setShowVerificationAfterTopUp(true)
            }
          } else if (result.data?.already) {
            showNotification('Платёж уже был учтён ранее.')
          }
          await loadUserData(false)
        } else {
          showNotification(result.error || 'Не удалось подтвердить оплату', 'error')
        }
      } catch (e) {
        showNotification(e?.message || 'Ошибка сети', 'error')
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
            showNotification('Резерв уже был учтён ранее.')
          } else {
            showNotification(
              'Оплата резерва получена. Объект зарезервирован, менеджер свяжется с вами.'
            )
          }
          await loadUserData(false)
        } else {
          showNotification(result.error || 'Не удалось подтвердить резерв', 'error')
        }
      } catch (e) {
        showNotification(e?.message || 'Ошибка сети', 'error')
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
        showNotification(result.error || 'Не удалось открыть оплату', 'error')
      }
    } finally {
      setStripeCheckoutLoading(false)
    }
  }

  const handleWithdraw = async () => {
    const amount = prompt('Введите сумму для вывода (евро):')
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
        showNotification(`Выведено ${amount} евро!`)
      } else {
        showNotification(data.error || 'Ошибка при выводе средств')
      }
    } catch (error) {
      console.error('Ошибка вывода:', error)
      showNotification('Ошибка при выводе средств')
    }
  }

  const handleWalletBack = () => {
    const fromState = location.state?.from
    const from = isSafeWalletFromPath(fromState) ? fromState : getWalletEntryFrom()
    if (from) {
      clearWalletEntryFrom()
      navigate(from)
      return
    }
    const idx = window.history.state?.idx
    if (typeof idx === 'number' && idx > 0) {
      navigate(-1)
      return
    }
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
      showNotification('Продавцы не могут покупать объекты')
      return
    }

    if (!buyNowEmailOk) {
      showNotification(
        'Укажите email в аккаунте или профиле — он нужен для оформления покупки и писем от сервиса.'
      )
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
                  Обновить страницу
                </button>
              </>
            ) : (
              !dbUserId ? 'Получение данных пользователя...' : 'Загрузка...'
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

      <div className="wallet-container">
        {/* Заголовок */}
        <div className="wallet-header">
          <button type="button" onClick={handleWalletBack} className="wallet-back-button">
            <FaArrowLeft />
            <span>Назад</span>
          </button>
          <h1 className="wallet-title">Депозит</h1>
        </div>

        {/* Инструкция о депозите */}
        <div className="deposit-instruction">
          <div className="deposit-instruction__content">
            <h2>Что такое депозит?</h2>
            <p>Депозит — это 3000 евро, которые вы вносите для участия в аукционе. Депозит можно вернуть в любой момент.</p>
          </div>
        </div>

        {/* Блок депозита и пополнения — карта скрыта, пополнение через Picker */}
        <div className="wallet-card-section deposit-main-block">
          <div className="deposit-info-block">
            <div className="deposit-info-label">Депозит</div>
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
              <span>Пополнить</span>
            </button>
            <button
              className="wallet-action-btn withdraw-action"
              onClick={handleWithdraw}
            >
              <div className="wallet-action-icon-wrapper">
                <FaArrowDown className="wallet-action-icon" />
              </div>
              <span>Вывести</span>
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
        {dbUserId && (
          <SellerVerificationModal
            isOpen={showVerificationAfterTopUp}
            onClose={() => setShowVerificationAfterTopUp(false)}
            userId={dbUserId}
            required
            title="Чтобы продолжить, пройдите верификацию"
            subtitle="Загрузите фото паспорта, селфи и селфи с паспортом"
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
              <span className="wallet-won-object__badge-text">Вы выиграли аукцион!</span>
            </div>
            <div className="wallet-won-object__content">
              <div className="wallet-won-object__image-wrapper">
                {(() => {
                  const photoUrl = getPropertyCardImage(wonProperty, null)
                  
                  return photoUrl ? (
                    <img 
                      src={photoUrl}
                      alt={wonProperty.title || 'Объект недвижимости'}
                      className="wallet-won-object__image"
                      onError={(e) => {
                        e.target.style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="wallet-won-object__image-placeholder">
                      Нет фото
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
                  <span className="wallet-won-object__bid-label">Выигрышная ставка:</span>
                  <span className="wallet-won-object__bid-amount">
                    {wonProperty.currency === 'USD' ? '$' : wonProperty.currency === 'EUR' ? '€' : wonProperty.currency === 'BYN' ? 'Br' : ''}
                    {wonProperty.bid_amount.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <button
                  className="wallet-won-object__buy-btn"
                  onClick={handleBookNow}
                  disabled={!buyNowEmailOk}
                  title={!buyNowEmailOk ? 'Укажите email в профиле' : undefined}
                  style={{
                    opacity: !buyNowEmailOk ? 0.5 : 1,
                    cursor: !buyNowEmailOk ? 'not-allowed' : 'pointer',
                  }}
                >
                  Перейти к покупке
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Объект с активной ставкой */}
        {userBid && !wonProperty && (
          <div className="wallet-bid-object" style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '20px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <h3 style={{ color: 'white', marginBottom: '15px', fontSize: '18px' }}>
              Ваш объект с активной ставкой
            </h3>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              {(() => {
                const photoUrl = getPropertyCardImage(userBid, null)
                
                return photoUrl ? (
                  <img 
                    src={photoUrl}
                    alt={userBid.title || 'Объект недвижимости'}
                    style={{
                      width: '100px',
                      height: '100px',
                      objectFit: 'cover',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                    onError={(e) => {
                      // Скрываем изображение при ошибке загрузки
                      e.target.style.display = 'none'
                    }}
                  />
                ) : (
                  <div style={{
                    width: '100px',
                    height: '100px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontSize: '12px',
                    textAlign: 'center',
                    padding: '8px'
                  }}>
                    Нет фото
                  </div>
                )
              })()}
              <div style={{ flex: 1 }}>
                <h4 style={{ color: 'white', marginBottom: '8px', fontSize: '16px' }}>
                  {userBid.title}
                </h4>
                {userBid.location && (
                  <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '8px', fontSize: '14px' }}>
                    {userBid.location}
                  </p>
                )}
                <div style={{ display: 'flex', gap: '15px', marginBottom: '10px' }}>
                  <div>
                    <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '12px' }}>Ваша ставка:</span>
                    <div style={{ color: 'white', fontSize: '18px', fontWeight: 'bold' }}>
                      {formatAmount(userBid.bid_amount)}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setShowBidHistory(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      fontFamily: 'inherit'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
                    onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
                  >
                    <FiClock size={16} />
                    История
                  </button>
                  <Link 
                    to={`/property/${userBid.property_id}`}
                    onClick={(e) => {
                      if (ensureCanOpenProperty()) return
                      e.preventDefault()
                    }}
                    style={{
                      display: 'inline-block',
                      padding: '8px 16px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      textDecoration: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
                    onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
                  >
                    Перейти к объекту →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Модальное окно истории ставок */}
        {userBid && (
          <UserBidHistoryModal
            isOpen={showBidHistory}
            onClose={() => setShowBidHistory(false)}
            property={{
              id: userBid.property_id,
              title: userBid.title,
              location: userBid.location
            }}
            userId={dbUserId}
          />
        )}

        {/* Аналитика и Транзакции в одной строке */}
        <div className="wallet-stats-transactions">
          {/* Аналитика */}
          <div className="wallet-analytics-block">
            <h2 className="wallet-analytics-title">Аналитика</h2>
            <div className="wallet-stats">
              <div className="wallet-stat-card">
                <div className="wallet-stat-header">
                  <div className="wallet-stat-label">Всего выведено</div>
                  <div className="wallet-stat-icon">
                    <FaArrowDown />
                  </div>
                </div>
                <div className="wallet-stat-amount">{formatAmount(analytics.totalWithdrawal)}</div>
              </div>
              <div className="wallet-stat-card">
                <div className="wallet-stat-header">
                  <div className="wallet-stat-label">Всего пополнено</div>
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
              <h3 className="wallet-transactions-title">Транзакции</h3>
            </div>
            
            <div className="wallet-transactions-list">
              {transactions.length === 0 ? (
                <div className="wallet-transaction-empty">Нет транзакций</div>
              ) : (
                transactions.map((transaction, index) => (
                  <div key={transaction.id || index} className="wallet-transaction-item">
                    <div className="wallet-transaction-info">
                      <div className="wallet-transaction-name">{transaction.description || transaction.type}</div>
                      <div className="wallet-transaction-time">
                        {new Date(transaction.created_at).toLocaleString('ru-RU')}
                      </div>
                    </div>
                    <div className="wallet-transaction-right">
                      <div className={`wallet-transaction-amount ${transaction.amount > 0 ? 'positive' : 'negative'}`}>
                        {transaction.amount > 0 ? '+' : ''}{formatAmount(Math.abs(transaction.amount))}
                      </div>
                      <div className="wallet-transaction-type">
                        {transaction.type === 'deposit' ? 'Пополнение' : 'Вывод'}
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

export default Wallet

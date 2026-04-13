import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useUser, useClerk } from '@clerk/clerk-react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  FiHash,
  FiShield,
  FiDatabase,
  FiClock,
  FiCalendar,
  FiCreditCard,
  FiLayers,
  FiMessageCircle,
  FiAlertCircle,
  FiHome,
  FiFileText,
  FiBookOpen,
  FiArrowRight,
  FiCheckCircle,
  FiMail,
  FiArrowLeft,
  FiUpload,
  FiChevronDown,
  FiChevronUp,
  FiCheck,
  FiLogOut,
} from 'react-icons/fi'
import { getStoredNumericUserId, getUserData, logout } from '../services/authService'
import { fetchUserById, invalidateUserByIdCache } from '../utils/usersApi'
import { showNotification } from '../utils/toastHelper'
import Confetti from 'react-confetti'
import { scrollMainTo } from '../utils/mainScroll'
import { isSiteUserSignedIn } from '../utils/siteAuthGate'
import { requestOpenLoginModal } from '../utils/requestOpenLoginModal'
import { useCabinetOverviewData, normalizeSubscriptionPlanVisual } from '../hooks/useCabinetOverviewData'
import SubscriptionCabinetPreview from '../components/SubscriptionCabinetPreview'
import { startProSubscriptionCheckout } from '../utils/subscriptionCheckout'
import DirectionSummaryCard from '../components/ui/direction-summary-card'
import TransactionHistoryCard from '../components/ui/transaction-history-card'
import PassportRecognitionModal from '../components/PassportRecognitionModal'
import { ProfileSpotlightOnboarding } from '../components/ProfileSpotlightOnboarding'
import { ServiceQuickLinksTour } from '../components/ServiceQuickLinksTour'
import { fetchVerificationStatus, invalidateVerificationStatusCache } from '../utils/verificationStatusApi'
import './TestPage.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const PROFILE_SAVE_DEBOUNCE_MS = 500

/** Показывать затемнённые подсказки, пока заполнено меньше этого процента полей (при перезагрузке снова, пока не достигнут порог). */
const PROFILE_ONBOARDING_MIN_COMPLETE_PCT = 78

/** После перехода к полю из тоста — не крутим подсветку на тосте; при новом открытии панели «Данные» ключ сбрасывается в TestPage. */
const TOAST_GUIDE_FIELD_NAV_DONE_PREFIX = 'syb.profile.dataToastGuide.fieldNavDone:'

const PROFILE_COMPLETE_CELEBRATION_SHOWN_PREFIX = 'syb.profile.newProfileCompleteCelebrationShown:'

function readToastGuideFieldNavDone(userId) {
  if (userId == null || userId === '') return false
  try {
    return sessionStorage.getItem(`${TOAST_GUIDE_FIELD_NAV_DONE_PREFIX}${userId}`) === '1'
  } catch {
    return false
  }
}

const PROFILE_MAIN_FIELDS = [
  { key: 'first_name', label: 'Имя', autoComplete: 'given-name' },
  { key: 'last_name', label: 'Фамилия', autoComplete: 'family-name' },
  { key: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
  { key: 'phone', label: 'Телефон', autoComplete: 'tel' },
  { key: 'country', label: 'Страна', autoComplete: 'country-name' },
  { key: 'address', label: 'Адрес проживания', multiline: true, autoComplete: 'street-address' },
]

const PROFILE_PASSPORT_FIELDS = [
  { key: 'passport_series', label: 'Серия паспорта', autoComplete: 'off' },
  { key: 'passport_number', label: 'Номер паспорта', autoComplete: 'off' },
  { key: 'identification_number', label: 'Идентификационный номер', autoComplete: 'off' },
]

const PROFILE_FIELDS_META = [...PROFILE_MAIN_FIELDS, ...PROFILE_PASSPORT_FIELDS]

const PROFILE_FIELD_I18N = {
  first_name: 'buyerData_labelFirstName',
  last_name: 'buyerData_labelLastName',
  email: 'buyerData_labelEmail',
  phone: 'buyerData_labelPhone',
  country: 'buyerData_labelCountry',
  address: 'buyerData_labelAddress',
  passport_series: 'buyerData_labelPassportSeries',
  passport_number: 'buyerData_labelPassportNumber',
  identification_number: 'buyerData_labelIdNumber',
}

function isProfileFieldFilledFromFormOnly(key, profileForm) {
  const v = profileForm[key]
  if (key === 'phone') return phoneDigits(v).length > 0
  return !!(v && String(v).trim())
}

/** Пустой объект missingFields с сервера не считаем валидным — иначе !mf.field даёт «всё заполнено». */
function normalizeVerificationMissingFields(mf) {
  if (mf == null || typeof mf !== 'object') return null
  return Object.keys(mf).length > 0 ? mf : null
}

/** Согласовано с API missingFields (Data.jsx / verification-status). */
function isProfileFieldFilled(key, mf, profileForm) {
  const fromForm = isProfileFieldFilledFromFormOnly(key, profileForm)
  if (mf == null) {
    return fromForm
  }
  /** Если в БД/форме уже есть значения, а verification-status ещё не обновился — всё равно считаем поле заполненным (иначе не доходим до 100% и модалка «Поздравляем»). */
  let serverOk
  switch (key) {
    case 'first_name':
      serverOk = !mf.firstName
      break
    case 'last_name':
      serverOk = !mf.lastName
      break
    case 'email':
      serverOk = !mf.emailOrPhone || !!(profileForm.email && String(profileForm.email).trim())
      break
    case 'phone':
      serverOk = !mf.emailOrPhone || phoneDigits(profileForm.phone).length > 0
      break
    case 'country':
      serverOk = !mf.country
      break
    case 'address':
      serverOk = !mf.address
      break
    case 'passport_series':
      serverOk = !mf.passportSeries
      break
    case 'passport_number':
      serverOk = !mf.passportNumber
      break
    case 'identification_number':
      serverOk = !mf.identificationNumber
      break
    default:
      serverOk = true
  }
  return serverOk || fromForm
}

/** Поля для сохранения на сервер после OCR + /passport/extract (email не трогаем — верификация). */
function extractedPassportDataToApiPayload(data) {
  if (!data || typeof data !== 'object') return {}
  const body = {}
  if (data.firstName?.trim()) body.first_name = data.firstName.trim()
  if (data.lastName?.trim()) body.last_name = data.lastName.trim()
  if (data.passportSeries?.trim()) body.passport_series = data.passportSeries.trim()
  if (data.passportNumber?.trim()) {
    const digits = data.passportNumber.replace(/\D/g, '')
    if (digits) body.passport_number = digits
  }
  if (data.identificationNumber?.trim()) body.identification_number = data.identificationNumber.trim()
  if (data.address?.trim()) body.address = data.address.trim()
  return body
}

/** Как в Data.jsx: отображение телефона с «+». */
function formatPhoneWithPlus(phone) {
  if (!phone) return ''
  const cleaned = phone.replace(/[^\d+]/g, '')
  if (cleaned && !cleaned.startsWith('+')) {
    return `+${cleaned}`
  }
  return cleaned
}

function phoneDigits(s) {
  return (s || '').replace(/\D/g, '')
}

function emptyProfileForm() {
  return Object.fromEntries(PROFILE_FIELDS_META.map((f) => [f.key, '']))
}

function buildProfileFormFromRow(row, clerkUser, fallbackEmail) {
  return {
    first_name: row?.first_name ?? clerkUser?.firstName ?? '',
    last_name: row?.last_name ?? clerkUser?.lastName ?? '',
    email: row?.email ?? fallbackEmail ?? '',
    phone: formatPhoneWithPlus(row?.phone_number ?? ''),
    country: row?.country ?? '',
    address: row?.address ?? '',
    passport_series: row?.passport_series ?? '',
    passport_number: row?.passport_number ?? '',
    identification_number: row?.identification_number ?? '',
  }
}

function profileFieldToApiKey(fieldKey) {
  if (fieldKey === 'phone') return 'phone_number'
  return fieldKey
}

function toApiPayloadValue(fieldKey, raw) {
  const t = typeof raw === 'string' ? raw.trim() : ''
  if (fieldKey === 'phone') {
    const d = phoneDigits(t)
    return d === '' ? null : d
  }
  return t === '' ? null : t
}

function isProfileFieldUnchanged(fieldKey, raw, row) {
  if (!row) return false
  if (fieldKey === 'phone') {
    return phoneDigits(raw) === phoneDigits(row.phone_number || '')
  }
  const apiKey = profileFieldToApiKey(fieldKey)
  const next = toApiPayloadValue(fieldKey, raw)
  const prev = row[apiKey]
  const prevNorm = prev == null || String(prev).trim() === '' ? null : String(prev).trim()
  if (fieldKey === 'email') {
    const a = (next || '').toLowerCase()
    const b = (prevNorm || '').toLowerCase()
    return a === b
  }
  return next === prevNorm
}

function mergeExtractedPassportIntoProfileForm(prev, extracted) {
  if (!extracted) return prev
  return {
    ...prev,
    first_name: extracted.firstName?.trim() || prev.first_name,
    last_name: extracted.lastName?.trim() || prev.last_name,
    passport_series: extracted.passportSeries?.trim() || prev.passport_series,
    passport_number: extracted.passportNumber?.trim() || prev.passport_number,
    identification_number: extracted.identificationNumber?.trim() || prev.identification_number,
    address: extracted.address?.trim() || prev.address,
  }
}

const DIRECTION_SUMMARIES = [
  {
    variant: 'shares',
    areaLabel: 'Инвестиции',
    headline: 'Доли',
    subCardTitle: 'Мой портфель',
    subCardSubtitle: 'Объекты и доли, в которых вы участвуете',
    to: '/shares',
    moreCount: 8,
    thumbnails: [
      {
        src: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=160&h=160&fit=crop&q=80',
        alt: 'Современный дом',
      },
      {
        src: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=160&h=160&fit=crop&q=80',
        alt: 'Вилла с бассейном',
      },
      {
        src: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=160&h=160&fit=crop&q=80',
        alt: 'Дом с плоской крышей',
      },
    ],
  },
  {
    variant: 'auction',
    areaLabel: 'Платформа',
    headline: 'Аукцион',
    subCardTitle: 'Торги и лоты',
    subCardSubtitle: 'Актуальные объекты и ставки',
    to: '/auction',
    moreCount: 6,
    thumbnails: [
      {
        src: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=160&h=160&fit=crop&q=80',
        alt: 'Загородный коттедж',
      },
      {
        src: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=160&h=160&fit=crop&q=80',
        alt: 'Фасад жилого дома',
      },
      {
        src: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=160&h=160&fit=crop&q=80',
        alt: 'Дом с газоном',
      },
    ],
  },
  {
    variant: 'debts',
    areaLabel: 'Финансы',
    headline: 'Долги',
    subCardTitle: 'Задолженности',
    subCardSubtitle: 'График платежей и напоминания',
    to: '/debts',
    moreCount: 5,
    thumbnails: [
      {
        src: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=160&h=160&fit=crop&q=80',
        alt: 'Интерьер гостиной в доме',
      },
      {
        src: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=160&h=160&fit=crop&q=80',
        alt: 'Многоэтажный дом',
      },
      {
        src: 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=160&h=160&fit=crop&q=80',
        alt: 'Архитектура жилого комплекса',
      },
    ],
  },
]

const MAIN_CARDS = [
  {
    title: 'Данные',
    description: 'Паспорт, документы и статусы в одном месте',
    to: '/data',
    icon: FiDatabase,
    accent: 'teal',
  },
  {
    title: 'История',
    description: 'Лента операций и действий по аккаунту',
    to: '/history',
    icon: FiClock,
    accent: 'ocean',
  },
  {
    title: 'Бронирования',
    description: 'Текущие визиты и завершённые записи',
    to: '/profile/bookings',
    sheet: 'bookings',
    icon: FiCalendar,
    accent: 'violet',
  },
  {
    title: 'Кошелёк',
    description: 'Баланс, пополнения и вывод средств',
    to: '/deposit',
    icon: FiCreditCard,
    accent: 'amber',
  },
  {
    title: 'Подписки',
    description: 'Тарифы, лимиты и продление доступа',
    to: '/subscriptions',
    sheet: 'subscriptions',
    icon: FiLayers,
    accent: 'rose',
  },
  {
    title: 'Чат',
    description: 'Поддержка и персональный менеджер',
    to: '/chat?manager=1',
    icon: FiMessageCircle,
    accent: 'jade',
  },
]

const QUICK_LINKS = [
  { title: 'Долги', subtitle: 'Задолженности', to: '/debts', icon: FiAlertCircle },
  { title: 'Аукцион', subtitle: 'Торги', to: '/auction', icon: FiHome },
  { title: 'Выйти', subtitle: 'Выход из аккаунта', icon: FiLogOut, action: 'logout' },
]

function historyObjectsWord(n) {
  const k = n % 100
  if (k >= 11 && k <= 14) return 'объектов'
  const d = n % 10
  if (d === 1) return 'объект'
  if (d >= 2 && d <= 4) return 'объекта'
  return 'объектов'
}

function formatDateRangeRu(start, end) {
  try {
    const s = new Date(`${start}T12:00:00`)
    const e = new Date(`${end}T12:00:00`)
    const o = { day: 'numeric', month: 'short', year: 'numeric' }
    return `${s.toLocaleDateString('ru-RU', o)} — ${e.toLocaleDateString('ru-RU', o)}`
  } catch {
    return `${start} — ${end}`
  }
}

function bookingStatusLabelRu(statusKey) {
  const k = (statusKey || 'pending').toLowerCase()
  if (k === 'approved') return 'Подтверждено'
  if (k === 'rejected') return 'Отклонено'
  return 'Ожидает'
}

function bookingsWord(n) {
  const k = n % 100
  if (k >= 11 && k <= 14) return 'бронирований'
  const d = n % 10
  if (d === 1) return 'бронирование'
  if (d >= 2 && d <= 4) return 'бронирования'
  return 'бронирований'
}

function TestPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user, isLoaded } = useUser()
  const { signOut } = useClerk()
  const {
    numericUserId,
    publicIdDisplay,
    historyCount,
    recentHistoryRows,
    historySections,
    historyLoading,
    subscriptionPlanLabel,
  } = useCabinetOverviewData()

  /** State из хука может отставать от localStorage на первом кадре — для онбординга и % нужен синхронный id. */
  const resolvedNumericUserId = numericUserId ?? getStoredNumericUserId()

  const [dataSheetOpen, setDataSheetOpen] = useState(false)
  const [historySheetOpen, setHistorySheetOpen] = useState(false)
  const [subscriptionSheetOpen, setSubscriptionSheetOpen] = useState(false)
  const [bookingsSheetOpen, setBookingsSheetOpen] = useState(false)
  const [subscriptionSheetLoading, setSubscriptionSheetLoading] = useState(false)
  const [subscriptionSheetState, setSubscriptionSheetState] = useState(null)
  const [subscriptionUpgradeLoading, setSubscriptionUpgradeLoading] = useState(false)
  const [bookingsSheetLoading, setBookingsSheetLoading] = useState(false)
  const [bookingsSheetRows, setBookingsSheetRows] = useState([])
  const [dbUserRow, setDbUserRow] = useState(null)
  const [dbUserLoading, setDbUserLoading] = useState(false)
  const [profileForm, setProfileForm] = useState(emptyProfileForm)
  const [savingField, setSavingField] = useState(null)
  /** После успешного сохранения поля на сервер — показываем галочку у инпута, до следующего изменения. */
  const [profileFieldSavedOk, setProfileFieldSavedOk] = useState({})
  const [profileSaveAllLoading, setProfileSaveAllLoading] = useState(false)
  const [isRecognizingPassport, setIsRecognizingPassport] = useState(false)
  const [isSavingExtractPatch, setIsSavingExtractPatch] = useState(false)
  const [showPassportRecognitionModal, setShowPassportRecognitionModal] = useState(false)
  const [extractedPassportData, setExtractedPassportData] = useState(null)
  const [verificationStatus, setVerificationStatus] = useState(null)
  const [profileCompletionExpanded, setProfileCompletionExpanded] = useState(false)
  const [toastGuideStep, setToastGuideStep] = useState(0)
  /** После клика по строке в тосте — скрываем тост, чтобы не перекрывал поля ввода. */
  const [profileCompletionToastDismissedForInput, setProfileCompletionToastDismissedForInput] = useState(false)
  const [showProfileCompleteCelebration, setShowProfileCompleteCelebration] = useState(false)
  const [showServiceQuickLinksTour, setShowServiceQuickLinksTour] = useState(false)
  const [windowSize, setWindowSize] = useState(() =>
    typeof window !== 'undefined' ? { width: window.innerWidth, height: window.innerHeight } : { width: 0, height: 0 },
  )

  const dbUserRowRef = useRef(dbUserRow)
  const dataTileRef = useRef(null)
  const profileCompletionToastRef = useRef(null)
  const profileToastHeaderRef = useRef(null)
  const profileToastFirstMissingRef = useRef(null)
  const dataHydratedForSheetRef = useRef(false)
  const saveTimersRef = useRef({})
  const persistFieldRef = useRef(async () => {})
  const passportInputRef = useRef(null)
  const serviceTourTimerRef = useRef(null)
  const directionSharesRef = useRef(null)
  const directionAuctionRef = useRef(null)
  const directionDebtsRef = useRef(null)
  /** Те же ref, что direction* — на случай старой разметки с именами quickLink* (избегает ReferenceError). */
  const quickLinkSharesRef = directionSharesRef
  const quickLinkAuctionRef = directionAuctionRef
  const quickLinkDebtsRef = directionDebtsRef

  /** Подсказка на тост: один раз за открытие панели «Данные»; сбрасывается при закрытии панели. */
  const toastHintShownThisDataOpenRef = useRef(false)
  const prevDataSheetOpenRef = useRef(false)

  const clearAllProfileSaveTimers = useCallback(() => {
    Object.keys(saveTimersRef.current).forEach((k) => {
      clearTimeout(saveTimersRef.current[k])
      delete saveTimersRef.current[k]
    })
  }, [])

  const handleQuickLogout = useCallback(async () => {
    if (!window.confirm(t('buyerCabinet_logoutConfirm'))) {
      return
    }
    sessionStorage.setItem('clerk_logout_in_progress', 'true')
    try {
      if (user && signOut) {
        await signOut({ redirectUrl: `${window.location.origin}/` })
      }
    } catch (e) {
      console.warn('TestPage Clerk signOut:', e)
    }
    try {
      await logout()
    } catch (e) {
      console.warn('TestPage logout:', e)
    } finally {
      sessionStorage.removeItem('clerk_logout_in_progress')
    }
    window.location.assign('/')
  }, [user, signOut, t])

  useEffect(() => {
    dbUserRowRef.current = dbUserRow
  }, [dbUserRow])

  useEffect(() => {
    return () => {
      Object.values(saveTimersRef.current).forEach((id) => clearTimeout(id))
      if (serviceTourTimerRef.current) {
        clearTimeout(serviceTourTimerRef.current)
        serviceTourTimerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!isLoaded) return
    if (!isSiteUserSignedIn(user, isLoaded)) {
      requestOpenLoginModal({ wizard: true })
      navigate('/', { replace: true })
    }
  }, [isLoaded, user, navigate])

  const loadVerificationStatus = useCallback(async (force = false) => {
    const id = numericUserId ?? getStoredNumericUserId()
    if (!id) return
    try {
      const s = await fetchVerificationStatus(API_BASE_URL, id, { ttlMs: 20000, force })
      if (s) setVerificationStatus(s)
    } catch {
      /* ignore */
    }
  }, [numericUserId])

  useEffect(() => {
    if (!resolvedNumericUserId) return
    void loadVerificationStatus(false)
    const onPush = () => void loadVerificationStatus(true)
    window.addEventListener('verification-status-update', onPush)
    return () => window.removeEventListener('verification-status-update', onPush)
  }, [resolvedNumericUserId, loadVerificationStatus])

  /** Профиль с API до открытия «Данные» — корректный % заполнения и подсказки сразу после входа. */
  useEffect(() => {
    if (!resolvedNumericUserId) return
    let cancelled = false
    fetchUserById(API_BASE_URL, resolvedNumericUserId)
      .then((u) => {
        if (cancelled || !u) return
        setDbUserRow((prev) => prev ?? u)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [resolvedNumericUserId])

  useEffect(() => {
    if (!dataSheetOpen || !resolvedNumericUserId) return
    void loadVerificationStatus(true)
  }, [dataSheetOpen, resolvedNumericUserId, loadVerificationStatus])

  useEffect(() => {
    if (!dataSheetOpen || !resolvedNumericUserId) return
    let cancelled = false
    setDbUserLoading(true)
    fetchUserById(API_BASE_URL, resolvedNumericUserId)
      .then((u) => {
        if (cancelled) return
        setDbUserRow(u)
      })
      .finally(() => {
        if (!cancelled) setDbUserLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [dataSheetOpen, resolvedNumericUserId])

  useEffect(() => {
    if (!subscriptionSheetOpen || !numericUserId) return
    let cancelled = false
    setSubscriptionSheetLoading(true)
    fetch(`${API_BASE_URL}/users/${numericUserId}/subscription-billing`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return
        const sub = json?.success && json?.data ? json.data.subscription : null
        setSubscriptionSheetState(sub)
      })
      .catch(() => {
        if (!cancelled) setSubscriptionSheetState(null)
      })
      .finally(() => {
        if (!cancelled) setSubscriptionSheetLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [subscriptionSheetOpen, numericUserId])

  useEffect(() => {
    if (!numericUserId) {
      setBookingsSheetRows([])
      return
    }
    let cancelled = false
    setBookingsSheetLoading(true)
    fetch(`${API_BASE_URL}/test-drive-bookings/user/${numericUserId}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return
        const rows = json?.success && Array.isArray(json.data) ? json.data : []
        setBookingsSheetRows(rows)
      })
      .catch(() => {
        if (!cancelled) setBookingsSheetRows([])
      })
      .finally(() => {
        if (!cancelled) setBookingsSheetLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [numericUserId])

  useEffect(() => {
    if (dataSheetOpen || historySheetOpen || subscriptionSheetOpen || bookingsSheetOpen) {
      scrollMainTo(0, 0, 'smooth')
    }
  }, [dataSheetOpen, historySheetOpen, subscriptionSheetOpen, bookingsSheetOpen])

  useEffect(() => {
    if (!dataSheetOpen && !historySheetOpen && !subscriptionSheetOpen && !bookingsSheetOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setDataSheetOpen(false)
        setHistorySheetOpen(false)
        setSubscriptionSheetOpen(false)
        setBookingsSheetOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dataSheetOpen, historySheetOpen, subscriptionSheetOpen, bookingsSheetOpen])

  const userData = useMemo(() => getUserData(), [])
  const fullName =
    user?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    userData.name ||
    'Пользователь'
  const idForChip =
    publicIdDisplay ??
    (() => {
      const raw = localStorage.getItem('userId') || userData.id
      return raw && String(raw).trim() !== '' ? String(raw).trim() : null
    })() ??
    '—'
  const roleRaw = userData.role || localStorage.getItem('userRole') || 'buyer'
  const roleLabel = roleRaw === 'seller' || roleRaw === 'owner' ? 'Продавец' : 'Покупатель'

  const email =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    ''

  const subscriptionProfileVisual = useMemo(() => {
    if (subscriptionSheetState) return normalizeSubscriptionPlanVisual(subscriptionSheetState)
    const s = String(subscriptionPlanLabel || '').toLowerCase()
    if (s.includes('vip')) return 'vip'
    if (s.includes('pro')) return 'pro'
    return 'starter'
  }, [subscriptionSheetState, subscriptionPlanLabel])

  const handleSubscriptionUpgradeNext = useCallback(async () => {
    if (subscriptionProfileVisual === 'starter') {
      setSubscriptionUpgradeLoading(true)
      try {
        const ud = getUserData()
        const uid = ud?.id ?? localStorage.getItem('userId')
        const result = await startProSubscriptionCheckout({
          userId: uid,
          customerEmail: ud?.email,
        })
        if (!result.ok) {
          showNotification(result.error || t('buyerCabinet_checkoutError'), 'error')
        }
      } finally {
        setSubscriptionUpgradeLoading(false)
      }
      return
    }
    if (subscriptionProfileVisual === 'pro') {
      showNotification(t('buyerCabinet_toastVipSoon'), 'info')
    }
  }, [subscriptionProfileVisual, t])

  const completionForm = useMemo(() => {
    if (dbUserRow) {
      return buildProfileFormFromRow(dbUserRow, user, email)
    }
    return {
      ...profileForm,
      first_name: profileForm.first_name || user?.firstName || '',
      last_name: profileForm.last_name || user?.lastName || '',
      email: profileForm.email || email || '',
    }
  }, [dbUserRow, profileForm, user, email])

  /** Снимок для «всё заполнено»: актуальные правки в profileForm поверх completionForm (из БД). */
  const completionFormMerged = useMemo(
    () => ({ ...completionForm, ...profileForm }),
    [completionForm, profileForm],
  )

  useEffect(() => {
    if (!dataSheetOpen) {
      dataHydratedForSheetRef.current = false
      return
    }
    if (dbUserLoading || !dbUserRow) return
    if (dataHydratedForSheetRef.current) return
    const form = buildProfileFormFromRow(dbUserRow, user, email)
    setProfileForm(form)
    dataHydratedForSheetRef.current = true
    const initialSaved = {}
    for (const f of PROFILE_FIELDS_META) {
      if (isProfileFieldFilledFromFormOnly(f.key, form)) {
        initialSaved[f.key] = true
      }
    }
    setProfileFieldSavedOk((prev) => ({ ...prev, ...initialSaved }))
  }, [dataSheetOpen, dbUserLoading, dbUserRow, user, email])

  useEffect(() => {
    if (!dataSheetOpen) {
      setProfileCompletionExpanded(false)
      setToastGuideStep(0)
    }
  }, [dataSheetOpen])

  const persistField = useCallback(
    async (fieldKey, rawValue) => {
      const persistUserId = numericUserId ?? getStoredNumericUserId()
      if (!persistUserId) return
      const row = dbUserRowRef.current
      if (!row) return

      if (isProfileFieldUnchanged(fieldKey, rawValue, row)) return

      const apiKey = profileFieldToApiKey(fieldKey)
      const body = { [apiKey]: toApiPayloadValue(fieldKey, rawValue) }

      setSavingField(fieldKey)
      try {
        const res = await fetch(`${API_BASE_URL}/users/${persistUserId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const json = await res.json().catch(() => ({}))

        if (json.requiresVerification) {
          showNotification(
            json.error ||
              'Для смены email нужно подтвердить адрес. Письмо может быть отправлено на почту.',
            'info',
          )
          setProfileForm((prev) => ({ ...prev, email: row.email ?? '' }))
          return
        }

        if (res.status === 409) {
          showNotification(json.error || 'Пользователь с таким email уже существует', 'error')
          setProfileForm((prev) => ({ ...prev, email: row.email ?? '' }))
          return
        }

        if (!res.ok) {
          throw new Error(json.error || 'Не удалось сохранить')
        }
        if (!json.success || !json.data) {
          throw new Error(json.error || 'Не удалось сохранить')
        }

        setDbUserRow(json.data)
        setProfileFieldSavedOk((prev) => ({ ...prev, [fieldKey]: true }))
        invalidateUserByIdCache(API_BASE_URL, persistUserId)
        invalidateVerificationStatusCache(API_BASE_URL, persistUserId)
        void loadVerificationStatus(true)
      } catch (e) {
        showNotification(e.message || 'Ошибка сохранения', 'error')
        setProfileForm(buildProfileFormFromRow(row, user, email))
        setProfileFieldSavedOk((prev) => ({ ...prev, [fieldKey]: false }))
      } finally {
        setSavingField(null)
      }
    },
    [numericUserId, user, email, loadVerificationStatus],
  )

  useEffect(() => {
    persistFieldRef.current = persistField
  }, [persistField])

  const scheduleProfileSave = useCallback((fieldKey, value) => {
    clearTimeout(saveTimersRef.current[fieldKey])
    saveTimersRef.current[fieldKey] = setTimeout(() => {
      void persistFieldRef.current(fieldKey, value)
      delete saveTimersRef.current[fieldKey]
    }, PROFILE_SAVE_DEBOUNCE_MS)
  }, [])

  const handleProfileChange = useCallback(
    (fieldKey) => (e) => {
      const v = e.target.value
      setProfileForm((prev) => ({ ...prev, [fieldKey]: v }))
      setProfileFieldSavedOk((prev) => ({ ...prev, [fieldKey]: false }))
      scheduleProfileSave(fieldKey, v)
    },
    [scheduleProfileSave],
  )

  const handleProfileBlur = useCallback((fieldKey) => (e) => {
    clearTimeout(saveTimersRef.current[fieldKey])
    delete saveTimersRef.current[fieldKey]
    void persistFieldRef.current(fieldKey, e.target.value)
  }, [])

  const handlePassportRecognition = useCallback(
    async (file) => {
      const uid = numericUserId ?? getStoredNumericUserId()
      if (!uid || !dbUserRowRef.current) {
        showNotification('Сначала дождитесь загрузки профиля', 'error')
        return
      }
      clearAllProfileSaveTimers()

      let extracted = null
      setIsRecognizingPassport(true)
      try {
        const Tesseract = await import('tesseract.js')
        const {
          data: { text },
        } = await Tesseract.recognize(file, 'rus+eng', {
          logger: () => {},
        })

        const response = await fetch(`${API_BASE_URL}/passport/extract`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recognizedText: text }),
        })

        if (!response.ok) {
          throw new Error('Ошибка при извлечении данных из паспорта')
        }

        const result = await response.json()
        if (!result.success || !result.data) {
          throw new Error('Не удалось извлечь данные из паспорта')
        }

        extracted = result.data
        setExtractedPassportData(extracted)
      } catch (error) {
        console.error('Ошибка распознавания паспорта:', error)
        showNotification(error.message || 'Не удалось распознать паспорт', 'error')
        setIsRecognizingPassport(false)
        return
      }

      setIsRecognizingPassport(false)

      const body = extractedPassportDataToApiPayload(extracted)
      if (Object.keys(body).length === 0) {
        showNotification('Не удалось извлечь поля с фото — попробуйте другое изображение', 'info')
        return
      }

      clearAllProfileSaveTimers()
      setProfileForm((prev) => mergeExtractedPassportIntoProfileForm(prev, extracted))

      setIsSavingExtractPatch(true)
      try {
        const userRes = await fetch(`${API_BASE_URL}/users/${uid}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const json = await userRes.json().catch(() => ({}))

        if (!userRes.ok || !json.success || !json.data) {
          throw new Error(json.error || 'Не удалось сохранить распознанные данные')
        }

        setDbUserRow(json.data)
        setProfileFieldSavedOk((prev) => {
          const next = { ...prev }
          for (const apiKey of Object.keys(body)) {
            const fieldKey = apiKey === 'phone_number' ? 'phone' : apiKey
            if (PROFILE_FIELDS_META.some((f) => f.key === fieldKey)) {
              next[fieldKey] = true
            }
          }
          return next
        })
        invalidateUserByIdCache(API_BASE_URL, uid)
        invalidateVerificationStatusCache(API_BASE_URL, uid)
        void loadVerificationStatus(true)
        setProfileForm(buildProfileFormFromRow(json.data, user, email))
        setShowPassportRecognitionModal(true)
      } catch (e) {
        showNotification(e.message || 'Ошибка сохранения', 'error')
        const row = dbUserRowRef.current
        if (row) setProfileForm(buildProfileFormFromRow(row, user, email))
      } finally {
        setIsSavingExtractPatch(false)
      }
    },
    [numericUserId, user, email, clearAllProfileSaveTimers, loadVerificationStatus],
  )

  const profileFieldsLocked = isRecognizingPassport || isSavingExtractPatch

  /** Явное «Сохранить»: проверка всех полей, один PUT на сервер, модалка «Поздравляем». */
  const handleProfilePanelSaveClick = useCallback(async () => {
    if (profileFieldsLocked || profileSaveAllLoading) return
    clearAllProfileSaveTimers()
    const form = completionFormMerged
    const missing = PROFILE_FIELDS_META.filter((f) => !isProfileFieldFilledFromFormOnly(f.key, form))
    if (missing.length > 0) {
      const names = missing.map((f) => t(PROFILE_FIELD_I18N[f.key] || f.label)).join(', ')
      showNotification(`Заполните поля: ${names}`, 'info')
      return
    }
    const persistUserId = numericUserId ?? getStoredNumericUserId()
    if (!persistUserId) {
      showNotification('Не удалось определить профиль', 'error')
      return
    }
    const row = dbUserRowRef.current
    if (!row) {
      showNotification('Данные профиля ещё загружаются', 'info')
      return
    }

    const body = {}
    for (const f of PROFILE_FIELDS_META) {
      const apiKey = profileFieldToApiKey(f.key)
      body[apiKey] = toApiPayloadValue(f.key, form[f.key] ?? '')
    }

    setProfileSaveAllLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/users/${persistUserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))

      if (json.requiresVerification) {
        showNotification(
          json.error ||
            'Для смены email нужно подтвердить адрес. Письмо может быть отправлено на почту.',
          'info',
        )
        setProfileForm((prev) => ({ ...prev, email: row.email ?? '' }))
        return
      }

      if (res.status === 409) {
        showNotification(json.error || 'Пользователь с таким email уже существует', 'error')
        setProfileForm((prev) => ({ ...prev, email: row.email ?? '' }))
        return
      }

      if (!res.ok) {
        const errText = String(json.error || '')
        if (res.status === 404 && errText.includes('не изменились')) {
          const fresh = await fetchUserById(API_BASE_URL, persistUserId)
          if (fresh) {
            setDbUserRow(fresh)
            setProfileForm(buildProfileFormFromRow(fresh, user, email))
            const allOk = Object.fromEntries(PROFILE_FIELDS_META.map((f) => [f.key, true]))
            setProfileFieldSavedOk((prev) => ({ ...prev, ...allOk }))
            invalidateUserByIdCache(API_BASE_URL, persistUserId)
            invalidateVerificationStatusCache(API_BASE_URL, persistUserId)
            void loadVerificationStatus(true)
            setShowProfileCompleteCelebration(true)
          }
          return
        }
        throw new Error(json.error || 'Не удалось сохранить')
      }
      if (!json.success || !json.data) {
        throw new Error(json.error || 'Не удалось сохранить')
      }

      setDbUserRow(json.data)
      setProfileForm(buildProfileFormFromRow(json.data, user, email))
      const allOk = Object.fromEntries(PROFILE_FIELDS_META.map((f) => [f.key, true]))
      setProfileFieldSavedOk((prev) => ({ ...prev, ...allOk }))
      invalidateUserByIdCache(API_BASE_URL, persistUserId)
      invalidateVerificationStatusCache(API_BASE_URL, persistUserId)
      void loadVerificationStatus(true)
      setShowProfileCompleteCelebration(true)
    } catch (e) {
      showNotification(e.message || 'Ошибка сохранения', 'error')
      setProfileForm(buildProfileFormFromRow(row, user, email))
    } finally {
      setProfileSaveAllLoading(false)
    }
  }, [
    profileFieldsLocked,
    profileSaveAllLoading,
    clearAllProfileSaveTimers,
    completionFormMerged,
    t,
    numericUserId,
    user,
    email,
    loadVerificationStatus,
  ])

  const profileCompletionRows = useMemo(() => {
    if (!resolvedNumericUserId) return []
    const mf = normalizeVerificationMissingFields(verificationStatus?.missingFields)
    return PROFILE_FIELDS_META.map((f) => ({
      key: f.key,
      label: t(PROFILE_FIELD_I18N[f.key] || f.label),
      filled: isProfileFieldFilled(f.key, mf, completionForm),
    }))
  }, [verificationStatus, resolvedNumericUserId, completionForm, t])

  const profileCompletionStats = useMemo(() => {
    const total = PROFILE_FIELDS_META.length
    if (profileCompletionRows.length === 0) {
      return { filled: 0, total, pct: resolvedNumericUserId ? 0 : 100 }
    }
    const filled = profileCompletionRows.filter((r) => r.filled).length
    const pct = total === 0 ? 0 : Math.round((filled / total) * 100)
    return { filled, total, pct }
  }, [profileCompletionRows, resolvedNumericUserId])

  /**
   * Серверный progress + локальные строки: берём max, чтобы при отставании API после сохранения
   * полей всё равно доходили до 100% и срабатывали гейт/модалка поздравления.
   */
  const completionPctForOnboarding = useMemo(() => {
    const localPct = profileCompletionStats.pct
    const fromServer = verificationStatus?.progress
    if (typeof fromServer === 'number' && Number.isFinite(fromServer)) {
      return Math.min(100, Math.max(0, Math.max(fromServer, localPct)))
    }
    return localPct
  }, [verificationStatus, profileCompletionStats.pct])

  const needsProfileOnboarding = completionPctForOnboarding < PROFILE_ONBOARDING_MIN_COMPLETE_PCT

  /** Пока профиль &lt; 78% — только сценарий подсказок, без обходных кликов по кабинету. */
  const profileGateActive =
    isLoaded &&
    isSiteUserSignedIn(user, isLoaded) &&
    Boolean(resolvedNumericUserId) &&
    needsProfileOnboarding

  /** Не требуем Clerk `user`: при регистрации по email сессия часто только локальная (isLoggedIn в userData). */
  const showTileDataOnboarding =
    profileGateActive &&
    !dataSheetOpen &&
    !showProfileCompleteCelebration &&
    !showServiceQuickLinksTour

  /** Тост прогресса держим до 100%; порог 78% только для гейта и спотлайта (`needsProfileOnboarding`). */
  const showProfileCompletionWidget =
    Boolean(resolvedNumericUserId && profileCompletionRows.length > 0) &&
    completionPctForOnboarding < 100
  const showProfileCompletionToast =
    dataSheetOpen && showProfileCompletionWidget && !profileCompletionToastDismissedForInput

  const firstMissingKey = useMemo(
    () => profileCompletionRows.find((r) => !r.filled)?.key ?? null,
    [profileCompletionRows],
  )

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  /**
   * Модалка при 100% или когда по полям всё заполнено (в т.ч. при отставании progress с API).
   * Не требуем открытую панель «Данные»: иначе при сворачивании до прихода verification-status модалка никогда не показывалась.
   */
  useEffect(() => {
    if (resolvedNumericUserId == null || resolvedNumericUserId === '') return
    const idKey = String(resolvedNumericUserId)
    const allFilledByForm = PROFILE_FIELDS_META.every((f) =>
      isProfileFieldFilledFromFormOnly(f.key, completionFormMerged),
    )
    const pct = completionPctForOnboarding
    if (pct < 100 && !allFilledByForm) return
    let alreadyShown = false
    try {
      alreadyShown = localStorage.getItem(`${PROFILE_COMPLETE_CELEBRATION_SHOWN_PREFIX}${idKey}`) === '1'
    } catch {
      alreadyShown = false
    }
    if (alreadyShown) return
    setShowProfileCompleteCelebration(true)
  }, [completionPctForOnboarding, resolvedNumericUserId, completionFormMerged])

  useEffect(() => {
    if (dataSheetOpen) return
    setToastGuideStep(0)
    setProfileCompletionExpanded(false)
    toastHintShownThisDataOpenRef.current = false
    setProfileCompletionToastDismissedForInput(false)
    setProfileFieldSavedOk({})
  }, [dataSheetOpen])

  /** Каждый новый заход в «Данные» (после главной) — снова можно гайд по тосту; сбрасываем флаг перехода к полю. */
  useEffect(() => {
    if (!dataSheetOpen) {
      prevDataSheetOpenRef.current = false
      return
    }
    if (resolvedNumericUserId == null) return
    const wasOpen = prevDataSheetOpenRef.current
    if (!wasOpen) {
      try {
        sessionStorage.removeItem(`${TOAST_GUIDE_FIELD_NAV_DONE_PREFIX}${resolvedNumericUserId}`)
      } catch {
        /* ignore */
      }
      prevDataSheetOpenRef.current = true
    }
  }, [dataSheetOpen, resolvedNumericUserId])

  const scrollToProfileField = useCallback(
    (key) => {
      const run = () => {
        const wrap = document.getElementById(`test-profile-field-wrap-${key}`)
        const input = document.getElementById(`profile-field-${key}`)
        if (!wrap) return
        wrap.scrollIntoView({ behavior: 'smooth', block: 'center' })
        wrap.classList.add('test-data-field--focus-hint')
        window.setTimeout(() => wrap.classList.remove('test-data-field--focus-hint'), 2200)
        window.setTimeout(() => input?.focus?.({ preventScroll: true }), 450)
      }
      if (!dataSheetOpen) {
        setDataSheetOpen(true)
        window.setTimeout(run, 520)
      } else {
        run()
      }
    },
    [dataSheetOpen],
  )

  const handleToastHeaderClick = useCallback(() => {
    const strictToastGuide =
      profileGateActive &&
      dataSheetOpen &&
      showProfileCompletionToast &&
      !readToastGuideFieldNavDone(resolvedNumericUserId)
    if (strictToastGuide && toastGuideStep === 0) return
    if (toastGuideStep === 1) {
      setProfileCompletionExpanded(true)
      setToastGuideStep(2)
      return
    }
    if (toastGuideStep === 2 || toastGuideStep === 3) return
    setProfileCompletionExpanded((v) => !v)
  }, [
    toastGuideStep,
    profileGateActive,
    dataSheetOpen,
    showProfileCompletionToast,
    resolvedNumericUserId,
  ])

  const markToastGuideFieldNavDone = useCallback(() => {
    const id = resolvedNumericUserId
    if (id == null) return
    try {
      sessionStorage.setItem(`${TOAST_GUIDE_FIELD_NAV_DONE_PREFIX}${id}`, '1')
    } catch {
      /* ignore */
    }
  }, [resolvedNumericUserId])

  const handleToastMissingRowClick = useCallback(
    (rowKey) => {
      const strictToastGuide =
        profileGateActive &&
        dataSheetOpen &&
        showProfileCompletionToast &&
        !readToastGuideFieldNavDone(resolvedNumericUserId)
      if (strictToastGuide) {
        if (toastGuideStep === 0 || toastGuideStep === 2) return
        if (toastGuideStep === 3 && rowKey !== firstMissingKey) return
      }
      if (toastGuideStep === 3 && rowKey === firstMissingKey) {
        setToastGuideStep(0)
        markToastGuideFieldNavDone()
        scrollToProfileField(rowKey)
        setProfileCompletionToastDismissedForInput(true)
        return
      }
      scrollToProfileField(rowKey)
      markToastGuideFieldNavDone()
      setToastGuideStep(0)
      setProfileCompletionToastDismissedForInput(true)
    },
    [
      toastGuideStep,
      firstMissingKey,
      scrollToProfileField,
      markToastGuideFieldNavDone,
      profileGateActive,
      dataSheetOpen,
      showProfileCompletionToast,
      resolvedNumericUserId,
    ],
  )

  const handleProfileCompleteCelebrationGo = useCallback(() => {
    const id = resolvedNumericUserId
    if (id != null && id !== '') {
      try {
        localStorage.setItem(`${PROFILE_COMPLETE_CELEBRATION_SHOWN_PREFIX}${String(id)}`, '1')
      } catch {
        /* ignore */
      }
    }
    setShowProfileCompleteCelebration(false)
    setDataSheetOpen(false)
    scrollMainTo(0, 0, 'smooth')
    if (serviceTourTimerRef.current) {
      clearTimeout(serviceTourTimerRef.current)
      serviceTourTimerRef.current = null
    }
    serviceTourTimerRef.current = window.setTimeout(() => {
      setShowServiceQuickLinksTour(true)
      serviceTourTimerRef.current = null
    }, 1000)
  }, [resolvedNumericUserId])

  const handleServiceQuickLinksTourDismiss = useCallback(() => {
    setShowServiceQuickLinksTour(false)
  }, [])

  useEffect(() => {
    if (!showProfileCompleteCelebration) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [showProfileCompleteCelebration])

  /**
   * Через 1 с после открытия «Данные» (<78%) — подсказка на тост.
   * Пока панель не закрывали: второй раз не показываем (toastHintShownThisDataOpenRef).
   * Закрыли «Данные», снова открыли с главной — ref сброшен, подсказка снова (и sessionStorage fieldNav очищен выше).
   */
  useEffect(() => {
    if (!needsProfileOnboarding || !dataSheetOpen || !showProfileCompletionToast || !firstMissingKey) return
    if (toastHintShownThisDataOpenRef.current) return
    const t = window.setTimeout(() => {
      if (toastHintShownThisDataOpenRef.current) return
      toastHintShownThisDataOpenRef.current = true
      setToastGuideStep((s) => (s === 0 ? 1 : s))
    }, 1000)
    return () => window.clearTimeout(t)
  }, [
    needsProfileOnboarding,
    dataSheetOpen,
    showProfileCompletionToast,
    firstMissingKey,
    resolvedNumericUserId,
  ])

  useEffect(() => {
    if (toastGuideStep !== 2) return
    const t = window.setTimeout(() => setToastGuideStep(3), 600)
    return () => window.clearTimeout(t)
  }, [toastGuideStep])

  const profileRingR = 15
  const profileRingC = 2 * Math.PI * profileRingR
  const profileRingDashVisible = (profileCompletionStats.pct / 100) * profileRingC
  const profileRingCenter = 20
  const reduceMotionUi = useReducedMotion()

  const verified = user?.primaryEmailAddress?.verification?.status === 'verified'
  const avatarUrl = user?.imageUrl

  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  const toastGuideTargetRef =
    toastGuideStep === 1
      ? profileToastHeaderRef
      : toastGuideStep === 2
        ? profileCompletionToastRef
        : profileToastFirstMissingRef

  const toastGuideMessage =
    toastGuideStep === 1
      ? 'Нажмите, чтобы посмотреть необходимые данные'
      : toastGuideStep === 2
        ? 'Вот список полей, которые нужно заполнить'
        : 'Нажмите, чтобы перейти к заполнению'

  const toastGuideSpotlightActive =
    toastGuideStep >= 1 &&
    toastGuideStep <= 3 &&
    dataSheetOpen &&
    showProfileCompletionToast &&
    needsProfileOnboarding &&
    Boolean(firstMissingKey) &&
    !readToastGuideFieldNavDone(resolvedNumericUserId) &&
    !showProfileCompleteCelebration &&
    !showServiceQuickLinksTour

  const onboardingGateUiLocked =
    profileGateActive && !showProfileCompleteCelebration && !showServiceQuickLinksTour

  const toastGuideStrictActive =
    profileGateActive &&
    dataSheetOpen &&
    showProfileCompletionToast &&
    !readToastGuideFieldNavDone(resolvedNumericUserId)

  return (
    <div
      className={`test-page${showProfileCompletionToast ? ' test-page--profile-toast' : ''}${
        onboardingGateUiLocked ? ' test-page--onboarding-gate' : ''
      }`}
    >
      {showProfileCompletionToast ? (
        <motion.div
          ref={profileCompletionToastRef}
          className={`test-profile-completion test-profile-completion--toast${
            profileCompletionExpanded ? ' test-profile-completion--expanded' : ''
          }`}
          role="region"
          aria-label={t('buyerData_profileCompletionTitle')}
          initial={reduceMotionUi ? { opacity: 0 } : { opacity: 0, y: -22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            reduceMotionUi
              ? { duration: 0.2 }
              : { type: 'spring', damping: 26, stiffness: 320, mass: 0.7 }
          }
        >
          <button
            type="button"
            ref={profileToastHeaderRef}
            className="test-profile-completion__header"
            onClick={handleToastHeaderClick}
            aria-expanded={profileCompletionExpanded}
            disabled={toastGuideStrictActive && toastGuideStep === 0}
          >
            <div className="test-profile-completion__ring-wrap" aria-hidden>
              <svg className="test-profile-completion__ring" viewBox="0 0 40 40" width="36" height="36">
                <circle
                  cx={profileRingCenter}
                  cy={profileRingCenter}
                  r={profileRingR}
                  fill="none"
                  stroke="rgba(15,23,42,0.08)"
                  strokeWidth="2.5"
                />
                <circle
                  cx={profileRingCenter}
                  cy={profileRingCenter}
                  r={profileRingR}
                  fill="none"
                  stroke={profileCompletionStats.pct >= 100 ? '#10b981' : '#0abab5'}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  transform={`rotate(-90 ${profileRingCenter} ${profileRingCenter})`}
                  strokeDasharray={`${profileRingDashVisible} ${profileRingC}`}
                />
              </svg>
              <span className="test-profile-completion__ring-label">{profileCompletionStats.pct}%</span>
            </div>
            <div className="test-profile-completion__summary">
              <span className="test-profile-completion__title">{t('buyerData_profileCompletionTitle')}</span>
              <span className="test-profile-completion__count">
                {t('buyerData_profileCompletionCount', {
                  filled: profileCompletionStats.filled,
                  total: profileCompletionStats.total,
                })}
              </span>
            </div>
            {profileCompletionExpanded ? (
              <FiChevronUp size={18} className="test-profile-completion__chev" aria-hidden />
            ) : (
              <FiChevronDown size={18} className="test-profile-completion__chev" aria-hidden />
            )}
          </button>
          {profileCompletionExpanded ? (
            <ul className="test-profile-completion__list">
              {profileCompletionRows.map((row) => (
                <li key={row.key}>
                  {row.filled ? (
                    <span className="test-profile-completion__row test-profile-completion__row--done">
                      <FiCheck size={15} className="test-profile-completion__icon-ok" aria-hidden />
                      <span className="test-profile-completion__row-label">{row.label}</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      ref={row.key === firstMissingKey ? profileToastFirstMissingRef : undefined}
                      className="test-profile-completion__row test-profile-completion__row--missing"
                      disabled={
                        toastGuideStrictActive &&
                        (toastGuideStep === 0 ||
                          toastGuideStep === 2 ||
                          (toastGuideStep === 3 && row.key !== firstMissingKey))
                      }
                      onClick={() => handleToastMissingRowClick(row.key)}
                    >
                      <span className="test-profile-completion__dot-miss" aria-hidden />
                      <span className="test-profile-completion__row-label">{row.label}</span>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
        </motion.div>
      ) : null}

      <div className="test-page__ambient" aria-hidden="true">
        <span className="test-page__blob test-page__blob--a" />
        <span className="test-page__blob test-page__blob--b" />
        <span className="test-page__blob test-page__blob--c" />
      </div>

      <div className="test-page__inner">
        <section className="test-hero-pro" aria-labelledby="test-hero-heading">
          <div className="test-hero-pro__identity">
            <div className="test-hero-pro__avatar-wrap">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="test-hero-pro__avatar-img" />
              ) : (
                <span className="test-hero-pro__avatar-fallback" aria-hidden="true">
                  {initials || 'U'}
                </span>
              )}
            </div>
            <div className="test-hero-pro__who">
              <h2 id="test-hero-heading" className="test-hero-pro__name">
                {fullName}
              </h2>
              {email ? (
                <p className="test-hero-pro__email">
                  <FiMail size={14} aria-hidden />
                  {email}
                </p>
              ) : null}
              <div className="test-hero-pro__chips">
                <span className="test-chip">
                  <FiHash size={13} aria-hidden />
                  ID {idForChip}
                </span>
                <span className="test-chip">
                  <FiShield size={13} aria-hidden />
                  {roleLabel}
                </span>
                {verified ? (
                  <span className="test-chip test-chip--ok">
                    <FiCheckCircle size={13} aria-hidden />
                    Email подтверждён
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <nav className="test-hero-pro__shortcuts" aria-label="Разделы кабинета">
            <p className="test-hero-pro__shortcuts-label">Разделы кабинета</p>
            <div className="test-hero-icon-grid">
              {MAIN_CARDS.map((card) => {
                const Icon = card.icon
                const isHistory = card.to === '/history'
                const isSubscriptions = card.sheet === 'subscriptions'
                const isBookings = card.sheet === 'bookings'
                const isData = card.to === '/data'
                const showHistoryCount = isHistory && !historyLoading && historyCount > 0
                const showBookingsCount =
                  isBookings && !bookingsSheetLoading && bookingsSheetRows.length > 0
                const planLabel = subscriptionPlanLabel || 'Starter'
                const historyAria = showHistoryCount
                  ? `${card.title}, ${historyCount} ${historyObjectsWord(historyCount)} в истории`
                  : undefined
                const subscriptionsAria = isSubscriptions
                  ? `${card.title}, тариф ${planLabel}`
                  : undefined
                const bookingsAria = showBookingsCount
                  ? `${card.title}, ${bookingsSheetRows.length} ${bookingsWord(bookingsSheetRows.length)}`
                  : undefined
                const ariaLabel = historyAria ?? subscriptionsAria ?? bookingsAria
                const tileClass = `test-hero-icon-tile test-hero-icon-tile--${card.accent}${
                  isData && dataSheetOpen ? ' test-hero-icon-tile--active' : ''
                }${isData && onboardingGateUiLocked ? ' test-hero-icon-tile--gate-data' : ''}${
                  isHistory && historySheetOpen ? ' test-hero-icon-tile--active' : ''
                }${isSubscriptions && subscriptionSheetOpen ? ' test-hero-icon-tile--active' : ''}${
                  isBookings && bookingsSheetOpen ? ' test-hero-icon-tile--active' : ''
                }`
                const iconInner = (
                  <>
                    <span className="test-hero-icon-tile__icon">
                      <Icon size={18} strokeWidth={2} aria-hidden />
                      {showHistoryCount ? (
                        <span className="test-hero-icon-tile__count-badge" aria-hidden="true">
                          {historyCount > 99 ? '99+' : historyCount}
                        </span>
                      ) : null}
                      {showBookingsCount ? (
                        <span className="test-hero-icon-tile__count-badge" aria-hidden="true">
                          {bookingsSheetRows.length > 99 ? '99+' : bookingsSheetRows.length}
                        </span>
                      ) : null}
                      {isSubscriptions ? (
                        <span className="test-hero-icon-tile__plan-badge">{planLabel}</span>
                      ) : null}
                    </span>
                    <span className="test-hero-icon-tile__label">{card.title}</span>
                  </>
                )
                if (isData) {
                  return (
                    <button
                      ref={dataTileRef}
                      key={card.title}
                      type="button"
                      className={tileClass}
                      title={card.description}
                      aria-label={card.title}
                      aria-pressed={dataSheetOpen}
                      onClick={() => {
                        const openDataForOnboarding =
                          !dataSheetOpen && Boolean(resolvedNumericUserId) && needsProfileOnboarding
                        setHistorySheetOpen(false)
                        setSubscriptionSheetOpen(false)
                        setBookingsSheetOpen(false)
                        if (openDataForOnboarding) {
                          setDataSheetOpen(true)
                        } else {
                          setDataSheetOpen((open) => !open)
                        }
                      }}
                    >
                      {iconInner}
                    </button>
                  )
                }
                if (isHistory) {
                  return (
                    <button
                      key={card.title}
                      type="button"
                      className={tileClass}
                      title={card.description}
                      aria-label={ariaLabel ?? card.title}
                      aria-pressed={historySheetOpen}
                      onClick={() => {
                        setDataSheetOpen(false)
                        setSubscriptionSheetOpen(false)
                        setBookingsSheetOpen(false)
                        setHistorySheetOpen((open) => !open)
                      }}
                    >
                      {iconInner}
                    </button>
                  )
                }
                if (isSubscriptions) {
                  return (
                    <button
                      key={card.title}
                      type="button"
                      className={tileClass}
                      title={card.description}
                      aria-label={ariaLabel ?? card.title}
                      aria-pressed={subscriptionSheetOpen}
                      onClick={() => {
                        setDataSheetOpen(false)
                        setHistorySheetOpen(false)
                        setBookingsSheetOpen(false)
                        setSubscriptionSheetOpen((open) => !open)
                      }}
                    >
                      {iconInner}
                    </button>
                  )
                }
                if (isBookings) {
                  return (
                    <button
                      key={card.title}
                      type="button"
                      className={tileClass}
                      title={card.description}
                      aria-label={ariaLabel ?? card.title}
                      aria-pressed={bookingsSheetOpen}
                      onClick={() => {
                        setDataSheetOpen(false)
                        setHistorySheetOpen(false)
                        setSubscriptionSheetOpen(false)
                        setBookingsSheetOpen((open) => !open)
                      }}
                    >
                      {iconInner}
                    </button>
                  )
                }
                return (
                  <Link
                    key={card.title}
                    to={card.to}
                    className={tileClass}
                    title={card.description}
                    aria-label={ariaLabel}
                  >
                    {iconInner}
                  </Link>
                )
              })}
            </div>
          </nav>

          <div
            data-profile-sheet="data"
            className={`test-data-dropbox${dataSheetOpen ? ' test-data-dropbox--open' : ''}`}
            aria-hidden={!dataSheetOpen}
          >
            <div className="test-data-dropbox__measure">
              <div className="test-hero-pro__data-panel" aria-labelledby="test-data-panel-title">
                <div className="test-data-panel__toolbar">
                  <button
                    type="button"
                    className="test-data-panel__back"
                    onClick={() => setDataSheetOpen(false)}
                  >
                    <FiArrowLeft size={18} aria-hidden />
                    Свернуть
                  </button>
                  <h3 id="test-data-panel-title" className="test-data-panel__title">
                    Данные профиля
                  </h3>
                  <button
                    type="button"
                    className="test-data-panel__save"
                    onClick={handleProfilePanelSaveClick}
                    disabled={
                      dbUserLoading ||
                      !resolvedNumericUserId ||
                      profileFieldsLocked ||
                      profileSaveAllLoading
                    }
                  >
                    {profileSaveAllLoading ? 'Сохранение…' : 'Сохранить'}
                  </button>
                </div>
                <p className="test-data-panel__hint">
                  Поля сохраняются автоматически: при паузе в наборе или при уходе с поля.
                </p>
                {dbUserLoading ? (
                  <p className="test-data-panel__loading">Загрузка…</p>
                ) : !resolvedNumericUserId ? (
                  <p className="test-data-panel__hint">
                    Не удалось определить профиль. Обновите страницу или войдите снова.
                  </p>
                ) : (
                  <div className="test-data-panel__sections">
                    <section className="test-data-panel__section" aria-labelledby="profile-section-main">
                      <h4 id="profile-section-main" className="test-data-panel__section-title">
                        Личные данные и контакты
                      </h4>
                      <div className="test-data-panel__grid">
                        {PROFILE_MAIN_FIELDS.map(({ key, label, multiline, type, autoComplete }) => (
                          <div
                            key={key}
                            id={`test-profile-field-wrap-${key}`}
                            className={`test-data-field${
                              savingField === key ? ' test-data-field--saving' : ''
                            }`}
                          >
                            <label className="test-data-field__label" htmlFor={`profile-field-${key}`}>
                              {label}
                            </label>
                            <div
                              className={`test-data-field__input-wrap${
                                profileFieldSavedOk[key] && savingField !== key
                                  ? ' test-data-field__input-wrap--saved'
                                  : ''
                              }${multiline ? ' test-data-field__input-wrap--textarea' : ''}`}
                            >
                              {multiline ? (
                                <textarea
                                  id={`profile-field-${key}`}
                                  className="test-data-field__input test-data-field__input--textarea"
                                  rows={3}
                                  value={profileForm[key] ?? ''}
                                  onChange={handleProfileChange(key)}
                                  onBlur={handleProfileBlur(key)}
                                  autoComplete={autoComplete}
                                  spellCheck={false}
                                  disabled={profileFieldsLocked}
                                />
                              ) : (
                                <input
                                  id={`profile-field-${key}`}
                                  className="test-data-field__input"
                                  type={type || 'text'}
                                  value={profileForm[key] ?? ''}
                                  onChange={handleProfileChange(key)}
                                  onBlur={handleProfileBlur(key)}
                                  autoComplete={autoComplete}
                                  spellCheck={false}
                                  disabled={profileFieldsLocked}
                                />
                              )}
                              {profileFieldSavedOk[key] && savingField !== key ? (
                                <span className="test-data-field__saved" role="img" aria-label="Сохранено">
                                  <FiCheck size={18} strokeWidth={2.5} aria-hidden />
                                </span>
                              ) : null}
                            </div>
                            {savingField === key ? (
                              <span className="test-data-field__saving">Сохранение…</span>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </section>

                    <section
                      className="test-data-panel__section test-data-panel__section--passport"
                      aria-labelledby="profile-section-passport"
                    >
                      <div className="test-data-panel__section-head">
                        <div>
                          <h4 id="profile-section-passport" className="test-data-panel__section-title">
                            Паспорт и идентификация
                          </h4>
                          <p className="test-data-panel__section-sub">
                            Загрузите фото разворота паспорта — текст распознается на устройстве, затем данные
                            извлекаются и сохраняются автоматически.
                          </p>
                        </div>
                        <button
                          type="button"
                          className="test-recognize-passport-btn"
                          disabled={profileFieldsLocked}
                          onClick={() => passportInputRef.current?.click()}
                        >
                          {isRecognizingPassport || isSavingExtractPatch ? (
                            <>
                              <span className="test-spinner" aria-hidden />
                              {isRecognizingPassport ? 'Распознаём…' : 'Сохраняем…'}
                            </>
                          ) : (
                            <>
                              <FiUpload size={17} strokeWidth={2} aria-hidden />
                              Распознать с фото
                            </>
                          )}
                        </button>
                      </div>
                      <input
                        ref={passportInputRef}
                        type="file"
                        accept="image/*"
                        className="test-passport-file-input"
                        aria-hidden
                        tabIndex={-1}
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          await handlePassportRecognition(file)
                          e.target.value = ''
                        }}
                      />
                      <div className="test-data-panel__grid">
                        {PROFILE_PASSPORT_FIELDS.map(({ key, label, type, autoComplete }) => (
                          <div
                            key={key}
                            id={`test-profile-field-wrap-${key}`}
                            className={`test-data-field${
                              savingField === key ? ' test-data-field--saving' : ''
                            }`}
                          >
                            <label className="test-data-field__label" htmlFor={`profile-field-${key}`}>
                              {label}
                            </label>
                            <div
                              className={`test-data-field__input-wrap${
                                profileFieldSavedOk[key] && savingField !== key
                                  ? ' test-data-field__input-wrap--saved'
                                  : ''
                              }`}
                            >
                              <input
                                id={`profile-field-${key}`}
                                className="test-data-field__input"
                                type={type || 'text'}
                                value={profileForm[key] ?? ''}
                                onChange={handleProfileChange(key)}
                                onBlur={handleProfileBlur(key)}
                                autoComplete={autoComplete}
                                spellCheck={false}
                                disabled={profileFieldsLocked}
                              />
                              {profileFieldSavedOk[key] && savingField !== key ? (
                                <span className="test-data-field__saved" role="img" aria-label="Сохранено">
                                  <FiCheck size={18} strokeWidth={2.5} aria-hidden />
                                </span>
                              ) : null}
                            </div>
                            {savingField === key ? (
                              <span className="test-data-field__saving">Сохранение…</span>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div
            className={`test-data-dropbox${historySheetOpen ? ' test-data-dropbox--open' : ''}`}
            aria-hidden={!historySheetOpen}
          >
            <div className="test-data-dropbox__measure">
              <div className="test-hero-pro__data-panel test-hero-pro__history-panel">
                <div className="test-data-panel__toolbar">
                  <button
                    type="button"
                    className="test-data-panel__back"
                    onClick={() => setHistorySheetOpen(false)}
                  >
                    <FiArrowLeft size={18} aria-hidden />
                    Свернуть
                  </button>
                  <h3 id="test-history-panel-title" className="test-data-panel__title">
                    История
                  </h3>
                  <Link to="/history" className="test-data-panel__full-link">
                    Вся история
                    <FiArrowRight size={15} aria-hidden />
                  </Link>
                </div>
                <p className="test-data-panel__hint">
                  Аукционы, резервы, доли и ставки — как на странице «История».
                </p>
                <div className="test-history-dropbox__summary">
                  <span className="test-history-dropbox__summary-label">Событий в истории</span>
                  <span className="test-history-dropbox__summary-value">
                    {historyLoading ? '…' : historyCount}
                  </span>
                </div>
                {historyLoading ? (
                  <p className="test-data-panel__loading">Загрузка…</p>
                ) : historySections.length === 0 ? (
                  <p className="test-history-dropbox__empty">
                    Пока нет событий — они появятся после ставок и покупок.
                  </p>
                ) : (
                  <div className="test-history-dropbox__scroll">
                    {historySections.map((section) => (
                      <section
                        key={section.key}
                        className="test-history-section"
                        aria-labelledby={`hist-sec-${section.key}`}
                      >
                        <h4 id={`hist-sec-${section.key}`} className="test-history-section__title">
                          {section.title}
                        </h4>
                        <div className="test-history-section__grid">
                          {section.items.map((item) => {
                            const cardBody = (
                              <>
                                <div className="test-history-mini-card__thumb">
                                  <img
                                    src={item.imageSrc}
                                    alt=""
                                    loading="lazy"
                                    decoding="async"
                                  />
                                </div>
                                <div className="test-history-mini-card__text">
                                  <span className="test-history-mini-card__title">{item.title}</span>
                                  <span className="test-history-mini-card__sub">{item.subtitle}</span>
                                </div>
                              </>
                            )
                            return item.href ? (
                              <Link
                                key={item.id}
                                to={item.href}
                                className="test-history-mini-card"
                                onClick={() => setHistorySheetOpen(false)}
                              >
                                {cardBody}
                              </Link>
                            ) : (
                              <div key={item.id} className="test-history-mini-card">
                                {cardBody}
                              </div>
                            )
                          })}
                        </div>
                      </section>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div
            className={`test-data-dropbox${subscriptionSheetOpen ? ' test-data-dropbox--open' : ''}`}
            aria-hidden={!subscriptionSheetOpen}
          >
            <div className="test-data-dropbox__measure">
              <div className="test-hero-pro__data-panel" aria-labelledby="test-subscription-panel-title">
                <div className="test-data-panel__toolbar test-data-panel__toolbar--subscription">
                  <button
                    type="button"
                    className="test-data-panel__back"
                    onClick={() => setSubscriptionSheetOpen(false)}
                  >
                    <FiArrowLeft size={18} aria-hidden />
                    Свернуть
                  </button>
                  <h3 id="test-subscription-panel-title" className="test-data-panel__title">
                    Подписки
                  </h3>
                  <span className="test-data-panel__toolbar-spacer" aria-hidden />
                </div>
                <p className="test-data-panel__hint test-data-panel__hint--subscription">
                  {t('subCab_preview_dropboxHint')}
                </p>
                <SubscriptionCabinetPreview
                  loading={subscriptionSheetLoading}
                  currentVisual={subscriptionProfileVisual}
                  subscription={subscriptionSheetState}
                  onUpgradeNext={handleSubscriptionUpgradeNext}
                  upgradeLoading={subscriptionUpgradeLoading}
                  onSeeAll={() => setSubscriptionSheetOpen(false)}
                />
              </div>
            </div>
          </div>

          <div
            className={`test-data-dropbox${bookingsSheetOpen ? ' test-data-dropbox--open' : ''}`}
            aria-hidden={!bookingsSheetOpen}
          >
            <div className="test-data-dropbox__measure">
              <div className="test-hero-pro__data-panel test-hero-pro__bookings-panel">
                <div className="test-data-panel__toolbar">
                  <button
                    type="button"
                    className="test-data-panel__back"
                    onClick={() => setBookingsSheetOpen(false)}
                  >
                    <FiArrowLeft size={18} aria-hidden />
                    Свернуть
                  </button>
                  <h3 id="test-bookings-panel-title" className="test-data-panel__title">
                    Бронирования
                  </h3>
                  <Link to="/profile/bookings" className="test-data-panel__full-link">
                    Все бронирования
                    <FiArrowRight size={15} aria-hidden />
                  </Link>
                </div>
                <p className="test-data-panel__hint">
                  Записи на просмотр объектов (тест-драйв). Подробности — на странице бронирований.
                </p>
                {bookingsSheetLoading ? (
                  <p className="test-data-panel__loading">Загрузка…</p>
                ) : bookingsSheetRows.length === 0 ? (
                  <p className="test-history-dropbox__empty">
                    Пока нет бронирований — они появятся после записи на просмотр объекта.
                  </p>
                ) : (
                  <div className="test-booking-dropbox__list">
                    {bookingsSheetRows.slice(0, 5).map((b) => {
                      const statusKey = (b.status || 'pending').toLowerCase()
                      const title =
                        b.property_title || `Объект #${b.property_id}`
                      return (
                        <Link
                          key={b.id}
                          to={`/profile/bookings?booking=${b.id}`}
                          className="test-booking-mini"
                          onClick={() => setBookingsSheetOpen(false)}
                        >
                          <span className={`test-booking-mini__badge test-booking-mini__badge--${['pending', 'approved', 'rejected'].includes(statusKey) ? statusKey : 'pending'}`}>
                            {bookingStatusLabelRu(statusKey)}
                          </span>
                          <span className="test-booking-mini__title">{title}</span>
                          <span className="test-booking-mini__meta">
                            {formatDateRangeRu(b.start_date, b.end_date)}
                          </span>
                        </Link>
                      )
                    })}
                    {bookingsSheetRows.length > 5 ? (
                      <p className="test-booking-dropbox__more">
                        Показаны 5 из {bookingsSheetRows.length}. Остальные — в полном списке.
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <AnimatePresence>
          {!dataSheetOpen && !historySheetOpen && !subscriptionSheetOpen && !bookingsSheetOpen ? (
            <motion.div
              key="cabinet-overview-below"
              className="test-page__below-hero"
              initial={false}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
            >
              <section
                className="test-direction-summaries"
                aria-label="Ключевые направления: доли, аукцион и долги"
              >
                <div className="test-direction-summaries__grid">
                  {DIRECTION_SUMMARIES.map((item) => {
                    const dirRef =
                      item.to === '/shares'
                        ? directionSharesRef
                        : item.to === '/auction'
                          ? directionAuctionRef
                          : item.to === '/debts'
                            ? directionDebtsRef
                            : undefined
                    return (
                      <DirectionSummaryCard
                        key={item.headline}
                        ref={dirRef}
                        variant={item.variant}
                        areaLabel={item.areaLabel}
                        headline={item.headline}
                        subCardTitle={item.subCardTitle}
                        subCardSubtitle={item.subCardSubtitle}
                        to={item.to}
                        moreCount={item.moreCount}
                        thumbnails={item.thumbnails}
                      />
                    )
                  })}
                </div>
              </section>

              <div className="test-bento">
                <div className="test-bento__main">
                  <section className="test-panel test-panel--compact" aria-labelledby="test-quick-title">
                    <div className="test-panel__head">
                      <div>
                        <h2 id="test-quick-title" className="test-panel__title">
                          Направления
                        </h2>
                        <p className="test-panel__subtitle">Инвестиции и операции</p>
                      </div>
                    </div>
                    <div className="test-quick-row">
                      {QUICK_LINKS.map((link) => {
                        const Icon = link.icon
                        const isLogout = link.action === 'logout'
                        const inner = (
                          <>
                            <span className="test-quick-pill__icon">
                              <Icon size={17} aria-hidden />
                            </span>
                            <span className="test-quick-pill__body">
                              <span className="test-quick-pill__title">{link.title}</span>
                              <span className="test-quick-pill__sub">{link.subtitle}</span>
                            </span>
                            <FiArrowRight size={15} className="test-quick-pill__arrow" aria-hidden />
                          </>
                        )
                        if (isLogout) {
                          return (
                            <button
                              key="quick-logout"
                              type="button"
                              className="test-quick-pill test-quick-pill--logout"
                              onClick={handleQuickLogout}
                            >
                              {inner}
                            </button>
                          )
                        }
                        return (
                          <Link key={link.to} to={link.to} className="test-quick-pill">
                            {inner}
                          </Link>
                        )
                      })}
                    </div>
                  </section>
                </div>

                <aside className="test-bento__rail">
                  <TransactionHistoryCard
                    className="test-bento__rail-card"
                    totalLabel="Событий в истории"
                    totalAmountDisplay={historyLoading ? '…' : String(historyCount)}
                    subtitle="Аукционы, резервы, доли и ставки — как на странице «История»"
                    listTitle="Последние события"
                    items={recentHistoryRows}
                    defaultSelectedId={recentHistoryRows[0]?.id}
                    historyHref="/history"
                    historyButtonLabel="Вся история"
                  />

                  <section className="test-panel test-panel--tight" aria-labelledby="test-docs-title">
                    <h2 id="test-docs-title" className="test-panel__title test-panel__title--sm">
                      Документы
                    </h2>
                    <div className="test-docs-stack">
                      <button
                        type="button"
                        className="test-doc-row"
                        onClick={() => {
                          setHistorySheetOpen(false)
                          setSubscriptionSheetOpen(false)
                          setBookingsSheetOpen(false)
                          setDataSheetOpen(true)
                          scrollMainTo(0, 0, 'smooth')
                        }}
                      >
                        <FiFileText size={18} aria-hidden />
                        <div>
                          <span className="test-doc-row__title">Ваши файлы</span>
                          <span className="test-doc-row__sub">Паспорт и реквизиты в разделе «Данные»</span>
                        </div>
                        <FiArrowRight size={16} aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="test-doc-row"
                        onClick={() => {
                          setHistorySheetOpen(false)
                          setSubscriptionSheetOpen(false)
                          setBookingsSheetOpen(false)
                          setDataSheetOpen(true)
                          scrollMainTo(0, 0, 'smooth')
                        }}
                      >
                        <FiBookOpen size={18} aria-hidden />
                        <div>
                          <span className="test-doc-row__title">Соглашения</span>
                          <span className="test-doc-row__sub">Правила и обработка данных</span>
                        </div>
                        <FiArrowRight size={16} aria-hidden />
                      </button>
                    </div>
                  </section>
                </aside>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <PassportRecognitionModal
        isOpen={showPassportRecognitionModal}
        onClose={() => {
          setShowPassportRecognitionModal(false)
          setExtractedPassportData(null)
        }}
        onConfirm={() => {}}
        extractedData={extractedPassportData}
      />

      <ProfileSpotlightOnboarding
        active={showTileDataOnboarding}
        targetRef={dataTileRef}
        message="Необходимо заполнить данные"
      />
      <ProfileSpotlightOnboarding
        key={`profile-toast-guide-${toastGuideStep}`}
        active={toastGuideSpotlightActive}
        targetRef={toastGuideTargetRef}
        message={toastGuideMessage}
      />

      {showProfileCompleteCelebration ? (
        <>
          <div className="test-profile-complete-confetti" aria-hidden>
            {!reduceMotionUi ? (
              <Confetti
                width={windowSize.width}
                height={windowSize.height}
                recycle
                numberOfPieces={500}
                gravity={0.1}
                wind={0.02}
                colors={[
                  '#10b981',
                  '#f59e0b',
                  '#3b82f6',
                  '#ef4444',
                  '#8b5cf6',
                  '#ec4899',
                  '#06b6d4',
                  '#f97316',
                  '#14b8a6',
                  '#fbbf24',
                ]}
                confettiSource={{
                  x: 0,
                  y: 0,
                  w: windowSize.width,
                  h: 0,
                }}
                initialVelocityX={4}
                initialVelocityY={6}
                tweenDuration={10000}
              />
            ) : null}
          </div>
          <div className="test-profile-complete-modal-root">
            <div
              className="test-profile-complete-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="test-profile-complete-title"
            >
              <h2 id="test-profile-complete-title" className="test-profile-complete-modal__title">
                Поздравляем!
              </h2>
              <p className="test-profile-complete-modal__text">Вы успешно зарегистрировали профиль.</p>
              <button type="button" className="test-profile-complete-modal__btn" onClick={handleProfileCompleteCelebrationGo}>
                Перейти
              </button>
            </div>
          </div>
        </>
      ) : null}

      <ServiceQuickLinksTour
        active={showServiceQuickLinksTour}
        onDismiss={handleServiceQuickLinksTourDismiss}
        sharesRef={directionSharesRef}
        bonusesRef={directionAuctionRef}
        debtsRef={directionDebtsRef}
      />
    </div>
  )
}

export default TestPage

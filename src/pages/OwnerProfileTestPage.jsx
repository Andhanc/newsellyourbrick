import { useState, useEffect, useCallback, useMemo, useRef, useId } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  CalendarCheck,
  ShoppingBag,
  Menu,
  X,
  Eye,
  Download,
  DollarSign,
  TrendingUp,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
  FileText,
  Sparkles,
  ChevronRight,
} from 'lucide-react'
import { OPR_IMAGES } from './ownerProfileTestImages'
import { getOwnerProfileTabs, isOwnerProfileTabId } from './ownerProfileTestTabs'
import OwnerTestProfileMenu from '../components/OwnerTestProfileMenu'
import OwnerNotificationsButton from '../components/OwnerNotificationsButton'
import OwnerSupportButton from '../components/OwnerSupportButton'
import { useOwnerTestProfile } from '../context/OwnerTestProfileContext'
import { OWNER_VIEWS } from '../context/OwnerTestNavigationContext'
import { useOwnerTestEmbeddedNav } from '../hooks/useOwnerTestEmbeddedNav'
import { useOwnerTestNavItems } from '../hooks/useOwnerTestNavItems'
import { useOwnerTestUserPhoto } from '../hooks/useOwnerTestUserPhoto'
import { getOwnerProfileFieldLabel, getOwnerSubscriptionPlanLabel, getOwnerTestIntlLocale, getNextOwnerSubscriptionPlanId, resolveProfileSubscriptionPlanId } from '../utils/ownerTestI18n'
import { OWNER_TEST_STANDALONE_HREF_MAP } from '../utils/ownerTestNav'
import {
  CLERK_DB_USER_SYNCED,
  fetchOwnerProperties,
  getOwnerPropertiesUserId,
} from '../utils/ownerPropertiesList'
import { fetchOwnerTestDriveBookings } from '../utils/ownerTestDriveList'
import {
  downloadXlsxBuffer,
  exportOwnerAnalyticsExcel,
} from '../utils/ownerAnalyticsExcelExport'
import OwnerProfileCompletionBanner from '../components/OwnerProfileCompletionBanner'
import { RoleSwitchButton } from '../components/RoleSwitchBottomCta'
import OwnerProfilePageSkeleton from '../components/OwnerProfilePageSkeleton'
import CountrySelect from '../components/CountrySelect'
import {
  buildCountryIsoByName,
  buildPhoneCodeByCountryName,
  formatProfilePhoneInput,
  replacePhoneDialCodeByCountry,
} from '../utils/profilePhoneFormat'
import {
  INVALID_SPAIN_DNI_NIE_MESSAGE,
  isSpainCountry,
  isValidSpainDniNie,
  normalizeIdentificationInput,
} from '../utils/profileIdentification'
import { OWNER_PROFILE_COMPLETION_FIELDS } from '../utils/ownerTestProfile'
import { getCurrencySymbol } from '../utils/currency'
import { showNotification } from '../utils/toastHelper'
import './OwnerProfileTestPage.css'
import './OwnerProfileTestPage.mobile.css'

/**
 * Поля профиля продавца (из OwnerDashboard + макет):
 * — firstName, lastName, country, phone, email, address, passportNumber, identificationNumber
 * — subscription, depositStatus (отображение)
 * — avatar, role, memberSince
 * — statistics (вкладки настроек)
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const EMPTY_OWNER_SALES = {
  auction: [],
  shares: [],
  debts: [],
  buy_now: [],
  test_drive: [],
}

function formatDateSafe(value, locale, notSpecifiedLabel) {
  if (!value) return notSpecifiedLabel
  const raw = String(value).trim()
  if (!raw) return notSpecifiedLabel

  let date = new Date(raw)
  if (Number.isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(:\d{2})?$/.test(raw)) {
    date = new Date(raw.replace(' ', 'T'))
  }
  if (Number.isNaN(date.getTime()) && /^\d{2}\.\d{2}\.\d{4}/.test(raw)) {
    const [datePart, timePart] = raw.split(' ')
    const [dd, mm, yyyy] = datePart.split('.')
    date = new Date(`${yyyy}-${mm}-${dd}${timePart ? `T${timePart}` : ''}`)
  }

  if (Number.isNaN(date.getTime())) return notSpecifiedLabel
  return date.toLocaleDateString(locale)
}

function formatNumber(value, locale) {
  return (Number(value) || 0).toLocaleString(locale)
}

function formatMoney(value, locale, currency = 'EUR') {
  const amount = Number(value) || 0
  const symbol = getCurrencySymbol(currency)
  return `${symbol}${amount.toLocaleString(locale, { maximumFractionDigits: 0 })}`
}

function getOwnerRowTable(row) {
  const raw = row?.raw || row || {}
  if (raw.property_table) return raw.property_table
  if (raw.source_table === 'houses' || raw.source_table === 'properties_houses') return 'properties_houses'
  if (raw.property_type === 'house' || raw.property_type === 'villa') return 'properties_houses'
  return 'properties_apartments'
}

function propertyKey(id, table) {
  return `${table || 'properties_apartments'}:${Number(id)}`
}

function normalizeStatsPropertyTable(table) {
  const value = String(table || '').trim()
  if (value === 'houses') return 'properties_houses'
  if (value === 'apartments') return 'properties_apartments'
  if (value === 'properties_houses' || value === 'properties_apartments') return value
  return value || 'properties_apartments'
}

function getSalePropertyKey(sale) {
  const id = sale.property_id ?? sale.propertyId ?? sale.id
  const table = normalizeStatsPropertyTable(sale.property_table ?? sale.propertyTable ?? sale.source_table)
  return propertyKey(id, table)
}

function getBookingPropertyKey(booking) {
  const raw = booking?.raw || booking || {}
  const id = booking?.propertyId ?? raw.property_id ?? raw.propertyId ?? raw.id
  const table = normalizeStatsPropertyTable(
    booking?.propertyTable ?? raw.property_table ?? raw.propertyTable ?? raw.source_table
  )
  return propertyKey(id, table)
}

function collectOwnerSalesRows(data) {
  const sales = data || EMPTY_OWNER_SALES
  return ['auction', 'shares', 'debts', 'buy_now'].flatMap((key) =>
    Array.isArray(sales[key]) ? sales[key] : []
  )
}

function getStatsPeriodStart(period) {
  const date = new Date()
  if (period === '7d') date.setDate(date.getDate() - 6)
  else if (period === 'year') date.setFullYear(date.getFullYear() - 1)
  else date.setDate(date.getDate() - 29)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

function isAfterPeriodStart(value, periodStart) {
  if (!value) return false
  const time = new Date(value).getTime()
  return Number.isFinite(time) && time >= periodStart
}

function buildSalesRevenueByProperty(data, periodStart = null) {
  const revenueByKey = new Map()
  for (const sale of collectOwnerSalesRows(data)) {
    if (periodStart != null && !isAfterPeriodStart(sale.sold_at, periodStart)) continue
    const key = getSalePropertyKey(sale)
    revenueByKey.set(key, (revenueByKey.get(key) || 0) + (Number(sale.sale_amount) || 0))
  }
  return revenueByKey
}

function buildSalesCountByProperty(data, periodStart = null) {
  const countByKey = new Map()
  for (const sale of collectOwnerSalesRows(data)) {
    if (periodStart != null && !isAfterPeriodStart(sale.sold_at, periodStart)) continue
    const key = getSalePropertyKey(sale)
    countByKey.set(key, (countByKey.get(key) || 0) + 1)
  }
  return countByKey
}

function buildBookingsByProperty(rows, periodStart = null) {
  const bookingsByKey = new Map()
  for (const row of rows) {
    if (periodStart != null && !isAfterPeriodStart(row.startDate || row.raw?.created_at, periodStart)) {
      continue
    }
    const key = getBookingPropertyKey(row)
    bookingsByKey.set(key, (bookingsByKey.get(key) || 0) + 1)
  }
  return bookingsByKey
}

function LogoMark({ className = '' }) {
  return (
    <svg className={`opr-logo__mark ${className}`.trim()} viewBox="0 0 40 40" aria-hidden>
      <defs>
        <linearGradient id="opr-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6ba3b2" />
          <stop offset="100%" stopColor="#3a7586" />
        </linearGradient>
      </defs>
      <path d="M20 2L35 11v18L20 38 5 29V11L20 2z" fill="url(#opr-logo-grad)" />
      <text
        x="20"
        y="24"
        textAnchor="middle"
        fill="#fff"
        fontSize="14"
        fontWeight="700"
        fontFamily="Inter, sans-serif"
      >
        $
      </text>
    </svg>
  )
}

function ProfileAvatar({ large = false }) {
  const photoUrl = useOwnerTestUserPhoto()
  const [photoFailed, setPhotoFailed] = useState(false)
  const gradientId = useId()

  useEffect(() => {
    setPhotoFailed(false)
  }, [photoUrl])

  return (
    <span className={`opr-avatar${large ? ' opr-avatar--lg' : ''}`} aria-hidden>
      {photoUrl && !photoFailed ? (
        <img
          src={photoUrl}
          alt=""
          className="opr-avatar__img"
          onError={() => setPhotoFailed(true)}
        />
      ) : (
        <svg viewBox="0 0 80 80">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#6ba3b2" />
              <stop offset="100%" stopColor="#3a7586" />
            </linearGradient>
          </defs>
          <circle cx="40" cy="40" r="40" fill={`url(#${gradientId})`} />
          <circle cx="40" cy="32" r="14" fill="#F8FAFC" />
          <ellipse cx="40" cy="68" rx="22" ry="16" fill="#F8FAFC" />
        </svg>
      )}
    </span>
  )
}

export default function OwnerProfileTestPage() {
  const { t, i18n } = useTranslation()
  const intlLocale = useMemo(() => getOwnerTestIntlLocale(i18n.language), [i18n.language])
  const { profile, loading, saving, fullName, roleLabel, updateProfile, saveProfile } =
    useOwnerTestProfile()
  const { isEmbedded, goTo, tab: embeddedTab, highlight } = useOwnerTestEmbeddedNav()
  const navItems = useOwnerTestNavItems({
    activeId: 'settings',
    hrefMap: isEmbedded ? undefined : OWNER_TEST_STANDALONE_HREF_MAP,
  })
  const profileTabs = useMemo(() => getOwnerProfileTabs(t), [t])
  const statsPeriodDefs = useMemo(
    () => [
      { id: '7d', label: t('ownerTest_datePreset7d') },
      { id: '30d', label: t('ownerTest_statsPeriod30dShort', { defaultValue: t('ownerTest_propertiesPeriod30d') }) },
      { id: 'year', label: t('ownerTest_profilePeriodYear') },
    ],
    [t]
  )
  const formatDateForExport = useCallback(
    (value) => formatDateSafe(value, intlLocale, t('ownerTest_profileNotSpecified')),
    [intlLocale, t]
  )
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState(() => {
    if (isEmbedded) {
      return isOwnerProfileTabId(embeddedTab) ? embeddedTab : 'personal'
    }
    const tab = searchParams.get('tab')
    return isOwnerProfileTabId(tab) ? tab : 'personal'
  })
  const [menuOpen, setMenuOpen] = useState(false)
  const [appPreferences, setAppPreferences] = useState({
    language: 'ru',
    currency: 'eur',
    timezone: 'minsk',
  })
  const [statsPeriod, setStatsPeriod] = useState('30d')
  const [ownerProperties, setOwnerProperties] = useState([])
  const [ownerTestDriveRows, setOwnerTestDriveRows] = useState([])
  const [ownerSalesData, setOwnerSalesData] = useState(EMPTY_OWNER_SALES)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState('')
  const [exportingExcel, setExportingExcel] = useState(false)
  const [saveReleased, setSaveReleased] = useState(false)
  const profileFormRef = useRef(null)
  const saveReleaseRef = useRef(null)

  const closeMenu = useCallback(() => setMenuOpen(false), [])

  const currentSubscriptionPlanId = useMemo(
    () => resolveProfileSubscriptionPlanId(profile?.subscription) || 'standard',
    [profile?.subscription]
  )

  const nextSubscriptionPlanId = useMemo(
    () => getNextOwnerSubscriptionPlanId(currentSubscriptionPlanId),
    [currentSubscriptionPlanId]
  )

  const nextSubscriptionPlanLabel = useMemo(
    () => (nextSubscriptionPlanId ? getOwnerSubscriptionPlanLabel(nextSubscriptionPlanId) : ''),
    [nextSubscriptionPlanId]
  )

  const handleSubscriptionUpgrade = useCallback(() => {
    if (isEmbedded && goTo) {
      goTo(OWNER_VIEWS.SUBSCRIPTIONS)
      return
    }
    window.location.assign(OWNER_TEST_STANDALONE_HREF_MAP.subscriptions)
  }, [goTo, isEmbedded])

  const phoneCodeByCountryName = useMemo(() => buildPhoneCodeByCountryName(), [])
  const countryIsoByName = useMemo(() => buildCountryIsoByName(), [])

  const handleCountryChange = useCallback(
    (countryName) => {
      if (!profile) return
      const nextPhone = replacePhoneDialCodeByCountry({
        currentPhone: profile.phone,
        previousCountry: profile.country,
        nextCountry: countryName,
        phoneCodeByCountryName,
      })
      updateProfile('country', countryName)
      if (nextPhone !== profile.phone) {
        updateProfile('phone', nextPhone)
      }
    },
    [profile, phoneCodeByCountryName, updateProfile]
  )

  const handlePhoneChange = useCallback(
    (event) => {
      const formatted = formatProfilePhoneInput(
        event.target.value,
        profile?.country,
        countryIsoByName
      )
      updateProfile('phone', formatted)
    },
    [profile?.country, countryIsoByName, updateProfile]
  )

  const handleIdentificationChange = useCallback(
    (event) => {
      const value = normalizeIdentificationInput(event.target.value, profile?.country)
      updateProfile('identificationNumber', value)
    },
    [profile?.country, updateProfile]
  )

  const renderNavItem = useCallback(
    ({ id, label, icon: Icon, active, badge, href }) => {
      const className = `opr-nav__item${active ? ' opr-nav__item--active' : ''}`
      const inner = (
        <>
          <Icon size={20} strokeWidth={active ? 2.25 : 2} aria-hidden />
          <span>{label}</span>
          {badge != null && <span className="opr-nav__badge">{badge}</span>}
        </>
      )

      if (href) {
        return (
          <Link key={id} to={href} className={className} onClick={closeMenu}>
            {inner}
          </Link>
        )
      }

      return (
        <button key={id} type="button" className={className} onClick={closeMenu}>
          {inner}
        </button>
      )
    },
    [closeMenu]
  )

  const loadStatistics = useCallback(async () => {
    const userId = getOwnerPropertiesUserId()
    if (!userId) {
      setOwnerProperties([])
      setOwnerTestDriveRows([])
      setOwnerSalesData(EMPTY_OWNER_SALES)
      setStatsLoading(false)
      setStatsError(t('ownerTest_profileStatsLoginRequired'))
      return
    }

    setStatsLoading(true)
    setStatsError('')
    try {
      const [properties, testDrives, salesResponse] = await Promise.all([
        fetchOwnerProperties(userId),
        fetchOwnerTestDriveBookings(userId),
        fetch(`${API_BASE_URL}/owner/${userId}/my-sales`),
      ])
      const salesJson = await salesResponse.json().catch(() => ({}))
      setOwnerProperties(properties)
      setOwnerTestDriveRows(testDrives)
      setOwnerSalesData(
        salesResponse.ok && salesJson.success && salesJson.data ? salesJson.data : EMPTY_OWNER_SALES
      )
    } catch (error) {
      console.warn('OwnerProfileTestPage: не удалось загрузить статистику', error)
      setOwnerProperties([])
      setOwnerTestDriveRows([])
      setOwnerSalesData(EMPTY_OWNER_SALES)
      setStatsError(t('ownerTest_profileStatsLoadError'))
    } finally {
      setStatsLoading(false)
    }
  }, [t])

  const selectProfileTab = useCallback(
    (tabId) => {
      setActiveTab(tabId)
      if (isEmbedded && goTo) {
        goTo(OWNER_VIEWS.PROFILE, tabId === 'personal' ? {} : { tab: tabId })
      } else if (tabId === 'personal') {
        setSearchParams({})
      } else {
        setSearchParams({ tab: tabId })
      }
    },
    [isEmbedded, goTo, setSearchParams]
  )

  const focusProfileField = useCallback(
    (fieldKey) => {
      selectProfileTab('personal')
      window.requestAnimationFrame(() => {
        const el = document.getElementById(`owner-profile-field-${fieldKey}`)
        if (!el) return
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        const focusTarget =
          el.matches('input, textarea, select')
            ? el
            : el.querySelector('.country-select__input, input, textarea, select')
        focusTarget?.focus({ preventScroll: true })
        el.classList.add('opr-field__input--highlight')
        window.setTimeout(() => el.classList.remove('opr-field__input--highlight'), 2200)
      })
    },
    [selectProfileTab]
  )

  const handleSaveProfile = useCallback(
    async (event) => {
      event.preventDefault()
      if (
        profile?.identificationNumber?.trim() &&
        isSpainCountry(profile?.country) &&
        !isValidSpainDniNie(profile.identificationNumber)
      ) {
        showNotification(INVALID_SPAIN_DNI_NIE_MESSAGE, 'error')
        focusProfileField('identificationNumber')
        return
      }
      const result = await saveProfile()
      if (result.success) {
        showNotification(t('ownerTest_profileSaved'))
      } else {
        showNotification(result.error || t('ownerTest_profileSaveError'))
      }
    },
    [profile?.country, profile?.identificationNumber, focusProfileField, saveProfile, t]
  )

  useEffect(() => {
    if (!highlight || loading || !profile) return
    if (!OWNER_PROFILE_COMPLETION_FIELDS.includes(highlight)) return
    focusProfileField(highlight)
  }, [highlight, loading, profile, focusProfileField])

  useEffect(() => {
    if (isEmbedded) {
      if (isOwnerProfileTabId(embeddedTab)) {
        setActiveTab(embeddedTab)
      }
      return
    }
    const tab = searchParams.get('tab')
    if (isOwnerProfileTabId(tab)) {
      setActiveTab(tab)
      return
    }
    if (!tab) setActiveTab('personal')
  }, [isEmbedded, embeddedTab, searchParams])

  useEffect(() => {
    if (isEmbedded) return undefined
    document.documentElement.classList.add('opr-page-active')
    return () => document.documentElement.classList.remove('opr-page-active')
  }, [isEmbedded])

  useEffect(() => {
    if (!menuOpen) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [menuOpen])

  useEffect(() => {
    if (activeTab !== 'personal') {
      setSaveReleased(false)
      return undefined
    }

    let frame = null
    let settleTimer = null
    let observer = null
    const form = profileFormRef.current
    const releaseAnchor = saveReleaseRef.current
    const scrollParent = (() => {
      let parent = form?.parentElement
      while (parent && parent !== document.body) {
        const { overflowY } = window.getComputedStyle(parent)
        if (['auto', 'scroll'].includes(overflowY)) {
          return parent
        }
        parent = parent.parentElement
      }
      return null
    })()

    const updateSavePosition = () => {
      frame = null
      const currentForm = profileFormRef.current
      if (!currentForm) return

      const bottomOffset = window.matchMedia('(max-width: 900px)').matches ? 18 : 24
      const currentSlot = saveReleaseRef.current
      const button = currentForm.querySelector('.opr-profile-form__save')
      const buttonHeight = button?.getBoundingClientRect().height || 46
      const rootBottom = scrollParent?.getBoundingClientRect().bottom || window.innerHeight
      const slotRect = currentSlot?.getBoundingClientRect()
      const slotTop = slotRect?.top
      const formBottom = currentForm.getBoundingClientRect().bottom
      const staticButtonOffset = slotRect ? Math.max((slotRect.height - buttonHeight) / 2, 0) : 0
      const fixedButtonTop = rootBottom - bottomOffset - buttonHeight
      const releaseLine = fixedButtonTop - staticButtonOffset

      setSaveReleased((wasReleased) => {
        if (slotTop == null) return formBottom <= rootBottom - bottomOffset
        return wasReleased ? slotTop <= releaseLine + 48 : slotTop <= releaseLine
      })
    }

    const scheduleUpdate = () => {
      if (frame != null) return
      frame = window.requestAnimationFrame(updateSavePosition)
    }

    updateSavePosition()
    settleTimer = window.setTimeout(updateSavePosition, 250)
    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate)
    window.addEventListener('load', scheduleUpdate)
    document.addEventListener('scroll', scheduleUpdate, true)
    scrollParent?.addEventListener('scroll', scheduleUpdate, { passive: true })
    if (releaseAnchor && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver(scheduleUpdate, {
        root: scrollParent,
        threshold: 0,
      })
      observer.observe(releaseAnchor)
    }

    return () => {
      if (frame != null) window.cancelAnimationFrame(frame)
      if (settleTimer != null) window.clearTimeout(settleTimer)
      observer?.disconnect()
      window.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
      window.removeEventListener('load', scheduleUpdate)
      document.removeEventListener('scroll', scheduleUpdate, true)
      scrollParent?.removeEventListener('scroll', scheduleUpdate)
    }
  }, [activeTab])

  useEffect(() => {
    loadStatistics()
  }, [loadStatistics])

  useEffect(() => {
    const onUserSynced = () => loadStatistics()
    window.addEventListener(CLERK_DB_USER_SYNCED, onUserSynced)
    return () => window.removeEventListener(CLERK_DB_USER_SYNCED, onUserSynced)
  }, [loadStatistics])

  const statsPeriodStart = useMemo(() => getStatsPeriodStart(statsPeriod), [statsPeriod])

  const bookingsByProperty = useMemo(
    () => buildBookingsByProperty(ownerTestDriveRows),
    [ownerTestDriveRows]
  )

  const periodBookingsByProperty = useMemo(
    () => buildBookingsByProperty(ownerTestDriveRows, statsPeriodStart),
    [ownerTestDriveRows, statsPeriodStart]
  )

  const revenueByProperty = useMemo(
    () => buildSalesRevenueByProperty(ownerSalesData),
    [ownerSalesData]
  )

  const salesCountByProperty = useMemo(
    () => buildSalesCountByProperty(ownerSalesData),
    [ownerSalesData]
  )

  const statsRows = useMemo(
    () =>
      ownerProperties.map((row) => {
        const table = getOwnerRowTable(row)
        const key = propertyKey(row.id, table)
        const revenue = revenueByProperty.get(key) || 0
        const rawCurrentBid =
          row.currentBidAmount ??
          row.raw?.current_bid ??
          row.raw?.currentBid ??
          row.raw?.auction_starting_price ??
          row.raw?.starting_price ??
          0
        return {
          ...row,
          analyticsKey: key,
          table,
          viewsValue: Number(row.viewsCount) || 0,
          testDriveValue: bookingsByProperty.get(key) || Number(row.bookingsCount) || 0,
          currentBidValue: Number(rawCurrentBid) || 0,
          currentBidCurrency: row.currency || row.raw?.currency || 'EUR',
          salesValue: salesCountByProperty.get(key) || 0,
          revenueValue: revenue,
          revenueCurrency: row.currency || row.raw?.currency || 'EUR',
        }
      }),
    [bookingsByProperty, ownerProperties, revenueByProperty, salesCountByProperty]
  )

  const ownerSalesRows = useMemo(
    () => collectOwnerSalesRows(ownerSalesData).filter((row) => isAfterPeriodStart(row.sold_at, statsPeriodStart)),
    [ownerSalesData, statsPeriodStart]
  )

  const statsTotals = useMemo(() => {
    const totalProperties = statsRows.length
    const activeProperties = statsRows.filter((row) => row.filterKey === 'active' || row.statusKey === 'active').length
    const soldProperties = statsRows.filter((row) => row.filterKey === 'sold' || row.statusKey === 'sold').length
    const totalViews = statsRows.reduce((sum, row) => sum + row.viewsValue, 0)
    const totalBookings = [...periodBookingsByProperty.values()].reduce((sum, value) => sum + value, 0)
    const totalRevenue = ownerSalesRows.reduce((sum, row) => sum + (Number(row.sale_amount) || 0), 0)
    const totalLikes = statsRows.reduce((sum, row) => sum + (Number(row.likesCount) || 0), 0)
    const totalBids = statsRows.reduce((sum, row) => sum + (Number(row.bidsCount) || 0), 0)
    const totalSharesSoldAgg = statsRows.reduce(
      (sum, row) => sum + (Number(row.raw?.shares_sold ?? row.shares_sold) || 0),
      0
    )
    const buyerIds = new Set(
      ownerSalesRows
        .map((row) => Number(row.buyer_user_id))
        .filter((id) => Number.isFinite(id) && id > 0)
    )
    return {
      totalProperties,
      activeProperties,
      soldProperties,
      totalViews,
      totalBookings,
      totalSales: ownerSalesRows.length,
      totalRevenue,
      totalLikes,
      totalBids,
      totalSharesSoldAgg,
      interestCount: buyerIds.size,
      convLikesToBidsPct: totalLikes > 0 ? ((totalBids / totalLikes) * 100).toFixed(1) : '0',
      interestPerListing: totalProperties > 0 ? (buyerIds.size / totalProperties).toFixed(1) : '0',
    }
  }, [ownerSalesRows, periodBookingsByProperty, statsRows])

  const statsMetrics = useMemo(
    () => [
      {
        label: t('ownerTest_profileStatViews'),
        value: statsLoading ? '…' : formatNumber(statsTotals.totalViews, intlLocale),
        delta: statsLoading
          ? t('ownerTest_metricLoading')
          : t('ownerTest_profileStatProperties', { count: statsTotals.totalProperties }),
        icon: Eye,
        tone: 'tiffany',
      },
      {
        label: t('ownerTest_profileStatTestDrives'),
        value: statsLoading ? '…' : formatNumber(statsTotals.totalBookings, intlLocale),
        delta: statsLoading ? t('ownerTest_metricLoading') : t('ownerTest_profileStatRequests'),
        icon: CalendarCheck,
        tone: 'orange',
      },
      {
        label: t('ownerTest_profileStatSales'),
        value: statsLoading ? '…' : formatNumber(statsTotals.totalSales, intlLocale),
        delta: statsLoading ? t('ownerTest_metricLoading') : t('ownerTest_profileStatDeals'),
        icon: ShoppingBag,
        tone: 'teal',
      },
      {
        label: t('ownerTest_profileStatRevenue'),
        value: statsLoading ? '…' : formatMoney(statsTotals.totalRevenue, intlLocale),
        delta: statsLoading ? t('ownerTest_metricLoading') : t('ownerTest_profileStatBySales'),
        icon: DollarSign,
        tone: 'green',
      },
    ],
    [intlLocale, statsLoading, statsTotals, t]
  )

  const sortedStatsRows = useMemo(
    () =>
      [...statsRows].sort((a, b) => {
        const scoreA = a.revenueValue * 10 + a.viewsValue + a.testDriveValue * 25
        const scoreB = b.revenueValue * 10 + b.viewsValue + b.testDriveValue * 25
        return scoreB - scoreA
      }),
    [statsRows]
  )

  const excelProperties = useMemo(
    () =>
      statsRows.map((row) => ({
        ...row.raw,
        id: row.id,
        title: row.title,
        location: row.location,
        price: row.priceAmount ?? row.raw?.price ?? 0,
        beds: row.raw?.bedrooms || row.raw?.rooms || 0,
        baths: row.raw?.bathrooms || 0,
        sqft: row.raw?.area || 0,
        status:
          row.filterKey === 'sold'
            ? 'sold'
            : row.filterKey === 'draft'
              ? 'pending'
              : row.filterKey === 'active'
                ? 'active'
                : row.statusKey || 'pending',
        likesCount: row.likesCount ?? row.raw?.likes_count ?? 0,
        bidsCount: row.bidsCount ?? row.raw?.bids_count ?? 0,
        shares_sold: row.raw?.shares_sold ?? 0,
        publishedDate: row.raw?.created_at || row.raw?.updated_at || null,
      })),
    [statsRows]
  )

  const handleExportToExcel = useCallback(async () => {
    const userId = getOwnerPropertiesUserId()
    if (!userId) {
      showNotification(t('ownerTest_profileExportLogin'))
      return
    }
    setExportingExcel(true)
    try {
      const buffer = await exportOwnerAnalyticsExcel({
        formatDateSafe: formatDateForExport,
        properties: excelProperties,
        mySalesData: ownerSalesData,
        stats: {
          totalProperties: statsTotals.totalProperties,
          activeProperties: statsTotals.activeProperties,
          soldProperties: statsTotals.soldProperties,
          totalLikes: statsTotals.totalLikes,
          totalBids: statsTotals.totalBids,
          totalSharesSoldAgg: statsTotals.totalSharesSoldAgg,
          interestCount: statsTotals.interestCount,
          convLikesToBidsPct: statsTotals.convLikesToBidsPct,
          interestPerListing: statsTotals.interestPerListing,
        },
      })
      downloadXlsxBuffer(buffer, `analytics_report_${new Date().toISOString().split('T')[0]}.xlsx`)
    } catch (error) {
      console.error('OwnerProfileTestPage: export excel', error)
      showNotification(t('ownerTest_profileExportError'))
    } finally {
      setExportingExcel(false)
    }
  }, [excelProperties, formatDateForExport, ownerSalesData, statsTotals, t])

  if (loading || !profile) {
    const skeleton = <OwnerProfilePageSkeleton />
    if (isEmbedded) return skeleton
    return (
      <div className="opr">
        {skeleton}
      </div>
    )
  }

  const quickFacts = [
    {
      label: t('ownerTest_profileContactEmail'),
      value: profile.email || t('ownerTest_profileNotSpecifiedF'),
      icon: Mail,
    },
    {
      label: t('ownerTest_profileContactPhone'),
      value: profile.phone || t('ownerTest_profileNotSpecified'),
      icon: Phone,
    },
  ]

  const mainColumn = (
      <div className="opr-body">
        <header className="opr-header opr-desktop-only">
          <h1 className="opr-header__title">{t('ownerProfileTitle')}</h1>
          <div className="opr-header__actions">
            <OwnerSupportButton className="opr-icon-btn" />
            <OwnerNotificationsButton className="opr-icon-btn" badgeClassName="opr-icon-btn__badge" />
            <OwnerTestProfileMenu
              current
              activeTab={activeTab}
              onTabSelect={selectProfileTab}
            />
          </div>
        </header>

        <div className="opr-workspace">
          <div className="opr-mob-pagehead opr-mobile-only">
            <h1 className="opr-mob-pagehead__title">{t('ownerProfileTitle')}</h1>
          </div>
          <div className="opr-content">
            <div className="opr-profile-tabs" role="tablist" aria-label={t('ownerTest_ariaProfileSections')}>
              {profileTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={`opr-profile-tabs__item${activeTab === tab.id ? ' opr-profile-tabs__item--active' : ''}`}
                  onClick={() => selectProfileTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'personal' && (
              <section className="opr-profile-overview" aria-label={t('ownerTest_ariaProfileOverview')}>
                <div className="opr-profile-overview__identity">
                  <ProfileAvatar large />
                  <div className="opr-profile-overview__copy">
                    <span className="opr-profile-overview__eyebrow">{t('ownerDashboard')}</span>
                    <h2 className="opr-profile-overview__name">{fullName}</h2>
                    <div className="opr-profile-overview__meta">
                      <div className="opr-profile-overview__badges">
                        <span className="opr-profile-overview__badge">
                          <ShieldCheck size={15} strokeWidth={2.3} aria-hidden />
                          {roleLabel}
                        </span>
                        <span className="opr-profile-overview__badge opr-profile-overview__badge--soft">
                          <Sparkles size={15} strokeWidth={2.3} aria-hidden />
                          {profile.subscription}
                        </span>
                      </div>
                      {nextSubscriptionPlanId ? (
                        isEmbedded ? (
                          <button
                            type="button"
                            className="opr-profile-overview__upgrade"
                            onClick={handleSubscriptionUpgrade}
                          >
                            <span>{t('ownerTest_profileUpgradeTo', { plan: nextSubscriptionPlanLabel })}</span>
                            <ChevronRight size={16} strokeWidth={2.4} aria-hidden />
                          </button>
                        ) : (
                          <Link
                            to={OWNER_TEST_STANDALONE_HREF_MAP.subscriptions}
                            className="opr-profile-overview__upgrade"
                          >
                            <span>{t('ownerTest_profileUpgradeTo', { plan: nextSubscriptionPlanLabel })}</span>
                            <ChevronRight size={16} strokeWidth={2.4} aria-hidden />
                          </Link>
                        )
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="opr-profile-overview__cards">
                  {quickFacts.map((fact) => {
                    const Icon = fact.icon
                    return (
                      <div key={fact.label} className="opr-profile-overview__card opr-profile-overview__card--fact">
                        <span className="opr-profile-overview__fact-icon" aria-hidden>
                          <Icon size={16} strokeWidth={2.2} />
                        </span>
                        <div className="opr-profile-overview__fact-body">
                          <span className="opr-profile-overview__fact-label">{fact.label}</span>
                          <strong className="opr-profile-overview__fact-value" title={fact.value}>
                            {fact.value}
                          </strong>
                        </div>
                      </div>
                    )
                  })}
                  <div className="opr-profile-overview__card opr-profile-overview__card--completion">
                    <OwnerProfileCompletionBanner
                      variant="card"
                      onMissingFieldClick={focusProfileField}
                    />
                  </div>
                </div>
              </section>
            )}

            <div
              className={[
                'opr-panel',
                activeTab !== 'personal' && 'opr-panel--hidden',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <div className="opr-profile-layout">
                <form className="opr-profile-form" ref={profileFormRef} onSubmit={handleSaveProfile}>
                  <section className="opr-form-section">
                    <div className="opr-form-section__head">
                      <span className="opr-form-section__icon" aria-hidden>
                        <UserRound size={18} strokeWidth={2.3} />
                      </span>
                      <div>
                        <h3 className="opr-form-section__title">{t('ownerTest_profileTabPersonal')}</h3>
                        <p className="opr-form-section__subtitle">{t('profileFieldsModalSubtitle')}</p>
                      </div>
                    </div>
                    <div className="opr-form-row">
                      <label className="opr-field">
                        <span className="opr-field__label">{getOwnerProfileFieldLabel('firstName')}</span>
                        <input
                          id="owner-profile-field-firstName"
                          type="text"
                          className="opr-field__input"
                          value={profile.firstName}
                          onChange={(e) => updateProfile('firstName', e.target.value)}
                        />
                      </label>
                      <label className="opr-field">
                        <span className="opr-field__label">{getOwnerProfileFieldLabel('lastName')}</span>
                        <input
                          id="owner-profile-field-lastName"
                          type="text"
                          className="opr-field__input"
                          value={profile.lastName}
                          onChange={(e) => updateProfile('lastName', e.target.value)}
                        />
                      </label>
                      <div className="opr-field opr-field--country" id="owner-profile-field-country">
                        <span className="opr-field__label">{getOwnerProfileFieldLabel('country')}</span>
                        <CountrySelect
                          value={profile.country}
                          onChange={handleCountryChange}
                          placeholder={t('ownerProfilePlaceholderCountry')}
                        />
                      </div>
                    </div>

                    <div className="opr-form-row">
                      <label className="opr-field opr-field--phone">
                        <span className="opr-field__label">{getOwnerProfileFieldLabel('phone')}</span>
                        <input
                          id="owner-profile-field-phone"
                          type="tel"
                          inputMode="tel"
                          className="opr-field__input"
                          value={profile.phone}
                          onChange={handlePhoneChange}
                          autoComplete="tel"
                          placeholder={
                            profile.country
                              ? t('ownerTest_profilePhonePlaceholder')
                              : t('ownerTest_profilePhoneSelectCountry')
                          }
                        />
                      </label>
                      <label className="opr-field">
                        <span className="opr-field__label">{getOwnerProfileFieldLabel('email')}</span>
                        <input
                          id="owner-profile-field-email"
                          type="email"
                          className="opr-field__input"
                          value={profile.email}
                          onChange={(e) => updateProfile('email', e.target.value)}
                        />
                      </label>
                      <label className="opr-field">
                        <span className="opr-field__label">{getOwnerProfileFieldLabel('address')}</span>
                        <input
                          id="owner-profile-field-address"
                          type="text"
                          className="opr-field__input"
                          value={profile.address}
                          onChange={(e) => updateProfile('address', e.target.value)}
                          autoComplete="street-address"
                        />
                      </label>
                    </div>
                  </section>

                  <section className="opr-form-section">
                    <div className="opr-form-section__head">
                      <span className="opr-form-section__icon" aria-hidden>
                        <FileText size={18} strokeWidth={2.3} />
                      </span>
                      <div>
                        <h3 className="opr-form-section__title">{t('oap_documentsVerificationTitle')}</h3>
                        <p className="opr-form-section__subtitle">{t('oap_documentsVerificationSubtitle')}</p>
                      </div>
                    </div>
                    <div className="opr-form-row">
                      <label className="opr-field">
                        <span className="opr-field__label">{getOwnerProfileFieldLabel('passportNumber')}</span>
                        <input
                          id="owner-profile-field-passportNumber"
                          type="text"
                          className="opr-field__input"
                          value={profile.passportNumber}
                          onChange={(e) => updateProfile('passportNumber', e.target.value)}
                          autoComplete="off"
                        />
                      </label>
                      <label className="opr-field">
                        <span className="opr-field__label">
                          {getOwnerProfileFieldLabel('identificationNumber', profile.country)}
                        </span>
                        <input
                          id="owner-profile-field-identificationNumber"
                          type="text"
                          className="opr-field__input"
                          value={profile.identificationNumber}
                          onChange={handleIdentificationChange}
                          autoComplete="off"
                          placeholder={
                            isSpainCountry(profile.country)
                              ? '12345678Z / X1234567L'
                              : undefined
                          }
                        />
                      </label>
                    </div>
                  </section>

                  <div className="opr-profile-form__save-slot" ref={saveReleaseRef}>
                    <button
                      type="submit"
                      className={[
                        'opr-btn opr-btn--primary opr-profile-form__save',
                        saveReleased && 'opr-profile-form__save--released',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      disabled={saving}
                    >
                      {saving ? t('ownerProfileSaving') : t('ownerTest_profileSaveChanges')}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <div
              className={[
                'opr-panel',
                activeTab !== 'statistics' && 'opr-panel--hidden',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <section className="opr-stats" aria-label={t('ownerTest_ariaStatistics')}>
                <div className="opr-stats__head">
                  <div>
                    <h2 className="opr-stats__title">{t('ownerTest_profileTabStatistics')}</h2>
                    <p className="opr-stats__subtitle">{t('ownerTest_ariaPropertySummary')}</p>
                  </div>
                  <div className="opr-stats__actions">
                    <div className="opr-stats-period" role="group" aria-label={t('ownerTest_ariaPeriod')}>
                      {statsPeriodDefs.map((period) => (
                        <button
                          key={period.id}
                          type="button"
                          className={`opr-stats-period__btn${statsPeriod === period.id ? ' opr-stats-period__btn--active' : ''}`}
                          onClick={() => setStatsPeriod(period.id)}
                        >
                          {period.label}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="opr-stats-export"
                      onClick={handleExportToExcel}
                      disabled={exportingExcel || statsLoading}
                    >
                      <Download size={18} strokeWidth={2.2} aria-hidden />
                      <span>{exportingExcel ? t('ownerTest_profileExporting') : t('ownerTest_profileExportExcel')}</span>
                    </button>
                  </div>
                </div>

                <div className="opr-stats-grid">
                  {statsMetrics.map((metric) => {
                    const Icon = metric.icon
                    return (
                      <article key={metric.label} className="opr-stat-card">
                        <span className={`opr-stat-card__icon opr-stat-card__icon--${metric.tone}`}>
                          <Icon size={18} strokeWidth={2} aria-hidden />
                        </span>
                        <span className="opr-stat-card__label">{metric.label}</span>
                        <span className="opr-stat-card__value">{metric.value}</span>
                        <span className="opr-stat-card__delta">
                          <TrendingUp size={14} strokeWidth={2.2} aria-hidden />
                          {metric.delta}
                        </span>
                      </article>
                    )
                  })}
                </div>

                <div className="opr-stats-table-wrap">
                  <h3 className="opr-stats-table__title">{t('ownerTest_propertiesTabAll')}</h3>
                  {statsError ? <p className="opr-stats__message">{statsError}</p> : null}
                  <div className="opr-stats-table-scroll">
                    <table className="opr-stats-table">
                    <thead>
                      <tr>
                        <th>{t('oap_wizardStepObject')}</th>
                        <th>{t('ownerTest_profileStatViews')}</th>
                        <th>{t('ownerTest_profileStatTestDrives')}</th>
                        <th>{t('bidHistoryCurrentMaxBid')}</th>
                        <th>{t('ownerTest_profileStatSales')}</th>
                        <th>{t('ownerTest_profileStatRevenue')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statsLoading ? (
                        <tr>
                          <td colSpan={6}>{t('ownerTest_metricLoading')}…</td>
                        </tr>
                      ) : sortedStatsRows.length === 0 ? (
                        <tr>
                          <td colSpan={6}>{t('ownerTest_propertiesNoItems')}</td>
                        </tr>
                      ) : (
                        sortedStatsRows.map((row) => (
                          <tr key={row.analyticsKey}>
                            <td>
                              <span className="opr-stats-table__object">{row.title}</span>
                              <span className="opr-stats-table__location">{row.location}</span>
                            </td>
                            <td>{formatNumber(row.viewsValue, intlLocale)}</td>
                            <td>{formatNumber(row.testDriveValue, intlLocale)}</td>
                            <td>{row.currentBidValue > 0 ? formatMoney(row.currentBidValue, intlLocale, row.currentBidCurrency) : '—'}</td>
                            <td>{formatNumber(row.salesValue, intlLocale)}</td>
                            <td>{formatMoney(row.revenueValue, intlLocale, row.revenueCurrency)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  </div>
                </div>
              </section>
            </div>

            <div
              className={[
                'opr-panel',
                activeTab !== 'settings' && 'opr-panel--hidden',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <section className="opr-app-settings" aria-label={t('ownerTest_ariaAppSettings')}>
                <div className="opr-app-settings__card">
                  <h2 className="opr-app-settings__title">{t('ownerSettingsTitle')}</h2>
                  <div className="opr-app-settings__selects">
                    <label className="opr-field">
                      <span className="opr-field__label">{t('ownerSettingsChangeLanguage')}</span>
                      <select
                        className="opr-field__input opr-field__select"
                        value={appPreferences.language}
                        onChange={(e) =>
                          setAppPreferences((prev) => ({ ...prev, language: e.target.value }))
                        }
                      >
                        <option value="ru">{t('ownerSettingsLanguageRu')}</option>
                        <option value="en">{t('ownerSettingsLanguageEn')}</option>
                      </select>
                    </label>
                    <label className="opr-field">
                      <span className="opr-field__label">{t('catalogFilterCurrency')}</span>
                      <select
                        className="opr-field__input opr-field__select"
                        value={appPreferences.currency}
                        onChange={(e) =>
                          setAppPreferences((prev) => ({ ...prev, currency: e.target.value }))
                        }
                      >
                        <option value="usd">USD ($)</option>
                        <option value="eur">EUR (€)</option>
                        <option value="aed">AED (د.إ)</option>
                      </select>
                    </label>
                    <label className="opr-field">
                      <span className="opr-field__label">{t('ownerTest_ariaPeriod')}</span>
                      <select
                        className="opr-field__input opr-field__select"
                        value={appPreferences.timezone}
                        onChange={(e) =>
                          setAppPreferences((prev) => ({ ...prev, timezone: e.target.value }))
                        }
                      >
                        <option value="minsk">Europe/Minsk (UTC+3)</option>
                        <option value="moscow">Europe/Moscow (UTC+3)</option>
                        <option value="dubai">Asia/Dubai (UTC+4)</option>
                      </select>
                    </label>
                  </div>
                </div>

              </section>
              <button type="button" className="opr-btn opr-btn--primary opr-profile-form__save opr-profile-form__save--settings">
                {t('ownerTest_profileSaveChanges')}
              </button>
            </div>
          </div>
        </div>
      </div>
  )

  if (isEmbedded) return mainColumn

  return (
    <div className={`opr${menuOpen ? ' opr--menu-open' : ''}`}>
      <header className="opr-mob-topbar opr-mobile-only opr-mobile-only--profile-hidden" aria-label={t('ownerTest_ariaMobileHeader')}>
        <div className="opr-mob-topbar__slot opr-mob-topbar__slot--left">
          <button
            type="button"
            className="opr-mob-topbar__menu"
            aria-label={t('ownerTest_ariaOpenMenu')}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={22} strokeWidth={2} />
          </button>
        </div>
        <div className="opr-mob-topbar__brand">
          <LogoMark />
          <span className="opr-logo__text">{t('ownerTest_brandName')}</span>
        </div>
        <div className="opr-mob-topbar__slot opr-mob-topbar__slot--right">
          <OwnerSupportButton className="opr-mob-topbar__bell" iconSize={22} />
          <OwnerNotificationsButton
            className="opr-mob-topbar__bell"
            badgeClassName="opr-icon-btn__badge"
            iconSize={22}
          />
        </div>
      </header>

      <header className="opr-mob-profile-head opr-mobile-only" aria-label={t('ownerTest_ariaProfile')}>
        {isEmbedded ? (
          <button
            type="button"
            className="opr-mob-profile-head__close"
            aria-label={t('ownerTest_ariaClose')}
            onClick={() => goTo(OWNER_VIEWS.HOME)}
          >
            <X size={22} strokeWidth={2} />
          </button>
        ) : (
          <Link to="/main-owner-test" className="opr-mob-profile-head__close" aria-label={t('ownerTest_ariaClose')}>
            <X size={22} strokeWidth={2} />
          </Link>
        )}
        <h1 className="opr-mob-profile-head__title">{t('ownerProfileTitle')}</h1>
        <span className="opr-mob-profile-head__spacer" aria-hidden />
      </header>

      <div
        className="opr-drawer-backdrop opr-mobile-only"
        aria-hidden={!menuOpen}
        onClick={closeMenu}
      />
      <aside
        className={`opr-drawer opr-mobile-only${menuOpen ? ' opr-drawer--open' : ''}`}
        aria-label={t('ownerTest_ariaCabinetMenu')}
        aria-hidden={!menuOpen}
      >
        <div className="opr-drawer__head">
          <div className="opr-mob-topbar__brand">
            <LogoMark />
            <span className="opr-logo__text">{t('ownerTest_brandName')}</span>
          </div>
          <button type="button" className="opr-drawer__close" aria-label={t('ownerTest_ariaCloseMenu')} onClick={closeMenu}>
            <X size={22} />
          </button>
        </div>
        <div className="opr-sidebar__divider opr-sidebar__divider--drawer" aria-hidden />
        <nav className="opr-nav opr-nav--drawer">{navItems.map(renderNavItem)}</nav>
      </aside>

      <aside className="opr-sidebar opr-desktop-only">
        <div className="opr-sidebar__brand">
          <LogoMark />
          <span className="opr-logo__text">{t('ownerTest_brandName')}</span>
        </div>
        <div className="opr-sidebar__divider" aria-hidden />
        <nav className="opr-nav" aria-label={t('ownerTest_ariaSellerCabinet')}>
          {navItems.map(renderNavItem)}
        </nav>
        <div className="opr-sidebar-promo">
          <p className="opr-sidebar-promo__title">{t('heroPitchBecomeBuyerCta')}</p>
          <p className="opr-sidebar-promo__text">{t('heroPitchBecomeBuyerBody')}</p>
          <RoleSwitchButton targetRole="buyer" className="opr-btn opr-btn--primary opr-btn--sm">
            {t('heroPitchBecomeBuyerCta')}
          </RoleSwitchButton>
          <img
            className="opr-sidebar-promo__img"
            src={OPR_IMAGES.promoSidebarBuyer}
            alt=""
            loading="lazy"
          />
        </div>
      </aside>

      {mainColumn}
    </div>
  )
}

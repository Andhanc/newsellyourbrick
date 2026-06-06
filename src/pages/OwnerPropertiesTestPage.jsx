import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Building2,
  CalendarCheck,
  ShoppingBag,
  Car,
  CreditCard,
  BarChart3,
  MessageSquare,
  Settings,
  ChevronDown,
  Search,
  SlidersHorizontal,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Eye,
  Home,
  Plus,
  Upload,
  ClipboardList,
  Briefcase,
  Clock,
} from 'lucide-react'
import {
  OWNER_LISTING_TYPE_LABELS,
  getOwnerPropertyAmount,
  getOwnerPropertyAnalyticsPath,
} from './ownerPropertiesTestData'
import {
  CLERK_DB_USER_SYNCED,
  countOwnerPropertiesByTab,
  fetchOwnerProperties,
  filterOwnerProperties,
  getOwnerPropertiesUserId,
} from '../utils/ownerPropertiesList'
import { fetchOwnerTestDriveBookings } from '../utils/ownerTestDriveList'
import { getCurrencySymbol } from '../utils/currency'
import OwnerTestProfileMenu from '../components/OwnerTestProfileMenu'
import OwnerNotificationsButton from '../components/OwnerNotificationsButton'
import FileUploadModal from '../components/FileUploadModal'
import { OwnerAdStack } from '../components/OwnerAds'
import { useOwnerTestProfile } from '../context/OwnerTestProfileContext'
import { OWNER_VIEWS } from '../context/OwnerTestNavigationContext'
import { useOwnerTestEmbeddedNav } from '../hooks/useOwnerTestEmbeddedNav'
import './OwnerPropertiesTestPage.css'
import './OwnerPropertiesTestPage.mobile.css'

const MOT_TIFFANY = '#0abab5'

const NAV_ITEMS = [
  { id: 'home', label: 'Главная', icon: LayoutDashboard, href: '/main-owner-test' },
  { id: 'properties', label: 'Мои объекты', icon: Building2, active: true },
  { id: 'bookings', label: 'Брони', icon: CalendarCheck },
  { id: 'sales', label: 'Продажи', icon: ShoppingBag, href: '/owner-sales-test' },
  { id: 'testdrive', label: 'Тест-драйв', icon: Car, href: '/owner-test-drive' },
  { id: 'subscriptions', label: 'Подписки', icon: CreditCard, href: '/owner-subscriptions-test' },
  { id: 'analytics', label: 'Аналитика', icon: BarChart3 },
  { id: 'messages', label: 'Сообщения', icon: MessageSquare, badge: 3 },
  { id: 'settings', label: 'Настройки', icon: Settings, href: '/owner-profile-test' },
]

const PAGE_SIZE = 10

const FILTER_TAB_DEFS = [
  { id: 'all', label: 'Все объекты', shortLabel: 'Все' },
  { id: 'active', label: 'Активные', shortLabel: 'Активные' },
  { id: 'booked', label: 'Забронированные', shortLabel: 'Забронированные' },
  { id: 'sold', label: 'Проданные', shortLabel: 'Проданные' },
  { id: 'draft', label: 'Черновики', shortLabel: 'Черновики' },
]

const TAB_ITEMS = [
  { id: 'home', label: 'Главная', icon: Home, href: '/main-owner-test' },
  { id: 'properties', label: 'Объекты', icon: Briefcase, active: true },
  { id: 'fab', fab: true },
  { id: 'bookings', label: 'Брони', icon: ClipboardList },
  { id: 'more', label: 'Ещё', icon: SlidersHorizontal },
]

const ANALYTICS_PERIODS = [
  { id: '7d', label: 'Последние 7 дней' },
  { id: '30d', label: 'Последние 30 дней' },
  { id: '90d', label: 'Последние 90 дней' },
]

const LISTING_TYPE_FILTER_OPTIONS = [
  { id: 'auction', label: 'Аукцион' },
  { id: 'buy_now', label: 'Купить сейчас' },
  { id: 'shares', label: 'Доли' },
  { id: 'debts', label: 'Долги' },
]

const SORT_FILTER_OPTIONS = [
  { id: 'date_desc', label: 'Сначала новые' },
  { id: 'views_desc', label: 'Больше просмотров' },
  { id: 'price_desc', label: 'Дороже' },
  { id: 'price_asc', label: 'Дешевле' },
]

const DEFAULT_PROPERTY_FILTERS = {
  listingTypes: [],
  sortBy: 'date_desc',
}

function isPropertyFiltersActive(filters) {
  return filters.listingTypes.length > 0 || filters.sortBy !== DEFAULT_PROPERTY_FILTERS.sortBy
}

function formatQuickNumber(value) {
  const num = Number(value)
  if (!Number.isFinite(num) || num <= 0) return '0'
  return num.toLocaleString('ru-RU', { maximumFractionDigits: 0 })
}

function formatQuickMoney(value, currency = 'USD') {
  const num = Number(value)
  if (!Number.isFinite(num) || num <= 0) return `${getCurrencySymbol(currency)}0`
  return `${getCurrencySymbol(currency)}${num.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}`
}

function getTestDrivePaymentAmount(row) {
  const raw = row?.raw || {}

  const insurance = Number(raw.insurance_deposit_amount ?? raw.insurance_deposit)
  if (Number.isFinite(insurance) && insurance > 0) return insurance

  const majorCandidates = [
    raw.total_major,
    raw.total_amount,
    raw.paid_amount,
    raw.payment_amount,
  ]

  for (const candidate of majorCandidates) {
    const amount = Number(candidate)
    if (Number.isFinite(amount) && amount > 0) return amount
  }

  const centsCandidates = [
    raw.paid_amount_cents,
    raw.amount_cents,
    raw.total_cents,
    raw.payment_amount_cents,
  ]

  for (const candidate of centsCandidates) {
    const amount = Number(candidate)
    if (Number.isFinite(amount) && amount > 0) return amount / 100
  }

  return 0
}

function getTestDrivePaymentCurrency(row) {
  return String(row?.raw?.paid_currency || row?.raw?.currency || 'USD').toUpperCase()
}

function QuickAnalyticsPeriodSelect({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    const handlePointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const selected = ANALYTICS_PERIODS.find((period) => period.id === value) ?? ANALYTICS_PERIODS[1]

  return (
    <div className="op-period-select" ref={rootRef}>
      <button
        type="button"
        className="op-select-pill op-period-select__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span>{selected.label}</span>
        <ChevronDown
          size={14}
          strokeWidth={2.2}
          aria-hidden
          className={`op-period-select__chevron${open ? ' op-period-select__chevron--open' : ''}`}
        />
      </button>
      {open ? (
        <ul className="op-period-select__menu" role="listbox" aria-label="Период аналитики">
          {ANALYTICS_PERIODS.map((period) => (
            <li key={period.id} role="none">
              <button
                type="button"
                role="option"
                aria-selected={period.id === value}
                className={`op-period-select__option${period.id === value ? ' op-period-select__option--active' : ''}`}
                onClick={() => {
                  onChange(period.id)
                  setOpen(false)
                }}
              >
                {period.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function PropertiesFilterMenu({ filters, onChange }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    const handlePointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const active = isPropertyFiltersActive(filters)

  const toggleListingType = (typeId) => {
    onChange({
      ...filters,
      listingTypes: filters.listingTypes.includes(typeId)
        ? filters.listingTypes.filter((item) => item !== typeId)
        : [...filters.listingTypes, typeId],
    })
  }

  const resetFilters = () => {
    onChange(DEFAULT_PROPERTY_FILTERS)
    setOpen(false)
  }

  return (
    <div className="op-filter-menu" ref={rootRef}>
      <button
        type="button"
        className={`op-filter-btn${active ? ' op-filter-btn--active' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <SlidersHorizontal size={18} strokeWidth={2} aria-hidden />
        Фильтр
        {active ? <span className="op-filter-btn__badge" aria-hidden /> : null}
      </button>
      {open ? (
        <div className="op-filter-menu__panel" role="dialog" aria-label="Фильтры объектов">
          <div className="op-filter-menu__section">
            <p className="op-filter-menu__title">Тип размещения</p>
            <div className="op-filter-menu__chips">
              {LISTING_TYPE_FILTER_OPTIONS.map((option) => {
                const selected = filters.listingTypes.includes(option.id)
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={`op-filter-menu__chip${selected ? ' op-filter-menu__chip--active' : ''}`}
                    aria-pressed={selected}
                    onClick={() => toggleListingType(option.id)}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="op-filter-menu__section">
            <p className="op-filter-menu__title">Сортировка</p>
            <div className="op-filter-menu__sort">
              {SORT_FILTER_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`op-filter-menu__sort-item${filters.sortBy === option.id ? ' op-filter-menu__sort-item--active' : ''}`}
                  aria-pressed={filters.sortBy === option.id}
                  onClick={() => onChange({ ...filters, sortBy: option.id })}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="op-filter-menu__actions">
            <button type="button" className="op-filter-menu__reset" onClick={resetFilters}>
              Сбросить
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function MiniSpark({ variant }) {
  const colors = { tiffany: MOT_TIFFANY, green: '#22c55e', orange: '#f59e0b' }
  const stroke = colors[variant] || MOT_TIFFANY
  return (
    <svg className="op-mini-spark" viewBox="0 0 64 28" aria-hidden>
      <path
        d="M2 20 C12 14, 18 18, 28 12 S42 8, 52 10 S58 6, 62 8"
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function LogoMark({ className = '' }) {
  return (
    <svg className={`op-logo__mark ${className}`.trim()} viewBox="0 0 40 40" aria-hidden>
      <defs>
        <linearGradient id="op-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#53d8d3" />
          <stop offset="100%" stopColor="#089a95" />
        </linearGradient>
      </defs>
      <path d="M20 2L35 11v18L20 38 5 29V11L20 2z" fill="url(#op-logo-grad)" />
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

function DeltaText({ value, up }) {
  if (!value) return null
  const cls = up === false ? 'op-delta op-delta--down' : up === true ? 'op-delta op-delta--up' : 'op-delta op-delta--muted'
  return <span className={cls}>{value}</span>
}

function ListingTypeBadge({ type }) {
  const label = OWNER_LISTING_TYPE_LABELS[type] || type
  return <span className={`op-type op-type--${type}`}>{label}</span>
}

function AmountCell({ row }) {
  const { label, value } = getOwnerPropertyAmount(row)
  return (
    <div className="op-amount-cell">
      <span className="op-amount-cell__label">{label}</span>
      <span className="op-amount-cell__value">{value}</span>
    </div>
  )
}

function getObjectTimerState(endTime, now = Date.now()) {
  if (!endTime) return null
  const endMs = new Date(endTime).getTime()
  if (!Number.isFinite(endMs)) return null

  const remainingMs = endMs - now
  if (remainingMs <= 0) {
    return { expired: true, label: 'Завершён', caption: 'Таймер' }
  }

  const totalSeconds = Math.floor(remainingMs / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const two = (value) => String(value).padStart(2, '0')

  return {
    expired: false,
    critical: days === 0 && hours < 1,
    caption: 'Осталось',
    label: days > 0
      ? `${days}д ${two(hours)}:${two(minutes)}:${two(seconds)}`
      : `${two(hours)}:${two(minutes)}:${two(seconds)}`,
  }
}

function ObjectTimerBadge({ endTime, now }) {
  const timer = getObjectTimerState(endTime, now)
  if (!timer) return <span className="op-object-timer op-object-timer--empty">—</span>

  return (
    <span
      className={[
        'op-object-timer',
        timer.expired && 'op-object-timer--expired',
        timer.critical && 'op-object-timer--critical',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="op-object-timer__icon" aria-hidden>
        <Clock size={13} strokeWidth={2.4} />
      </span>
      <span className="op-object-timer__content">
        <span className="op-object-timer__caption">{timer.caption}</span>
        <span className="op-object-timer__value">{timer.label}</span>
      </span>
    </span>
  )
}

function getVisiblePages(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => ({ type: 'page', value: index + 1 }))
  }

  const items = [{ type: 'page', value: 1 }]
  if (currentPage > 3) items.push({ type: 'ellipsis' })

  const start = Math.max(2, currentPage - 1)
  const end = Math.min(totalPages - 1, currentPage + 1)
  for (let page = start; page <= end; page += 1) {
    items.push({ type: 'page', value: page })
  }

  if (currentPage < totalPages - 2) items.push({ type: 'ellipsis' })
  if (totalPages > 1) items.push({ type: 'page', value: totalPages })
  return items
}

function PropertiesPagination({ currentPage, totalPages, totalItems, onPageChange }) {
  const pageStart = totalItems === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const pageEnd = Math.min(currentPage * PAGE_SIZE, totalItems)
  const pageItems = getVisiblePages(currentPage, totalPages)

  return (
    <footer className="op-pagination">
      <p className="op-pagination__info">
        {totalItems === 0
          ? 'Нет объектов'
          : `Показано ${pageStart}–${pageEnd} из ${totalItems} объектов`}
      </p>
      {totalPages > 1 && (
        <div className="op-pagination__controls">
          <button
            type="button"
            className="op-page-btn"
            aria-label="Предыдущая страница"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
          >
            <ChevronLeft size={18} />
          </button>
          {pageItems.map((item, index) =>
            item.type === 'ellipsis' ? (
              <span key={`ellipsis-${index}`} className="op-page-ellipsis" aria-hidden>
                …
              </span>
            ) : (
              <button
                key={item.value}
                type="button"
                className={`op-page-btn${item.value === currentPage ? ' op-page-btn--active' : ''}`}
                aria-label={`Страница ${item.value}`}
                aria-current={item.value === currentPage ? 'page' : undefined}
                onClick={() => onPageChange(item.value)}
              >
                {item.value}
              </button>
            )
          )}
          <button
            type="button"
            className="op-page-btn"
            aria-label="Следующая страница"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </footer>
  )
}

export default function OwnerPropertiesTestPage() {
  const { fullName, roleLabel } = useOwnerTestProfile()
  const { isEmbedded, goTo } = useOwnerTestEmbeddedNav()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('all')
  const [menuOpen, setMenuOpen] = useState(false)
  const [properties, setProperties] = useState([])
  const [testDriveRows, setTestDriveRows] = useState([])
  const [propertiesLoading, setPropertiesLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [analyticsPeriod, setAnalyticsPeriod] = useState('30d')
  const [propertyFilters, setPropertyFilters] = useState(DEFAULT_PROPERTY_FILTERS)
  const [timerNow, setTimerNow] = useState(() => Date.now())
  const [showFileUploadModal, setShowFileUploadModal] = useState(false)

  const closeMenu = useCallback(() => setMenuOpen(false), [])

  const loadProperties = useCallback(async () => {
    const userId = getOwnerPropertiesUserId()
    if (!userId) {
      setProperties([])
      setTestDriveRows([])
      setPropertiesLoading(false)
      return
    }

    setPropertiesLoading(true)
    try {
      const [rows, testDrives] = await Promise.all([
        fetchOwnerProperties(userId),
        fetchOwnerTestDriveBookings(userId),
      ])
      setProperties(rows)
      setTestDriveRows(testDrives)
    } catch (error) {
      console.warn('OwnerPropertiesTestPage: не удалось загрузить объекты', error)
      setProperties([])
      setTestDriveRows([])
    } finally {
      setPropertiesLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProperties()
  }, [loadProperties])

  useEffect(() => {
    const onUserSynced = () => loadProperties()
    const onPropertiesUpdate = () => loadProperties()
    window.addEventListener(CLERK_DB_USER_SYNCED, onUserSynced)
    window.addEventListener('owner-properties-update', onPropertiesUpdate)
    return () => {
      window.removeEventListener(CLERK_DB_USER_SYNCED, onUserSynced)
      window.removeEventListener('owner-properties-update', onPropertiesUpdate)
    }
  }, [loadProperties])

  const tabCounts = useMemo(() => countOwnerPropertiesByTab(properties), [properties])

  const quickAnalytics = useMemo(() => {
    const currency =
      properties.find((row) => Number(row.bidsAmountTotal) > 0 && row.currency)?.currency ||
      properties.find((row) => Number(row.currentBidAmount) > 0 && row.currency)?.currency ||
      properties.find((row) => row.currency)?.currency ||
      'USD'

    const totals = properties.reduce(
      (acc, row) => {
        const bidSum = Number(row.bidsAmountTotal)
        const currentBid = Number(row.currentBidAmount)
        acc.views += Number(row.viewsCount) || 0
        acc.bids += Number.isFinite(bidSum) && bidSum > 0 ? bidSum : Number.isFinite(currentBid) ? currentBid : 0
        return acc
      },
      { views: 0, bids: 0 }
    )
    const testDriveTotal = testDriveRows.reduce(
      (sum, row) => sum + getTestDrivePaymentAmount(row),
      0
    )
    const paidTestDriveRow = testDriveRows.find((row) => getTestDrivePaymentAmount(row) > 0)
    const testDriveCurrency = paidTestDriveRow ? getTestDrivePaymentCurrency(paidTestDriveRow) : currency

    return [
      { label: 'Все просмотры', value: formatQuickNumber(totals.views), delta: '', up: null, spark: 'tiffany' },
      { label: 'Сумма всех ставок', value: formatQuickMoney(totals.bids, currency), delta: '', up: null, spark: 'green' },
      {
        label: 'Сумма всех тест-драйвов',
        value: `${formatQuickNumber(testDriveRows.length)} · ${formatQuickMoney(testDriveTotal, testDriveCurrency)}`,
        delta: '',
        up: null,
        spark: 'orange',
      },
    ]
  }, [properties, testDriveRows])

  const filterTabs = useMemo(
    () => FILTER_TAB_DEFS.map((tab) => ({ ...tab, count: tabCounts[tab.id] ?? 0 })),
    [tabCounts]
  )

  const mobSummaryStats = useMemo(
    () => [
      { label: 'Всего', value: String(tabCounts.all), delta: '', up: null },
      { label: 'Активные', value: String(tabCounts.active), delta: '', up: null },
      { label: 'Забронированные', value: String(tabCounts.booked), delta: '', up: null },
      { label: 'Проданные', value: String(tabCounts.sold), delta: '', up: null },
      { label: 'Черновики', value: String(tabCounts.draft), delta: '', up: null },
    ],
    [tabCounts]
  )

  const visibleProperties = useMemo(
    () =>
      filterOwnerProperties(properties, {
        tab: activeTab,
        query: searchQuery,
        listingTypes: propertyFilters.listingTypes,
        sortBy: propertyFilters.sortBy,
      }),
    [properties, activeTab, searchQuery, propertyFilters]
  )

  const totalPages = Math.max(1, Math.ceil(visibleProperties.length / PAGE_SIZE))

  const safeCurrentPage = Math.min(currentPage, totalPages)

  const paginatedProperties = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE
    return visibleProperties.slice(start, start + PAGE_SIZE)
  }, [visibleProperties, safeCurrentPage])

  const hasVisibleTimers = useMemo(
    () => paginatedProperties.some((row) => row.auctionEndTime),
    [paginatedProperties]
  )

  useEffect(() => {
    if (!hasVisibleTimers) return undefined
    setTimerNow(Date.now())
    const timer = window.setInterval(() => setTimerNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [hasVisibleTimers])

  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, searchQuery, propertyFilters])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const openPropertyAnalytics = useCallback(
    (id) => {
      if (isEmbedded && goTo) {
        goTo(OWNER_VIEWS.PROPERTY_ANALYTICS, { propertyId: id })
      } else {
        navigate(getOwnerPropertyAnalyticsPath(id))
      }
    },
    [isEmbedded, goTo, navigate]
  )

  const renderNavItem = useCallback(
    ({ id, label, icon: Icon, active, badge, href }) => {
      const className = `op-nav__item${active ? ' op-nav__item--active' : ''}`
      const inner = (
        <>
          <Icon size={20} strokeWidth={active ? 2.25 : 2} aria-hidden />
          <span>{label}</span>
          {badge != null && <span className="op-nav__badge">{badge}</span>}
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

  useEffect(() => {
    if (isEmbedded) return undefined
    document.documentElement.classList.add('op-page-active')
    return () => document.documentElement.classList.remove('op-page-active')
  }, [isEmbedded])

  useEffect(() => {
    if (!menuOpen) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [menuOpen])

  const mainColumn = (
    <>
      <div className="op-body">
        <header className="op-header op-desktop-only">
          <h1 className="op-header__title">Мои объекты</h1>
          <div className="op-header__actions">
            <button
              type="button"
              className="op-btn op-btn--file op-header__file-btn"
              onClick={() => setShowFileUploadModal(true)}
            >
              <Upload size={18} strokeWidth={2.25} aria-hidden />
              Добавить через файл
            </button>
            {isEmbedded ? (
              <button
                type="button"
                className="op-btn op-btn--primary op-header__add-btn"
                onClick={() => goTo(OWNER_VIEWS.ADD_PROPERTY)}
              >
                <Plus size={18} strokeWidth={2.5} aria-hidden />
                Добавить объект
              </button>
            ) : (
              <Link to="/owner-add-property-test" className="op-btn op-btn--primary op-header__add-btn">
                <Plus size={18} strokeWidth={2.5} aria-hidden />
                Добавить объект
              </Link>
            )}
            <OwnerNotificationsButton className="op-icon-btn" badgeClassName="op-icon-btn__badge" />
            <OwnerTestProfileMenu />
          </div>
        </header>

        <div className="op-workspace">
          <div className="op-mob-pagehead op-mobile-only">
            <h1 className="op-mob-pagehead__title">Мои объекты</h1>
            <div className="op-mob-pagehead__actions">
              <button
                type="button"
                className="op-mob-file-btn"
                aria-label="Добавить через файл"
                onClick={() => setShowFileUploadModal(true)}
              >
                <Upload size={21} strokeWidth={2.4} aria-hidden />
              </button>
              {isEmbedded ? (
                <button
                  type="button"
                  className="op-mob-add-btn"
                  aria-label="Добавить объект"
                  onClick={() => goTo(OWNER_VIEWS.ADD_PROPERTY)}
                >
                  <Plus size={22} strokeWidth={2.5} aria-hidden />
                </button>
              ) : (
                <Link to="/owner-add-property-test" className="op-mob-add-btn" aria-label="Добавить объект">
                  <Plus size={22} strokeWidth={2.5} aria-hidden />
                </Link>
              )}
            </div>
          </div>

          <section className="op-mob-metrics op-mobile-only" aria-label="Сводка по объектам">
            {mobSummaryStats.map((stat) => (
              <article key={stat.label} className="op-mob-metric">
                <span className="op-mob-metric__label">{stat.label}</span>
                <span className="op-mob-metric__value">{stat.value}</span>
                <DeltaText value={stat.delta} up={stat.up} />
              </article>
            ))}
          </section>

          <div className="op-main-panel">
            <div className="op-tabs" role="tablist">
              {filterTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={`op-tabs__item${activeTab === tab.id ? ' op-tabs__item--active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span className="op-tabs__label op-tabs__label--full">
                    {tab.label} ({tab.count})
                  </span>
                  <span className="op-tabs__label op-tabs__label--short">
                    {tab.shortLabel} ({tab.count})
                  </span>
                </button>
              ))}
            </div>

            <div className="op-toolbar">
              <label className="op-search">
                <Search size={18} strokeWidth={2} aria-hidden />
                <input
                  type="search"
                  className="op-search__input"
                  placeholder="Поиск"
                  aria-label="Поиск по объектам"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </label>
              <PropertiesFilterMenu filters={propertyFilters} onChange={setPropertyFilters} />
            </div>

            <div className="op-table-card">
              {propertiesLoading ? (
                <div className="op-table-state">Загрузка объектов…</div>
              ) : visibleProperties.length === 0 ? (
                <div className="op-table-state">
                  {properties.length === 0
                    ? 'У вас пока нет объектов. Добавьте первый объект.'
                    : 'Нет объектов по выбранному фильтру.'}
                </div>
              ) : (
              <>
              <div className="op-table-wrap op-desktop-only">
                <table className="op-table">
                  <thead>
                    <tr>
                      <th>Объект</th>
                      <th>Статус</th>
                      <th>Тип</th>
                      <th>Таймер</th>
                      <th>Просмотры</th>
                      <th>Стоимость</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedProperties.map((row) => (
                      <tr
                        key={row.id}
                        className="op-table__row--clickable"
                        onClick={() => openPropertyAnalytics(row.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            openPropertyAnalytics(row.id)
                          }
                        }}
                        tabIndex={0}
                        role="link"
                        aria-label={`Аналитика: ${row.title}`}
                      >
                        <td>
                          <div className="op-object-cell">
                            <img src={row.image} alt="" className="op-object-cell__thumb" loading="lazy" />
                            <div className="op-object-cell__text">
                              <p className="op-object-cell__title">{row.title}</p>
                              <p className="op-object-cell__meta">{row.location}</p>
                              <p className="op-object-cell__id">{row.displayId || row.id}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`op-status op-status--${row.statusKey}`}>{row.status}</span>
                        </td>
                        <td>
                          <ListingTypeBadge type={row.listingType} />
                        </td>
                        <td>
                          <ObjectTimerBadge endTime={row.auctionEndTime} now={timerNow} />
                        </td>
                        <td>
                          <div className="op-stat-cell">
                            <span className="op-stat-cell__value">{row.views}</span>
                            <DeltaText value={row.viewsDelta} up={row.viewsUp} />
                          </div>
                        </td>
                        <td>
                          <AmountCell row={row} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="op-mob-list op-mobile-only">
                {paginatedProperties.map((row) => (
                  <li
                    key={row.id}
                    className="op-mob-list__item op-mob-list__item--clickable"
                    onClick={() => openPropertyAnalytics(row.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        openPropertyAnalytics(row.id)
                      }
                    }}
                    tabIndex={0}
                    role="link"
                    aria-label={`Аналитика: ${row.title}`}
                  >
                    <img src={row.image} alt="" className="op-mob-list__thumb" loading="lazy" />
                    <div className="op-mob-list__body">
                      <div className="op-mob-list__head">
                        <p className="op-mob-list__title">{row.title}</p>
                        <span className={`op-status op-status--${row.statusKey}`}>{row.status}</span>
                      </div>
                      <p className="op-mob-list__location">{row.location}</p>
                      <div className="op-mob-list__meta-row">
                        <ListingTypeBadge type={row.listingType} />
                        {row.auctionEndTime ? (
                          <ObjectTimerBadge endTime={row.auctionEndTime} now={timerNow} />
                        ) : null}
                      </div>
                      <div className="op-mob-list__amount">
                        <AmountCell row={row} />
                      </div>
                      <div className="op-mob-list__stats">
                        <span className="op-mob-list__stat">
                          <Eye size={14} strokeWidth={2} aria-hidden />
                          {row.views}
                          <DeltaText value={row.viewsDelta} up={row.viewsUp} />
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <PropertiesPagination
                currentPage={safeCurrentPage}
                totalPages={totalPages}
                totalItems={visibleProperties.length}
                onPageChange={setCurrentPage}
              />
              </>
              )}
            </div>
          </div>

          <aside className="op-rail op-desktop-only">
            <section className="op-rail-card op-quick-analytics">
              <div className="op-rail-card__head">
                <h2>Быстрая аналитика</h2>
                <QuickAnalyticsPeriodSelect value={analyticsPeriod} onChange={setAnalyticsPeriod} />
              </div>
              <ul className="op-quick-list">
                {quickAnalytics.map((item) => (
                  <li key={item.label}>
                    <div className="op-quick-list__text">
                      <span className="op-quick-list__label">{item.label}</span>
                      <span className="op-quick-list__value">{item.value}</span>
                      <DeltaText value={item.delta} up={item.up} />
                    </div>
                    <MiniSpark variant={item.spark} />
                  </li>
                ))}
              </ul>
            </section>

            <OwnerAdStack cards={['premium', 'fastSales']} className="op-owner-ads" />
          </aside>
        </div>
      </div>
      <FileUploadModal
        isOpen={showFileUploadModal}
        onClose={() => setShowFileUploadModal(false)}
        userId={getOwnerPropertiesUserId()}
        onSuccess={loadProperties}
      />
    </>
  )

  if (isEmbedded) return mainColumn

  return (
    <div className={`op${menuOpen ? ' op--menu-open' : ''}`}>
      <header className="op-mob-topbar op-mobile-only" aria-label="Мобильная шапка">
        <div className="op-mob-topbar__slot op-mob-topbar__slot--left">
          <button
            type="button"
            className="op-mob-topbar__menu"
            aria-label="Открыть меню"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={22} strokeWidth={2} />
          </button>
        </div>
        <div className="op-mob-topbar__brand">
          <LogoMark />
          <span className="op-logo__text">SellYourBrick</span>
        </div>
        <div className="op-mob-topbar__slot op-mob-topbar__slot--right">
          <OwnerNotificationsButton
            className="op-mob-topbar__bell"
            badgeClassName="op-icon-btn__badge"
            iconSize={22}
          />
        </div>
      </header>

      <div
        className="op-drawer-backdrop op-mobile-only"
        aria-hidden={!menuOpen}
        onClick={closeMenu}
      />
      <aside
        className={`op-drawer op-mobile-only${menuOpen ? ' op-drawer--open' : ''}`}
        aria-label="Меню кабинета"
        aria-hidden={!menuOpen}
      >
        <div className="op-drawer__head">
          <div className="op-mob-topbar__brand">
            <LogoMark />
            <span className="op-logo__text">SellYourBrick</span>
          </div>
          <button type="button" className="op-drawer__close" aria-label="Закрыть меню" onClick={closeMenu}>
            <X size={22} />
          </button>
        </div>
        <div className="op-sidebar__divider op-sidebar__divider--drawer" aria-hidden />
        <nav className="op-nav op-nav--drawer">
          {NAV_ITEMS.map(renderNavItem)}
        </nav>
      </aside>

      <aside className="op-sidebar op-desktop-only">
        <div className="op-sidebar__brand">
          <span className="op-logo__mark-slot" aria-hidden />
          <span className="op-logo__text">SellYourBrick</span>
        </div>
        <div className="op-sidebar__divider" aria-hidden />

        <nav className="op-nav" aria-label="Кабинет продавца">
          {NAV_ITEMS.map(renderNavItem)}
        </nav>

        <div className="op-sidebar-user">
          <span className="op-sidebar-user__avatar" aria-hidden>
            <svg viewBox="0 0 40 40">
              <defs>
                <linearGradient id="op-user-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#53d8d3" />
                  <stop offset="100%" stopColor="#089a95" />
                </linearGradient>
              </defs>
              <circle cx="20" cy="20" r="20" fill="url(#op-user-grad)" />
              <circle cx="20" cy="16" r="7" fill="#f8fafc" />
              <ellipse cx="20" cy="34" rx="11" ry="8" fill="#f8fafc" />
            </svg>
          </span>
          <span className="op-sidebar-user__info">
            <span className="op-sidebar-user__name">{fullName}</span>
            <span className="op-sidebar-user__role">{roleLabel}</span>
          </span>
          <button type="button" className="op-sidebar-user__menu" aria-label="Меню профиля">
            <MoreVertical size={18} />
          </button>
        </div>
      </aside>

      {mainColumn}

      <nav className="op-tabbar op-mobile-only" aria-label="Нижняя навигация">
        {TAB_ITEMS.map((item) => {
          if (item.fab) {
            return (
              <div key="fab" className="op-tabbar__fab-slot">
                <Link to="/owner-add-property-test" className="op-tabbar__fab" aria-label="Добавить объект">
                  <Plus size={28} strokeWidth={2.5} />
                </Link>
              </div>
            )
          }
          const Icon = item.icon
          const className = `op-tabbar__item${item.active ? ' op-tabbar__item--active' : ''}`
          if (item.href) {
            return (
              <Link key={item.id} to={item.href} className={className}>
                <Icon size={22} strokeWidth={2} aria-hidden />
                <span>{item.label}</span>
              </Link>
            )
          }
          return (
            <button key={item.id} type="button" className={className}>
              <Icon size={22} strokeWidth={item.active ? 2.25 : 2} aria-hidden />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

import { useState, useEffect, useCallback, useMemo, useRef, useId } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useUser } from '@clerk/clerk-react'
import {
  ChevronDown,
  Search,
  SlidersHorizontal,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  X,
  Plus,
  Upload,
  Clock,
  LayoutGrid,
  Gavel,
  ShoppingBag,
  PieChart,
  Scale,
} from 'lucide-react'
import {
  getOwnerListingTypeLabels,
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
import { getOwnerTestIntlLocale } from '../utils/ownerTestI18n'
import {
  formatOwnerAuctionTimerCountdown,
  formatOwnerAuctionTimerFullCountdown,
  getOwnerAuctionTimerFlags,
} from '../utils/ownerTestTimer'
import { OWNER_TEST_STANDALONE_HREF_MAP } from '../utils/ownerTestNav'
import { getOwnerProfileTabPath } from './ownerProfileTestTabs'
import OwnerTestProfileMenu from '../components/OwnerTestProfileMenu'
import OwnerNotificationsButton from '../components/OwnerNotificationsButton'
import OwnerEmptyStatePanel from '../components/OwnerEmptyStatePanel'
import OwnerEmptyPropertiesIllustration from '../components/OwnerEmptyPropertiesIllustration'
import OwnerPropertiesTableSkeleton from '../components/OwnerPropertiesTableSkeleton'
import OwnerSupportButton from '../components/OwnerSupportButton'
import OwnerFloatingMobileNav from '../components/OwnerFloatingMobileNav'
import FileUploadModal from '../components/FileUploadModal'
import { OwnerAdStack } from '../components/OwnerAds'
import { RoleSwitchBottomCta } from '../components/RoleSwitchBottomCta'
import { useOwnerTestProfile } from '../context/OwnerTestProfileContext'
import { OWNER_VIEWS } from '../context/OwnerTestNavigationContext'
import { useOwnerTestEmbeddedNav } from '../hooks/useOwnerTestEmbeddedNav'
import { useOwnerTestNavItems } from '../hooks/useOwnerTestNavItems'
import './OwnerPropertiesTestPage.css'
import './OwnerPropertiesTestPage.mobile.css'

const MOT_TIFFANY = '#4a90a2'

const PAGE_SIZE = 10

const MOB_LISTING_TAB_IDS = ['all', 'auction', 'buy_now', 'shares', 'debts']

const MOB_LISTING_TAB_ICONS = {
  all: LayoutGrid,
  auction: Gavel,
  buy_now: ShoppingBag,
  shares: PieChart,
  debts: Scale,
}

const MOB_LAYOUT_MAX_WIDTH = 900

const FILTER_TAB_KEYS = {
  all: { label: 'ownerTest_propertiesTabAll', shortLabel: 'ownerTest_propertiesTabAllShort' },
  active: { label: 'ownerTest_propertiesTabActive', shortLabel: 'ownerTest_propertiesTabActive' },
  booked: { label: 'ownerTest_propertiesTabBooked', shortLabel: 'ownerTest_propertiesTabBooked' },
  sold: { label: 'ownerTest_propertiesTabSold', shortLabel: 'ownerTest_propertiesTabSold' },
  draft: { label: 'ownerTest_propertiesTabDraft', shortLabel: 'ownerTest_propertiesTabDraft' },
}

const DEFAULT_PROPERTY_FILTERS = {
  listingTypes: [],
  sortBy: 'date_desc',
}

function isPropertyFiltersActive(filters) {
  return filters.listingTypes.length > 0 || filters.sortBy !== DEFAULT_PROPERTY_FILTERS.sortBy
}

function formatQuickNumber(value, locale) {
  const num = Number(value)
  if (!Number.isFinite(num) || num <= 0) return '0'
  return num.toLocaleString(locale, { maximumFractionDigits: 0 })
}

function formatQuickMoney(value, currency = 'EUR', locale) {
  const num = Number(value)
  if (!Number.isFinite(num) || num <= 0) return `${getCurrencySymbol(currency)}0`
  return `${getCurrencySymbol(currency)}${num.toLocaleString(locale, { maximumFractionDigits: 0 })}`
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
  const { t } = useTranslation()
  const analyticsPeriods = useMemo(
    () => [
      { id: '7d', label: t('ownerTest_propertiesPeriod7d') },
      { id: '30d', label: t('ownerTest_propertiesPeriod30d') },
      { id: '90d', label: t('ownerTest_propertiesPeriod90d') },
    ],
    [t]
  )
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

  const selected = analyticsPeriods.find((period) => period.id === value) ?? analyticsPeriods[1]

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
        <ul className="op-period-select__menu" role="listbox" aria-label={t('ownerTest_ariaAnalyticsPeriod')}>
          {analyticsPeriods.map((period) => (
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
  const { t } = useTranslation()
  const listingTypeFilterOptions = useMemo(() => {
    const labels = getOwnerListingTypeLabels(t)
    return [
      { id: 'auction', label: labels.auction },
      { id: 'buy_now', label: labels.buy_now },
      { id: 'shares', label: labels.shares },
      { id: 'debts', label: labels.debts },
    ]
  }, [t])
  const sortFilterOptions = useMemo(
    () => [
      { id: 'date_desc', label: t('ownerTest_propertiesSortNewest') },
      { id: 'views_desc', label: t('ownerTest_propertiesSortViews') },
      { id: 'price_desc', label: t('ownerTest_propertiesSortPriceDesc') },
      { id: 'price_asc', label: t('ownerTest_propertiesSortPriceAsc') },
    ],
    [t]
  )
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
        {t('ownerTest_salesFilterAria')}
        {active ? <span className="op-filter-btn__badge" aria-hidden /> : null}
      </button>
      {open ? (
        <div className="op-filter-menu__panel" role="dialog" aria-label={t('ownerTest_ariaPropertyFilters')}>
          <div className="op-filter-menu__section">
            <p className="op-filter-menu__title">{t('oap_wizardStepListing')}</p>
            <div className="op-filter-menu__chips">
              {listingTypeFilterOptions.map((option) => {
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
            <p className="op-filter-menu__title">{t('filters')}</p>
            <div className="op-filter-menu__sort">
              {sortFilterOptions.map((option) => (
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
              {t('catalogResetFilters')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function MiniSpark({ variant }) {
  const colors = { tiffany: MOT_TIFFANY, green: '#4a90a2', orange: '#f59e0b' }
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

function OpMobileHeroAvatar({ ariaLabel }) {
  const { user } = useUser()
  const gradientId = useId()
  const imageUrl = user?.imageUrl

  return (
    <Link to={getOwnerProfileTabPath('personal')} className="op-mob-hero__avatar" aria-label={ariaLabel}>
      {imageUrl ? (
        <img src={imageUrl} alt="" className="op-mob-hero__avatar-img" />
      ) : (
        <span className="op-mob-hero__avatar-fallback" aria-hidden>
          <svg viewBox="0 0 40 40">
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#6ba3b2" />
                <stop offset="100%" stopColor="#3a7586" />
              </linearGradient>
            </defs>
            <circle cx="20" cy="20" r="20" fill={`url(#${gradientId})`} />
            <circle cx="20" cy="16" r="7" fill="#F8FAFC" />
            <ellipse cx="20" cy="34" rx="11" ry="8" fill="#F8FAFC" />
          </svg>
        </span>
      )}
    </Link>
  )
}

function LogoMark({ className = '' }) {
  return (
    <svg className={`op-logo__mark ${className}`.trim()} viewBox="0 0 40 40" aria-hidden>
      <defs>
        <linearGradient id="op-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6ba3b2" />
          <stop offset="100%" stopColor="#3a7586" />
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
  const { t } = useTranslation()
  const labels = getOwnerListingTypeLabels(t)
  const label = labels[type] || type
  return <span className={`op-type op-type--${type}`}>{label}</span>
}

function AmountCell({ row }) {
  const { t } = useTranslation()
  const { label, value } = getOwnerPropertyAmount(row, t)
  return (
    <div className="op-amount-cell">
      <span className="op-amount-cell__label">{label}</span>
      <span className="op-amount-cell__value">{value}</span>
    </div>
  )
}

function getObjectTimerState(endTime, t, now = Date.now(), { compact = false } = {}) {
  if (!endTime) return null
  const endMs = new Date(endTime).getTime()
  if (!Number.isFinite(endMs)) return null

  const remainingMs = endMs - now
  const { expired, warning, critical, urgent } = getOwnerAuctionTimerFlags(remainingMs)

  if (expired) {
    return {
      expired: true,
      warning: false,
      critical: false,
      urgent: false,
      label: t('ownerTest_propertiesTimerFinished'),
      caption: t('ownerTest_propertiesTimerCaption'),
    }
  }

  return {
    expired: false,
    warning,
    critical,
    urgent,
    caption: t('ownerTest_propertiesTimerLeft'),
    label: compact
      ? formatOwnerAuctionTimerCountdown(remainingMs)
      : formatOwnerAuctionTimerFullCountdown(remainingMs, t),
  }
}

function ObjectTimerBadge({ endTime, now, compact = false, table = false }) {
  const { t } = useTranslation()
  const useCompact = compact || table
  const timer = getObjectTimerState(endTime, t, now, { compact: useCompact })
  if (!timer) {
    return (
      <span
        className={[
          'op-object-timer',
          'op-object-timer--empty',
          table && 'op-object-timer--table',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        —
      </span>
    )
  }

  return (
    <span
      className={[
        'op-object-timer',
        table && 'op-object-timer--table',
        timer.expired && 'op-object-timer--expired',
        timer.warning && 'op-object-timer--warning',
        timer.critical && 'op-object-timer--critical',
        timer.urgent && 'op-object-timer--urgent',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="op-object-timer__icon" aria-hidden>
        <Clock size={13} strokeWidth={2.4} />
      </span>
      <span className="op-object-timer__content">
        {!timer.expired && !table ? (
          <span className="op-object-timer__caption">{timer.caption}</span>
        ) : null}
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
  const { t } = useTranslation()
  const pageStart = totalItems === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const pageEnd = Math.min(currentPage * PAGE_SIZE, totalItems)
  const pageItems = getVisiblePages(currentPage, totalPages)

  return (
    <footer className="op-pagination">
      <p className="op-pagination__info">
        {totalItems === 0
          ? t('ownerTest_propertiesNoItems')
          : `${pageStart}–${pageEnd} / ${totalItems} ${t('ownerTest_tabProperties')}`}
      </p>
      {totalPages > 1 && (
        <div className="op-pagination__controls">
          <button
            type="button"
            className="op-page-btn"
            aria-label={t('ownerTest_paginationPrev')}
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
                aria-label={`${t('ownerTest_tabProperties')} ${item.value}`}
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
            aria-label={t('ownerTest_paginationNext')}
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
  const { t, i18n } = useTranslation()
  const intlLocale = useMemo(() => getOwnerTestIntlLocale(i18n.language), [i18n.language])
  const { fullName, roleLabel } = useOwnerTestProfile()
  const { isEmbedded, goTo } = useOwnerTestEmbeddedNav()
  const navItems = useOwnerTestNavItems({
    activeId: 'properties',
    hrefMap: isEmbedded ? undefined : OWNER_TEST_STANDALONE_HREF_MAP,
  })
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('all')
  const [mobListingTab, setMobListingTab] = useState('all')
  const [isMobLayout, setIsMobLayout] = useState(false)
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

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOB_LAYOUT_MAX_WIDTH}px)`)
    const update = () => setIsMobLayout(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

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
      {
        label: t('ownerTest_propertiesMetricAllViews'),
        value: formatQuickNumber(totals.views, intlLocale),
        delta: '',
        up: null,
        spark: 'tiffany',
      },
      {
        label: t('ownerTest_propertiesMetricAllBids'),
        value: formatQuickMoney(totals.bids, currency, intlLocale),
        delta: '',
        up: null,
        spark: 'green',
      },
      {
        label: t('ownerTest_propertiesMetricAllTestDrives'),
        value: `${formatQuickNumber(testDriveRows.length, intlLocale)} · ${formatQuickMoney(testDriveTotal, testDriveCurrency, intlLocale)}`,
        delta: '',
        up: null,
        spark: 'orange',
      },
    ]
  }, [properties, testDriveRows, t, intlLocale])

  const filterTabs = useMemo(
    () =>
      Object.entries(FILTER_TAB_KEYS).map(([id, keys]) => ({
        id,
        label: t(keys.label),
        shortLabel: t(keys.shortLabel),
        count: tabCounts[id] ?? 0,
      })),
    [tabCounts, t]
  )

  const mobListingTabs = useMemo(() => {
    const labels = getOwnerListingTypeLabels(t)
    return MOB_LISTING_TAB_IDS.map((id) => ({
      id,
      label: id === 'all' ? t('ownerTest_propertiesTabAllShort') : labels[id],
      icon: MOB_LISTING_TAB_ICONS[id],
    }))
  }, [t])

  const filterTab = isMobLayout ? mobListingTab : activeTab

  const mobSummaryStats = useMemo(
    () => [
      { label: t('ownerTest_propertiesMetricTotal'), value: String(tabCounts.all), delta: '', up: null },
      { label: t('ownerTest_propertiesTabActive'), value: String(tabCounts.active), delta: '', up: null },
      { label: t('ownerTest_propertiesTabBooked'), value: String(tabCounts.booked), delta: '', up: null },
      { label: t('ownerTest_propertiesTabSold'), value: String(tabCounts.sold), delta: '', up: null },
      { label: t('ownerTest_propertiesTabDraft'), value: String(tabCounts.draft), delta: '', up: null },
    ],
    [tabCounts, t]
  )

  const visibleProperties = useMemo(
    () =>
      filterOwnerProperties(properties, {
        tab: filterTab,
        query: searchQuery,
        listingTypes: propertyFilters.listingTypes,
        sortBy: propertyFilters.sortBy,
      }),
    [properties, filterTab, searchQuery, propertyFilters]
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
  }, [filterTab, searchQuery, propertyFilters])

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
        <div className="op-hero-shell op-mobile-only">
          <div className="op-hero-shell__bg" aria-hidden />
          <div className="op-hero-shell__shine" aria-hidden />
          <div className="op-mob-hero">
            <div className="op-mob-hero__top">
              <OpMobileHeroAvatar ariaLabel={t('ownerTest_profileAria')} />
              <div className="op-mob-hero__actions">
                <OwnerSupportButton className="op-mob-hero__action" iconSize={20} />
                <OwnerNotificationsButton
                  className="op-mob-hero__notify"
                  badgeClassName="op-mob-hero__notify-badge"
                  iconSize={20}
                />
              </div>
            </div>
            <h1 className="op-mob-hero__title">{t('ownerTest_navMyProperties')}</h1>
            <label className="op-mob-hero__search">
              <Search size={18} strokeWidth={2.2} className="op-mob-hero__search-icon" aria-hidden />
              <input
                type="search"
                className="op-mob-hero__search-input"
                placeholder={t('ownerTest_propertiesSearch')}
                aria-label={t('ownerTest_ariaPropertySearch')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </label>
          </div>
          <div className="op-hero-shell__fade" aria-hidden />
        </div>

        <div className="op-listing-filters op-mobile-only" role="tablist" aria-label={t('ownerTest_ariaPropertyFilter')}>
          {mobListingTabs.map((tab) => {
            const Icon = tab.icon
            const isActive = mobListingTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`op-listing-filter${isActive ? ' op-listing-filter--active' : ''}`}
                onClick={() => setMobListingTab(tab.id)}
              >
                <span className="op-listing-filter__icon" aria-hidden>
                  <Icon size={26} strokeWidth={2.1} />
                </span>
                <span className="op-listing-filter__label">{tab.label}</span>
              </button>
            )
          })}
        </div>

        <header className="op-header op-desktop-only">
          <h1 className="op-header__title">{t('ownerTest_navMyProperties')}</h1>
          <div className="op-header__actions">
            <button
              type="button"
              className="op-btn op-btn--file op-header__file-btn"
              onClick={() => setShowFileUploadModal(true)}
            >
              <Upload size={18} strokeWidth={2.25} aria-hidden />
              {t('ownerQuickAddCsv')}
            </button>
            {isEmbedded ? (
              <button
                type="button"
                className="op-btn op-btn--primary op-header__add-btn"
                onClick={() => goTo(OWNER_VIEWS.ADD_PROPERTY)}
              >
                <Plus size={18} strokeWidth={2.5} aria-hidden />
                {t('addProperty')}
              </button>
            ) : (
              <Link to="/owner-add-property-test" className="op-btn op-btn--primary op-header__add-btn">
                <Plus size={18} strokeWidth={2.5} aria-hidden />
                {t('addProperty')}
              </Link>
            )}
            <OwnerSupportButton className="op-icon-btn" />
            <OwnerNotificationsButton className="op-icon-btn" badgeClassName="op-icon-btn__badge" />
            <OwnerTestProfileMenu />
          </div>
        </header>

        <div className="op-workspace">
          <section className="op-mob-metrics op-mobile-only" aria-label={t('ownerTest_ariaPropertySummary')}>
            {mobSummaryStats.map((stat) => (
              <article key={stat.label} className="op-mob-metric">
                <span className="op-mob-metric__label">{stat.label}</span>
                <span className="op-mob-metric__value">{stat.value}</span>
                <DeltaText value={stat.delta} up={stat.up} />
              </article>
            ))}
          </section>

          <div className="op-main-panel">
            <div className="op-tabs op-tabs--desktop" role="tablist">
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

            <div className="op-toolbar op-toolbar--desktop">
              <label className="op-search">
                <Search size={18} strokeWidth={2} aria-hidden />
                <input
                  type="search"
                  className="op-search__input"
                  placeholder={t('ownerTest_propertiesSearch')}
                  aria-label={t('ownerTest_ariaPropertySearch')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </label>
              <PropertiesFilterMenu filters={propertyFilters} onChange={setPropertyFilters} />
            </div>

            <div className="op-table-card">
              {propertiesLoading ? (
                <OwnerPropertiesTableSkeleton />
              ) : visibleProperties.length === 0 ? (
                properties.length === 0 ? (
                  <OwnerEmptyStatePanel
                    illustration={OwnerEmptyPropertiesIllustration}
                    title={t('ownerTest_emptyNoPropertiesTitle')}
                    description={t('ownerTest_emptyNoPropertiesDesc')}
                    actionLabel={t('ownerTest_ariaAddProperty')}
                    onAction={
                      isEmbedded
                        ? () => goTo(OWNER_VIEWS.ADD_PROPERTY)
                        : undefined
                    }
                    actionHref={isEmbedded ? undefined : '/owner-add-property-test'}
                  />
                ) : (
                  <div className="op-table-state">{t('ownerTest_propertiesEmptyFilter')}</div>
                )
              ) : (
              <>
              <div className="op-table-wrap op-desktop-only">
                <table className="op-table">
                  <thead>
                    <tr>
                      <th>{t('ownerTest_tabProperties')}</th>
                      <th>{t('oap_wizardStepListing')}</th>
                      <th>{t('ownerTest_propertiesTimerLeft')}</th>
                      <th>{t('ownerTest_metricViews')}</th>
                      <th>{t('propertyDetailPrice')}</th>
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
                        aria-label={`${t('ownerTest_ariaStatistics')}: ${row.title}`}
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
                          <ListingTypeBadge type={row.listingType} />
                        </td>
                        <td>
                          <ObjectTimerBadge endTime={row.auctionEndTime} now={timerNow} table />
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
                {paginatedProperties.map((row) => {
                  const amount = getOwnerPropertyAmount(row, t)
                  return (
                    <li key={row.id} className="op-mob-list__item">
                      <article className="op-mob-property">
                        <div className="op-mob-property__media">
                          <img src={row.image} alt="" className="op-mob-property__photo" loading="lazy" />
                        </div>
                        <div className="op-mob-property__body">
                          <div className="op-mob-property__head">
                            <h3 className="op-mob-property__title">{row.title}</h3>
                            <ListingTypeBadge type={row.listingType} />
                          </div>
                          <p className="op-mob-property__location">{row.location}</p>
                          <div className="op-mob-property__foot">
                            <p className="op-mob-property__price">{amount.value}</p>
                            <button
                              type="button"
                              className="op-mob-property__open"
                              onClick={() => openPropertyAnalytics(row.id)}
                              aria-label={`${t('ownerTest_notificationsOpen')}: ${row.title}`}
                            >
                              <ChevronRight size={18} strokeWidth={2.4} aria-hidden />
                            </button>
                          </div>
                        </div>
                      </article>
                    </li>
                  )
                })}
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

          <section className="op-mob-rail op-mobile-only" aria-label={t('ownerTest_ariaAds')}>
            <OwnerAdStack cards={['premium', 'fastSales']} className="op-owner-ads op-mob-owner-ads" />
          </section>

          <aside className="op-rail op-desktop-only">
            <section className="op-rail-card op-quick-analytics">
              <div className="op-rail-card__head">
                <h2>{t('ownerTest_ariaStatistics')}</h2>
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

        <RoleSwitchBottomCta targetRole="buyer" />
      </div>
      <FileUploadModal
        isOpen={showFileUploadModal}
        onClose={() => setShowFileUploadModal(false)}
        userId={getOwnerPropertiesUserId()}
        onSuccess={loadProperties}
      />
    </>
  )

  if (isEmbedded) return <div className="op op--embedded">{mainColumn}</div>

  return (
    <div className={`op${menuOpen ? ' op--menu-open' : ''}`}>
      <div
        className="op-drawer-backdrop op-mobile-only"
        aria-hidden={!menuOpen}
        onClick={closeMenu}
      />
      <aside
        className={`op-drawer op-mobile-only${menuOpen ? ' op-drawer--open' : ''}`}
        aria-label={t('ownerTest_ariaCabinetMenu')}
        aria-hidden={!menuOpen}
      >
        <div className="op-drawer__head">
          <div className="op-mob-topbar__brand">
            <LogoMark />
            <span className="op-logo__text">{t('ownerTest_brandName')}</span>
          </div>
          <button type="button" className="op-drawer__close" aria-label={t('ownerTest_ariaCloseMenu')} onClick={closeMenu}>
            <X size={22} />
          </button>
        </div>
        <div className="op-sidebar__divider op-sidebar__divider--drawer" aria-hidden />
        <nav className="op-nav op-nav--drawer">
          {navItems.map(renderNavItem)}
        </nav>
      </aside>

      <aside className="op-sidebar op-desktop-only">
        <div className="op-sidebar__brand">
          <LogoMark />
          <span className="op-logo__text">{t('ownerTest_brandName')}</span>
        </div>
        <div className="op-sidebar__divider" aria-hidden />

        <nav className="op-nav" aria-label={t('ownerTest_ariaSellerCabinet')}>
          {navItems.map(renderNavItem)}
        </nav>

        <div className="op-sidebar-user">
          <span className="op-sidebar-user__avatar" aria-hidden>
            <svg viewBox="0 0 40 40">
              <defs>
                <linearGradient id="op-user-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#6ba3b2" />
                  <stop offset="100%" stopColor="#3a7586" />
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
          <button type="button" className="op-sidebar-user__menu" aria-label={t('ownerTest_ariaProfileMenu')}>
            <MoreVertical size={18} />
          </button>
        </div>
      </aside>

      {mainColumn}

      <OwnerFloatingMobileNav
        view={OWNER_VIEWS.PROPERTIES}
        onOpenMenu={() => setMenuOpen(true)}
        menuOpen={menuOpen}
      />
    </div>
  )
}

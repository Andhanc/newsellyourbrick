import { useMemo, useState, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line, Doughnut } from 'react-chartjs-2'
import {
  LayoutDashboard,
  Home,
  Building2,
  CalendarCheck,
  ShoppingBag,
  Car,
  CreditCard,
  BarChart3,
  MessageSquare,
  Settings,
  ChevronDown,
  Calendar,
  Eye,
  TrendingUp,
  Menu,
  X,
  Briefcase,
  Plus,
  SlidersHorizontal,
  DollarSign,
  ClipboardList,
} from 'lucide-react'
import OwnerNotificationsDrawer from '../components/OwnerNotificationsDrawer'
import OwnerNotificationsButton from '../components/OwnerNotificationsButton'
import OwnerTestProfileMenu from '../components/OwnerTestProfileMenu'
import { OwnerBuyerAd } from '../components/OwnerAds'
import { useOwnerTestEmbeddedNav } from '../hooks/useOwnerTestEmbeddedNav'
import {
  CLERK_DB_USER_SYNCED,
  fetchOwnerProperties,
  getOwnerPropertiesUserId,
} from '../utils/ownerPropertiesList'
import { fetchOwnerTestDriveBookings } from '../utils/ownerTestDriveList'
import { OWNER_VIEWS, ownerTestHref } from '../utils/ownerTestNav'
import { propertyBidsApiQuery } from '../utils/propertySourceTable'
import './MainOwnerTestPage.css'
import './MainOwnerTestPage.mobile.css'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend
)

const NAV_ITEMS = [
  { id: 'home', label: 'Главная', icon: LayoutDashboard, active: true },
  { id: 'properties', label: 'Мои объекты', icon: Building2, href: '/owner-properties-test' },
  { id: 'bookings', label: 'Брони', icon: CalendarCheck },
  { id: 'sales', label: 'Продажи', icon: ShoppingBag, href: '/owner-sales-test' },
  { id: 'testdrive', label: 'Тест-драйв', icon: Car, href: '/owner-test-drive' },
  { id: 'subscriptions', label: 'Подписки', icon: CreditCard, href: '/owner-subscriptions-test' },
  { id: 'analytics', label: 'Аналитика', icon: BarChart3 },
  { id: 'messages', label: 'Сообщения', icon: MessageSquare, badge: 3 },
  { id: 'settings', label: 'Настройки', icon: Settings, href: '/owner-profile-test' },
]

const TAB_ITEMS = [
  { id: 'home', label: 'Главная', icon: Home, active: true },
  { id: 'properties', label: 'Объекты', icon: Briefcase },
  { id: 'fab', fab: true },
  { id: 'bookings', label: 'Брони', icon: ClipboardList },
  { id: 'more', label: 'Ещё', icon: SlidersHorizontal },
]

const ACTIVITY = [
  {
    tone: 'blue',
    icon: CalendarCheck,
    title: 'Новая бронь на объект',
    subtitle: 'Вилла у моря',
    time: '12 мин назад',
  },
  {
    tone: 'green',
    icon: Car,
    title: 'Новый тест-драйв',
    subtitle: 'Апартаменты в центре',
    time: '15 мин назад',
  },
  {
    tone: 'orange',
    icon: ShoppingBag,
    title: 'Объект продан',
    subtitle: 'Дом в пригороде',
    time: '1 час назад',
  },
  {
    tone: 'red',
    icon: MessageSquare,
    title: 'Новый запрос от покупателя',
    subtitle: 'Пентхаус с видом',
    time: '2 часа назад',
  },
]

const MOT_TIFFANY = '#0abab5'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

function toInputDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function monthPresetLabel(date) {
  const label = new Intl.DateTimeFormat('ru-RU', { month: 'long' }).format(date)
  return label.charAt(0).toUpperCase() + label.slice(1)
}

const TODAY = new Date()
const WEEK_START = new Date(TODAY)
WEEK_START.setDate(TODAY.getDate() - 6)
const MONTH_START = new Date(TODAY.getFullYear(), TODAY.getMonth(), 1)
const QUARTER_START = new Date(TODAY.getFullYear(), TODAY.getMonth() - 2, 1)

const DATE_PRESETS = [
  { id: 'week', label: '7 дней', from: toInputDate(WEEK_START), to: toInputDate(TODAY) },
  { id: 'month', label: monthPresetLabel(TODAY), from: toInputDate(MONTH_START), to: toInputDate(TODAY) },
  { id: 'quarter', label: 'Квартал', from: toInputDate(QUARTER_START), to: toInputDate(TODAY) },
]

const INITIAL_DATE_RANGE = DATE_PRESETS[1]

const SPARK_COLORS = {
  tiffany: MOT_TIFFANY,
  orange: '#F59E0B',
  teal: '#14B8A6',
  green: '#22C55E',
}

const CHART_FILTERS = [
  { id: 'all', label: 'Все данные' },
  { id: 'views', label: 'Просмотры' },
  { id: 'testDrives', label: 'Тест-драйвы / брони' },
  { id: 'bids', label: 'Ставки' },
]

const CHART_SERIES = [
  {
    key: 'views',
    label: 'Просмотры',
    color: MOT_TIFFANY,
    backgroundColor: 'rgba(10, 186, 181, 0.12)',
    fill: true,
  },
  {
    key: 'testDrives',
    label: 'Тест-драйвы / брони',
    color: '#F59E0B',
    backgroundColor: 'transparent',
    fill: false,
  },
  {
    key: 'bids',
    label: 'Ставки',
    color: '#22C55E',
    backgroundColor: 'transparent',
    fill: false,
  },
]

function formatMotDate(value) {
  if (!value) return ''
  const date = new Date(`${value}T00:00:00`)
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
    .format(date)
    .replace(/\.$/, '')
}

function dateRangeLabel(range) {
  return `${formatMotDate(range.from)} – ${formatMotDate(range.to)}`
}

function parseMotNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (value == null) return 0
  const parsed = Number(String(value).replace(/[^\d.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

function formatMotNumber(value) {
  const num = Number(value) || 0
  return num.toLocaleString('ru-RU')
}

function formatMotCompactNumber(value) {
  const num = Number(value) || 0
  if (num >= 1000000) return `${(num / 1000000).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} млн`
  if (num >= 1000) return `${(num / 1000).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} тыс`
  return formatMotNumber(num)
}

function parseMotTime(value) {
  if (!value) return null
  const ts = new Date(value).getTime()
  return Number.isFinite(ts) ? ts : null
}

function formatTimerLeft(endTime) {
  const ts = parseMotTime(endTime)
  if (!ts) return '—'
  const diff = Math.max(0, ts - Date.now())
  if (diff <= 0) return 'Завершён'
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  if (days > 0) return `${days} д ${String(hours).padStart(2, '0')} ч`
  return `${hours} ч ${String(minutes).padStart(2, '0')} мин`
}

function buildPropertyKey(propertyId, table) {
  const normalizedTable = String(table || 'properties_apartments')
  return `${normalizedTable}:${Number(propertyId)}`
}

function getRowPropertyTable(row) {
  const raw = row?.raw || {}
  if (raw.property_table) return raw.property_table
  if (raw.source_table === 'houses') return 'properties_houses'
  if (raw.source_table === 'apartments') return 'properties_apartments'
  if (raw.property_type === 'house' || raw.property_type === 'villa') return 'properties_houses'
  return 'properties_apartments'
}

function toDateOnly(value) {
  const ts = parseMotTime(value)
  if (!ts) return ''
  const date = new Date(ts)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function buildDateBuckets(range, maxBuckets = 90) {
  const start = new Date(`${range.from}T00:00:00`)
  const end = new Date(`${range.to}T00:00:00`)
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start > end) {
    return []
  }
  const buckets = []
  const cursor = new Date(start)
  const days = Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86400000) + 1)
  const stepDays = Math.max(1, Math.ceil(days / maxBuckets))
  while (cursor <= end) {
    const value = toDateOnly(cursor.toISOString())
    buckets.push({
      value,
      label: new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' })
        .format(cursor)
        .replace(/\.$/, ''),
      endTs: new Date(`${value}T23:59:59.999`).getTime(),
    })
    cursor.setDate(cursor.getDate() + stepDays)
  }
  const endValue = toDateOnly(end.toISOString())
  if (buckets[buckets.length - 1]?.value !== endValue) {
    buckets.push({
      value: endValue,
      label: new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' })
        .format(end)
        .replace(/\.$/, ''),
      endTs: new Date(`${endValue}T23:59:59.999`).getTime(),
    })
  }
  return buckets
}

function buildRangeFromDates(dates, fallbackRange) {
  const sortedDates = dates.filter(Boolean).sort()
  if (sortedDates.length === 0) return fallbackRange
  return {
    from: sortedDates[0],
    to: sortedDates[sortedDates.length - 1],
  }
}

async function fetchOwnerBidRows(properties) {
  const rows = await Promise.all(
    properties.map(async (property) => {
      const table = getRowPropertyTable(property)
      try {
        const response = await fetch(
          `${API_BASE_URL}/bids/property/${property.id}?${propertyBidsApiQuery(property.id, table)}`
        )
        if (!response.ok) return []
        const json = await response.json().catch(() => ({}))
        if (!json.success || !Array.isArray(json.data)) return []
        return json.data.map((bid) => ({
          ...bid,
          propertyTable: table,
          propertyId: property.id,
          propertyTitle: property.title,
          propertyLocation: property.location,
          propertyCurrency: property.currency,
          propertyImage: property.image,
        }))
      } catch {
        return []
      }
    })
  )
  return rows.flat()
}

function formatBidAmount(value, currency = 'USD') {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '—'
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: currency || 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatRelativeTime(value) {
  const ts = parseMotTime(value)
  if (!ts) return ''
  const diff = Date.now() - ts
  if (diff < 60000) return 'только что'
  if (diff < 3600000) return `${Math.max(1, Math.floor(diff / 60000))} мин назад`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч назад`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} д назад`
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' })
    .format(new Date(ts))
    .replace(/\.$/, '')
}

function DateRangePopover({ open, draftRange, selectedRange, onDraftChange, onPreset, onApply, onClose }) {
  return (
    <div className={`mot-date-popover${open ? ' mot-date-popover--open' : ''}`}>
      <div className="mot-date-popover__head">
        <span>Период аналитики</span>
        <strong>{dateRangeLabel(draftRange)}</strong>
      </div>
      <div className="mot-date-popover__presets" aria-label="Быстрый выбор периода">
        {DATE_PRESETS.map((preset) => {
          const active = draftRange.from === preset.from && draftRange.to === preset.to
          return (
            <button
              key={preset.id}
              type="button"
              className={`mot-date-popover__preset${active ? ' mot-date-popover__preset--active' : ''}`}
              onClick={() => onPreset(preset)}
            >
              {preset.label}
            </button>
          )
        })}
      </div>
      <div className="mot-date-popover__fields">
        <label>
          <span>С</span>
          <input
            type="date"
            value={draftRange.from}
            onChange={(event) => onDraftChange({ ...draftRange, from: event.target.value })}
          />
        </label>
        <label>
          <span>По</span>
          <input
            type="date"
            value={draftRange.to}
            onChange={(event) => onDraftChange({ ...draftRange, to: event.target.value })}
          />
        </label>
      </div>
      <div className="mot-date-popover__actions">
        <button type="button" className="mot-date-popover__ghost" onClick={onClose}>
          Отмена
        </button>
        <button type="button" className="mot-date-popover__apply" onClick={onApply}>
          Применить
        </button>
      </div>
    </div>
  )
}

function LogoMark({ className = '' }) {
  return (
    <svg className={`mot-logo__mark ${className}`.trim()} viewBox="0 0 40 40" aria-hidden>
      <defs>
        <linearGradient id="mot-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#53d8d3" />
          <stop offset="100%" stopColor="#089a95" />
        </linearGradient>
      </defs>
      <path d="M20 2L35 11v18L20 38 5 29V11L20 2z" fill="url(#mot-logo-grad)" />
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

function Sparkline({ variant, className = '' }) {
  const stroke = SPARK_COLORS[variant] || SPARK_COLORS.tiffany
  const path =
    variant === 'tiffany'
      ? 'M2 18 C8 14, 10 8, 16 10 S24 6, 30 4 S38 12, 46 8'
      : variant === 'orange'
        ? 'M2 17 C10 13, 14 19, 22 15 S32 9, 40 13 S44 7, 46 11'
        : 'M2 16 C10 12, 14 18, 22 14 S32 8, 40 12 S44 6, 46 10'
  return (
    <svg className={`mot-metric__spark ${className}`.trim()} viewBox="0 0 48 22" aria-hidden>
      <path d={path} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

const ACTIVITY_TONES = {
  blue: { bg: '#ecfdf5', fg: MOT_TIFFANY },
  green: { bg: '#ecfdf5', fg: '#22C55E' },
  orange: { bg: '#fff7ed', fg: '#F59E0B' },
  red: { bg: '#fef2f2', fg: '#EF4444' },
}

function ActivityIcon({ tone, icon: Icon }) {
  const c = ACTIVITY_TONES[tone] || ACTIVITY_TONES.blue
  const ResolvedIcon = Icon || TrendingUp
  return (
    <span className="mot-activity__icon" style={{ background: c.bg, color: c.fg }}>
      <ResolvedIcon size={18} strokeWidth={2.2} />
    </span>
  )
}

function useMotMobile() {
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 900px)').matches : false
  )

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)')
    const onChange = (e) => setMobile(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return mobile
}

export default function MainOwnerTestPage() {
  const { isEmbedded, goTo } = useOwnerTestEmbeddedNav()
  const [menuOpen, setMenuOpen] = useState(false)
  const [datePopoverOpen, setDatePopoverOpen] = useState(false)
  const [chartFilterOpen, setChartFilterOpen] = useState(false)
  const [chartMetricFilter, setChartMetricFilter] = useState('all')
  const [selectedRange, setSelectedRange] = useState(INITIAL_DATE_RANGE)
  const [draftRange, setDraftRange] = useState(INITIAL_DATE_RANGE)
  const [ownerProperties, setOwnerProperties] = useState([])
  const [testDriveRows, setTestDriveRows] = useState([])
  const [ownerBidRows, setOwnerBidRows] = useState([])
  const [bidDrawerOpen, setBidDrawerOpen] = useState(false)
  const [overviewLoading, setOverviewLoading] = useState(true)
  const isMobile = useMotMobile()

  const closeMenu = useCallback(() => setMenuOpen(false), [])
  const closeDatePopover = useCallback(() => {
    setDraftRange(selectedRange)
    setDatePopoverOpen(false)
  }, [selectedRange])

  const handleApplyRange = useCallback(() => {
    setSelectedRange(draftRange)
    setDatePopoverOpen(false)
  }, [draftRange])

  const loadOverview = useCallback(async () => {
    const userId = getOwnerPropertiesUserId()
    if (!userId) {
      setOwnerProperties([])
      setTestDriveRows([])
      setOwnerBidRows([])
      setOverviewLoading(false)
      return
    }

    setOverviewLoading(true)
    try {
      const properties = await fetchOwnerProperties(userId)
      const [testDrives, bidRows] = await Promise.all([
        fetchOwnerTestDriveBookings(userId),
        fetchOwnerBidRows(properties),
      ])
      setOwnerProperties(properties)
      setTestDriveRows(testDrives)
      setOwnerBidRows(bidRows)
    } catch (error) {
      console.warn('MainOwnerTestPage: не удалось загрузить реальные данные главной', error)
      setOwnerProperties([])
      setTestDriveRows([])
      setOwnerBidRows([])
    } finally {
      setOverviewLoading(false)
    }
  }, [])

  const renderNavItem = useCallback(
    ({ id, label, icon: Icon, active, badge, href }) => {
      const className = `mot-nav__item${active ? ' mot-nav__item--active' : ''}`
      const inner = (
        <>
          <Icon size={20} strokeWidth={active ? 2.25 : 2} aria-hidden />
          <span>{label}</span>
          {badge != null && <span className="mot-nav__badge">{badge}</span>}
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
    document.documentElement.classList.add('mot-page-active')
    return () => document.documentElement.classList.remove('mot-page-active')
  }, [isEmbedded])

  useEffect(() => {
    loadOverview()
  }, [loadOverview])

  useEffect(() => {
    const onUserSynced = () => loadOverview()
    window.addEventListener(CLERK_DB_USER_SYNCED, onUserSynced)
    return () => window.removeEventListener(CLERK_DB_USER_SYNCED, onUserSynced)
  }, [loadOverview])

  useEffect(() => {
    if (!menuOpen) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [menuOpen])

  useEffect(() => {
    if (!datePopoverOpen) return undefined

    const handlePointerDown = (event) => {
      if (!event.target.closest('.mot-date-control')) {
        setDraftRange(selectedRange)
        setDatePopoverOpen(false)
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setDraftRange(selectedRange)
        setDatePopoverOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [datePopoverOpen, selectedRange])

  useEffect(() => {
    if (!chartFilterOpen) return undefined

    const handlePointerDown = (event) => {
      if (!event.target.closest('.mot-chart-filter')) {
        setChartFilterOpen(false)
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setChartFilterOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [chartFilterOpen])

  const testDriveCountByProperty = useMemo(() => {
    const map = new Map()
    for (const row of testDriveRows) {
      const key = buildPropertyKey(row.propertyId, row.propertyTable)
      map.set(key, (map.get(key) || 0) + 1)
    }
    return map
  }, [testDriveRows])

  const bidCountByProperty = useMemo(() => {
    const map = new Map()
    for (const row of ownerBidRows) {
      const key = buildPropertyKey(row.propertyId || row.property_id, row.propertyTable || row.property_table)
      map.set(key, (map.get(key) || 0) + 1)
    }
    return map
  }, [ownerBidRows])

  const propertyStatsRows = useMemo(
    () =>
      ownerProperties.map((row) => {
        const key = buildPropertyKey(row.id, getRowPropertyTable(row))
        const views = Number(row.viewsCount) || parseMotNumber(row.views)
        const testDrives = testDriveCountByProperty.get(key) || 0
        const fallbackBids = Number(row.bidsCount ?? row.raw?.bids_count ?? row.raw?.bidsCount) || 0
        const bids = bidCountByProperty.get(key) ?? fallbackBids
        return {
          ...row,
          statsKey: key,
          viewsValue: views,
          testDrivesValue: testDrives,
          bidsValue: bids,
          totalEngagement: views + testDrives + bids,
        }
      }),
    [bidCountByProperty, ownerProperties, testDriveCountByProperty]
  )

  const totals = useMemo(
    () =>
      propertyStatsRows.reduce(
        (acc, row) => {
          acc.views += row.viewsValue
          acc.testDrives += row.testDrivesValue
          acc.bids += row.bidsValue
          return acc
        },
        { views: 0, testDrives: 0, bids: 0 }
      ),
    [propertyStatsRows]
  )

  const bidNotifications = useMemo(() => {
    const propertyByKey = new Map(propertyStatsRows.map((row) => [row.statsKey, row]))
    return ownerBidRows
      .map((bid) => {
        const table = bid.propertyTable || bid.property_table
        const propertyId = bid.propertyId || bid.property_id
        const property = propertyByKey.get(buildPropertyKey(propertyId, table))
        const propertyTitle = bid.propertyTitle || property?.title || `Объект #${propertyId}`
        const propertyLocation = bid.propertyLocation || property?.location || ''
        const buyerId = bid.user_id_number || bid.user_id
        const amount = formatBidAmount(bid.bid_amount, bid.propertyCurrency || property?.currency || 'USD')
        const createdAt = bid.created_at || bid.createdAt
        const createdTs = parseMotTime(createdAt) || 0
        const openParams = { propertyId }
        return {
          id: `bid-${bid.id || `${propertyId}-${createdTs}-${bid.bid_amount}`}`,
          tone: 'teal',
          icon: DollarSign,
          title: 'Новая ставка на объект',
          text: `${propertyTitle}${buyerId ? ` • Покупатель #${buyerId}` : ''}${propertyLocation ? ` • ${propertyLocation}` : ''}`,
          time: formatRelativeTime(createdAt),
          amount,
          createdTs,
          unread: true,
          href: ownerTestHref(OWNER_VIEWS.PROPERTY_ANALYTICS, openParams),
          onAction: goTo && propertyId
            ? () => goTo(OWNER_VIEWS.PROPERTY_ANALYTICS, openParams)
            : null,
        }
      })
      .sort((a, b) => b.createdTs - a.createdTs)
  }, [goTo, ownerBidRows, propertyStatsRows])

  const visibleBidNotifications = useMemo(() => bidNotifications.slice(0, 4), [bidNotifications])

  const statusLegend = useMemo(() => {
    const counts = propertyStatsRows.reduce(
      (acc, row) => {
        const key = row.filterKey || row.statusKey || 'draft'
        if (acc[key] != null) acc[key] += 1
        return acc
      },
      { active: 0, booked: 0, sold: 0, draft: 0 }
    )
    return [
      { label: 'Активные', count: counts.active, color: '#0abab5' },
      { label: 'Забронированные', count: counts.booked, color: '#5eead4' },
      { label: 'Проданные', count: counts.sold, color: '#F59E0B' },
      { label: 'Черновики', count: counts.draft, color: '#EF4444' },
    ]
  }, [propertyStatsRows])

  const metrics = useMemo(
    () => [
      {
        label: 'Просмотры',
        value: formatMotNumber(totals.views),
        delta: overviewLoading ? 'Загрузка' : 'всего',
        spark: 'tiffany',
        icon: Eye,
        iconTone: 'tiffany',
      },
      {
        label: 'Тест-драйвы',
        value: formatMotNumber(totals.testDrives),
        delta: overviewLoading ? 'Загрузка' : 'заявки',
        spark: 'orange',
        icon: Car,
        iconTone: 'orange',
      },
      {
        label: 'Ставки',
        value: formatMotNumber(totals.bids),
        delta: overviewLoading ? 'Загрузка' : 'количество',
        spark: 'teal',
        icon: TrendingUp,
        iconTone: 'teal',
      },
      {
        label: 'Объекты',
        value: formatMotNumber(propertyStatsRows.length),
        delta: overviewLoading ? 'Загрузка' : 'в кабинете',
        spark: 'green',
        icon: Building2,
        iconTone: 'green',
      },
    ],
    [overviewLoading, propertyStatsRows.length, totals.bids, totals.testDrives, totals.views]
  )

  const bestTimerProperty = useMemo(() => {
    const now = Date.now()
    const withTimers = propertyStatsRows
      .map((row) => ({ row, time: parseMotTime(row.auctionEndTime) }))
      .filter(({ time }) => time && time > now)
      .sort((a, b) => a.time - b.time)
    return withTimers[0]?.row || null
  }, [propertyStatsRows])

  const chartSeries = useMemo(() => {
    const testDriveDates = testDriveRows
      .map((row) => toDateOnly(row.raw?.created_at || row.createdAt || row.startDate))
      .filter(Boolean)

    const bidDates = ownerBidRows
      .map((row) => toDateOnly(row.created_at || row.createdAt))
      .filter(Boolean)

    const propertyDates = propertyStatsRows
      .map((row) => toDateOnly(row.raw?.created_at || row.createdAt || row.date))
      .filter(Boolean)

    const chartRange = buildRangeFromDates([...testDriveDates, ...bidDates, ...propertyDates], selectedRange)
    const buckets = buildDateBuckets(chartRange)

    const viewsByBucket = buckets.map((bucket) =>
      propertyStatsRows.reduce((sum, row) => {
        const createdDate = toDateOnly(row.raw?.created_at || row.createdAt || row.date)
        if (createdDate && createdDate > bucket.value) return sum
        return sum + row.viewsValue
      }, 0)
    )

    const cumulativeCount = (dates, bucket) =>
      dates.reduce((sum, date) => (date <= bucket.value ? sum + 1 : sum), 0)

    return {
      labels: buckets.map((bucket) => bucket.label),
      views: viewsByBucket,
      testDrives: buckets.map((bucket) => cumulativeCount(testDriveDates, bucket)),
      bids: buckets.map((bucket) => cumulativeCount(bidDates, bucket)),
    }
  }, [ownerBidRows, propertyStatsRows, selectedRange, testDriveRows])

  const chartFilterLabel = useMemo(
    () => CHART_FILTERS.find((filter) => filter.id === chartMetricFilter)?.label || CHART_FILTERS[0].label,
    [chartMetricFilter]
  )

  const visibleChartSeries = useMemo(
    () =>
      chartMetricFilter === 'all'
        ? CHART_SERIES
        : CHART_SERIES.filter((series) => series.key === chartMetricFilter),
    [chartMetricFilter]
  )

  const chartMax = useMemo(() => {
    const values = visibleChartSeries.flatMap((series) => chartSeries[series.key] || [])
    const max = Math.max(0, ...values)
    if (max <= 5) return 5
    return Math.ceil(max / 5) * 5
  }, [chartSeries, visibleChartSeries])

  const lineChartData = useMemo(
    () => ({
      labels: chartSeries.labels,
      datasets: visibleChartSeries.map((series) => ({
        label: series.label,
        data: chartSeries[series.key] || [],
        borderColor: series.color,
        backgroundColor: series.backgroundColor,
        fill: series.fill,
        tension: 0.42,
        pointRadius: isMobile ? 4 : 0,
        pointHoverRadius: 5,
        pointBackgroundColor: series.color,
        borderWidth: 2.5,
      })),
    }),
    [chartSeries, isMobile, visibleChartSeries]
  )

  const lineChartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#111827',
          titleFont: { family: 'Inter', size: 12 },
          bodyFont: { family: 'Inter', size: 12 },
          padding: 10,
          cornerRadius: 8,
        },
      },
      scales: {
        x: {
          grid: { color: '#F1F5F9', drawBorder: false },
          ticks: {
            color: '#94A3B8',
            font: { family: 'Inter', size: isMobile ? 10 : 11 },
            maxRotation: 0,
            maxTicksLimit: isMobile ? 3 : undefined,
          },
          border: { display: false },
        },
        y: {
          min: 0,
          max: chartMax,
          ticks: {
            color: '#94A3B8',
            font: { family: 'Inter', size: isMobile ? 10 : 11 },
            callback: (v) => v,
          },
          grid: { color: '#F1F5F9', drawBorder: false },
          border: { display: false },
        },
      },
    }),
    [chartMax, isMobile]
  )

  const donutData = useMemo(
    () => ({
      labels: statusLegend.map((s) => s.label),
      datasets: [
        {
          data: statusLegend.map((s) => s.count),
          backgroundColor: statusLegend.map((s) => s.color),
          borderWidth: 0,
          hoverOffset: 4,
        },
      ],
    }),
    [statusLegend]
  )

  const donutOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true },
      },
    }),
    []
  )

  const mainColumn = (
    <div className="mot-main">
      <header className="mot-header mot-desktop-only">
        <h1 className="mot-header__title">Главная</h1>
        <div className="mot-header__actions">
          <div className="mot-date-control">
            <button
              type="button"
              className="mot-date-pill"
              aria-haspopup="dialog"
              aria-expanded={datePopoverOpen}
              onClick={() => {
                setDraftRange(selectedRange)
                setDatePopoverOpen((prev) => !prev)
              }}
            >
              <Calendar size={18} strokeWidth={2} aria-hidden />
              <span>{dateRangeLabel(selectedRange)}</span>
              <ChevronDown size={16} strokeWidth={2.2} aria-hidden />
            </button>
            <DateRangePopover
              open={datePopoverOpen}
              draftRange={draftRange}
              selectedRange={selectedRange}
              onDraftChange={setDraftRange}
              onPreset={setDraftRange}
              onApply={handleApplyRange}
              onClose={closeDatePopover}
            />
          </div>
          <OwnerNotificationsButton
            className="mot-icon-btn"
            badgeClassName="mot-icon-btn__badge"
            badge={bidNotifications.length || null}
            items={bidNotifications}
          />
          <OwnerTestProfileMenu />
        </div>
      </header>

      <div className="mot-mob-pagehead mot-mobile-only">
        <h1 className="mot-mob-pagehead__title">Главная</h1>
        <div className="mot-date-control mot-date-control--mobile">
          <button
            type="button"
            className="mot-date-pill mot-date-pill--compact"
            aria-haspopup="dialog"
            aria-expanded={datePopoverOpen}
            onClick={() => {
              setDraftRange(selectedRange)
              setDatePopoverOpen((prev) => !prev)
            }}
          >
            <span>{dateRangeLabel(selectedRange)}</span>
            <Calendar size={16} strokeWidth={2} aria-hidden />
          </button>
          <DateRangePopover
            open={datePopoverOpen}
            draftRange={draftRange}
            selectedRange={selectedRange}
            onDraftChange={setDraftRange}
            onPreset={setDraftRange}
            onApply={handleApplyRange}
            onClose={closeDatePopover}
          />
        </div>
      </div>

      <div className="mot-content">
        <section className="mot-metrics-wrap mot-mobile-only" aria-label="Ключевые показатели">
          <div className="mot-metrics mot-metrics--scroll">
            {metrics.map((m) => {
              const Icon = m.icon
              return (
                <article key={m.label} className="mot-card mot-metric mot-metric--mobile">
                  <span className={`mot-metric__icon mot-metric__icon--${m.iconTone}`}>
                    <Icon size={17} strokeWidth={2} aria-hidden />
                  </span>
                  <span className="mot-metric__label">{m.label}</span>
                  <span className="mot-metric__value">{m.value}</span>
                  <span className="mot-metric__delta">{m.delta}</span>
                  <Sparkline variant={m.spark} className="mot-metric__spark--bottom" />
                </article>
              )
            })}
          </div>
        </section>

        <section className="mot-metrics mot-desktop-only" aria-label="Ключевые показатели">
          {metrics.map((m) => {
            const Icon = m.icon
            return (
              <article key={m.label} className="mot-card mot-metric">
                <span className={`mot-metric__icon mot-metric__icon--${m.iconTone}`}>
                  <Icon size={18} strokeWidth={2.2} aria-hidden />
                </span>
                <div className="mot-metric__head">
                  <span className="mot-metric__label">{m.label}</span>
                  <Sparkline variant={m.spark} />
                </div>
                <div className="mot-metric__figures">
                  <span className="mot-metric__value">{m.value}</span>
                  <span className="mot-metric__delta">{m.delta}</span>
                </div>
              </article>
            )
          })}
        </section>

        <section className="mot-row mot-row--chart">
          <article className="mot-card mot-chart-card">
            <div className="mot-chart-card__head">
              <h2 className="mot-card__title">Активность объектов</h2>
              <div className={`mot-chart-filter${chartFilterOpen ? ' mot-chart-filter--open' : ''}`}>
                <button
                  type="button"
                  className="mot-select-pill"
                  aria-haspopup="listbox"
                  aria-expanded={chartFilterOpen}
                  onClick={() => setChartFilterOpen((prev) => !prev)}
                >
                  {chartFilterLabel}
                  <ChevronDown size={14} strokeWidth={2.2} aria-hidden />
                </button>
                <div className="mot-chart-filter__menu" role="listbox" aria-label="Показатель графика">
                  {CHART_FILTERS.map((filter) => (
                    <button
                      key={filter.id}
                      type="button"
                      className={`mot-chart-filter__option${
                        chartMetricFilter === filter.id ? ' mot-chart-filter__option--active' : ''
                      }`}
                      role="option"
                      aria-selected={chartMetricFilter === filter.id}
                      onClick={() => {
                        setChartMetricFilter(filter.id)
                        setChartFilterOpen(false)
                      }}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mot-chart-card__legend">
              {visibleChartSeries.map((series) => (
                <span key={series.key} className="mot-legend-item">
                  <i style={{ background: series.color }} /> {series.label}
                </span>
              ))}
            </div>
            <div className="mot-chart-card__canvas">
              <Line data={lineChartData} options={lineChartOptions} />
            </div>
          </article>

          <article className="mot-card mot-best mot-desktop-only">
            <h2 className="mot-card__title">Ближайший таймер</h2>
            {bestTimerProperty ? (
              <>
                <div className="mot-best__media">
                  <img
                    src={bestTimerProperty.image}
                    alt=""
                    className="mot-best__photo"
                    loading="lazy"
                    decoding="async"
                  />
                  <span className="mot-best__badge">{formatTimerLeft(bestTimerProperty.auctionEndTime)}</span>
                </div>
                <h3 className="mot-best__name">{bestTimerProperty.title}</h3>
                <p className="mot-best__location">{bestTimerProperty.location}</p>
                <p className="mot-best__price">{bestTimerProperty.currentBid || bestTimerProperty.price}</p>
                <div className="mot-best__stats">
                  <span>
                    <Eye size={14} strokeWidth={2} aria-hidden /> {formatMotCompactNumber(bestTimerProperty.viewsValue)} просмотров
                  </span>
                  <span>
                    <TrendingUp size={14} strokeWidth={2} aria-hidden /> {formatMotNumber(bestTimerProperty.bidsValue)} ставок
                  </span>
                </div>
                <button
                  type="button"
                  className="mot-btn mot-btn--soft mot-btn--block"
                  onClick={() => goTo?.(OWNER_VIEWS.PROPERTY_ANALYTICS, { propertyId: bestTimerProperty.id })}
                >
                  Подробнее
                </button>
              </>
            ) : (
              <div className="mot-best__empty">
                <p className="mot-best__name">Активных таймеров пока нет</p>
                <p className="mot-best__location">Когда появится объект с таймером, он отобразится здесь.</p>
              </div>
            )}
          </article>
        </section>

        <section className="mot-row mot-row--triple">
          <article className="mot-card mot-activity-card">
            <div className="mot-activity-card__head">
              <h2 className="mot-card__title">Последняя активность</h2>
              <button
                type="button"
                className="mot-link-btn mot-link-btn--all mot-mobile-only"
                onClick={() => setBidDrawerOpen(true)}
              >
                Все
              </button>
            </div>
            {visibleBidNotifications.length > 0 ? (
              <ul className="mot-activity">
                {visibleBidNotifications.map((item) => (
                  <li key={item.id} className="mot-activity__item mot-activity__item--bid">
                    <ActivityIcon tone={item.tone} icon={item.icon} />
                    <div className="mot-activity__body">
                      <p className="mot-activity__title">{item.title}</p>
                      <p className="mot-activity__subtitle">{item.text}</p>
                    </div>
                    <div className="mot-activity__side">
                      <strong className="mot-activity__amount">{item.amount}</strong>
                      <time className="mot-activity__time">{item.time}</time>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mot-activity__empty">
                <span className="mot-activity__empty-icon">
                  <DollarSign size={22} strokeWidth={2.2} aria-hidden />
                </span>
                <strong>Ставок пока нет</strong>
                <p>Как только покупатели начнут торги по вашим объектам, ставки появятся здесь.</p>
              </div>
            )}
            <button type="button" className="mot-link-btn mot-desktop-only" onClick={() => setBidDrawerOpen(true)}>
              Все уведомления
            </button>
          </article>

          <article className="mot-card mot-status-card mot-desktop-only">
            <h2 className="mot-card__title">Распределение по статусам</h2>
            <div className="mot-status-card__body">
              <div className="mot-status-card__analytics">
                <div className="mot-donut-wrap">
                  <Doughnut data={donutData} options={donutOptions} />
                  <div className="mot-donut-center">
                    <span className="mot-donut-center__label">Всего</span>
                    <span className="mot-donut-center__value">{propertyStatsRows.length}</span>
                  </div>
                </div>
                <ul className="mot-status-legend">
                  {statusLegend.map((s) => (
                    <li key={s.label}>
                      <i style={{ background: s.color }} />
                      <span>{s.label}</span>
                      <strong>{s.count}</strong>
                    </li>
                  ))}
                </ul>
              </div>
              <OwnerBuyerAd className="mot-status-buyer-ad" />
            </div>
          </article>

        </section>

      </div>

      <OwnerNotificationsDrawer
        open={bidDrawerOpen}
        onClose={() => setBidDrawerOpen(false)}
        items={bidNotifications}
      />

    </div>
  )

  if (isEmbedded) return mainColumn

  return (
    <div className={`mot${menuOpen ? ' mot--menu-open' : ''}`}>
      <header className="mot-mob-topbar mot-mobile-only" aria-label="Мобильная шапка">
        <div className="mot-mob-topbar__slot mot-mob-topbar__slot--left">
          <button
            type="button"
            className="mot-mob-topbar__menu"
            aria-label="Открыть меню"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={22} strokeWidth={2} />
          </button>
        </div>
        <div className="mot-mob-topbar__brand">
          <LogoMark />
          <span className="mot-logo__text">SellYourBrick</span>
        </div>
        <div className="mot-mob-topbar__slot mot-mob-topbar__slot--right">
          <OwnerNotificationsButton
            className="mot-mob-topbar__bell"
            badgeClassName="mot-icon-btn__badge"
            iconSize={22}
            badge={bidNotifications.length || null}
            items={bidNotifications}
          />
        </div>
      </header>

      <div
        className="mot-drawer-backdrop mot-mobile-only"
        aria-hidden={!menuOpen}
        onClick={closeMenu}
      />
      <aside
        className={`mot-drawer mot-mobile-only${menuOpen ? ' mot-drawer--open' : ''}`}
        aria-label="Меню кабинета"
        aria-hidden={!menuOpen}
      >
        <div className="mot-drawer__head">
          <div className="mot-mob-topbar__brand">
            <LogoMark />
            <span className="mot-logo__text">SellYourBrick</span>
          </div>
          <button type="button" className="mot-drawer__close" aria-label="Закрыть меню" onClick={closeMenu}>
            <X size={22} />
          </button>
        </div>
        <div className="mot-sidebar__divider mot-sidebar__divider--drawer" aria-hidden />
        <nav className="mot-nav mot-nav--drawer">
          {NAV_ITEMS.map(renderNavItem)}
        </nav>
      </aside>

      <aside className="mot-sidebar mot-desktop-only">
        <div className="mot-sidebar__brand">
          <LogoMark />
          <span className="mot-logo__text">SellYourBrick</span>
        </div>
        <div className="mot-sidebar__divider" aria-hidden />

        <nav className="mot-nav" aria-label="Кабинет продавца">
          {NAV_ITEMS.map(renderNavItem)}
        </nav>

        <div className="mot-sidebar-promo">
          <div className="mot-sidebar-promo__glow" aria-hidden />
          <div className="mot-sidebar-promo__body">
            <span className="mot-sidebar-promo__tag">Режим покупателя</span>
            <p className="mot-sidebar-promo__title">Станьте покупателем</p>
            <p className="mot-sidebar-promo__text">
              Ищите и бронируйте недвижимость на платформе
            </p>
            <button type="button" className="mot-btn mot-btn--white mot-btn--sm">
              Стать покупателем
            </button>
          </div>
        </div>
      </aside>

      {mainColumn}

      <nav className="mot-tabbar mot-mobile-only" aria-label="Нижняя навигация">
        {TAB_ITEMS.map((item) => {
          if (item.fab) {
            return (
              <div key="fab" className="mot-tabbar__fab-slot">
                <Link to="/owner-add-property-test" className="mot-tabbar__fab" aria-label="Добавить">
                  <Plus size={28} strokeWidth={2.5} />
                </Link>
              </div>
            )
          }
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              className={`mot-tabbar__item${item.active ? ' mot-tabbar__item--active' : ''}`}
            >
              <Icon size={22} strokeWidth={item.active ? 2.25 : 2} aria-hidden />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

    </div>
  )
}

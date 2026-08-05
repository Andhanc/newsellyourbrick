import { useMemo, useState, useCallback, useEffect, useId, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useUser } from '@clerk/clerk-react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import {
  Building2,
  Car,
  ChevronDown,
  ChevronRight,
  Calendar,
  Eye,
  EyeOff,
  Gavel,
  Heart,
  TrendingUp,
  ExternalLink,
  Menu,
  Search,
  SlidersHorizontal,
  X,
  Plus,
  Clock,
  DollarSign,
  User,
  ArrowUpRight,
} from 'lucide-react'
import OwnerNotificationsDrawer from '../components/OwnerNotificationsDrawer'
import OwnerNotificationsButton from '../components/OwnerNotificationsButton'
import OwnerEmptyStatePanel from '../components/OwnerEmptyStatePanel'
import OwnerEmptyPropertiesIllustration from '../components/OwnerEmptyPropertiesIllustration'
import OwnerEmptyLikesIllustration from '../components/OwnerEmptyLikesIllustration'
import {
  OwnerCabinetChartSkeleton,
  OwnerCabinetEndingSoonSkeleton,
} from '../components/OwnerCabinetOverviewSkeleton'
import OwnerSupportButton from '../components/OwnerSupportButton'
import OwnerSalesAnalyticsDrawer from '../components/OwnerSalesAnalyticsDrawer'
import OwnerTestProfileMenu from '../components/OwnerTestProfileMenu'
import { useOwnerTestEmbeddedNav } from '../hooks/useOwnerTestEmbeddedNav'
import useOwnerDismissedNotifications from '../hooks/useOwnerDismissedNotifications'
import { useOwnerTestNavItems } from '../hooks/useOwnerTestNavItems'
import {
  formatOwnerTestDays,
  getOwnerTestIntlLocale,
} from '../utils/ownerTestI18n'
import {
  CLERK_DB_USER_SYNCED,
  fetchOwnerProperties,
  getOwnerPropertiesUserId,
} from '../utils/ownerPropertiesList'
import { fetchOwnerTestDriveBookings } from '../utils/ownerTestDriveList'
import { getOwnerProfileTabPath } from './ownerProfileTestTabs'
import { OWNER_TEST_STANDALONE_HREF_MAP, OWNER_VIEWS, ownerTestHref } from '../utils/ownerTestNav'
import { getPropertyCardImage } from '../utils/propertyImage'
import { getCurrencySymbol } from '../utils/currency'
import { publicAsset } from '../utils/publicAsset'
import { MOT_PROMO_IMAGES } from './mainOwnerTestPromoImages'
import { openOwnerAiChat } from '../utils/ownerCabinetChat'
import './MainOwnerTestPage.css'
import './MainOwnerTestPage.mobile.css'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
)

const MOT_TIFFANY = '#0099a9'
const MOT_EVENT_FALLBACK_IMAGE =
  '/images/external/photo-1568605114967-8130f3a36994-bc29e86e2f.jpg'
const MOT_EVENTS_EMPTY_IMAGE = publicAsset('images/owner-properties-test/owner-events-empty.png')
const CHART_LINE_TENSION = 0.42

const CHART_FILL_RGB = {
  views: '10, 186, 181',
  likes: '219, 39, 119',
  testDrives: '245, 158, 11',
  bids: '34, 197, 94',
}

function createLineFillGradient(chart, rgb) {
  const { ctx, chartArea } = chart
  if (!chartArea) return `rgba(${rgb}, 0.12)`
  const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
  gradient.addColorStop(0, `rgba(${rgb}, 0.26)`)
  gradient.addColorStop(0.7, `rgba(${rgb}, 0.06)`)
  gradient.addColorStop(1, `rgba(${rgb}, 0)`)
  return gradient
}
const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || '/api'

function toInputDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const TODAY = new Date()
const WEEK_START = new Date(TODAY)
WEEK_START.setDate(TODAY.getDate() - 6)
const MONTH_START = new Date(TODAY.getFullYear(), TODAY.getMonth(), 1)
const QUARTER_START = new Date(TODAY.getFullYear(), TODAY.getMonth() - 2, 1)

function getDefaultDateRange() {
  return {
    id: 'month',
    from: toInputDate(MONTH_START),
    to: toInputDate(TODAY),
  }
}

const SPARK_COLORS = {
  tiffany: MOT_TIFFANY,
  orange: '#F59E0B',
  teal: '#14B8A6',
  green: '#22C55E',
}

function formatMotDate(value, locale) {
  if (!value) return ''
  const date = new Date(`${value}T00:00:00`)
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' })
    .format(date)
    .replace(/\.$/, '')
}

function formatChartTooltipDate(value, locale) {
  if (!value) return ''
  const date = new Date(`${value}T00:00:00`)
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: '2-digit' })
    .format(date)
    .replace(/\.$/, '')
}

function dateRangeLabel(range, locale) {
  return `${formatMotDate(range.from, locale)} – ${formatMotDate(range.to, locale)}`
}

function parseMotNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (value == null) return 0
  const parsed = Number(String(value).replace(/[^\d.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

function formatMotNumber(value, locale) {
  const num = Number(value) || 0
  return num.toLocaleString(locale)
}

function formatMotCompactNumber(value, locale) {
  const num = Number(value) || 0
  return new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(num)
}

function parseMotTime(value) {
  if (!value) return null
  const ts = new Date(value).getTime()
  return Number.isFinite(ts) ? ts : null
}

function getDayUnitLabel(count, lang) {
  return formatOwnerTestDays(count, lang).replace(/^\d+\s*/, '').trim()
}

function formatEndingSoonRemaining(endTime, t, lang, now = Date.now()) {
  const ts = parseMotTime(endTime)
  if (!ts) return null
  const diff = Math.max(0, ts - now)
  if (diff <= 0) {
    return {
      eyebrow: t('ownerTest_propertiesTimerLeft'),
      value: t('ownerTest_timerFinished'),
      unit: '',
      finished: true,
    }
  }

  const days = Math.floor(diff / 86400000)
  if (days > 0) {
    return {
      eyebrow: t('ownerTest_propertiesTimerLeft'),
      value: String(days),
      unit: getDayUnitLabel(days, lang),
      finished: false,
    }
  }

  const hours = Math.max(1, Math.floor(diff / 3600000))
  return {
    eyebrow: t('ownerTest_propertiesTimerLeft'),
    value: String(hours),
    unit: t('timerHour'),
    finished: false,
  }
}

function EndingSoonDaysBadge({ endTime, t, lang }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(timer)
  }, [])

  const remaining = formatEndingSoonRemaining(endTime, t, lang, now)
  if (!remaining) return null

  return (
    <div className={`mot-ending-card__timer${remaining.finished ? ' mot-ending-card__timer--finished' : ''}`}>
      <div className="mot-ending-card__timer-fade" aria-hidden />
      <div className="mot-ending-card__timer-content">
        <span className="mot-ending-card__timer-eyebrow">
          <Clock size={12} strokeWidth={2.2} aria-hidden />
          {remaining.eyebrow}
        </span>
        <p className="mot-ending-card__timer-value">
          <strong>{remaining.value}</strong>
          {remaining.unit ? <span>{remaining.unit}</span> : null}
        </p>
      </div>
    </div>
  )
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

function buildDateBuckets(range, locale, maxBuckets = 90) {
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
      label: new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' })
        .format(cursor)
        .replace(/\.$/, ''),
      weekday: new Intl.DateTimeFormat(locale, { weekday: 'short' })
        .format(cursor)
        .replace(/\.$/, ''),
      dayNum: String(cursor.getDate()),
      endTs: new Date(`${value}T23:59:59.999`).getTime(),
    })
    cursor.setDate(cursor.getDate() + stepDays)
  }
  const endValue = toDateOnly(end.toISOString())
  if (buckets[buckets.length - 1]?.value !== endValue) {
    buckets.push({
      value: endValue,
      label: new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' })
        .format(end)
        .replace(/\.$/, ''),
      weekday: new Intl.DateTimeFormat(locale, { weekday: 'short' })
        .format(end)
        .replace(/\.$/, ''),
      dayNum: String(end.getDate()),
      endTs: new Date(`${endValue}T23:59:59.999`).getTime(),
    })
  }
  return buckets
}

function filterDatesInRange(dates, range) {
  if (!range?.from || !range?.to) return dates
  return dates.filter((date) => date >= range.from && date <= range.to)
}

function getTestDriveEventDate(row) {
  return toDateOnly(row.raw?.created_at || row.createdAt || row.startDate)
}

function getBidEventDate(row) {
  return toDateOnly(row.created_at || row.createdAt)
}

function countDatesUpToFiltered(dates, bucketValue) {
  return dates.reduce((sum, date) => (date <= bucketValue ? sum + 1 : sum), 0)
}

function countDatesInBucket(dates, bucketStart, nextBucketStart, rangeTo) {
  return dates.reduce((sum, date) => {
    if (date < bucketStart) return sum
    if (nextBucketStart && date >= nextBucketStart) return sum
    if (rangeTo && date > rangeTo) return sum
    return sum + 1
  }, 0)
}

function buildPerBucketCounts(dates, buckets, range) {
  const rangeTo = range?.to || buckets[buckets.length - 1]?.value || ''
  return buckets.map((bucket, index) =>
    countDatesInBucket(dates, bucket.value, buckets[index + 1]?.value, rangeTo)
  )
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

function formatBidAmount(value, currency = 'USD', locale) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '—'
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency || 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatSalePortfolioAmount(value, currency = 'USD', locale = 'ru-RU') {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '—'
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: String(currency || 'USD').toUpperCase(),
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${amount.toLocaleString(locale, { maximumFractionDigits: 0 })} ${currency || ''}`.trim()
  }
}

function formatAuctionDeadline(value, locale = 'ru-RU') {
  const ts = parseMotTime(value)
  if (!ts) return '—'
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
    .format(new Date(ts))
    .replace(/\.$/, '')
}

function AuctionCountdown({ endTime, copy }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const endTs = parseMotTime(endTime)
  const diff = endTs ? Math.max(0, endTs - now) : 0
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  const seconds = Math.floor((diff % 60000) / 1000)
  const clock = [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':')

  return (
    <span className="mot-finance__auction-time" aria-label={copy.timeLeft}>
      <small><Clock size={13} aria-hidden />{copy.timeLeft}</small>
      <strong>
        {!endTs || diff <= 0 ? copy.finished : (
          <>
            {days > 0 ? <span>{days}{copy.daysShort}</span> : null}
            <span>{clock}</span>
          </>
        )}
      </strong>
    </span>
  )
}

function formatRelativeTime(value, t, locale) {
  const ts = parseMotTime(value)
  if (!ts) return ''
  const diff = Date.now() - ts
  if (diff < 60000) return t('ownerTest_timeJustNow')
  if (diff < 3600000) {
    return t('ownerTest_timeMinutesAgo', { count: Math.max(1, Math.floor(diff / 60000)) })
  }
  if (diff < 86400000) return t('ownerTest_timeHoursAgo', { count: Math.floor(diff / 3600000) })
  if (diff < 604800000) return t('ownerTest_timeDaysAgo', { count: Math.floor(diff / 86400000) })
  return formatMotDate(toDateOnly(new Date(ts).toISOString()), locale)
}

function DateRangePopover({ open, draftRange, onDraftChange, onPreset, onApply, onClose, t, locale, datePresets }) {
  return (
    <div
      className={`mot-date-popover${open ? ' mot-date-popover--open' : ''}`}
      role="dialog"
      aria-hidden={!open}
      aria-label={t('ownerTest_dateRangeTitle')}
    >
      <div className="mot-date-popover__head">
        <span className="mot-date-popover__eyebrow">{t('ownerTest_dateRangeTitle')}</span>
        <strong>{dateRangeLabel(draftRange, locale)}</strong>
      </div>
      <div className="mot-date-popover__presets" aria-label={t('ownerTest_ariaQuickPeriod')}>
        {datePresets.map((preset) => {
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
        <label className="mot-date-popover__field">
          <span>{t('ownerTest_dateFrom')}</span>
          <input
            type="date"
            value={draftRange.from}
            onChange={(event) => onDraftChange({ ...draftRange, from: event.target.value })}
          />
        </label>
        <label className="mot-date-popover__field">
          <span>{t('ownerTest_dateTo')}</span>
          <input
            type="date"
            value={draftRange.to}
            onChange={(event) => onDraftChange({ ...draftRange, to: event.target.value })}
          />
        </label>
      </div>
      <div className="mot-date-popover__actions">
        <button type="button" className="mot-date-popover__ghost" onClick={onClose}>
          {t('ownerTest_dateCancel')}
        </button>
        <button type="button" className="mot-date-popover__apply" onClick={onApply}>
          {t('ownerTest_dateApply')}
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
          <stop offset="0%" stopColor="#33adbb" />
          <stop offset="100%" stopColor="#007d8a" />
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

const SPARK_PATHS = {
  tiffany: 'M2 18 C8 14, 10 8, 16 10 S24 6, 30 4 S38 12, 46 8',
  orange: 'M2 17 C10 13, 14 19, 22 15 S32 9, 40 13 S44 7, 46 11',
  teal: 'M2 19 C9 15, 13 11, 20 13 S30 8, 38 10 S44 5, 46 9',
  green: 'M2 16 C10 12, 14 18, 22 14 S32 8, 40 12 S44 6, 46 10',
}

function Sparkline({ variant, className = '', filled = false }) {
  const stroke = SPARK_COLORS[variant] || SPARK_COLORS.tiffany
  const path = SPARK_PATHS[variant] || SPARK_PATHS.tiffany
  const areaPath = `${path} L46 22 L2 22 Z`
  return (
    <svg className={`mot-metric__spark ${className}`.trim()} viewBox="0 0 48 22" aria-hidden>
      {filled && <path d={areaPath} fill={stroke} fillOpacity="0.14" />}
      <path d={path} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

const ACTIVITY_TONES = {
  blue: { bg: '#e8f1f4', fg: MOT_TIFFANY },
  teal: { bg: MOT_TIFFANY, fg: '#ffffff' },
  green: { bg: '#e8f1f4', fg: '#22C55E' },
  orange: { bg: '#fff7ed', fg: '#F59E0B' },
  red: { bg: '#fef2f2', fg: '#EF4444' },
}

function EndingSoonPropertyCard({ property, onOpen, t, lang }) {
  return (
    <article className="mot-ending-card">
      <div className="mot-ending-card__media">
        <img
          src={property.image || MOT_EVENT_FALLBACK_IMAGE}
          alt=""
          className="mot-ending-card__photo"
          loading="lazy"
          decoding="async"
          onError={(event) => {
            if (event.currentTarget.src !== MOT_EVENT_FALLBACK_IMAGE) {
              event.currentTarget.src = MOT_EVENT_FALLBACK_IMAGE
            }
          }}
        />
        <EndingSoonDaysBadge endTime={property.auctionEndTime} t={t} lang={lang} />
      </div>
      <div className="mot-ending-card__body">
        <h3 className="mot-ending-card__title">{property.title}</h3>
        <p className="mot-ending-card__meta">{property.location || property.currentBid || property.price}</p>
        <button type="button" className="mot-ending-card__go" onClick={() => onOpen?.(property)}>
          {t('ownerTest_endingSoonGo')}
        </button>
      </div>
    </article>
  )
}

function EndingSoonPropertiesStrip({
  properties,
  hasNoProperties,
  onAddProperty,
  onOpenProperty,
  onViewAll,
  t,
  lang,
  title,
}) {
  const scrollRef = useRef(null)
  const [activeDot, setActiveDot] = useState(0)
  const visibleCount = 4
  const visibleProperties = properties.slice(0, visibleCount)
  const overflowCount = Math.max(0, properties.length - visibleCount)
  const slideCount = visibleProperties.length + (overflowCount > 0 ? 1 : 0)

  const updateActiveDot = useCallback(() => {
    const scroller = scrollRef.current
    if (!scroller) return

    const cards = Array.from(scroller.children)
    if (!cards.length) return

    const center = scroller.scrollLeft + scroller.clientWidth / 2
    let nextIndex = 0
    let minDistance = Infinity

    cards.forEach((card, index) => {
      const cardCenter = card.offsetLeft + card.offsetWidth / 2
      const distance = Math.abs(center - cardCenter)
      if (distance < minDistance) {
        minDistance = distance
        nextIndex = index
      }
    })

    setActiveDot(nextIndex)
  }, [])

  useEffect(() => {
    updateActiveDot()
  }, [properties.length, updateActiveDot])

  if (hasNoProperties) {
    return (
      <section className="mot-ending-strip mot-ending-strip--empty" aria-label={title}>
        <div className="mot-section-head">
          <h2 className="mot-section-head__title">{title}</h2>
        </div>
        <OwnerEmptyStatePanel
          illustration={OwnerEmptyPropertiesIllustration}
          title={t('ownerTest_emptyNoPropertiesTitle')}
          description={t('ownerTest_emptyNoPropertiesDesc')}
          actionLabel={t('ownerTest_ariaAddProperty')}
          onAction={onAddProperty}
        />
      </section>
    )
  }

  return (
    <section className="mot-ending-strip" aria-label={title}>
      <div className="mot-section-head">
        <h2 className="mot-section-head__title">{title}</h2>
        {onViewAll ? (
          <button type="button" className="mot-section-head__link mot-desktop-only" onClick={onViewAll}>
            {t('ownerTest_propertiesTabAll')}
          </button>
        ) : null}
      </div>
      <div className="mot-ending-strip__scroll" ref={scrollRef} onScroll={updateActiveDot}>
        {visibleProperties.map((property) => (
          <EndingSoonPropertyCard
            key={property.statsKey || property.id}
            property={property}
            onOpen={onOpenProperty}
            t={t}
            lang={lang}
          />
        ))}
        {overflowCount > 0 ? (
          <button
            type="button"
            className="mot-ending-card mot-ending-card--more"
            onClick={onViewAll}
            aria-label={t('ownerTest_endingSoonSeeMore')}
          >
            <div className="mot-ending-card__more-inner">
              <span className="mot-ending-card__more-count" aria-hidden>
                +{overflowCount}
              </span>
              <span className="mot-ending-card__more-hint">{t('ownerTest_endingSoonMoreObjects')}</span>
              <span className="mot-ending-card__more-label">
                {t('ownerTest_endingSoonSeeMore')}
                <ChevronRight size={16} strokeWidth={2.4} aria-hidden />
              </span>
            </div>
          </button>
        ) : null}
      </div>
      {slideCount > 1 ? (
        <div className="mot-ending-strip__dots" aria-hidden>
          {Array.from({ length: slideCount }, (_, index) => (
            <span
              key={index}
              className={`mot-ending-strip__dot${
                activeDot === index ? ' mot-ending-strip__dot--active' : ''
              }`}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}

function MetricNavLink({ href, ariaLabel, className = '' }) {
  return (
    <Link
      to={href}
      className={`mot-metric__link${className ? ` ${className}` : ''}`}
      aria-label={ariaLabel}
    >
      <ExternalLink size={20} strokeWidth={2.25} aria-hidden />
    </Link>
  )
}

function getOwnerMetricHref(metricId, isEmbedded) {
  switch (metricId) {
    case 'views':
      return isEmbedded
        ? ownerTestHref(OWNER_VIEWS.PROFILE, { tab: 'statistics' })
        : '/owner-profile-test?tab=statistics'
    case 'testDrives':
      return isEmbedded
        ? ownerTestHref(OWNER_VIEWS.TEST_DRIVE)
        : OWNER_TEST_STANDALONE_HREF_MAP.testdrive
    case 'bids':
      return isEmbedded
        ? ownerTestHref(OWNER_VIEWS.PROPERTIES)
        : OWNER_TEST_STANDALONE_HREF_MAP.properties
    case 'properties':
      return isEmbedded
        ? ownerTestHref(OWNER_VIEWS.PROPERTIES)
        : OWNER_TEST_STANDALONE_HREF_MAP.properties
    default:
      return isEmbedded ? ownerTestHref(OWNER_VIEWS.HOME) : OWNER_TEST_STANDALONE_HREF_MAP.home
  }
}

function MotRatingPromoCard({ t, goTo }) {
  const promoHref = OWNER_TEST_STANDALONE_HREF_MAP.subscriptions

  const content = (
    <>
      <span className="mot-rating-promo__bg" aria-hidden />
      <span className="mot-rating-promo__shine" aria-hidden />
      <span className="mot-rating-promo__wash" aria-hidden />
      <div className="mot-rating-promo__copy">
        <span className="mot-rating-promo__badge">{t('ownerTest_ratingPromoBadge')}</span>
        <h2 className="mot-rating-promo__title">{t('ownerTest_ratingPromoTitle')}</h2>
        <p className="mot-rating-promo__text">{t('ownerTest_ratingPromoText')}</p>
        <span className="mot-rating-promo__cta">{t('ownerTest_ratingPromoBtn')}</span>
      </div>
      <div className="mot-rating-promo__art-wrap" aria-hidden>
        <span className="mot-rating-promo__art-glow" />
        <img
          src={MOT_PROMO_IMAGES.ratingBoostBanner}
          alt=""
          className="mot-rating-promo__art"
          loading="lazy"
          decoding="async"
        />
      </div>
    </>
  )

  return (
    <article className="mot-rating-promo">
      {goTo ? (
        <button type="button" className="mot-rating-promo__surface" onClick={() => goTo(OWNER_VIEWS.SUBSCRIPTIONS)}>
          {content}
        </button>
      ) : (
        <Link to={promoHref} className="mot-rating-promo__surface">
          {content}
        </Link>
      )}
    </article>
  )
}

function ActivityIcon({ tone, icon: Icon }) {
  const c = ACTIVITY_TONES[tone] || ACTIVITY_TONES.blue
  const ResolvedIcon = Icon || TrendingUp
  return (
    <span className="mot-activity__icon mot-desktop-only" style={{ background: c.bg, color: c.fg }}>
      <ResolvedIcon size={18} strokeWidth={2.2} />
    </span>
  )
}

function ActivityEventRow({ item, openLabel }) {
  const imageSrc = item.propertyImage || MOT_EVENT_FALLBACK_IMAGE

  return (
    <li className="mot-activity__item mot-activity__item--bid">
      <span className="mot-activity__photo">
        <img
          src={imageSrc}
          alt=""
          loading="lazy"
          onError={(event) => {
            if (event.currentTarget.src !== MOT_EVENT_FALLBACK_IMAGE) {
              event.currentTarget.src = MOT_EVENT_FALLBACK_IMAGE
            }
          }}
        />
      </span>
      <ActivityIcon tone={item.tone} icon={item.icon} />
      <div className="mot-activity__body">
        <p className="mot-activity__title">{item.propertyTitle || item.title}</p>
        <p className="mot-activity__subtitle">{item.summary || item.text}</p>
      </div>
      <div className="mot-activity__side mot-desktop-only">
        <strong className="mot-activity__amount">{item.amount}</strong>
        <time className="mot-activity__time">{item.time}</time>
      </div>
      {item.onAction ? (
        <button type="button" className="mot-activity__go" aria-label={openLabel} onClick={item.onAction}>
          <ChevronRight size={20} strokeWidth={2.2} aria-hidden />
        </button>
      ) : item.href ? (
        <Link to={item.href} className="mot-activity__go" aria-label={openLabel}>
          <ChevronRight size={20} strokeWidth={2.2} aria-hidden />
        </Link>
      ) : null}
    </li>
  )
}

function MotMobileHeroAvatar({ ariaLabel }) {
  const { user } = useUser()
  const gradientId = useId()
  const imageUrl = user?.imageUrl

  return (
    <Link to={getOwnerProfileTabPath('personal')} className="mot-mob-hero__avatar" aria-label={ariaLabel}>
      {imageUrl ? (
        <img src={imageUrl} alt="" className="mot-mob-hero__avatar-img" />
      ) : (
        <span className="mot-mob-hero__avatar-fallback" aria-hidden>
          <svg viewBox="0 0 40 40">
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#33adbb" />
                <stop offset="100%" stopColor="#007d8a" />
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
  const { t, i18n } = useTranslation()
  const { user } = useUser()
  const intlLocale = useMemo(() => getOwnerTestIntlLocale(i18n.language), [i18n.language])
  const lang = i18n.language
  const { isEmbedded, goTo } = useOwnerTestEmbeddedNav()
  const navItems = useOwnerTestNavItems({
    activeId: 'home',
    ...(isEmbedded ? {} : { hrefMap: OWNER_TEST_STANDALONE_HREF_MAP }),
  })
  const [menuOpen, setMenuOpen] = useState(false)
  const [datePopoverOpen, setDatePopoverOpen] = useState(false)
  const [chartFilterOpen, setChartFilterOpen] = useState(false)
  const [chartMetricFilter, setChartMetricFilter] = useState('all')
  const [chartMode, setChartMode] = useState('trend')
  const [mobileChartVisible, setMobileChartVisible] = useState({
    views: true,
    likes: true,
  })
  const [selectedRange, setSelectedRange] = useState(getDefaultDateRange)
  const [draftRange, setDraftRange] = useState(getDefaultDateRange)
  const [ownerProperties, setOwnerProperties] = useState([])
  const [testDriveRows, setTestDriveRows] = useState([])
  const [ownerBidRows, setOwnerBidRows] = useState([])
  const [bidDrawerOpen, setBidDrawerOpen] = useState(false)
  const [analyticsDrawerOpen, setAnalyticsDrawerOpen] = useState(false)
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [portfolioAmountVisible, setPortfolioAmountVisible] = useState(true)
  const isMobile = useMotMobile()

  const datePresets = useMemo(
    () => [
      {
        id: 'week',
        label: t('ownerTest_datePreset7d'),
        from: toInputDate(WEEK_START),
        to: toInputDate(TODAY),
      },
      {
        id: 'month',
        label: t('ownerTest_datePresetMonth'),
        from: toInputDate(MONTH_START),
        to: toInputDate(TODAY),
      },
      {
        id: 'quarter',
        label: t('ownerTest_datePresetQuarter'),
        from: toInputDate(QUARTER_START),
        to: toInputDate(TODAY),
      },
    ],
    [t]
  )

  const figmaLabels = useMemo(() => {
    const ru = i18n.language?.startsWith('ru')
    return {
      addObject: ru ? 'Добавить объект' : 'Add property',
      activeAuctions: ru ? 'Активных аукционов' : 'Active auctions',
      allObjects: ru ? 'Всего объектов' : 'Total properties',
      bidsByObjects: ru ? 'Ставки по объектам' : 'Bids by property',
      dataForMonth: ru ? 'Данные за июнь 2026' : 'Data for June 2026',
      likes: ru ? 'Лайки объектов' : 'Property likes',
      plans: ru ? 'Смотреть планы' : 'View plans',
      search: ru ? 'Поиск...' : 'Search...',
      viewsAndLikes: ru ? 'Просмотры и лайки' : 'Views and likes',
    }
  }, [i18n.language])

  const toggleMobileChartSeries = useCallback((key) => {
    setMobileChartVisible((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      const visibleCount = Object.values(next).filter(Boolean).length
      if (visibleCount === 0) return prev
      return next
    })
  }, [])

  const chartFilters = useMemo(
    () => [
      { id: 'all', label: t('ownerTest_chartFilterAll') },
      { id: 'views', label: t('ownerTest_chartFilterViews') },
      { id: 'likes', label: figmaLabels.likes },
    ],
    [figmaLabels.likes, t]
  )

  const chartSeriesDefs = useMemo(
    () => [
      {
        key: 'views',
        label: t('ownerTest_chartFilterViews'),
        color: MOT_TIFFANY,
        backgroundColor: 'rgba(0, 153, 169, 0.12)',
        fill: true,
      },
      {
        key: 'likes',
        label: figmaLabels.likes,
        color: '#db2777',
        backgroundColor: 'transparent',
        fill: false,
      },
    ],
    [figmaLabels.likes, t]
  )

  const closeMenu = useCallback(() => setMenuOpen(false), [])
  const handleAddProperty = useCallback(() => {
    if (isEmbedded && goTo) {
      goTo(OWNER_VIEWS.ADD_PROPERTY)
      return
    }
    window.location.assign('/owner-add-property-test')
  }, [goTo, isEmbedded])
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
        const likes =
          Number(row.likesCount ?? row.likes_count ?? row.raw?.likes_count ?? row.raw?.likesCount ?? row.raw?.favorites_count) ||
          Math.max(0, Math.round(views * 0.06))
        const testDrives = testDriveCountByProperty.get(key) || 0
        const fallbackBids = Number(row.bidsCount ?? row.raw?.bids_count ?? row.raw?.bidsCount) || 0
        const bids = bidCountByProperty.get(key) ?? fallbackBids
        return {
          ...row,
          statsKey: key,
          viewsValue: views,
          likesValue: likes,
          testDrivesValue: testDrives,
          bidsValue: bids,
          totalEngagement: views + likes + testDrives + bids,
        }
      }),
    [bidCountByProperty, ownerProperties, testDriveCountByProperty]
  )

  const totals = useMemo(() => {
    const testDriveDatesInRange = filterDatesInRange(
      testDriveRows.map(getTestDriveEventDate).filter(Boolean),
      selectedRange
    )
    const bidDatesInRange = filterDatesInRange(
      ownerBidRows.map(getBidEventDate).filter(Boolean),
      selectedRange
    )

    return {
      views: propertyStatsRows.reduce((sum, row) => sum + row.viewsValue, 0),
      likes: propertyStatsRows.reduce((sum, row) => sum + row.likesValue, 0),
      testDrives: testDriveDatesInRange.length,
      bids: bidDatesInRange.length,
    }
  }, [ownerBidRows, propertyStatsRows, selectedRange, testDriveRows])

  const bidNotifications = useMemo(() => {
    const propertyByKey = new Map(propertyStatsRows.map((row) => [row.statsKey, row]))
    return ownerBidRows
      .map((bid) => {
        const table = bid.propertyTable || bid.property_table
        const propertyId = bid.propertyId || bid.property_id
        const property = propertyByKey.get(buildPropertyKey(propertyId, table))
        const propertyTitle =
          bid.propertyTitle || property?.title || t('buyerBookings_propertyFallback', { id: propertyId })
        const buyerId = bid.user_id_number || bid.user_id
        const amount = formatBidAmount(
          bid.bid_amount,
          bid.propertyCurrency || property?.currency || 'USD',
          intlLocale
        )
        const createdAt = bid.created_at || bid.createdAt
        const createdTs = parseMotTime(createdAt) || 0
        const time = formatRelativeTime(createdAt, t, intlLocale)
        const openParams = { propertyId }
        const summary = buyerId
          ? t('ownerTest_eventBidLineBuyer', { buyerId, amount, time })
          : t('ownerTest_eventBidLine', { amount, time })
        const propertyImage = getPropertyCardImage(
          property || { image: bid.propertyImage, id: propertyId },
          MOT_EVENT_FALLBACK_IMAGE
        )
        return {
          id: `bid-${bid.id || `${propertyId}-${createdTs}-${bid.bid_amount}`}`,
          tone: 'teal',
          icon: DollarSign,
          title: t('ownerTest_activityNewBid'),
          propertyTitle,
          propertyImage,
          summary,
          text: summary,
          time,
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
  }, [goTo, intlLocale, ownerBidRows, propertyStatsRows, t])

  const { dismiss: dismissBidNotification, filterItems: filterBidNotifications } =
    useOwnerDismissedNotifications()
  const activeBidNotifications = useMemo(
    () => filterBidNotifications(bidNotifications),
    [bidNotifications, filterBidNotifications]
  )
  const visibleBidNotifications = useMemo(
    () => activeBidNotifications.slice(0, 4),
    [activeBidNotifications]
  )

  const activeAuctionCount = useMemo(
    () => propertyStatsRows.filter((row) => parseMotTime(row.auctionEndTime) > Date.now()).length,
    [propertyStatsRows]
  )

  const endingSoonProperties = useMemo(() => {
    const now = Date.now()
    return propertyStatsRows
      .map((row) => ({ row, endTs: parseMotTime(row.auctionEndTime) }))
      .filter(({ endTs }) => endTs && endTs > now)
      .sort((a, b) => a.endTs - b.endTs)
      .map(({ row }) => row)
  }, [propertyStatsRows])

  const hasNoProperties = !overviewLoading && propertyStatsRows.length === 0
  const showChartEmpty = hasNoProperties

  const metrics = useMemo(
    () => [
      {
        id: 'views',
        label: t('ownerTest_metricViews'),
        value: formatMotNumber(totals.views, intlLocale),
        delta: overviewLoading ? t('ownerTest_metricLoading') : '+24%',
        spark: 'tiffany',
        icon: Eye,
        iconTone: 'tiffany',
        href: getOwnerMetricHref('views', isEmbedded),
        linkAriaLabel: t('ownerTest_profileTabStatistics'),
      },
      {
        id: 'likes',
        label: figmaLabels.likes,
        value: formatMotNumber(totals.likes, intlLocale),
        delta: overviewLoading ? t('ownerTest_metricLoading') : '+18%',
        spark: 'orange',
        icon: Heart,
        iconTone: 'pink',
        href: getOwnerMetricHref('views', isEmbedded),
        linkAriaLabel: figmaLabels.likes,
      },
      {
        id: 'auctions',
        label: figmaLabels.activeAuctions,
        value: formatMotNumber(activeAuctionCount, intlLocale),
        delta: overviewLoading ? t('ownerTest_metricLoading') : '+1',
        spark: 'teal',
        icon: Gavel,
        iconTone: 'purple',
        href: getOwnerMetricHref('bids', isEmbedded),
        linkAriaLabel: figmaLabels.activeAuctions,
      },
      {
        id: 'properties',
        label: figmaLabels.allObjects,
        value: formatMotNumber(propertyStatsRows.length, intlLocale),
        delta: overviewLoading ? t('ownerTest_metricLoading') : '+2',
        spark: 'green',
        icon: Building2,
        iconTone: 'amber',
        href: getOwnerMetricHref('properties', isEmbedded),
        linkAriaLabel: t('ownerTest_navMyProperties'),
      },
    ],
    [
      activeAuctionCount,
      figmaLabels.activeAuctions,
      figmaLabels.allObjects,
      figmaLabels.likes,
      intlLocale,
      isEmbedded,
      overviewLoading,
      propertyStatsRows.length,
      t,
      totals.likes,
      totals.views,
    ]
  )

  const chartSeries = useMemo(() => {
    const chartRange = selectedRange
    const buckets = buildDateBuckets(chartRange, intlLocale, isMobile ? 7 : 90)
    const totalViews = propertyStatsRows.reduce((sum, row) => sum + row.viewsValue, 0)
    const totalLikes = propertyStatsRows.reduce((sum, row) => sum + row.likesValue, 0)

    const testDriveDatesInRange = filterDatesInRange(
      testDriveRows.map(getTestDriveEventDate).filter(Boolean),
      chartRange
    )
    const bidDatesInRange = filterDatesInRange(
      ownerBidRows.map(getBidEventDate).filter(Boolean),
      chartRange
    )

    if (!buckets.length) {
      return { labels: [], mobileLabels: [], buckets: [], views: [], likes: [], testDrives: [], bids: [] }
    }

    const seriesValues =
      chartMode === 'total'
        ? {
            views: buckets.map(() => totalViews),
            likes: buckets.map(() => totalLikes),
            testDrives: buckets.map((bucket) => countDatesUpToFiltered(testDriveDatesInRange, bucket.value)),
            bids: buckets.map((bucket) => countDatesUpToFiltered(bidDatesInRange, bucket.value)),
          }
        : {
            views: buckets.map(() => totalViews),
            likes: buckets.map(() => totalLikes),
            testDrives: buildPerBucketCounts(testDriveDatesInRange, buckets, chartRange),
            bids: buildPerBucketCounts(bidDatesInRange, buckets, chartRange),
          }

    return {
      labels: buckets.map((bucket) => bucket.label),
      mobileLabels: buckets.map((bucket) => [bucket.weekday, bucket.dayNum]),
      buckets,
      ...seriesValues,
    }
  }, [chartMode, intlLocale, isMobile, ownerBidRows, propertyStatsRows, selectedRange, testDriveRows])

  const chartFilterLabel = useMemo(
    () => chartFilters.find((filter) => filter.id === chartMetricFilter)?.label || chartFilters[0].label,
    [chartFilters, chartMetricFilter]
  )

  const visibleChartSeries = useMemo(() => {
    if (isMobile) {
      return chartSeriesDefs.filter((series) => mobileChartVisible[series.key])
    }
    return chartMetricFilter === 'all'
      ? chartSeriesDefs
      : chartSeriesDefs.filter((series) => series.key === chartMetricFilter)
  }, [chartMetricFilter, chartSeriesDefs, isMobile, mobileChartVisible])

  const chartMax = useMemo(() => {
    const values = visibleChartSeries.flatMap((series) => chartSeries[series.key] || [])
    const max = Math.max(0, ...values)
    if (max <= 5) return 5
    return Math.ceil(max / 5) * 5
  }, [chartSeries, visibleChartSeries])

  const lineChartData = useMemo(
    () => {
      const showAreaFill = !isMobile && visibleChartSeries.length === 1

      return {
        labels: isMobile ? chartSeries.mobileLabels : chartSeries.labels,
        datasets: visibleChartSeries.map((series) => ({
          label: series.label,
          data: chartSeries[series.key] || [],
          borderColor: series.color,
          backgroundColor: (context) => {
            if (!showAreaFill) return 'transparent'
            return createLineFillGradient(context.chart, CHART_FILL_RGB[series.key])
          },
          fill: showAreaFill ? 'origin' : false,
          tension: CHART_LINE_TENSION,
          pointRadius: 0,
          pointHoverRadius: isMobile ? 6 : 5,
          pointHitRadius: 18,
          pointHoverBackgroundColor: isMobile ? '#111827' : series.color,
          pointHoverBorderColor: isMobile ? '#111827' : '#fff',
          pointHoverBorderWidth: isMobile ? 0 : 2,
          borderWidth: isMobile ? 2.75 : 2.5,
          borderCapStyle: 'round',
          borderJoinStyle: 'round',
        })),
      }
    },
    [chartSeries, isMobile, visibleChartSeries]
  )

  const lineChartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      layout: isMobile
        ? { padding: { left: 4, right: 8, top: 8, bottom: 0 } }
        : { padding: { left: 0, right: 8, top: 4, bottom: 0 } },
      interaction: { mode: isMobile ? 'nearest' : 'index', axis: 'x', intersect: false },
      elements: {
        line: { tension: CHART_LINE_TENSION },
        point: { radius: 0, hoverRadius: isMobile ? 6 : 5 },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#111827',
          titleColor: '#9ca3af',
          bodyColor: '#ffffff',
          footerColor: '#ffffff',
          titleFont: { family: 'Inter', size: 12, weight: '500' },
          bodyFont: { family: 'Inter', size: 13, weight: '600' },
          padding: isMobile ? 12 : 10,
          cornerRadius: isMobile ? 14 : 8,
          displayColors: false,
          boxPadding: 4,
          caretSize: isMobile ? 7 : 6,
          caretPadding: isMobile ? 10 : 6,
          callbacks: {
            title: (items) => {
              const bucket = chartSeries.buckets[items[0]?.dataIndex]
              return bucket ? formatChartTooltipDate(bucket.value, intlLocale) : items[0]?.label || ''
            },
            label: (context) => `${context.dataset.label}: ${formatMotNumber(context.parsed.y, intlLocale)}`,
          },
        },
        filler: { propagate: false },
      },
      scales: {
        x: {
          offset: isMobile,
          grid: {
            display: !isMobile,
            color: '#E8EDF3',
            drawBorder: false,
            borderDash: [4, 5],
          },
          ticks: {
            color: '#9ca3af',
            font: { family: 'Inter', size: isMobile ? 10 : 11, weight: '500' },
            maxRotation: 0,
            autoSkip: !isMobile,
            maxTicksLimit: isMobile ? 7 : undefined,
            padding: isMobile ? 8 : 4,
          },
          border: { display: false },
        },
        y: {
          display: !isMobile,
          min: 0,
          max: chartMax,
          ticks: {
            color: '#94A3B8',
            font: { family: 'Inter', size: 11 },
            maxTicksLimit: isMobile ? 5 : undefined,
            padding: 4,
            callback: (v) => v,
          },
          grid: {
            display: !isMobile,
            color: '#E8EDF3',
            drawBorder: false,
            borderDash: [4, 5],
          },
          border: { display: false },
        },
      },
    }),
    [chartMax, chartSeries.buckets, intlLocale, isMobile]
  )

  const dashboardCopy = useMemo(() => {
    const ru = i18n.language?.startsWith('ru')
    return ru
      ? {
          eyebrow: 'Портфель продавца',
          title: 'Аналитика',
          menu: 'Меню',
          profile: 'Профиль',
          hello: user?.firstName ? `Добрый день, ${user.firstName}` : 'Добрый день',
          portfolioLabel: 'Стоимость всех объектов',
          live: 'Данные обновлены',
          properties: 'Мои объекты',
          propertiesHint: 'Объекты в вашем портфеле',
          bookings: 'Бронирования',
          bookingsHint: 'Заявки на просмотр',
          aiAssistant: 'ИИ-помощник',
          pending: 'ожидают ответа',
          add: 'Добавить',
          addHint: 'Новый объект',
          open: 'Открыть',
          upcoming: 'Ближайшие аукционы',
          upcomingHint: 'Ваши объекты с ближайшим завершением торгов',
          all: 'Все объекты',
          noAuctions: 'Ближайших аукционов пока нет',
          noAuctionsHint: 'Когда вы запустите торги, они появятся здесь в порядке завершения.',
          noProperties: 'Добавьте первый объект, чтобы увидеть аналитику портфеля.',
          currentBid: 'Текущая ставка',
          noBids: 'Ставок нет',
          timeLeft: 'До завершения',
          finished: 'Завершён',
          daysShort: 'д ',
          statusActive: 'Идут торги',
        }
      : {
          eyebrow: 'Seller portfolio',
          title: 'Analytics',
          menu: 'Menu',
          profile: 'Profile',
          hello: user?.firstName ? `Good afternoon, ${user.firstName}` : 'Good afternoon',
          portfolioLabel: 'Value of all properties',
          live: 'Up to date',
          properties: 'My properties',
          propertiesHint: 'Properties in your portfolio',
          bookings: 'Bookings',
          bookingsHint: 'Viewing requests',
          aiAssistant: 'AI assistant',
          pending: 'need a response',
          add: 'Add',
          addHint: 'New property',
          open: 'Open',
          upcoming: 'Upcoming auctions',
          upcomingHint: 'Your auctions ending soonest',
          all: 'All properties',
          noAuctions: 'No upcoming auctions yet',
          noAuctionsHint: 'Once you start an auction, it will appear here ordered by end time.',
          noProperties: 'Add your first property to see portfolio analytics.',
          currentBid: 'Current bid',
          noBids: 'No bids yet',
          timeLeft: 'Time left',
          finished: 'Finished',
          daysShort: 'd ',
          statusActive: 'Live auction',
        }
  }, [i18n.language, user?.firstName])

  const salePortfolio = useMemo(() => {
    const totalsByCurrency = new Map()
    propertyStatsRows.forEach((row) => {
      const price = Number(row.priceAmount)
      if (!Number.isFinite(price) || price <= 0) return
      const currency = String(row.currency || 'USD').toUpperCase()
      totalsByCurrency.set(currency, (totalsByCurrency.get(currency) || 0) + price)
    })

    const entries = [...totalsByCurrency.entries()].sort((a, b) => b[1] - a[1])
    const [primaryCurrency = 'USD', primaryTotal = 0] = entries[0] || []
    return {
      primaryCurrency,
      primaryTotal,
      formatted: formatSalePortfolioAmount(primaryTotal, primaryCurrency, intlLocale),
    }
  }, [intlLocale, propertyStatsRows])

  const activeBookings = useMemo(
    () => testDriveRows.filter((row) => row.statusKey !== 'cancelled'),
    [testDriveRows]
  )
  const pendingBookingCount = useMemo(
    () => testDriveRows.filter((row) => row.statusKey === 'pending').length,
    [testDriveRows]
  )
  const propertyPreviewRows = useMemo(() => propertyStatsRows.slice(0, 3), [propertyStatsRows])
  const bookingPreviewRows = useMemo(
    () => [...activeBookings]
      .sort((a, b) => (parseMotTime(a.startDate) || Infinity) - (parseMotTime(b.startDate) || Infinity))
      .slice(0, 3),
    [activeBookings]
  )

  const openOwnerView = useCallback((view, params = {}) => {
    if (goTo) {
      goTo(view, params)
      return
    }
    window.location.assign(ownerTestHref(view, params))
  }, [goTo])

  const openCabinetMenu = useCallback(() => {
    window.dispatchEvent(new CustomEvent('owner-test:open-menu'))
  }, [])

  const mainColumn = (
    <div className="mot-main mot-finance">
      <main className="mot-finance__canvas">
        <section className="mot-finance__wallet" aria-label={dashboardCopy.portfolioLabel}>
          <div className="mot-finance__wallet-head">
            <button type="button" className="mot-finance__menu-button" onClick={openCabinetMenu}>
              <Menu size={18} strokeWidth={2} aria-hidden />
              <span>{dashboardCopy.menu}</span>
            </button>
            <div className="mot-finance__wallet-actions">
              <button
                type="button"
                className="mot-finance__analytics-button"
                aria-haspopup="dialog"
                aria-expanded={analyticsDrawerOpen}
                onClick={() => setAnalyticsDrawerOpen(true)}
              >
                <span>{dashboardCopy.title}</span>
                <ArrowUpRight size={16} strokeWidth={2.2} aria-hidden />
              </button>
              <button
                type="button"
                className="mot-finance__profile-button"
                aria-label={dashboardCopy.profile}
                onClick={() => openOwnerView(OWNER_VIEWS.PROFILE, { tab: 'personal' })}
              >
                <User size={18} strokeWidth={2} aria-hidden />
              </button>
            </div>
          </div>

          <div className={`mot-finance__balance${overviewLoading ? ' mot-finance__balance--loading' : ''}`}>
            <div className="mot-finance__balance-line">
              {overviewLoading ? (
                <span className="mot-finance__shimmer mot-finance__shimmer--balance" aria-hidden />
              ) : (
                <strong aria-live="polite">
                  {portfolioAmountVisible
                    ? salePortfolio.formatted
                    : `•••••• ${getCurrencySymbol(salePortfolio.primaryCurrency).trim()}`}
                </strong>
              )}
              <button
                type="button"
                className="mot-finance__balance-visibility"
                aria-label={t(portfolioAmountVisible ? 'walletPage_hideBalance' : 'walletPage_showBalance')}
                aria-pressed={!portfolioAmountVisible}
                disabled={overviewLoading}
                onClick={() => setPortfolioAmountVisible((visible) => !visible)}
              >
                {portfolioAmountVisible ? (
                  <EyeOff size={21} strokeWidth={2} aria-hidden />
                ) : (
                  <Eye size={21} strokeWidth={2} aria-hidden />
                )}
              </button>
            </div>
          </div>

          <div className="mot-finance__quick-grid" aria-label={t('ownerTest_ariaKeyMetrics')}>
          <button
            type="button"
            className="mot-finance__quick-card mot-finance__quick-card--properties"
            onClick={() => openOwnerView(OWNER_VIEWS.PROPERTIES)}
          >
            <span className="mot-finance__quick-card-top">
              <span className="mot-finance__quick-icon"><Building2 size={19} aria-hidden /></span>
              {propertyPreviewRows.length > 0 ? (
                <span className="mot-finance__thumb-stack" aria-hidden>
                  {propertyPreviewRows.map((row) => (
                    <img key={row.statsKey || row.id} src={row.image || MOT_EVENT_FALLBACK_IMAGE} alt="" />
                  ))}
                </span>
              ) : null}
            </span>
            <span className="mot-finance__quick-title">{dashboardCopy.properties}</span>
            <strong>{overviewLoading ? '—' : formatMotNumber(propertyStatsRows.length, intlLocale)}</strong>
            <span className="mot-finance__quick-hint">{dashboardCopy.propertiesHint}</span>
            <ArrowUpRight className="mot-finance__quick-arrow" size={18} strokeWidth={2.2} aria-hidden />
          </button>

          <button
            type="button"
            className="mot-finance__quick-card mot-finance__quick-card--bookings"
            onClick={() => openOwnerView(OWNER_VIEWS.TEST_DRIVE)}
          >
            <span className="mot-finance__quick-card-top">
              <span className="mot-finance__quick-icon"><Calendar size={19} aria-hidden /></span>
              {bookingPreviewRows.length > 0 ? (
                <span className="mot-finance__thumb-stack" aria-hidden>
                  {bookingPreviewRows.map((row) => (
                    <img key={row.id} src={row.image || MOT_EVENT_FALLBACK_IMAGE} alt="" />
                  ))}
                </span>
              ) : null}
            </span>
            <span className="mot-finance__quick-title">{dashboardCopy.bookings}</span>
            <strong>{overviewLoading ? '—' : formatMotNumber(activeBookings.length, intlLocale)}</strong>
            <span className="mot-finance__quick-hint">
              {pendingBookingCount > 0
                ? `${pendingBookingCount} ${dashboardCopy.pending}`
                : dashboardCopy.bookingsHint}
            </span>
            <ArrowUpRight className="mot-finance__quick-arrow" size={18} strokeWidth={2.2} aria-hidden />
          </button>

          <button
            type="button"
            className="mot-finance__quick-card mot-finance__quick-card--add"
            onClick={handleAddProperty}
          >
            <span className="mot-finance__add-icon"><Plus size={23} strokeWidth={2.2} aria-hidden /></span>
            <span className="mot-finance__quick-title">{dashboardCopy.add}</span>
            <span className="mot-finance__quick-hint">{dashboardCopy.addHint}</span>
            <ArrowUpRight className="mot-finance__add-arrow" size={20} strokeWidth={2.2} aria-hidden />
          </button>
          </div>
        </section>

        <nav className="mot-finance__action-bar" aria-label={t('ownerTest_ariaKeyMetrics')}>
          <button type="button" onClick={() => openOwnerView(OWNER_VIEWS.PROPERTIES)}>
            <span><Building2 size={21} strokeWidth={1.9} aria-hidden /></span>
            {dashboardCopy.properties}
          </button>
          <button type="button" onClick={() => openOwnerView(OWNER_VIEWS.TEST_DRIVE)}>
            <span><Calendar size={21} strokeWidth={1.9} aria-hidden /></span>
            {dashboardCopy.bookings}
          </button>
          <button type="button" onClick={openOwnerAiChat} aria-label={t('ownerTest_supportAi')}>
            <span className="mot-finance__action-ai-mark" aria-hidden>AI</span>
            {dashboardCopy.aiAssistant}
          </button>
          <button type="button" onClick={handleAddProperty}>
            <span><Plus size={23} strokeWidth={1.9} aria-hidden /></span>
            {dashboardCopy.add}
          </button>
        </nav>

        <section className="mot-finance__auctions" aria-labelledby="mot-upcoming-auctions-heading">
          <div className="mot-finance__sheet-handle" aria-hidden />
          <div className="mot-finance__section-head">
            <div>
              <h2 id="mot-upcoming-auctions-heading">{dashboardCopy.upcoming}</h2>
              <p>{dashboardCopy.upcomingHint}</p>
            </div>
            <button type="button" onClick={() => openOwnerView(OWNER_VIEWS.PROPERTIES)}>
              {dashboardCopy.all}
              <ArrowUpRight size={17} strokeWidth={2.2} aria-hidden />
            </button>
          </div>

          {overviewLoading ? (
            <div className="mot-finance__auction-loading" aria-busy="true">
              {[0, 1, 2].map((item) => <span key={item} className="mot-finance__shimmer" />)}
            </div>
          ) : endingSoonProperties.length > 0 ? (
            <div className="mot-finance__auction-list">
              {endingSoonProperties.slice(0, 5).map((property) => (
                <button
                  key={property.statsKey || property.id}
                  type="button"
                  className="mot-finance__auction-row"
                  onClick={() => openOwnerView(OWNER_VIEWS.PROPERTY_ANALYTICS, { propertyId: property.id })}
                >
                  <img src={property.image || MOT_EVENT_FALLBACK_IMAGE} alt="" />
                  <span className="mot-finance__auction-copy">
                    <strong>{property.title}</strong>
                  </span>
                  <span className="mot-finance__auction-price">
                    <small>{dashboardCopy.currentBid}</small>
                    <strong>
                      {Number(property.currentBidAmount) > 0
                        ? formatSalePortfolioAmount(property.currentBidAmount, property.currency, intlLocale)
                        : dashboardCopy.noBids}
                    </strong>
                  </span>
                  <AuctionCountdown endTime={property.auctionEndTime} copy={dashboardCopy} />
                  <span className="mot-finance__auction-open"><ChevronRight size={19} aria-hidden /></span>
                </button>
              ))}
            </div>
          ) : (
            <div className="mot-finance__empty">
              <span><Gavel size={25} strokeWidth={1.8} aria-hidden /></span>
              <div>
                <strong>{hasNoProperties ? dashboardCopy.noProperties : dashboardCopy.noAuctions}</strong>
                {!hasNoProperties ? <p>{dashboardCopy.noAuctionsHint}</p> : null}
              </div>
              <button type="button" onClick={handleAddProperty}>
                {dashboardCopy.add}
                <ArrowUpRight size={17} strokeWidth={2.2} aria-hidden />
              </button>
            </div>
          )}
        </section>
      </main>
      <OwnerSalesAnalyticsDrawer
        open={analyticsDrawerOpen}
        onClose={() => setAnalyticsDrawerOpen(false)}
        properties={propertyStatsRows}
        bids={ownerBidRows}
        locale={intlLocale}
        language={i18n.language}
        loading={overviewLoading}
      />
    </div>
  )

  if (isEmbedded) {
    return <div className="mot mot--embedded">{mainColumn}</div>
  }

  return (
    <div className={`mot${menuOpen ? ' mot--menu-open' : ''}`}>
      <header className="mot-mob-topbar mot-mobile-only" aria-label={t('ownerTest_ariaMobileHeader')}>
        <div className="mot-mob-topbar__slot mot-mob-topbar__slot--left">
          <button
            type="button"
            className="mot-mob-topbar__menu"
            aria-label={t('ownerTest_ariaOpenMenu')}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={22} strokeWidth={2} />
          </button>
        </div>
        <div className="mot-mob-topbar__brand">
          <LogoMark />
          <span className="mot-logo__text">{t('ownerTest_brandName')}</span>
        </div>
        <div className="mot-mob-topbar__slot mot-mob-topbar__slot--right">
          <OwnerSupportButton className="mot-mob-topbar__bell" iconSize={22} />
          <OwnerNotificationsButton
            className="mot-mob-topbar__bell"
            badgeClassName="mot-icon-btn__badge"
            iconSize={22}
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
        aria-label={t('ownerTest_ariaCabinetMenu')}
        aria-hidden={!menuOpen}
      >
        <div className="mot-drawer__head">
          <div className="mot-mob-topbar__brand">
            <LogoMark />
            <span className="mot-logo__text">{t('ownerTest_brandName')}</span>
          </div>
          <button type="button" className="mot-drawer__close" aria-label={t('ownerTest_ariaCloseMenu')} onClick={closeMenu}>
            <X size={22} />
          </button>
        </div>
        <div className="mot-sidebar__divider mot-sidebar__divider--drawer" aria-hidden />
        <nav className="mot-nav mot-nav--drawer">
          {navItems.map(renderNavItem)}
        </nav>
      </aside>

      <aside className="mot-sidebar mot-desktop-only">
        <div className="mot-sidebar__brand">
          <LogoMark />
          <span className="mot-logo__text">{t('ownerTest_brandName')}</span>
        </div>
        <div className="mot-sidebar__divider" aria-hidden />

        <nav className="mot-nav" aria-label={t('ownerTest_ariaSellerCabinet')}>
          {navItems.map(renderNavItem)}
        </nav>

        <div className="mot-sidebar-promo">
          <div className="mot-sidebar-promo__glow" aria-hidden />
          <div className="mot-sidebar-promo__body">
            <span className="mot-sidebar-promo__tag">{t('ownerTest_adBuyerTitle')}</span>
            <p className="mot-sidebar-promo__title">{t('heroPitchBecomeBuyerCta')}</p>
            <p className="mot-sidebar-promo__text">{t('heroPitchBecomeBuyerBody')}</p>
            <button type="button" className="mot-btn mot-btn--white mot-btn--sm">
              {t('heroPitchBecomeBuyerCta')}
            </button>
          </div>
        </div>
      </aside>

      {mainColumn}

    </div>
  )
}

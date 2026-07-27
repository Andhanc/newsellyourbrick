import { OWNER_PROP_IMAGES } from './ownerPropertiesTestImages'
import { getOwnerTestIntlLocale } from '../utils/ownerTestI18n'

/** @deprecated Use getOwnerListingTypeLabels(t) */
export const OWNER_LISTING_TYPE_LABELS = {}

export function getOwnerListingTypeLabels(t) {
  return {
    auction: t('ownerTest_propertiesTypeAuction'),
    buy_now: t('ownerTest_propertiesTypeBuyNow'),
    shares: t('ownerTest_propertiesTypeShares'),
    debts: t('ownerTest_propertiesTypeDebts'),
  }
}

export function getOwnerPropertyAmount(row, t) {
  if (row.listingType === 'auction') {
    return {
      label: t('bidHistoryCurrentMaxBid'),
      value: row.currentBid || row.price,
    }
  }
  return {
    label: t('propertyDetailPrice'),
    value: row.price,
  }
}

export function getOwnerPropertyAuctionTimer(row) {
  if (row.listingType !== 'auction' || !row.auctionTimer) return '—'
  return row.auctionTimer
}

const TRAFFIC_SOURCES = [
  { label: 'Поиск', pct: 45, color: '#3b82f6' },
  { label: 'Соцсети', pct: 25, color: '#0099a9' },
  { label: 'Прямые заходы', pct: 15, color: '#6366f1' },
  { label: 'Реклама', pct: 10, color: '#f59e0b' },
  { label: 'Другие', pct: 5, color: '#a855f7' },
]

function parseMetric(value) {
  if (!value || value === '—') return 0
  return Number.parseInt(String(value).replace(/\s/g, ''), 10) || 0
}

function formatMetric(value, locale) {
  const num = Number(value)
  if (!Number.isFinite(num)) return '0'
  return num.toLocaleString(locale || getOwnerTestIntlLocale(), { maximumFractionDigits: 0 })
}

function firstFiniteMetric(...values) {
  for (const value of values) {
    const num = Number(value)
    if (Number.isFinite(num)) return num
  }
  return null
}

function buildTotalSeries(total, points) {
  const value = Number(total) || 0
  if (value <= 0) return Array.from({ length: points }, () => 0)
  if (points <= 1) return [value]
  return Array.from({ length: points }, (_, index) => {
    if (index === points - 1) return value
    return 0
  })
}

export function buildOwnerPropertyAnalytics(property, locale) {
  const intlLocale = locale || getOwnerTestIntlLocale()
  const views = firstFiniteMetric(
    property.viewsCount,
    property.raw?.view_count,
    property.raw?.views_count,
    property.raw?.viewsCount
  ) ?? parseMetric(property.views)
  const likes = firstFiniteMetric(
    property.likesCount,
    property.raw?.likes_count,
    property.raw?.likesCount,
    property.raw?.favorites_count,
    property.raw?.favoritesCount
  ) ?? parseMetric(property.likes)
  const bids = firstFiniteMetric(
    property.bidsCount,
    property.raw?.bids_count,
    property.raw?.bidsCount
  ) ?? parseMetric(property.bids)
  const bookings = firstFiniteMetric(property.bookingsCount, property.raw?.booking_count) ?? parseMetric(property.bookings)
  const hasStats = views > 0 || likes > 0 || bids > 0 || bookings > 0
  const chartLabelsDesktop = ['1 мая', '8 мая', '15 мая', '22 мая', '28 мая', '31 мая']
  const chartLabelsMobile = ['1 мая', '16 мая', '31 мая']

  return {
    period: '1 мая — 31 мая 2024',
    views: formatMetric(views, intlLocale),
    viewsRaw: views,
    likes: formatMetric(likes, intlLocale),
    likesRaw: likes,
    bids: formatMetric(bids, intlLocale),
    bidsRaw: bids,
    favorites: formatMetric(likes, intlLocale),
    favoritesDelta: '',
    favoritesUp: null,
    testDrives: formatMetric(bookings, intlLocale),
    testDrivesDelta: '',
    testDrivesUp: null,
    leads: formatMetric(bookings, intlLocale),
    leadsDelta: '',
    leadsUp: null,
    avgTime: hasStats ? '3:45 мин' : '—',
    bounceRate: hasStats ? '32%' : '—',
    addedToFavorites: formatMetric(likes, intlLocale),
    shares: '—',
    trafficTotal: formatMetric(views, intlLocale),
    trafficSources: TRAFFIC_SOURCES,
    viewsChartDesktop: buildTotalSeries(views, chartLabelsDesktop.length),
    viewsChartMobile: buildTotalSeries(views, chartLabelsMobile.length),
    bidsChartDesktop: buildTotalSeries(bids, chartLabelsDesktop.length),
    bidsChartMobile: buildTotalSeries(bids, chartLabelsMobile.length),
    likesChartDesktop: buildTotalSeries(likes, chartLabelsDesktop.length),
    likesChartMobile: buildTotalSeries(likes, chartLabelsMobile.length),
    chartLabelsDesktop,
    chartLabelsMobile,
  }
}

const RAW_PROPERTIES = [
  {
    id: 'OB-1024',
    title: 'Вилла у моря',
    location: 'Майами, США',
    image: OWNER_PROP_IMAGES.thumbVilla,
    status: 'Активный',
    statusKey: 'active',
    views: '1 245',
    viewsDelta: '+12.5%',
    viewsUp: true,
    bookings: '32',
    bookingsDelta: '+8.2%',
    bookingsUp: true,
    price: '$2 450 000',
    currentBid: '$2 380 000',
    listingType: 'auction',
    auctionTimer: '1д 08:45:12',
    raw: { test_drive: 1 },
    date: '12.03.2024',
  },
  {
    id: 'OB-1025',
    title: 'Апартаменты в центре',
    location: 'Нью-Йорк, США',
    image: OWNER_PROP_IMAGES.thumbApartment,
    status: 'Забронирован',
    statusKey: 'booked',
    views: '892',
    viewsDelta: '+5.1%',
    viewsUp: true,
    bookings: '18',
    bookingsDelta: '+3.4%',
    bookingsUp: true,
    price: '$1 280 000',
    listingType: 'buy_now',
    date: '08.03.2024',
  },
  {
    id: 'OB-1026',
    title: 'Лофт с террасой',
    location: 'Барселона, Испания',
    image: OWNER_PROP_IMAGES.thumbLoft,
    status: 'Черновик',
    statusKey: 'draft',
    views: '—',
    viewsDelta: '',
    viewsUp: null,
    bookings: '—',
    bookingsDelta: '',
    bookingsUp: null,
    price: '$980 000',
    listingType: 'buy_now',
    date: '05.03.2024',
  },
  {
    id: 'OB-1027',
    title: 'Пентхаус с видом',
    location: 'Дубай, ОАЭ',
    image: OWNER_PROP_IMAGES.thumbPenthouse,
    status: 'Продан',
    statusKey: 'sold',
    views: '2 104',
    viewsDelta: '+18.2%',
    viewsUp: true,
    bookings: '41',
    bookingsDelta: '+12.0%',
    bookingsUp: true,
    price: '$3 750 000',
    listingType: 'buy_now',
    date: '28.02.2024',
  },
  {
    id: 'OB-1028',
    title: 'Коттедж у озера',
    location: 'Женева, Швейцария',
    image: OWNER_PROP_IMAGES.thumbVilla,
    status: 'Активный',
    statusKey: 'active',
    views: '756',
    viewsDelta: '−2.3%',
    viewsUp: false,
    bookings: '12',
    bookingsDelta: '+1.1%',
    bookingsUp: true,
    price: '$1 890 000',
    listingType: 'shares',
    currency: 'USD',
    priceAmount: 1890000,
    raw: {
      test_drive: 1,
      total_shares: 20,
      shares_sold: 8,
      price_per_share: 94500,
      currency: 'USD',
    },
    date: '22.02.2024',
  },
  {
    id: 'OB-1029',
    title: 'Студия у парка',
    location: 'Берлин, Германия',
    image: OWNER_PROP_IMAGES.thumbApartment,
    status: 'Забронирован',
    statusKey: 'booked',
    views: '534',
    viewsDelta: '+4.0%',
    viewsUp: true,
    bookings: '9',
    bookingsDelta: '−1.2%',
    bookingsUp: false,
    price: '$420 000',
    listingType: 'debts',
    date: '18.02.2024',
  },
  {
    id: 'OB-1030',
    title: 'Таунхаус',
    location: 'Лондон, Великобритания',
    image: OWNER_PROP_IMAGES.thumbLoft,
    status: 'Активный',
    statusKey: 'active',
    views: '1 012',
    viewsDelta: '+9.8%',
    viewsUp: true,
    bookings: '21',
    bookingsDelta: '+6.5%',
    bookingsUp: true,
    price: '$1 650 000',
    currentBid: '$1 620 000',
    listingType: 'auction',
    auctionTimer: '3д 02:11:08',
    date: '14.02.2024',
  },
  {
    id: 'OB-1031',
    title: 'Вилла с бассейном',
    location: 'Ницца, Франция',
    image: OWNER_PROP_IMAGES.thumbPenthouse,
    status: 'Продан',
    statusKey: 'sold',
    views: '1 876',
    viewsDelta: '+14.1%',
    viewsUp: true,
    bookings: '28',
    bookingsDelta: '+7.3%',
    bookingsUp: true,
    price: '$2 100 000',
    listingType: 'shares',
    date: '10.02.2024',
  },
]

export const OWNER_TEST_PROPERTIES = RAW_PROPERTIES.map((property) => ({
  ...property,
  displayId: property.id,
  filterKey: property.statusKey,
  analytics: buildOwnerPropertyAnalytics(property),
}))

let ownerPropertiesLiveCache = []

export function setOwnerPropertiesLiveCache(rows) {
  ownerPropertiesLiveCache = Array.isArray(rows) ? rows : []
}

export function getOwnerTestProperty(propertyId) {
  const id = String(propertyId ?? '')
  const fromLive = ownerPropertiesLiveCache.find((item) => String(item.id) === id)
  if (fromLive) return fromLive
  return OWNER_TEST_PROPERTIES.find((item) => String(item.id) === id) ?? null
}

export function getOwnerPropertyAnalyticsPath(propertyId) {
  return `/owner-test/property-analytics/${encodeURIComponent(propertyId)}`
}

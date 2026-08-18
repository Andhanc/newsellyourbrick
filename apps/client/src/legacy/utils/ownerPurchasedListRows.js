import { getCurrencySymbol } from './currency'
import { getPropertyCardImage } from './propertyImage'
import { getPropertyDetailPath } from './propertyDetailUrl'
import { getCoInvestmentDetailPath } from './sectionRoutes'
import { mapReservationPurchase, resolvePurchaseStatus } from './cabinetPurchaseHistory'
import { listingRelistsPurchase, mergeOwnerListWithPurchases } from './ownerPurchaseListingDedupe'

export { resolvePurchaseStatus, listingRelistsPurchase, mergeOwnerListWithPurchases }

const AUCTION_IMAGE_FALLBACK =
  '/images/external/photo-1522708323590-d24dbb6b0267-b4dd9c7026.jpg'

const SHARE_IMAGE_FALLBACK =
  '/images/external/photo-1560448204-e02f11c3d0e2-54a1e4fab4.jpg'

export const PURCHASED_TAB_ID = 'purchased'

export function formatOwnerPurchaseMoney(amount, currency = 'USD', locale = 'ru-RU') {
  const symbol = getCurrencySymbol(currency)
  const n = Number(amount)
  if (!Number.isFinite(n)) return '—'
  return `${symbol}${n.toLocaleString(locale)}`
}

function toEpochMs(value) {
  if (value == null || value === '') return 0
  const ts = new Date(value).getTime()
  return Number.isFinite(ts) && ts > 0 ? ts : 0
}

function sharePurchaseImageSrc(raw) {
  if (!raw || typeof raw !== 'string') return SHARE_IMAGE_FALLBACK
  const t = raw.trim()
  if (!t) return SHARE_IMAGE_FALLBACK
  if (t.startsWith('http://') || t.startsWith('https://') || t.startsWith('data:') || t.startsWith('/')) {
    return t
  }
  return `/${t.replace(/^\/+/, '')}`
}

function buildPurchasedRow({
  rowKey,
  id,
  displayId,
  title,
  location,
  image,
  listingType,
  purchaseStatus,
  priceAmount,
  price,
  remainingAmount = 0,
  remainingFormatted = null,
  paidAmount = 0,
  paidFormatted = null,
  sharesCount = null,
  pricePerShareFormatted = null,
  currency,
  createdAtTs,
  canSell = false,
  sellBlocked = false,
  detailPath = null,
  requirePropertyAccess = true,
}) {
  return {
    id,
    rowKey,
    displayId,
    title,
    location: location || '',
    image,
    status: purchaseStatus,
    statusKey: 'purchased',
    filterKey: PURCHASED_TAB_ID,
    isPurchased: true,
    purchaseStatus,
    listingType,
    moderationKey:
      purchaseStatus === 'bought'
        ? 'approved'
        : purchaseStatus === 'cancelled'
          ? 'rejected'
          : 'pending',
    currency,
    priceAmount: Number.isFinite(Number(priceAmount)) ? Number(priceAmount) : 0,
    viewsCount: 0,
    views: '—',
    likesCount: 0,
    bidsCount: 0,
    bidsAmountTotal: 0,
    currentBidAmount: 0,
    bookingsCount: 0,
    viewsDelta: '',
    viewsUp: null,
    price,
    currentBid: null,
    remainingAmount,
    remainingFormatted,
    paidAmount,
    paidFormatted,
    sharesCount,
    pricePerShareFormatted,
    auctionEndTime: null,
    createdAtTs: createdAtTs || 0,
    updatedAtTs: createdAtTs || 0,
    date: '—',
    canSell,
    sellBlocked,
    detailPath,
    requirePropertyAccess,
    raw: { purchased: true },
  }
}

export function mapAuctionWinToOwnerListRow(winner, { locale = 'ru-RU', fallbackTitle = 'Объект' } = {}) {
  const property = winner?.property || {}
  const propertyId = winner?.property_id
  const currency = winner?.currency || property.currency || 'USD'
  const priceAmount = Number(winner?.winning_bid_amount)
  const createdAtTs = toEpochMs(winner?.won_at || winner?.auction_end_date)

  return buildPurchasedRow({
    rowKey: `purchased:auction:${winner?.id ?? propertyId}`,
    id: propertyId ?? winner?.id,
    displayId: propertyId != null ? `BUY-${propertyId}` : `BUY-${winner?.id ?? '—'}`,
    title: property.title || fallbackTitle,
    location: property.location || property.address || '',
    image: getPropertyCardImage(property, AUCTION_IMAGE_FALLBACK),
    listingType: 'auction',
    purchaseStatus: 'bought',
    priceAmount,
    price: formatOwnerPurchaseMoney(priceAmount, currency, locale),
    paidAmount: Number.isFinite(priceAmount) ? priceAmount : 0,
    paidFormatted: formatOwnerPurchaseMoney(priceAmount, currency, locale),
    remainingAmount: 0,
    remainingFormatted: formatOwnerPurchaseMoney(0, currency, locale),
    currency,
    createdAtTs,
    canSell: propertyId != null,
    sellBlocked: false,
    detailPath: propertyId != null ? getPropertyDetailPath(propertyId) : null,
  })
}

export function mapReservationToOwnerListRow(
  row,
  { locale = 'ru-RU', completedPurchaseRequestIds = null, fallbackTitle = 'Объект' } = {},
) {
  const purchase = mapReservationPurchase(row)
  const billing = row?.billing && typeof row.billing === 'object' ? row.billing : {}
  const prId = billing.purchase_request_id != null ? Number(billing.purchase_request_id) : null
  const isDealCompleted =
    purchase.isDealCompleted ||
    (prId != null && !Number.isNaN(prId) && completedPurchaseRequestIds?.has?.(prId))
  const isDealCancelled = String(row?.purchase_request_status || '').toLowerCase() === 'cancelled'
  const remainingAmount = isDealCompleted ? 0 : purchase.remainingAmount
  const purchaseStatus = resolvePurchaseStatus({
    isDealCompleted,
    isDealCancelled,
    remainingAmount,
  })
  const pid = purchase.propertyId
  const recordId = row?.id || row?.dedupe_key || pid
  const currency = purchase.currency
  const priceAmount = purchase.totalAmount || purchase.paidAmount
  const createdAtTs = toEpochMs(purchase.purchaseDateRaw)

  return buildPurchasedRow({
    rowKey: `purchased:buynow:${recordId}`,
    id: pid ?? recordId,
    displayId: pid != null ? `BUY-${pid}` : `BUY-${recordId}`,
    title: purchase.title || fallbackTitle,
    location: purchase.location,
    image: purchase.imageSrc || SHARE_IMAGE_FALLBACK,
    listingType: purchase.isDebt ? 'debts' : 'buy_now',
    purchaseStatus,
    priceAmount,
    price: formatOwnerPurchaseMoney(priceAmount, currency, locale),
    remainingAmount,
    remainingFormatted: formatOwnerPurchaseMoney(remainingAmount, currency, locale),
    paidAmount: purchase.paidAmount,
    paidFormatted: formatOwnerPurchaseMoney(purchase.paidAmount, currency, locale),
    currency,
    createdAtTs,
    canSell: pid != null,
    sellBlocked: !isDealCompleted,
    detailPath: pid != null ? getPropertyDetailPath(pid) : null,
  })
}

export function mapSharePurchaseToOwnerListRow(row, { locale = 'ru-RU', fallbackTitle = 'Объект' } = {}) {
  const pid = row?.property_id
  const currency = String(row?.currency || 'USD').toUpperCase()
  const priceAmount = Number(row?.total_price ?? row?.total_paid)
  const createdAtTs = toEpochMs(row?.purchase_date || row?.paid_at || row?.created_at)
  const title = row?.property_title || fallbackTitle

  return buildPurchasedRow({
    rowKey: `purchased:share:${row?.id ?? pid}`,
    id: pid ?? row?.id,
    displayId: pid != null ? `BUY-${pid}` : `BUY-${row?.id ?? '—'}`,
    title,
    location: row?.property_location || '',
    image: sharePurchaseImageSrc(row?.property_image),
    listingType: 'shares',
    purchaseStatus: 'bought',
    priceAmount,
    price: formatOwnerPurchaseMoney(priceAmount, currency, locale),
    paidAmount: Number.isFinite(priceAmount) ? priceAmount : 0,
    paidFormatted: formatOwnerPurchaseMoney(priceAmount, currency, locale),
    remainingAmount: 0,
    remainingFormatted: formatOwnerPurchaseMoney(0, currency, locale),
    sharesCount: row?.shares_count ?? null,
    pricePerShareFormatted: formatOwnerPurchaseMoney(row?.price_per_share, currency, locale),
    currency,
    createdAtTs,
    canSell: pid != null,
    sellBlocked: false,
    detailPath: getCoInvestmentDetailPath({
      id: pid,
      property_type: row?.property_type,
    }),
    requirePropertyAccess: false,
  })
}

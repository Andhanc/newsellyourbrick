import { CLERK_DB_USER_SYNCED, getStoredNumericUserId } from '../services/authService'
import { getCurrencySymbol } from './currency'
import { getPropertyCardImage } from './propertyImage'

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || '/api'

const FALLBACK_IMAGE =
  '/images/external/photo-1568605114967-8130f3a36994-bc29e86e2f.jpg'

export const OWNER_SALE_TYPE_LABELS = {
  auction: 'Аукцион',
  buy_now: 'Купить сейчас',
  share: 'Доля',
  debts: 'Долги',
}

const DEAL_LABELS = {
  auction: 'Выигрышная ставка',
  buy_now: 'Купить сейчас',
  share: 'Покупка доли',
  debts: 'Выигрышная ставка',
}

function formatSaleAmount(amount, currency = 'USD') {
  const num = Number(amount)
  if (!Number.isFinite(num)) return '—'
  const sym = getCurrencySymbol(currency)
  return `${sym}${num.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}`
}

function mapSaleChannel(channel) {
  if (channel === 'share') return 'share'
  if (channel === 'debts') return 'debts'
  if (channel === 'buy_now') return 'buy_now'
  return 'auction'
}

function resolveTab(item) {
  const status = String(item.sale_status || item.raw?.sale_status || '').toLowerCase()
  if (status === 'cancelled') return 'cancelled'
  if (item.reserve_paid) return 'completed'
  return 'in_progress'
}

function flattenMySalesPayload(data) {
  const sections = [
    { key: 'auction', channel: 'auction' },
    { key: 'buy_now', channel: 'buy_now' },
    { key: 'shares', channel: 'share' },
    { key: 'debts', channel: 'debts' },
  ]

  const rows = []
  for (const { key, channel } of sections) {
    const list = Array.isArray(data?.[key]) ? data[key] : []
    for (const item of list) {
      rows.push({ ...item, sale_channel: item.sale_channel || channel })
    }
  }
  return rows
}

export function mapOwnerSaleRow(item, index) {
  const saleType = mapSaleChannel(item.sale_channel)
  const tab = resolveTab(item)
  const rowKey = `${item.property_table || 'x'}:${item.id}:${item.sold_at || index}`

  return {
    id: rowKey,
    propertyId: item.id,
    displayId: `SL-${item.id}`,
    title: item.title || `Объект #${item.id}`,
    location: item.location || 'Не указано',
    image: getPropertyCardImage(
      {
        photos: item.photos,
        image: item.cover_url,
        image_url: item.cover_url,
      },
      FALLBACK_IMAGE
    ),
    buyer: item.buyer_display || 'Покупатель',
    dealAmount: formatSaleAmount(item.sale_amount, item.currency),
    dealLabel: DEAL_LABELS[saleType] || 'Сумма сделки',
    reservePaid: Boolean(item.reserve_paid),
    saleType,
    tab,
    raw: item,
  }
}

export async function fetchOwnerSales(ownerUserId) {
  if (!ownerUserId) return []

  const response = await fetch(`${API_BASE_URL}/owner/${ownerUserId}/my-sales`)
  if (!response.ok) {
    throw new Error('Не удалось загрузить продажи')
  }

  const result = await response.json()
  if (!result.success || !result.data) {
    return []
  }

  const flat = flattenMySalesPayload(result.data)
  return flat
    .filter((item) => item.reserve_paid === true)
    .map((item, index) => mapOwnerSaleRow(item, index))
}

export function filterOwnerSalesRows(rows, tab = 'all') {
  if (tab === 'all') return rows
  return rows.filter((row) => row.tab === tab)
}

export function countOwnerSalesByTab(rows) {
  const counts = {
    all: rows.length,
    completed: 0,
    in_progress: 0,
    cancelled: 0,
  }
  for (const row of rows) {
    if (counts[row.tab] != null) counts[row.tab] += 1
  }
  return counts
}

export function getOwnerSalesUserId() {
  return getStoredNumericUserId()
}

export { CLERK_DB_USER_SYNCED }

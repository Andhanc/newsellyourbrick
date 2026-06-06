import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bell, DollarSign } from 'lucide-react'
import OwnerNotificationsDrawer from './OwnerNotificationsDrawer'
import { useOwnerTestNavOptional } from '../context/OwnerTestNavigationContext'
import {
  CLERK_DB_USER_SYNCED,
  fetchOwnerProperties,
  getOwnerPropertiesUserId,
} from '../utils/ownerPropertiesList'
import { OWNER_VIEWS, ownerTestHref } from '../utils/ownerTestNav'
import { propertyBidsApiQuery } from '../utils/propertySourceTable'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

function parseTime(value) {
  if (!value) return null
  const ts = new Date(value).getTime()
  return Number.isFinite(ts) ? ts : null
}

function getRowPropertyTable(row) {
  const raw = row?.raw || {}
  if (raw.property_table) return raw.property_table
  if (raw.source_table === 'houses') return 'properties_houses'
  if (raw.source_table === 'apartments') return 'properties_apartments'
  if (raw.property_type === 'house' || raw.property_type === 'villa') return 'properties_houses'
  return 'properties_apartments'
}

function buildPropertyKey(propertyId, table) {
  return `${String(table || 'properties_apartments')}:${Number(propertyId)}`
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
  const ts = parseTime(value)
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
        }))
      } catch {
        return []
      }
    })
  )
  return rows.flat()
}

export default function OwnerNotificationsButton({
  className,
  badgeClassName,
  iconSize = 20,
  badge,
  items,
}) {
  const nav = useOwnerTestNavOptional()
  const [open, setOpen] = useState(false)
  const [properties, setProperties] = useState([])
  const [bidRows, setBidRows] = useState([])

  const loadBidNotifications = useCallback(async () => {
    if (items) return
    const userId = getOwnerPropertiesUserId()
    if (!userId) {
      setProperties([])
      setBidRows([])
      return
    }

    try {
      const nextProperties = await fetchOwnerProperties(userId)
      const nextBidRows = await fetchOwnerBidRows(nextProperties)
      setProperties(nextProperties)
      setBidRows(nextBidRows)
    } catch (error) {
      console.warn('OwnerNotificationsButton: не удалось загрузить ставки', error)
      setProperties([])
      setBidRows([])
    }
  }, [items])

  useEffect(() => {
    loadBidNotifications()
  }, [loadBidNotifications])

  useEffect(() => {
    if (items) return undefined
    const onUserSynced = () => loadBidNotifications()
    window.addEventListener(CLERK_DB_USER_SYNCED, onUserSynced)
    return () => window.removeEventListener(CLERK_DB_USER_SYNCED, onUserSynced)
  }, [items, loadBidNotifications])

  const fetchedItems = useMemo(() => {
    const propertyByKey = new Map(
      properties.map((property) => [buildPropertyKey(property.id, getRowPropertyTable(property)), property])
    )

    return bidRows
      .map((bid) => {
        const table = bid.propertyTable || bid.property_table
        const propertyId = bid.propertyId || bid.property_id
        const property = propertyByKey.get(buildPropertyKey(propertyId, table))
        const propertyTitle = bid.propertyTitle || property?.title || `Объект #${propertyId}`
        const propertyLocation = bid.propertyLocation || property?.location || ''
        const buyerId = bid.user_id_number || bid.user_id
        const openParams = { propertyId }
        const createdAt = bid.created_at || bid.createdAt
        const createdTs = parseTime(createdAt) || 0

        return {
          id: `bid-${bid.id || `${propertyId}-${createdTs}-${bid.bid_amount}`}`,
          tone: 'teal',
          icon: DollarSign,
          title: 'Новая ставка на объект',
          text: `${propertyTitle}${buyerId ? ` • Покупатель #${buyerId}` : ''}${propertyLocation ? ` • ${propertyLocation}` : ''}`,
          time: formatRelativeTime(createdAt),
          amount: formatBidAmount(bid.bid_amount, bid.propertyCurrency || property?.currency || 'USD'),
          createdTs,
          unread: true,
          href: ownerTestHref(OWNER_VIEWS.PROPERTY_ANALYTICS, openParams),
          onAction: nav?.goTo && propertyId ? () => nav.goTo(OWNER_VIEWS.PROPERTY_ANALYTICS, openParams) : null,
        }
      })
      .sort((a, b) => b.createdTs - a.createdTs)
  }, [bidRows, nav, properties])

  const resolvedItems = items ?? fetchedItems
  const resolvedBadge = badge !== undefined ? badge : resolvedItems.length || null

  return (
    <>
      <button
        type="button"
        className={className}
        aria-label="Уведомления"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Bell size={iconSize} strokeWidth={2} />
        {resolvedBadge != null && <span className={badgeClassName}>{resolvedBadge}</span>}
      </button>
      <OwnerNotificationsDrawer open={open} onClose={() => setOpen(false)} items={resolvedItems} />
    </>
  )
}

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/clerk-react'
import {
  getUserData,
  isAuthenticated,
  getStoredNumericUserId,
  CLERK_DB_USER_SYNCED,
} from '../services/authService'
import { fetchUserById } from '../utils/usersApi'
import { getPropertyCardImage } from '../utils/propertyImage'
import { getCurrencySymbol } from '../utils/currency'
import { getPropertyDetailPath } from '../utils/propertyDetailUrl'
import { getCoInvestmentDetailPath } from '../utils/sectionRoutes'
import {
  PRIVATE_CLUB_KICKED_MODAL_EVENT,
  SUBSCRIPTION_BILLING_UPDATED_EVENT,
} from '../constants/cabinetEvents'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'
const CABINET_JSON_CACHE = new Map()
const HISTORY_CACHE_TTL_MS = 45000
const SUBSCRIPTION_CACHE_TTL_MS = 30000

async function fetchJsonCached(url, { ttlMs = 20000, force = false } = {}) {
  const cached = CABINET_JSON_CACHE.get(url)
  const now = Date.now()

  if (!force && cached?.data && now - cached.ts < ttlMs) {
    return cached.data
  }
  if (!force && cached?.promise) {
    return cached.promise
  }

  const requestPromise = fetch(url)
    .then((response) => (response.ok ? response.json().catch(() => null) : null))
    .catch(() => null)

  CABINET_JSON_CACHE.set(url, {
    ts: now,
    promise: requestPromise,
    data: cached?.data || null,
  })

  try {
    const data = await requestPromise
    CABINET_JSON_CACHE.set(url, { ts: Date.now(), promise: null, data })
    return data
  } catch {
    const fallback = cached?.data || null
    CABINET_JSON_CACHE.set(url, { ts: Date.now(), promise: null, data: fallback })
    return fallback
  }
}

/** После оплаты / синхронизации Stripe — перечитать тариф в превью кабинета. */
export { SUBSCRIPTION_BILLING_UPDATED_EVENT, PRIVATE_CLUB_KICKED_MODAL_EVENT } from '../constants/cabinetEvents'

function formatShortDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return '—'
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

function formatMoney(amount, currency = 'EUR') {
  if (amount == null || Number.isNaN(Number(amount))) return '—'
  const n = Number(amount)
  const c = (currency || 'EUR').toString().toUpperCase()
  const sym = getCurrencySymbol(c)
  return `${sym}${n.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}`
}

function rowInitials(title) {
  const t = (title || '').trim().replace(/\s+/g, '')
  if (t.length >= 2) return t.slice(0, 2).toUpperCase()
  if (t.length === 1) return `${t}·`.toUpperCase()
  return '··'
}

const HISTORY_THUMB_PLACEHOLDER =
  '/images/external/photo-1560448204-e02f11c3d0e2-d2beb47285.jpg'

function sharePurchaseImageSrc(raw) {
  if (!raw || typeof raw !== 'string') return HISTORY_THUMB_PLACEHOLDER
  const t = raw.trim()
  if (t.startsWith('http://') || t.startsWith('https://') || t.startsWith('data:') || t.startsWith('/')) {
    return t
  }
  return `/${t.replace(/^\/+/, '')}`
}

function firstPhotoFromProperty(prop) {
  return getPropertyCardImage(prop, null)
}

function pickLocationFromProperty(prop) {
  if (!prop || typeof prop !== 'object') return ''
  return String(prop.location || prop.address || '').trim()
}

/** Ключ календарного дня в локальной зоне (группировка в UI). */
function dayKeyFromRawDate(raw) {
  if (!raw) return ''
  const d = new Date(raw)
  if (!Number.isFinite(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Для обзора кабинета: без подписки и пустой plan_key считаем Starter (не Pro). */
export function normalizeSubscriptionPlanVisual(sub) {
  if (!sub) return 'starter'
  const raw = sub.plan_key
  if (raw == null || String(raw).trim() === '') return 'starter'
  const k = String(raw).toLowerCase()
  if (k === 'starter' || k === 'free') return 'starter'
  if (k === 'vip') return 'vip'
  return 'pro'
}

const SUBSCRIPTION_UI_INACTIVE_STATUSES = new Set([
  'canceled',
  'unpaid',
  'incomplete_expired',
  'incomplete',
])

/**
 * Тариф для кнопок оплаты и превью: неактивная подписка в БД → starter (можно снова оформить Pro).
 */
export function effectivePurchasedTier(sub) {
  if (!sub) return 'starter'
  const st = String(sub.status || '').toLowerCase()
  if (SUBSCRIPTION_UI_INACTIVE_STATUSES.has(st)) return 'starter'
  return normalizeSubscriptionPlanVisual(sub)
}

/** VIP: активная подписка Stripe VIP или закрытый клуб (vip_until в БД). */
export function userHasVipAccess({ subscription, vipClub }) {
  if (vipClub && typeof vipClub === 'object' && vipClub.active) return true
  return effectivePurchasedTier(subscription) === 'vip'
}

/** Тариф для карточек: учитывает VIP закрытого клуба (vip_until). */
export function effectiveDisplayTier(subscription, vipClub) {
  if (userHasVipAccess({ subscription, vipClub })) return 'vip'
  return effectivePurchasedTier(subscription)
}

function subscriptionPlanBadgeLabel(visual) {
  if (visual === 'starter') return 'Starter'
  if (visual === 'vip') return 'VIP'
  return 'Pro'
}

/**
 * Достаёт массив из ответа GET /api/... (как на странице /history).
 * Не отбрасываем payload, если поле success отсутствует при HTTP 200.
 */
function takeHistoryArray(json) {
  if (!json || typeof json !== 'object') return []
  if (json.success === false) return []
  const d = json.data
  if (Array.isArray(d)) return d
  return []
}

/**
 * Секции истории для дропбокса + плоский список для карточки «события».
 */
function buildHistoryData(winners, reservations, shares, bidsRaw) {
  const events = []
  const sectionAuction = []
  const sectionReserve = []
  const sectionShares = []
  const sectionBids = []

  const wArr = Array.isArray(winners) ? winners : []
  for (const winner of wArr) {
    const prop = winner.property || {}
    const t = prop.title || 'Выигрыш аукциона'
    const date = winner.won_at || winner.auction_end_date
    const sort = new Date(date || 0).getTime()
    const pid = winner.property_id ?? prop.id
    const img = firstPhotoFromProperty(prop) || HISTORY_THUMB_PLACEHOLDER
    const href =
      pid != null ? getPropertyDetailPath(pid, { property: Object.keys(prop).length ? prop : { id: pid } }) : null
    const loc = pickLocationFromProperty(prop)
    events.push({
      sort,
      id: `aw-${winner.id}`,
      title: t,
      details: `${formatMoney(winner.winning_bid_amount, winner.currency || prop.currency)} · ${formatShortDate(date)}`,
      initials: rowInitials(t),
    })
    sectionAuction.push({
      id: `aw-${winner.id}`,
      title: t,
      subtitle: `Победа в аукционе`,
      amount: formatMoney(winner.winning_bid_amount, winner.currency || prop.currency),
      purchaseDate: formatShortDate(date),
      imageSrc: img,
      href,
      sort,
      location: loc,
      dayKey: dayKeyFromRawDate(date),
    })
  }

  const rArr = Array.isArray(reservations) ? reservations : []
  for (const row of rArr) {
    const title = row.property_title || `Объект #${row.billing?.property_id ?? '—'}`
    const date = row.paid_at
    const sort = new Date(date || 0).getTime()
    const cur = (row.currency || 'eur').toUpperCase()
    const paid = (row.amount_cents || 0) / 100
    const pid = row.billing?.property_id
    const img = sharePurchaseImageSrc(row.property_image)
    const reserveProp =
      pid != null
        ? { id: pid, property_type: row.property_type || row.billing?.property_type }
        : null
    const href = pid != null ? getPropertyDetailPath(pid, { property: reserveProp }) : null
    const loc = String(row.property_location || row.property_address || '').trim()
    events.push({
      sort,
      id: `rv-${row.id ?? row.dedupe_key}`,
      title: `Резерв · ${title}`,
      details: `${formatMoney(paid, cur)} · ${formatShortDate(date)}`,
      initials: 'РЗ',
    })
    sectionReserve.push({
      id: `rv-${row.id ?? row.dedupe_key}`,
      title,
      subtitle: 'Купить сейчас',
      amount: formatMoney(paid, cur),
      purchaseDate: formatShortDate(date),
      imageSrc: img,
      href,
      sort,
      location: loc,
      dayKey: dayKeyFromRawDate(date),
    })
  }

  const sArr = Array.isArray(shares) ? shares : []
  for (const row of sArr) {
    const title = row.property_title || 'Покупка доли'
    const date = row.purchase_date || row.paid_at || row.created_at
    const sort = new Date(date || 0).getTime()
    const cur = (row.currency || 'EUR').toString().toUpperCase()
    const line =
      row.total_paid != null
        ? formatMoney(row.total_paid, cur)
        : row.shares_count != null
          ? `${row.shares_count} шт.`
          : '—'
    const img = sharePurchaseImageSrc(row.property_image)
    const pt = row.property_type || 'property'
    const pid = row.property_id
    const href =
      pid != null
        ? getCoInvestmentDetailPath({ id: pid, property_type: pt })
        : null
    const loc = String(row.property_location || '').trim()
    events.push({
      sort,
      id: `sp-${row.id}`,
      title: `Доли · ${title}`,
      details: `${line} · ${formatShortDate(date)}`,
      initials: 'ДЛ',
    })
    sectionShares.push({
      id: `sp-${row.id}`,
      title,
      subtitle: row.shares_count != null ? `Куплено долей: ${row.shares_count}` : 'Покупка долей',
      amount: line,
      purchaseDate: formatShortDate(date),
      imageSrc: img,
      href,
      sort,
      location: loc,
      dayKey: dayKeyFromRawDate(date),
    })
  }

  const bids = Array.isArray(bidsRaw) ? bidsRaw : []
  const byProp = {}
  for (const bid of bids) {
    const pid = bid.property_id
    if (pid == null) continue
    if (!byProp[pid]) byProp[pid] = []
    byProp[pid].push(bid)
  }
  for (const [pid, list] of Object.entries(byProp)) {
    const sorted = [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    const latest = sorted[0]
    const prop = latest.property || {}
    const title = latest.title || prop.title || `Объект #${pid}`
    const sort = new Date(latest.created_at).getTime()
    const img = firstPhotoFromProperty(prop) || HISTORY_THUMB_PLACEHOLDER
    const href = getPropertyDetailPath(pid, { property: Object.keys(prop).length ? prop : { id: Number(pid) } })
    const loc = pickLocationFromProperty(prop)
    const bidDate = latest.created_at
    events.push({
      sort,
      id: `bid-${pid}`,
      title: `Ставка · ${title}`,
      details: `${formatMoney(latest.bid_amount, latest.currency)} · ${formatShortDate(latest.created_at)}`,
      initials: 'СТ',
    })
    sectionBids.push({
      id: `bid-${pid}`,
      title,
      subtitle: 'Ставка в аукционе',
      amount: formatMoney(latest.bid_amount, latest.currency),
      purchaseDate: formatShortDate(latest.created_at),
      imageSrc: img,
      href,
      sort,
      location: loc,
      dayKey: dayKeyFromRawDate(bidDate),
    })
  }

  const sortDesc = (a, b) => b.sort - a.sort
  sectionAuction.sort(sortDesc)
  sectionReserve.sort(sortDesc)
  sectionShares.sort(sortDesc)
  sectionBids.sort(sortDesc)

  const historySections = []
  if (sectionAuction.length)
    historySections.push({ key: 'auction', title: 'Аукцион', items: sectionAuction })
  if (sectionReserve.length)
    historySections.push({ key: 'reserve', title: 'Резервы', items: sectionReserve })
  if (sectionShares.length)
    historySections.push({ key: 'shares', title: 'Доли', items: sectionShares })
  if (sectionBids.length)
    historySections.push({ key: 'bids', title: 'Ставки', items: sectionBids })

  events.sort((a, b) => b.sort - a.sort)
  const recentRows = events.slice(0, 3).map(({ id, title, details, initials }) => ({
    id,
    title,
    details,
    initials,
  }))

  const historyCount = wArr.length + rArr.length + sArr.length + Object.keys(byProp).length

  return { historyCount, recentRows, historySections }
}

/**
 * Числовой id пользователя в БД, публичный ID (user_id_number), счётчик и превью истории (как на /history).
 */
export function useCabinetOverviewData() {
  const { user, isLoaded: userLoaded } = useUser()
  const [numericUserId, setNumericUserId] = useState(() => getStoredNumericUserId())
  const [publicIdDisplay, setPublicIdDisplay] = useState(null)
  const [historyCount, setHistoryCount] = useState(0)
  const [recentHistoryRows, setRecentHistoryRows] = useState([])
  const [historySections, setHistorySections] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [subscriptionPlanLabel, setSubscriptionPlanLabel] = useState('Starter')
  const [cabinetSubscriptionTier, setCabinetSubscriptionTier] = useState('starter')
  const [cabinetVipActive, setCabinetVipActive] = useState(false)

  useEffect(() => {
    const applyFromStorage = () => {
      const n = getStoredNumericUserId()
      setNumericUserId((prev) => (prev === n ? prev : n))
    }
    applyFromStorage()
    window.addEventListener(CLERK_DB_USER_SYNCED, applyFromStorage)
    return () => window.removeEventListener(CLERK_DB_USER_SYNCED, applyFromStorage)
  }, [])

  useEffect(() => {
    const fetchUserId = async () => {
      const storedUserId = localStorage.getItem('userId')
      if (storedUserId && /^\d+$/.test(storedUserId)) {
        setNumericUserId(parseInt(storedUserId, 10))
        return
      }

      const isClerkAuth = user && userLoaded
      const isOldAuth = isAuthenticated()

      if (isClerkAuth && user) {
        try {
          const userEmail =
            user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress
          if (userEmail) {
            const userResponse = await fetchJsonCached(
              `${API_BASE_URL}/users/email/${encodeURIComponent(userEmail)}`,
              { ttlMs: 20000 }
            )
            if (userResponse?.success && userResponse?.data?.id) {
              const numericId = userResponse.data.id
              setNumericUserId(numericId)
              localStorage.setItem('userId', String(numericId))
              return
            }
          }
        } catch (e) {
          console.error('Cabinet overview: userId из БД', e)
        }
      } else if (isOldAuth) {
        const ud = getUserData()
        if (ud?.id && /^\d+$/.test(ud.id.toString())) {
          setNumericUserId(parseInt(ud.id, 10))
          localStorage.setItem('userId', String(ud.id))
        }
      }
    }

    if (userLoaded || isAuthenticated()) {
      fetchUserId()
    }
  }, [user, userLoaded])

  /** После загрузки Clerk подтянуть userId из localStorage, если стейт ещё пустой. */
  useEffect(() => {
    if (!userLoaded) return
    const n = getStoredNumericUserId()
    if (n == null) return
    setNumericUserId((prev) => (prev != null ? prev : n))
  }, [userLoaded])

  useEffect(() => {
    const uid = numericUserId ?? getStoredNumericUserId()
    if (!uid) {
      setPublicIdDisplay(null)
      return
    }
    let cancelled = false
    ;(async () => {
      const u = await fetchUserById(API_BASE_URL, uid)
      if (cancelled) return
      if (!u) {
        setPublicIdDisplay(String(uid))
        return
      }
      const num =
        u.user_id_number != null && String(u.user_id_number).trim() !== ''
          ? String(u.user_id_number).trim()
          : String(uid)
      setPublicIdDisplay(num)
    })()
    return () => {
      cancelled = true
    }
  }, [numericUserId, userLoaded])

  useEffect(() => {
    const uid = numericUserId ?? getStoredNumericUserId()
    if (!uid) {
      setHistoryCount(0)
      setRecentHistoryRows([])
      setHistorySections([])
      setHistoryLoading(false)
      return
    }

    let cancelled = false
    setHistoryLoading(true)
    ;(async () => {
      try {
        const [wJson, rJson, sJson, bJson] = await Promise.all([
          fetchJsonCached(`${API_BASE_URL}/auction-winners/user/${uid}`, {
            ttlMs: HISTORY_CACHE_TTL_MS,
          }),
          fetchJsonCached(`${API_BASE_URL}/users/${uid}/reservation-purchases`, {
            ttlMs: HISTORY_CACHE_TTL_MS,
          }),
          fetchJsonCached(`${API_BASE_URL}/users/${uid}/share-purchases`, {
            ttlMs: HISTORY_CACHE_TTL_MS,
          }),
          fetchJsonCached(`${API_BASE_URL}/bids/user/${uid}`, {
            ttlMs: HISTORY_CACHE_TTL_MS,
          }),
        ])

        if (cancelled) return

        const winners = takeHistoryArray(wJson)
        const reservations = takeHistoryArray(rJson)
        const shares = takeHistoryArray(sJson)
        const bids = takeHistoryArray(bJson)

        const { historyCount: count, recentRows, historySections: sections } = buildHistoryData(
          winners,
          reservations,
          shares,
          bids
        )
        setHistoryCount(count)
        setRecentHistoryRows(recentRows)
        setHistorySections(sections)
      } catch (e) {
        if (!cancelled) {
          console.error('Cabinet overview: история', e)
          setHistoryCount(0)
          setRecentHistoryRows([])
          setHistorySections([])
        }
      } finally {
        if (!cancelled) setHistoryLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [numericUserId, userLoaded])

  useEffect(() => {
    const uid = numericUserId ?? getStoredNumericUserId()
    if (!uid) {
      setSubscriptionPlanLabel('Starter')
      setCabinetSubscriptionTier('starter')
      setCabinetVipActive(false)
      return
    }
    let cancelled = false

    const loadSubscriptionPlanLabel = async () => {
      try {
        const json = await fetchJsonCached(`${API_BASE_URL}/users/${uid}/subscription-billing`, {
          ttlMs: SUBSCRIPTION_CACHE_TTL_MS,
        })
        if (cancelled) return
        const data = json?.success && json?.data ? json.data : null
        const sub = data?.subscription ?? null
        const vipClub = data?.vipClub
        const visual = effectiveDisplayTier(sub, vipClub)
        setSubscriptionPlanLabel(subscriptionPlanBadgeLabel(visual))
        setCabinetSubscriptionTier(visual)
        setCabinetVipActive(userHasVipAccess({ subscription: sub, vipClub }))
      } catch {
        if (!cancelled) {
          setSubscriptionPlanLabel('Starter')
          setCabinetSubscriptionTier('starter')
          setCabinetVipActive(false)
        }
      }
    }

    void loadSubscriptionPlanLabel()

    const onBillingUpdated = () => {
      const u = numericUserId ?? getStoredNumericUserId()
      if (u) CABINET_JSON_CACHE.delete(`${API_BASE_URL}/users/${u}/subscription-billing`)
      void loadSubscriptionPlanLabel()
    }
    window.addEventListener(SUBSCRIPTION_BILLING_UPDATED_EVENT, onBillingUpdated)
    return () => {
      cancelled = true
      window.removeEventListener(SUBSCRIPTION_BILLING_UPDATED_EVENT, onBillingUpdated)
    }
  }, [numericUserId, userLoaded])

  return {
    numericUserId,
    publicIdDisplay,
    historyCount,
    recentHistoryRows,
    historySections,
    historyLoading,
    subscriptionPlanLabel,
    cabinetSubscriptionTier,
    cabinetVipActive,
  }
}

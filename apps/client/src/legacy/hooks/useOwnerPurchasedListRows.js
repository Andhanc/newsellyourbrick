import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchLinkedRoles } from '../utils/roleSwitchApi'
import { getOwnerTestIntlLocale } from '../utils/ownerTestI18n'
import {
  mapAuctionWinToOwnerListRow,
  mapReservationToOwnerListRow,
  mapSharePurchaseToOwnerListRow,
} from '../utils/ownerPurchasedListRows'

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || '/api'

export function useOwnerPurchasedListRows({ userId, linkedBuyerId = null } = {}) {
  const { t, i18n } = useTranslation()
  const locale = getOwnerTestIntlLocale(i18n.language)
  const fallbackTitle = t('buyerHistory_fallbackProperty')

  const numericUserId = useMemo(() => {
    if (userId == null) return null
    const n = typeof userId === 'string' ? parseInt(userId, 10) : Number(userId)
    return Number.isFinite(n) && n > 0 ? n : null
  }, [userId])

  const [historyUserId, setHistoryUserId] = useState(() => {
    if (linkedBuyerId != null) {
      const n = Number(linkedBuyerId)
      return Number.isFinite(n) && n > 0 ? n : null
    }
    return null
  })
  const [auctionWins, setAuctionWins] = useState([])
  const [reservations, setReservations] = useState([])
  const [sharePurchases, setSharePurchases] = useState([])
  const [completedPurchaseRequestIds, setCompletedPurchaseRequestIds] = useState(() => new Set())
  const [loadingPurchases, setLoadingPurchases] = useState(true)
  const [loadingReservations, setLoadingReservations] = useState(true)
  const [loadingShares, setLoadingShares] = useState(true)

  useEffect(() => {
    if (linkedBuyerId != null) {
      const n = Number(linkedBuyerId)
      setHistoryUserId(Number.isFinite(n) && n > 0 ? n : null)
      return undefined
    }
    if (!numericUserId) {
      setHistoryUserId(null)
      return undefined
    }

    let cancelled = false
    ;(async () => {
      try {
        const status = await fetchLinkedRoles({ userId: numericUserId })
        const buyerId = status?.buyer?.id
        if (!cancelled) {
          setHistoryUserId(buyerId ? Number(buyerId) : numericUserId)
        }
      } catch {
        if (!cancelled) setHistoryUserId(numericUserId)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [numericUserId, linkedBuyerId])

  useEffect(() => {
    if (!historyUserId) {
      setAuctionWins([])
      setReservations([])
      setSharePurchases([])
      setCompletedPurchaseRequestIds(new Set())
      setLoadingPurchases(false)
      setLoadingReservations(false)
      setLoadingShares(false)
      return undefined
    }

    let cancelled = false

    const loadWins = async () => {
      setLoadingPurchases(true)
      try {
        const response = await fetch(`${API_BASE_URL}/auction-winners/user/${historyUserId}`)
        if (!response.ok || cancelled) {
          if (!cancelled) setAuctionWins([])
          return
        }
        const result = await response.json()
        if (!result.success || !Array.isArray(result.data) || cancelled) {
          if (!cancelled) setAuctionWins([])
          return
        }
        if (!cancelled) setAuctionWins(result.data)
      } catch {
        if (!cancelled) setAuctionWins([])
      } finally {
        if (!cancelled) setLoadingPurchases(false)
      }
    }

    const loadRes = async () => {
      setLoadingReservations(true)
      try {
        const response = await fetch(`${API_BASE_URL}/users/${historyUserId}/reservation-purchases`)
        if (!response.ok || cancelled) {
          if (!cancelled) setReservations([])
          return
        }
        const result = await response.json()
        if (result.success && Array.isArray(result.data) && !cancelled) {
          setReservations(result.data)
        } else if (!cancelled) setReservations([])
      } catch {
        if (!cancelled) setReservations([])
      } finally {
        if (!cancelled) setLoadingReservations(false)
      }
    }

    const loadCompletedPr = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/purchase-requests/buyer/${historyUserId}?limit=200`)
        if (!response.ok || cancelled) return
        const result = await response.json()
        if (!result.success || !Array.isArray(result.data) || cancelled) return
        const ids = new Set()
        for (const row of result.data) {
          if (row.status === 'completed' && row.id != null) ids.add(Number(row.id))
        }
        if (!cancelled) setCompletedPurchaseRequestIds(ids)
      } catch {
        /* ignore */
      }
    }

    const loadShares = async () => {
      setLoadingShares(true)
      try {
        const response = await fetch(`${API_BASE_URL}/users/${historyUserId}/share-purchases`)
        if (!response.ok || cancelled) {
          if (!cancelled) setSharePurchases([])
          return
        }
        const result = await response.json()
        if (result.success && Array.isArray(result.data) && !cancelled) {
          setSharePurchases(result.data)
        } else if (!cancelled) setSharePurchases([])
      } catch {
        if (!cancelled) setSharePurchases([])
      } finally {
        if (!cancelled) setLoadingShares(false)
      }
    }

    loadWins()
    loadRes()
    loadCompletedPr()
    loadShares()

    return () => {
      cancelled = true
    }
  }, [historyUserId])

  const rows = useMemo(() => {
    const mapOpts = { locale, fallbackTitle }
    const auctionRows = auctionWins.map((winner) => mapAuctionWinToOwnerListRow(winner, mapOpts))
    const reservationRows = reservations.map((row) =>
      mapReservationToOwnerListRow(row, {
        ...mapOpts,
        completedPurchaseRequestIds,
      }),
    )
    const shareRows = sharePurchases.map((row) => mapSharePurchaseToOwnerListRow(row, mapOpts))
    return [...auctionRows, ...reservationRows, ...shareRows]
  }, [auctionWins, reservations, sharePurchases, completedPurchaseRequestIds, locale, fallbackTitle])

  const loading = !historyUserId
    ? Boolean(numericUserId)
    : loadingPurchases || loadingReservations || loadingShares

  return {
    rows,
    loading,
    historyUserId,
  }
}

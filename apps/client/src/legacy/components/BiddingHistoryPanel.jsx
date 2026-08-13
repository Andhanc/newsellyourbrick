import { FiClock } from 'react-icons/fi'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import CountdownTimer from './CountdownTimer'
import BidLeaderboardBoard, { buildBidLeaderboard } from './BidLeaderboardBoard'
import { getApiBaseUrl, getApiBaseUrlSync } from '../utils/apiConfig'
import './BiddingHistoryModal.css'
import { getCurrencySymbol } from '../utils/currency'
import { propertyBidsApiQuery, resolvePropertySourceTable } from '../utils/propertySourceTable'

let API_BASE_URL = getApiBaseUrlSync()

/**
 * Контент истории ставок (без оверлея). Используется в BiddingHistoryModal и в объединённой модалке аналитики продавца.
 */
export default function BiddingHistoryPanel({
  property,
  isOpen,
  refreshTrigger = 0,
  /** Не дублировать заголовок «История ставок», если родитель уже показывает свой заголовок */
  hideTitleHeader = false,
}) {
  const { t } = useTranslation()
  const [bids, setBids] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [animateIn, setAnimateIn] = useState(false)

  useEffect(() => {
    const initApiUrl = async () => {
      const url = await getApiBaseUrl()
      API_BASE_URL = url
    }
    initApiUrl()
  }, [])

  useEffect(() => {
    if (isOpen && property?.id) {
      setAnimateIn(false)
      const initAndLoad = async () => {
        const url = await getApiBaseUrl()
        API_BASE_URL = url
        await loadBids(true)
        requestAnimationFrame(() => setAnimateIn(true))
      }
      initAndLoad()
      const interval = setInterval(() => loadBids(false), 15000)
      return () => clearInterval(interval)
    }
    setIsInitialLoad(true)
    setBids([])
    setAnimateIn(false)
    return undefined
  }, [isOpen, property?.id])

  useEffect(() => {
    if (isOpen && property?.id && refreshTrigger > 0) {
      loadBids(false)
    }
  }, [refreshTrigger])

  const loadBids = async (showLoading = false) => {
    if (!property?.id) return

    if (showLoading) {
      setIsLoading(true)
    }

    try {
      const table = resolvePropertySourceTable(property)
      const response = await fetch(
        `${API_BASE_URL}/bids/property/${property.id}?${propertyBidsApiQuery(property.id, table)}`,
      )
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          const bidsData = data.data || []
          const sortedBids = [...bidsData].sort((a, b) => b.bid_amount - a.bid_amount)
          setBids(sortedBids)
        } else if (bids.length > 0) {
          setBids([])
        }
      } else if (bids.length > 0) {
        setBids([])
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки ставок:', error)
      if (bids.length > 0) {
        setBids([])
      }
    } finally {
      if (showLoading) {
        setIsLoading(false)
        setIsInitialLoad(false)
      }
    }
  }

  const leaderboard = useMemo(() => buildBidLeaderboard(bids), [bids])

  if (!isOpen || !property) return null

  const auctionEndDate =
    property?.end_date ||
    property?.auction_end_date ||
    property?.auctionEndDate ||
    property?.endTime ||
    null

  const formatPrice = (price) => {
    const num = Number(price)
    if (!num || Number.isNaN(num)) return '—'
    return `${getCurrencySymbol(property?.currency)}${num.toLocaleString('ru-RU')}`
  }

  return (
    <div
      className={[
        'bidding-history-modal__content',
        hideTitleHeader ? 'bidding-history-modal__content--embedded' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {!hideTitleHeader && (
        <div className="bh-board__header">
          <h2 className="bh-board__title">{t('bidHistoryTitle')}</h2>
          <p className="bh-board__subtitle">{property?.title || t('bidHistoryPropertyDefault')}</p>
        </div>
      )}

      {auctionEndDate ? (
        <div className="bh-board__timer">
          <FiClock size={14} aria-hidden />
          <CountdownTimer endTime={auctionEndDate} />
        </div>
      ) : null}

      {isLoading && isInitialLoad ? (
        <div className="bidding-history-loading">{t('bidHistoryLoading')}</div>
      ) : (
        <BidLeaderboardBoard
          leaderboard={leaderboard}
          formatPrice={formatPrice}
          animateIn={animateIn}
          emptyText={t('bidHistoryNoBids')}
        />
      )}
    </div>
  )
}

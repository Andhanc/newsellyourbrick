import { FiClock, FiDollarSign, FiUser } from 'react-icons/fi'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import CountdownTimer from './CountdownTimer'
import { getApiBaseUrl, getApiBaseUrlSync } from '../utils/apiConfig'
import { flagEmojiForStoredCountry } from '../utils/countryFlagFromStored'
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

  useEffect(() => {
    const initApiUrl = async () => {
      const url = await getApiBaseUrl()
      API_BASE_URL = url
    }
    initApiUrl()
  }, [])

  useEffect(() => {
    if (isOpen && property?.id) {
      const initAndLoad = async () => {
        const url = await getApiBaseUrl()
        API_BASE_URL = url
        await loadBids(true)
      }
      initAndLoad()
      const interval = setInterval(() => loadBids(false), 15000)
      return () => clearInterval(interval)
    } else if (!isOpen) {
      setIsInitialLoad(true)
      setBids([])
    }
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

          const currentBidsStr = JSON.stringify(bids)
          const newBidsStr = JSON.stringify(sortedBids)
          if (currentBidsStr !== newBidsStr) {
            setBids(sortedBids)
          }
        } else {
          if (bids.length > 0) {
            setBids([])
          }
        }
      } else {
        if (bids.length > 0) {
          setBids([])
        }
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

  if (!isOpen || !property) return null

  const auctionStartDate =
    property?.start_date ||
    property?.auction_start_date ||
    property?.auctionStartDate ||
    null

  const auctionEndDate =
    property?.end_date ||
    property?.auction_end_date ||
    property?.auctionEndDate ||
    property?.endTime ||
    null

  const startingPriceRaw =
    property?.auction_starting_price ??
    property?.auctionStartingPrice ??
    property?.starting_price ??
    property?.startingPrice ??
    property?.price ??
    property?.current_bid ??
    null

  const formatPrice = (price) => {
    const num = Number(price)
    if (!num || Number.isNaN(num)) return '—'
    return `${getCurrencySymbol(property?.currency)}${num.toLocaleString('ru-RU')}`
  }

  const formatDate = (date) => {
    if (!date) return ''
    const d =
      typeof date === 'string' || typeof date === 'number'
        ? new Date(date)
        : date
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const hasPeriod = auctionStartDate || auctionEndDate

  return (
    <div
      className={`bidding-history-modal__content${hideTitleHeader ? ' bidding-history-modal__content--embedded' : ''}`}
    >
      {!hideTitleHeader && (
        <div className="bidding-history-modal__header">
          <h2 className="bidding-history-modal__title">{t('bidHistoryTitle')}</h2>
          <p className="bidding-history-modal__subtitle">{property?.title || t('bidHistoryPropertyDefault')}</p>
        </div>
      )}

      {hasPeriod && (
        <div className="bidding-history-period bidding-history-modal__narrow">
          <div className="bidding-history-period__icon">
            <FiClock size={18} />
          </div>
          <div>
            <div className="bidding-history-period__label">{t('bidHistoryAuctionPeriod')}</div>
            <div className="bidding-history-period__value">
              {formatDate(auctionStartDate)}
              {auctionStartDate && auctionEndDate ? ' — ' : ''}
              {formatDate(auctionEndDate)}
            </div>
          </div>
        </div>
      )}

      {auctionEndDate && (
        <div className="bidding-history-timer-wrapper bidding-history-modal__narrow">
          <CountdownTimer endTime={auctionEndDate} />
        </div>
      )}

      <div className="bidding-history-start-price bidding-history-modal__narrow">
        <div className="bidding-history-start-price__icon">
          <FiDollarSign size={20} />
        </div>
        <div className="bidding-history-start-price__info">
          <div className="bidding-history-start-price__label">{t('bidHistoryStartingBid')}</div>
          <div className="bidding-history-start-price__value">
            {startingPriceRaw != null ? formatPrice(startingPriceRaw) : '—'}
          </div>
        </div>
      </div>

      {bids.length > 0 &&
        (() => {
          const maxBid = Math.max(...bids.map((b) => b.bid_amount))
          return (
            <div className="bidding-history-current-bid bidding-history-modal__narrow">
              <div className="bidding-history-current-bid__icon">
                <FiDollarSign size={20} />
              </div>
              <div className="bidding-history-current-bid__info">
                <div className="bidding-history-current-bid__label">{t('bidHistoryCurrentMaxBid')}</div>
                <div className="bidding-history-current-bid__value">{formatPrice(maxBid)}</div>
              </div>
            </div>
          )
        })()}

      {isLoading && isInitialLoad ? (
        <div className="bidding-history-loading">{t('bidHistoryLoading')}</div>
      ) : bids.length === 0 ? (
        <p className="bidding-history-placeholder">{t('bidHistoryNoBids')}</p>
      ) : (
        <div className="bidding-history-list bidding-history-modal__narrow">
          <div className="bidding-history-list__header">
            <h3 className="bidding-history-list__title">{t('bidHistoryAllBids', { count: bids.length })}</h3>
          </div>
          <div className="bids-list">
            {bids.map((bid, index) => {
              const isHighest = index === 0 && bid.bid_amount === Math.max(...bids.map((b) => b.bid_amount))
              const countryFlag = flagEmojiForStoredCountry(bid.bidder_country)
              return (
                <div key={bid.id || index} className={`bid-item ${isHighest ? 'bid-item--highest' : ''}`}>
                  <div className="bid-item__info">
                    <div className="bid-item__header">
                      <div className="bid-item__user">
                        <FiUser size={16} />
                        {countryFlag && (
                          <span
                            className="bid-item__country-flag"
                            title={bid.bidder_country}
                            aria-hidden
                          >
                            {countryFlag}
                          </span>
                        )}
                        <span className="bid-item__user-name">
                          {bid.user_id_number || bid.user_id || t('propertyDetailUnknown')}
                        </span>
                        {isHighest && <span className="bid-item__badge">{t('propertyDetailLeader')}</span>}
                      </div>
                      <div className="bid-item__amount">{formatPrice(bid.bid_amount)}</div>
                    </div>
                    <div className="bid-item__details">
                      <div className="bid-item__time">
                        <FiClock size={12} />
                        {new Date(bid.created_at).toLocaleString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

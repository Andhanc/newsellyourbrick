import { FiX, FiClock, FiDollarSign, FiUser } from 'react-icons/fi'
import { useState, useEffect } from 'react'
import CountdownTimer from './CountdownTimer'
import { getApiBaseUrl, getApiBaseUrlSync } from '../utils/apiConfig'
import './BiddingHistoryModal.css'

// Используем синхронную версию для инициализации, затем обновим при загрузке
let API_BASE_URL = getApiBaseUrlSync()

const BiddingHistoryModal = ({ isOpen, onClose, property, refreshTrigger }) => {
  const [bids, setBids] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  
  // Инициализируем API URL при монтировании компонента
  useEffect(() => {
    const initApiUrl = async () => {
      const url = await getApiBaseUrl()
      API_BASE_URL = url
      console.log('🔗 API Base URL установлен:', API_BASE_URL)
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
      // Обновляем историю каждые 3 секунды, пока модальное окно открыто (без показа загрузки)
      const interval = setInterval(() => loadBids(false), 15000)
      return () => clearInterval(interval)
    } else if (!isOpen) {
      // Сбрасываем состояние при закрытии
      setIsInitialLoad(true)
      setBids([])
    }
  }, [isOpen, property?.id])
  
  // Отдельный эффект для принудительного обновления при изменении refreshTrigger
  useEffect(() => {
    if (isOpen && property?.id && refreshTrigger > 0) {
      console.log('🔄 Принудительное обновление истории ставок')
      loadBids(false)
    }
  }, [refreshTrigger])
  
  const loadBids = async (showLoading = false) => {
    if (!property?.id) return
    
    if (showLoading) {
      setIsLoading(true)
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/bids/property/${property.id}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          const bidsData = data.data || []
          // Сортируем ставки по убыванию суммы (самые высокие первые)
          const sortedBids = [...bidsData].sort((a, b) => b.bid_amount - a.bid_amount)
          
          // Обновляем только если данные изменились
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
  
  if (!isOpen) return null

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
    return `$${num.toLocaleString('ru-RU')}`
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
      year: 'numeric'
    })
  }

  const hasPeriod = auctionStartDate || auctionEndDate

  return (
    <div className="bidding-history-overlay" onClick={onClose}>
      <div className="bidding-history-modal" onClick={(e) => e.stopPropagation()}>
        <button 
          className="bidding-history-modal__close" 
          onClick={onClose}
          aria-label="Закрыть"
        >
          <FiX size={24} />
        </button>

        <div className="bidding-history-modal__content">
          <div className="bidding-history-modal__header">
            <h2 className="bidding-history-modal__title">История ставок</h2>
            <p className="bidding-history-modal__subtitle">{property?.title || 'Объект недвижимости'}</p>
          </div>

          {hasPeriod && (
            <div className="bidding-history-period">
              <div className="bidding-history-period__icon">
                <FiClock size={18} />
              </div>
              <div>
                <div className="bidding-history-period__label">Период аукциона</div>
                <div className="bidding-history-period__value">
                  {formatDate(auctionStartDate)}
                  {auctionStartDate && auctionEndDate ? ' — ' : ''}
                  {formatDate(auctionEndDate)}
                </div>
              </div>
            </div>
          )}

          {auctionEndDate && (
            <div className="bidding-history-timer-wrapper">
              <CountdownTimer endTime={auctionEndDate} />
            </div>
          )}

          <div className="bidding-history-start-price">
            <div className="bidding-history-start-price__icon">
              <FiDollarSign size={20} />
            </div>
            <div className="bidding-history-start-price__info">
              <div className="bidding-history-start-price__label">Стартовая ставка</div>
              <div className="bidding-history-start-price__value">
                {startingPriceRaw != null ? formatPrice(startingPriceRaw) : '—'}
              </div>
            </div>
          </div>

          {/* Текущая максимальная ставка */}
          {bids.length > 0 && (() => {
            const maxBid = Math.max(...bids.map(b => b.bid_amount))
            return (
              <div className="bidding-history-current-bid">
                <div className="bidding-history-current-bid__icon">
                  <FiDollarSign size={20} />
                </div>
                <div className="bidding-history-current-bid__info">
                  <div className="bidding-history-current-bid__label">Текущая максимальная ставка</div>
                  <div className="bidding-history-current-bid__value">
                    {formatPrice(maxBid)}
                  </div>
                </div>
              </div>
            )
          })()}

          {isLoading && isInitialLoad ? (
            <div className="bidding-history-loading">
              Загрузка истории ставок...
            </div>
          ) : bids.length === 0 ? (
            <p className="bidding-history-placeholder">
              Пока нет ставок на этот объект.
            </p>
          ) : (
            <div className="bidding-history-list">
              <div className="bidding-history-list__header">
                <h3 className="bidding-history-list__title">Все ставки ({bids.length})</h3>
              </div>
              <div className="bids-list">
                {bids.map((bid, index) => {
                  const isHighest = index === 0 && bid.bid_amount === Math.max(...bids.map(b => b.bid_amount))
                  return (
                    <div key={bid.id || index} className={`bid-item ${isHighest ? 'bid-item--highest' : ''}`}>
                      <div className="bid-item__info">
                        <div className="bid-item__header">
                          <div className="bid-item__user">
                            <FiUser size={16} />
                            <span className="bid-item__user-name">
                              {bid.user_id_number || bid.user_id || 'Неизвестно'}
                            </span>
                            {isHighest && (
                              <span className="bid-item__badge">Лидер</span>
                            )}
                          </div>
                          <div className="bid-item__amount">
                            {formatPrice(bid.bid_amount)}
                          </div>
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
                              second: '2-digit'
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
      </div>
    </div>
  )
}

export default BiddingHistoryModal

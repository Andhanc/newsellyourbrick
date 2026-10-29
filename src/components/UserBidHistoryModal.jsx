import { FiX, FiClock, FiDollarSign, FiTrendingUp, FiTrendingDown } from 'react-icons/fi'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { getApiBaseUrl, getApiBaseUrlSync } from '../utils/apiConfig'
import './UserBidHistoryModal.css'

// Используем синхронную версию для инициализации, затем обновим при загрузке
let API_BASE_URL = getApiBaseUrlSync()

const UserBidHistoryModal = ({ isOpen, onClose, property, userId }) => {
  const { t, i18n } = useTranslation()
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
    if (isOpen && property?.id && userId) {
      const initAndLoad = async () => {
        const url = await getApiBaseUrl()
        API_BASE_URL = url
        await loadBids(true)
      }
      initAndLoad()
    } else if (!isOpen) {
      // Сбрасываем состояние при закрытии
      setIsInitialLoad(true)
      setBids([])
    }
  }, [isOpen, property?.id, userId])
  
  const loadBids = async (showLoading = false) => {
    if (!property?.id || !userId) return
    
    if (showLoading) {
      setIsLoading(true)
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/bids/user/${userId}/property/${property.id}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          const bidsData = data.data || []
          // Сортируем ставки по дате создания (новые первые)
          const sortedBids = [...bidsData].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          
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
      console.error('❌ Ошибка загрузки истории ставок:', error)
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

  const formatPrice = (price) => {
    const num = Number(price)
    if (!num || Number.isNaN(num)) return '—'
    return `$${num.toLocaleString(i18n.language || 'en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatDateTime = (date) => {
    if (!date) return ''
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleString(i18n.language || 'en', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Вычисляем изменение ставки
  const getBidChange = (currentBid, previousBid) => {
    if (!previousBid) return null
    const change = currentBid.bid_amount - previousBid.bid_amount
    return {
      amount: change,
      isIncrease: change > 0
    }
  }

  return (
    <div className="user-bid-history-overlay" onClick={onClose}>
      <div className="user-bid-history-modal" onClick={(e) => e.stopPropagation()}>
        <button 
          className="user-bid-history-modal__close" 
          onClick={onClose}
          aria-label={t('close')}
        >
          <FiX size={24} />
        </button>

        <div className="user-bid-history-modal__content">
          <div className="user-bid-history-modal__header">
            <h2 className="user-bid-history-modal__title">{t('userBidHistory_title')}</h2>
            <p className="user-bid-history-modal__subtitle">{property?.title || t('userBidHistory_defaultProperty')}</p>
          </div>

          {isLoading && isInitialLoad ? (
            <div className="user-bid-history-loading">
              {t('userBidHistory_loading')}
            </div>
          ) : bids.length === 0 ? (
            <p className="user-bid-history-placeholder">
              {t('userBidHistory_empty')}
            </p>
          ) : (
            <div className="user-bid-history-list">
              <div className="user-bid-history-list__header">
                <h3 className="user-bid-history-list__title">{t('userBidHistory_listTitle', { count: bids.length })}</h3>
              </div>
              <div className="user-bids-list">
                {bids.map((bid, index) => {
                  const previousBid = index < bids.length - 1 ? bids[index + 1] : null
                  const change = getBidChange(bid, previousBid)
                  const isLatest = index === 0
                  
                  return (
                    <div key={bid.id || index} className={`user-bid-item ${isLatest ? 'user-bid-item--latest' : ''}`}>
                      <div className="user-bid-item__info">
                        <div className="user-bid-item__header">
                          <div className="user-bid-item__number">
                            #{bids.length - index}
                            {isLatest && <span className="user-bid-item__badge">{t('userBidHistory_currentBadge')}</span>}
                          </div>
                          <div className="user-bid-item__amount">
                            {formatPrice(bid.bid_amount)}
                          </div>
                        </div>
                        {change && (
                          <div className={`user-bid-item__change ${change.isIncrease ? 'user-bid-item__change--increase' : 'user-bid-item__change--decrease'}`}>
                            {change.isIncrease ? (
                              <FiTrendingUp size={14} />
                            ) : (
                              <FiTrendingDown size={14} />
                            )}
                            <span>{change.isIncrease ? '+' : ''}{formatPrice(change.amount)}</span>
                          </div>
                        )}
                        <div className="user-bid-item__details">
                          <div className="user-bid-item__time">
                            <FiClock size={12} />
                            {formatDateTime(bid.created_at)}
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

export default UserBidHistoryModal


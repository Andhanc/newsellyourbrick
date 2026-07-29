import { useEffect, useState } from 'react'
import { FiAlertCircle, FiX, FiArrowRight } from 'react-icons/fi'
import './BidOutbidNotification.css'

const BidOutbidNotification = ({ notification, onClose, onGoToProperty }) => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Анимация появления
    setTimeout(() => setIsVisible(true), 100)
  }, [])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(() => {
      onClose()
    }, 300)
  }

  const handleGoToProperty = () => {
    setIsVisible(false)
    setTimeout(() => {
      onClose()
      if (onGoToProperty && notification?.data?.property_id) {
        onGoToProperty(notification.data.property_id)
      }
    }, 300)
  }

  if (!notification) return null

  const newBidAmount = notification.data?.new_bid_amount || 0
  const formattedBid = newBidAmount.toLocaleString('ru-RU', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })

  return (
    <div className={`bid-outbid-notification ${isVisible ? 'bid-outbid-notification--visible' : ''}`}>
      <div className="bid-outbid-notification__content">
        <div className="bid-outbid-notification__icon">
          <FiAlertCircle size={32} />
        </div>
        <div className="bid-outbid-notification__text">
          <h3 className="bid-outbid-notification__title">{notification.title || 'Вашу ставку перебили'}</h3>
          <p className="bid-outbid-notification__message">
            {notification.message || `Новая максимальная ставка: ${formattedBid}`}
          </p>
        </div>
        <button
          className="bid-outbid-notification__close"
          onClick={handleClose}
          aria-label="Закрыть"
        >
          <FiX size={20} />
        </button>
      </div>
      {notification.data?.property_id && (
        <div className="bid-outbid-notification__actions">
          <button
            className="bid-outbid-notification__button"
            onClick={handleGoToProperty}
          >
            Сделать новую ставку
            <FiArrowRight size={18} />
          </button>
        </div>
      )}
    </div>
  )
}

export default BidOutbidNotification




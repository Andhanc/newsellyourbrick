import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Clock } from 'lucide-react'
import {
  formatListingAuctionTimeLeft,
  getListingAuctionTimerStatus,
} from '../utils/formatListingAuctionTimeLeft'
import './ListingCardAuctionTimer.css'

function ListingCardAuctionTimer({ endTime, endedLabel, className = '' }) {
  const { t } = useTranslation()
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(timer)
  }, [endTime])

  const diffMs = endTime ? new Date(endTime).getTime() - Date.now() : 0
  const isEnded = !endTime || diffMs <= 0
  const days = isEnded ? 0 : Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const statusClass = getListingAuctionTimerStatus(days)
  const isCritical = !isEnded && days < 30
  const timeText = isEnded ? null : formatListingAuctionTimeLeft(endTime, t)

  void tick

  if (isEnded) {
    return (
      <div
        className={`listing-card-auction-timer listing-card-auction-timer--ended ${className}`.trim()}
        role="status"
      >
        <p className="listing-card-auction-timer__ended">{endedLabel}</p>
      </div>
    )
  }

  return (
    <div
      className={`listing-card-auction-timer ${statusClass}${
        isCritical ? ' timer-critical' : ''
      } ${className}`.trim()}
    >
      <p className="listing-card-auction-timer__prefix">{t('debtsCardAuctionEndsPrefix')}</p>
      <p className="listing-card-auction-timer__time">
        <Clock size={14} strokeWidth={2.2} aria-hidden />
        <span>{timeText}</span>
      </p>
    </div>
  )
}

export default ListingCardAuctionTimer

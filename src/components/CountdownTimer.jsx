import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import './CountdownTimer.css'

const CountdownTimer = ({ endTime }) => {
  const { t } = useTranslation()
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  })

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime()
      const end = new Date(endTime).getTime()
      const difference = end - now

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24))
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((difference % (1000 * 60)) / 1000)

        return { days, hours, minutes, seconds }
      }
      return { days: 0, hours: 0, minutes: 0, seconds: 0 }
    }

    setTimeLeft(calculateTimeLeft())
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)

    return () => clearInterval(timer)
  }, [endTime])

  const days = timeLeft.days

  let statusClass = 'timer-short'
  if (days > 28) {
    statusClass = 'timer-long'
  } else if (days > 14) {
    statusClass = 'timer-medium'
  }

  const isCritical = days < 7

  return (
    <div className={`countdown-timer ${statusClass} ${isCritical ? 'timer-critical' : ''}`}>
      <div className="timer-segments">
        <div className="timer-segment">
          <span className="timer-value">{String(timeLeft.days).padStart(2, '0')}</span>
          <span className="timer-unit">{t('timerDay')}</span>
        </div>
        <div className="timer-segment">
          <span className="timer-value">{String(timeLeft.hours).padStart(2, '0')}</span>
          <span className="timer-unit">{t('timerHour')}</span>
        </div>
        <div className="timer-segment">
          <span className="timer-value">{String(timeLeft.minutes).padStart(2, '0')}</span>
          <span className="timer-unit">{t('timerMin')}</span>
        </div>
        <div className="timer-segment">
          <span className="timer-value">{String(timeLeft.seconds).padStart(2, '0')}</span>
          <span className="timer-unit">{t('timerSec')}</span>
        </div>
      </div>
    </div>
  )
}

export default CountdownTimer


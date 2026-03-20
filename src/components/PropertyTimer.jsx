import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import './PropertyTimer.css'

const PropertyTimer = ({ endTime, compact = false, className = '' }) => {
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

  // Логика цветов таймера (в днях):
  // Зеленый: от 90 дней и больше (от 3 месяцев)
  // Оранжевый: от 60 до 90 дней (от 2 до 3 месяцев)
  // Красный: от 30 до 60 дней (от 1 до 2 месяцев)
  // Красный мигающий: меньше 30 дней (меньше 1 месяца)
  let statusClass = 'timer-short' // По умолчанию красный
  if (days >= 90) {
    statusClass = 'timer-long' // Зеленый: от 3 месяцев и больше
  } else if (days >= 60) {
    statusClass = 'timer-medium' // Оранжевый: от 2 до 3 месяцев
  }
  // Для дней < 60 остается 'timer-short' (красный)

  const isCritical = days < 30 // Красный мигающий: меньше 1 месяца

  if (compact) {
    const hasDays = timeLeft.days > 0
    const hasHours = timeLeft.hours > 0
    
    return (
      <div
        className={`property-timer compact ${statusClass} ${isCritical ? 'timer-critical' : ''} ${className}`.trim()}
      >
        <div className="timer-compact-time">
          {hasDays && (
            <>
              <span className="time-unit"><span className="time-value">{String(timeLeft.days).padStart(2, '0')}</span><span className="time-label">{t('timerDay')}</span></span>
              <span className="timer-separator">:</span>
            </>
          )}
          {hasHours && (
            <>
              <span className="time-unit"><span className="time-value">{String(timeLeft.hours).padStart(2, '0')}</span><span className="time-label">{t('timerHour')}</span></span>
              <span className="timer-separator">:</span>
            </>
          )}
          <span className="time-unit"><span className="time-value">{String(timeLeft.minutes).padStart(2, '0')}</span><span className="time-label">{t('timerMin')}</span></span>
          <span className="timer-separator">:</span>
          <span className="time-unit"><span className="time-value">{String(timeLeft.seconds).padStart(2, '0')}</span><span className="time-label">{t('timerSec')}</span></span>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`property-timer property-timer--detail ${statusClass} ${isCritical ? 'timer-critical' : ''} ${className}`.trim()}
    >
      <div className="timer-compact-time timer-compact-time--detail">
        {String(timeLeft.days).padStart(2, '0')}{t('timerDay')} {String(timeLeft.hours).padStart(2, '0')}{t('timerHour')} {String(timeLeft.minutes).padStart(2, '0')}{t('timerMin')} {String(timeLeft.seconds).padStart(2, '0')}{t('timerSec')}
      </div>
    </div>
  )
}

export default PropertyTimer


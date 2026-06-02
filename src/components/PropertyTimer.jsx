import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import './PropertyTimer.css'
import { FlipNumber } from '@/components/ui/flip-countdown'

const PropertyTimer = ({
  endTime,
  compact = false,
  className = '',
  auctionEndedLabel = null,
  showUnitLabels = false,
  unitSeparator = ':',
}) => {
  const { t } = useTranslation()
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  })
  const [isEnded, setIsEnded] = useState(false)

  useEffect(() => {
    const tick = () => {
      const now = new Date().getTime()
      const end = new Date(endTime).getTime()
      const difference = end - now

      setIsEnded(difference <= 0)

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24))
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((difference % (1000 * 60)) / 1000)
        setTimeLeft({ days, hours, minutes, seconds })
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
      }
    }

    tick()
    const timer = setInterval(tick, 1000)

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
  const hasThreeDigitDays = days >= 100

  if (compact) {
    if (isEnded && auctionEndedLabel) {
      return (
        <div className={`property-timer compact property-timer--auction-ended ${className}`.trim()}>
          <div className="property-timer-ended-pill" role="status">
            {auctionEndedLabel}
          </div>
        </div>
      )
    }

    const hasDays = timeLeft.days > 0
    const hasHours = timeLeft.hours > 0
    // Как на странице объекта: если есть дни, часы всегда показываем (в т.ч. 00), не пропускаем сегмент
    const showHours = hasDays || hasHours

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
          {showHours && (
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

  // Digit color based on days remaining
  let digitColor = '#dc2626' // red (< 60 days)
  if (days >= 90) digitColor = '#16a34a'      // green
  else if (days >= 60) digitColor = '#f97316' // orange

  /* Крупный flip; узкие экраны поджимаются в CSS (container / mobile) */
  const flipStyle = showUnitLabels
    ? {
        '--flip-card-width': '22px',
        '--flip-card-height': '32px',
        '--flip-card-font-size': '16px',
      }
    : {
        '--flip-card-width': '40px',
        '--flip-card-height': '58px',
        '--flip-card-font-size': '29px',
      }

  const sepChar = unitSeparator === 'dot' ? '·' : ':'
  const sepClass =
    unitSeparator === 'dot'
      ? 'property-timer-detail-sep property-timer-detail-sep--dot'
      : 'property-timer-detail-sep'

  const renderDetailUnit = (value, labelKey) => (
    <div className="property-timer-detail-unit">
      <FlipNumber
        value={String(value).padStart(2, '0')}
        padTo={2}
        style={flipStyle}
        textColor={digitColor}
      />
      {showUnitLabels ? (
        <span className="property-timer-detail-unit-label">{t(labelKey)}</span>
      ) : null}
    </div>
  )

  if (isEnded && auctionEndedLabel) {
    return (
      <div
        className={`property-timer property-timer--detail property-timer--auction-ended ${className}`.trim()}
        role="status"
      >
        <div className="property-timer-ended-detail">{auctionEndedLabel}</div>
      </div>
    )
  }

  return (
    <div
      className={`property-timer property-timer--detail ${statusClass} ${isCritical ? 'timer-critical' : ''} ${hasThreeDigitDays ? 'property-timer--days-3' : ''} ${className}`.trim()}
    >
      <div className="property-timer-detail-flip-row">
        {renderDetailUnit(timeLeft.days, 'timerDay')}
        <span className={sepClass} aria-hidden="true">
          {sepChar}
        </span>
        {renderDetailUnit(timeLeft.hours, 'timerHour')}
        <span className={sepClass} aria-hidden="true">
          {sepChar}
        </span>
        {renderDetailUnit(timeLeft.minutes, 'timerMin')}
        <span className={sepClass} aria-hidden="true">
          {sepChar}
        </span>
        {renderDetailUnit(timeLeft.seconds, 'timerSec')}
      </div>
    </div>
  )
}

export default PropertyTimer


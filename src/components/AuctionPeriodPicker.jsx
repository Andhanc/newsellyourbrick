import { useState, useEffect, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { FiCalendar, FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import { ArrowRight } from 'lucide-react'
import { getOwnerTestIntlLocale } from '../utils/ownerTestI18n'
import { getMinAuctionEndDate } from '../utils/oapPricingValidation'
import './AuctionPeriodPicker.css'

/** Локальная полночь; при невалидной строке (в т.ч. пробелы) — fallback. */
const parseDayOr = (value, fallback) => {
  const base = new Date(fallback)
  base.setHours(0, 0, 0, 0)
  if (value == null) return base
  const raw = String(value).trim()
  if (!raw) return base
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return base
  d.setHours(0, 0, 0, 0)
  return d
}

function toYmd(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function monthIndex(date) {
  return date.getFullYear() * 12 + date.getMonth()
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

const AuctionPeriodPicker = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  label,
  variant = 'default',
  layout = 'default',
  minMonths = 3,
  minDays = 15,
  disableMinConstraints = false,
}) => {
  const { t, i18n } = useTranslation()
  const locale = getOwnerTestIntlLocale(i18n.language)

  const [error, setError] = useState('')
  const [selectedEnd, setSelectedEnd] = useState(endDate || '')
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()))

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const effectiveStart = useMemo(() => parseDayOr(startDate, today), [startDate, today])
  const effectiveStartStr = toYmd(effectiveStart)

  const minEndDateStr = useMemo(() => {
    if (disableMinConstraints) return undefined
    return getMinAuctionEndDate(effectiveStartStr, minMonths, minDays)
  }, [disableMinConstraints, effectiveStartStr, minMonths, minDays])

  const minEndDate = useMemo(
    () => (minEndDateStr ? parseDayOr(minEndDateStr, today) : null),
    [minEndDateStr, today],
  )

  const firstSelectableMonth = useMemo(() => {
    const anchor = minEndDate || effectiveStart
    return startOfMonth(anchor)
  }, [effectiveStart, minEndDate])

  const minEndFormatted = useMemo(() => {
    if (!minEndDate) return ''
    return minEndDate.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }, [locale, minEndDate])

  const weekDays = useMemo(() => {
    const monday = new Date(2024, 0, 1)
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(monday)
      day.setDate(monday.getDate() + index)
      return day.toLocaleDateString(locale, { weekday: 'short' })
    })
  }, [locale])

  const monthLabel = currentMonth.toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  })

  const validateEndDate = useCallback(
    (endDateStr) => {
      if (!endDateStr) {
        setError('')
        return true
      }

      if (disableMinConstraints) {
        setError('')
        return true
      }

      if (!minEndDate) {
        setError('')
        return true
      }

      const end = parseDayOr(endDateStr, today)
      if (end < minEndDate) {
        const minDateStr = minEndDate.toLocaleDateString(locale, {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
        setError(t('addPropertyPriceAuctionMinPeriodError', { date: minDateStr }))
        return false
      }

      setError('')
      return true
    },
    [disableMinConstraints, locale, minEndDate, t, today],
  )

  useEffect(() => {
    const todayStr = toYmd(today)
    const raw = startDate == null ? '' : String(startDate).trim()
    if (!raw || Number.isNaN(new Date(raw).getTime())) {
      onStartDateChange(todayStr)
    }
  }, [onStartDateChange, startDate, today])

  useEffect(() => {
    setSelectedEnd(endDate || '')
  }, [endDate])

  useEffect(() => {
    if (endDate) {
      validateEndDate(endDate)
      const end = parseDayOr(endDate, today)
      setCurrentMonth(startOfMonth(end))
      return
    }

    setError('')
    setCurrentMonth(firstSelectableMonth)
  }, [endDate, firstSelectableMonth, today, validateEndDate])

  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7

    const days = []
    for (let i = 0; i < startingDayOfWeek; i += 1) {
      days.push(null)
    }
    for (let i = 1; i <= lastDay.getDate(); i += 1) {
      days.push(new Date(year, month, i))
    }
    return days
  }

  const days = getDaysInMonth(currentMonth)
  const canGoPrev = monthIndex(currentMonth) > monthIndex(firstSelectableMonth)

  const isDateSelectable = (date) => {
    if (!date) return false
    const check = new Date(date)
    check.setHours(0, 0, 0, 0)
    if (check < effectiveStart) return false
    if (minEndDate && check < minEndDate) return false
    return true
  }

  const isDateStart = (date) => date && isSameDay(date, effectiveStart)

  const isDateEnd = (date) => {
    if (!date || !selectedEnd) return false
    return isSameDay(date, parseDayOr(selectedEnd, today))
  }

  const isDateInRange = (date) => {
    if (!date || !selectedEnd) return false
    const check = new Date(date)
    check.setHours(0, 0, 0, 0)
    const start = new Date(effectiveStart)
    const end = parseDayOr(selectedEnd, today)
    return check > start && check < end
  }

  const shouldRenderDay = (date) => {
    if (!date) return false
    return isDateSelectable(date) || isDateStart(date) || isDateEnd(date) || isDateInRange(date)
  }

  const handleDayClick = (date, event) => {
    if (!date || !isDateSelectable(date)) return
    const nextEnd = toYmd(date)
    if (validateEndDate(nextEnd)) {
      setSelectedEnd(nextEnd)
      onEndDateChange(nextEnd)
      event.currentTarget.blur()
    }
  }

  const formatSummaryDate = (value) => {
    const date = parseDayOr(value, today)
    return {
      primary: date.toLocaleDateString(locale, { day: 'numeric', month: 'short' }),
      secondary: date.toLocaleDateString(locale, { weekday: 'long' }),
    }
  }

  const startSummary = formatSummaryDate(effectiveStartStr)
  const endSummary = selectedEnd ? formatSummaryDate(selectedEnd) : null

  const isEmbedded = variant === 'embedded'
  const isJourney = layout === 'journey'
  const pickerClassName = [
    'auction-period-picker',
    isEmbedded ? 'auction-period-picker--embedded' : '',
    isJourney ? 'auction-period-picker--journey' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const inlineCalendar = (
    <div className="auction-period-inline">
      <div className="auction-period-inline__calendar">
        <div className="auction-period-inline__header">
          <button
            type="button"
            className="auction-period-inline__nav"
            aria-label={t('ownerTestDriveCalendarPrev')}
            disabled={!canGoPrev}
            onClick={() =>
              setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
            }
          >
            <FiChevronLeft size={18} />
          </button>
          <div className="auction-period-inline__month">{monthLabel}</div>
          <button
            type="button"
            className="auction-period-inline__nav"
            aria-label={t('ownerTestDriveCalendarNext')}
            onClick={() =>
              setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
            }
          >
            <FiChevronRight size={18} />
          </button>
        </div>

        <div className="auction-period-inline__weekdays">
          {weekDays.map((day) => (
            <div key={day} className="auction-period-inline__weekday">
              {day}
            </div>
          ))}
        </div>

        <div className="auction-period-inline__days" role="grid" aria-label={t('oap_pricingAuctionPeriod')}>
          {days.map((date, index) => {
            if (!date || !shouldRenderDay(date)) {
              return (
                <div
                  key={date ? toYmd(date) : `empty-${index}`}
                  className="auction-period-inline__day auction-period-inline__day--empty"
                  aria-hidden
                />
              )
            }

            const dayClassNames = [
              'auction-period-inline__day',
              isDateStart(date) ? 'auction-period-inline__day--start' : '',
              isDateEnd(date) ? 'auction-period-inline__day--end' : '',
              isDateInRange(date) ? 'auction-period-inline__day--in-range' : '',
              isDateSelectable(date) ? 'auction-period-inline__day--selectable' : '',
            ]
              .filter(Boolean)
              .join(' ')

            return (
              <button
                key={toYmd(date)}
                type="button"
                className={dayClassNames}
                aria-pressed={isDateEnd(date)}
                onClick={(event) => handleDayClick(date, event)}
              >
                <span className="auction-period-inline__day-num">{date.getDate()}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="auction-period-inline__summary">
        <div className="auction-period-inline__summary-col">
          <span className="auction-period-inline__summary-label">{t('oap_auctionCalendarStartLabel')}</span>
          <span className="auction-period-inline__summary-date">{startSummary.primary}</span>
          <span className="auction-period-inline__summary-weekday">{startSummary.secondary}</span>
        </div>

        <span className="auction-period-inline__summary-arrow" aria-hidden>
          <ArrowRight size={16} strokeWidth={2.25} />
        </span>

        <div className="auction-period-inline__summary-col auction-period-inline__summary-col--end">
          <span className="auction-period-inline__summary-label">{t('oap_auctionCalendarEndLabel')}</span>
          {endSummary ? (
            <>
              <span className="auction-period-inline__summary-date">{endSummary.primary}</span>
              <span className="auction-period-inline__summary-weekday">{endSummary.secondary}</span>
            </>
          ) : (
            <span className="auction-period-inline__summary-placeholder">
              {t('oap_auctionCalendarEndPlaceholder')}
            </span>
          )}
        </div>
      </div>

      {!disableMinConstraints && error ? (
        <div className="auction-period-error">{error}</div>
      ) : null}
    </div>
  )

  const minDurationHint =
    !disableMinConstraints ? (
      <aside className="auction-period-hint" aria-label={t('auctionPeriodMinDurationTitle')}>
        <p className="auction-period-hint__title">{t('auctionPeriodMinDurationTitle')}</p>
        <p className="auction-period-hint__text">{t('auctionPeriodMinDurationLead')}</p>
        <ul className="auction-period-hint__list">
          <li>{t('auctionPeriodMinDurationReasonBuyers')}</li>
          <li>{t('auctionPeriodMinDurationReasonSellers')}</li>
          <li>{t('auctionPeriodMinDurationReasonTrust')}</li>
        </ul>
        {minEndFormatted ? (
          <p className="auction-period-hint__earliest">
            {t('auctionPeriodMinDurationEarliest', { date: minEndFormatted })}
          </p>
        ) : null}
      </aside>
    ) : null

  const inlineCalendarWithHint = (
    <>
      {minDurationHint}
      {inlineCalendar}
    </>
  )

  if (isJourney) {
    return <div className={pickerClassName}>{inlineCalendarWithHint}</div>
  }

  return (
    <div className={pickerClassName}>
      {label && !isEmbedded ? (
        <div className="auction-period-header">
          <span className="auction-period-header__icon" aria-hidden="true">
            <FiCalendar size={22} strokeWidth={2} />
          </span>
          <label className="auction-period-label">{label}</label>
        </div>
      ) : null}

      <div className="auction-period-content">{inlineCalendarWithHint}</div>
    </div>
  )
}

export default AuctionPeriodPicker

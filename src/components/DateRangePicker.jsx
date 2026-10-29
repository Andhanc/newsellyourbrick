import { useMemo, useState } from 'react'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import { getMonthLabels, resolveCalendarLocale } from '../utils/testDriveCalendarLocale'
import './DateRangePicker.css'

const DateRangePicker = ({ startDate, endDate, onStartDateChange, onEndDateChange, label }) => {
  const { t, i18n } = useTranslation()
  const locale = resolveCalendarLocale(undefined, i18n.language)
  const [currentMonth, setCurrentMonth] = useState(() => {
    const date = startDate ? new Date(startDate) : new Date()
    return new Date(date.getFullYear(), date.getMonth(), 1)
  })

  const monthNames = useMemo(() => getMonthLabels(locale), [locale])
  const weekDays = useMemo(() => {
    const monday = new Date(2024, 0, 1)
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(monday)
      day.setDate(monday.getDate() + index)
      return day.toLocaleDateString(locale, { weekday: 'short' })
    })
  }, [locale])

  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7

    const days = []
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i))
    }
    return days
  }

  const handleDateClick = (date) => {
    if (!date) return
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (date < today) return

    const dateStr = date.toISOString().split('T')[0]
    
    if (!startDate || (startDate && endDate) || (startDate && date < new Date(startDate))) {
      onStartDateChange(dateStr)
      onEndDateChange('')
    } else if (startDate && !endDate) {
      if (date >= new Date(startDate)) {
        onEndDateChange(dateStr)
      } else {
        onStartDateChange(dateStr)
        onEndDateChange('')
      }
    }
  }

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  const isDateInRange = (date) => {
    if (!date || !startDate) return false
    if (!endDate) return false
    
    const check = new Date(date)
    check.setHours(0, 0, 0, 0)
    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(endDate)
    end.setHours(0, 0, 0, 0)
    
    return check > start && check < end
  }

  const isDateStart = (date) => {
    if (!date || !startDate) return false
    return date.toDateString() === new Date(startDate).toDateString()
  }

  const isDateEnd = (date) => {
    if (!date || !endDate) return false
    return date.toDateString() === new Date(endDate).toDateString()
  }

  const isDateDisabled = (date) => {
    if (!date) return true
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const check = new Date(date)
    check.setHours(0, 0, 0, 0)
    return check < today
  }

  const days = getDaysInMonth(currentMonth)

  return (
    <div className="date-range-picker">
      {label && <label className="date-range-picker__label">{label}</label>}
      <div className="date-range-picker__calendar">
        <div className="date-range-picker__header">
          <button
            type="button"
            className="date-range-picker__nav-btn"
            onClick={handlePrevMonth}
          >
            <FiChevronLeft size={18} />
          </button>
          <div className="date-range-picker__month-year">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </div>
          <button
            type="button"
            className="date-range-picker__nav-btn"
            onClick={handleNextMonth}
          >
            <FiChevronRight size={18} />
          </button>
        </div>
        
        <div className="date-range-picker__weekdays">
          {weekDays.map((day, index) => (
            <div key={index} className="date-range-picker__weekday">
              {day}
            </div>
          ))}
        </div>
        
        <div className="date-range-picker__days">
          {days.map((date, index) => (
            <button
              key={index}
              type="button"
              className={`date-range-picker__day ${
                !date ? 'date-range-picker__day--empty' : ''
              } ${
                date && isDateStart(date) ? 'date-range-picker__day--start' : ''
              } ${
                date && isDateEnd(date) ? 'date-range-picker__day--end' : ''
              } ${
                date && isDateInRange(date) ? 'date-range-picker__day--in-range' : ''
              } ${
                date && isDateDisabled(date) ? 'date-range-picker__day--disabled' : ''
              }`}
              onClick={() => handleDateClick(date)}
              disabled={!date || isDateDisabled(date)}
            >
              {date ? date.getDate() : ''}
            </button>
          ))}
        </div>
        
        {(startDate || endDate) && (
          <div className="date-range-picker__selected">
            {startDate && (
              <div className="date-range-picker__selected-item">
                <span className="date-range-picker__selected-label">{t('dateRangeFrom')}</span>
                <span className="date-range-picker__selected-value">
                  {new Date(startDate).toLocaleDateString(locale)}
                </span>
              </div>
            )}
            {endDate && (
              <div className="date-range-picker__selected-item">
                <span className="date-range-picker__selected-label">{t('dateRangeTo')}</span>
                <span className="date-range-picker__selected-value">
                  {new Date(endDate).toLocaleDateString(locale)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default DateRangePicker

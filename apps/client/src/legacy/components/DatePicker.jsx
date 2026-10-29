import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import './DatePicker.css'

const DatePicker = ({ value, onChange, label, minDate }) => {
  const { i18n } = useTranslation()
  const locale = (i18n.language || 'en').split('-')[0]

  const [currentMonth, setCurrentMonth] = useState(() => {
    if (value) {
      const date = new Date(value)
      return new Date(date.getFullYear(), date.getMonth(), 1)
    }
    return new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  })

  const [selectedDate, setSelectedDate] = useState(value ? new Date(value) : null)

  const monthNames = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { month: 'long' })
    return Array.from({ length: 12 }, (_, month) => {
      const labelText = fmt.format(new Date(2020, month, 1))
      return labelText.charAt(0).toUpperCase() + labelText.slice(1)
    })
  }, [locale])

  const weekDays = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: 'short' })
    // Monday-first week (2021-01-04 is a Monday)
    return Array.from({ length: 7 }, (_, i) => {
      const day = fmt.format(new Date(2021, 0, 4 + i))
      return day.charAt(0).toUpperCase() + day.slice(1)
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
    const dateStr = date.toISOString().split('T')[0]
    setSelectedDate(date)
    onChange(dateStr)
  }

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  const isDateDisabled = (date) => {
    if (!date) return true
    if (minDate) {
      const min = new Date(minDate)
      min.setHours(0, 0, 0, 0)
      const check = new Date(date)
      check.setHours(0, 0, 0, 0)
      return check < min
    }
    return false
  }

  const isDateSelected = (date) => {
    if (!date || !selectedDate) return false
    return date.toDateString() === selectedDate.toDateString()
  }

  const days = getDaysInMonth(currentMonth)

  return (
    <div className="date-picker">
      {label && <label className="date-picker__label">{label}</label>}
      <div className="date-picker__calendar">
        <div className="date-picker__header">
          <button
            type="button"
            className="date-picker__nav-btn"
            onClick={handlePrevMonth}
          >
            <FiChevronLeft size={20} />
          </button>
          <div className="date-picker__month-year">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </div>
          <button
            type="button"
            className="date-picker__nav-btn"
            onClick={handleNextMonth}
          >
            <FiChevronRight size={20} />
          </button>
        </div>

        <div className="date-picker__weekdays">
          {weekDays.map((day, index) => (
            <div key={index} className="date-picker__weekday">
              {day}
            </div>
          ))}
        </div>

        <div className="date-picker__days">
          {days.map((date, index) => (
            <button
              key={index}
              type="button"
              className={`date-picker__day ${
                !date ? 'date-picker__day--empty' : ''
              } ${
                date && isDateSelected(date) ? 'date-picker__day--selected' : ''
              } ${
                date && isDateDisabled(date) ? 'date-picker__day--disabled' : ''
              }`}
              onClick={() => handleDateClick(date)}
              disabled={!date || isDateDisabled(date)}
            >
              {date ? date.getDate() : ''}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default DatePicker

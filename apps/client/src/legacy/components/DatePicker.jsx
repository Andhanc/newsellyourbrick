import { useState } from 'react'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import './DatePicker.css'

const DatePicker = ({ value, onChange, label, minDate }) => {
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (value) {
      const date = new Date(value)
      return new Date(date.getFullYear(), date.getMonth(), 1)
    }
    return new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  })

  const [selectedDate, setSelectedDate] = useState(value ? new Date(value) : null)

  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ]

  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7 // Понедельник = 0

    const days = []
    
    // Пустые ячейки для дней предыдущего месяца
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // Дни текущего месяца
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

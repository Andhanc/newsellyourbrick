import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import './AuctionPeriodPicker.css'

const AuctionPeriodPicker = ({ startDate, endDate, onStartDateChange, onEndDateChange, label }) => {
  const { t } = useTranslation()

  const [endDateValue, setEndDateValue] = useState(endDate || '')
  const [error, setError] = useState('')

  const MIN_MONTHS = 3
  const MIN_DAYS = 15 // 3.5 месяца = 3 месяца + 15 дней

  // Автоматически устанавливаем сегодняшнюю дату как дату начала
  useEffect(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]
    
    if (!startDate || startDate !== todayStr) {
      onStartDateChange(todayStr)
    }
  }, [])

  useEffect(() => {
    if (endDate) {
      setEndDateValue(endDate)
      validateEndDate(endDate)
    }
  }, [endDate, startDate])

  const calculateMinEndDate = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const start = startDate ? new Date(startDate) : today
    const minEnd = new Date(start)
    
    // Добавляем 3 месяца
    minEnd.setMonth(minEnd.getMonth() + MIN_MONTHS)
    // Добавляем 15 дней
    minEnd.setDate(minEnd.getDate() + MIN_DAYS)
    
    return minEnd.toISOString().split('T')[0]
  }

  const validateEndDate = (endDateStr) => {
    if (!endDateStr) {
      setError('')
      return true
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const start = startDate ? new Date(startDate) : today
    const end = new Date(endDateStr)
    const minEnd = new Date(start)
    
    // Добавляем 3 месяца
    minEnd.setMonth(minEnd.getMonth() + MIN_MONTHS)
    // Добавляем 15 дней
    minEnd.setDate(minEnd.getDate() + MIN_DAYS)
    
    if (end < minEnd) {
      const minDateStr = minEnd.toLocaleDateString(undefined, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
      setError(t('addPropertyPriceAuctionMinPeriodError', { date: minDateStr }))
      return false
    }
    
    setError('')
    return true
  }

  const handleEndDateChange = (e) => {
    const date = e.target.value
    setEndDateValue(date)
    
    if (validateEndDate(date)) {
      onEndDateChange(date)
    }
  }

  const minEndDate = calculateMinEndDate()

  return (
    <div className="auction-period-picker">
      {label && <label className="auction-period-label">{label}</label>}
      
      <div className="auction-period-content">
        <div className="auction-period-end-date">
          <label className="auction-period-field-label">{t('addPropertyPriceAuctionEndDateLabel')}</label>
          <input
            type="date"
            value={endDateValue}
            onChange={handleEndDateChange}
            className={`auction-period-date-input ${error ? 'auction-period-date-input--error' : ''}`}
            min={minEndDate}
          />
          {error && (
            <div className="auction-period-error">
              {error}
            </div>
          )}
          {!error && minEndDate && (
            <div className="auction-period-hint">
              {t('addPropertyPriceMinEndDateHint')}{' '}
              {new Date(minEndDate).toLocaleDateString(undefined, {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AuctionPeriodPicker

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
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

const AuctionPeriodPicker = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  label,
  // В админ-режиме можно убрать минимальные ограничения по периоду.
  minMonths = 3,
  minDays = 15,
  disableMinConstraints = false,
}) => {
  const { t } = useTranslation()

  const [endDateValue, setEndDateValue] = useState(endDate || '')
  const [error, setError] = useState('')

  // Дата начала по умолчанию — сегодня; пустая/пробельная/невалидная строка тоже заменяется.
  useEffect(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]
    const raw = startDate == null ? '' : String(startDate).trim()
    if (!raw) {
      onStartDateChange(todayStr)
      return
    }
    if (Number.isNaN(new Date(raw).getTime())) {
      onStartDateChange(todayStr)
    }
  }, [startDate, onStartDateChange])

  useEffect(() => {
    if (endDate) {
      setEndDateValue(endDate)
      validateEndDate(endDate)
    }
  }, [endDate, startDate])

  const calculateMinEndDate = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const start = parseDayOr(startDate, today)
    const minEnd = new Date(start)

    const m = Number(minMonths)
    const dayAdd = Number(minDays)
    minEnd.setMonth(minEnd.getMonth() + (Number.isFinite(m) ? m : 0))
    minEnd.setDate(minEnd.getDate() + (Number.isFinite(dayAdd) ? dayAdd : 0))

    if (Number.isNaN(minEnd.getTime())) return undefined
    return minEnd.toISOString().split('T')[0]
  }

  const validateEndDate = (endDateStr) => {
    if (!endDateStr) {
      setError('')
      return true
    }

    if (disableMinConstraints) {
      setError('')
      return true
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const start = parseDayOr(startDate, today)
    const end = new Date(endDateStr)
    if (Number.isNaN(end.getTime())) {
      setError('')
      return true
    }
    const minEnd = new Date(start)

    const m = Number(minMonths)
    const dayAdd = Number(minDays)
    minEnd.setMonth(minEnd.getMonth() + (Number.isFinite(m) ? m : 0))
    minEnd.setDate(minEnd.getDate() + (Number.isFinite(dayAdd) ? dayAdd : 0))
    if (Number.isNaN(minEnd.getTime())) {
      setError('')
      return true
    }
    
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

  const minEndDate = disableMinConstraints ? undefined : calculateMinEndDate()

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
              min={minEndDate || undefined}
          />
          {!disableMinConstraints && error && (
            <div className="auction-period-error">
              {error}
            </div>
          )}
          {!disableMinConstraints && !error && minEndDate && (
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

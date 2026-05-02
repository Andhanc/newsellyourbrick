import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  FiCalendar,
  FiArrowRight,
  FiInbox,
  FiChevronLeft,
  FiChevronRight,
  FiBarChart2,
  FiArrowLeft,
} from 'react-icons/fi'
import { formatMoneyFromMinorUnits } from '../utils/formatStripeMoney'
import './OwnerTestDriveSection.css'

function formatDateRange(start, end, locale) {
  try {
    const s = new Date(`${start}T12:00:00`)
    const e = new Date(`${end}T12:00:00`)
    const opts = { day: 'numeric', month: 'long', year: 'numeric' }
    return `${s.toLocaleDateString(locale, opts)} — ${e.toLocaleDateString(locale, opts)}`
  } catch {
    return `${start} — ${end}`
  }
}

function parseBookingDate(str) {
  if (!str) return null
  const raw = String(str).trim().slice(0, 10)
  const d = new Date(`${raw}T12:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

function nightsInclusive(startStr, endStr) {
  const s = parseBookingDate(startStr)
  const e = parseBookingDate(endStr)
  if (!s || !e) return null
  const diff = Math.round((e.getTime() - s.getTime()) / 86400000)
  return Math.max(1, diff + 1)
}

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart <= bEnd && aEnd >= bStart
}

function currentQuarterBounds(now = new Date()) {
  const q = Math.floor(now.getMonth() / 3)
  const start = new Date(now.getFullYear(), q * 3, 1, 12, 0, 0, 0)
  const end = new Date(now.getFullYear(), q * 3 + 3, 0, 12, 0, 0, 0)
  return { start, end }
}

function calendarMonthGrid(year, monthIndex) {
  const first = new Date(year, monthIndex, 1)
  const startWeekday = (first.getDay() + 6) % 7
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < startWeekday; i += 1) cells.push({ type: 'pad', key: `p-${i}` })
  for (let d = 1; d <= daysInMonth; d += 1) {
    cells.push({ type: 'day', key: `d-${d}`, date: new Date(year, monthIndex, d, 12, 0, 0, 0) })
  }
  return cells
}

function propertyKeyFromBooking(b) {
  const table = b.property_table || 'properties_apartments'
  return `${table}:${Number(b.property_id)}`
}

export default function OwnerTestDriveSection({
  userId,
  apiBaseUrl,
  embedded = false,
  sellerTestDriveProperties,
}) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedKey, setSelectedKey] = useState(null)
  const [panelVisible, setPanelVisible] = useState(false)
  const [calYear, setCalYear] = useState(() => new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth())

  const locale =
    i18n.language === 'ru'
      ? 'ru-RU'
      : i18n.language === 'de'
        ? 'de-DE'
        : i18n.language === 'es'
          ? 'es-ES'
          : i18n.language === 'fr'
            ? 'fr-FR'
            : i18n.language === 'sv'
              ? 'sv-SE'
              : 'en-US'

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError(null)
    try {
      const base = (apiBaseUrl || '/api').replace(/\/$/, '')
      const res = await fetch(`${base}/test-drive-bookings/owner/${userId}`)
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'load_failed')
      }
      setBookings(Array.isArray(json.data) ? json.data : [])
    } catch (e) {
      setError(e?.message || 'error')
      setBookings([])
    } finally {
      setLoading(false)
    }
  }, [userId, apiBaseUrl])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!selectedKey) {
      setPanelVisible(false)
      return
    }
    setPanelVisible(false)
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setPanelVisible(true))
    })
    return () => cancelAnimationFrame(id)
  }, [selectedKey])

  const propertyOptions = useMemo(() => {
    const map = new Map()
    const list = Array.isArray(sellerTestDriveProperties) ? sellerTestDriveProperties : []
    for (const p of list) {
      const table = p.property_table || 'properties_apartments'
      const key = `${table}:${Number(p.id)}`
      map.set(key, {
        key,
        id: Number(p.id),
        property_table: table,
        title: p.title || t('buyerBookings_propertyFallback', { id: p.id }),
        image: p.image || null,
      })
    }
    for (const b of bookings) {
      const key = propertyKeyFromBooking(b)
      if (!map.has(key)) {
        map.set(key, {
          key,
          id: Number(b.property_id),
          property_table: b.property_table || 'properties_apartments',
          title: b.property_title || t('buyerBookings_propertyFallback', { id: b.property_id }),
          image: b.property_cover_url || null,
        })
      } else {
        const cur = map.get(key)
        if (!cur.image && b.property_cover_url) cur.image = b.property_cover_url
      }
    }
    return [...map.values()].sort((a, b) => String(a.title).localeCompare(String(b.title), locale))
  }, [bookings, sellerTestDriveProperties, t, locale])

  const selectedProperty = useMemo(
    () => propertyOptions.find((p) => p.key === selectedKey) || null,
    [propertyOptions, selectedKey]
  )

  const propertyBookings = useMemo(() => {
    if (!selectedKey) return []
    return bookings.filter((b) => propertyKeyFromBooking(b) === selectedKey)
  }, [bookings, selectedKey])

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 12, 0, 0, 0)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 12, 0, 0, 0)
  const { start: qStart, end: qEnd } = currentQuarterBounds(now)

  const countsForBookings = useCallback((list) => {
    const active = (b) => (String(b.status || '').toLowerCase() !== 'cancelled')
    const filtered = list.filter(active)
    const total = filtered.length
    const inMonth = filtered.filter((b) => {
      const s = parseBookingDate(b.start_date)
      const e = parseBookingDate(b.end_date)
      if (!s || !e) return false
      return rangesOverlap(s, e, monthStart, monthEnd)
    }).length
    const inQuarter = filtered.filter((b) => {
      const s = parseBookingDate(b.start_date)
      const e = parseBookingDate(b.end_date)
      if (!s || !e) return false
      return rangesOverlap(s, e, qStart, qEnd)
    }).length
    return { total, inMonth, inQuarter }
  }, [monthStart, monthEnd, qStart, qEnd])

  const metrics = useMemo(() => countsForBookings(propertyBookings), [propertyBookings, countsForBookings])

  const sortedPropertyBookings = useMemo(() => {
    return [...propertyBookings].sort((a, b) => {
      const da = parseBookingDate(a.start_date)?.getTime() || 0
      const db = parseBookingDate(b.start_date)?.getTime() || 0
      return db - da
    })
  }, [propertyBookings])

  const calendarCells = useMemo(() => calendarMonthGrid(calYear, calMonth), [calYear, calMonth])

  const bookingsForCalendarDay = useCallback(
    (dayDate) => {
      if (!dayDate || !selectedKey) return []
      return propertyBookings.filter((b) => {
        const s = parseBookingDate(b.start_date)
        const e = parseBookingDate(b.end_date)
        if (!s || !e) return false
        return rangesOverlap(s, e, dayDate, dayDate)
      })
    },
    [propertyBookings, selectedKey]
  )

  const statusLabel = (statusKey) => {
    const k = `buyerBookings_status_${statusKey}`
    const tr = t(k)
    return tr !== k ? tr : statusKey
  }

  const openPropertyAnalytics = (key) => {
    setSelectedKey(key)
    setCalYear(new Date().getFullYear())
    setCalMonth(new Date().getMonth())
  }

  const calLabel = new Date(calYear, calMonth, 1).toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  })

  const shiftCal = (delta) => {
    const d = new Date(calYear, calMonth + delta, 1)
    setCalYear(d.getFullYear())
    setCalMonth(d.getMonth())
  }

  const weekdayLabels = useMemo(() => {
    const base = new Date(2024, 0, 1)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base)
      d.setDate(base.getDate() + i)
      return d.toLocaleDateString(locale, { weekday: 'short' })
    })
  }, [locale])

  if (embedded) {
    return (
      <section id="owner-analytics-test-drive" className="owner-test-drive owner-test-drive--embedded">
        <div className="owner-test-drive__surface">
          <header className="owner-test-drive__hero">
            <div className="owner-test-drive__hero-main">
              <div className="owner-test-drive__icon-ring" aria-hidden>
                <FiBarChart2 size={22} strokeWidth={2} />
              </div>
              <div className="owner-test-drive__hero-text">
                <h2 className="owner-test-drive__page-title">{t('ownerTabTestDrive')}</h2>
                <p className="owner-test-drive__page-desc">{t('ownerTestDriveAnalyticsHeroHint')}</p>
              </div>
            </div>
          </header>

          {loading ? (
            <div className="owner-test-drive__loading" role="status" aria-live="polite">
              <span className="owner-test-drive__spinner" aria-hidden />
              <span>{t('buyerBookings_loading')}</span>
            </div>
          ) : null}
          {error && !loading ? (
            <div className="owner-test-drive__notice owner-test-drive__notice--error">
              {t('buyerBookings_loadFailed')}
            </div>
          ) : null}

          {!loading && !error && propertyOptions.length === 0 ? (
            <div className="owner-test-drive__empty-state">
              <div className="owner-test-drive__empty-icon">
                <FiInbox size={40} strokeWidth={1.25} aria-hidden />
              </div>
              <p className="owner-test-drive__empty-title">{t('ownerTestDriveNoTdListingsTitle')}</p>
              <p className="owner-test-drive__empty-text">{t('ownerTestDriveNoTdListingsText')}</p>
            </div>
          ) : null}

          {!loading && !error && propertyOptions.length > 0 && !selectedKey ? (
            <div className="owner-td-picker">
              <p className="owner-td-picker__hint">{t('ownerTestDriveAnalyticsPickProperty')}</p>
              <ul className="owner-td-picker__grid">
                {propertyOptions.map((p) => (
                  <li key={p.key}>
                    <button
                      type="button"
                      className="owner-td-picker__card"
                      onClick={() => openPropertyAnalytics(p.key)}
                    >
                      <div
                        className="owner-td-picker__thumb"
                        style={
                          p.image
                            ? { backgroundImage: `url(${p.image})` }
                            : { background: 'linear-gradient(135deg,#e2e8f0,#cbd5e1)' }
                        }
                      />
                      <span className="owner-td-picker__title">{p.title}</span>
                      <span className="owner-td-picker__cta">
                        {t('ownerTestDriveAnalyticsOpen')}
                        <FiArrowRight size={16} aria-hidden />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {!loading && !error && selectedKey && selectedProperty ? (
            <div className={`owner-td-analytics ${panelVisible ? 'owner-td-analytics--visible' : ''}`}>
              <div className="owner-td-analytics__toolbar">
                <button
                  type="button"
                  className="owner-td-analytics__back"
                  onClick={() => setSelectedKey(null)}
                >
                  <FiArrowLeft size={18} aria-hidden />
                  {t('ownerTestDriveAnalyticsBack')}
                </button>
                <div className="owner-td-analytics__toolbar-title">
                  <span className="owner-td-analytics__toolbar-name">{selectedProperty.title}</span>
                </div>
              </div>

              <div className="owner-td-analytics__metrics">
                <div className="owner-td-metric owner-td-metric--total">
                  <span className="owner-td-metric__label">{t('ownerTestDriveStatTotal')}</span>
                  <span className="owner-td-metric__value">{metrics.total}</span>
                </div>
                <div className="owner-td-metric owner-td-metric--month">
                  <span className="owner-td-metric__label">{t('ownerTestDriveStatMonth')}</span>
                  <span className="owner-td-metric__value">{metrics.inMonth}</span>
                </div>
                <div className="owner-td-metric owner-td-metric--quarter">
                  <span className="owner-td-metric__label">{t('ownerTestDriveStatQuarter')}</span>
                  <span className="owner-td-metric__value">{metrics.inQuarter}</span>
                </div>
              </div>

              <div className="owner-td-analytics__main">
                <div className="owner-td-calendar-wrap">
                  <div className="owner-td-calendar__head">
                    <button type="button" className="owner-td-calendar__nav" onClick={() => shiftCal(-1)} aria-label={t('ownerTestDriveCalendarPrev')}>
                      <FiChevronLeft size={22} />
                    </button>
                    <h3 className="owner-td-calendar__title">{calLabel}</h3>
                    <button type="button" className="owner-td-calendar__nav" onClick={() => shiftCal(1)} aria-label={t('ownerTestDriveCalendarNext')}>
                      <FiChevronRight size={22} />
                    </button>
                  </div>
                  <div className="owner-td-calendar__weekdays">
                    {weekdayLabels.map((w, i) => (
                      <span key={i} className="owner-td-calendar__wd">
                        {w}
                      </span>
                    ))}
                  </div>
                  <div className="owner-td-calendar__grid">
                    {calendarCells.map((cell) => {
                      if (cell.type === 'pad') {
                        return <div key={cell.key} className="owner-td-cal-cell owner-td-cal-cell--pad" />
                      }
                      const isToday =
                        cell.date.getDate() === now.getDate() &&
                        cell.date.getMonth() === now.getMonth() &&
                        cell.date.getFullYear() === now.getFullYear()
                      const dayBookings = bookingsForCalendarDay(cell.date)
                      const hasBook = dayBookings.length > 0
                      const hasCancelled = dayBookings.some(
                        (b) => String(b.status || '').toLowerCase() === 'cancelled'
                      )
                      const hasActive = dayBookings.some(
                        (b) => String(b.status || '').toLowerCase() !== 'cancelled'
                      )
                      let tone = ''
                      if (hasActive && hasCancelled) tone = 'owner-td-cal-cell--mixed'
                      else if (hasCancelled && !hasActive) tone = 'owner-td-cal-cell--cancelled'
                      else if (hasActive) tone = 'owner-td-cal-cell--booked'
                      return (
                        <div
                          key={cell.key}
                          className={`owner-td-cal-cell ${hasBook ? tone : ''} ${isToday ? 'owner-td-cal-cell--today' : ''}`}
                        >
                          <span className="owner-td-cal-cell__num">{cell.date.getDate()}</span>
                          {hasBook ? (
                            <span className="owner-td-cal-cell__dots" aria-hidden>
                              {dayBookings.slice(0, 3).map((b) => (
                                <i
                                  key={b.id}
                                  className={
                                    String(b.status || '').toLowerCase() === 'cancelled'
                                      ? 'owner-td-cal-cell__dot owner-td-cal-cell__dot--off'
                                      : 'owner-td-cal-cell__dot'
                                  }
                                />
                              ))}
                            </span>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                </div>

                <aside className="owner-td-bookings-aside">
                  <h4 className="owner-td-bookings-aside__title">{t('ownerTestDriveBookingsAsideTitle')}</h4>
                  {sortedPropertyBookings.length === 0 ? (
                    <p className="owner-td-bookings-aside__empty">{t('ownerTestDriveBookingsAsideEmpty')}</p>
                  ) : (
                    <ul className="owner-td-booking-cards">
                      {sortedPropertyBookings.map((b) => {
                        const statusKey = (b.status || 'pending').toLowerCase()
                        const nights = nightsInclusive(b.start_date, b.end_date)
                        const money =
                          b.paid_amount_cents != null && Number.isFinite(Number(b.paid_amount_cents))
                            ? formatMoneyFromMinorUnits(
                                Number(b.paid_amount_cents),
                                b.paid_currency || 'eur',
                                locale
                              )
                            : null
                        return (
                          <li key={b.id} className={`owner-td-bcard owner-td-bcard--${statusKey}`}>
                            <div className="owner-td-bcard__top">
                              <span className="owner-td-bcard__status">{statusLabel(statusKey)}</span>
                              {money ? (
                                <span className="owner-td-bcard__money">{money}</span>
                              ) : (
                                <span className="owner-td-bcard__money owner-td-bcard__money--muted">
                                  {t('ownerTestDriveAmountPending')}
                                </span>
                              )}
                            </div>
                            {b.buyer_display ? (
                              <p className="owner-td-bcard__buyer">{b.buyer_display}</p>
                            ) : null}
                            <p className="owner-td-bcard__dates">
                              {formatDateRange(b.start_date, b.end_date, locale)}
                            </p>
                            {nights != null ? (
                              <p className="owner-td-bcard__nights">
                                {t('ownerTestDriveNights', { count: nights })}
                              </p>
                            ) : null}
                            <button
                              type="button"
                              className="owner-td-bcard__link"
                              onClick={() =>
                                navigate(
                                  `/property/${b.property_id}/test-drive?table=${encodeURIComponent(
                                    b.property_table || 'properties_apartments'
                                  )}`
                                )
                              }
                            >
                              {t('ownerTestDriveOpenCalendar')}
                              <FiArrowRight size={14} aria-hidden />
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </aside>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    )
  }

  return (
    <section id="owner-dashboard-test-drive" className="owner-test-drive">
      <div className="owner-test-drive__surface">
        <header className="owner-test-drive__hero">
          <div className="owner-test-drive__hero-main">
            <div className="owner-test-drive__icon-ring" aria-hidden>
              <FiCalendar size={22} strokeWidth={2} />
            </div>
            <div className="owner-test-drive__hero-text">
              <h2 className="owner-test-drive__page-title">{t('ownerTabTestDrive')}</h2>
              <p className="owner-test-drive__page-desc">{t('ownerTestDriveHeroHint')}</p>
            </div>
          </div>
          {!loading && !error && bookings.length > 0 ? (
            <span className="owner-test-drive__total-pill">{bookings.length}</span>
          ) : null}
        </header>

        {loading ? (
          <div className="owner-test-drive__loading" role="status" aria-live="polite">
            <span className="owner-test-drive__spinner" aria-hidden />
            <span>{t('buyerBookings_loading')}</span>
          </div>
        ) : null}
        {error && !loading ? (
          <div className="owner-test-drive__notice owner-test-drive__notice--error">{t('buyerBookings_loadFailed')}</div>
        ) : null}

        {!loading && !error && bookings.length === 0 ? (
          <div className="owner-test-drive__empty-state">
            <div className="owner-test-drive__empty-icon">
              <FiInbox size={40} strokeWidth={1.25} aria-hidden />
            </div>
            <p className="owner-test-drive__empty-title">{t('ownerTestDriveEmptyTitle')}</p>
            <p className="owner-test-drive__empty-text">{t('ownerTestDriveEmptyText')}</p>
          </div>
        ) : null}

        {!loading && !error && bookings.length > 0 ? (
          <ul className="owner-test-drive__list">
            {bookings.map((b) => {
              const statusKey = (b.status || 'pending').toLowerCase()
              const label = statusLabel(statusKey)
              const cardVariant = ['pending', 'approved', 'rejected'].includes(statusKey) ? statusKey : 'pending'
              const title = b.property_title || t('buyerBookings_propertyFallback', { id: b.property_id })
              const table = b.property_table || 'properties_apartments'
              return (
                <li key={b.id} className={`owner-test-drive-card owner-test-drive-card--${cardVariant}`}>
                  <div className="owner-test-drive-card__inner">
                    <div className="owner-test-drive-card__head">
                      <span className={`owner-test-drive-badge owner-test-drive-badge--${cardVariant}`}>{label}</span>
                      <h3 className="owner-test-drive-card__title">{title}</h3>
                      {b.buyer_display ? (
                        <p className="owner-test-drive-card__buyer">
                          {t('ownerTestDriveBuyer')}: {b.buyer_display}
                        </p>
                      ) : null}
                    </div>
                    <div className="owner-test-drive-card__dates-row">
                      <FiCalendar size={20} strokeWidth={1.75} aria-hidden />
                      <span>{formatDateRange(b.start_date, b.end_date, locale)}</span>
                    </div>
                    <div className="owner-test-drive-card__footer">
                      <button
                        type="button"
                        className="owner-test-drive-card__cta"
                        onClick={() =>
                          navigate(`/property/${b.property_id}/test-drive?table=${encodeURIComponent(table)}`)
                        }
                      >
                        <span>{t('ownerTestDriveOpenCalendar')}</span>
                        <FiArrowRight size={18} aria-hidden />
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : null}
      </div>
    </section>
  )
}

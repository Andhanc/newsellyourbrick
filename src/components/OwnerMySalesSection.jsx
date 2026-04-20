import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiShoppingBag, FiInbox } from 'react-icons/fi'
import { getPropertyCardImage } from '../utils/propertyImage'
import { showToast } from './ToastContainer'
import './OwnerMySalesSection.css'

const FALLBACK_IMG =
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80'

const MY_SALES_POLL_MS = 25000

function formatSaleAmount(amount, currency) {
  const n = Number(amount)
  if (!Number.isFinite(n)) return '—'
  const cur = (currency || 'USD').toUpperCase()
  const sym = cur === 'EUR' ? '€' : cur === 'BYN' ? 'Br' : '$'
  return `${sym}${n.toLocaleString('ru-RU')}`
}

const SALES_SECTION_FILTERS = [
  { id: 'all', labelKey: 'ownerSalesFilterAll' },
  { id: 'auction', labelKey: 'ownerSalesFilterAuction' },
  { id: 'shares', labelKey: 'ownerSalesFilterShares' },
  { id: 'debts', labelKey: 'ownerSalesFilterDebt' },
  { id: 'test_drive', labelKey: 'ownerTabTestDrive' },
  { id: 'buy_now', labelKey: 'ownerSalesFilterBuyNow' },
]

const SALES_SECTIONS = [
  { id: 'auction', titleKey: 'ownerSalesSectionAuction', itemsKey: 'auction' },
  { id: 'shares', titleKey: 'ownerSalesSectionShares', itemsKey: 'shares' },
  { id: 'debts', titleKey: 'ownerSalesSectionDebt', itemsKey: 'debts' },
  { id: 'test_drive', titleKey: 'ownerTabTestDrive', itemsKey: 'test_drive' },
  { id: 'buy_now', titleKey: 'ownerSalesSectionBuyNow', itemsKey: 'buy_now' },
]

export default function OwnerMySalesSection({ userId, apiBaseUrl }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [sectionFilter, setSectionFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [cancellingBookingId, setCancellingBookingId] = useState(null)
  const [payload, setPayload] = useState({
    auction: [],
    shares: [],
    debts: [],
    test_drive: [],
    buy_now: [],
  })

  const fetchMySales = useCallback(
    async (silent = false) => {
      if (!userId) return
      if (!silent) {
        setLoading(true)
        setError(null)
      }
      try {
        const base = (apiBaseUrl || '/api').replace(/\/$/, '')
        const res = await fetch(`${base}/owner/${userId}/my-sales`)
        const json = await res.json()
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'load_failed')
        }
        setPayload({
          auction: Array.isArray(json.data?.auction) ? json.data.auction : [],
          shares: Array.isArray(json.data?.shares) ? json.data.shares : [],
          debts: Array.isArray(json.data?.debts) ? json.data.debts : [],
          test_drive: Array.isArray(json.data?.test_drive) ? json.data.test_drive : [],
          buy_now: Array.isArray(json.data?.buy_now) ? json.data.buy_now : [],
        })
        setError(null)
      } catch (e) {
        if (!silent) {
          setError(e?.message || 'error')
          setPayload({ auction: [], shares: [], debts: [], test_drive: [], buy_now: [] })
        }
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [userId, apiBaseUrl]
  )

  useEffect(() => {
    void fetchMySales(false)
  }, [fetchMySales])

  useEffect(() => {
    if (!userId) return
    const tick = () => void fetchMySales(true)
    const id = setInterval(tick, MY_SALES_POLL_MS)
    const onVis = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVis)
    const onFocus = () => tick()
    window.addEventListener('focus', onFocus)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('focus', onFocus)
    }
  }, [userId, fetchMySales])

  useEffect(() => {
    setSectionFilter('all')
  }, [userId])

  const openCard = (item) => {
    navigate(`/property/${item.id}`, {
      state: {
        property: {
          id: item.id,
          property_type: item.property_type,
          source_table: item.source_table,
        },
      },
    })
  }

  const handleCancelBooking = async (item, e) => {
    e.preventDefault()
    e.stopPropagation()
    const bookingId = Number(item.booking_id)
    if (!Number.isFinite(bookingId)) return
    const reason = window.prompt('Укажите причину снятия брони для покупателя')
    if (reason == null) return
    if (!reason.trim()) {
      showToast('Нужно указать причину', 'warning')
      return
    }
    try {
      setCancellingBookingId(bookingId)
      const base = (apiBaseUrl || '/api').replace(/\/$/, '')
      const res = await fetch(`${base}/test-drive-bookings/${bookingId}/cancel-by-owner`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, reason }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) {
        showToast(json.error || 'Не удалось снять бронь', 'error')
        return
      }
      showToast('Бронь снята, покупателю отправлена причина', 'success')
      await fetchMySales(true)
    } catch {
      showToast('Ошибка сети', 'error')
    } finally {
      setCancellingBookingId(null)
    }
  }

  const renderCard = (item, sectionId) => {
    const img = getPropertyCardImage(
      {
        photos: item.photos,
        image: item.cover_url,
        image_url: item.cover_url,
      },
      FALLBACK_IMG
    )
    const key = `${item.property_table || 'x'}:${item.id}`
    return (
      <div
        key={key}
        className="property-card owner-my-sales__card"
        role="button"
        tabIndex={0}
        onClick={() => openCard(item)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            openCard(item)
          }
        }}
      >
        <div className="property-link">
          <div className="property-image-container">
            <img src={img} alt="" className="property-image" />
          </div>
          <div className="property-content">
            <h3 className="property-title">{item.title || '—'}</h3>
            <p className="property-location">{item.location || ''}</p>
            {item.percent_sold != null && Number.isFinite(Number(item.percent_sold)) ? (
              <p className="owner-my-sales__meta">
                {t('ownerSalesPercentSold', {
                  value: Math.round(Number(item.percent_sold) * 10) / 10,
                })}
              </p>
            ) : null}
            <div className="owner-my-sales__amount-row">
              <span className="owner-my-sales__amount-label">{t('ownerSalesSoldTotal')}</span>
              <span className="owner-my-sales__amount-value">
                {formatSaleAmount(item.sale_amount, item.currency)}
              </span>
            </div>
            {sectionId === 'test_drive' && String(item.check_in_status || '').toLowerCase() === 'checked_in' ? (
              <p className="owner-my-sales__meta" style={{ color: '#2e9d5c', fontWeight: 700 }}>
                Клиент заселился
              </p>
            ) : null}
            {sectionId === 'test_drive' && item.booking_id ? (
              <div className="owner-my-sales__cancel-row">
                <button
                  type="button"
                  className="owner-my-sales__cancel-btn"
                  onClick={(e) => handleCancelBooking(item, e)}
                  disabled={cancellingBookingId === Number(item.booking_id)}
                >
                  {cancellingBookingId === Number(item.booking_id) ? 'Снимаем...' : 'Снять бронь'}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  const renderSection = (titleKey, items, sectionId) => (
    <div className="owner-my-sales__section">
      <div className="owner-my-sales__section-head">
        <h3 className="owner-my-sales__section-title">{t(titleKey)}</h3>
        {items.length > 0 ? (
          <span className="owner-my-sales__section-badge">{items.length}</span>
        ) : null}
      </div>
      {items.length === 0 ? (
        <p className="owner-my-sales__empty-inline">{t('ownerSalesEmptySection')}</p>
      ) : (
        <div className="properties-grid owner-my-sales__grid">
          {items.map((item) => renderCard(item, sectionId))}
        </div>
      )}
    </div>
  )

  const totalCount =
    payload.auction.length +
    payload.shares.length +
    payload.debts.length +
    payload.test_drive.length +
    payload.buy_now.length

  const visibleSections =
    sectionFilter === 'all'
      ? SALES_SECTIONS
      : SALES_SECTIONS.filter((s) => s.id === sectionFilter)

  return (
    <section id="owner-dashboard-my-sales" className="owner-dashboard__properties owner-my-sales">
      <div className="owner-my-sales__surface">
        <header className="owner-my-sales__hero">
          <div className="owner-my-sales__hero-main">
            <div className="owner-my-sales__icon-ring" aria-hidden>
              <FiShoppingBag size={22} strokeWidth={2} />
            </div>
            <div className="owner-my-sales__hero-text">
              <h2 className="owner-my-sales__page-title">{t('ownerSalesTitle')}</h2>
              <p className="owner-my-sales__page-desc">{t('ownerSalesHeroHint')}</p>
            </div>
          </div>
          {!loading && !error && totalCount > 0 ? (
            <span className="owner-my-sales__total-pill">{totalCount}</span>
          ) : null}
        </header>

        {!loading && !error && totalCount > 0 ? (
          <div
            className="owner-my-sales__filter-strip"
            role="tablist"
            aria-label={t('ownerSalesFiltersAria')}
          >
            {SALES_SECTION_FILTERS.map(({ id, labelKey }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={sectionFilter === id}
                className={`owner-my-sales__filter-pill ${sectionFilter === id ? 'owner-my-sales__filter-pill--active' : ''}`}
                onClick={() => setSectionFilter(id)}
              >
                {t(labelKey)}
              </button>
            ))}
          </div>
        ) : null}

        {loading ? (
          <div className="owner-my-sales__loading" role="status" aria-live="polite">
            <span className="owner-my-sales__spinner" aria-hidden />
            <span className="owner-my-sales__loading-text">{t('ownerSalesLoading')}</span>
          </div>
        ) : null}
        {error && !loading ? (
          <div className="owner-my-sales__notice owner-my-sales__notice--error">{t('ownerSalesError')}</div>
        ) : null}

        {!loading && !error && totalCount === 0 ? (
          <div className="owner-my-sales__empty-state">
            <div className="owner-my-sales__empty-icon">
              <FiInbox size={40} strokeWidth={1.25} aria-hidden />
            </div>
            <p className="owner-my-sales__empty-title">{t('ownerSalesEmpty')}</p>
          </div>
        ) : null}

        {!loading && !error && totalCount > 0 ? (
          <div className="owner-my-sales__sections">
            {visibleSections.map(({ id, titleKey, itemsKey }) => (
              <div key={titleKey}>{renderSection(titleKey, payload[itemsKey] || [], id)}</div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}

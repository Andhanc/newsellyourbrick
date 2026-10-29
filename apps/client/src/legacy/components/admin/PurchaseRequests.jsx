import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  FiAlertCircle,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiExternalLink,
  FiMail,
  FiMessageCircle,
  FiPhone,
  FiSearch,
  FiShield,
  FiShoppingCart,
  FiUser,
  FiX,
} from 'react-icons/fi'
import { getApiBaseUrl } from '../../utils/apiConfig'
import {
  applyAdminSidebarBadgePatch,
  countUnseenPurchaseActionable,
  markPurchaseRequestsViewed,
  requestAdminSidebarBadgesRefresh,
} from '../../utils/adminSidebarBadges'
import { getCurrencySymbol } from '../../utils/currency'
import { showNotification } from '../../utils/toastHelper'
import './PurchaseRequests.css'

function formatDate(value, locale) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatPrice(value, currency = 'EUR', locale = 'en') {
  const number = Number(value)
  if (!Number.isFinite(number)) return '—'
  return `${getCurrencySymbol(currency)}${number.toLocaleString(locale, {
    maximumFractionDigits: 2,
  })}`
}

function ContactCard({ title, icon: Icon, name, email, phone, userId, onOpenChat, t }) {
  return (
    <section className="purchase-request-contact-card">
      <div className="purchase-request-contact-card__head">
        <span className="purchase-request-contact-card__icon"><Icon size={18} /></span>
        <div>
          <span>{title}</span>
          <strong>{name || t('admin_notSpecified')}</strong>
        </div>
      </div>
      <div className="purchase-request-contact-card__contacts">
        <a className={!email ? 'is-empty' : ''} href={email ? `mailto:${email}` : undefined}>
          <span className="purchase-request-contact-icon" aria-hidden="true"><FiMail size={15} /></span>
          <span>{email || t('admin_emailNotSpecified')}</span>
        </a>
        <a className={!phone ? 'is-empty' : ''} href={phone ? `tel:${phone}` : undefined}>
          <span className="purchase-request-contact-icon" aria-hidden="true"><FiPhone size={15} /></span>
          <span>{phone || t('admin_phoneNotSpecified')}</span>
        </a>
      </div>
      <button
        type="button"
        className="purchase-request-contact-card__chat"
        disabled={!userId || !onOpenChat}
        onClick={() => onOpenChat?.(Number(userId))}
      >
        <span className="purchase-request-contact-icon" aria-hidden="true"><FiMessageCircle size={17} /></span>
        {t('admin_pr_chatWithUser')}
      </button>
    </section>
  )
}

export default function PurchaseRequests({ onAdminSectionBadgeRefresh, onOpenUserChat }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [propertyDetails, setPropertyDetails] = useState(null)
  const [loadingProperty, setLoadingProperty] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [adminNotes, setAdminNotes] = useState('')
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const dateLocale = (i18n.language || 'ru').startsWith('ru') ? 'ru-RU' : (i18n.language || 'en')

  const statusLabels = {
    pending: t('admin_pr_statusPending'),
    processing: t('admin_pr_statusProcessing'),
    completed: t('admin_pr_statusCompleted'),
    cancelled: t('admin_pr_statusCancelled'),
  }

  const typeLabels = {
    apartment: t('admin_apartment'),
    house: t('admin_house'),
    villa: t('admin_villa'),
    townhouse: t('admin_townhouse'),
    commercial: t('admin_commercial'),
  }

  const saleLabels = {
    auction: t('admin_auction'),
    auction_buy_now: t('admin_auctionBuyNow'),
    buy_now: t('admin_buyNow'),
    direct: t('admin_buyNow'),
  }

  const fetchRequests = async () => {
    try {
      setIsLoading(true)
      setError('')
      const base = await getApiBaseUrl()
      const response = await fetch(`${base}/purchase-requests?limit=1000`)
      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result.success || !Array.isArray(result.data)) {
        throw new Error(result.error || t('admin_pr_loadFail'))
      }
      setRequests(result.data)
    } catch (requestError) {
      setError(requestError?.message || t('admin_pr_loadFail'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchRequests()
    markPurchaseRequestsViewed()
    requestAdminSidebarBadgesRefresh({ patch: { purchase_requests: 0 } })
  }, [])

  const filteredRequests = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return requests.filter((request) => {
      const statusMatches = statusFilter === 'all' || request.status === statusFilter
      if (!statusMatches) return false
      if (!query) return true
      return [
        request.id,
        request.buyer_name,
        request.buyer_email,
        request.buyer_phone,
        request.seller_name,
        request.property_title,
      ].some((value) => String(value || '').toLowerCase().includes(query))
    })
  }, [requests, searchQuery, statusFilter])

  const openRequest = async (request) => {
    setSelectedRequest(request)
    setAdminNotes(request.admin_notes || '')
    setPropertyDetails(null)
    if (!request.property_id) return
    setLoadingProperty(true)
    try {
      const base = await getApiBaseUrl()
      const response = await fetch(`${base}/properties/${request.property_id}`)
      const result = await response.json().catch(() => ({}))
      if (response.ok && result.success) setPropertyDetails(result.data || null)
    } finally {
      setLoadingProperty(false)
    }
  }

  const closeRequest = () => {
    if (updatingStatus) return
    setSelectedRequest(null)
    setPropertyDetails(null)
    setAdminNotes('')
  }

  const openUserChat = async (userId) => {
    const numericUserId = Number(userId)
    if (!Number.isFinite(numericUserId) || numericUserId <= 0 || !onOpenUserChat) return
    try {
      const base = await getApiBaseUrl()
      const response = await fetch(`${base}/live-chat/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assistantSessionId: `user_${numericUserId}`,
          userId: numericUserId,
          waitMessage: t('admin_pr_waitMessage'),
        }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result.success) throw new Error(result.error || t('admin_pr_openChatFail'))
      onOpenUserChat(numericUserId)
    } catch (chatError) {
      showNotification(chatError?.message || t('admin_pr_openChatFail'), 'error')
    }
  }

  const handleStatusUpdate = async (status) => {
    if (!selectedRequest || updatingStatus) return
    setUpdatingStatus(true)
    try {
      const base = await getApiBaseUrl()
      const response = await fetch(`${base}/purchase-requests/${selectedRequest.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminNotes: adminNotes || null }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result.success) {
        throw new Error(result.error || t('admin_pr_updateStatusFail'))
      }
      const updated = requests.map((item) =>
        item.id === selectedRequest.id
          ? { ...item, status, admin_notes: adminNotes || item.admin_notes }
          : item,
      )
      setRequests(updated)
      requestAdminSidebarBadgesRefresh({
        patch: applyAdminSidebarBadgePatch({}, {
          purchase_requests: countUnseenPurchaseActionable(updated),
        }),
      })
      void onAdminSectionBadgeRefresh?.()
      showNotification(status === 'completed' ? t('admin_pr_statusCompleted') : t('admin_pr_requestCancelled'))
      setSelectedRequest(null)
      setPropertyDetails(null)
      setAdminNotes('')
    } catch (updateError) {
      showNotification(updateError?.message || t('admin_pr_updateStatusFail'), 'error')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const payment = selectedRequest?.reservation_payment || {}
  const paymentVerified = payment.verified === true
  const propertyType = propertyDetails?.property_type || selectedRequest?.property_type
  const rawSaleType = propertyDetails?.sale_type
  const saleType =
    saleLabels[rawSaleType] ||
    (propertyDetails?.is_auction ? t('admin_auction') : t('admin_buyNow'))
  const finalPrice =
    selectedRequest?.property_price ??
    propertyDetails?.minimum_sale_price ??
    propertyDetails?.price
  const finalCurrency = selectedRequest?.property_currency || propertyDetails?.currency || 'EUR'

  return (
    <div className="purchase-requests-container">
      <div className="purchase-requests-heading">
        <div>
          <span className="purchase-requests-heading__eyebrow">{t('admin_pr_eyebrow')}</span>
          <h2>{t('admin_pr_title')}</h2>
          <p>{t('admin_pr_intro')}</p>
        </div>
        <div className="purchase-requests-heading__count">{filteredRequests.length}</div>
      </div>

      <div className="purchase-requests-filter">
        <label className="filter-search">
          <FiSearch size={19} />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t('admin_pr_searchPlaceholder')}
          />
          {searchQuery ? (
            <button type="button" onClick={() => setSearchQuery('')} aria-label={t('admin_clearSearch')}>
              <FiX size={17} />
            </button>
          ) : null}
        </label>
        <div className="filter-options" role="group" aria-label={t('admin_pr_statusFilterAria')}>
          {[
            ['all', t('admin_all')],
            ['processing', t('admin_pr_statusProcessing')],
            ['completed', t('admin_pr_filterCompleted')],
            ['cancelled', t('admin_pr_filterCancelled')],
          ].map(([value, label]) => (
            <button
              type="button"
              key={value}
              className={statusFilter === value ? 'active' : ''}
              onClick={() => setStatusFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="purchase-requests-state">{t('admin_pr_loadingDeals')}</div>
      ) : error ? (
        <div className="purchase-requests-state purchase-requests-state--error">
          <FiAlertCircle size={24} />
          <p>{error}</p>
          <button type="button" onClick={fetchRequests}>{t('admin_tryAgain')}</button>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="purchase-requests-state">
          <FiShoppingCart size={28} />
          <p>{t('admin_pr_notFound')}</p>
        </div>
      ) : (
        <div className="purchase-requests-list">
          {filteredRequests.map((request) => {
            const verified = request.reservation_payment?.verified === true
            return (
              <button
                type="button"
                key={request.id}
                className="purchase-request-card"
                onClick={() => void openRequest(request)}
              >
                <span className="purchase-request-card__main">
                  <span className="purchase-request-card__icon"><FiShoppingCart size={19} /></span>
                  <span>
                    <strong>{request.property_title || t('admin_pr_requestN', { id: request.id })}</strong>
                    <small>{request.buyer_name || t('admin_pr_buyerUnspecified')} · {formatDate(request.request_date || request.created_at, dateLocale)}</small>
                  </span>
                </span>
                <span className="purchase-request-card__price">
                  {formatPrice(request.property_price, request.property_currency, dateLocale)}
                </span>
                <span className={`purchase-request-payment-chip ${verified ? 'is-paid' : 'is-unpaid'}`}>
                  {verified ? <FiCheckCircle size={15} /> : <FiAlertCircle size={15} />}
                  {verified ? t('admin_pr_depositPaid') : t('admin_pr_paymentNotFound')}
                </span>
                <span className={`status-badge status-badge--${request.status || 'pending'}`}>
                  {statusLabels[request.status] || request.status}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {selectedRequest && createPortal(
        <div className="purchase-request-modal-overlay" onMouseDown={closeRequest}>
          <div
            className="purchase-request-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="purchase-request-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="purchase-request-modal__header">
              <div>
                <span>{t('admin_pr_applicationN', { id: selectedRequest.id })}</span>
                <h2 id="purchase-request-title">{selectedRequest.property_title || t('admin_pr_purchaseProperty')}</h2>
              </div>
              <button type="button" onClick={closeRequest} aria-label={t('admin_close')}><FiX size={22} /></button>
            </header>

            <div className="purchase-request-modal__content">
              <section className={`purchase-payment-proof ${paymentVerified ? 'is-paid' : 'is-unpaid'}`}>
                <span className="purchase-payment-proof__icon">
                  {paymentVerified ? <FiShield size={23} /> : <FiAlertCircle size={23} />}
                </span>
                <div>
                  <span>{paymentVerified ? t('admin_pr_paymentConfirmed') : t('admin_pr_depositUnconfirmed')}</span>
                  <strong>
                    {paymentVerified
                      ? formatPrice(
                          Number(payment.amount_cents || 0) / 100 + Number(payment.wallet_applied_major || 0),
                          payment.currency,
                          dateLocale,
                        )
                      : t('admin_pr_completionBlocked')}
                  </strong>
                  <small>{paymentVerified ? t('admin_pr_paidAt', { date: formatDate(payment.paid_at, dateLocale) }) : t('admin_pr_checkStripe')}</small>
                </div>
                <span className={`status-badge status-badge--${selectedRequest.status || 'pending'}`}>
                  {statusLabels[selectedRequest.status] || selectedRequest.status}
                </span>
              </section>

              <div className="purchase-request-people-grid">
                <ContactCard
                  title={t('admin_buyer')}
                  icon={FiUser}
                  name={selectedRequest.buyer_name}
                  email={selectedRequest.buyer_email}
                  phone={selectedRequest.buyer_phone}
                  userId={selectedRequest.buyer_id}
                  onOpenChat={openUserChat}
                  t={t}
                />
                <ContactCard
                  title={t('admin_seller')}
                  icon={FiUser}
                  name={selectedRequest.seller_name || [propertyDetails?.first_name, propertyDetails?.last_name].filter(Boolean).join(' ')}
                  email={selectedRequest.seller_email || propertyDetails?.email}
                  phone={selectedRequest.seller_phone || propertyDetails?.phone_number}
                  userId={selectedRequest.seller_id || propertyDetails?.user_id}
                  onOpenChat={openUserChat}
                  t={t}
                />
              </div>

              <section className="purchase-request-object">
                <div className="purchase-request-section-title">
                  <span className="purchase-request-section-title__icon"><FiShoppingCart size={18} /></span>
                  <div><span>{t('admin_pr_property')}</span><strong>{t('admin_pr_dealDetails')}</strong></div>
                </div>
                {loadingProperty ? <p className="purchase-request-object__loading">{t('admin_pr_loadingProperty')}</p> : (
                  <dl className="purchase-request-object__grid">
                    <div><dt>{t('admin_pr_saleType')}</dt><dd>{saleType}</dd></div>
                    <div><dt>{t('admin_pr_finalPrice')}</dt><dd>{formatPrice(finalPrice, finalCurrency, dateLocale)}</dd></div>
                    <div><dt>{t('admin_pr_propertyType')}</dt><dd>{typeLabels[propertyType] || propertyType || '—'}</dd></div>
                    <div><dt>{t('admin_pr_requestDate')}</dt><dd>{formatDate(selectedRequest.request_date || selectedRequest.created_at, dateLocale)}</dd></div>
                  </dl>
                )}
                {selectedRequest.property_id ? (
                  <button
                    type="button"
                    className="purchase-request-object__link"
                    onClick={() => {
                      navigate(`/property/${selectedRequest.property_id}`)
                      setSelectedRequest(null)
                    }}
                  >
                    {t('admin_pr_openProperty')} <FiExternalLink size={16} />
                  </button>
                ) : null}
              </section>

              <label className="purchase-request-notes">
                <span>{t('admin_pr_adminNote')}</span>
                <textarea
                  value={adminNotes}
                  onChange={(event) => setAdminNotes(event.target.value)}
                  rows={3}
                  placeholder={t('admin_pr_notesPlaceholder')}
                />
              </label>
            </div>

            <footer className="purchase-request-modal__actions">
              <button
                type="button"
                className="modal-action-btn modal-action-btn--completed"
                disabled={updatingStatus || !paymentVerified || selectedRequest.status === 'completed'}
                title={!paymentVerified ? t('admin_pr_stripeFirst') : undefined}
                onClick={() => void handleStatusUpdate('completed')}
              >
                <FiCheck /> {updatingStatus ? t('admin_savingEllipsis') : t('admin_pr_complete')}
              </button>
              <button
                type="button"
                className="modal-action-btn modal-action-btn--cancelled"
                disabled={updatingStatus || selectedRequest.status === 'cancelled'}
                onClick={() => void handleStatusUpdate('cancelled')}
              >
                <FiX /> {t('admin_cancel')}
              </button>
            </footer>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}

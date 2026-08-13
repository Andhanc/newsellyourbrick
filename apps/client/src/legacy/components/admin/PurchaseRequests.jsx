import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
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

const STATUS_LABELS = {
  pending: 'Ожидает оплаты',
  processing: 'В обработке',
  completed: 'Сделка завершена',
  cancelled: 'Отменён',
}

const TYPE_LABELS = {
  apartment: 'Квартира',
  house: 'Дом',
  villa: 'Вилла',
  townhouse: 'Таунхаус',
  commercial: 'Коммерческая недвижимость',
}

const SALE_LABELS = {
  auction: 'Аукцион',
  auction_buy_now: 'Аукцион + купить сейчас',
  buy_now: 'Купить сейчас',
  direct: 'Купить сейчас',
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatPrice(value, currency = 'EUR') {
  const number = Number(value)
  if (!Number.isFinite(number)) return '—'
  return `${getCurrencySymbol(currency)}${number.toLocaleString('ru-RU', {
    maximumFractionDigits: 2,
  })}`
}

function ContactCard({ title, icon: Icon, name, email, phone, userId, onOpenChat }) {
  return (
    <section className="purchase-request-contact-card">
      <div className="purchase-request-contact-card__head">
        <span className="purchase-request-contact-card__icon"><Icon size={18} /></span>
        <div>
          <span>{title}</span>
          <strong>{name || 'Не указано'}</strong>
        </div>
      </div>
      <div className="purchase-request-contact-card__contacts">
        <a className={!email ? 'is-empty' : ''} href={email ? `mailto:${email}` : undefined}>
          <FiMail size={15} /> {email || 'Почта не указана'}
        </a>
        <a className={!phone ? 'is-empty' : ''} href={phone ? `tel:${phone}` : undefined}>
          <FiPhone size={15} /> {phone || 'Телефон не указан'}
        </a>
      </div>
      <button
        type="button"
        className="purchase-request-contact-card__chat"
        disabled={!userId || !onOpenChat}
        onClick={() => onOpenChat?.(Number(userId))}
      >
        <FiMessageCircle size={17} />
        Чат с пользователем
      </button>
    </section>
  )
}

export default function PurchaseRequests({ onAdminSectionBadgeRefresh, onOpenUserChat }) {
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

  const fetchRequests = async () => {
    try {
      setIsLoading(true)
      setError('')
      const base = await getApiBaseUrl()
      const response = await fetch(`${base}/purchase-requests?limit=1000`)
      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result.success || !Array.isArray(result.data)) {
        throw new Error(result.error || 'Не удалось загрузить запросы')
      }
      setRequests(result.data)
    } catch (requestError) {
      setError(requestError?.message || 'Не удалось загрузить запросы')
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
          assistantSessionId: `admin_purchase_user_${numericUserId}`,
          userId: numericUserId,
          waitMessage: 'Чат по оформлению покупки. Менеджер готов помочь.',
        }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result.success) throw new Error(result.error || 'Не удалось открыть чат')
      onOpenUserChat(numericUserId)
    } catch (chatError) {
      showNotification(chatError?.message || 'Не удалось открыть чат', 'error')
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
        throw new Error(result.error || 'Не удалось обновить статус')
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
      showNotification(status === 'completed' ? 'Сделка завершена' : 'Запрос отменён')
      setSelectedRequest(null)
      setPropertyDetails(null)
      setAdminNotes('')
    } catch (updateError) {
      showNotification(updateError?.message || 'Не удалось обновить статус', 'error')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const payment = selectedRequest?.reservation_payment || {}
  const paymentVerified = payment.verified === true
  const propertyType = propertyDetails?.property_type || selectedRequest?.property_type
  const rawSaleType = propertyDetails?.sale_type
  const saleType =
    SALE_LABELS[rawSaleType] ||
    (propertyDetails?.is_auction ? 'Аукцион' : 'Купить сейчас')
  const finalPrice =
    selectedRequest?.property_price ??
    propertyDetails?.minimum_sale_price ??
    propertyDetails?.price
  const finalCurrency = selectedRequest?.property_currency || propertyDetails?.currency || 'EUR'

  return (
    <div className="purchase-requests-container">
      <div className="purchase-requests-heading">
        <div>
          <span className="purchase-requests-heading__eyebrow">Сделки</span>
          <h2>Запросы на покупку</h2>
          <p>Оплата Stripe проверяется автоматически. Администратор только завершает или отменяет сделку.</p>
        </div>
        <div className="purchase-requests-heading__count">{filteredRequests.length}</div>
      </div>

      <div className="purchase-requests-filter">
        <label className="filter-search">
          <FiSearch size={19} />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Имя, почта, телефон или объект"
          />
          {searchQuery ? (
            <button type="button" onClick={() => setSearchQuery('')} aria-label="Очистить поиск">
              <FiX size={17} />
            </button>
          ) : null}
        </label>
        <div className="filter-options" role="group" aria-label="Статус запроса">
          {[
            ['all', 'Все'],
            ['processing', 'В обработке'],
            ['completed', 'Завершены'],
            ['cancelled', 'Отменены'],
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
        <div className="purchase-requests-state">Загружаем сделки…</div>
      ) : error ? (
        <div className="purchase-requests-state purchase-requests-state--error">
          <FiAlertCircle size={24} />
          <p>{error}</p>
          <button type="button" onClick={fetchRequests}>Попробовать снова</button>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="purchase-requests-state">
          <FiShoppingCart size={28} />
          <p>Запросы не найдены</p>
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
                    <strong>{request.property_title || `Запрос #${request.id}`}</strong>
                    <small>{request.buyer_name || 'Покупатель не указан'} · {formatDate(request.request_date || request.created_at)}</small>
                  </span>
                </span>
                <span className="purchase-request-card__price">
                  {formatPrice(request.property_price, request.property_currency)}
                </span>
                <span className={`purchase-request-payment-chip ${verified ? 'is-paid' : 'is-unpaid'}`}>
                  {verified ? <FiCheckCircle size={15} /> : <FiAlertCircle size={15} />}
                  {verified ? 'Резерв оплачен' : 'Оплата не найдена'}
                </span>
                <span className={`status-badge status-badge--${request.status || 'pending'}`}>
                  {STATUS_LABELS[request.status] || request.status}
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
                <span>Заявка #{selectedRequest.id}</span>
                <h2 id="purchase-request-title">{selectedRequest.property_title || 'Покупка объекта'}</h2>
              </div>
              <button type="button" onClick={closeRequest} aria-label="Закрыть"><FiX size={22} /></button>
            </header>

            <div className="purchase-request-modal__content">
              <section className={`purchase-payment-proof ${paymentVerified ? 'is-paid' : 'is-unpaid'}`}>
                <span className="purchase-payment-proof__icon">
                  {paymentVerified ? <FiShield size={23} /> : <FiAlertCircle size={23} />}
                </span>
                <div>
                  <span>{paymentVerified ? 'Оплата подтверждена Stripe' : 'Оплата резерва не подтверждена'}</span>
                  <strong>
                    {paymentVerified
                      ? formatPrice(
                          Number(payment.amount_cents || 0) / 100 + Number(payment.wallet_applied_major || 0),
                          payment.currency,
                        )
                      : 'Завершение сделки заблокировано'}
                  </strong>
                  <small>{paymentVerified ? `Оплачено ${formatDate(payment.paid_at)}` : 'Проверьте Stripe Checkout и webhook'}</small>
                </div>
                <span className={`status-badge status-badge--${selectedRequest.status || 'pending'}`}>
                  {STATUS_LABELS[selectedRequest.status] || selectedRequest.status}
                </span>
              </section>

              <div className="purchase-request-people-grid">
                <ContactCard
                  title="Покупатель"
                  icon={FiUser}
                  name={selectedRequest.buyer_name}
                  email={selectedRequest.buyer_email}
                  phone={selectedRequest.buyer_phone}
                  userId={selectedRequest.buyer_id}
                  onOpenChat={openUserChat}
                />
                <ContactCard
                  title="Продавец"
                  icon={FiUser}
                  name={selectedRequest.seller_name || [propertyDetails?.first_name, propertyDetails?.last_name].filter(Boolean).join(' ')}
                  email={selectedRequest.seller_email || propertyDetails?.email}
                  phone={selectedRequest.seller_phone || propertyDetails?.phone_number}
                  userId={selectedRequest.seller_id || propertyDetails?.user_id}
                  onOpenChat={openUserChat}
                />
              </div>

              <section className="purchase-request-object">
                <div className="purchase-request-section-title">
                  <span className="purchase-request-section-title__icon"><FiShoppingCart size={18} /></span>
                  <div><span>Объект</span><strong>Детали сделки</strong></div>
                </div>
                {loadingProperty ? <p className="purchase-request-object__loading">Загружаем объект…</p> : (
                  <dl className="purchase-request-object__grid">
                    <div><dt>Тип продажи</dt><dd>{saleType}</dd></div>
                    <div><dt>Конечная цена</dt><dd>{formatPrice(finalPrice, finalCurrency)}</dd></div>
                    <div><dt>Тип недвижимости</dt><dd>{TYPE_LABELS[propertyType] || propertyType || '—'}</dd></div>
                    <div><dt>Дата запроса</dt><dd>{formatDate(selectedRequest.request_date || selectedRequest.created_at)}</dd></div>
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
                    Открыть объект <FiExternalLink size={16} />
                  </button>
                ) : null}
              </section>

              <label className="purchase-request-notes">
                <span>Заметка администратора</span>
                <textarea
                  value={adminNotes}
                  onChange={(event) => setAdminNotes(event.target.value)}
                  rows={3}
                  placeholder="Документы, договорённости, следующий шаг…"
                />
              </label>
            </div>

            <footer className="purchase-request-modal__actions">
              <button
                type="button"
                className="modal-action-btn modal-action-btn--completed"
                disabled={updatingStatus || !paymentVerified || selectedRequest.status === 'completed'}
                title={!paymentVerified ? 'Сначала Stripe должен подтвердить оплату резерва' : undefined}
                onClick={() => void handleStatusUpdate('completed')}
              >
                <FiCheck /> {updatingStatus ? 'Сохраняем…' : 'Завершить'}
              </button>
              <button
                type="button"
                className="modal-action-btn modal-action-btn--cancelled"
                disabled={updatingStatus || selectedRequest.status === 'cancelled'}
                onClick={() => void handleStatusUpdate('cancelled')}
              >
                <FiX /> Отменить
              </button>
            </footer>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}

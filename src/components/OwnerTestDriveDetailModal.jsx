import { createPortal } from 'react-dom'
import { useCallback, useEffect, useState } from 'react'
import {
  Calendar,
  Car,
  CheckCircle2,
  KeyRound,
  MapPin,
  User,
  Wallet,
  X,
} from 'lucide-react'
import {
  canOwnerCancelBooking,
  canOwnerConfirmBooking,
  cancelOwnerTestDriveBooking,
  respondOwnerTestDriveBooking,
} from '../utils/ownerTestDriveList'
import { showToast } from './ToastContainer'
import './OwnerTestDriveDetailModal.css'

function getCancelledByLabel(cancelledBy) {
  if (cancelledBy === 'owner') return 'Отменено владельцем'
  if (cancelledBy === 'buyer') return 'Отменено покупателем'
  return 'Отменено'
}

export default function OwnerTestDriveDetailModal({ row, userId, onClose, onUpdated }) {
  const [view, setView] = useState('detail')
  const [ownerComment, setOwnerComment] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [responding, setResponding] = useState(false)

  const resetSubView = useCallback(() => {
    setView('detail')
    setOwnerComment('')
    setCancelReason('')
  }, [])

  useEffect(() => {
    if (!row) return undefined
    resetSubView()
    setResponding(false)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [row, resetSubView])

  if (!row || typeof document === 'undefined') return null

  const rawStatus = row.rawStatus
  const canConfirm = canOwnerConfirmBooking(rawStatus)
  const canCancel = canOwnerCancelBooking(rawStatus)
  const isCheckedIn = row.checkInStatus === 'checked_in'
  const hasIssues = row.checkInStatus === 'issues_reported'

  const handleRespond = async (action, comment = '') => {
    if (!userId || !row.bookingId) return
    try {
      setResponding(true)
      await respondOwnerTestDriveBooking(userId, row.bookingId, action, comment)
      showToast(
        action === 'approve' ? 'Тест-драйв подтверждён' : 'Заявка отклонена',
        'success'
      )
      window.dispatchEvent(new CustomEvent('owner-notifications-refresh'))
      onUpdated?.()
      onClose()
    } catch (error) {
      showToast(error?.message || 'Не удалось выполнить действие', 'error')
    } finally {
      setResponding(false)
    }
  }

  const handleCancel = async () => {
    if (!userId || !row.bookingId) return
    const reason = cancelReason.trim()
    if (!reason) {
      showToast('Укажите причину снятия брони', 'warning')
      return
    }
    try {
      setResponding(true)
      await cancelOwnerTestDriveBooking(userId, row.bookingId, reason)
      showToast('Бронь снята, покупателю отправлена причина', 'success')
      window.dispatchEvent(new CustomEvent('owner-notifications-refresh'))
      onUpdated?.()
      onClose()
    } catch (error) {
      showToast(error?.message || 'Не удалось снять бронь', 'error')
    } finally {
      setResponding(false)
    }
  }

  const renderDetailActions = () => (
    <div className="otd-detail-modal__actions otd-detail-modal__actions--detail">
      {canConfirm ? (
        <button
          type="button"
          className="otd-detail-modal__btn otd-detail-modal__btn--reject"
          onClick={() => handleRespond('reject')}
          disabled={responding}
        >
          {responding ? '…' : 'Отклонить'}
        </button>
      ) : null}
      {canCancel ? (
        <button
          type="button"
          className="otd-detail-modal__btn otd-detail-modal__btn--ghost"
          onClick={() => setView('cancel')}
          disabled={responding}
        >
          Снять бронь
        </button>
      ) : null}
      {canConfirm ? (
        <button
          type="button"
          className="otd-detail-modal__btn otd-detail-modal__btn--primary"
          onClick={() => setView('approve')}
          disabled={responding}
        >
          Подтвердить
        </button>
      ) : null}
    </div>
  )

  const renderApproveView = () => (
    <div className="otd-detail-modal__subview">
      <h3 className="otd-detail-modal__subview-title">Подтверждение заявки</h3>
      <p className="otd-detail-modal__subview-hint">
        Укажите покупателю время заезда, где забрать ключи и другие инструкции — без этого
        подтверждение не отправится.
      </p>
      <label className="otd-detail-modal__label" htmlFor="otd-owner-comment">
        Комментарий для покупателя
      </label>
      <textarea
        id="otd-owner-comment"
        className="otd-detail-modal__textarea"
        rows={5}
        value={ownerComment}
        onChange={(e) => setOwnerComment(e.target.value)}
        placeholder="Например: Заезд с 15:00, ключи у консьержа, код домофона 1234."
      />
      <div className="otd-detail-modal__actions">
        <button
          type="button"
          className="otd-detail-modal__btn otd-detail-modal__btn--ghost"
          onClick={resetSubView}
          disabled={responding}
        >
          Назад
        </button>
        <button
          type="button"
          className="otd-detail-modal__btn otd-detail-modal__btn--primary"
          onClick={() => handleRespond('approve', ownerComment)}
          disabled={responding || !ownerComment.trim()}
        >
          {responding ? 'Отправляем…' : 'Подтвердить и отправить'}
        </button>
      </div>
    </div>
  )

  const renderCancelView = () => (
    <div className="otd-detail-modal__subview">
      <h3 className="otd-detail-modal__subview-title">Снятие брони</h3>
      <p className="otd-detail-modal__subview-hint">
        Укажите причину — она будет отправлена покупателю.
      </p>
      <label className="otd-detail-modal__label" htmlFor="otd-cancel-reason">
        Причина отмены
      </label>
      <textarea
        id="otd-cancel-reason"
        className="otd-detail-modal__textarea"
        rows={4}
        value={cancelReason}
        onChange={(e) => setCancelReason(e.target.value)}
        placeholder="Например: объект временно недоступен, переносим на другие даты."
      />
      <div className="otd-detail-modal__actions">
        <button
          type="button"
          className="otd-detail-modal__btn otd-detail-modal__btn--ghost"
          onClick={resetSubView}
          disabled={responding}
        >
          Назад
        </button>
        <button
          type="button"
          className="otd-detail-modal__btn otd-detail-modal__btn--reject"
          onClick={handleCancel}
          disabled={responding || !cancelReason.trim()}
        >
          {responding ? 'Снимаем…' : 'Снять бронь'}
        </button>
      </div>
    </div>
  )

  return createPortal(
    <div className="otd-detail-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="otd-detail-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="otd-detail-modal-title"
      >
        <button
          type="button"
          className="otd-detail-modal__close"
          onClick={onClose}
          aria-label="Закрыть"
        >
          <X size={22} />
        </button>

        <div className="otd-detail-modal__hero">
          <img src={row.image} alt="" className="otd-detail-modal__thumb" />
          <div className="otd-detail-modal__hero-text">
            <span className="otd-detail-modal__badge">
              <Car size={14} aria-hidden />
              {row.displayId}
            </span>
            <h2 id="otd-detail-modal-title" className="otd-detail-modal__title">
              {row.title}
            </h2>
            <p className="otd-detail-modal__location">
              <MapPin size={14} aria-hidden />
              {row.location}
            </p>
          </div>
        </div>

        <div className="otd-detail-modal__meta-grid">
          <div className="otd-detail-modal__stat otd-detail-modal__stat--tenant">
            <div className="otd-detail-modal__stat-icon" aria-hidden>
              <User size={18} strokeWidth={2} />
            </div>
            <span className="otd-detail-modal__stat-label">Арендатор</span>
            <span className="otd-detail-modal__stat-value">{row.buyer}</span>
          </div>
          <div className="otd-detail-modal__stat otd-detail-modal__stat--dates">
            <div className="otd-detail-modal__stat-icon" aria-hidden>
              <Calendar size={18} strokeWidth={2} />
            </div>
            <span className="otd-detail-modal__stat-label">Даты</span>
            <span className="otd-detail-modal__stat-value otd-detail-modal__stat-value--dates">
              {row.dates}
            </span>
          </div>
          <div className="otd-detail-modal__stat otd-detail-modal__stat--deposit">
            <div className="otd-detail-modal__stat-icon" aria-hidden>
              <Wallet size={18} strokeWidth={2} />
            </div>
            <span className="otd-detail-modal__stat-label">Залог</span>
            <span className="otd-detail-modal__stat-value otd-detail-modal__stat-value--amount">
              {row.amount}
            </span>
          </div>
        </div>

        <div className="otd-detail-modal__status-row">
          {isCheckedIn ? (
            <span className="otd-detail-modal__checkin otd-detail-modal__checkin--ok">
              <CheckCircle2 size={14} aria-hidden />
              Клиент заселился
            </span>
          ) : null}
          {hasIssues ? (
            <span className="otd-detail-modal__checkin otd-detail-modal__checkin--warn">
              Покупатель сообщил о проблемах
            </span>
          ) : null}
          {!isCheckedIn && !hasIssues && row.checkInStatusLabel ? (
            <span className="otd-detail-modal__checkin">{row.checkInStatusLabel}</span>
          ) : null}
        </div>

        {row.ownerComment ? (
          <div className="otd-detail-modal__comment-block">
            <div className="otd-detail-modal__comment-head">
              <KeyRound size={16} aria-hidden />
              <strong>Инструкции для покупателя</strong>
            </div>
            <p className="otd-detail-modal__comment-body">{row.ownerComment}</p>
          </div>
        ) : canConfirm ? (
          <div className="otd-detail-modal__hint-block">
            После подтверждения укажите, где забрать ключи, время заезда и код домофона — это
            обязательно.
          </div>
        ) : null}

        {row.cancellationReason ? (
          <div className="otd-detail-modal__cancel-info">
            <strong>{getCancelledByLabel(row.cancelledBy)}</strong>
            <p>{row.cancellationReason}</p>
          </div>
        ) : null}

        {view === 'approve' ? renderApproveView() : null}
        {view === 'cancel' ? renderCancelView() : null}
        {view === 'detail' ? renderDetailActions() : null}
      </div>
    </div>,
    document.body
  )
}

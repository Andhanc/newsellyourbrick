import { FiX } from 'react-icons/fi'
import './OwnerModerationNoticeModal.css'

export default function OwnerModerationNoticeModal({ isOpen, onClose, title, message }) {
  if (!isOpen) return null

  return (
    <div className="owner-moderation-notice-overlay" onClick={onClose} role="presentation">
      <div
        className="owner-moderation-notice-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="owner-moderation-notice-title"
      >
        <button type="button" className="owner-moderation-notice-modal__close" onClick={onClose} aria-label="Закрыть">
          <FiX size={22} />
        </button>
        <h2 id="owner-moderation-notice-title" className="owner-moderation-notice-modal__title">
          {title || 'Уведомление'}
        </h2>
        <p className="owner-moderation-notice-modal__text">{message}</p>
        <button type="button" className="owner-moderation-notice-modal__btn" onClick={onClose}>
          Понятно
        </button>
      </div>
    </div>
  )
}

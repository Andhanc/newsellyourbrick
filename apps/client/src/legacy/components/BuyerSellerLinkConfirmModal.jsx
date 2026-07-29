import { FiX, FiUserCheck } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import './EmailVerificationModal.css'

/**
 * Подтверждение: email уже занят кабинетом покупателя, пользователь подтверждает, что это он.
 */
const BuyerSellerLinkConfirmModal = ({ isOpen, onClose, onConfirm, email }) => {
  const { t } = useTranslation()

  if (!isOpen) return null

  return (
    <div className="email-verification-overlay" onClick={onClose}>
      <div className="email-verification-modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="email-verification-modal__close"
          onClick={onClose}
          aria-label={t('closeModalAria')}
        >
          <FiX size={24} />
        </button>

        <div className="email-verification-modal__header">
          <div className="email-verification-modal__icon">
            <FiUserCheck size={32} />
          </div>
          <h2 className="email-verification-modal__title">
            {t('buyerSellerLinkConfirmTitle')}
          </h2>
          <p className="email-verification-modal__subtitle">
            {t('buyerSellerLinkConfirmSubtitle', { email: email || '' })}
          </p>
        </div>

        <div className="email-verification-modal__form" style={{ padding: '0 32px 32px' }}>
          <p style={{ margin: '0 0 20px', fontSize: '15px', lineHeight: 1.5, color: '#444' }}>
            {t('buyerSellerLinkConfirmBody')}
          </p>
          <button
            type="button"
            className="email-verification-modal__submit"
            onClick={onConfirm}
          >
            {t('buyerSellerLinkConfirmButton')}
          </button>
          <button
            type="button"
            className="email-verification-modal__back-button"
            onClick={onClose}
            style={{ display: 'block', marginTop: 12, width: '100%', textAlign: 'center' }}
          >
            {t('buyerSellerLinkCancelButton')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default BuyerSellerLinkConfirmModal

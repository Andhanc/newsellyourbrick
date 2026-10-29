import { FiX, FiCheckCircle } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import './WelcomeModal.css'

const WelcomeModal = ({ isOpen, onClose, userName }) => {
  const { t } = useTranslation()
  if (!isOpen) return null

  const displayName = userName || t('welcomeModal_defaultName')

  return (
    <div className="welcome-modal-overlay" onClick={onClose}>
      <div className="welcome-modal" onClick={(e) => e.stopPropagation()}>
        <button 
          className="welcome-modal__close" 
          onClick={onClose}
          aria-label={t('close')}
        >
          <FiX size={24} />
        </button>

        <div className="welcome-modal__content">
          <div className="welcome-modal__icon">
            <FiCheckCircle size={64} />
          </div>
          
          <h2 className="welcome-modal__title">
            {t('welcomeModal_title', { name: displayName })}
          </h2>
          
          <p className="welcome-modal__text">
            {t('welcomeModal_text')}
          </p>

          <button 
            className="welcome-modal__button"
            onClick={onClose}
          >
            {t('welcomeModal_cta')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default WelcomeModal

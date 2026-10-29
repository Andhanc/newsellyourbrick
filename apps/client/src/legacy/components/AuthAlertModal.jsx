import { FiInfo, FiAlertCircle } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import './AuthAlertModal.css'

/**
 * Модальное окно с пояснением для сценариев авторизации:
 * - already_registered: вы уже зарегистрированы, войдите
 * - need_register: аккаунт не найден, зарегистрируйтесь
 * - error: общая ошибка
 */
const AuthAlertModal = ({
  isOpen,
  onClose,
  variant = 'error',
  title,
  message,
  buttonText,
  icon: IconOverride,
}) => {
  const { t } = useTranslation()

  if (!isOpen) return null

  const config = {
    already_registered: {
      icon: FiAlertCircle,
      title: title || t('authAlert_alreadyTitle'),
      message: message || t('authAlert_alreadyMessage'),
      className: 'auth-alert-modal--warning',
    },
    need_register: {
      icon: FiInfo,
      title: title || t('authAlert_needTitle'),
      message: message || t('authAlert_needMessage'),
      className: 'auth-alert-modal--info',
    },
    error: {
      icon: FiAlertCircle,
      title: title || t('authAlert_errorTitle'),
      message: message || t('authAlert_errorMessage'),
      className: 'auth-alert-modal--error',
    },
  }

  const { icon: DefaultIcon, title: defaultTitle, message: defaultMessage, className } = config[variant] || config.error
  const Icon = IconOverride || DefaultIcon

  return (
    <div className="auth-alert-modal-overlay" onClick={onClose}>
      <div className={`auth-alert-modal ${className}`} onClick={(e) => e.stopPropagation()}>
        <div className="auth-alert-modal__content">
          <div className="auth-alert-modal__icon-wrap">
            <Icon size={48} className="auth-alert-modal__icon" />
          </div>
          <h2 className="auth-alert-modal__title">{title || defaultTitle}</h2>
          <p className="auth-alert-modal__message">{message || defaultMessage}</p>
          <button type="button" className="auth-alert-modal__button" onClick={onClose}>
            {buttonText || t('authAlert_ok')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AuthAlertModal

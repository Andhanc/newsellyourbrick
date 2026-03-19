import { FiInfo, FiAlertCircle } from 'react-icons/fi'
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
  buttonText = 'Понятно',
  icon: IconOverride,
}) => {
  if (!isOpen) return null

  const config = {
    already_registered: {
      icon: FiAlertCircle,
      title: title || 'Вы уже зарегистрированы',
      message: message || 'Этот аккаунт уже привязан к вашему профилю. Закройте окно и выберите «Вход», чтобы войти.',
      className: 'auth-alert-modal--warning',
    },
    need_register: {
      icon: FiInfo,
      title: title || 'Вы не зарегистрированы на сайте',
      message: message || 'Сначала зарегистрируйтесь: закройте окно, выберите «Регистрация» и войдите тем же способом (Google, Telegram, WhatsApp или email).',
      className: 'auth-alert-modal--info',
    },
    error: {
      icon: FiAlertCircle,
      title: title || 'Что-то пошло не так',
      message: message || 'Попробуйте ещё раз или выберите другой способ входа — например, через email, Telegram или WhatsApp.',
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
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AuthAlertModal

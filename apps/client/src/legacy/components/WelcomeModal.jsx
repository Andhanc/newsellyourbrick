import { FiX, FiCheckCircle } from 'react-icons/fi'
import './WelcomeModal.css'

const WelcomeModal = ({ isOpen, onClose, userName = 'Иван Иванов' }) => {
  if (!isOpen) return null

  return (
    <div className="welcome-modal-overlay" onClick={onClose}>
      <div className="welcome-modal" onClick={(e) => e.stopPropagation()}>
        <button 
          className="welcome-modal__close" 
          onClick={onClose}
          aria-label="Закрыть"
        >
          <FiX size={24} />
        </button>

        <div className="welcome-modal__content">
          <div className="welcome-modal__icon">
            <FiCheckCircle size={64} />
          </div>
          
          <h2 className="welcome-modal__title">
            Добро пожаловать, {userName}!
          </h2>
          
          <p className="welcome-modal__text">
            Вы успешно вошли в панель управления недвижимостью.
            Здесь вы можете управлять своими объявлениями, отслеживать статистику
            и анализировать эффективность продаж.
          </p>

          <button 
            className="welcome-modal__button"
            onClick={onClose}
          >
            Начать
          </button>
        </div>
      </div>
    </div>
  )
}

export default WelcomeModal

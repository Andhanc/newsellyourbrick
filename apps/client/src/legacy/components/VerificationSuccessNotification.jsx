import { useState, useEffect } from 'react';
import { FiCheckCircle, FiX } from 'react-icons/fi';
import Confetti from 'react-confetti';
import './VerificationSuccessNotification.css';

const VerificationSuccessNotification = ({ notification, onClose, onView }) => {
  const [showConfetti, setShowConfetti] = useState(true);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Останавливаем конфетти через 3 секунды
    const timer = setTimeout(() => {
      setShowConfetti(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    if (onView) {
      onView(notification.id);
    }
    if (onClose) {
      onClose();
    }
  };

  return (
    <>
      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={200}
          gravity={0.3}
        />
      )}
      <div className="verification-success-notification">
        <div className="verification-success-notification__backdrop" onClick={handleClose} />
        <div className="verification-success-notification__content">
          <button
            className="verification-success-notification__close"
            onClick={handleClose}
            aria-label="Закрыть"
          >
            <FiX size={24} />
          </button>
          
          <div className="verification-success-notification__icon">
            <div className="verification-success-notification__icon-circle">
              <FiCheckCircle size={64} />
            </div>
          </div>

          <h2 className="verification-success-notification__title">
            {notification.title || 'Поздравляем с успешной верификацией!'}
          </h2>

          <p className="verification-success-notification__message">
            {notification.message || '🎉 Ваши документы были одобрены. Теперь вы можете полноценно пользоваться сервисом.'}
          </p>

          <div className="verification-success-notification__celebration">
            <span className="celebration-emoji">🎉</span>
            <span className="celebration-emoji">✨</span>
            <span className="celebration-emoji">🎊</span>
            <span className="celebration-emoji">🌟</span>
            <span className="celebration-emoji">💫</span>
          </div>

          <button
            className="verification-success-notification__button"
            onClick={handleClose}
          >
            Отлично!
          </button>
        </div>
      </div>
    </>
  );
};

export default VerificationSuccessNotification;



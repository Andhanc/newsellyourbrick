import React, { useState, useEffect, useCallback } from 'react';
import { FiAlertCircle, FiCheck, FiX, FiChevronDown, FiChevronUp, FiFile, FiUser, FiMail, FiPhone, FiMapPin, FiCreditCard } from 'react-icons/fi';
import './VerificationToast.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const VerificationToast = ({ userId }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const loadVerificationStatus = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/users/${userId}/verification-status`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const newStatus = result.data;
          setStatus(newStatus);
          // Показываем уведомление только если не готово
          setIsVisible(!newStatus.isReady);
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки статуса верификации:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      loadVerificationStatus();
    }
  }, [userId, loadVerificationStatus]);

  // Слушаем событие обновления статуса верификации
  useEffect(() => {
    const handleStatusUpdate = () => {
      loadVerificationStatus();
    };
    
    window.addEventListener('verification-status-update', handleStatusUpdate);
    return () => window.removeEventListener('verification-status-update', handleStatusUpdate);
  }, [loadVerificationStatus]);

  // Если загрузка, статус не загружен, уведомление скрыто или пользователь готов - не показываем
  if (loading || !status || !isVisible || status.isReady) {
    return null;
  }

  // Проверяем наличие необходимых свойств
  if (!status.missingFields || typeof status.missingFields !== 'object') {
    return null;
  }

  const fieldLabels = {
    firstName: { label: 'Имя', icon: <FiUser size={16} /> },
    lastName: { label: 'Фамилия', icon: <FiUser size={16} /> },
    emailOrPhone: { label: 'Email или телефон', icon: <FiMail size={16} /> },
    country: { label: 'Страна', icon: <FiMapPin size={16} /> },
    address: { label: 'Адрес', icon: <FiMapPin size={16} /> },
    passportSeries: { label: 'Серия паспорта', icon: <FiCreditCard size={16} /> },
    passportNumber: { label: 'Номер паспорта', icon: <FiCreditCard size={16} /> },
    identificationNumber: { label: 'Идентификационный номер', icon: <FiCreditCard size={16} /> }
  };

  const filledFields = [];
  const missingFields = [];

  // Безопасно обрабатываем missingFields
  try {
    Object.entries(status.missingFields || {}).forEach(([field, isMissing]) => {
      const fieldInfo = fieldLabels[field];
      if (fieldInfo) {
        if (isMissing) {
          missingFields.push({ ...fieldInfo, field });
        } else {
          filledFields.push({ ...fieldInfo, field });
        }
      }
    });
  } catch (error) {
    console.error('Ошибка при обработке missingFields:', error);
    return null;
  }

  const getProgressColor = () => {
    const progress = status?.progress || 0;
    if (progress === 100) return '#10b981';
    if (progress >= 75) return '#f59e0b';
    return '#ef4444';
  };

  // Безопасно получаем прогресс
  const progress = status?.progress || 0;
  const filledFieldsCount = status?.filledFields || 0;
  const totalFieldsCount = status?.totalFields || 8;
  const documentsCount = status?.documentsCount || 0;
  const hasDocuments = status?.hasDocuments || false;

  const handleClose = () => {
    setIsVisible(false);
  };

  return (
    <div className={`verification-toast ${isExpanded ? 'verification-toast--expanded' : ''}`}>
      <div className="verification-toast__header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="verification-toast__header-left">
          <div className="verification-toast__icon-wrapper">
            <FiAlertCircle className="verification-toast__icon" />
          </div>
          <div className="verification-toast__header-text">
            <h4 className="verification-toast__title">Верификация не завершена</h4>
            <p className="verification-toast__subtitle">
              Заполните все поля для отправки на модерацию
            </p>
          </div>
        </div>
        
        <div className="verification-toast__header-right">
          <div className="verification-toast__progress-circle" style={{ '--progress': progress, '--color': getProgressColor() }}>
            <svg className="verification-toast__progress-svg" viewBox="0 0 40 40">
              <circle
                className="verification-toast__progress-bg"
                cx="20"
                cy="20"
                r="18"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="3"
              />
              <circle
                className="verification-toast__progress-bar"
                cx="20"
                cy="20"
                r="18"
                fill="none"
                stroke={getProgressColor()}
                strokeWidth="3"
                strokeDasharray={`${progress * 113.1 / 100} 113.1`}
                strokeDashoffset="0"
                transform="rotate(-90 20 20)"
              />
            </svg>
            <span className="verification-toast__progress-percent">{progress}%</span>
          </div>
          <button
            className="verification-toast__toggle"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? <FiChevronUp size={20} /> : <FiChevronDown size={20} />}
          </button>
          <button
            className="verification-toast__close"
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
          >
            <FiX size={18} />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="verification-toast__content">
          <div className="verification-toast__progress-bar-container">
            <div 
              className="verification-toast__progress-bar-fill"
              style={{ 
                width: `${progress}%`,
                backgroundColor: getProgressColor()
              }}
            />
          </div>

          <div className="verification-toast__stats">
            <div className="verification-toast__stat">
              <FiUser className="verification-toast__stat-icon" />
              <span>{filledFieldsCount} из {totalFieldsCount} полей заполнено</span>
            </div>
            <div className="verification-toast__stat">
              <FiFile className="verification-toast__stat-icon" />
              <span>Документов: {documentsCount}</span>
            </div>
          </div>

          {filledFields.length > 0 && (
            <div className="verification-toast__section">
              <h5 className="verification-toast__section-title verification-toast__section-title--success">
                <FiCheck size={16} />
                Заполнено ({filledFields.length})
              </h5>
              <ul className="verification-toast__fields-list verification-toast__fields-list--filled">
                {filledFields.map((field, index) => (
                  <li key={index} className="verification-toast__field-item verification-toast__field-item--filled">
                    <span className="verification-toast__field-icon">{field.icon}</span>
                    <span>{field.label}</span>
                    <FiCheck className="verification-toast__check-icon" />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {missingFields.length > 0 && (
            <div className="verification-toast__section">
              <h5 className="verification-toast__section-title verification-toast__section-title--warning">
                <FiX size={16} />
                Требуется заполнить ({missingFields.length})
              </h5>
              <ul className="verification-toast__fields-list verification-toast__fields-list--missing">
                {missingFields.map((field, index) => (
                  <li key={index} className="verification-toast__field-item verification-toast__field-item--missing">
                    <span className="verification-toast__field-icon">{field.icon}</span>
                    <span>{field.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!hasDocuments && (
            <div className="verification-toast__warning">
              <FiFile className="verification-toast__warning-icon" />
              <span>Загрузите документы на верификацию в разделе профиля</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VerificationToast;


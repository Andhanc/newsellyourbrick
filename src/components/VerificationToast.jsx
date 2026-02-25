import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiAlertCircle, FiCheck, FiX, FiChevronDown, FiChevronUp, FiChevronRight, FiFile, FiUser, FiMail, FiMapPin, FiCreditCard } from 'react-icons/fi';
import './VerificationToast.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const VERIFICATION_SUCCESS_SHOWN_KEY = 'verification_success_shown';

function VerificationSuccessToast({ onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 10000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className="verification-toast verification-toast--success">
      <div className="verification-toast__success-inner">
        <div className="verification-toast__success-icon-wrap">
          <FiCheck className="verification-toast__success-icon" size={36} />
        </div>
        <h4 className="verification-toast__success-title">Всё выполнено</h4>
        <p className="verification-toast__success-text">
          Все данные заполнены, подождите 24 часа для одобрения от менеджера.
        </p>
      </div>
    </div>
  );
}

const VerificationToast = ({ userId }) => {
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [successDismissed, setSuccessDismissed] = useState(false);

  const handleFieldClick = (field) => {
    navigate(`/data?highlight=${field}`);
  };

  const successAlreadyShown = () => {
    if (!userId) return true;
    try {
      const raw = localStorage.getItem(VERIFICATION_SUCCESS_SHOWN_KEY);
      if (!raw) return false;
      const ids = JSON.parse(raw);
      return Array.isArray(ids) && ids.includes(String(userId));
    } catch {
      return false;
    }
  };

  const markSuccessShown = () => {
    if (!userId) return;
    try {
      const raw = localStorage.getItem(VERIFICATION_SUCCESS_SHOWN_KEY) || '[]';
      const ids = JSON.parse(raw);
      const sid = String(userId);
      if (!ids.includes(sid)) {
        ids.push(sid);
        localStorage.setItem(VERIFICATION_SUCCESS_SHOWN_KEY, JSON.stringify(ids));
      }
    } catch (e) {
      console.error('VerificationToast: markSuccessShown', e);
    }
  };

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
          if (!newStatus.isReady) setIsVisible(true);
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки статуса регистрации:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      loadVerificationStatus();
    }
  }, [userId, loadVerificationStatus]);

  // Слушаем событие обновления статуса регистрации
  useEffect(() => {
    const handleStatusUpdate = () => {
      loadVerificationStatus();
    };
    
    window.addEventListener('verification-status-update', handleStatusUpdate);
    return () => window.removeEventListener('verification-status-update', handleStatusUpdate);
  }, [loadVerificationStatus]);

  const handleSuccessDismiss = useCallback(() => {
    markSuccessShown();
    setSuccessDismissed(true);
  }, [userId]);

  // Успех (100%): один раз показать тост, через 10 сек скрыть и больше не показывать
  const isReady = status?.isReady || (status?.progress === 100);
  if (loading || !status) return null;

  if (isReady) {
    if (successAlreadyShown() || successDismissed) return null;

    return <VerificationSuccessToast onDismiss={handleSuccessDismiss} />;
  }

  // Ниже — уведомление «не завершена»
  if (!isVisible) return null;
  if (!status.missingFields || typeof status.missingFields !== 'object') return null;

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
            <h4 className="verification-toast__title">Регистрация не завершена</h4>
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
                  <li
                    key={index}
                    role="button"
                    tabIndex={0}
                    className="verification-toast__field-item verification-toast__field-item--missing verification-toast__field-item--clickable"
                    onClick={() => handleFieldClick(field.field)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleFieldClick(field.field); } }}
                  >
                    <span className="verification-toast__field-icon">{field.icon}</span>
                    <span>{field.label}</span>
                    <FiChevronRight className="verification-toast__field-chevron" size={18} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!hasDocuments && (
            <div className="verification-toast__warning">
              <FiFile className="verification-toast__warning-icon" />
              <span>Загрузите документы на регистрацию в разделе профиля</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VerificationToast;


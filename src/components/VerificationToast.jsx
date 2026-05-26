import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiAlertCircle, FiCheck, FiX, FiChevronDown, FiChevronUp, FiChevronRight, FiFile, FiUser, FiMail, FiMapPin, FiCreditCard } from 'react-icons/fi';
import { getCabinetDataFieldPath } from '../utils/cabinetRoutes';
import './VerificationToast.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const VERIFICATION_SUCCESS_SHOWN_KEY = 'verification_success_shown';

/** Вне дерева маршрута: футер в App имеет z-index:10 и перекрывал fixed-тост внутри .data-container */
function verificationToastPortal(node) {
  if (typeof document === 'undefined' || !document.body) return node;
  return createPortal(node, document.body);
}

function VerificationSuccessToast({ onDismiss }) {
  const { t } = useTranslation();
  useEffect(() => {
    const timer = setTimeout(onDismiss, 10000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return verificationToastPortal(
    <div className="verification-toast verification-toast--success">
      <div className="verification-toast__success-inner">
        <div className="verification-toast__success-icon-wrap">
          <FiCheck className="verification-toast__success-icon" size={36} />
        </div>
        <h4 className="verification-toast__success-title">{t('buyerVerify_successTitle')}</h4>
        <p className="verification-toast__success-text">{t('buyerVerify_successText')}</p>
      </div>
    </div>
  );
}

const VerificationToast = ({ userId }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [successDismissed, setSuccessDismissed] = useState(false);

  const handleFieldClick = (field) => {
    navigate(getCabinetDataFieldPath(field));
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

  const loadVerificationStatus = useCallback(async (force = false) => {
    if (!userId) return;
    try {
      setLoading(true);
      const newStatus = await fetchVerificationStatus(API_BASE_URL, userId, { ttlMs: 20000, force });
      if (newStatus) {
        setStatus(newStatus);
        if (!newStatus.isReady) setIsVisible(true);
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
      loadVerificationStatus(true);
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

  const fieldDefs = {
    firstName: { labelKey: 'buyerData_labelFirstName', icon: <FiUser size={16} /> },
    lastName: { labelKey: 'buyerData_labelLastName', icon: <FiUser size={16} /> },
    emailOrPhone: { labelKey: 'buyerVerify_field_emailOrPhone', icon: <FiMail size={16} /> },
    country: { labelKey: 'buyerVerify_field_country', icon: <FiMapPin size={16} /> },
    address: { labelKey: 'buyerVerify_field_address', icon: <FiMapPin size={16} /> },
    passportSeries: { labelKey: 'buyerData_labelPassportSeries', icon: <FiCreditCard size={16} /> },
    passportNumber: { labelKey: 'buyerData_labelPassportNumber', icon: <FiCreditCard size={16} /> },
    identificationNumber: { labelKey: 'buyerData_labelIdNumberByCountry', icon: <FiCreditCard size={16} /> },
  };

  const filledFields = [];
  const missingFields = [];

  // Безопасно обрабатываем missingFields
  try {
    Object.entries(status.missingFields || {}).forEach(([field, isMissing]) => {
      const def = fieldDefs[field];
      if (def) {
        const entry = { label: t(def.labelKey), icon: def.icon, field };
        if (isMissing) {
          missingFields.push(entry);
        } else {
          filledFields.push(entry);
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

  return verificationToastPortal(
    <div className={`verification-toast ${isExpanded ? 'verification-toast--expanded' : ''}`}>
      <div className="verification-toast__header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="verification-toast__header-left">
          <div className="verification-toast__icon-wrapper">
            <FiAlertCircle className="verification-toast__icon" />
          </div>
          <div className="verification-toast__header-text">
            <h4 className="verification-toast__title">{t('buyerVerify_titleIncomplete')}</h4>
            <p className="verification-toast__subtitle">{t('buyerVerify_subtitle')}</p>
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
              <span>
                {t('buyerVerify_statsFields', { filled: filledFieldsCount, total: totalFieldsCount })}
              </span>
            </div>
            <div className="verification-toast__stat">
              <FiFile className="verification-toast__stat-icon" />
              <span>{t('buyerVerify_documentsCount', { count: documentsCount })}</span>
            </div>
          </div>

          {filledFields.length > 0 && (
            <div className="verification-toast__section">
              <h5 className="verification-toast__section-title verification-toast__section-title--success">
                <FiCheck size={16} />
                {t('buyerVerify_filledSection', { count: filledFields.length })}
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
                {t('buyerVerify_missingSection', { count: missingFields.length })}
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
              <span>{t('buyerVerify_uploadDocsHint')}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VerificationToast;


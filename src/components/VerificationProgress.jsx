import React, { useState, useEffect } from 'react';
import { FiAlertCircle, FiCheck, FiX, FiFile, FiUser } from 'react-icons/fi';
import './VerificationProgress.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const VerificationProgress = ({ userId, onStartVerification }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadVerificationStatus();
    }
  }, [userId]);

  const loadVerificationStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/users/${userId}/verification-status`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setStatus(result.data);
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки статуса верификации:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !status) {
    return null;
  }

  const fieldLabels = {
    firstName: 'Имя',
    lastName: 'Фамилия',
    emailOrPhone: 'Email или телефон',
    country: 'Страна',
    address: 'Адрес',
    passportSeries: 'Серия паспорта',
    passportNumber: 'Номер паспорта',
    identificationNumber: 'DNI/NIE (для Испании) или идентификационный номер'
  };

  const missingFieldsList = Object.entries(status.missingFields)
    .filter(([_, isMissing]) => isMissing)
    .map(([field, _]) => fieldLabels[field]);

  const getProgressColor = () => {
    if (status.progress === 100 && status.hasDocuments) return '#0099A9'; // green
    if (status.progress >= 75) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  return (
    <div className="verification-progress">
      <div className="verification-progress__header">
        <h3 className="verification-progress__title">
          {status.isReady ? (
            <>
              <FiCheck className="verification-progress__icon verification-progress__icon--success" />
              Готов к верификации
            </>
          ) : (
            <>
              <FiAlertCircle className="verification-progress__icon verification-progress__icon--warning" />
              Верификация не завершена
            </>
          )}
        </h3>
        <div className="verification-progress__percentage">{status.progress}%</div>
      </div>

      <div className="verification-progress__bar-container">
        <div 
          className="verification-progress__bar"
          style={{ 
            width: `${status.progress}%`,
            backgroundColor: getProgressColor()
          }}
        />
      </div>

      <div className="verification-progress__info">
        <div className="verification-progress__stats">
          <div className="verification-progress__stat">
            <FiUser className="verification-progress__stat-icon" />
            <span>Заполнено полей: {status.filledFields} из {status.totalFields}</span>
          </div>
          <div className="verification-progress__stat">
            <FiFile className="verification-progress__stat-icon" />
            <span>Документов: {status.documentsCount}</span>
          </div>
        </div>

        {!status.isReady && (
          <div className="verification-progress__missing">
            <p className="verification-progress__missing-title">
              Для отправки на верификацию заполните:
            </p>
            <ul className="verification-progress__missing-list">
              {missingFieldsList.map((field, index) => (
                <li key={index} className="verification-progress__missing-item">
                  <FiX className="verification-progress__missing-icon" />
                  {field}
                </li>
              ))}
              {!status.hasDocuments && (
                <li className="verification-progress__missing-item">
                  <FiX className="verification-progress__missing-icon" />
                  Загрузите документы на верификацию
                </li>
              )}
            </ul>
          </div>
        )}

        {status.isReady && (
          <div className="verification-progress__ready">
            <FiCheck className="verification-progress__ready-icon" />
            <p>Все данные заполнены и документы загружены. Ваша заявка будет рассмотрена модератором.</p>
            {onStartVerification && (
              <button 
                className="verification-progress__start-btn"
                onClick={onStartVerification}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 4H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2"/>
                </svg>
                Начать верификацию
              </button>
            )}
          </div>
        )}
        
        {!status.isReady && status.hasDocuments && onStartVerification && (
          <button 
            className="verification-progress__start-btn"
            onClick={onStartVerification}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 4H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Начать верификацию
          </button>
        )}
      </div>
    </div>
  );
};

export default VerificationProgress;



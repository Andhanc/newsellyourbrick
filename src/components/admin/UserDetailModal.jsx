import React, { useState, useEffect, useCallback } from 'react';
import { FiX, FiUser, FiMail, FiPhone, FiMapPin, FiShield, FiShieldOff, FiCalendar, FiImage, FiCreditCard, FiHash } from 'react-icons/fi';
import { getApiBaseUrl, getApiBaseUrlSync } from '../../utils/apiConfig';
import './UserDetailModal.css';

// Константа для базового URL без /api (для изображений)
const API_BASE_URL_WITHOUT_API = getApiBaseUrlSync().replace('/api', '');

const UserDetailModal = ({ isOpen, onClose, userId }) => {
  const [user, setUser] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchUserDetails = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const API_BASE_URL = await getApiBaseUrl();
      
      // Загружаем информацию о пользователе
      const userResponse = await fetch(`${API_BASE_URL}/users/${userId}`);
      if (!userResponse.ok) {
        throw new Error('Не удалось загрузить данные пользователя');
      }
      const userResult = await userResponse.json();
      
      if (!userResult.success || !userResult.data) {
        throw new Error('Пользователь не найден');
      }

      // Загружаем документы пользователя
      let userDocuments = [];
      try {
        const docsResponse = await fetch(`${API_BASE_URL}/documents/user/${userId}`);
        if (docsResponse.ok) {
          const docsResult = await docsResponse.json();
          if (docsResult.success && docsResult.data) {
            userDocuments = docsResult.data;
          }
        }
      } catch (docsError) {
        console.warn('Не удалось загрузить документы:', docsError);
      }

      let sharePurchases = [];
      try {
        const sharesRes = await fetch(`${API_BASE_URL}/users/${userId}/share-purchases`);
        if (sharesRes.ok) {
          const sharesJson = await sharesRes.json();
          if (sharesJson.success && Array.isArray(sharesJson.data)) {
            sharePurchases = sharesJson.data;
          }
        }
      } catch (sharesErr) {
        console.warn('Не удалось загрузить покупки долей:', sharesErr);
      }

      // Формируем URL для фото
      const userData = userResult.data;
      let userPhotoUrl = null;
      if (userData.user_photo) {
        if (userData.user_photo.startsWith('http')) {
          userPhotoUrl = userData.user_photo;
        } else {
          userPhotoUrl = `${API_BASE_URL_WITHOUT_API}${userData.user_photo}`;
        }
      }

      let passportPhotoUrl = null;
      if (userData.passport_photo) {
        if (userData.passport_photo.startsWith('http')) {
          passportPhotoUrl = userData.passport_photo;
        } else {
          passportPhotoUrl = `${API_BASE_URL_WITHOUT_API}${userData.passport_photo}`;
        }
      }

      // Формируем URL для документов
      const documentsWithUrls = userDocuments.map(doc => {
        let docUrl = null;
        if (doc.document_photo) {
          if (doc.document_photo.startsWith('http')) {
            docUrl = doc.document_photo;
          } else {
            docUrl = `${API_BASE_URL_WITHOUT_API}${doc.document_photo}`;
          }
        }
        return { ...doc, document_photo_url: docUrl };
      });

      // Загружаем информацию о привязанной карте из localStorage
      let cardInfo = null;
      try {
        const localStorageVerifications = JSON.parse(localStorage.getItem('pendingVerifications') || '[]');
        // Ищем данные верификации для этого пользователя
        const userVerification = localStorageVerifications.find(v => String(v.userId) === String(userId));
        if (userVerification && userVerification.cardInfo) {
          cardInfo = userVerification.cardInfo;
        }
        // Также проверяем напрямую в cardInfo
        if (!cardInfo) {
          const savedCardInfo = localStorage.getItem('cardInfo');
          if (savedCardInfo) {
            try {
              const parsedCardInfo = JSON.parse(savedCardInfo);
              if (String(parsedCardInfo.userId) === String(userId)) {
                cardInfo = parsedCardInfo;
              }
            } catch (e) {
              console.warn('Не удалось распарсить данные карты:', e);
            }
          }
        }
      } catch (e) {
        console.warn('Ошибка при загрузке данных карты:', e);
      }

      setUser({
        ...userData,
        user_photo_url: userPhotoUrl,
        passport_photo_url: passportPhotoUrl,
        cardInfo: cardInfo,
        sharePurchases,
      });
      setDocuments(documentsWithUrls);
    } catch (err) {
      console.error('Ошибка при загрузке данных пользователя:', err);
      setError(err.message || 'Произошла ошибка при загрузке данных');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserDetails();
    } else {
      setUser(null);
      setDocuments([]);
      setError(null);
    }
  }, [isOpen, userId, fetchUserDetails]);

  const handleBlock = async () => {
    if (!user) return;
    
    const action = user.is_blocked === 1 ? 'разблокировать' : 'заблокировать';
    
    if (window.confirm(`Вы уверены, что хотите ${action} этого пользователя?`)) {
      try {
        const API_BASE_URL = await getApiBaseUrl();
        const endpoint = user.is_blocked === 1 
          ? `${API_BASE_URL}/users/${userId}/unblock`
          : `${API_BASE_URL}/users/${userId}/block`;
        
        const response = await fetch(endpoint, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            // Обновляем данные пользователя
            setUser({ ...user, is_blocked: user.is_blocked === 1 ? 0 : 1 });
            alert(`Пользователь успешно ${action === 'заблокировать' ? 'заблокирован' : 'разблокирован'}`);
          } else {
            alert(`Ошибка: ${result.error || 'Не удалось изменить статус блокировки'}`);
          }
        } else {
          const errorData = await response.json();
          alert(`Ошибка: ${errorData.error || 'Не удалось изменить статус блокировки'}`);
        }
      } catch (error) {
        console.error('Ошибка при изменении статуса блокировки:', error);
        alert('Произошла ошибка при изменении статуса блокировки');
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Не указано';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'Не указано';
    }
  };

  const getStatusLabel = (status) => {
    const statusMap = {
      'pending': 'На модерации',
      'approved': 'Одобрен',
      'rejected': 'Отклонен'
    };
    return statusMap[status] || status;
  };

  const getStatusClass = (status) => {
    const classMap = {
      'pending': 'status-pending',
      'approved': 'status-approved',
      'rejected': 'status-rejected'
    };
    return classMap[status] || '';
  };

  if (!isOpen) return null;

  return (
    <div className="user-detail-modal-overlay" onClick={onClose}>
      <div className="user-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="user-detail-modal__header">
          <h2>Информация о пользователе</h2>
          <button className="user-detail-modal__close" onClick={onClose}>
            <FiX size={24} />
          </button>
        </div>

        {isLoading ? (
          <div className="user-detail-modal__loading">
            <p>Загрузка данных...</p>
          </div>
        ) : error ? (
          <div className="user-detail-modal__error">
            <p>Ошибка: {error}</p>
            <button onClick={fetchUserDetails}>Попробовать снова</button>
          </div>
        ) : user ? (
          <div className="user-detail-modal__content">
            {/* Основная информация */}
            <div className="user-detail-section">
              <h3 className="section-title">Основная информация</h3>
              <div className="user-detail-grid">
                <div className="user-detail-item">
                  <div className="detail-label">
                    <FiUser size={18} />
                    <span>ФИО</span>
                  </div>
                  <div className="detail-value">
                    {`${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Не указано'}
                  </div>
                </div>

                <div className="user-detail-item">
                  <div className="detail-label">
                    <FiMail size={18} />
                    <span>Email</span>
                  </div>
                  <div className="detail-value">{user.email || 'Не указано'}</div>
                </div>

                <div className="user-detail-item">
                  <div className="detail-label">
                    <FiPhone size={18} />
                    <span>Телефон</span>
                  </div>
                  <div className="detail-value">{user.phone_number || 'Не указано'}</div>
                </div>

                <div className="user-detail-item">
                  <div className="detail-label">
                    <FiMapPin size={18} />
                    <span>Страна</span>
                  </div>
                  <div className="detail-value">{user.country || 'Не указано'}</div>
                </div>

                <div className="user-detail-item">
                  <div className="detail-label">
                    <FiMapPin size={18} />
                    <span>Адрес</span>
                  </div>
                  <div className="detail-value">{user.address || 'Не указано'}</div>
                </div>

                <div className="user-detail-item">
                  <div className="detail-label">
                    <FiCalendar size={18} />
                    <span>Дата регистрации</span>
                  </div>
                  <div className="detail-value">{formatDate(user.created_at)}</div>
                </div>

                <div className="user-detail-item">
                  <div className="detail-label">
                    <span>Роль</span>
                  </div>
                  <div className={`detail-value detail-value--role detail-value--${user.role}`}>
                    {user.role === 'buyer' ? 'Покупатель' : user.role === 'seller' ? 'Продавец' : user.role}
                  </div>
                </div>

                <div className="user-detail-item">
                  <div className="detail-label">
                    <span>Статус верификации</span>
                  </div>
                  <div className={`detail-value ${user.is_verified === 1 ? 'status-verified' : 'status-unverified'}`}>
                    {user.is_verified === 1 ? 'Верифицирован' : 'Не верифицирован'}
                  </div>
                </div>

                <div className="user-detail-item">
                  <div className="detail-label">
                    {user.is_blocked === 1 ? <FiShieldOff size={18} /> : <FiShield size={18} />}
                    <span>Статус блокировки</span>
                  </div>
                  <div className={`detail-value ${user.is_blocked === 1 ? 'status-blocked' : 'status-active'}`}>
                    {user.is_blocked === 1 ? 'Заблокирован' : 'Активен'}
                  </div>
                </div>
              </div>
            </div>

            {/* Информация о привязанной карте */}
            {user.cardInfo && (
              <div className="user-detail-section">
                <h3 className="section-title">
                  <FiCreditCard size={20} />
                  <span>Привязанная банковская карта</span>
                </h3>
                <div className="user-detail-grid">
                  <div className="user-detail-item">
                    <div className="detail-label">
                      <FiCreditCard size={18} />
                      <span>Номер карты</span>
                    </div>
                    <div className="detail-value">{user.cardInfo.maskedCardNumber || 'Не указано'}</div>
                  </div>

                  {user.cardInfo.last4 && (
                    <div className="user-detail-item">
                      <div className="detail-label">
                        <FiHash size={18} />
                        <span>Последние 4 цифры</span>
                      </div>
                      <div className="detail-value">**** {user.cardInfo.last4}</div>
                    </div>
                  )}

                  {user.cardInfo.cardType && (
                    <div className="user-detail-item">
                      <div className="detail-label">
                        <FiCreditCard size={18} />
                        <span>Тип карты</span>
                      </div>
                      <div className="detail-value">
                        {user.cardInfo.cardType === 'visa' ? 'Visa' : 
                         user.cardInfo.cardType === 'mastercard' ? 'Mastercard' : 
                         user.cardInfo.cardType === 'amex' ? 'American Express' : 
                         user.cardInfo.cardType === 'discover' ? 'Discover' : 
                         user.cardInfo.cardType}
                      </div>
                    </div>
                  )}

                  {user.cardInfo.expiryDate && (
                    <div className="user-detail-item">
                      <div className="detail-label">
                        <FiCalendar size={18} />
                        <span>Срок действия</span>
                      </div>
                      <div className="detail-value">{user.cardInfo.expiryDate}</div>
                    </div>
                  )}

                  {user.cardInfo.cardholderName && (
                    <div className="user-detail-item">
                      <div className="detail-label">
                        <FiUser size={18} />
                        <span>Имя держателя</span>
                      </div>
                      <div className="detail-value">{user.cardInfo.cardholderName}</div>
                    </div>
                  )}

                  {user.cardInfo.boundAt && (
                    <div className="user-detail-item">
                      <div className="detail-label">
                        <FiCalendar size={18} />
                        <span>Дата привязки</span>
                      </div>
                      <div className="detail-value">
                        {new Date(user.cardInfo.boundAt).toLocaleDateString('ru-RU', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Паспортные данные */}
            <div className="user-detail-section">
              <h3 className="section-title">Паспортные данные</h3>
              <div className="user-detail-grid">
                <div className="user-detail-item">
                  <div className="detail-label">Серия паспорта</div>
                  <div className="detail-value">{user.passport_series || 'Не указано'}</div>
                </div>

                <div className="user-detail-item">
                  <div className="detail-label">Номер паспорта</div>
                  <div className="detail-value">{user.passport_number || 'Не указано'}</div>
                </div>

                <div className="user-detail-item">
                  <div className="detail-label">Идентификационный номер</div>
                  <div className="detail-value">{user.identification_number || 'Не указано'}</div>
                </div>
              </div>
            </div>

            {/* Фото пользователя */}
            <div className="user-detail-section">
              <h3 className="section-title">
                <FiImage size={20} />
                <span>Фотографии</span>
              </h3>
              
              <div className="user-photos-grid">
                {user.user_photo_url && (
                  <div className="photo-item">
                    <div className="photo-label">Фото профиля</div>
                    <div className="photo-container">
                      <img 
                        src={user.user_photo_url} 
                        alt="Фото профиля"
                        className="photo-image"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.innerHTML = '<div class="photo-error">Фото не загружено</div>';
                        }}
                      />
                    </div>
                  </div>
                )}

                {user.passport_photo_url && (
                  <div className="photo-item">
                    <div className="photo-label">Фото паспорта</div>
                    <div className="photo-container">
                      <img 
                        src={user.passport_photo_url} 
                        alt="Фото паспорта"
                        className="photo-image"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.innerHTML = '<div class="photo-error">Фото не загружено</div>';
                        }}
                      />
                    </div>
                  </div>
                )}

                {!user.user_photo_url && !user.passport_photo_url && (
                  <div className="photo-empty">Фотографии не загружены</div>
                )}
              </div>
            </div>

            {/* Покупки долей */}
            {user.sharePurchases && user.sharePurchases.length > 0 && (
              <div className="user-detail-section">
                <h3 className="section-title">Покупки долей ({user.sharePurchases.length})</h3>
                <div className="documents-list">
                  {user.sharePurchases.map((row) => (
                    <div key={row.id} className="document-item">
                      <div className="document-info">
                        <div className="document-header">
                          <span className="document-type">
                            {row.property_title || `Объект #${row.property_id}`} ({row.property_type})
                          </span>
                          <span className="document-status status-approved">Оплачено</span>
                        </div>
                        <div className="document-date">
                          Долей: {row.shares_count} · за долю: {Number(row.price_per_share).toLocaleString('ru-RU')}{' '}
                          {row.currency || 'USD'} · всего: {Number(row.total_price).toLocaleString('ru-RU')}{' '}
                          {row.currency || 'USD'}
                        </div>
                        <div className="document-date">
                          Дата: {formatDate(row.purchase_date)}
                        </div>
                        {row.agreement_signature && (
                          <div className="document-date user-detail-share-sig">
                            <div>Подпись согласия:</div>
                            {String(row.agreement_signature).startsWith('data:image') ? (
                              <img
                                src={row.agreement_signature}
                                alt="Подпись"
                                className="user-detail-share-sig__img"
                              />
                            ) : (
                              <span>{row.agreement_signature}</span>
                            )}
                          </div>
                        )}
                        {row.policy_version && (
                          <div className="document-date">Версия политики: {row.policy_version}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Документы на верификацию */}
            {documents.length > 0 && (
              <div className="user-detail-section">
                <h3 className="section-title">
                  <FiImage size={20} />
                  <span>Документы на верификацию ({documents.length})</span>
                </h3>
                
                <div className="documents-list">
                  {documents.map((doc) => (
                    <div key={doc.id} className="document-item">
                      <div className="document-info">
                        <div className="document-header">
                          <span className="document-type">{doc.document_type || 'Документ'}</span>
                          <span className={`document-status ${getStatusClass(doc.verification_status || 'pending')}`}>
                            {getStatusLabel(doc.verification_status || 'pending')}
                          </span>
                        </div>
                        <div className="document-date">
                          Загружен: {formatDate(doc.created_at)}
                        </div>
                        {doc.rejection_reason && (
                          <div className="document-rejection-reason">
                            Причина отклонения: {doc.rejection_reason}
                          </div>
                        )}
                      </div>
                      {doc.document_photo_url && (
                        <div className="document-photo">
                          <img 
                            src={doc.document_photo_url} 
                            alt={doc.document_type || 'Документ'}
                            className="document-image"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.parentElement.innerHTML = '<div class="photo-error">Фото не загружено</div>';
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Действия */}
            <div className="user-detail-actions">
              <button
                className={`btn-action btn-action--${user.is_blocked === 1 ? 'unblock' : 'block'}`}
                onClick={handleBlock}
              >
                {user.is_blocked === 1 ? (
                  <>
                    <FiShield size={18} />
                    Разблокировать
                  </>
                ) : (
                  <>
                    <FiShieldOff size={18} />
                    Заблокировать
                  </>
                )}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default UserDetailModal;


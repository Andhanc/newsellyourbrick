import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FiX, FiUser, FiMail, FiPhone, FiMapPin, FiShield, FiShieldOff, FiCalendar, FiImage, FiCreditCard, FiHash } from 'react-icons/fi';
import { getApiBaseUrl, getApiBaseUrlSync } from '../../utils/apiConfig';
import './UserDetailModal.css';
import { getUiIntlLocale } from '../../utils/uiIntlLocale'

// Константа для базового URL без /api (для изображений)
const API_BASE_URL_WITHOUT_API = getApiBaseUrlSync().replace('/api', '');

const UserDetailModal = ({ isOpen, onClose, userId }) => {
  const { t } = useTranslation();
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
        throw new Error(t('admin_ne_udalos_zagruzit_dannye_70f06f44'));
      }
      const userResult = await userResponse.json();
      
      if (!userResult.success || !userResult.data) {
        throw new Error(t('admin_polzovatel_ne_nayden_60054fa0'));
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

      let reservationPurchases = [];
      try {
        const reservRes = await fetch(`${API_BASE_URL}/users/${userId}/reservation-purchases`);
        if (reservRes.ok) {
          const reservJson = await reservRes.json();
          if (reservJson.success && Array.isArray(reservJson.data)) {
            reservationPurchases = reservJson.data;
          }
        }
      } catch (reservErr) {
        console.warn('Не удалось загрузить резервы:', reservErr);
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
        reservationPurchases,
      });
      setDocuments(documentsWithUrls);
    } catch (err) {
      console.error('Ошибка при загрузке данных пользователя:', err);
      setError(err.message || t('admin_proizoshla_oshibka_pri_zagruzke_385f5b18'));
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

    const willUnblock = user.is_blocked === 1;

    if (window.confirm(t(willUnblock ? 'admin_user_confirmUnblock' : 'admin_user_confirmBlock'))) {
      try {
        const API_BASE_URL = await getApiBaseUrl();
        const endpoint = willUnblock
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
            setUser({ ...user, is_blocked: willUnblock ? 0 : 1 });
            alert(t(willUnblock ? 'admin_user_unblockedOk' : 'admin_user_blockedOk'));
          } else {
            alert(t('admin_errorPrefix') + (result.error || t('admin_ne_udalos_izmenit_status_5e7bfbe2')));
          }
        } else {
          const errorData = await response.json();
          alert(t('admin_errorPrefix') + (errorData.error || t('admin_ne_udalos_izmenit_status_5e7bfbe2')));
        }
      } catch (error) {
        console.error('Ошибка при изменении статуса блокировки:', error);
        alert(t('admin_panel_blockStatusError'));
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return t('admin_notSpecified');
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(getUiIntlLocale(), {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return t('admin_notSpecified');
    }
  };

  const getStatusLabel = (status) => {
    const statusMap = {
      'pending': t('admin_na_moderacii_29c1e27e'),
      'approved': t('admin_odobren_0a0f1509'),
      'rejected': t('admin_otklonen_0ce3aad1')
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
          <h2>{t('admin_informaciya_o_polzovatele_67bdc7d1')}</h2>
          <button className="user-detail-modal__close" onClick={onClose}>
            <FiX size={24} />
          </button>
        </div>

        {isLoading ? (
          <div className="user-detail-modal__loading">
            <p>{t('admin_zagruzka_dannyh_68113124')}</p>
          </div>
        ) : error ? (
          <div className="user-detail-modal__error">
            <p>{t('admin_errorPrefix')}{error}</p>
            <button onClick={fetchUserDetails}>{t('admin_tryAgain')}</button>
          </div>
        ) : user ? (
          <div className="user-detail-modal__content">
            {/* Основная информация */}
            <div className="user-detail-section">
              <h3 className="section-title">{t('admin_osnovnaya_informaciya_b0687d11')}</h3>
              <div className="user-detail-grid">
                <div className="user-detail-item">
                  <div className="detail-label">
                    <FiUser size={18} />
                    <span>{t('admin_fio_6521986a')}</span>
                  </div>
                  <div className="detail-value">
                    {`${user.first_name || ''} ${user.last_name || ''}`.trim() || t('admin_notSpecified')}
                  </div>
                </div>

                <div className="user-detail-item">
                  <div className="detail-label">
                    <FiMail size={18} />
                    <span>Email</span>
                  </div>
                  <div className="detail-value">{user.email || t('admin_notSpecified')}</div>
                </div>

                <div className="user-detail-item">
                  <div className="detail-label">
                    <FiPhone size={18} />
                    <span>{t('admin_phone')}</span>
                  </div>
                  <div className="detail-value">{user.phone_number || t('admin_notSpecified')}</div>
                </div>

                <div className="user-detail-item">
                  <div className="detail-label">
                    <FiMapPin size={18} />
                    <span>{t('admin_country')}</span>
                  </div>
                  <div className="detail-value">{user.country || t('admin_notSpecified')}</div>
                </div>

                <div className="user-detail-item">
                  <div className="detail-label">
                    <FiMapPin size={18} />
                    <span>{t('admin_address')}</span>
                  </div>
                  <div className="detail-value">{user.address || t('admin_notSpecified')}</div>
                </div>

                <div className="user-detail-item">
                  <div className="detail-label">
                    <FiCalendar size={18} />
                    <span>{t('admin_data_registracii_6bf93f9b')}</span>
                  </div>
                  <div className="detail-value">{formatDate(user.created_at)}</div>
                </div>

                <div className="user-detail-item">
                  <div className="detail-label">
                    <span>{t('admin_rol_ab51a3ac')}</span>
                  </div>
                  <div className={`detail-value detail-value--role detail-value--${user.role}`}>
                    {user.role === 'buyer' ? t('admin_buyer') : user.role === 'seller' ? t('admin_seller') : user.role}
                  </div>
                </div>

                <div className="user-detail-item">
                  <div className="detail-label">
                    <span>{t('admin_status_verifikacii_3e4a6cc1')}</span>
                  </div>
                  <div className={`detail-value ${user.is_verified === 1 ? 'status-verified' : 'status-unverified'}`}>
                    {user.is_verified === 1 ? t('admin_verificirovan_d027fb34') : t('admin_ne_verificirovan_000eda6d')}
                  </div>
                </div>

                <div className="user-detail-item">
                  <div className="detail-label">
                    {user.is_blocked === 1 ? <FiShieldOff size={18} /> : <FiShield size={18} />}
                    <span>{t('admin_status_blokirovki_d90492dc')}</span>
                  </div>
                  <div className={`detail-value ${user.is_blocked === 1 ? 'status-blocked' : 'status-active'}`}>
                    {user.is_blocked === 1 ? t('admin_zablokirovan_2c998bfc') : t('admin_aktiven_667904ef')}
                  </div>
                </div>
              </div>
            </div>

            {/* Информация о привязанной карте */}
            {user.cardInfo && (
              <div className="user-detail-section">
                <h3 className="section-title">
                  <FiCreditCard size={20} />
                  <span>{t('admin_privyazannaya_bankovskaya_karta_f8f373bb')}</span>
                </h3>
                <div className="user-detail-grid">
                  <div className="user-detail-item">
                    <div className="detail-label">
                      <FiCreditCard size={18} />
                      <span>{t('admin_nomer_karty_ba0b2eb9')}</span>
                    </div>
                    <div className="detail-value">{user.cardInfo.maskedCardNumber || t('admin_notSpecified')}</div>
                  </div>

                  {user.cardInfo.last4 && (
                    <div className="user-detail-item">
                      <div className="detail-label">
                        <FiHash size={18} />
                        <span>{t('admin_poslednie_4_cifry_8171e0f6')}</span>
                      </div>
                      <div className="detail-value">**** {user.cardInfo.last4}</div>
                    </div>
                  )}

                  {user.cardInfo.cardType && (
                    <div className="user-detail-item">
                      <div className="detail-label">
                        <FiCreditCard size={18} />
                        <span>{t('admin_tip_karty_7352bfc6')}</span>
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
                        <span>{t('admin_srok_deystviya_87e7a85d')}</span>
                      </div>
                      <div className="detail-value">{user.cardInfo.expiryDate}</div>
                    </div>
                  )}

                  {user.cardInfo.cardholderName && (
                    <div className="user-detail-item">
                      <div className="detail-label">
                        <FiUser size={18} />
                        <span>{t('admin_imya_derzhatelya_e483bcb7')}</span>
                      </div>
                      <div className="detail-value">{user.cardInfo.cardholderName}</div>
                    </div>
                  )}

                  {user.cardInfo.boundAt && (
                    <div className="user-detail-item">
                      <div className="detail-label">
                        <FiCalendar size={18} />
                        <span>{t('admin_data_privyazki_60867cb7')}</span>
                      </div>
                      <div className="detail-value">
                        {new Date(user.cardInfo.boundAt).toLocaleDateString(getUiIntlLocale(), {
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
              <h3 className="section-title">{t('admin_pasportnye_dannye_346b8e85')}</h3>
              <div className="user-detail-grid">
                <div className="user-detail-item">
                  <div className="detail-label">{t('admin_seriya_pasporta_a4028127')}</div>
                  <div className="detail-value">{user.passport_series || t('admin_notSpecified')}</div>
                </div>

                <div className="user-detail-item">
                  <div className="detail-label">{t('admin_nomer_pasporta_5b12dd18')}</div>
                  <div className="detail-value">{user.passport_number || t('admin_notSpecified')}</div>
                </div>

                <div className="user-detail-item">
                  <div className="detail-label">{t('admin_identifikacionnyy_nomer_fa86192e')}</div>
                  <div className="detail-value">{user.identification_number || t('admin_notSpecified')}</div>
                </div>
              </div>
            </div>

            {/* Фото пользователя */}
            <div className="user-detail-section">
              <h3 className="section-title">
                <FiImage size={20} />
                <span>{t('admin_fotografii_534c2f6a')}</span>
              </h3>
              
              <div className="user-photos-grid">
                {user.user_photo_url && (
                  <div className="photo-item">
                    <div className="photo-label">{t('admin_foto_profilya_37842b90')}</div>
                    <div className="photo-container">
                      <img 
                        src={user.user_photo_url} 
                        alt={t('admin_foto_profilya_37842b90')}
                        className="photo-image"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.innerHTML = t('admin_div_class_photo_error_667acb52');
                        }}
                      />
                    </div>
                  </div>
                )}

                {user.passport_photo_url && (
                  <div className="photo-item">
                    <div className="photo-label">{t('admin_foto_pasporta_4b5f424c')}</div>
                    <div className="photo-container">
                      <img 
                        src={user.passport_photo_url} 
                        alt={t('admin_foto_pasporta_4b5f424c')}
                        className="photo-image"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.innerHTML = t('admin_div_class_photo_error_667acb52');
                        }}
                      />
                    </div>
                  </div>
                )}

                {!user.user_photo_url && !user.passport_photo_url && (
                  <div className="photo-empty">{t('admin_fotografii_ne_zagruzheny_fac6312a')}</div>
                )}
              </div>
            </div>

            {/* Резервы 10% (Купить сейчас) */}
            {user.reservationPurchases && user.reservationPurchases.length > 0 && (
              <div className="user-detail-section">
                <h3 className="section-title">{t('admin_reserves10_count', { n: user.reservationPurchases.length })}</h3>
                <div className="documents-list">
                  {user.reservationPurchases.map((row) => {
                    const b = row.billing || {};
                    const pid = b.property_id;
                    const paidStripe = (row.amount_cents || 0) / 100;
                    const cur = (row.currency || 'eur').toUpperCase();
                    return (
                      <div key={row.id || row.dedupe_key} className="document-item">
                        <div className="document-info">
                          <div className="document-header">
                            <span className="document-type">
                              {t('admin_rezerv_obekt_id_amount_90eea8dd', { id: pid != null ? pid : '—', amount: paidStripe.toLocaleString() })}{' '}
                              {cur}
                            </span>
                            <span className="document-status status-approved">{t('admin_oplacheno_13d79e62')}</span>
                          </div>
                          <div className="document-date">{t('admin_data_5897c672')} {formatDate(row.paid_at)}</div>
                          {row.agreement_policy_version && (
                            <div className="document-date">{t('admin_versiya_politiki_f5c43d83')} {row.agreement_policy_version}</div>
                          )}
                          {row.agreement_signature && (
                            <div className="document-date user-detail-share-sig">
                              <div>{t('admin_podpis_soglasiya_8d1915cd')}</div>
                              {String(row.agreement_signature).startsWith('data:image') ? (
                                <img
                                  src={row.agreement_signature}
                                  alt={t('admin_podpis_a5dcf372')}
                                  className="user-detail-share-sig__img"
                                />
                              ) : (
                                <span>{row.agreement_signature}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Покупки долей */}
            {user.sharePurchases && user.sharePurchases.length > 0 && (
              <div className="user-detail-section">
                <h3 className="section-title">{t('admin_share_purchases_count', { n: user.sharePurchases.length })}</h3>
                <div className="documents-list">
                  {user.sharePurchases.map((row) => (
                    <div key={row.id} className="document-item">
                      <div className="document-info">
                        <div className="document-header">
                          <span className="document-type">
                            {row.property_title || t('admin_objectNum_tmpl', { id: row.property_id })} ({row.property_type})
                          </span>
                          <span className="document-status status-approved">{t('admin_oplacheno_13d79e62')}</span>
                        </div>
                        <div className="document-date">
                          {t('admin_doley_shares_za_dolyu_3a08abe1', { shares: row.shares_count, price: Number(row.price_per_share).toLocaleString() })}{' '}
                          {t('admin_currency_vsego_total_55077e4f', { currency: row.currency || 'USD', total: Number(row.total_price).toLocaleString() })}{' '}
                          {row.currency || 'USD'}
                        </div>
                        <div className="document-date">
                          {t('admin_data_5897c672')} {formatDate(row.purchase_date)}
                        </div>
                        {row.agreement_signature && (
                          <div className="document-date user-detail-share-sig">
                            <div>{t('admin_podpis_soglasiya_8d1915cd')}</div>
                            {String(row.agreement_signature).startsWith('data:image') ? (
                              <img
                                src={row.agreement_signature}
                                alt={t('admin_podpis_a5dcf372')}
                                className="user-detail-share-sig__img"
                              />
                            ) : (
                              <span>{row.agreement_signature}</span>
                            )}
                          </div>
                        )}
                        {row.policy_version && (
                          <div className="document-date">{t('admin_versiya_politiki_f5c43d83')} {row.policy_version}</div>
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
                  <span>{t('admin_docs_for_verification', { n: documents.length })}</span>
                </h3>
                
                <div className="documents-list">
                  {documents.map((doc) => (
                    <div key={doc.id} className="document-item">
                      <div className="document-info">
                        <div className="document-header">
                          <span className="document-type">{doc.document_type || t('admin_dokument_0fd26103')}</span>
                          <span className={`document-status ${getStatusClass(doc.verification_status || 'pending')}`}>
                            {getStatusLabel(doc.verification_status || 'pending')}
                          </span>
                        </div>
                        <div className="document-date">
                          {t('admin_zagruzhen_b61e66cc')} {formatDate(doc.created_at)}
                        </div>
                        {doc.rejection_reason && (
                          <div className="document-rejection-reason">
                            {t('admin_prichina_otkloneniya_dece3df8')} {doc.rejection_reason}
                          </div>
                        )}
                      </div>
                      {doc.document_photo_url && (
                        <div className="document-photo">
                          <img 
                            src={doc.document_photo_url} 
                            alt={doc.document_type || t('admin_dokument_0fd26103')}
                            className="document-image"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.parentElement.innerHTML = t('admin_div_class_photo_error_667acb52');
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
                    {t('admin_razblokirovat_d4ab263a')}
                  </>
                ) : (
                  <>
                    <FiShieldOff size={18} />
                    {t('admin_zablokirovat_0d57053c')}
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


import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiArrowLeft, FiUser, FiMail, FiCalendar, FiFileText, FiPhone, FiCreditCard, FiGlobe, FiHash, FiImage, FiDollarSign, FiCheck, FiXCircle } from 'react-icons/fi';
import { getApiBaseUrlSync } from '../../utils/apiConfig';
import './ModerationUserDetail.css';

const API_BASE_URL = getApiBaseUrlSync();

const ModerationUserDetail = ({ user, onBack, onApprove, onReject, onRefresh }) => {
  const { t, i18n } = useTranslation();
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const handleApproveUser = () => {
    if (window.confirm(t('admin_vy_uvereny_chto_hotite_cbe522d3'))) {
      onApprove('users', user.id);
    }
  };

  const handleRejectUser = () => {
    const rejectionReason = prompt(t('admin_ukazhite_prichinu_otkloneniya_neobya_bad4e2d3'));
    if (rejectionReason !== null) {
      if (window.confirm(t('admin_vy_uvereny_chto_hotite_bdef3180'))) {
        onReject('users', user.id, rejectionReason || null);
      }
    }
  };

  const getDocumentTypeLabel = (type) => {
    const types = {
      'passport': t('admin_passport'),
      'selfie': t('admin_selfi_4792ba8d'),
      'passport_with_face': t('admin_pasport_lico_d0837044'),
      'other': t('admin_drugoy_dokument_57465b65')
    };
    return types[type] || type || t('admin_dokument_0fd26103');
  };

  const getDocumentOrder = (type) => {
    const order = {
      passport: 1,
      selfie: 2,
      passport_with_face: 3
    };
    return order[type] || 99;
  };

  const getDocumentImageUrl = (photoPath) => {
    if (!photoPath) return null;
    if (photoPath.startsWith('http')) return photoPath;
    return `${API_BASE_URL.replace('/api', '')}${photoPath}`;
  };

  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || t('admin_notSpecified');
  const userPhotoAlt = t('admin_foto_polzovatelya_819005b3');

  return (
    <div className="moderation-user-detail">
      <button className="moderation-user-detail__back" onClick={onBack}>
        <FiArrowLeft size={20} />
        {t('admin_nazad_f6dab074')}
      </button>

      <div className="moderation-user-detail__content">
        <div className="moderation-user-detail__info-section">
          <div className="moderation-user-detail__info-card">
            <h2 className="moderation-user-detail__info-title">{t('admin_informaciya_o_polzovatele_67bdc7d1')}</h2>
            
            <div className="moderation-user-detail__info-list">
              <div className="moderation-user-detail__info-row">
                <div className="moderation-user-detail__info-label">
                  <FiUser size={18} />
                  {t('admin_imya_aee78fe8')}
                </div>
                <div className="moderation-user-detail__info-value">
                  {fullName}
                </div>
              </div>

              <div className="moderation-user-detail__info-row">
                <div className="moderation-user-detail__info-label">
                  <FiMail size={18} />
                  Email
                </div>
                <div className="moderation-user-detail__info-value">
                  {user.email}
                </div>
              </div>

              <div className="moderation-user-detail__info-row">
                <div className="moderation-user-detail__info-label">
                  <FiPhone size={18} />
                  {t('buyerData_labelPhone')}
                </div>
                <div className="moderation-user-detail__info-value">
                  {user.phone || t('admin_ne_ukazan_3b3c4f15')}
                </div>
              </div>

              <div className="moderation-user-detail__info-row">
                <div className="moderation-user-detail__info-label">
                  <FiHash size={18} />
                  ID
                </div>
                <div className="moderation-user-detail__info-value">
                  {user.id}
                </div>
              </div>

              <div className="moderation-user-detail__info-row">
                <div className="moderation-user-detail__info-label">
                  <FiUser size={18} />
                  {t('admin_rol_ab51a3ac')}
                </div>
                <div className={`moderation-user-detail__info-value moderation-user-detail__info-value--${user.role}`}>
                  {user.role === 'buyer' ? t('admin_buyer') : t('admin_seller')}
                </div>
              </div>

            </div>
          </div>

          {user.cardInfo && (
            <div className="moderation-user-detail__info-card">
              <h2 className="moderation-user-detail__info-title">
                <FiCreditCard size={20} />
                {t('admin_privyazannaya_bankovskaya_karta_f8f373bb')}
              </h2>
              
              <div className="moderation-user-detail__info-list">
                <div className="moderation-user-detail__info-row">
                  <div className="moderation-user-detail__info-label">
                    <FiCreditCard size={18} />
                    {t('admin_nomer_karty_ba0b2eb9')}
                  </div>
                  <div className="moderation-user-detail__info-value">
                    {user.cardInfo.maskedCardNumber || t('admin_notSpecified')}
                  </div>
                </div>

                {user.cardInfo.last4 && (
                  <div className="moderation-user-detail__info-row">
                    <div className="moderation-user-detail__info-label">
                      <FiHash size={18} />
                      {t('admin_poslednie_4_cifry_8171e0f6')}
                    </div>
                    <div className="moderation-user-detail__info-value">
                      **** {user.cardInfo.last4}
                    </div>
                  </div>
                )}

                {user.cardInfo.cardType && (
                  <div className="moderation-user-detail__info-row">
                    <div className="moderation-user-detail__info-label">
                      <FiCreditCard size={18} />
                      {t('admin_tip_karty_7352bfc6')}
                    </div>
                    <div className="moderation-user-detail__info-value">
                      {user.cardInfo.cardType === 'visa' ? 'Visa' : 
                       user.cardInfo.cardType === 'mastercard' ? 'Mastercard' : 
                       user.cardInfo.cardType === 'amex' ? 'American Express' : 
                       user.cardInfo.cardType === 'discover' ? 'Discover' : 
                       user.cardInfo.cardType}
                    </div>
                  </div>
                )}

                {user.cardInfo.expiryDate && (
                  <div className="moderation-user-detail__info-row">
                    <div className="moderation-user-detail__info-label">
                      <FiCalendar size={18} />
                      {t('admin_srok_deystviya_87e7a85d')}
                    </div>
                    <div className="moderation-user-detail__info-value">
                      {user.cardInfo.expiryDate}
                    </div>
                  </div>
                )}

                {user.cardInfo.cardholderName && (
                  <div className="moderation-user-detail__info-row">
                    <div className="moderation-user-detail__info-label">
                      <FiUser size={18} />
                      {t('admin_imya_derzhatelya_e483bcb7')}
                    </div>
                    <div className="moderation-user-detail__info-value">
                      {user.cardInfo.cardholderName}
                    </div>
                  </div>
                )}

                {user.cardInfo.boundAt && (
                  <div className="moderation-user-detail__info-row">
                    <div className="moderation-user-detail__info-label">
                      <FiCalendar size={18} />
                      {t('admin_data_privyazki_60867cb7')}
                    </div>
                    <div className="moderation-user-detail__info-value">
                      {new Date(user.cardInfo.boundAt).toLocaleDateString(i18n.language || 'en', {
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

        </div>

        <div className="moderation-user-detail__media-section">
          {user.photos && user.photos.length > 0 && (
            <div className="moderation-user-detail__media-card">
              <h2 className="moderation-user-detail__media-title">
                <FiImage size={20} />
                {t('admin_fotografii_534c2f6a')}
              </h2>
              <div className="moderation-user-detail__photos-grid">
                <div
                  className="moderation-user-detail__photo-item"
                  onClick={() => setSelectedPhoto(user.photos[0])}
                >
                  <img src={user.photos[0]} alt={userPhotoAlt} />
                </div>
              </div>
            </div>
          )}

          <div className="moderation-user-detail__media-card">
            <h2 className="moderation-user-detail__media-title">
              <FiFileText size={20} />
              {t('admin_docsForVerification')}
            </h2>
            <div className="moderation-user-detail__documents-photos-grid">
              {user.documents && user.documents.length > 0 ? (
                [...user.documents]
                  .filter((doc) => getDocumentImageUrl(doc.document_photo))
                  .sort((a, b) => {
                    const byType = getDocumentOrder(a.document_type) - getDocumentOrder(b.document_type);
                    if (byType !== 0) return byType;
                    const aDate = new Date(a.created_at || 0).getTime();
                    const bDate = new Date(b.created_at || 0).getTime();
                    return aDate - bDate;
                  })
                  .map((doc) => {
                  const documentPhoto = getDocumentImageUrl(doc.document_photo);
                  const documentName = getDocumentTypeLabel(doc.document_type);
                  const isPassport = doc.document_type === 'passport';
                  const isPassportWithFace = doc.document_type === 'passport_with_face';

                  return (
                    <div key={doc.id} className="moderation-user-detail__document-item-wrapper">
                      {(isPassport || isPassportWithFace) ? (
                        <div className="moderation-user-detail__document-photo-item-full">
                          <div className="moderation-user-detail__document-photo-label">
                            {documentName}
                          </div>
                          <div className="moderation-user-detail__document-photo-image-full">
                            <img 
                              src={documentPhoto} 
                              alt={documentName}
                              onClick={() => setSelectedPhoto(documentPhoto)}
                              style={{ cursor: 'pointer' }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="moderation-user-detail__document-photo-item">
                          <div className="moderation-user-detail__document-photo-label">
                            {documentName}
                          </div>
                          <div 
                            className="moderation-user-detail__document-photo-image"
                            onClick={() => setSelectedPhoto(documentPhoto)}
                            style={{ cursor: 'pointer' }}
                          >
                            <img src={documentPhoto} alt={documentName} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="moderation-user-detail__no-documents">{t('admin_dokumenty_ne_predostavleny_33fdd87c')}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="moderation-user-detail__user-actions">
        <button
          className="moderation-user-detail__user-btn moderation-user-detail__user-btn--approve"
          onClick={handleApproveUser}
        >
          <FiCheck size={20} />
          {t('admin_approveUserBtn')}
        </button>
        <button
          className="moderation-user-detail__user-btn moderation-user-detail__user-btn--reject"
          onClick={handleRejectUser}
        >
          <FiXCircle size={20} />
          {t('admin_rejectUserBtn')}
        </button>
      </div>

      {selectedDocument && (
        <div
          className="moderation-user-detail__document-modal"
          onClick={() => setSelectedDocument(null)}
        >
          <div className="moderation-user-detail__document-modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="moderation-user-detail__document-modal-close"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedDocument(null);
              }}
            >
              <FiXCircle size={32} strokeWidth={2} />
            </button>
            {selectedDocument.type === 'pdf' ? (
              <iframe
                src={`${selectedDocument.url}#toolbar=0`}
                className="moderation-user-detail__document-pdf"
                title={selectedDocument.name}
              />
            ) : (
              <img src={selectedDocument.url} alt={selectedDocument.name} />
            )}
          </div>
        </div>
      )}

      {selectedPhoto && (
        <div
          className="moderation-user-detail__photo-modal"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="moderation-user-detail__photo-modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="moderation-user-detail__photo-modal-close"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPhoto(null);
              }}
            >
              <FiXCircle size={32} strokeWidth={2} />
            </button>
            <img src={selectedPhoto} alt={userPhotoAlt} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ModerationUserDetail;

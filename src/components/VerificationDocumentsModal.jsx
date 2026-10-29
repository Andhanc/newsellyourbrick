import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FiX, FiUpload, FiFile, FiCheck, FiCamera } from 'react-icons/fi';
import { showNotification } from '../utils/toastHelper';
import './VerificationDocumentsModal.css';

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || '/api';

const VerificationDocumentsModal = ({ isOpen, onClose, userId, onComplete }) => {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState({
    passport: null,
    selfie: null,
    passportWithFace: null
  });
  
  const [uploaded, setUploaded] = useState({
    passport: false,
    selfie: false,
    passportWithFace: false
  });

  const [uploading, setUploading] = useState({
    passport: false,
    selfie: false,
    passportWithFace: false
  });

  const [errors, setErrors] = useState({});

  const passportRef = useRef(null);
  const selfieRef = useRef(null);
  const passportWithFaceRef = useRef(null);

  const documentTypes = [
    {
      key: 'passport',
      label: t('verificationDocsPassportLabel'),
      ref: passportRef,
      description: t('verificationDocsPassportDesc'),
      documentType: 'passport'
    },
    {
      key: 'selfie',
      label: t('verificationDocsSelfieLabel'),
      ref: selfieRef,
      description: t('verificationDocsSelfieDesc'),
      documentType: 'selfie'
    },
    {
      key: 'passportWithFace',
      label: t('verificationDocsPassportFaceLabel'),
      ref: passportWithFaceRef,
      description: t('verificationDocsPassportFaceDesc'),
      documentType: 'passport_with_face'
    }
  ];

  const handleFileChange = async (key, file) => {
    if (!file) return;

    // Валидация размера файла (максимум 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErrors(prev => ({
        ...prev,
        [key]: t('verificationDocsErrorFileSize')
      }));
      return;
    }

    // Валидация типа файла
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setErrors(prev => ({
        ...prev,
        [key]: t('verificationDocsErrorFileType')
      }));
      return;
    }

    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[key];
      return newErrors;
    });

    // Проверяем userId перед использованием
    if (!userId) {
      setErrors(prev => ({
        ...prev,
        [key]: t('verificationDocsErrorNoUserId')
      }));
      return;
    }

    // Преобразуем userId в число и проверяем валидность
    const numericUserId = typeof userId === 'string' ? parseInt(userId, 10) : Number(userId);
    if (isNaN(numericUserId) || numericUserId <= 0) {
      setErrors(prev => ({
        ...prev,
        [key]: t('verificationDocsErrorBadUserId')
      }));
      return;
    }

    setUploading(prev => ({ ...prev, [key]: true }));

    try {
      const formData = new FormData();
      formData.append('document_photo', file);
      formData.append('user_id', String(numericUserId));
      formData.append('document_type', documentTypes.find(d => d.key === key).documentType);

      const response = await fetch(`${API_BASE_URL}/documents`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || t('verificationDocsErrorUpload'));
      }

      const data = await response.json();
      
      if (data.success) {
        setDocuments(prev => ({
          ...prev,
          [key]: { file, documentId: data.data.id }
        }));
        setUploaded(prev => ({
          ...prev,
          [key]: true
        }));
      } else {
        throw new Error(data.error || t('verificationDocsErrorUpload'));
      }
    } catch (error) {
      console.error('Ошибка загрузки документа:', error);
      setErrors(prev => ({
        ...prev,
        [key]: error.message || t('verificationDocsErrorUploadFailed')
      }));
    } finally {
      setUploading(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleRemove = (key) => {
    setDocuments(prev => {
      const newDocs = { ...prev };
      delete newDocs[key];
      return newDocs;
    });
    setUploaded(prev => ({
      ...prev,
      [key]: false
    }));
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[key];
      return newErrors;
    });
  };

  const handleComplete = () => {
    const allUploaded = Object.values(uploaded).every(v => v === true);
    if (!allUploaded) {
      showNotification(t('verificationDocsNeedAll'));
      return;
    }
    
    if (onComplete) {
      onComplete(documents);
    }
    onClose();
  };

  if (!isOpen) return null;

  const uploadedCount = Object.values(uploaded).filter(v => v).length;
  const totalCount = Object.keys(uploaded).length;

  return (
    <div className="verification-documents-modal-overlay" onClick={onClose}>
      <div className="verification-documents-modal" onClick={(e) => e.stopPropagation()}>
        <button className="verification-documents-modal__close" onClick={onClose}>
          <FiX size={24} />
        </button>
        
        <div className="verification-documents-modal__content">
          <h2 className="verification-documents-modal__title">{t('verificationDocsTitle')}</h2>
          <p className="verification-documents-modal__description">
            {t('verificationDocsDescription')}
          </p>
          
          <div className="verification-documents-modal__list">
            {documentTypes.map((doc) => (
              <div 
                key={doc.key} 
                className={`verification-documents-modal__item ${uploaded[doc.key] ? 'uploaded' : ''} ${uploading[doc.key] ? 'uploading' : ''}`}
                onClick={() => {
                  if (!uploaded[doc.key] && !uploading[doc.key]) {
                    doc.ref.current?.click();
                  }
                }}
                style={{ cursor: !uploaded[doc.key] && !uploading[doc.key] ? 'pointer' : 'default' }}
              >
                <input
                  ref={doc.ref}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => handleFileChange(doc.key, e.target.files[0])}
                  className="verification-documents-modal__file-input"
                  id={`file-${doc.key}`}
                  disabled={uploading[doc.key]}
                />
                
                <div className="verification-documents-modal__item-header">
                  <div className="verification-documents-modal__item-icon">
                    {doc.key === 'passportWithFace' || doc.key === 'selfie' ? (
                      <FiCamera size={32} />
                    ) : (
                      <FiFile size={32} />
                    )}
                  </div>
                  <div className="verification-documents-modal__item-content">
                    <h3 className="verification-documents-modal__item-title">
                      {doc.label}
                    </h3>
                    <p className="verification-documents-modal__item-description">{doc.description}</p>
                  </div>
                  {uploaded[doc.key] && (
                    <span className="verification-documents-modal__item-check">
                      <FiCheck size={24} />
                    </span>
                  )}
                </div>
                
                {errors[doc.key] && (
                  <div className="verification-documents-modal__error">
                    {errors[doc.key]}
                  </div>
                )}
                
                {uploading[doc.key] && (
                  <div className="verification-documents-modal__upload-status">
                    <span className="spinner"></span>
                    <span>{t('verificationDocsUploading')}</span>
                  </div>
                )}
                
                {uploaded[doc.key] && !uploading[doc.key] && (
                  <div className="verification-documents-modal__file-info">
                    <div className="verification-documents-modal__file-details">
                      <p className="verification-documents-modal__file-name">{documents[doc.key]?.file?.name}</p>
                      <p className="verification-documents-modal__file-size">
                        {(documents[doc.key]?.file?.size / 1024 / 1024).toFixed(2)} {t('verificationDocsMb')}
                      </p>
                    </div>
                    <button
                      className="verification-documents-modal__remove-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(doc.key);
                      }}
                    >
                      {t('verificationDocsRemove')}
                    </button>
                  </div>
                )}
                
                {!uploaded[doc.key] && !uploading[doc.key] && (
                  <div className="verification-documents-modal__upload-hint">
                    <FiUpload size={20} />
                    <span>{t('verificationDocsClickToUpload')}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="verification-documents-modal__progress">
            <div className="verification-documents-modal__progress-bar">
              <div
                className="verification-documents-modal__progress-fill"
                style={{
                  width: `${(uploadedCount / totalCount) * 100}%`
                }}
              />
            </div>
            <p className="verification-documents-modal__progress-text">
              {t('verificationDocsProgress', { uploaded: uploadedCount, total: totalCount })}
            </p>
          </div>
          
          <div className="verification-documents-modal__actions">
            <button
              className="verification-documents-modal__btn verification-documents-modal__btn--complete"
              onClick={handleComplete}
              disabled={uploadedCount < totalCount}
            >
              {t('verificationDocsSubmit')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerificationDocumentsModal;


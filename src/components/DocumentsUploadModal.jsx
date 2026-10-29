import { useState, useRef } from 'react'
import { FiX, FiUpload, FiFile, FiCheck } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import './DocumentsUploadModal.css'

const DocumentsUploadModal = ({ isOpen, onClose, onComplete }) => {
  const { t } = useTranslation()
  const [documents, setDocuments] = useState({
    passport: null,
    ownership: null,
    noDebts: null
  })
  
  const [uploaded, setUploaded] = useState({
    passport: false,
    ownership: false,
    noDebts: false
  })

  const passportRef = useRef(null)
  const ownershipRef = useRef(null)
  const noDebtsRef = useRef(null)

  const documentTypes = [
    {
      key: 'passport',
      label: t('documentsModal_passportLabel'),
      ref: passportRef,
      description: t('documentsModal_passportDesc')
    },
    {
      key: 'ownership',
      label: t('documentsModal_ownershipLabel'),
      ref: ownershipRef,
      description: t('documentsModal_ownershipDesc')
    },
    {
      key: 'noDebts',
      label: t('documentsModal_noDebtsLabel'),
      ref: noDebtsRef,
      description: t('documentsModal_noDebtsDesc')
    }
  ]

  const handleFileChange = (key, file) => {
    if (file) {
      setDocuments(prev => ({
        ...prev,
        [key]: file
      }))
      setUploaded(prev => ({
        ...prev,
        [key]: true
      }))
    }
  }

  const handleRemove = (key) => {
    setDocuments(prev => ({
      ...prev,
      [key]: null
    }))
    setUploaded(prev => ({
      ...prev,
      [key]: false
    }))
  }

  const handleComplete = () => {
    const allUploaded = Object.values(uploaded).every(v => v === true)
    if (!allUploaded) {
      alert(t('documentsModal_alertAllRequired'))
      return
    }
    onComplete(documents)
  }

  if (!isOpen) return null

  const uploadedCount = Object.values(uploaded).filter(v => v).length

  return (
    <div className="documents-modal-overlay" onClick={onClose}>
      <div className="documents-modal" onClick={(e) => e.stopPropagation()}>
        <button className="documents-modal__close" onClick={onClose} aria-label={t('close')}>
          <FiX size={24} />
        </button>
        
        <div className="documents-modal__content">
          <h2 className="documents-modal__title">{t('documentsModal_title')}</h2>
          <p className="documents-modal__description">
            {t('documentsModal_subtitle')}
          </p>
          
          <div className="documents-modal__list">
            {documentTypes.map((doc) => (
              <div key={doc.key} className="documents-modal__item">
                <div className="documents-modal__item-header">
                  <h3 className="documents-modal__item-title">{doc.label}</h3>
                  {uploaded[doc.key] && (
                    <span className="documents-modal__item-check">
                      <FiCheck size={20} />
                    </span>
                  )}
                </div>
                <p className="documents-modal__item-description">{doc.description}</p>
                
                {!uploaded[doc.key] ? (
                  <div className="documents-modal__upload-area">
                    <input
                      ref={doc.ref}
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => handleFileChange(doc.key, e.target.files[0])}
                      className="documents-modal__file-input"
                      id={`file-${doc.key}`}
                    />
                    <label
                      htmlFor={`file-${doc.key}`}
                      className="documents-modal__upload-btn"
                    >
                      <FiUpload size={20} />
                      <span>{t('documentsModal_chooseFile')}</span>
                    </label>
                  </div>
                ) : (
                  <div className="documents-modal__file-info">
                    <div className="documents-modal__file-icon">
                      <FiFile size={24} />
                    </div>
                    <div className="documents-modal__file-details">
                      <p className="documents-modal__file-name">{documents[doc.key]?.name}</p>
                      <p className="documents-modal__file-size">
                        {(documents[doc.key]?.size / 1024 / 1024).toFixed(2)} {t('documentsModal_mb')}
                      </p>
                    </div>
                    <button
                      className="documents-modal__remove-btn"
                      onClick={() => handleRemove(doc.key)}
                    >
                      {t('documentsModal_remove')}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="documents-modal__progress">
            <div className="documents-modal__progress-bar">
              <div
                className="documents-modal__progress-fill"
                style={{
                  width: `${(uploadedCount / 3) * 100}%`
                }}
              />
            </div>
            <p className="documents-modal__progress-text">
              {t('documentsModal_progress', { count: uploadedCount, total: 3 })}
            </p>
          </div>
          
          <div className="documents-modal__actions">
            <button
              className="documents-modal__btn documents-modal__btn--cancel"
              onClick={onClose}
            >
              {t('documentsModal_cancel')}
            </button>
            <button
              className="documents-modal__btn documents-modal__btn--complete"
              onClick={handleComplete}
            >
              {t('documentsModal_completePublish')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DocumentsUploadModal

import { useState } from 'react'
import { FiX, FiUpload, FiFile, FiCheck } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import './DocumentsModal.css'

const DocumentsModal = ({ isOpen, onClose, onComplete }) => {
  const { t } = useTranslation()
  const [documents, setDocuments] = useState({
    ownership: null,
    noDebts: null
  })

  const [uploadedFiles, setUploadedFiles] = useState({
    ownership: false,
    noDebts: false
  })

  const handleFileChange = (type, e) => {
    const file = e.target.files[0]
    if (file) {
      setDocuments(prev => ({
        ...prev,
        [type]: file
      }))
      setUploadedFiles(prev => ({
        ...prev,
        [type]: true
      }))
    }
  }

  const handleComplete = () => {
    if (!uploadedFiles.ownership || !uploadedFiles.noDebts) {
      alert(t('documentsModal_alertAllRequired'))
      return
    }
    onComplete(documents)
  }

  const removeFile = (type) => {
    setDocuments(prev => ({
      ...prev,
      [type]: null
    }))
    setUploadedFiles(prev => ({
      ...prev,
      [type]: false
    }))
  }

  if (!isOpen) return null

  const documentTypes = [
    {
      key: 'ownership',
      label: t('documentsModal_ownershipLabel'),
      description: t('documentsModal_ownershipDesc')
    },
    {
      key: 'noDebts',
      label: t('documentsModal_noDebtsLabel'),
      description: t('documentsModal_noDebtsDesc')
    }
  ]

  return (
    <div className="documents-modal-overlay" onClick={onClose}>
      <div className="documents-modal" onClick={(e) => e.stopPropagation()}>
        <button className="documents-modal__close" onClick={onClose} aria-label={t('close')}>
          <FiX size={24} />
        </button>
        
        <div className="documents-modal__content">
          <h2 className="documents-modal__title">{t('documentsModal_title')}</h2>
          <p className="documents-modal__subtitle">
            {t('documentsModal_subtitle')}
          </p>

          <div className="documents-modal__list">
            {documentTypes.map((doc) => (
              <div key={doc.key} className="documents-modal__item">
                <div className="documents-modal__item-header">
                  <div className="documents-modal__item-info">
                    <h3 className="documents-modal__item-title">{doc.label}</h3>
                    <p className="documents-modal__item-description">{doc.description}</p>
                  </div>
                  {uploadedFiles[doc.key] && (
                    <div className="documents-modal__item-check">
                      <FiCheck size={20} />
                    </div>
                  )}
                </div>

                {!uploadedFiles[doc.key] ? (
                  <label className="documents-modal__upload">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => handleFileChange(doc.key, e)}
                      className="documents-modal__file-input"
                    />
                    <FiUpload size={24} />
                    <span>{t('documentsModal_uploadFile')}</span>
                  </label>
                ) : (
                  <div className="documents-modal__file-info">
                    <FiFile size={20} />
                    <span className="documents-modal__file-name">
                      {documents[doc.key]?.name || t('documentsModal_fileUploaded')}
                    </span>
                    <button
                      type="button"
                      className="documents-modal__remove"
                      onClick={() => removeFile(doc.key)}
                    >
                      {t('documentsModal_remove')}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="documents-modal__actions">
            <button
              type="button"
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

export default DocumentsModal

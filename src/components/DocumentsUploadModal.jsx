import { useState, useRef } from 'react'
import { FiX, FiUpload, FiFile, FiCheck } from 'react-icons/fi'
import './DocumentsUploadModal.css'

const DocumentsUploadModal = ({ isOpen, onClose, onComplete }) => {
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
      label: 'Паспорт',
      ref: passportRef,
      description: 'Загрузите фото или скан паспорта'
    },
    {
      key: 'ownership',
      label: 'Право собственности',
      ref: ownershipRef,
      description: 'Загрузите документ о праве собственности'
    },
    {
      key: 'noDebts',
      label: 'Справка об отсутствии обременений',
      ref: noDebtsRef,
      description: 'Загрузите справку об отсутствии задолженностей'
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
      alert('Пожалуйста, загрузите все необходимые документы')
      return
    }
    onComplete(documents)
  }

  if (!isOpen) return null

  return (
    <div className="documents-modal-overlay" onClick={onClose}>
      <div className="documents-modal" onClick={(e) => e.stopPropagation()}>
        <button className="documents-modal__close" onClick={onClose}>
          <FiX size={24} />
        </button>
        
        <div className="documents-modal__content">
          <h2 className="documents-modal__title">Загрузка документов</h2>
          <p className="documents-modal__description">
            Пожалуйста, загрузите все необходимые документы для публикации объявления
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
                      <span>Выбрать файл</span>
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
                        {(documents[doc.key]?.size / 1024 / 1024).toFixed(2)} МБ
                      </p>
                    </div>
                    <button
                      className="documents-modal__remove-btn"
                      onClick={() => handleRemove(doc.key)}
                    >
                      Удалить
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
                  width: `${(Object.values(uploaded).filter(v => v).length / 3) * 100}%`
                }}
              />
            </div>
            <p className="documents-modal__progress-text">
              Загружено {Object.values(uploaded).filter(v => v).length} из 3 документов
            </p>
          </div>
          
          <div className="documents-modal__actions">
            <button
              className="documents-modal__btn documents-modal__btn--cancel"
              onClick={onClose}
            >
              Отмена
            </button>
            <button
              className="documents-modal__btn documents-modal__btn--complete"
              onClick={handleComplete}
            >
              Завершить публикацию
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DocumentsUploadModal

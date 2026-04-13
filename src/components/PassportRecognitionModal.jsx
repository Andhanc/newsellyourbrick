import { useState } from 'react'
import { FiX, FiCheckCircle, FiAlertCircle } from 'react-icons/fi'
import './PassportRecognitionModal.css'

const PassportRecognitionModal = ({ isOpen, onClose, onConfirm, extractedData }) => {
  if (!isOpen) return null

  const handleConfirm = () => {
    onConfirm(extractedData)
    onClose()
  }

  const handleCancel = () => {
    onClose()
  }

  return (
    <div className="passport-recognition-modal-overlay" onClick={onClose}>
      <div className="passport-recognition-modal" onClick={(e) => e.stopPropagation()}>
        <button 
          className="passport-recognition-modal__close" 
          onClick={onClose}
          aria-label="Закрыть"
        >
          <FiX size={24} />
        </button>

        <div className="passport-recognition-modal__content">
          <div className="passport-recognition-modal__icon">
            <FiCheckCircle size={64} color="#0ABAB5" />
          </div>
          
          <h2 className="passport-recognition-modal__title">
            Распознавание завершено
          </h2>
          
          <p className="passport-recognition-modal__text">
            Мы попробовали автоматически распознать ваши данные с фото паспорта.
            Проверьте поля в форме ниже и при необходимости исправьте их — изменения сохраняются автоматически.
          </p>

          <div className="passport-recognition-modal__data-preview">
            {extractedData?.firstName && (
              <div className="data-preview-item">
                <span className="data-label">Имя:</span>
                <span className="data-value">{extractedData.firstName}</span>
              </div>
            )}
            {extractedData?.lastName && (
              <div className="data-preview-item">
                <span className="data-label">Фамилия:</span>
                <span className="data-value">{extractedData.lastName}</span>
              </div>
            )}
            {extractedData?.passportSeries && (
              <div className="data-preview-item">
                <span className="data-label">Серия паспорта:</span>
                <span className="data-value">{extractedData.passportSeries}</span>
              </div>
            )}
            {extractedData?.passportNumber && (
              <div className="data-preview-item">
                <span className="data-label">Номер паспорта:</span>
                <span className="data-value">{extractedData.passportNumber}</span>
              </div>
            )}
            {extractedData?.identificationNumber && (
              <div className="data-preview-item">
                <span className="data-label">Идентификационный номер:</span>
                <span className="data-value">{extractedData.identificationNumber}</span>
              </div>
            )}
          </div>

          <div className="passport-recognition-modal__buttons">
            <button 
              className="passport-recognition-modal__button passport-recognition-modal__button--primary"
              onClick={handleConfirm}
            >
              Понятно
            </button>
            <button 
              className="passport-recognition-modal__button passport-recognition-modal__button--secondary"
              onClick={handleCancel}
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PassportRecognitionModal


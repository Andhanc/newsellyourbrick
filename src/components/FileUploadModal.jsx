import { useState, useRef } from 'react'
import { FiX, FiUpload, FiFile, FiDownload, FiCheckCircle, FiAlertCircle } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import Confetti from './Confetti'
import './FileUploadModal.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const FileUploadModal = ({ isOpen, onClose, onSuccess, userId: propsUserId }) => {
  const { t } = useTranslation()
  const [file, setFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [result, setResult] = useState(null) // { found, loaded, failed, errors }
  const [uploadError, setUploadError] = useState(null)
  const fileInputRef = useRef(null)

  const userId = propsUserId || (typeof localStorage !== 'undefined' ? localStorage.getItem('userId') : null)

  if (!isOpen) return null

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      const validTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ]
      const validExtensions = ['.csv', '.xls', '.xlsx']
      const fileExtension = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase()

      if (validTypes.includes(selectedFile.type) || validExtensions.includes(fileExtension)) {
        setFile(selectedFile)
        setUploadError(null)
      } else {
        setUploadError('Выберите файл CSV или Excel (.csv, .xls, .xlsx)')
      }
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setUploadError('Выберите файл для загрузки')
      return
    }
    const effectiveUserId = propsUserId ?? (typeof localStorage !== 'undefined' ? localStorage.getItem('userId') : null)
    if (!effectiveUserId || !/^\d+$/.test(String(effectiveUserId))) {
      setUploadError('Не удалось определить пользователя. Войдите снова.')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    setShowSuccess(false)
    setShowConfetti(false)
    setResult(null)
    setUploadError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('user_id', String(effectiveUserId))

      const response = await fetch(`${API_BASE_URL}/properties/bulk-import`, {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        setUploadError(data.error || 'Ошибка при загрузке файла')
        setIsUploading(false)
        return
      }

      setResult({
        found: data.found ?? 0,
        loaded: data.loaded ?? 0,
        failed: data.failed ?? 0,
        errors: data.errors || []
      })
      setUploadProgress(100)
      setShowSuccess(true)
      if ((data.loaded ?? 0) > 0) {
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 5000)
      }
      if (onSuccess && (data.loaded ?? 0) > 0) {
        onSuccess()
      }
    } catch (err) {
      setUploadError(err.message || 'Ошибка сети при загрузке файла')
    } finally {
      setIsUploading(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setIsUploading(false)
    setUploadProgress(0)
    setShowSuccess(false)
    setShowConfetti(false)
    setResult(null)
    setUploadError(null)
    onClose()
  }

  const handleExampleDownload = () => {
    const csvContent = `тип_объекта,название,описание,цена,валюта,страна,город,адрес,площадь,жилая_площадь,комнаты,ванные,этаж,всего_этажей,год_постройки,тип_здания,квартира,спален,этажей_здания,участок_м2,бассейн,сад,гараж,балкон,парковка,лифт
apartment,Квартира в центре,Уютная квартира с видом на парк,150000,USD,Испания,Тенерифе,ул. Примерная 1,85,70,3,2,5,10,2015,многоквартирный,42,,,,,0,0,1,1,1
house,Дом с садом,Частный дом с участком,320000,EUR,Испания,Коста-дель-Соль,Шоссе 12 км,180,150,5,3,,2,2010,частный дом,,4,2,500,0,1,1,0,0,0
villa,Вилла у моря,Вилла с бассейном,850000,USD,Испания,Марбелья,Пляжная аллея,250,200,6,4,,2,2018,вилла,,6,2,800,1,1,1,0,1,0`

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'шаблон_объекты_недвижимости.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const percentLoaded = result && result.found > 0
    ? Math.round((result.loaded / result.found) * 100)
    : 0

  return (
    <>
      {showConfetti && <Confetti />}
      <div className="file-upload-modal-overlay" onClick={!isUploading ? handleClose : undefined}>
        <div className="file-upload-modal" onClick={(e) => e.stopPropagation()}>
          <button
            className="file-upload-modal__close"
            onClick={handleClose}
            disabled={isUploading}
            aria-label="Закрыть"
          >
            <FiX size={24} />
          </button>

          {!showSuccess ? (
            <div className="file-upload-modal__content">
              <div className="file-upload-modal__header">
                <div className="file-upload-modal__icon">
                  <FiUpload size={48} />
                </div>
                <h2 className="file-upload-modal__title">{t('fileUploadTitle')}</h2>
                <p className="file-upload-modal__subtitle">
                  {t('fileUploadSubtitle')}
                </p>
              </div>

              {uploadError && (
                <div className="file-upload-modal__error">
                  <FiAlertCircle size={20} />
                  <span>{uploadError}</span>
                </div>
              )}

              <div className="file-upload-area" onClick={() => fileInputRef.current?.click()}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xls,.xlsx"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                  disabled={isUploading}
                />
                {file ? (
                  <div className="file-upload-area__file">
                    <FiFile size={32} />
                    <div className="file-upload-area__file-info">
                      <p className="file-upload-area__file-name">{file.name}</p>
                      <p className="file-upload-area__file-size">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                    <button
                      className="file-upload-area__remove"
                      onClick={(e) => {
                        e.stopPropagation()
                        setFile(null)
                      }}
                      disabled={isUploading}
                    >
                      <FiX size={20} />
                    </button>
                  </div>
                ) : (
                  <div className="file-upload-area__empty">
                    <FiUpload size={48} />
                    <p className="file-upload-area__text">
                      {t('fileUploadDropText')}
                    </p>
                    <p className="file-upload-area__hint">
                      {t('fileUploadDropHint')}
                    </p>
                  </div>
                )}
              </div>

              <button
                className="file-upload-modal__example-btn"
                onClick={handleExampleDownload}
                disabled={isUploading}
              >
                <FiDownload size={18} />
                <span>{t('fileUploadDownloadTemplate')}</span>
              </button>

              <details className="file-upload-modal__format-hint">
                <summary>{t('fileUploadFormatSummary')}</summary>
                <p>{t('fileUploadFormatDetails')}</p>
              </details>

              {isUploading && (
                <div className="file-upload-modal__progress">
                  <p className="progress-text">{t('fileUploadProcessing')}</p>
                  <div className="progress-bar">
                    <div
                      className="progress-bar__fill progress-bar__fill--indeterminate"
                      style={{ width: '60%' }}
                    />
                  </div>
                </div>
              )}

              <div className="file-upload-modal__actions">
                <button
                  className="file-upload-modal__cancel-btn"
                  onClick={handleClose}
                  disabled={isUploading}
                >
                  {t('fileUploadCancel')}
                </button>
                <button
                  className="file-upload-modal__upload-btn"
                  onClick={handleUpload}
                  disabled={!file || isUploading}
                >
                  {isUploading ? t('fileUploadUploading') : t('fileUploadUpload')}
                </button>
              </div>
            </div>
          ) : (
            <div className="file-upload-modal__success">
              <div className="success-icon">
                <FiCheckCircle size={64} />
              </div>
              <h2 className="success-title">
                {result?.loaded > 0 ? t('fileUploadSuccessTitle') : t('fileUploadProcessingTitle')}
              </h2>
              <p className="success-text success-text--stats">
                {t('fileUploadFound')} <strong>{result?.found ?? 0}</strong>
              </p>
              <p className="success-text success-text--stats">
                {t('fileUploadLoaded')} <strong>{percentLoaded}%</strong> ({result?.loaded ?? 0} {t('fileUploadOf')} {result?.found ?? 0})
              </p>
              <div className="file-upload-modal__progress file-upload-modal__progress--result">
                <div className="progress-bar">
                  <div
                    className="progress-bar__fill"
                    style={{ width: `${percentLoaded}%` }}
                  />
                </div>
              </div>
              {result?.failed > 0 && (
                <p className="success-text success-text--warn">
                  {t('fileUploadWithErrors')} {result.failed} {result.errors?.length ? `(первые сообщения: ${result.errors.slice(0, 3).map(e => `стр. ${e.row}: ${e.message}`).join('; ')})` : ''}
                </p>
              )}
              <button
                className="file-upload-modal__upload-btn"
                onClick={handleClose}
                style={{ marginTop: 16 }}
              >
                {t('fileUploadClose')}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default FileUploadModal

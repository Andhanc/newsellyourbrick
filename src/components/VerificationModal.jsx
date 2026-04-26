import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import * as faceapi from 'face-api.js'
import { showNotification } from '../utils/toastHelper'
import { saveVerificationPhoto, loadVerificationPhotos, clearVerificationPhotos } from '../utils/verificationStorage'
import { getApiBaseUrl } from '../utils/apiConfig'
import './VerificationModal.css'

let API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

/** Область рамки (овала/прямоугольника) в координатах превью камеры — для clip-path и сохранения снимка */
function buildClipPathFromRegion(region) {
  if (!region) return undefined
  if (region.kind === 'ellipse') {
    return `ellipse(${region.rx}px ${region.ry}px at ${region.cx}px ${region.cy}px)`
  }
  const { x, y, w, h, previewWidth, previewHeight } = region
  const top = y
  const right = previewWidth - x - w
  const bottom = previewHeight - y - h
  const left = x
  return `inset(${top}px ${right}px ${bottom}px ${left}px round 12px)`
}

/** Овал в координатах кадра видео (для face-api и проверки попадания в рамку на экране) */
function previewEllipseToVideo(clipRegion, videoW, videoH, previewW, previewH) {
  if (!clipRegion || clipRegion.kind !== 'ellipse' || !videoW || !previewW) return null
  const sx = videoW / previewW
  const sy = videoH / previewH
  return {
    cx: clipRegion.cx * sx,
    cy: clipRegion.cy * sy,
    rx: clipRegion.rx * sx,
    ry: clipRegion.ry * sy,
  }
}

function pointInEllipse(px, py, cx, cy, rx, ry) {
  if (rx <= 0 || ry <= 0) return false
  const dx = (px - cx) / rx
  const dy = (py - cy) / ry
  return dx * dx + dy * dy <= 1
}

const SELFIE_DETECT_INTERVAL_MS = 220
const SELFIE_STABLE_OK_FRAMES = 6
const SELFIE_MIN_DETECTION_SCORE = 0.52
const SELFIE_MIN_FACE_HEIGHT_IN_OVAL = 0.34
const SELFIE_MAX_FACE_HEIGHT_IN_OVAL = 0.92
const SELFIE_VIDEO_EDGE_MARGIN = 0.03
const PASSPORT_DETECT_INTERVAL_MS = 280
const PASSPORT_STABLE_OK_FRAMES = 3

const VerificationModal = ({ isOpen, onClose, userId, onComplete, required }) => {
  const [currentStep, setCurrentStep] = useState(1)
  const [photos, setPhotos] = useState({
    passport: null,
    selfie: null,
    selfieWithPassport: null
  })
  const [previews, setPreviews] = useState({
    passport: null,
    selfie: null,
    selfieWithPassport: null
  })
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [cameraType, setCameraType] = useState(null) // 'passport', 'selfie', 'selfieWithPassport'
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [animationClass, setAnimationClass] = useState('')
  const [hintModalOpen, setHintModalOpen] = useState(false)
  const [hintStep, setHintStep] = useState(1)

  const cameraRef = useRef(null)
  const passportFileInputRef = useRef(null)
  const selfieFileInputRef = useRef(null)
  const selfieWithPassportFileInputRef = useRef(null)

  // Анимация открытия модалки
  useEffect(() => {
    if (isOpen) {
      setAnimationClass('slide-in')
    }
  }, [isOpen])

  useEffect(() => {
    let cancelled = false
    const sync = async () => {
      try {
        const url = await getApiBaseUrl()
        if (!cancelled && url) API_BASE_URL = url
      } catch {
        /* оставляем env */
      }
    }
    sync()
    return () => {
      cancelled = true
    }
  }, [])

  // Подгружаем сохранённые локально фотографии из IndexedDB
  useEffect(() => {
    if (!isOpen || !userId) return

    let cancelled = false

    const load = async () => {
      const saved = await loadVerificationPhotos(userId)
      if (cancelled) return

      const hasAny =
        saved.passport !== null || saved.selfie !== null || saved.selfieWithPassport !== null

      if (hasAny) {
        // Восстанавливаем превью
        setPreviews({
          passport: saved.passport,
          selfie: saved.selfie,
          selfieWithPassport: saved.selfieWithPassport
        })

        // Восстанавливаем File-объекты из dataURL для корректной отправки на сервер
        const dataUrlToFile = (dataUrl, name) => {
          if (!dataUrl) return null
          const arr = dataUrl.split(',')
          const mimeMatch = arr[0].match(/:(.*?);/)
          const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg'
          const bstr = atob(arr[1])
          const n = bstr.length
          const u8arr = new Uint8Array(n)
          for (let i = 0; i < n; i += 1) {
            u8arr[i] = bstr.charCodeAt(i)
          }
          return new File([u8arr], name, { type: mime })
        }

        setPhotos({
          passport: dataUrlToFile(saved.passport, `photo_passport_restored.jpg`),
          selfie: dataUrlToFile(saved.selfie, `photo_selfie_restored.jpg`),
          selfieWithPassport: dataUrlToFile(
            saved.selfieWithPassport,
            `photo_selfieWithPassport_restored.jpg`
          )
        })

        // Переходим на следующий незаполненный шаг
        if (!saved.passport) {
          setCurrentStep(1)
        } else if (!saved.selfie) {
          setCurrentStep(2)
        } else {
          setCurrentStep(3)
        }
      } else {
        // Если сохранённых данных нет, начинаем "с чистого листа"
        setPhotos({ passport: null, selfie: null, selfieWithPassport: null })
        setPreviews({ passport: null, selfie: null, selfieWithPassport: null })
        setCurrentStep(1)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [isOpen, userId])

  const handleStepChange = (newStep) => {
    setAnimationClass('slide-out')
    setTimeout(() => {
      setCurrentStep(newStep)
      setAnimationClass('slide-in')
    }, 300)
  }

  const handleCameraCapture = (imageBlob, type) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const file = new File([imageBlob], `photo_${type}_${Date.now()}.jpg`, { type: 'image/jpeg' })
      setPhotos(prev => ({ ...prev, [type]: file }))
      setPreviews(prev => ({ ...prev, [type]: reader.result }))
      // Сохраняем превью (dataURL) локально, чтобы пережить перезагрузку
      if (userId) {
        saveVerificationPhoto(userId, type, reader.result)
      }
      setIsCameraOpen(false)
      setCameraType(null)
    }
    reader.readAsDataURL(imageBlob)
  }

  const handleFileUpload = (type, event) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Проверяем, что это изображение
    if (!file.type.startsWith('image/')) {
      showNotification('Пожалуйста, выберите изображение')
      return
    }

    // Проверяем размер файла (максимум 10MB)
    if (file.size > 10 * 1024 * 1024) {
      showNotification('Размер файла не должен превышать 10MB')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setPhotos(prev => ({ ...prev, [type]: file }))
      setPreviews(prev => ({ ...prev, [type]: reader.result }))
    }
    reader.readAsDataURL(file)
    
    // Сбрасываем значение input, чтобы можно было загрузить тот же файл снова
    event.target.value = ''
  }

  const handleNext = () => {
    if (currentStep === 1 && !photos.passport) {
      showNotification('Пожалуйста, загрузите или сфотографируйте паспорт')
      return
    }
    if (currentStep === 2 && !photos.selfie) {
      showNotification('Пожалуйста, сделайте селфи')
      return
    }
    if (currentStep === 3 && !photos.selfieWithPassport) {
      showNotification('Пожалуйста, сделайте селфи с паспортом')
      return
    }
    if (currentStep < 3) {
      handleStepChange(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      handleStepChange(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    if (!photos.passport || !photos.selfie || !photos.selfieWithPassport) {
      showNotification('Пожалуйста, загрузите все три фотографии')
      return
    }

    setIsSubmitting(true)

    try {
      // Загружаем все три фото
      const uploadPromises = [
        uploadPhoto(photos.passport, 'passport'),
        uploadPhoto(photos.selfie, 'selfie'), // Новый тип для селфи
        uploadPhoto(photos.selfieWithPassport, 'passport_with_face') // Используем существующий тип
      ]

      const results = await Promise.all(uploadPromises)

      if (results.every(r => r.success)) {
        const numericUserId = typeof userId === 'string' ? parseInt(userId, 10) : Number(userId)
        if (!Number.isNaN(numericUserId) && numericUserId > 0) {
          try {
            let base = API_BASE_URL
            if (!base || base.includes('localhost')) {
              base = await getApiBaseUrl()
              API_BASE_URL = base
            }
            const normalized = String(base).replace(/\/$/, '')
            const clearRes = await fetch(
              `${normalized}/users/${numericUserId}/clear-rejected-documents`,
              { method: 'POST', headers: { 'Content-Type': 'application/json' } }
            )
            if (!clearRes.ok) {
              console.warn('⚠️ clear-rejected-documents:', clearRes.status)
            } else {
              window.dispatchEvent(new Event('verification-status-update'))
            }
          } catch (clearErr) {
            console.warn('⚠️ clear-rejected-documents:', clearErr)
          }
        }

        // Получаем информацию о привязанной карте, если она есть
        let cardInfo = null
        const cardBound = localStorage.getItem('cardBound')
        if (cardBound === 'true') {
          const savedCardInfo = localStorage.getItem('cardInfo')
          if (savedCardInfo) {
            try {
              cardInfo = JSON.parse(savedCardInfo)
              // Проверяем, что карта привязана для этого пользователя
              if (cardInfo.userId && String(cardInfo.userId) !== String(userId)) {
                console.warn('⚠️ Данные карты принадлежат другому пользователю')
                cardInfo = null
              } else {
                console.log('💳 Найдены данные карты для пользователя:', cardInfo)
              }
            } catch (e) {
              console.warn('Не удалось распарсить данные карты:', e)
            }
          }
        } else {
          console.log('ℹ️ Карта не привязана (cardBound !== true)')
        }
        
        // Сохраняем данные верификации в localStorage для отправки в админку
        const verificationData = {
          userId: userId,
          passportPhoto: results[0].data?.document_photo || previews.passport,
          selfiePhoto: results[1].data?.document_photo || previews.selfie,
          selfieWithPassportPhoto: results[2].data?.document_photo || previews.selfieWithPassport,
          submittedAt: new Date().toISOString(),
          status: 'pending',
          cardInfo: cardInfo // Добавляем информацию о привязанной карте
        }
        
        console.log('📋 Сохранение данных верификации с картой:', verificationData)
        
        // Получаем существующие данные верификации из localStorage
        const existingVerifications = JSON.parse(localStorage.getItem('pendingVerifications') || '[]')
        existingVerifications.push(verificationData)
        localStorage.setItem('pendingVerifications', JSON.stringify(existingVerifications))
        
        // Отправляем событие для обновления уведомления о верификации
        window.dispatchEvent(new Event('verification-status-update'))
        
        // Вызываем callback для обновления данных в родительском компоненте
        // Для продавцов onComplete сохранит флаг и закроет модальное окно
        // Для покупателей показываем alert и закрываем модальное окно
        if (onComplete) {
          await onComplete()
          // Если onComplete не закрыл модальное окно (для покупателей), закрываем здесь
          // Для продавцов модальное окно закроется в SellerVerificationModal
        } else {
          // Если нет onComplete (старый код), показываем alert и закрываем
          showNotification('Все фотографии успешно отправлены на модерацию!')
          onClose()
        }

        // После успешной отправки очищаем локальное хранилище фотографий
        clearVerificationPhotos(userId)
      } else {
        const errors = results.filter(r => !r.success).map(r => r.error).join(', ')
        showNotification(`Ошибка при загрузке: ${errors}`)
      }
    } catch (error) {
      console.error('Ошибка отправки:', error)
      showNotification('Произошла ошибка при отправке фотографий. Попробуйте еще раз.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const uploadPhoto = async (file, documentType) => {
    // Проверяем, что userId существует и является валидным числом
    if (!userId) {
      return { success: false, error: 'ID пользователя не найден' }
    }

    // Преобразуем userId в число и проверяем валидность
    const numericUserId = typeof userId === 'string' ? parseInt(userId, 10) : Number(userId)
    if (isNaN(numericUserId) || numericUserId <= 0) {
      console.error('❌ Неверный формат userId:', userId)
      return { success: false, error: 'Неверный формат ID пользователя. Ожидается положительное число' }
    }

    const formData = new FormData()
    formData.append('document_photo', file)
    formData.append('user_id', String(numericUserId))
    formData.append('document_type', documentType)

    try {
      const response = await fetch(`${API_BASE_URL}/documents`, {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        return { success: true, data: data.data }
      } else {
        const errorData = await response.json().catch(() => ({}))
        return { success: false, error: errorData.error || 'Ошибка загрузки' }
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const openCamera = (type) => {
    setCameraType(type)
    setIsCameraOpen(true)
  }

  const openHintModal = (step) => {
    setHintStep(step)
    setHintModalOpen(true)
  }

  const closeHintModal = () => {
    setHintModalOpen(false)
  }

  // Данные для подсказок по шагам
  const hintData = {
    1: {
      title: 'Шаг 1: Паспорт',
      description: 'Для верификации необходимо загрузить фотографию паспорта. Убедитесь, что:',
      requirements: [
        'Паспорт полностью виден в кадре',
        'Все данные четко читаемы (серия, номер, ФИО, дата рождения)',
        'Фото сделано при хорошем освещении',
        'Паспорт открыт на странице с фотографией и основными данными',
        'Нет бликов и теней, которые закрывают информацию'
      ],
      exampleText: 'Пример правильного фото паспорта:'
    },
    2: {
      title: 'Шаг 2: Селфи',
      description: 'Сделайте селфи для подтверждения вашей личности. Важно:',
      requirements: [
        'Ваше лицо полностью видно и занимает большую часть кадра',
        'Хорошее освещение лица (без теней)',
        'Вы смотрите прямо в камеру',
        'Нет солнцезащитных очков, масок или других предметов, закрывающих лицо',
        'Фон нейтральный, не отвлекает внимание'
      ],
      exampleText: 'Пример правильного селфи:'
    },
    3: {
      title: 'Шаг 3: Селфи с паспортом',
      description: 'Сделайте селфи, держа паспорт рядом с лицом. Это необходимо для подтверждения, что паспорт принадлежит вам. Убедитесь, что:',
      requirements: [
        'И ваше лицо, и паспорт четко видны в одном кадре',
        'Паспорт открыт на странице с фотографией',
        'Вы держите паспорт рядом с лицом (не закрывая его)',
        'Данные в паспорте читаемы',
        'Хорошее освещение для лица и паспорта',
        'Вы смотрите прямо в камеру'
      ],
      exampleText: 'Пример правильного селфи с паспортом:'
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="verification-modal-overlay" onClick={required ? undefined : onClose}>
        <div 
          className={`verification-modal ${animationClass}`}
          onClick={(e) => e.stopPropagation()}
        >
          {!required && (
            <button className="verification-modal__close" onClick={onClose}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          )}

          <div className="verification-modal__header">
            <div className="verification-progress">
              {[1, 2, 3].map((step) => (
                <div key={step} className="verification-progress__item">
                  <div 
                    className={`verification-progress__circle ${
                      currentStep >= step ? 'active' : ''
                    } ${currentStep === step ? 'current' : ''}`}
                  >
                    {currentStep > step ? '✓' : step}
                  </div>
                  <div className="verification-progress__label">
                    {step === 1 ? 'Паспорт' : step === 2 ? 'Селфи' : 'Паспорт + селфи'}
                  </div>
                  {step < 3 && (
                    <div 
                      className={`verification-progress__line ${
                        currentStep > step ? 'active' : ''
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="verification-modal__content">
            {currentStep === 1 && (
              <div className="verification-step">
                {previews.passport ? (
                  <div className="verification-step__preview verification-step__preview--image-only">
                    <img src={previews.passport} alt="Паспорт" />
                    <button 
                      className="verification-step__change"
                      onClick={() => {
                        setPhotos(prev => ({ ...prev, passport: null }))
                        setPreviews(prev => ({ ...prev, passport: null }))
                      }}
                    >
                      Изменить фото
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="verification-step__icon">📄</div>
                    <div className="verification-step__title-wrapper">
                      <h2 className="verification-step__title">Шаг 1: Паспорт</h2>
                      <button 
                        className="verification-step__hint-btn"
                        onClick={() => openHintModal(1)}
                        aria-label="Подсказка"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                          <path d="M9.09 9C9.3251 8.33167 9.78915 7.76811 10.4 7.40913C11.0108 7.05016 11.7289 6.91894 12.4272 7.03871C13.1255 7.15849 13.7588 7.52152 14.2151 8.06353C14.6713 8.60553 14.9211 9.29152 14.92 10C14.92 12 11.92 13 11.92 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          <line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </button>
                    </div>
                    <p className="verification-step__description">
                      Сфотографируйте ваш паспорт. Убедитесь, что все данные четко видны.
                    </p>
                    <div className="verification-step__actions">
                      <button 
                        className="verification-step__btn verification-step__btn--primary"
                        onClick={() => openCamera('passport')}
                      >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <path d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 4H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                        Сфотографировать
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {currentStep === 2 && (
              <div className="verification-step">
                {previews.selfie ? (
                  <div className="verification-step__preview verification-step__preview--image-only">
                    <img src={previews.selfie} alt="Селфи" />
                    <button 
                      className="verification-step__change"
                      onClick={() => {
                        setPhotos(prev => ({ ...prev, selfie: null }))
                        setPreviews(prev => ({ ...prev, selfie: null }))
                      }}
                    >
                      Изменить фото
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="verification-step__icon">📷</div>
                    <div className="verification-step__title-wrapper">
                      <h2 className="verification-step__title">Шаг 2: Селфи</h2>
                      <button 
                        className="verification-step__hint-btn"
                        onClick={() => openHintModal(2)}
                        aria-label="Подсказка"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                          <path d="M9.09 9C9.3251 8.33167 9.78915 7.76811 10.4 7.40913C11.0108 7.05016 11.7289 6.91894 12.4272 7.03871C13.1255 7.15849 13.7588 7.52152 14.2151 8.06353C14.6713 8.60553 14.9211 9.29152 14.92 10C14.92 12 11.92 13 11.92 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          <line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </button>
                    </div>
                    <p className="verification-step__description">
                      Сделайте селфи. Убедитесь, что ваше лицо четко видно и хорошо освещено.
                    </p>
                    <div className="verification-step__actions">
                      <button 
                        className="verification-step__btn verification-step__btn--primary"
                        onClick={() => openCamera('selfie')}
                      >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <path d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 4H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                        Сделать селфи
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {currentStep === 3 && (
              <div className="verification-step">
                {previews.selfieWithPassport ? (
                  <div className="verification-step__preview verification-step__preview--image-only">
                    <img src={previews.selfieWithPassport} alt="Селфи с паспортом" />
                    <button 
                      className="verification-step__change"
                      onClick={() => {
                        setPhotos(prev => ({ ...prev, selfieWithPassport: null }))
                        setPreviews(prev => ({ ...prev, selfieWithPassport: null }))
                      }}
                    >
                      Изменить фото
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="verification-step__icon">📸</div>
                    <div className="verification-step__title-wrapper">
                      <h2 className="verification-step__title">Шаг 3: Селфи с паспортом</h2>
                      <button 
                        className="verification-step__hint-btn"
                        onClick={() => openHintModal(3)}
                        aria-label="Подсказка"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                          <path d="M9.09 9C9.3251 8.33167 9.78915 7.76811 10.4 7.40913C11.0108 7.05016 11.7289 6.91894 12.4272 7.03871C13.1255 7.15849 13.7588 7.52152 14.2151 8.06353C14.6713 8.60553 14.9211 9.29152 14.92 10C14.92 12 11.92 13 11.92 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          <line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </button>
                    </div>
                    <p className="verification-step__description">
                      Сделайте селфи с паспортом рядом с лицом. Убедитесь, что и ваше лицо, и паспорт четко видны.
                    </p>
                    <div className="verification-step__actions">
                      <button 
                        className="verification-step__btn verification-step__btn--primary"
                        onClick={() => openCamera('selfieWithPassport')}
                      >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <path d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 4H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                        Сделать селфи с паспортом
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

          </div>

          <div className="verification-modal__footer">
            {currentStep > 1 && (
              <button 
                className="verification-modal__btn verification-modal__btn--secondary"
                onClick={handleBack}
              >
                Назад
              </button>
            )}
            {currentStep < 3 ? (
              <button 
                className="verification-modal__btn verification-modal__btn--primary"
                onClick={handleNext}
                disabled={!photos[['passport', 'selfie', 'selfieWithPassport'][currentStep - 1]]}
              >
                Дальше
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            ) : (
              <button 
                className="verification-modal__btn verification-modal__btn--primary"
                onClick={handleSubmit}
                disabled={isSubmitting || !photos.passport || !photos.selfie || !photos.selfieWithPassport}
              >
                {isSubmitting ? (
                  <>
                    <svg className="spinner" width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" strokeDasharray="50.24" strokeDashoffset="25.12" strokeLinecap="round">
                        <animateTransform attributeName="transform" type="rotate" values="0 10 10;360 10 10" dur="1s" repeatCount="indefinite"/>
                      </circle>
                    </svg>
                    Отправка...
                  </>
                ) : (
                  <>
                    Отправить на модерацию
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M17.5 2.5L8.75 11.25M17.5 2.5L12.5 17.5L8.75 11.25M17.5 2.5L2.5 7.5L8.75 11.25" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {isCameraOpen && (
        <Camera 
          type={cameraType}
          onCapture={(blob) => {
            handleCameraCapture(blob, cameraType)
          }}
          onClose={() => {
            setIsCameraOpen(false)
            setCameraType(null)
          }}
        />
      )}

      {hintModalOpen && (
        <VerificationHintModal
          isOpen={hintModalOpen}
          onClose={closeHintModal}
          step={hintStep}
          data={hintData[hintStep]}
        />
      )}
    </>
  )
}

// Компонент модального окна с подсказкой
const VerificationHintModal = ({ isOpen, onClose, step, data }) => {
  if (!isOpen || !data) return null

  // Примеры фото
  const exampleImages = {
    1: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Pasport_RF.jpg/330px-Pasport_RF.jpg',
    2: 'https://pechater.ru/wp-content/uploads/2019/08/foto-ot-pechaterfoto-foto-s-retushyu.jpg',
    3: 'https://www.computerra.ru/wp-content/uploads/2015/06/1e7fcc548a024256a091661587173216.jpg'
  }

  return (
    <div className="verification-hint-modal-overlay" onClick={onClose}>
      <div 
        className="verification-hint-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="verification-hint-modal__close" onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>

        <div className="verification-hint-modal__content">
          <h2 className="verification-hint-modal__title">{data.title}</h2>
          
          <p className="verification-hint-modal__description">{data.description}</p>

          <div className="verification-hint-modal__requirements">
            <h3 className="verification-hint-modal__requirements-title">Требования:</h3>
            <ul className="verification-hint-modal__requirements-list">
              {data.requirements.map((req, index) => (
                <li key={index} className="verification-hint-modal__requirements-item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="verification-hint-modal__check-icon">
                    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {req}
                </li>
              ))}
            </ul>
          </div>

          <div className="verification-hint-modal__example">
            <p className="verification-hint-modal__example-text">{data.exampleText}</p>
            <div className="verification-hint-modal__example-image">
              <img 
                src={exampleImages[step]} 
                alt="Пример фото"
                onError={(e) => {
                  e.target.style.display = 'none'
                  e.target.nextSibling.style.display = 'block'
                }}
              />
              <div className="verification-hint-modal__placeholder" style={{ display: 'none' }}>
                <svg width="200" height="150" viewBox="0 0 200 150" fill="none">
                  <rect width="200" height="150" fill="#f5f5f5"/>
                  <path d="M80 60H120V90H80V60Z" fill="#ddd"/>
                  <path d="M70 100H130M70 110H130" stroke="#ddd" strokeWidth="2"/>
                  <text x="100" y="130" textAnchor="middle" fill="#999" fontSize="14">Пример фото</text>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Компонент камеры
const Camera = ({ type, onCapture, onClose }) => {
  const videoRef = useRef(null)
  const blurVideoRef = useRef(null)
  const previewRef = useRef(null)
  const shapeGuideRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const detectionCanvasRef = useRef(null)
  const clipRegionRef = useRef(null)
  const selfieStableOkRef = useRef(0)
  const passportStableOkRef = useRef(0)
  const passportScanBusyRef = useRef(false)
  const passportGateRef = useRef({ canShoot: false, hint: '', inFrame: false })
  const selfieGateRef = useRef({ canShoot: false, hint: '', inOval: false })
  const [clipRegion, setClipRegion] = useState(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [facingMode, setFacingMode] = useState('environment') // 'user' для фронтальной, 'environment' для задней
  /** Подсказка для шага селфи */
  const [selfieFaceHint, setSelfieFaceHint] = useState('')
  const [selfieFaceOk, setSelfieFaceOk] = useState(false)
  /** Подсказка для шага паспорта */
  const [passportHint, setPassportHint] = useState('')
  const [passportOk, setPassportOk] = useState(false)
  const [passportInFrame, setPassportInFrame] = useState(false)
  /** Лицо в овале по геометрии (ещё без стабильной серии кадров) — подсветка рамки */
  const [selfieInOvalFrame, setSelfieInOvalFrame] = useState(false)
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [modelsLoading, setModelsLoading] = useState(false)
  const detectionIntervalRef = useRef(null)
  const detectionBusyRef = useRef(false)

  const useFrameBlur = type === 'selfie' || type === 'passport'

  const updateClipRegion = useCallback(() => {
    if (!useFrameBlur) {
      setClipRegion(null)
      return
    }
    const preview = previewRef.current
    const guide = shapeGuideRef.current
    if (!preview || !guide) {
      setClipRegion(null)
      return
    }
    const pr = preview.getBoundingClientRect()
    const gr = guide.getBoundingClientRect()
    const previewWidth = pr.width
    const previewHeight = pr.height
    if (type === 'selfie') {
      setClipRegion({
        kind: 'ellipse',
        cx: gr.left - pr.left + gr.width / 2,
        cy: gr.top - pr.top + gr.height / 2,
        rx: gr.width / 2,
        ry: gr.height / 2,
        previewWidth,
        previewHeight,
      })
    } else {
      setClipRegion({
        kind: 'rect',
        x: gr.left - pr.left,
        y: gr.top - pr.top,
        w: gr.width,
        h: gr.height,
        previewWidth,
        previewHeight,
      })
    }
  }, [type, useFrameBlur])

  useLayoutEffect(() => {
    updateClipRegion()
    const preview = previewRef.current
    if (!preview || !useFrameBlur) return undefined

    const ro = new ResizeObserver(() => updateClipRegion())
    ro.observe(preview)
    const guide = shapeGuideRef.current
    if (guide) ro.observe(guide)

    window.addEventListener('orientationchange', updateClipRegion)
    return () => {
      ro.disconnect()
      window.removeEventListener('orientationchange', updateClipRegion)
    }
  }, [updateClipRegion, useFrameBlur])

  useEffect(() => {
    clipRegionRef.current = clipRegion
  }, [clipRegion])

  // Загрузка моделей face-api.js
  useEffect(() => {
    const loadModels = async () => {
      try {
        setModelsLoading(true)
        // Используем CDN для моделей face-api.js
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/'

        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL)

        setModelsLoaded(true)
        setSelfieFaceHint('')
        console.log('✅ Модели face-api.js загружены')
      } catch (error) {
        console.error('❌ Ошибка загрузки моделей face-api.js с CDN:', error)
        try {
          const ALT_MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/'
          await faceapi.nets.tinyFaceDetector.loadFromUri(ALT_MODEL_URL)
          setModelsLoaded(true)
          setSelfieFaceHint('')
          console.log('✅ Модели face-api.js загружены с альтернативного URL')
        } catch (altError) {
          console.error('❌ Ошибка загрузки моделей с альтернативного URL:', altError)
          if (faceapi.nets.tinyFaceDetector.isLoaded) {
            setModelsLoaded(true)
            setSelfieFaceHint('')
            console.log('✅ Модели face-api.js уже загружены')
          } else {
            setModelsLoaded(false)
            console.warn('⚠️ Модели face-api.js не загружены')
            setSelfieFaceHint(
              'Не удалось загрузить проверку лица. Проверьте интернет и обновите страницу.'
            )
            setSelfieFaceOk(false)
            setSelfieInOvalFrame(false)
          }
        }
      } finally {
        setModelsLoading(false)
      }
    }

    if (type === 'selfie') {
      loadModels()
    }
  }, [type])

  useEffect(() => {
    if (type !== 'selfie') return
    if (modelsLoading) {
      setSelfieFaceHint('Загрузка проверки лица…')
      setSelfieFaceOk(false)
      setSelfieInOvalFrame(false)
    }
  }, [type, modelsLoading])

  useEffect(() => {
    if (type !== 'passport') return
    setPassportHint('Наведите разворот паспорта в рамку')
    setPassportOk(false)
    setPassportInFrame(false)
  }, [type])

  useEffect(() => {
    startCamera()
    return () => {
      stopCamera()
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current)
        detectionIntervalRef.current = null
      }
    }
  }, [facingMode, type])

  // Запуск проверки лица в реальном времени после загрузки видео
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleVideoReady = () => {
      if (type === 'selfie' && modelsLoaded) {
        setTimeout(() => {
          startFaceDetection()
        }, 400)
      } else if (type === 'passport') {
        setTimeout(() => {
          startPassportDetection()
        }, 350)
      }
    }

    if (video.readyState >= 2) {
      handleVideoReady()
    } else {
      video.addEventListener('loadedmetadata', handleVideoReady)
    }

    return () => {
      video.removeEventListener('loadedmetadata', handleVideoReady)
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current)
        detectionIntervalRef.current = null
      }
    }
  }, [type, modelsLoaded])

  const startCamera = async () => {
    try {
      const constraints = {
        video: {
          facingMode: type === 'selfie' || type === 'selfieWithPassport' ? 'user' : 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      if (blurVideoRef.current) {
        blurVideoRef.current.srcObject = stream
      }
    } catch (error) {
      console.error('Ошибка доступа к камере:', error)
      showNotification('Не удалось получить доступ к камере. Проверьте разрешения.')
      onClose()
    }
  }

  const applySelfieGateUi = (next) => {
    const prev = selfieGateRef.current
    if (prev.canShoot !== next.canShoot || prev.hint !== next.hint || prev.inOval !== next.inOval) {
      selfieGateRef.current = next
      setSelfieFaceOk(next.canShoot)
      setSelfieFaceHint(next.hint)
      setSelfieInOvalFrame(next.inOval)
    }
  }

  const applyPassportGateUi = (next) => {
    const prev = passportGateRef.current
    if (prev.canShoot !== next.canShoot || prev.hint !== next.hint || prev.inFrame !== next.inFrame) {
      passportGateRef.current = next
      setPassportOk(next.canShoot)
      setPassportHint(next.hint)
      setPassportInFrame(next.inFrame)
    }
  }

  // Проверка лица для шага «селфи»: овал = clipRegion, координаты как при сохранении кадра; превью зеркальное
  const startFaceDetection = () => {
    if (!videoRef.current || !modelsLoaded || type !== 'selfie') {
      return
    }

    selfieStableOkRef.current = 0

    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current)
    }

    const detectorOpts = new faceapi.TinyFaceDetectorOptions({
      inputSize: 416,
      scoreThreshold: SELFIE_MIN_DETECTION_SCORE,
    })

    const tick = async () => {
      if (detectionBusyRef.current) return
      const video = videoRef.current
      if (!video || video.readyState !== 4 || type !== 'selfie') return

      const preview = previewRef.current
      const region = clipRegionRef.current
      if (!preview || !region || region.kind !== 'ellipse') {
        applySelfieGateUi({
          canShoot: false,
          hint: 'Подождите, готовим рамку…',
          inOval: false,
        })
        return
      }

      const pr = preview.getBoundingClientRect()
      const vw = video.videoWidth
      const vh = video.videoHeight
      if (!vw || !vh || !pr.width || !pr.height) return

      detectionBusyRef.current = true
      try {
        const ellipse = previewEllipseToVideo(region, vw, vh, pr.width, pr.height)
        if (!ellipse) {
          applySelfieGateUi({ canShoot: false, hint: 'Подождите, готовим рамку…', inOval: false })
          return
        }

        const detections = await faceapi.detectAllFaces(video, detectorOpts)
        const marginX = vw * SELFIE_VIDEO_EDGE_MARGIN
        const marginY = vh * SELFIE_VIDEO_EDGE_MARGIN

        const pickHint = () => {
          if (detections.length === 0) {
            return {
              canShoot: false,
              hint: 'Лицо не видно — встаньте перед камерой при хорошем освещении',
              inOval: false,
            }
          }
          const strong = detections.filter((x) => x.score >= SELFIE_MIN_DETECTION_SCORE)
          if (strong.length > 1) {
            return {
              canShoot: false,
              hint: 'В кадре должно быть только одно лицо',
              inOval: false,
            }
          }
          const det = strong[0] || detections[0]
          if (det.score < SELFIE_MIN_DETECTION_SCORE) {
            return {
              canShoot: false,
              hint: 'Не похоже на лицо — улучшите свет и уберите очки / капюшон',
              inOval: false,
            }
          }

          const box = det.box
          const clipped =
            box.x < marginX ||
            box.y < marginY ||
            box.x + box.width > vw - marginX ||
            box.y + box.height > vh - marginY
          if (clipped) {
            return {
              canShoot: false,
              hint: 'Лицо обрезано — отодвиньте камеру или наклоните телефон',
              inOval: false,
            }
          }

          const cxRaw = box.x + box.width / 2
          const cyRaw = box.y + box.height / 2
          const cx = vw - cxRaw
          const cy = cyRaw

          const inOval = pointInEllipse(cx, cy, ellipse.cx, ellipse.cy, ellipse.rx, ellipse.ry)
          const ovalH = ellipse.ry * 2
          const relH = ovalH > 0 ? box.height / ovalH : 0

          if (relH < SELFIE_MIN_FACE_HEIGHT_IN_OVAL) {
            return {
              canShoot: false,
              hint: inOval
                ? 'Подойдите ближе — лицо слишком мелкое в овале'
                : 'Расположите лицо в овале и подойдите ближе',
              inOval,
            }
          }
          if (relH > SELFIE_MAX_FACE_HEIGHT_IN_OVAL) {
            return {
              canShoot: false,
              hint: 'Отодвиньтесь — лицо не должно выходить за овал',
              inOval,
            }
          }

          if (!inOval) {
            const left = cx < ellipse.cx - ellipse.rx * 0.12
            const right = cx > ellipse.cx + ellipse.rx * 0.12
            const up = cy < ellipse.cy - ellipse.ry * 0.1
            const down = cy > ellipse.cy + ellipse.ry * 0.1
            let hint = 'Выровняйте лицо по овалу'
            if (left) hint = 'Сдвиньте лицо вправо'
            else if (right) hint = 'Сдвиньте лицо влево'
            else if (up) hint = 'Опустите лицо ниже'
            else if (down) hint = 'Поднимите лицо выше'
            return { canShoot: false, hint, inOval: false }
          }

          return { canShoot: true, hint: 'Отлично, можно снимать', inOval: true }
        }

        const instant = pickHint()
        let canShoot = instant.canShoot
        if (canShoot) {
          selfieStableOkRef.current += 1
          if (selfieStableOkRef.current < SELFIE_STABLE_OK_FRAMES) {
            canShoot = false
            applySelfieGateUi({
              canShoot: false,
              hint: `Удерживайте лицо в овале… (${selfieStableOkRef.current}/${SELFIE_STABLE_OK_FRAMES})`,
              inOval: true,
            })
            return
          }
        } else {
          selfieStableOkRef.current = 0
        }

        applySelfieGateUi({
          canShoot,
          hint: instant.hint,
          inOval: instant.inOval,
        })
      } catch (error) {
        console.error('Ошибка детекции лица:', error)
        selfieStableOkRef.current = 0
        applySelfieGateUi({
          canShoot: false,
          hint: 'Не удалось проверить кадр — попробуйте ещё раз',
          inOval: false,
        })
      } finally {
        detectionBusyRef.current = false
      }
    }

    detectionIntervalRef.current = window.setInterval(tick, SELFIE_DETECT_INTERVAL_MS)
    tick()
  }

  const startPassportDetection = () => {
    if (!videoRef.current || type !== 'passport') return
    passportStableOkRef.current = 0
    passportScanBusyRef.current = false

    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current)
    }

    const tick = async () => {
      if (passportScanBusyRef.current) return
      const video = videoRef.current
      const preview = previewRef.current
      const region = clipRegionRef.current
      if (!video || video.readyState !== 4 || !preview || !region || region.kind !== 'rect') {
        applyPassportGateUi({ canShoot: false, hint: 'Подождите, готовим рамку…', inFrame: false })
        return
      }

      const vw = video.videoWidth
      const vh = video.videoHeight
      const pr = preview.getBoundingClientRect()
      if (!vw || !vh || !pr.width || !pr.height) return

      const scaleX = vw / pr.width
      const scaleY = vh / pr.height
      const sx = Math.max(0, Math.floor(region.x * scaleX))
      const sy = Math.max(0, Math.floor(region.y * scaleY))
      const sw = Math.min(vw - sx, Math.floor(region.w * scaleX))
      const sh = Math.min(vh - sy, Math.floor(region.h * scaleY))
      if (sw < 80 || sh < 80) {
        passportStableOkRef.current = 0
        applyPassportGateUi({ canShoot: false, hint: 'Подведите паспорт к рамке', inFrame: false })
        return
      }

      passportScanBusyRef.current = true
      try {
        const canvas = detectionCanvasRef.current || document.createElement('canvas')
        detectionCanvasRef.current = canvas
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) {
          applyPassportGateUi({
            canShoot: false,
            hint: 'Не удалось проверить кадр — попробуйте ещё раз',
            inFrame: false,
          })
          return
        }

        const targetW = 640
        const targetH = Math.max(1, Math.round((sh / sw) * targetW))
        canvas.width = targetW
        canvas.height = targetH
        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, targetW, targetH)

        const image = ctx.getImageData(0, 0, targetW, targetH).data
        let brightnessSum = 0
        let edgeEnergy = 0
        let darkPixels = 0
        let brightPixels = 0
        let sqSum = 0
        const step = 4
        const rowStride = targetW * 4
        for (let y = 1; y < targetH - 1; y += step) {
          for (let x = 1; x < targetW - 1; x += step) {
            const idx = y * rowStride + x * 4
            const r = image[idx]
            const g = image[idx + 1]
            const b = image[idx + 2]
            const gray = 0.299 * r + 0.587 * g + 0.114 * b
            brightnessSum += gray
            sqSum += gray * gray
            if (gray < 70) darkPixels += 1
            if (gray > 200) brightPixels += 1

            const left = image[idx - 4]
            const right = image[idx + 4]
            const up = image[idx - rowStride]
            const down = image[idx + rowStride]
            edgeEnergy += Math.abs(right - left) + Math.abs(down - up)
          }
        }

        const sampleCount = Math.max(1, Math.floor((targetH / step) * (targetW / step)))
        const brightness = brightnessSum / sampleCount
        const edgeScore = edgeEnergy / sampleCount
        const darkRatio = darkPixels / sampleCount
        const brightRatio = brightPixels / sampleCount
        const variance = Math.max(0, sqSum / sampleCount - brightness * brightness)
        const contrast = Math.sqrt(variance)

        const severeIssues = []
        const softIssues = []

        if (brightness < 24) severeIssues.push('Слишком темно — добавьте свет и уберите тени')
        else if (brightness < 40) softIssues.push('Немного темно, добавьте света для лучшего распознавания')

        if (brightness > 245) severeIssues.push('Сильная пересветка — уберите блики и вспышку')
        else if (brightness > 230) softIssues.push('Есть пересвет, слегка наклоните паспорт от источника света')

        if (edgeScore < 3) severeIssues.push('Фото размыто — удерживайте телефон ровно')
        else if (edgeScore < 8) softIssues.push('Почти хорошо: наведите фокус и держите телефон неподвижно')

        if (contrast < 10) severeIssues.push('Подведите паспорт ближе — текст должен быть крупнее')
        else if (contrast < 16) softIssues.push('Подвиньте паспорт ближе к рамке для более четкого текста')

        if (darkRatio < 0.008) softIssues.push('Не хватает темных символов, центрируйте разворот')
        if (brightRatio < 0.015) softIssues.push('Мало светлых областей, добавьте света')

        if (severeIssues.length > 0) {
          passportStableOkRef.current = 0
          applyPassportGateUi({
            canShoot: false,
            hint: severeIssues[0],
            inFrame: true,
          })
          return
        }

        passportStableOkRef.current += 1
        if (passportStableOkRef.current < PASSPORT_STABLE_OK_FRAMES) {
          applyPassportGateUi({
            canShoot: false,
            hint:
              softIssues[0] ||
              `Отлично, зафиксируйте кадр… (${passportStableOkRef.current}/${PASSPORT_STABLE_OK_FRAMES})`,
            inFrame: true,
          })
          return
        }

        applyPassportGateUi({
          canShoot: true,
          hint: softIssues[0] || 'Паспорт в фокусе, можно снимать',
          inFrame: true,
        })
      } catch (error) {
        console.error('Ошибка проверки паспорта:', error)
        passportStableOkRef.current = 0
        applyPassportGateUi({
          canShoot: false,
          hint: 'Не удалось подтвердить документ — попробуйте снова',
          inFrame: false,
        })
      } finally {
        passportScanBusyRef.current = false
      }
    }

    detectionIntervalRef.current = window.setInterval(tick, PASSPORT_DETECT_INTERVAL_MS)
    tick()
  }

  const stopCamera = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current)
      detectionIntervalRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    if (blurVideoRef.current) {
      blurVideoRef.current.srcObject = null
    }
    selfieStableOkRef.current = 0
    passportStableOkRef.current = 0
    passportScanBusyRef.current = false
    passportGateRef.current = { canShoot: false, hint: '', inFrame: false }
    selfieGateRef.current = { canShoot: false, hint: '', inOval: false }
    setSelfieFaceOk(false)
    setSelfieFaceHint('')
    setSelfieInOvalFrame(false)
    setPassportOk(false)
    setPassportHint('')
    setPassportInFrame(false)
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return
    if (type === 'selfie' && !selfieFaceOk) return
    if (type === 'passport' && !passportOk) return

    setIsCapturing(true)

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    const w = video.videoWidth
    const h = video.videoHeight
    canvas.width = w
    canvas.height = h

    const preview = previewRef.current
    const canComposite =
      useFrameBlur && clipRegion && preview && w > 0 && h > 0

    if (canComposite) {
      const pr = preview.getBoundingClientRect()
      const scaleX = w / pr.width
      const scaleY = h / pr.height
      const blurPx = Math.max(3, Math.round(10 * ((scaleX + scaleY) / 2)))

      context.filter = `blur(${blurPx}px)`
      context.drawImage(video, 0, 0, w, h)
      context.filter = 'none'

      context.save()
      if (clipRegion.kind === 'ellipse') {
        const cx = clipRegion.cx * scaleX
        const cy = clipRegion.cy * scaleY
        const rx = clipRegion.rx * scaleX
        const ry = clipRegion.ry * scaleY
        context.beginPath()
        context.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
        context.clip()
      } else {
        const x = clipRegion.x * scaleX
        const y = clipRegion.y * scaleY
        const rw = clipRegion.w * scaleX
        const rh = clipRegion.h * scaleY
        const rad = Math.min(12 * scaleX, rw / 2, rh / 2)
        context.beginPath()
        if (typeof context.roundRect === 'function') {
          context.roundRect(x, y, rw, rh, rad)
        } else {
          context.rect(x, y, rw, rh)
        }
        context.clip()
      }
      context.drawImage(video, 0, 0, w, h)
      context.restore()
    } else {
      context.drawImage(video, 0, 0)
    }

    canvas.toBlob((blob) => {
      if (blob) {
        onCapture(blob)
      }
      setIsCapturing(false)
    }, 'image/jpeg', 0.95)
  }

  const switchCamera = () => {
    stopCamera()
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user')
  }

  return (
    <div className="camera-overlay">
      <div className="camera-container">
        <button className="camera-close" onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>

        <div className="camera-preview" ref={previewRef}>
          {useFrameBlur ? (
            <div className="camera-preview__video-stack">
              <video
                ref={blurVideoRef}
                autoPlay
                playsInline
                className={`camera-video camera-video--blur-layer ${(type === 'selfie' || type === 'selfieWithPassport') ? 'mirrored' : ''}`}
              />
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className={`camera-video camera-video--sharp-layer ${(type === 'selfie' || type === 'selfieWithPassport') ? 'mirrored' : ''}`}
                style={
                  clipRegion
                    ? { clipPath: buildClipPathFromRegion(clipRegion), opacity: 1 }
                    : { opacity: 0 }
                }
              />
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className={`camera-video ${(type === 'selfie' || type === 'selfieWithPassport') ? 'mirrored' : ''}`}
            />
          )}
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Контур для селфи (только для второго шага) */}
          {type === 'selfie' && (
            <div className="camera-face-overlay">
              <div className="camera-face-guide">
                <div
                  ref={shapeGuideRef}
                  className={`camera-face-guide__oval ${
                    selfieFaceOk ? 'face-detected' : selfieInOvalFrame ? 'face-aligning' : ''
                  }`}
                />
                <div className="camera-face-guide__text" role="status" aria-live="polite">
                  {selfieFaceHint || 'Расположите лицо в овале'}
                </div>
              </div>
              {selfieFaceOk && (
                <div className="camera-face-notification">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Можно нажать затвор</span>
                </div>
              )}
            </div>
          )}

          {/* Контур для паспорта */}
          {type === 'passport' && (
            <div className="camera-passport-overlay">
              <div className="camera-passport-guide">
                <div ref={shapeGuideRef} className="camera-passport-guide__rect" />
                <div
                  className={`camera-passport-guide__text ${
                    passportOk
                      ? 'camera-passport-guide__text--ok'
                      : passportInFrame
                        ? 'camera-passport-guide__text--progress'
                        : ''
                  }`}
                  role="status"
                  aria-live="polite"
                >
                  {passportHint || 'Расположите паспорт в рамке'}
                </div>
              </div>
              {passportOk && (
                <div className="camera-face-notification">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Можно нажать затвор</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="camera-controls">
          <button className="camera-switch" onClick={switchCamera}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 3L21 6L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 6H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M6 21L3 18L6 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <button
            type="button"
            className="camera-capture"
            onClick={capturePhoto}
            disabled={
              isCapturing ||
              (type === 'selfie' &&
                (!modelsLoaded || modelsLoading || !selfieFaceOk)) ||
              (type === 'passport' && !passportOk)
            }
            title={
              type === 'selfie' && !modelsLoaded
                ? 'Сначала загрузится проверка лица'
                : type === 'selfie' && !selfieFaceOk
                  ? 'Дождитесь зелёной рамки и подсказки «можно снимать»'
                  : type === 'passport' && !passportOk
                    ? 'Дождитесь проверки паспорта и подсказки «можно снимать»'
                  : undefined
            }
          >
            <div className="camera-capture__button"></div>
          </button>
          <div style={{ width: '48px' }}></div>
        </div>
      </div>
    </div>
  )
}

export default VerificationModal


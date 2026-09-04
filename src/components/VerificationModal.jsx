import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import { FiCheck, FiChevronsLeft, FiChevronsRight, FiUser, FiX } from 'react-icons/fi'
import { showNotification } from '../utils/toastHelper'
import { saveVerificationPhoto, loadVerificationPhotos, clearVerificationPhotos } from '../utils/verificationStorage'
import { getApiBaseUrl } from '../utils/apiConfig'
import BuyerCelebrationModal from './BuyerCelebrationModal'
import './VerificationModal.css'

let API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || '/api'

/** object-fit: cover — прямоугольник превью → координаты исходного видео */
function mapPreviewRectToVideoCover(previewW, previewH, videoW, videoH, x, y, w, h) {
  if (!previewW || !previewH || !videoW || !videoH) return null
  const scale = Math.max(previewW / videoW, previewH / videoH)
  const displayedW = videoW * scale
  const displayedH = videoH * scale
  const offsetX = (previewW - displayedW) / 2
  const offsetY = (previewH - displayedH) / 2
  return {
    sx: (x - offsetX) / scale,
    sy: (y - offsetY) / scale,
    sw: w / scale,
    sh: h / scale,
  }
}

/** Овал в координатах кадра видео (object-fit: cover) */
function previewEllipseToVideo(clipRegion, videoW, videoH, previewW, previewH) {
  if (!clipRegion || clipRegion.kind !== 'ellipse' || !videoW || !previewW) return null
  const mapped = mapPreviewRectToVideoCover(
    previewW,
    previewH,
    videoW,
    videoH,
    clipRegion.cx - clipRegion.rx,
    clipRegion.cy - clipRegion.ry,
    clipRegion.rx * 2,
    clipRegion.ry * 2
  )
  if (!mapped) return null
  return {
    cx: mapped.sx + mapped.sw / 2,
    cy: mapped.sy + mapped.sh / 2,
    rx: mapped.sw / 2,
    ry: mapped.sh / 2,
  }
}

function clampCropRect(sx, sy, sw, sh, videoW, videoH) {
  let x = Math.floor(sx)
  let y = Math.floor(sy)
  let w = Math.ceil(sw)
  let h = Math.ceil(sh)
  if (x < 0) {
    w += x
    x = 0
  }
  if (y < 0) {
    h += y
    y = 0
  }
  if (x + w > videoW) w = videoW - x
  if (y + h > videoH) h = videoH - y
  return {
    sx: x,
    sy: y,
    sw: Math.max(1, w),
    sh: Math.max(1, h),
  }
}

function pointInEllipse(px, py, cx, cy, rx, ry) {
  if (rx <= 0 || ry <= 0) return false
  const dx = (px - cx) / rx
  const dy = (py - cy) / ry
  return dx * dx + dy * dy <= 1
}

const SELFIE_DETECT_INTERVAL_MS = 120
const SELFIE_MIN_FACE_HEIGHT_IN_OVAL = 0.34
const SELFIE_MAX_FACE_HEIGHT_IN_OVAL = 0.92
const SELFIE_VIDEO_EDGE_MARGIN = 0.03
const LIVENESS_CENTER_THRESHOLD = 0.11
const LIVENESS_TURN_THRESHOLD = 0.2
const LIVENESS_CENTER_HOLD_FRAMES = 6
const LIVENESS_TURN_HOLD_FRAMES = 4
const LIVENESS_RETURN_HOLD_FRAMES = 5
const LIVENESS_TOTAL_STAGES = 4
const FACE_LANDMARKER_WASM_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm'
const FACE_LANDMARKER_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'
/** Небольшой запас вокруг овала в сохранённом снимке */
const SELFIE_CROP_PAD = 0.08
const PASSPORT_CROP_PAD = 0.03
const PASSPORT_DETECT_INTERVAL_MS = 280
const PASSPORT_STABLE_OK_FRAMES = 3

function createLivenessChallenge() {
  return Math.random() < 0.5 ? ['left', 'right'] : ['right', 'left']
}

function livenessStageProgress(stage, challenge) {
  if (stage === 'passed') return LIVENESS_TOTAL_STAGES
  if (stage === 'return-center') return 3
  if (stage === challenge[1]) return 2
  if (stage === challenge[0]) return 1
  return 0
}

function livenessInstruction(stage, t) {
  if (stage === 'left') {
    return {
      title: t('verificationCamera_livenessTurnLeft'),
      detail: t('verificationCamera_livenessFollowArrow'),
      direction: 'left',
    }
  }
  if (stage === 'right') {
    return {
      title: t('verificationCamera_livenessTurnRight'),
      detail: t('verificationCamera_livenessFollowArrow'),
      direction: 'right',
    }
  }
  if (stage === 'return-center') {
    return {
      title: t('verificationCamera_livenessLookStraight'),
      detail: t('verificationCamera_livenessKeepFaceCenter'),
      direction: 'center',
    }
  }
  if (stage === 'passed') {
    return {
      title: t('verificationCamera_livenessDone'),
      detail: t('verificationCamera_livenessHoldStill'),
      direction: 'done',
    }
  }
  return {
    title: t('verificationCamera_livenessFaceCenter'),
    detail: t('verificationCamera_livenessLookAtCamera'),
    direction: 'center',
  }
}

function buildHintData(t) {
  return {
    1: {
      title: t('verificationModal_hint1Title'),
      description: t('verificationModal_hint1Description'),
      requirements: [
        t('verificationModal_hint1Req1'),
        t('verificationModal_hint1Req2'),
        t('verificationModal_hint1Req3'),
        t('verificationModal_hint1Req4'),
        t('verificationModal_hint1Req5'),
      ],
      exampleText: t('verificationModal_hint1Example'),
    },
    2: {
      title: t('verificationModal_hint2Title'),
      description: t('verificationModal_hint2Description'),
      requirements: [
        t('verificationModal_hint2Req1'),
        t('verificationModal_hint2Req2'),
        t('verificationModal_hint2Req3'),
        t('verificationModal_hint2Req4'),
        t('verificationModal_hint2Req5'),
      ],
      exampleText: t('verificationModal_hint2Example'),
    },
    3: {
      title: t('verificationModal_hint3Title'),
      description: t('verificationModal_hint3Description'),
      requirements: [
        t('verificationModal_hint3Req1'),
        t('verificationModal_hint3Req2'),
        t('verificationModal_hint3Req3'),
        t('verificationModal_hint3Req4'),
        t('verificationModal_hint3Req5'),
        t('verificationModal_hint3Req6'),
      ],
      exampleText: t('verificationModal_hint3Example'),
    },
  }
}

/**
 * Оценка горизонтального поворота по положению кончика носа относительно краёв лица.
 * Фронтальная камера показывается зеркально, поэтому меняем знак: положительное
 * значение означает движение вправо именно так, как его видит пользователь.
 */
function estimateMirroredHeadYaw(landmarks) {
  const nose = landmarks?.[1]
  const faceLeft = landmarks?.[234]
  const faceRight = landmarks?.[454]
  if (!nose || !faceLeft || !faceRight) return 0
  const faceWidth = Math.abs(faceRight.x - faceLeft.x)
  if (faceWidth < 0.01) return 0
  const faceCenterX = (faceLeft.x + faceRight.x) / 2
  return -((nose.x - faceCenterX) / (faceWidth / 2))
}

const VerificationModal = ({ isOpen, onClose, userId, onComplete, required }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const faceScanPreview = import.meta.env.DEV &&
    new URLSearchParams(window.location.search).get('faceScanPreview') === '1'
  const [currentStep, setCurrentStep] = useState(faceScanPreview ? 2 : 1)
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
  const [isCameraOpen, setIsCameraOpen] = useState(faceScanPreview)
  const [cameraType, setCameraType] = useState(faceScanPreview ? 'selfie' : null) // 'passport', 'selfie', 'selfieWithPassport'
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSubmittedCelebration, setShowSubmittedCelebration] = useState(false)
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
      setShowSubmittedCelebration(false)
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
      showNotification(t('verificationModal_notifySelectImage'))
      return
    }

    // Проверяем размер файла (максимум 10MB)
    if (file.size > 10 * 1024 * 1024) {
      showNotification(t('verificationModal_notifyFileSize'))
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
      showNotification(t('verificationModal_notifyUploadPassport'))
      return
    }
    if (currentStep === 2 && !photos.selfie) {
      showNotification(t('verificationModal_notifyUploadSelfie'))
      return
    }
    if (currentStep === 3 && !photos.selfieWithPassport) {
      showNotification(t('verificationModal_notifyUploadSelfieWithPassport'))
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
      showNotification(t('verificationModal_notifyUploadAll'))
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

        // После успешной отправки очищаем локальное хранилище фотографий
        clearVerificationPhotos(userId)
        setShowSubmittedCelebration(true)
      } else {
        const errors = results.filter(r => !r.success).map(r => r.error).join(', ')
        showNotification(t('verificationModal_notifyUploadError', { errors }))
      }
    } catch (error) {
      console.error('Ошибка отправки:', error)
      showNotification(t('verificationModal_notifySubmitError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmittedCelebrationGo = async () => {
    setShowSubmittedCelebration(false)
    try {
      if (onComplete) {
        await onComplete()
      }
    } catch (err) {
      console.warn('onComplete после верификации:', err)
    }
    onClose()
    navigate('/deposit')
  }

  const uploadPhoto = async (file, documentType) => {
    // Проверяем, что userId существует и является валидным числом
    if (!userId) {
      return { success: false, error: t('verificationModal_errorUserIdMissing') }
    }

    // Преобразуем userId в число и проверяем валидность
    const numericUserId = typeof userId === 'string' ? parseInt(userId, 10) : Number(userId)
    if (isNaN(numericUserId) || numericUserId <= 0) {
      console.error('❌ Неверный формат userId:', userId)
      return { success: false, error: t('verificationModal_errorUserIdInvalid') }
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
        return { success: false, error: errorData.error || t('verificationModal_errorUploadFailed') }
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

  const hintData = buildHintData(t)

  if (!isOpen) return null

  const modalTree = (
    <>
      <div
        className="verification-modal-overlay verification-modal-overlay--gate"
        onClick={required || showSubmittedCelebration ? undefined : onClose}
      >
        <div 
          className={`verification-modal ${animationClass}`}
          onClick={(e) => e.stopPropagation()}
        >
          {!required && !showSubmittedCelebration && (
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
                    {step === 1
                      ? t('verificationModal_stepPassport')
                      : step === 2
                        ? t('verificationModal_stepSelfie')
                        : t('verificationModal_stepPassportSelfie')}
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
                    <img src={previews.passport} alt={t('verificationModal_altPassport')} />
                    <button 
                      className="verification-step__change"
                      onClick={() => {
                        setPhotos(prev => ({ ...prev, passport: null }))
                        setPreviews(prev => ({ ...prev, passport: null }))
                      }}
                    >
                      {t('verificationModal_changePhoto')}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="verification-step__icon" aria-hidden="true">
                      <img src="/images/verification/passport-3d.png" alt="" />
                    </div>
                    <div className="verification-step__title-wrapper">
                      <h2 className="verification-step__title">{t('verificationModal_step1Title')}</h2>
                      <button 
                        className="verification-step__hint-btn"
                        onClick={() => openHintModal(1)}
                        aria-label={t('verificationModal_hintAriaLabel')}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                          <path d="M9.09 9C9.3251 8.33167 9.78915 7.76811 10.4 7.40913C11.0108 7.05016 11.7289 6.91894 12.4272 7.03871C13.1255 7.15849 13.7588 7.52152 14.2151 8.06353C14.6713 8.60553 14.9211 9.29152 14.92 10C14.92 12 11.92 13 11.92 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          <line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </button>
                    </div>
                    <p className="verification-step__description">
                      {t('verificationModal_step1Desc')}
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
                        {t('verificationModal_takePhoto')}
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
                    <img src={previews.selfie} alt={t('verificationModal_altSelfie')} />
                    <button 
                      className="verification-step__change"
                      onClick={() => {
                        setPhotos(prev => ({ ...prev, selfie: null }))
                        setPreviews(prev => ({ ...prev, selfie: null }))
                      }}
                    >
                      {t('verificationModal_changePhoto')}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="verification-step__icon" aria-hidden="true">
                      <img src="/images/verification/selfie-3d.png" alt="" />
                    </div>
                    <div className="verification-step__title-wrapper">
                      <h2 className="verification-step__title">{t('verificationModal_step2Title')}</h2>
                      <button 
                        className="verification-step__hint-btn"
                        onClick={() => openHintModal(2)}
                        aria-label={t('verificationModal_hintAriaLabel')}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                          <path d="M9.09 9C9.3251 8.33167 9.78915 7.76811 10.4 7.40913C11.0108 7.05016 11.7289 6.91894 12.4272 7.03871C13.1255 7.15849 13.7588 7.52152 14.2151 8.06353C14.6713 8.60553 14.9211 9.29152 14.92 10C14.92 12 11.92 13 11.92 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          <line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </button>
                    </div>
                    <p className="verification-step__description">
                      {t('verificationModal_step2Desc')}
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
                        {t('verificationModal_takeSelfie')}
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
                    <img src={previews.selfieWithPassport} alt={t('verificationModal_altSelfieWithPassport')} />
                    <button 
                      className="verification-step__change"
                      onClick={() => {
                        setPhotos(prev => ({ ...prev, selfieWithPassport: null }))
                        setPreviews(prev => ({ ...prev, selfieWithPassport: null }))
                      }}
                    >
                      {t('verificationModal_changePhoto')}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="verification-step__icon" aria-hidden="true">
                      <img src="/images/verification/selfie-with-passport-3d.png" alt="" />
                    </div>
                    <div className="verification-step__title-wrapper">
                      <h2 className="verification-step__title">{t('verificationModal_step3Title')}</h2>
                      <button 
                        className="verification-step__hint-btn"
                        onClick={() => openHintModal(3)}
                        aria-label={t('verificationModal_hintAriaLabel')}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                          <path d="M9.09 9C9.3251 8.33167 9.78915 7.76811 10.4 7.40913C11.0108 7.05016 11.7289 6.91894 12.4272 7.03871C13.1255 7.15849 13.7588 7.52152 14.2151 8.06353C14.6713 8.60553 14.9211 9.29152 14.92 10C14.92 12 11.92 13 11.92 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          <line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </button>
                    </div>
                    <p className="verification-step__description">
                      {t('verificationModal_step3Desc')}
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
                        {t('verificationModal_takeSelfieWithPassport')}
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
                {t('verificationModal_back')}
              </button>
            )}
            {currentStep < 3 ? (
              <button 
                className="verification-modal__btn verification-modal__btn--primary"
                onClick={handleNext}
                disabled={!photos[['passport', 'selfie', 'selfieWithPassport'][currentStep - 1]]}
              >
                {t('verificationModal_next')}
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
                    {t('verificationModal_submitting')}
                  </>
                ) : (
                  <>
                    {t('verificationModal_submit')}
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
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
          previewMode={faceScanPreview}
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

      <BuyerCelebrationModal
        open={showSubmittedCelebration}
        title={t('verificationModal_celebrationTitle')}
        text={t('verificationModal_celebrationText')}
        ctaLabel={t('verificationModal_celebrationCta')}
        onCta={handleSubmittedCelebrationGo}
        titleId="verification-submitted-celebration-title"
      />
    </>
  )

  if (typeof document === 'undefined') return null
  return createPortal(modalTree, document.body)
}

// Компонент модального окна с подсказкой
const VerificationHintModal = ({ isOpen, onClose, step, data }) => {
  const { t } = useTranslation()
  if (!isOpen || !data) return null

  // Примеры фото
  const exampleImages = {
    1: '/images/external/330px-pasport-rf-bd9b968f5e.jpg',
    2: '/images/external/foto-ot-pechaterfoto-foto-s-retushyu-db47859419.jpg',
    3: '/images/external/1e7fcc548a024256a091661587173216-aafd404dec.jpg'
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
            <h3 className="verification-hint-modal__requirements-title">{t('verificationModal_hintRequirementsTitle')}</h3>
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
                alt={t('verificationModal_hintExampleAlt')}
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
                  <text x="100" y="130" textAnchor="middle" fill="#999" fontSize="14">{t('verificationModal_hintExamplePlaceholder')}</text>
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
const Camera = ({ type, onCapture, onClose, previewMode = false }) => {
  const { t } = useTranslation()
  const videoRef = useRef(null)
  const previewRef = useRef(null)
  const shapeGuideRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const detectionCanvasRef = useRef(null)
  const clipRegionRef = useRef(null)
  const faceLandmarkerRef = useRef(null)
  const livenessChallengeRef = useRef(createLivenessChallenge())
  const livenessStageRef = useRef('center')
  const livenessHoldFramesRef = useRef(0)
  const livenessCenterSamplesRef = useRef([])
  const livenessCenterBaselineRef = useRef(0)
  const smoothedYawRef = useRef(0)
  const livenessPassedRef = useRef(false)
  const autoCaptureTimerRef = useRef(null)
  const capturePhotoRef = useRef(null)
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
  const [livenessChallenge, setLivenessChallenge] = useState(livenessChallengeRef.current)
  const [livenessStage, setLivenessStage] = useState('center')
  const [, setLivenessCompletedStages] = useState(0)
  const [, setLivenessHoldProgress] = useState(0)
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

  const livenessUi = livenessInstruction(livenessStage, t)

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

  const resetLivenessChallenge = useCallback((regenerate = false) => {
    const nextChallenge = regenerate ? createLivenessChallenge() : livenessChallengeRef.current
    livenessChallengeRef.current = nextChallenge
    livenessStageRef.current = 'center'
    livenessHoldFramesRef.current = 0
    livenessCenterSamplesRef.current = []
    livenessCenterBaselineRef.current = 0
    smoothedYawRef.current = 0
    livenessPassedRef.current = false
    setLivenessChallenge(nextChallenge)
    setLivenessStage('center')
    setLivenessCompletedStages(0)
    setLivenessHoldProgress(0)
    setSelfieFaceOk(false)
  }, [])

  const moveToLivenessStage = useCallback((nextStage) => {
    livenessStageRef.current = nextStage
    livenessHoldFramesRef.current = 0
    setLivenessStage(nextStage)
    setLivenessCompletedStages(
      livenessStageProgress(nextStage, livenessChallengeRef.current)
    )
    setLivenessHoldProgress(0)
  }, [])

  // Загрузка MediaPipe Face Landmarker. Кадры анализируются локально в браузере.
  useEffect(() => {
    if (type === 'selfie' && previewMode) {
      resetLivenessChallenge(false)
      setModelsLoaded(false)
      setModelsLoading(false)
      setSelfieFaceHint(t('verificationCamera_lookStraight'))
      return undefined
    }

    let cancelled = false

    const loadModels = async () => {
      try {
        setModelsLoading(true)
        setSelfieFaceHint(t('verificationCamera_loadingFaceScan'))
        const vision = await FilesetResolver.forVisionTasks(FACE_LANDMARKER_WASM_URL)
        const createLandmarker = (delegate) =>
          FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: FACE_LANDMARKER_MODEL_URL,
              ...(delegate ? { delegate } : {}),
            },
            runningMode: 'VIDEO',
            numFaces: 2,
            minFaceDetectionConfidence: 0.55,
            minFacePresenceConfidence: 0.55,
            minTrackingConfidence: 0.5,
          })

        let landmarker
        try {
          landmarker = await createLandmarker('GPU')
        } catch (gpuError) {
          console.warn('MediaPipe GPU недоступен, используем CPU:', gpuError)
          landmarker = await createLandmarker()
        }

        if (cancelled) {
          landmarker.close()
          return
        }

        faceLandmarkerRef.current?.close()
        faceLandmarkerRef.current = landmarker
        resetLivenessChallenge(true)
        setModelsLoaded(true)
        setSelfieFaceHint(t('verificationCamera_positionFaceInOval'))
        console.log('✅ MediaPipe Face Landmarker загружен')
      } catch (error) {
        console.error('❌ Ошибка загрузки MediaPipe Face Landmarker:', error)
        setModelsLoaded(false)
        setSelfieFaceHint(t('verificationCamera_faceScanLoadFailed'))
        setSelfieFaceOk(false)
        setSelfieInOvalFrame(false)
      } finally {
        if (!cancelled) setModelsLoading(false)
      }
    }

    if (type === 'selfie') {
      loadModels()
    }

    return () => {
      cancelled = true
      if (autoCaptureTimerRef.current) {
        clearTimeout(autoCaptureTimerRef.current)
        autoCaptureTimerRef.current = null
      }
      if (faceLandmarkerRef.current) {
        faceLandmarkerRef.current.close()
        faceLandmarkerRef.current = null
      }
    }
  }, [type, previewMode, resetLivenessChallenge])

  useEffect(() => {
    if (type !== 'selfie') return
    if (modelsLoading) {
      setSelfieFaceHint(t('verificationCamera_loadingFaceScan'))
      setSelfieFaceOk(false)
      setSelfieInOvalFrame(false)
    }
  }, [type, modelsLoading])

  useEffect(() => {
    if (type !== 'passport') return
    setPassportHint(t('verificationCamera_alignPassportInFrame'))
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
    if (previewMode) return

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
    } catch (error) {
      console.error('Ошибка доступа к камере:', error)
      showNotification(t('verificationCamera_cameraAccessFailed'))
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
    if (!videoRef.current || !faceLandmarkerRef.current || !modelsLoaded || type !== 'selfie') {
      return
    }

    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current)
    }

    const tick = async () => {
      if (detectionBusyRef.current) return
      const video = videoRef.current
      if (!video || video.readyState !== 4 || type !== 'selfie') return

      const preview = previewRef.current
      const region = clipRegionRef.current
      if (!preview || !region || region.kind !== 'ellipse') {
        applySelfieGateUi({
          canShoot: false,
          hint: t('verificationCamera_preparingFrame'),
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
          applySelfieGateUi({ canShoot: false, hint: t('verificationCamera_preparingFrame'), inOval: false })
          return
        }

        const result = faceLandmarkerRef.current?.detectForVideo(video, performance.now())
        const faces = result?.faceLandmarks || []
        const marginX = vw * SELFIE_VIDEO_EDGE_MARGIN
        const marginY = vh * SELFIE_VIDEO_EDGE_MARGIN

        const checkFraming = () => {
          if (faces.length === 0) {
            return {
              hint: t('verificationCamera_faceNotVisible'),
              inOval: false,
            }
          }
          if (faces.length > 1) {
            return {
              hint: t('verificationCamera_multipleFaces'),
              inOval: false,
            }
          }

          const landmarks = faces[0]
          const xs = landmarks.map((point) => point.x * vw)
          const ys = landmarks.map((point) => point.y * vh)
          const minX = Math.min(...xs)
          const maxX = Math.max(...xs)
          const minY = Math.min(...ys)
          const maxY = Math.max(...ys)
          const box = {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
          }
          const clipped =
            box.x < marginX ||
            box.y < marginY ||
            box.x + box.width > vw - marginX ||
            box.y + box.height > vh - marginY
          if (clipped) {
            return {
              hint: t('verificationCamera_faceClipped'),
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
              hint: inOval
                ? t('verificationCamera_faceTooSmallInOval')
                : t('verificationCamera_faceTooSmallOutOval'),
              inOval,
            }
          }
          if (relH > SELFIE_MAX_FACE_HEIGHT_IN_OVAL) {
            return {
              hint: t('verificationCamera_faceTooLarge'),
              inOval,
            }
          }

          if (!inOval) {
            const left = cx < ellipse.cx - ellipse.rx * 0.12
            const right = cx > ellipse.cx + ellipse.rx * 0.12
            const up = cy < ellipse.cy - ellipse.ry * 0.1
            const down = cy > ellipse.cy + ellipse.ry * 0.1
            let hint = t('verificationCamera_alignFaceInOval')
            if (left) hint = t('verificationCamera_moveFaceRight')
            else if (right) hint = t('verificationCamera_moveFaceLeft')
            else if (up) hint = t('verificationCamera_moveFaceDown')
            else if (down) hint = t('verificationCamera_moveFaceUp')
            return { hint, inOval: false }
          }

          return { hint: '', inOval: true, landmarks }
        }

        const framing = checkFraming()
        if (!framing.inOval || !framing.landmarks) {
          const currentStage = livenessStageRef.current
          livenessHoldFramesRef.current = 0
          livenessCenterSamplesRef.current = []
          setLivenessHoldProgress(0)
          if (currentStage !== 'center' && currentStage !== 'passed') {
            resetLivenessChallenge(false)
          }
          applySelfieGateUi({
            canShoot: false,
            hint: framing.hint,
            inOval: framing.inOval,
          })
          return
        }

        const measuredYaw = estimateMirroredHeadYaw(framing.landmarks)
        smoothedYawRef.current =
          smoothedYawRef.current * 0.62 + measuredYaw * 0.38

        const stage = livenessStageRef.current
        const centeredYaw = smoothedYawRef.current - livenessCenterBaselineRef.current
        let targetReached = false
        let requiredFrames = LIVENESS_TURN_HOLD_FRAMES

        if (stage === 'center') {
          requiredFrames = LIVENESS_CENTER_HOLD_FRAMES
          targetReached = Math.abs(smoothedYawRef.current) <= LIVENESS_CENTER_THRESHOLD
        } else if (stage === 'left') {
          targetReached = centeredYaw <= -LIVENESS_TURN_THRESHOLD
        } else if (stage === 'right') {
          targetReached = centeredYaw >= LIVENESS_TURN_THRESHOLD
        } else if (stage === 'return-center') {
          requiredFrames = LIVENESS_RETURN_HOLD_FRAMES
          targetReached = Math.abs(centeredYaw) <= LIVENESS_CENTER_THRESHOLD
        }

        if (!targetReached) {
          livenessHoldFramesRef.current = 0
          if (stage === 'center') livenessCenterSamplesRef.current = []
          setLivenessHoldProgress(0)
          applySelfieGateUi({
            canShoot: false,
            hint:
              stage === 'center' || stage === 'return-center'
                ? t('verificationCamera_alignAndLookStraight')
                : livenessInstruction(stage, t).title,
            inOval: true,
          })
          return
        }

        livenessHoldFramesRef.current += 1
        if (stage === 'center') {
          livenessCenterSamplesRef.current.push(smoothedYawRef.current)
        }
        setLivenessHoldProgress(
          Math.min(1, livenessHoldFramesRef.current / requiredFrames)
        )

        if (livenessHoldFramesRef.current < requiredFrames) {
          applySelfieGateUi({
            canShoot: false,
            hint: t('verificationCamera_holdPosition'),
            inOval: true,
          })
          return
        }

        if (stage === 'center') {
          const samples = livenessCenterSamplesRef.current
          livenessCenterBaselineRef.current =
            samples.reduce((sum, value) => sum + value, 0) / Math.max(1, samples.length)
          const nextStage = livenessChallengeRef.current[0]
          moveToLivenessStage(nextStage)
          applySelfieGateUi({
            canShoot: false,
            hint: livenessInstruction(nextStage, t).title,
            inOval: true,
          })
          return
        }

        if (stage === livenessChallengeRef.current[0]) {
          const nextStage = livenessChallengeRef.current[1]
          moveToLivenessStage(nextStage)
          applySelfieGateUi({
            canShoot: false,
            hint: livenessInstruction(nextStage, t).title,
            inOval: true,
          })
          return
        }

        if (stage === livenessChallengeRef.current[1]) {
          moveToLivenessStage('return-center')
          applySelfieGateUi({
            canShoot: false,
            hint: t('verificationCamera_livenessReturnCenter'),
            inOval: true,
          })
          return
        }

        if (stage === 'return-center') {
          livenessPassedRef.current = true
          livenessStageRef.current = 'passed'
          setLivenessStage('passed')
          setLivenessCompletedStages(LIVENESS_TOTAL_STAGES)
          setLivenessHoldProgress(1)
          applySelfieGateUi({
            canShoot: true,
            hint: t('verificationCamera_livenessPassed'),
            inOval: true,
          })
          if (detectionIntervalRef.current) {
            clearInterval(detectionIntervalRef.current)
            detectionIntervalRef.current = null
          }
          autoCaptureTimerRef.current = window.setTimeout(() => {
            capturePhotoRef.current?.()
          }, 900)
          return
        }

        applySelfieGateUi({
          canShoot: false,
          hint: t('verificationCamera_followHints'),
          inOval: true,
        })
      } catch (error) {
        console.error('Ошибка детекции лица:', error)
        livenessHoldFramesRef.current = 0
        setLivenessHoldProgress(0)
        applySelfieGateUi({
          canShoot: false,
          hint: t('verificationCamera_detectionFailed'),
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
        applyPassportGateUi({ canShoot: false, hint: t('verificationCamera_preparingFrame'), inFrame: false })
        return
      }

      const vw = video.videoWidth
      const vh = video.videoHeight
      const pr = preview.getBoundingClientRect()
      if (!vw || !vh || !pr.width || !pr.height) return

      const mapped = mapPreviewRectToVideoCover(
        pr.width,
        pr.height,
        vw,
        vh,
        region.x,
        region.y,
        region.w,
        region.h
      )
      if (!mapped) {
        applyPassportGateUi({ canShoot: false, hint: t('verificationCamera_preparingFrame'), inFrame: false })
        return
      }
      const sx = Math.max(0, Math.floor(mapped.sx))
      const sy = Math.max(0, Math.floor(mapped.sy))
      const sw = Math.min(vw - sx, Math.floor(mapped.sw))
      const sh = Math.min(vh - sy, Math.floor(mapped.sh))
      if (sw < 80 || sh < 80) {
        passportStableOkRef.current = 0
        applyPassportGateUi({ canShoot: false, hint: t('verificationCamera_passportTooFar'), inFrame: false })
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
            hint: t('verificationCamera_detectionFailed'),
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

        if (brightness < 24) severeIssues.push(t('verificationCamera_passportTooDark'))
        else if (brightness < 40) softIssues.push(t('verificationCamera_passportSlightlyDark'))

        if (brightness > 245) severeIssues.push(t('verificationCamera_passportOverexposed'))
        else if (brightness > 230) softIssues.push(t('verificationCamera_passportSlightOverexposure'))

        if (edgeScore < 3) severeIssues.push(t('verificationCamera_passportBlurry'))
        else if (edgeScore < 8) softIssues.push(t('verificationCamera_passportAlmostFocus'))

        if (contrast < 10) severeIssues.push(t('verificationCamera_passportTooFar'))
        else if (contrast < 16) softIssues.push(t('verificationCamera_passportMoveCloser'))

        if (darkRatio < 0.008) softIssues.push(t('verificationCamera_passportMissingDarkSymbols'))
        if (brightRatio < 0.015) softIssues.push(t('verificationCamera_passportMissingLightAreas'))

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
              t('verificationCamera_passportHoldSteady', {
                current: passportStableOkRef.current,
                total: PASSPORT_STABLE_OK_FRAMES,
              }),
            inFrame: true,
          })
          return
        }

        applyPassportGateUi({
          canShoot: true,
          hint: softIssues[0] || t('verificationCamera_passportInFocus'),
          inFrame: true,
        })
      } catch (error) {
        console.error('Ошибка проверки паспорта:', error)
        passportStableOkRef.current = 0
        applyPassportGateUi({
          canShoot: false,
          hint: t('verificationCamera_passportVerifyFailed'),
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
    livenessHoldFramesRef.current = 0
    livenessCenterSamplesRef.current = []
    smoothedYawRef.current = 0
    livenessPassedRef.current = false
    if (autoCaptureTimerRef.current) {
      clearTimeout(autoCaptureTimerRef.current)
      autoCaptureTimerRef.current = null
    }
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
    if (type === 'selfie' && !livenessPassedRef.current) return
    if (type === 'passport' && !passportOk) return

    setIsCapturing(true)

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    const w = video.videoWidth
    const h = video.videoHeight
    const preview = previewRef.current
    const canCrop = useFrameBlur && clipRegion && preview && w > 0 && h > 0

    if (canCrop) {
      const pr = preview.getBoundingClientRect()
      let crop = null

      if (clipRegion.kind === 'ellipse') {
        const ellipse = previewEllipseToVideo(clipRegion, w, h, pr.width, pr.height)
        if (ellipse) {
          const padX = ellipse.rx * SELFIE_CROP_PAD
          const padY = ellipse.ry * SELFIE_CROP_PAD
          crop = clampCropRect(
            ellipse.cx - ellipse.rx - padX,
            ellipse.cy - ellipse.ry - padY,
            (ellipse.rx + padX) * 2,
            (ellipse.ry + padY) * 2,
            w,
            h
          )
        }
      } else {
        const mapped = mapPreviewRectToVideoCover(
          pr.width,
          pr.height,
          w,
          h,
          clipRegion.x,
          clipRegion.y,
          clipRegion.w,
          clipRegion.h
        )
        if (mapped) {
          const padX = mapped.sw * PASSPORT_CROP_PAD
          const padY = mapped.sh * PASSPORT_CROP_PAD
          crop = clampCropRect(
            mapped.sx - padX,
            mapped.sy - padY,
            mapped.sw + padX * 2,
            mapped.sh + padY * 2,
            w,
            h
          )
        }
      }

      if (crop) {
        canvas.width = crop.sw
        canvas.height = crop.sh
        if (type === 'selfie') {
          // Как на превью: фронтальная камера зеркалится
          context.translate(crop.sw, 0)
          context.scale(-1, 1)
        }
        context.drawImage(
          video,
          crop.sx,
          crop.sy,
          crop.sw,
          crop.sh,
          0,
          0,
          crop.sw,
          crop.sh
        )
      } else {
        canvas.width = w
        canvas.height = h
        context.drawImage(video, 0, 0)
      }
    } else {
      canvas.width = w
      canvas.height = h
      context.drawImage(video, 0, 0)
    }

    canvas.toBlob((blob) => {
      if (blob) {
        onCapture(blob)
      }
      setIsCapturing(false)
    }, 'image/jpeg', 0.95)
  }

  capturePhotoRef.current = capturePhoto

  const switchCamera = () => {
    stopCamera()
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user')
  }

  return (
    <div className="camera-overlay">
      <div className="camera-container">
        <button className="camera-close" onClick={onClose}>
          <FiX aria-hidden="true" />
        </button>

        <div className="camera-preview" ref={previewRef}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className={`camera-video ${(type === 'selfie' || type === 'selfieWithPassport') ? 'mirrored' : ''}`}
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Контур для селфи (только для второго шага) */}
          {type === 'selfie' && (
            <div className="camera-face-overlay">
              <div className="camera-face-guide">
                <div
                  ref={shapeGuideRef}
                  className={`camera-face-guide__oval ${
                    selfieFaceOk
                      ? 'face-detected is-liveness-passed'
                      : selfieInOvalFrame
                        ? 'face-aligning is-liveness-active'
                        : ''
                  }`}
                >
                  {(livenessUi.direction === 'left' || livenessUi.direction === 'right') && (
                    <div
                      className={`camera-liveness-arrow camera-liveness-arrow--${livenessUi.direction}`}
                      aria-hidden="true"
                    >
                      {livenessUi.direction === 'left' ? <FiChevronsLeft /> : <FiChevronsRight />}
                    </div>
                  )}
                  {(livenessUi.direction === 'center' || livenessUi.direction === 'done') && (
                    <div
                      className={`camera-liveness-center ${livenessUi.direction === 'done' ? 'is-done' : ''}`}
                      aria-hidden="true"
                    >
                      {livenessUi.direction === 'done' ? <FiCheck /> : <FiUser />}
                    </div>
                  )}
                  {livenessUi.direction === 'center' && (
                    <div className="camera-liveness-align-arrows" aria-hidden="true">
                      <FiChevronsRight />
                      <FiChevronsLeft />
                    </div>
                  )}
                </div>
                <div
                  className={`camera-liveness-hint ${
                    selfieFaceOk ? 'is-passed' : selfieInOvalFrame ? 'is-active' : ''
                  }`}
                  role="status"
                  aria-live="polite"
                >
                  <span className="camera-liveness-hint__icon" aria-hidden="true">
                    {livenessUi.direction === 'left' ? (
                      <FiChevronsLeft />
                    ) : livenessUi.direction === 'right' ? (
                      <FiChevronsRight />
                    ) : livenessUi.direction === 'done' ? (
                      <FiCheck />
                    ) : (
                      <FiUser />
                    )}
                  </span>
                  <span className="camera-liveness-hint__copy">
                    <strong>{livenessUi.title}</strong>
                    <small>
                      {modelsLoading
                        ? t('verificationCamera_preparingCamera')
                        : selfieFaceHint || livenessUi.detail}
                    </small>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Контур для паспорта */}
          {type === 'passport' && (
            <div className="camera-passport-overlay">
              <div className="camera-passport-guide">
                <div
                  ref={shapeGuideRef}
                  className={`camera-passport-guide__rect ${
                    passportOk ? 'is-ok' : passportInFrame ? 'is-progress' : ''
                  }`}
                >
                  <span className="camera-guide-corner camera-guide-corner--tl" aria-hidden="true" />
                  <span className="camera-guide-corner camera-guide-corner--tr" aria-hidden="true" />
                  <span className="camera-guide-corner camera-guide-corner--bl" aria-hidden="true" />
                  <span className="camera-guide-corner camera-guide-corner--br" aria-hidden="true" />
                </div>
                <div
                  className={`camera-guide-hint ${
                    passportOk
                      ? 'camera-guide-hint--ok'
                      : passportInFrame
                        ? 'camera-guide-hint--progress'
                        : ''
                  }`}
                  role="status"
                  aria-live="polite"
                >
                  {passportHint || t('verificationCamera_passportDefaultHint')}
                </div>
              </div>
              {passportOk && (
                <div className="camera-ready-chip" role="status">
                  <span className="camera-ready-chip__icon" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  <span className="camera-ready-chip__text">{t('verificationCamera_shutterReady')}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="camera-controls">
          {type !== 'selfie' ? (
            <button className="camera-switch" onClick={switchCamera}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M18 3L21 6L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M21 6H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M6 21L3 18L6 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          ) : (
            <div className="camera-control-spacer" aria-hidden="true" />
          )}
          <button
            type="button"
            className={`camera-capture ${type === 'selfie' ? 'camera-capture--liveness' : ''} ${
              selfieFaceOk ? 'is-ready' : ''
            }`}
            onClick={capturePhoto}
            disabled={
              isCapturing ||
              (type === 'selfie' &&
                (!modelsLoaded || modelsLoading || !selfieFaceOk)) ||
              (type === 'passport' && !passportOk)
            }
            title={
              type === 'selfie' && !modelsLoaded
                ? t('verificationCamera_waitFaceCheck')
                : type === 'selfie' && !selfieFaceOk
                  ? t('verificationCamera_waitGreenFrame')
                  : type === 'passport' && !passportOk
                    ? t('verificationCamera_waitPassportCheck')
                  : undefined
            }
          >
            <div className="camera-capture__button"></div>
          </button>
          <div className="camera-control-spacer" aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}

export default VerificationModal

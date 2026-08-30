import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FiCamera, FiChevronLeft, FiChevronRight, FiImage, FiLoader } from 'react-icons/fi'
import { SiGoogledrive } from 'react-icons/si'
import BuyerSheetShell from './buyer-mobile/BuyerSheetShell'
import { getGoogleClientId, loadRuntimeConfig } from '../utils/env'
import {
  downloadGoogleDriveFileAsImage,
  driveThumbnailUrl,
  listGoogleDriveImages,
  requestGoogleDriveAccessToken,
} from '../utils/googleDriveImagePicker'
import './PassportUploadSourceSheet.css'

async function resolveGoogleClientId() {
  const fromEnv = getGoogleClientId()
  if (fromEnv) return fromEnv
  const runtime = await loadRuntimeConfig()
  return runtime?.googleClientId || ''
}

async function requestCameraStream() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('CAMERA_UNSUPPORTED')
  }

  const attempts = [
    {
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
    },
    { video: { facingMode: 'environment' } },
    { video: { facingMode: 'user' } },
    { video: true },
  ]

  let lastError = null
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints)
    } catch (error) {
      lastError = error
    }
  }

  throw lastError || new Error('CAMERA_UNAVAILABLE')
}

function stopMediaStream(stream) {
  stream?.getTracks?.().forEach((track) => track.stop())
}

export default function PassportUploadSourceSheet({
  isOpen,
  onClose,
  onPickGallery,
  onPickCamera,
  onPickFile,
  busy = false,
}) {
  const { t } = useTranslation()
  const [view, setView] = useState('choice')
  const [driveToken, setDriveToken] = useState('')
  const [driveFiles, setDriveFiles] = useState([])
  const [nextPageToken, setNextPageToken] = useState(null)
  const [driveLoading, setDriveLoading] = useState(false)
  const [driveLoadingMore, setDriveLoadingMore] = useState(false)
  const [pickingFileId, setPickingFileId] = useState('')
  const [driveError, setDriveError] = useState('')
  const [cameraLoading, setCameraLoading] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [isCapturing, setIsCapturing] = useState(false)
  const streamRef = useRef(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  const stopCamera = useCallback(() => {
    stopMediaStream(streamRef.current)
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  const resetSheetState = useCallback(() => {
    stopCamera()
    setView('choice')
    setDriveToken('')
    setDriveFiles([])
    setNextPageToken(null)
    setDriveLoading(false)
    setDriveLoadingMore(false)
    setPickingFileId('')
    setDriveError('')
    setCameraLoading(false)
    setCameraError('')
    setIsCapturing(false)
  }, [stopCamera])

  useEffect(() => {
    if (!isOpen) resetSheetState()
  }, [isOpen, resetSheetState])

  useEffect(() => {
    if (!isOpen || view !== 'camera') return undefined

    let cancelled = false
    setCameraLoading(true)
    setCameraError('')

    void (async () => {
      try {
        const stream = await requestCameraStream()
        if (cancelled) {
          stopMediaStream(stream)
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
      } catch {
        if (cancelled) return
        if (onPickCamera) {
          onPickCamera()
          window.setTimeout(() => onClose?.(), 0)
          return
        }
        setCameraError(t('buyerData_passportSourceCameraError'))
      } finally {
        if (!cancelled) setCameraLoading(false)
      }
    })()

    return () => {
      cancelled = true
      stopCamera()
    }
  }, [isOpen, view, stopCamera, onPickCamera, onClose, t])

  const handleClose = useCallback(() => {
    if (busy || pickingFileId || isCapturing) return
    stopCamera()
    onClose?.()
  }, [busy, pickingFileId, isCapturing, stopCamera, onClose])

  const handleGallery = useCallback(() => {
    if (busy) return
    // Must run synchronously inside the tap handler — deferred clicks are blocked on mobile.
    onPickGallery?.()
    window.setTimeout(() => onClose?.(), 0)
  }, [busy, onClose, onPickGallery])

  const handleCamera = useCallback(() => {
    if (busy) return
    setCameraError('')
    setView('camera')
  }, [busy])

  const handleBackFromCamera = useCallback(() => {
    stopCamera()
    setCameraError('')
    setView('choice')
  }, [stopCamera])

  const handleCapture = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || cameraLoading || isCapturing || busy) return

    const width = video.videoWidth
    const height = video.videoHeight
    if (!width || !height) return

    setIsCapturing(true)
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d')?.drawImage(video, 0, 0, width, height)

    canvas.toBlob(
      (blob) => {
        void (async () => {
          try {
            if (!blob) throw new Error('EMPTY_BLOB')
            const file = new File([blob], `passport-${Date.now()}.jpg`, { type: 'image/jpeg' })
            stopCamera()
            onClose?.()
            await onPickFile?.(file)
          } catch {
            setCameraError(t('buyerData_passportSourceCameraError'))
          } finally {
            setIsCapturing(false)
          }
        })()
      },
      'image/jpeg',
      0.92,
    )
  }, [busy, cameraLoading, isCapturing, onClose, onPickFile, stopCamera, t])

  const loadDrivePage = useCallback(async (accessToken, pageToken = '', append = false) => {
    const result = await listGoogleDriveImages(accessToken, { pageToken })
    setDriveFiles((prev) => (append ? [...prev, ...result.files] : result.files))
    setNextPageToken(result.nextPageToken)
  }, [])

  const handleOpenDrive = useCallback(async () => {
    if (busy || driveLoading) return
    setDriveError('')
    setDriveLoading(true)
    try {
      const clientId = await resolveGoogleClientId()
      if (!clientId) {
        throw new Error('GOOGLE_CLIENT_ID_MISSING')
      }
      const token = await requestGoogleDriveAccessToken(clientId)
      setDriveToken(token)
      await loadDrivePage(token)
      setView('drive')
    } catch (error) {
      const code = error?.message || ''
      if (code === 'GOOGLE_CLIENT_ID_MISSING') {
        setDriveError(t('buyerData_passportSourceDriveConfigError'))
      } else if (
        code === 'popup_closed' ||
        code === 'popup_failed_to_open' ||
        code === 'access_denied' ||
        code === 'GOOGLE_AUTH_CANCELLED'
      ) {
        setDriveError(t('buyerData_passportSourceDriveAuthCancelled'))
      } else {
        setDriveError(t('buyerData_passportSourceDriveError'))
      }
    } finally {
      setDriveLoading(false)
    }
  }, [busy, driveLoading, loadDrivePage, t])

  const handleLoadMore = useCallback(async () => {
    if (!driveToken || !nextPageToken || driveLoadingMore) return
    setDriveLoadingMore(true)
    setDriveError('')
    try {
      await loadDrivePage(driveToken, nextPageToken, true)
    } catch {
      setDriveError(t('buyerData_passportSourceDriveError'))
    } finally {
      setDriveLoadingMore(false)
    }
  }, [driveToken, nextPageToken, driveLoadingMore, loadDrivePage, t])

  const handlePickDriveFile = useCallback(
    async (fileMeta) => {
      if (!driveToken || !fileMeta?.id || pickingFileId || busy) return
      setPickingFileId(fileMeta.id)
      setDriveError('')
      try {
        const file = await downloadGoogleDriveFileAsImage(driveToken, fileMeta)
        onClose?.()
        await onPickFile?.(file)
      } catch {
        setDriveError(t('buyerData_passportSourceDriveDownloadError'))
      } finally {
        setPickingFileId('')
      }
    },
    [driveToken, pickingFileId, busy, onClose, onPickFile, t],
  )

  return (
    <BuyerSheetShell
      isOpen={isOpen}
      onClose={handleClose}
      titleId="passport-upload-source-title"
      describedBy="passport-upload-source-description"
      closeLabel={t('buyerData_cancel')}
      dismissible={!busy && !pickingFileId && !isCapturing}
      className="passport-upload-source"
    >
      {view === 'choice' ? (
        <div className="passport-upload-source__choice">
          <span className="passport-upload-source__eyebrow">{t('buyerData_passportSourceEyebrow')}</span>
          <h2 id="passport-upload-source-title" className="passport-upload-source__title">
            {t('buyerData_passportSourceTitle')}
          </h2>
          <p id="passport-upload-source-description" className="passport-upload-source__subtitle">
            {t('buyerData_passportSourceSubtitle')}
          </p>

          <div className="passport-upload-source__methods" role="list">
            <button
              type="button"
              className="passport-upload-source__method passport-upload-source__method--recommended"
              onClick={handleGallery}
              disabled={busy || driveLoading}
            >
              <span className="passport-upload-source__method-icon" aria-hidden>
                <FiImage size={22} strokeWidth={2} />
              </span>
              <span className="passport-upload-source__method-copy">
                <span className="passport-upload-source__method-title-row">
                  <strong>{t('buyerData_passportSourceGallery')}</strong>
                </span>
                <small>{t('buyerData_passportSourceGalleryHint')}</small>
              </span>
              <span className="passport-upload-source__method-chevron" aria-hidden>
                <FiChevronRight size={18} />
              </span>
            </button>

            <button
              type="button"
              className="passport-upload-source__method"
              onClick={handleCamera}
              disabled={busy || driveLoading}
            >
              <span className="passport-upload-source__method-icon" aria-hidden>
                <FiCamera size={22} strokeWidth={2} />
              </span>
              <span className="passport-upload-source__method-copy">
                <span className="passport-upload-source__method-title-row">
                  <strong>{t('buyerData_passportSourceCamera')}</strong>
                </span>
                <small>{t('buyerData_passportSourceCameraHint')}</small>
              </span>
              <span className="passport-upload-source__method-chevron" aria-hidden>
                <FiChevronRight size={18} />
              </span>
            </button>

            <button
              type="button"
              className="passport-upload-source__method"
              onClick={() => void handleOpenDrive()}
              disabled={busy || driveLoading}
            >
              <span
                className="passport-upload-source__method-icon passport-upload-source__method-icon--drive"
                aria-hidden
              >
                {driveLoading ? (
                  <FiLoader className="passport-upload-source__spinner" size={22} />
                ) : (
                  <SiGoogledrive size={22} />
                )}
              </span>
              <span className="passport-upload-source__method-copy">
                <span className="passport-upload-source__method-title-row">
                  <strong>{t('buyerData_passportSourceDrive')}</strong>
                </span>
                <small>
                  {driveLoading
                    ? t('buyerData_passportSourceDriveConnecting')
                    : t('buyerData_passportSourceDriveHint')}
                </small>
              </span>
              <span className="passport-upload-source__method-chevron" aria-hidden>
                <FiChevronRight size={18} />
              </span>
            </button>
          </div>

          {driveError ? (
            <p className="passport-upload-source__error" role="alert">
              {driveError}
            </p>
          ) : null}
        </div>
      ) : view === 'camera' ? (
        <div className="passport-upload-source__camera">
          <button
            type="button"
            className="passport-upload-source__back"
            onClick={handleBackFromCamera}
            disabled={isCapturing}
          >
            <FiChevronLeft size={18} aria-hidden />
            {t('buyerData_passportSourceBack')}
          </button>

          <span className="passport-upload-source__eyebrow">{t('buyerData_passportSourceCamera')}</span>
          <h2 id="passport-upload-source-title" className="passport-upload-source__title">
            {t('buyerData_passportSourceCameraTitle')}
          </h2>
          <p id="passport-upload-source-description" className="passport-upload-source__subtitle">
            {t('buyerData_passportSourceCameraSubtitle')}
          </p>

          <div className="passport-upload-source__camera-preview" aria-hidden={cameraLoading}>
            <video ref={videoRef} playsInline autoPlay muted className="passport-upload-source__camera-video" />
            {cameraLoading ? (
              <div className="passport-upload-source__camera-overlay" role="status">
                <FiLoader className="passport-upload-source__spinner" size={28} />
                <span>{t('buyerData_passportSourceCameraLoading')}</span>
              </div>
            ) : null}
          </div>
          <canvas ref={canvasRef} className="passport-upload-source__camera-canvas" aria-hidden />

          <button
            type="button"
            className="passport-upload-source__camera-shutter"
            onClick={handleCapture}
            disabled={cameraLoading || Boolean(cameraError) || isCapturing || busy}
          >
            {isCapturing ? (
              <FiLoader className="passport-upload-source__spinner" size={22} aria-hidden />
            ) : (
              <FiCamera size={22} strokeWidth={2} aria-hidden />
            )}
            {t('buyerData_passportSourceCameraCapture')}
          </button>

          {cameraError ? (
            <p className="passport-upload-source__error" role="alert">
              {cameraError}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="passport-upload-source__drive">
          <button
            type="button"
            className="passport-upload-source__back"
            onClick={() => {
              setView('choice')
              setDriveError('')
            }}
            disabled={Boolean(pickingFileId)}
          >
            <FiChevronLeft size={18} aria-hidden />
            {t('buyerData_passportSourceBack')}
          </button>

          <span className="passport-upload-source__eyebrow">{t('buyerData_passportSourceDrive')}</span>
          <h2 id="passport-upload-source-title" className="passport-upload-source__title">
            {t('buyerData_passportSourceDriveTitle')}
          </h2>
          <p id="passport-upload-source-description" className="passport-upload-source__subtitle">
            {t('buyerData_passportSourceDriveSubtitle')}
          </p>

          {driveFiles.length === 0 ? (
            <div className="passport-upload-source__empty" role="status">
              <SiGoogledrive size={28} aria-hidden />
              <p>{t('buyerData_passportSourceDriveEmpty')}</p>
            </div>
          ) : (
            <ul className="passport-upload-source__grid">
              {driveFiles.map((file) => {
                const thumb = driveThumbnailUrl(file, driveToken)
                const isPicking = pickingFileId === file.id
                return (
                  <li key={file.id}>
                    <button
                      type="button"
                      className="passport-upload-source__file"
                      onClick={() => void handlePickDriveFile(file)}
                      disabled={Boolean(pickingFileId) || busy}
                      aria-label={file.name || t('buyerData_passportSourceDrivePick')}
                    >
                      <span className="passport-upload-source__file-thumb" aria-hidden>
                        {thumb ? (
                          <img src={thumb} alt="" loading="lazy" decoding="async" />
                        ) : (
                          <FiImage size={22} />
                        )}
                        {isPicking ? (
                          <span className="passport-upload-source__file-busy">
                            <FiLoader className="passport-upload-source__spinner" size={20} />
                          </span>
                        ) : null}
                      </span>
                      <span className="passport-upload-source__file-name">{file.name || file.id}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          {nextPageToken ? (
            <button
              type="button"
              className="passport-upload-source__more"
              onClick={() => void handleLoadMore()}
              disabled={driveLoadingMore || Boolean(pickingFileId)}
            >
              {driveLoadingMore ? (
                <FiLoader className="passport-upload-source__spinner" size={18} aria-hidden />
              ) : null}
              {t('buyerData_passportSourceDriveMore')}
            </button>
          ) : null}

          {driveError ? (
            <p className="passport-upload-source__error" role="alert">
              {driveError}
            </p>
          ) : null}
        </div>
      )}
    </BuyerSheetShell>
  )
}

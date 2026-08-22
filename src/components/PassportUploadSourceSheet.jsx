import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FiChevronLeft, FiChevronRight, FiImage, FiLoader } from 'react-icons/fi'
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

export default function PassportUploadSourceSheet({
  isOpen,
  onClose,
  onPickDevice,
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

  const resetDriveState = useCallback(() => {
    setView('choice')
    setDriveToken('')
    setDriveFiles([])
    setNextPageToken(null)
    setDriveLoading(false)
    setDriveLoadingMore(false)
    setPickingFileId('')
    setDriveError('')
  }, [])

  useEffect(() => {
    if (!isOpen) resetDriveState()
  }, [isOpen, resetDriveState])

  const handleClose = useCallback(() => {
    if (busy || pickingFileId) return
    onClose?.()
  }, [busy, pickingFileId, onClose])

  const handleDevice = useCallback(() => {
    if (busy) return
    onClose?.()
    window.requestAnimationFrame(() => onPickDevice?.())
  }, [busy, onClose, onPickDevice])

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
      dismissible={!busy && !pickingFileId}
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
              onClick={handleDevice}
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

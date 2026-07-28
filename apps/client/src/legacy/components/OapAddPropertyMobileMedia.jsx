import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import {
  Camera,
  HardDrive,
  ImagePlus,
  Images,
  Video,
  X,
  Youtube,
  Clapperboard,
} from 'lucide-react'
import { useDrawerDismiss, DRAWER_DISMISS_MS } from '../hooks/useDrawerDismiss'
import { useBottomSheetDrag } from '../hooks/useBottomSheetDrag'
import { getYouTubeVideoId, getGoogleDriveVideoId } from '../utils/oapVideoHelpers'
import '../styles/drawerDismiss.css'
import './OapAddPropertyMobileMedia.css'

const MAX_PHOTO_SIZE = 10 * 1024 * 1024
const MAX_PHOTOS = 10
const MAX_VIDEOS = 3
const MAX_VIDEO_DURATION = 60

function getDriveThumbnailUrl(fileId) {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`
}

export default function OapAddPropertyMobileMedia({
  photos,
  videos,
  onAddPhotos,
  onRemovePhoto,
  onAddVideo,
  onRemoveVideo,
  onAddPhotoLink,
}) {
  const { t } = useTranslation()
  const galleryInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  const videoRecordInputRef = useRef(null)

  const [notice, setNotice] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerTab, setDrawerTab] = useState('photo')
  const [linkMode, setLinkMode] = useState(null)
  const [linkValue, setLinkValue] = useState('')
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 901px)').matches
  )

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 901px)')
    const onChange = () => setIsDesktop(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const { visible, isClosing, requestClose } = useDrawerDismiss(drawerOpen, () => {
    setDrawerOpen(false)
    setLinkMode(null)
    setLinkValue('')
  })

  const {
    panelRef,
    isDragging,
    panelDragStyle,
    isCollapsed,
    closingPanel,
    onDragZonePointerDown,
    onDragZonePointerMove,
    onDragZonePointerUp,
    onDragZonePointerCancel,
  } = useBottomSheetDrag({
    isOpen: drawerOpen && !isDesktop,
    visible,
    isClosing,
    requestClose,
    panelClosingClass: 'oap-mobile-media-drawer__panel--closing',
    maxViewportHeightRatio: 0.72,
  })

  const showNotice = useCallback((message) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 4000)
  }, [])

  const openDrawer = useCallback((tab = 'photo') => {
    setDrawerTab(tab)
    setLinkMode(null)
    setLinkValue('')
    setDrawerOpen(true)
  }, [])

  const closeDrawer = useCallback(() => {
    requestClose()
  }, [requestClose])

  const handlePhotoFiles = useCallback(
    (files) => {
      const valid = Array.from(files).filter(
        (f) =>
          (f.type === 'image/jpeg' || f.type === 'image/png') && f.size <= MAX_PHOTO_SIZE
      )
      const invalidCount = Array.from(files).length - valid.length
      if (invalidCount > 0) showNotice(t('oap_mediaPhotosSkipped'))
      if (photos.length >= MAX_PHOTOS) {
        showNotice(t('oap_mediaMaxPhotos', { count: MAX_PHOTOS }))
        return
      }
      const remaining = MAX_PHOTOS - photos.length
      if (valid.length > remaining) {
        showNotice(
          t('oap_mediaPhotosAddedPartial', {
            added: remaining,
            total: valid.length,
            max: MAX_PHOTOS,
          })
        )
      }
      if (valid.length > 0) {
        onAddPhotos(valid.slice(0, remaining))
        closeDrawer()
      }
    },
    [photos.length, onAddPhotos, showNotice, t, closeDrawer]
  )

  const handleVideoUpload = useCallback(
    (e) => {
      const files = Array.from(e.target.files || [])
      const remainingSlots = MAX_VIDEOS - videos.length

      if (files.length > remainingSlots) {
        showNotice(t('oap_mediaVideosRemaining', { count: remainingSlots }))
        e.target.value = ''
        return
      }

      files.forEach((file) => {
        if (!file.type.startsWith('video/')) {
          showNotice(t('oap_mediaNotVideoFile', { name: file.name }))
          return
        }

        const videoEl = document.createElement('video')
        videoEl.preload = 'metadata'
        const objectUrl = URL.createObjectURL(file)

        videoEl.onloadedmetadata = () => {
          URL.revokeObjectURL(objectUrl)
          const duration = videoEl.duration

          if (duration > MAX_VIDEO_DURATION) {
            showNotice(
              t('oap_mediaVideoTooLong', {
                name: file.name,
                seconds: Math.round(duration),
              })
            )
            return
          }

          const reader = new FileReader()
          reader.onloadend = () => {
            onAddVideo({
              id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
              type: 'file',
              url: reader.result,
              file,
              duration,
            })
            closeDrawer()
          }
          reader.onerror = () => showNotice(t('oap_fileReadError', { name: file.name }))
          reader.readAsDataURL(file)
        }

        videoEl.onerror = () => {
          URL.revokeObjectURL(objectUrl)
          showNotice(t('oap_mediaReadVideoError', { name: file.name }))
        }

        videoEl.src = objectUrl
      })

      e.target.value = ''
    },
    [videos.length, onAddVideo, showNotice, t, closeDrawer]
  )

  const handleLinkSubmit = useCallback(() => {
    const url = linkValue.trim()
    if (!url) {
      showNotice(t('oap_mediaEnterVideoLink'))
      return
    }

    if (linkMode === 'photo-gdrive') {
      const fileId = getGoogleDriveVideoId(url)
      if (!fileId) {
        showNotice(t('oap_mediaInvalidGdrive'))
        return
      }
      if (photos.length >= MAX_PHOTOS) {
        showNotice(t('oap_mediaMaxPhotos', { count: MAX_PHOTOS }))
        return
      }
      const added = onAddPhotoLink?.({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        preview: getDriveThumbnailUrl(fileId),
        driveUrl: url,
        driveFileId: fileId,
      })
      if (added === false) {
        showNotice(t('oap_mediaInvalidGdrive'))
        return
      }
      closeDrawer()
      return
    }

    if (videos.length >= MAX_VIDEOS) {
      showNotice(t('oap_mediaMaxVideos', { count: MAX_VIDEOS }))
      return
    }

    const youtubeId = getYouTubeVideoId(url)
    const googleDriveId = getGoogleDriveVideoId(url)

    if (linkMode === 'youtube' && youtubeId) {
      onAddVideo({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type: 'youtube',
        url,
        videoId: youtubeId,
        thumbnail: `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`,
      })
      closeDrawer()
      return
    }

    if (linkMode === 'video-gdrive' && googleDriveId) {
      onAddVideo({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type: 'googledrive',
        url,
        videoId: googleDriveId,
        embedUrl: `https://drive.google.com/file/d/${googleDriveId}/preview`,
      })
      closeDrawer()
      return
    }

    if (linkMode === 'youtube') showNotice(t('oap_mediaInvalidYoutube'))
    else showNotice(t('oap_mediaInvalidGdrive'))
  }, [
    linkValue,
    linkMode,
    photos.length,
    videos.length,
    onAddPhotoLink,
    onAddVideo,
    showNotice,
    t,
    closeDrawer,
  ])

  const photosFull = photos.length >= MAX_PHOTOS
  const videosFull = videos.length >= MAX_VIDEOS

  const renderDrawerContent = () => {
    if (linkMode) {
      const isPhoto = linkMode === 'photo-gdrive'
      const isYoutube = linkMode === 'youtube'
      return (
        <div className="oap-mobile-media-drawer__link-view">
          <button
            type="button"
            className="oap-mobile-media-drawer__back"
            onClick={() => {
              setLinkMode(null)
              setLinkValue('')
            }}
          >
            {t('oap_publishBack')}
          </button>
          <h3 className="oap-mobile-media-drawer__link-title">
            {isPhoto
              ? t('oap_journeyMediaPhotoGdrive')
              : isYoutube
                ? t('oap_journeyMediaVideoYoutube')
                : t('oap_journeyMediaVideoGdrive')}
          </h3>
          <p className="oap-mobile-media-drawer__link-hint">
            {isPhoto ? t('oap_mediaGdriveHint') : isYoutube ? t('oap_mediaYoutubeHint') : t('oap_mediaGdriveHint')}
          </p>
          <input
            type="url"
            className="oap-mobile-media-drawer__link-input"
            placeholder={
              isYoutube
                ? 'https://youtube.com/watch?v=...'
                : 'https://drive.google.com/file/d/...'
            }
            value={linkValue}
            onChange={(e) => setLinkValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLinkSubmit()}
          />
          <button type="button" className="oap-mobile-media-drawer__link-submit" onClick={handleLinkSubmit}>
            {t('oap_add')}
          </button>
        </div>
      )
    }

    return (
      <>
        <div className="oap-mobile-media-drawer__tabs" role="tablist" aria-label={t('oap_journeyMediaDrawerTabsAria')}>
          <button
            type="button"
            role="tab"
            aria-selected={drawerTab === 'photo'}
            className={`oap-mobile-media-drawer__tab${drawerTab === 'photo' ? ' oap-mobile-media-drawer__tab--active' : ''}`}
            onClick={() => setDrawerTab('photo')}
          >
            {t('oap_journeyMediaTabPhoto')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={drawerTab === 'video'}
            className={`oap-mobile-media-drawer__tab${drawerTab === 'video' ? ' oap-mobile-media-drawer__tab--active' : ''}`}
            onClick={() => setDrawerTab('video')}
          >
            {t('oap_journeyMediaTabVideo')}
          </button>
        </div>

        {drawerTab === 'photo' ? (
          <div className="oap-mobile-media-drawer__actions" role="group" aria-label={t('oap_journeyMediaTabPhoto')}>
            <button
              type="button"
              className="oap-mobile-media-drawer__action"
              disabled={photosFull}
              onClick={() => galleryInputRef.current?.click()}
            >
              <span className="oap-mobile-media-drawer__action-icon oap-mobile-media-drawer__action-icon--gallery" aria-hidden>
                <Images size={22} strokeWidth={1.85} />
              </span>
              <span className="oap-mobile-media-drawer__action-text">{t('oap_journeyMediaFromGallery')}</span>
            </button>
            <button
              type="button"
              className="oap-mobile-media-drawer__action"
              disabled={photosFull}
              onClick={() => cameraInputRef.current?.click()}
            >
              <span className="oap-mobile-media-drawer__action-icon oap-mobile-media-drawer__action-icon--camera" aria-hidden>
                <Camera size={22} strokeWidth={1.85} />
              </span>
              <span className="oap-mobile-media-drawer__action-text">{t('oap_journeyMediaTakePhoto')}</span>
            </button>
            <button
              type="button"
              className="oap-mobile-media-drawer__action"
              disabled={photosFull}
              onClick={() => {
                setLinkMode('photo-gdrive')
                setLinkValue('')
              }}
            >
              <span className="oap-mobile-media-drawer__action-icon oap-mobile-media-drawer__action-icon--drive" aria-hidden>
                <HardDrive size={22} strokeWidth={1.85} />
              </span>
              <span className="oap-mobile-media-drawer__action-text">{t('oap_journeyMediaPhotoGdrive')}</span>
            </button>
          </div>
        ) : (
          <div className="oap-mobile-media-drawer__actions" role="group" aria-label={t('oap_journeyMediaTabVideo')}>
            <button
              type="button"
              className="oap-mobile-media-drawer__action"
              disabled={videosFull}
              onClick={() => {
                setLinkMode('youtube')
                setLinkValue('')
              }}
            >
              <span className="oap-mobile-media-drawer__action-icon oap-mobile-media-drawer__action-icon--youtube" aria-hidden>
                <Youtube size={22} strokeWidth={1.85} />
              </span>
              <span className="oap-mobile-media-drawer__action-text">{t('oap_journeyMediaVideoYoutube')}</span>
            </button>
            <button
              type="button"
              className="oap-mobile-media-drawer__action"
              disabled={videosFull}
              onClick={() => {
                setLinkMode('video-gdrive')
                setLinkValue('')
              }}
            >
              <span className="oap-mobile-media-drawer__action-icon oap-mobile-media-drawer__action-icon--drive" aria-hidden>
                <HardDrive size={22} strokeWidth={1.85} />
              </span>
              <span className="oap-mobile-media-drawer__action-text">{t('oap_journeyMediaVideoGdrive')}</span>
            </button>
            <button
              type="button"
              className="oap-mobile-media-drawer__action"
              disabled={videosFull}
              onClick={() => videoRecordInputRef.current?.click()}
            >
              <span className="oap-mobile-media-drawer__action-icon oap-mobile-media-drawer__action-icon--record" aria-hidden>
                <Clapperboard size={22} strokeWidth={1.85} />
              </span>
              <span className="oap-mobile-media-drawer__action-text">
                {t('oap_journeyMediaRecordVideo')}
                <span className="oap-mobile-media-drawer__action-sub">{t('oap_journeyMediaRecordVideoHint')}</span>
              </span>
            </button>
          </div>
        )}
      </>
    )
  }

  const drawerPortal =
    visible && typeof document !== 'undefined'
      ? createPortal(
          <>
            <div
              role="presentation"
              className={`oap-mobile-media-drawer__backdrop${isClosing ? ' drawer-dismiss-backdrop--closing' : ''}`}
              onClick={closeDrawer}
            />
            <div
              className={`oap-mobile-media-drawer${isDesktop ? ' oap-mobile-media-drawer--modal' : ''}${isDragging ? ' oap-mobile-media-drawer--dragging' : ''}`}
              role="dialog"
              aria-modal="true"
              aria-labelledby="oap-mobile-media-drawer-title"
            >
              <div
                ref={panelRef}
                className={`oap-mobile-media-drawer__panel${closingPanel}${isCollapsed ? ' oap-mobile-media-drawer__panel--collapsed' : ''}${isClosing ? (isDesktop ? ' drawer-dismiss-modal--closing' : ' drawer-dismiss-from-bottom--closing drawer-dismiss-modal--closing') : ''}`}
                style={isDesktop ? undefined : panelDragStyle}
              >
                {!isDesktop ? (
                  <div
                    className="oap-mobile-media-drawer__drag-zone"
                    onPointerDown={onDragZonePointerDown}
                    onPointerMove={onDragZonePointerMove}
                    onPointerUp={onDragZonePointerUp}
                    onPointerCancel={onDragZonePointerCancel}
                  >
                    <div className="oap-mobile-media-drawer__handle" aria-hidden>
                      <span className="oap-mobile-media-drawer__handle-pill" />
                    </div>
                  </div>
                ) : null}
                <button
                  type="button"
                  className="oap-mobile-media-drawer__close"
                  onClick={closeDrawer}
                  aria-label={t('oap_publishClose')}
                >
                  <X size={20} />
                </button>
                {!linkMode ? (
                  <h2 id="oap-mobile-media-drawer-title" className="oap-mobile-media-drawer__title">
                    {t('oap_journeyMediaDrawerTitle')}
                  </h2>
                ) : null}
                <div className="oap-mobile-media-drawer__body">{renderDrawerContent()}</div>
              </div>
            </div>
          </>,
          document.body
        )
      : null

  return (
    <div className="oap-mobile-media">
      <h2 className="oap-mobile-media__title">{t('oap_journeyMediaTitle')}</h2>

      {notice ? (
        <p className="oap-mobile-media__notice" role="status">
          {notice}
        </p>
      ) : null}

      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/png"
        multiple
        className="oap-mobile-media__file-input"
        onChange={(e) => {
          if (e.target.files?.length) handlePhotoFiles(e.target.files)
          e.target.value = ''
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png"
        capture="environment"
        className="oap-mobile-media__file-input"
        onChange={(e) => {
          if (e.target.files?.length) handlePhotoFiles(e.target.files)
          e.target.value = ''
        }}
      />
      <input
        ref={videoRecordInputRef}
        type="file"
        accept="video/*"
        capture="environment"
        className="oap-mobile-media__file-input"
        onChange={handleVideoUpload}
      />

      <div className="oap-mobile-media__photos">
        {photos.length === 0 ? (
          <button
            type="button"
            className={`oap-mobile-media__add-card${photosFull ? ' oap-mobile-media__add-card--disabled' : ''}`}
            onClick={() => openDrawer('photo')}
            disabled={photosFull}
          >
            <span className="oap-mobile-media__add-card-body">
              <span className="oap-mobile-media__add-card-title">{t('oap_journeyMediaAddCard')}</span>
              <span className="oap-mobile-media__add-card-hint">{t('oap_journeyMediaAddCardHint')}</span>
            </span>
            <span className="oap-mobile-media__add-card-icon" aria-hidden>
              <ImagePlus size={32} strokeWidth={1.75} />
            </span>
          </button>
        ) : (
          <div className="oap-mobile-media__strip" role="list" aria-label={t('oap_journeyMediaAddCard')}>
            {!photosFull ? (
              <button
                type="button"
                className="oap-mobile-media__strip-item oap-mobile-media__add-tile"
                onClick={() => openDrawer('photo')}
                aria-label={t('oap_journeyMediaAddCard')}
              >
                <ImagePlus size={24} strokeWidth={1.75} aria-hidden />
              </button>
            ) : null}
            {photos.map((photo) => (
              <div key={photo.id} className="oap-mobile-media__strip-item oap-mobile-media__tile" role="listitem">
                <img src={photo.preview} alt="" />
                <button
                  type="button"
                  className="oap-mobile-media__remove"
                  aria-label={t('oap_mediaRemovePhoto')}
                  onClick={() => onRemovePhoto(photo.id)}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="oap-mobile-media__videos">
        <h3 className="oap-mobile-media__videos-title">{t('oap_journeyMediaVideosTitle')}</h3>

        {videos.length === 0 ? (
          <button
            type="button"
            className={`oap-mobile-media__add-card oap-mobile-media__add-card--video${videosFull ? ' oap-mobile-media__add-card--disabled' : ''}`}
            onClick={() => openDrawer('video')}
            disabled={videosFull}
          >
            <span className="oap-mobile-media__add-card-body">
              <span className="oap-mobile-media__add-card-title">{t('oap_journeyMediaVideoEmpty')}</span>
              <span className="oap-mobile-media__add-card-hint">{t('oap_journeyMediaAddCardHint')}</span>
            </span>
            <span className="oap-mobile-media__add-card-icon oap-mobile-media__add-card-icon--video" aria-hidden>
              <Video size={28} strokeWidth={1.75} />
            </span>
          </button>
        ) : (
          <div className="oap-mobile-media__strip" role="list" aria-label={t('oap_journeyMediaVideoEmpty')}>
            {!videosFull ? (
              <button
                type="button"
                className="oap-mobile-media__strip-item oap-mobile-media__add-tile oap-mobile-media__add-tile--video"
                onClick={() => openDrawer('video')}
                aria-label={t('oap_journeyMediaVideoEmpty')}
              >
                <Video size={22} strokeWidth={1.75} aria-hidden />
              </button>
            ) : null}
            {videos.map((video) => (
              <div
                key={video.id}
                className="oap-mobile-media__strip-item oap-mobile-media__tile oap-mobile-media__tile--video"
                role="listitem"
              >
                {video.type === 'file' ? (
                  <video src={video.url} controls preload="metadata" />
                ) : video.type === 'youtube' && video.thumbnail ? (
                  <img src={video.thumbnail} alt="" />
                ) : (
                  <div className="oap-mobile-media__video-placeholder">
                    <Video size={22} aria-hidden />
                    <span>{video.type === 'youtube' ? 'YouTube' : 'Google Drive'}</span>
                  </div>
                )}
                <span className="oap-mobile-media__video-badge">{t('oap_mediaVideoBadge')}</span>
                <button
                  type="button"
                  className="oap-mobile-media__remove"
                  aria-label={t('oap_mediaRemoveVideo')}
                  onClick={() => onRemoveVideo(video.id)}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {drawerPortal}
    </div>
  )
}

import { useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Camera, Upload, Video, X, ImagePlus, Youtube, HardDrive, Plus, AlertTriangle, Sparkles } from 'lucide-react'
import { getYouTubeVideoId, getGoogleDriveVideoId } from '../utils/oapVideoHelpers'

const MAX_PHOTO_SIZE = 10 * 1024 * 1024
const MAX_PHOTOS = 10
const MAX_VIDEOS = 3
const MAX_VIDEO_DURATION = 60

export default function OwnerAddPropertyMediaStep({
  embedded = false,
  photos,
  videos,
  onAddPhotos,
  onRemovePhoto,
  onAddVideo,
  onRemoveVideo,
}) {
  const { t } = useTranslation()
  const photoInputRef = useRef(null)
  const videoInputRef = useRef(null)

  const [notice, setNotice] = useState('')
  const [showVideoSourceModal, setShowVideoSourceModal] = useState(false)
  const [showVideoLinkModal, setShowVideoLinkModal] = useState(false)
  const [videoLink, setVideoLink] = useState('')
  const [videoLinkType, setVideoLinkType] = useState('youtube')

  const showNotice = useCallback((message) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 4000)
  }, [])

  const handlePhotoFiles = useCallback(
    (files) => {
      const valid = Array.from(files).filter(
        (f) =>
          (f.type === 'image/jpeg' || f.type === 'image/png') && f.size <= MAX_PHOTO_SIZE
      )
      const invalidCount = Array.from(files).length - valid.length
      if (invalidCount > 0) {
        showNotice(t('oap_mediaPhotosSkipped'))
      }
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
      if (valid.length > 0) onAddPhotos(valid.slice(0, remaining))
    },
    [photos.length, onAddPhotos, showNotice, t]
  )

  const openVideoSourceModal = useCallback(() => {
    if (videos.length >= MAX_VIDEOS) {
      showNotice(t('oap_mediaMaxVideos', { count: MAX_VIDEOS }))
      return
    }
    setShowVideoSourceModal(true)
  }, [videos.length, showNotice, t])

  const closeVideoLinkModal = useCallback(() => {
    setShowVideoLinkModal(false)
    setVideoLink('')
    setVideoLinkType('youtube')
  }, [])

  const handleVideoSourceSelect = useCallback((source) => {
    setShowVideoSourceModal(false)
    if (source === 'device') {
      videoInputRef.current?.click()
      return
    }
    if (source === 'youtube' || source === 'googledrive') {
      setVideoLinkType(source)
      setShowVideoLinkModal(true)
    }
  }, [])

  const handleVideoLinkSubmit = useCallback(() => {
    if (!videoLink.trim()) {
      showNotice(t('oap_mediaEnterVideoLink'))
      return
    }

    const youtubeId = getYouTubeVideoId(videoLink)
    const googleDriveId = getGoogleDriveVideoId(videoLink)
    const isYoutubeMode = videoLinkType === 'youtube'
    const isDriveMode = videoLinkType === 'googledrive'

    if ((isYoutubeMode && youtubeId) || (!isDriveMode && youtubeId)) {
      onAddVideo({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type: 'youtube',
        url: videoLink,
        videoId: youtubeId,
        thumbnail: `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`,
      })
      closeVideoLinkModal()
      return
    }

    if ((isDriveMode && googleDriveId) || (!isYoutubeMode && googleDriveId)) {
      onAddVideo({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type: 'googledrive',
        url: videoLink,
        videoId: googleDriveId,
        embedUrl: `https://drive.google.com/file/d/${googleDriveId}/preview`,
      })
      closeVideoLinkModal()
      return
    }

    if (isYoutubeMode) {
      showNotice(t('oap_mediaInvalidYoutube'))
    } else if (isDriveMode) {
      showNotice(t('oap_mediaInvalidGdrive'))
    } else {
      showNotice(t('oap_mediaInvalidVideoLink'))
    }
  }, [videoLink, videoLinkType, onAddVideo, closeVideoLinkModal, showNotice, t])

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
    [videos.length, onAddVideo, showNotice, t]
  )

  const photosFull = photos.length >= MAX_PHOTOS
  const videosFull = videos.length >= MAX_VIDEOS
  const showPhotoWarning = photos.length < 5

  const sectionClassName = `oap-media-step${embedded ? ' oap-media-step--embedded' : ''}${photos.length > 0 ? ' oap-media-step--has-photos' : ''}${videos.length > 0 ? ' oap-media-step--has-videos' : ''}`

  const renderUploadCard = (type) => {
    const isPhoto = type === 'photo'
    const isFull = isPhoto ? photosFull : videosFull
    const onClick = isPhoto ? () => photoInputRef.current?.click() : openVideoSourceModal

    return (
      <button
        type="button"
        className={`oap-media-step__action-card oap-media-step__action-card--${type}${isFull ? ' oap-media-step__action-card--disabled' : ''}`}
        onClick={onClick}
        disabled={isFull}
      >
        <span className="oap-media-step__action-card-icon" aria-hidden>
          {isPhoto ? (
            <ImagePlus size={embedded ? 18 : 22} strokeWidth={1.75} />
          ) : (
            <Video size={embedded ? 18 : 22} strokeWidth={1.75} />
          )}
        </span>
        <span className="oap-media-step__action-card-text">
          <span className="oap-media-step__action-card-title">
            {isPhoto
              ? embedded
                ? t('oap_mediaUploadPhoto')
                : t('oap_mediaAddPhoto')
              : embedded
                ? t('oap_mediaUploadVideo')
                : t('oap_mediaAddVideo')}
          </span>
        </span>
        <Upload size={18} className="oap-media-step__action-card-arrow" aria-hidden />
      </button>
    )
  }

  return (
    <section
      className={sectionClassName}
      aria-labelledby={embedded ? undefined : 'oap-media-step-title'}
    >
      {!embedded && (
        <header className="oap-media-step__head">
          <span className="oap-media-step__badge" aria-hidden>
            <Camera size={22} strokeWidth={1.85} />
          </span>
          <div className="oap-media-step__head-text">
            <h2 id="oap-media-step-title" className="oap-media-step__title">
              {t('oap_presentationMediaTitle')}
            </h2>
            <p className="oap-media-step__subtitle">{t('oap_presentationMediaHint')}</p>
          </div>
        </header>
      )}

      {notice && (
        <p className="oap-media-step__notice" role="status">
          {notice}
        </p>
      )}

      <div className="oap-media-step__card">
        <input
          ref={photoInputRef}
          type="file"
          accept="image/jpeg,image/png"
          multiple
          className="oap-media-step__file-input"
          onChange={(e) => {
            if (e.target.files?.length) handlePhotoFiles(e.target.files)
            e.target.value = ''
          }}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          multiple
          className="oap-media-step__file-input"
          onChange={handleVideoUpload}
        />

        <div className="oap-media-step__sections">
          <div className="oap-media-step__section oap-media-step__section--photos">
            {showPhotoWarning && (
              <div className="oap-media-step__photo-tip" role="status">
                <span className="oap-media-step__photo-tip-icon" aria-hidden>
                  <AlertTriangle size={18} strokeWidth={2} />
                </span>
                <div className="oap-media-step__photo-tip-body">
                  <span className="oap-media-step__photo-tip-title">{t('oap_mediaPhotoTipTitle')}</span>
                  <span
                    className="oap-media-step__photo-tip-text"
                    dangerouslySetInnerHTML={{ __html: t('oap_mediaPhotoTipText') }}
                  />
                </div>
              </div>
            )}

            <div className="oap-media-step__media-row">
              <div className="oap-media-step__section-upload">{renderUploadCard('photo')}</div>

              {photos.length > 0 && (
                <div className="oap-media-step__gallery">
                  <div className="oap-media-step__grid">
                    {photos.map((photo) => (
                      <div key={photo.id} className="oap-media-step__tile">
                        <img src={photo.preview} alt="" />
                        <button
                          type="button"
                          className="oap-media-step__remove"
                          aria-label={t('oap_mediaRemovePhoto')}
                          onClick={() => onRemovePhoto(photo.id)}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                    {!photosFull && (
                      <button
                        type="button"
                        className="oap-media-step__add-more"
                        aria-label={t('oap_mediaAddMorePhotos')}
                        onClick={() => photoInputRef.current?.click()}
                      >
                        <span className="oap-media-step__add-more-icon" aria-hidden>
                          <Plus size={18} strokeWidth={2.5} />
                        </span>
                        <span className="oap-media-step__add-more-label-full">{t('oap_mediaAddMore')}</span>
                        <span className="oap-media-step__add-more-label-short">{t('oap_mediaAddShort')}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {photos.length === 0 && !embedded && (
              <div className="oap-media-step__empty oap-media-step__empty--photos">
                <span className="oap-media-step__empty-icon" aria-hidden>
                  <Camera size={28} strokeWidth={1.5} />
                </span>
                <p className="oap-media-step__empty-title">{t('oap_mediaNoPhotosTitle')}</p>
                <p className="oap-media-step__empty-desc">{t('oap_mediaNoPhotosDesc')}</p>
              </div>
            )}
          </div>

          <div className="oap-media-step__section oap-media-step__section--videos">
            <div className="oap-media-step__video-tip" role="status">
              <span className="oap-media-step__video-tip-icon" aria-hidden>
                <Sparkles size={18} strokeWidth={2} />
              </span>
              <div className="oap-media-step__video-tip-body">
                <span
                  className="oap-media-step__video-tip-text"
                  dangerouslySetInnerHTML={{ __html: t('oap_mediaVideoTip') }}
                />
              </div>
            </div>

            <div className="oap-media-step__media-row">
              <div className="oap-media-step__section-upload">{renderUploadCard('video')}</div>

              {videos.length > 0 && (
                <div className="oap-media-step__gallery">
                  <div className="oap-media-step__grid">
                    {videos.map((video) => (
                      <div key={video.id} className="oap-media-step__tile oap-media-step__tile--video">
                        {video.type === 'file' ? (
                          <video src={video.url} controls preload="metadata" />
                        ) : video.type === 'youtube' && video.thumbnail ? (
                          <img src={video.thumbnail} alt="" />
                        ) : (
                          <div className="oap-media-step__video-placeholder">
                            <Video size={22} aria-hidden />
                            <span>{video.type === 'youtube' ? 'YouTube' : 'Google Drive'}</span>
                          </div>
                        )}
                        <span className="oap-media-step__video-badge">{t('oap_mediaVideoBadge')}</span>
                        <button
                          type="button"
                          className="oap-media-step__remove"
                          aria-label={t('oap_mediaRemoveVideo')}
                          onClick={() => onRemoveVideo(video.id)}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                    {!videosFull && (
                      <button
                        type="button"
                        className="oap-media-step__add-more oap-media-step__add-more--video"
                        aria-label={t('oap_mediaAddMoreVideos')}
                        onClick={openVideoSourceModal}
                      >
                        <span className="oap-media-step__add-more-icon" aria-hidden>
                          <Plus size={18} strokeWidth={2.5} />
                        </span>
                        <span className="oap-media-step__add-more-label-full">{t('oap_mediaAddMore')}</span>
                        <span className="oap-media-step__add-more-label-short">{t('oap_mediaAddShort')}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showVideoSourceModal && (
        <div
          className="oap-media-modal-overlay"
          role="presentation"
          onClick={() => setShowVideoSourceModal(false)}
        >
          <div
            className="oap-media-modal"
            role="dialog"
            aria-labelledby="oap-video-source-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="oap-media-modal__close"
              aria-label={t('oap_publishClose')}
              onClick={() => setShowVideoSourceModal(false)}
            >
              <X size={20} />
            </button>
            <h3 id="oap-video-source-title" className="oap-media-modal__title">
              {t('oap_mediaVideoSourceTitle')}
            </h3>
            <p className="oap-media-modal__subtitle">{t('oap_mediaVideoSourceSubtitle')}</p>
            <div className="oap-media-modal__actions">
              <button
                type="button"
                className="oap-media-modal__source"
                onClick={() => handleVideoSourceSelect('device')}
              >
                <Upload size={20} aria-hidden />
                {t('oap_mediaFromDevice')}
              </button>
              <button
                type="button"
                className="oap-media-modal__source"
                onClick={() => handleVideoSourceSelect('youtube')}
              >
                <Youtube size={20} aria-hidden />
                YouTube
              </button>
              <button
                type="button"
                className="oap-media-modal__source"
                onClick={() => handleVideoSourceSelect('googledrive')}
              >
                <HardDrive size={20} aria-hidden />
                Google Drive
              </button>
            </div>
          </div>
        </div>
      )}

      {showVideoLinkModal && (
        <div
          className="oap-media-modal-overlay"
          role="presentation"
          onClick={closeVideoLinkModal}
        >
          <div
            className="oap-media-modal oap-media-modal--link"
            role="dialog"
            aria-labelledby="oap-video-link-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="oap-media-modal__close"
              aria-label={t('oap_publishClose')}
              onClick={closeVideoLinkModal}
            >
              <X size={20} />
            </button>
            <h3 id="oap-video-link-title" className="oap-media-modal__title">
              {videoLinkType === 'youtube' ? t('oap_mediaYoutubeLink') : t('oap_mediaGdriveLink')}
            </h3>
            <p className="oap-media-modal__subtitle">
              {videoLinkType === 'youtube' ? t('oap_mediaYoutubeHint') : t('oap_mediaGdriveHint')}
            </p>
            <input
              type="url"
              className="oap-media-modal__input"
              placeholder={
                videoLinkType === 'youtube'
                  ? 'https://youtube.com/watch?v=...'
                  : 'https://drive.google.com/file/d/...'
              }
              value={videoLink}
              onChange={(e) => setVideoLink(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleVideoLinkSubmit()}
            />
            <div className="oap-media-modal__footer">
              <button type="button" className="oap-media-modal__cancel" onClick={closeVideoLinkModal}>
                {t('oap_cancel')}
              </button>
              <button type="button" className="oap-media-modal__submit" onClick={handleVideoLinkSubmit}>
                {t('oap_add')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

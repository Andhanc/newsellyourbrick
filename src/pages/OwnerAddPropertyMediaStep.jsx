import { useState, useRef, useCallback } from 'react'
import { Camera, Upload, Video, X, ImagePlus, Youtube, HardDrive, Film } from 'lucide-react'
import { getYouTubeVideoId, getGoogleDriveVideoId } from '../utils/oapVideoHelpers'

const MAX_PHOTO_SIZE = 10 * 1024 * 1024
const MAX_PHOTOS = 10
const MAX_VIDEOS = 3
const MAX_VIDEO_DURATION = 60

export default function OwnerAddPropertyMediaStep({
  photos,
  videos,
  onAddPhotos,
  onRemovePhoto,
  onAddVideo,
  onRemoveVideo,
}) {
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
        showNotice('Некоторые файлы пропущены: только JPG или PNG до 10 МБ')
      }
      if (photos.length >= MAX_PHOTOS) {
        showNotice(`Можно загрузить максимум ${MAX_PHOTOS} фото`)
        return
      }
      const remaining = MAX_PHOTOS - photos.length
      if (valid.length > remaining) {
        showNotice(`Добавлено ${remaining} из ${valid.length} — лимит ${MAX_PHOTOS} фото`)
      }
      if (valid.length > 0) onAddPhotos(valid.slice(0, remaining))
    },
    [photos.length, onAddPhotos, showNotice]
  )

  const openVideoSourceModal = useCallback(() => {
    if (videos.length >= MAX_VIDEOS) {
      showNotice(`Можно загрузить максимум ${MAX_VIDEOS} видео`)
      return
    }
    setShowVideoSourceModal(true)
  }, [videos.length, showNotice])

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
      showNotice('Введите ссылку на видео')
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
      showNotice('Введите корректную ссылку на YouTube')
    } else if (isDriveMode) {
      showNotice('Введите корректную ссылку на Google Drive')
    } else {
      showNotice('Введите корректную ссылку на YouTube или Google Drive')
    }
  }, [videoLink, videoLinkType, onAddVideo, closeVideoLinkModal, showNotice])

  const handleVideoUpload = useCallback(
    (e) => {
      const files = Array.from(e.target.files || [])
      const remainingSlots = MAX_VIDEOS - videos.length

      if (files.length > remainingSlots) {
        showNotice(`Можно загрузить ещё ${remainingSlots} видео`)
        e.target.value = ''
        return
      }

      files.forEach((file) => {
        if (!file.type.startsWith('video/')) {
          showNotice(`«${file.name}» не является видеофайлом`)
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
              `«${file.name}» длиннее 1 минуты (${Math.round(duration)} сек.) — загрузите короче`
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
          reader.onerror = () => showNotice(`Не удалось прочитать «${file.name}»`)
          reader.readAsDataURL(file)
        }

        videoEl.onerror = () => {
          URL.revokeObjectURL(objectUrl)
          showNotice(`Не удалось прочитать видео «${file.name}»`)
        }

        videoEl.src = objectUrl
      })

      e.target.value = ''
    },
    [videos.length, onAddVideo, showNotice]
  )

  const hasMedia = photos.length > 0 || videos.length > 0
  const photosFull = photos.length >= MAX_PHOTOS
  const videosFull = videos.length >= MAX_VIDEOS

  return (
    <section className="oap-media-step" aria-labelledby="oap-media-step-title">
      <header className="oap-media-step__head">
        <span className="oap-media-step__badge" aria-hidden>
          <Camera size={22} strokeWidth={1.85} />
        </span>
        <div className="oap-media-step__head-text">
          <h2 id="oap-media-step-title" className="oap-media-step__title">
            Фото и видео
          </h2>
          <p className="oap-media-step__subtitle">
            Светлые кадры разных ракурсов и короткое видео — объявление выглядит убедительнее в
            каталоге
          </p>
        </div>
      </header>

      {notice && (
        <p className="oap-media-step__notice" role="status">
          {notice}
        </p>
      )}

      <div className="oap-media-step__card">
        <div className="oap-media-step__pills">
          <span className={`oap-media-step__pill${photos.length > 0 ? ' oap-media-step__pill--active' : ''}`}>
            <ImagePlus size={14} aria-hidden />
            Фото {photos.length}/{MAX_PHOTOS}
          </span>
          <span className={`oap-media-step__pill${videos.length > 0 ? ' oap-media-step__pill--active' : ''}`}>
            <Film size={14} aria-hidden />
            Видео {videos.length}/{MAX_VIDEOS}
          </span>
        </div>

        <div className="oap-media-step__action-cards">
          <button
            type="button"
            className={`oap-media-step__action-card oap-media-step__action-card--photo${photosFull ? ' oap-media-step__action-card--disabled' : ''}`}
            onClick={() => photoInputRef.current?.click()}
            disabled={photosFull}
          >
            <span className="oap-media-step__action-card-icon" aria-hidden>
              <ImagePlus size={22} strokeWidth={1.75} />
            </span>
            <span className="oap-media-step__action-card-text">
              <span className="oap-media-step__action-card-title">Добавить фото</span>
              <span className="oap-media-step__action-card-desc">JPG или PNG, до 10 МБ</span>
            </span>
            <Upload size={18} className="oap-media-step__action-card-arrow" aria-hidden />
          </button>

          <button
            type="button"
            className={`oap-media-step__action-card oap-media-step__action-card--video${videosFull ? ' oap-media-step__action-card--disabled' : ''}`}
            onClick={openVideoSourceModal}
            disabled={videosFull}
          >
            <span className="oap-media-step__action-card-icon" aria-hidden>
              <Video size={22} strokeWidth={1.75} />
            </span>
            <span className="oap-media-step__action-card-text">
              <span className="oap-media-step__action-card-title">Добавить видео</span>
              <span className="oap-media-step__action-card-desc">Файл, YouTube или Drive · до 1 мин</span>
            </span>
            <Upload size={18} className="oap-media-step__action-card-arrow" aria-hidden />
          </button>
        </div>

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

        {hasMedia ? (
          <div className="oap-media-step__gallery">
            <h3 className="oap-media-step__gallery-title">Загруженные файлы</h3>
            <div className="oap-media-step__grid">
              {photos.map((photo) => (
                <div key={photo.id} className="oap-media-step__tile">
                  <img src={photo.preview} alt="" />
                  <button
                    type="button"
                    className="oap-media-step__remove"
                    aria-label="Удалить фото"
                    onClick={() => onRemovePhoto(photo.id)}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
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
                  <span className="oap-media-step__video-badge">Видео</span>
                  <button
                    type="button"
                    className="oap-media-step__remove"
                    aria-label="Удалить видео"
                    onClick={() => onRemoveVideo(video.id)}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="oap-media-step__empty">
            <span className="oap-media-step__empty-icon" aria-hidden>
              <Camera size={28} strokeWidth={1.5} />
            </span>
            <p className="oap-media-step__empty-title">Пока нет фото и видео</p>
            <p className="oap-media-step__empty-desc">
              Начните с фасада, гостиной, кухни и вида из окна — так покупатель быстрее
              представит объект
            </p>
          </div>
        )}

        <p className="oap-media-step__tip">
          Минимум 5 качественных фото заметно повышают отклик. Видео — до 1 минуты, спокойный
          обход по комнатам.
        </p>
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
              aria-label="Закрыть"
              onClick={() => setShowVideoSourceModal(false)}
            >
              <X size={20} />
            </button>
            <h3 id="oap-video-source-title" className="oap-media-modal__title">
              Выберите источник видео
            </h3>
            <p className="oap-media-modal__subtitle">Добавьте видео одним из трёх способов</p>
            <div className="oap-media-modal__actions">
              <button
                type="button"
                className="oap-media-modal__source"
                onClick={() => handleVideoSourceSelect('device')}
              >
                <Upload size={20} aria-hidden />
                С устройства
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
              aria-label="Закрыть"
              onClick={closeVideoLinkModal}
            >
              <X size={20} />
            </button>
            <h3 id="oap-video-link-title" className="oap-media-modal__title">
              {videoLinkType === 'youtube' ? 'Ссылка на YouTube' : 'Ссылка на Google Drive'}
            </h3>
            <p className="oap-media-modal__subtitle">
              {videoLinkType === 'youtube'
                ? 'Вставьте ссылку на ролик с YouTube'
                : 'Вставьте ссылку на файл в Google Drive'}
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
                Отмена
              </button>
              <button type="button" className="oap-media-modal__submit" onClick={handleVideoLinkSubmit}>
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

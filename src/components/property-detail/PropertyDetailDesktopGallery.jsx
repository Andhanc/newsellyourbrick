import { FiChevronLeft, FiChevronRight, FiPlay } from 'react-icons/fi'
import './PropertyDetailDesktopGallery.css'

/**
 * @param {{
 *   media: Array<{ type?: string, url?: string, thumbnail?: string, videoType?: string, videoId?: string }>
 *   currentIndex: number
 *   title: string
 *   onSelect: (index: number) => void
 *   onPrev: () => void
 *   onNext: () => void
 *   getYouTubeEmbedUrl?: (url: string) => string
 *   getGoogleDriveEmbedUrl?: (url: string) => string
 *   reserved?: boolean
 *   reservedLabel?: string
 *   actions?: import('react').ReactNode
 *   badge?: string
 * }} props
 */
export default function PropertyDetailDesktopGallery({
  media = [],
  currentIndex,
  title,
  onSelect,
  onPrev,
  onNext,
  getYouTubeEmbedUrl,
  getGoogleDriveEmbedUrl,
  reserved = false,
  reservedLabel = '',
  actions = null,
  badge = '',
}) {
  if (!media.length) {
    return (
      <div className="pdx-gallery pdx-gallery--empty">
        <p className="pdx-gallery__empty">Нет фотографий</p>
      </div>
    )
  }

  const current = media[currentIndex] || media[0]
  const isVideo = current?.type === 'video'

  const videoSrc = (() => {
    if (!isVideo) return ''
    const url = current.url || ''
    if (current.videoType === 'youtube' && getYouTubeEmbedUrl) {
      return getYouTubeEmbedUrl(current.videoId || url)
    }
    if (current.videoType === 'googledrive' && getGoogleDriveEmbedUrl) {
      return getGoogleDriveEmbedUrl(current.videoId || url)
    }
    return url
  })()

  const thumbSrc = (item) => {
    if (item?.type === 'video') return item.thumbnail || null
    return item?.url || null
  }

  const visibleThumbs = media.slice(0, 6)
  const hiddenThumbCount = Math.max(0, media.length - visibleThumbs.length)

  return (
    <div className="pdx-gallery">
      <div className={`pdx-gallery__stage${reserved ? ' pdx-gallery__stage--reserved' : ''}`}>
        {isVideo ? (
          <div className="pdx-gallery__video">
            <iframe src={videoSrc} title={title} allowFullScreen />
          </div>
        ) : (
          <img src={current?.url} alt={title} className="pdx-gallery__img" />
        )}
        {reserved ? (
          <div className="pdx-gallery__reserved" aria-hidden>
            {reservedLabel}
          </div>
        ) : null}
        {badge ? <span className="pdx-gallery__badge">{badge}</span> : null}
        {actions ? <div className="pdx-gallery__actions">{actions}</div> : null}
        {media.length > 1 ? (
          <>
            <button type="button" className="pdx-gallery__nav pdx-gallery__nav--prev" onClick={onPrev} aria-label="Previous">
              <FiChevronLeft size={22} />
            </button>
            <button type="button" className="pdx-gallery__nav pdx-gallery__nav--next" onClick={onNext} aria-label="Next">
              <FiChevronRight size={22} />
            </button>
            <span className="pdx-gallery__counter">
              {currentIndex + 1} / {media.length}
            </span>
          </>
        ) : null}
      </div>
      {media.length > 1 ? (
        <div className="pdx-gallery__thumbs" role="list">
          {visibleThumbs.map((item, index) => {
            const src = thumbSrc(item)
            const isLastVisible = index === visibleThumbs.length - 1
            return (
              <button
                key={`pdx-thumb-${index}`}
                type="button"
                role="listitem"
                className={`pdx-gallery__thumb${currentIndex === index ? ' pdx-gallery__thumb--active' : ''}`}
                onClick={() => onSelect(index)}
              >
                {src ? <img src={src} alt="" loading="lazy" /> : <span className="pdx-gallery__thumb-video"><FiPlay size={14} /></span>}
                {hiddenThumbCount > 0 && isLastVisible ? (
                  <span className="pdx-gallery__thumb-more">+{hiddenThumbCount} фото</span>
                ) : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FiChevronLeft, FiChevronRight, FiHeart, FiShare2 } from 'react-icons/fi'
import { FaHeart } from 'react-icons/fa6'
import { useHorizontalSwipe } from '../../hooks/useHorizontalSwipe'

const FALLBACK_IMAGE =
  '/images/external/photo-1505691938895-1758d7feb511-f43679f6a1.jpg'

export default function PropertyDetailGallery({
  images = [],
  title = '',
  onShare,
  onToggleFavorite,
  isFavorite = false,
  actionsDisabled = false,
  overlay = null,
  className = '',
  alwaysShowNav = false,
}) {
  const { t } = useTranslation()
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const thumbnailScrollRef = useRef(null)

  const galleryImages = useMemo(() => {
    const list = Array.isArray(images) ? images.filter(Boolean) : []
    return list.length > 0 ? list : [FALLBACK_IMAGE]
  }, [images])

  useEffect(() => {
    setCurrentImageIndex(0)
  }, [galleryImages])

  const handlePreviousImage = () => {
    setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : galleryImages.length - 1))
  }

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev < galleryImages.length - 1 ? prev + 1 : 0))
  }

  const handleThumbnailClick = (index) => {
    setCurrentImageIndex(index)
    if (thumbnailScrollRef.current) {
      const thumbnail = thumbnailScrollRef.current.children[index]
      if (thumbnail) {
        thumbnail.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
      }
    }
  }

  const gallerySwipeHandlers = useHorizontalSwipe({
    enabled: galleryImages.length > 1 && !actionsDisabled,
    onSwipeLeft: handleNextImage,
    onSwipeRight: handlePreviousImage,
  })

  useEffect(() => {
    if (thumbnailScrollRef.current) {
      const thumbnail = thumbnailScrollRef.current.children[currentImageIndex]
      if (thumbnail) {
        thumbnail.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
      }
    }
  }, [currentImageIndex])

  const currentUrl = galleryImages[currentImageIndex] || galleryImages[0]

  return (
    <div className={`property-detail-gallery ${className}`.trim()}>
      <div className="property-detail-gallery__main" {...gallerySwipeHandlers}>
        <img src={currentUrl} alt={title} className="property-detail-gallery__main-image" />
        {overlay}
        {(galleryImages.length > 1 || alwaysShowNav) && (
          <>
            <button
              type="button"
              className="property-detail-gallery__nav property-detail-gallery__nav--prev"
              onClick={handlePreviousImage}
              disabled={actionsDisabled || galleryImages.length <= 1}
              aria-label={t('previousImage') || 'Предыдущее фото'}
            >
              <FiChevronLeft size={24} />
            </button>
            <button
              type="button"
              className="property-detail-gallery__nav property-detail-gallery__nav--next"
              onClick={handleNextImage}
              disabled={actionsDisabled || galleryImages.length <= 1}
              aria-label={t('nextImage') || 'Следующее фото'}
            >
              <FiChevronRight size={24} />
            </button>
            {galleryImages.length > 1 && (
              <div className="property-detail-gallery__counter">
                {currentImageIndex + 1} / {galleryImages.length}
              </div>
            )}
          </>
        )}
        <div className="property-detail-gallery__actions">
          {onShare && (
            <button
              type="button"
              className="property-detail-gallery__action-btn"
              onClick={onShare}
              disabled={actionsDisabled}
              aria-label={t('share') || 'Поделиться'}
            >
              <FiShare2 size={20} />
            </button>
          )}
          {onToggleFavorite && (
            <button
              type="button"
              className={`property-detail-gallery__action-btn ${
                isFavorite ? 'property-detail-gallery__action-btn--active' : ''
              }`}
              onClick={onToggleFavorite}
              disabled={actionsDisabled}
              aria-label={t('addToFavorites') || 'В избранное'}
            >
              {isFavorite ? <FaHeart size={20} /> : <FiHeart size={20} />}
            </button>
          )}
        </div>
      </div>

      {galleryImages.length > 0 && (
        <div className="property-detail-gallery__thumbnails-wrapper">
          <div className="property-detail-gallery__thumbnails" ref={thumbnailScrollRef}>
            {galleryImages.map((url, index) => (
              <button
                key={`${url}-${index}`}
                type="button"
                className={`property-detail-gallery__thumbnail ${
                  currentImageIndex === index ? 'property-detail-gallery__thumbnail--active' : ''
                }`}
                onClick={() => handleThumbnailClick(index)}
              >
                <img src={url} alt={`${title} ${index + 1}`} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

import { useTranslation } from 'react-i18next'
import { isPropertyPresentation } from '../utils/propertyPresentation'
import { useState } from 'react'
import { FiX, FiChevronLeft, FiChevronRight, FiMapPin, FiDollarSign, FiCalendar, FiVideo, FiFileText, FiXCircle } from 'react-icons/fi'
import { MdBed, MdOutlineBathtub } from 'react-icons/md'
import { BiArea } from 'react-icons/bi'
import './PropertyPreviewModal.css'

const PropertyPreviewModal = ({ isOpen, onClose, propertyData }) => {
  const { t } = useTranslation()
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0)
  const [selectedDocument, setSelectedDocument] = useState(null)

  if (!isOpen || !propertyData) return null

  const images = propertyData.photos || []
  const videos = propertyData.videos || []
  
  // Создаем объединенный массив медиа: сначала фото, потом видео
  const mediaItems = [
    ...images.map((img, index) => ({ type: 'image', content: img, index })),
    ...videos.map((video, index) => ({ type: 'video', content: video, index }))
  ]
  
  const hasMedia = mediaItems.length > 0
  const currentMedia = mediaItems[currentMediaIndex]

  const nextMedia = () => {
    setCurrentMediaIndex((prev) => (prev + 1) % mediaItems.length)
  }

  const prevMedia = () => {
    setCurrentMediaIndex((prev) => (prev - 1 + mediaItems.length) % mediaItems.length)
  }

  const getMediaThumbnail = (item) => {
    if (item.type === 'image') {
      return item.content
    } else {
      // Для видео используем thumbnail если есть (для YouTube)
      if (item.content.thumbnail) {
        return item.content.thumbnail
      }
      // Для файлов видео можем использовать первый кадр, но пока возвращаем null
      return null
    }
  }

  return (
    <div className="preview-modal-overlay" onClick={onClose}>
      <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
        <button 
          className="preview-modal__close" 
          onClick={onClose}
          aria-label={t('closeModalAria')}
        >
          <FiX size={24} />
        </button>

        <div className="preview-modal__content">
          <h2 className="preview-modal__title">{t('propertyPreview_title')}</h2>

          {/* Медиа (фото и видео) */}
          {hasMedia && (
            <div className="preview-images">
              <div className="preview-main-image">
                {mediaItems.length > 1 && (
                  <>
                    <button 
                      className="preview-nav preview-nav--prev"
                      onClick={prevMedia}
                    >
                      <FiChevronLeft size={20} />
                    </button>
                    <button 
                      className="preview-nav preview-nav--next"
                      onClick={nextMedia}
                    >
                      <FiChevronRight size={20} />
                    </button>
                  </>
                )}
                {currentMedia && (
                  <>
                    {currentMedia.type === 'image' ? (
                      <img 
                        src={currentMedia.content} 
                        alt={t('propertyPreview_photoAlt', { n: currentMedia.index + 1 })}
                      />
                    ) : (
                      <div className="preview-media-video">
                        {currentMedia.content.type === 'youtube' && currentMedia.content.videoId ? (
                          <iframe
                            src={`https://www.youtube.com/embed/${currentMedia.content.videoId}`}
                            title={t('propertyPreview_youtubeTitle', { n: currentMedia.index + 1 })}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        ) : currentMedia.content.type === 'googledrive' && currentMedia.content.videoId ? (
                          <iframe
                            src={`https://drive.google.com/file/d/${currentMedia.content.videoId}/preview`}
                            title={t('propertyPreview_gdriveTitle', { n: currentMedia.index + 1 })}
                            frameBorder="0"
                            allowFullScreen
                          />
                        ) : currentMedia.content.type === 'file' && currentMedia.content.url ? (
                          <video
                            src={currentMedia.content.url}
                            controls
                            className="preview-video-file"
                          >
                            {t('propertyPreview_videoUnsupported')}
                          </video>
                        ) : null}
                      </div>
                    )}
                  </>
                )}
                {mediaItems.length > 1 && (
                  <div className="preview-image-counter">
                    {currentMediaIndex + 1} / {mediaItems.length}
                  </div>
                )}
              </div>
              
              {mediaItems.length > 1 && (
                <div className="preview-thumbnails">
                  {mediaItems.map((item, index) => {
                    const thumbnail = getMediaThumbnail(item)
                    return (
                      <div
                        key={`${item.type}-${item.index}`}
                        className={`preview-thumbnail ${index === currentMediaIndex ? 'active' : ''}`}
                        onClick={() => setCurrentMediaIndex(index)}
                      >
                        {thumbnail ? (
                          <img
                            src={thumbnail}
                            alt={t('propertyPreview_thumbAlt', { n: index + 1 })}
                          />
                        ) : (
                          <div className="preview-thumbnail-video-placeholder">
                            <FiVideo size={20} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Информация */}
          <div className="preview-info">
            <h1 className="preview-title">{propertyData.title || t('propertyPreview_untitled')}</h1>
            
            {propertyData.location && (
              <div className="preview-location">
                <FiMapPin size={18} />
                <span>{propertyData.location}</span>
              </div>
            )}

            {propertyData.description && (
              <div className="preview-description">
                <h3>{t('propertyPreview_description')}</h3>
                <p>{propertyData.description}</p>
              </div>
            )}

            {/* Характеристики */}
            <div className="preview-features">
              {propertyData.area && (
                <div className="preview-feature">
                  <BiArea size={20} />
                  <span>{t('propertyPreview_areaSqm', { area: propertyData.area })}</span>
                </div>
              )}
              {propertyData.bedrooms && (
                <div className="preview-feature">
                  <MdBed size={20} />
                  <span>{t('propertyPreview_bedrooms', { count: propertyData.bedrooms })}</span>
                </div>
              )}
              {propertyData.bathrooms && (
                <div className="preview-feature">
                  <MdOutlineBathtub size={20} />
                  <span>{t('propertyPreview_bathrooms', { count: propertyData.bathrooms })}</span>
                </div>
              )}
              {propertyData.rooms && (
                <div className="preview-feature">
                  <span>{t('propertyPreview_rooms', { count: propertyData.rooms })}</span>
                </div>
              )}
            </div>

            {/* Дополнительная информация */}
            <div className="preview-details">
              {propertyData.floor && (
                <div className="preview-detail-item">
                  <strong>{t('propertyPreview_floor')}</strong> {propertyData.floor}
                  {propertyData.totalFloors && t('propertyPreview_floorOf', { total: propertyData.totalFloors })}
                </div>
              )}
              {propertyData.yearBuilt && (
                <div className="preview-detail-item">
                  <strong>{t('propertyPreview_yearBuilt')}</strong> {propertyData.yearBuilt}
                </div>
              )}
              {propertyData.propertyType && (
                <div className="preview-detail-item">
                  <strong>{t('propertyPreview_type')}</strong>{' '}
                  {propertyData.propertyType === 'apartment'
                    ? t('propertyTypeApartment')
                    : propertyData.propertyType === 'house'
                      ? t('propertyTypeHouse')
                      : propertyData.propertyType === 'villa'
                        ? t('propertyTypeVilla')
                        : propertyData.propertyType === 'commercial'
                          ? t('propertyTypeCommercial')
                          : propertyData.propertyType}
                </div>
              )}
            </div>

            {/* Цена */}
            {propertyData.price && (
              <div className="preview-price">
                <FiDollarSign size={24} />
                <span className="price-amount">
                  {parseInt(propertyData.price).toLocaleString()} $
                </span>
              </div>
            )}

            {/* Информация об аукционе */}
            {propertyData.isAuction && (
              <div className="preview-auction">
                <div className="auction-badge">{t('auction')}</div>
                {propertyData.auctionStartDate && propertyData.auctionEndDate && (
                  <div className="auction-dates">
                    <FiCalendar size={18} />
                    <span>
                      {new Date(propertyData.auctionStartDate).toLocaleDateString()} - 
                      {' '}{new Date(propertyData.auctionEndDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Дополнительные документы */}
            {propertyData.additionalDocuments && propertyData.additionalDocuments.length > 0 && (
              <div className="preview-documents">
                <h3 className="preview-documents-title">
                  <FiFileText size={20} />
                  {t('propertyPreview_extraDocs')}
                </h3>
                <div className="preview-documents-grid">
                  {propertyData.additionalDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="preview-document-card"
                      onClick={() => setSelectedDocument(doc)}
                    >
                      <div className="preview-document-icon">
                        <FiFileText size={24} />
                      </div>
                      <div className="preview-document-info">
                        <h4 className="preview-document-name">{isPropertyPresentation(doc) ? t('propertyPresentationTitle') : doc.name}</h4>
                        <span className="preview-document-type">
                          {doc.type === 'pdf' ? t('propertyPreview_pdfDoc') : t('propertyPreview_imageDoc')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Модальное окно для просмотра документа */}
      {selectedDocument && (
        <div
          className="preview-document-modal"
          onClick={() => setSelectedDocument(null)}
        >
          <div className="preview-document-modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="preview-document-modal-close"
              onClick={(e) => {
                e.stopPropagation()
                setSelectedDocument(null)
              }}
            >
              <FiXCircle size={32} strokeWidth={2} />
            </button>
            {selectedDocument.type === 'pdf' ? (
              <iframe
                src={`${selectedDocument.url}#toolbar=0`}
                className="preview-document-pdf"
                title={selectedDocument.name}
              />
            ) : (
              <img src={selectedDocument.url} alt={selectedDocument.name} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default PropertyPreviewModal

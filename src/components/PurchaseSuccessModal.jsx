import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Check, Home } from 'lucide-react'
import { useDrawerDismiss, DRAWER_DISMISS_MS } from '../hooks/useDrawerDismiss'
import Confetti from './Confetti'
import ImageWithSkeleton from './ImageWithSkeleton'
import { buildResponsiveImageProps } from '../utils/responsiveImage'
import './Confetti.css'
import './PurchaseSuccessModal.css'

export default function PurchaseSuccessModal({
  isOpen,
  onClose,
  property,
  onGoToGuide,
}) {
  const { t } = useTranslation()
  const [entered, setEntered] = useState(false)
  const { visible, isClosing, requestClose } = useDrawerDismiss(isOpen, onClose, {
    duration: DRAWER_DISMISS_MS.panel,
  })

  useEffect(() => {
    if (!visible) {
      setEntered(false)
      return undefined
    }
    const frame = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(frame)
  }, [visible])

  useEffect(() => {
    if (!visible) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [visible])

  if (!visible || typeof document === 'undefined') return null

  const title = property?.title || property?.name || t('purchaseSuccess_defaultTitle')
  const image = property?.image || property?.images?.[0] || ''
  const imageProps = image
    ? buildResponsiveImageProps(image, {
        widths: [320, 480, 640],
        sizes: '(max-width: 768px) 90vw, 420px',
        fit: 'cover',
        quality: 72,
        format: 'webp',
      })
    : null

  const handleGoToGuide = () => {
    requestClose(() => onGoToGuide?.())
  }

  return createPortal(
    <>
      <div
        className={`purchase-success-modal__backdrop${isClosing ? ' drawer-dismiss-backdrop--closing' : ''}`}
        aria-hidden="true"
        onClick={() => requestClose()}
      />
      {visible && !isClosing ? <Confetti className="purchase-success-modal__confetti" /> : null}
      <div
        className="purchase-success-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="purchase-success-modal-title"
      >
        <div
          className={`purchase-success-modal__sheet${
            entered && !isClosing ? ' purchase-success-modal__sheet--entering' : ''
          }${isClosing ? ' purchase-success-modal__sheet--closing drawer-dismiss-from-bottom--closing' : ''}`}
        >
          <div className="purchase-success-modal__handle" aria-hidden="true">
            <span className="purchase-success-modal__handle-pill" />
          </div>

          <div className="purchase-success-modal__body">
            <div className="purchase-success-modal__badge" aria-hidden="true">
              <Check size={32} strokeWidth={2.5} />
            </div>

            <div className="purchase-success-modal__copy">
              <p className="purchase-success-modal__eyebrow">{t('purchaseSuccess_eyebrow')}</p>
              <h2 id="purchase-success-modal-title" className="purchase-success-modal__title">
                {t('purchaseSuccess_title')}
              </h2>
              <p className="purchase-success-modal__subtitle">{t('purchaseSuccess_subtitle')}</p>
            </div>

            <article className="purchase-success-modal__property">
              {imageProps ? (
                <div className="purchase-success-modal__property-image">
                  <ImageWithSkeleton imgProps={imageProps} alt="" />
                </div>
              ) : (
                <div className="purchase-success-modal__property-image purchase-success-modal__property-image--placeholder">
                  <Home size={28} aria-hidden />
                </div>
              )}
              <div className="purchase-success-modal__property-copy">
                <h3>{title}</h3>
                {property?.location ? <p>{property.location}</p> : null}
              </div>
            </article>

            <div className="purchase-success-modal__actions">
              <button type="button" className="purchase-success-modal__btn purchase-success-modal__btn--primary" onClick={handleGoToGuide}>
                {t('purchaseSuccess_goToObject')}
              </button>
              <button type="button" className="purchase-success-modal__btn purchase-success-modal__btn--ghost" onClick={() => requestClose()}>
                {t('purchaseSuccess_later')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  )
}

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { FiArrowRight, FiX } from 'react-icons/fi'
import { publicAsset } from '../utils/publicAsset'
import './CompareNeedsLikesModal.css'

const COMPARE_ART_SRC = 'images/favorite-drawers/compare-favorites-3d.webp'

export default function CompareNeedsLikesModal({
  isOpen,
  likedCount = 0,
  onClose,
  onFindMore,
}) {
  const { t } = useTranslation()
  const dialogRef = useRef(null)
  const ctaRef = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const titleKey = likedCount >= 1 ? 'compareNeedsLikes_titleOne' : 'compareNeedsLikes_titleZero'

  useEffect(() => {
    if (!isOpen) return undefined

    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ctaRef.current?.focus()

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current?.()
      }
      if (event.key === 'Tab') {
        const buttons = [...dialogRef.current.querySelectorAll('button')]
        const first = buttons[0]
        const last = buttons[buttons.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus?.()
    }
  }, [isOpen])

  if (!isOpen || typeof document === 'undefined') return null

  return createPortal(
    <div className="compare-needs-likes-modal__overlay" role="presentation">
      <div className="compare-needs-likes-modal__backdrop" role="presentation" onClick={onClose} />
      <div
        ref={dialogRef}
        className="compare-needs-likes-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="compare-needs-likes-title"
        aria-describedby="compare-needs-likes-description"
      >
        <div className="compare-needs-likes-modal__card">
          <div className="compare-needs-likes-modal__hero" aria-hidden="true">
            <img
              className="compare-needs-likes-modal__illustration"
              src={publicAsset(COMPARE_ART_SRC)}
              alt=""
              width="1024"
              height="512"
              decoding="async"
            />
          </div>
          <div className="compare-needs-likes-modal__content">
            <h2 id="compare-needs-likes-title" className="compare-needs-likes-modal__title">
              {t(titleKey)}
            </h2>
            <p id="compare-needs-likes-description" className="compare-needs-likes-modal__lead">
              {t('compareNeedsLikes_lead')}
            </p>
            <div className="compare-needs-likes-modal__meta">
              <span>{t('compareNeedsLikes_metaCount')}</span>
              <span aria-hidden="true">·</span>
              <span>{t('compareNeedsLikes_metaHint')}</span>
            </div>
            <button
              ref={ctaRef}
              type="button"
              className="compare-needs-likes-modal__cta"
              onClick={onFindMore}
            >
              <span className="compare-needs-likes-modal__cta-copy">{t('compareNeedsLikes_cta')}</span>
              <FiArrowRight className="compare-needs-likes-modal__cta-icon" size={20} aria-hidden="true" />
            </button>
          </div>
        </div>
        <button
          type="button"
          className="compare-needs-likes-modal__close"
          onClick={onClose}
          aria-label={t('compareNeedsLikes_close')}
        >
          <FiX size={24} aria-hidden="true" />
        </button>
      </div>
    </div>,
    document.body,
  )
}

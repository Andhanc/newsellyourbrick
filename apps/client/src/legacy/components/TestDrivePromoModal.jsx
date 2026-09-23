import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { FiArrowRight, FiX } from 'react-icons/fi'
import { publicAsset } from '../utils/publicAsset'
import './TestDrivePromoModal.css'

const ILLUSTRATION = publicAsset('images/property-detail/test-drive-palm-lounger-3d.webp')

export default function TestDrivePromoModal({ isOpen, onClose, onGoToSection }) {
  const { t } = useTranslation()
  const dialogRef = useRef(null)
  const ctaRef = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

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

  const goToSection = () => {
    onClose?.()
    onGoToSection?.()
  }

  return createPortal(
    <div className="test-drive-promo-modal__overlay" role="presentation">
      <div className="test-drive-promo-modal__backdrop" onClick={onClose} role="presentation" />
      <div
        ref={dialogRef}
        className="test-drive-promo-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="test-drive-promo-modal-title"
        aria-describedby="test-drive-promo-modal-lead"
      >
        <div className="test-drive-promo-modal__card">
          <div className="test-drive-promo-modal__hero" aria-hidden="true">
            <img
              className="test-drive-promo-modal__illustration"
              src={ILLUSTRATION}
              alt=""
              width="720"
              height="1080"
              decoding="async"
            />
          </div>
          <div className="test-drive-promo-modal__content">
            <h2 id="test-drive-promo-modal-title" className="test-drive-promo-modal__title">
              {t('testDrivePromoDrawerTitle')}
            </h2>
            <p id="test-drive-promo-modal-lead" className="test-drive-promo-modal__lead">
              {t('testDrivePromoDrawerLead')}
            </p>
            <button
              ref={ctaRef}
              type="button"
              className="test-drive-promo-modal__cta"
              onClick={goToSection}
            >
              <span>{t('testDrivePromoDrawerCta')}</span>
              <FiArrowRight size={20} aria-hidden="true" />
            </button>
          </div>
        </div>
        <button
          type="button"
          className="test-drive-promo-modal__close"
          onClick={onClose}
          aria-label={t('closeAria')}
        >
          <FiX size={24} aria-hidden="true" />
        </button>
      </div>
    </div>,
    document.body,
  )
}

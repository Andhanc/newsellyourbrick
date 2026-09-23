import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { FiArrowRight, FiX } from 'react-icons/fi'
import { publicAsset } from '../utils/publicAsset'
import { COMPASS_BANNER_SRC } from '../utils/investmentCompass'
import InvestmentCompassPrice from './InvestmentCompassPrice'
import './InvestmentCompassPromoModal.css'

export default function InvestmentCompassPromoModal({ isOpen, onClose, onStart }) {
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

  return createPortal(
    <div className="investment-compass-promo-modal__overlay" role="presentation">
      <div className="investment-compass-promo-modal__backdrop" role="presentation" onClick={onClose} />
      <div
        ref={dialogRef}
        className="investment-compass-promo-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="investment-compass-promo-title"
        aria-describedby="investment-compass-promo-description"
      >
        <div className="investment-compass-promo-modal__card">
          <div className="investment-compass-promo-modal__hero" aria-hidden="true">
            <img
              className="investment-compass-promo-modal__illustration"
              src={publicAsset(COMPASS_BANNER_SRC)}
              alt=""
              width="768"
              height="768"
              decoding="async"
            />
          </div>
          <div className="investment-compass-promo-modal__content">
            <h2 id="investment-compass-promo-title" className="investment-compass-promo-modal__title">
              {t('compass_drawerEyebrow')}
            </h2>
            <p id="investment-compass-promo-description" className="investment-compass-promo-modal__lead">
              {t('compass_drawerDescription')}
            </p>
            <div className="investment-compass-promo-modal__meta">
              <span>{t('compass_drawerMetaQuestions')}</span>
              <span aria-hidden="true">·</span>
              <span>{t('compass_drawerMetaDuration')}</span>
            </div>
            <button
              ref={ctaRef}
              type="button"
              className="investment-compass-promo-modal__cta"
              onClick={onStart}
            >
              <span className="investment-compass-promo-modal__cta-copy">{t('compass_drawerCta')}</span>
              <InvestmentCompassPrice className="investment-compass-promo-modal__price" />
              <FiArrowRight size={20} aria-hidden="true" />
            </button>
          </div>
        </div>
        <button
          type="button"
          className="investment-compass-promo-modal__close"
          onClick={onClose}
          aria-label={t('compass_drawerClose')}
        >
          <FiX size={24} aria-hidden="true" />
        </button>
      </div>
    </div>,
    document.body,
  )
}

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { FiArrowRight, FiCheck } from 'react-icons/fi'
import './DepositSuccessDrawer.css'

function continueLabel(returnPath = '', t) {
  if (returnPath.startsWith('/property/')) return t('depositSuccessDrawer_continueProperty')
  if (returnPath.startsWith('/compare')) return t('depositSuccessDrawer_continueCompare')
  if (returnPath.startsWith('/calculator')) return t('depositSuccessDrawer_continueCalculator')
  if (returnPath.startsWith('/favorites')) return t('depositSuccessDrawer_continueFavorites')
  return t('depositSuccessDrawer_continueBrowse')
}

export default function DepositSuccessDrawer({
  isOpen,
  onClose,
  onContinue,
  confirmedAmount,
  returnPath,
}) {
  const { t } = useTranslation()
  const actionRef = useRef(null)
  const cardRef = useRef(null)
  const actionLabel = continueLabel(returnPath, t)

  useEffect(() => {
    if (!isOpen) return undefined
    const previousOverflow = document.body.style.overflow
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)
    const frame = window.requestAnimationFrame(() => cardRef.current?.focus())
    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen, onClose])

  if (!isOpen || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="deposit-success-modal"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.()
      }}
    >
      <section
        ref={cardRef}
        className="deposit-success-modal__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="deposit-success-modal-title"
        aria-describedby="deposit-success-modal-description"
        tabIndex={-1}
      >
        <span className="deposit-success-modal__check" aria-hidden="true">
          <FiCheck />
        </span>
        <h2 id="deposit-success-modal-title" className="deposit-success-modal__title">
          {t('depositSuccessDrawer_title')}
        </h2>
        {confirmedAmount ? (
          <strong className="deposit-success-modal__confirmed">+ {confirmedAmount}</strong>
        ) : null}
        <p id="deposit-success-modal-description" className="deposit-success-modal__lead">
          {t('depositSuccessDrawer_lead')}
        </p>
        <button
          ref={actionRef}
          type="button"
          className="deposit-success-modal__cta"
          onClick={onContinue}
        >
          <span>{actionLabel}</span>
          <FiArrowRight aria-hidden="true" />
        </button>
      </section>
    </div>,
    document.body,
  )
}

export { continueLabel as getDepositSuccessContinueLabel }

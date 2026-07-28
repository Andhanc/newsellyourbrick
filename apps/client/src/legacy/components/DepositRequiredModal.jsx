import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { FiArrowRight, FiChevronLeft, FiShield, FiX } from 'react-icons/fi'
import './DepositRequiredModal.css'

const DepositRequiredModal = ({
  isOpen,
  onClose,
  onGoToDeposit,
  title,
  message,
  actionText,
}) => {
  const { t } = useTranslation()
  const [showDepositInfo, setShowDepositInfo] = useState(false)

  const resolvedTitle = title ?? t('depositModal_title')
  const resolvedMessage = message ?? t('depositModal_message')
  const resolvedAction = actionText ?? t('depositModal_action')
  const amountLabel = t('depositModal_infoAmountStrong')

  useEffect(() => {
    if (!isOpen) setShowDepositInfo(false)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  if (!isOpen || typeof document === 'undefined') return null

  return createPortal(
    <div className="deposit-required-modal__overlay" onClick={onClose}>
      <div
        className={`deposit-required-modal__panel ${showDepositInfo ? 'deposit-required-modal__panel--expanded' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="deposit-required-modal__glow deposit-required-modal__glow--one" />
        <div className="deposit-required-modal__glow deposit-required-modal__glow--two" />

        <button
          type="button"
          className="deposit-required-modal__close"
          onClick={onClose}
          aria-label={t('depositModal_closeAria')}
        >
          <FiX size={20} />
        </button>

        <div className="deposit-required-modal__content">
          <div className="deposit-required-modal__icon-wrap" aria-hidden="true">
            <FiShield size={24} />
          </div>
          {!showDepositInfo ? (
            <>
              <h2 className="deposit-required-modal__title">{resolvedTitle}</h2>
              <p className="deposit-required-modal__message">{resolvedMessage}</p>

              <button
                type="button"
                className="deposit-required-modal__action"
                onClick={onGoToDeposit}
              >
                {resolvedAction}
                <FiArrowRight size={18} />
              </button>

              <button
                type="button"
                className="deposit-required-modal__link"
                onClick={() => setShowDepositInfo(true)}
              >
                {t('depositModal_whatIsLink')}
              </button>
            </>
          ) : (
            <div className="deposit-required-modal__details">
              <h2 className="deposit-required-modal__title">{t('depositModal_infoTitle')}</h2>
              <p className="deposit-required-modal__detail-text">
                {t('depositModal_infoParagraph1', { amount: amountLabel })}
              </p>
              <p className="deposit-required-modal__detail-text">
                {t('depositModal_infoParagraph2')}
              </p>
              <p className="deposit-required-modal__detail-text">
                {t('depositModal_infoParagraph3')}
              </p>

              <div className="deposit-required-modal__detail-actions">
                <button
                  type="button"
                  className="deposit-required-modal__back"
                  onClick={() => setShowDepositInfo(false)}
                >
                  <FiChevronLeft size={16} />
                  {t('depositModal_back')}
                </button>
                <button
                  type="button"
                  className="deposit-required-modal__action"
                  onClick={onGoToDeposit}
                >
                  {resolvedAction}
                  <FiArrowRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default DepositRequiredModal

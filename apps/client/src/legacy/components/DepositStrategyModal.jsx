import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiArrowRight, FiX } from 'react-icons/fi'
import { CO_INVESTMENT_PATH } from '../utils/sectionRoutes'
import { publicAsset } from '../utils/publicAsset'
import './DepositStrategyModal.css'

const STRATEGIES = [
  { id: 'auction', titleKey: 'walletPage_strategyAuctionTitle', descriptionKey: 'walletPage_strategyAuctionDescription', path: '/auction?filter=auction' },
  { id: 'buyNow', titleKey: 'walletPage_strategyBuyNowTitle', descriptionKey: 'walletPage_strategyBuyNowDescription', path: '/auction/buy-now' },
  { id: 'shares', titleKey: 'walletPage_strategySharesTitle', descriptionKey: 'walletPage_strategySharesDescription', path: CO_INVESTMENT_PATH },
  { id: 'debts', titleKey: 'walletPage_strategyDebtsTitle', descriptionKey: 'walletPage_strategyDebtsDescription', path: '/debts' },
]

export default function DepositStrategyModal({ isOpen, onClose }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const dialogRef = useRef(null)
  const firstCardRef = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!isOpen) return undefined

    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    firstCardRef.current?.focus()

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current?.()
      }
      if (event.key !== 'Tab') return

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

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus?.()
    }
  }, [isOpen])

  if (!isOpen || typeof document === 'undefined') return null

  const selectStrategy = (path) => {
    onClose()
    navigate(path)
  }

  return createPortal(
    <div className="deposit-strategy-modal__overlay" role="presentation">
      <div className="deposit-strategy-modal__backdrop" role="presentation" onClick={onClose} />
      <div
        ref={dialogRef}
        className="deposit-strategy-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="deposit-strategy-modal-title"
      >
        <div className="deposit-strategy-modal__card">
          <div className="deposit-strategy-modal__heading">
            <h2 id="deposit-strategy-modal-title">{t('walletPage_strategyModalTitle')}</h2>
          </div>
          <div className="deposit-strategy-modal__list">
            {STRATEGIES.map((strategy, index) => (
              <button
                key={strategy.id}
                ref={index === 0 ? firstCardRef : undefined}
                type="button"
                className={`deposit-strategy-modal__option deposit-strategy-modal__option--${strategy.id}`}
                onClick={() => selectStrategy(strategy.path)}
              >
                <img
                  src={publicAsset(`images/deposit-strategies/${strategy.id}-clay-v2.webp`)}
                  alt=""
                  width="640"
                  height="640"
                  decoding="async"
                />
                <span className="deposit-strategy-modal__option-content">
                  <span className="deposit-strategy-modal__option-title">{t(strategy.titleKey)}</span>
                  <span className="deposit-strategy-modal__option-description">{t(strategy.descriptionKey)}</span>
                  <FiArrowRight className="deposit-strategy-modal__arrow" aria-hidden="true" />
                </span>
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          className="deposit-strategy-modal__close"
          onClick={onClose}
          aria-label={t('walletPage_strategyModalClose')}
        >
          <FiX size={24} aria-hidden="true" />
        </button>
      </div>
    </div>,
    document.body,
  )
}

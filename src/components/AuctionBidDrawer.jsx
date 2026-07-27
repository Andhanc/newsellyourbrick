import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { FiX } from 'react-icons/fi'
import { useDrawerDismiss, DRAWER_DISMISS_MS } from '../hooks/useDrawerDismiss'
import './AuctionBidDrawer.css'

export default function AuctionBidDrawer({ isOpen, onClose, title, children }) {
  const { t } = useTranslation()
  const { visible, isClosing, requestClose } = useDrawerDismiss(isOpen, onClose, {
    duration: DRAWER_DISMISS_MS.spring,
  })

  useEffect(() => {
    if (!visible) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [visible])

  if (!visible || typeof document === 'undefined') return null

  const closingBackdrop = isClosing ? ' drawer-dismiss-backdrop--closing' : ''
  const closingPanel = isClosing ? ' drawer-dismiss-modal--closing' : ''

  return createPortal(
    <div
      className={`auction-bid-modal__overlay${closingBackdrop}`}
      role="presentation"
      onClick={() => requestClose()}
    >
      <div
        className={`auction-bid-modal__panel${closingPanel}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auction-bid-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="auction-bid-modal__header">
          {title ? (
            <h2 id="auction-bid-modal-title" className="auction-bid-modal__title">
              {title}
            </h2>
          ) : (
            <span />
          )}
          <button
            type="button"
            className="auction-bid-modal__close"
            onClick={() => requestClose()}
            aria-label={t('closeAria')}
          >
            <FiX size={20} />
          </button>
        </div>
        <div className="auction-bid-modal__body">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

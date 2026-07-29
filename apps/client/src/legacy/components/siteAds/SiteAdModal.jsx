import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { FiX } from 'react-icons/fi'
import { markSiteAdModalSeen } from '@/utils/siteAdPages'
import { isExternalAdUrl } from '@/utils/siteAdIcons'
import SiteAdIcon from './SiteAdIcon'
import './SiteAdModal.css'

export default function SiteAdModal({ ad, onClose }) {
  if (!ad || typeof document === 'undefined') return null

  const buttonUrl = String(ad.buttonUrl || '').trim()
  const showButton = Boolean(ad.buttonEnabled && buttonUrl)
  const external = showButton && isExternalAdUrl(buttonUrl)
  const buttonLabel = String(ad.buttonLabel || 'Подробнее').trim() || 'Подробнее'

  const handleClose = () => {
    markSiteAdModalSeen(ad.id)
    onClose?.()
  }

  const handleLinkClick = () => {
    markSiteAdModalSeen(ad.id)
    onClose?.()
  }

  const ctaButton = showButton ? (
    external ? (
      <a
        className="site-ad-modal__cta site-ad-modal__cta--link"
        href={buttonUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleLinkClick}
      >
        {buttonLabel}
      </a>
    ) : (
      <Link to={buttonUrl} className="site-ad-modal__cta site-ad-modal__cta--link" onClick={handleLinkClick}>
        {buttonLabel}
      </Link>
    )
  ) : (
    <button type="button" className="site-ad-modal__cta" onClick={handleClose}>
      Понятно
    </button>
  )

  return createPortal(
    <div className="site-ad-modal" role="presentation">
      <div className="site-ad-modal__backdrop" onClick={handleClose} aria-hidden="true" />
      <div
        className="site-ad-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`site-ad-modal-title-${ad.id}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="site-ad-modal__glow site-ad-modal__glow--tl" aria-hidden="true" />
        <div className="site-ad-modal__glow site-ad-modal__glow--br" aria-hidden="true" />
        <div className="site-ad-modal__shine" aria-hidden="true" />

        <div className="site-ad-modal__icon-wrap" aria-hidden="true">
          <SiteAdIcon iconId={ad.icon} size={22} />
        </div>

        <button
          type="button"
          className="site-ad-modal__close"
          onClick={handleClose}
          aria-label="Закрыть"
        >
          <FiX size={20} />
        </button>

        <div className="site-ad-modal__body">
          <div className="site-ad-modal__badge">
            <span>Специальное предложение</span>
          </div>

          <h2 id={`site-ad-modal-title-${ad.id}`} className="site-ad-modal__title">
            {ad.title}
          </h2>
          <p className="site-ad-modal__description">{ad.description}</p>

          {ctaButton}
        </div>
      </div>
    </div>,
    document.body,
  )
}

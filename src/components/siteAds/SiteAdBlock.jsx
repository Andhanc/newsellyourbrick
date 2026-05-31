import { Link } from 'react-router-dom'
import { FiX } from 'react-icons/fi'
import { isExternalAdUrl } from '@/utils/siteAdIcons'
import SiteAdIcon from './SiteAdIcon'
import './SiteAdBlock.css'

export default function SiteAdBlock({ ad, onClose }) {
  if (!ad) return null

  const buttonUrl = String(ad.buttonUrl || '').trim()
  const showButton = Boolean(ad.buttonEnabled && buttonUrl)
  const external = showButton && isExternalAdUrl(buttonUrl)
  const buttonLabel = String(ad.buttonLabel || 'Подробнее').trim() || 'Подробнее'

  return (
    <article className="site-ad-block" aria-label={ad.title}>
      <div className="site-ad-block__bg" aria-hidden="true" />
      <div className="site-ad-block__shine" aria-hidden="true" />
      <div className="site-ad-block__orb site-ad-block__orb--left" aria-hidden="true" />
      <div className="site-ad-block__orb site-ad-block__orb--right" aria-hidden="true" />

      <button
        type="button"
        className="site-ad-block__close"
        onClick={onClose}
        aria-label="Закрыть рекламу"
      >
        <FiX size={18} />
      </button>

      <div className="site-ad-block__icon-wrap" aria-hidden="true">
        <SiteAdIcon iconId={ad.icon} size={22} />
      </div>

      <div className="site-ad-block__content">
        <span className="site-ad-block__label">Реклама</span>
        <h3 className="site-ad-block__title">{ad.title}</h3>
        <p className="site-ad-block__description">{ad.description}</p>
        {showButton ? (
          external ? (
            <a
              className="site-ad-block__cta"
              href={buttonUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {buttonLabel}
            </a>
          ) : (
            <Link to={buttonUrl} className="site-ad-block__cta">
              {buttonLabel}
            </Link>
          )
        ) : null}
      </div>
    </article>
  )
}

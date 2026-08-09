import { ArrowRight, SearchX } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import './BuyerEmptyState.css'

export default function BuyerEmptyState({
  eyebrow,
  title,
  description,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  icon: Icon = SearchX,
  image,
  imageAlt = '',
  className = '',
}) {
  const { t } = useTranslation()
  const resolvedEyebrow = eyebrow === undefined ? t('buyerEmpty_continueSearch') : eyebrow
  const illustrated = Boolean(image)

  return (
    <section
      className={`buyer-empty-state${illustrated ? ' buyer-empty-state--illustrated' : ''}${className ? ` ${className}` : ''}`}
      role="status"
    >
      {illustrated ? (
        <img
          src={image}
          alt={imageAlt}
          className="buyer-empty-state__image"
          loading="eager"
          decoding="async"
        />
      ) : (
        <span className="buyer-empty-state__icon" aria-hidden>
          <Icon size={30} strokeWidth={1.8} />
        </span>
      )}
      {resolvedEyebrow ? <span className="buyer-empty-state__eyebrow">{resolvedEyebrow}</span> : null}
      {title ? <h2>{title}</h2> : null}
      {description ? <p>{description}</p> : null}
      <div className="buyer-empty-state__actions">
        <button type="button" className="buyer-empty-state__primary" onClick={onPrimary}>
          {primaryLabel}
          <ArrowRight size={18} aria-hidden />
        </button>
        {secondaryLabel && onSecondary ? (
          <button type="button" className="buyer-empty-state__secondary" onClick={onSecondary}>
            {secondaryLabel}
          </button>
        ) : null}
      </div>
    </section>
  )
}

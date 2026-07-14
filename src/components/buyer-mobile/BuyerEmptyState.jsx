import { ArrowRight, SearchX } from 'lucide-react'
import './BuyerEmptyState.css'

export default function BuyerEmptyState({
  eyebrow = 'Продолжим поиск',
  title,
  description,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  icon: Icon = SearchX,
  className = '',
}) {
  return (
    <section className={`buyer-empty-state${className ? ` ${className}` : ''}`} role="status">
      <span className="buyer-empty-state__icon" aria-hidden><Icon size={30} strokeWidth={1.8} /></span>
      <span className="buyer-empty-state__eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{description}</p>
      <div className="buyer-empty-state__actions">
        <button type="button" className="buyer-empty-state__primary" onClick={onPrimary}>
          {primaryLabel}<ArrowRight size={18} aria-hidden />
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

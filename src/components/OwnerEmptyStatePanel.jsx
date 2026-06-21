import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import './OwnerEmptyStatePanel.css'

export default function OwnerEmptyStatePanel({
  illustration: Illustration,
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  className = '',
}) {
  const ctaClass = 'owner-empty-state__cta'
  const showAction = Boolean(actionLabel && (onAction || actionHref))

  return (
    <div className={`owner-empty-state${className ? ` ${className}` : ''}`}>
      {Illustration ? <Illustration className="owner-empty-state__art" /> : null}
      <strong className="owner-empty-state__title">{title}</strong>
      {description ? <p className="owner-empty-state__desc">{description}</p> : null}
      {showAction ? (
        actionHref ? (
          <Link to={actionHref} className={ctaClass}>
            <Plus size={18} strokeWidth={2.5} aria-hidden />
            {actionLabel}
          </Link>
        ) : (
          <button type="button" className={ctaClass} onClick={onAction}>
            <Plus size={18} strokeWidth={2.5} aria-hidden />
            {actionLabel}
          </button>
        )
      ) : null}
    </div>
  )
}

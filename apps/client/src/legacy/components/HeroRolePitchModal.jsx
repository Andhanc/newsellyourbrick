import { FiX, FiTrendingUp, FiHome } from 'react-icons/fi'
import './HeroRolePitchModal.css'

/**
 * Пояснение на главной: покупателю — «стать продавцом», продавцу — «стать покупателем».
 */
const HeroRolePitchModal = ({ variant, isOpen, onClose, onPrimary, title, body, primaryLabel, closeLabel }) => {
  if (!isOpen || !variant) return null

  const Icon = variant === 'seller' ? FiHome : FiTrendingUp
  const mod = variant === 'seller' ? 'hero-role-pitch--seller' : 'hero-role-pitch--buyer'

  return (
    <div className="hero-role-pitch-overlay" onClick={onClose} role="presentation">
      <div
        className={`hero-role-pitch ${mod}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="hero-role-pitch-title"
      >
        <button type="button" className="hero-role-pitch__close" onClick={onClose} aria-label={closeLabel}>
          <FiX size={22} />
        </button>
        <div className="hero-role-pitch__icon-wrap" aria-hidden>
          <Icon size={32} />
        </div>
        <h2 id="hero-role-pitch-title" className="hero-role-pitch__title">
          {title}
        </h2>
        <p className="hero-role-pitch__body">{body}</p>
        <div className="hero-role-pitch__actions">
          <button type="button" className="hero-role-pitch__btn hero-role-pitch__btn--primary" onClick={onPrimary}>
            {primaryLabel}
          </button>
          <button type="button" className="hero-role-pitch__btn hero-role-pitch__btn--ghost" onClick={onClose}>
            {closeLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default HeroRolePitchModal

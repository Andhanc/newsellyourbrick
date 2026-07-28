import { useEffect, useRef } from 'react'
import { FiArrowRight } from 'react-icons/fi'
import { cn } from '@/lib/utils'
import './ui/interactive-frosted-glass-card.css'

export function InvestHeroStatGlassCard({
  variant = 'investor',
  icon: Icon,
  title,
  text,
  buttonLabel,
  onClick,
  className,
}) {
  const cardRef = useRef(null)

  useEffect(() => {
    const card = cardRef.current
    if (!card) return undefined

    const handleMouseMove = (event) => {
      const rect = card.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      const centerX = rect.width / 2
      const centerY = rect.height / 2
      const rotateY = ((x - centerX) / centerX) * 8
      const rotateX = ((y - centerY) / centerY) * -8

      card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`
      card.style.setProperty('--mouse-x', `${x}px`)
      card.style.setProperty('--mouse-y', `${y}px`)
    }

    const handleMouseLeave = () => {
      card.style.transform = 'rotateX(0deg) rotateY(0deg)'
    }

    card.addEventListener('mousemove', handleMouseMove)
    card.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      card.removeEventListener('mousemove', handleMouseMove)
      card.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  return (
    <div className={cn('frosted-glass-card-container invest-hero-stat-card', className)}>
      <div
        ref={cardRef}
        className={cn(
          'frosted-glass-card',
          'invest-hero-stat-card__surface',
          `frosted-glass-card--${variant}`,
        )}
      >
        <div className="frosted-glass-card__content">
          <div className="frosted-glass-card__header">
            <div className="frosted-glass-card__icon-wrap">
              {Icon ? (
                <Icon className="frosted-glass-card__icon invest-hero-stat-card__icon" aria-hidden />
              ) : null}
            </div>
            <h3 className="frosted-glass-card__title">{title}</h3>
          </div>
          <p className="frosted-glass-card__text">{text}</p>
          <button
            type="button"
            className={cn('frosted-glass-card__btn', `frosted-glass-card__btn--${variant}`)}
            onClick={onClick}
          >
            {buttonLabel}
            <FiArrowRight aria-hidden />
          </button>
        </div>
      </div>
    </div>
  )
}

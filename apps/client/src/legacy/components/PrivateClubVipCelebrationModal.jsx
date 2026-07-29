import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useReducedMotion } from 'framer-motion'
import { FaGem } from 'react-icons/fa'
import Confetti from 'react-confetti'
import './PrivateClubVipCelebrationModal.css'

/** Тот же контакт, что в Footer (поддержка). */
const WHATSAPP_SUPPORT_HREF = 'https://wa.me/447700183959'

const CONFETTI_COLORS = [
  '#0099A9',
  '#0099A9',
  '#33adbb',
  '#a78bfa',
  '#8b5cf6',
  '#f59e0b',
  '#fbbf24',
  '#ec4899',
  '#06b6d4',
  '#33adbb',
]

/** Новые частицы только первые 5 с; затем recycle выключается и салют затухает. */
const CONFETTI_ACTIVE_MS = 5000

export default function PrivateClubVipCelebrationModal({ open, onClose }) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion() ?? false
  const [dims, setDims] = useState(() =>
    typeof window !== 'undefined'
      ? { width: window.innerWidth, height: window.innerHeight }
      : { width: 0, height: 0 },
  )
  const [confettiRecycle, setConfettiRecycle] = useState(true)

  useEffect(() => {
    if (!open) {
      setConfettiRecycle(true)
      return undefined
    }
    setConfettiRecycle(true)
    const id = window.setTimeout(() => setConfettiRecycle(false), CONFETTI_ACTIVE_MS)
    return () => window.clearTimeout(id)
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const onResize = () => {
      setDims({ width: window.innerWidth, height: window.innerHeight })
    }
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  const showConfetti = !reduceMotion && dims.width > 0 && dims.height > 0

  return createPortal(
    <div className="private-club-vip-celebration" role="dialog" aria-modal="true" aria-labelledby="private-club-vip-celebration-title">
      <button type="button" className="private-club-vip-celebration__backdrop" aria-label={t('closeAria')} onClick={onClose} />
      <div className="private-club-vip-celebration__confetti" aria-hidden>
        {showConfetti ? (
          <Confetti
            width={dims.width}
            height={dims.height}
            recycle={confettiRecycle}
            numberOfPieces={720}
            gravity={0.11}
            wind={0.028}
            colors={CONFETTI_COLORS}
            confettiSource={{
              x: 0,
              y: 0,
              w: dims.width,
              h: 0,
            }}
            initialVelocityX={5}
            initialVelocityY={7}
            tweenDuration={11000}
          />
        ) : null}
      </div>
      <div className="private-club-vip-celebration__panel">
        <div className="private-club-vip-celebration__sparkle" aria-hidden>
          <span>🎉</span>
          <span>✨</span>
          <span>💎</span>
          <span>✨</span>
          <span>🎊</span>
        </div>
        <div className="private-club-vip-celebration__icon-wrap" aria-hidden>
          <FaGem size={34} color="#0099A9" />
        </div>
        <h2 id="private-club-vip-celebration-title" className="private-club-vip-celebration__title">
          {t('privateClubVipCelebrationTitle')}
        </h2>
        <p className="private-club-vip-celebration__text">{t('privateClubVipCelebrationBody')}</p>
        <div className="private-club-vip-celebration__actions">
          <Link to="/profile" className="private-club-vip-celebration__btn private-club-vip-celebration__btn--primary" onClick={onClose}>
            {t('privateClubVipCelebrationCtaProfile')}
          </Link>
          <a
            href={WHATSAPP_SUPPORT_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className="private-club-vip-celebration__btn private-club-vip-celebration__btn--secondary"
            onClick={onClose}
          >
            {t('privateClubVipCelebrationCtaWhatsApp')}
          </a>
        </div>
      </div>
    </div>,
    document.body,
  )
}

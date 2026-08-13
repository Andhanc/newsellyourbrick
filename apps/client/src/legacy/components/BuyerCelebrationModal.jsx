import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Confetti from 'react-confetti'
import { FiCheckCircle } from 'react-icons/fi'
import { useReducedMotion } from 'framer-motion'
import './BuyerCelebrationModal.css'

const CONFETTI_COLORS = ['#3bc0cb', '#2aa8b4', '#6ad6dd', '#dff6f8', '#2eafb9', '#a8e8ed']
const CONFETTI_ACTIVE_MS = 4500

/**
 * Та же celebration-модалка, что после сохранения данных в профиле
 * (конфетти + карточка + primary CTA).
 */
export default function BuyerCelebrationModal({
  open,
  title,
  text,
  ctaLabel,
  onCta,
  titleId = 'buyer-celebration-title',
}) {
  const reduceMotion = useReducedMotion() ?? false
  const [windowSize, setWindowSize] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  }))
  const [confettiRecycle, setConfettiRecycle] = useState(true)

  useEffect(() => {
    if (!open) return undefined

    const onResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight })
    }
    onResize()
    window.addEventListener('resize', onResize)

    setConfettiRecycle(true)
    const timer = window.setTimeout(() => setConfettiRecycle(false), CONFETTI_ACTIVE_MS)

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)

    return () => {
      window.removeEventListener('resize', onResize)
      window.clearTimeout(timer)
      window.removeEventListener('keydown', onKeyDown, true)
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <>
      <div className="buyer-celebration-confetti" aria-hidden>
        {!reduceMotion ? (
          <Confetti
            width={windowSize.width}
            height={windowSize.height}
            recycle={confettiRecycle}
            numberOfPieces={520}
            gravity={0.1}
            wind={0.02}
            colors={CONFETTI_COLORS}
            confettiSource={{
              x: 0,
              y: 0,
              w: windowSize.width,
              h: 0,
            }}
            initialVelocityX={4}
            initialVelocityY={6}
            tweenDuration={11000}
          />
        ) : null}
      </div>
      <div className="buyer-celebration-root">
        <div
          className="buyer-celebration-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <div className="buyer-celebration-modal__icon" aria-hidden>
            <FiCheckCircle size={36} strokeWidth={2.2} />
          </div>
          <h2 id={titleId} className="buyer-celebration-modal__title">
            {title}
          </h2>
          <p className="buyer-celebration-modal__text">{text}</p>
          <button type="button" className="buyer-celebration-modal__btn" onClick={onCta}>
            {ctaLabel}
          </button>
        </div>
      </div>
    </>,
    document.body
  )
}

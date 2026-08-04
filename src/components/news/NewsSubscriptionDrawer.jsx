import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FiBell, FiCheck, FiMail, FiX } from 'react-icons/fi'
import { DRAWER_DISMISS_MS, useDrawerDismiss } from '@/hooks/useDrawerDismiss'

const STORAGE_KEY = 'syb_newsletter_subscription'
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SUCCESS_PARTICLES = [
  { x: '-58px', y: '-30px', rotate: '-34deg', delay: '0ms' },
  { x: '-66px', y: '8px', rotate: '28deg', delay: '60ms' },
  { x: '-42px', y: '46px', rotate: '76deg', delay: '90ms' },
  { x: '-6px', y: '62px', rotate: '114deg', delay: '20ms' },
  { x: '38px', y: '49px', rotate: '148deg', delay: '80ms' },
  { x: '66px', y: '12px', rotate: '206deg', delay: '30ms' },
  { x: '56px', y: '-34px', rotate: '252deg', delay: '100ms' },
  { x: '18px', y: '-60px', rotate: '304deg', delay: '45ms' },
  { x: '-25px', y: '-56px', rotate: '338deg', delay: '110ms' },
]

export default function NewsSubscriptionDrawer({ isOpen, onClose }) {
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const inputRef = useRef(null)
  const { visible, isClosing, requestClose } = useDrawerDismiss(isOpen, onClose, {
    duration: DRAWER_DISMISS_MS.spring,
  })

  useEffect(() => {
    if (!isOpen) return undefined
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
      if (saved?.email) {
        setEmail(saved.email)
        setConsent(true)
        setSubmitted(true)
      } else {
        setSubmitted(false)
      }
    } catch {
      setSubmitted(false)
    }

    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 440)
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') requestClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.clearTimeout(focusTimer)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, requestClose])

  if (!visible || typeof document === 'undefined') return null

  const emailIsValid = EMAIL_PATTERN.test(email.trim())

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!emailIsValid || !consent) return
    const normalizedEmail = email.trim().toLowerCase()
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          email: normalizedEmail,
          consent: true,
          subscribedAt: new Date().toISOString(),
        }),
      )
    } catch {
      /* Подтверждение всё равно остаётся в текущей сессии. */
    }
    setEmail(normalizedEmail)
    setSubmitted(true)
  }

  return createPortal(
    <>
      <button
        type="button"
        className={`news-subscription-drawer__backdrop${
          isClosing ? ' news-subscription-drawer__backdrop--closing' : ''
        }`}
        onClick={() => requestClose()}
        aria-label="Закрыть подписку"
      />
      <div
        className="news-subscription-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="news-subscription-title"
        aria-describedby="news-subscription-description"
      >
        <section
          className={`news-subscription-drawer__panel${
            isClosing ? ' news-subscription-drawer__panel--closing' : ''
          }`}
        >
          <div className="news-subscription-drawer__handle" aria-hidden>
            <span />
          </div>
          <button
            type="button"
            className="news-subscription-drawer__close"
            onClick={() => requestClose()}
            aria-label="Закрыть"
          >
            <FiX size={20} />
          </button>

          <div className="news-subscription-drawer__body">
            {submitted ? (
              <div
                className="news-subscription-drawer__success-stage"
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                <div
                  className="news-subscription-drawer__celebration"
                  aria-hidden
                >
                  <span className="news-subscription-drawer__success-ring" />
                  {SUCCESS_PARTICLES.map((particle, index) => (
                    <span
                      key={index}
                      className="news-subscription-drawer__success-particle"
                      style={{
                        '--particle-x': particle.x,
                        '--particle-y': particle.y,
                        '--particle-rotate': particle.rotate,
                        '--particle-delay': particle.delay,
                      }}
                    />
                  ))}
                  <div className="news-subscription-drawer__icon-wrap news-subscription-drawer__icon-wrap--success">
                    <FiCheck className="news-subscription-drawer__success-icon" size={34} />
                  </div>
                </div>

                <div className="news-subscription-drawer__success-copy">
                  <p className="news-subscription-drawer__eyebrow">Подписка активна</p>
                  <h2 id="news-subscription-title">Вы узнаете первыми</h2>
                  <p id="news-subscription-description" className="news-subscription-drawer__lead">
                    Новости и важные уведомления будут приходить на {email}.
                  </p>
                  <button
                    type="button"
                    className="news-subscription-drawer__submit btn-tiffany-shine"
                    onClick={() => requestClose()}
                  >
                    Готово
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="news-subscription-drawer__icon-wrap" aria-hidden>
                <FiBell className="news-subscription-drawer__bell" size={31} />
                </div>

                <p className="news-subscription-drawer__eyebrow">SellYourBrick Journal</p>
                <h2 id="news-subscription-title">Получайте главное первыми</h2>
                <p id="news-subscription-description" className="news-subscription-drawer__lead">
                  Только важные новости рынка, новые объекты и уведомления — без лишнего шума.
                </p>

                <form className="news-subscription-drawer__form" onSubmit={handleSubmit}>
                  <label className="news-subscription-drawer__field">
                    <span>Электронная почта</span>
                    <span className="news-subscription-drawer__input-wrap">
                      <FiMail size={19} aria-hidden />
                      <input
                        ref={inputRef}
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@example.com"
                        autoComplete="email"
                        required
                      />
                    </span>
                  </label>

                  <label className="news-subscription-drawer__consent">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(event) => setConsent(event.target.checked)}
                      required
                    />
                    <span>
                      Я согласен получать новости и уведомления SellYourBrick по электронной почте.
                    </span>
                  </label>

                  <button
                    type="submit"
                    className="news-subscription-drawer__submit btn-tiffany-shine"
                    disabled={!emailIsValid || !consent}
                  >
                    <FiBell size={18} aria-hidden />
                    Подтвердить подписку
                  </button>
                  <p className="news-subscription-drawer__privacy">
                    От подписки можно отказаться в любой момент.
                  </p>
                </form>
              </>
            )}
          </div>
        </section>
      </div>
    </>,
    document.body,
  )
}

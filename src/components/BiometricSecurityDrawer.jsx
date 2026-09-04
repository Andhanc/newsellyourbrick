import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { FiLock, FiShield, FiX } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'

import './BiometricSecurityDrawer.css'

export default function BiometricSecurityDrawer({
  open,
  mode = 'offer',
  busy = false,
  error = '',
  onPrimary,
  onSecondary,
}) {
  const { t } = useTranslation()
  const panelRef = useRef(null)

  useEffect(() => {
    if (error) panelRef.current?.scrollTo?.({ top: 0, behavior: 'smooth' })
  }, [error])

  useEffect(() => {
    if (!open || mode !== 'lock' || typeof document === 'undefined') return undefined

    const appRoot = document.getElementById('root')
    const previousOverflow = document.body.style.overflow
    const hadInert = appRoot?.hasAttribute('inert') || false
    const previousAriaHidden = appRoot?.getAttribute('aria-hidden')

    document.body.style.overflow = 'hidden'
    appRoot?.setAttribute('inert', '')
    appRoot?.setAttribute('aria-hidden', 'true')

    return () => {
      document.body.style.overflow = previousOverflow
      if (!hadInert) appRoot?.removeAttribute('inert')
      if (previousAriaHidden == null) appRoot?.removeAttribute('aria-hidden')
      else appRoot?.setAttribute('aria-hidden', previousAriaHidden)
    }
  }, [mode, open])

  if (!open || typeof document === 'undefined') return null

  const locked = mode === 'lock'
  const title = locked
    ? t('biometric_lockTitle')
    : t('biometric_offerTitle')
  const description = locked
    ? t('biometric_lockDescription')
    : t('biometric_offerDescription')

  return createPortal(
    <div className={`biometric-drawer${locked ? ' biometric-drawer--lock' : ''}`}>
      <button
        type="button"
        className="biometric-drawer__backdrop"
        aria-label={locked ? undefined : t('close')}
        tabIndex={locked ? -1 : 0}
        onClick={locked ? undefined : onSecondary}
      />
      <section
        ref={panelRef}
        className="biometric-drawer__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="biometric-drawer-title"
        aria-describedby="biometric-drawer-description"
      >
        {!locked ? (
          <button
            type="button"
            className="biometric-drawer__close"
            onClick={onSecondary}
            aria-label={t('close')}
          >
            <FiX aria-hidden />
          </button>
        ) : null}

        <div className="biometric-drawer__art" aria-hidden="true">
          <span className="biometric-drawer__halo" />
          <span className="biometric-drawer__image-wrap">
            <img
              src="/images/profile/biometric-fingerprint-v1.png"
              alt=""
              width="447"
              height="447"
              decoding="async"
            />
          </span>
          <span className="biometric-drawer__badge">
            {locked ? <FiLock /> : <FiShield />}
          </span>
        </div>

        <div className="biometric-drawer__copy">
          <span className="biometric-drawer__eyebrow">
            {t('biometric_eyebrow')}
          </span>
          <h2 id="biometric-drawer-title">{title}</h2>
          <p id="biometric-drawer-description">{description}</p>
        </div>

        {error ? (
          <p className="biometric-drawer__error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="biometric-drawer__actions">
          <button
            type="button"
            className="biometric-drawer__primary"
            onClick={onPrimary}
            disabled={busy}
            aria-busy={busy}
            autoFocus={locked}
          >
            {busy
              ? t('biometric_wait')
              : locked
                ? t('biometric_unlock')
                : t('biometric_add')}
          </button>
          <button
            type="button"
            className="biometric-drawer__secondary"
            onClick={onSecondary}
            disabled={busy}
          >
            {locked
              ? t('biometric_logout')
              : t('biometric_later')}
          </button>
        </div>

        <p className="biometric-drawer__privacy">
          {t('biometric_privacy')}
        </p>
      </section>
    </div>,
    document.body,
  )
}

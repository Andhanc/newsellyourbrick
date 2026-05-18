import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useDrawerDismiss } from '../hooks/useDrawerDismiss'
import { fetchVisitorCountryCode } from '../utils/geoCountry'
import { applySiteLanguage, resolveLanguageFromCountryCode } from '../utils/localeFromCountry'
import './CookieConsentDrawer.css'

const STORAGE_KEY = 'syb_cookie_consent_v1'

export function readCookieConsentChoice() {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function writeCookieConsentChoice(choice) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, choice)
  } catch {
    /* ignore */
  }
}

export default function CookieConsentDrawer({ open, onClose }) {
  const { t } = useTranslation()
  const { visible, isClosing, requestClose } = useDrawerDismiss(open, onClose)
  const [resolving, setResolving] = useState(false)

  if (!visible || typeof document === 'undefined') return null

  const closingModal = isClosing ? ' drawer-dismiss-modal--closing' : ''
  const closingBackdrop = isClosing ? ' drawer-dismiss-backdrop--closing' : ''
  const busy = resolving || isClosing

  const complete = (choice) => {
    writeCookieConsentChoice(choice)
    requestClose()
  }

  const handleDecline = async () => {
    if (busy) return
    setResolving(true)
    try {
      await applySiteLanguage('en')
      complete('decline')
    } catch (e) {
      console.warn('CookieConsent: decline locale', e)
      complete('decline')
    } finally {
      setResolving(false)
    }
  }

  const handleAccept = async () => {
    if (busy) return
    setResolving(true)
    try {
      const countryCode = await fetchVisitorCountryCode()
      const lang = resolveLanguageFromCountryCode(countryCode)
      await applySiteLanguage(lang)
      complete('accept')
    } catch (e) {
      console.warn('CookieConsent: accept locale', e)
      try {
        await applySiteLanguage('en')
      } catch {
        /* ignore */
      }
      complete('accept')
    } finally {
      setResolving(false)
    }
  }

  return createPortal(
    <>
      <div
        role="presentation"
        className={`cookie-consent-modal__backdrop${closingBackdrop}`}
        onClick={() => handleDecline()}
      />
      <div className="cookie-consent-modal__stage">
        <div
          className={`cookie-consent-modal__panel${closingModal}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-consent-modal-title"
          aria-describedby="cookie-consent-modal-text"
          aria-busy={resolving}
        >
          <h2 id="cookie-consent-modal-title" className="cookie-consent-modal__title">
            {t('cookieConsentTitle')}
          </h2>
          <p id="cookie-consent-modal-text" className="cookie-consent-modal__text">
            {t('cookieConsentBody')}
          </p>

          <div className="cookie-consent-modal__actions">
            <button
              type="button"
              className="cookie-consent-modal__btn cookie-consent-modal__btn--decline"
              onClick={() => handleDecline()}
              disabled={busy}
            >
              {t('cookieConsentDecline')}
            </button>
            <button
              type="button"
              className="cookie-consent-modal__btn cookie-consent-modal__btn--accept"
              onClick={() => handleAccept()}
              disabled={busy}
            >
              {resolving ? t('cookieConsentApplying') : t('cookieConsentAccept')}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  )
}

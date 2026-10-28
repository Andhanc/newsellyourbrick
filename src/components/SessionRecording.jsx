import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import {
  OPEN_RECORDING_SETTINGS,
  RECORDING_CONSENT_KEY,
  readRecordingConsent,
  revokeSessionRecording,
  saveRecordingConsent,
  startSessionRecording,
} from '../utils/sessionRecording'
import './CookieConsentDrawer.css'
import './SessionRecording.css'

export default function SessionRecording() {
  const { t } = useTranslation()
  const [choice, setChoice] = useState(readRecordingConsent)
  const [open, setOpen] = useState(() => choice == null)

  useEffect(() => {
    if (choice === 'accept') startSessionRecording()
  }, [choice])

  useEffect(() => {
    if (typeof document === 'undefined') return undefined
    const show = () => setOpen(true)
    const sync = (event) => {
      if (event.key !== RECORDING_CONSENT_KEY && event.key !== null) return
      const next = readRecordingConsent()
      setChoice(next)
      setOpen(next == null)
      if (next !== 'accept') revokeSessionRecording()
    }
    window.addEventListener(OPEN_RECORDING_SETTINGS, show)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(OPEN_RECORDING_SETTINGS, show)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const choose = (next) => {
    saveRecordingConsent(next)
    setChoice(next)
    setOpen(false)
    if (next === 'decline') revokeSessionRecording()
  }

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className="cookie-consent-modal__stage">
      <section className="cookie-consent-modal__panel" role="dialog" aria-modal="false"
        aria-labelledby="recording-consent-title" aria-describedby="recording-consent-description">
        <h2 className="cookie-consent-modal__title" id="recording-consent-title">{t('recordingConsentTitle')}</h2>
        <p className="cookie-consent-modal__text" id="recording-consent-description">{t('recordingConsentBody')}</p>
        <div className="cookie-consent-modal__actions">
          <button type="button" className="cookie-consent-modal__btn cookie-consent-modal__btn--decline" onClick={() => choose('decline')}>
            {t('recordingConsentDecline')}
          </button>
          <button type="button" className="cookie-consent-modal__btn cookie-consent-modal__btn--accept" onClick={() => choose('accept')}>
            {t('recordingConsentAccept')}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  )
}

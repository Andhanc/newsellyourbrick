import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Loader2, MapPin, X } from 'lucide-react'
import {
  buildGoogleSatelliteEmbedUrl,
  buildGoogleStreetViewEmbedUrl,
} from '../utils/googleStreetView'
import './PropertyStreetViewDrawer.css'

export default function PropertyStreetViewDrawer({
  isOpen,
  onClose,
  center,
  mode = 'streetview',
}) {
  const { t, i18n } = useTranslation()
  const [isLoaded, setIsLoaded] = useState(false)
  const closeButtonRef = useRef(null)
  const previouslyFocusedRef = useRef(null)
  const apiKey = String(import.meta.env.VITE_GOOGLE_MAPS_EMBED_API_KEY || '').trim()
  const isSatellite = mode === 'satellite'

  const embedUrl = useMemo(
    () => (isSatellite
      ? buildGoogleSatelliteEmbedUrl({
        center,
        apiKey,
        language: i18n.language,
      })
      : buildGoogleStreetViewEmbedUrl({
        center,
        apiKey,
        language: i18n.language,
      })),
    [apiKey, center?.[0], center?.[1], i18n.language, isSatellite],
  )

  useEffect(() => {
    if (isOpen) setIsLoaded(false)
  }, [embedUrl, isOpen])

  useEffect(() => {
    if (!isOpen) return undefined

    previouslyFocusedRef.current = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus())

    return () => {
      window.cancelAnimationFrame(focusFrame)
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      window.requestAnimationFrame(() => previouslyFocusedRef.current?.focus?.())
    }
  }, [isOpen, onClose])

  if (!isOpen || typeof document === 'undefined') return null

  return createPortal(
    <section
      className="property-street-view-drawer"
      role="dialog"
      aria-modal="true"
      aria-label={t(isSatellite ? 'propertySatelliteMapTitle' : 'propertyStreetViewTitle')}
      aria-busy={embedUrl && !isLoaded ? 'true' : 'false'}
    >
      {embedUrl ? (
        <iframe
          key={embedUrl}
          className={`property-street-view-drawer__frame${isLoaded ? ' is-loaded' : ''}`}
          src={embedUrl}
          title={t(isSatellite ? 'propertySatelliteMapFrameTitle' : 'propertyStreetViewFrameTitle')}
          referrerPolicy="strict-origin-when-cross-origin"
          allow="fullscreen; accelerometer; gyroscope"
          tabIndex={0}
          onLoad={() => setIsLoaded(true)}
        />
      ) : (
        <div className="property-street-view-drawer__unavailable" role="status">
          <span className="property-street-view-drawer__unavailable-icon" aria-hidden="true">
            <MapPin size={30} strokeWidth={1.9} />
          </span>
          <h2>{t(isSatellite ? 'propertySatelliteMapUnavailableTitle' : 'propertyStreetViewUnavailableTitle')}</h2>
          <p>{t(isSatellite ? 'propertySatelliteMapUnavailableDescription' : 'propertyStreetViewUnavailableDescription')}</p>
        </div>
      )}

      {embedUrl && !isLoaded ? (
        <div className="property-street-view-drawer__loading" role="status">
          <Loader2 size={28} className="property-street-view-drawer__spinner" aria-hidden="true" />
          <span>{t(isSatellite ? 'propertySatelliteMapLoading' : 'propertyStreetViewLoading')}</span>
        </div>
      ) : null}

      <button
        ref={closeButtonRef}
        type="button"
        className="property-street-view-drawer__close"
        onClick={onClose}
        aria-label={t('closeAria')}
      >
        <X size={30} strokeWidth={2.2} aria-hidden="true" />
      </button>
    </section>,
    document.body,
  )
}

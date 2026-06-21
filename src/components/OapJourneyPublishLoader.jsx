import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import './OapJourneyPublishLoader.css'

export default function OapJourneyPublishLoader() {
  const { t } = useTranslation()

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className="oap-journey-publish-loader"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={t('oap_journeyPublishLoading')}
    >
      <div className="oap-journey-publish-loader__card">
        <span className="oap-journey-publish-loader__spinner" aria-hidden="true" />
        <p className="oap-journey-publish-loader__text">{t('oap_journeyPublishLoading')}</p>
      </div>
    </div>,
    document.body,
  )
}

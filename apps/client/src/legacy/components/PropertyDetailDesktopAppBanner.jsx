import { useState } from 'react'
import { FiX } from 'react-icons/fi'
import { FaApple } from 'react-icons/fa'
import { useTranslation } from 'react-i18next'
import { showNotification } from '../utils/toastHelper'
import PropertyDetailAppBannerPhone from './PropertyDetailAppBannerPhone'

const DISMISS_KEY = 'pd-v3-app-banner-dismissed'

const GOOGLE_PLAY_ICON = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <path d="M3 20.5V3.5C3 2.91 3.34 2.39 3.84 2.15L13.69 12L3.84 21.85C3.34 21.6 3 21.09 3 20.5Z" fill="#4285F4" />
    <path d="M16.81 15.12L6.05 21.34L14.54 12.85L16.81 15.12Z" fill="#EA4335" />
    <path d="M6.05 2.66L16.81 8.88L14.54 11.15L6.05 2.66Z" fill="#FBBC04" />
    <path
      d="M16.81 8.88L20.16 6.51C20.66 6.26 21 5.75 21 5.16V18.84C21 18.25 20.66 17.74 20.16 17.49L16.81 15.12L14.54 12.85L16.81 8.88Z"
      fill="#34A853"
    />
  </svg>
)

export default function PropertyDetailDesktopAppBanner({ className = '' }) {
  const { t } = useTranslation()
  const [dismissed, setDismissed] = useState(
    () => typeof sessionStorage !== 'undefined' && sessionStorage.getItem(DISMISS_KEY) === '1',
  )

  if (dismissed) return null

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  const handleStoreClick = () => {
    showNotification(t('footerComingSoon'))
  }

  return (
    <section
      className={`pd-v3-app-banner property-detail-auction-desktop-only${className ? ` ${className}` : ''}`}
      aria-label={t('propertyDetailMobileAppTitle')}
    >
      <div className="pd-v3-app-banner__bg" aria-hidden />

      <button
        type="button"
        className="pd-v3-app-banner__close"
        onClick={handleDismiss}
        aria-label={t('close')}
      >
        <FiX size={16} strokeWidth={2.5} />
      </button>

      <div className="pd-v3-app-banner__content">
        <div className="pd-v3-app-banner__copy">
          <h2 className="pd-v3-app-banner__title">{t('propertyDetailMobileAppTitle')}</h2>
          <p className="pd-v3-app-banner__lead">{t('propertyDetailMobileAppLead')}</p>
          <div className="pd-v3-app-banner__stores">
            <button type="button" className="pd-v3-app-banner__store" onClick={handleStoreClick}>
              <span className="pd-v3-app-banner__store-icon" aria-hidden>
                <FaApple size={22} />
              </span>
              <span className="pd-v3-app-banner__store-text">
                <span className="pd-v3-app-banner__store-label">{t('propertyDetailAppStoreTop')}</span>
                <span className="pd-v3-app-banner__store-name">App Store</span>
              </span>
            </button>
            <button type="button" className="pd-v3-app-banner__store" onClick={handleStoreClick}>
              <span className="pd-v3-app-banner__store-icon pd-v3-app-banner__store-icon--google" aria-hidden>
                {GOOGLE_PLAY_ICON}
              </span>
              <span className="pd-v3-app-banner__store-text">
                <span className="pd-v3-app-banner__store-label">{t('propertyDetailGooglePlayTop')}</span>
                <span className="pd-v3-app-banner__store-name">Google Play</span>
              </span>
            </button>
          </div>
        </div>

        <PropertyDetailAppBannerPhone />
      </div>
    </section>
  )
}

import { useTranslation } from 'react-i18next'
import { FiBell, FiChevronLeft, FiMapPin } from 'react-icons/fi'

const TIMER_VALUES = ['00', '14', '37', '12']

export default function PropertyDetailAppBannerPhone() {
  const { t } = useTranslation()
  const timerLabels = [
    t('timerDaysFull'),
    t('timerHoursFull'),
    t('timerMinutesFull'),
    t('timerSecondsFull'),
  ]

  return (
    <div className="pd-v3-app-banner__phone-wrap" aria-hidden>
      <div className="pd-v3-app-banner__iphone">
        <span className="pd-v3-app-banner__iphone-btn pd-v3-app-banner__iphone-btn--silent" />
        <span className="pd-v3-app-banner__iphone-btn pd-v3-app-banner__iphone-btn--vol-up" />
        <span className="pd-v3-app-banner__iphone-btn pd-v3-app-banner__iphone-btn--vol-down" />
        <span className="pd-v3-app-banner__iphone-btn pd-v3-app-banner__iphone-btn--power" />

        <div className="pd-v3-app-banner__iphone-shell">
          <div className="pd-v3-app-banner__iphone-screen">
            <div className="pd-v3-app-banner__iphone-island">
              <span className="pd-v3-app-banner__iphone-island-lens" />
            </div>

            <div className="pd-v3-app-banner__iphone-status">
              <span className="pd-v3-app-banner__iphone-time">9:41</span>
              <span className="pd-v3-app-banner__iphone-status-icons">
                <span className="pd-v3-app-banner__iphone-signal" />
                <span className="pd-v3-app-banner__iphone-wifi" />
                <span className="pd-v3-app-banner__iphone-battery" />
              </span>
            </div>

            <div className="pd-v3-app-banner__iphone-app">
              <div className="pd-v3-app-banner__iphone-nav">
                <FiChevronLeft size={14} strokeWidth={2.5} />
                <span>{t('propertyDetailTabAbout')}</span>
                <FiBell size={13} strokeWidth={2.25} />
              </div>

              <div className="pd-v3-app-banner__iphone-hero">
                <div className="pd-v3-app-banner__iphone-hero-overlay" />
                <span className="pd-v3-app-banner__iphone-badge">
                  {t('propertyDetailAuctionActive')}
                </span>
                <span className="pd-v3-app-banner__iphone-hero-title">Villa Azure Coast</span>
                <span className="pd-v3-app-banner__iphone-hero-location">
                  <FiMapPin size={10} strokeWidth={2.5} />
                  Paphos, Cyprus
                </span>
              </div>

              <div className="pd-v3-app-banner__iphone-panel">
                <p className="pd-v3-app-banner__iphone-panel-label">{t('propertyDetailCurrentMaxBid')}</p>
                <p className="pd-v3-app-banner__iphone-panel-value">€ 1 250 000</p>

                <div className="pd-v3-app-banner__iphone-timer">
                  {TIMER_VALUES.map((value, index) => (
                    <div key={value} className="pd-v3-app-banner__iphone-timer-col">
                      <div className="pd-v3-app-banner__iphone-flip">
                        <span className="pd-v3-app-banner__iphone-flip-top">{value}</span>
                        <span className="pd-v3-app-banner__iphone-flip-line" />
                        <span className="pd-v3-app-banner__iphone-flip-bottom">{value}</span>
                      </div>
                      <span className="pd-v3-app-banner__iphone-timer-label">{timerLabels[index]}</span>
                    </div>
                  ))}
                </div>

                <div className="pd-v3-app-banner__iphone-input">€ 1 260 000</div>
                <div className="pd-v3-app-banner__iphone-cta">{t('propertyDetailMobileAppPhoneAction')}</div>
              </div>
            </div>

            <div className="pd-v3-app-banner__iphone-home-bar" />
          </div>
        </div>

        <div className="pd-v3-app-banner__iphone-reflection" />
      </div>
    </div>
  )
}

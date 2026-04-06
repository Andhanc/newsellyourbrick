import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ShoppingCart } from 'lucide-react'
import './PricingCards.css'

export default function PricingCards({ onBookCall, compact = false, mobileTwoColumn = false }) {
  const { t } = useTranslation()
  const [starterMonthly, setStarterMonthly] = useState(false)
  const [proMonthly, setProMonthly] = useState(false)
  const [vipMonthly, setVipMonthly] = useState(false)

  const starterFeatureKeys = ['buyerPricing_featS0', 'buyerPricing_featS1', 'buyerPricing_featS2']
  const proFeatureKeys = ['buyerPricing_featP0', 'buyerPricing_featP1', 'buyerPricing_featP2', 'buyerPricing_featP3']
  const vipFeatureKeys = ['buyerPricing_featV0', 'buyerPricing_featV1', 'buyerPricing_featV2', 'buyerPricing_featV3']

  const LightCheckIcon = ({ className = '' }) => (
    <svg
      className={`pricing-card__check-light ${className}`.trim()}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="8" />
      <path d="M5.5 8.5L7 10L11 6" />
    </svg>
  )

  const DarkCheckIcon = ({ className = '' }) => (
    <svg
      className={`pricing-card__check-dark ${className}`.trim()}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="7.5" />
      <path d="M5.5 8.5L7 10L11 6" />
    </svg>
  )

  const handleStarterCall = () => {
    if (typeof onBookCall === 'function') onBookCall('starter')
  }

  const handleProCall = () => {
    if (typeof onBookCall === 'function') onBookCall('pro')
    else window.open('https://checkout.stripe.com/pay?amount=9900&currency=usd&description=Pro', '_blank')
  }

  const handleVipCall = () => {
    if (typeof onBookCall === 'function') onBookCall('vip')
    else window.open('https://checkout.stripe.com/pay?amount=19900&currency=usd&description=VIP', '_blank')
  }

  const perMonth = t('buyerPricing_perMonth')
  const toggleAria = t('buyerPricing_toggleAria')
  const toggleLabel = t('buyerPricing_toggleLabel')

  return (
    <div className={`pricing-cards${mobileTwoColumn ? ' pricing-cards--mobile-two-col' : ''}`}>
      <div className={`pricing-cards__grid ${compact ? 'pricing-cards__grid--compact' : ''}`}>
        <div className="pricing-card--starter">
          <div className="pricing-card__header">
            <div className="pricing-card__header-top">
              <div className="pricing-card__header-top-left">
                <h2 className="pricing-card__title pricing-card__title--struck">Starter</h2>
                <p className="pricing-card__desc">{t('buyerPricing_starterDesc')}</p>
              </div>
              <span className="pricing-card__badge">{t('buyerPricing_badgeFree')}</span>
            </div>
            <div className="pricing-card__price-row pricing-card__price-row--starter-free">
              <span className="pricing-card__price pricing-card__price--free">$0</span>
              <span className="pricing-card__price-unit">{perMonth}</span>
              <span className="pricing-card__price-was" aria-hidden="true">
                $29
              </span>
            </div>
            <button type="button" className="pricing-card__cta" onClick={handleStarterCall}>
              {t('buyerPricing_startFree')}
              <ShoppingCart size={20} strokeWidth={2} />
            </button>
          </div>
          <div className="pricing-card__features">
            <div className="pricing-card__features-grid">
              {starterFeatureKeys.map((key) => (
                <div key={key} className="pricing-card__feature">
                  <LightCheckIcon />
                  <span>{t(key)}</span>
                </div>
              ))}
            </div>
            <div className="pricing-card__toggle-wrap">
              <button
                type="button"
                className="pricing-card__toggle"
                data-enabled={starterMonthly}
                onClick={() => setStarterMonthly(!starterMonthly)}
                aria-pressed={starterMonthly}
                aria-label={toggleAria}
              >
                <span className="pricing-card__toggle-thumb" />
              </button>
              <span className="pricing-card__toggle-label">{toggleLabel}</span>
            </div>
          </div>
        </div>

        <div className="pricing-card--pro">
          <div className="pricing-card__header">
            <div className="pricing-card__header-top">
              <div className="pricing-card__header-top-left">
                <h2 className="pricing-card__title">Pro</h2>
                <p className="pricing-card__desc">{t('buyerPricing_proDesc')}</p>
              </div>
              <span className="pricing-card__badge">{t('buyerPricing_badgeBest')}</span>
            </div>
            <div className="pricing-card__price-row">
              <span className="pricing-card__price">$99</span>
              <span className="pricing-card__price-unit">{perMonth}</span>
            </div>
            <button type="button" className="pricing-card__cta" onClick={handleProCall}>
              {t('buyerPricing_buyNow')}
              <ShoppingCart size={20} strokeWidth={2} />
            </button>
          </div>
          <div className="pricing-card__features">
            <div className="pricing-card__features-grid">
              {proFeatureKeys.map((key) => (
                <div key={key} className="pricing-card__feature">
                  <DarkCheckIcon />
                  <span>{t(key)}</span>
                </div>
              ))}
            </div>
            <div className="pricing-card__toggle-wrap">
              <button
                type="button"
                className="pricing-card__toggle"
                data-enabled={proMonthly}
                onClick={() => setProMonthly(!proMonthly)}
                aria-pressed={proMonthly}
                aria-label={toggleAria}
              >
                <span className="pricing-card__toggle-thumb" />
              </button>
              <span className="pricing-card__toggle-label">{toggleLabel}</span>
            </div>
          </div>
        </div>

        <div className="pricing-card--vip">
          <div className="pricing-card__header">
            <div className="pricing-card__header-top">
              <div className="pricing-card__header-top-left">
                <h2 className="pricing-card__title">VIP</h2>
                <p className="pricing-card__desc">{t('buyerPricing_vipDesc')}</p>
              </div>
              <span className="pricing-card__badge">{t('buyerPricing_badgeElite')}</span>
            </div>
            <div className="pricing-card__price-row">
              <span className="pricing-card__price">$199</span>
              <span className="pricing-card__price-unit">{perMonth}</span>
            </div>
            <button type="button" className="pricing-card__cta" onClick={handleVipCall}>
              {t('buyerPricing_buyNow')}
              <ShoppingCart size={20} strokeWidth={2} />
            </button>
          </div>
          <div className="pricing-card__features">
            <div className="pricing-card__features-grid">
              {vipFeatureKeys.map((key) => (
                <div key={key} className="pricing-card__feature">
                  <DarkCheckIcon />
                  <span>{t(key)}</span>
                </div>
              ))}
            </div>
            <div className="pricing-card__toggle-wrap">
              <button
                type="button"
                className="pricing-card__toggle"
                data-enabled={vipMonthly}
                onClick={() => setVipMonthly(!vipMonthly)}
                aria-pressed={vipMonthly}
                aria-label={toggleAria}
              >
                <span className="pricing-card__toggle-thumb" />
              </button>
              <span className="pricing-card__toggle-label">{toggleLabel}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

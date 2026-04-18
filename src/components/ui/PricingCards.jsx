import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { ShoppingCart } from 'lucide-react'
import './PricingCards.css'

const TIER_ORDER = { starter: 0, pro: 1, vip: 2 }

function tierBelow(tier, current) {
  if (current == null) return false
  return TIER_ORDER[tier] < TIER_ORDER[current]
}

function TierShell({ creative, side, children }) {
  if (!creative) return children
  const motionProps =
    side === 'left'
      ? {
          initial: { opacity: 0, y: 36, rotate: -5 },
          animate: { opacity: 1, y: 0, rotate: -5 },
          transition: { type: 'spring', duration: 0.52 },
          whileHover: { scale: 1.025, transition: { duration: 0.2 } },
        }
      : side === 'right'
        ? {
            initial: { opacity: 0, y: 36, rotate: 5 },
            animate: { opacity: 1, y: 0, rotate: 5 },
            transition: { type: 'spring', duration: 0.52, delay: 0.06 },
            whileHover: { scale: 1.025, transition: { duration: 0.2 } },
          }
        : {
            initial: { opacity: 0, y: 44, scale: 0.94 },
            animate: { opacity: 1, y: 0, scale: 1.06 },
            transition: { type: 'spring', duration: 0.62, delay: 0.03 },
            whileHover: { scale: 1.08, transition: { duration: 0.2 } },
          }
  return (
    <motion.div
      className={`pricing-card--creative-outer pricing-card--creative-outer--${side}`}
      {...motionProps}
    >
      {children}
    </motion.div>
  )
}

export default function PricingCards({
  onBookCall,
  compact = false,
  mobileTwoColumn = false,
  /** «Тёмная сцена» + наклон карточек + центр Pro (страница /subscriptions). В compact не используется. */
  creative = false,
  /** Блокировка кнопки оплаты Pro (редирект в Stripe). */
  checkoutBusy = false,
  /** 'starter' | 'pro' | 'vip' — с effectivePurchasedTier; null = неизвестно (кнопки как раньше). */
  currentPlanVisual = null,
}) {
  const { t } = useTranslation()
  const [starterMonthly, setStarterMonthly] = useState(false)
  const [proMonthly, setProMonthly] = useState(false)
  const [vipMonthly, setVipMonthly] = useState(false)

  const starterFeatureKeys = ['buyerPricing_featS0', 'buyerPricing_featS1', 'buyerPricing_featS2']
  const proFeatureKeys = ['buyerPricing_featP0', 'buyerPricing_featP1', 'buyerPricing_featP2', 'buyerPricing_featP3']
  const vipFeatureKeys = ['buyerPricing_featV0', 'buyerPricing_featV1', 'buyerPricing_featV2', 'buyerPricing_featV3']

  const cur = currentPlanVisual
  const useCreative = Boolean(creative && !compact)

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
    else window.open('https://checkout.stripe.com/pay?amount=9900&currency=eur&description=Pro', '_blank')
  }

  const handleVipCall = () => {
    if (typeof onBookCall === 'function') onBookCall('vip')
    else window.open('https://checkout.stripe.com/pay?amount=39900&currency=eur&description=VIP', '_blank')
  }

  const perMonth = t('buyerPricing_perMonth')
  const toggleAria = t('buyerPricing_toggleAria')
  const toggleLabel = t('buyerPricing_toggleLabel')

  const starterCurrent = cur === 'starter'
  const starterBelow = tierBelow('starter', cur)
  const proCurrent = cur === 'pro'
  const proBelow = tierBelow('pro', cur)
  const vipCurrent = cur === 'vip'

  const StarterCheckIcon = useCreative ? DarkCheckIcon : LightCheckIcon

  const starterFeaturesGrid = (
    <div className="pricing-card__features-grid pricing-card__features-grid--in-header">
      {starterFeatureKeys.map((key) => (
        <div key={key} className="pricing-card__feature">
          <StarterCheckIcon />
          <span>{t(key)}</span>
        </div>
      ))}
    </div>
  )

  const starterToggle = (
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
  )

  const proFeaturesGrid = (
    <div className="pricing-card__features-grid pricing-card__features-grid--in-header">
      {proFeatureKeys.map((key) => (
        <div key={key} className="pricing-card__feature">
          <DarkCheckIcon />
          <span>{t(key)}</span>
        </div>
      ))}
    </div>
  )

  const proToggle = (
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
  )

  const vipFeaturesGrid = (
    <div className="pricing-card__features-grid pricing-card__features-grid--in-header">
      {vipFeatureKeys.map((key) => (
        <div key={key} className="pricing-card__feature">
          <DarkCheckIcon />
          <span>{t(key)}</span>
        </div>
      ))}
    </div>
  )

  const vipToggle = (
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
  )

  return (
    <div
      className={`pricing-cards${useCreative ? ' pricing-cards--creative' : ''}${
        mobileTwoColumn && !useCreative ? ' pricing-cards--mobile-two-col' : ''
      }`}
    >
      <div
        className={`pricing-cards__grid ${compact ? 'pricing-cards__grid--compact' : ''}${
          useCreative ? ' pricing-cards__grid--creative' : ''
        }`}
      >
        <TierShell creative={useCreative} side="left">
          <div
            className={`pricing-card--starter${starterCurrent ? ' pricing-card--is-current-tier' : ''}${
              starterBelow ? ' pricing-card--tier-below' : ''
            }${useCreative ? ' pricing-card--creative-single' : ''}`}
          >
            {starterCurrent ? (
              <div className="pricing-card__tier-ribbon" role="status">
                {t('subCab_preview_currentPlan')}
              </div>
            ) : null}
            <div className={`pricing-card__header${useCreative ? ' pricing-card__header--unified' : ''}`}>
              <div className="pricing-card__header-top">
                <div className="pricing-card__header-top-left">
                  <h2
                    className={`pricing-card__title${useCreative ? '' : ' pricing-card__title--struck'}`.trim()}
                  >
                    Starter
                  </h2>
                  {!useCreative ? <p className="pricing-card__desc">{t('buyerPricing_starterDesc')}</p> : null}
                </div>
                {!starterCurrent && !useCreative ? (
                  <span className="pricing-card__badge">{t('buyerPricing_badgeFree')}</span>
                ) : null}
              </div>
              <div className="pricing-card__price-row pricing-card__price-row--starter-free">
                <span className="pricing-card__price pricing-card__price--free">€0</span>
                <span className="pricing-card__price-unit">{perMonth}</span>
                <span className="pricing-card__price-was" aria-hidden="true">
                  €29
                </span>
              </div>
              {useCreative ? starterFeaturesGrid : null}
              {starterCurrent ? (
                <button type="button" className="pricing-card__cta pricing-card__cta--muted" disabled>
                  {t('subCab_preview_planPurchased')}
                </button>
              ) : starterBelow ? (
                <button type="button" className="pricing-card__cta pricing-card__cta--muted" disabled>
                  {t('subCab_preview_planBelow')}
                </button>
              ) : (
                <button type="button" className="pricing-card__cta" onClick={handleStarterCall}>
                  {t('buyerPricing_startFree')}
                  <ShoppingCart size={20} strokeWidth={2} />
                </button>
              )}
              {useCreative ? starterToggle : null}
            </div>
            {!useCreative ? (
              <div className="pricing-card__features">
                <div className="pricing-card__features-grid">
                  {starterFeatureKeys.map((key) => (
                    <div key={key} className="pricing-card__feature">
                      <StarterCheckIcon />
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
            ) : null}
          </div>
        </TierShell>

        <TierShell creative={useCreative} side="center">
          {useCreative ? (
            <motion.div
              className="pricing-card__float-badge"
              animate={{ y: [0, -3, 0] }}
              transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
            >
              {proCurrent ? t('subCab_preview_currentPlan') : t('buyerPricing_badgeBest')}
            </motion.div>
          ) : null}
          <div
            className={`pricing-card--pro${proCurrent ? ' pricing-card--is-current-tier' : ''}${
              proBelow ? ' pricing-card--tier-below' : ''
            }${useCreative ? ' pricing-card--creative-single' : ''}`}
          >
            {proCurrent && !useCreative ? (
              <div className="pricing-card__tier-ribbon" role="status">
                {t('subCab_preview_currentPlan')}
              </div>
            ) : null}
            <div className={`pricing-card__header${useCreative ? ' pricing-card__header--unified' : ''}`}>
              <div className="pricing-card__header-top">
                <div className="pricing-card__header-top-left">
                  <h2 className="pricing-card__title">Pro</h2>
                  {!useCreative ? <p className="pricing-card__desc">{t('buyerPricing_proDesc')}</p> : null}
                </div>
                {!useCreative && !proCurrent ? (
                  <span className="pricing-card__badge">{t('buyerPricing_badgeBest')}</span>
                ) : null}
              </div>
              <div className="pricing-card__price-row">
                <span className="pricing-card__price">€99</span>
                <span className="pricing-card__price-unit">{perMonth}</span>
              </div>
              {useCreative ? proFeaturesGrid : null}
              {proCurrent ? (
                <button type="button" className="pricing-card__cta pricing-card__cta--muted" disabled>
                  {t('subCab_preview_planPurchased')}
                </button>
              ) : proBelow ? (
                <button type="button" className="pricing-card__cta pricing-card__cta--muted" disabled>
                  {t('subCab_preview_planBelow')}
                </button>
              ) : (
                <button
                  type="button"
                  className="pricing-card__cta"
                  onClick={handleProCall}
                  disabled={checkoutBusy}
                >
                  {t('buyerPricing_buyNow')}
                  <ShoppingCart size={20} strokeWidth={2} />
                </button>
              )}
              {useCreative ? proToggle : null}
            </div>
            {!useCreative ? (
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
            ) : null}
          </div>
        </TierShell>

        <TierShell creative={useCreative} side="right">
          <div
            className={`pricing-card--vip${vipCurrent ? ' pricing-card--is-current-tier' : ''}${
              useCreative ? ' pricing-card--creative-single' : ''
            }`}
          >
            {vipCurrent ? (
              <div className="pricing-card__tier-ribbon" role="status">
                {t('subCab_preview_currentPlan')}
              </div>
            ) : null}
            <div className={`pricing-card__header${useCreative ? ' pricing-card__header--unified' : ''}`}>
              <div className="pricing-card__header-top">
                <div className="pricing-card__header-top-left">
                  <h2 className="pricing-card__title">VIP</h2>
                  {!useCreative ? <p className="pricing-card__desc">{t('buyerPricing_vipDesc')}</p> : null}
                </div>
              </div>
              <div className="pricing-card__price-row">
                <span className="pricing-card__price">€399</span>
                <span className="pricing-card__price-unit">{perMonth}</span>
              </div>
              {useCreative ? vipFeaturesGrid : null}
              {vipCurrent ? (
                <button type="button" className="pricing-card__cta pricing-card__cta--muted" disabled>
                  {t('subCab_preview_planPurchased')}
                </button>
              ) : (
                <button type="button" className="pricing-card__cta" onClick={handleVipCall}>
                  {t('buyerPricing_buyNow')}
                  <ShoppingCart size={20} strokeWidth={2} />
                </button>
              )}
              {useCreative ? vipToggle : null}
            </div>
            {!useCreative ? (
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
            ) : null}
          </div>
        </TierShell>
      </div>
    </div>
  )
}

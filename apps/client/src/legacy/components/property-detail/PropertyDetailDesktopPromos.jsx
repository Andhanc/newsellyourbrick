import { ShieldCheck, Headphones, TrendingUp, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import './PropertyDetailDesktopPromos.css'

export function PropertyDetailDesktopTrustPromo({ moderationStatus = 'approved' }) {
  const { t } = useTranslation()
  const isApproved = String(moderationStatus || '').toLowerCase() === 'approved'

  return (
    <article className="pdd-promo pdd-promo--trust">
      <span className="pdd-promo__icon" aria-hidden>
        <ShieldCheck size={22} strokeWidth={2} />
      </span>
      <div className="pdd-promo__body">
        <p className="pdd-promo__kicker">{t('propertyDetailSecurityTitle')}</p>
        <h3 className="pdd-promo__title">
          {isApproved ? t('pddPromoModerated') : t('pddPromoChecking')}
        </h3>
        <p className="pdd-promo__text">
          {t('pddPromoTrustText')}
        </p>
      </div>
    </article>
  )
}

export function PropertyDetailDesktopConciergePromo({ onContact }) {
  const { t } = useTranslation()

  return (
    <article className="pdd-promo pdd-promo--concierge">
      <span className="pdd-promo__icon" aria-hidden>
        <Headphones size={22} strokeWidth={2} />
      </span>
      <div className="pdd-promo__body">
        <p className="pdd-promo__kicker">{t('pddPromoConciergeKicker')}</p>
        <h3 className="pdd-promo__title">{t('pddPromoConciergeTitle')}</h3>
        <p className="pdd-promo__text">
          {t('pddPromoConciergeText')}
        </p>
        <button type="button" className="pdd-promo__cta" onClick={onContact}>
          {t('propertyDetailContactManager')}
        </button>
      </div>
    </article>
  )
}

export function PropertyDetailDesktopInvestStrip({ yieldPercent, onOpenCalc }) {
  const { t } = useTranslation()

  return (
    <article className="pdd-promo pdd-promo--invest">
      <span className="pdd-promo__icon" aria-hidden>
        <TrendingUp size={22} strokeWidth={2} />
      </span>
      <div className="pdd-promo__body pdd-promo__body--row">
        <div>
          <p className="pdd-promo__kicker">{t('pddPromoInvestKicker')}</p>
          <h3 className="pdd-promo__title">
            {yieldPercent
              ? t('pddPromoInvestYield', { percent: yieldPercent })
              : t('pddPromoInvestCalc')}
          </h3>
          <p className="pdd-promo__text">
            {t('pddPromoInvestText')}
          </p>
        </div>
        <button type="button" className="pdd-promo__cta pdd-promo__cta--outline" onClick={onOpenCalc}>
          {t('pddPromoOpenCalc')}
        </button>
      </div>
    </article>
  )
}

export function PropertyDetailDesktopVipPromo({ onLearnMore }) {
  const { t } = useTranslation()

  return (
    <article className="pdd-promo pdd-promo--vip">
      <span className="pdd-promo__icon" aria-hidden>
        <Sparkles size={22} strokeWidth={2} />
      </span>
      <div className="pdd-promo__body">
        <p className="pdd-promo__kicker">{t('pddPromoVipKicker')}</p>
        <h3 className="pdd-promo__title">{t('pddPromoVipTitle')}</h3>
        <p className="pdd-promo__text">
          {t('pddPromoVipText')}
        </p>
        <button type="button" className="pdd-promo__cta" onClick={onLearnMore}>
          {t('pddPromoVipCta')}
        </button>
      </div>
    </article>
  )
}

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { BadgeCheck, Eye, MessageCircle, ShieldCheck } from 'lucide-react'
import './OwnerAds.css'

export const AD_IMAGES = {
  buyerHouse: '/images/owner-test/owner-promo-sidebar-buyer.png',
  buyerHero: '/images/owner-test/owner-buyer-promo-hero.png',
  buyerMobile: '/images/owner-test/owner-buyer-promo-mobile.png',
  premiumHouse: '/images/owner-test/owner-promo-promote-thumb.png',
  fastSalesHero: '/images/owner-test/owner-promo-fast-sales-thumb.png',
  salesExpert: '/images/owner-test/owner-promo-help-thumb.png',
}

function useCompactAds() {
  const { t } = useTranslation()

  return useMemo(
    () => ({
      premium: {
        title: t('ownerTest_adPremiumTitle'),
        text: t('ownerTest_adPremiumText'),
        button: t('ownerTest_adPremiumBtn'),
        image: AD_IMAGES.premiumHouse,
        imageClassName: 'oad-card__image--house',
        tone: 'premium',
      },
      fastSales: {
        title: t('ownerTest_adFastSalesTitle'),
        text: t('ownerTest_adFastSalesText'),
        button: t('ownerTest_adFastSalesBtn'),
        image: AD_IMAGES.fastSalesHero,
        imageClassName: 'oad-card__image--fast',
        tone: 'fast',
      },
      help: {
        title: t('ownerTest_adHelpTitle'),
        text: t('ownerTest_adHelpText'),
        button: t('ownerTest_adHelpBtn'),
        image: AD_IMAGES.salesExpert,
        imageClassName: 'oad-card__image--expert',
        tone: 'help',
      },
    }),
    [t]
  )
}

function useBuyerFeatures() {
  const { t } = useTranslation()

  return useMemo(
    () => [
      { text: t('ownerTest_adBuyerFeatureClosedDeals'), icon: BadgeCheck },
      { text: t('ownerTest_adBuyerFeatureNoMiddlemen'), icon: Eye },
      { text: t('ownerTest_adBuyerFeatureRecommendations'), icon: MessageCircle },
      { text: t('ownerTest_adBuyerFeatureSpecialTerms'), icon: ShieldCheck },
    ],
    [t]
  )
}

export function OwnerBuyerAd({ className = '', imageSrc = AD_IMAGES.buyerHouse }) {
  const { t } = useTranslation()
  const buyerFeatures = useBuyerFeatures()

  return (
    <article className={`oad-buyer ${className}`.trim()} aria-label={t('ownerTest_adBuyerAria')}>
      <div className="oad-buyer__copy">
        <h2 className="oad-buyer__title">{t('ownerTest_adBuyerTitle')}</h2>
        <p className="oad-buyer__text">{t('ownerTest_adBuyerText')}</p>
      </div>

      <img
        className="oad-buyer__image"
        src={imageSrc}
        alt=""
        loading="lazy"
        decoding="async"
        aria-hidden
      />

      <ul className="oad-buyer__list">
        {buyerFeatures.map(({ text, icon: Icon }) => (
          <li key={text}>
            <span className="oad-buyer__icon" aria-hidden>
              <Icon size={17} strokeWidth={2.3} />
            </span>
            <span>{text}</span>
          </li>
        ))}
      </ul>

      <div className="oad-buyer__actions">
        <button type="button" className="oad-buyer__button">
          {t('ownerTest_adBuyerBecome')}
        </button>
        <button type="button" className="oad-buyer__link">
          {t('ownerTest_adBuyerMore')}
        </button>
      </div>
    </article>
  )
}

export function OwnerAdCard({ type }) {
  const { t } = useTranslation()
  const compactAds = useCompactAds()
  const ad = compactAds[type]
  if (!ad) return null

  return (
    <article className={`oad-card oad-card--${ad.tone}`} aria-label={ad.title}>
      {ad.dismiss ? (
        <button type="button" className="oad-card__dismiss" aria-label={t('ownerTest_adDismiss')}>
          ×
        </button>
      ) : null}
      <div className="oad-card__copy">
        <h2 className="oad-card__title">{ad.title}</h2>
        <p className="oad-card__text">{ad.text}</p>
        <button type="button" className="oad-card__button">
          {ad.button}
        </button>
      </div>
      <img
        className={`oad-card__image ${ad.imageClassName}`}
        src={ad.image}
        alt=""
        loading="lazy"
        decoding="async"
        aria-hidden
      />
    </article>
  )
}

export function OwnerAdStack({ cards = ['premium', 'fastSales', 'help'], className = '' }) {
  const { t } = useTranslation()

  return (
    <section className={`oad-stack ${className}`.trim()} aria-label={t('ownerTest_adStackAria')}>
      {cards.map((type) => (
        <OwnerAdCard key={type} type={type} />
      ))}
    </section>
  )
}

export function OwnerAdsShowcase({ className = '' }) {
  const { t } = useTranslation()

  return (
    <section className={`oad-showcase ${className}`.trim()} aria-label={t('ownerTest_adShowcaseAria')}>
      <OwnerBuyerAd />
      <OwnerAdStack />
    </section>
  )
}

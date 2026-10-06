import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  FiGrid,
  FiHome,
  FiMapPin,
  FiShield,
  FiTrendingUp,
} from 'react-icons/fi'
import { publicAsset } from '@/utils/publicAsset'

const FEATURED_IMAGE = 'images/test-drive/property-marbella-card.jpg'
const MAP_ART = 'images/investor-home/world-map.png'

function MetricCard({ label, value, Icon, placement }) {
  return (
    <article className={`buyer-glass-card buyer-glass-card--${placement}`}>
      <span className="buyer-glass-card__icon" aria-hidden>
        <Icon />
      </span>
      <span className="buyer-glass-card__label">{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

export default function BuyerMapScene({ onOpenStrategies }) {
  const { t } = useTranslation()

  const metricCards = useMemo(
    () => [
      { key: 'yield', label: t('buyerPage_mapYield'), value: '+10.8%', Icon: FiTrendingUp, placement: 'tl' },
      { key: 'area', label: t('buyerPage_mapArea'), value: '1 500 м²', Icon: FiGrid, placement: 'tr' },
      { key: 'beds', label: t('buyerPage_mapBeds'), value: t('buyerPage_mapBedsValue'), Icon: FiHome, placement: 'bl' },
      { key: 'trust', label: t('buyerPage_mapTrust'), value: '99%', Icon: FiShield, placement: 'br' },
    ],
    [t],
  )

  const featuredTitle = t('buyerPage_mapFeaturedTitle')

  return (
    <div className="buyer-map-scene" aria-label={t('buyerPage_mapAria')}>
      <img className="buyer-map-scene__map" src={publicAsset(MAP_ART)} alt="" aria-hidden loading="eager" decoding="async" />

      <div className="buyer-map-scene__metrics" aria-label={t('buyerPage_mapMetricsAria')}>
        {metricCards.map((card) => (
          <MetricCard key={card.key} {...card} />
        ))}
      </div>

      <div className="buyer-map-scene__marker" aria-label={t('buyerPage_mapSelectedAria')}>
        <button
          type="button"
          className="buyer-map-marker__card"
          onClick={onOpenStrategies}
          aria-label={t('buyerLanding_strategyModalTitle')}
        >
          <div className="buyer-map-marker__media">
            <img
              src={publicAsset(FEATURED_IMAGE)}
              alt=""
              width={520}
              height={325}
              loading="eager"
              decoding="async"
            />
            <span className="buyer-map-marker__badge">{t('buyerPage_mapBadgeNew')}</span>
          </div>
          <div className="buyer-map-marker__body">
            <h2>{featuredTitle}</h2>
            <p>
              <FiMapPin aria-hidden />
              {t('buyerPage_mapFeaturedLocation')}
            </p>
            <footer>
              <strong>$520,000</strong>
              <em>+10.8%</em>
            </footer>
          </div>
        </button>
        <span className="buyer-map-marker__tail" aria-hidden />
        <span className="buyer-map-marker__point" aria-hidden />
      </div>
    </div>
  )
}

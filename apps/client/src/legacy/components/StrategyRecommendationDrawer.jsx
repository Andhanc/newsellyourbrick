import { FiPlay, FiStar } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import BuyerSheetShell from './buyer-mobile/BuyerSheetShell'
import { publicAsset } from '../utils/publicAsset'
import './StrategyRecommendationDrawer.css'

const PREVIEW_ICONS = [
  publicAsset('images/home-sale-formats/icons/auction-3d.png'),
  publicAsset('images/home-sale-formats/icons/buy-now-3d.png'),
  publicAsset('images/home-sale-formats/icons/shares-3d.png'),
]

export default function StrategyRecommendationDrawer({
  isOpen,
  onClose,
  onWatch,
}) {
  const { t } = useTranslation()
  const stories = t('strategyRecommendation_stories')
  const duration = t('strategyRecommendation_duration')

  return (
    <BuyerSheetShell
        isOpen={isOpen}
        onClose={onClose}
        titleId="strategy-recommendation-title"
        describedBy="strategy-recommendation-description"
        tone="choice"
        closeLabel={t('strategyRecommendation_close')}
        className="strategy-recommendation-drawer"
        footer={
          <button type="button" className="strategy-recommendation-drawer__watch" onClick={onWatch}>
            <span>{t('strategyRecommendation_watch')}</span>
            <span className="strategy-recommendation-drawer__watch-icon" aria-hidden="true">
              <FiPlay fill="currentColor" />
            </span>
          </button>
        }
      >
        <div className="strategy-recommendation-drawer__hero" aria-hidden="true">
          <span className="strategy-recommendation-drawer__glow" />
          <span className="strategy-recommendation-drawer__orbit" />
          <span className="strategy-recommendation-drawer__spark strategy-recommendation-drawer__spark--one">
            <FiStar fill="currentColor" />
          </span>
          <span className="strategy-recommendation-drawer__spark strategy-recommendation-drawer__spark--two">
            <FiStar fill="currentColor" />
          </span>
          {PREVIEW_ICONS.map((src, index) => (
            <span
              key={src}
              className={`strategy-recommendation-drawer__preview strategy-recommendation-drawer__preview--${index + 1}`}
            >
              <img src={src} alt="" width="512" height="512" />
            </span>
          ))}
        </div>

        <div className="strategy-recommendation-drawer__copy">
          <span className="strategy-recommendation-drawer__eyebrow">{t('strategyRecommendation_eyebrow')}</span>
          <h2 id="strategy-recommendation-title">{t('strategyRecommendation_title')}</h2>
          <p id="strategy-recommendation-description">{t('strategyRecommendation_description')}</p>
          <div className="strategy-recommendation-drawer__meta" aria-label={`${stories}, ${duration}`}>
            <span>{stories}</span>
            <i aria-hidden="true" />
            <span>{duration}</span>
          </div>
        </div>
    </BuyerSheetShell>
  )
}

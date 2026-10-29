import { FiArrowRight } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import './AuctionEndedSimilarPromo.css'

const CORNER_BG = '/images/property-detail/auction-ended-similar-corner-bg.png'

export default function AuctionEndedSimilarPromo({ onBrowseSimilar }) {
  const { t } = useTranslation()

  return (
    <section className="auction-ended-similar-card" aria-labelledby="auction-ended-similar-title">
      <div className="auction-ended-similar-card__surface">
        <img
          className="auction-ended-similar-card__art"
          src={CORNER_BG}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
        />

        <div className="auction-ended-similar-card__content">
          <p className="auction-ended-similar-card__eyebrow">{t('auctionEndedSimilarEyebrow')}</p>
          <h3 id="auction-ended-similar-title" className="auction-ended-similar-card__title">
            {t('auctionEndedSimilarTitle')}
          </h3>
          <p className="auction-ended-similar-card__text">{t('auctionEndedSimilarText')}</p>

          <button type="button" className="auction-ended-similar-card__cta" onClick={onBrowseSimilar}>
            {t('auctionEndedSimilarCta')}
            <FiArrowRight size={16} aria-hidden />
          </button>
        </div>
      </div>
    </section>
  )
}

import { FiArrowRight } from 'react-icons/fi'
import './AuctionEndedSimilarPromo.css'

const CORNER_BG = '/images/property-detail/auction-ended-similar-corner-bg.png'

export default function AuctionEndedSimilarPromo({ onBrowseSimilar }) {
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
          <p className="auction-ended-similar-card__eyebrow">Следующий шаг</p>
          <h3 id="auction-ended-similar-title" className="auction-ended-similar-card__title">
            Похожие объекты
          </h3>
          <p className="auction-ended-similar-card__text">Актуальные лоты в каталоге — в том же районе и формате.</p>

          <button type="button" className="auction-ended-similar-card__cta" onClick={onBrowseSimilar}>
            Смотреть похожие
            <FiArrowRight size={16} aria-hidden />
          </button>
        </div>
      </div>
    </section>
  )
}

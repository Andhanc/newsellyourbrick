import { useTranslation } from 'react-i18next'
import { ArrowUpRight } from 'lucide-react'
import { publicAsset } from '../../utils/publicAsset'
import './DevelopmentProgressPromo.css'

export default function DevelopmentProgressPromo({ onInvest, canInvest }) {
  const { t } = useTranslation()
  return (
    <aside className="dev-progress-promo" aria-labelledby="development-progress-promo-title">
      <div className="dev-progress-promo__content">
        <div className="dev-progress-promo__copy">
          <span className="dev-progress-promo__brand">Sell<span>Your</span>Brick</span>
          <h2 id="development-progress-promo-title">{t('develop.progressPromoTitle')}</h2>
          <p>{t('develop.progressPromoDescription')}</p>
        </div>
        <div className="dev-progress-promo__art" aria-hidden="true">
          <img src={publicAsset('images/development/progress-binoculars-v2.webp')} alt="" loading="lazy" />
        </div>
      </div>
      <button type="button" className="dev-progress-promo__cta btn-tiffany-shine" onClick={onInvest} disabled={!canInvest} aria-haspopup="dialog">{t('develop.progressPromoAction')} <ArrowUpRight size={20} aria-hidden="true" /></button>
    </aside>
  )
}

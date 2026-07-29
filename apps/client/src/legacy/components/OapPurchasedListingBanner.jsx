import { ArrowRight, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import './OapPurchasedListingBanner.css'

export default function OapPurchasedListingBanner({ meta, onContinue }) {
  const { t } = useTranslation()
  if (!meta?.propertyId) return null

  return (
    <aside className="oap-purchased-banner" aria-labelledby="oap-purchased-banner-title">
      <div className="oap-purchased-banner__icon" aria-hidden>
        <Sparkles size={20} strokeWidth={2} />
      </div>
      <div className="oap-purchased-banner__copy">
        <p className="oap-purchased-banner__eyebrow">{t('oapPurchasedBanner_eyebrow')}</p>
        <h2 id="oap-purchased-banner-title" className="oap-purchased-banner__title">
          {t('oapPurchasedBanner_title', { title: meta.title || t('oapPurchasedBanner_defaultObject') })}
        </h2>
        <p className="oap-purchased-banner__text">{t('oapPurchasedBanner_text')}</p>
        <ul className="oap-purchased-banner__todo">
          <li>{t('oapPurchasedBanner_todoFormat')}</li>
          <li>{t('oapPurchasedBanner_todoPrice')}</li>
          <li>{t('oapPurchasedBanner_todoDates')}</li>
          <li>{t('oapPurchasedBanner_todoDocs')}</li>
        </ul>
      </div>
      <button type="button" className="oap-purchased-banner__cta" onClick={onContinue}>
        {t('oapPurchasedBanner_cta')}
        <ArrowRight size={16} aria-hidden />
      </button>
    </aside>
  )
}

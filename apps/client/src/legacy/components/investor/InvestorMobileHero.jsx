import { useTranslation } from 'react-i18next'
import { ShieldCheck } from 'lucide-react'
import './InvestorMobileHero.css'

export default function InvestorMobileHero() {
  const { t } = useTranslation()
  return (
    <section className="investor-mobile-hero" aria-labelledby="investor-mobile-hero-title">
      <img
        className="investor-mobile-hero__image"
        src="/images/investor/smart-investor-hero-mobile.png"
        alt={t('smartInvestor_heroImgAlt')}
        width="1024"
        height="1536"
        loading="eager"
        fetchPriority="high"
      />
      <div className="investor-mobile-hero__shade" aria-hidden="true" />
      <div className="investor-mobile-hero__copy">
        <span className="investor-mobile-hero__eyebrow">{t('smartInvestor_brand')}</span>
        <h1 id="investor-mobile-hero-title">{t('smartInvestor_heroTitle')}</h1>
        <p>{t('smartInvestor_heroLead')}</p>
        <div className="investor-mobile-hero__trust">
          <ShieldCheck size={16} strokeWidth={2.1} aria-hidden="true" />
          <span>{t('smartInvestor_heroTrust')}</span>
        </div>
      </div>
    </section>
  )
}

import { ShieldCheck } from 'lucide-react'
import './InvestorMobileHero.css'

export default function InvestorMobileHero() {
  return (
    <section className="investor-mobile-hero" aria-labelledby="investor-mobile-hero-title">
      <img
        className="investor-mobile-hero__image"
        src="/images/investor/smart-investor-hero-mobile.png"
        alt="Современная средиземноморская вилла у моря"
        width="1024"
        height="1536"
        loading="eager"
        fetchPriority="high"
      />
      <div className="investor-mobile-hero__shade" aria-hidden="true" />
      <div className="investor-mobile-hero__copy">
        <span className="investor-mobile-hero__eyebrow">Умный инвестор</span>
        <h1 id="investor-mobile-hero-title">Проверьте сделку до покупки</h1>
        <p>Соберите свой сценарий из цены, срока и расходов.</p>
        <div className="investor-mobile-hero__trust">
          <ShieldCheck size={16} strokeWidth={2.1} aria-hidden="true" />
          <span>Расчёт показывает сценарий и не гарантирует доходность</span>
        </div>
      </div>
    </section>
  )
}

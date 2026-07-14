import { AlertTriangle, ArrowUpRight, BadgeEuro } from 'lucide-react'
import './InvestorMobileResultCard.css'

export default function InvestorMobileResultCard({
  equity,
  yieldValue,
  cashFlow,
  profit,
  assumptions,
  isPositive = true,
}) {
  return (
    <section className="investor-mobile-result" aria-labelledby="investor-mobile-result-title">
      <div className="investor-mobile-result__head">
        <span className="investor-mobile-result__icon" aria-hidden><BadgeEuro size={20} /></span>
        <div>
          <span>Базовый сценарий</span>
          <h2 id="investor-mobile-result-title">Картина сделки</h2>
        </div>
      </div>

      <div className="investor-mobile-result__hero">
        <span>Итоговая прибыль</span>
        <strong className={isPositive ? 'is-positive' : 'is-negative'}>{profit}</strong>
      </div>

      <dl className="investor-mobile-result__metrics">
        <div><dt>Ваш капитал</dt><dd>{equity}</dd></div>
        <div><dt>Доходность</dt><dd>{yieldValue}</dd></div>
        <div><dt>Денежный поток</dt><dd>{cashFlow}</dd></div>
      </dl>

      <div className="investor-mobile-result__assumptions">
        <ArrowUpRight size={17} aria-hidden />
        <div><strong>Что учтено</strong><span>{assumptions}</span></div>
      </div>
      <div className="investor-mobile-result__risk">
        <AlertTriangle size={17} aria-hidden />
        <div><strong>Риск</strong><span>Доходность изменится, если цена, аренда или срок отличаются от допущений.</span></div>
      </div>
    </section>
  )
}


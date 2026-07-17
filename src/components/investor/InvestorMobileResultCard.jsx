import { AlertTriangle, ArrowUpRight, BadgeEuro, ChevronRight, SlidersHorizontal } from 'lucide-react'
import './InvestorMobileResultCard.css'

export default function InvestorMobileResultCard({
  equity,
  yieldValue,
  cashFlow,
  profit,
  headlineLabel = 'Денежный поток за период',
  yieldLabel = 'Доходность в год',
  assumptions,
  isPositive = true,
  propertyTitle,
  propertyImage,
  onOpenAssumptions,
  onOpenProperty,
}) {
  return (
    <section className="investor-mobile-result" aria-labelledby="investor-mobile-result-title">
      {propertyImage && (
        <div className="investor-mobile-result__property">
          <img src={propertyImage} alt="" />
          <span><small>Рассчитан объект</small><strong>{propertyTitle || 'Выбранный объект'}</strong></span>
        </div>
      )}
      <div className="investor-mobile-result__head">
        <span className="investor-mobile-result__icon" aria-hidden><BadgeEuro size={20} /></span>
        <div>
          <span>Базовый сценарий</span>
          <h2 id="investor-mobile-result-title">Картина сделки</h2>
        </div>
      </div>

      <div className="investor-mobile-result__hero">
        <span>{headlineLabel}</span>
        <strong className={isPositive ? 'is-positive' : 'is-negative'}>{profit}</strong>
      </div>

      <dl className="investor-mobile-result__metrics">
        <div><dt>Ваш капитал</dt><dd>{equity}</dd></div>
        <div><dt>{yieldLabel}</dt><dd>{yieldValue}</dd></div>
        <div><dt>Среднее за месяц периода</dt><dd>{cashFlow}</dd></div>
      </dl>

      <div className="investor-mobile-result__assumptions">
        <ArrowUpRight size={17} aria-hidden />
        <div><strong>Что учтено</strong><span>{assumptions}</span></div>
      </div>
      <div className="investor-mobile-result__risk">
        <AlertTriangle size={17} aria-hidden />
        <div><strong>Риск</strong><span>Доходность изменится, если цена, аренда или срок отличаются от допущений.</span></div>
      </div>

      <div className="investor-mobile-result__actions">
        <button type="button" className="investor-mobile-result__action" onClick={onOpenAssumptions}>
          <SlidersHorizontal size={18} aria-hidden />
          Настроить сценарий
        </button>
        <button type="button" className="investor-mobile-result__action investor-mobile-result__action--primary" onClick={onOpenProperty}>
          {propertyTitle ? 'Перейти к объекту' : 'Смотреть объекты'}
          <ChevronRight size={18} aria-hidden />
        </button>
      </div>
    </section>
  )
}

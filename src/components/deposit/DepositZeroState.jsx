import { CalendarCheck, Gavel, RotateCcw, ShieldCheck } from 'lucide-react'
import './DepositZeroState.css'

const BENEFITS = [
  { icon: Gavel, title: 'Ставки и покупка', copy: 'Подтвердите серьёзность намерений и участвуйте в доступных сделках.' },
  { icon: CalendarCheck, title: 'Бронирование просмотра', copy: 'Фиксируйте удобное время там, где объект требует обеспечительного платежа.' },
  { icon: ShieldCheck, title: 'Контроль средств', copy: 'Сразу видно, какая сумма доступна, а какая закреплена за действием.' },
]

export default function DepositZeroState({ onTopUp }) {
  return (
    <section className="deposit-zero" aria-labelledby="deposit-zero-title">
      <div className="deposit-zero__visual">
        <img
          src="/images/buyer-mobile/deposit-zero-wallet.webp"
          alt="Кошелёк с символом объекта недвижимости"
          width="1024"
          height="1536"
        />
        <span className="deposit-zero__visual-badge"><ShieldCheck size={14} aria-hidden /> Средства под вашим контролем</span>
      </div>

      <div className="deposit-zero__copy">
        <span className="deposit-zero__eyebrow">Безопасный следующий шаг</span>
        <h1 id="deposit-zero-title">Депозит открывает участие</h1>
        <p className="deposit-zero__lead">
          Пополните баланс один раз — сайт покажет, какие действия доступны и когда сумма временно резервируется.
        </p>

        <div className="deposit-zero__benefits">
          {BENEFITS.map(({ icon: Icon, title, copy }) => (
            <article key={title}>
              <span aria-hidden><Icon size={18} /></span>
              <div><h2>{title}</h2><p>{copy}</p></div>
            </article>
          ))}
        </div>

        <div className="deposit-zero__preview" aria-label="Пример интерфейса после пополнения">
          <span className="deposit-zero__preview-label">Пример после пополнения</span>
          <div className="deposit-zero__preview--blurred" aria-hidden>
            <div><span>Доступно</span><strong>2 500 €</strong></div>
            <div><span>Зарезервировано</span><strong>500 €</strong></div>
          </div>
        </div>

        <div className="deposit-zero__refund">
          <RotateCcw size={18} aria-hidden />
          <p><strong>Без скрытой блокировки.</strong> Доступную часть депозита можно запросить к возврату, если она не зарезервирована действующей ставкой или бронированием.</p>
        </div>

        <button type="button" className="deposit-zero__primary" onClick={onTopUp}>
          Пополнить депозит
        </button>
        <p className="deposit-zero__footnote">Перед оплатой вы увидите способ, сумму и условия подтверждения.</p>
      </div>
    </section>
  )
}


import { ShieldCheck, Headphones, TrendingUp, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import './PropertyDetailDesktopPromos.css'

export function PropertyDetailDesktopTrustPromo({ moderationStatus = 'approved' }) {
  const { t } = useTranslation()
  const isApproved = String(moderationStatus || '').toLowerCase() === 'approved'

  return (
    <article className="pdd-promo pdd-promo--trust">
      <span className="pdd-promo__icon" aria-hidden>
        <ShieldCheck size={22} strokeWidth={2} />
      </span>
      <div className="pdd-promo__body">
        <p className="pdd-promo__kicker">{t('propertyDetailSecurityTitle', 'Безопасность')}</p>
        <h3 className="pdd-promo__title">
          {isApproved ? 'Объект прошёл модерацию' : 'Проверка объекта'}
        </h3>
        <p className="pdd-promo__text">
          Документы, локация и условия сделки доступны до участия в аукционе — без скрытых блоков.
        </p>
      </div>
    </article>
  )
}

export function PropertyDetailDesktopConciergePromo({ onContact }) {
  const { t } = useTranslation()

  return (
    <article className="pdd-promo pdd-promo--concierge">
      <span className="pdd-promo__icon" aria-hidden>
        <Headphones size={22} strokeWidth={2} />
      </span>
      <div className="pdd-promo__body">
        <p className="pdd-promo__kicker">Персональный менеджер</p>
        <h3 className="pdd-promo__title">Нужна консультация по объекту?</h3>
        <p className="pdd-promo__text">
          Поможем с осмотром, ставкой и оформлением — ответим в рабочее время.
        </p>
        <button type="button" className="pdd-promo__cta" onClick={onContact}>
          {t('propertyDetailContactManager', 'Связаться с менеджером')}
        </button>
      </div>
    </article>
  )
}

export function PropertyDetailDesktopInvestStrip({ yieldPercent, onOpenCalc }) {
  return (
    <article className="pdd-promo pdd-promo--invest">
      <span className="pdd-promo__icon" aria-hidden>
        <TrendingUp size={22} strokeWidth={2} />
      </span>
      <div className="pdd-promo__body pdd-promo__body--row">
        <div>
          <p className="pdd-promo__kicker">Инвестиционный потенциал</p>
          <h3 className="pdd-promo__title">
            {yieldPercent ? `Ориентир доходности ~${yieldPercent}% годовых` : 'Рассчитайте доходность'}
          </h3>
          <p className="pdd-promo__text">
            Оцените аренду и окупаемость на калькуляторе ниже — цифры можно менять.
          </p>
        </div>
        <button type="button" className="pdd-promo__cta pdd-promo__cta--outline" onClick={onOpenCalc}>
          Открыть калькулятор
        </button>
      </div>
    </article>
  )
}

export function PropertyDetailDesktopVipPromo({ onLearnMore }) {
  return (
    <article className="pdd-promo pdd-promo--vip">
      <span className="pdd-promo__icon" aria-hidden>
        <Sparkles size={22} strokeWidth={2} />
      </span>
      <div className="pdd-promo__body">
        <p className="pdd-promo__kicker">VIP-клуб</p>
        <h3 className="pdd-promo__title">Ранний доступ к закрытым лотам</h3>
        <p className="pdd-promo__text">
          Подписка открывает эксклюзивные объекты и приоритет в очереди на test-drive.
        </p>
        <button type="button" className="pdd-promo__cta" onClick={onLearnMore}>
          Узнать о VIP
        </button>
      </div>
    </article>
  )
}

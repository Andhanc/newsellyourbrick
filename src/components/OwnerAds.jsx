import { BadgeCheck, Eye, MessageCircle, ShieldCheck } from 'lucide-react'
import './OwnerAds.css'

const AD_IMAGES = {
  buyerHouse: '/images/owner-ads/ad-buyer-house.png',
  premiumHouse: '/images/owner-ads/ad-premium-house.png',
  growthChart: '/images/owner-ads/ad-growth-chart.png',
  salesExpert: '/images/owner-ads/ad-sales-expert.png',
}

const COMPACT_ADS = {
  premium: {
    title: 'Премиум размещение',
    text: 'Выделите свой объект и получите больше просмотров',
    button: 'Узнать больше',
    image: AD_IMAGES.premiumHouse,
    imageClassName: 'oad-card__image--house',
    tone: 'premium',
    dismiss: true,
  },
  fastSales: {
    title: 'Быстрые продажи с SellYourBrick',
    text: 'Ускорьте продажу объектов с нашими инструментами',
    button: 'Подробнее',
    image: AD_IMAGES.growthChart,
    imageClassName: 'oad-card__image--chart',
    tone: 'fast',
  },
  help: {
    title: 'Нужна помощь с продажей?',
    text: 'Наши эксперты помогут вам на каждом этапе',
    button: 'Связаться',
    image: AD_IMAGES.salesExpert,
    imageClassName: 'oad-card__image--expert',
    tone: 'help',
  },
}

const BUYER_FEATURES = [
  { text: 'Доступ к закрытым предложениям', icon: BadgeCheck },
  { text: 'Просмотр объектов без посредников', icon: Eye },
  { text: 'Персональные рекомендации', icon: MessageCircle },
  { text: 'Специальные условия для покупателей', icon: ShieldCheck },
]

export function OwnerBuyerAd({ className = '' }) {
  return (
    <article className={`oad-buyer ${className}`.trim()} aria-label="Реклама режима покупателя">
      <div className="oad-buyer__copy">
        <h2 className="oad-buyer__title">Ищете недвижимость для себя?</h2>
        <p className="oad-buyer__text">Найдите лучшие предложения на нашей платформе</p>
      </div>

      <img
        className="oad-buyer__image"
        src={AD_IMAGES.buyerHouse}
        alt=""
        loading="lazy"
        decoding="async"
        aria-hidden
      />

      <ul className="oad-buyer__list">
        {BUYER_FEATURES.map(({ text, icon: Icon }) => (
          <li key={text}>
            <span className="oad-buyer__icon" aria-hidden>
              <Icon size={17} strokeWidth={2.3} />
            </span>
            <span>{text}</span>
          </li>
        ))}
      </ul>

      <div className="oad-buyer__actions">
        <button type="button" className="oad-buyer__button">
          Стать покупателем
        </button>
        <button type="button" className="oad-buyer__link">
          Подробнее
        </button>
      </div>
    </article>
  )
}

export function OwnerAdCard({ type }) {
  const ad = COMPACT_ADS[type]
  if (!ad) return null

  return (
    <article className={`oad-card oad-card--${ad.tone}`} aria-label={ad.title}>
      {ad.dismiss ? (
        <button type="button" className="oad-card__dismiss" aria-label="Скрыть рекламу">
          ×
        </button>
      ) : null}
      <div className="oad-card__copy">
        <h2 className="oad-card__title">{ad.title}</h2>
        <p className="oad-card__text">{ad.text}</p>
        <button type="button" className="oad-card__button">
          {ad.button}
        </button>
      </div>
      <img
        className={`oad-card__image ${ad.imageClassName}`}
        src={ad.image}
        alt=""
        loading="lazy"
        decoding="async"
        aria-hidden
      />
    </article>
  )
}

export function OwnerAdStack({ cards = ['premium', 'fastSales', 'help'], className = '' }) {
  return (
    <section className={`oad-stack ${className}`.trim()} aria-label="Рекламные предложения">
      {cards.map((type) => (
        <OwnerAdCard key={type} type={type} />
      ))}
    </section>
  )
}

export function OwnerAdsShowcase({ className = '' }) {
  return (
    <section className={`oad-showcase ${className}`.trim()} aria-label="Рекламные предложения">
      <OwnerBuyerAd />
      <OwnerAdStack />
    </section>
  )
}

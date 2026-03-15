import { useState } from 'react'
import { ShoppingCart } from 'lucide-react'
import './PricingCards.css'

export default function PricingCards({ onBookCall, compact = false }) {
  const [starterMonthly, setStarterMonthly] = useState(false)
  const [proMonthly, setProMonthly] = useState(false)

  const LightCheckIcon = ({ className = '' }) => (
    <svg
      className={`pricing-card__check-light ${className}`.trim()}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="8" />
      <path d="M5.5 8.5L7 10L11 6" />
    </svg>
  )

  const DarkCheckIcon = ({ className = '' }) => (
    <svg
      className={`pricing-card__check-dark ${className}`.trim()}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="7.5" />
      <path d="M5.5 8.5L7 10L11 6" />
    </svg>
  )

  const starterFeatures = ['Аукцион', 'Покупка объектов', 'ИИ-консультант']
  const proFeatures = ['Starter', 'Аналитика', 'Калькулятор', 'Персональный менеджер']

  const handleStarterCall = () => {
    if (typeof onBookCall === 'function') onBookCall('starter')
    else window.open('https://checkout.stripe.com/pay?amount=2900&currency=usd&description=Starter', '_blank')
  }

  const handleProCall = () => {
    if (typeof onBookCall === 'function') onBookCall('pro')
    else window.open('https://checkout.stripe.com/pay?amount=9900&currency=usd&description=Pro', '_blank')
  }

  return (
    <div className="pricing-cards">
      <div className={`pricing-cards__grid ${compact ? 'pricing-cards__grid--compact' : ''}`}>
        {/* Starter — светлая карточка */}
        <div className="pricing-card--starter">
          <div className="pricing-card__header">
            <div className="pricing-card__header-top">
              <div className="pricing-card__header-top-left">
                <h2 className="pricing-card__title">Starter</h2>
                <p className="pricing-card__desc">
                  Быстрый старт
                </p>
              </div>
              <span className="pricing-card__badge">Самый простой</span>
            </div>
            <div className="pricing-card__price-row">
              <span className="pricing-card__price">$29</span>
              <span className="pricing-card__price-unit">/мес</span>
            </div>
            <button type="button" className="pricing-card__cta" onClick={handleStarterCall}>
              Купить сейчас
              <ShoppingCart size={20} strokeWidth={2} />
            </button>
          </div>
          <div className="pricing-card__features">
            <div className="pricing-card__features-grid">
              {starterFeatures.map((feature) => (
                <div key={feature} className="pricing-card__feature">
                  <LightCheckIcon />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
            <div className="pricing-card__toggle-wrap">
              <button
                type="button"
                className="pricing-card__toggle"
                data-enabled={starterMonthly}
                onClick={() => setStarterMonthly(!starterMonthly)}
                aria-pressed={starterMonthly}
                aria-label="Ежемесячный платёж"
              >
                <span className="pricing-card__toggle-thumb" />
              </button>
              <span className="pricing-card__toggle-label">Ежемесячный платёж</span>
            </div>
          </div>
        </div>

        {/* Pro — тёмная карточка */}
        <div className="pricing-card--pro">
          <div className="pricing-card__header">
            <div className="pricing-card__header-top">
              <div className="pricing-card__header-top-left">
                <h2 className="pricing-card__title">Pro</h2>
                <p className="pricing-card__desc">
                  Больше возможностей, аналитика и личный менеджер
                </p>
              </div>
              <span className="pricing-card__badge">Лучшая цена</span>
            </div>
            <div className="pricing-card__price-row">
              <span className="pricing-card__price">$99</span>
              <span className="pricing-card__price-unit">/мес</span>
            </div>
            <button type="button" className="pricing-card__cta" onClick={handleProCall}>
              Купить сейчас
              <ShoppingCart size={20} strokeWidth={2} />
            </button>
          </div>
          <div className="pricing-card__features">
            <div className="pricing-card__features-grid">
              {proFeatures.map((feature) => (
                <div key={feature} className="pricing-card__feature">
                  <DarkCheckIcon />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
            <div className="pricing-card__toggle-wrap">
              <button
                type="button"
                className="pricing-card__toggle"
                data-enabled={proMonthly}
                onClick={() => setProMonthly(!proMonthly)}
                aria-pressed={proMonthly}
                aria-label="Ежемесячный платёж"
              >
                <span className="pricing-card__toggle-thumb" />
              </button>
              <span className="pricing-card__toggle-label">Ежемесячный платёж</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

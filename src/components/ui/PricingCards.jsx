import { useState } from 'react'
import { ShoppingCart } from 'lucide-react'
import './PricingCards.css'

export default function PricingCards({ onBookCall, compact = false, mobileTwoColumn = false }) {
  const [starterMonthly, setStarterMonthly] = useState(false)
  const [proMonthly, setProMonthly] = useState(false)
  const [vipMonthly, setVipMonthly] = useState(false)

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
  const vipFeatures = ['Всё из Pro', 'Приоритет в аукционах', 'VIP-менеджер', 'Закрытые лоты']

  const handleStarterCall = () => {
    if (typeof onBookCall === 'function') onBookCall('starter')
  }

  const handleProCall = () => {
    if (typeof onBookCall === 'function') onBookCall('pro')
    else window.open('https://checkout.stripe.com/pay?amount=9900&currency=usd&description=Pro', '_blank')
  }

  const handleVipCall = () => {
    if (typeof onBookCall === 'function') onBookCall('vip')
    else window.open('https://checkout.stripe.com/pay?amount=19900&currency=usd&description=VIP', '_blank')
  }

  return (
    <div className={`pricing-cards${mobileTwoColumn ? ' pricing-cards--mobile-two-col' : ''}`}>
      <div className={`pricing-cards__grid ${compact ? 'pricing-cards__grid--compact' : ''}`}>
        {/* Starter — светлая карточка */}
        <div className="pricing-card--starter">
          <div className="pricing-card__header">
            <div className="pricing-card__header-top">
              <div className="pricing-card__header-top-left">
                <h2 className="pricing-card__title pricing-card__title--struck">Starter</h2>
                <p className="pricing-card__desc">
                  Быстрый старт
                </p>
              </div>
              <span className="pricing-card__badge">Бесплатно</span>
            </div>
            <div className="pricing-card__price-row pricing-card__price-row--starter-free">
              <span className="pricing-card__price pricing-card__price--free">$0</span>
              <span className="pricing-card__price-unit">/мес</span>
              <span className="pricing-card__price-was" aria-hidden="true">
                $29
              </span>
            </div>
            <button type="button" className="pricing-card__cta" onClick={handleStarterCall}>
              Начать бесплатно
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

        {/* VIP — премиальная карточка */}
        <div className="pricing-card--vip">
          <div className="pricing-card__header">
            <div className="pricing-card__header-top">
              <div className="pricing-card__header-top-left">
                <h2 className="pricing-card__title">VIP</h2>
                <p className="pricing-card__desc">
                  Максимум возможностей и приоритет на каждом шаге
                </p>
              </div>
              <span className="pricing-card__badge">Элитный</span>
            </div>
            <div className="pricing-card__price-row">
              <span className="pricing-card__price">$199</span>
              <span className="pricing-card__price-unit">/мес</span>
            </div>
            <button type="button" className="pricing-card__cta" onClick={handleVipCall}>
              Купить сейчас
              <ShoppingCart size={20} strokeWidth={2} />
            </button>
          </div>
          <div className="pricing-card__features">
            <div className="pricing-card__features-grid">
              {vipFeatures.map((feature) => (
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
                data-enabled={vipMonthly}
                onClick={() => setVipMonthly(!vipMonthly)}
                aria-pressed={vipMonthly}
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

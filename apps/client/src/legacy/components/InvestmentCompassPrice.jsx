import './InvestmentCompassPrice.css'

export default function InvestmentCompassPrice({ className = '' }) {
  return (
    <span className={`investment-compass-price ${className}`.trim()}>
      <del className="investment-compass-price__old">199 €</del>
      <span className="investment-compass-price__current">0 €</span>
    </span>
  )
}

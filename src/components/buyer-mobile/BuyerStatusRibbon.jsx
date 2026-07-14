import './BuyerStatusRibbon.css'

const VISIBLE_STATES = new Set(['sold', 'auction-ended', 'reserved', 'unavailable'])

export default function BuyerStatusRibbon({ listingState, className = '' }) {
  if (!listingState || !VISIBLE_STATES.has(listingState.state)) return null

  const label = listingState.label
  const tone = listingState.tone || listingState.state

  return (
    <div
      className={`buyer-status-ribbon buyer-status-ribbon--${tone}${className ? ` ${className}` : ''}`}
      aria-label={label}
    >
      <span className="buyer-status-ribbon__text">{label}</span>
    </div>
  )
}

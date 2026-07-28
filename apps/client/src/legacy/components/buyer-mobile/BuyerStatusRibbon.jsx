import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import './BuyerStatusRibbon.css'

const PRESENTATION = Object.freeze({
  sold: { labelKey: 'auctionFinalStateSold', tone: 'sold', showCheck: true },
  'auction-ended': { labelKey: 'auctionFinalStateSold', tone: 'sold', showCheck: true },
  reserved: { labelKey: 'reserved', tone: 'reserved', showCheck: false },
  unavailable: { labelKey: null, tone: 'unavailable', showCheck: false },
})

const VISIBLE_STATES = new Set(Object.keys(PRESENTATION))

export default function BuyerStatusRibbon({ listingState, className = '' }) {
  const { t } = useTranslation()
  if (!listingState || !VISIBLE_STATES.has(listingState.state)) return null

  const presentation = PRESENTATION[listingState.state]
  const label = presentation.labelKey ? t(presentation.labelKey) : listingState.label
  const tone = presentation.tone

  return (
    <div
      className={`buyer-status-ribbon buyer-status-ribbon--${tone}${className ? ` ${className}` : ''}`}
      aria-label={label}
    >
      <span className="buyer-status-ribbon__text">
        {label}
        {presentation.showCheck ? (
          <span className="buyer-status-ribbon__check-wrap" aria-hidden>
            <Check className="buyer-status-ribbon__check" size={12} strokeWidth={3.2} />
          </span>
        ) : null}
      </span>
    </div>
  )
}

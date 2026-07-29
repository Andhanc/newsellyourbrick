import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import './AuctionFinalStateRibbon.css'

/** Listing cards: ended auctions use the same sold presentation as sold lots. */
const PRESENTATION = Object.freeze({
  sold: { labelKey: 'auctionFinalStateSold', tone: 'sold', showCheck: true },
  'auction-ended': { labelKey: 'auctionFinalStateSold', tone: 'sold', showCheck: true },
})

export default function AuctionFinalStateRibbon({ listingState }) {
  const { t } = useTranslation()
  const presentation = listingState ? PRESENTATION[listingState.state] : null
  if (!presentation) return null

  const label = t(presentation.labelKey)

  return (
    <div
      className={`auction-final-ribbon auction-final-ribbon--${presentation.tone}`}
      aria-label={label}
    >
      <span className="auction-final-ribbon__band" aria-hidden />
      <span className="auction-final-ribbon__text">
        {label}
        {presentation.showCheck ? (
          <span className="auction-final-ribbon__check-wrap" aria-hidden>
            <Check className="auction-final-ribbon__check" size={12} strokeWidth={3.2} />
          </span>
        ) : null}
      </span>
    </div>
  )
}

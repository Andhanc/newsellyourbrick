import { useTranslation } from 'react-i18next'
import './AuctionFinalStateRibbon.css'

const LABEL_KEYS = Object.freeze({
  sold: 'auctionFinalStateSold',
  'auction-ended': 'auctionFinalStateEnded',
})

export default function AuctionFinalStateRibbon({ listingState }) {
  const { t } = useTranslation()
  const labelKey = listingState ? LABEL_KEYS[listingState.state] : null
  if (!labelKey) return null

  const label = t(labelKey)

  return (
    <div
      className={`auction-final-ribbon auction-final-ribbon--${listingState.state}`}
      aria-label={label}
    >
      <img src="/images/auction/final-state-tape.png" alt="" aria-hidden />
      <span>{label}</span>
    </div>
  )
}

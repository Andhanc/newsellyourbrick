import { useMemo } from 'react'
import SybLandingAuctionShowcase, { SHOWCASE_CARD_COUNT } from '@/components/SybLandingAuctionShowcase'
import {
  filterSybAuctionShowcase,
  filterSybBuyNowShowcase,
  filterSybDebtsShowcase,
  filterSybSharesShowcase,
} from '@/utils/sybLandingShowcaseFilters'

const SHOWCASE_SECTIONS = [
  { kind: 'auction', tone: 'white', filter: filterSybAuctionShowcase },
  { kind: 'buy_now', tone: 'tiffany', filter: filterSybBuyNowShowcase },
  { kind: 'shares', tone: 'white', filter: filterSybSharesShowcase },
  { kind: 'debts', tone: 'tiffany', filter: filterSybDebtsShowcase },
]

function formatPropertyForShowcase(prop) {
  return {
    ...prop,
    title: prop.title || prop.name || '',
    location: prop.location || prop.city || prop.country || '',
  }
}

export default function SybLandingListingShowcases({ properties = [], loading = false, onOpen }) {
  const sections = useMemo(
    () =>
      SHOWCASE_SECTIONS.map((section) => ({
        ...section,
        items: section.filter(properties).slice(0, SHOWCASE_CARD_COUNT).map(formatPropertyForShowcase),
      })),
    [properties],
  )

  return (
    <>
      {sections.map((section) => (
        <SybLandingAuctionShowcase
          key={section.kind}
          kind={section.kind}
          tone={section.tone}
          properties={section.items}
          loading={loading}
          onOpen={onOpen}
        />
      ))}
    </>
  )
}

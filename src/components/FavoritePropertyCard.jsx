import AuctionPropertyCard from './AuctionPropertyCard'
import DebtsPropertyCard from './DebtsPropertyCard'
import SharesPropertyCard from './SharesPropertyCard'
import PropertyListingCard from './PropertyListingCard'
import { mapShareFromApiResponse } from '../utils/shareCardDisplay'
import { getPropertyListingKind } from '../utils/propertyListingKind'
import { hasDbBackedProperty } from '../utils/propertyFavoriteKey'

const SHARE_FALLBACK = '/images/external/photo-1560448204-e02f11c3d0e2-54a1e4fab4.jpg'

export default function FavoritePropertyCard({
  item,
  isFavorite,
  onToggleFavorite,
  onOpen,
  onOpenShare,
  formatPrice,
  shareImageFallback = SHARE_FALLBACK,
  href,
}) {
  const { property, mockCategory } = item
  const favoriteMockCategory = hasDbBackedProperty(property) ? undefined : mockCategory
  const liked = isFavorite(property, favoriteMockCategory)
  const kind = getPropertyListingKind(property).key

  const handleFavoriteToggle = (_prop, event) => {
    event?.preventDefault?.()
    event?.stopPropagation?.()
    onToggleFavorite(property, favoriteMockCategory)
  }

  if (kind === 'shares') {
    const share = mapShareFromApiResponse(property, shareImageFallback)
    if (!share) return null

    return (
      <SharesPropertyCard
        share={share}
        isFavorite={liked}
        onFavoriteToggle={() => onToggleFavorite(property, favoriteMockCategory)}
        onInvest={() => onOpenShare?.(share)}
        imageFallback={shareImageFallback}
      />
    )
  }

  if (kind === 'debt') {
    return (
      <DebtsPropertyCard
        property={property}
        isFavorite={liked}
        onFavoriteToggle={handleFavoriteToggle}
        onOpen={onOpen}
        href={href}
      />
    )
  }

  if (kind === 'auction' || kind === 'auction_buy_now') {
    return (
      <AuctionPropertyCard
        property={property}
        isFavorite={liked}
        onFavoriteToggle={handleFavoriteToggle}
        onOpen={onOpen}
        href={href}
        formatPrice={formatPrice}
      />
    )
  }

  return (
    <PropertyListingCard
      property={property}
      favoriteMockCategory={favoriteMockCategory}
      onOpen={onOpen}
      href={href}
      showActions={false}
      pinFooter
    />
  )
}

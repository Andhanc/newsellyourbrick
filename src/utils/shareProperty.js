import { getPropertyDetailPath } from './propertyDetailUrl'

const SHARE_LISTING_TYPES = new Set(['apartment', 'house', 'villa', 'commercial'])

function isShareListing(property) {
  if (!property) return false
  return (
    property.pricePerShare != null ||
    (property.totalPrice != null && property.totalShares != null) ||
    property.is_share === 1 ||
    property.is_share === true ||
    property.sale_type === 'share' ||
    property.is_shared_ownership === 1 ||
    property.is_shared_ownership === true
  )
}

function getShareListingPath(property) {
  const id = property?.id
  if (id == null || id === '') return '/shares'

  const pt = String(property.property_type || '').trim().toLowerCase()
  if (SHARE_LISTING_TYPES.has(pt)) {
    return `/shares/${pt}-${id}`
  }

  return `/shares/${id}`
}

/** Абсолютный URL карточки объекта или долевого лота. */
export function getPropertyShareUrl(property) {
  if (typeof window === 'undefined' || !property) return ''

  const origin = window.location.origin
  const path = isShareListing(property)
    ? getShareListingPath(property)
    : getPropertyDetailPath(property.id, { property })

  return `${origin}${path}`
}

/**
 * Web Share API или копирование ссылки в буфер.
 * @returns {'native' | 'clipboard' | 'cancelled' | 'prompt' | 'failed'}
 */
export async function sharePropertyListing(property, { title, text } = {}) {
  const url = getPropertyShareUrl(property)
  if (!url) return 'failed'

  const shareTitle = title || property.title || property.name || 'SellYourBrick'
  const shareText = text || property.description || ''

  try {
    if (navigator.share) {
      await navigator.share({
        title: shareTitle,
        text: shareText ? String(shareText).slice(0, 280) : undefined,
        url,
      })
      return 'native'
    }
  } catch (err) {
    if (err?.name === 'AbortError') return 'cancelled'
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url)
      return 'clipboard'
    }
  } catch {
    /* fallback below */
  }

  if (typeof window !== 'undefined' && window.prompt) {
    window.prompt('', url)
    return 'prompt'
  }

  return 'failed'
}

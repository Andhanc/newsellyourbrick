import { getPropertyDetailPath } from './propertyDetailUrl'
import { getCoInvestmentDetailPath } from './sectionRoutes'

export {
  getCoInvestmentDetailPath,
  CO_INVESTMENT_PATH,
  CO_INVESTMENT_LEGACY_PATH,
} from './sectionRoutes'

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

/** @deprecated используйте getCoInvestmentDetailPath */
export function getShareListingPath(property) {
  return getCoInvestmentDetailPath(property)
}

/** Абсолютный URL карточки объекта или долевого лота. */
export function getPropertyShareUrl(property) {
  if (typeof window === 'undefined' || !property) return ''

  const origin = window.location.origin
  const path = isShareListing(property)
    ? getCoInvestmentDetailPath(property)
    : getPropertyDetailPath(property)

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

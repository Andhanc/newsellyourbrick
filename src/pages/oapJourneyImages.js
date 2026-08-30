import { OAP_AMENITIES_IMAGES } from './oapAmenitiesImages'
import { OAP_CALCULATOR_IMAGES } from './oapCalculatorImages'
import { OAP_DOCUMENT_IMAGES } from './oapDocumentImages'
import { OAP_LISTING_IMAGES } from './oapListingImages'
import { OAP_PARAMS_IMAGES } from './oapParamsImages'

export const OAP_JOURNEY_IMAGES = [
  OAP_CALCULATOR_IMAGES.pricingPublicationHero,
  OAP_PARAMS_IMAGES.sidebarHero,
  OAP_PARAMS_IMAGES.characteristicsHero,
  OAP_AMENITIES_IMAGES.sidebarInterior,
  OAP_LISTING_IMAGES.sidebarHero,
  OAP_CALCULATOR_IMAGES.sidebarHero,
  OAP_DOCUMENT_IMAGES.sidebarHero,
]

export const OAP_JOURNEY_STEP_COUNT = OAP_JOURNEY_IMAGES.length

/** @deprecated */
export const OAP_JOURNEY_CONTINUOUS_STRIP = OAP_JOURNEY_IMAGES[0]
export const OAP_JOURNEY_PANELS = OAP_JOURNEY_IMAGES

let preloadStarted = false

export function preloadOapJourneyImages() {
  if (preloadStarted || typeof window === 'undefined') return
  preloadStarted = true

  OAP_JOURNEY_IMAGES.forEach((src, index) => {
    const img = new Image()
    if (index === 0) img.fetchPriority = 'high'
    img.src = src
  })
}

if (typeof window !== 'undefined') {
  preloadOapJourneyImages()
}

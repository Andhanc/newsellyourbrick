import { OAP_AMENITIES_IMAGES } from './oapAmenitiesImages'
import { OAP_CALCULATOR_IMAGES } from './oapCalculatorImages'
import { OAP_DESCRIPTION_IMAGES } from './oapDescriptionImages'
import { OAP_DOCUMENT_IMAGES } from './oapDocumentImages'
import { OAP_LISTING_IMAGES } from './oapListingImages'
import { OAP_PARAMS_IMAGES } from './oapParamsImages'
import { OAP_TESTDRIVE_IMAGES } from './oapTestdriveImages'
import { preloadOapJourneyImages } from './oapJourneyImages'

/** Все иллюстрации боковой панели мастера добавления объекта */
export const OAP_WIZARD_SIDEBAR_IMAGES = [
  ...new Set([
    OAP_PARAMS_IMAGES.sidebarHero,
    OAP_PARAMS_IMAGES.characteristicsHero,
    OAP_DESCRIPTION_IMAGES.sidebarHero,
    OAP_AMENITIES_IMAGES.sidebarInterior,
    OAP_CALCULATOR_IMAGES.sidebarHero,
    OAP_CALCULATOR_IMAGES.pricingPublicationHero,
    OAP_LISTING_IMAGES.sidebarHero,
    OAP_TESTDRIVE_IMAGES.sidebarHero,
    OAP_DOCUMENT_IMAGES.sidebarHero,
  ]),
]

let wizardPreloadStarted = false

export function preloadOapWizardImages() {
  if (wizardPreloadStarted || typeof window === 'undefined') return
  wizardPreloadStarted = true

  preloadOapJourneyImages()

  OAP_WIZARD_SIDEBAR_IMAGES.forEach((src, index) => {
    const img = new Image()
    if (index < 2) img.fetchPriority = 'high'
    img.decoding = 'async'
    img.src = src
  })
}

if (typeof window !== 'undefined') {
  const schedule =
    typeof requestIdleCallback === 'function'
      ? requestIdleCallback
      : (cb) => window.setTimeout(cb, 0)

  schedule(() => preloadOapWizardImages())
}

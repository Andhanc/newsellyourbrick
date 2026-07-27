import img01 from '../assets/oap-journey/oap-step-01-welcome.webp'
import img02 from '../assets/oap-journey/oap-step-02-type-location.webp'
import img03 from '../assets/oap-journey/oap-step-03-params.webp'
import img04 from '../assets/oap-journey/oap-step-04-presentation.webp'
import img05 from '../assets/oap-journey/oap-step-05-strategy.webp'
import img06 from '../assets/oap-journey/oap-step-06-finance.webp'
import img07 from '../assets/oap-journey/oap-step-07-documents.webp'

export const OAP_JOURNEY_IMAGES = [img01, img02, img03, img04, img05, img06, img07]

export const OAP_JOURNEY_STEP_COUNT = OAP_JOURNEY_IMAGES.length

/** @deprecated */
export const OAP_JOURNEY_CONTINUOUS_STRIP = img01
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

import { publicAsset } from '../utils/publicAsset'

/** 3D-иллюстрации маршрута продавца: профиль → объект и депозит → торги → старт. */
export const OWNER_ONBOARDING_IMAGES = [
  publicAsset('images/owner-onboarding/owner-onboarding-step-1-cabinet.webp'),
  publicAsset('images/owner-onboarding/owner-onboarding-step-2-analytics.webp'),
  publicAsset('images/owner-onboarding/owner-onboarding-step-3-add-property.webp'),
  publicAsset('images/owner-onboarding/owner-onboarding-step-4-start.webp'),
]

let preloadStarted = false

export function preloadOwnerOnboardingImages() {
  if (preloadStarted || typeof window === 'undefined') return
  preloadStarted = true

  OWNER_ONBOARDING_IMAGES.forEach((src, index) => {
    const img = new Image()
    img.decoding = 'async'
    if (index === 0) img.fetchPriority = 'high'
    img.src = src
  })
}

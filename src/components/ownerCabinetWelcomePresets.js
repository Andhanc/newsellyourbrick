import { publicAsset } from '../utils/publicAsset'
import { OWNER_ONBOARDING_IMAGES } from './ownerOnboardingImages'

/** 3 шага: приветствие → профиль → объект/депозит (активный welcome-flow продавца). */
export const OWNER_CABINET_WELCOME_IMAGES = [
  publicAsset('images/owner-onboarding/owner-onboarding-step-4-start.webp'),
  publicAsset('images/owner-onboarding/owner-onboarding-step-1-cabinet.webp'),
  publicAsset('images/owner-onboarding/owner-onboarding-step-2-analytics.webp'),
]

/** Активный welcome-drawer кабинета продавца. */
export const OWNER_CABINET_WELCOME_PRESET = {
  translationPrefix: 'ownerWelcome',
  stepCount: 3,
  images: OWNER_CABINET_WELCOME_IMAGES,
  finishLabelKey: 'ownerCabinet_welcomeFinish',
  buyerStyled: true,
}

/** Полный 4-шаговый tour — зарезервирован для будущих релизов. */
export const OWNER_CABINET_WELCOME_PRESET_FULL = {
  translationPrefix: 'ownerTest',
  stepCount: 4,
  images: OWNER_ONBOARDING_IMAGES,
  finishLabelKey: 'ownerTest_onboardingStart',
  buyerStyled: false,
}

let preloadStarted = false

export function preloadOwnerCabinetWelcomeImages(images = OWNER_CABINET_WELCOME_IMAGES) {
  if (preloadStarted || typeof window === 'undefined') return
  preloadStarted = true

  images.forEach((src, index) => {
    const img = new Image()
    img.decoding = 'async'
    if (index === 0) img.fetchPriority = 'high'
    img.src = src
  })
}

import { publicAsset } from '../utils/publicAsset'

/** 3 шага: приветствие → данные → депозит (активный welcome-flow). */
export const BUYER_CABINET_WELCOME_IMAGES = [
  publicAsset('images/profile/shortcuts/subscriptions.png'),
  publicAsset('images/profile/shortcuts/data.png'),
  publicAsset('images/profile/shortcuts/deposit.png'),
]

/** 4 шага: полный tour покупателя (зарезервировано для будущего). */
export const BUYER_CABINET_WELCOME_IMAGES_FULL = [
  publicAsset('images/profile/shortcuts/data.png'),
  publicAsset('images/profile/shortcuts/deposit.png'),
  publicAsset('images/profile/shortcuts/bookings.png'),
  publicAsset('images/profile/shortcuts/history.png'),
]

/** Активный welcome-drawer профиля покупателя. */
export const BUYER_CABINET_WELCOME_PRESET = {
  translationPrefix: 'buyerWelcome',
  stepCount: 3,
  images: BUYER_CABINET_WELCOME_IMAGES,
  finishLabelKey: 'buyerCabinet_welcomeFinish',
}

/** Полный 4-шаговый tour — не используется сейчас, оставлен для будущих релизов. */
export const BUYER_CABINET_WELCOME_PRESET_FULL = {
  translationPrefix: 'buyerTest',
  stepCount: 4,
  images: BUYER_CABINET_WELCOME_IMAGES_FULL,
  finishLabelKey: 'buyerCabinet_welcomeFinish',
}

let preloadStarted = false

export function preloadBuyerCabinetWelcomeImages(images = BUYER_CABINET_WELCOME_IMAGES) {
  if (preloadStarted || typeof window === 'undefined') return
  preloadStarted = true

  images.forEach((src, index) => {
    const img = new Image()
    img.decoding = 'async'
    if (index === 0) img.fetchPriority = 'high'
    img.src = src
  })
}

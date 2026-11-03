export const CABINET_ENTRY_PENDING_KEY = 'syb_cabinet_entry_pending'
export const CABINET_ENTRY_SHOWN_KEY = 'syb_cabinet_entry_shown_at'
export const CABINET_ENTRY_STARTED_KEY = 'syb_cabinet_entry_started_at'
export const CABINET_ENTRY_EVENT = 'syb-cabinet-entry'
export const CABINET_ENTRY_ROOT_ID = 'cabinet-entry-boot'
export const CABINET_ENTRY_HOLD_MS = 2500
export const CABINET_ENTRY_FADE_MS = 420
const CABINET_ENTRY_COOLDOWN_MS = 5000
const CABINET_ENTRY_PHOTO = '/images/sellyourbrick/about/about-hero-villa.jpg'

const CABINET_ENTRY_COPY = {
  ru: { kicker: 'SellYourBrick', title: 'Добро пожаловать', subtitle: 'Открываем ваш профиль' },
  en: { kicker: 'SellYourBrick', title: 'Welcome', subtitle: 'Opening your profile' },
  de: { kicker: 'SellYourBrick', title: 'Willkommen', subtitle: 'Ihr Profil wird geöffnet' },
  es: { kicker: 'SellYourBrick', title: 'Bienvenido', subtitle: 'Abriendo su perfil' },
  fr: { kicker: 'SellYourBrick', title: 'Bienvenue', subtitle: 'Ouverture de votre profil' },
  pl: { kicker: 'SellYourBrick', title: 'Witamy', subtitle: 'Otwieramy Twój profil' },
  sv: { kicker: 'SellYourBrick', title: 'Välkommen', subtitle: 'Öppnar din profil' },
}

function readLanguage() {
  try {
    if (typeof localStorage === 'undefined') return 'ru'
    return String(localStorage.getItem('i18nextLng') || 'ru').slice(0, 2)
  } catch {
    return 'ru'
  }
}

export function cabinetEntryCopy(lang = readLanguage()) {
  return CABINET_ENTRY_COPY[lang] || CABINET_ENTRY_COPY.en
}

export function mountCabinetEntrySplash(copy = cabinetEntryCopy()) {
  if (typeof document === 'undefined' || !document.body) return null
  let el = document.getElementById(CABINET_ENTRY_ROOT_ID)
  if (!el) {
    el = document.createElement('div')
    el.id = CABINET_ENTRY_ROOT_ID
    el.className = 'cabinet-entry'
    el.setAttribute('role', 'status')
    el.setAttribute('aria-live', 'polite')
    el.innerHTML = `
      <div class="cabinet-entry__photo" aria-hidden="true"></div>
      <div class="cabinet-entry__veil" aria-hidden="true"></div>
      <div class="cabinet-entry__brand" aria-hidden="true"><span>Sell</span><span class="cabinet-entry__brand-accent">Your</span><span>Brick</span></div>
      <div class="cabinet-entry__copy">
        <p class="cabinet-entry__kicker"></p>
        <p class="cabinet-entry__title"></p>
        <p class="cabinet-entry__subtitle"></p>
        <div class="cabinet-entry__rule" aria-hidden="true"><span class="cabinet-entry__rule-fill"></span></div>
      </div>`
    document.body.appendChild(el)
  }
  const kicker = el.querySelector('.cabinet-entry__kicker')
  const title = el.querySelector('.cabinet-entry__title')
  const subtitle = el.querySelector('.cabinet-entry__subtitle')
  const photo = el.querySelector('.cabinet-entry__photo')
  if (photo) {
    photo.style.backgroundImage = `linear-gradient(180deg, rgba(15, 23, 42, 0.18), rgba(15, 23, 42, 0.18)), url("${CABINET_ENTRY_PHOTO}")`
    photo.style.backgroundPosition = 'center 42%'
    photo.style.backgroundSize = 'cover'
  }
  if (kicker) kicker.textContent = copy.kicker
  if (title) title.textContent = copy.title
  if (subtitle) subtitle.textContent = copy.subtitle
  document.documentElement.classList.add('cabinet-entry-boot')
  return el
}

function defaultStorage() {
  if (typeof sessionStorage === 'undefined') return null
  return sessionStorage
}

export function isUserCabinetPath(path) {
  const pathname = String(path || '').split('?')[0].split('#')[0]
  return (
    pathname === '/profile' ||
    pathname.startsWith('/profile/') ||
    pathname === '/owner-test' ||
    pathname.startsWith('/owner-test/')
  )
}

export function markCabinetEntry(storage = defaultStorage(), { defer = false, now = Date.now(), dispatch } = {}) {
  if (!storage) return false
  try {
    const shownAt = Number(storage.getItem(CABINET_ENTRY_SHOWN_KEY) || 0)
    if (shownAt && now - shownAt < CABINET_ENTRY_COOLDOWN_MS) return false
    storage.setItem(CABINET_ENTRY_PENDING_KEY, '1')
    if (defer) {
      storage.removeItem(CABINET_ENTRY_STARTED_KEY)
    } else if (!storage.getItem(CABINET_ENTRY_STARTED_KEY)) {
      storage.setItem(CABINET_ENTRY_STARTED_KEY, String(now))
    }
  } catch {
    return false
  }

  if (defer) return true

  mountCabinetEntrySplash()
  const emit = dispatch || (() => {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(CABINET_ENTRY_EVENT))
  })
  emit()
  return true
}

export function claimCabinetEntry(storage = defaultStorage(), now = Date.now()) {
  if (!storage) return false
  try {
    if (storage.getItem(CABINET_ENTRY_PENDING_KEY) !== '1') return false
    storage.removeItem(CABINET_ENTRY_PENDING_KEY)
    storage.setItem(CABINET_ENTRY_SHOWN_KEY, String(now))
    return true
  } catch {
    return false
  }
}

export function openCabinetAfterAuth(navigate, path, { replace = false, hard = false, storage, now } = {}) {
  const target = String(path || '/profile')
  if (isUserCabinetPath(target)) {
    markCabinetEntry(storage, { defer: Boolean(hard), now })
  }
  if (hard) {
    if (typeof window !== 'undefined') window.location.href = target
    return
  }
  if (typeof navigate === 'function') {
    navigate(target, replace ? { replace: true } : undefined)
  }
}

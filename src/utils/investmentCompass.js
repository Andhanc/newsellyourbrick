import { COMPASS_PATH, CO_INVESTMENT_PATH } from './sectionPaths.js'

export { COMPASS_PATH }
export const COMPASS_STORAGE_KEY = 'syb.investmentCompass.v1'
export const COMPASS_INTRO_KEY = 'syb.investmentCompass.playIntro'
export const COMPASS_ICON_SRC = 'images/home-sale-formats/icons/compass-3d.png'
export const COMPASS_BANNER_SRC = 'images/home-sale-formats/icons/compass-banner-3d.png'
export const COMPASS_PROMPT_DELAY_MS = 6500
export const COMPASS_SWIPE_PROMPT_DELAY_MS = 1200
export const COMPASS_INTRO_MS = 1200
export const COMPASS_SELECT_ADVANCE_MS = 280

export const COMPASS_STRATEGIES = ['auction', 'buyNow', 'debts', 'shares']

export const COMPASS_STRATEGY_ICONS = {
  auction: 'images/home-sale-formats/icons/auction-3d.png',
  buyNow: 'images/home-sale-formats/icons/buy-now-3d.png',
  debts: 'images/home-sale-formats/icons/debts-3d.png',
  shares: 'images/home-sale-formats/icons/shares-3d.png',
}

export const COMPASS_STRATEGY_TITLE_KEYS = {
  auction: 'auction',
  buyNow: 'buyNowSectionTitle',
  debts: 'debtsTitle',
  shares: 'shares',
}

export const COMPASS_STRATEGY_PATHS = {
  auction: '/auction?filter=auction',
  buyNow: '/auction/buy-now',
  debts: '/debts',
  shares: CO_INVESTMENT_PATH,
}

export const COMPASS_QUESTIONS = [
  { id: 'goal', options: ['preserve', 'income', 'growth', 'portfolio'] },
  { id: 'horizon', options: ['short', 'mid', 'long'] },
  { id: 'risk', options: ['stable', 'balance', 'upside'] },
  { id: 'speed', options: ['fast', 'calm', 'special'] },
  { id: 'format', options: ['own', 'share', 'debt', 'bid'] },
  { id: 'drawdown', options: ['exit', 'wait', 'buy'] },
]

const COMPASS_SCORE = {
  goal: {
    preserve: { buyNow: 3, shares: 1 },
    income: { buyNow: 2, shares: 2 },
    growth: { auction: 3, debts: 2 },
    portfolio: { shares: 3, debts: 1, auction: 1 },
  },
  horizon: {
    short: { auction: 3, debts: 2 },
    mid: { shares: 3, debts: 1, buyNow: 1 },
    long: { buyNow: 3, shares: 1 },
  },
  risk: {
    stable: { buyNow: 3 },
    balance: { shares: 3, buyNow: 1 },
    upside: { auction: 3, debts: 2 },
  },
  speed: {
    fast: { auction: 3 },
    calm: { buyNow: 3 },
    special: { debts: 3, auction: 1 },
  },
  format: {
    own: { buyNow: 3 },
    share: { shares: 3 },
    debt: { debts: 3 },
    bid: { auction: 3 },
  },
  drawdown: {
    exit: { buyNow: 2 },
    wait: { shares: 2, buyNow: 1 },
    buy: { auction: 2, debts: 2 },
  },
}

const AUCTION_CONFETTI_COLORS = [
  '#4ecdd6',
  '#f59e0b',
  '#3b82f6',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#f97316',
  '#6fd4dc',
  '#fbbf24',
]

export const COMPASS_CONFETTI_COLORS = AUCTION_CONFETTI_COLORS

export function emptyCompassScores() {
  return { auction: 0, buyNow: 0, debts: 0, shares: 0 }
}

export function scoreCompassAnswers(answers = {}) {
  const scores = emptyCompassScores()

  for (const question of COMPASS_QUESTIONS) {
    const option = answers[question.id]
    const table = COMPASS_SCORE[question.id]?.[option]
    if (!table) continue
    for (const [strategy, points] of Object.entries(table)) {
      scores[strategy] += points
    }
  }

  const strategy = COMPASS_STRATEGIES.reduce((best, key) => (
    scores[key] > scores[best] ? key : best
  ))

  return { strategy, scores }
}

export function isCompassComplete(answers = {}) {
  return COMPASS_QUESTIONS.every((question) => Boolean(answers[question.id]))
}

export function getStrategyPath(strategy) {
  return COMPASS_STRATEGY_PATHS[strategy] || COMPASS_STRATEGY_PATHS.auction
}

export function getStrategyTitleKey(strategy) {
  return COMPASS_STRATEGY_TITLE_KEYS[strategy] || COMPASS_STRATEGY_TITLE_KEYS.auction
}

export function getStrategyInfoSection(strategy) {
  return COMPASS_STRATEGIES.includes(strategy) ? strategy : 'auction'
}

export function shouldAutoOpenCompass({
  stageReady = false,
  hasBrowsedCards = false,
  blocked = false,
  elapsedMs = 0,
  prompted = false,
  hasResult = false,
} = {}) {
  if (!stageReady || blocked || prompted || hasResult) return false
  if (hasBrowsedCards && elapsedMs >= COMPASS_SWIPE_PROMPT_DELAY_MS) return true
  return elapsedMs >= COMPASS_PROMPT_DELAY_MS
}

function storage() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null
    return window.localStorage
  } catch {
    return null
  }
}

function sessionStore() {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return null
    return window.sessionStorage
  } catch {
    return null
  }
}

export function readCompassState() {
  const store = storage()
  if (!store) return {}
  try {
    const raw = store.getItem(COMPASS_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeCompassState(patch) {
  const store = storage()
  if (!store) return {}
  const next = { ...readCompassState(), ...patch }
  store.setItem(COMPASS_STORAGE_KEY, JSON.stringify(next))
  return next
}

export function hasCompassResult() {
  return Boolean(readCompassState().result?.strategy)
}

export function hasCompassPrompted() {
  const state = readCompassState()
  return Boolean(state.prompted || state.result?.strategy)
}

export function markCompassPrompted() {
  return writeCompassState({ prompted: true, promptedAt: Date.now() })
}

export function saveCompassResult({ strategy, answers, scores }) {
  return writeCompassState({
    prompted: true,
    result: {
      strategy,
      answers,
      scores,
      completedAt: Date.now(),
    },
  })
}

export function clearCompassResult() {
  return writeCompassState({ result: null })
}

export function markCompassIntroPending() {
  sessionStore()?.setItem(COMPASS_INTRO_KEY, '1')
}

export function consumeCompassIntroPending() {
  const store = sessionStore()
  if (!store) return false
  const pending = store.getItem(COMPASS_INTRO_KEY) === '1'
  store.removeItem(COMPASS_INTRO_KEY)
  return pending
}

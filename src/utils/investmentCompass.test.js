import assert from 'node:assert/strict'
import test from 'node:test'
import {
  COMPASS_PATH,
  COMPASS_PROMPT_DELAY_MS,
  COMPASS_OFFER_SESSION_KEY,
  COMPASS_OFFER_SHOWN_KEY,
  COMPASS_QUESTIONS,
  COMPASS_STRATEGIES,
  getStrategyPath,
  getCompassOfferSessionId,
  hasCompassOfferShown,
  isCompassComplete,
  markCompassOfferShown,
  clearCompassOfferSession,
  scoreCompassAnswers,
} from './investmentCompass.js'

test('compass offer is shown once per login session and resets after logout', () => {
  const previousWindow = global.window
  const values = new Map()
  global.window = {
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: (key) => values.delete(key),
    },
  }

  try {
    assert.equal(COMPASS_PROMPT_DELAY_MS, 5000)
    const firstSession = getCompassOfferSessionId()
    assert.ok(firstSession)
    assert.equal(getCompassOfferSessionId(), firstSession)
    assert.equal(hasCompassOfferShown(firstSession), false)
    markCompassOfferShown(firstSession)
    assert.equal(hasCompassOfferShown(firstSession), true)
    assert.equal(values.get(COMPASS_OFFER_SHOWN_KEY), firstSession)

    clearCompassOfferSession()
    assert.equal(values.has(COMPASS_OFFER_SESSION_KEY), false)
    assert.equal(hasCompassOfferShown(firstSession), false)
    assert.notEqual(getCompassOfferSessionId(), firstSession)
  } finally {
    if (previousWindow === undefined) delete global.window
    else global.window = previousWindow
  }
})

test('compass scoring maps conservative answers to buy now', () => {
  const { strategy, scores } = scoreCompassAnswers({
    goal: 'preserve',
    horizon: 'long',
    risk: 'stable',
    speed: 'calm',
    format: 'own',
    drawdown: 'exit',
  })
  assert.equal(strategy, 'buyNow')
  assert.ok(scores.buyNow > scores.auction)
  assert.ok(scores.buyNow > scores.shares)
})

test('compass scoring maps hunter answers to auction', () => {
  const { strategy } = scoreCompassAnswers({
    goal: 'growth',
    horizon: 'short',
    risk: 'upside',
    speed: 'fast',
    format: 'bid',
    drawdown: 'buy',
  })
  assert.equal(strategy, 'auction')
})

test('compass scoring maps hybrid answers to shares', () => {
  const { strategy } = scoreCompassAnswers({
    goal: 'portfolio',
    horizon: 'mid',
    risk: 'balance',
    speed: 'calm',
    format: 'share',
    drawdown: 'wait',
  })
  assert.equal(strategy, 'shares')
})

test('compass scoring maps discount answers to debts', () => {
  const { strategy } = scoreCompassAnswers({
    goal: 'growth',
    horizon: 'short',
    risk: 'upside',
    speed: 'special',
    format: 'debt',
    drawdown: 'buy',
  })
  assert.equal(strategy, 'debts')
})

test('compass completion and strategy paths stay aligned with the four formats', () => {
  assert.equal(COMPASS_QUESTIONS.length, 6)
  assert.deepEqual(COMPASS_STRATEGIES, ['auction', 'buyNow', 'debts', 'shares'])
  assert.equal(isCompassComplete({}), false)
  assert.equal(getStrategyPath('buyNow'), '/auction/buy-now')
  assert.equal(getStrategyPath('shares'), '/co-investment')
  assert.equal(COMPASS_PATH, '/compass')
})

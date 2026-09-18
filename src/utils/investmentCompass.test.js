import assert from 'node:assert/strict'
import test from 'node:test'
import {
  COMPASS_PATH,
  COMPASS_PROMPT_DELAY_MS,
  COMPASS_QUESTIONS,
  COMPASS_STRATEGIES,
  COMPASS_SWIPE_PROMPT_DELAY_MS,
  getStrategyPath,
  isCompassComplete,
  scoreCompassAnswers,
  shouldAutoOpenCompass,
} from './investmentCompass.js'

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

test('compass auto-opens after the strategy stage, not on first paint', () => {
  assert.equal(shouldAutoOpenCompass({ stageReady: false, elapsedMs: 20_000 }), false)
  assert.equal(shouldAutoOpenCompass({
    stageReady: true,
    elapsedMs: COMPASS_PROMPT_DELAY_MS - 1,
  }), false)
  assert.equal(shouldAutoOpenCompass({
    stageReady: true,
    elapsedMs: COMPASS_PROMPT_DELAY_MS,
  }), true)
  assert.equal(shouldAutoOpenCompass({
    stageReady: true,
    hasBrowsedCards: true,
    elapsedMs: COMPASS_SWIPE_PROMPT_DELAY_MS,
  }), true)
  assert.equal(shouldAutoOpenCompass({
    stageReady: true,
    elapsedMs: COMPASS_SWIPE_PROMPT_DELAY_MS,
  }), false)
  assert.equal(shouldAutoOpenCompass({
    stageReady: true,
    elapsedMs: 20_000,
    prompted: true,
  }), false)
  assert.equal(shouldAutoOpenCompass({
    stageReady: true,
    elapsedMs: 20_000,
    blocked: true,
  }), false)
})

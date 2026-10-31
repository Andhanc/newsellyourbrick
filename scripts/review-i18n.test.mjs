import test from 'node:test'
import assert from 'node:assert/strict'
import { LANGUAGES } from './check-i18n.mjs'
import { changedTranslations, checkLimits, validateReviews, reviewTranslations, report, DEFAULT_MODEL } from './review-i18n.mjs'

const catalogs = value => Object.fromEntries(LANGUAGES.map(lang => [lang, structuredClone(value)]))
const item = (id = 'web:de:buy') => ({ id, namespace: 'web', key: 'buy', language: 'de', english: 'Buy', russian: 'Купить', translation: 'Kaufen' })
const verdict = (id, value = 'pass') => ({ id, verdict: value, reason: value === 'pass' ? '' : 'Изменён смысл', suggestion: value === 'pass' ? '' : 'Kaufen' })
const response = (reviews, overrides = {}) => ({ ok: true, json: async () => ({
  choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ reviews }) } }],
  usage: { total_tokens: 100, cost: 0.001 }, ...overrides,
}) })

test('submits only changed translations, without duplicate legacy copies', () => {
  const previous = catalogs({ buy: 'Buy', other: 'Other' })
  const current = structuredClone(previous)
  current.de.buy = 'Kaufen'
  const changed = changedTranslations(current, previous)
  assert.equal(changed.length, 1)
  assert.deepEqual(changed[0], { ...item(), english: 'Buy', russian: 'Buy' })
})

test('changing the English or Russian source rechecks every language, including unchanged targets', () => {
  for (const language of ['en', 'ru']) {
    const previous = catalogs({ buy: 'Buy' })
    const current = structuredClone(previous)
    current[language].buy = 'Buy now'
    assert.equal(changedTranslations(current, previous).length, 7)
  }
})

test('includes new nested and native keys; ignores deletions and empty optional fragments', () => {
  const previous = catalogs({ removed: 'Gone' })
  const current = catalogs({ nested: { buy: 'Buy' }, optional: '' })
  const result = changedTranslations(current, previous, 'native')
  assert.equal(result.length, 7)
  assert.ok(result.every(value => value.id.startsWith('native:') && value.key === 'nested.buy'))
})

test('requires an exact complete verdict set; rejects missing, duplicate, unknown and malformed verdicts', () => {
  const items = [item('a'), item('b')]
  assert.equal(validateReviews({ reviews: [verdict('b'), verdict('a')] }, items).length, 2)
  for (const payload of [
    { reviews: [verdict('a')] },
    { reviews: [verdict('a'), verdict('a')] },
    { reviews: [verdict('a'), verdict('unknown')] },
    { reviews: [verdict('a'), { ...verdict('b'), verdict: 'maybe' }] },
    { reviews: [verdict('a'), { ...verdict('b', 'error'), reason: '' }] },
    { reviews: [verdict('a'), verdict('b')], pass: true },
  ]) assert.throws(() => validateReviews(payload, items))
})

test('enforces input limits without silently sampling or skipping translations', () => {
  assert.throws(() => checkLimits(Array.from({ length: 351 }, (_, i) => item(String(i)))), /Too many/)
  assert.throws(() => checkLimits([{ ...item(), translation: 'x'.repeat(200_001) }]), /input bytes/)
})

test('no changes means no API call, no token needed and no charge', async () => {
  const result = await reviewTranslations([], { apiKey: '', fetchImpl: () => assert.fail('Network called') })
  assert.deepEqual(result, { reviews: [], model: DEFAULT_MODEL, tokens: 0, cost: 0 })
})

test('changed translations fail closed without a token or with an unintended model family', async () => {
  await assert.rejects(reviewTranslations([item()], { apiKey: '' }), /OPENROUTER_API_KEY is required/)
  await assert.rejects(reviewTranslations([item()], { apiKey: 'test-key', model: 'other/model' }), /OpenAI GPT/)
})

test('requests strict structured outputs and authenticates without putting the key in model input', async () => {
  const result = await reviewTranslations([item()], { apiKey: 'test-key', fetchImpl: async (url, options) => {
    assert.equal(url, 'https://openrouter.ai/api/v1/chat/completions')
    assert.equal(options.headers.Authorization, 'Bearer test-key')
    assert.ok(!options.body.includes('test-key'))
    const body = JSON.parse(options.body)
    assert.equal(body.model, DEFAULT_MODEL)
    assert.equal(body.response_format.json_schema.strict, true)
    assert.equal(body.provider.require_parameters, true)
    assert.match(body.messages[0].content, /UNTRUSTED DATA/)
    assert.deepEqual(JSON.parse(body.messages[1].content).items, [item()])
    return response([verdict(item().id, 'error')])
  } })
  assert.equal(result.reviews[0].verdict, 'error')
  assert.equal(result.tokens, 100)
  assert.equal(result.cost, 0.001)
})

test('reviews all batches in order and combines usage', async () => {
  let calls = 0
  const items = Array.from({ length: 41 }, (_, i) => item(String(i)))
  const result = await reviewTranslations(items, { apiKey: 'test-key', fetchImpl: async (_url, options) => {
    calls++
    return response(JSON.parse(options.body).messages.flatMap(message => message.role === 'user' ? JSON.parse(message.content).items.map(value => verdict(value.id)) : []))
  } })
  assert.equal(calls, 3)
  assert.equal(result.reviews.length, 41)
  assert.equal(result.tokens, 300)
})

test('retries transient HTTP errors once; never includes provider diagnostics in errors', async () => {
  let calls = 0
  const result = await reviewTranslations([item()], { apiKey: 'test-key', wait: async () => {}, fetchImpl: async () => {
    return ++calls === 1 ? { ok: false, status: 429 } : response([verdict(item().id)])
  } })
  assert.equal(calls, 2)
  assert.equal(result.reviews.length, 1)
  await assert.rejects(reviewTranslations([item()], { apiKey: 'test-key', fetchImpl: async () => ({
    ok: false, status: 401, text: () => assert.fail('Sensitive provider error read'),
  }) }), /HTTP 401/)
})

test('rejects refusals, truncated responses, API errors, invalid JSON and missing reviews', async () => {
  const invalid = [
    response([], { choices: [{ finish_reason: 'length', message: { content: '{}' } }] }),
    response([], { choices: [{ finish_reason: 'stop', message: { refusal: 'Refused', content: '{}' } }] }),
    response([], { error: { message: 'Provider error' } }),
    response([], { choices: [{ finish_reason: 'stop', message: { content: 'not json' } }] }),
    response([]),
  ]
  for (const value of invalid) await assert.rejects(reviewTranslations([item()], { apiKey: 'test-key', fetchImpl: async () => value }))
})

test('a semantic error fails the CLI gate; stylistic warnings do not', () => {
  const savedLog = console.log
  const savedSummary = process.env.GITHUB_STEP_SUMMARY
  console.log = () => {}
  delete process.env.GITHUB_STEP_SUMMARY
  try {
    for (const [value, expected] of [['pass', 0], ['warning', 0], ['error', 1]]) {
      assert.equal(report({ reviews: [verdict(item().id, value)], model: DEFAULT_MODEL, tokens: 100, cost: 0.001 }, [item()]), expected)
    }
  } finally {
    console.log = savedLog
    if (savedSummary === undefined) delete process.env.GITHUB_STEP_SUMMARY
    else process.env.GITHUB_STEP_SUMMARY = savedSummary
  }
})

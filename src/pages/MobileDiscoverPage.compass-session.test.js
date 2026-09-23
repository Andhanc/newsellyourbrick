import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  COMPASS_PROMPT_DELAY_MS,
  getCompassOfferSessionId,
  hasCompassOfferShown,
  markCompassOfferShown,
} from '../utils/investmentCompass.js'

const page = readFileSync(new URL('./MobileDiscoverPage.jsx', import.meta.url), 'utf8')
const start = page.indexOf('  useEffect(() => {\n    setCompassOfferOpen(false)')
const end = page.indexOf('\n\n  const goTo', start)
const effectSource = page.slice(start, end)

// Execute the page's actual offer effect with controlled time and browser storage.
function harness(t) {
  const values = new Map()
  const intervals = new Map()
  let now = 0
  let nextId = 0
  let open = false
  let loginOpen = false
  let dependencies
  let cleanup
  const previousWindow = global.window
  global.window = {
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, String(value)),
    },
    setInterval: (callback) => { intervals.set(++nextId, callback); return nextId },
    clearInterval: (id) => intervals.delete(id),
  }
  t.after(() => {
    cleanup?.()
    if (previousWindow === undefined) delete global.window
    else global.window = previousWindow
  })
  const run = new Function('useEffect', 'setCompassOfferOpen', 'shortcutsUnlocked',
    'sessionLoaded', 'authSessionId', 'getCompassOfferSessionId', 'hasCompassOfferShown',
    'markCompassOfferShown', 'COMPASS_PROMPT_DELAY_MS', 'compassOfferBlockedRef',
    'document', 'Date', effectSource)
  return {
    render(authSessionId, { loaded = true, signedIn = true, blocked = false } = {}) {
      cleanup?.()
      run((effect, deps) => { dependencies = deps; cleanup = effect() },
        (value) => { open = value }, signedIn, loaded, authSessionId,
        getCompassOfferSessionId, hasCompassOfferShown, markCompassOfferShown,
        COMPASS_PROMPT_DELAY_MS, { current: blocked },
        { documentElement: { classList: { contains: () => loginOpen } } },
        { now: () => now })
      assert.deepEqual(dependencies, [signedIn, loaded, authSessionId])
    },
    advance(ms) { now += ms; for (const callback of [...intervals.values()]) callback() },
    setLoginOpen(value) { loginOpen = value },
    get open() { return open },
  }
}

test('a new login shows the offer again without relying on logout storage cleanup', (t) => {
  const h = harness(t)
  h.render('session-first')
  h.advance(COMPASS_PROMPT_DELAY_MS - 1)
  assert.equal(h.open, false)
  h.advance(1)
  assert.equal(h.open, true)
  h.render('session-first') // Refresh or return to the homepage in the same session.
  h.advance(COMPASS_PROMPT_DELAY_MS)
  assert.equal(h.open, false)
  h.render('session-second') // Same user; shortcut access can remain true throughout.
  h.advance(COMPASS_PROMPT_DELAY_MS)
  assert.equal(h.open, true)
})

test('session hydration and guest visits never consume the offer', (t) => {
  const h = harness(t)
  h.render('', { loaded: false })
  h.advance(COMPASS_PROMPT_DELAY_MS)
  assert.equal(h.open, false)
  h.render('', { signedIn: false })
  h.advance(COMPASS_PROMPT_DELAY_MS)
  assert.equal(h.open, false)
  h.render('session-first')
  h.advance(COMPASS_PROMPT_DELAY_MS)
  assert.equal(h.open, true)
})

test('login modal postpones the offer until it closes', (t) => {
  const h = harness(t)
  h.setLoginOpen(true)
  h.render('session-first')
  h.advance(COMPASS_PROMPT_DELAY_MS)
  assert.equal(h.open, false)
  assert.equal(hasCompassOfferShown(getCompassOfferSessionId('session-first')), false)
  h.setLoginOpen(false)
  h.advance(200)
  assert.equal(h.open, true)
})

test('offer session handling stays identical in the legacy client', () => {
  for (const name of ['pages/MobileDiscoverPage.jsx', 'utils/investmentCompass.js']) {
    assert.equal(readFileSync(new URL(`../${name}`, import.meta.url), 'utf8'),
      readFileSync(new URL(`../../apps/client/src/legacy/${name}`, import.meta.url), 'utf8'))
  }
})

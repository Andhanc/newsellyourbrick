import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  DISCOVER_HERO_SEEN_KEY,
  hasSeenDiscoverHero,
  initialDiscoverScreen,
  markDiscoverHeroSeen,
  resetDiscoverHeroVisitForTests,
  scheduleDiscoverHeroReturn,
} from './discoverHeroVisit.js'

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial))
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  }
}

test('a new tab shows the intro, and a return in that tab opens the strategies', () => {
  const storage = memoryStorage()
  assert.equal(hasSeenDiscoverHero(storage), false)
  assert.equal(initialDiscoverScreen(storage), 'hero')

  markDiscoverHeroSeen(storage)
  assert.equal(storage.getItem(DISCOVER_HERO_SEEN_KEY), '1')
  assert.equal(initialDiscoverScreen(storage), 'stage')
})

test('a remount during the first visit keeps the hero', async () => {
  resetDiscoverHeroVisitForTests()
  const values = new Map()
  const previousWindow = global.window
  global.window = {
    localStorage: {
      getItem: () => '1',
      setItem() {},
    },
    sessionStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, String(value)),
    },
    setTimeout: (callback) => setTimeout(callback, 0),
    clearTimeout,
  }
  try {
    assert.equal(initialDiscoverScreen(), 'hero')
    assert.equal(values.get(DISCOVER_HERO_SEEN_KEY) ?? null, null)
    assert.equal(initialDiscoverScreen(), 'hero')
    scheduleDiscoverHeroReturn()
    initialDiscoverScreen()
    assert.equal(initialDiscoverScreen(), 'hero')
    scheduleDiscoverHeroReturn()
    await new Promise((resolve) => setTimeout(resolve, 0))
    assert.equal(initialDiscoverScreen(), 'stage')
  } finally {
    resetDiscoverHeroVisitForTests()
    if (previousWindow === undefined) delete global.window
    else global.window = previousWindow
  }
})

test('blocked storage keeps the first screen available', () => {
  const storage = {
    getItem() { throw new Error('blocked') },
    setItem() { throw new Error('blocked') },
  }
  assert.equal(hasSeenDiscoverHero(storage), false)
  assert.doesNotThrow(() => markDiscoverHeroSeen(storage))
  assert.equal(initialDiscoverScreen(storage), 'hero')
})

test('discover hero visit stays identical in the legacy client', () => {
  assert.equal(
    readFileSync(new URL('./discoverHeroVisit.js', import.meta.url), 'utf8'),
    readFileSync(new URL('../../apps/client/src/legacy/utils/discoverHeroVisit.js', import.meta.url), 'utf8'),
  )
  assert.equal(
    readFileSync(new URL('../pages/MobileDiscoverPage.jsx', import.meta.url), 'utf8'),
    readFileSync(new URL('../../apps/client/src/legacy/pages/MobileDiscoverPage.jsx', import.meta.url), 'utf8'),
  )
})

test('the homepage opens from the saved visit and remembers the hero', () => {
  const page = readFileSync(new URL('../pages/MobileDiscoverPage.jsx', import.meta.url), 'utf8')
  assert.match(page, /useRef\(initialDiscoverScreen\(\)\)/)
  assert.match(page, /useState\(activeScreenRef\.current\)/)
  assert.match(page, /useState\(\(\) => activeScreenRef\.current === 'stage'\)/)
  assert.match(page, /if \(next === 'hero' && hasSeenDiscoverHero\(\)\) return/)
  assert.match(page, /if \(screen !== 'hero'\) \{\s+markDiscoverHeroSeen\(\)\s+return undefined\s+\}\s+cancelDiscoverHeroReturn\(\)\s+return \(\) => scheduleDiscoverHeroReturn\(\)/)
})

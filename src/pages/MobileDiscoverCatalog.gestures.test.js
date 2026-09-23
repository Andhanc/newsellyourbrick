import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('./MobileDiscoverCatalog.jsx', import.meta.url), 'utf8')
const start = source.indexOf('  useEffect(() => {\n    const catalog = rootRef.current')
const effect = source.slice(start, source.indexOf('\n\n  const auction =', start))
const constants = source.slice(source.indexOf('const CARD_GESTURE'), source.indexOf('const ANDROID_URL'))

function setup() {
  const listeners = new Map()
  const timers = new Map()
  const frames = new Map()
  let next = 0
  let time = 1000
  let reads = 0
  const stage = {
    dataset: {}, scrollTop: 1800, clientHeight: 800, scrollHeight: 7000,
    getBoundingClientRect: () => { reads++; return { top: 0 } },
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: (name) => listeners.delete(name),
  }
  const cards = Array.from({ length: 3 }, () => ({ offsetHeight: 800, closest: () => null }))
  const origin = { getBoundingClientRect: () => ({ top: 1000 - stage.scrollTop }) }
  const tail = { getBoundingClientRect: () => ({ top: 4000 - stage.scrollTop }) }
  const catalog = {
    closest: () => stage,
    querySelector: (query) => query.includes('origin') ? origin : tail,
    querySelectorAll: () => cards,
  }
  const win = {
    addEventListener() {}, removeEventListener() {},
    setTimeout: (fn) => { timers.set(++next, fn); return next },
    clearTimeout: (id) => timers.delete(id),
    requestAnimationFrame: (fn) => { frames.set(++next, fn); return next },
    cancelAnimationFrame: (id) => frames.delete(id),
    matchMedia: () => ({ matches: false }),
  }
  let cleanup
  new Function('useEffect', 'rootRef', 'jumpingRef', 'wheelAcc', 'loading', 'window', 'document', 'performance', 'ResizeObserver',
    constants + effect)((fn) => { cleanup = fn() }, { current: catalog }, { current: false }, { current: 0 },
    false, win, { documentElement: { classList: { contains: () => false } } }, { now: () => time }, undefined)
  return {
    stage,
    fire(name, x = 100, y = 100, extra = {}) {
      const event = {
        touches: [{ clientX: x, clientY: y }], changedTouches: [{ clientX: x, clientY: y }],
        deltaX: 0, deltaY: 0, defaultPrevented: false,
        preventDefault() { this.defaultPrevented = true }, stopPropagation() {}, ...extra,
      }
      listeners.get(name)?.(event)
      return event
    },
    finishTimers() { const work = [...timers.values()]; timers.clear(); work.forEach((fn) => fn()) },
    finishAnimation() { time += 250; const work = [...frames.values()]; frames.clear(); work.forEach((fn) => fn(time)) },
    cleanup,
    get frames() { return frames.size }, get reads() { return reads },
  }
}

test('touching a partially scrolled panel does not jump it to another position', () => {
  const h = setup()
  h.stage.scrollTop = 1825
  h.fire('touchstart')
  assert.equal(h.stage.scrollTop, 1825)
  h.fire('touchmove', 40, 102)
  h.fire('touchend', 40, 102)
  assert.equal(h.stage.scrollTop, 1825)
  assert.equal(h.frames, 0)
  h.cleanup()
})

test('settling never starts while the finger is still on the carousel', () => {
  const h = setup()
  h.fire('touchstart')
  h.stage.scrollTop = 1840
  h.fire('scroll')
  h.finishTimers()
  assert.equal(h.frames, 0)
  assert.equal(h.stage.scrollTop, 1840)
  h.cleanup()
})

test('horizontal wheel events remain native even during a vertical flip', () => {
  const h = setup()
  h.fire('touchstart', 100, 200)
  assert.equal(h.fire('touchmove', 100, 160).defaultPrevented, true)
  assert.equal(h.frames, 1)
  assert.equal(h.fire('wheel', 0, 0, { deltaX: 150, deltaY: 2 }).defaultPrevented, false)
  h.finishAnimation()
  assert.equal(h.stage.scrollTop, 2600)
  h.fire('touchmove', 100, 40)
  assert.equal(h.frames, 0)
  h.cleanup()
})

test('scroll bursts use cached geometry instead of repeated layout reads', () => {
  const h = setup()
  const initial = h.reads
  for (let i = 0; i < 100; i++) {
    h.fire('scroll')
    h.finishAnimation()
  }
  assert.equal(h.reads, initial)
  h.cleanup()
})

test('touchcancel does not turn an interrupted short drag into a page flip', () => {
  const h = setup()
  h.fire('touchstart', 100, 200)
  h.fire('touchmove', 100, 179)
  h.fire('touchcancel', 100, 179)
  h.finishTimers(); h.finishAnimation()
  assert.equal(h.stage.scrollTop, 1800)
  h.cleanup()
})

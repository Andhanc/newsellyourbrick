import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { createShowcaseScroller } from './showcaseScroller.js'

function setup(t) {
  const previous = { window: global.window, ResizeObserver: global.ResizeObserver, getComputedStyle: global.getComputedStyle }
  const frames = new Map()
  const listeners = new Map()
  let next = 0
  let reads = 0
  let resize
  let reduced = false
  const updates = []
  const calls = []
  const slot = { getBoundingClientRect: () => { reads++; return { width: 200 } } }
  const scroller = {
    clientWidth: 320, scrollWidth: 1460, scrollLeft: 0,
    children: Array(7).fill(slot), querySelector: () => slot,
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: (name) => listeners.delete(name),
    scrollBy: (args) => calls.push(args), scrollTo: (args) => calls.push(args),
  }
  global.window = {
    requestAnimationFrame: (fn) => { frames.set(++next, fn); return next },
    cancelAnimationFrame: (id) => frames.delete(id),
    addEventListener() {}, removeEventListener() {},
    matchMedia: () => ({ matches: reduced }),
  }
  global.getComputedStyle = () => { reads++; return { columnGap: '10px' } }
  global.ResizeObserver = class {
    constructor(callback) { resize = callback }
    observe() {}
    disconnect() {}
  }
  const controller = createShowcaseScroller(scroller, (value) => updates.push(value))
  t.after(() => { controller.destroy(); Object.assign(global, previous) })
  return {
    scroller, controller, updates, calls,
    scroll: () => listeners.get('scroll')?.(),
    flush: () => { const work = [...frames.values()]; frames.clear(); work.forEach((fn) => fn()) },
    resize: () => resize(),
    reduce: () => { reduced = true },
    get reads() { return reads }, get pending() { return frames.size },
  }
}

test('a burst of scroll events schedules one frame and performs no layout measurements', (t) => {
  const h = setup(t)
  const reads = h.reads
  for (let i = 0; i < 100; i++) { h.scroller.scrollLeft = 200 + i / 100; h.scroll() }
  assert.equal(h.pending, 1)
  h.flush()
  assert.equal(h.reads, reads)
  assert.equal(h.updates.at(-1).activePage, 1)
  const count = h.updates.length
  h.scroll(); h.flush()
  assert.equal(h.updates.length, count)
})

test('pagination targets actual cards and clamps the last page to the rail end', (t) => {
  const h = setup(t)
  h.controller.goToPage(1)
  assert.deepEqual(h.calls.at(-1), { left: 210, behavior: 'smooth' })
  h.controller.goToPage(6)
  assert.equal(h.calls.at(-1).left, 1140)
  h.scroller.scrollLeft = 1140; h.scroll(); h.flush()
  assert.equal(h.updates.at(-1).activePage, 6)
  assert.equal(h.updates.at(-1).canScrollNext, false)
  h.scroller.scrollLeft = -15; h.scroll(); h.flush()
  assert.equal(h.updates.at(-1).canScrollPrev, false)
})

test('resize recalculates pages and reduced motion skips the scroll animation', (t) => {
  const h = setup(t)
  h.scroller.clientWidth = 640
  h.resize(); h.flush()
  assert.equal(h.updates.at(-1).pageCount, 3)
  h.reduce(); h.controller.scrollByDirection(-1)
  assert.deepEqual(h.calls.at(-1), { left: -210, behavior: 'auto' })
})

test('unmount cancels queued updates', (t) => {
  const h = setup(t)
  h.scroll(); h.controller.destroy()
  assert.equal(h.pending, 0)
  const count = h.updates.length
  h.scroll(); h.flush()
  assert.equal(h.updates.length, count)
})

test('showcase scrolling and card rendering match the legacy client', () => {
  for (const name of ['utils/showcaseScroller.js', 'components/InvestorPropertyShowcaseSection.jsx']) {
    assert.equal(readFileSync(new URL(`../${name}`, import.meta.url), 'utf8'),
      readFileSync(new URL(`../../apps/client/src/legacy/${name}`, import.meta.url), 'utf8'))
  }
})

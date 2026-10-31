import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const page = readFileSync(new URL('./MobileDiscoverPage.jsx', import.meta.url), 'utf8')
const start = page.indexOf('  // Start the flash on the first upward movement')
const end = page.indexOf('\n\n  useEffect(() => {\n    const stage = stageScrollRef.current', start)
assert.ok(start >= 0 && end > start)
const effect = page.slice(start, end)

function harness(t) {
  const handlers = new Map()
  const moves = []
  const classes = new Set()
  const timers = new Map()
  let timerId = 0
  const activeScreenRef = { current: 'hero' }
  const flashAnimationRef = { current: null }
  const stage = { scrollTop: 0 }
  const shell = {
    addEventListener: (name, handler) => handlers.set(name, handler),
    removeEventListener: (name, handler) => {
      if (handlers.get(name) === handler) handlers.delete(name)
    },
  }
  let cleanup
  new Function('useEffect', 'shellRef', 'stageScrollRef', 'activeScreenRef', 'flashAnimationRef', 'window', 'document', 'goTo', effect)(
    callback => { cleanup = callback() },
    { current: shell },
    { current: stage },
    activeScreenRef,
    flashAnimationRef,
    {
      setTimeout: callback => { timers.set(++timerId, callback); return timerId },
      clearTimeout: id => timers.delete(id),
    },
    { documentElement: { classList: { contains: name => classes.has(name) } } },
    next => moves.push(next),
  )
  t.after(() => cleanup?.())
  const fire = (name, values = {}) => {
    const event = {
      cancelable: true,
      defaultPrevented: false,
      preventDefault() { this.defaultPrevented = true },
      stopPropagation() { this.propagationStopped = true },
      ...values,
    }
    handlers.get(name)?.(event)
    return event
  }
  const touch = (name, x, y) => fire(name, { touches: [{ clientX: x, clientY: y }] })
  const expireWheel = () => {
    const callbacks = [...timers.values()]
    timers.clear()
    callbacks.forEach(callback => callback())
  }
  return { fire, touch, moves, classes, cleanup, handlers, stage, activeScreenRef, flashAnimationRef, expireWheel }
}

test('an upward swipe starts the transition during movement, once per contact', t => {
  const h = harness(t)
  h.touch('touchstart', 150, 600)
  assert.equal(h.touch('touchmove', 151, 580).defaultPrevented, true)
  assert.deepEqual(h.moves, ['stage'])
  h.touch('touchmove', 151, 500)
  h.fire('touchend')
  assert.deepEqual(h.moves, ['stage'])
})

test('taps, downward gestures, and horizontal swipes do not start the transition', t => {
  const h = harness(t)
  for (const [x, y] of [[150, 600], [150, 650], [70, 580]]) {
    h.touch('touchstart', 150, 600)
    assert.equal(h.touch('touchmove', x, y).defaultPrevented, false)
    h.fire('touchend')
  }
  assert.deepEqual(h.moves, [])
})

test('multitouch and open account or navigation drawers do not transition', t => {
  const h = harness(t)
  for (const name of ['login-modal-open', 'site-nav-drawer-open']) {
    h.classes.add(name)
    h.touch('touchstart', 150, 600)
    h.touch('touchmove', 150, 500)
    h.classes.delete(name)
  }
  h.fire('touchstart', { touches: [{ clientX: 100, clientY: 600 }, { clientX: 200, clientY: 600 }] })
  h.touch('touchmove', 100, 500)
  assert.deepEqual(h.moves, [])
})

test('the first vertical trackpad movement starts the transition', t => {
  const h = harness(t)
  const event = h.fire('wheel', { deltaX: 0, deltaY: 8 })
  assert.equal(event.defaultPrevented, true)
  assert.deepEqual(h.moves, ['stage'])
  h.fire('wheel', { deltaX: 40, deltaY: 2 })
  h.fire('wheel', { deltaX: 0, deltaY: -8 })
  assert.deepEqual(h.moves, ['stage'])
})

test('cancelled contact and removed listeners cannot start a later transition', t => {
  const h = harness(t)
  h.touch('touchstart', 150, 600)
  h.fire('touchcancel')
  h.touch('touchmove', 150, 500)
  assert.deepEqual(h.moves, [])
  h.cleanup()
  assert.equal(h.handlers.size, 0)
})


test('tiny boundary drags cannot reveal part of the other screen', t => {
  const h = harness(t)
  h.touch('touchstart', 150, 600)
  assert.equal(h.touch('touchmove', 150, 597).defaultPrevented, true)
  assert.deepEqual(h.moves, [])
})

test('a downward swipe at the top of the next screen opens the hero through the same transition', t => {
  const h = harness(t)
  h.activeScreenRef.current = 'stage'
  h.touch('touchstart', 150, 400)
  assert.equal(h.touch('touchmove', 150, 420).defaultPrevented, true)
  assert.deepEqual(h.moves, ['hero'])
})

test('scrolling back to the top needs a new gesture before changing screens', t => {
  const h = harness(t)
  h.activeScreenRef.current = 'stage'
  h.stage.scrollTop = 80
  h.touch('touchstart', 150, 400)
  assert.equal(h.touch('touchmove', 150, 420).defaultPrevented, false)
  h.stage.scrollTop = 0
  h.touch('touchmove', 150, 450)
  assert.deepEqual(h.moves, [])
  h.fire('touchend')
  h.touch('touchstart', 150, 400)
  h.touch('touchmove', 150, 420)
  assert.deepEqual(h.moves, ['hero'])
})

test('trackpad inertia cannot scroll the newly opened screen', t => {
  const h = harness(t)
  h.fire('wheel', { deltaX: 0, deltaY: 12 })
  h.activeScreenRef.current = 'stage'
  assert.equal(h.fire('wheel', { deltaX: 0, deltaY: 350 }).defaultPrevented, true)
  assert.deepEqual(h.moves, ['stage'])
  h.expireWheel()
  assert.equal(h.fire('wheel', { deltaX: 0, deltaY: 30 }).defaultPrevented, false)
  h.expireWheel()
  assert.equal(h.fire('wheel', { deltaX: 0, deltaY: -12 }).defaultPrevented, true)
  assert.deepEqual(h.moves, ['stage', 'hero'])
})

test('releasing a transitioning swipe cannot click a link on the next screen', t => {
  const h = harness(t)
  h.touch('touchstart', 150, 600)
  h.touch('touchmove', 150, 580)
  h.activeScreenRef.current = 'stage'
  h.fire('touchend')
  const click = h.fire('click')
  assert.equal(click.defaultPrevented, true)
  assert.equal(click.propagationStopped, true)
})

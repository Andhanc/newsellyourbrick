import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('./MobileDiscoverPage.jsx', import.meta.url), 'utf8')
const start = source.indexOf('  const scrollLaunchTo = useCallback(')
const end = source.indexOf('\n\n  useEffect(', start)
const navigateRail = source.slice(start, end)

function setup({ width = 390, scrollWidth = 660, count = 5, reducedMotion = false } = {}) {
  const rail = {
    clientWidth: width, scrollWidth, scrollLeft: 0, style: {},
    querySelectorAll: () => Array.from({ length: count }),
    scrollTo(options) { this.scrollLeft = options.left; this.lastScroll = options },
  }
  const layoutEffects = []
  const flushLayout = () => layoutEffects.forEach(fn => fn())
  const goTo = new Function('useCallback', 'launchSliderRef', 'prefersReducedMotion',
    'useLayoutEffect', 'launchScrollLeftRef', 'setActiveLaunchCard', 'activeLaunchCard',
    `${navigateRail}; return scrollLaunchTo`)(
      fn => fn, { current: rail }, () => reducedMotion,
      fn => layoutEffects.push(fn), { current: null }, flushLayout, 0,
    )
  const scrollHandler = source.match(/onScroll=\{(\(event\) => \{[\s\S]*?)\n              \}\}/)[1] + '\n}'
  const onScroll = new Function('setActiveLaunchCard', 'launchCards', `return ${scrollHandler}`)(
    flushLayout, Array.from({ length: count }),
  )
  return { rail, goTo, onScroll }
}

test('launch dots request native smooth scrolling to both ends of the rail', () => {
  const { rail, goTo } = setup()
  goTo(4)
  assert.deepEqual(rail.lastScroll, { left: 270, behavior: 'smooth' })
  goTo(0)
  assert.deepEqual(rail.lastScroll, { left: 0, behavior: 'smooth' })
})

test('launch dot navigation respects reduced motion and non-overflowing rails', () => {
  const { rail, goTo } = setup({ width: 800, reducedMotion: true })
  goTo(4)
  assert.deepEqual(rail.lastScroll, { left: 0, behavior: 'auto' })
})

test('swiping after dot navigation cannot restore a stale scroll position', () => {
  const { rail, goTo, onScroll } = setup()
  goTo(4)
  // A later wheel or touch scroll owns the position. Pagination must not write
  // the previous dot target back in a layout effect on every index change.
  rail.scrollLeft = 80
  onScroll({ currentTarget: rail })
  assert.equal(rail.scrollLeft, 80)
  assert.equal(rail.style.scrollSnapType, undefined)
})

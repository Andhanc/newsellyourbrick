import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const component = fs.readFileSync(new URL('./CompareMobilePicker.jsx', import.meta.url), 'utf8')
const css = fs.readFileSync(new URL('./CompareMobilePicker.css', import.meta.url), 'utf8')
const page = fs.readFileSync(new URL('../../pages/Compare.jsx', import.meta.url), 'utf8')

test('mobile compare landing shows at most five overlapping object previews', () => {
  assert.match(component, /items\.slice\(0, 5\)/)
  assert.match(component, /compare-picker__stack/)
  assert.match(component, /compare-picker__preview/)
  assert.match(css, /compare-picker--count-2[\s\S]*margin-top: 24px/)
  assert.match(css, /compare-picker--count-2 \.compare-picker__stack[\s\S]*justify-content: center/)
  assert.match(css, /\.compare-picker__title \{[\s\S]*clamp\(3\.35rem, 15\.5vw, 4\.6rem\)\/0\.88/)
  assert.match(component, /compare-picker--count-\$\{Math\.min\(visibleCount, 5\)\}/)
  assert.match(component, /compare-picker__stack[\s\S]*compare-picker__objects-head[\s\S]*compare-picker__cards/)
  assert.match(css, /\.compare-picker__more \{[\s\S]*margin-top: 16px[\s\S]*background: #ffffff[\s\S]*color: #071516/)
})

test('preview cards and primary action open the scrollable drum picker', () => {
  assert.match(component, /className="compare-picker__preview"[\s\S]*onClick=\{onOpen\}/)
  assert.match(component, /className="compare-picker__open" onClick=\{onOpen\}/)
  assert.match(component, /items\.length > 0 && selectedKeys\.length < 2/)
  assert.match(component, /role="dialog"/)
  assert.match(css, /scroll-snap-type: y mandatory/)
  assert.match(css, /--drum-edge-space/)
  assert.match(css, /scroll-snap-stop: always/)
  assert.match(css, /perspective: 900px/)
  assert.match(component, /compare-picker-drum__card--active/)
  assert.match(component, /compare-picker-drum__scroll-cue/)
  assert.match(css, /--cue-size: clamp\(70px, min\(22vw, 10svh\), 92px\)/)
  assert.match(css, /\.compare-picker-drum__scroll-cue svg \{[\s\S]*width: var\(--cue-size\)[\s\S]*height: var\(--cue-size\)/)
  assert.match(component, /setDrumScrolled\(event\.currentTarget\.scrollTop > 18\)/)
  assert.match(component, /\{!drumScrolled \? \(/)
  assert.match(component, /compare-picker-drum__card--departing/)
  assert.match(component, /setMovedKey\(item\.key\)/)
  assert.match(component, /--drum-reorder-y/)
  assert.match(component, /viewport\.style\.scrollSnapType = 'none'/)
  assert.doesNotMatch(component, /behavior: 'smooth'/)
  assert.match(css, /compare-picker-selected-away/)
  assert.doesNotMatch(css, /@keyframes compare-picker-selected-away \{[\s\S]*filter: blur/)
  assert.doesNotMatch(css, /mask-image:/)
})

test('touch scrolling gives one short haptic tick when the active drum card changes', () => {
  assert.match(component, /onTouchStart=\{handleDrumTouchStart\}/)
  assert.match(component, /touchScrollingRef\.current = true/)
  assert.match(component, /nearestIndex !== activeIndexRef\.current/)
  assert.match(component, /touchScrollingRef\.current[\s\S]*triggerSelectionHaptic\(\)/)
})

test('drum selection records first and second choices and starts comparison', () => {
  assert.match(component, /selectedIndex \+ 1/)
  assert.match(component, /onClick=\{\(\) => handleDrumSelect\(item\)\}/)
  assert.match(component, /onToggleSelect\(item\)/)
  assert.match(page, /setSelectedKeys\(\[selectedKeys\[0\], item\.key\]\)[\s\S]*setPickerOpen\(false\)/)
  assert.match(page, /setShowdownStage\('playing'\)/)
})

test('drum footer has a high-contrast two-step selection tracker', () => {
  assert.match(component, /compare-picker-drum__footer-status/)
  assert.match(component, /compare-picker-drum__progress/)
  assert.match(component, /comparePage_hint1Solo/)
  assert.match(css, /\.compare-picker-drum__footer[\s\S]*background: #071314/)
})

test('mobile landing replaces the old picker grid until two objects are selected', () => {
  assert.match(page, /<CompareMobilePicker/)
  assert.match(page, /isMobile && !pair \? ' compare-container--mobile-idle'/)
})

test('compare picker cards show sale type badges instead of generic object label', () => {
  assert.match(component, /formatCompareSaleTypeLabel/)
  assert.match(component, /compare-picker__sale-tag/)
  assert.match(css, /\.compare-picker__sale-tag--standard/)
  assert.match(css, /\.compare-picker__sale-tag--debt/)
  assert.match(css, /\.compare-picker__sale-tag--shares/)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const component = fs.readFileSync(new URL('./CompareShowdown.jsx', import.meta.url), 'utf8')
const css = fs.readFileSync(new URL('./CompareShowdown.css', import.meta.url), 'utf8')

test('cinematic comparison contains only two cards and the VS marker', () => {
  assert.equal((component.match(/<ShowdownCard/g) || []).length, 2)
  assert.match(component, /<span>VS<\/span>/)
  assert.doesNotMatch(component, /compare-showdown__(heading|progress|ambient)/)
})

test('cinematic VS marker uses white text on Tiffany', () => {
  assert.match(css, /\.compare-showdown__versus \{[\s\S]*?background: #4ecdd6;[\s\S]*?color: #ffffff;/)
})

test('cinematic comparison uses a neutral dark backdrop', () => {
  assert.match(css, /\.compare-showdown \{[\s\S]*radial-gradient\([\s\S]*#050506/)
  assert.doesNotMatch(css, /background: #062f33/)
  assert.doesNotMatch(css, /background: #164f54/)
})

test('cinematic comparison adds camera, impact, and image-arrival motion', () => {
  assert.match(css, /compare-showdown-camera/)
  assert.match(css, /compare-showdown-scene-impact/)
  assert.match(css, /compare-showdown-image-arrive/)
  assert.match(css, /compare-showdown-camera 0\.72s/)
  assert.doesNotMatch(css, /@keyframes compare-showdown-camera \{[\s\S]*filter: blur/)
})

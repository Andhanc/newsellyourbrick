import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readOrEmpty(url) {
  try {
    return await readFile(url, 'utf8')
  } catch {
    return ''
  }
}

const css = await readOrEmpty(new URL('./buyer-mobile-tokens.css', import.meta.url))
const appSource = await readFile(new URL('../App.jsx', import.meta.url), 'utf8')

test('buyer mobile tokens expose the approved commercial design system', () => {
  assert.match(css, /--buyer-ink:\s*#050505/i)
  assert.match(css, /--buyer-teal:\s*#4ecdd6/i)
  assert.match(css, /--buyer-teal-deep:\s*#3bc0cb/i)
  assert.match(css, /--buyer-mint:\s*#dff6f8/i)
  assert.match(css, /--buyer-warm:\s*#f7faf9/i)
  assert.match(css, /--buyer-cloud:\s*#eef6f7/i)
  assert.match(css, /--buyer-auction:\s*#f4d63e/i)
  assert.match(css, /--buyer-font-display:\s*['"]Montserrat/i)
  assert.match(css, /--buyer-font-body:\s*['"]Montserrat/i)
  assert.match(css, /--buyer-touch:\s*44px/i)
})

test('buyer mobile utilities protect touch targets and device safe areas', () => {
  assert.match(css, /\.buyer-touch-target[\s\S]*min-height:\s*var\(--buyer-touch\)/i)
  assert.match(css, /\.buyer-safe-bottom[\s\S]*env\(safe-area-inset-bottom/i)
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/i)
  assert.match(css, /@media\s*\(min-width:\s*768px\)[\s\S]*\.buyer-mobile-only/i)
})

test('the application imports buyer mobile tokens globally', () => {
  assert.match(appSource, /import ['"]\.\/styles\/buyer-mobile-tokens\.css['"]/)
})

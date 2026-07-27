import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const css = await readFile(new URL('./PropertyAiExperience.css', import.meta.url), 'utf8')
const pdfRenderer = await readFile(
  new URL('../../server/services/propertyAiPdfRenderer.js', import.meta.url),
  'utf8',
)

test('keeps the chat Tiffany while the PDF uses the warm editorial palette', () => {
  assert.doesNotMatch(css, /#ffe000/i)
  assert.doesNotMatch(pdfRenderer, /#ffe000/i)
  assert.match(css, /--property-ai-accent:\s*#0099a9/i)
  assert.match(css, /--property-ai-accent-soft:\s*rgba\(0,\s*153,\s*169,\s*0\.18\)/i)
  assert.match(pdfRenderer, /--report-clay:#a45d3b/i)
  assert.match(pdfRenderer, /--report-paper:#fbfaf8/i)
})

test('uses white content on solid accent surfaces', () => {
  const solidSurfaceSelectors = [
    'property-ai-picker__thumbs span',
    'property-ai-user-message',
    'property-ai-progress__orb',
    'property-ai-pdf-card__icon',
    'property-ai-pdf-card__actions button:last-child',
  ]

  for (const selector of solidSurfaceSelectors) {
    const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    assert.match(
      css,
      new RegExp(`\\.${escapedSelector}\\s*\\{[^}]*color:\\s*#fff`, 's'),
      `${selector} should use white content`,
    )
  }

  assert.match(css, /\.property-ai-pdf-spinner\s*\{[^}]*border:\s*3px solid rgba\(255,\s*255,\s*255,[^}]*border-top-color:\s*#fff/s)
  assert.match(pdfRenderer, /\.risk\{background:var\(--report-clay\);color:#fff\}/)
  assert.match(pdfRenderer, /\.editorial>div:first-child\{[^}]*background:var\(--report-clay\);color:#fff/)
})

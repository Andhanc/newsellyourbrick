import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const css = await readFile(new URL('./PropertyAiExperience.css', import.meta.url), 'utf8')
const pdfRenderer = await readFile(
  new URL('../../../../../server/services/propertyAiPdfRenderer.js', import.meta.url),
  'utf8',
)

test('keeps the chat and premium PDF aligned with the Tiffany brand', () => {
  assert.doesNotMatch(css, /#ffe000/i)
  assert.doesNotMatch(pdfRenderer, /#ffe000/i)
  assert.match(css, /--property-ai-accent:\s*#4ecdd6/i)
  assert.match(css, /--property-ai-accent-deep:\s*#3bc0cb/i)
  assert.match(css, /--property-ai-accent-soft:\s*rgba\(78,\s*205,\s*214,\s*0\.18\)/i)
  assert.match(css, /\.property-ai-launcher\s*\{[^}]*background:\s*#000/)
  assert.match(css, /\.property-ai-picker\s*\{[^}]*background:\s*#000/)
  assert.match(css, /\.property-ai-picker__action-icon/)
  assert.match(css, /\.property-ai-picker__action-arrow/)
  assert.doesNotMatch(css, /\.property-ai-picker\s*\{[^}]*#8ae8ef/)
  assert.doesNotMatch(css, /\.property-ai-launcher\s*\{[^}]*background:\s*var\(--property-ai-accent\)/)
  assert.doesNotMatch(css, /\.property-ai-launcher\s*\{[^}]*#4a96a6/)
  assert.match(pdfRenderer, /--report-tiffany:#4ecdd6/i)
  assert.match(pdfRenderer, /--report-tiffany-dark:#3bc0cb/i)
  assert.match(pdfRenderer, /--report-tiffany-soft:#effbfc/i)
  assert.match(pdfRenderer, /--report-ink:#0f172a/i)
  assert.match(pdfRenderer, /--report-paper:#ffffff/i)
})

test('uses white content on solid accent surfaces', () => {
  const solidSurfaceSelectors = [
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
  assert.match(pdfRenderer, /\.risk\{background:var\(--report-ink\);color:#fff\}/)
  assert.match(pdfRenderer, /\.details-checklist\{[^}]*background:linear-gradient[^}]*color:#fff/)
})

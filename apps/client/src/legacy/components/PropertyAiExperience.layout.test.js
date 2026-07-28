import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const css = await readFile(new URL('./PropertyAiExperience.css', import.meta.url), 'utf8')
const jsx = await readFile(new URL('./PropertyAiExperience.jsx', import.meta.url), 'utf8')
const propertyDetail = await readFile(new URL('../pages/PropertyDetailClassic.jsx', import.meta.url), 'utf8')

test('keeps the launcher fixed until the global footer observer marks the footer near', () => {
  assert.match(css, /\.property-ai-launcher\s*\{[^}]*position:\s*fixed/)
  assert.match(css, /html\.site-footer-near\s+\.property-ai-launcher/)
})

test('collapses the launcher after entry and makes the first collapsed click expand it', () => {
  assert.match(jsx, /const \[launcherExpanded, setLauncherExpanded\] = useState\(true\)/)
  assert.match(jsx, /deferLauncherCollapse/)
  assert.match(jsx, /setLauncherExpanded\(false\)/)
  assert.match(jsx, /if \(!launcherExpanded\) \{\s*setLauncherExpanded\(true\)\s*return\s*\}/)
  assert.match(jsx, /property-ai-launcher--collapsed/)
  assert.match(css, /\.property-ai-launcher\.property-ai-launcher--collapsed\s*\{[^}]*width:\s*62px/)
  assert.match(css, /\.property-ai-launcher__label/)
})

test('smoothly moves the collapsing launcher to the right edge', () => {
  assert.match(css, /\.property-ai-launcher\s*\{[^}]*width:\s*360px/)
  assert.match(css, /transition:[^}]*left\s+\.72s/s)
  assert.match(css, /\.property-ai-launcher\.property-ai-launcher--collapsed\s*\{[^}]*left:\s*calc\(100% - 47px\)/)
  assert.doesNotMatch(css, /\.property-ai-launcher\s*\{[^}]*width:\s*min\(/)
})

test('defers the entry collapse while the initial property drawer is open', () => {
  assert.match(propertyDetail, /<PropertyAiExperience[\s\S]*?deferLauncherCollapse=\{isTestDrivePromoOpen && shouldShowTestDrivePromo\}/)
})

test('keeps the launcher above the taller mobile share purchase bar', () => {
  assert.match(css, /@media \(max-width: 960px\)[\s\S]*?\.property-detail-page-new--auction-mobile-v2\.property-detail-page-new--share-listing \.property-ai-launcher\s*\{[\s\S]*?bottom:\s*calc\(146px \+ env\(safe-area-inset-bottom\)\)/)
})

test('renders chat inside a right-side drawer layer', () => {
  assert.match(jsx, /property-ai-drawer-layer/)
  assert.match(css, /\.property-ai-chat\s*\{[^}]*right:\s*0/)
  assert.match(css, /width:\s*min\(520px,\s*94vw\)/)
})

test('includes compact rules for short laptop and tablet viewports', () => {
  assert.match(css, /@media\s*\(max-height:\s*800px\)/)
  assert.match(css, /@media\s*\(min-width:\s*701px\) and \(max-width:\s*1100px\)/)
})

test('reveals answer lines progressively and keeps a pending PDF card visible', () => {
  assert.match(jsx, /revealedLineCount/)
  assert.match(jsx, /property-ai-answer-line/)
  assert.match(jsx, /property-ai-pdf-card--pending/)
  assert.match(css, /@keyframes property-ai-line-in/)
})

test('renders a direct answer with structured strengths and risks', () => {
  assert.match(jsx, /job\?\.report\?\.directAnswer/)
  assert.match(jsx, /property-ai-answer-summary/)
  assert.match(jsx, /Плюсы/)
  assert.match(jsx, /Риски/)
  assert.match(jsx, /job\?\.report\?\.strengths/)
  assert.match(jsx, /job\?\.report\?\.risks/)
})

test('describes the PDF as a compact six-to-seven-page report', () => {
  assert.match(jsx, /PDF · 6–7 страниц/)
})

test('gives the Trans component replacement element a stable React key', () => {
  assert.match(propertyDetail, /key="property-detail-terms-link"/)
})

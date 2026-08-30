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
  assert.match(jsx, /launcherMorphing/)
  assert.match(jsx, /deferLauncherCollapse/)
  assert.match(jsx, /collapseLauncherWithMorph/)
  assert.match(jsx, /expandLauncherWithMorph/)
  assert.match(jsx, /if \(launcherMorphing\) return/)
  assert.match(jsx, /if \(!launcherExpanded\) \{\s*expandLauncherWithMorph\(\)\s*return\s*\}/)
  assert.match(jsx, /property-ai-launcher--collapsed/)
  assert.match(css, /\.property-ai-launcher\.property-ai-launcher--collapsed\s*\{[^}]*width:\s*62px/)
  assert.match(css, /\.property-ai-launcher__label/)
})

test('morphs launcher with CSS transitions on a stable right anchor', () => {
  assert.match(css, /\.property-ai-launcher\s*\{[^}]*right:\s*var\(--launcher-inset-right\)/)
  assert.match(css, /transform:\s*translate3d\(calc\(50% - 50vw \+ var\(--launcher-inset-right\)\)/)
  assert.match(css, /\.property-ai-launcher\.property-ai-launcher--collapsed\s*\{[^}]*transform:\s*translate3d\(0,\s*0,\s*0\)/)
  assert.match(css, /--launcher-morph-duration:\s*2s/)
  assert.match(jsx, /Геометрию ведёт CSS transition/)
  assert.doesNotMatch(jsx, /commitStyles/)
  assert.doesNotMatch(css, /\.property-ai-launcher\s*\{[^}]*width:\s*min\(/)
})

test('spins the spark once while the launcher morphs into a circle', () => {
  assert.match(jsx, /LAUNCHER_MORPH_MS\s*=\s*2000/)
  assert.match(jsx, /collapseLauncherWithMorph/)
  assert.match(jsx, /rotate\(360deg\)|rotate\(\$\{sparkRotationDeg\}deg\)/)
  assert.match(jsx, /sparkRef/)
  assert.match(css, /\.property-ai-launcher--collapsed \.property-ai-launcher__label\s*\{[^}]*max-width:\s*0/)
})

test('collapses the launcher again after the AI modal closes', () => {
  assert.match(jsx, /prevViewRef/)
  assert.match(jsx, /После закрытия модалки плашка снова сворачивается в кружок/)
  assert.match(jsx, /collapseLauncherWithMorph/)
})

test('keeps the spark on the left edge and centers the launcher label', () => {
  assert.match(css, /\.property-ai-launcher\s*\{[^}]*justify-content:\s*center/)
  assert.match(css, /\.property-ai-spark\s*\{[^}]*position:\s*absolute/)
  assert.match(css, /\.property-ai-spark\s*\{[^}]*left:\s*var\(--launcher-spark-inset\)/)
  assert.match(css, /--launcher-spark-inset:\s*17px/)
  assert.match(css, /\.property-ai-launcher__label\s*\{[^}]*text-align:\s*center/)
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

test('describes the PDF as a compact seven-to-eight-page report', () => {
  assert.match(jsx, /PDF · 7–8 страниц/)
})

test('shows a backend generation failure instead of leaving the chat blank', () => {
  assert.match(jsx, /next\.status === 'failed'/)
  assert.match(jsx, /setError\(next\.error/)
  assert.match(jsx, /const visibleError = error \|\|/)
  assert.match(jsx, /role="alert"/)
  assert.match(jsx, /job\?\.shortAnswer \|\| job\?\.status === 'failed'/)
})

test('normalizes property photos for the picker and chat card', () => {
  assert.match(jsx, /normalizePropertyMediaFields/)
  assert.match(jsx, /applyPropertyImageFallback/)
})

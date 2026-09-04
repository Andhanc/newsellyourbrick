import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const page = await readFile(new URL('./Compare.jsx', import.meta.url), 'utf8')
const styles = await readFile(new URL('./Compare.css', import.meta.url), 'utf8')

test('comparison auto-starts AI for every selected pair without a subscription gate', () => {
  assert.match(page, /const requestAiAnalysis = useCallback/)
  assert.match(page, /onClick=\{requestAiAnalysis\}/)
  assert.match(page, /setShowdownAnalysisStartedKey\(pairKey\)[\s\S]*void requestAiAnalysis\(\)/)
  assert.doesNotMatch(page, /hasCalculatorAccess/)
  assert.doesNotMatch(page, /CompareInvestorProDrawer/)
})

test('AI responses are aborted and request-id guarded when the pair changes or the page unmounts', () => {
  assert.match(page, /createCompareAiRequestGuard/)
  assert.match(page, /aiRequestGuardRef\.current\.start\(\)/)
  assert.match(page, /aiRequestGuardRef\.current\.isCurrent\(requestId\)/)
  assert.match(page, /aiRequestGuardRef\.current\.cancel\(\)/)
  assert.match(page, /return \(\) => aiRequestGuardRef\.current\.cancel\(\)/)
})

test('AI pending and error states are accessible', () => {
  assert.match(page, /role="status"/)
  assert.match(page, /aria-live="polite"/)
  assert.match(page, /role="alert"/)
  assert.doesNotMatch(page, /compare-ai-entitlement-help/)
})

test('AI recommendation uses a shared scorecard and evidence-card layout at every breakpoint', () => {
  assert.match(page, /compare-ai-scoreboard/)
  assert.match(page, /compare-ai-score-card/)
  assert.match(page, /compare-ai-evidence-grid/)
  assert.doesNotMatch(page, /compare-ai-summary-icon/)
  assert.doesNotMatch(page, /FiCheckCircle/)
  assert.match(styles, /same light comparison-card system/)
  assert.match(styles, /--ai-score-share/)
})

test('comparison table and mobile cards use the shared truthful price resolver', () => {
  assert.match(page, /resolvePositivePropertyPrice/)
  assert.match(page, /isAuctionListing/)
  assert.match(page, /function shouldRenderAuctionRows/)
  assert.match(page, /shouldRenderAuctionRows\(left, right\)/)
  assert.doesNotMatch(page, /function isAuctionProperty/)
  assert.doesNotMatch(page, /function effectivePrice/)
})

test('comfort comparison distinguishes missing source data from a known zero score', () => {
  assert.match(page, /function hasComfortData/)
  assert.match(page, /comfortKnownL \? `\$\{cL\} \/ \$\{comfortMax\}` : t\('comparePage_noData'\)/)
  assert.match(page, /comfortKnownL && comfortKnownR \? compareMetric\(cL, cR, 'higher'\) : null/)
})

test('calculator navigation persists only the explicitly selected comparison object', () => {
  assert.match(page, /selectComparisonItem\(pair, side\)/)
  assert.match(page, /selectedKey:\s*selected\.key/)
  assert.match(page, /calculatorFromProperty:\s*selected\.property/)
  assert.match(page, /calculatorSelectedKey:\s*selected\.key/)
  assert.doesNotMatch(page, /calculatorFromProperty:\s*pair\.left\.property/)
})

test('desktop investor handoff also requires an explicit left or right choice', () => {
  assert.match(page, /onClick=\{\(\) => openInvestorPanel\('left'\)\}/)
  assert.match(page, /onClick=\{\(\) => openInvestorPanel\('right'\)\}/)
})

test('market estimate starts automatically once for each selected pair', () => {
  assert.match(page, /compareCalculatorStartedKeyRef = useRef/)
  assert.match(page, /compareCalculatorStartedKeyRef\.current === pairKey/)
  assert.match(page, /compareCalculatorStartedKeyRef\.current = pairKey[\s\S]*void runCompareCalculator\(\)/)
  assert.doesNotMatch(page, /onClick=\{runCompareCalculator\}/)
})

test('market estimate infers city and country and shows a truthful listing-price fallback', () => {
  assert.match(page, /locationParts\.length >= 3 \? locationParts\[1\]/)
  assert.match(page, /locationParts\.length >= 3 \? locationParts\[0\]/)
  assert.match(page, /withListingPriceFallback/)
  assert.match(page, /comparePage_marketFallbackSource/)
  assert.match(page, /comparePage_marketFallbackNote/)
  assert.match(page, /method: 'listing_price_fallback'/)
})

test('completed comparison pair and AI/system results persist across navigation', () => {
  assert.match(page, /readCompareSnapshot/)
  assert.match(page, /writeCompareSnapshot/)
  assert.match(page, /clearCompareSnapshot/)
  assert.match(page, /discardCompareSnapshot/)
  assert.match(page, /comparePage_pickOtherPair/)
})

test('after the first pick the list keeps only the same sale type, treating auction and buy now as one', () => {
  assert.match(page, /filterComparePickerItems\(favoriteAuctions, selectedKeys, groupFilter\)/)
  assert.match(page, /items=\{pickerItems\}/)
  assert.match(page, /comparePage_hint1Solo/)
  assert.match(page, /comparePage_saleStandard/)
})

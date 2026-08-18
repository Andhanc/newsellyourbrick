import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const page = await readFile(new URL('./Compare.jsx', import.meta.url), 'utf8')
const results = await readFile(new URL('../components/compare/CompareInvestorResults.jsx', import.meta.url), 'utf8')

test('AI comparison is opened only from a named click handler', () => {
  assert.match(page, /const requestAiAnalysis = useCallback/)
  assert.match(page, /onRunAi=\{requestAiAnalysis\}/)
  assert.match(results, /onClick=\{onRunAi\}/)
  assert.doesNotMatch(page, /useEffect\([\s\S]{0,700}askPropertyCompareAssistant/)
})

test('AI responses are aborted and request-id guarded when the pair changes or the page unmounts', () => {
  assert.match(page, /createCompareAiRequestGuard/)
  assert.match(page, /aiRequestGuardRef\.current\.start\(\)/)
  assert.match(page, /aiRequestGuardRef\.current\.isCurrent\(requestId\)/)
  assert.match(page, /aiRequestGuardRef\.current\.cancel\(\)/)
  assert.match(page, /return \(\) => \{[\s\S]*aiRequestGuardRef\.current\.cancel\(\)/)
})

test('AI pending and error states are accessible', () => {
  assert.match(results, /role="status"/)
  assert.match(results, /aria-live="polite"/)
  assert.match(results, /role="alert"/)
})

test('property comparison uses point-by-point rows and AI inside the smart panel', () => {
  assert.match(page, /CompareInvestorResults/)
  assert.match(page, /function buildRows/)
  assert.match(page, /askPropertyCompareAssistant/)
  assert.match(page, /rows=\{tableRows\}/)
  assert.match(results, /METRIC_GROUP_DEFS/)
  assert.match(results, /comparePage_groupPrice/)
  assert.match(results, /comparePage_aiGet/)
  assert.doesNotMatch(page, /requestInvestorAiAnalysis/)
  assert.doesNotMatch(page, /CompareInvestorProDrawer/)
  assert.doesNotMatch(page, /<table/)
  assert.doesNotMatch(results, /smartInvestor_dealScore/)
  assert.doesNotMatch(results, /<table/)
})

test('comparison rows use the shared truthful price resolver', () => {
  assert.match(page, /resolvePositivePropertyPrice/)
  assert.match(page, /isAuctionListing/)
  assert.match(page, /function shouldRenderAuctionRows/)
  assert.match(page, /shouldRenderAuctionRows\(left, right\)/)
})

test('comfort comparison distinguishes missing source data from a known zero score', () => {
  assert.match(page, /function hasComfortData/)
  assert.match(page, /comfortKnownL \? `\$\{cL\} \/ \$\{comfortMax\}` : t\('comparePage_noData'\)/)
  assert.match(page, /comfortKnownL && comfortKnownR \? compareMetric\(cL, cR, 'higher'\) : null/)
})

test('compare pick grid reuses auction favorite cards and glass timer chrome', () => {
  assert.match(page, /FavoritePropertyCard/)
  assert.match(page, /discover-auction-cards hr-showcases hr-showcases--auction-listing/)
  assert.match(page, /properties-grid--auction-cards auction-mobile-stack--desktop-cards/)
  assert.doesNotMatch(page, /PropertyListingCard/)
  assert.doesNotMatch(page, /formatPropertyForListingCard/)
})

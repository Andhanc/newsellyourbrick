import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('./PropertyDetailClassic.jsx', import.meta.url), 'utf8')

test('integrates the debt insight into desktop and mobile auction layouts', () => {
  assert.match(source, /import DebtAuctionInsight from '..\/components\/DebtAuctionInsight'/)
  assert.match(source, /import PropertyDebtRiskBanner from '..\/components\/PropertyDebtRiskBanner'/)
  assert.match(source, /renderDesktopAuctionDebtRisk[\s\S]*?<DebtAuctionInsight/)
  assert.match(source, /onRequireLogin=\{onRequireLogin\}/)
  assert.match(source, /const isAuctionLayout = isAuctionProperty \|\| isShareListing \|\| isDebtProperty/)
  assert.match(source, /isAuction=\{isAuctionProperty\}/)
  assert.match(source, /type === 'commercial'\) return t\('propertyTypeCommercial'\)/)
  assert.match(source, /const isAuctionProperty =\s*isDebtProperty \|\|/)
  assert.match(source, /displayProperty\?\.auction_starting_price \|\| displayProperty\?\.price \|\| 0/)
  assert.equal(source.match(/<DebtAuctionInsight/g)?.length, 1)
  assert.equal(source.match(/<PropertyDebtRiskBanner/g)?.length, 1)
  assert.doesNotMatch(source, /property-detail-mobile-badge--debt/)
})

test('removes the old duplicated debt FlipCard presentation', () => {
  assert.doesNotMatch(source, /import FlipCard from '..\/components\/ui\/FlipCard'/)
  assert.doesNotMatch(source, /property-detail-debt-risk-card/)
})

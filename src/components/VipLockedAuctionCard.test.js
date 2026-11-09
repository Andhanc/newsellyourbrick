import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('VIP catalogue UI and translations remain identical in web and legacy', async () => {
  const paths = [
    'components/AuctionPropertyCard.jsx', 'components/ui/AuctionMobileLayout.jsx',
    'components/VipLockedAuctionCard.jsx', 'components/VipLockedAuctionCard.css',
    'services/auctionListCache.js', 'pages/Home.jsx',
    'components/InvestorPropertyShowcaseSection.jsx', 'hooks/useInvestorHomeShowcases.js',
    ...['ru', 'en', 'de', 'es', 'fr', 'pl', 'sv'].map((lang) => `i18n/locales/mainPage/${lang}.json`),
  ]
  for (const path of paths) {
    const web = await readFile(new URL(`../${path}`, import.meta.url), 'utf8')
    const legacy = await readFile(new URL(`../../apps/client/src/legacy/${path}`, import.meta.url), 'utf8')
    assert.equal(web, legacy, path)
  }
})

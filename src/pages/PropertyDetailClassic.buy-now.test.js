import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const mainPageUrl = new URL('./PropertyDetailClassic.jsx', import.meta.url)
const legacyPageUrl = new URL(
  '../../apps/client/src/legacy/pages/PropertyDetailClassic.jsx',
  import.meta.url,
)
const mainPage = await readFile(mainPageUrl, 'utf8')
const legacyPage = await readFile(legacyPageUrl, 'utf8')
const mainStyles = await readFile(new URL('./PropertyDetailClassic.css', import.meta.url), 'utf8')

const localeCodes = ['ru', 'en', 'de', 'es', 'fr', 'pl', 'sv']
const newLocaleKeys = [
  'propertyDetailBuyNowDefinition',
  'propertyDetailBuyNowPaymentTitle',
  'propertyDetailBuyNowPayNowLabel',
  'propertyDetailBuyNowPayNowHint',
  'propertyDetailBuyNowPayLaterLabel',
  'propertyDetailBuyNowPayLaterHint',
  'propertyDetailBuyNowSupportNote',
  'propertyDetailBuyNowReserveCta',
  'propertyDetailBuyNowTodayLabel',
  'propertyDetailBuyNowDocumentsStage',
  'propertyDetailBuyNowReserveForCta',
  'propertyDetailBuyNowServicesAria',
  'propertyDetailBuyNowServiceYield',
  'propertyDetailBuyNowServiceCompare',
  'propertyDetailBuyNowServiceFavorites',
  'propertyDetailBuyNowServiceAi',
  'propertyDetailBuyNowCardsTitle',
  'propertyDetailBuyNowInstructionTitle',
  'propertyDetailBuyNowInstructionStep1',
  'propertyDetailBuyNowInstructionStep2',
  'propertyDetailBuyNowInstructionStep3',
  'propertyDetailBuyNowPaymentCardTitle',
  'propertyDetailBuyNowManagerCardTitle',
  'propertyDetailBuyNowManagerQuestions',
  'propertyDetailBuyNowManagerDocuments',
  'propertyDetailBuyNowManagerNextSteps',
]

test('mobile Buy now explains the fixed-price payment split', () => {
  assert.match(mainPage, /const buyNowReserveAmount = auctionBuyNowPrice \* 0\.1/)
  assert.match(mainPage, /property-detail-mobile-buy-now__price-panel/)
  assert.match(mainPage, /property-detail-mobile-buy-now__services/)
  assert.match(mainPage, /property-detail-mobile-buy-now__guide-card--steps/)
  assert.match(mainPage, /propertyDetailBuyNowTodayLabel/)
  assert.match(mainPage, /propertyDetailBuyNowReserveForCta/)
  assert.match(mainPage, /onClick=\{handleBookNow\}/)
  assert.match(mainPage, /openInvestorPanelForProperty\(\)/)
  assert.match(mainPage, /navigate\('\/compare'\)/)
  assert.match(mainPage, /navigate\('\/favorites'\)/)
  assert.match(mainPage, /navigate\('\/chat\?assistant=1'\)/)
  assert.match(mainPage, /isAuctionProperty && auctionMobileTab !== 'buy_now'/)
  assert.match(
    mainStyles,
    /property-detail-mobile-tab-buy_now[\s\S]*?\.property-ai-launcher\s*\{[\s\S]*?display:\s*none/,
  )
})

test('web and legacy Buy now implementations stay identical', () => {
  assert.equal(legacyPage, mainPage)
})

test('Buy now explanation is translated in every supported locale and mirror', async () => {
  for (const locale of localeCodes) {
    const mainLocale = JSON.parse(
      await readFile(new URL(`../i18n/locales/mainPage/${locale}.json`, import.meta.url), 'utf8'),
    )
    const legacyLocale = JSON.parse(
      await readFile(
        new URL(`../../apps/client/src/legacy/i18n/locales/mainPage/${locale}.json`, import.meta.url),
        'utf8',
      ),
    )

    for (const key of newLocaleKeys) {
      assert.equal(typeof mainLocale[key], 'string', `${locale} is missing ${key}`)
      assert.ok(mainLocale[key].trim(), `${locale} has an empty ${key}`)
      assert.equal(legacyLocale[key], mainLocale[key], `${locale} mirror differs for ${key}`)
    }
  }
})

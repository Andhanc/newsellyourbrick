import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { COMPASS_QUESTIONS } from '../utils/investmentCompass.js'

const page = await readFile(new URL('./InvestmentCompassPage.jsx', import.meta.url), 'utf8')
const css = await readFile(new URL('./InvestmentCompassPage.css', import.meta.url), 'utf8')
const app = await readFile(new URL('../App.jsx', import.meta.url), 'utf8')
const legacyApp = await readFile(new URL('../../apps/client/src/legacy/App.jsx', import.meta.url), 'utf8')
const discover = await readFile(new URL('./MobileDiscoverPage.jsx', import.meta.url), 'utf8')
const legacyDiscover = await readFile(
  new URL('../../apps/client/src/legacy/pages/MobileDiscoverPage.jsx', import.meta.url),
  'utf8',
)
const locales = ['ru', 'en', 'de', 'es', 'fr', 'pl', 'sv']

test('compass page plays the intro, auction confetti and strategy instructions', () => {
  assert.match(page, /consumeCompassIntroPending/)
  assert.match(page, /className="compass-intro"/)
  assert.match(page, /from 'react-confetti'/)
  assert.match(page, /COMPASS_CONFETTI_COLORS/)
  assert.match(page, /numberOfPieces=\{500\}/)
  assert.match(page, /gravity=\{0\.1\}/)
  assert.match(page, /winner-celebration-confetti/)
  assert.match(page, /sectionInfo_\$\{infoSection\}Step1/)
  assert.match(page, /compass_cta_\$\{strategy\}/)
  assert.match(css, /z-index: 10006/)
  assert.match(app, /path="\/compass"/)
  assert.match(app, /InvestmentCompassPage/)
  assert.match(app, /pathname === '\/compass'/)
  assert.match(legacyApp, /path="\/compass"/)
  assert.match(legacyApp, /InvestmentCompassPage/)
  assert.match(discover, /InvestmentCompassDrawer/)
  assert.match(discover, /md-stage__compass/)
  assert.match(discover, /InvestmentCompassPromoModal/)
  assert.match(discover, /COMPASS_PROMPT_DELAY_MS/)
  assert.equal(discover, legacyDiscover)
})

test('compass copy exists in every locale and legacy mirror', async () => {
  const required = [
    'compass_drawerEyebrow',
    'compass_drawerTitle',
    'compass_drawerCta',
    'compass_stageCta',
    'compass_stageCtaTitle',
    'compass_stageCtaLead',
    'compass_stageDismiss',
    'compass_resultTitle',
    'compass_resultHow',
    'compass_introLabel',
    ...COMPASS_QUESTIONS.flatMap((question) => [
      `compass_q_${question.id}`,
      ...question.options.map((option) => `compass_q_${question.id}_${option}`),
    ]),
    'compass_profile_auction',
    'compass_profile_buyNow',
    'compass_profile_debts',
    'compass_profile_shares',
    'compass_cta_auction',
    'compass_cta_buyNow',
    'compass_cta_debts',
    'compass_cta_shares',
  ]

  for (const locale of locales) {
    const main = JSON.parse(
      await readFile(new URL(`../i18n/locales/mainPage/${locale}.json`, import.meta.url), 'utf8'),
    )
    const legacy = JSON.parse(
      await readFile(
        new URL(`../../apps/client/src/legacy/i18n/locales/mainPage/${locale}.json`, import.meta.url),
        'utf8',
      ),
    )
    for (const key of required) {
      assert.equal(typeof main[key], 'string', `${locale} missing ${key}`)
      assert.equal(legacy[key], main[key], `${locale} mirror differs for ${key}`)
    }
  }
})

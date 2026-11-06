import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const LANGUAGES = ['en', 'ru', 'de', 'es', 'fr', 'pl', 'sv']
const PLAN_KEYS = {
  basic: 'ownerTest_planBasic',
  standard: 'ownerTest_planStandard',
  pro: 'ownerTest_planPro',
  institutional: 'ownerTest_planVip',
  vip: 'ownerTest_planVip',
}

const EXPECTED_STANDARD = {
  en: 'Standard',
  ru: 'Стандарт',
  de: 'Standard',
  es: 'Standard',
  fr: 'Standard',
  pl: 'Standard',
  sv: 'Standard',
}

const EXPECTED_ROLE = {
  en: 'Seller',
  ru: 'Продавец',
  de: 'Seller',
  es: 'Seller',
  fr: 'Seller',
  pl: 'Seller',
  sv: 'Seller',
}

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('seller subscription label is derived from the plan id for the active language', async () => {
  const profile = await read('utils/ownerTestProfile.js')
  const context = await read('context/OwnerTestProfileContext.jsx')
  const page = await read('pages/OwnerProfileTestPage.jsx')

  assert.match(profile, /subscriptionPlanId: 'standard'/)
  assert.match(profile, /subscriptionPlanId: resolveOwnerSubscriptionPlanId/)
  assert.doesNotMatch(profile, /getOwnerSubscriptionPlanLabel/)

  assert.match(context, /useTranslation\(\)/)
  assert.match(context, /\[profile, i18n\.language\]/)
  assert.match(context, /subscription: getOwnerSubscriptionPlanLabel\(planId\)/)
  assert.match(context, /roleLabel: t\('ownerTest_roleSeller'\)/)

  assert.match(page, /profile\?\.subscriptionPlanId \|\| resolveProfileSubscriptionPlanId/)
  assert.match(page, /\[nextSubscriptionPlanId, i18n\.language\]/)
})

test('seller subscription localization stays identical in web and legacy copies', async () => {
  for (const path of [
    'utils/ownerTestProfile.js',
    'context/OwnerTestProfileContext.jsx',
    'pages/OwnerProfileTestPage.jsx',
    'pages/OwnerSubscriptionsTestPage.jsx',
  ]) {
    const web = await read(path)
    const legacy = await readFile(new URL(`../../apps/client/src/legacy/${path}`, import.meta.url), 'utf8')
    assert.equal(web, legacy, path)
  }
})

test('subscription badge and seller role are present in every app language', async () => {
  const seen = []

  for (const lng of LANGUAGES) {
    const web = JSON.parse(await read(`i18n/locales/mainPage/${lng}.json`))
    const legacy = JSON.parse(
      await readFile(new URL(`../../apps/client/src/legacy/i18n/locales/mainPage/${lng}.json`, import.meta.url), 'utf8'),
    )

    for (const key of [...Object.values(PLAN_KEYS), 'ownerTest_roleSeller', 'ownerTest_planInstitutional']) {
      assert.equal(typeof web[key], 'string', `${lng} ${key}`)
      assert.ok(web[key].trim(), `${lng} ${key} empty`)
      assert.equal(web[key], legacy[key], `${lng} ${key}`)
    }

    assert.equal(web.ownerTest_planStandard, EXPECTED_STANDARD[lng], lng)
    assert.equal(web.ownerTest_roleSeller, EXPECTED_ROLE[lng], lng)
    seen.push(`${lng}:${web.ownerTest_planStandard}`)
  }

  assert.deepEqual(seen, [
    'en:Standard',
    'ru:Стандарт',
    'de:Standard',
    'es:Standard',
    'fr:Standard',
    'pl:Standard',
    'sv:Standard',
  ])
  assert.notEqual(EXPECTED_STANDARD.ru, EXPECTED_STANDARD.en)
})

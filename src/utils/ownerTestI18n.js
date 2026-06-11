import i18n from '../i18n/config'
import { getIdentificationLabelByCountry } from './profileIdentification'

const LOCALE_MAP = {
  ru: 'ru-RU',
  en: 'en-US',
  de: 'de-DE',
  es: 'es-ES',
  fr: 'fr-FR',
  sv: 'sv-SE',
}

/** BCP-47 locale tag for Intl formatters in owner cabinet. */
export function getOwnerTestIntlLocale(lang = i18n.language) {
  const code = String(lang || 'en').split('-')[0].toLowerCase()
  return LOCALE_MAP[code] || LOCALE_MAP.en
}

export function ownerTestT(key, options) {
  return i18n.t(key, options)
}

export const OWNER_PROFILE_FIELD_I18N_KEYS = {
  firstName: 'ownerProfileFirstName',
  lastName: 'ownerProfileLastName',
  country: 'ownerProfileCountry',
  phone: 'ownerTest_profileFieldPhone',
  email: 'ownerProfileEmail',
  address: 'ownerTest_profileFieldAddress',
  passportNumber: 'ownerTest_profileFieldPassport',
  identificationNumber: 'ownerTest_idLabelDefault',
}

export function getOwnerProfileFieldLabel(key, country) {
  if (key === 'identificationNumber') {
    const raw = getIdentificationLabelByCountry(country)
    if (raw === 'DNI или NIE') return ownerTestT('ownerTest_idLabelSpain')
    return ownerTestT('ownerTest_idLabelDefault')
  }
  const i18nKey = OWNER_PROFILE_FIELD_I18N_KEYS[key]
  return i18nKey ? ownerTestT(i18nKey) : key
}

export const OWNER_SUBSCRIPTION_PLAN_KEYS = {
  basic: 'ownerTest_planBasic',
  standard: 'ownerTest_planStandard',
  pro: 'ownerTest_planPro',
  institutional: 'ownerTest_planInstitutional',
}

export function getOwnerSubscriptionPlanLabel(planId) {
  const key = OWNER_SUBSCRIPTION_PLAN_KEYS[planId]
  return key ? ownerTestT(key) : planId
}

export function resolveProfileSubscriptionPlanId(label) {
  const map = {
    [ownerTestT('ownerTest_planBasic')]: 'basic',
    [ownerTestT('ownerTest_planStandard')]: 'standard',
    Базовый: 'basic',
    Стандарт: 'standard',
    Pro: 'pro',
    Корпоративный: 'institutional',
    Институциональный: 'institutional',
    [ownerTestT('ownerTest_planInstitutional')]: 'institutional',
  }
  return map[label] || null
}

export function formatOwnerTestDays(count, lang = i18n.language) {
  return i18n.t('ownerTest_days', { count, lng: lang })
}

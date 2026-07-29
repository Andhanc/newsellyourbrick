import { formatPhoneForDisplayByCountry } from './profilePhoneFormat'
import {
  getOwnerProfileFieldLabel,
  getOwnerSubscriptionPlanLabel,
  getOwnerTestIntlLocale,
  ownerTestT,
} from './ownerTestI18n'

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || '/api'

export const NEW_OWNER_CABINET_HOME_PATH = '/owner-test'

const EMPTY_PROFILE = {
  firstName: '',
  lastName: '',
  country: '',
  phone: '',
  email: '',
  address: '',
  passportNumber: '',
  identificationNumber: '',
  subscription: getOwnerSubscriptionPlanLabel('standard'),
  subscriptionPeriodEnd: null,
  depositStatus: 'Оплачен',
  depositStatusKey: 'paid',
  memberSince: '',
}

const STRIPE_OWNER_SUBSCRIPTION_PLAN_IDS = {
  standard: 'standard',
  premium: 'pro',
  corporate: 'institutional',
  institutional: 'institutional',
  pro: 'pro',
  vip: 'institutional',
}

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing', 'past_due', 'paused'])

function resolveOwnerSubscriptionLabel(dbUser, fallback) {
  const sub = dbUser?.stripe_subscription_state
  const status = String(sub?.status || '').toLowerCase()
  const planKey = String(sub?.plan_key || '').toLowerCase()
  const planId = STRIPE_OWNER_SUBSCRIPTION_PLAN_IDS[planKey]
  if (ACTIVE_SUBSCRIPTION_STATUSES.has(status) && planId) {
    return getOwnerSubscriptionPlanLabel(planId)
  }
  return fallback
}

function resolveOwnerSubscriptionPeriodEnd(dbUser) {
  const end = dbUser?.stripe_subscription_state?.current_period_end
  if (!end) return null
  const date = new Date(end)
  return Number.isFinite(date.getTime()) ? end : null
}

function splitFullName(fullName) {
  const parts = String(fullName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' '),
  }
}

function formatMemberSince(value, lang) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const formatted = date.toLocaleDateString(getOwnerTestIntlLocale(lang), {
    month: 'long',
    year: 'numeric',
  })
  return ownerTestT('ownerTest_profileMemberSince', { date, lng: lang })
}

export const OWNER_PROFILE_COMPLETION_FIELDS = [
  'firstName',
  'lastName',
  'country',
  'phone',
  'email',
  'address',
  'passportNumber',
  'identificationNumber',
]

export function getOwnerProfileCompletionRows(profile) {
  return OWNER_PROFILE_COMPLETION_FIELDS.map((key) => ({
    key,
    label: getOwnerProfileFieldLabel(key, profile?.country),
    filled: String(profile?.[key] || '').trim().length > 0,
  }))
}

export function getOwnerProfileCompletion(profile) {
  const total = OWNER_PROFILE_COMPLETION_FIELDS.length
  if (!profile) return { filled: 0, total, pct: 0, rows: getOwnerProfileCompletionRows(null) }
  const rows = getOwnerProfileCompletionRows(profile)
  const filled = rows.filter((row) => row.filled).length
  const pct = total === 0 ? 0 : Math.round((filled / total) * 100)
  return { filled, total, pct, rows }
}

export function mapOwnerTestProfileFromLocal(userData) {
  const { firstName, lastName } = splitFullName(userData?.name)
  return {
    ...EMPTY_PROFILE,
    firstName: userData?.firstName || firstName,
    lastName: userData?.lastName || lastName,
    email: userData?.email || '',
    phone: formatPhoneForDisplayByCountry(
      userData?.phoneFormatted || userData?.phone || '',
      userData?.country || ''
    ),
    country: userData?.country || '',
  }
}

export function mergeOwnerTestProfileWithDb(base, dbUser) {
  if (!dbUser) return base
  const { firstName, lastName } = splitFullName(
    `${dbUser.first_name || ''} ${dbUser.last_name || ''}`.trim()
  )

  return {
    ...base,
    firstName: dbUser.first_name || base.firstName || firstName,
    lastName: dbUser.last_name || base.lastName || lastName,
    email: dbUser.email || base.email,
    phone: formatPhoneForDisplayByCountry(
      dbUser.phone_number || base.phone,
      dbUser.country || base.country
    ),
    country: dbUser.country || base.country,
    address: dbUser.address || base.address,
    passportNumber: dbUser.passport_number || base.passportNumber,
    identificationNumber: dbUser.identification_number || base.identificationNumber,
    subscription: resolveOwnerSubscriptionLabel(dbUser, base.subscription),
    subscriptionPeriodEnd: resolveOwnerSubscriptionPeriodEnd(dbUser) || base.subscriptionPeriodEnd || null,
    memberSince: formatMemberSince(dbUser.created_at, ownerTestT.language) || base.memberSince,
  }
}

export function buildOwnerTestProfileUpdatePayload(profile) {
  return {
    first_name: profile.firstName?.trim() || null,
    last_name: profile.lastName?.trim() || null,
    email: profile.email?.trim() || null,
    phone_number: profile.phone?.trim() || null,
    country: profile.country?.trim() || null,
    address: profile.address?.trim() || null,
    passport_number: profile.passportNumber?.trim() || null,
    identification_number: profile.identificationNumber?.trim() || null,
  }
}

export function getOwnerTestProfileFullName(profile) {
  const fullName = `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim()
  return fullName || ownerTestT('ownerTest_roleSeller')
}

export { API_BASE_URL as OWNER_TEST_API_BASE_URL }

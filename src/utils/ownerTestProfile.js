const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

export const LEGACY_OWNER_CABINET_PATH = '/owner'
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
  subscription: 'Стандарт',
  depositStatus: 'Оплачен',
  depositStatusKey: 'paid',
  memberSince: '',
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

function formatMemberSince(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const formatted = date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
  return `Участник с ${formatted}`
}

export function mapOwnerTestProfileFromLocal(userData) {
  const { firstName, lastName } = splitFullName(userData?.name)
  return {
    ...EMPTY_PROFILE,
    firstName: userData?.firstName || firstName,
    lastName: userData?.lastName || lastName,
    email: userData?.email || '',
    phone: userData?.phoneFormatted || userData?.phone || '',
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
    phone: dbUser.phone_number || base.phone,
    country: dbUser.country || base.country,
    address: dbUser.address || base.address,
    passportNumber: dbUser.passport_number || base.passportNumber,
    identificationNumber: dbUser.identification_number || base.identificationNumber,
    memberSince: formatMemberSince(dbUser.created_at) || base.memberSince,
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
  return fullName || 'Продавец'
}

export { API_BASE_URL as OWNER_TEST_API_BASE_URL }

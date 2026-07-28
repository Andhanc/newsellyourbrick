import { getApiBaseUrlSync } from './apiConfig'

export function normalizeOAuthCabinetRole(role) {
  const r = String(role || 'buyer').toLowerCase()
  return r === 'seller' || r === 'owner' ? 'seller' : 'buyer'
}

/**
 * Находит пользователя в БД для выбранного кабинета (покупатель или продавец) по email.
 * При двух кабинетах на один email возвращает нужную запись, а не первую попавшуюся.
 */
export async function fetchCabinetUserByEmail(email, intendedRole = 'buyer', apiBase = getApiBaseUrlSync()) {
  const emailLower = String(email || '').trim().toLowerCase()
  if (!emailLower) return null

  const cabinetRole = normalizeOAuthCabinetRole(intendedRole)

  const linkedRes = await fetch(
    `${apiBase}/auth/linked-roles?email=${encodeURIComponent(emailLower)}`,
  )
  const linkedData = await linkedRes.json().catch(() => ({}))
  if (!linkedRes.ok || !linkedData?.success) return null

  const stub = cabinetRole === 'seller' ? linkedData.seller : linkedData.buyer
  let userId = stub?.id

  if (!userId) {
    const emailRes = await fetch(
      `${apiBase}/users/email/${encodeURIComponent(emailLower)}?role=${cabinetRole}`,
    )
    const emailData = await emailRes.json().catch(() => ({}))
    if (emailRes.ok && emailData?.success && emailData?.data?.id) {
      userId = emailData.data.id
    }
  }

  if (!userId) return null

  const userRes = await fetch(`${apiBase}/users/${userId}`)
  const userData = await userRes.json().catch(() => ({}))
  if (!userRes.ok || !userData?.success || !userData?.data) return null

  return userData.data
}

/** Есть ли хотя бы один кабинет (покупатель или продавец) с этим email. */
export async function hasAnyCabinetUserByEmail(email, apiBase = getApiBaseUrlSync()) {
  const emailLower = String(email || '').trim().toLowerCase()
  if (!emailLower) return false

  const linkedRes = await fetch(
    `${apiBase}/auth/linked-roles?email=${encodeURIComponent(emailLower)}`,
  )
  const linkedData = await linkedRes.json().catch(() => ({}))
  if (!linkedRes.ok || !linkedData?.success) return false

  return Boolean(linkedData.buyer || linkedData.seller)
}

/** Собирает объект для saveUserData из строки БД + данных Clerk OAuth. */
export function mapDbUserToSessionUser(dbUser, clerkOverlay = {}) {
  if (!dbUser?.id) return null

  const role =
    dbUser.role === 'seller' || dbUser.role === 'owner' ? 'seller' : 'buyer'
  const name =
    [dbUser.first_name, dbUser.last_name].filter(Boolean).join(' ').trim() ||
    clerkOverlay.name ||
    dbUser.email ||
    'Пользователь'

  return {
    name,
    email: dbUser.email || clerkOverlay.email || '',
    picture: dbUser.user_photo || clerkOverlay.picture || '',
    id: String(dbUser.id),
    phone: dbUser.phone_number || clerkOverlay.phone || '',
    phoneFormatted: dbUser.phone_number || clerkOverlay.phoneFormatted || clerkOverlay.phone || '',
    role,
    country: dbUser.country || clerkOverlay.country || '',
    is_verified: dbUser.is_verified,
    ...(dbUser.user_id_number ? { user_id_number: dbUser.user_id_number } : {}),
  }
}

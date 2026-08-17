/** Поля профиля покупателя, обязательные перед пополнением депозита (как на шаге «Проверка»). */
function isFilled(value) {
  return !!(value && String(value).trim())
}

function phoneDigits(value) {
  return String(value || '').replace(/\D/g, '')
}

/**
 * Локальная проверка полноты профиля по записи пользователя из API.
 * @param {object|null|undefined} user
 * @returns {boolean}
 */
export function isBuyerProfileCompleteForDeposit(user) {
  if (!user || typeof user !== 'object') return false
  const phoneOk = phoneDigits(user.phone_number || user.phone || '').length >= 8
  return (
    isFilled(user.first_name) &&
    isFilled(user.last_name) &&
    isFilled(user.email) &&
    phoneOk &&
    isFilled(user.country) &&
    isFilled(user.address) &&
    isFilled(user.passport_number) &&
    isFilled(user.identification_number)
  )
}

/**
 * Запрашивает пользователя и проверяет, можно ли открывать пополнение депозита.
 * При сбое сети не блокируем оплату (fail-open), чтобы не ломать пополнение из‑за API.
 * @param {number|string} userId
 * @param {string} apiBase
 * @returns {Promise<{ complete: boolean, checked: boolean }>}
 */
export async function fetchIsBuyerProfileCompleteForDeposit(userId, apiBase) {
  if (!userId) return { complete: false, checked: false }
  const base = typeof apiBase === 'string' ? apiBase.replace(/\/$/, '') : ''
  try {
    const res = await fetch(`${base}/users/${userId}`)
    if (!res.ok) return { complete: false, checked: false }
    const json = await res.json()
    if (!json?.success || !json.data) return { complete: false, checked: false }
    return {
      complete: isBuyerProfileCompleteForDeposit(json.data),
      checked: true,
    }
  } catch {
    return { complete: false, checked: false }
  }
}

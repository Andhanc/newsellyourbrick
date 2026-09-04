/**
 * Текст уведомления для панели: без дубля названия объекта,
 * если карточка объекта уже показана ниже.
 */

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function formatMoneyAmount(amount, currency = 'EUR', locale) {
  const value = Number(amount)
  if (!Number.isFinite(value)) return String(amount ?? '')
  try {
    return new Intl.NumberFormat(locale || undefined, {
      style: 'currency',
      currency: String(currency || 'EUR').trim() || 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  } catch {
    return `${Math.round(value)} ${currency || 'EUR'}`
  }
}

/** Убирает повтор названия объекта из старых длинных message. */
export function stripPropertyNameEcho(message, propertyName) {
  const raw = String(message || '').trim()
  const name = String(propertyName || '').trim()
  if (!raw || !name || name.length < 3) return raw

  const escaped = escapeRegExp(name)
  let next = raw
    .replace(new RegExp(`[«"„']\\s*${escaped}\\s*[»"“']`, 'gi'), '')
    .replace(new RegExp(escaped, 'gi'), '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,!?])/g, '$1')
    .replace(/\bна объект\s+(была|был|перебита)/gi, '$1')
    .replace(/\bon (?:the )?(?:property|listing)\s+/gi, '')
    .replace(/\(\s*\)/g, '')
    .replace(/\s+([.,])/g, '$1')
    .trim()

  return next || raw
}

function extractOutbidAmountPhrase(message) {
  const raw = String(message || '')
  const patterns = [
    /Новая максимальная ставка:\s*([^.\n]+)/i,
    /New (?:highest|maximum|max) bid:\s*([^.\n]+)/i,
    /Nuevo (?:precio|máximo|puja máxima):\s*([^.\n]+)/i,
    /Neues Höchstgebot:\s*([^.\n]+)/i,
    /Nouvelle enchère max(?:imale)?\s*:\s*([^.\n]+)/i,
  ]
  for (const pattern of patterns) {
    const match = raw.match(pattern)
    if (match?.[1]) return match[1].replace(/\.$/, '').trim()
  }
  return null
}

/**
 * @param {{
 *   notification: { type?: string, message?: string },
 *   data?: Record<string, unknown> | null,
 *   propertyName?: string,
 *   hasPropertyCard?: boolean,
 *   locale?: string,
 *   t?: (key: string, opts?: object) => string,
 * }} args
 */
export function formatBuyerNotificationMessage({
  notification,
  data = null,
  propertyName = '',
  hasPropertyCard = false,
  locale,
  t = (key, opts) => opts?.defaultValue || key,
}) {
  const type = String(notification?.type || '').toLowerCase()
  const raw = String(notification?.message || '').trim()
  if (!raw) return ''

  const isOutbid = type === 'bid_outbid' || type === 'outbid'
  if (isOutbid) {
    const amountRaw = data?.new_bid_amount ?? data?.newBidAmount
    const currency = data?.currency || data?.property_currency || 'EUR'
    if (amountRaw != null && Number.isFinite(Number(amountRaw))) {
      return t('notificationsOutbidNewMaxBid', {
        amount: formatMoneyAmount(amountRaw, currency, locale),
        defaultValue: 'Новая максимальная ставка: {{amount}}',
      })
    }
    const extracted = extractOutbidAmountPhrase(raw)
    if (extracted) {
      return t('notificationsOutbidNewMaxBid', {
        amount: extracted,
        defaultValue: 'Новая максимальная ставка: {{amount}}',
      })
    }
    if (hasPropertyCard) {
      return t('notificationsOutbidShort', {
        defaultValue: 'Вашу ставку на этот объект перебили.',
      })
    }
    return t('notificationsOutbidShort', {
      defaultValue: 'Вашу ставку на этот объект перебили.',
    })
  }

  if (type === 'verification_success') {
    return t('notificationMessage_verificationSuccess', {
      defaultValue:
        'Документы одобрены. Теперь можно делать ставки на аукционах.',
    })
  }
  if (type === 'verification_rejected') {
    const reason = data?.reason || data?.rejection_reason
    if (reason) {
      return t('notificationMessage_verificationRejectedReason', {
        reason: String(reason),
        defaultValue: 'Документы отклонены. Причина: {{reason}}. Загрузите документы заново.',
      })
    }
    return t('notificationMessage_verificationRejected', {
      defaultValue: 'Документы отклонены. Загрузите документы заново для повторной проверки.',
    })
  }

  if (hasPropertyCard && propertyName) {
    return stripPropertyNameEcho(raw, propertyName)
  }

  return raw
}

export function getNotificationOutbidAmountLabel({ data, message, locale, t }) {
  const amountRaw = data?.new_bid_amount ?? data?.newBidAmount
  const currency = data?.currency || data?.property_currency || 'EUR'
  if (amountRaw != null && Number.isFinite(Number(amountRaw))) {
    return formatMoneyAmount(amountRaw, currency, locale)
  }
  return extractOutbidAmountPhrase(message) || null
}

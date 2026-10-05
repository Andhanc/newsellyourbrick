/**
 * Текст уведомления для панели: локализуется по type + data,
 * без дубля названия объекта, если карточка объекта уже показана ниже.
 */

import { isPropertyEditApproval } from './localizeBuyerNotification.js'

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

export function formatNotificationDeadline(iso, locale) {
  if (!iso) return ''
  const date = new Date(iso)
  if (!Number.isFinite(date.getTime())) return String(iso)
  try {
    return new Intl.DateTimeFormat(locale || undefined, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  } catch {
    return date.toISOString()
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

function resolvePropertyLabel(propertyName, hasPropertyCard, t) {
  const name = String(propertyName || '').trim()
  if (name) return name
  if (hasPropertyCard) return ''
  return t('listingDefault', { defaultValue: 'Listing' })
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
  const property = resolvePropertyLabel(propertyName, hasPropertyCard, t)

  const isOutbid = type === 'bid_outbid' || type === 'outbid'
  if (isOutbid) {
    const amountRaw = data?.new_bid_amount ?? data?.newBidAmount
    const currency = data?.currency || data?.property_currency || 'EUR'
    if (amountRaw != null && Number.isFinite(Number(amountRaw))) {
      return t('notificationsOutbidNewMaxBid', {
        amount: formatMoneyAmount(amountRaw, currency, locale),
        defaultValue: 'New highest bid: {{amount}}',
      })
    }
    const extracted = extractOutbidAmountPhrase(raw)
    if (extracted) {
      return t('notificationsOutbidNewMaxBid', {
        amount: extracted,
        defaultValue: 'New highest bid: {{amount}}',
      })
    }
    return t('notificationsOutbidShort', {
      defaultValue: 'Your bid on this property was outbid.',
    })
  }

  if (type === 'verification_success') {
    return t('notificationMessage_verificationSuccess', {
      defaultValue: 'Your documents were approved. You can now bid on auctions.',
    })
  }
  if (type === 'verification_rejected') {
    const reason = data?.reason || data?.rejection_reason
    if (reason) {
      return t('notificationMessage_verificationRejectedReason', {
        reason: String(reason),
        defaultValue: 'Documents were rejected. Reason: {{reason}}. Please upload them again.',
      })
    }
    return t('notificationMessage_verificationRejected', {
      defaultValue: 'Documents were rejected. Please upload them again for review.',
    })
  }

  if (type === 'auction_won') {
    if (hasPropertyCard || !property) {
      return t('notificationMessage_auctionWonShort', {
        defaultValue: 'Congratulations! You won the auction.',
      })
    }
    return t('notificationMessage_auctionWon', {
      property,
      defaultValue: 'Congratulations! You won the auction for «{{property}}».',
    })
  }

  if (type === 'auction_lost') {
    if (hasPropertyCard || !property) {
      return t('notificationMessage_auctionLostShort', {
        defaultValue: 'The auction has ended. Another participant won.',
      })
    }
    return t('notificationMessage_auctionLost', {
      property,
      defaultValue: 'The auction for «{{property}}» has ended. Another participant won.',
    })
  }

  if (type === 'payment_deadline') {
    const deadline = formatNotificationDeadline(
      data?.deposit_due_date || data?.depositDueDate || data?.deadline,
      locale,
    )
    if (hasPropertyCard || !property) {
      return t('notificationMessage_paymentDeadlineShort', {
        deadline: deadline || '—',
        defaultValue: 'Pay the deposit by {{deadline}} to keep your purchase right.',
      })
    }
    return t('notificationMessage_paymentDeadline', {
      deadline: deadline || '—',
      property,
      defaultValue: 'Pay the deposit by {{deadline}} to keep your purchase right for «{{property}}».',
    })
  }

  if (type === 'deposit_paid') {
    return t('notificationMessage_depositPaid', {
      defaultValue: 'Your deposit has been credited.',
    })
  }
  if (type === 'payment_succeeded') {
    return t('notificationMessage_paymentSucceeded', {
      defaultValue: 'Payment was successful.',
    })
  }
  if (type === 'property_reservation_paid') {
    return t('notificationMessage_reservationPaid', {
      defaultValue: 'The reservation has been paid. Follow the deal progress in your profile.',
    })
  }
  if (type === 'buy_now_approved') {
    return t('notificationMessage_buyNowApproved', {
      defaultValue: 'Your purchase request was approved.',
    })
  }
  if (type === 'buy_now_completed') {
    return t('notificationMessage_buyNowCompleted', {
      defaultValue: 'The purchase is complete. You can list the property for sale.',
    })
  }
  if (type === 'buy_now_rejected') {
    return t('notificationMessage_buyNowRejected', {
      defaultValue: 'Your purchase request was rejected.',
    })
  }
  if (type === 'test_drive_request') {
    return t('notificationMessage_testDriveRequest', {
      defaultValue: 'A buyer requested a test drive for your property.',
    })
  }
  if (type === 'test_drive_result' || type === 'test_drive_approved') {
    return t('notificationMessage_testDriveApproved', {
      defaultValue: 'Your test drive was confirmed.',
    })
  }
  if (type === 'test_drive_cancelled') {
    return t('notificationMessage_testDriveCancelled', {
      defaultValue: 'The test drive was cancelled.',
    })
  }
  if (type === 'test_drive_survey') {
    return t('notificationMessage_testDriveSurvey', {
      defaultValue: 'Please share feedback about your test drive.',
    })
  }

  if (type === 'no_bids_45_days') {
    return t('notificationMessage_noBids45DaysShort', {
      defaultValue:
        'No bids or engagement for 45 days since listing. Consider lowering the price in your account via edit.',
    })
  }

  if (type === 'property_approved') {
    if (isPropertyEditApproval(notification, data)) {
      if (hasPropertyCard || !property) {
        return t('notificationMessage_propertyEditApprovedShort', {
          defaultValue: 'Changes were approved and applied to the published listing.',
        })
      }
      return t('notificationMessage_propertyEditApproved', {
        property,
        defaultValue:
          'Changes to «{{property}}» were approved and applied to the published listing.',
      })
    }
    if (hasPropertyCard || !property) {
      return t('notificationMessage_propertyApprovedShort', {
        defaultValue:
          'Your listing passed verification, was translated for the site languages, and is now published.',
      })
    }
    return t('notificationMessage_propertyApproved', {
      property,
      defaultValue:
        'Your listing «{{property}}» passed verification, was translated for the site languages, and is now published.',
    })
  }

  if (type === 'property_rejected') {
    const reason = data?.rejection_reason || data?.reason
    if (reason) {
      if (hasPropertyCard || !property) {
        return t('notificationMessage_propertyRejectedReasonShort', {
          reason: String(reason),
          defaultValue: 'Your listing was rejected. Reason: {{reason}}.',
        })
      }
      return t('notificationMessage_propertyRejectedReason', {
        property,
        reason: String(reason),
        defaultValue: 'Your listing «{{property}}» was rejected. Reason: {{reason}}.',
      })
    }
    if (hasPropertyCard || !property) {
      return t('notificationMessage_propertyRejectedShort', {
        defaultValue: 'Your listing was rejected.',
      })
    }
    return t('notificationMessage_propertyRejected', {
      property,
      defaultValue: 'Your listing «{{property}}» was rejected.',
    })
  }

  if (type === 'property_deleted') {
    if (hasPropertyCard || !property) {
      return t('notificationMessage_propertyDeletedShort', {
        defaultValue: 'Your delete request was approved. The listing has been removed.',
      })
    }
    return t('notificationMessage_propertyDeleted', {
      property,
      defaultValue:
        'Your request to delete «{{property}}» was approved. The listing has been removed.',
    })
  }

  if (!raw) return ''
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

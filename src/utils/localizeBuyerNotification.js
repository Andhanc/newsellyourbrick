import {
  getCanonicalRegionKey,
  matchCountryKey,
  parsePropertyLocation,
} from './propertySearchLocation.js'

/** type → i18n key for notification title (UI language, not DB Russian). */
export const BUYER_NOTIFICATION_TITLE_KEYS = {
  bid_outbid: 'toastBidOutbidTitle',
  outbid: 'toastBidOutbidTitle',
  verification_success: 'notificationTitle_verificationSuccess',
  verification_rejected: 'notificationTitle_verificationRejected',
  test_drive_request: 'notificationTitle_testDriveRequest',
  test_drive_result: 'notificationTitle_testDriveApproved',
  test_drive_approved: 'notificationTitle_testDriveApproved',
  test_drive_cancelled: 'notificationTitle_testDriveCancelled',
  test_drive_survey: 'notificationTitle_testDriveSurvey',
  buy_now_approved: 'notificationTitle_buyNowApproved',
  buy_now_completed: 'notificationTitle_buyNowCompleted',
  buy_now_rejected: 'notificationTitle_buyNowRejected',
  auction_won: 'notificationTitle_auctionWon',
  auction_lost: 'notificationTitle_auctionLost',
  payment_deadline: 'notificationTitle_paymentDeadline',
  deposit_paid: 'notificationTitle_depositPaid',
  payment_succeeded: 'notificationTitle_paymentSucceeded',
  property_reservation_paid: 'notificationTitle_reservationPaid',
}

const COUNTRY_ISO = {
  spain: 'ES',
  belarus: 'BY',
  uae: 'AE',
  russia: 'RU',
  portugal: 'PT',
  france: 'FR',
  germany: 'DE',
  italy: 'IT',
  turkey: 'TR',
  thailand: 'TH',
  uk: 'GB',
  usa: 'US',
  poland: 'PL',
  georgia: 'GE',
  armenia: 'AM',
  kazakhstan: 'KZ',
  cyprus: 'CY',
  austria: 'AT',
  greece: 'GR',
  montenegro: 'ME',
  serbia: 'RS',
  egypt: 'EG',
  israel: 'IL',
}

/** Known cities → existing region* i18n keys. */
const REGION_I18N_KEYS = {
  spain: 'regionSpain',
  madrid: 'regionMadrid',
  barcelona: 'regionBarcelona',
  dubai: 'regionDubai',
  tenerife: 'regionTenerife',
  'costa-adeje': 'regionCostaAdeje',
  laspalmas: 'regionLasPalmas',
  'las-palmas': 'regionLasPalmas',
}

function toPascalRegionKey(regionKey) {
  return String(regionKey || '')
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('')
}

function localizeCountryLabel(countryKey, fallback, locale, t) {
  if (!countryKey) return fallback || ''
  if (countryKey === 'spain') {
    return t('regionSpain', { defaultValue: fallback || 'Spain' })
  }
  const iso = COUNTRY_ISO[countryKey]
  if (iso) {
    try {
      const label = new Intl.DisplayNames([locale || 'en'], { type: 'region' }).of(iso)
      if (label) return label
    } catch {
      /* ignore */
    }
  }
  return fallback || countryKey
}

function localizeCityLabel(regionKey, fallback, t) {
  if (!regionKey) return fallback || ''
  const mapped = REGION_I18N_KEYS[regionKey] || `region${toPascalRegionKey(regionKey)}`
  const translated = t(mapped, { defaultValue: '' })
  if (translated && translated !== mapped) return translated
  return fallback || regionKey
}

function extractStreetRemainder(location, countryLabel, regionLabel) {
  let rest = String(location || '').trim()
  const drop = [countryLabel, regionLabel].filter(Boolean)
  for (const part of drop) {
    const escaped = String(part).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    rest = rest
      .replace(new RegExp(`(^|,)\\s*${escaped}\\s*(?=,|$)`, 'gi'), '$1')
      .replace(/^,\s*|,\s*$/g, '')
      .replace(/\s*,\s*,\s*/g, ', ')
      .trim()
  }
  return rest
}

/**
 * Локализует строку локации объявления (страна/город) под UI-язык.
 * Улицу и номер дома оставляет как в исходнике.
 */
export function localizeNotificationLocation(location, t, locale = 'en') {
  const raw = String(location || '').trim()
  if (!raw) return ''

  const parsed = parsePropertyLocation({ location: raw })
  if (!parsed?.countryKey && !parsed?.regionKey) {
    // Try matching a leading country token even if parse failed partially
    const first = raw.split(',')[0]?.trim()
    const countryKey = matchCountryKey(first)
    if (countryKey) {
      const country = localizeCountryLabel(countryKey, first, locale, t)
      const rest = raw.slice(first.length).replace(/^,\s*/, '')
      return rest ? `${country}, ${rest}` : country
    }
    return raw
  }

  const country = localizeCountryLabel(
    parsed.countryKey,
    parsed.countryLabel,
    locale,
    t,
  )
  const regionKey = parsed.regionKey || getCanonicalRegionKey(parsed.regionLabel)
  const city = localizeCityLabel(regionKey, parsed.regionLabel, t)
  const street = extractStreetRemainder(raw, parsed.countryLabel, parsed.regionLabel)

  return [country, city, street].filter(Boolean).join(', ')
}

export function getBuyerNotificationTitle(notification, t) {
  const type = String(notification?.type || '').toLowerCase()
  const key = BUYER_NOTIFICATION_TITLE_KEYS[type]
  if (key) {
    return t(key, { defaultValue: notification?.title || key })
  }
  return notification?.title || t('notifications')
}

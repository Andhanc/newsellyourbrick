import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useUser, useClerk } from '@clerk/clerk-react'
import { motion, useReducedMotion } from 'framer-motion'
import { AsYouType } from 'libphonenumber-js'
import {
  UserRound,
  History as LucideHistory,
  CalendarDays,
  Wallet,
  Sparkles,
  MessagesSquare,
} from 'lucide-react'
import {
  FiHash,
  FiShield,
  FiCalendar,
  FiAlertCircle,
  FiHome,
  FiHeart,
  FiMap,
  FiMapPin,
  FiSearch,
  FiFileText,
  FiBookOpen,
  FiArrowRight,
  FiCheckCircle,
  FiMail,
  FiArrowLeft,
  FiBell,
  FiUpload,
  FiChevronDown,
  FiChevronUp,
  FiCheck,
  FiLogOut,
  FiSend,
  FiX,
  FiCopy,
  FiUserPlus,
  FiGift,
  FiAward,
} from 'react-icons/fi'
import { getStoredNumericUserId, getUserData, logout } from '../services/authService'
import { fetchUserById, invalidateUserByIdCache } from '../utils/usersApi'
import { showNotification } from '../utils/toastHelper'
import Confetti from 'react-confetti'
import { scrollMainTo } from '../utils/mainScroll'
import { isSiteUserSignedIn } from '../utils/siteAuthGate'
import { requestOpenLoginModal } from '../utils/requestOpenLoginModal'
import {
  useCabinetOverviewData,
  effectivePurchasedTier,
  SUBSCRIPTION_BILLING_UPDATED_EVENT,
} from '../hooks/useCabinetOverviewData'
import PricingCards from '../components/ui/PricingCards'
import { startProSubscriptionCheckout, startVipSubscriptionCheckout, confirmCheckoutSession } from '../utils/subscriptionCheckout'
import DirectionSummaryCard from '../components/ui/direction-summary-card'
import { BuyerCabinetHeroSkeleton, BuyerCabinetBelowSkeleton } from '../components/BuyerCabinetOverviewSkeleton'
import PassportRecognitionModal from '../components/PassportRecognitionModal'
import { countries as countryList } from '../components/CountrySelect'
import { COUNTRY_CODES as phoneCountryCodes } from '../components/PhoneInput'
import { ProfileSpotlightOnboarding } from '../components/ProfileSpotlightOnboarding'
import ProfileVipClubPromo from '../components/ProfileVipClubPromo'
import { ServiceQuickLinksTour } from '../components/ServiceQuickLinksTour'
import TestDriveBuyerCancelModal from '../components/TestDriveBuyerCancelModal'
import TestDriveCheckInModal from '../components/TestDriveCheckInModal'
import { formatMoneyFromMinorUnits, formatMoneyMajorUnits } from '../utils/formatStripeMoney'
import { fetchVerificationStatus, invalidateVerificationStatusCache } from '../utils/verificationStatusApi'
import { useManagerLiveChat } from '../hooks/useManagerLiveChat'
import { evaluatePassportText, validatePassportImageFile } from '../utils/passportPhotoValidation'
import './TestPage.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

/** Поддержка в WhatsApp (как в Footer). */
const WHATSAPP_SUPPORT_HREF = 'https://wa.me/447700183959'

/** Конфетти на модалке поздравления: генерация новых частиц только эти миллисекунды. */
const SUBSCRIPTION_CONFETTI_ACTIVE_MS = 5000

const PROFILE_SAVE_DEBOUNCE_MS = 500

/** Показывать затемнённые подсказки, пока заполнено меньше этого процента полей (при перезагрузке снова, пока не достигнут порог). */
const PROFILE_ONBOARDING_MIN_COMPLETE_PCT = 100

/** После перехода к полю из тоста — не крутим подсветку на тосте; при новом открытии панели «Данные» ключ сбрасывается в TestPage. */
const TOAST_GUIDE_FIELD_NAV_DONE_PREFIX = 'syb.profile.dataToastGuide.fieldNavDone:'

const PROFILE_COMPLETE_CELEBRATION_SHOWN_PREFIX = 'syb.profile.newProfileCompleteCelebrationShown:'
const SERVICE_TOUR_ACK_PREFIX = 'syb.profile.serviceTourAck:'

function readToastGuideFieldNavDone(userId) {
  if (userId == null || userId === '') return false
  try {
    return sessionStorage.getItem(`${TOAST_GUIDE_FIELD_NAV_DONE_PREFIX}${userId}`) === '1'
  } catch {
    return false
  }
}

function readServiceTourAck(userId) {
  if (userId == null || userId === '') return false
  try {
    return localStorage.getItem(`${SERVICE_TOUR_ACK_PREFIX}${userId}`) === '1'
  } catch {
    return false
  }
}

const PROFILE_MAIN_FIELDS = [
  { key: 'first_name', labelKey: 'buyerData_labelFirstName', autoComplete: 'given-name' },
  { key: 'last_name', labelKey: 'buyerData_labelLastName', autoComplete: 'family-name' },
  { key: 'email', labelKey: 'buyerData_labelEmail', type: 'email', autoComplete: 'email' },
  { key: 'phone', labelKey: 'buyerData_labelPhone', autoComplete: 'tel' },
  { key: 'country', labelKey: 'buyerData_labelCountry', autoComplete: 'country-name' },
  { key: 'address', labelKey: 'buyerData_labelAddress', multiline: true, autoComplete: 'street-address' },
]

const PROFILE_PASSPORT_FIELDS = [
  { key: 'passport_number', labelKey: 'buyerData_labelPassportNumber', autoComplete: 'off' },
  { key: 'identification_number', labelKey: 'buyerData_labelIdNumberByCountry', autoComplete: 'off' },
]

const PROFILE_FIELDS_META = [...PROFILE_MAIN_FIELDS, ...PROFILE_PASSPORT_FIELDS]

/** На узком экране — в одну строку с соседним полем; остальные на всю ширину. */
const PROFILE_FIELD_FULL_WIDTH_KEYS = new Set(['email', 'phone', 'country', 'address'])

function getProfileFieldLayoutClass(key) {
  return PROFILE_FIELD_FULL_WIDTH_KEYS.has(key) ? ' test-data-field--span-full' : ''
}

const PROFILE_FIELD_I18N = {
  first_name: 'buyerData_labelFirstName',
  last_name: 'buyerData_labelLastName',
  email: 'buyerData_labelEmail',
  phone: 'buyerData_labelPhone',
  country: 'buyerData_labelCountry',
  address: 'buyerData_labelAddress',
  passport_number: 'buyerData_labelPassportNumber',
  identification_number: 'buyerData_labelIdNumberByCountry',
}

function isProfileFieldFilledFromFormOnly(key, profileForm) {
  const v = profileForm[key]
  if (key === 'phone') return phoneDigits(v).length >= 8
  return !!(v && String(v).trim())
}

/** Пустой объект missingFields с сервера не считаем валидным — иначе !mf.field даёт «всё заполнено». */
function normalizeVerificationMissingFields(mf) {
  if (mf == null || typeof mf !== 'object') return null
  return Object.keys(mf).length > 0 ? mf : null
}

/** Согласовано с API missingFields (Data.jsx / verification-status). */
function isProfileFieldFilled(key, mf, profileForm) {
  const fromForm = isProfileFieldFilledFromFormOnly(key, profileForm)
  if (mf == null) {
    return fromForm
  }
  /** Если в БД/форме уже есть значения, а verification-status ещё не обновился — всё равно считаем поле заполненным (иначе не доходим до 100% и модалка «Поздравляем»). */
  let serverOk
  switch (key) {
    case 'first_name':
      serverOk = !mf.firstName
      break
    case 'last_name':
      serverOk = !mf.lastName
      break
    case 'email':
      serverOk = !mf.emailOrPhone || !!(profileForm.email && String(profileForm.email).trim())
      break
    case 'phone':
      serverOk = !mf.emailOrPhone || phoneDigits(profileForm.phone).length > 0
      break
    case 'country':
      serverOk = !mf.country
      break
    case 'address':
      serverOk = !mf.address
      break
    case 'passport_number':
      serverOk = !mf.passportNumber
      break
    case 'identification_number':
      serverOk = !mf.identificationNumber
      break
    default:
      serverOk = true
  }
  return serverOk || fromForm
}

/** Поля для сохранения на сервер после OCR + /passport/extract (email не трогаем — верификация). */
function extractedPassportDataToApiPayload(data) {
  if (!data || typeof data !== 'object') return {}
  const body = {}
  if (data.firstName?.trim()) body.first_name = data.firstName.trim()
  if (data.lastName?.trim()) body.last_name = data.lastName.trim()
  if (data.passportSeries?.trim()) body.passport_series = data.passportSeries.trim()
  if (data.passportNumber?.trim()) {
    const digits = data.passportNumber.replace(/\D/g, '')
    if (digits) body.passport_number = digits
  }
  if (data.identificationNumber?.trim()) body.identification_number = data.identificationNumber.trim()
  if (data.address?.trim()) body.address = data.address.trim()
  return body
}

/** Как в Data.jsx: отображение телефона с «+». */
function formatPhoneWithPlus(phone) {
  if (!phone) return ''
  const cleaned = phone.replace(/[^\d+]/g, '')
  if (cleaned && !cleaned.startsWith('+')) {
    return `+${cleaned}`
  }
  return cleaned
}

function phoneDigits(s) {
  return (s || '').replace(/\D/g, '')
}

function normalizeCountryNameForPhoneCode(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[().,'"`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeCountryForDocumentRules(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[().,'"`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isSpainCountry(value) {
  const normalized = normalizeCountryForDocumentRules(value)
  return (
    normalized === 'es' ||
    normalized === 'spain' ||
    normalized === 'espana' ||
    normalized === 'испания' ||
    normalized === 'espagne' ||
    normalized === 'spanien'
  )
}

function isValidSpainDniNie(value) {
  const normalized = String(value || '')
    .toUpperCase()
    .replace(/[\s-]/g, '')

  const dniRegex = /^\d{8}[A-Z]$/
  const nieRegex = /^[XYZ]\d{7}[A-Z]$/
  return dniRegex.test(normalized) || nieRegex.test(normalized)
}

function getIdentificationLabelKeyByCountry(countryName) {
  return isSpainCountry(countryName) ? 'buyerData_labelDniNie' : 'buyerData_labelIdNumber'
}

function replacePhoneDialCodeByCountry({
  currentPhone,
  previousCountry,
  nextCountry,
  phoneCodeByCountryName,
}) {
  const nextDialCode =
    phoneCodeByCountryName.get(normalizeCountryNameForPhoneCode(nextCountry || '')) || ''
  if (!nextDialCode) return String(currentPhone || '')

  let localDigits = phoneDigits(currentPhone)
  if (!localDigits) return nextDialCode

  const previousDialCode =
    phoneCodeByCountryName.get(normalizeCountryNameForPhoneCode(previousCountry || '')) || ''
  const previousDialDigits = phoneDigits(previousDialCode)

  if (previousDialDigits && localDigits.startsWith(previousDialDigits)) {
    localDigits = localDigits.slice(previousDialDigits.length)
  } else {
    const allDialDigits = Array.from(phoneCodeByCountryName.values())
      .map((dial) => phoneDigits(dial))
      .filter(Boolean)
      .sort((a, b) => b.length - a.length)
    const detectedDial = allDialDigits.find((dial) => localDigits.startsWith(dial))
    if (detectedDial) localDigits = localDigits.slice(detectedDial.length)
  }

  const raw = localDigits ? `${nextDialCode} ${localDigits}` : `${nextDialCode}`
  const iso2 = countryIsoFromStoredName(nextCountry || '')
  return formatPhoneAsYouType(raw, iso2)
}

function countryIsoFromStoredName(name) {
  const key = normalizeCountryNameForPhoneCode(name)
  if (!key) return null
  const hit = countryList.find((c) => normalizeCountryNameForPhoneCode(c.name) === key)
  return hit?.code || null
}

function formatPhoneAsYouType(raw, iso2) {
  const source = String(raw || '')
  const hasLeadingPlus = source.trim().startsWith('+')
  const digits = source.replace(/\D/g, '')
  if (!digits) return hasLeadingPlus ? '+' : ''

  if (hasLeadingPlus) {
    const formatter = new AsYouType()
    return formatter.input(`+${digits}`)
  }

  if (iso2) {
    const formatter = new AsYouType(iso2)
    return formatter.input(digits)
  }

  return digits
}

function formatPhoneForDisplayByCountry(phone, countryName) {
  const base = formatPhoneWithPlus(phone)
  if (!base) return ''
  const iso2 = countryIsoFromStoredName(countryName)
  return formatPhoneAsYouType(base, iso2)
}

function emptyProfileForm() {
  return Object.fromEntries(PROFILE_FIELDS_META.map((f) => [f.key, '']))
}

/** Avatar URL из Clerk (OAuth может отдавать картинку только в связанном аккаунте или в legacy-поле). */
function resolveClerkAvatarUrl(clerkUser) {
  if (!clerkUser) return ''
  const candidates = []
  const push = (u) => {
    if (typeof u === 'string' && u.trim()) candidates.push(u.trim())
  }
  push(clerkUser.imageUrl)
  push(clerkUser.profileImageUrl)
  const accounts = clerkUser.externalAccounts
  if (Array.isArray(accounts)) {
    for (const acc of accounts) {
      if (!acc || typeof acc !== 'object') continue
      push(acc.imageUrl)
      push(acc.avatarUrl)
      push(acc.picture)
    }
  }
  return candidates[0] ?? ''
}

/** В дропдауннах профиля: макет интерфейса до прихода ответа API */
function TestSheetSkeletonData() {
  return (
    <div className="test-sheet-skel test-sheet-skel--data" aria-busy="true" aria-live="polite">
      <div className="test-sheet-skel__section">
        <span className="buyer-cab-skel-line test-sheet-skel__fake-h4" aria-hidden />
        <div className="test-data-panel__grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={`m-${String(i)}`} className="test-sheet-skel__field-shell">
              <span className="buyer-cab-skel-line test-sheet-skel__lbl" aria-hidden />
              <span className="buyer-cab-skel-line test-sheet-skel__inp" aria-hidden />
            </div>
          ))}
        </div>
      </div>
      <div className="test-sheet-skel__section">
        <span className="buyer-cab-skel-line test-sheet-skel__fake-h4 test-sheet-skel__fake-h4--narrow" aria-hidden />
        <div className="test-data-panel__grid">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={`p-${String(i)}`} className="test-sheet-skel__field-shell">
              <span className="buyer-cab-skel-line test-sheet-skel__lbl" aria-hidden />
              <span className="buyer-cab-skel-line test-sheet-skel__inp" aria-hidden />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function TestSheetSkeletonHistory() {
  return (
    <div className="test-sheet-skel test-sheet-skel--history" aria-busy="true" aria-live="polite">
      <div className="test-sheet-skel-history-toolbar" aria-hidden>
        <span className="buyer-cab-skel-line test-sheet-skel-history-toolbar__pill" />
      </div>
      {Array.from({ length: 2 }).map((_, si) => (
        <div key={`hs-${String(si)}`} className="test-sheet-skel-history-block">
          <div className="test-sheet-skel-history-block__head">
            <span className="buyer-cab-skel-line test-sheet-skel-history-block__title" aria-hidden />
            <span className="buyer-cab-skel-line test-sheet-skel-history-block__badge" aria-hidden />
          </div>
          <div className="test-sheet-skel-history-cards">
            {Array.from({ length: 2 }).map((_, ci) => (
              <div key={`hc-${String(si)}-${String(ci)}`} className="test-sheet-skel-history-card">
                <span className="buyer-cab-skel-line test-sheet-skel-history-card__thumb" aria-hidden />
                <div className="test-sheet-skel-history-card__text">
                  <span className="buyer-cab-skel-line test-sheet-skel-history-card__line1" aria-hidden />
                  <span className="buyer-cab-skel-line test-sheet-skel-history-card__line2" aria-hidden />
                  <span className="buyer-cab-skel-line test-sheet-skel-history-card__line3" aria-hidden />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function TestSheetSkeletonSubscription() {
  return (
    <div className="test-sheet-skel test-sheet-skel--subscription" aria-busy="true" aria-live="polite">
      <div className="test-sheet-skel-subs-toolbar" aria-hidden>
        <span className="buyer-cab-skel-line test-sheet-skel-subs-toolbar__pill" />
        <span className="buyer-cab-skel-line test-sheet-skel-subs-toolbar__pill" />
      </div>
      <div className="test-sheet-skel-pricing-cards">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={`pc-${String(i)}`} className="test-sheet-skel-pr-card">
            <span className="buyer-cab-skel-line test-sheet-skel-pr-card__title" aria-hidden />
            <span className="buyer-cab-skel-line test-sheet-skel-pr-card__price" aria-hidden />
            <span className="buyer-cab-skel-line test-sheet-skel-pr-card__feat" aria-hidden />
            <span className="buyer-cab-skel-line test-sheet-skel-pr-card__feat test-sheet-skel-pr-card__feat--short" aria-hidden />
            <span className="buyer-cab-skel-line test-sheet-skel-pr-card__cta" aria-hidden />
          </div>
        ))}
      </div>
    </div>
  )
}

function TestSheetSkeletonBookings() {
  return (
    <div className="test-sheet-skel test-sheet-skel--bookings" aria-busy="true" aria-live="polite">
      <div className="test-booking-dropbox__list">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={`bk-${String(i)}`} className="test-booking-mini-wrap">
            <div className="test-sheet-skel-booking" aria-hidden>
              <span className="buyer-cab-skel-line test-sheet-skel-booking__media" />
              <div className="test-sheet-skel-booking__body">
                <span className="buyer-cab-skel-line test-sheet-skel-booking__badge" />
                <span className="buyer-cab-skel-line test-sheet-skel-booking__title" />
                <span className="buyer-cab-skel-line test-sheet-skel-booking__line" />
                <span className="buyer-cab-skel-line test-sheet-skel-booking__line test-sheet-skel-booking__line--short" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function buildProfileFormFromRow(row, clerkUser, fallbackEmail) {
  return {
    first_name: row?.first_name ?? clerkUser?.firstName ?? '',
    last_name: row?.last_name ?? clerkUser?.lastName ?? '',
    email: row?.email ?? fallbackEmail ?? '',
    phone: formatPhoneForDisplayByCountry(row?.phone_number ?? '', row?.country ?? ''),
    country: row?.country ?? '',
    address: row?.address ?? '',
    passport_series: row?.passport_series ?? '',
    passport_number: row?.passport_number ?? '',
    identification_number: row?.identification_number ?? '',
  }
}

function profileFieldToApiKey(fieldKey) {
  if (fieldKey === 'phone') return 'phone_number'
  return fieldKey
}

function toApiPayloadValue(fieldKey, raw) {
  const t = typeof raw === 'string' ? raw.trim() : ''
  if (fieldKey === 'phone') {
    const d = phoneDigits(t)
    return d === '' ? null : d
  }
  return t === '' ? null : t
}

function isProfileFieldUnchanged(fieldKey, raw, row) {
  if (!row) return false
  if (fieldKey === 'phone') {
    return phoneDigits(raw) === phoneDigits(row.phone_number || '')
  }
  const apiKey = profileFieldToApiKey(fieldKey)
  const next = toApiPayloadValue(fieldKey, raw)
  const prev = row[apiKey]
  const prevNorm = prev == null || String(prev).trim() === '' ? null : String(prev).trim()
  if (fieldKey === 'email') {
    const a = (next || '').toLowerCase()
    const b = (prevNorm || '').toLowerCase()
    return a === b
  }
  return next === prevNorm
}

function normalizedEmailValue(v) {
  return String(v || '').trim().toLowerCase()
}

function mergeExtractedPassportIntoProfileForm(prev, extracted) {
  if (!extracted) return prev
  return {
    ...prev,
    first_name: extracted.firstName?.trim() || prev.first_name,
    last_name: extracted.lastName?.trim() || prev.last_name,
    passport_series: extracted.passportSeries?.trim() || prev.passport_series,
    passport_number: extracted.passportNumber?.trim() || prev.passport_number,
    identification_number: extracted.identificationNumber?.trim() || prev.identification_number,
    address: extracted.address?.trim() || prev.address,
  }
}

function buildDirectionSummaries(t) {
  return [
    {
      variant: 'shares',
      areaLabel: t('buyerCabinet_directionAreaInvestments'),
      headline: t('buyerCabinet_directionHeadlineShares'),
      subCardTitle: t('buyerCabinet_directionSharesTitle'),
      subCardSubtitle: t('buyerCabinet_directionSharesSubtitle'),
      to: '/shares',
      moreCount: 8,
      thumbnails: [
        {
          src: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=160&h=160&fit=crop&q=80',
          alt: t('buyerCabinet_thumbModernHouse'),
        },
        {
          src: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=160&h=160&fit=crop&q=80',
          alt: t('buyerCabinet_thumbVillaPool'),
        },
        {
          src: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=160&h=160&fit=crop&q=80',
          alt: t('buyerCabinet_thumbFlatRoofHouse'),
        },
      ],
    },
    {
      variant: 'auction',
      areaLabel: t('buyerCabinet_directionAreaPlatform'),
      headline: t('buyerCabinet_directionHeadlineAuction'),
      subCardTitle: t('buyerCabinet_directionAuctionTitle'),
      subCardSubtitle: t('buyerCabinet_directionAuctionSubtitle'),
      to: '/auction',
      moreCount: 6,
      thumbnails: [
        {
          src: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=160&h=160&fit=crop&q=80',
          alt: t('buyerCabinet_thumbCountryCottage'),
        },
        {
          src: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=160&h=160&fit=crop&q=80',
          alt: t('buyerCabinet_thumbFacade'),
        },
        {
          src: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=160&h=160&fit=crop&q=80',
          alt: t('buyerCabinet_thumbLawnHouse'),
        },
      ],
    },
    {
      variant: 'debts',
      areaLabel: t('buyerCabinet_directionAreaFinance'),
      headline: t('buyerCabinet_directionHeadlineDebts'),
      subCardTitle: t('buyerCabinet_directionDebtsTitle'),
      subCardSubtitle: t('buyerCabinet_directionDebtsSubtitle'),
      to: '/debts',
      moreCount: 5,
      thumbnails: [
        {
          src: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=160&h=160&fit=crop&q=80',
          alt: t('buyerCabinet_thumbLivingRoom'),
        },
        {
          src: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=160&h=160&fit=crop&q=80',
          alt: t('buyerCabinet_thumbMultiStoreyHouse'),
        },
        {
          src: 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=160&h=160&fit=crop&q=80',
          alt: t('buyerCabinet_thumbResidentialArchitecture'),
        },
      ],
    },
  ]
}

function buildMainCards(t) {
  return [
    {
      title: t('buyerCabinet_cardDataTitle'),
      description: t('buyerCabinet_cardDataSubtitle'),
      sheet: 'data',
      icon: UserRound,
      accent: 'teal',
    },
    {
      title: t('buyerCabinet_cardHistoryTitle'),
      description: t('buyerCabinet_cardHistorySubtitle'),
      to: '/history',
      icon: LucideHistory,
      accent: 'ocean',
    },
    {
      title: t('buyerCabinet_cardBookingsTitle'),
      description: t('buyerCabinet_cardBookingsSubtitle'),
      to: '/profile/bookings',
      sheet: 'bookings',
      icon: CalendarDays,
      accent: 'violet',
    },
    {
      title: t('buyerCabinet_tileDepositTitle'),
      description: t('buyerCabinet_tileDepositDescription'),
      to: '/deposit',
      icon: Wallet,
      accent: 'amber',
    },
    {
      title: t('buyerCabinet_cardSubscriptionsTitle'),
      description: t('buyerCabinet_cardSubscriptionsSubtitle'),
      to: '/subscriptions',
      sheet: 'subscriptions',
      icon: Sparkles,
      accent: 'rose',
    },
    {
      title: t('buyerCabinet_cardChatTitle'),
      description: t('buyerCabinet_cardChatSubtitle'),
      action: 'managerChat',
      icon: MessagesSquare,
      accent: 'jade',
    },
  ]
}

function buildQuickLinks(t) {
  return {
    primary: [
      { title: t('buyerCabinet_quickFavoritesTitle'), subtitle: t('buyerCabinet_quickFavoritesSubtitle'), to: '/favorites', icon: FiHeart },
      { title: t('buyerCabinet_quickMapTitle'), subtitle: t('buyerCabinet_quickMapSubtitle'), to: '/map', icon: FiMap },
    ],
    logout: {
      title: t('buyerCabinet_quickLogoutTitle'),
      subtitle: t('buyerCabinet_quickLogoutSubtitle'),
      icon: FiLogOut,
      action: 'logout',
    },
  }
}

function formatDateRange(start, end, locale) {
  try {
    const s = new Date(`${start}T12:00:00`)
    const e = new Date(`${end}T12:00:00`)
    const o = { day: 'numeric', month: 'short', year: 'numeric' }
    return `${s.toLocaleDateString(locale, o)} — ${e.toLocaleDateString(locale, o)}`
  } catch {
    return `${start} — ${end}`
  }
}

/** Группирует элементы истории по календарному дню (уже отсортированы по дате убыв.). */
function groupHistoryItemsByDay(items) {
  const groups = []
  for (const item of items) {
    const dk = item.dayKey != null && item.dayKey !== undefined ? String(item.dayKey) : ''
    const last = groups[groups.length - 1]
    if (!last || last.dayKey !== dk) {
      groups.push({ dayKey: dk, items: [item] })
    } else {
      last.items.push(item)
    }
  }
  return groups
}

function TestPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t, i18n } = useTranslation()
  const { user, isLoaded } = useUser()
  const { signOut } = useClerk()
  const {
    numericUserId,
    publicIdDisplay,
    historyCount,
    recentHistoryRows,
    historySections,
    historyLoading,
    subscriptionPlanLabel,
    cabinetSubscriptionTier,
    cabinetVipActive,
  } = useCabinetOverviewData()
  const directionSummaries = useMemo(() => buildDirectionSummaries(t), [t])
  const mainCards = useMemo(() => buildMainCards(t), [t])
  const { quickLinksPrimary, quickLogoutLink } = useMemo(() => {
    const { primary, logout } = buildQuickLinks(t)
    return { quickLinksPrimary: primary, quickLogoutLink: logout }
  }, [t])
  const QuickLogoutIcon = quickLogoutLink.icon
  const locale = useMemo(() => (i18n.language === 'en' ? 'en-US' : i18n.language), [i18n.language])
  const moneyLocale = useMemo(() => {
    const raw = (i18n.language || 'en').split('-')[0]
    const map = { ru: 'ru-RU', en: 'en-US', de: 'de-DE', es: 'es-ES', fr: 'fr-FR', sv: 'sv-SE' }
    return map[raw] || 'en-US'
  }, [i18n.language])

  /** State из хука может отставать от localStorage на первом кадре — для онбординга и % нужен синхронный id. */
  const resolvedNumericUserId = numericUserId ?? getStoredNumericUserId()

  const showBuyerCabinetSkeleton = useMemo(
    () => !isLoaded || (resolvedNumericUserId != null && historyLoading),
    [isLoaded, resolvedNumericUserId, historyLoading],
  )

  const [dataSheetOpen, setDataSheetOpen] = useState(false)
  const [historySheetOpen, setHistorySheetOpen] = useState(false)
  const [historySearchQuery, setHistorySearchQuery] = useState('')
  const [subscriptionSheetOpen, setSubscriptionSheetOpen] = useState(false)
  const [bookingsSheetOpen, setBookingsSheetOpen] = useState(false)
  const [isManagerChatOpen, setIsManagerChatOpen] = useState(false)
  const [managerChatInput, setManagerChatInput] = useState('')
  const [subscriptionSheetLoading, setSubscriptionSheetLoading] = useState(false)
  const [subscriptionSheetState, setSubscriptionSheetState] = useState(null)
  const [subscriptionUpgradeLoading, setSubscriptionUpgradeLoading] = useState(false)
  const [bookingsSheetLoading, setBookingsSheetLoading] = useState(false)
  const [bookingsSheetRows, setBookingsSheetRows] = useState([])
  const [ownerCommentCountsByBooking, setOwnerCommentCountsByBooking] = useState({})
  const [testDriveCancelBooking, setTestDriveCancelBooking] = useState(null)
  const [checkInBookingId, setCheckInBookingId] = useState(null)
  const visibleBookingsSheetRows = useMemo(
    () =>
      bookingsSheetRows.filter((b) => {
        const statusKey = String(b?.status || '').toLowerCase()
        const cancelledBy = String(b?.cancelled_by || '').toLowerCase()
        return !(statusKey === 'cancelled' && cancelledBy === 'buyer')
      }),
    [bookingsSheetRows],
  )
  const [ownerCommentModalBooking, setOwnerCommentModalBooking] = useState(null)
  const [dbUserRow, setDbUserRow] = useState(null)
  const [dbUserLoading, setDbUserLoading] = useState(false)
  const [verificationStatusHydrated, setVerificationStatusHydrated] = useState(false)
  const [profileForm, setProfileForm] = useState(emptyProfileForm)
  const [savingField, setSavingField] = useState(null)
  /** После успешного сохранения поля на сервер — показываем галочку у инпута, до следующего изменения. */
  const [profileFieldSavedOk, setProfileFieldSavedOk] = useState({})
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false)
  const [countrySearchQuery, setCountrySearchQuery] = useState('')
  const [profileSaveAllLoading, setProfileSaveAllLoading] = useState(false)
  const [savePulseDismissed, setSavePulseDismissed] = useState(false)
  const [isRecognizingPassport, setIsRecognizingPassport] = useState(false)
  const [passportPhotoHints, setPassportPhotoHints] = useState([])
  const [isSavingExtractPatch, setIsSavingExtractPatch] = useState(false)
  const [showPassportRecognitionModal, setShowPassportRecognitionModal] = useState(false)
  const [extractedPassportData, setExtractedPassportData] = useState(null)
  const [verificationStatus, setVerificationStatus] = useState(null)
  const [profileCompletionExpanded, setProfileCompletionExpanded] = useState(false)
  const [toastGuideStep, setToastGuideStep] = useState(0)
  /** После клика по строке в тосте — скрываем тост, чтобы не перекрывал поля ввода. */
  const [profileCompletionToastDismissedForInput, setProfileCompletionToastDismissedForInput] = useState(false)
  const [showProfileCompleteCelebration, setShowProfileCompleteCelebration] = useState(false)
  const [subscriptionCheckoutCelebration, setSubscriptionCheckoutCelebration] = useState(false)
  const [vipClubCheckoutCelebration, setVipClubCheckoutCelebration] = useState(false)
  /** Конфетти на поздравлении: ~5 с генерации, потом только долёт существующих частиц. */
  const [subscriptionConfettiRecycle, setSubscriptionConfettiRecycle] = useState(true)
  const [showServiceQuickLinksTour, setShowServiceQuickLinksTour] = useState(false)
  const [serviceTourAcknowledged, setServiceTourAcknowledged] = useState(false)
  const [isSellObjectPromptOpen, setIsSellObjectPromptOpen] = useState(false)
  const [windowSize, setWindowSize] = useState(() =>
    typeof window !== 'undefined' ? { width: window.innerWidth, height: window.innerHeight } : { width: 0, height: 0 },
  )
  const [profileReferralCopied, setProfileReferralCopied] = useState(false)
  const profileReferralCopyTimerRef = useRef(null)

  const profileReferralUrl = useMemo(() => {
    if (!resolvedNumericUserId || typeof window === 'undefined') return ''
    return `${window.location.origin}/?ref=${resolvedNumericUserId}`
  }, [resolvedNumericUserId])

  const copyProfileReferralLink = useCallback(() => {
    if (!profileReferralUrl || !navigator.clipboard?.writeText) return
    void navigator.clipboard.writeText(profileReferralUrl).then(() => {
      setProfileReferralCopied(true)
      if (profileReferralCopyTimerRef.current) clearTimeout(profileReferralCopyTimerRef.current)
      profileReferralCopyTimerRef.current = setTimeout(() => setProfileReferralCopied(false), 2600)
    })
  }, [profileReferralUrl])

  useEffect(
    () => () => {
      if (profileReferralCopyTimerRef.current) clearTimeout(profileReferralCopyTimerRef.current)
    },
    [],
  )

  const dbUserRowRef = useRef(dbUserRow)
  const dataTileRef = useRef(null)
  const profileCompletionToastRef = useRef(null)
  const profileToastHeaderRef = useRef(null)
  const profileToastFirstMissingRef = useRef(null)
  const dataHydratedForSheetRef = useRef(false)
  const saveTimersRef = useRef({})
  const persistFieldRef = useRef(async () => {})
  const passportInputRef = useRef(null)
  const countryFieldRef = useRef(null)
  const serviceTourTimerRef = useRef(null)
  const directionSummariesGridRef = useRef(null)
  const directionSharesRef = useRef(null)
  const directionAuctionRef = useRef(null)
  const directionDebtsRef = useRef(null)
  /** Те же ref, что direction* — на случай старой разметки с именами quickLink* (избегает ReferenceError). */
  const quickLinkSharesRef = directionSharesRef
  const quickLinkAuctionRef = directionAuctionRef
  const quickLinkDebtsRef = directionDebtsRef

  const sortedCountries = useMemo(
    () => [...countryList].sort((a, b) => a.name.localeCompare(b.name, 'ru')),
    [],
  )
  const phoneCodeByCountryName = useMemo(() => {
    const map = new Map()
    for (const item of phoneCountryCodes) {
      const key = normalizeCountryNameForPhoneCode(item.name)
      if (!key || !item.code) continue
      if (!map.has(key)) map.set(key, `+${item.code}`)
    }
    map.set('сша', '+1')
    map.set('канада', '+1')
    map.set('сша канада', '+1')
    map.set('россия', '+7')
    map.set('казахстан', '+7')
    return map
  }, [])
  const countryIsoByName = useMemo(() => {
    const map = new Map()
    for (const c of countryList) {
      map.set(normalizeCountryNameForPhoneCode(c.name), c.code)
    }
    return map
  }, [])
  const filteredCountries = useMemo(() => {
    const q = countrySearchQuery.trim().toLowerCase()
    if (!q) return sortedCountries
    return sortedCountries.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q),
    )
  }, [countrySearchQuery, sortedCountries])

  /** Подсказка на тост: один раз за открытие панели «Данные»; сбрасывается при закрытии панели. */
  const toastHintShownThisDataOpenRef = useRef(false)
  const prevDataSheetOpenRef = useRef(false)

  const clearAllProfileSaveTimers = useCallback(() => {
    Object.keys(saveTimersRef.current).forEach((k) => {
      clearTimeout(saveTimersRef.current[k])
      delete saveTimersRef.current[k]
    })
  }, [])

  const handleQuickLogout = useCallback(async () => {
    if (!window.confirm(t('buyerCabinet_logoutConfirm'))) {
      return
    }
    sessionStorage.setItem('clerk_logout_in_progress', 'true')
    try {
      if (user && signOut) {
        await signOut({ redirectUrl: `${window.location.origin}/` })
      }
    } catch (e) {
      console.warn('TestPage Clerk signOut:', e)
    }
    try {
      await logout()
    } catch (e) {
      console.warn('TestPage logout:', e)
    } finally {
      sessionStorage.removeItem('clerk_logout_in_progress')
    }
    window.location.assign('/')
  }, [user, signOut, t])

  const handleBecomeSellerRegister = useCallback(async () => {
    try {
      sessionStorage.setItem('login_modal_mode', 'register')
      sessionStorage.setItem('login_modal_user_role', 'seller')
    } catch {
      /* ignore storage errors */
    }
    sessionStorage.setItem('clerk_logout_in_progress', 'true')
    try {
      if (user && signOut) {
        await signOut()
      }
    } catch (e) {
      console.warn('TestPage become seller signOut:', e)
    }
    try {
      await logout()
    } catch (e) {
      console.warn('TestPage become seller logout:', e)
    } finally {
      sessionStorage.removeItem('clerk_logout_in_progress')
    }
    requestOpenLoginModal({ wizard: false })
    navigate('/', { replace: true })
  }, [user, signOut, navigate])

  const handleSellObjectFromHistory = useCallback(async () => {
    const role = String(
      localStorage.getItem('userRole') || getUserData()?.role || 'buyer'
    ).toLowerCase()
    if (role === 'seller' || role === 'owner') {
      navigate('/owner/property/new')
      return
    }
    await handleBecomeSellerRegister()
  }, [handleBecomeSellerRegister, navigate])

  const historyPurchaseTermsBySection = useCallback((sectionKey) => {
    if (sectionKey === 'auction') {
      return 'Условия: победа в торгах, оплата депозита в срок и завершение сделки.'
    }
    if (sectionKey === 'reserve') {
      return 'Условия: резерв 10% и последующая полная оплата объекта.'
    }
    if (sectionKey === 'shares') {
      return 'Условия: фиксируются количество долей и цена за долю на дату покупки.'
    }
    return ''
  }, [])

  const filteredHistorySections = useMemo(() => {
    const q = historySearchQuery.trim().toLowerCase()
    if (!q) return historySections
    return historySections
      .map((sec) => ({
        ...sec,
        items: sec.items.filter((item) => {
          const hay = `${item.title || ''} ${item.subtitle || ''} ${item.location || ''}`.toLowerCase()
          return hay.includes(q)
        }),
      }))
      .filter((sec) => sec.items.length > 0)
  }, [historySections, historySearchQuery])

  const formatHistoryDayLabel = useCallback(
    (dayKey) => {
      if (!dayKey || !String(dayKey).trim()) {
        return t('buyerCabinet_historyDateUnknown')
      }
      const d = new Date(`${dayKey}T12:00:00`)
      if (!Number.isFinite(d.getTime())) {
        return t('buyerCabinet_historyDateUnknown')
      }
      return d.toLocaleDateString(locale, {
        weekday: 'short',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    },
    [locale, t],
  )

  const historyTypeBadgeLabel = useCallback(
    (sectionKey) => {
      switch (sectionKey) {
        case 'auction':
          return t('buyerCabinet_historyBadgeAuction')
        case 'reserve':
          return t('buyerCabinet_historyBadgeReserve')
        case 'shares':
          return t('buyerCabinet_historyBadgeShares')
        case 'bids':
          return t('buyerCabinet_historyBadgeBids')
        default:
          return ''
      }
    },
    [t],
  )

  const handleSellObjectPromptConfirm = useCallback(async () => {
    setIsSellObjectPromptOpen(false)
    await handleSellObjectFromHistory()
  }, [handleSellObjectFromHistory])

  useEffect(() => {
    dbUserRowRef.current = dbUserRow
  }, [dbUserRow])

  useEffect(() => {
    return () => {
      Object.values(saveTimersRef.current).forEach((id) => clearTimeout(id))
      if (serviceTourTimerRef.current) {
        clearTimeout(serviceTourTimerRef.current)
        serviceTourTimerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!countryDropdownOpen) return undefined
    const onPointerDownOutside = (event) => {
      if (!countryFieldRef.current) return
      if (countryFieldRef.current.contains(event.target)) return
      setCountryDropdownOpen(false)
    }
    document.addEventListener('mousedown', onPointerDownOutside)
    document.addEventListener('touchstart', onPointerDownOutside)
    return () => {
      document.removeEventListener('mousedown', onPointerDownOutside)
      document.removeEventListener('touchstart', onPointerDownOutside)
    }
  }, [countryDropdownOpen])

  useEffect(() => {
    if (!historySheetOpen) {
      setHistorySearchQuery('')
    }
  }, [historySheetOpen])

  useEffect(() => {
    if (!dataSheetOpen) {
      setCountryDropdownOpen(false)
      setCountrySearchQuery('')
    }
  }, [dataSheetOpen])

  useEffect(() => {
    if (!isLoaded) return
    if (!isSiteUserSignedIn(user, isLoaded)) {
      requestOpenLoginModal({ wizard: true })
      navigate('/', { replace: true })
    }
  }, [isLoaded, user, navigate])

  const loadVerificationStatus = useCallback(async (force = false) => {
    const id = numericUserId ?? getStoredNumericUserId()
    if (!id) return
    try {
      const s = await fetchVerificationStatus(API_BASE_URL, id, { ttlMs: 20000, force })
      if (s) setVerificationStatus(s)
    } catch {
      /* ignore */
    } finally {
      setVerificationStatusHydrated(true)
    }
  }, [numericUserId])

  useEffect(() => {
    if (resolvedNumericUserId == null || resolvedNumericUserId === '') {
      setServiceTourAcknowledged(false)
      return
    }
    setServiceTourAcknowledged(readServiceTourAck(String(resolvedNumericUserId)))
  }, [resolvedNumericUserId])

  useEffect(() => {
    if (!resolvedNumericUserId) return
    setVerificationStatusHydrated(false)
    void loadVerificationStatus(false)
    const onPush = () => void loadVerificationStatus(true)
    window.addEventListener('verification-status-update', onPush)
    return () => window.removeEventListener('verification-status-update', onPush)
  }, [resolvedNumericUserId, loadVerificationStatus])

  /** Профиль с API до открытия «Данные» — корректный % заполнения и подсказки сразу после входа. */
  useEffect(() => {
    if (!resolvedNumericUserId) return
    let cancelled = false
    fetchUserById(API_BASE_URL, resolvedNumericUserId)
      .then((u) => {
        if (cancelled || !u) return
        setDbUserRow((prev) => prev ?? u)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [resolvedNumericUserId])

  useEffect(() => {
    if (!dataSheetOpen || !resolvedNumericUserId) return
    void loadVerificationStatus(true)
  }, [dataSheetOpen, resolvedNumericUserId, loadVerificationStatus])

  useEffect(() => {
    if (!dataSheetOpen || !resolvedNumericUserId) return
    let cancelled = false
    setDbUserLoading(true)
    fetchUserById(API_BASE_URL, resolvedNumericUserId)
      .then((u) => {
        if (cancelled) return
        setDbUserRow(u)
      })
      .finally(() => {
        if (!cancelled) setDbUserLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [dataSheetOpen, resolvedNumericUserId])

  useEffect(() => {
    if (!subscriptionSheetOpen || !numericUserId) return
    let cancelled = false
    setSubscriptionSheetLoading(true)
    fetch(`${API_BASE_URL}/users/${numericUserId}/subscription-billing`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return
        const sub = json?.success && json?.data ? json.data.subscription : null
        setSubscriptionSheetState(sub)
      })
      .catch(() => {
        if (!cancelled) setSubscriptionSheetState(null)
      })
      .finally(() => {
        if (!cancelled) setSubscriptionSheetLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [subscriptionSheetOpen, numericUserId])

  const refetchSubscriptionBillingState = useCallback(async () => {
    const uid = numericUserId ?? getStoredNumericUserId()
    if (!uid) return
    try {
      const res = await fetch(`${API_BASE_URL}/users/${uid}/subscription-billing`)
      const json = await res.json()
      const sub = json?.success && json?.data ? json.data.subscription : null
      setSubscriptionSheetState(sub)
      if (json?.success) {
        window.dispatchEvent(new CustomEvent(SUBSCRIPTION_BILLING_UPDATED_EVENT))
      }
    } catch {
      /* ignore */
    }
  }, [numericUserId])

  useEffect(() => {
    if (searchParams.get('data') !== '1') return
    const highlight = searchParams.get('highlight')
    setDataSheetOpen(true)
    setHistorySheetOpen(false)
    setSubscriptionSheetOpen(false)
    setBookingsSheetOpen(false)
    const next = new URLSearchParams(searchParams)
    next.delete('data')
    next.delete('highlight')
    const qs = next.toString()
    navigate({ pathname: '/profile', search: qs ? `?${qs}` : '' }, { replace: true })
    if (highlight) {
      window.setTimeout(() => {
        const wrap = document.getElementById(`test-profile-field-wrap-${highlight}`)
        const input = document.getElementById(`profile-field-${highlight}`)
        if (!wrap) return
        wrap.scrollIntoView({ behavior: 'smooth', block: 'center' })
        wrap.classList.add('test-data-field--focus-hint')
        window.setTimeout(() => wrap.classList.remove('test-data-field--focus-hint'), 2200)
        window.setTimeout(() => input?.focus?.({ preventScroll: true }), 450)
      }, 600)
    }
  }, [searchParams, navigate])

  /** Возврат с Stripe Checkout Pro: подтверждение сессии и поздравление на профиле (как после верификации). */
  useEffect(() => {
    const celebrationFlag = searchParams.get('subscription_celebration') === '1'
    const checkout = searchParams.get('subscription_checkout')
    const sessionId = searchParams.get('session_id')

    if (celebrationFlag) {
      void refetchSubscriptionBillingState()
      setVipClubCheckoutCelebration(false)
      setSubscriptionCheckoutCelebration(true)
      navigate('/profile', { replace: true })
      return
    }

    if (checkout !== 'success' || !sessionId || !sessionId.startsWith('cs_')) return

    const wantsVipClubCelebration = searchParams.get('vip_club') === '1'

    let cancelled = false
    void (async () => {
      const r = await confirmCheckoutSession(sessionId)
      if (cancelled) return
      if (r.ok) {
        await refetchSubscriptionBillingState()
        if (!cancelled) {
          setVipClubCheckoutCelebration(wantsVipClubCelebration)
          setSubscriptionCheckoutCelebration(true)
        }
      } else {
        showNotification(
          r.error === 'no_app_user_id'
            ? t('buyerSubs_checkoutErrorSupport')
            : t('buyerSubs_checkoutErrorPending'),
          'error'
        )
      }
      if (!cancelled) navigate('/profile', { replace: true })
    })()
    return () => {
      cancelled = true
    }
  }, [searchParams, navigate, t, refetchSubscriptionBillingState])

  const refetchBookingsSheetRows = useCallback(() => {
    if (!numericUserId) {
      setBookingsSheetRows([])
      setOwnerCommentCountsByBooking({})
      setBookingsSheetLoading(false)
      return Promise.resolve()
    }
    setBookingsSheetLoading(true)
    return Promise.all([
      fetch(`${API_BASE_URL}/test-drive-bookings/user/${numericUserId}`).then((r) =>
        r.json().catch(() => ({})),
      ),
      fetch(`${API_BASE_URL}/notifications/user/${numericUserId}/unread`).then((r) =>
        r.json().catch(() => ({})),
      ),
    ])
      .then(([bookingsJson, notificationsJson]) => {
        const rows = bookingsJson?.success && Array.isArray(bookingsJson.data) ? bookingsJson.data : []
        const notifications =
          notificationsJson?.success && Array.isArray(notificationsJson.data) ? notificationsJson.data : []
        const ownerCommentCounts = {}
        for (const n of notifications) {
          if (String(n?.type || '') !== 'test_drive_result') continue
          const data = n?.data || {}
          const bookingId = data?.booking_id
          if (!Boolean(String(data?.owner_comment || '').trim()) || bookingId == null) continue
          const key = String(bookingId)
          ownerCommentCounts[key] = (ownerCommentCounts[key] || 0) + 1
        }
        setOwnerCommentCountsByBooking(ownerCommentCounts)
        setBookingsSheetRows(rows)
      })
      .catch(() => {
        setBookingsSheetRows([])
        setOwnerCommentCountsByBooking({})
      })
      .finally(() => {
        setBookingsSheetLoading(false)
      })
  }, [numericUserId])

  useEffect(() => {
    if (!bookingsSheetOpen) return
    void refetchBookingsSheetRows()
  }, [bookingsSheetOpen, refetchBookingsSheetRows])

  useEffect(() => {
    if (
      !dataSheetOpen &&
      !historySheetOpen &&
      !subscriptionSheetOpen &&
      !bookingsSheetOpen &&
      !isManagerChatOpen
    )
      return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setDataSheetOpen(false)
        setHistorySheetOpen(false)
        setSubscriptionSheetOpen(false)
        setBookingsSheetOpen(false)
        setIsManagerChatOpen(false)
        setOwnerCommentModalBooking(null)
        setManagerChatInput('')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    bookingsSheetOpen,
    dataSheetOpen,
    historySheetOpen,
    isManagerChatOpen,
    subscriptionSheetOpen,
  ])

  const userData = useMemo(() => getUserData(), [])
  const isLoggedIn = isSiteUserSignedIn(user, isLoaded)
  const getChatUserId = useMemo(() => {
    if (isLoggedIn) {
      const freshUserData = getUserData()
      const storedUserId = freshUserData?.id || localStorage.getItem('userId')
      if (storedUserId) return `user_${storedUserId}`
    }
    let sessionId = localStorage.getItem('chatSessionId')
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('chatSessionId', sessionId)
    }
    return sessionId
  }, [isLoggedIn, user, isLoaded])

  const {
    liveChatToken,
    managerConnecting,
    managerMessagesRef,
    managerThreadUi,
    enterLiveManagerChat,
    pauseManagerPolling,
    sendManagerMessage,
  } = useManagerLiveChat(getChatUserId, t)

  const openManagerChatModal = useCallback(async () => {
    if (!isSiteUserSignedIn(user, isLoaded)) {
      requestOpenLoginModal({ wizard: true })
      return
    }
    setIsManagerChatOpen(true)
    try {
      await enterLiveManagerChat()
    } catch {
      setIsManagerChatOpen(false)
    }
  }, [enterLiveManagerChat, isLoaded, user])

  const closeManagerChatModal = useCallback(() => {
    setIsManagerChatOpen(false)
    setManagerChatInput('')
    pauseManagerPolling()
  }, [pauseManagerPolling])

  useEffect(() => {
    if (!isManagerChatOpen) pauseManagerPolling()
  }, [isManagerChatOpen, pauseManagerPolling])

  const fullName =
    user?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    userData.name ||
    'Пользователь'
  const idForChip =
    publicIdDisplay ??
    (() => {
      const raw = localStorage.getItem('userId') || userData.id
      return raw && String(raw).trim() !== '' ? String(raw).trim() : null
    })() ??
    '—'
  const roleRaw = userData.role || localStorage.getItem('userRole') || 'buyer'
  const roleLabel = roleRaw === 'seller' || roleRaw === 'owner' ? 'Продавец' : 'Покупатель'

  const email =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    ''

  const subscriptionProfileVisual = useMemo(() => {
    if (subscriptionSheetState) return effectivePurchasedTier(subscriptionSheetState)
    return cabinetSubscriptionTier
  }, [subscriptionSheetState, cabinetSubscriptionTier])

  const handleSubscriptionPlanSubscribe = useCallback(async (plan, billingCycle = 'monthly') => {
    if (plan === 'starter') {
      showNotification(t('buyerCabinet_toastStarter'), 'info')
      return
    }
    if (plan === 'pro') {
      const tier = subscriptionProfileVisual
      if (tier === 'pro' || tier === 'vip') {
        showNotification(t('buyerCabinet_toastDuplicateSubscription'), 'info')
        return
      }
      setSubscriptionUpgradeLoading(true)
      try {
        const ud = getUserData()
        const uid = ud?.id ?? localStorage.getItem('userId')
        const result = await startProSubscriptionCheckout({
          userId: uid,
          customerEmail: ud?.email,
          billingCycle,
        })
        if (!result.ok) {
          const msg =
            result.error === 'already_subscribed_pro'
              ? t('buyerCabinet_toastDuplicateSubscription')
              : result.error || t('buyerCabinet_checkoutError')
          showNotification(msg, result.error === 'already_subscribed_pro' ? 'info' : 'error')
        }
      } finally {
        setSubscriptionUpgradeLoading(false)
      }
      return
    }
    if (plan === 'vip') {
      if (subscriptionProfileVisual === 'vip') {
        showNotification(t('privateClubVipAlready'), 'info')
        return
      }
      setSubscriptionUpgradeLoading(true)
      try {
        const ud = getUserData()
        const uid = ud?.id ?? localStorage.getItem('userId')
        const result = await startVipSubscriptionCheckout({
          userId: uid,
          customerEmail: ud?.email,
          billingCycle,
        })
        if (!result.ok) {
          const msg =
            result.error === 'already_subscribed_vip'
              ? t('privateClubVipAlready')
              : result.error === 'already_subscribed_pro'
                ? t('buyerCabinet_toastDuplicateSubscription')
                : result.error || t('buyerCabinet_checkoutError')
          showNotification(msg, result.error === 'already_subscribed_vip' ? 'info' : 'error')
        }
      } finally {
        setSubscriptionUpgradeLoading(false)
      }
    }
  }, [subscriptionProfileVisual, t])

  const completionForm = useMemo(() => {
    if (dbUserRow) {
      return buildProfileFormFromRow(dbUserRow, user, email)
    }
    return {
      ...profileForm,
      first_name: profileForm.first_name || user?.firstName || '',
      last_name: profileForm.last_name || user?.lastName || '',
      email: profileForm.email || email || '',
    }
  }, [dbUserRow, profileForm, user, email])

  /** Снимок для «всё заполнено»: актуальные правки в profileForm поверх completionForm (из БД). */
  const completionFormMerged = useMemo(
    () => ({ ...completionForm, ...profileForm }),
    [completionForm, profileForm],
  )

  useEffect(() => {
    if (!dataSheetOpen) {
      dataHydratedForSheetRef.current = false
      return
    }
    if (dbUserLoading || !dbUserRow) return
    if (dataHydratedForSheetRef.current) return
    const form = buildProfileFormFromRow(dbUserRow, user, email)
    setProfileForm(form)
    dataHydratedForSheetRef.current = true
    const initialSaved = {}
    for (const f of PROFILE_FIELDS_META) {
      if (isProfileFieldFilledFromFormOnly(f.key, form)) {
        initialSaved[f.key] = true
      }
    }
    setProfileFieldSavedOk((prev) => ({ ...prev, ...initialSaved }))
  }, [dataSheetOpen, dbUserLoading, dbUserRow, user, email])

  useEffect(() => {
    if (!dataSheetOpen) {
      setProfileCompletionExpanded(false)
      setToastGuideStep(0)
    }
  }, [dataSheetOpen])

  const persistField = useCallback(
    async (fieldKey, rawValue) => {
      const persistUserId = numericUserId ?? getStoredNumericUserId()
      if (!persistUserId) return
      const row = dbUserRowRef.current
      if (!row) return

      if (isProfileFieldUnchanged(fieldKey, rawValue, row)) return
      if (fieldKey === 'phone' && phoneDigits(rawValue).length < 8) return
      if (
        fieldKey === 'identification_number' &&
        String(rawValue || '').trim() &&
        isSpainCountry(profileForm.country) &&
        !isValidSpainDniNie(rawValue)
      ) {
        showNotification(t('buyerData_invalidDniNie'), 'error')
        setProfileFieldSavedOk((prev) => ({ ...prev, [fieldKey]: false }))
        return
      }

      const apiKey = profileFieldToApiKey(fieldKey)
      const body = { [apiKey]: toApiPayloadValue(fieldKey, rawValue) }

      setSavingField(fieldKey)
      try {
        const res = await fetch(`${API_BASE_URL}/users/${persistUserId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const json = await res.json().catch(() => ({}))

        if (json.requiresVerification) {
          showNotification(
            json.error ||
              'Для смены email нужно подтвердить адрес. Письмо может быть отправлено на почту.',
            'info',
          )
          setProfileForm((prev) => ({ ...prev, email: row.email ?? '' }))
          return
        }

        if (res.status === 409) {
          showNotification(json.error || 'Пользователь с таким email уже существует', 'error')
          setProfileForm((prev) => ({ ...prev, email: row.email ?? '' }))
          return
        }

        if (!res.ok) {
          throw new Error(json.error || 'Не удалось сохранить')
        }
        if (!json.success || !json.data) {
          throw new Error(json.error || 'Не удалось сохранить')
        }

        setDbUserRow(json.data)
        setProfileFieldSavedOk((prev) => ({ ...prev, [fieldKey]: true }))
        invalidateUserByIdCache(API_BASE_URL, persistUserId)
        invalidateVerificationStatusCache(API_BASE_URL, persistUserId)
        void loadVerificationStatus(true)
      } catch (e) {
        showNotification(e.message || 'Ошибка сохранения', 'error')
        setProfileForm(buildProfileFormFromRow(row, user, email))
        setProfileFieldSavedOk((prev) => ({ ...prev, [fieldKey]: false }))
      } finally {
        setSavingField(null)
      }
    },
    [numericUserId, user, email, loadVerificationStatus, profileForm.country, t],
  )

  useEffect(() => {
    persistFieldRef.current = persistField
  }, [persistField])

  const scheduleProfileSave = useCallback((fieldKey, value) => {
    clearTimeout(saveTimersRef.current[fieldKey])
    saveTimersRef.current[fieldKey] = setTimeout(() => {
      void persistFieldRef.current(fieldKey, value)
      delete saveTimersRef.current[fieldKey]
    }, PROFILE_SAVE_DEBOUNCE_MS)
  }, [])

  const handleProfileChange = useCallback(
    (fieldKey) => (e) => {
      const raw = e.target.value
      const iso2 =
        fieldKey === 'phone'
          ? countryIsoByName.get(normalizeCountryNameForPhoneCode(profileForm.country || ''))
          : null
      const v = fieldKey === 'phone' ? formatPhoneAsYouType(raw, iso2) : raw
      setProfileForm((prev) => ({ ...prev, [fieldKey]: v }))
      setSavePulseDismissed(false)
      setProfileFieldSavedOk((prev) => ({ ...prev, [fieldKey]: false }))
      if (fieldKey !== 'email') {
        scheduleProfileSave(fieldKey, v)
      }
    },
    [countryIsoByName, profileForm.country, scheduleProfileSave],
  )

  const handleProfileBlur = useCallback((fieldKey) => (e) => {
    if (fieldKey === 'email') return
    clearTimeout(saveTimersRef.current[fieldKey])
    delete saveTimersRef.current[fieldKey]
    void persistFieldRef.current(fieldKey, e.target.value)
  }, [])

  const handleCountrySelect = useCallback(
    (countryName) => {
      const currentPhone = String(profileForm.phone || '').trim()
      const previousCountry = profileForm.country
      const nextPhone = replacePhoneDialCodeByCountry({
        currentPhone,
        previousCountry,
        nextCountry: countryName,
        phoneCodeByCountryName,
      })
      setProfileForm((prev) => {
        const next = { ...prev, country: countryName }
        if (nextPhone !== currentPhone) next.phone = nextPhone
        return next
      })
      setSavePulseDismissed(false)
      setProfileFieldSavedOk((prev) => ({ ...prev, country: false }))
      clearTimeout(saveTimersRef.current.country)
      delete saveTimersRef.current.country
      void persistFieldRef.current('country', countryName)
      if (nextPhone !== currentPhone) {
        setProfileFieldSavedOk((prev) => ({ ...prev, phone: false }))
        scheduleProfileSave('phone', nextPhone)
      }
      setCountryDropdownOpen(false)
      setCountrySearchQuery('')
    },
    [phoneCodeByCountryName, profileForm.phone, profileForm.country, scheduleProfileSave],
  )

  const handlePassportRecognition = useCallback(
    async (file) => {
      const uid = numericUserId ?? getStoredNumericUserId()
      if (!uid || !dbUserRowRef.current) {
        showNotification('Сначала дождитесь загрузки профиля', 'error')
        return
      }
      clearAllProfileSaveTimers()

      let extracted = null
      setIsRecognizingPassport(true)
      setPassportPhotoHints([])
      try {
        const photoValidation = await validatePassportImageFile(file)
        setPassportPhotoHints(photoValidation.hints)
        if (photoValidation.shouldBlock) {
          throw new Error(photoValidation.hints[0] || 'Нужно более качественное фото документа')
        }

        const tesseractModule = await import('tesseract.js')
        const recognize =
          tesseractModule.recognize ||
          tesseractModule.default?.recognize
        if (typeof recognize !== 'function') {
          throw new Error('OCR engine недоступен')
        }
        const {
          data: { text },
        } = await recognize(file, 'eng', {
          logger: () => {},
        })

        const passportTextCheck = evaluatePassportText(text)
        setPassportPhotoHints(passportTextCheck.hints)
        if (!passportTextCheck.isPassportLikely) {
          throw new Error('Не удалось подтвердить, что на фото именно паспорт. Попробуйте переснять документ крупнее.')
        }

        const response = await fetch(`${API_BASE_URL}/passport/extract`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recognizedText: text }),
        })

        if (!response.ok) {
          const errorPayload = await response.json().catch(() => null)
          throw new Error(errorPayload?.error || 'Ошибка при извлечении данных из паспорта')
        }

        const result = await response.json()
        if (!result.success || !result.data) {
          throw new Error('Не удалось извлечь данные из паспорта')
        }

        extracted = result.data
        setExtractedPassportData(extracted)
      } catch (error) {
        console.error('Ошибка распознавания паспорта:', error)
        showNotification(error.message || 'Не удалось распознать паспорт', 'error')
        setIsRecognizingPassport(false)
        return
      }

      setIsRecognizingPassport(false)

      const body = extractedPassportDataToApiPayload(extracted)
      if (Object.keys(body).length === 0) {
        showNotification('Не удалось извлечь поля с фото — попробуйте другое изображение', 'info')
        return
      }

      clearAllProfileSaveTimers()
      setProfileForm((prev) => mergeExtractedPassportIntoProfileForm(prev, extracted))

      setIsSavingExtractPatch(true)
      try {
        const userRes = await fetch(`${API_BASE_URL}/users/${uid}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const json = await userRes.json().catch(() => ({}))

        if (!userRes.ok || !json.success || !json.data) {
          throw new Error(json.error || 'Не удалось сохранить распознанные данные')
        }

        setDbUserRow(json.data)
        setProfileFieldSavedOk((prev) => {
          const next = { ...prev }
          for (const apiKey of Object.keys(body)) {
            const fieldKey = apiKey === 'phone_number' ? 'phone' : apiKey
            if (PROFILE_FIELDS_META.some((f) => f.key === fieldKey)) {
              next[fieldKey] = true
            }
          }
          return next
        })
        invalidateUserByIdCache(API_BASE_URL, uid)
        invalidateVerificationStatusCache(API_BASE_URL, uid)
        void loadVerificationStatus(true)
        setProfileForm(buildProfileFormFromRow(json.data, user, email))
        setShowPassportRecognitionModal(true)
      } catch (e) {
        showNotification(e.message || 'Ошибка сохранения', 'error')
        const row = dbUserRowRef.current
        if (row) setProfileForm(buildProfileFormFromRow(row, user, email))
      } finally {
        setIsSavingExtractPatch(false)
      }
    },
    [numericUserId, user, email, clearAllProfileSaveTimers, loadVerificationStatus],
  )

  const profileFieldsLocked = isRecognizingPassport || isSavingExtractPatch
  const isProfileFullyCompleted = PROFILE_FIELDS_META.every((f) =>
    isProfileFieldFilledFromFormOnly(f.key, completionFormMerged),
  )
  const shouldPulseSaveButton =
    dataSheetOpen &&
    !dbUserLoading &&
    !profileFieldsLocked &&
    !profileSaveAllLoading &&
    !savePulseDismissed &&
    isProfileFullyCompleted

  /** Явное «Сохранить»: проверка всех полей, один PUT на сервер, модалка «Поздравляем». */
  const handleProfilePanelSaveClick = useCallback(async () => {
    if (profileFieldsLocked || profileSaveAllLoading) return
    clearAllProfileSaveTimers()
    const form = completionFormMerged
    const missing = PROFILE_FIELDS_META.filter((f) => !isProfileFieldFilledFromFormOnly(f.key, form))
    if (missing.length > 0) {
      const names = missing
        .map((f) => {
          if (f.key === 'identification_number') {
            return t(getIdentificationLabelKeyByCountry(form.country))
          }
          return t(PROFILE_FIELD_I18N[f.key] || f.labelKey)
        })
        .join(', ')
      showNotification(`Заполните поля: ${names}`, 'info')
      return
    }
    if (
      isSpainCountry(form.country) &&
      !isValidSpainDniNie(form.identification_number)
    ) {
      showNotification(t('buyerData_invalidDniNie'), 'error')
      return
    }
    const persistUserId = numericUserId ?? getStoredNumericUserId()
    if (!persistUserId) {
      showNotification(t('buyerData_profileNotResolved'), 'error')
      return
    }
    const row = dbUserRowRef.current
    if (!row) {
      showNotification(t('buyerData_profileDataLoading'), 'info')
      return
    }
    const nextEmail = normalizedEmailValue(form.email)
    const prevEmail = normalizedEmailValue(row.email)
    const emailChanged = nextEmail !== prevEmail
    if (emailChanged) {
      const confirmed = window.confirm(
        'Вы действительно хотите изменить email? Старый адрес будет заменён новым.',
      )
      if (!confirmed) {
        return
      }
    }

    const body = {}
    for (const f of PROFILE_FIELDS_META) {
      const apiKey = profileFieldToApiKey(f.key)
      body[apiKey] = toApiPayloadValue(f.key, form[f.key] ?? '')
    }

    setProfileSaveAllLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/users/${persistUserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))

      if (json.requiresVerification) {
        showNotification(
          json.error ||
            'Для смены email нужно подтвердить адрес. Письмо может быть отправлено на почту.',
          'info',
        )
        setProfileForm((prev) => ({ ...prev, email: row.email ?? '' }))
        return
      }

      if (res.status === 409) {
        showNotification(json.error || 'Пользователь с таким email уже существует', 'error')
        setProfileForm((prev) => ({ ...prev, email: row.email ?? '' }))
        return
      }

      if (!res.ok) {
        const errText = String(json.error || '')
        if (res.status === 404 && errText.includes('не изменились')) {
          const fresh = await fetchUserById(API_BASE_URL, persistUserId)
          if (fresh) {
            setDbUserRow(fresh)
            setProfileForm(buildProfileFormFromRow(fresh, user, email))
            const allOk = Object.fromEntries(PROFILE_FIELDS_META.map((f) => [f.key, true]))
            setProfileFieldSavedOk((prev) => ({ ...prev, ...allOk }))
            setSavePulseDismissed(true)
            invalidateUserByIdCache(API_BASE_URL, persistUserId)
            invalidateVerificationStatusCache(API_BASE_URL, persistUserId)
            void loadVerificationStatus(true)
            setShowProfileCompleteCelebration(true)
          }
          return
        }
        throw new Error(json.error || 'Не удалось сохранить')
      }
      if (!json.success || !json.data) {
        throw new Error(json.error || 'Не удалось сохранить')
      }

      setDbUserRow(json.data)
      setProfileForm(buildProfileFormFromRow(json.data, user, email))
      const allOk = Object.fromEntries(PROFILE_FIELDS_META.map((f) => [f.key, true]))
      setProfileFieldSavedOk((prev) => ({ ...prev, ...allOk }))
      setSavePulseDismissed(true)
      invalidateUserByIdCache(API_BASE_URL, persistUserId)
      invalidateVerificationStatusCache(API_BASE_URL, persistUserId)
      void loadVerificationStatus(true)
      setShowProfileCompleteCelebration(true)
    } catch (e) {
      showNotification(e.message || 'Ошибка сохранения', 'error')
      setProfileForm(buildProfileFormFromRow(row, user, email))
    } finally {
      setProfileSaveAllLoading(false)
    }
  }, [
    profileFieldsLocked,
    profileSaveAllLoading,
    clearAllProfileSaveTimers,
    completionFormMerged,
    t,
    numericUserId,
    user,
    email,
    loadVerificationStatus,
    savePulseDismissed,
  ])

  const profileCompletionRows = useMemo(() => {
    if (!resolvedNumericUserId) return []
    const mf = normalizeVerificationMissingFields(verificationStatus?.missingFields)
    return PROFILE_FIELDS_META.map((f) => ({
      key: f.key,
      label:
        f.key === 'identification_number'
          ? t(getIdentificationLabelKeyByCountry(completionForm.country))
          : t(PROFILE_FIELD_I18N[f.key] || f.label),
      filled: isProfileFieldFilled(f.key, mf, completionForm),
    }))
  }, [verificationStatus, resolvedNumericUserId, completionForm, t])

  const profileCompletionStats = useMemo(() => {
    const total = PROFILE_FIELDS_META.length
    if (profileCompletionRows.length === 0) {
      return { filled: 0, total, pct: resolvedNumericUserId ? 0 : 100 }
    }
    const filled = profileCompletionRows.filter((r) => r.filled).length
    const pct = total === 0 ? 0 : Math.round((filled / total) * 100)
    return { filled, total, pct }
  }, [profileCompletionRows, resolvedNumericUserId])

  /**
   * Серверный progress + локальные строки: берём max, чтобы при отставании API после сохранения
   * полей всё равно доходили до 100% и срабатывали гейт/модалка поздравления.
   */
  const completionPctForOnboarding = useMemo(() => {
    const localPct = profileCompletionStats.pct
    const fromServer = verificationStatus?.progress
    if (typeof fromServer === 'number' && Number.isFinite(fromServer)) {
      return Math.min(100, Math.max(0, Math.max(fromServer, localPct)))
    }
    return localPct
  }, [verificationStatus, profileCompletionStats.pct])

  const needsProfileOnboarding = profileCompletionStats.pct < PROFILE_ONBOARDING_MIN_COMPLETE_PCT

  /** Пока профиль &lt; 78% — только сценарий подсказок, без обходных кликов по кабинету. */
  const profileGateActive =
    isLoaded &&
    isSiteUserSignedIn(user, isLoaded) &&
    Boolean(resolvedNumericUserId) &&
    verificationStatusHydrated &&
    needsProfileOnboarding

  /** Не требуем Clerk `user`: при регистрации по email сессия часто только локальная (isLoggedIn в userData). */
  const showTileDataOnboarding =
    profileGateActive &&
    !dataSheetOpen &&
    !showProfileCompleteCelebration &&
    !subscriptionCheckoutCelebration &&
    !showServiceQuickLinksTour

  /** Тост прогресса держим до 100%; порог 78% только для гейта и спотлайта (`needsProfileOnboarding`). */
  const showProfileCompletionWidget =
    Boolean(resolvedNumericUserId && profileCompletionRows.length > 0) &&
    profileCompletionStats.pct < 100
  const showProfileCompletionToast =
    dataSheetOpen && showProfileCompletionWidget && !profileCompletionToastDismissedForInput

  const firstMissingKey = useMemo(
    () => profileCompletionRows.find((r) => !r.filled)?.key ?? null,
    [profileCompletionRows],
  )

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  /** Важно: модалку «Поздравляем» показываем только после явного клика «Сохранить»
   * (см. handleProfilePanelSaveClick), а не при автосохранении по вводу. */

  useEffect(() => {
    if (dataSheetOpen) return
    setToastGuideStep(0)
    setProfileCompletionExpanded(false)
    toastHintShownThisDataOpenRef.current = false
    setProfileCompletionToastDismissedForInput(false)
    setProfileFieldSavedOk({})
  }, [dataSheetOpen])

  /** Каждый новый заход в «Данные» (после главной) — снова можно гайд по тосту; сбрасываем флаг перехода к полю. */
  useEffect(() => {
    if (!dataSheetOpen) {
      prevDataSheetOpenRef.current = false
      return
    }
    if (resolvedNumericUserId == null) return
    const wasOpen = prevDataSheetOpenRef.current
    if (!wasOpen) {
      try {
        sessionStorage.removeItem(`${TOAST_GUIDE_FIELD_NAV_DONE_PREFIX}${resolvedNumericUserId}`)
      } catch {
        /* ignore */
      }
      prevDataSheetOpenRef.current = true
    }
  }, [dataSheetOpen, resolvedNumericUserId])

  const scrollToProfileField = useCallback(
    (key) => {
      const run = () => {
        const wrap = document.getElementById(`test-profile-field-wrap-${key}`)
        const input = document.getElementById(`profile-field-${key}`)
        if (!wrap) return
        wrap.scrollIntoView({ behavior: 'smooth', block: 'center' })
        wrap.classList.add('test-data-field--focus-hint')
        window.setTimeout(() => wrap.classList.remove('test-data-field--focus-hint'), 2200)
        window.setTimeout(() => input?.focus?.({ preventScroll: true }), 450)
      }
      if (!dataSheetOpen) {
        setDataSheetOpen(true)
        window.setTimeout(run, 520)
      } else {
        run()
      }
    },
    [dataSheetOpen],
  )

  const handleToastHeaderClick = useCallback(() => {
    const strictToastGuide =
      profileGateActive &&
      dataSheetOpen &&
      showProfileCompletionToast &&
      !readToastGuideFieldNavDone(resolvedNumericUserId)
    if (strictToastGuide && toastGuideStep === 0) return
    if (toastGuideStep === 1) {
      setProfileCompletionExpanded(true)
      setToastGuideStep(2)
      return
    }
    if (toastGuideStep === 2 || toastGuideStep === 3) return
    setProfileCompletionExpanded((v) => !v)
  }, [
    toastGuideStep,
    profileGateActive,
    dataSheetOpen,
    showProfileCompletionToast,
    resolvedNumericUserId,
  ])

  const markToastGuideFieldNavDone = useCallback(() => {
    const id = resolvedNumericUserId
    if (id == null) return
    try {
      sessionStorage.setItem(`${TOAST_GUIDE_FIELD_NAV_DONE_PREFIX}${id}`, '1')
    } catch {
      /* ignore */
    }
  }, [resolvedNumericUserId])

  const handleToastMissingRowClick = useCallback(
    (rowKey) => {
      const strictToastGuide =
        profileGateActive &&
        dataSheetOpen &&
        showProfileCompletionToast &&
        !readToastGuideFieldNavDone(resolvedNumericUserId)
      if (strictToastGuide) {
        if (toastGuideStep === 0 || toastGuideStep === 2) return
        if (toastGuideStep === 3 && rowKey !== firstMissingKey) return
      }
      if (toastGuideStep === 3 && rowKey === firstMissingKey) {
        setToastGuideStep(0)
        markToastGuideFieldNavDone()
        scrollToProfileField(rowKey)
        setProfileCompletionToastDismissedForInput(true)
        return
      }
      scrollToProfileField(rowKey)
      markToastGuideFieldNavDone()
      setToastGuideStep(0)
      setProfileCompletionToastDismissedForInput(true)
    },
    [
      toastGuideStep,
      firstMissingKey,
      scrollToProfileField,
      markToastGuideFieldNavDone,
      profileGateActive,
      dataSheetOpen,
      showProfileCompletionToast,
      resolvedNumericUserId,
    ],
  )

  const handleSubscriptionCheckoutCelebrationGo = useCallback(() => {
    setSubscriptionCheckoutCelebration(false)
    setVipClubCheckoutCelebration(false)
    scrollMainTo(0, 0, 'smooth')
  }, [])

  const handleVipClubCheckoutCelebrationWhatsApp = useCallback(() => {
    try {
      window.open(WHATSAPP_SUPPORT_HREF, '_blank', 'noopener,noreferrer')
    } catch {
      /* ignore */
    }
    setSubscriptionCheckoutCelebration(false)
    setVipClubCheckoutCelebration(false)
    scrollMainTo(0, 0, 'smooth')
  }, [])

  const handleProfileCompleteCelebrationGo = useCallback(() => {
    const id = resolvedNumericUserId
    if (id != null && id !== '') {
      try {
        localStorage.setItem(`${PROFILE_COMPLETE_CELEBRATION_SHOWN_PREFIX}${String(id)}`, '1')
      } catch {
        /* ignore */
      }
    }
    setShowProfileCompleteCelebration(false)
    setDataSheetOpen(false)
    scrollMainTo(0, 0, 'smooth')
    if (serviceTourTimerRef.current) {
      clearTimeout(serviceTourTimerRef.current)
      serviceTourTimerRef.current = null
    }
    serviceTourTimerRef.current = window.setTimeout(() => {
      setShowServiceQuickLinksTour(true)
      serviceTourTimerRef.current = null
    }, 1000)
  }, [resolvedNumericUserId])

  const handleServiceQuickLinksTourDismiss = useCallback(() => {
    const id = resolvedNumericUserId
    if (id != null && id !== '') {
      try {
        localStorage.setItem(`${SERVICE_TOUR_ACK_PREFIX}${String(id)}`, '1')
      } catch {
        /* ignore */
      }
    }
    setServiceTourAcknowledged(true)
    setShowServiceQuickLinksTour(false)
  }, [resolvedNumericUserId])

  useEffect(() => {
    const active = showProfileCompleteCelebration || subscriptionCheckoutCelebration
    if (!active) {
      setSubscriptionConfettiRecycle(true)
      return undefined
    }
    setSubscriptionConfettiRecycle(true)
    const id = window.setTimeout(() => setSubscriptionConfettiRecycle(false), SUBSCRIPTION_CONFETTI_ACTIVE_MS)
    return () => window.clearTimeout(id)
  }, [showProfileCompleteCelebration, subscriptionCheckoutCelebration])

  useEffect(() => {
    if (!showProfileCompleteCelebration && !subscriptionCheckoutCelebration) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [showProfileCompleteCelebration, subscriptionCheckoutCelebration, vipClubCheckoutCelebration])

  /**
   * Через 1 с после открытия «Данные» (<78%) — подсказка на тост.
   * Пока панель не закрывали: второй раз не показываем (toastHintShownThisDataOpenRef).
   * Закрыли «Данные», снова открыли с главной — ref сброшен, подсказка снова (и sessionStorage fieldNav очищен выше).
   */
  useEffect(() => {
    if (!needsProfileOnboarding || !dataSheetOpen || !showProfileCompletionToast || !firstMissingKey) return
    if (toastHintShownThisDataOpenRef.current) return
    const t = window.setTimeout(() => {
      if (toastHintShownThisDataOpenRef.current) return
      toastHintShownThisDataOpenRef.current = true
      setToastGuideStep((s) => (s === 0 ? 1 : s))
    }, 1000)
    return () => window.clearTimeout(t)
  }, [
    needsProfileOnboarding,
    dataSheetOpen,
    showProfileCompletionToast,
    firstMissingKey,
    resolvedNumericUserId,
  ])

  useEffect(() => {
    if (toastGuideStep !== 2) return
    const t = window.setTimeout(() => setToastGuideStep(3), 600)
    return () => window.clearTimeout(t)
  }, [toastGuideStep])

  const profileRingR = 15
  const profileRingC = 2 * Math.PI * profileRingR
  const profileRingDashVisible = (profileCompletionStats.pct / 100) * profileRingC
  const profileRingCenter = 20
  const reduceMotionUi = useReducedMotion()

  const verified = user?.primaryEmailAddress?.verification?.status === 'verified'

  const avatarUrl = useMemo(() => {
    const fromClerk = resolveClerkAvatarUrl(user)
    if (fromClerk) return fromClerk
    try {
      const p = getUserData()?.picture
      if (typeof p === 'string' && p.trim()) return p.trim()
    } catch {
      /* ignore */
    }
    return ''
  }, [user])

  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  const toastGuideTargetRef =
    toastGuideStep === 1
      ? profileToastHeaderRef
      : toastGuideStep === 2
        ? profileCompletionToastRef
        : profileToastFirstMissingRef

  const toastGuideMessage =
    toastGuideStep === 1
      ? 'Нажмите, чтобы посмотреть необходимые данные'
      : toastGuideStep === 2
        ? 'Вот список полей, которые нужно заполнить'
        : 'Нажмите, чтобы перейти к заполнению'

  const toastGuideSpotlightActive =
    toastGuideStep >= 1 &&
    toastGuideStep <= 3 &&
    dataSheetOpen &&
    showProfileCompletionToast &&
    needsProfileOnboarding &&
    Boolean(firstMissingKey) &&
    !readToastGuideFieldNavDone(resolvedNumericUserId) &&
    !showProfileCompleteCelebration &&
    !subscriptionCheckoutCelebration &&
    !showServiceQuickLinksTour

  const onboardingGateUiLocked =
    isLoaded &&
    isSiteUserSignedIn(user, isLoaded) &&
    Boolean(resolvedNumericUserId) &&
    !serviceTourAcknowledged &&
    !showProfileCompleteCelebration &&
    !subscriptionCheckoutCelebration

  useEffect(() => {
    const bodyClass = 'profile-onboarding-gate-locked'
    if (onboardingGateUiLocked) {
      document.body.classList.add(bodyClass)
      return () => {
        document.body.classList.remove(bodyClass)
      }
    }
    document.body.classList.remove(bodyClass)
    return undefined
  }, [onboardingGateUiLocked])

  const toastGuideStrictActive =
    profileGateActive &&
    dataSheetOpen &&
    showProfileCompletionToast &&
    !readToastGuideFieldNavDone(resolvedNumericUserId)

  const cabinetOverviewHiddenBehindSheet =
    dataSheetOpen || historySheetOpen || subscriptionSheetOpen || bookingsSheetOpen

  return (
    <div
      className={`test-page${showProfileCompletionToast ? ' test-page--profile-toast' : ''}${
        onboardingGateUiLocked ? ' test-page--onboarding-gate' : ''
      }`}
    >
      {showProfileCompletionToast ? (
        <motion.div
          ref={profileCompletionToastRef}
          className={`test-profile-completion test-profile-completion--toast${
            profileCompletionExpanded ? ' test-profile-completion--expanded' : ''
          }`}
          role="region"
          aria-label={t('buyerData_profileCompletionTitle')}
          initial={reduceMotionUi ? { opacity: 0 } : { opacity: 0, y: -22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            reduceMotionUi
              ? { duration: 0.2 }
              : { type: 'spring', damping: 26, stiffness: 320, mass: 0.7 }
          }
        >
          <button
            type="button"
            ref={profileToastHeaderRef}
            className="test-profile-completion__header"
            onClick={handleToastHeaderClick}
            aria-expanded={profileCompletionExpanded}
            disabled={toastGuideStrictActive && toastGuideStep === 0}
          >
            <div className="test-profile-completion__ring-wrap" aria-hidden>
              <svg className="test-profile-completion__ring" viewBox="0 0 40 40" width="36" height="36">
                <circle
                  cx={profileRingCenter}
                  cy={profileRingCenter}
                  r={profileRingR}
                  fill="none"
                  stroke="rgba(15,23,42,0.08)"
                  strokeWidth="2.5"
                />
                <circle
                  cx={profileRingCenter}
                  cy={profileRingCenter}
                  r={profileRingR}
                  fill="none"
                  stroke={profileCompletionStats.pct >= 100 ? '#10b981' : '#0abab5'}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  transform={`rotate(-90 ${profileRingCenter} ${profileRingCenter})`}
                  strokeDasharray={`${profileRingDashVisible} ${profileRingC}`}
                />
              </svg>
              <span className="test-profile-completion__ring-label">{profileCompletionStats.pct}%</span>
            </div>
            <div className="test-profile-completion__summary">
              <span className="test-profile-completion__title">{t('buyerData_profileCompletionTitle')}</span>
              <span className="test-profile-completion__count">
                {t('buyerData_profileCompletionCount', {
                  filled: profileCompletionStats.filled,
                  total: profileCompletionStats.total,
                })}
              </span>
            </div>
            {profileCompletionExpanded ? (
              <FiChevronUp size={18} className="test-profile-completion__chev" aria-hidden />
            ) : (
              <FiChevronDown size={18} className="test-profile-completion__chev" aria-hidden />
            )}
          </button>
          {profileCompletionExpanded ? (
            <ul className="test-profile-completion__list">
              {profileCompletionRows.map((row) => (
                <li key={row.key}>
                  {row.filled ? (
                    <span className="test-profile-completion__row test-profile-completion__row--done">
                      <FiCheck size={15} className="test-profile-completion__icon-ok" aria-hidden />
                      <span className="test-profile-completion__row-label">{row.label}</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      ref={row.key === firstMissingKey ? profileToastFirstMissingRef : undefined}
                      className="test-profile-completion__row test-profile-completion__row--missing"
                      disabled={
                        toastGuideStrictActive &&
                        (toastGuideStep === 0 ||
                          toastGuideStep === 2 ||
                          (toastGuideStep === 3 && row.key !== firstMissingKey))
                      }
                      onClick={() => handleToastMissingRowClick(row.key)}
                    >
                      <span className="test-profile-completion__dot-miss" aria-hidden />
                      <span className="test-profile-completion__row-label">{row.label}</span>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
        </motion.div>
      ) : null}

      <div className="test-page__ambient" aria-hidden="true">
        <span className="test-page__blob test-page__blob--a" />
        <span className="test-page__blob test-page__blob--b" />
        <span className="test-page__blob test-page__blob--c" />
      </div>

      <div className="test-page__inner">
        <section
          className="test-hero-pro"
          aria-labelledby={showBuyerCabinetSkeleton ? undefined : 'test-hero-heading'}
          aria-busy={showBuyerCabinetSkeleton || undefined}
        >
          {showBuyerCabinetSkeleton ? (
            <BuyerCabinetHeroSkeleton
              sectionsLabel={t('buyerCabinet_sectionsLabel')}
              homeLink={
                <Link
                  to="/"
                  className="test-hero-pro__home-corner"
                  aria-label={t('buyerCabinet_home')}
                >
                  <span className="test-hero-pro__home-corner-glow" aria-hidden />
                  <FiHome className="test-hero-pro__home-corner-icon" size={17} aria-hidden />
                  <span>{t('buyerCabinet_home')}</span>
                </Link>
              }
            />
          ) : (
            <>
              <div className="test-hero-pro__identity">
                <div className="test-hero-pro__avatar-wrap">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt=""
                      className="test-hero-pro__avatar-img"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="test-hero-pro__avatar-fallback" aria-hidden="true">
                      {initials || 'U'}
                    </span>
                  )}
                  {cabinetVipActive ? (
                    <span
                      className="test-hero-pro__vip-badge"
                      title={t('profileVipBadgeTitle')}
                      aria-label={t('profileVipBadgeTitle')}
                    >
                      <FiAward className="test-hero-pro__vip-badge-icon" aria-hidden />
                      <span className="test-hero-pro__vip-badge-text">VIP</span>
                    </span>
                  ) : null}
                </div>
                <Link
                  to="/"
                  className="test-hero-pro__home-corner"
                  aria-label={t('buyerCabinet_home')}
                >
                  <span className="test-hero-pro__home-corner-glow" aria-hidden />
                  <FiHome className="test-hero-pro__home-corner-icon" size={17} aria-hidden />
                  <span>{t('buyerCabinet_home')}</span>
                </Link>
                <div className="test-hero-pro__who">
                  <h2 id="test-hero-heading" className="test-hero-pro__name">
                    {fullName}
                  </h2>
                  {email ? (
                    <p className="test-hero-pro__email">
                      <FiMail size={14} aria-hidden />
                      {email}
                    </p>
                  ) : null}
                  <div className="test-hero-pro__chips">
                    <span className="test-chip">
                      <FiHash size={13} aria-hidden />
                      ID {idForChip}
                    </span>
                    <span className="test-chip">
                      <FiShield size={13} aria-hidden />
                      {roleLabel}
                    </span>
                    {verified ? (
                      <span className="test-chip test-chip--ok">
                        <FiCheckCircle size={13} aria-hidden />
                        {t('buyerCabinet_emailVerified')}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <nav className="test-hero-pro__shortcuts" aria-label={t('buyerCabinet_sectionsAria')}>
                <p className="test-hero-pro__shortcuts-label">{t('buyerCabinet_sectionsLabel')}</p>
                <div className="test-hero-icon-grid">
                  {mainCards.map((card) => {
                    const Icon = card.icon
                    const isHistory = card.to === '/history'
                    const isSubscriptions = card.sheet === 'subscriptions'
                    const isBookings = card.sheet === 'bookings'
                    const isManagerChat = card.action === 'managerChat'
                    const isData = card.sheet === 'data'
                    const cardTitle = card.title
                    const cardDescription = card.description
                    const showHistoryCount = isHistory && !historyLoading && historyCount > 0
                    const showBookingsCount =
                      isBookings && !bookingsSheetLoading && visibleBookingsSheetRows.length > 0
                    const planLabel = subscriptionPlanLabel || 'Starter'
                    const historyAria = showHistoryCount
                      ? t('buyerCabinet_historyAria', { title: cardTitle, count: historyCount })
                      : undefined
                    const subscriptionsAria = isSubscriptions
                      ? t('buyerCabinet_subscriptionsAria', { title: cardTitle, plan: planLabel })
                      : undefined
                    const bookingsAria = showBookingsCount
                      ? t('buyerCabinet_bookingsAria', {
                          title: cardTitle,
                          count: visibleBookingsSheetRows.length,
                        })
                      : undefined
                    const ariaLabel = historyAria ?? subscriptionsAria ?? bookingsAria
                    const tileClass = `test-hero-icon-tile test-hero-icon-tile--${card.accent}${
                      isData && dataSheetOpen ? ' test-hero-icon-tile--active' : ''
                    }${isData && onboardingGateUiLocked ? ' test-hero-icon-tile--gate-data' : ''}${
                      isHistory && historySheetOpen ? ' test-hero-icon-tile--active' : ''
                    }${isSubscriptions && subscriptionSheetOpen ? ' test-hero-icon-tile--active' : ''}${
                      isBookings && bookingsSheetOpen ? ' test-hero-icon-tile--active' : ''
                    }`
                    const iconInner = (
                      <>
                        <span className="test-hero-icon-tile__icon">
                          <Icon size={17} strokeWidth={1.85} aria-hidden />
                          {showHistoryCount ? (
                            <span className="test-hero-icon-tile__count-badge" aria-hidden="true">
                              {historyCount > 99 ? '99+' : historyCount}
                            </span>
                          ) : null}
                          {showBookingsCount ? (
                            <span className="test-hero-icon-tile__count-badge" aria-hidden="true">
                              {visibleBookingsSheetRows.length > 99 ? '99+' : visibleBookingsSheetRows.length}
                            </span>
                          ) : null}
                          {isSubscriptions ? (
                            <span className="test-hero-icon-tile__plan-badge">{planLabel}</span>
                          ) : null}
                        </span>
                        <span className="test-hero-icon-tile__label">{cardTitle}</span>
                      </>
                    )
                    if (isData) {
                      return (
                        <button
                          ref={dataTileRef}
                          key={card.title}
                          type="button"
                          className={tileClass}
                          title={cardDescription}
                          aria-label={cardTitle}
                          aria-pressed={dataSheetOpen}
                          onClick={() => {
                            const openDataForOnboarding =
                              !dataSheetOpen && Boolean(resolvedNumericUserId) && needsProfileOnboarding
                            setHistorySheetOpen(false)
                            setSubscriptionSheetOpen(false)
                            setBookingsSheetOpen(false)
                            if (openDataForOnboarding) {
                              setDataSheetOpen(true)
                            } else {
                              setDataSheetOpen((open) => !open)
                            }
                          }}
                        >
                          {iconInner}
                        </button>
                      )
                    }
                    if (isHistory) {
                      return (
                        <button
                          key={card.title}
                          type="button"
                          className={tileClass}
                          title={cardDescription}
                          aria-label={ariaLabel ?? cardTitle}
                          aria-pressed={historySheetOpen}
                          onClick={() => {
                            setDataSheetOpen(false)
                            setSubscriptionSheetOpen(false)
                            setBookingsSheetOpen(false)
                            setHistorySheetOpen((open) => !open)
                          }}
                        >
                          {iconInner}
                        </button>
                      )
                    }
                    if (isSubscriptions) {
                      return (
                        <button
                          key={card.title}
                          type="button"
                          className={tileClass}
                          title={cardDescription}
                          aria-label={ariaLabel ?? cardTitle}
                          aria-pressed={subscriptionSheetOpen}
                          onClick={() => {
                            setDataSheetOpen(false)
                            setHistorySheetOpen(false)
                            setBookingsSheetOpen(false)
                            setSubscriptionSheetOpen((open) => !open)
                          }}
                        >
                          {iconInner}
                        </button>
                      )
                    }
                    if (isBookings) {
                      return (
                        <button
                          key={card.title}
                          type="button"
                          className={tileClass}
                          title={cardDescription}
                          aria-label={ariaLabel ?? cardTitle}
                          aria-pressed={bookingsSheetOpen}
                          onClick={() => {
                            setDataSheetOpen(false)
                            setHistorySheetOpen(false)
                            setSubscriptionSheetOpen(false)
                            setBookingsSheetOpen((open) => !open)
                          }}
                        >
                          {iconInner}
                        </button>
                      )
                    }
                    if (isManagerChat) {
                      return (
                        <button
                          key={card.title}
                          type="button"
                          className={tileClass}
                          title={cardDescription}
                          aria-label={cardTitle}
                          aria-pressed={isManagerChatOpen}
                          onClick={() => {
                            setDataSheetOpen(false)
                            setHistorySheetOpen(false)
                            setSubscriptionSheetOpen(false)
                            setBookingsSheetOpen(false)
                            void openManagerChatModal()
                          }}
                        >
                          {iconInner}
                        </button>
                      )
                    }
                    return (
                      <Link
                        key={card.title}
                        to={card.to}
                        className={tileClass}
                        title={cardDescription}
                        aria-label={ariaLabel}
                      >
                        {iconInner}
                      </Link>
                    )
                  })}
                </div>
              </nav>
            </>
          )}

          <div
            data-profile-sheet="data"
            className={`test-data-dropbox${dataSheetOpen ? ' test-data-dropbox--open' : ''}`}
            aria-hidden={!dataSheetOpen}
          >
            <div className="test-data-dropbox__measure">
              <div
                className="test-hero-pro__data-panel test-hero-pro__data-panel--sheet-data"
                aria-labelledby="test-data-panel-title"
              >
                <div className="test-data-panel__toolbar">
                  <button
                    type="button"
                    className="test-data-panel__back"
                    aria-label={t('buyerCabinet_collapse')}
                    onClick={() => setDataSheetOpen(false)}
                  >
                    <FiArrowLeft size={18} aria-hidden />
                    <span className="test-data-panel__back-label">{t('buyerCabinet_collapse')}</span>
                  </button>
                  <h3 id="test-data-panel-title" className="test-data-panel__title">
                    {t('buyerData_profilePanelTitle')}
                  </h3>
                  <span className="test-data-panel__toolbar-spacer" aria-hidden />
                </div>
                <p className="test-data-panel__hint">
                  {t('buyerData_profileAutosaveHint')}
                </p>
                {dbUserLoading ? (
                  <TestSheetSkeletonData />
                ) : !resolvedNumericUserId ? (
                  <p className="test-data-panel__hint">
                    {t('buyerData_profileNotResolved')}
                  </p>
                ) : (
                  <>
                  <div className="test-data-panel__sections">
                    <section className="test-data-panel__section" aria-labelledby="profile-section-main">
                      <h4 id="profile-section-main" className="test-data-panel__section-title">
                        {t('buyerData_sectionContacts')}
                      </h4>
                      <div className="test-data-panel__grid">
                        {PROFILE_MAIN_FIELDS.map(({ key, labelKey, multiline, type, autoComplete }) => (
                          <div
                            key={key}
                            id={`test-profile-field-wrap-${key}`}
                            className={`test-data-field${getProfileFieldLayoutClass(key)}${
                              savingField === key ? ' test-data-field--saving' : ''
                            }`}
                          >
                            <label className="test-data-field__label" htmlFor={`profile-field-${key}`}>
                              {t(PROFILE_FIELD_I18N[key] || labelKey)}
                            </label>
                            <div
                              className={`test-data-field__input-wrap${
                                profileFieldSavedOk[key] && savingField !== key
                                  ? ' test-data-field__input-wrap--saved'
                                  : ''
                              }${multiline ? ' test-data-field__input-wrap--textarea' : ''}`}
                            >
                              {key === 'country' ? (
                                <div ref={countryFieldRef} className="test-country-select">
                                  {(() => {
                                    const countrySaved = profileFieldSavedOk[key] && savingField !== key
                                    return (
                                  <button
                                    id={`profile-field-${key}`}
                                    type="button"
                                    className={`test-data-field__input test-country-select__trigger${
                                      countrySaved ? ' test-country-select__trigger--saved' : ''
                                    }`}
                                    onClick={() => {
                                      setCountryDropdownOpen((prev) => !prev)
                                      setCountrySearchQuery('')
                                    }}
                                    disabled={profileFieldsLocked}
                                    aria-haspopup="listbox"
                                    aria-expanded={countryDropdownOpen}
                                  >
                                    <span className="test-country-select__value">
                                      {profileForm[key] ? profileForm[key] : t('buyerData_placeholderCountry')}
                                    </span>
                                    <span className="test-country-select__chevron" aria-hidden>
                                      <FiChevronDown size={18} />
                                    </span>
                                  </button>
                                    )
                                  })()}

                                  {countryDropdownOpen ? (
                                    <div className="test-country-select__menu" role="listbox" aria-label="Список стран">
                                      <input
                                        type="text"
                                        className="test-country-select__search"
                                        placeholder={t('buyerData_countrySearchPlaceholder')}
                                        value={countrySearchQuery}
                                        onChange={(e) => setCountrySearchQuery(e.target.value)}
                                        autoFocus
                                      />
                                      {filteredCountries.map((country) => {
                                        const selected = profileForm.country === country.name
                                        return (
                                          <button
                                            key={country.code}
                                            type="button"
                                            className={`test-country-select__option${
                                              selected ? ' test-country-select__option--selected' : ''
                                            }`}
                                            onClick={() => handleCountrySelect(country.name)}
                                            role="option"
                                            aria-selected={selected}
                                          >
                                            <span className="test-country-select__option-flag" aria-hidden>
                                              {country.flag}
                                            </span>
                                            <span className="test-country-select__option-name">{country.name}</span>
                                          </button>
                                        )
                                      })}
                                      {filteredCountries.length === 0 ? (
                                        <p className="test-country-select__empty">{t('countryNoResults')}</p>
                                      ) : null}
                                    </div>
                                  ) : null}
                                </div>
                              ) : multiline ? (
                                <textarea
                                  id={`profile-field-${key}`}
                                  className="test-data-field__input test-data-field__input--textarea"
                                  rows={1}
                                  value={profileForm[key] ?? ''}
                                  onChange={handleProfileChange(key)}
                                  onBlur={handleProfileBlur(key)}
                                  autoComplete={autoComplete}
                                  spellCheck={false}
                                  disabled={profileFieldsLocked}
                                />
                              ) : (
                                <input
                                  id={`profile-field-${key}`}
                                  className="test-data-field__input"
                                  type={type || 'text'}
                                  value={profileForm[key] ?? ''}
                                  onChange={handleProfileChange(key)}
                                  onBlur={handleProfileBlur(key)}
                                  autoComplete={autoComplete}
                                  spellCheck={false}
                                  disabled={profileFieldsLocked}
                                />
                              )}
                              <span
                                className={`test-data-field__saved${
                                  profileFieldSavedOk[key] && savingField !== key
                                    ? ' test-data-field__saved--visible'
                                    : ''
                                }`}
                                role="img"
                                aria-label="Сохранено"
                                aria-hidden={!(profileFieldSavedOk[key] && savingField !== key)}
                              >
                                <FiCheck size={18} strokeWidth={2.5} aria-hidden />
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section
                      className="test-data-panel__section test-data-panel__section--passport"
                      aria-labelledby="profile-section-passport"
                    >
                      <div className="test-data-panel__section-head">
                        <div>
                          <h4 id="profile-section-passport" className="test-data-panel__section-title">
                            {t('buyerData_sectionPassportAndId')}
                          </h4>
                          <p className="test-data-panel__section-sub">
                            {t('buyerData_passportRecognizeHint')}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="test-recognize-passport-btn"
                          disabled={profileFieldsLocked}
                          onClick={() => passportInputRef.current?.click()}
                        >
                          {isRecognizingPassport || isSavingExtractPatch ? (
                            <>
                              <span className="test-spinner" aria-hidden />
                              {isRecognizingPassport ? t('buyerData_recognizing') : t('buyerData_saveInProgress')}
                            </>
                          ) : (
                            <>
                              <FiUpload size={17} strokeWidth={2} aria-hidden />
                              {t('buyerData_recognizePassport')}
                            </>
                          )}
                        </button>
                      </div>
                      <input
                        ref={passportInputRef}
                        type="file"
                        accept="image/*"
                        className="test-passport-file-input"
                        aria-hidden
                        tabIndex={-1}
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          await handlePassportRecognition(file)
                          e.target.value = ''
                        }}
                      />
                      {passportPhotoHints.length > 0 && (
                        <div className="test-passport-hints" role="status" aria-live="polite">
                          {passportPhotoHints.map((hint, idx) => (
                            <p key={`${hint}-${idx}`}>{hint}</p>
                          ))}
                        </div>
                      )}
                      <div
                        className={`test-data-panel__grid test-data-panel__grid--passport${
                          isSpainCountry(profileForm.country)
                            ? ''
                            : ' test-data-panel__grid--passport-stacked'
                        }`}
                      >
                        {PROFILE_PASSPORT_FIELDS.map(({ key, labelKey, type, autoComplete }) => (
                          <div
                            key={key}
                            id={`test-profile-field-wrap-${key}`}
                            className={`test-data-field${getProfileFieldLayoutClass(key)}${
                              savingField === key ? ' test-data-field--saving' : ''
                            }`}
                          >
                            <label className="test-data-field__label" htmlFor={`profile-field-${key}`}>
                              {key === 'identification_number'
                                ? t(getIdentificationLabelKeyByCountry(profileForm.country))
                                : t(PROFILE_FIELD_I18N[key] || labelKey)}
                            </label>
                            <div
                              className={`test-data-field__input-wrap${
                                profileFieldSavedOk[key] && savingField !== key
                                  ? ' test-data-field__input-wrap--saved'
                                  : ''
                              }`}
                            >
                              <input
                                id={`profile-field-${key}`}
                                className="test-data-field__input"
                                type={type || 'text'}
                                value={profileForm[key] ?? ''}
                                onChange={handleProfileChange(key)}
                                onBlur={handleProfileBlur(key)}
                                autoComplete={autoComplete}
                                spellCheck={false}
                                disabled={profileFieldsLocked}
                              />
                              <span
                                className={`test-data-field__saved${
                                  profileFieldSavedOk[key] && savingField !== key
                                    ? ' test-data-field__saved--visible'
                                    : ''
                                }`}
                                role="img"
                                aria-label="Сохранено"
                                aria-hidden={!(profileFieldSavedOk[key] && savingField !== key)}
                              >
                                <FiCheck size={18} strokeWidth={2.5} aria-hidden />
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                  <div className="test-data-panel__footer-actions">
                    <button
                      type="button"
                      className={`test-data-panel__save${
                        shouldPulseSaveButton ? ' test-data-panel__save--pulse' : ''
                      }`}
                      onClick={handleProfilePanelSaveClick}
                      disabled={
                        dbUserLoading ||
                        !resolvedNumericUserId ||
                        profileFieldsLocked ||
                        profileSaveAllLoading
                      }
                    >
                      {profileSaveAllLoading ? t('buyerData_saveInProgress') : t('buyerData_save')}
                    </button>
                  </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div
            className={`test-data-dropbox${historySheetOpen ? ' test-data-dropbox--open' : ''}`}
            aria-hidden={!historySheetOpen}
          >
            <div className="test-data-dropbox__measure">
              <div className="test-hero-pro__data-panel test-hero-pro__history-panel">
                <div className="test-data-panel__toolbar">
                  <button
                    type="button"
                    className="test-data-panel__back"
                    aria-label={t('buyerCabinet_collapse')}
                    onClick={() => setHistorySheetOpen(false)}
                  >
                    <FiArrowLeft size={18} aria-hidden />
                    <span className="test-data-panel__back-label">{t('buyerCabinet_collapse')}</span>
                  </button>
                  <h3 id="test-history-panel-title" className="test-data-panel__title">
                    {t('buyerHistory_title')}
                  </h3>
                  <span className="test-data-panel__toolbar-spacer" aria-hidden />
                </div>
                <p className="test-data-panel__hint">
                  {t('buyerCabinet_historySheetHint')}
                </p>
                {!historyLoading && historySections.length > 0 ? (
                  <label className="test-history-dropbox__search">
                    <FiSearch className="test-history-dropbox__search-icon" size={18} aria-hidden />
                    <input
                      type="search"
                      className="test-history-dropbox__search-input"
                      value={historySearchQuery}
                      onChange={(e) => setHistorySearchQuery(e.target.value)}
                      placeholder={t('buyerCabinet_historySearchPlaceholder')}
                      aria-label={t('buyerCabinet_historySearchPlaceholder')}
                      autoComplete="off"
                      spellCheck={false}
                      enterKeyHint="search"
                    />
                  </label>
                ) : null}
                {historyLoading ? (
                  <TestSheetSkeletonHistory />
                ) : historySections.length === 0 ? (
                  <p className="test-history-dropbox__empty">
                    {t('buyerCabinet_historyEmpty')}
                  </p>
                ) : filteredHistorySections.length === 0 ? (
                  <p className="test-history-dropbox__empty test-history-dropbox__empty--muted">
                    {t('buyerCabinet_historySearchNoResults')}
                  </p>
                ) : (
                  <div className="test-history-dropbox__scroll">
                    {filteredHistorySections.map((section) => (
                      <section
                        key={section.key}
                        className="test-history-section"
                        aria-labelledby={`hist-sec-${section.key}`}
                      >
                        <div className={`test-history-section__head test-history-section__head--${section.key}`}>
                          <h4 id={`hist-sec-${section.key}`} className="test-history-section__title">
                            {section.key === 'reserve' ? t('buyNowTitle') : section.title}
                          </h4>
                          {['auction', 'reserve', 'shares', 'bids'].includes(section.key) ? (
                            <span className="test-history-section__pill">
                              {section.key === 'auction'
                                ? t('buyerCabinet_historyPillAuction')
                                : section.key === 'reserve'
                                  ? t('buyerCabinet_historyPillReserve')
                                  : section.key === 'shares'
                                    ? t('buyerCabinet_historyPillShares')
                                    : t('buyerCabinet_historyPillBids')}
                            </span>
                          ) : null}
                        </div>
                        {groupHistoryItemsByDay(section.items).map((dayGroup, dayGroupIdx) => (
                          <div
                            key={`${section.key}-day-${dayGroupIdx}-${dayGroup.dayKey || 'na'}`}
                            className="test-history-day-group"
                          >
                            <div
                              className="test-history-day-divider"
                              role="separator"
                              aria-label={formatHistoryDayLabel(dayGroup.dayKey)}
                            >
                              <span className="test-history-day-divider__line" aria-hidden />
                              <time
                                className="test-history-day-divider__label"
                                dateTime={dayGroup.dayKey || undefined}
                              >
                                {formatHistoryDayLabel(dayGroup.dayKey)}
                              </time>
                              <span className="test-history-day-divider__line" aria-hidden />
                            </div>
                            <div className="test-history-section__grid">
                              {dayGroup.items.map((item) => {
                                const isPurchasedSection = ['auction', 'reserve', 'shares'].includes(section.key)
                                const termsText = isPurchasedSection
                                  ? historyPurchaseTermsBySection(section.key)
                                  : ''
                                const typeBadge = historyTypeBadgeLabel(section.key)
                                const cardBody = (
                                  <>
                                    <div className="test-history-mini-card__body">
                                      <div className="test-history-mini-card__thumb">
                                        <span
                                          className={`test-history-mini-card__type-badge test-history-mini-card__type-badge--${section.key}`}
                                        >
                                          {typeBadge}
                                        </span>
                                        <img
                                          src={item.imageSrc}
                                          alt=""
                                          loading="lazy"
                                          decoding="async"
                                        />
                                      </div>
                                      <div className="test-history-mini-card__text">
                                        <div className="test-history-mini-card__head">
                                          <div className="test-history-mini-card__titles">
                                            <span className="test-history-mini-card__title">{item.title}</span>
                                            {(item.location || '').trim() ? (
                                              <span className="test-history-mini-card__loc">
                                                <FiMapPin
                                                  size={14}
                                                  className="test-history-mini-card__loc-icon"
                                                  aria-hidden
                                                />
                                                <span className="test-history-mini-card__loc-text">
                                                  {item.location}
                                                </span>
                                              </span>
                                            ) : null}
                                            {item.subtitle ? (
                                              <span className="test-history-mini-card__sub">{item.subtitle}</span>
                                            ) : null}
                                          </div>
                                          <div
                                            className="test-history-mini-card__price"
                                            title={`${t('buyerCabinet_amountLabel')}: ${item.amount || '—'}`}
                                          >
                                            <span className="test-history-mini-card__price-label">
                                              {t('buyerCabinet_amountLabel')}
                                            </span>
                                            <span className="test-history-mini-card__price-value">
                                              {item.amount || '—'}
                                            </span>
                                          </div>
                                        </div>
                                        {termsText ? (
                                          <span className="test-history-mini-card__terms">{termsText}</span>
                                        ) : null}
                                        <div className="test-history-mini-card__actions">
                                          {item.href ? (
                                            <Link
                                              to={item.href}
                                              className="test-history-mini-card__action-btn test-history-mini-card__action-btn--primary"
                                              onClick={() => setHistorySheetOpen(false)}
                                            >
                                              <span>{t('buyerCabinet_openProperty')}</span>
                                              <FiArrowRight
                                                size={16}
                                                className="test-history-mini-card__action-chevron"
                                                aria-hidden
                                              />
                                            </Link>
                                          ) : null}
                                          {isPurchasedSection ? (
                                            <button
                                              type="button"
                                              className="test-history-mini-card__action-btn test-history-mini-card__action-btn--sell"
                                              onClick={() => setIsSellObjectPromptOpen(true)}
                                            >
                                              {t('buyerCabinet_sellProperty')}
                                            </button>
                                          ) : null}
                                        </div>
                                      </div>
                                    </div>
                                  </>
                                )
                                return (
                                  <div key={item.id} className="test-history-mini-card">
                                    {cardBody}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </section>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div
            className={`test-data-dropbox${subscriptionSheetOpen ? ' test-data-dropbox--open' : ''}`}
            aria-hidden={!subscriptionSheetOpen}
          >
            <div className="test-data-dropbox__measure">
              <div className="test-hero-pro__data-panel" aria-labelledby="test-subscription-panel-title">
                <div className="test-data-panel__toolbar test-data-panel__toolbar--subscription">
                  <button
                    type="button"
                    className="test-data-panel__back"
                    aria-label={t('buyerCabinet_collapse')}
                    onClick={() => setSubscriptionSheetOpen(false)}
                  >
                    <FiArrowLeft size={18} aria-hidden />
                    <span className="test-data-panel__back-label">{t('buyerCabinet_collapse')}</span>
                  </button>
                  <h3 id="test-subscription-panel-title" className="test-data-panel__title">
                    {t('buyerCabinet_cardSubscriptionsTitle')}
                  </h3>
                  <span className="test-data-panel__toolbar-spacer" aria-hidden />
                </div>
                {subscriptionSheetLoading ? (
                  <TestSheetSkeletonSubscription />
                ) : (
                  <div className="test-subscription-pricing-wrap">
                    <div className="test-subscription-pricing-scroll">
                      <PricingCards
                        creative
                        compact={false}
                        mobileTwoColumn={false}
                        currentPlanVisual={subscriptionProfileVisual}
                        checkoutBusy={subscriptionUpgradeLoading}
                        onBookCall={handleSubscriptionPlanSubscribe}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div
            className={`test-data-dropbox${bookingsSheetOpen ? ' test-data-dropbox--open' : ''}`}
            aria-hidden={!bookingsSheetOpen}
          >
            <div className="test-data-dropbox__measure">
              <div className="test-hero-pro__data-panel test-hero-pro__bookings-panel">
                <div className="test-data-panel__toolbar">
                  <button
                    type="button"
                    className="test-data-panel__back"
                    aria-label={t('buyerCabinet_collapse')}
                    onClick={() => setBookingsSheetOpen(false)}
                  >
                    <FiArrowLeft size={18} aria-hidden />
                    <span className="test-data-panel__back-label">{t('buyerCabinet_collapse')}</span>
                  </button>
                  <h3 id="test-bookings-panel-title" className="test-data-panel__title">
                    {t('buyerCabinet_cardBookingsTitle')}
                  </h3>
                  <span className="test-data-panel__toolbar-spacer" aria-hidden />
                </div>
                <p className="test-data-panel__hint">
                  {t('buyerCabinet_bookingsSheetHint')}
                </p>
                {bookingsSheetLoading ? (
                  <TestSheetSkeletonBookings />
                ) : visibleBookingsSheetRows.length === 0 ? (
                  <p className="test-history-dropbox__empty">
                    {t('buyerCabinet_bookingsEmpty')}
                  </p>
                ) : (
                  <div className="test-booking-dropbox__list">
                    {visibleBookingsSheetRows.slice(0, 5).map((b) => {
                      const statusKey = (b.status || 'pending').toLowerCase()
                      const bookingIdKey = String(b.id)
                      const title =
                        b.property_title || t('buyerCabinet_propertyWithId', { id: b.property_id })
                      const ownerComment = String(b.owner_comment || '').trim()
                      const ownerCommentNotificationsCount =
                        ownerCommentCountsByBooking[bookingIdKey] != null
                          ? Number(ownerCommentCountsByBooking[bookingIdKey]) || 0
                          : ownerComment
                            ? 1
                            : 0
                      const coverUrl =
                        typeof b.property_cover_url === 'string' && b.property_cover_url.trim()
                          ? b.property_cover_url.trim()
                          : ''
                      const badgeTone = ['pending', 'approved', 'rejected', 'paid'].includes(statusKey)
                        ? statusKey
                        : 'pending'
                      const paidCents =
                        b.paid_amount_cents != null && Number.isFinite(Number(b.paid_amount_cents))
                          ? Number(b.paid_amount_cents)
                          : null
                      const paidLine =
                        paidCents != null && paidCents > 0
                          ? t('buyerBookings_paidLine', {
                              amount: formatMoneyFromMinorUnits(
                                paidCents,
                                b.paid_currency || 'eur',
                                moneyLocale,
                              ),
                            })
                          : null
                      const insAmt = b.insurance_deposit_amount
                      const insLine =
                        insAmt != null && Number.isFinite(Number(insAmt))
                          ? t('buyerBookings_insuranceLine', {
                              amount: formatMoneyMajorUnits(
                                Number(insAmt),
                                b.paid_currency || 'eur',
                                moneyLocale,
                              ),
                            })
                          : null
                      const canCancel = ['pending', 'paid', 'approved'].includes(statusKey)
                      const canCheckIn =
                        statusKey === 'approved' &&
                        (Boolean(String(b.owner_comment || '').trim()) ||
                          Number(b.check_in_enabled) === 1)
                      return (
                        <div key={b.id} className="test-booking-mini-wrap">
                          {ownerCommentNotificationsCount > 0 ? (
                            <button
                              type="button"
                              className="test-booking-mini__owner-note-btn"
                              onClick={() =>
                                setOwnerCommentModalBooking({
                                  title,
                                  comment: ownerComment,
                                  count: ownerCommentNotificationsCount,
                                })
                              }
                              aria-label={t('buyerCabinet_bookingOwnerCommentOpen', {
                                count: ownerCommentNotificationsCount,
                              })}
                            >
                              <FiBell size={19} aria-hidden />
                              <span className="test-booking-mini__owner-note-count">
                                {ownerCommentNotificationsCount > 99
                                  ? '99+'
                                  : ownerCommentNotificationsCount}
                              </span>
                            </button>
                          ) : null}
                          <Link
                            to={`/profile/bookings?booking=${b.id}`}
                            className={`test-booking-mini test-booking-mini--${badgeTone}`}
                            onClick={() => setBookingsSheetOpen(false)}
                          >
                            <div className="test-booking-mini__media">
                              <span
                                className={`test-booking-mini__badge test-booking-mini__badge--${badgeTone}`}
                              >
                                {t(
                                  `buyerCabinet_bookingStatus_${statusKey}`,
                                  t('buyerCabinet_bookingStatus_pending'),
                                )}
                              </span>
                              {coverUrl ? (
                                <img
                                  src={coverUrl}
                                  alt=""
                                  className="test-booking-mini__media-img"
                                  loading="lazy"
                                  decoding="async"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                  }}
                                />
                              ) : null}
                              <div className="test-booking-mini__media-fallback" aria-hidden>
                                <FiHome size={16} strokeWidth={1.35} aria-hidden />
                              </div>
                            </div>
                            <div className="test-booking-mini__body">
                              <span className="test-booking-mini__title">{title}</span>
                              {paidLine || insLine ? (
                                <div className="test-booking-mini__finance">
                                  {paidLine ? (
                                    <span className="test-booking-mini__money-line">{paidLine}</span>
                                  ) : null}
                                  {insLine ? (
                                    <span className="test-booking-mini__money-line test-booking-mini__money-line--muted">
                                      {insLine}
                                    </span>
                                  ) : null}
                                </div>
                              ) : null}
                              <span className="test-booking-mini__meta">
                                <span className="test-booking-mini__meta-icon-wrap" aria-hidden>
                                  <FiCalendar size={14} className="test-booking-mini__meta-icon" />
                                </span>
                                {formatDateRange(b.start_date, b.end_date, locale)}
                              </span>
                              <span className="test-booking-mini__mobile-cta">
                                {t('buyerBookings_cta')}
                                <span className="test-booking-mini__mobile-cta-ring" aria-hidden>
                                  <FiArrowRight size={12} aria-hidden />
                                </span>
                              </span>
                            </div>
                            <div className="test-booking-mini__cta">
                              <span className="test-booking-mini__cta-label">{t('buyerBookings_cta')}</span>
                              <FiArrowRight size={16} className="test-booking-mini__cta-arrow" aria-hidden />
                            </div>
                          </Link>
                          {canCheckIn ? (
                            <button
                              type="button"
                              className="test-booking-mini__checkin-btn"
                              onClick={() => {
                                setBookingsSheetOpen(false)
                                setCheckInBookingId(b.id)
                              }}
                            >
                              {t('buyerBookings_checkInCta')}
                              <FiArrowRight size={17} aria-hidden />
                            </button>
                          ) : null}
                          {canCancel ? (
                            <button
                              type="button"
                              className="test-booking-mini__cancel-btn"
                              onClick={() => setTestDriveCancelBooking(b)}
                            >
                              {t('buyerBookings_cancel')}
                            </button>
                          ) : null}
                        </div>
                      )
                    })}
                    {visibleBookingsSheetRows.length > 5 ? (
                      <p className="test-booking-dropbox__more">
                        {t('buyerCabinet_bookingsShownOfTotal', {
                          shown: 5,
                          total: visibleBookingsSheetRows.length,
                        })}
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <div
          className={`test-page__below-hero${
            cabinetOverviewHiddenBehindSheet ? ' test-page__below-hero--hidden-with-sheet' : ''
          }`}
          aria-hidden={cabinetOverviewHiddenBehindSheet || undefined}
          {...(cabinetOverviewHiddenBehindSheet ? { inert: '' } : {})}
        >
              {showBuyerCabinetSkeleton ? (
                <BuyerCabinetBelowSkeleton
                  directionsTitle={t('buyerCabinet_directionsTitle')}
                  directionsSubtitle={t('buyerCabinet_directionsSubtitle')}
                  docsTitle={t('buyerCabinet_docsTitle')}
                />
              ) : (
                <>
                  <section
                    className="test-direction-summaries"
                    aria-label="Ключевые направления: доли, аукцион и долги"
                  >
                <div ref={directionSummariesGridRef} className="test-direction-summaries__grid">
                  {directionSummaries.map((item) => {
                    const dirRef =
                      item.to === '/shares'
                        ? directionSharesRef
                        : item.to === '/auction'
                          ? directionAuctionRef
                          : item.to === '/debts'
                            ? directionDebtsRef
                            : undefined
                    return (
                      <DirectionSummaryCard
                        key={item.headline}
                        ref={dirRef}
                        variant={item.variant}
                        areaLabel={item.areaLabel}
                        headline={item.headline}
                        subCardTitle={item.subCardTitle}
                        subCardSubtitle={item.subCardSubtitle}
                        to={item.to}
                        moreCount={item.moreCount}
                        thumbnails={item.thumbnails}
                      />
                    )
                  })}
                </div>
              </section>

              <ProfileVipClubPromo className="test-page__vip-promo" />

              <div className="test-bento">
                <div className="test-bento__main">
                  <section className="test-panel test-panel--compact" aria-labelledby="test-quick-title">
                    <div className="test-panel__head">
                      <div>
                        <h2 id="test-quick-title" className="test-panel__title">
                          {t('buyerCabinet_directionsTitle')}
                        </h2>
                        <p className="test-panel__subtitle">{t('buyerCabinet_directionsSubtitle')}</p>
                      </div>
                    </div>
                    <div className="test-quick-row test-quick-row--primary">
                      {quickLinksPrimary.map((link) => {
                        const Icon = link.icon
                        const isBecomeSeller = link.action === 'becomeSeller'
                        const inner = (
                          <>
                            <span className="test-quick-pill__icon">
                              <Icon size={17} aria-hidden />
                            </span>
                            <span className="test-quick-pill__body">
                              <span className="test-quick-pill__title">{link.title}</span>
                              <span className="test-quick-pill__sub">{link.subtitle}</span>
                            </span>
                            <FiArrowRight size={15} className="test-quick-pill__arrow" aria-hidden />
                          </>
                        )
                        if (isBecomeSeller) {
                          return (
                            <button
                              key="quick-become-seller"
                              type="button"
                              className="test-quick-pill"
                              onClick={handleBecomeSellerRegister}
                            >
                              {inner}
                            </button>
                          )
                        }
                        return (
                          <Link key={link.to} to={link.to} className="test-quick-pill">
                            {inner}
                          </Link>
                        )
                      })}
                    </div>
                    <div className="test-cabinet-home-discover" aria-label={t('buyerData_profileDiscoverAria')}>
                      {profileReferralUrl ? (
                        <div className="test-cabinet-home-discover__referral-card">
                          <div className="test-cabinet-home-discover__referral-card-head">
                            <span className="test-cabinet-home-discover__referral-card-icon" aria-hidden>
                              <FiUserPlus size={18} strokeWidth={2} />
                            </span>
                            <span className="test-cabinet-home-discover__referral-card-title">{t('bonus9Title')}</span>
                          </div>
                          <label
                            className="test-cabinet-home-discover__referral-label"
                            htmlFor="test-cabinet-referral-url"
                          >
                            {t('bonusesReferralLabel')}
                          </label>
                          <div className="test-cabinet-home-discover__referral-row">
                            <input
                              id="test-cabinet-referral-url"
                              readOnly
                              type="text"
                              className="test-cabinet-home-discover__referral-input"
                              value={profileReferralUrl}
                              aria-label={t('bonusesReferralLabel')}
                            />
                            <button
                              type="button"
                              className="test-cabinet-home-discover__referral-copy"
                              onClick={copyProfileReferralLink}
                              title={t('bonusesCopyLink')}
                              aria-label={t('bonusesCopyLinkAria')}
                            >
                              {profileReferralCopied ? (
                                <FiCheck size={18} strokeWidth={2.5} aria-hidden />
                              ) : (
                                <FiCopy size={18} aria-hidden />
                              )}
                            </button>
                          </div>
                          <p className="test-cabinet-home-discover__referral-hint">{t('bonusesReferralHint')}</p>
                        </div>
                      ) : null}
                      <Link to="/bonuses" className="test-cabinet-home-discover__bonuses-cta">
                        <span className="test-cabinet-home-discover__bonuses-cta-icon" aria-hidden>
                          <FiGift size={20} strokeWidth={2} />
                        </span>
                        <span className="test-cabinet-home-discover__bonuses-cta-body">
                          <span className="test-cabinet-home-discover__bonuses-cta-title">
                            {t('buyerData_moreBonusesCta')}
                          </span>
                          <span className="test-cabinet-home-discover__bonuses-cta-sub">
                            {t('buyerData_moreBonusesCtaSub')}
                          </span>
                        </span>
                        <FiArrowRight size={18} className="test-cabinet-home-discover__bonuses-cta-arrow" aria-hidden />
                      </Link>
                    </div>
                    <div className="test-quick-row test-quick-row--logout-below">
                      <button
                        type="button"
                        className="test-quick-pill test-quick-pill--logout"
                        onClick={handleQuickLogout}
                      >
                        <span className="test-quick-pill__icon">
                          <QuickLogoutIcon size={17} aria-hidden />
                        </span>
                        <span className="test-quick-pill__body">
                          <span className="test-quick-pill__title">{quickLogoutLink.title}</span>
                          <span className="test-quick-pill__sub">{quickLogoutLink.subtitle}</span>
                        </span>
                        <FiArrowRight size={15} className="test-quick-pill__arrow" aria-hidden />
                      </button>
                    </div>
                  </section>
                </div>

                <aside className="test-bento__rail">
                  <section className="test-panel test-panel--tight" aria-labelledby="test-docs-title">
                    <h2 id="test-docs-title" className="test-panel__title test-panel__title--sm">
                      {t('buyerCabinet_docsTitle')}
                    </h2>
                    <div className="test-docs-stack">
                      <button
                        type="button"
                        className="test-doc-row"
                        onClick={() => {
                          setHistorySheetOpen(false)
                          setSubscriptionSheetOpen(false)
                          setBookingsSheetOpen(false)
                          setDataSheetOpen(true)
                          scrollMainTo(0, 0, 'instant')
                        }}
                      >
                        <FiFileText size={18} aria-hidden />
                        <div>
                          <span className="test-doc-row__title">{t('buyerCabinet_docsFilesTitle')}</span>
                          <span className="test-doc-row__sub">{t('buyerCabinet_docsFilesSubtitle')}</span>
                        </div>
                        <FiArrowRight size={16} aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="test-doc-row"
                        onClick={() => {
                          setHistorySheetOpen(false)
                          setSubscriptionSheetOpen(false)
                          setBookingsSheetOpen(false)
                          setDataSheetOpen(true)
                          scrollMainTo(0, 0, 'instant')
                        }}
                      >
                        <FiBookOpen size={18} aria-hidden />
                        <div>
                          <span className="test-doc-row__title">{t('buyerCabinet_docsAgreementsTitle')}</span>
                          <span className="test-doc-row__sub">{t('buyerCabinet_docsAgreementsSubtitle')}</span>
                        </div>
                        <FiArrowRight size={16} aria-hidden />
                      </button>
                    </div>
                  </section>
                </aside>
              </div>
                </>
              )}
        </div>
      </div>

      <PassportRecognitionModal
        isOpen={showPassportRecognitionModal}
        onClose={() => {
          setShowPassportRecognitionModal(false)
          setExtractedPassportData(null)
        }}
        onConfirm={() => {}}
        extractedData={extractedPassportData}
      />

      <ProfileSpotlightOnboarding
        active={showTileDataOnboarding}
        targetRef={dataTileRef}
        message="Необходимо заполнить данные"
        bubbleShiftX={-74}
        bubbleShiftY={-22}
        headRotateDeg={-10}
      />
      <ProfileSpotlightOnboarding
        key={`profile-toast-guide-${toastGuideStep}`}
        active={toastGuideSpotlightActive}
        targetRef={toastGuideTargetRef}
        message={toastGuideMessage}
      />

      {showProfileCompleteCelebration || subscriptionCheckoutCelebration ? (
        <>
          <div className="test-profile-complete-confetti" aria-hidden>
            {!reduceMotionUi ? (
              <>
                <Confetti
                  width={windowSize.width}
                  height={windowSize.height}
                  recycle={subscriptionConfettiRecycle}
                  numberOfPieces={
                    vipClubCheckoutCelebration && !showProfileCompleteCelebration ? 820 : 520
                  }
                  gravity={vipClubCheckoutCelebration && !showProfileCompleteCelebration ? 0.11 : 0.1}
                  wind={vipClubCheckoutCelebration && !showProfileCompleteCelebration ? 0.03 : 0.02}
                  colors={[
                    '#10b981',
                    '#0abab5',
                    '#14b8a6',
                    '#a78bfa',
                    '#8b5cf6',
                    '#f59e0b',
                    '#ec4899',
                    '#3b82f6',
                    '#ef4444',
                    '#06b6d4',
                    '#f97316',
                    '#fbbf24',
                  ]}
                  confettiSource={{
                    x: 0,
                    y: 0,
                    w: windowSize.width,
                    h: 0,
                  }}
                  initialVelocityX={vipClubCheckoutCelebration && !showProfileCompleteCelebration ? 5 : 4}
                  initialVelocityY={vipClubCheckoutCelebration && !showProfileCompleteCelebration ? 8 : 6}
                  tweenDuration={11000}
                />
                {vipClubCheckoutCelebration && !showProfileCompleteCelebration ? (
                  <Confetti
                    width={windowSize.width}
                    height={windowSize.height}
                    recycle={subscriptionConfettiRecycle}
                    numberOfPieces={420}
                    gravity={0.14}
                    wind={-0.025}
                    colors={['#a78bfa', '#8b5cf6', '#0abab5', '#34d399', '#fbbf24', '#f472b6']}
                    confettiSource={{
                      x: Math.max(0, windowSize.width * 0.15),
                      y: windowSize.height * 0.85,
                      w: windowSize.width * 0.7,
                      h: 0,
                    }}
                    initialVelocityX={3}
                    initialVelocityY={-10}
                    tweenDuration={12000}
                  />
                ) : null}
              </>
            ) : null}
          </div>
          <div
            className={[
              'test-profile-complete-modal-root',
              vipClubCheckoutCelebration && !showProfileCompleteCelebration ? 'test-profile-complete-modal-root--vipclub' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <div
              className="test-profile-complete-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="test-profile-complete-title"
            >
              {showProfileCompleteCelebration ? (
                <>
                  <h2 id="test-profile-complete-title" className="test-profile-complete-modal__title">
                    Поздравляем!
                  </h2>
                  <p className="test-profile-complete-modal__text">Вы успешно зарегистрировали профиль.</p>
                  <button
                    type="button"
                    className="test-profile-complete-modal__btn"
                    onClick={handleProfileCompleteCelebrationGo}
                  >
                    Перейти
                  </button>
                </>
              ) : vipClubCheckoutCelebration ? (
                <>
                  <h2
                    id="test-profile-complete-title"
                    className="test-profile-complete-modal__title test-profile-complete-modal__title--vipclub"
                  >
                    {t('privateClubVipCelebrationTitle')}
                  </h2>
                  <p className="test-profile-complete-modal__text">{t('privateClubVipCelebrationBody')}</p>
                  <div className="test-profile-complete-modal__vip-actions">
                    <button
                      type="button"
                      className="test-profile-complete-modal__btn"
                      onClick={handleSubscriptionCheckoutCelebrationGo}
                    >
                      {t('privateClubVipCelebrationCtaProfile')}
                    </button>
                    <button
                      type="button"
                      className="test-profile-complete-modal__btn test-profile-complete-modal__btn--whatsapp"
                      onClick={handleVipClubCheckoutCelebrationWhatsApp}
                    >
                      {t('privateClubVipCelebrationCtaWhatsApp')}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h2 id="test-profile-complete-title" className="test-profile-complete-modal__title">
                    {t('buyerSubs_celebrationTitle')}
                  </h2>
                  <p className="test-profile-complete-modal__text">{t('buyerSubs_celebrationBody')}</p>
                  <button type="button" className="test-profile-complete-modal__btn" onClick={handleSubscriptionCheckoutCelebrationGo}>
                    {t('buyerSubs_celebrationCta')}
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      ) : null}

      <ServiceQuickLinksTour
        active={showServiceQuickLinksTour}
        onDismiss={handleServiceQuickLinksTourDismiss}
        groupRef={directionSummariesGridRef}
      />

      {isManagerChatOpen ? (
        <div className="test-manager-chat-modal-root" role="dialog" aria-modal="true" aria-label={t('chatManagerTitle')}>
          <div className="chat-widget chat-widget--manager-dock">
            <div className="chat-widget__header">
              <div className="chat-widget__header-info">
                <div className="chat-widget__avatar chat-widget__avatar--manager">M</div>
                <div className="chat-widget__header-text">
                  <h3 className="chat-widget__title">{t('chatManagerTitle')}</h3>
                  <span className="chat-widget__status">{t('chatManagerOnline')}</span>
                </div>
              </div>
              <button
                type="button"
                className="chat-widget__close"
                onClick={closeManagerChatModal}
                aria-label={t('closeChat')}
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="chat-widget__messages" ref={managerMessagesRef}>
              {managerConnecting ? (
                <div className="chat-widget__message chat-widget__message--bot">
                  <div className="chat-widget__message-content">
                    <div className="chat-widget__typing" aria-hidden>
                      <span />
                      <span />
                      <span />
                    </div>
                    <p className="chat-widget__manager-connect-hint">{t('liveChatWaitNotice')}</p>
                  </div>
                </div>
              ) : (
                managerThreadUi.map((message) => (
                  <div
                    key={message.id}
                    className={`chat-widget__message ${
                      message.sender === 'user'
                        ? 'chat-widget__message--user'
                        : message.sender === 'manager'
                          ? 'chat-widget__message--manager'
                          : 'chat-widget__message--system'
                    }`}
                  >
                    <div className="chat-widget__message-content">{message.text}</div>
                    <div className="chat-widget__message-time">{message.time}</div>
                  </div>
                ))
              )}
            </div>

            <form
              className="chat-widget__input-form"
              onSubmit={(e) => {
                e.preventDefault()
                if (!managerChatInput.trim() || managerConnecting || !liveChatToken) return
                const text = managerChatInput.trim()
                setManagerChatInput('')
                void sendManagerMessage(text)
              }}
            >
              <input
                type="text"
                className="chat-widget__input"
                placeholder={t('chatPlaceholder')}
                value={managerChatInput}
                onChange={(e) => setManagerChatInput(e.target.value)}
                autoComplete="off"
                disabled={managerConnecting || !liveChatToken}
              />
              <button
                type="submit"
                className="chat-widget__send"
                aria-label={t('sendMessage')}
                disabled={managerConnecting || !liveChatToken}
              >
                <FiSend size={18} />
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {isSellObjectPromptOpen ? (
        <div className="test-sell-prompt-modal-root">
          <div
            className="test-sell-prompt-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="test-sell-prompt-title"
          >
            <h3 id="test-sell-prompt-title" className="test-sell-prompt-modal__title">
              Чтобы продать объект зарегистрируйтесь как продавец
            </h3>
            <p className="test-sell-prompt-modal__text">
              Ваш объект автоматически перенесется в новый кабинет.
            </p>
            <div className="test-sell-prompt-modal__actions">
              <button
                type="button"
                className="test-sell-prompt-modal__btn test-sell-prompt-modal__btn--ghost"
                onClick={() => setIsSellObjectPromptOpen(false)}
              >
                Отмена
              </button>
              <button
                type="button"
                className="test-sell-prompt-modal__btn"
                onClick={handleSellObjectPromptConfirm}
              >
                Продолжить
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <TestDriveCheckInModal
        open={checkInBookingId != null}
        bookingId={checkInBookingId}
        onClose={() => setCheckInBookingId(null)}
        onSuccess={() => {
          void refetchBookingsSheetRows()
          window.dispatchEvent(new CustomEvent('owner-notifications-refresh'))
        }}
      />

      <TestDriveBuyerCancelModal
        open={!!testDriveCancelBooking}
        booking={testDriveCancelBooking}
        hasOnlinePayment={Boolean(
          testDriveCancelBooking &&
            testDriveCancelBooking.paid_amount_cents != null &&
            Number(testDriveCancelBooking.paid_amount_cents) > 0,
        )}
        onClose={() => setTestDriveCancelBooking(null)}
        onSuccess={() => {
          void refetchBookingsSheetRows()
          window.dispatchEvent(new CustomEvent('owner-notifications-refresh'))
        }}
      />

      {ownerCommentModalBooking ? (
        <div
          className="test-owner-comment-modal__overlay"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOwnerCommentModalBooking(null)
          }}
        >
          <div className="test-owner-comment-modal" role="dialog" aria-modal="true">
            <h3 className="test-owner-comment-modal__title">{t('buyerCabinet_bookingOwnerCommentTitle')}</h3>
            <p className="test-owner-comment-modal__property">
              <strong>{ownerCommentModalBooking.title}</strong>
            </p>
            <p className="test-owner-comment-modal__text">{ownerCommentModalBooking.comment}</p>
            <div className="test-owner-comment-modal__actions">
              <button
                type="button"
                className="test-owner-comment-modal__btn"
                onClick={() => setOwnerCommentModalBooking(null)}
              >
                {t('buyerCabinet_bookingOwnerCommentClose')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default TestPage

import { useState, useEffect, useCallback, useRef, Fragment } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import {
  ArrowLeft,
  MapPin,
  Home,
  Castle,
  Hotel,
  Building2,
  Store,
  TreePine,
  LayoutGrid,
  Check,
  FileText,
  Lightbulb,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Camera,
  Car,
  FileCheck2,
  BadgeDollarSign,
  Gavel,
  TrendingUp,
  Clock,
} from 'lucide-react'
import {
  FiX,
  FiDollarSign,
  FiCreditCard,
  FiGift,
  FiChevronLeft,
  FiLoader,
} from 'react-icons/fi'
import { OWNER_VIEWS } from '../context/OwnerTestNavigationContext'
import { useOwnerTestEmbeddedNav } from '../hooks/useOwnerTestEmbeddedNav'
import { validateLocationForm } from '../utils/oapLocationGeocode'
import { applyCalculatedPriceToForm } from '../utils/oapApplyCalculatedPrice'
import {
  getAuctionEndDateError,
  getPricingCrossFieldErrors,
  getTodayDateString,
  parseMoneyDigits,
} from '../utils/oapPricingValidation'
import { getAmenityTzKeysForProfile } from '../utils/oapAmenityGroups'
import {
  OAP_DRAFT_SAVE_DEBOUNCE_MS,
  loadOapDraft,
  saveOapDraftPayload,
  clearOapDraft,
  buildOapDraftPayload,
  restoreOapDraftState,
  hasMeaningfulDraftData,
} from '../utils/oapAddPropertyDraft'
import OwnerAddPropertyLocationStep from './OwnerAddPropertyLocationStep'
import OwnerAddPropertyAmenitiesStep from './OwnerAddPropertyAmenitiesStep'
import OwnerAddPropertyMediaStep from './OwnerAddPropertyMediaStep'
import OwnerAddPropertyDocumentsStep from './OwnerAddPropertyDocumentsStep'
import OwnerAddPropertyTestDriveStep from './OwnerAddPropertyTestDriveStep'
import OwnerAddPropertyListingStep from './OwnerAddPropertyListingStep'
import OwnerAddPropertyCalculatorStep from './OwnerAddPropertyCalculatorStep'
import OwnerAddPropertyPricingStep from './OwnerAddPropertyPricingStep'
import { OAP_DESCRIPTION_IMAGES } from './oapDescriptionImages'
import { OAP_PARAMS_IMAGES } from './oapParamsImages'
import SellerVerificationModal from '../components/SellerVerificationModal'
import { getUserData } from '../services/authService'
import { showNotification } from '../utils/toastHelper'
import { requestOpenLoginModal } from '../utils/requestOpenLoginModal'
import { notifyBonusSubmissionsChanged } from '../utils/bonusSubmissionsSync'
import {
  startListingPublicationCheckout,
  confirmListingPublicationFeeSession,
} from '../utils/subscriptionCheckout'
import { publishOapProperty } from '../utils/oapPublishProperty'
import './AddProperty.css'
import './OwnerAddPropertyTestPage.css'
import './OwnerAddPropertyTestPage.mobile.css'

const DESKTOP_STEPS = [
  { id: 1, label: 'Тип', Icon: LayoutGrid },
  { id: 2, label: 'Описание', Icon: FileText },
  { id: 3, label: 'Параметры', Icon: SlidersHorizontal },
  { id: 4, label: 'Адрес', Icon: MapPin },
  { id: 5, label: 'Удобства', Icon: Sparkles },
  { id: 6, label: 'Фото и видео', Icon: Camera },
  { id: 7, label: 'Документы', Icon: FileCheck2 },
  { id: 8, label: 'Тест-драйв', Icon: Car },
  { id: 9, label: 'Формат продажи', Icon: Gavel },
  { id: 10, label: 'Оценка', Icon: TrendingUp },
  { id: 11, label: 'Цена и дата', Icon: BadgeDollarSign },
]

function mapWizardStepToDisplayProgress(wizardStep) {
  return Math.min(wizardStep, 11)
}

const MOBILE_STEPS = [
  { id: 1, label: 'Тип' },
  { id: 2, label: 'Текст' },
  { id: 3, label: 'Параметры' },
  { id: 4, label: 'Адрес' },
  { id: 5, label: 'Удобства' },
  { id: 6, label: 'Медиа' },
  { id: 7, label: 'Документы' },
  { id: 8, label: 'Тест-драйв' },
  { id: 9, label: 'Формат' },
  { id: 10, label: 'Оценка' },
  { id: 11, label: 'Цена' },
]

const BUILDING_TYPE_OPTIONS = [
  { value: 'brick', label: 'Кирпич' },
  { value: 'monolithic', label: 'Монолит' },
  { value: 'panel', label: 'Панель' },
  { value: 'block', label: 'Блок' },
  { value: 'wood', label: 'Дерево' },
  { value: 'frame', label: 'Каркас' },
  { value: 'aerated_concrete', label: 'Газобетон' },
  { value: 'foam_concrete', label: 'Пенобетон' },
  { value: 'other', label: 'Другое' },
]

const CONSTRUCTION_TYPE_OPTIONS = [
  { value: 'monolithic', label: 'Монолитный' },
  { value: 'brick', label: 'Кирпичный' },
  { value: 'panel', label: 'Панельный' },
  { value: 'frame', label: 'Каркасный' },
]

const COMMERCIAL_TYPE_OPTIONS = [
  { value: 'office', label: 'Офис' },
  { value: 'shop', label: 'Магазин' },
  { value: 'warehouse', label: 'Склад' },
  { value: 'other', label: 'Другое' },
]

const LAND_PURPOSE_OPTIONS = [
  { value: 'residential', label: 'Под жилую застройку' },
  { value: 'commercial', label: 'Под бизнес / коммерцию' },
  { value: 'agricultural', label: 'Сельхоз назначение' },
  { value: 'industrial', label: 'Промышленное' },
  { value: 'other', label: 'Другое' },
]

const OTHER_OBJECT_TYPE_OPTIONS = [
  { value: 'mixed', label: 'Смешанный' },
  { value: 'special', label: 'Специального назначения' },
  { value: 'other', label: 'Другое' },
]

const PARAMS_SUBTITLES = {
  apartment: 'Планировка, площади и данные о здании — как в выписке или планировке',
  apartments: 'Планировка, площади и данные о здании — как в выписке или планировке',
  house: 'Площадь участка и дома, этажность, материалы постройки',
  villa: 'Площадь участка и дома, этажность, материалы постройки',
  commercial: 'Площадь помещения, этаж и тип коммерческого объекта',
  land: 'Площадь и назначение земельного участка',
  other: 'Основные характеристики нестандартного объекта',
}

const TITLE_MAX_LENGTH = 80
const DESCRIPTION_MAX_LENGTH = 2000

const PROPERTY_TYPE_OPTIONS = [
  {
    value: 'house',
    label: 'Дом',
    description: 'Частный дом, таунхаус или коттедж',
    Icon: Home,
  },
  {
    value: 'villa',
    label: 'Вилла',
    description: 'Премиальная загородная недвижимость',
    Icon: Castle,
  },
  {
    value: 'apartments',
    label: 'Аппартаменты',
    description: 'Сервисные или инвестиционные апартаменты',
    Icon: Hotel,
  },
  {
    value: 'apartment',
    label: 'Квартира',
    description: 'Квартира в многоквартирном доме',
    Icon: Building2,
  },
  {
    value: 'commercial',
    label: 'Коммерческая',
    description: 'Офис, магазин, склад или другое помещение',
    Icon: Store,
  },
  {
    value: 'land',
    label: 'Земля',
    description: 'Участок под застройку, ферму или бизнес',
    Icon: TreePine,
  },
  {
    value: 'other',
    label: 'Другое',
    description: 'Нестандартный объект или смешанный формат',
    Icon: LayoutGrid,
  },
]

const LISTING_MODES = [
  {
    id: 'auction',
    label: 'Аукцион',
    description: 'Максимизирует рыночную цену за счет конкуренции между покупателями',
    tone: 'teal',
  },
  {
    id: 'auction_buy_now',
    label: 'Аукцион + Продать сейчас',
    description: 'Дает два сценария сразу: борьба ставок и быстрая сделка по фиксированной цене',
    tone: 'violet',
  },
  {
    id: 'shares',
    label: 'Доли',
    description: 'Расширяет круг покупателей за счет входа с меньшим бюджетом',
    tone: 'blue',
  },
  {
    id: 'debt',
    label: 'Долги',
    description: 'Подходит для сложных кейсов: помогает быстрее найти целевого инвестора',
    tone: 'amber',
  },
  {
    id: 'debt_auction',
    label: 'Долги + Аукцион',
    description: 'Ускоряет продажу проблемного актива и повышает шанс на лучшую цену через торги',
    tone: 'slate',
  },
]

const INITIAL_FORM = {
  title: '',
  propertyType: '',
  price: '',
  location: '',
  country: '',
  city: '',
  address: '',
  apartment: '',
  cadastralNumber: '',
  coordinates: null,
  area: '',
  livingArea: '',
  landArea: '',
  rooms: '',
  bedrooms: '',
  bathrooms: '',
  floor: '',
  totalFloors: '',
  yearBuilt: '',
  buildingType: '',
  constructionType: '',
  commercialType: '',
  description: '',
  additionalAmenities: '',
  testDrive: '',
  testDrivePricePerDay: '',
  testDriveInsuranceDeposit: '',
  testDriveCurrency: 'EUR',
  listingMode: '',
  minimumSalePrice: '',
  debtAmount: '',
  listingCurrency: 'EUR',
  calculatorApplied: false,
  auctionStartingPrice: '',
  auctionStartDate: '',
  auctionEndDate: '',
}

function useOapMobile() {
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 900px)').matches : false
  )

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)')
    const onChange = (e) => setMobile(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return mobile
}

function getTypeProfile(propertyType) {
  if (propertyType === 'apartments') return 'apartments'
  if (propertyType === 'apartment') return 'apartment'
  if (propertyType === 'house') return 'house'
  if (propertyType === 'villa') return 'villa'
  if (propertyType === 'commercial') return 'commercial'
  if (propertyType === 'land') return 'land'
  if (propertyType === 'other') return 'other'
  return 'apartment'
}

function parsePositiveNum(value) {
  const n = parseFloat(String(value).replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : null
}

function parseNonNegativeNum(value) {
  const n = parseFloat(String(value).replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? n : null
}

function parseMoneyInput(value) {
  const n = parseFloat(String(value).replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function validateTestDriveDetails(form) {
  const errors = {}
  const price = parseMoneyInput(form.testDrivePricePerDay)
  if (price === null || price <= 0) {
    errors.pricePerDay = 'Укажите стоимость за сутки больше 0'
  }
  if (form.testDriveInsuranceDeposit.trim()) {
    const deposit = parseMoneyInput(form.testDriveInsuranceDeposit)
    if (deposit === null || deposit < 0) {
      errors.insuranceDeposit = 'Страховой депозит не может быть отрицательным'
    }
  }
  return errors
}

function validateListingStep(form) {
  const errors = {}
  if (!form.listingMode) {
    errors.listingMode = 'Выберите формат продажи'
  }
  return errors
}

function validatePricingStep(form) {
  const errors = {}
  const mode = form.listingMode

  if (mode === 'shares') {
    const price = parseMoneyDigits(form.price)
    if (price === null || price <= 0) {
      errors.price = 'Укажите общую стоимость объекта'
    }
    return errors
  }

  if (mode === 'debt') {
    const debt = parseMoneyDigits(form.debtAmount)
    if (debt === null || debt <= 0) {
      errors.debtAmount = 'Укажите сумму долга'
    }
    return errors
  }

  const isAuctionMode = mode === 'auction' || mode === 'auction_buy_now' || mode === 'debt_auction'

  if (mode === 'debt_auction') {
    const debt = parseMoneyDigits(form.debtAmount)
    if (debt === null || debt <= 0) {
      errors.debtAmount = 'Укажите сумму долга'
    }
  }

  if (isAuctionMode) {
    const minSale = parseMoneyDigits(form.minimumSalePrice)
    if (minSale === null || minSale <= 0) {
      errors.minimumSalePrice = 'Укажите минимальную цену продажи'
    }

    if (mode === 'auction_buy_now' || mode === 'debt_auction') {
      const buyNow = parseMoneyDigits(form.price)
      if (buyNow === null || buyNow <= 0) {
        errors.price = 'Укажите цену «Продать сейчас»'
      }
    }

    const startPrice = parseMoneyDigits(form.auctionStartingPrice)
    if (startPrice === null || startPrice <= 0) {
      errors.auctionStartingPrice = 'Укажите стартовую сумму ставки'
    }

    const endDateErr = getAuctionEndDateError(
      form.auctionStartDate || getTodayDateString(),
      form.auctionEndDate,
    )
    if (endDateErr) errors.auctionEndDate = endDateErr

    Object.assign(errors, getPricingCrossFieldErrors(form))
  }

  return errors
}

function validateParametersStep(form, typeProfile) {
  const errors = {}
  const currentYear = new Date().getFullYear()

  if (typeProfile === 'apartment' || typeProfile === 'apartments') {
    if (!parsePositiveNum(form.rooms)) errors.rooms = 'Укажите количество комнат'
    if (!parsePositiveNum(form.bathrooms)) errors.bathrooms = 'Укажите количество санузлов'
    if (!parsePositiveNum(form.area)) errors.area = 'Укажите общую площадь'
    if (!parsePositiveNum(form.livingArea)) errors.livingArea = 'Укажите жилую площадь'
    if (parseNonNegativeNum(form.floor) === null) errors.floor = 'Укажите этаж'
    if (!parsePositiveNum(form.totalFloors)) errors.totalFloors = 'Укажите этажность здания'
    if (!parsePositiveNum(form.yearBuilt)) errors.yearBuilt = 'Укажите год постройки'
    else if (parsePositiveNum(form.yearBuilt) > currentYear) {
      errors.yearBuilt = `Не больше ${currentYear}`
    }
    if (!form.buildingType) errors.buildingType = 'Выберите материал здания'
    const floor = parseNonNegativeNum(form.floor)
    const totalFloors = parsePositiveNum(form.totalFloors)
    if (floor !== null && totalFloors !== null && floor > totalFloors) {
      errors.floor = `Не больше ${totalFloors}`
    }
  }

  if (typeProfile === 'house' || typeProfile === 'villa') {
    if (!parsePositiveNum(form.landArea)) errors.landArea = 'Укажите площадь участка'
    if (!parsePositiveNum(form.area)) errors.area = 'Укажите площадь дома'
    if (!parsePositiveNum(form.livingArea)) errors.livingArea = 'Укажите жилую площадь'
    if (!parsePositiveNum(form.totalFloors)) errors.totalFloors = 'Укажите количество этажей'
    if (!parsePositiveNum(form.bathrooms)) errors.bathrooms = 'Укажите количество санузлов'
    if (!parsePositiveNum(form.yearBuilt)) errors.yearBuilt = 'Укажите год постройки'
    else if (parsePositiveNum(form.yearBuilt) > currentYear) {
      errors.yearBuilt = `Не больше ${currentYear}`
    }
    if (!form.buildingType) errors.buildingType = 'Выберите материал постройки'
  }

  if (typeProfile === 'commercial') {
    if (!parsePositiveNum(form.area)) errors.area = 'Укажите площадь помещения'
    if (!form.commercialType) errors.commercialType = 'Выберите тип объекта'
  }

  if (typeProfile === 'land') {
    if (!parsePositiveNum(form.landArea)) errors.landArea = 'Укажите площадь участка'
    if (!form.commercialType) errors.commercialType = 'Выберите назначение участка'
  }

  if (typeProfile === 'other') {
    if (!parsePositiveNum(form.area)) errors.area = 'Укажите площадь объекта'
  }

  return errors
}

const TOTAL_STEPS = 11

export default function OwnerAddPropertyTestPage() {
  const { isEmbedded, goTo } = useOwnerTestEmbeddedNav()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const isMobile = useOapMobile()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(INITIAL_FORM)
  const [paramErrors, setParamErrors] = useState({})
  const [locationErrors, setLocationErrors] = useState({})
  const [photos, setPhotos] = useState([])
  const [videos, setVideos] = useState([])
  const [requiredDocuments, setRequiredDocuments] = useState({
    ownership: null,
    noDebts: null,
  })
  const [additionalDocuments, setAdditionalDocuments] = useState([])
  const [documentErrors, setDocumentErrors] = useState({})
  const [testDriveErrors, setTestDriveErrors] = useState({})
  const [listingErrors, setListingErrors] = useState({})
  const [pricingErrors, setPricingErrors] = useState({})
  const [selectedAmenities, setSelectedAmenities] = useState([])
  const [userId, setUserId] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showListingFeeModal, setShowListingFeeModal] = useState(false)
  const [showPromoInputInFeeModal, setShowPromoInputInFeeModal] = useState(false)
  const [listingFeePromoCode, setListingFeePromoCode] = useState('')
  const [listingFeePromoError, setListingFeePromoError] = useState(null)
  const [listingFeePromoLoading, setListingFeePromoLoading] = useState(false)
  const [listingFeeStripeLoading, setListingFeeStripeLoading] = useState(false)
  const [showVerificationModal, setShowVerificationModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const listingFeeCheckoutHandledRef = useRef(false)
  const draftReadyRef = useRef(false)
  const saveDraftTimeoutRef = useRef(null)

  const updateField = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleApplyCalculatedPrice = useCallback((recommendedPrice) => {
    setForm((prev) => applyCalculatedPriceToForm(prev, recommendedPrice))
    setPricingErrors((prev) => {
      const next = { ...prev }
      delete next.minimumSalePrice
      delete next.auctionStartingPrice
      delete next.price
      delete next.debtAmount
      return next
    })
  }, [])

  const updateParamField = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setParamErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  const patchForm = useCallback((patch) => {
    setForm((prev) => ({ ...prev, ...patch }))
    setLocationErrors((prev) => {
      const next = { ...prev }
      Object.keys(patch).forEach((key) => {
        if (key in next) delete next[key]
      })
      return next
    })
  }, [])

  const addPhotos = useCallback((files) => {
    const toAdd = files.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      preview: URL.createObjectURL(file),
    }))
    setPhotos((prev) => [...prev, ...toAdd])
  }, [])

  const removePhoto = useCallback((id) => {
    setPhotos((prev) => {
      const item = prev.find((p) => p.id === id)
      if (item?.preview) URL.revokeObjectURL(item.preview)
      return prev.filter((p) => p.id !== id)
    })
  }, [])

  const addVideo = useCallback((video) => {
    setVideos((prev) => [...prev, video])
  }, [])

  const removeVideo = useCallback((id) => {
    setVideos((prev) => prev.filter((video) => video.id !== id))
  }, [])

  const setRequiredDocument = useCallback((key, doc) => {
    setRequiredDocuments((prev) => {
      const existing = prev[key]
      if (existing?.preview?.startsWith('blob:')) {
        URL.revokeObjectURL(existing.preview)
      }
      return { ...prev, [key]: doc }
    })
    setDocumentErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  const removeRequiredDocument = useCallback((key) => {
    setRequiredDocuments((prev) => {
      const existing = prev[key]
      if (existing?.preview?.startsWith('blob:')) {
        URL.revokeObjectURL(existing.preview)
      }
      return { ...prev, [key]: null }
    })
  }, [])

  const addAdditionalDocument = useCallback((doc) => {
    setAdditionalDocuments((prev) => [...prev, doc])
  }, [])

  const removeAdditionalDocument = useCallback((id) => {
    setAdditionalDocuments((prev) => prev.filter((doc) => doc.id !== id))
  }, [])

  const toggleAmenity = useCallback((tzKey) => {
    setSelectedAmenities((prev) =>
      prev.includes(tzKey) ? prev.filter((key) => key !== tzKey) : [...prev, tzKey]
    )
  }, [])

  useEffect(() => {
    const allowed = new Set(getAmenityTzKeysForProfile(getTypeProfile(form.propertyType)))
    setSelectedAmenities((prev) => prev.filter((key) => allowed.has(key)))
  }, [form.propertyType])

  const goToProperties = useCallback(() => {
    if (goTo) {
      goTo(OWNER_VIEWS.PROPERTIES)
    } else {
      navigate('/owner-test?view=properties')
    }
  }, [goTo, navigate])

  const saveDraftNow = useCallback(async () => {
    const payload = await buildOapDraftPayload({
      form,
      step,
      photos,
      videos,
      requiredDocuments,
      additionalDocuments,
      selectedAmenities,
    })
    if (hasMeaningfulDraftData(payload)) {
      saveOapDraftPayload(payload)
    }
  }, [form, step, photos, videos, requiredDocuments, additionalDocuments, selectedAmenities])

  const handlePublish = useCallback(async () => {
    if (!userId) {
      requestOpenLoginModal({ wizard: true })
      return false
    }

    setIsSubmitting(true)
    const result = await publishOapProperty({
      form,
      photos,
      videos,
      requiredDocuments,
      additionalDocuments,
      selectedAmenities,
      userId,
    })
    setIsSubmitting(false)

    if (!result.ok) {
      if (result.error === 'login_required') {
        requestOpenLoginModal({ wizard: true })
        return false
      }
      if (result.error === 'profile_incomplete') {
        showNotification(
          `Для публикации объекта необходимо заполнить профиль. Не заполнены: ${result.missingProfileFields.join(', ')}.`,
        )
        if (goTo) {
          goTo(OWNER_VIEWS.PROFILE)
        } else {
          navigate('/owner-test?view=profile')
        }
        return false
      }
      showNotification(result.error || 'Ошибка при отправке объявления')
      return false
    }

    setShowVerificationModal(false)
    clearOapDraft()
    window.dispatchEvent(new CustomEvent('owner-properties-update'))
    setShowSuccessModal(true)
    return true
  }, [
    userId,
    form,
    photos,
    videos,
    requiredDocuments,
    additionalDocuments,
    selectedAmenities,
    goTo,
    navigate,
  ])

  const handleAfterListingFeeSuccess = useCallback(async () => {
    if (!userId) {
      setShowListingFeeModal(false)
      requestOpenLoginModal({ wizard: true })
      return
    }

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'
    let canPublishWithoutSellerKyc = false

    try {
      const res = await fetch(`${API_BASE_URL}/users/${userId}/verification-status`)
      const data = await res.json().catch(() => ({}))
      if (data.success && data.data) {
        const { isVerified, hasDocuments } = data.data
        if (isVerified === true || hasDocuments === true) {
          canPublishWithoutSellerKyc = true
        }
      }
    } catch (e) {
      console.warn('OAP: не удалось загрузить verification-status', e)
    }

    setShowListingFeeModal(false)

    if (canPublishWithoutSellerKyc) {
      await handlePublish()
    } else {
      setShowVerificationModal(true)
    }
  }, [userId, handlePublish])

  const handleVerificationComplete = useCallback(async () => {
    localStorage.setItem('verificationSubmitted', 'true')
    setShowVerificationModal(false)
    const success = await handlePublish()
    if (success) {
      localStorage.removeItem('verificationSubmitted')
    }
  }, [handlePublish])

  const handleListingFeePayCard = useCallback(async () => {
    if (!userId) {
      requestOpenLoginModal({ wizard: true })
      return
    }
    const uid = String(userId).trim()
    if (!/^\d+$/.test(uid)) {
      showNotification(
        'Для оплаты нужен числовой id пользователя в базе. Подождите синхронизацию после входа или обновите страницу.',
        'error',
      )
      return
    }
    setListingFeeStripeLoading(true)
    try {
      await saveDraftNow()
      const ud = getUserData()
      const result = await startListingPublicationCheckout({
        userId: uid,
        customerEmail: ud?.email || undefined,
        returnPath: '/owner-test',
      })
      if (!result.ok) {
        showNotification(result.error || 'Не удалось перейти к оплате', 'error')
      }
    } catch (e) {
      showNotification(e?.message || 'Ошибка при запуске оплаты', 'error')
    } finally {
      setListingFeeStripeLoading(false)
    }
  }, [userId, saveDraftNow])

  const handleApplyListingFeePromo = useCallback(async () => {
    const code = (listingFeePromoCode || '').trim()
    if (!code) {
      setListingFeePromoError('Введите промокод')
      return
    }
    if (!userId) {
      requestOpenLoginModal({ wizard: true })
      return
    }
    setListingFeePromoError(null)
    setListingFeePromoLoading(true)
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'
      const res = await fetch(`${API_BASE_URL}/bonus-submissions/use-promo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, promo_code: code }),
      })
      const data = await res.json()
      if (data.success) {
        notifyBonusSubmissionsChanged()
        setShowListingFeeModal(false)
        setShowPromoInputInFeeModal(false)
        setListingFeePromoCode('')
        setListingFeePromoError(null)
        await handleAfterListingFeeSuccess()
      } else if (data.reason === 'used') {
        setListingFeePromoError('Этот промокод уже был использован')
      } else {
        setListingFeePromoError(data.message || 'Промокод не найден или не подходит')
      }
    } catch {
      setListingFeePromoError('Ошибка сети. Попробуйте позже.')
    } finally {
      setListingFeePromoLoading(false)
    }
  }, [listingFeePromoCode, userId, handleAfterListingFeeSuccess])

  const handlePriceContinue = useCallback(() => {
    if (!form.title?.trim()) {
      showNotification('Пожалуйста, заполните заголовок')
      return
    }
    if (!photos.length) {
      showNotification('Пожалуйста, загрузите хотя бы одно фото')
      return
    }
    if (!userId) {
      requestOpenLoginModal({ wizard: true })
      return
    }

    setShowListingFeeModal(true)
    setShowPromoInputInFeeModal(false)
    setListingFeePromoCode('')
    setListingFeePromoError(null)
  }, [form.title, photos.length, userId])

  const handleNext = useCallback(() => {
    if (step === 1 && !form.propertyType) return
    if (step === 2 && !form.title.trim()) return
    if (step === 3) {
      const errors = validateParametersStep(form, getTypeProfile(form.propertyType))
      if (Object.keys(errors).length > 0) {
        setParamErrors(errors)
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
      setParamErrors({})
    }
    if (step === 4) {
      const errors = validateLocationForm(form, form.address)
      if (Object.keys(errors).length > 0) {
        setLocationErrors(errors)
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
      setLocationErrors({})
    }
    if (step === 7) {
      const errors = {}
      if (!requiredDocuments.ownership) {
        errors.ownership = 'Загрузите документ собственности'
      }
      if (!requiredDocuments.noDebts) {
        errors.noDebts = 'Загрузите справку об отсутствии обременений'
      }
      if (Object.keys(errors).length > 0) {
        setDocumentErrors(errors)
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
      setDocumentErrors({})
    }
    if (step === 8) {
      if (form.testDrive === 'yes') {
        const errors = validateTestDriveDetails(form)
        if (Object.keys(errors).length > 0) {
          setTestDriveErrors(errors)
          window.scrollTo({ top: 0, behavior: 'smooth' })
          return
        }
      }
      setTestDriveErrors({})
    }
    if (step === 9) {
      const errors = validateListingStep(form)
      if (Object.keys(errors).length > 0) {
        setListingErrors(errors)
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
      setListingErrors({})
    }
    if (step === 11) {
      const errors = validatePricingStep(form)
      if (Object.keys(errors).length > 0) {
        setPricingErrors(errors)
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
      setPricingErrors({})
    }
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      handlePriceContinue()
    }
  }, [step, form, requiredDocuments, handlePriceContinue])

  const handleBack = useCallback(() => {
    if (step > 1) {
      setStep((s) => s - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      goToProperties()
    }
  }, [step, goToProperties])

  const handleStepClick = useCallback(
    (targetStep) => {
      if (targetStep === step || isSubmitting) return
      setStep(targetStep)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [step, isSubmitting],
  )

  const handleTestDriveChoice = useCallback((choice) => {
    setForm((prev) => ({
      ...prev,
      testDrive: choice,
      ...(choice === 'yes'
        ? {
            listingMode: 'auction_buy_now',
            testDrivePricePerDay: prev.testDrivePricePerDay,
            testDriveInsuranceDeposit: prev.testDriveInsuranceDeposit,
          }
        : {
            testDrivePricePerDay: '',
            testDriveInsuranceDeposit: '',
          }),
    }))
    setTestDriveErrors({})
  }, [])

  const handleTestDriveDetailChange = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setTestDriveErrors((prev) => {
      const fieldKey = key === 'testDrivePricePerDay' ? 'pricePerDay' : 'insuranceDeposit'
      if (!prev[fieldKey]) return prev
      const next = { ...prev }
      delete next[fieldKey]
      return next
    })
  }, [])

  useEffect(() => {
    const userData = getUserData()
    if (userData.isLoggedIn && userData.id) {
      setUserId(userData.id)
    }
  }, [])

  useEffect(() => {
    if (location.state?.openListingFeeModal) {
      setStep(TOTAL_STEPS)
      setShowListingFeeModal(true)
      setShowPromoInputInFeeModal(false)
      setListingFeePromoCode('')
      setListingFeePromoError(null)
      navigate(location.pathname + location.search, { replace: true, state: {} })
    }
  }, [location.state?.openListingFeeModal, location.pathname, location.search, navigate])

  useEffect(() => {
    const checkout = searchParams.get('listing_fee_checkout')
    const sessionId = searchParams.get('session_id')

    if (checkout === 'canceled') {
      const next = new URLSearchParams(searchParams)
      next.delete('listing_fee_checkout')
      next.delete('session_id')
      setSearchParams(next, { replace: true })
      setStep(TOTAL_STEPS)
      setShowListingFeeModal(true)
      setShowPromoInputInFeeModal(false)
      setListingFeePromoCode('')
      setListingFeePromoError(null)
      return
    }

    if (checkout !== 'success' || !sessionId || !sessionId.startsWith('cs_')) return
    if (!userId) return
    if (listingFeeCheckoutHandledRef.current === sessionId) return

    let cancelled = false
    const run = async () => {
      listingFeeCheckoutHandledRef.current = sessionId
      try {
        const result = await confirmListingPublicationFeeSession(sessionId, String(userId))
        if (cancelled) return
        if (result.ok) {
          if (result.data?.already) {
            showNotification('Оплата публикации уже была учтена ранее.')
          } else {
            showNotification('Оплата получена. Продолжаем публикацию.')
          }
          const next = new URLSearchParams(searchParams)
          next.delete('listing_fee_checkout')
          next.delete('session_id')
          setSearchParams(next, { replace: true })
          setStep(TOTAL_STEPS)
          await handleAfterListingFeeSuccess()
        } else {
          showNotification(result.error || 'Не удалось подтвердить оплату', 'error')
          listingFeeCheckoutHandledRef.current = false
        }
      } catch (e) {
        if (!cancelled) {
          showNotification(e?.message || 'Ошибка подтверждения оплаты', 'error')
          listingFeeCheckoutHandledRef.current = false
        }
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [searchParams, userId, setSearchParams, handleAfterListingFeeSuccess])

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      const draft = loadOapDraft()
      if (!draft || !hasMeaningfulDraftData(draft)) {
        draftReadyRef.current = true
        return
      }

      const restored = await restoreOapDraftState(draft)
      if (cancelled || !restored) {
        draftReadyRef.current = true
        return
      }

      setForm({ ...INITIAL_FORM, ...restored.form })
      setStep(restored.step)
      setPhotos(restored.photos)
      setVideos(restored.videos)
      setRequiredDocuments(restored.requiredDocuments)
      setAdditionalDocuments(restored.additionalDocuments)
      setSelectedAmenities(restored.selectedAmenities)
      draftReadyRef.current = true
    })()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!draftReadyRef.current) return undefined

    if (saveDraftTimeoutRef.current) clearTimeout(saveDraftTimeoutRef.current)
    saveDraftTimeoutRef.current = setTimeout(() => {
      saveDraftTimeoutRef.current = null
      void (async () => {
        const payload = await buildOapDraftPayload({
          form,
          step,
          photos,
          videos,
          requiredDocuments,
          additionalDocuments,
          selectedAmenities,
        })
        if (!hasMeaningfulDraftData(payload)) {
          clearOapDraft()
          return
        }
        saveOapDraftPayload(payload)
      })()
    }, OAP_DRAFT_SAVE_DEBOUNCE_MS)

    return () => {
      if (saveDraftTimeoutRef.current) clearTimeout(saveDraftTimeoutRef.current)
    }
  }, [
    form,
    step,
    photos,
    videos,
    requiredDocuments,
    additionalDocuments,
    selectedAmenities,
  ])

  useEffect(() => {
    if (isEmbedded) return undefined
    document.documentElement.classList.add('oap-page-active')
    return () => document.documentElement.classList.remove('oap-page-active')
  }, [isEmbedded])

  useEffect(() => {
    return () => {
      photos.forEach((p) => {
        if (p.preview) URL.revokeObjectURL(p.preview)
      })
      Object.values(requiredDocuments).forEach((doc) => {
        if (doc?.preview?.startsWith('blob:')) URL.revokeObjectURL(doc.preview)
      })
    }
  }, [photos, requiredDocuments])

  const progressSteps = isMobile ? MOBILE_STEPS : DESKTOP_STEPS
  const activeProgress = isMobile ? step : mapWizardStepToDisplayProgress(step)
  const canProceed =
    (step === 1 && Boolean(form.propertyType)) ||
    (step === 2 && Boolean(form.title.trim())) ||
    step > 2

  const renderStepType = () => (
    <section className="oap-type-step" aria-labelledby="oap-type-step-title">
      <header className="oap-type-step__head">
        <h2 id="oap-type-step-title" className="oap-type-step__title">
          Выберите тип недвижимости
        </h2>
        <p className="oap-type-step__subtitle">
          От типа зависят поля объявления, характеристики и способ публикации на платформе
        </p>
      </header>

      <div className="oap-type-grid" role="listbox" aria-label="Тип недвижимости">
        {PROPERTY_TYPE_OPTIONS.map((type) => {
          const isActive = form.propertyType === type.value
          const TypeIcon = type.Icon
          return (
            <button
              key={type.value}
              type="button"
              role="option"
              aria-selected={isActive}
              className={`oap-type-card${isActive ? ' oap-type-card--active' : ''}`}
              onClick={() => updateField('propertyType', type.value)}
            >
              <span className="oap-type-card__icon" aria-hidden>
                <TypeIcon size={26} strokeWidth={1.85} />
              </span>
              <span className="oap-type-card__body">
                <span className="oap-type-card__title">{type.label}</span>
                <span className="oap-type-card__desc">{type.description}</span>
              </span>
              <span className="oap-type-card__check" aria-hidden>
                <Check size={16} strokeWidth={2.75} />
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )

  const renderStepText = () => {
    const titleLength = form.title.length
    const descriptionLength = form.description.length
    const selectedType = PROPERTY_TYPE_OPTIONS.find((t) => t.value === form.propertyType)

    return (
      <section className="oap-text-step" aria-labelledby="oap-text-step-title">
        <div className="oap-text-step__layout">
          <div className="oap-text-step__main">
            <header className="oap-text-step__head">
              <h2 id="oap-text-step-title" className="oap-text-step__title">
                Расскажите о вашем объекте
              </h2>
              <p className="oap-text-step__subtitle">
                {selectedType
                  ? `Добавьте название и описание ${selectedType.label.toLowerCase()} — их увидят покупатели в каталоге`
                  : 'Добавьте название и описание — их увидят покупатели в каталоге'}
              </p>
            </header>

            <div className="oap-text-step__fields">
              <label className="oap-text-field">
                <span className="oap-text-field__label-row">
                  <span className="oap-text-field__label">Название объекта</span>
                  <span className="oap-text-field__badge oap-text-field__badge--required">Обязательно</span>
                </span>
                <span className="oap-text-field__control">
                  <input
                    type="text"
                    className="oap-text-field__input"
                    placeholder="Например, Вилла с видом на океан в Майами"
                    value={form.title}
                    maxLength={TITLE_MAX_LENGTH}
                    required
                    aria-required="true"
                    onChange={(e) => updateField('title', e.target.value)}
                  />
                  <span className="oap-text-field__counter">
                    {titleLength}/{TITLE_MAX_LENGTH}
                  </span>
                </span>
              </label>

              <label className="oap-text-field">
                <span className="oap-text-field__label-row">
                  <span className="oap-text-field__label">Описание объекта</span>
                  <span className="oap-text-field__badge oap-text-field__badge--optional">Необязательно</span>
                </span>
                <span className="oap-text-field__control">
                  <textarea
                    className="oap-text-field__textarea"
                    rows={8}
                    placeholder="Опишите объект подробно: расположение, состояние, удобства рядом, особенности сделки…"
                    value={form.description}
                    maxLength={DESCRIPTION_MAX_LENGTH}
                    onChange={(e) => updateField('description', e.target.value)}
                  />
                  <span
                    className={`oap-text-field__counter${descriptionLength > DESCRIPTION_MAX_LENGTH * 0.9 ? ' oap-text-field__counter--warn' : ''}`}
                  >
                    {descriptionLength}/{DESCRIPTION_MAX_LENGTH}
                  </span>
                </span>
              </label>
            </div>
          </div>

          <aside className="oap-text-step__tip" aria-label="Совет">
            <div className="oap-text-step__tip-head">
              <Lightbulb size={18} strokeWidth={2} className="oap-text-step__tip-icon" aria-hidden />
              <span className="oap-text-step__tip-title">Совет</span>
            </div>
            <p className="oap-text-step__tip-text">
              Хорошее описание повышает интерес покупателей. Укажите ключевые преимущества объекта и
              особенности расположения.
            </p>
            <div className="oap-text-step__tip-illustration">
              <img
                src={OAP_DESCRIPTION_IMAGES.sidebarHero}
                alt=""
                className="oap-text-step__tip-img"
              />
            </div>
          </aside>
        </div>
      </section>
    )
  }

  const renderStepParams = () => {
    const typeProfile = getTypeProfile(form.propertyType)
    const selectedType = PROPERTY_TYPE_OPTIONS.find((t) => t.value === form.propertyType)

    const fieldClassName = (key, { fullWidth } = {}) =>
      [
        'oap-param-field',
        paramErrors[key] ? 'oap-param-field--error' : '',
        fullWidth ? 'oap-param-field--full' : '',
      ]
        .filter(Boolean)
        .join(' ')

    const renderFieldLabel = (label, { required } = {}) => (
      <span className="oap-param-field__label-row">
        <span className="oap-param-field__label">{label}</span>
        {required ? (
          <span className="oap-param-field__req" title="Обязательное поле" aria-hidden>
            *
          </span>
        ) : null}
      </span>
    )

    const renderNumberField = (
      key,
      label,
      { suffix = '', placeholder, required, fullWidth } = {}
    ) => (
      <label key={key} className={fieldClassName(key, { fullWidth })}>
        {renderFieldLabel(label, { required })}
        <div className="oap-param-field__control">
          <div className="oap-param-field__input-wrap">
            <input
              type="text"
              inputMode="decimal"
              className={`oap-param-field__input${suffix ? ' oap-param-field__input--suffix' : ''}`}
              placeholder={placeholder}
              value={form[key]}
              onChange={(e) => updateParamField(key, e.target.value.replace(/[^\d.,]/g, ''))}
            />
            {suffix && <span className="oap-param-field__suffix">{suffix}</span>}
          </div>
        </div>
        {paramErrors[key] && <span className="oap-param-field__error">{paramErrors[key]}</span>}
      </label>
    )

    const renderSelectField = (key, label, options, { placeholder, required, fullWidth } = {}) => (
      <label key={key} className={fieldClassName(key, { fullWidth })}>
        {renderFieldLabel(label, { required })}
        <div className="oap-param-field__control">
          <select
            className={`oap-param-field__select${form[key] ? '' : ' oap-param-field__select--placeholder'}`}
            value={form[key]}
            onChange={(e) => updateParamField(key, e.target.value)}
          >
            <option value="">{placeholder}</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        {paramErrors[key] && <span className="oap-param-field__error">{paramErrors[key]}</span>}
      </label>
    )

    const renderFloorCombinedField = () => (
      <label
        key="floor-combined"
        className={`${fieldClassName('floor')}${paramErrors.totalFloors && !paramErrors.floor ? ' oap-param-field--error' : ''}`}
      >
        {renderFieldLabel('Этаж', { required: true })}
        <div className="oap-param-field__control">
          <div className="oap-param-field__floor-row">
            <input
              type="text"
              inputMode="numeric"
              className="oap-param-field__input oap-param-field__input--floor"
              placeholder="0"
              value={form.floor}
              onChange={(e) => updateParamField('floor', e.target.value.replace(/[^\d]/g, ''))}
            />
            <span className="oap-param-field__floor-sep">из</span>
            <input
              type="text"
              inputMode="numeric"
              className="oap-param-field__input oap-param-field__input--floor-total"
              placeholder="0"
              value={form.totalFloors}
              onChange={(e) => updateParamField('totalFloors', e.target.value.replace(/[^\d]/g, ''))}
            />
          </div>
        </div>
        {(paramErrors.floor || paramErrors.totalFloors) && (
          <span className="oap-param-field__error">
            {paramErrors.floor || paramErrors.totalFloors}
          </span>
        )}
      </label>
    )

    const renderParamsGrid = (children) => <div className="oap-params-grid">{children}</div>

    const renderParamsFields = () => (
      <>
        {(typeProfile === 'apartment' || typeProfile === 'apartments') &&
          renderParamsGrid(
            <>
              {renderNumberField('area', 'Общая площадь', {
                suffix: 'м²',
                placeholder: '0',
                required: true,
              })}
              {renderNumberField('livingArea', 'Жилая площадь', {
                suffix: 'м²',
                placeholder: '0',
                required: true,
              })}
              {renderNumberField('rooms', 'Комнаты', {
                placeholder: '0',
                required: true,
              })}
              {renderFloorCombinedField()}
              {renderNumberField('bathrooms', 'Санузлы', {
                placeholder: '0',
                required: true,
              })}
              {renderNumberField('yearBuilt', 'Год постройки', {
                placeholder: String(new Date().getFullYear()),
                required: true,
              })}
              {renderSelectField('buildingType', 'Материал здания', BUILDING_TYPE_OPTIONS, {
                placeholder: 'Выберите материал',
                required: true,
              })}
              {renderSelectField('constructionType', 'Тип конструкции', CONSTRUCTION_TYPE_OPTIONS, {
                placeholder: 'Выберите тип конструкции',
              })}
            </>
          )}

        {(typeProfile === 'house' || typeProfile === 'villa') &&
          renderParamsGrid(
            <>
              {renderNumberField('landArea', 'Площадь участка', {
                suffix: 'м²',
                placeholder: '0',
                required: true,
              })}
              {renderNumberField('area', 'Площадь дома (общая)', {
                suffix: 'м²',
                placeholder: '0',
                required: true,
              })}
              {renderNumberField('livingArea', 'Площадь дома (жилая)', {
                suffix: 'м²',
                placeholder: '0',
                required: true,
              })}
              {renderNumberField('totalFloors', 'Этажей в доме', {
                placeholder: '0',
                required: true,
              })}
              {renderNumberField('bathrooms', 'Санузлы', {
                placeholder: '0',
                required: true,
              })}
              {renderNumberField('yearBuilt', 'Год постройки', {
                placeholder: String(new Date().getFullYear()),
                required: true,
              })}
              {renderSelectField('buildingType', 'Материал постройки', BUILDING_TYPE_OPTIONS, {
                placeholder: 'Выберите материал',
                required: true,
              })}
              {renderSelectField('constructionType', 'Тип конструкции', CONSTRUCTION_TYPE_OPTIONS, {
                placeholder: 'Выберите тип конструкции',
              })}
            </>
          )}

        {typeProfile === 'commercial' &&
          renderParamsGrid(
            <>
              {renderNumberField('area', 'Площадь помещения', {
                suffix: 'м²',
                placeholder: '0',
                required: true,
              })}
              {renderNumberField('floor', 'Этаж / уровень', {
                placeholder: '0',
              })}
              {renderNumberField('totalFloors', 'Этажей в здании', {
                placeholder: '0',
              })}
              {renderSelectField(
                'commercialType',
                'Тип коммерческого объекта',
                COMMERCIAL_TYPE_OPTIONS,
                {
                  placeholder: 'Выберите тип',
                  required: true,
                }
              )}
              {renderSelectField('constructionType', 'Тип конструкции', CONSTRUCTION_TYPE_OPTIONS, {
                placeholder: 'Выберите тип конструкции',
              })}
            </>
          )}

        {typeProfile === 'land' &&
          renderParamsGrid(
            <>
              {renderNumberField('landArea', 'Площадь участка', {
                suffix: 'м²',
                placeholder: '0',
                required: true,
              })}
              {renderSelectField('commercialType', 'Назначение участка', LAND_PURPOSE_OPTIONS, {
                placeholder: 'Выберите назначение',
                required: true,
              })}
            </>
          )}

        {typeProfile === 'other' &&
          renderParamsGrid(
            <>
              {renderNumberField('area', 'Площадь', {
                suffix: 'м²',
                placeholder: '0',
                required: true,
              })}
              {renderSelectField('commercialType', 'Тип объекта', OTHER_OBJECT_TYPE_OPTIONS, {
                placeholder: 'Выберите тип',
              })}
            </>
          )}
      </>
    )

    return (
      <section className="oap-params-step" aria-labelledby="oap-params-step-title">
        <div className="oap-params-step__layout">
          <div className="oap-params-step__main">
            <header className="oap-params-step__head">
              <h2 id="oap-params-step-title" className="oap-params-step__title">
                Параметры объекта
              </h2>
              <p className="oap-params-step__subtitle">
                {selectedType
                  ? `Укажите основные характеристики — ${PARAMS_SUBTITLES[typeProfile] || PARAMS_SUBTITLES.apartment}`
                  : 'Укажите основные характеристики'}
              </p>
            </header>

            <div className="oap-params-step__fields">{renderParamsFields()}</div>
          </div>

          <aside className="oap-params-step__tip" aria-label="Подсказка">
            <div className="oap-params-step__tip-head">
              <ShieldCheck
                size={18}
                strokeWidth={2}
                className="oap-params-step__tip-icon"
                aria-hidden
              />
              <span className="oap-params-step__tip-title">Подсказка</span>
            </div>
            <p className="oap-params-step__tip-text">
              Чем точнее вы укажете параметры, тем легче покупателям будет найти ваш объект.
            </p>
            <div className="oap-params-step__tip-illustration">
              <img
                src={OAP_PARAMS_IMAGES.sidebarHero}
                alt=""
                className="oap-params-step__tip-img"
              />
            </div>
          </aside>
        </div>
      </section>
    )
  }

  const renderStepLocation = () => (
    <OwnerAddPropertyLocationStep
      form={form}
      onFormPatch={patchForm}
      errors={locationErrors}
    />
  )

  const renderStepMedia = () => (
    <OwnerAddPropertyMediaStep
      photos={photos}
      videos={videos}
      onAddPhotos={addPhotos}
      onRemovePhoto={removePhoto}
      onAddVideo={addVideo}
      onRemoveVideo={removeVideo}
    />
  )

  const renderStepDocuments = () => (
    <OwnerAddPropertyDocumentsStep
      requiredDocuments={requiredDocuments}
      additionalDocuments={additionalDocuments}
      errors={documentErrors}
      onRequiredChange={setRequiredDocument}
      onRequiredRemove={removeRequiredDocument}
      onAddAdditional={addAdditionalDocument}
      onRemoveAdditional={removeAdditionalDocument}
    />
  )

  const renderStepAmenities = () => {
    const typeProfile = getTypeProfile(form.propertyType)
    const selectedType = PROPERTY_TYPE_OPTIONS.find((t) => t.value === form.propertyType)

    return (
      <OwnerAddPropertyAmenitiesStep
        propertyType={form.propertyType}
        typeProfile={typeProfile}
        propertyTypeLabel={selectedType?.label}
        additionalAmenities={form.additionalAmenities}
        selectedAmenities={selectedAmenities}
        onAdditionalChange={(value) => updateField('additionalAmenities', value)}
        onToggleAmenity={toggleAmenity}
      />
    )
  }

  const renderStepTestDrive = () => {
    const selectedType = PROPERTY_TYPE_OPTIONS.find((t) => t.value === form.propertyType)

    return (
      <OwnerAddPropertyTestDriveStep
        testDrive={form.testDrive}
        pricePerDay={form.testDrivePricePerDay}
        insuranceDeposit={form.testDriveInsuranceDeposit}
        currency={form.testDriveCurrency}
        propertyTypeOption={selectedType}
        errors={testDriveErrors}
        onSelectChoice={handleTestDriveChoice}
        onChangeDetail={handleTestDriveDetailChange}
      />
    )
  }

  const renderStepListing = () => {
    const listingModes =
      form.testDrive === 'yes'
        ? LISTING_MODES.filter((mode) => mode.id === 'auction_buy_now')
        : LISTING_MODES

    return (
      <OwnerAddPropertyListingStep
        listingModes={listingModes}
        listingMode={form.listingMode}
        testDriveEnabled={form.testDrive === 'yes'}
        errors={listingErrors}
        onSelectMode={(modeId) => {
          updateField('listingMode', modeId)
          setListingErrors((prev) => {
            if (!prev.listingMode) return prev
            const next = { ...prev }
            delete next.listingMode
            return next
          })
        }}
      />
    )
  }

  const renderStepCalculator = () => (
    <OwnerAddPropertyCalculatorStep
      propertyData={{
        propertyType: form.propertyType,
        area: form.area,
        rooms: form.rooms,
        city: form.city,
        country: form.country,
        address: form.address,
        location: form.location,
      }}
      calculatorApplied={form.calculatorApplied}
      onApplyRecommendedPrice={handleApplyCalculatedPrice}
    />
  )

  const renderStepPricing = () => (
    <OwnerAddPropertyPricingStep
      listingMode={form.listingMode}
      minimumSalePrice={form.minimumSalePrice}
      price={form.price}
      debtAmount={form.debtAmount}
      auctionStartingPrice={form.auctionStartingPrice}
      auctionStartDate={form.auctionStartDate}
      auctionEndDate={form.auctionEndDate}
      currency={form.listingCurrency}
      errors={pricingErrors}
      onChangeField={(key, value) => {
        const nextForm = { ...form, [key]: value }
        updateField(key, value)
        setPricingErrors((prev) => {
          const next = { ...prev }
          delete next[key]

          const crossKeys = ['minimumSalePrice', 'price', 'auctionStartingPrice']
          if (crossKeys.includes(key)) {
            const cross = getPricingCrossFieldErrors(nextForm)
            for (const crossKey of crossKeys) {
              if (cross[crossKey]) next[crossKey] = cross[crossKey]
              else delete next[crossKey]
            }
          }

          return next
        })
      }}
    />
  )

  const stepContent = {
    1: renderStepType,
    2: renderStepText,
    3: renderStepParams,
    4: renderStepLocation,
    5: renderStepAmenities,
    6: renderStepMedia,
    7: renderStepDocuments,
    8: renderStepTestDrive,
    9: renderStepListing,
    10: renderStepCalculator,
    11: renderStepPricing,
  }

  return (
    <div
      className={`oap${step === 2 ? ' oap--step-description' : ''}${step === 3 ? ' oap--step-params' : ''}${step === 7 ? ' oap--step-documents' : ''}${step === 8 ? ' oap--step-testdrive' : ''}${step === 9 ? ' oap--step-listing' : ''}${step === 10 ? ' oap--step-calculator' : ''}${step === 11 ? ' oap--step-pricing' : ''}`}
    >
      <div className="oap-shell">
        <header className="oap-header">
          <button type="button" className="oap-header__back" aria-label="Назад" onClick={goToProperties}>
            <ArrowLeft size={22} strokeWidth={2} />
          </button>
          <h1 className="oap-header__title">Добавление объекта</h1>
        </header>

        <nav className="oap-stepper oap-stepper--icons" aria-label="Шаги добавления объекта">
          {progressSteps.map((s, idx) => {
            const num = idx + 1
            const isActive = num === activeProgress
            const isDone = num < activeProgress
            const StepIcon = s.Icon
            return (
              <Fragment key={s.id}>
                <button
                  type="button"
                  className={`oap-stepper__item${isActive ? ' oap-stepper__item--active' : ''}${isDone ? ' oap-stepper__item--done' : ''}`}
                  onClick={() => handleStepClick(num)}
                  disabled={isSubmitting}
                  aria-current={isActive ? 'step' : undefined}
                  aria-label={`Шаг ${num}: ${s.label}`}
                >
                  <span className="oap-stepper__dot">
                    {StepIcon ? <StepIcon size={16} strokeWidth={1.85} /> : num}
                  </span>
                  <span className="oap-stepper__label">
                    <span className="oap-stepper__num">{num}</span> {s.label}
                  </span>
                </button>
                {idx < progressSteps.length - 1 && (
                  <span
                    className={`oap-stepper__line${isDone ? ' oap-stepper__line--done' : ''}`}
                    aria-hidden
                  />
                )}
              </Fragment>
            )
          })}
        </nav>

        <div className="oap-content">
          {stepContent[step]?.()}
        </div>

        <footer className="oap-footer oap-footer--wizard">
          <div className="oap-footer__actions">
            {step > 1 && (
              <button type="button" className="oap-btn oap-btn--ghost oap-desktop-only" onClick={handleBack}>
                Назад
              </button>
            )}
            <button
              type="button"
              className={`oap-btn oap-btn--primary${isMobile ? ' oap-btn--full' : ''}`}
              onClick={handleNext}
              disabled={!canProceed || isSubmitting}
            >
              {isSubmitting
                ? 'Отправка…'
                : step === TOTAL_STEPS
                  ? 'Опубликовать'
                  : 'Далее'}
            </button>
          </div>
        </footer>
      </div>

      <SellerVerificationModal
        isOpen={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        userId={userId}
        onComplete={handleVerificationComplete}
      />

      {showListingFeeModal && (
        <div
          className="listing-fee-modal-overlay"
          onClick={() => {
            if (!showPromoInputInFeeModal) setShowListingFeeModal(false)
          }}
        >
          <div
            className={`listing-fee-modal ${showPromoInputInFeeModal ? 'listing-fee-modal--promo' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="listing-fee-modal__close"
              onClick={() => {
                setShowListingFeeModal(false)
                setShowPromoInputInFeeModal(false)
                setListingFeePromoCode('')
                setListingFeePromoError(null)
              }}
              aria-label="Закрыть"
            >
              <FiX size={22} />
            </button>
            {!showPromoInputInFeeModal ? (
              <>
                <div className="listing-fee-modal__icon">
                  <FiDollarSign size={32} />
                </div>
                <h2 className="listing-fee-modal__title">Оплата публикации объекта</h2>
                <p className="listing-fee-modal__text">
                  Чтобы выложить объект, необходимо оплатить <strong>29 €</strong> за размещение на платформе.
                </p>
                <div className="listing-fee-modal__options">
                  <button
                    type="button"
                    className="listing-fee-modal__option listing-fee-modal__option--card"
                    onClick={handleListingFeePayCard}
                    disabled={listingFeeStripeLoading}
                  >
                    <FiCreditCard size={24} aria-hidden />
                    <span>{listingFeeStripeLoading ? 'Переход к оплате…' : 'Карта (Stripe)'}</span>
                    <span className="listing-fee-modal__option-badge listing-fee-modal__option-badge--price">
                      29 €
                    </span>
                  </button>
                  <button
                    type="button"
                    className="listing-fee-modal__option"
                    onClick={() => setShowPromoInputInFeeModal(true)}
                  >
                    <FiGift size={24} />
                    <span>Есть промокод</span>
                  </button>
                </div>
                <p className="listing-fee-modal__get-promo">
                  <button
                    type="button"
                    className="listing-fee-modal__get-promo-link"
                    onClick={() => {
                      setShowListingFeeModal(false)
                      setShowPromoInputInFeeModal(false)
                      setListingFeePromoCode('')
                      setListingFeePromoError(null)
                      navigate('/bonuses?tab=seller', {
                        state: { fromListingFee: true, returnPath: '/owner-test?view=add-property' },
                      })
                    }}
                  >
                    получить промокод
                  </button>
                </p>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="listing-fee-modal__back"
                  onClick={() => {
                    setShowPromoInputInFeeModal(false)
                    setListingFeePromoCode('')
                    setListingFeePromoError(null)
                  }}
                >
                  <FiChevronLeft size={18} /> Назад
                </button>
                <div className="listing-fee-modal__icon listing-fee-modal__icon--promo">
                  <FiGift size={32} />
                </div>
                <h2 className="listing-fee-modal__title">Введите промокод</h2>
                <p className="listing-fee-modal__text">
                  Промокод из бонусных заданий для продавцов позволяет бесплатно опубликовать объект.
                </p>
                <div className="listing-fee-modal__promo-row">
                  <input
                    type="text"
                    className="listing-fee-modal__input"
                    placeholder="Например: BONUS-SELLER-INSTA-10"
                    value={listingFeePromoCode}
                    onChange={(e) => {
                      setListingFeePromoCode(e.target.value)
                      setListingFeePromoError(null)
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleApplyListingFeePromo()}
                    disabled={listingFeePromoLoading}
                  />
                  <button
                    type="button"
                    className="listing-fee-modal__apply"
                    onClick={handleApplyListingFeePromo}
                    disabled={listingFeePromoLoading}
                  >
                    {listingFeePromoLoading ? (
                      <FiLoader size={20} className="listing-fee-modal__spinner" />
                    ) : (
                      'Применить'
                    )}
                  </button>
                </div>
                {listingFeePromoError && (
                  <p className="listing-fee-modal__error" role="alert">
                    {listingFeePromoError}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div
          className="success-modal-overlay"
          onClick={() => {
            setShowSuccessModal(false)
            goToProperties()
          }}
        >
          <div className="success-modal" onClick={(e) => e.stopPropagation()}>
            <div className="success-modal__icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#0ABAB5" strokeWidth="2" />
                <path
                  d="M8 12L11 15L16 9"
                  stroke="#0ABAB5"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h2 className="success-modal__title">Ваш объект отправлен на модерацию</h2>
            <p className="success-modal__message">
              <Clock size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              Ожидайте ответ в течение 48 часов
            </p>
            <button
              type="button"
              className="success-modal__button"
              onClick={() => {
                setShowSuccessModal(false)
                goToProperties()
              }}
            >
              Понятно
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

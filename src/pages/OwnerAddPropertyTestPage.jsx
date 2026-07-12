import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '../i18n/config'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import {
  ArrowLeft,
  Home,
  Castle,
  Hotel,
  Building2,
  Store,
  TreePine,
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
import { applyPricingFieldChange } from '../utils/oapAuctionPriceAuto'
import {
  getAuctionEndDateError,
  getPricingCrossFieldErrors,
  getTodayDateString,
  parseMoneyDigits,
} from '../utils/oapPricingValidation'
import { getAmenityTzKeysForProfile } from '../utils/oapAmenityGroups'
import { scrollMainTo } from '../utils/mainScroll'
import {
  OAP_DRAFT_SAVE_DEBOUNCE_MS,
  loadOapDraft,
  saveOapDraftPayload,
  clearOapDraft,
  buildOapDraftPayload,
  restoreOapDraftState,
  hasMeaningfulDraftData,
} from '../utils/oapAddPropertyDraft'
import {
  PURCHASED_LISTING_DRAFT_FLAG,
  applyPurchasedPropertyListingPrefill,
  readPendingSellPurchasedProperty,
} from '../utils/purchasedPropertyListingPrefill'
import OwnerAddPropertyBasicsStep from './OwnerAddPropertyBasicsStep'
import OwnerAddPropertyStrategyStep from './OwnerAddPropertyStrategyStep'
import OwnerAddPropertyFinanceStep from './OwnerAddPropertyFinanceStep'
import OwnerAddPropertyVerificationStep from './OwnerAddPropertyVerificationStep'
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
import OapAddPropertyJourneyStrip from '../components/OapAddPropertyJourneyStrip'
import OapAddPropertyJourneyProgress from '../components/OapAddPropertyJourneyProgress'
import { preloadOapWizardImages } from './oapWizardImages'
import { OapAddPropertyMobileWelcome } from '../components/OapAddPropertyMobileScreens'
import OapPublishSuccessDrawer from '../components/OapPublishSuccessDrawer'
import OapPurchasedListingBanner from '../components/OapPurchasedListingBanner'
import OapJourneyPublishLoader from '../components/OapJourneyPublishLoader'
import OwnerSupportButton from '../components/OwnerSupportButton'
import OapAddPropertyMobileMedia from '../components/OapAddPropertyMobileMedia'
import OwnerAddPropertyAmenitiesStep from './OwnerAddPropertyAmenitiesStep'
import '../components/OapAddPropertyMobileScreens.css'
import '../components/OapAddPropertyMobileMedia.css'
import '../components/OapAddPropertyJourneyStrip.css'
import '../components/OapAddPropertyJourneyProgress.css'
import './OwnerAddPropertyBasicsStep.css'
import './OwnerAddPropertyStrategyStep.css'
import './OwnerAddPropertyFinanceStep.css'
import './OwnerAddPropertyVerificationStep.css'
import '../components/OwnerAddPropertyWizardStepLayout.css'
import '../components/OwnerAddPropertyStepAside.css'
import './AddProperty.css'
import './OwnerAddPropertyTestPage.css'
import './OwnerAddPropertyJourney.css'
import './OwnerAddPropertyTestPage.mobile.css'

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

function migrateWizardStep(step) {
  if (step <= 5) return step
  const migration = { 1: 1, 2: 2, 3: 1, 4: 1, 5: 2, 6: 2, 7: 5, 8: 3, 9: 3, 10: 4, 11: 4 }
  return migration[step] ?? 1
}

function mapStepToJourneyScreen(wizardStep) {
  if (wizardStep <= 1) return 2
  if (wizardStep === 2) return 4
  if (wizardStep === 3) return 5
  if (wizardStep === 4) return 6
  if (wizardStep >= 5) return 7
  return 1
}

const TITLE_MAX_LENGTH = 80
const DESCRIPTION_MAX_LENGTH = 2000

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
  totalShares: '',
  listingCurrency: 'EUR',
  calculatorApplied: false,
  pricingFieldSource: {},
  auctionStartingPrice: '',
  auctionStartDate: '',
  auctionEndDate: '',
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
    errors.pricePerDay = i18n.t('oap_err_pricePerDay')
  }
  if (form.testDriveInsuranceDeposit.trim()) {
    const deposit = parseMoneyInput(form.testDriveInsuranceDeposit)
    if (deposit === null || deposit < 0) {
      errors.insuranceDeposit = i18n.t('oap_err_insuranceDeposit')
    }
  }
  return errors
}

function validateListingStep(form) {
  const errors = {}
  if (!form.listingMode) {
    errors.listingMode = i18n.t('oap_err_listingMode')
  }
  return errors
}

function validatePricingStep(form) {
  const errors = {}
  const mode = form.listingMode

  if (mode === 'shares') {
    const price = parseMoneyDigits(form.price)
    if (price === null || price <= 0) {
      errors.price = i18n.t('oap_err_price')
    }
    const sharesNum = parseInt(String(form.totalShares || '').replace(/\D/g, ''), 10)
    if (!form.totalShares || Number.isNaN(sharesNum) || sharesNum <= 0) {
      errors.totalShares = i18n.t('oap_err_totalShares')
    }
    return errors
  }

  if (mode === 'debt') {
    const debt = parseMoneyDigits(form.debtAmount)
    if (debt === null || debt <= 0) {
      errors.debtAmount = i18n.t('oap_err_debtAmount')
    }
    return errors
  }

  const isAuctionMode = mode === 'auction' || mode === 'auction_buy_now' || mode === 'debt_auction'

  if (mode === 'debt_auction') {
    const debt = parseMoneyDigits(form.debtAmount)
    if (debt === null || debt <= 0) {
      errors.debtAmount = i18n.t('oap_err_debtAmount')
    }
  }

  if (isAuctionMode) {
    const minSale = parseMoneyDigits(form.minimumSalePrice)
    if (minSale === null || minSale <= 0) {
      errors.minimumSalePrice = i18n.t('oap_err_minimumSalePrice')
    }

    if (mode === 'auction_buy_now' || mode === 'debt_auction') {
      const buyNow = parseMoneyDigits(form.price)
      if (buyNow === null || buyNow <= 0) {
        errors.price = i18n.t('oap_err_buyNowPrice')
      }
    }

    const startPrice = parseMoneyDigits(form.auctionStartingPrice)
    if (startPrice === null || startPrice <= 0) {
      errors.auctionStartingPrice = i18n.t('oap_err_auctionStartingPrice')
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
    if (!parsePositiveNum(form.rooms)) errors.rooms = i18n.t('oap_err_rooms')
    if (!parsePositiveNum(form.bathrooms)) errors.bathrooms = i18n.t('oap_err_bathrooms')
    if (!parsePositiveNum(form.area)) errors.area = i18n.t('oap_err_area')
    if (!parsePositiveNum(form.livingArea)) errors.livingArea = i18n.t('oap_err_livingArea')
    if (parseNonNegativeNum(form.floor) === null) errors.floor = i18n.t('oap_err_floor')
    if (!parsePositiveNum(form.totalFloors)) errors.totalFloors = i18n.t('oap_err_totalFloors')
    if (!parsePositiveNum(form.yearBuilt)) errors.yearBuilt = i18n.t('oap_err_yearBuilt')
    else if (parsePositiveNum(form.yearBuilt) > currentYear) {
      errors.yearBuilt = i18n.t('oap_err_yearBuiltMax', { year: currentYear })
    }
    if (!form.buildingType) errors.buildingType = i18n.t('oap_err_buildingType')
    const floor = parseNonNegativeNum(form.floor)
    const totalFloors = parsePositiveNum(form.totalFloors)
    if (floor !== null && totalFloors !== null && floor > totalFloors) {
      errors.floor = i18n.t('oap_err_floorMax', { max: totalFloors })
    }
  }

  if (typeProfile === 'house' || typeProfile === 'villa') {
    if (!parsePositiveNum(form.landArea)) errors.landArea = i18n.t('oap_err_landArea')
    if (!parsePositiveNum(form.area)) errors.area = i18n.t('oap_err_houseArea')
    if (!parsePositiveNum(form.bedrooms)) errors.bedrooms = i18n.t('oap_err_rooms')
    if (!parsePositiveNum(form.totalFloors)) errors.totalFloors = i18n.t('oap_err_houseFloors')
    if (!parsePositiveNum(form.bathrooms)) errors.bathrooms = i18n.t('oap_err_bathrooms')
    if (!parsePositiveNum(form.yearBuilt)) errors.yearBuilt = i18n.t('oap_err_yearBuilt')
    else if (parsePositiveNum(form.yearBuilt) > currentYear) {
      errors.yearBuilt = i18n.t('oap_err_yearBuiltMax', { year: currentYear })
    }
    if (!form.buildingType) errors.buildingType = i18n.t('oap_err_buildingType')
  }

  if (typeProfile === 'commercial') {
    if (!parsePositiveNum(form.area)) errors.area = i18n.t('oap_err_area')
    if (!form.commercialType) errors.commercialType = i18n.t('oap_err_commercialType')
  }

  if (typeProfile === 'land') {
    if (!parsePositiveNum(form.landArea)) errors.landArea = i18n.t('oap_err_landArea')
    if (!form.commercialType) errors.commercialType = i18n.t('oap_err_landPurpose')
  }


  return errors
}

function isJourneyLocationComplete(form) {
  if (!form.propertyType) return false
  return Object.keys(validateLocationForm(form, form.address)).length === 0
}

function isJourneyParamsComplete(form) {
  if (!form.propertyType) return false
  return Object.keys(validateParametersStep(form, getTypeProfile(form.propertyType))).length === 0
}

function isJourneyStrategyComplete(form) {
  if (Object.keys(validateListingStep(form)).length > 0) return false
  if (form.testDrive === 'yes' && Object.keys(validateTestDriveDetails(form)).length > 0) return false
  return true
}

function isJourneyPricingComplete(form) {
  return Object.keys(validatePricingStep(form)).length === 0
}

function isJourneyDocumentsComplete(form, requiredDocuments) {
  const isDebtListing = form.listingMode === 'debt' || form.listingMode === 'debt_auction'
  if (isDebtListing) return true
  return Boolean(requiredDocuments.ownership && requiredDocuments.noDebts)
}

const TOTAL_STEPS = 5
const MOBILE_JOURNEY_SCREENS = 7

export default function OwnerAddPropertyTestPage() {
  const { t } = useTranslation()
  const isMobile = useOapMobile()
  const { isEmbedded, goTo } = useOwnerTestEmbeddedNav()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [step, setStep] = useState(1)
  const [mobileScreen, setMobileScreen] = useState(1)
  const journeyScrollRef = useRef(null)

  const scrollJourneyToTop = useCallback(() => {
    journeyScrollRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    scrollMainTo(0, 0, 'auto')
  }, [])

  useEffect(() => {
    if (isMobile) {
      scrollJourneyToTop()
    } else {
      scrollMainTo(0, 0, 'auto')
    }
  }, [mobileScreen, isMobile, scrollJourneyToTop])

  useEffect(() => {
    preloadOapWizardImages()
  }, [])

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
  const [showJourneyPublishDrawer, setShowJourneyPublishDrawer] = useState(false)
  const [purchasedListingMeta, setPurchasedListingMeta] = useState(null)
  const listingFeeCheckoutHandledRef = useRef(false)
  const draftReadyRef = useRef(false)
  const saveDraftTimeoutRef = useRef(null)

  const buildingTypeOptions = useMemo(
    () => [
      { value: 'brick', label: t('oap_buildingMaterialBrick') },
      { value: 'monolithic', label: t('oap_buildingMaterialMonolithic') },
      { value: 'panel', label: t('oap_buildingMaterialPanel') },
      { value: 'block', label: t('oap_buildingMaterialBlock') },
      { value: 'wood', label: t('oap_buildingMaterialWood') },
      { value: 'frame', label: t('oap_buildingMaterialFrame') },
      { value: 'aerated_concrete', label: t('oap_buildingMaterialAerated') },
      { value: 'foam_concrete', label: t('oap_buildingMaterialFoam') },
      { value: 'other', label: t('oap_buildingMaterialOther') },
    ],
    [t],
  )

  const constructionTypeOptions = useMemo(
    () => [
      { value: 'monolithic', label: t('oap_constructionTypeMonolithic') },
      { value: 'brick', label: t('oap_constructionTypeBrick') },
      { value: 'panel', label: t('oap_constructionTypePanel') },
      { value: 'frame', label: t('oap_constructionTypeFrame') },
    ],
    [t],
  )

  const paramsSubtitles = useMemo(
    () => ({
      apartment: t('oap_basicsParamsHintApartment'),
      apartments: t('oap_basicsParamsHintApartment'),
      house: t('oap_basicsParamsHintHouse'),
      villa: t('oap_basicsParamsHintHouse'),
      commercial: t('oap_basicsParamsHintCommercial'),
      land: t('oap_basicsParamsHintLand'),
    }),
    [t],
  )

  const commercialTypeOptions = useMemo(
    () => [
      { value: 'office', label: t('oap_commercialTypeOffice') },
      { value: 'shop', label: t('oap_commercialTypeShop') },
      { value: 'warehouse', label: t('oap_commercialTypeWarehouse') },
      { value: 'other', label: t('oap_commercialTypeOther') },
    ],
    [t],
  )

  const landPurposeOptions = useMemo(
    () => [
      { value: 'residential', label: t('oap_landPurposeResidential') },
      { value: 'commercial', label: t('oap_landPurposeCommercial') },
      { value: 'agricultural', label: t('oap_landPurposeAgricultural') },
      { value: 'industrial', label: t('oap_landPurposeIndustrial') },
      { value: 'other', label: t('oap_landPurposeOther') },
    ],
    [t],
  )

  const propertyTypeOptions = useMemo(
    () => [
      {
        value: 'house',
        label: t('oap_propertyTypeHouse'),
        description: t('oap_propertyTypeHouseDesc'),
        Icon: Home,
      },
      {
        value: 'villa',
        label: t('oap_propertyTypeVilla'),
        description: t('oap_propertyTypeVillaDesc'),
        Icon: Castle,
      },
      {
        value: 'apartments',
        label: t('oap_propertyTypeApartments'),
        description: t('oap_propertyTypeApartmentsDesc'),
        Icon: Hotel,
      },
      {
        value: 'apartment',
        label: t('oap_propertyTypeApartment'),
        description: t('oap_propertyTypeApartmentDesc'),
        Icon: Building2,
      },
      {
        value: 'commercial',
        label: t('oap_propertyTypeCommercial'),
        description: t('oap_propertyTypeCommercialDesc'),
        Icon: Store,
      },
      {
        value: 'land',
        label: t('oap_propertyTypeLand'),
        description: t('oap_propertyTypeLandDesc'),
        Icon: TreePine,
      },
    ],
    [t],
  )

  const listingModes = useMemo(
    () => [
      {
        id: 'auction',
        label: t('oap_listingModeAuction'),
        description: t('oap_listingModeAuctionDesc'),
        tone: 'teal',
      },
      {
        id: 'auction_buy_now',
        label: t('oap_listingModeAuctionBuyNow'),
        description: t('oap_listingModeAuctionBuyNowDesc'),
        tone: 'violet',
      },
      {
        id: 'shares',
        label: t('oap_listingModeShares'),
        description: t('oap_listingModeSharesDesc'),
        tone: 'blue',
      },
      {
        id: 'debt',
        label: t('oap_listingModeDebt'),
        description: t('oap_listingModeDebtDesc'),
        tone: 'amber',
      },
      {
        id: 'debt_auction',
        label: t('oap_listingModeDebtAuction'),
        description: t('oap_listingModeDebtAuctionDesc'),
        tone: 'slate',
      },
    ],
    [t],
  )

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

  const addPhotoLink = useCallback((photo) => {
    if (!photo?.preview) return false
    setPhotos((prev) => {
      if (prev.length >= 10) return prev
      return [...prev, photo]
    })
    return photos.length < 10
  }, [photos.length])

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
      navigate('/owner-test/properties')
    }
  }, [goTo, navigate])

  const goToHome = useCallback(() => {
    if (goTo) {
      goTo(OWNER_VIEWS.HOME)
    } else {
      navigate('/owner-test')
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
      showNotification(t('oap_publishDraftSaved'))
    } else {
      showNotification(t('oap_publishDraftNeedData'), 'error')
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
    if (!result.ok) {
      setIsSubmitting(false)
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
          navigate('/owner-test/profile')
        }
        return false
      }
      showNotification(result.error || t('oap_publishSubmitError'))
      return false
    }

    setShowVerificationModal(false)
    clearOapDraft()
    window.dispatchEvent(new CustomEvent('owner-properties-update'))
    setShowJourneyPublishDrawer(true)
    setIsSubmitting(false)
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
      showNotification(t('oap_publishPaymentUserId'), 'error')
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
        showNotification(result.error || t('oap_publishPaymentError'), 'error')
      }
    } catch (e) {
      showNotification(e?.message || t('oap_publishPaymentStartError'), 'error')
    } finally {
      setListingFeeStripeLoading(false)
    }
  }, [userId, saveDraftNow])

  const handleApplyListingFeePromo = useCallback(async () => {
    const code = (listingFeePromoCode || '').trim()
    if (!code) {
      setListingFeePromoError(t('oap_publishPromoRequired'))
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
        setListingFeePromoError(t('oap_publishPromoUsed'))
      } else {
        setListingFeePromoError(data.message || t('oap_publishPromoInvalid'))
      }
    } catch {
      setListingFeePromoError(t('oap_publishPromoNetwork'))
    } finally {
      setListingFeePromoLoading(false)
    }
  }, [listingFeePromoCode, userId, handleAfterListingFeeSuccess])

  const handlePriceContinue = useCallback(() => {
    if (!form.title?.trim()) {
      showNotification(t('oap_publishTitleRequired'))
      return
    }
    if (!photos.length) {
      showNotification(t('oap_publishPhotoRequired'))
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

  const handleTypeSelect = useCallback((propertyType) => {
    setForm((prev) => ({ ...prev, propertyType }))
    setParamErrors({})
    setLocationErrors((prev) => {
      if (!prev.propertyType) return prev
      const next = { ...prev }
      delete next.propertyType
      return next
    })
  }, [])

  const validateJourneyBasicsLocation = useCallback(() => {
    const nextLocationErrors = {}
    if (!form.propertyType) nextLocationErrors.propertyType = t('oap_err_propertyType')
    Object.assign(nextLocationErrors, validateLocationForm(form, form.address))
    if (Object.keys(nextLocationErrors).length > 0) {
      setLocationErrors(nextLocationErrors)
      scrollMainTo(0, 0, 'auto')
      return false
    }
    setLocationErrors({})
    return true
  }, [form, t])

  const validateJourneyBasicsParams = useCallback(() => {
    const paramValidation = validateParametersStep(form, getTypeProfile(form.propertyType))
    if (Object.keys(paramValidation).length > 0) {
      setParamErrors(paramValidation)
      scrollMainTo(0, 0, 'auto')
      return false
    }
    setParamErrors({})
    return true
  }, [form])

  const handleJourneyNext = useCallback(() => {
    if (mobileScreen === 1) {
      if (!form.title.trim()) {
        scrollJourneyToTop()
        return
      }
      setMobileScreen(2)
      setStep(1)
      return
    }
    if (mobileScreen === 2) {
      if (!validateJourneyBasicsLocation()) return
      setMobileScreen(3)
      return
    }
    if (mobileScreen === 3) {
      if (!validateJourneyBasicsParams()) return
      setMobileScreen(4)
      setStep(2)
      return
    }
    if (mobileScreen === 4) {
      setMobileScreen(5)
      setStep(3)
      return
    }
    if (mobileScreen === 5) {
      if (form.testDrive === 'yes') {
        const errors = validateTestDriveDetails(form)
        if (Object.keys(errors).length > 0) {
          setTestDriveErrors(errors)
          scrollJourneyToTop()
          return
        }
      }
      const listingValidation = validateListingStep(form)
      if (Object.keys(listingValidation).length > 0) {
        setListingErrors(listingValidation)
        scrollJourneyToTop()
        return
      }
      setTestDriveErrors({})
      setListingErrors({})
      setMobileScreen(6)
      setStep(4)
      return
    }
    if (mobileScreen === 6) {
      const errors = validatePricingStep(form)
      if (Object.keys(errors).length > 0) {
        setPricingErrors(errors)
        scrollJourneyToTop()
        return
      }
      setPricingErrors({})
      setMobileScreen(7)
      setStep(5)
      return
    }
    if (mobileScreen === 7) {
      const isDebtListing =
        form.listingMode === 'debt' || form.listingMode === 'debt_auction'
      const errors = {}
      if (!isDebtListing) {
        if (!requiredDocuments.ownership) errors.ownership = t('oap_err_ownership')
        if (!requiredDocuments.noDebts) errors.noDebts = t('oap_err_noDebts')
      }
      if (Object.keys(errors).length > 0) {
        setDocumentErrors(errors)
        scrollJourneyToTop()
        return
      }
      setDocumentErrors({})
      handlePriceContinue()
      return
    }
  }, [
    form,
    handlePriceContinue,
    mobileScreen,
    requiredDocuments,
    t,
    validateJourneyBasicsLocation,
    validateJourneyBasicsParams,
    scrollJourneyToTop,
  ])

  const syncStepFromMobileScreen = useCallback((screen) => {
    if (screen <= 3) setStep(1)
    else if (screen === 4) setStep(2)
    else if (screen === 5) setStep(3)
    else if (screen === 6) setStep(4)
    else setStep(5)
  }, [])

  const handleJourneyBack = useCallback(() => {
    if (mobileScreen <= 1 || isSubmitting) return
    const prevScreen = mobileScreen - 1
    setMobileScreen(prevScreen)
    syncStepFromMobileScreen(prevScreen)
  }, [isSubmitting, mobileScreen, syncStepFromMobileScreen])

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
            showNotification(t('oap_publishPaymentAlreadyRecorded'))
          } else {
            showNotification(t('oap_publishPaymentReceived'))
          }
          const next = new URLSearchParams(searchParams)
          next.delete('listing_fee_checkout')
          next.delete('session_id')
          setSearchParams(next, { replace: true })
          setStep(TOTAL_STEPS)
          await handleAfterListingFeeSuccess()
        } else {
          showNotification(result.error || t('oap_publishPaymentConfirmError'), 'error')
          listingFeeCheckoutHandledRef.current = false
        }
      } catch (e) {
        if (!cancelled) {
          showNotification(e?.message || t('oap_publishPaymentConfirmNetwork'), 'error')
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
      const pending = readPendingSellPurchasedProperty()
      const role = String(localStorage.getItem('userRole') || getUserData()?.role || '').toLowerCase()
      if (pending?.id && (role === 'seller' || role === 'owner')) {
        try {
          const result = await applyPurchasedPropertyListingPrefill(pending.id)
          if (!cancelled && result?.draft?.[PURCHASED_LISTING_DRAFT_FLAG]) {
            setPurchasedListingMeta(result.draft[PURCHASED_LISTING_DRAFT_FLAG])
          }
        } catch (e) {
          console.warn('OwnerAddPropertyTestPage pending purchased prefill:', e)
        }
      }

      const draft = loadOapDraft()
      if (!draft || !hasMeaningfulDraftData(draft)) {
        if (draft?.[PURCHASED_LISTING_DRAFT_FLAG]) {
          setPurchasedListingMeta(draft[PURCHASED_LISTING_DRAFT_FLAG])
        }
        draftReadyRef.current = true
        return
      }

      const restored = await restoreOapDraftState(draft)
      if (cancelled || !restored) {
        if (draft?.[PURCHASED_LISTING_DRAFT_FLAG]) {
          setPurchasedListingMeta(draft[PURCHASED_LISTING_DRAFT_FLAG])
        }
        draftReadyRef.current = true
        return
      }

      const mergedForm = { ...INITIAL_FORM, ...restored.form }
      setForm(mergedForm)
      setStep(migrateWizardStep(restored.step))
      setMobileScreen(mapStepToJourneyScreen(migrateWizardStep(restored.step)))
      const restoredPhotos =
        restored.photos?.length > 0
          ? restored.photos
          : (Array.isArray(draft.photos)
              ? draft.photos
                  .filter(
                    (photo) =>
                      typeof photo?.preview === 'string' &&
                      (photo.preview.startsWith('http') ||
                        photo.preview.startsWith('https') ||
                        photo.preview.startsWith('/')),
                  )
                  .map((photo, index) => ({
                    id: photo.id || `purchased-photo-${index}`,
                    preview: photo.preview,
                    fromPurchased: true,
                  }))
              : [])
      setPhotos(restoredPhotos)
      setVideos(restored.videos)
      setRequiredDocuments(restored.requiredDocuments)
      setAdditionalDocuments(restored.additionalDocuments)
      setSelectedAmenities(restored.selectedAmenities)
      if (draft?.[PURCHASED_LISTING_DRAFT_FLAG]) {
        setPurchasedListingMeta(draft[PURCHASED_LISTING_DRAFT_FLAG])
      }
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
    scrollMainTo(0, 0, 'auto')
  }, [step])

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

  const canProceedJourney = useMemo(() => {
    switch (mobileScreen) {
      case 1:
        return Boolean(form.title.trim())
      case 2:
        return isJourneyLocationComplete(form)
      case 3:
        return isJourneyParamsComplete(form)
      case 4:
        return photos.length > 0
      case 5:
        return isJourneyStrategyComplete(form)
      case 6:
        return isJourneyPricingComplete(form)
      case 7:
        return isJourneyDocumentsComplete(form, requiredDocuments)
      default:
        return false
    }
  }, [form, mobileScreen, photos.length, requiredDocuments])

  const renderStepBasics = (options = {}) => {
    const { mobileSection = 'all', hideWizardChrome = false } = options
    const typeProfile = getTypeProfile(form.propertyType)
    return (
      <OwnerAddPropertyBasicsStep
        form={form}
        propertyTypeOptions={propertyTypeOptions}
        onTypeSelect={handleTypeSelect}
        onFormPatch={patchForm}
        onParamFieldChange={updateParamField}
        paramErrors={paramErrors}
        locationErrors={locationErrors}
        typeProfile={typeProfile}
        paramsSubtitle={paramsSubtitles[typeProfile] || paramsSubtitles.apartment}
        paramOptions={{
          buildingTypeOptions,
          constructionTypeOptions,
          commercialTypeOptions,
          landPurposeOptions,
        }}
        mobileSection={mobileSection}
        hideWizardChrome={hideWizardChrome}
      />
    )
  }

  const renderJourneyMediaStep = () => {
    const typeProfile = getTypeProfile(form.propertyType)

    return (
      <>
        <OapAddPropertyMobileMedia
          photos={photos}
          videos={videos}
          onAddPhotos={addPhotos}
          onRemovePhoto={removePhoto}
          onAddVideo={addVideo}
          onRemoveVideo={removeVideo}
          onAddPhotoLink={addPhotoLink}
        />
        <section className="oap-journey-amenities" aria-labelledby="oap-journey-amenities-title">
          <h2 id="oap-journey-amenities-title" className="oap-journey-amenities__title">
            {t('oap_journeyAmenitiesTitle')}
          </h2>
          <OwnerAddPropertyAmenitiesStep
            embedded
            journeyLayout
            typeProfile={typeProfile}
            additionalAmenities={form.additionalAmenities}
            selectedAmenities={selectedAmenities}
            onAdditionalChange={(value) => updateField('additionalAmenities', value)}
            onToggleAmenity={toggleAmenity}
          />
        </section>
      </>
    )
  }

  const renderStepStrategy = (options = {}) => {
    const { hideWizardChrome = false } = options
    const selectedType = propertyTypeOptions.find((type) => type.value === form.propertyType)
    const filteredListingModes =
      form.testDrive === 'yes'
        ? listingModes.filter((mode) => mode.id === 'auction_buy_now')
        : listingModes

    return (
      <OwnerAddPropertyStrategyStep
        hideWizardChrome={hideWizardChrome}
        listingModes={filteredListingModes}
        listingMode={form.listingMode}
        listingErrors={listingErrors}
        onSelectListingMode={(modeId) => {
          updateField('listingMode', modeId)
          setListingErrors((prev) => {
            if (!prev.listingMode) return prev
            const next = { ...prev }
            delete next.listingMode
            return next
          })
        }}
        testDrive={form.testDrive}
        testDrivePricePerDay={form.testDrivePricePerDay}
        testDriveInsuranceDeposit={form.testDriveInsuranceDeposit}
        testDriveCurrency={form.testDriveCurrency}
        propertyTypeOption={selectedType}
        testDriveErrors={testDriveErrors}
        onTestDriveChoice={handleTestDriveChoice}
        onTestDriveDetailChange={handleTestDriveDetailChange}
      />
    )
  }

  const renderStepDocuments = (options = {}) => {
    const { hideWizardChrome = false } = options

    return (
    <OwnerAddPropertyVerificationStep
      hideWizardChrome={hideWizardChrome}
      listingMode={form.listingMode}
      requiredDocuments={requiredDocuments}
      additionalDocuments={additionalDocuments}
      errors={documentErrors}
      onRequiredChange={setRequiredDocument}
      onRequiredRemove={removeRequiredDocument}
      onAddAdditional={addAdditionalDocument}
      onRemoveAdditional={removeAdditionalDocument}
    />
    )
  }

  const handlePricingFieldChange = useCallback((key, value) => {
    setForm((prev) => {
      const next = applyPricingFieldChange(prev, key, value)
      setPricingErrors((prevErr) => {
        const nextErr = { ...prevErr }
        delete nextErr[key]

        const crossKeys = ['minimumSalePrice', 'price', 'auctionStartingPrice']
        if (crossKeys.includes(key)) {
          const cross = getPricingCrossFieldErrors(next)
          for (const crossKey of crossKeys) {
            if (cross[crossKey]) nextErr[crossKey] = cross[crossKey]
            else delete nextErr[crossKey]
          }
        }

        return nextErr
      })
      return next
    })
  }, [])

  const renderStepFinance = (options = {}) => {
    const { hideWizardChrome = false } = options

    return (
    <OwnerAddPropertyFinanceStep
      hideWizardChrome={hideWizardChrome}
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
      listingMode={form.listingMode}
      minimumSalePrice={form.minimumSalePrice}
      price={form.price}
      debtAmount={form.debtAmount}
      totalShares={form.totalShares}
      auctionStartingPrice={form.auctionStartingPrice}
      auctionStartDate={form.auctionStartDate}
      auctionEndDate={form.auctionEndDate}
      currency={form.listingCurrency}
      pricingErrors={pricingErrors}
      pricingFieldSource={form.pricingFieldSource}
      onPricingFieldChange={handlePricingFieldChange}
    />
    )
  }

  const journeyScreenContent = {
    1: () => (
      <OapAddPropertyMobileWelcome
        title={form.title}
        description={form.description}
        titleMaxLength={TITLE_MAX_LENGTH}
        descriptionMaxLength={DESCRIPTION_MAX_LENGTH}
        onTitleChange={(value) => updateField('title', value)}
        onDescriptionChange={(value) => updateField('description', value)}
      />
    ),
    2: () => renderStepBasics({ mobileSection: 'type-location', hideWizardChrome: true }),
    3: () => renderStepBasics({ mobileSection: 'params', hideWizardChrome: true }),
    4: renderJourneyMediaStep,
    5: () => renderStepStrategy({ hideWizardChrome: true }),
    6: () => renderStepFinance({ hideWizardChrome: true }),
    7: () => renderStepDocuments({ hideWizardChrome: true }),
  }

  const journeyPrimaryLabel =
    mobileScreen === MOBILE_JOURNEY_SCREENS ? t('oap_publishPublish') : t('oap_publishNext')

  const handlePurchasedBannerContinue = useCallback(() => {
    setStep(3)
    setMobileScreen(5)
    scrollJourneyToTop()
  }, [scrollJourneyToTop])

  const purchasedBanner = purchasedListingMeta ? (
    <OapPurchasedListingBanner meta={purchasedListingMeta} onContinue={handlePurchasedBannerContinue} />
  ) : null

  const stepClassSuffix = `${step === 1 ? ' oap--step-basics' : ''}${step === 2 ? ' oap--step-description' : ''}${step === 3 ? ' oap--step-listing' : ''}${step === 4 ? ' oap--step-pricing' : ''}${step === 5 ? ' oap--step-documents' : ''}`

  return (
    <>
      {isMobile ? (
        <div className={`oap oap--journey-mobile oap--journey-flow${stepClassSuffix}`}>
          <div className="oap-shell oap-shell--journey">
            <header className="oap-journey-topbar">
              <button
                type="button"
                className="oap-journey-topbar__back"
                aria-label={t('oap_publishBackList')}
                onClick={goToProperties}
              >
                <ArrowLeft size={22} strokeWidth={2} />
              </button>
            </header>
            <OapAddPropertyJourneyProgress
              currentStep={mobileScreen}
              totalSteps={MOBILE_JOURNEY_SCREENS}
            />
            <div ref={journeyScrollRef} className="oap-content oap-content--journey">
              {purchasedBanner}
              <OapAddPropertyJourneyStrip activeIndex={mobileScreen - 1} />
              <div className="oap-content__body oap-content__body--journey">
                {journeyScreenContent[mobileScreen]?.()}
              </div>
            </div>
            <footer className="oap-footer oap-footer--journey">
              <div className="oap-journey-footer__actions">
                <button
                  type="button"
                  className="oap-journey-footer__back"
                  aria-label={t('oap_publishBack')}
                  onClick={handleJourneyBack}
                  disabled={mobileScreen === 1 || isSubmitting}
                >
                  <ArrowLeft size={22} strokeWidth={2} />
                </button>
                <button
                  type="button"
                  className="oap-btn oap-btn--primary oap-btn--full oap-journey-footer__next"
                  onClick={handleJourneyNext}
                  disabled={!canProceedJourney || isSubmitting}
                >
                  {isSubmitting ? t('oap_publishSubmitting') : journeyPrimaryLabel}
                </button>
              </div>
            </footer>
          </div>
        </div>
      ) : (
        <div className={`oap oap--journey-desktop oap--journey-flow${stepClassSuffix}`}>
          <div className="oap-shell oap-shell--journey oap-shell--journey-desktop">
            <header className="oap-journey-topbar oap-journey-topbar--desktop">
              <button
                type="button"
                className="oap-journey-topbar__back"
                aria-label={t('oap_publishBackList')}
                onClick={goToProperties}
              >
                <ArrowLeft size={22} strokeWidth={2} />
              </button>
              <OapAddPropertyJourneyProgress
                currentStep={mobileScreen}
                totalSteps={MOBILE_JOURNEY_SCREENS}
              />
              <OwnerSupportButton className="oap-journey-topbar__support" iconSize={22} />
            </header>
            <div
              ref={journeyScrollRef}
              className={`oap-content oap-content--journey oap-content--journey-desktop${mobileScreen === 1 || mobileScreen === 2 || mobileScreen === 3 || mobileScreen === 4 || mobileScreen === 5 || mobileScreen === 6 || mobileScreen === 7 ? ' oap-content--journey-strip-side' : ''}${mobileScreen === 2 ? ' oap-content--journey-type-map' : ''}`}
            >
              <OapAddPropertyJourneyStrip activeIndex={mobileScreen - 1} />
              {mobileScreen === 2 ? (
                <div id="oap-journey-map-aside" className="oap-journey-type-map-aside" />
              ) : null}
              <div className="oap-content__body oap-content__body--journey oap-content__body--journey-desktop">
                {purchasedBanner}
                {journeyScreenContent[mobileScreen]?.()}
              </div>
            </div>
            <footer className="oap-footer oap-footer--journey oap-footer--journey-desktop">
              <div className="oap-journey-footer__actions">
                <button
                  type="button"
                  className="oap-journey-footer__back"
                  aria-label={t('oap_publishBack')}
                  onClick={handleJourneyBack}
                  disabled={mobileScreen === 1 || isSubmitting}
                >
                  <ArrowLeft size={22} strokeWidth={2} />
                </button>
                <button
                  type="button"
                  className="oap-btn oap-btn--primary oap-btn--full oap-journey-footer__next"
                  onClick={handleJourneyNext}
                  disabled={!canProceedJourney || isSubmitting}
                >
                  {isSubmitting ? t('oap_publishSubmitting') : journeyPrimaryLabel}
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}

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
              aria-label={t('oap_publishClose')}
            >
              <FiX size={22} />
            </button>
            {!showPromoInputInFeeModal ? (
              <>
                <div className="listing-fee-modal__icon">
                  <FiDollarSign size={32} />
                </div>
                <h2 className="listing-fee-modal__title">{t('oap_publishFeeTitle')}</h2>
                <p
                  className="listing-fee-modal__text"
                  dangerouslySetInnerHTML={{ __html: t('oap_publishFeeText') }}
                />
                <div className="listing-fee-modal__options">
                  <button
                    type="button"
                    className="listing-fee-modal__option listing-fee-modal__option--card"
                    onClick={handleListingFeePayCard}
                    disabled={listingFeeStripeLoading}
                  >
                    <FiCreditCard size={24} aria-hidden />
                    <span>
                      {listingFeeStripeLoading
                        ? t('oap_publishStripeLoading')
                        : t('oap_publishStripeCard')}
                    </span>
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
                    <span>{t('oap_publishFeeHasPromo')}</span>
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
                        state: { fromListingFee: true, returnPath: '/owner-test/add-property' },
                      })
                    }}
                  >
                    {t('oap_publishFeeGetPromo')}
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
                  <FiChevronLeft size={18} /> {t('oap_publishBack')}
                </button>
                <div className="listing-fee-modal__icon listing-fee-modal__icon--promo">
                  <FiGift size={32} />
                </div>
                <h2 className="listing-fee-modal__title">{t('oap_publishFeePromoTitle')}</h2>
                <p className="listing-fee-modal__text">{t('oap_publishFeePromoText')}</p>
                <div className="listing-fee-modal__promo-row">
                  <input
                    type="text"
                    className="listing-fee-modal__input"
                    placeholder={t('oap_publishPromoPlaceholder')}
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
                      t('oap_publishPromoApply')
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

      {isMobile && isSubmitting && !showJourneyPublishDrawer ? <OapJourneyPublishLoader /> : null}

      <OapPublishSuccessDrawer
        isOpen={showJourneyPublishDrawer}
        onClose={() => setShowJourneyPublishDrawer(false)}
        onViewProperties={() => {
          setShowJourneyPublishDrawer(false)
          goToProperties()
        }}
        onGoHome={() => {
          setShowJourneyPublishDrawer(false)
          goToHome()
        }}
      />
    </>
  )
}

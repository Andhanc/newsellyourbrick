import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
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
  SlidersHorizontal,
} from 'lucide-react'
import { OWNER_VIEWS } from '../context/OwnerTestNavigationContext'
import { useOwnerTestEmbeddedNav } from '../hooks/useOwnerTestEmbeddedNav'
import { validateLocationForm } from '../utils/oapLocationGeocode'
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
import './OwnerAddPropertyTestPage.css'
import './OwnerAddPropertyTestPage.mobile.css'

const DESKTOP_STEPS = [
  { id: 1, label: 'Тип' },
  { id: 2, label: 'Описание' },
  { id: 3, label: 'Параметры' },
  { id: 4, label: 'Адрес' },
  { id: 5, label: 'Удобства' },
  { id: 6, label: 'Фото и видео' },
  { id: 7, label: 'Документы' },
  { id: 8, label: 'Тест-драйв' },
  { id: 9, label: 'Публикация' },
]

const MOBILE_STEPS = [
  { id: 1, label: 'Тип' },
  { id: 2, label: 'Текст' },
  { id: 3, label: 'Параметры' },
  { id: 4, label: 'Адрес' },
  { id: 5, label: 'Удобства' },
  { id: 6, label: 'Медиа' },
  { id: 7, label: 'Документы' },
  { id: 8, label: 'Тест-драйв' },
  { id: 9, label: 'Публикация' },
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
  { id: 'auction', label: 'Аукцион', description: 'Продажа через торги между покупателями' },
  { id: 'auction_buy_now', label: 'Аукцион + выкуп', description: 'Торги с возможностью мгновенного выкупа' },
  { id: 'shares', label: 'Доли', description: 'Продажа долей в объекте' },
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
  listingMode: '',
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

const TOTAL_STEPS = 9

export default function OwnerAddPropertyTestPage() {
  const { isEmbedded, goTo } = useOwnerTestEmbeddedNav()
  const navigate = useNavigate()
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
  const [testDrivePhase, setTestDrivePhase] = useState('question')
  const [testDriveErrors, setTestDriveErrors] = useState({})
  const [selectedAmenities, setSelectedAmenities] = useState([])
  const [draftRestoredNotice, setDraftRestoredNotice] = useState(false)

  const draftReadyRef = useRef(false)
  const saveDraftTimeoutRef = useRef(null)

  const updateField = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
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
      if (testDrivePhase === 'question') {
        if (!form.testDrive) {
          setTestDriveErrors({ choice: 'Выберите, будет ли доступен тест-драйв' })
          window.scrollTo({ top: 0, behavior: 'smooth' })
          return
        }
        if (form.testDrive === 'yes') {
          setTestDrivePhase('details')
          setTestDriveErrors({})
          window.scrollTo({ top: 0, behavior: 'smooth' })
          return
        }
        setTestDriveErrors({})
      } else {
        const errors = validateTestDriveDetails(form)
        if (Object.keys(errors).length > 0) {
          setTestDriveErrors(errors)
          window.scrollTo({ top: 0, behavior: 'smooth' })
          return
        }
        setTestDriveErrors({})
      }
    }
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      clearOapDraft()
      goToProperties()
    }
  }, [step, form, requiredDocuments, testDrivePhase, goToProperties])

  const handleBack = useCallback(() => {
    if (step === 8 && testDrivePhase === 'details') {
      setTestDrivePhase('question')
      setTestDriveErrors({})
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (step > 1) {
      setStep((s) => s - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      goToProperties()
    }
  }, [step, testDrivePhase, goToProperties])

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
    setTestDriveErrors((prev) => {
      if (!prev.choice) return prev
      const next = { ...prev }
      delete next.choice
      return next
    })
    if (choice === 'yes') {
      setTestDrivePhase('details')
    } else {
      setTestDrivePhase('question')
    }
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

  const handleTestDriveBackToQuestion = useCallback(() => {
    setTestDrivePhase('question')
    setTestDriveErrors({})
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

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
      setTestDrivePhase(restored.testDrivePhase)
      setDraftRestoredNotice(true)
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
          testDrivePhase,
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
    testDrivePhase,
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
  const activeProgress = step
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
    const descriptionLength = form.description.length
    const selectedType = PROPERTY_TYPE_OPTIONS.find((t) => t.value === form.propertyType)

    return (
      <section className="oap-text-step" aria-labelledby="oap-text-step-title">
        <header className="oap-text-step__head">
          <span className="oap-text-step__badge" aria-hidden>
            <FileText size={22} strokeWidth={1.85} />
          </span>
          <div className="oap-text-step__head-text">
            <h2 id="oap-text-step-title" className="oap-text-step__title">
              Название и описание
            </h2>
            <p className="oap-text-step__subtitle">
              {selectedType
                ? `Расскажите о ${selectedType.label.toLowerCase()} — это увидят покупатели в каталоге`
                : 'Добавьте заголовок и описание — их увидят покупатели в каталоге'}
            </p>
          </div>
        </header>

        <div className="oap-text-step__card">
          <label className="oap-text-field">
            <span className="oap-text-field__label-row">
              <span className="oap-text-field__label">Название объекта</span>
              <span className="oap-text-field__required">Обязательно</span>
            </span>
            <span className="oap-text-field__hint">
              Короткий заголовок для карточки объекта, до 80 символов
            </span>
            <input
              type="text"
              className="oap-text-field__input"
              placeholder="Например, Вилла с видом на океан в Майами"
              value={form.title}
              maxLength={80}
              onChange={(e) => updateField('title', e.target.value)}
            />
            <span className="oap-text-field__counter">{form.title.length}/80</span>
          </label>

          <label className="oap-text-field oap-text-field--area">
            <span className="oap-text-field__label-row">
              <span className="oap-text-field__label">Описание объекта</span>
              <span className="oap-text-field__optional">Необязательно</span>
            </span>
            <span className="oap-text-field__hint">
              Преимущества, планировка, район, инфраструктура — всё, что важно покупателю
            </span>
            <textarea
              className="oap-text-field__textarea"
              rows={7}
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
          </label>
        </div>
      </section>
    )
  }

  const renderStepParams = () => {
    const typeProfile = getTypeProfile(form.propertyType)
    const selectedType = PROPERTY_TYPE_OPTIONS.find((t) => t.value === form.propertyType)
    const isResidential =
      typeProfile === 'apartment' ||
      typeProfile === 'apartments' ||
      typeProfile === 'house' ||
      typeProfile === 'villa'

    const fieldClassName = (key, { fullWidth } = {}) =>
      [
        'oap-param-field',
        paramErrors[key] ? 'oap-param-field--error' : '',
        fullWidth ? 'oap-param-field--full' : '',
      ]
        .filter(Boolean)
        .join(' ')

    const renderFieldMeta = (label, { hint, required } = {}) => (
      <div className="oap-param-field__meta">
        <div className="oap-param-field__label-row">
          <span className="oap-param-field__label">{label}</span>
          {required ? (
            <span className="oap-param-field__req" title="Обязательное поле">
              *
            </span>
          ) : (
            <span className="oap-param-field__opt">необяз.</span>
          )}
        </div>
        <p className={`oap-param-field__hint${hint ? '' : ' oap-param-field__hint--empty'}`}>
          {hint || '\u00A0'}
        </p>
      </div>
    )

    const renderNumberField = (
      key,
      label,
      { hint, suffix = '', placeholder, required, fullWidth } = {}
    ) => (
      <label key={key} className={fieldClassName(key, { fullWidth })}>
        {renderFieldMeta(label, { hint, required })}
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

    const renderSelectField = (
      key,
      label,
      options,
      { hint, placeholder, required, fullWidth } = {}
    ) => (
      <label key={key} className={fieldClassName(key, { fullWidth })}>
        {renderFieldMeta(label, { hint, required })}
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

    const renderParamsGrid = (children) => <div className="oap-params-grid">{children}</div>

    return (
      <section className="oap-params-step" aria-labelledby="oap-params-step-title">
        <header className="oap-params-step__head">
          <span className="oap-params-step__badge" aria-hidden>
            <SlidersHorizontal size={22} strokeWidth={1.85} />
          </span>
          <div className="oap-params-step__head-text">
            <h2 id="oap-params-step-title" className="oap-params-step__title">
              Параметры объекта
            </h2>
            <p className="oap-params-step__subtitle">
              {selectedType
                ? `${selectedType.label}: ${PARAMS_SUBTITLES[typeProfile] || PARAMS_SUBTITLES.apartment}`
                : 'Укажите реальные цифры из выписки или планировки'}
            </p>
          </div>
        </header>

        <div className="oap-params-step__card">
          {(typeProfile === 'apartment' || typeProfile === 'apartments') &&
            renderParamsGrid(
              <>
                {renderNumberField('rooms', 'Комнаты', {
                  placeholder: '0',
                  required: true,
                  hint: 'Жилые комнаты без кухни и коридоров',
                })}
                {renderNumberField('bathrooms', 'Санузлы', {
                  placeholder: '0',
                  required: true,
                  hint: 'Ванные и туалеты',
                })}
                {renderNumberField('area', 'Общая площадь', {
                  suffix: 'м²',
                  placeholder: '0',
                  required: true,
                  hint: 'Как в документах на объект',
                })}
                {renderNumberField('livingArea', 'Жилая площадь', {
                  suffix: 'м²',
                  placeholder: '0',
                  required: true,
                  hint: 'Без балконов и лоджий',
                })}
                {renderNumberField('floor', 'Этаж', {
                  placeholder: '0',
                  required: true,
                  hint: 'Номер этажа квартиры',
                })}
                {renderNumberField('totalFloors', 'Этажей в здании', {
                  placeholder: '0',
                  required: true,
                  hint: 'Сколько этажей в доме',
                })}
                {renderNumberField('yearBuilt', 'Год постройки', {
                  placeholder: String(new Date().getFullYear()),
                  required: true,
                  hint: 'Год сдачи или реконструкции',
                })}
                {renderSelectField('buildingType', 'Материал здания', BUILDING_TYPE_OPTIONS, {
                  placeholder: 'Выберите материал',
                  hint: 'Кирпич, монолит, панель и др.',
                })}
                {renderSelectField(
                  'constructionType',
                  'Тип конструкции',
                  CONSTRUCTION_TYPE_OPTIONS,
                  {
                    placeholder: 'Выберите тип конструкции',
                    hint: 'Уточняет конструктив здания для фильтров',
                  }
                )}
              </>
            )}

          {(typeProfile === 'house' || typeProfile === 'villa') &&
            renderParamsGrid(
              <>
                {renderNumberField('landArea', 'Площадь участка', {
                  suffix: 'м²',
                  placeholder: '0',
                  required: true,
                  hint: 'По кадастру или фактически',
                })}
                {renderNumberField('area', 'Площадь дома (общая)', {
                  suffix: 'м²',
                  placeholder: '0',
                  required: true,
                  hint: 'Вся площадь строения',
                })}
                {renderNumberField('livingArea', 'Площадь дома (жилая)', {
                  suffix: 'м²',
                  placeholder: '0',
                  required: true,
                  hint: 'Жилые помещения без террас',
                })}
                {renderNumberField('totalFloors', 'Этажей в доме', {
                  placeholder: '0',
                  required: true,
                  hint: 'Включая цоколь и мансарду',
                })}
                {renderNumberField('bathrooms', 'Санузлы', {
                  placeholder: '0',
                  required: true,
                  hint: 'Ванные и туалеты',
                })}
                {renderNumberField('yearBuilt', 'Год постройки', {
                  placeholder: String(new Date().getFullYear()),
                  required: true,
                  hint: 'Год сдачи или реконструкции',
                })}
                {renderSelectField('buildingType', 'Материал постройки', BUILDING_TYPE_OPTIONS, {
                  placeholder: 'Выберите материал',
                  hint: 'Основной материал стен',
                })}
                {renderSelectField(
                  'constructionType',
                  'Тип конструкции',
                  CONSTRUCTION_TYPE_OPTIONS,
                  {
                    placeholder: 'Выберите тип конструкции',
                    hint: 'Монолит, кирпич, каркас и др.',
                  }
                )}
              </>
            )}

          {typeProfile === 'commercial' &&
            renderParamsGrid(
              <>
                {renderNumberField('area', 'Площадь помещения', {
                  suffix: 'м²',
                  placeholder: '0',
                  required: true,
                  hint: 'По документам на помещение',
                })}
                {renderNumberField('floor', 'Этаж / уровень', {
                  placeholder: '0',
                  hint: 'Для ТЦ или бизнес-центра',
                })}
                {renderNumberField('totalFloors', 'Этажей в здании', {
                  placeholder: '0',
                  hint: 'Общая этажность здания',
                })}
                {renderSelectField(
                  'commercialType',
                  'Тип коммерческого объекта',
                  COMMERCIAL_TYPE_OPTIONS,
                  {
                    placeholder: 'Выберите тип',
                    required: true,
                    hint: 'Офис, магазин, склад и др.',
                  }
                )}
                {renderSelectField(
                  'constructionType',
                  'Тип конструкции',
                  CONSTRUCTION_TYPE_OPTIONS,
                  {
                    placeholder: 'Выберите тип конструкции',
                    hint: 'Уточняет конструктив для фильтров',
                  }
                )}
              </>
            )}

          {typeProfile === 'land' &&
            renderParamsGrid(
              <>
                {renderNumberField('landArea', 'Площадь участка', {
                  suffix: 'м²',
                  placeholder: '0',
                  required: true,
                  hint: 'По кадастровым или фактическим данным',
                })}
                {renderSelectField(
                  'commercialType',
                  'Назначение участка',
                  LAND_PURPOSE_OPTIONS,
                  {
                    placeholder: 'Выберите назначение',
                    required: true,
                    hint: 'Жилая, коммерческая, сельхоз и др.',
                  }
                )}
              </>
            )}

          {typeProfile === 'other' &&
            renderParamsGrid(
              <>
                {renderNumberField('area', 'Площадь', {
                  suffix: 'м²',
                  placeholder: '0',
                  required: true,
                  hint: 'Общая площадь объекта',
                })}
                {renderSelectField(
                  'commercialType',
                  'Тип объекта',
                  OTHER_OBJECT_TYPE_OPTIONS,
                  {
                    placeholder: 'Выберите тип',
                    hint: 'Помогает покупателям понять формат актива',
                  }
                )}
              </>
            )}
        </div>

        {isResidential && (
          <p className="oap-params-step__tip">
            Указывайте цифры как в документах — это снижает вопросы после просмотра и повышает
            доверие покупателей.
          </p>
        )}
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
        phase={testDrivePhase}
        testDrive={form.testDrive}
        pricePerDay={form.testDrivePricePerDay}
        insuranceDeposit={form.testDriveInsuranceDeposit}
        propertyTypeOption={selectedType}
        errors={testDriveErrors}
        onSelectChoice={handleTestDriveChoice}
        onChangeDetail={handleTestDriveDetailChange}
        onBackToQuestion={handleTestDriveBackToQuestion}
      />
    )
  }

  const renderStep5 = () => {
    const listingModes =
      form.testDrive === 'yes'
        ? LISTING_MODES.filter((mode) => mode.id === 'auction_buy_now')
        : LISTING_MODES

    const priceLabel =
      form.listingMode === 'auction_buy_now' ? 'Цена мгновенного выкупа' : 'Цена объекта'

    return (
    <div className="oap-step-publish">
      <label className="oap-field oap-field--full">
        <span className="oap-field__label">{priceLabel}</span>
        <div className="oap-field__suffix-wrap">
          <input
            type="text"
            inputMode="numeric"
            className="oap-field__input oap-field__input--suffix"
            placeholder="Введите цену"
            value={form.price}
            onChange={(e) => updateField('price', e.target.value.replace(/[^\d\s]/g, ''))}
          />
          <span className="oap-field__suffix">USD</span>
        </div>
      </label>

      {form.location && (
        <div className="oap-step1__location-preview">
          <MapPin size={16} aria-hidden />
          <span>{form.location}</span>
        </div>
      )}

      <div className="oap-field oap-field--full">
        <span className="oap-field__label">Тип размещения</span>
        {form.testDrive === 'yes' && (
          <p className="oap-step-publish__testdrive-note">
            Для объявлений с тест-драйвом доступен только формат «Аукцион + выкуп».
          </p>
        )}
        <div className="oap-listing-cards">
          {listingModes.map((mode) => (
            <button
              key={mode.id}
              type="button"
              className={`oap-listing-card${form.listingMode === mode.id ? ' oap-listing-card--active' : ''}`}
              onClick={() => updateField('listingMode', mode.id)}
            >
              <span className="oap-listing-card__title">{mode.label}</span>
              <span className="oap-listing-card__desc">{mode.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="oap-step-grid">
        <label className="oap-field">
          <span className="oap-field__label">Стартовая цена аукциона</span>
          <div className="oap-field__suffix-wrap">
            <input
              type="text"
              inputMode="numeric"
              className="oap-field__input oap-field__input--suffix"
              placeholder="Введите цену"
              value={form.auctionStartingPrice}
              onChange={(e) =>
                updateField('auctionStartingPrice', e.target.value.replace(/[^\d\s]/g, ''))
              }
            />
            <span className="oap-field__suffix">USD</span>
          </div>
        </label>
        <label className="oap-field">
          <span className="oap-field__label">Дата начала</span>
          <input
            type="date"
            className="oap-field__input"
            value={form.auctionStartDate}
            onChange={(e) => updateField('auctionStartDate', e.target.value)}
          />
        </label>
        <label className="oap-field">
          <span className="oap-field__label">Дата окончания</span>
          <input
            type="date"
            className="oap-field__input"
            value={form.auctionEndDate}
            onChange={(e) => updateField('auctionEndDate', e.target.value)}
          />
        </label>
      </div>
    </div>
    )
  }

  const stepContent = {
    1: renderStepType,
    2: renderStepText,
    3: renderStepParams,
    4: renderStepLocation,
    5: renderStepAmenities,
    6: renderStepMedia,
    7: renderStepDocuments,
    8: renderStepTestDrive,
    9: renderStep5,
  }

  return (
    <div className="oap">
      <div className="oap-shell">
        <header className="oap-header">
          <button type="button" className="oap-header__back" aria-label="Назад" onClick={goToProperties}>
            <ArrowLeft size={22} strokeWidth={2} />
          </button>
          <h1 className="oap-header__title">Добавление объекта</h1>
        </header>

        <nav className="oap-stepper" aria-label="Шаги добавления объекта">
          {progressSteps.map((s, idx) => {
            const num = idx + 1
            const isActive = num === activeProgress
            const isDone = num < activeProgress
            return (
              <div
                key={s.id}
                className={`oap-stepper__item${isActive ? ' oap-stepper__item--active' : ''}${isDone ? ' oap-stepper__item--done' : ''}`}
              >
                <span className="oap-stepper__dot">{num}</span>
                <span className="oap-stepper__label">{s.label}</span>
                {idx < progressSteps.length - 1 && <span className="oap-stepper__line" aria-hidden />}
              </div>
            )
          })}
        </nav>

        <div className="oap-content">
          {draftRestoredNotice && (
            <p className="oap-draft-notice" role="status">
              Продолжаем с сохранённого черновика — данные хранятся до отправки на модерацию.
              <button
                type="button"
                className="oap-draft-notice__dismiss"
                onClick={() => setDraftRestoredNotice(false)}
              >
                Скрыть
              </button>
            </p>
          )}
          {stepContent[step]?.()}
        </div>

        <footer className="oap-footer">
          {step > 1 && (
            <button type="button" className="oap-btn oap-btn--ghost oap-desktop-only" onClick={handleBack}>
              Назад
            </button>
          )}
          <button
            type="button"
            className={`oap-btn oap-btn--primary${isMobile ? ' oap-btn--full' : ''}`}
            onClick={handleNext}
            disabled={!canProceed}
          >
            {step === TOTAL_STEPS ? 'Опубликовать' : 'Далее'}
          </button>
        </footer>
      </div>
    </div>
  )
}

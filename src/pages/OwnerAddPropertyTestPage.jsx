import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ChevronDown,
  MapPin,
  Upload,
  X,
  ImagePlus,
} from 'lucide-react'
import { OWNER_VIEWS } from '../context/OwnerTestNavigationContext'
import { useOwnerTestEmbeddedNav } from '../hooks/useOwnerTestEmbeddedNav'
import './OwnerAddPropertyTestPage.css'
import './OwnerAddPropertyTestPage.mobile.css'

const DESKTOP_STEPS = [
  { id: 1, label: 'Основное' },
  { id: 2, label: 'Характеристики' },
  { id: 3, label: 'Фото и видео' },
  { id: 4, label: 'Дополнительно' },
  { id: 5, label: 'Публикация' },
]

const MOBILE_STEPS = [
  { id: 1, label: 'Описание' },
  { id: 2, label: 'Характеристики' },
  { id: 3, label: 'Фото' },
]

const PROPERTY_TYPES = [
  { value: 'house', label: 'Дом' },
  { value: 'villa', label: 'Вилла' },
  { value: 'apartments', label: 'Аппартаменты' },
  { value: 'apartment', label: 'Квартира' },
  { value: 'commercial', label: 'Коммерческая недвижимость' },
  { value: 'land', label: 'Земля' },
  { value: 'other', label: 'Другое' },
]

const LISTING_MODES = [
  { id: 'auction', label: 'Аукцион', description: 'Продажа через торги между покупателями' },
  { id: 'auction_buy_now', label: 'Аукцион + выкуп', description: 'Торги с возможностью мгновенного выкупа' },
  { id: 'shares', label: 'Доли', description: 'Продажа долей в объекте' },
]

const AMENITY_CHIPS = [
  'Парковка',
  'Бассейн',
  'Сад',
  'Кондиционер',
  'Отопление',
  'Мебель',
  'Балкон',
  'Лифт',
  'Охрана',
  'Интернет',
]

const MAX_PHOTO_SIZE = 10 * 1024 * 1024
const MAX_PHOTOS = 10

const INITIAL_FORM = {
  title: '',
  propertyType: '',
  price: '',
  location: '',
  area: '',
  rooms: '',
  bedrooms: '',
  bathrooms: '',
  floor: '',
  yearBuilt: '',
  description: '',
  videoUrl: '',
  testDrive: '',
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

function getMobileProgressStep(desktopStep) {
  if (desktopStep <= 1) return 1
  if (desktopStep === 2) return 2
  return 3
}

export default function OwnerAddPropertyTestPage() {
  const { isEmbedded, goTo } = useOwnerTestEmbeddedNav()
  const navigate = useNavigate()
  const isMobile = useOapMobile()
  const fileInputRef = useRef(null)
  const extraPhotoInputRef = useRef(null)

  const [step, setStep] = useState(1)
  const [form, setForm] = useState(INITIAL_FORM)
  const [photos, setPhotos] = useState([])
  const [amenities, setAmenities] = useState([])
  const [dragOver, setDragOver] = useState(false)
  const [typeOpen, setTypeOpen] = useState(false)

  const updateField = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  const addPhotos = useCallback((files) => {
    const valid = Array.from(files).filter(
      (f) =>
        (f.type === 'image/jpeg' || f.type === 'image/png') && f.size <= MAX_PHOTO_SIZE
    )
    const remaining = MAX_PHOTOS - photos.length
    const toAdd = valid.slice(0, remaining).map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      preview: URL.createObjectURL(file),
    }))
    setPhotos((prev) => [...prev, ...toAdd])
  }, [photos.length])

  const removePhoto = useCallback((id) => {
    setPhotos((prev) => {
      const item = prev.find((p) => p.id === id)
      if (item?.preview) URL.revokeObjectURL(item.preview)
      return prev.filter((p) => p.id !== id)
    })
  }, [])

  const toggleAmenity = useCallback((name) => {
    setAmenities((prev) =>
      prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name]
    )
  }, [])

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault()
      setDragOver(false)
      if (e.dataTransfer.files?.length) addPhotos(e.dataTransfer.files)
    },
    [addPhotos]
  )

  const goToProperties = useCallback(() => {
    if (goTo) {
      goTo(OWNER_VIEWS.PROPERTIES)
    } else {
      navigate('/owner-test?view=properties')
    }
  }, [goTo, navigate])

  const handleNext = useCallback(() => {
    if (step < 5) {
      setStep((s) => s + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      goToProperties()
    }
  }, [step, goToProperties])

  const handleBack = useCallback(() => {
    if (step > 1) {
      setStep((s) => s - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      goToProperties()
    }
  }, [step, goToProperties])

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
    }
  }, [photos])

  const progressSteps = isMobile ? MOBILE_STEPS : DESKTOP_STEPS
  const activeProgress = isMobile ? getMobileProgressStep(step) : step
  const selectedType = PROPERTY_TYPES.find((t) => t.value === form.propertyType)

  const renderUploadZone = (variant = 'main') => (
    <div
      className={`oap-upload${dragOver ? ' oap-upload--drag' : ''}${variant === 'compact' ? ' oap-upload--compact' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <input
        ref={variant === 'main' ? fileInputRef : extraPhotoInputRef}
        type="file"
        accept="image/jpeg,image/png"
        multiple
        className="oap-upload__input"
        onChange={(e) => {
          if (e.target.files?.length) addPhotos(e.target.files)
          e.target.value = ''
        }}
      />
      {variant === 'main' && !isMobile && (
        <div className="oap-upload__inner">
          <p className="oap-upload__title">Загрузите фото объекта</p>
          <p className="oap-upload__hint">Перетащите файлы сюда или</p>
          <button
            type="button"
            className="oap-upload__btn"
            onClick={() => fileInputRef.current?.click()}
          >
            Выбрать файлы
          </button>
          <p className="oap-upload__formats">Поддерживаемые форматы: JPG, PNG (до 10 МБ)</p>
        </div>
      )}
      {(variant !== 'main' || isMobile) && (
        <div className="oap-upload__inner oap-upload__inner--mobile">
          <span className="oap-upload__icon" aria-hidden>
            <Upload size={28} strokeWidth={1.75} />
          </span>
          <p className="oap-upload__title">Загрузите фото объекта</p>
          <p className="oap-upload__hint">
            Перетащите файлы сюда или{' '}
            <button
              type="button"
              className="oap-upload__link"
              onClick={() =>
                (variant === 'main' ? fileInputRef : extraPhotoInputRef).current?.click()
              }
            >
              Выбрать файлы
            </button>
          </p>
          {variant === 'main' && isMobile && (
            <p className="oap-upload__formats">JPG, PNG (до 10 МБ)</p>
          )}
        </div>
      )}
      {photos.length > 0 && (
        <div className="oap-upload__previews">
          {photos.map((photo) => (
            <div key={photo.id} className="oap-upload__preview">
              <img src={photo.preview} alt="" />
              <button
                type="button"
                className="oap-upload__remove"
                aria-label="Удалить фото"
                onClick={() => removePhoto(photo.id)}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderStep1 = () => (
    <div className={`oap-step1${isMobile ? ' oap-step1--mobile' : ''}`}>
      <div className="oap-step1__fields">
        <label className="oap-field">
          <span className="oap-field__label">Название объекта</span>
          <input
            type="text"
            className="oap-field__input"
            placeholder={isMobile ? 'Введите название' : 'Введите название объекта'}
            value={form.title}
            onChange={(e) => updateField('title', e.target.value)}
          />
        </label>

        <div className="oap-field">
          <span className="oap-field__label">Тип недвижимости</span>
          <div className={`oap-select${typeOpen ? ' oap-select--open' : ''}`}>
            <button
              type="button"
              className="oap-select__trigger"
              onClick={() => setTypeOpen((o) => !o)}
              aria-expanded={typeOpen}
            >
              <span className={selectedType ? '' : 'oap-select__placeholder'}>
                {selectedType?.label || 'Выберите тип'}
              </span>
              <ChevronDown size={18} className="oap-select__chevron" aria-hidden />
            </button>
            {typeOpen && (
              <ul className="oap-select__menu" role="listbox">
                {PROPERTY_TYPES.map((type) => (
                  <li key={type.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={form.propertyType === type.value}
                      className={`oap-select__option${form.propertyType === type.value ? ' oap-select__option--active' : ''}`}
                      onClick={() => {
                        updateField('propertyType', type.value)
                        setTypeOpen(false)
                      }}
                    >
                      {type.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <label className="oap-field">
          <span className="oap-field__label">Цена</span>
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

        <label className="oap-field">
          <span className="oap-field__label">Местоположение</span>
          <div className="oap-field__prefix-wrap">
            {!isMobile && (
              <MapPin size={18} className="oap-field__prefix-icon" aria-hidden />
            )}
            <input
              type="text"
              className={`oap-field__input${!isMobile ? ' oap-field__input--prefix' : ''}`}
              placeholder={
                isMobile ? 'Введите адрес' : 'Введите адрес или выберите на карте'
              }
              value={form.location}
              onChange={(e) => updateField('location', e.target.value)}
            />
          </div>
        </label>
      </div>

      {!isMobile && <div className="oap-step1__upload">{renderUploadZone('main')}</div>}
      {isMobile && renderUploadZone('main')}
    </div>
  )

  const renderStep2 = () => (
    <div className="oap-step-grid">
      <label className="oap-field">
        <span className="oap-field__label">Площадь, м²</span>
        <input
          type="text"
          inputMode="numeric"
          className="oap-field__input"
          placeholder="Введите площадь"
          value={form.area}
          onChange={(e) => updateField('area', e.target.value)}
        />
      </label>
      <label className="oap-field">
        <span className="oap-field__label">Комнаты</span>
        <input
          type="text"
          inputMode="numeric"
          className="oap-field__input"
          placeholder="Количество комнат"
          value={form.rooms}
          onChange={(e) => updateField('rooms', e.target.value)}
        />
      </label>
      <label className="oap-field">
        <span className="oap-field__label">Спальни</span>
        <input
          type="text"
          inputMode="numeric"
          className="oap-field__input"
          placeholder="Количество спален"
          value={form.bedrooms}
          onChange={(e) => updateField('bedrooms', e.target.value)}
        />
      </label>
      <label className="oap-field">
        <span className="oap-field__label">Санузлы</span>
        <input
          type="text"
          inputMode="numeric"
          className="oap-field__input"
          placeholder="Количество санузлов"
          value={form.bathrooms}
          onChange={(e) => updateField('bathrooms', e.target.value)}
        />
      </label>
      <label className="oap-field">
        <span className="oap-field__label">Этаж</span>
        <input
          type="text"
          inputMode="numeric"
          className="oap-field__input"
          placeholder="Номер этажа"
          value={form.floor}
          onChange={(e) => updateField('floor', e.target.value)}
        />
      </label>
      <label className="oap-field">
        <span className="oap-field__label">Год постройки</span>
        <input
          type="text"
          inputMode="numeric"
          className="oap-field__input"
          placeholder="Например, 2018"
          value={form.yearBuilt}
          onChange={(e) => updateField('yearBuilt', e.target.value)}
        />
      </label>
    </div>
  )

  const renderStep3 = () => (
    <div className="oap-step-media">
      <div className="oap-step-media__upload">{renderUploadZone('compact')}</div>
      <label className="oap-field">
        <span className="oap-field__label">Ссылка на видео</span>
        <input
          type="url"
          className="oap-field__input"
          placeholder="YouTube, Vimeo или прямая ссылка"
          value={form.videoUrl}
          onChange={(e) => updateField('videoUrl', e.target.value)}
        />
      </label>
      {photos.length > 0 && (
        <div className="oap-step-media__gallery">
          <p className="oap-step-media__gallery-title">
            <ImagePlus size={18} aria-hidden />
            Загружено фото: {photos.length}
          </p>
          <div className="oap-step-media__thumbs">
            {photos.map((photo) => (
              <div key={photo.id} className="oap-step-media__thumb">
                <img src={photo.preview} alt="" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  const renderStep4 = () => (
    <div className="oap-step-extra">
      <label className="oap-field oap-field--full">
        <span className="oap-field__label">Описание объекта</span>
        <textarea
          className="oap-field__textarea"
          rows={5}
          placeholder="Расскажите о преимуществах объекта, районе и инфраструктуре"
          value={form.description}
          onChange={(e) => updateField('description', e.target.value)}
        />
      </label>

      <div className="oap-field oap-field--full">
        <span className="oap-field__label">Удобства</span>
        <div className="oap-chips">
          {AMENITY_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              className={`oap-chip${amenities.includes(chip) ? ' oap-chip--active' : ''}`}
              onClick={() => toggleAmenity(chip)}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      <div className="oap-field oap-field--full">
        <span className="oap-field__label">Тест-драйв</span>
        <div className="oap-radio-group">
          {[
            { value: 'yes', label: 'Да, доступен тест-драйв' },
            { value: 'no', label: 'Нет' },
          ].map((opt) => (
            <label
              key={opt.value}
              className={`oap-radio${form.testDrive === opt.value ? ' oap-radio--active' : ''}`}
            >
              <input
                type="radio"
                name="testDrive"
                value={opt.value}
                checked={form.testDrive === opt.value}
                onChange={() => updateField('testDrive', opt.value)}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )

  const renderStep5 = () => (
    <div className="oap-step-publish">
      <div className="oap-field oap-field--full">
        <span className="oap-field__label">Тип размещения</span>
        <div className="oap-listing-cards">
          {LISTING_MODES.map((mode) => (
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

  const stepContent = {
    1: renderStep1,
    2: renderStep2,
    3: renderStep3,
    4: renderStep4,
    5: renderStep5,
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

        <div className="oap-content">{stepContent[step]?.()}</div>

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
          >
            {step === 5 ? 'Опубликовать' : 'Далее'}
          </button>
        </footer>
      </div>
    </div>
  )
}

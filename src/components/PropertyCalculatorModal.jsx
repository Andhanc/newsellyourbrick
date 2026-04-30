import { useState, useEffect, useMemo } from 'react'
import { FiX, FiHome, FiMapPin, FiDollarSign, FiLoader, FiLayers } from 'react-icons/fi'
import { MdBed } from 'react-icons/md'
import { BiArea } from 'react-icons/bi'
import axios from 'axios'
import './PropertyCalculatorModal.css'

const DEFAULT_CITIES = [
  { value: 'barcelona', label: 'Барселона', region: 'Каталония' },
  { value: 'madrid', label: 'Мадрид', region: 'Мадрид' }
]

function normalizeCityInput(value = '') {
  return String(value)
    .split(',')[0]
    .trim()
    .toLowerCase()
}

function mapListingToCalculatorData(source = {}) {
  const rawPropertyType = String(source.propertyType || '').toLowerCase()
  const propertyTypeMap = {
    apartment: 'apartment',
    apartamento: 'apartamento',
    house: 'house',
    villa: 'villa',
    commercial: 'commercial',
    land: 'land'
  }

  const propertyType = propertyTypeMap[rawPropertyType] || 'apartment'
  const skipRooms = propertyType === 'land' || propertyType === 'commercial'
  const area = source.area != null && source.area !== '' ? String(source.area) : ''
  let rooms = 'studio'

  if (!skipRooms) {
    const rawRooms = source.rooms ?? source.bedrooms
    const parsedRooms = parseInt(rawRooms, 10)
    if (Number.isFinite(parsedRooms) && parsedRooms > 0) {
      rooms = String(Math.min(parsedRooms, 5))
    } else {
      rooms = 'studio'
    }
  }

  const cityAlias = {
    madrid: 'madrid',
    мадрид: 'madrid',
    barcelona: 'barcelona',
    барселона: 'barcelona'
  }
  const rawCity = normalizeCityInput(source.city)
  const mappedCity = cityAlias[rawCity] || rawCity || 'barcelona'

  return {
    area,
    rooms,
    city: mappedCity,
    district: 'all',
    propertyType,
    street: source.address || source.location || ''
  }
}

const PropertyCalculatorModal = ({
  isOpen,
  onClose,
  initialPropertyData = null,
  onApplyRecommendedPrice,
  lockFields = false
}) => {
  const [formData, setFormData] = useState({
    area: '',
    rooms: 'studio',
    city: 'barcelona',
    district: 'all',
    propertyType: 'apartment',
    street: ''
  })

  const [calcOptions, setCalcOptions] = useState({ cities: [], districtsByCity: {} })
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  const [isDetectingDistrict, setIsDetectingDistrict] = useState(false)
  const [districtHint, setDistrictHint] = useState('')
  const [districtTouched, setDistrictTouched] = useState(false)
  const fieldsAreLocked = lockFields && !!initialPropertyData
  const initialMappedData = useMemo(
    () => mapListingToCalculatorData(initialPropertyData || {}),
    [initialPropertyData]
  )

  useEffect(() => {
    if (!isOpen || !initialPropertyData) return
    // Важно: инициализируем форму только в момент открытия модалки.
    // Иначе при каждом ререндере родителя district сбрасывается в "all".
    setFormData((prev) => ({
      ...prev,
      ...initialMappedData
    }))
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    setDistrictTouched(false)
    setDistrictHint('')
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    axios
      .get('/api/properties/calculator-options')
      .then((r) => {
        if (!cancelled && r.data?.success && r.data.data?.cities?.length) {
          setCalcOptions({
            cities: r.data.data.cities,
            districtsByCity: r.data.data.districtsByCity || {}
          })
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !formData.city || !calcOptions.cities?.length) return
    const existsByValue = calcOptions.cities.some((c) => c.value === formData.city)
    if (existsByValue) return

    const normalizedCurrent = String(formData.city).trim().toLowerCase()
    const byLabel = calcOptions.cities.find((c) => String(c.label || '').trim().toLowerCase() === normalizedCurrent)
    if (byLabel?.value) {
      setFormData((prev) => ({ ...prev, city: byLabel.value }))
    }
  }, [isOpen, formData.city, calcOptions.cities])

  const baseCitiesList = calcOptions.cities.length ? calcOptions.cities : DEFAULT_CITIES
  const citiesList = useMemo(() => {
    if (!formData.city) return baseCitiesList
    const hasCity = baseCitiesList.some((c) => c.value === formData.city)
    if (hasCity) return baseCitiesList

    const fallbackLabel = initialPropertyData?.city || formData.city
    return [
      {
        value: formData.city,
        label: fallbackLabel,
        region: 'Текущая локация'
      },
      ...baseCitiesList
    ]
  }, [baseCitiesList, formData.city, initialPropertyData?.city])

  const citiesByRegion = useMemo(() => {
    const m = {}
    for (const c of citiesList) {
      const r = c.region || 'Другое'
      if (!m[r]) m[r] = []
      m[r].push(c)
    }
    return m
  }, [citiesList])

  const districtOptions = useMemo(() => {
    const raw = calcOptions.districtsByCity[formData.city]
    if (raw && raw.length) return raw
    return [{ value: 'all', label: 'Весь город' }]
  }, [calcOptions.districtsByCity, formData.city])

  const skipRooms = formData.propertyType === 'land' || formData.propertyType === 'commercial'

  useEffect(() => {
    if (!isOpen || !formData.city || !formData.street) return
    let cancelled = false

    const detectDistrict = async () => {
      setIsDetectingDistrict(true)
      try {
        const response = await axios.post('/api/properties/detect-district', {
          address: formData.street,
          city: formData.city,
          country: initialPropertyData?.country || null
        })

        if (cancelled) return
        if (!response.data?.success) return
        const detectedDistrict = response.data?.data?.district || 'all'
        const detectedLabel = response.data?.data?.districtLabel || 'Весь город'

        setDistrictHint(`Определен район: ${detectedLabel}`)
        setFormData((prev) => {
          if (!fieldsAreLocked && districtTouched) return prev
          if (!detectedDistrict) return prev
          if (prev.district === detectedDistrict) return prev
          return { ...prev, district: detectedDistrict }
        })
      } catch (_) {
        if (!cancelled) setDistrictHint('')
      } finally {
        if (!cancelled) setIsDetectingDistrict(false)
      }
    }

    detectDistrict()
    return () => {
      cancelled = true
    }
  }, [isOpen, formData.city, formData.street, initialPropertyData?.country, fieldsAreLocked, districtTouched])

  if (!isOpen) return null

  const handleInputChange = (e) => {
    const { name, value } = e.target
    if (fieldsAreLocked && name !== 'district') return
    setFormData((prev) => {
      if (name === 'city') {
        return { ...prev, city: value, district: 'all' }
      }
      if (name === 'district') {
        setDistrictTouched(true)
        return { ...prev, district: value }
      }
      return { ...prev, [name]: value }
    })
    if (error) setError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.area || !formData.city) {
      setError('Укажите площадь и город')
      return
    }
    if (!skipRooms && formData.rooms === undefined) {
      setError('Укажите количество комнат')
      return
    }

    setIsLoading(true)
    setError(null)
    setResults(null)

    const roomsPayload = skipRooms
      ? null
      : formData.rooms === 'studio'
        ? 'studio'
        : parseInt(formData.rooms, 10)

    try {
      const response = await axios.post(
        '/api/properties/calculate-price',
        {
          area: parseInt(formData.area, 10),
          rooms: roomsPayload,
          city: formData.city,
          country: initialPropertyData?.country || null,
          street: formData.street || initialPropertyData?.address || initialPropertyData?.location || null,
          district: formData.district || 'all',
          propertyType: formData.propertyType,
          maxPrice: null,
          minPrice: null
        },
        {
          timeout: 120000
        }
      )

      if (response.data.success) {
        const data = response.data.data

        const searchId = `search_${Date.now()}`
        const storageData = {
          searchId,
          timestamp: Date.now(),
          queryParams: formData,
          recommendedPrice: data.recommendedPrice,
          recommendedPricePerSqm: data.recommendedPricePerSqm,
          similarProperties: data.similarProperties,
          note: data.note,
          searchParams: data.searchParams,
          expiresAt: Date.now() + 3600000
        }

        sessionStorage.setItem(searchId, JSON.stringify(storageData))
        sessionStorage.setItem('lastSearchId', searchId)

        setResults(data)
      } else {
        setError(response.data.error || 'Ошибка при получении данных')
      }
    } catch (err) {
      console.error('Ошибка при парсинге:', err)
      const isTimeout = err?.code === 'ECONNABORTED' || /timeout/i.test(String(err?.message || ''))
      setError(
        err.response?.data?.error ||
        (isTimeout
          ? 'Расчет занял слишком много времени. Попробуйте еще раз или уточните параметры.'
          : 'Ошибка при подключении к серверу. Попробуйте позже.')
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    if (fieldsAreLocked) {
      setFormData((prev) => ({
        ...prev,
        ...initialMappedData,
        district: 'all'
      }))
      setResults(null)
      setError(null)
      return
    }

    setFormData({
      area: '',
      rooms: 'studio',
      city: 'barcelona',
      district: 'all',
        propertyType: 'apartment',
        street: ''
    })
    setResults(null)
    setError(null)

    const lastSearchId = sessionStorage.getItem('lastSearchId')
    if (lastSearchId) {
      sessionStorage.removeItem(lastSearchId)
      sessionStorage.removeItem('lastSearchId')
    }
  }

  const formatPrice = (price) => {
    if (!price) return 'Не указано'
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price)
  }

  const sanitizeAddress = (value = '') => {
    const text = String(value || '').replace(/\s+/g, ' ').trim()
    if (!text) return ''
    if (/cerca de mi ubicaci[oó]n actual/i.test(text)) return ''
    if (/near my current location/i.test(text)) return ''
    return text
  }

  return (
    <div className="property-calculator-overlay" onClick={onClose}>
      <div className="property-calculator-modal" onClick={(e) => e.stopPropagation()}>
        <button
          className="property-calculator-modal__close"
          onClick={onClose}
          aria-label="Закрыть"
        >
          <FiX size={24} />
        </button>

        <div className="property-calculator-modal__content">
          <div className="property-calculator-modal__hero">
            <div className="property-calculator-modal__hero-icon" aria-hidden>
              <FiDollarSign size={26} />
            </div>
            <div className="property-calculator-modal__header">
              <p className="property-calculator-modal__eyebrow">Оценка рынка</p>
              <h2 className="property-calculator-modal__title">
                Калькулятор стоимости
              </h2>
              <p className="property-calculator-modal__subtitle">
                Тип жилья, город и район — ориентир по цене на основе объявлений с нескольких площадок
              </p>
            </div>
          </div>

          {!results ? (
            <>
              {isLoading ? (
                <div className="property-calculator-loader">
                  <FiLoader className="property-calculator-loader__icon" size={48} />
                  <h3 className="property-calculator-loader__title">Сбор объявлений с нескольких порталов...</h3>
                  <p className="property-calculator-loader__subtitle">
                    Это может занять до минуты: запрашиваем похожие лоты и считаем устойчивую медиану.
                  </p>
                </div>
              ) : (
                <form className="property-calculator-form" onSubmit={handleSubmit}>
                  {error && (
                    <div className="property-calculator-form__error">
                      {error}
                    </div>
                  )}

                  <div className="property-calculator-form__panel">
                    <h3 className="property-calculator-form__panel-title">
                      <FiHome size={18} />
                      Параметры объекта
                    </h3>
                    <div className="property-calculator-form__panel-separator" />
                    <div className="property-calculator-form__field property-calculator-form__field--full">
                      <label className="property-calculator-form__label">
                        <FiLayers size={18} />
                        Тип недвижимости
                      </label>
                      <select
                        name="propertyType"
                        value={formData.propertyType}
                        onChange={handleInputChange}
                        className={`property-calculator-form__select ${fieldsAreLocked ? 'property-calculator-form__select--locked' : ''}`}
                        disabled={fieldsAreLocked}
                      >
                        <option value="apartment">Квартира</option>
                        <option value="apartamento">Апартаменты</option>
                        <option value="house">Дом / таунхаус</option>
                        <option value="villa">Вилла / шале</option>
                        <option value="land">Земельный участок</option>
                        <option value="commercial">Коммерческая недвижимость</option>
                      </select>
                    </div>

                    <div className="property-calculator-form__grid property-calculator-form__grid--top">
                      <div className="property-calculator-form__field">
                        <label className="property-calculator-form__label">
                          <BiArea size={18} />
                          Площадь, м²
                        </label>
                        <input
                          type="number"
                          name="area"
                          value={formData.area}
                          onChange={handleInputChange}
                          placeholder="80"
                          className="property-calculator-form__input"
                          min="1"
                          required
                          readOnly={fieldsAreLocked}
                        />
                      </div>

                      {!skipRooms && (
                        <div className="property-calculator-form__field">
                          <label className="property-calculator-form__label">
                            <MdBed size={18} />
                            Комнат
                          </label>
                          <select
                            name="rooms"
                            value={formData.rooms}
                            onChange={handleInputChange}
                            className={`property-calculator-form__select ${fieldsAreLocked ? 'property-calculator-form__select--locked' : ''}`}
                            required
                            disabled={fieldsAreLocked}
                          >
                            <option value="studio">Студия</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="4">4</option>
                            <option value="5">5+</option>
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="property-calculator-form__field property-calculator-form__field--full">
                      <label className="property-calculator-form__label">
                        <FiMapPin size={18} />
                        Город
                      </label>
                      <select
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        className={`property-calculator-form__select ${fieldsAreLocked ? 'property-calculator-form__select--locked' : ''}`}
                        required
                        disabled={fieldsAreLocked}
                      >
                        {Object.entries(citiesByRegion).map(([region, cities]) => (
                          <optgroup key={region} label={region}>
                            {cities.map((c) => (
                              <option key={c.value} value={c.value}>
                                {c.label}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>

                    <div className="property-calculator-form__field property-calculator-form__field--full">
                      <label className="property-calculator-form__label">
                        <FiMapPin size={18} />
                        Адрес объекта
                      </label>
                      <input
                        type="text"
                        name="street"
                        value={formData.street || ''}
                        onChange={handleInputChange}
                        placeholder="Улица, дом"
                        className="property-calculator-form__input"
                        readOnly={fieldsAreLocked}
                      />
                    </div>

                    <div className="property-calculator-form__field property-calculator-form__field--full">
                      <label className="property-calculator-form__label">
                        <FiMapPin size={18} />
                        Район (опционально)
                      </label>
                      <select
                        name="district"
                        value={formData.district}
                        onChange={handleInputChange}
                        className="property-calculator-form__select"
                      >
                        {districtOptions.map((d) => (
                          <option key={d.value} value={d.value}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                      {(isDetectingDistrict || districtHint) && (
                        <div className="property-calculator-result__note" style={{ marginTop: '6px' }}>
                          {isDetectingDistrict ? 'Определяем район по адресу...' : districtHint}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="property-calculator-form__actions">
                    <button
                      type="button"
                      className="property-calculator-form__button property-calculator-form__button--secondary"
                      onClick={onClose}
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      className="property-calculator-form__button property-calculator-form__button--liquid"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Поиск...' : 'Рассчитать стоимость'}
                    </button>
                  </div>
                </form>
              )}
            </>
          ) : (
            <div className="property-calculator-result">
              <div className="property-calculator-result__header">
                <div className="property-calculator-result__icon">
                  <FiDollarSign size={48} />
                </div>
                <h3 className="property-calculator-result__title">Рекомендуемая цена</h3>
                <div className="property-calculator-result__price">
                  {results.recommendedPrice ? formatPrice(results.recommendedPrice) : 'Не удалось определить'}
                </div>
                {results.recommendedPricePerSqm != null && (
                  <p className="property-calculator-result__note" style={{ marginTop: '8px' }}>
                    Ориентир: {formatPrice(results.recommendedPricePerSqm)} / м²
                  </p>
                )}
                {results.searchParams?.sources?.length > 0 && (
                  <p className="property-calculator-result__note">
                    Источники: {results.searchParams.sources.join(', ')}
                  </p>
                )}
                {results.note && (
                  <div className="property-calculator-result__warning">
                    {results.note}
                  </div>
                )}
              </div>

              {results.similarProperties && results.similarProperties.length > 0 ? (
                <div className="property-calculator-result__similar">
                  <h4 className="property-calculator-result__similar-title">
                    Похожие объекты ({results.similarProperties.length})
                  </h4>
                  <div className="property-calculator-result__similar-list">
                    {results.similarProperties.slice(0, 10).map((property, index) => (
                      <div key={index} className="property-calculator-result__similar-item">
                        <div className="property-calculator-result__similar-image">
                          {property.image ? (
                            <img
                              src={property.image}
                              alt=""
                              loading="lazy"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                          ) : (
                            <div className="property-calculator-result__similar-image-placeholder">
                              <FiHome size={24} />
                            </div>
                          )}
                        </div>
                        <div className="property-calculator-result__similar-content">
                          <div className="property-calculator-result__similar-price">
                            {formatPrice(property.price)}
                            {property.source && (
                              <span className="property-calculator-result__source"> · {property.source}</span>
                            )}
                          </div>
                          <div className="property-calculator-result__similar-details">
                            {property.area && <span>{property.area} м²</span>}
                            {property.rooms != null && <span>{property.rooms} комн.</span>}
                          </div>
                          {sanitizeAddress(property.address) && (
                            <div className="property-calculator-result__similar-address">
                              {sanitizeAddress(property.address)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="property-calculator-result__no-results">
                  <p className="property-calculator-result__no-results-text">
                    Не удалось найти достаточно похожих объявлений с указанными параметрами.
                  </p>
                  <p className="property-calculator-result__no-results-suggestion">
                    Попробуйте «Весь город», соседний район или чуть измените площадь.
                  </p>
                </div>
              )}

              <div className="property-calculator-result__actions">
                <button
                  className="property-calculator-form__button property-calculator-form__button--liquid"
                  onClick={handleReset}
                >
                  Новый расчет
                </button>
                <button
                  className="property-calculator-form__button property-calculator-form__button--secondary"
                  onClick={onClose}
                >
                  Закрыть
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PropertyCalculatorModal

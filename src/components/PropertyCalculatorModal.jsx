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

const PropertyCalculatorModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    area: '',
    rooms: 'studio',
    city: 'barcelona',
    district: 'all',
    propertyType: 'apartment'
  })

  const [calcOptions, setCalcOptions] = useState({ cities: [], districtsByCity: {} })
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)

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

  const citiesList = calcOptions.cities.length ? calcOptions.cities : DEFAULT_CITIES

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

  if (!isOpen) return null

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => {
      if (name === 'city') {
        return { ...prev, city: value, district: 'all' }
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
      const response = await axios.post('/api/properties/calculate-price', {
        area: parseInt(formData.area, 10),
        rooms: roomsPayload,
        city: formData.city,
        district: formData.district || 'all',
        propertyType: formData.propertyType,
        maxPrice: null,
        minPrice: null
      })

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
      setError(err.response?.data?.error || 'Ошибка при подключении к серверу. Попробуйте позже.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setFormData({
      area: '',
      rooms: 'studio',
      city: 'barcelona',
      district: 'all',
      propertyType: 'apartment'
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
                Тип жилья, город и район — ориентир по цене по данным Pisos.com
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
                    <div className="property-calculator-form__field property-calculator-form__field--full">
                      <label className="property-calculator-form__label">
                        <FiLayers size={18} />
                        Тип недвижимости
                      </label>
                      <select
                        name="propertyType"
                        value={formData.propertyType}
                        onChange={handleInputChange}
                        className="property-calculator-form__select"
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
                            className="property-calculator-form__select"
                            required
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
                        className="property-calculator-form__select"
                        required
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
                      className="property-calculator-form__button property-calculator-form__button--primary"
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
                <p className="property-calculator-result__note">
                  Оценка строится по медиане цен похожих объявлений (при большой выборке — с отсечением
                  экстремальных значений). Это не официальная оценка для банка или нотариуса.
                </p>
              </div>

              {results.similarProperties && results.similarProperties.length > 0 ? (
                <div className="property-calculator-result__similar">
                  <h4 className="property-calculator-result__similar-title">
                    Похожие объекты ({results.similarProperties.length})
                  </h4>
                  <div className="property-calculator-result__similar-list">
                    {results.similarProperties.slice(0, 10).map((property, index) => (
                      <div key={index} className="property-calculator-result__similar-item">
                        {property.image && (
                          <div className="property-calculator-result__similar-image">
                            <img src={property.image} alt="" />
                          </div>
                        )}
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
                          {property.address && (
                            <div className="property-calculator-result__similar-address">
                              {property.address}
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
                  className="property-calculator-form__button property-calculator-form__button--secondary"
                  onClick={handleReset}
                >
                  Новый расчет
                </button>
                <button
                  className="property-calculator-form__button property-calculator-form__button--primary"
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

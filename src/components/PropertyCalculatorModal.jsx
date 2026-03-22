import { useState } from 'react'
import { FiX, FiHome, FiMapPin, FiDollarSign, FiLoader } from 'react-icons/fi'
import { MdBed } from 'react-icons/md'
import { BiArea } from 'react-icons/bi'
import axios from 'axios'
import './PropertyCalculatorModal.css'

const PropertyCalculatorModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    area: '',
    rooms: 'studio',
    city: 'barcelona'
  })

  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)

  if (!isOpen) return null

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Очищаем ошибки при изменении данных
    if (error) setError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Валидация
    if (!formData.area || !formData.rooms || !formData.city) {
      setError('Пожалуйста, заполните все обязательные поля')
      return
    }

    setIsLoading(true)
    setError(null)
    setResults(null)

    try {
      // Вызываем API для парсинга
      const response = await axios.post('/api/properties/calculate-price', {
        area: parseInt(formData.area),
        rooms: parseInt(formData.rooms),
        city: formData.city,
        propertyType: 'apartment',
        maxPrice: null,
        minPrice: null
      })

      if (response.data.success) {
        const data = response.data.data
        
        // Сохраняем результаты в sessionStorage
        const searchId = `search_${Date.now()}`
        const storageData = {
          searchId,
          timestamp: Date.now(),
          queryParams: formData,
          recommendedPrice: data.recommendedPrice,
          similarProperties: data.similarProperties,
          note: data.note,
          searchParams: data.searchParams,
          expiresAt: Date.now() + 3600000 // 1 час
        }
        
        sessionStorage.setItem(searchId, JSON.stringify(storageData))
        
        // Сохраняем ID последнего поиска для быстрого доступа
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
      city: 'barcelona'
    })
    setResults(null)
    setError(null)
    
    // Очищаем sessionStorage
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
                Укажите площадь, число комнат и город — мы подберём ориентир по цене и похожие объявления
              </p>
            </div>
          </div>

          {!results ? (
            <>
              {isLoading ? (
                <div className="property-calculator-loader">
                  <FiLoader className="property-calculator-loader__icon" size={48} />
                  <h3 className="property-calculator-loader__title">Поиск похожих объектов...</h3>
                  <p className="property-calculator-loader__subtitle">
                    Пожалуйста, подождите. Мы анализируем рынок недвижимости в Испании.
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
                    </div>

                    <div className="property-calculator-form__field property-calculator-form__field--full">
                      <label className="property-calculator-form__label">
                        <FiMapPin size={18} />
                        Город / регион
                      </label>
                      <select 
                        name="city" 
                        value={formData.city}
                        onChange={handleInputChange}
                        className="property-calculator-form__select"
                        required
                      >
                        <optgroup label="Каталония">
                          <option value="barcelona">Барселона</option>
                        </optgroup>
                        <optgroup label="Валенсийское сообщество">
                          <option value="valencia">Валенсия</option>
                          <option value="alicante">Аликанте</option>
                          <option value="castellon">Кастельон</option>
                          <option value="torrevieja">Торревьеха</option>
                          <option value="benidorm">Бенидорм</option>
                          <option value="denia">Дения</option>
                          <option value="javea">Хавеа</option>
                          <option value="calpe">Калпе</option>
                          <option value="altea">Альтеа</option>
                          <option value="santa-pola">Санта-Пола</option>
                          <option value="villajoyosa">Виллахойоса</option>
                          <option value="gandia">Гандия</option>
                          <option value="oliva">Олива</option>
                          <option value="piles">Пилес</option>
                        </optgroup>
                        <optgroup label="Андалусия">
                          <option value="malaga">Малага</option>
                          <option value="marbella">Марбелья</option>
                          <option value="sevilla">Севилья</option>
                          <option value="granada">Гранада</option>
                        </optgroup>
                        <optgroup label="Мурсия">
                          <option value="murcia">Мурсия</option>
                        </optgroup>
                        <optgroup label="Мадрид">
                          <option value="madrid">Мадрид</option>
                        </optgroup>
                        <optgroup label="Страна Басков">
                          <option value="bilbao">Бильбао</option>
                        </optgroup>
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
                {results.note && (
                  <div className="property-calculator-result__warning">
                    {results.note}
                  </div>
                )}
                <p className="property-calculator-result__note">
                  {results.searchParams?.searchLevel === 'estimated' 
                    ? '* Цена рассчитана на основе среднерыночных данных Испании (~2500€/м²)'
                    : '* Цена рассчитана на основе анализа похожих объектов из внешних источников.'}
                </p>
              </div>

              {results.similarProperties && results.similarProperties.length > 0 ? (
                <div className="property-calculator-result__similar">
                  <h4 className="property-calculator-result__similar-title">
                    Похожие объекты ({results.similarProperties.length})
                    {results.searchParams?.city && results.searchParams.city !== formData.city && (
                      <span className="property-calculator-result__similar-subtitle">
                        {' '}(в городе {results.searchParams.city})
                      </span>
                    )}
                  </h4>
                  <div className="property-calculator-result__similar-list">
                    {results.similarProperties.slice(0, 10).map((property, index) => (
                      <div key={index} className="property-calculator-result__similar-item">
                        {property.image && (
                          <div className="property-calculator-result__similar-image">
                            <img src={property.image} alt="Property" />
                          </div>
                        )}
                        <div className="property-calculator-result__similar-content">
                          <div className="property-calculator-result__similar-price">
                            {formatPrice(property.price)}
                          </div>
                          <div className="property-calculator-result__similar-details">
                            {property.area && <span>{property.area} м²</span>}
                            {property.rooms && <span>{property.rooms} комн.</span>}
                          </div>
                          {property.address && (
                            <div className="property-calculator-result__similar-address">
                              {property.address}
                            </div>
                          )}
                          {/* Ссылку на внешний сайт больше не показываем,
                              оставляем только карточку похожего объекта */}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="property-calculator-result__no-results">
                  <p className="property-calculator-result__no-results-text">
                    Не удалось найти похожие объекты с указанными параметрами.
                    Рекомендуемая цена рассчитана на основе среднерыночных данных.
                  </p>
                  <p className="property-calculator-result__no-results-suggestion">
                    Попробуйте изменить параметры поиска или обратитесь к специалисту для точной оценки.
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

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiX, FiSearch, FiDollarSign, FiMapPin, FiHome, FiCheck } from 'react-icons/fi'
import './PropertySearchModal.css'

const PropertySearchModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate()
  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    region: '',
    rooms: '',
    propertyType: '',
    amenities: [],
    minArea: '',
    maxArea: ''
  })

  const regions = ['Испания', 'Дубай', 'Тенерифе', 'Коста-Адехе', 'Лас-Пальмас', 'Мадрид', 'Барселона']
  const propertyTypes = ['Квартира', 'Апартаменты', 'Вилла', 'Дом', 'Таунхаус']
  const amenitiesList = [
    'Бассейн', 'Парковка', 'Балкон', 'Терраса', 'Лифт', 
    'Кондиционер', 'Отопление', 'Охрана', 'Спортзал', 'Пляж рядом'
  ]

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleAmenityToggle = (amenity) => {
    setFilters(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }))
  }

  const handleSearch = () => {
    // Сохраняем фильтры в sessionStorage для использования на странице результатов
    sessionStorage.setItem('propertySearchFilters', JSON.stringify(filters))
    
    // Переходим на страницу результатов
    navigate('/search-results')
    onClose()
  }

  const handleReset = () => {
    setFilters({
      minPrice: '',
      maxPrice: '',
      region: '',
      rooms: '',
      propertyType: '',
      amenities: [],
      minArea: '',
      maxArea: ''
    })
  }

  if (!isOpen) return null

  return (
    <div className="property-search-modal-overlay" onClick={onClose}>
      <div className="property-search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="property-search-modal__header">
          <h2 className="property-search-modal__title">Подборка недвижимости</h2>
          <button 
            className="property-search-modal__close"
            onClick={onClose}
            aria-label="Закрыть"
          >
            <FiX size={24} />
          </button>
        </div>

        <div className="property-search-modal__content">
          {/* Цена */}
          <div className="property-search-modal__section">
            <label className="property-search-modal__label">
              <FiDollarSign size={20} />
              Цена (€)
            </label>
            <div className="property-search-modal__range">
              <input
                type="number"
                className="property-search-modal__input"
                placeholder="От"
                value={filters.minPrice}
                onChange={(e) => handleFilterChange('minPrice', e.target.value)}
              />
              <span className="property-search-modal__range-separator">—</span>
              <input
                type="number"
                className="property-search-modal__input"
                placeholder="До"
                value={filters.maxPrice}
                onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
              />
            </div>
          </div>

          {/* Регион */}
          <div className="property-search-modal__section">
            <label className="property-search-modal__label">
              <FiMapPin size={20} />
              Регион
            </label>
            <select
              className="property-search-modal__select"
              value={filters.region}
              onChange={(e) => handleFilterChange('region', e.target.value)}
            >
              <option value="">Выберите регион</option>
              {regions.map(region => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
          </div>

          {/* Тип недвижимости */}
          <div className="property-search-modal__section">
            <label className="property-search-modal__label">
              <FiHome size={20} />
              Тип недвижимости
            </label>
            <select
              className="property-search-modal__select"
              value={filters.propertyType}
              onChange={(e) => handleFilterChange('propertyType', e.target.value)}
            >
              <option value="">Любой тип</option>
              {propertyTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Количество комнат */}
          <div className="property-search-modal__section">
            <label className="property-search-modal__label">
              Количество комнат
            </label>
            <select
              className="property-search-modal__select"
              value={filters.rooms}
              onChange={(e) => handleFilterChange('rooms', e.target.value)}
            >
              <option value="">Любое</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5+</option>
            </select>
          </div>

          {/* Площадь */}
          <div className="property-search-modal__section">
            <label className="property-search-modal__label">
              Площадь (м²)
            </label>
            <div className="property-search-modal__range">
              <input
                type="number"
                className="property-search-modal__input"
                placeholder="От"
                value={filters.minArea}
                onChange={(e) => handleFilterChange('minArea', e.target.value)}
              />
              <span className="property-search-modal__range-separator">—</span>
              <input
                type="number"
                className="property-search-modal__input"
                placeholder="До"
                value={filters.maxArea}
                onChange={(e) => handleFilterChange('maxArea', e.target.value)}
              />
            </div>
          </div>

          {/* Удобства */}
          <div className="property-search-modal__section">
            <label className="property-search-modal__label">
              Удобства
            </label>
            <div className="property-search-modal__amenities">
              {amenitiesList.map(amenity => (
                <button
                  key={amenity}
                  type="button"
                  className={`property-search-modal__amenity ${filters.amenities.includes(amenity) ? 'active' : ''}`}
                  onClick={() => handleAmenityToggle(amenity)}
                >
                  {filters.amenities.includes(amenity) && <FiCheck size={16} />}
                  <span>{amenity}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="property-search-modal__footer">
          <button
            className="property-search-modal__button property-search-modal__button--reset"
            onClick={handleReset}
          >
            Сбросить
          </button>
          <button
            className="property-search-modal__button property-search-modal__button--search"
            onClick={handleSearch}
          >
            <FiSearch size={18} />
            Найти
          </button>
        </div>
      </div>
    </div>
  )
}

export default PropertySearchModal

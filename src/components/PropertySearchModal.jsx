import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiX, FiSearch, FiDollarSign, FiMapPin, FiHome, FiCheck } from 'react-icons/fi'
import './PropertySearchModal.css'

const REGION_KEYS = ['regionSpain', 'regionDubai', 'regionTenerife', 'regionCostaAdeje', 'regionLasPalmas', 'regionMadrid', 'regionBarcelona']
const REGION_VALUES = ['Испания', 'Дубай', 'Тенерифе', 'Коста-Адехе', 'Лас-Пальмас', 'Мадрид', 'Барселона']
const PROPERTY_TYPE_KEYS = ['propertyTypeFlat', 'propertyTypeApartment', 'propertyTypeVilla', 'propertyTypeHouse', 'propertyTypeTownhouse']
const PROPERTY_TYPE_VALUES = ['Квартира', 'Апартаменты', 'Вилла', 'Дом', 'Таунхаус']
const AMENITY_KEYS = ['amenityPool', 'amenityParking', 'amenityBalcony', 'amenityTerrace', 'amenityElevator', 'amenityAC', 'amenityHeating', 'amenitySecurity', 'amenityGym', 'amenityBeach']
const AMENITY_VALUES = ['Бассейн', 'Парковка', 'Балкон', 'Терраса', 'Лифт', 'Кондиционер', 'Отопление', 'Охрана', 'Спортзал', 'Пляж рядом']

const PropertySearchModal = ({ isOpen, onClose }) => {
  const { t } = useTranslation()
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

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleAmenityToggle = (amenityValue) => {
    setFilters(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenityValue)
        ? prev.amenities.filter(a => a !== amenityValue)
        : [...prev.amenities, amenityValue]
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
          <h2 className="property-search-modal__title">{t('propertySearchTitle')}</h2>
          <button 
            className="property-search-modal__close"
            onClick={onClose}
            aria-label={t('closeAria')}
          >
            <FiX size={24} />
          </button>
        </div>

        <div className="property-search-modal__content">
          <div className="property-search-modal__section">
            <label className="property-search-modal__label">
              <FiDollarSign size={20} />
              {t('modalPriceLabel')}
            </label>
            <div className="property-search-modal__range">
              <input
                type="number"
                className="property-search-modal__input"
                placeholder={t('modalFrom')}
                value={filters.minPrice}
                onChange={(e) => handleFilterChange('minPrice', e.target.value)}
              />
              <span className="property-search-modal__range-separator">—</span>
              <input
                type="number"
                className="property-search-modal__input"
                placeholder={t('modalTo')}
                value={filters.maxPrice}
                onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
              />
            </div>
          </div>

          <div className="property-search-modal__section">
            <label className="property-search-modal__label">
              <FiMapPin size={20} />
              {t('modalRegion')}
            </label>
            <select
              className="property-search-modal__select"
              value={filters.region}
              onChange={(e) => handleFilterChange('region', e.target.value)}
            >
              <option value="">{t('modalSelectRegion')}</option>
              {REGION_VALUES.map((region, i) => (
                <option key={region} value={region}>{t(REGION_KEYS[i])}</option>
              ))}
            </select>
          </div>

          <div className="property-search-modal__section">
            <label className="property-search-modal__label">
              <FiHome size={20} />
              {t('modalPropertyType')}
            </label>
            <select
              className="property-search-modal__select"
              value={filters.propertyType}
              onChange={(e) => handleFilterChange('propertyType', e.target.value)}
            >
              <option value="">{t('modalAnyType')}</option>
              {PROPERTY_TYPE_VALUES.map((type, i) => (
                <option key={type} value={type}>{t(PROPERTY_TYPE_KEYS[i])}</option>
              ))}
            </select>
          </div>

          <div className="property-search-modal__section">
            <label className="property-search-modal__label">
              {t('modalRooms')}
            </label>
            <select
              className="property-search-modal__select"
              value={filters.rooms}
              onChange={(e) => handleFilterChange('rooms', e.target.value)}
            >
              <option value="">{t('modalAnyRooms')}</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5+</option>
            </select>
          </div>

          <div className="property-search-modal__section">
            <label className="property-search-modal__label">
              {t('modalArea')}
            </label>
            <div className="property-search-modal__range">
              <input
                type="number"
                className="property-search-modal__input"
                placeholder={t('modalFrom')}
                value={filters.minArea}
                onChange={(e) => handleFilterChange('minArea', e.target.value)}
              />
              <span className="property-search-modal__range-separator">—</span>
              <input
                type="number"
                className="property-search-modal__input"
                placeholder={t('modalTo')}
                value={filters.maxArea}
                onChange={(e) => handleFilterChange('maxArea', e.target.value)}
              />
            </div>
          </div>

          <div className="property-search-modal__section">
            <label className="property-search-modal__label">
              {t('modalAmenities')}
            </label>
            <div className="property-search-modal__amenities">
              {AMENITY_VALUES.map((amenityValue, i) => (
                <button
                  key={amenityValue}
                  type="button"
                  className={`property-search-modal__amenity ${filters.amenities.includes(amenityValue) ? 'active' : ''}`}
                  onClick={() => handleAmenityToggle(amenityValue)}
                >
                  {filters.amenities.includes(amenityValue) && <FiCheck size={16} />}
                  <span>{t(AMENITY_KEYS[i])}</span>
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
            {t('modalReset')}
          </button>
          <button
            className="property-search-modal__button property-search-modal__button--search"
            onClick={handleSearch}
          >
            <FiSearch size={18} />
            {t('modalFind')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default PropertySearchModal

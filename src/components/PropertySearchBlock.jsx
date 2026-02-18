import { useState } from 'react'
import { FiSearch, FiHome } from 'react-icons/fi'
import PropertySearchModal from './PropertySearchModal'
import './PropertySearchBlock.css'

const PropertySearchBlock = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <section className="property-search-block">
        <div className="property-search-block__container">
          <div className="property-search-block__content">
            <div className="property-search-block__icon">
              <FiHome size={48} />
            </div>
            <div className="property-search-block__text">
              <h2 className="property-search-block__title">Подборка недвижимости</h2>
              <p className="property-search-block__description">
                Найдите идеальный вариант недвижимости по вашим критериям
              </p>
            </div>
            <button 
              className="property-search-block__button"
              onClick={() => setIsModalOpen(true)}
            >
              <FiSearch size={20} />
              <span>Найти недвижимость</span>
            </button>
          </div>
        </div>
      </section>

      {isModalOpen && (
        <PropertySearchModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  )
}

export default PropertySearchBlock

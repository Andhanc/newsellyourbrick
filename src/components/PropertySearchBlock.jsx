import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiSearch, FiHome } from 'react-icons/fi'
import './PropertySearchBlock.css'

const PropertySearchBlock = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <section id="landing-property-search" className="property-search-block">
      <div className="property-search-block__container">
        <div className="property-search-block__content">
          <div className="property-search-block__icon">
            <FiHome size={48} />
          </div>
          <div className="property-search-block__text">
            <h2 className="property-search-block__title">{t('propertySearchTitle')}</h2>
            <p className="property-search-block__description">
              {t('propertySearchDescription')}
            </p>
          </div>
          <button
            className="property-search-block__button"
            type="button"
            onClick={() => {
              sessionStorage.setItem(
                'propertySearchFilters',
                JSON.stringify({
                  country: '',
                  region: '',
                  propertyType: '',
                  purchaseTypes: [],
                  purchaseType: '',
                  currency: '',
                  minPrice: '',
                  maxPrice: '',
                })
              )
              navigate('/search-results')
            }}
          >
            <FiSearch size={20} />
            <span>{t('findProperty')}</span>
          </button>
        </div>
      </div>
    </section>
  )
}

export default PropertySearchBlock

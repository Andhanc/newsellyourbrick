import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PropertySearchFiltersPanel from './PropertySearchFiltersPanel'
import './PropertySearchBlock.css'

const PropertySearchBlock = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const handleApplyFilters = () => {
    navigate('/search-results')
  }

  return (
    <section id="landing-property-search" className="property-search-block property-search-block--open">
      <div className="property-search-block__container">
        <header className="property-search-block__heading">
          <h2 className="property-search-block__title">{t('propertySearchTitle')}</h2>
          <p className="property-search-block__description">{t('propertySearchDescription')}</p>
        </header>
        <PropertySearchFiltersPanel
          onApplyFilters={handleApplyFilters}
          findButtonLabelKey="modalFind"
        />
      </div>
    </section>
  )
}

export default PropertySearchBlock

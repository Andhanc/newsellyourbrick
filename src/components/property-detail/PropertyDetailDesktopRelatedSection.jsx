import { Link } from 'react-router-dom'
import { FiArrowRight } from 'react-icons/fi'
import PropertyListingCard from '../PropertyListingCard'
import { usePropertyRelatedListings } from '../../hooks/usePropertyRelatedListings'
import './PropertyDetailDesktopRelatedSection.css'

export default function PropertyDetailDesktopRelatedSection({ property }) {
  const { items: related, loading, geo } = usePropertyRelatedListings(property, { limit: 4 })

  if (!loading && related.length === 0) return null

  return (
    <section className="pdx-related" aria-labelledby="pdx-related-title">
      <div className="pdx-related__head">
        <div className="pdx-related__copy">
          <p className="pdx-related__eyebrow">Подборка для вас</p>
          <h2 id="pdx-related-title" className="pdx-related__title">
            Вам также могут понравиться
          </h2>
        </div>
        {geo?.typeCatalogPath ? (
          <Link to={geo.typeCatalogPath} className="pdx-related__all-link">
            Смотреть все
            <FiArrowRight size={15} aria-hidden />
          </Link>
        ) : null}
      </div>

      {loading ? (
        <div className="pdx-related__grid pdx-related__grid--loading" aria-hidden>
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="pdx-related__skeleton" />
          ))}
        </div>
      ) : (
        <div className="pdx-related__grid">
          {related.map((item) => (
            <PropertyListingCard
              key={item.id}
              property={item}
              showActions={false}
              showFavorite
              showDescription={false}
              showTimer
              pinFooter
              className="pdx-related__card"
            />
          ))}
        </div>
      )}
    </section>
  )
}

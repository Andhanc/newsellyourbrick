import { useTranslation } from 'react-i18next'
import PropertyListingCard from './PropertyListingCard'
import { usePropertyRelatedListings } from '../hooks/usePropertyRelatedListings'
import './PropertyDetailInternalLinks.css'

export default function PropertyDetailInternalLinks({ property }) {
  const { t } = useTranslation()
  const { items: related, loading } = usePropertyRelatedListings(property, { limit: 4 })

  const hasRelated = loading || related.length > 0

  if (!hasRelated) return null

  return (
    <section className="property-internal-links" aria-label={t('seoInternalLinksAria')}>
      {hasRelated ? (
        <div className="property-internal-links__block">
          <div className="property-internal-links__city-head">
            <h2 className="property-internal-links__title">{t('seoSimilarPropertiesTitle')}</h2>
          </div>
          {loading ? (
            <p className="property-internal-links__muted">{t('loading')}</p>
          ) : related.length > 0 ? (
            <div className="property-internal-links__grid">
              {related.map((item) => (
                <PropertyListingCard
                  key={item.id}
                  property={item}
                  showActions={false}
                  showFavorite={false}
                  showDescription={false}
                  showTimer={false}
                  pinFooter
                  className="property-internal-links__card"
                />
              ))}
            </div>
          ) : (
            <p className="property-internal-links__muted">{t('seoSimilarPropertiesEmpty')}</p>
          )}
        </div>
      ) : null}

    </section>
  )
}

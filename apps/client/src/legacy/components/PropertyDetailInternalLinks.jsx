import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PropertyListingCard from './PropertyListingCard'
import { usePropertyRelatedListings } from '../hooks/usePropertyRelatedListings'
import './PropertyDetailInternalLinks.css'

export default function PropertyDetailInternalLinks({ property }) {
  const { t } = useTranslation()
  const { items: related, loading, geo } = usePropertyRelatedListings(property, { limit: 4 })

  const hasRelated = loading || related.length > 0
  const hasCityBlock = Boolean(geo?.cityCatalogPath && geo?.cityLabel)

  if (!hasRelated && !hasCityBlock) return null

  return (
    <section className="property-internal-links" aria-label={t('seoInternalLinksAria')}>
      {hasCityBlock ? (
        <div className="property-internal-links__block property-internal-links__block--city">
          <div className="property-internal-links__city-head">
            <h2 className="property-internal-links__title">
              {t('seoCityListingsTitle', { city: geo.cityLabel })}
            </h2>
            <Link to={geo.cityCatalogPath} className="property-internal-links__city-cta">
              {t('seoCityListingsCta')}
            </Link>
          </div>
          {geo.typeCatalogPath && geo.typeCatalogPath !== geo.cityCatalogPath ? (
            <p className="property-internal-links__city-type">
              <Link to={geo.typeCatalogPath} className="property-internal-links__inline-link">
                {t('seoCityTypeListingsLink')}
              </Link>
            </p>
          ) : null}
        </div>
      ) : null}

      {hasRelated ? (
        <div className="property-internal-links__block">
          <div className="property-internal-links__city-head">
            <h2 className="property-internal-links__title">{t('seoSimilarPropertiesTitle')}</h2>
            {geo?.typeCatalogPath ? (
              <Link to={geo.typeCatalogPath} className="property-internal-links__city-cta">
                {t('seoRelatedViewAll', { city: geo.cityLabel || '' })}
              </Link>
            ) : null}
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

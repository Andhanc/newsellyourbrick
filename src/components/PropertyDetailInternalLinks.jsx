import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PropertyListingCard from './PropertyListingCard'
import { usePropertyRelatedListings } from '../hooks/usePropertyRelatedListings'
import { buildPropertyGeoBreadcrumbItems } from '../utils/catalogGeoUrl'
import { PURCHASE_GUIDE_LINKS } from '../utils/propertyPurchaseGuides'
import './PropertyDetailInternalLinks.css'

export default function PropertyDetailInternalLinks({ property }) {
  const { t } = useTranslation()
  const { items: related, loading, geo } = usePropertyRelatedListings(property, { limit: 4 })
  const geoItems = buildPropertyGeoBreadcrumbItems(property, t)

  const hasGeo = geoItems.length > 0
  const hasRelated = loading || related.length > 0
  const hasCityBlock = Boolean(geo?.cityCatalogPath && geo?.cityLabel)
  const hasGuides = PURCHASE_GUIDE_LINKS.length > 0

  if (!hasGeo && !hasRelated && !hasCityBlock && !hasGuides) return null

  return (
    <section className="property-internal-links" aria-label={t('seoInternalLinksAria')}>
      {hasGeo ? (
        <div className="property-internal-links__block">
          <h2 className="property-internal-links__title">{t('seoGeoLinksTitle')}</h2>
          <nav className="property-internal-links__geo" aria-label={t('catalogFilterLocation')}>
            <ol className="property-internal-links__geo-list">
              {geoItems.map((item) => (
                <li key={`${item.to}-${item.label}`} className="property-internal-links__geo-item">
                  <Link to={item.to} className="property-internal-links__geo-link">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      ) : null}

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

      {hasGuides ? (
        <div className="property-internal-links__block">
          <h2 className="property-internal-links__title">{t('seoPurchaseGuidesTitle')}</h2>
          <ul className="property-internal-links__guides">
            {PURCHASE_GUIDE_LINKS.map((guide) => (
              <li key={guide.path} className="property-internal-links__guide-item">
                <Link to={guide.path} className="property-internal-links__guide-link">
                  <span className="property-internal-links__guide-title">{t(guide.titleKey)}</span>
                  <span className="property-internal-links__guide-desc">{t(guide.descriptionKey)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}

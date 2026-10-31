import { useTranslation } from 'react-i18next'
import RelatedPropertyDeck from './RelatedPropertyDeck'
import { useVisibleRelatedListings } from '../hooks/usePropertyRelatedListings'
import './PropertyDetailInternalLinks.css'

export default function PropertyDetailInternalLinks({ property }) {
  const { t } = useTranslation()
  const { ref, items: related, loading, enabled } = useVisibleRelatedListings(property, { limit: 4 })

  const hasRelated = enabled && (loading || related.length > 0)

  return (
    <section
      ref={ref}
      className={hasRelated ? 'property-internal-links' : 'property-internal-links property-internal-links--sentinel'}
      aria-label={t('seoInternalLinksAria')}
    >
      {hasRelated ? (
        <>
          <h2 className="property-internal-links__title">{t('seoSimilarPropertiesTitle')}</h2>
          {loading ? (
            <p className="property-internal-links__muted">{t('loading')}</p>
          ) : related.length > 0 ? (
            <div className="property-internal-links__grid">
              <RelatedPropertyDeck items={related} />
            </div>
          ) : (
            <p className="property-internal-links__muted">{t('seoSimilarPropertiesEmpty')}</p>
          )}
        </>
      ) : null}
    </section>
  )
}

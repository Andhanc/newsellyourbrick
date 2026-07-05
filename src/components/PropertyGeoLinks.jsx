import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { buildPropertyGeoBreadcrumbItems } from '../utils/catalogGeoUrl'
import './PropertyGeoLinks.css'

export default function PropertyGeoLinks({ property }) {
  const { t } = useTranslation()
  const items = buildPropertyGeoBreadcrumbItems(property, t)
  if (!items.length) return null

  return (
    <nav className="property-geo-links" aria-label={t('catalogFilterLocation')}>
      <ol className="property-geo-links__list">
        {items.map((item, index) => (
          <li key={`${item.to}-${item.label}-${index}`} className="property-geo-links__item">
            {index > 0 ? <span className="property-geo-links__sep" aria-hidden>{'>'}</span> : null}
            <Link to={item.to} className="property-geo-links__link">
              {item.label}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  )
}

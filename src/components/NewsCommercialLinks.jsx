import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PURCHASE_GUIDE_LINKS } from '../utils/propertyPurchaseGuides'
import './NewsCommercialLinks.css'

export default function NewsCommercialLinks() {
  const { t } = useTranslation()

  return (
    <aside className="news-commercial-links" aria-labelledby="news-commercial-links-title">
      <h2 id="news-commercial-links-title" className="news-commercial-links__title">
        {t('newsCommercialLinksTitle')}
      </h2>
      <p className="news-commercial-links__lead">{t('newsCommercialLinksLead')}</p>
      <ul className="news-commercial-links__list">
        {PURCHASE_GUIDE_LINKS.map((item) => (
          <li key={item.path} className="news-commercial-links__item">
            <Link to={item.path} className="news-commercial-links__link">
              <span className="news-commercial-links__link-title">{t(item.titleKey)}</span>
              <span className="news-commercial-links__link-desc">{t(item.descriptionKey)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  )
}

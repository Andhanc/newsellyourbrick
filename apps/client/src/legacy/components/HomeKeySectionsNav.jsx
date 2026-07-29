import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiArrowRight } from 'react-icons/fi'
import {
  HOME_CATALOG_QUICK_LINKS,
  HOME_KEY_SECTION_LINKS,
} from '../utils/propertyPurchaseGuides'
import './HomeKeySectionsNav.css'

export default function HomeKeySectionsNav() {
  const { t } = useTranslation()

  return (
    <section className="home-key-sections" aria-labelledby="home-key-sections-title">
      <div className="home-key-sections__container">
        <h2 id="home-key-sections-title" className="home-key-sections__title">
          {t('homeKeySectionsTitle')}
        </h2>
        <p className="home-key-sections__subtitle">{t('homeKeySectionsSubtitle')}</p>

        <ul className="home-key-sections__grid">
          {HOME_KEY_SECTION_LINKS.map((item) => (
            <li key={item.path} className="home-key-sections__item">
              <Link to={item.path} className="home-key-sections__link">
                <span className="home-key-sections__link-title">{t(item.titleKey)}</span>
                <span className="home-key-sections__link-desc">{t(item.descriptionKey)}</span>
                <FiArrowRight className="home-key-sections__link-icon" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>

        <div className="home-key-sections__catalog">
          <h3 className="home-key-sections__catalog-title">{t('homeCatalogQuickTitle')}</h3>
          <ul className="home-key-sections__catalog-list">
            {HOME_CATALOG_QUICK_LINKS.map((item) => (
              <li key={item.path}>
                <Link to={item.path} className="home-key-sections__catalog-link">
                  {t(item.titleKey)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { buildCatalogCityPath } from '../utils/catalogGeoUrl'
import { PURCHASE_GUIDE_LINKS } from '../utils/propertyPurchaseGuides'
import './PropertyDetailInternalLinks.css'

const CATALOG_SALE_LINKS = [
  { sale: 'auction', titleKey: 'auction', descriptionKey: 'seoGuideAuctionDesc' },
  { sale: 'co-investment', titleKey: 'coInvestment', descriptionKey: 'seoGuideCoInvestmentDesc' },
  { sale: 'debts', titleKey: 'debtsTitle', descriptionKey: 'seoGuideDebtsDesc' },
]

export default function CatalogCityInternalLinks({ country, city, typePlural, cityLabel }) {
  const { t } = useTranslation()

  const saleLinks = CATALOG_SALE_LINKS.map((item) => ({
    ...item,
    to: buildCatalogCityPath({ country, city, typePlural, sale: item.sale }),
  })).filter((item) => item.to)

  if (saleLinks.length === 0 && PURCHASE_GUIDE_LINKS.length === 0) return null

  return (
    <section className="property-internal-links catalog-city-internal-links" aria-label={t('seoInternalLinksAria')}>
      {saleLinks.length > 0 ? (
        <div className="property-internal-links__block">
          <h2 className="property-internal-links__title">
            {t('seoCatalogSaleLinksTitle', { city: cityLabel })}
          </h2>
          <ul className="property-internal-links__guides">
            {saleLinks.map((item) => (
              <li key={item.sale} className="property-internal-links__guide">
                <Link to={item.to} className="property-internal-links__guide-link">
                  <span className="property-internal-links__guide-title">{t(item.titleKey)}</span>
                  <span className="property-internal-links__guide-desc">{t(item.descriptionKey)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {PURCHASE_GUIDE_LINKS.length > 0 ? (
        <div className="property-internal-links__block">
          <h2 className="property-internal-links__title">{t('seoPurchaseGuidesTitle')}</h2>
          <ul className="property-internal-links__guides">
            {PURCHASE_GUIDE_LINKS.map((item) => (
              <li key={item.path} className="property-internal-links__guide">
                <Link to={item.path} className="property-internal-links__guide-link">
                  <span className="property-internal-links__guide-title">{t(item.titleKey)}</span>
                  <span className="property-internal-links__guide-desc">{t(item.descriptionKey)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}

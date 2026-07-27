import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Header from './Header'
import Footer from './Footer'
import usePageSeo from '../hooks/usePageSeo'
import { CO_INVESTMENT_PATH } from '../utils/sectionRoutes'
import './NotFoundPage.css'

export default function NotFoundPage() {
  const { t } = useTranslation()

  usePageSeo({
    title: t('pageNotFoundTitle'),
    description: t('pageNotFoundDescription'),
    noindex: true,
  })

  return (
    <div className="not-found-page">
      <Header />
      <main className="not-found-page__main">
        <div className="not-found-page__card">
          <p className="not-found-page__code" aria-hidden>
            404
          </p>
          <h1 className="not-found-page__title">{t('pageNotFoundHeading')}</h1>
          <p className="not-found-page__text">{t('pageNotFoundBody')}</p>
          <nav className="not-found-page__links" aria-label={t('pageNotFoundLinksLabel')}>
            <Link to="/" className="not-found-page__link not-found-page__link--primary">
              {t('pageNotFoundBackHome')}
            </Link>
            <Link to="/auction" className="not-found-page__link">
              {t('pageNotFoundBrowseAuction')}
            </Link>
            <Link to={CO_INVESTMENT_PATH} className="not-found-page__link">
              {t('pageNotFoundBrowseCoInvestment')}
            </Link>
            <Link to="/debts" className="not-found-page__link">
              {t('pageNotFoundBrowseDebts')}
            </Link>
          </nav>
        </div>
      </main>
      <Footer />
    </div>
  )
}

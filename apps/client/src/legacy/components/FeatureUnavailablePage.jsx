import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Header from './Header'
import usePageSeo from '../hooks/usePageSeo'
import { publicAsset } from '../utils/publicAsset'
import './FeatureUnavailablePage.css'

const PAGE_BG = publicAsset('images/mobile-discover/welcome-summer.png')

const FALLBACK = {
  title: 'Временно в разработке | Sellyourbrick',
  description: 'Этот раздел временно в разработке. Скоро откроем — загляните на главную.',
  eyebrow: 'SellYourBrick',
  heading: 'Временно в разработке',
  body: 'Этот раздел ещё готовится к запуску. Пока можно вернуться на главную и пользоваться открытыми разделами.',
  linksLabel: 'Куда перейти',
  backHome: 'На главную',
}

export default function FeatureUnavailablePage() {
  const { t } = useTranslation()

  useEffect(() => {
    document.documentElement.classList.add('feature-unavailable-active')
    return () => {
      document.documentElement.classList.remove('feature-unavailable-active')
    }
  }, [])

  usePageSeo({
    title: t('featureUnavailableTitle', { defaultValue: FALLBACK.title }),
    description: t('featureUnavailableDescription', { defaultValue: FALLBACK.description }),
    noindex: true,
  })

  return (
    <div className="feature-unavailable-page">
      <div className="feature-unavailable-page__scene" aria-hidden>
        <img className="feature-unavailable-page__bg" src={PAGE_BG} alt="" />
        <div className="feature-unavailable-page__veil" />
      </div>

      <Header />
      <main className="feature-unavailable-page__main">
        <div className="feature-unavailable-page__card">
          <p className="feature-unavailable-page__eyebrow">
            {t('featureUnavailableEyebrow', { defaultValue: FALLBACK.eyebrow })}
          </p>
          <h1 className="feature-unavailable-page__title">
            {t('featureUnavailableHeading', { defaultValue: FALLBACK.heading })}
          </h1>
          <p className="feature-unavailable-page__text">
            {t('featureUnavailableBody', { defaultValue: FALLBACK.body })}
          </p>
          <nav
            className="feature-unavailable-page__links"
            aria-label={t('featureUnavailableLinksLabel', { defaultValue: FALLBACK.linksLabel })}
          >
            <Link to="/" className="feature-unavailable-page__link feature-unavailable-page__link--primary">
              {t('featureUnavailableBackHome', { defaultValue: FALLBACK.backHome })}
            </Link>
          </nav>
        </div>
      </main>
    </div>
  )
}

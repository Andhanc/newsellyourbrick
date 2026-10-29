import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Header from './Header'
import usePageSeo from '../hooks/usePageSeo'
import { publicAsset } from '../utils/publicAsset'
import './FeatureUnavailablePage.css'

const PAGE_BG = publicAsset('images/mobile-discover/welcome-summer.png')

const SECTION_FALLBACK = {
  title: 'Temporarily in development | Sellyourbrick',
  description: 'This section is temporarily in development. Check back soon — or return to the home page.',
  eyebrow: 'SellYourBrick',
  heading: 'Temporarily in development',
  body: 'This section is still being prepared for launch. For now you can return home and use the open sections.',
  linksLabel: 'Where to go',
  backHome: 'Back to home',
}

const DESKTOP_FALLBACK = {
  title: 'Mobile version | Sellyourbrick',
  description: 'The desktop version is temporarily in development. Open the site on your phone.',
  eyebrow: 'SellYourBrick',
  heading: 'Phone only for now',
  body: 'The desktop version is still in development. Open SellYourBrick on your smartphone — the mobile version is already available.',
}

export default function FeatureUnavailablePage({ variant = 'section' }) {
  const { t } = useTranslation()
  const isDesktop = variant === 'desktop'
  const fallback = isDesktop ? DESKTOP_FALLBACK : SECTION_FALLBACK

  useEffect(() => {
    document.documentElement.classList.add('feature-unavailable-active')
    return () => {
      document.documentElement.classList.remove('feature-unavailable-active')
    }
  }, [])

  usePageSeo({
    title: t(isDesktop ? 'desktopUnavailableTitle' : 'featureUnavailableTitle', {
      defaultValue: fallback.title,
    }),
    description: t(
      isDesktop ? 'desktopUnavailableDescription' : 'featureUnavailableDescription',
      { defaultValue: fallback.description },
    ),
    noindex: true,
  })

  return (
    <div
      className={`feature-unavailable-page${isDesktop ? ' feature-unavailable-page--desktop' : ''}`}
    >
      <div className="feature-unavailable-page__scene" aria-hidden>
        <img className="feature-unavailable-page__bg" src={PAGE_BG} alt="" />
        <div className="feature-unavailable-page__veil" />
      </div>

      {isDesktop ? null : <Header />}
      <main className="feature-unavailable-page__main">
        <div className="feature-unavailable-page__card">
          <p className="feature-unavailable-page__eyebrow">
            {t(isDesktop ? 'desktopUnavailableEyebrow' : 'featureUnavailableEyebrow', {
              defaultValue: fallback.eyebrow,
            })}
          </p>
          <h1 className="feature-unavailable-page__title">
            {t(isDesktop ? 'desktopUnavailableHeading' : 'featureUnavailableHeading', {
              defaultValue: fallback.heading,
            })}
          </h1>
          <p className="feature-unavailable-page__text">
            {t(isDesktop ? 'desktopUnavailableBody' : 'featureUnavailableBody', {
              defaultValue: fallback.body,
            })}
          </p>
          {isDesktop ? null : (
            <nav
              className="feature-unavailable-page__links"
              aria-label={t('featureUnavailableLinksLabel', {
                defaultValue: SECTION_FALLBACK.linksLabel,
              })}
            >
              <Link
                to="/"
                className="feature-unavailable-page__link feature-unavailable-page__link--primary"
              >
                {t('featureUnavailableBackHome', { defaultValue: SECTION_FALLBACK.backHome })}
              </Link>
            </nav>
          )}
        </div>
      </main>
    </div>
  )
}

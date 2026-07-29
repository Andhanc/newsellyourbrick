import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiArrowRight } from 'react-icons/fi'
import SybLandingSearchBar from '../components/SybLandingSearchBar'
import { ScrollReveal, ScrollRevealItem, ScrollRevealStagger } from '../components/ScrollReveal'

export default function MainPageMidSection() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()

  const salesStrategies = useMemo(
    () => [
      {
        id: 'auction',
        label: t('auctionSectionTitle'),
        title: t('auctionSectionTitle'),
        text: t('auctionSectionSubtitle'),
        image: '/images/sellyourbrick/about/about-category-auction.jpg',
        to: '/auction?filter=auction',
        metric: '01',
      },
      {
        id: 'buy-now',
        label: t('buyNowSectionTitle'),
        title: t('buyNowSectionTitle'),
        text: t('buyNowSectionSubtitle'),
        image: '/images/sellyourbrick/about/about-category-buynow.jpg',
        to: '/auction?filter=buy_now',
        metric: '02',
      },
      {
        id: 'shares',
        label: t('fractionalSaleTitle'),
        title: t('fractionalSaleTitle'),
        text: t('fractionalSectionSubtitle'),
        image: '/images/sellyourbrick/about/about-category-shares.jpg',
        to: '/shares',
        metric: '03',
      },
      {
        id: 'debts',
        label: t('debtsTitle'),
        title: t('debtsTitle'),
        text: t('debtsSectionSubtitle'),
        image: '/images/sellyourbrick/about/about-category-debts.jpg',
        to: '/debts',
        metric: '04',
      },
    ],
    [t, i18n.language],
  )

  return (
    <>
      <ScrollReveal className="hero-search-bridge" y={28}>
        <SybLandingSearchBar />
      </ScrollReveal>

      <section id="landing-models" className="landing-models">
        <div className="landing-models__container">
          <ScrollReveal y={32}>
            <p className="landing-models__eyebrow">{t('sybLandingDirectionsTitle')}</p>
            <h2 className="landing-models__title">
              <span className="landing-models__title-line">{t('landingModelsTitleMark')}</span>
              <span className="landing-models__title-line">{t('landingModelsTitleRest')}</span>
            </h2>
            <p className="landing-models__subtitle">{t('landingModelsSubtitle')}</p>
          </ScrollReveal>
          <ScrollRevealStagger
            className="landing-strategies"
            aria-label={t('landingFoldersCarouselAria')}
          >
            {salesStrategies.map((strategy) => (
              <ScrollRevealItem key={strategy.id}>
                <button
                  type="button"
                  className={`landing-strategy landing-strategy--${strategy.id}`}
                  onClick={() => navigate(strategy.to)}
                >
                  <span className="landing-strategy__media">
                    <img src={strategy.image} alt="" loading="lazy" decoding="async" />
                    <span className="landing-strategy__meta">
                      <span className="landing-strategy__number">{strategy.metric}</span>
                      <span className="landing-strategy__label">{strategy.label}</span>
                    </span>
                  </span>
                  <span className="landing-strategy__body">
                    <span className="landing-strategy__title">{strategy.title}</span>
                    <span className="landing-strategy__text">{strategy.text}</span>
                    <span className="landing-strategy__arrow" aria-hidden="true">
                      <FiArrowRight size={18} strokeWidth={2.25} />
                    </span>
                  </span>
                </button>
              </ScrollRevealItem>
            ))}
          </ScrollRevealStagger>
        </div>
      </section>
    </>
  )
}

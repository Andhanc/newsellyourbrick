import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import heroFeatureCoinMoneta from '../assets/moneta.jpg'
import './Hero.css'

const Hero = () => {
  const { t } = useTranslation()
  const [expandedIndex, setExpandedIndex] = useState(null)

  const FEATURES = [
    {
      titleKey: 'heroFeature1Title',
      textKey: 'heroFeature1Text',
      img: 'https://static.cdn-cian.ru/frontend/valuation-my-home-page-frontend/icon_1.17dab2f77576179c.png',
      altKey: 'heroFeature1Alt'
    },
    {
      titleKey: 'heroFeature2Title',
      textKey: 'heroFeature2Text',
      img: heroFeatureCoinMoneta,
      altKey: 'heroFeature2Alt'
    },
    {
      titleKey: 'heroFeature3Title',
      textKey: 'heroFeature3Text',
      img: 'https://static.cdn-cian.ru/frontend/valuation-my-home-page-frontend/icon_3.be34334d56e4527b.svg',
      altKey: 'heroFeature3Alt'
    }
  ]

  const handleToggle = (index) => {
    setExpandedIndex((prev) => (prev === index ? null : index))
  }

  return (
    <section className="hero">
      <div className="hero-container">
        <div className="hero-features">
          {FEATURES.map((feature, index) => (
            <div
              key={feature.titleKey}
              className={`hero-feature-card ${expandedIndex === index ? 'hero-feature-card--expanded' : ''}`}
              onClick={() => handleToggle(index)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleToggle(index)
                }
              }}
            >
              <div className="hero-feature-image">
                <img
                  src={feature.img}
                  alt={t(feature.altKey)}
                  className={`hero-feature-image__img${index === 1 ? ' hero-feature-image__img--euro-coin' : ''}`}
                />
              </div>
              <div className="hero-feature-content">
                <h3>{t(feature.titleKey)}</h3>
                <p>{t(feature.textKey)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Hero


import { useRef } from 'react'
import { FiArrowLeft, FiArrowRight } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import './HomeSaleFormats.css'

function HomeSaleFormats({ modes }) {
  const { t } = useTranslation()
  const railRef = useRef(null)

  const scrollRail = (direction) => {
    const rail = railRef.current
    const card = rail?.querySelector('.sale-formats__card')
    if (!rail || !card) return

    const gap = Number.parseFloat(window.getComputedStyle(rail).columnGap) || 0
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    rail.scrollBy({
      left: direction * (card.getBoundingClientRect().width + gap),
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    })
  }

  return (
    <section className="sale-formats" aria-labelledby="sale-formats-title">
      <div className="sale-formats__header">
        <div className="sale-formats__heading">
          <h2 id="sale-formats-title">{t('saleFormats_title')}</h2>
          <p>{t('saleFormats_subtitle')}</p>
          <p className="sale-formats__trust">
            {t('saleFormats_trustVerified')} <span aria-hidden="true">·</span> {t('saleFormats_trustTerms')}{' '}
            <span aria-hidden="true">·</span> {t('saleFormats_trustSupport')}
          </p>
        </div>

        <div className="sale-formats__controls" aria-label={t('saleFormats_scrollAria')}>
          <button
            type="button"
            aria-label={t('saleFormats_prevAria')}
            onClick={() => scrollRail(-1)}
          >
            <FiArrowLeft aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={t('saleFormats_nextAria')}
            onClick={() => scrollRail(1)}
          >
            <FiArrowRight aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="sale-formats__grid" ref={railRef}>
        {modes.map((mode) => (
          <Link
            className="sale-formats__card"
            id={mode.anchorId}
            key={mode.id}
            to={mode.to}
          >
            <div className="sale-formats__content">
              <div className="sale-formats__tags">
                <span className="sale-formats__tag">{mode.number}</span>
                <span className="sale-formats__tag">{mode.eyebrow}</span>
              </div>
              <h3 className="sale-formats__title">{mode.eyebrow}</h3>
              <p className="sale-formats__benefit">{mode.benefit}</p>
              <p className="sale-formats__proof">{mode.proof}</p>
            </div>
            <div className="sale-formats__media">
              <img
                className="sale-formats__image"
                src={mode.image}
                alt={mode.imageAlt}
                loading="lazy"
                decoding="async"
              />
              <span className="sale-formats__cta" aria-label={t('saleFormats_ctaAria')}>
                {t('saleFormats_cta')} <FiArrowRight aria-hidden="true" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

export default HomeSaleFormats

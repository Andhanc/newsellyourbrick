import { useRef } from 'react'
import { FiArrowLeft, FiArrowRight } from 'react-icons/fi'
import { Link } from 'react-router-dom'

import './HomeSaleFormats.css'

function HomeSaleFormats({ modes }) {
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
          <h2 id="sale-formats-title">4 способа купить недвижимость на своих условиях</h2>
          <p>
            Торгуйтесь за лучшую цену, забирайте объект сразу или начните с доли —
            выберите формат под вашу цель
          </p>
          <p className="sale-formats__trust">
            Проверенные объекты <span aria-hidden="true">·</span> прозрачные условия{' '}
            <span aria-hidden="true">·</span> сопровождение сделки
          </p>
        </div>

        <div className="sale-formats__controls" aria-label="Прокрутка форматов">
          <button
            type="button"
            aria-label="Предыдущие форматы"
            onClick={() => scrollRail(-1)}
          >
            <FiArrowLeft aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Следующие форматы"
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
              <span className="sale-formats__cta" aria-label="Смотреть объекты">
                Смотреть <FiArrowRight aria-hidden="true" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

export default HomeSaleFormats

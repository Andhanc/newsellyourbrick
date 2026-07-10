import { Link } from 'react-router-dom'

import './HomeSaleFormats.css'

function HomeSaleFormats({ modes }) {
  return (
    <section className="sale-formats" aria-labelledby="sale-formats-title">
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

      <div className="sale-formats__grid">
        {modes.map((mode) => (
          <Link className="sale-formats__card" key={mode.id} to={mode.to}>
            <img
              className="sale-formats__image"
              src={mode.image}
              alt={`${mode.eyebrow}: ${mode.benefit}`}
              loading="lazy"
            />
            <span className="sale-formats__shade" aria-hidden="true" />
            <div className="sale-formats__content">
              <span className="sale-formats__eyebrow">
                <span>{mode.number}</span> {mode.eyebrow}
              </span>
              <h3 className="sale-formats__benefit">{mode.benefit}</h3>
              <span className="sale-formats__proof">{mode.proof}</span>
              <span className="sale-formats__cta">
                Смотреть объекты <span aria-hidden="true">→</span>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

export default HomeSaleFormats

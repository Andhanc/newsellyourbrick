'use client';

import { Link } from 'react-router-dom';
import './StartWithUs.css';

export default function StartWithUs() {
  return (
    <Link to="/" className="cta-start" aria-label="Перейти на главную — начать с нами">
      <div className="cta-start__inner">
        <div className="cta-start__card">
          <h2 className="cta-start__title">Начни с нами</h2>
          <p className="cta-start__text">
            Перейди на главную и выбери объект, участвуй в аукционах или размести своё объявление.
          </p>
          <span className="cta-start__btn">
            На главную
            <svg className="cta-start__btn-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}

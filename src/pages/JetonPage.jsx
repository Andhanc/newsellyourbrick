import { useEffect, useState, useRef } from 'react'
import './JetonPage.css'

const JetonPage = () => {
  const [activeStep, setActiveStep] = useState(0)
  const [isVisible, setIsVisible] = useState({})
  const observerRef = useRef(null)

  useEffect(() => {
    // Intersection Observer для анимаций при скролле
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible((prev) => ({
              ...prev,
              [entry.target.id]: true,
            }))
            entry.target.classList.add('jeton-section--visible')
          }
        })
      },
      { threshold: 0.1 }
    )

    const elements = document.querySelectorAll('.jeton-section')
    elements.forEach((el) => {
      if (observerRef.current) {
        observerRef.current.observe(el)
      }
    })

    return () => {
      if (observerRef.current) {
        elements.forEach((el) => {
          if (observerRef.current) {
            observerRef.current.unobserve(el)
          }
        })
      }
    }
  }, [])

  useEffect(() => {
    // Автоматическая смена шагов процесса
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 5)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const testimonials = [
    {
      name: 'Vamsi K.',
      text: 'Very happy with the app. Does what it says, simple payments and transactions. Quick account verification and withdrawals. 24/7 support available.',
      rating: 'Recommended',
    },
    {
      name: 'Leonie A.',
      text: 'Awesome app very user friendly. Would highly recommend Jeton to my friends.',
      rating: 'Awesome app',
    },
    {
      name: 'Karl R.',
      text: "I've been a Jeton user for a few years! The support was always great and I'm always able to make my payments to the websites I want with no problem.",
      rating: 'The best payment solution',
    },
    {
      name: 'Dennis P.',
      text: 'Great app for fast and easy transfers. I have been using Jeton for a while now without any problem. I have recently started using their Jeton Card for my everyday purchases too.',
      rating: 'Easy and Fast',
    },
  ]

  const steps = [
    { number: '01', title: 'Account' },
    { number: '02', title: 'Add' },
    { number: '03', title: 'Method' },
    { number: '04', title: 'Review' },
    { number: '05', title: 'Done' },
  ]

  return (
    <div className="jeton-page">
      {/* Hero Section */}
      <section className="jeton-hero">
        <div className="jeton-hero__content">
          <h1 className="jeton-hero__title">
            One app for all needs
          </h1>
          <p className="jeton-hero__subtitle">
            Single account for all your payments.
          </p>
          <div className="jeton-hero__scroll-indicator">
            <span>Scroll</span>
            <div className="jeton-hero__scroll-arrow"></div>
          </div>
        </div>
      </section>

      {/* Unify Finances Section */}
      <section className="jeton-section jeton-section--visible" id="unify">
        <div className="jeton-container">
          <h2 className="jeton-section__title">Unify your finances</h2>
          <div className="jeton-features">
            <div className="jeton-feature">
              <div className="jeton-feature__icon">💳</div>
              <h3 className="jeton-feature__title">Add</h3>
              <p className="jeton-feature__description">Deposit money easily</p>
            </div>
            <div className="jeton-feature">
              <div className="jeton-feature__icon">📤</div>
              <h3 className="jeton-feature__title">Send</h3>
              <p className="jeton-feature__description">Transfer funds instantly</p>
            </div>
            <div className="jeton-feature">
              <div className="jeton-feature__icon">💱</div>
              <h3 className="jeton-feature__title">Exchange</h3>
              <p className="jeton-feature__description">Convert currencies</p>
            </div>
          </div>
          <div className="jeton-tagline">
            <span className="jeton-tagline__text">All currencies</span>
            <span className="jeton-tagline__text">One App</span>
          </div>
        </div>
      </section>

      {/* Move Money Section */}
      <section className="jeton-section jeton-section--gradient" id="move-money">
        <div className="jeton-container">
          <h2 className="jeton-section__title">Move your money across Europe</h2>
          <p className="jeton-section__subtitle">
            Send money anywhere in the EU, effortlessly.
          </p>
          <div className="jeton-benefits">
            <div className="jeton-benefit">
              <h3 className="jeton-benefit__title">Add or send in a few taps</h3>
              <p className="jeton-benefit__description">
                Easily add or send money from your account.
              </p>
            </div>
            <div className="jeton-benefit">
              <h3 className="jeton-benefit__title">50+ payment methods across Europe</h3>
              <p className="jeton-benefit__description">
                Jeton is seamlessly connected with more than 25 countries, and 50 payment methods.
              </p>
            </div>
            <div className="jeton-benefit">
              <h3 className="jeton-benefit__title">Fast and safe transactions</h3>
              <p className="jeton-benefit__description">
                Fast and safe transactions at your fingertips.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="jeton-section jeton-section--dark" id="process">
        <div className="jeton-container">
          <div className="jeton-process-header">
            <span className="jeton-process-tag">Simple</span>
            <span className="jeton-process-tag">fast & safe</span>
          </div>
          <h2 className="jeton-section__title jeton-section__title--large">
            Simple, fast & safe
          </h2>
          <div className="jeton-process">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`jeton-process-step ${activeStep === index ? 'jeton-process-step--active' : ''}`}
                onClick={() => setActiveStep(index)}
              >
                <div className="jeton-process-step__number">{step.number}</div>
                <div className="jeton-process-step__title">{step.title}</div>
                {activeStep === index && (
                  <div className="jeton-process-step__indicator"></div>
                )}
              </div>
            ))}
          </div>
          <button className="jeton-button jeton-button--secondary">
            Restart
          </button>
        </div>
      </section>

      {/* CTA Section */}
      <section className="jeton-section jeton-section--cta" id="cta">
        <div className="jeton-container">
          <h2 className="jeton-section__title jeton-section__title--cta">
            All your finances, in one app.
          </h2>
          <p className="jeton-section__subtitle jeton-section__subtitle--cta">
            Join 1M+ happy users today.
          </p>
          <button className="jeton-button jeton-button--primary">
            Get Started
          </button>
        </div>
      </section>

      {/* Jeton Card Section */}
      <section className="jeton-section" id="card">
        <div className="jeton-container">
          <div className="jeton-card-section">
            <div className="jeton-card-content">
              <h2 className="jeton-section__title">
                Contactless payments? Sure. Spending limits? Check. Card freezing? Also check.
              </h2>
              <h3 className="jeton-card-subtitle">
                Jeton Card: Your Go-To for Every Purchase
              </h3>
              <button className="jeton-button jeton-button--outline">
                Learn more
              </button>
            </div>
            <div className="jeton-card-visual">
              <div className="jeton-card-mockup"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Exchange Section */}
      <section className="jeton-section jeton-section--exchange" id="exchange">
        <div className="jeton-container">
          <h2 className="jeton-section__title">Convert fiat cash easily.</h2>
          <div className="jeton-exchange">
            <div className="jeton-exchange-currency">
              <span className="jeton-exchange-flag">🇪🇺</span>
              <span className="jeton-exchange-code">EUR</span>
            </div>
            <div className="jeton-exchange-arrow">→</div>
            <div className="jeton-exchange-currency">
              <span className="jeton-exchange-flag">🇬🇧</span>
              <span className="jeton-exchange-code">GBP</span>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="jeton-section jeton-section--testimonials" id="testimonials">
        <div className="jeton-container">
          <h2 className="jeton-section__title">Hear it from our clients</h2>
          <div className="jeton-testimonials">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className={`jeton-testimonial ${isVisible[`testimonial-${index}`] ? 'jeton-testimonial--visible' : ''}`}
                id={`testimonial-${index}`}
              >
                <div className="jeton-testimonial__rating">{testimonial.rating}</div>
                <p className="jeton-testimonial__text">{testimonial.text}</p>
                <div className="jeton-testimonial__author">{testimonial.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="jeton-section jeton-section--final" id="final">
        <div className="jeton-container">
          <h2 className="jeton-section__title jeton-section__title--final">
            1 million users, plus you.
          </h2>
          <p className="jeton-section__subtitle jeton-section__subtitle--final">
            It only takes few seconds to get started.
          </p>
          <div className="jeton-final-actions">
            <button className="jeton-button jeton-button--primary jeton-button--large">
              Get Started
            </button>
            <button className="jeton-button jeton-button--text">
              Sign up
            </button>
            <button className="jeton-button jeton-button--text">
              Login
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default JetonPage


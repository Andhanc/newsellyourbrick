import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import './LandingFaqAccordion.css'

const FAQ_ITEMS = [
  { questionKey: 'faq1Question', answerKey: 'faq1Answer' },
  { questionKey: 'faq2Question', answerKey: 'faq2Answer' },
  { questionKey: 'faq3Question', answerKey: 'faq3Answer' },
  { questionKey: 'faq4Question', answerKey: 'faq4Answer' },
]

const ID_BASE = 'landing-faq-acc'

export default function LandingFaqAccordion() {
  const { t } = useTranslation()
  const [openIndex, setOpenIndex] = useState(null)

  const toggle = useCallback((index) => {
    setOpenIndex((prev) => (prev === index ? null : index))
  }, [])

  return (
    <section className="landing-faq" aria-labelledby={`${ID_BASE}-heading`}>
      <div className="landing-faq__inner">
        <h2 id={`${ID_BASE}-heading`} className="landing-faq__title">
          {t('faqAccordionTitle')}
        </h2>
        <div className="landing-faq__rail">
          <ul className="landing-faq__list">
            {FAQ_ITEMS.map((item, index) => {
              const isOpen = openIndex === index
              const triggerId = `${ID_BASE}-q-${index}`
              const panelId = `${ID_BASE}-a-${index}`
              return (
                <li key={item.questionKey} className="landing-faq__item">
                  <h3 className="landing-faq__item-heading">
                    <button
                      type="button"
                      id={triggerId}
                      className={`landing-faq__trigger${isOpen ? ' is-open' : ''}`}
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => toggle(index)}
                    >
                      <span className="landing-faq__question">{t(item.questionKey)}</span>
                      <span className="landing-faq__icon" aria-hidden>
                        {isOpen ? (
                          <svg
                            className="landing-faq__icon-svg"
                            width="18"
                            height="18"
                            viewBox="0 0 18 18"
                            fill="none"
                          >
                            <path
                              d="M3 9h12"
                              stroke="currentColor"
                              strokeWidth="1.15"
                              strokeLinecap="round"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="landing-faq__icon-svg"
                            width="18"
                            height="18"
                            viewBox="0 0 18 18"
                            fill="none"
                          >
                            <path
                              d="M9 3v12M3 9h12"
                              stroke="currentColor"
                              strokeWidth="1.15"
                              strokeLinecap="round"
                            />
                          </svg>
                        )}
                      </span>
                    </button>
                  </h3>
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={triggerId}
                    className="landing-faq__panel"
                    hidden={!isOpen}
                  >
                    <div className="landing-faq__answer">
                      <p>{t(item.answerKey)}</p>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </section>
  )
}

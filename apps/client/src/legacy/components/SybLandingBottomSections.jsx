import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FiMail, FiMinus, FiPlus } from 'react-icons/fi'
import { ScrollReveal } from './ScrollReveal'
import './SybLandingBottomSections.css'

const NEWSLETTER_FLOAT_CARDS = [
  {
    key: 'card-1',
    image: '/images/external/photo-1600585154340-be6161a56a0c-08c1b1d59d.jpg',
    titleKey: 'sybLandingNews1Title',
    excerptKey: 'sybLandingNews1Excerpt',
    className: 'syb-newsletter__float--1',
  },
  {
    key: 'card-2',
    image: '/images/external/photo-1486406146926-c627a92ad1ab-f0c377ec01.jpg',
    titleKey: 'sybLandingNews2Title',
    excerptKey: 'sybLandingNews2Excerpt',
    className: 'syb-newsletter__float--2',
  },
  {
    key: 'card-3',
    image: '/images/external/photo-1507525428034-b723cf961d3e-ae413f8ef9.jpg',
    titleKey: 'sybLandingNews3Title',
    excerptKey: 'sybLandingNews3Excerpt',
    className: 'syb-newsletter__float--3',
  },
]

const FAQ_ITEMS = [
  { questionKey: 'sybLandingFaq1Question', answerKey: 'sybLandingFaq1Answer' },
  { questionKey: 'sybLandingFaq2Question', answerKey: 'sybLandingFaq2Answer' },
  { questionKey: 'sybLandingFaq3Question', answerKey: 'sybLandingFaq3Answer' },
  { questionKey: 'sybLandingFaq4Question', answerKey: 'sybLandingFaq4Answer' },
]

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim())
}

function EmailField({ id, value, onChange, placeholder, disabled }) {
  return (
    <div className="syb-bottom-field">
      <FiMail className="syb-bottom-field__icon" size={18} aria-hidden />
      <input
        id={id}
        type="email"
        name="email"
        className="syb-bottom-field__input"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoComplete="email"
        required
        disabled={disabled}
      />
    </div>
  )
}

export default function SybLandingBottomSections() {
  const { t } = useTranslation()
  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [newsletterSent, setNewsletterSent] = useState(false)
  const [contactEmail, setContactEmail] = useState('')
  const [contactSent, setContactSent] = useState(false)
  const [openFaqIndex, setOpenFaqIndex] = useState(null)

  const handleNewsletterSubmit = useCallback(
    (event) => {
      event.preventDefault()
      if (!isValidEmail(newsletterEmail)) return
      setNewsletterSent(true)
    },
    [newsletterEmail],
  )

  const handleContactSubmit = useCallback(
    (event) => {
      event.preventDefault()
      if (!isValidEmail(contactEmail)) return
      setContactSent(true)
    },
    [contactEmail],
  )

  const toggleFaq = useCallback((index) => {
    setOpenFaqIndex((prev) => (prev === index ? null : index))
  }, [])

  return (
    <div className="syb-bottom">
      <ScrollReveal as="section" className="syb-newsletter" aria-labelledby="syb-newsletter-title" y={36}>
        <div className="syb-newsletter__card">
          <div className="syb-newsletter__copy">
            <h2 id="syb-newsletter-title" className="syb-newsletter__title">
              {t('sybLandingNewsletterTitle')}
            </h2>
            <form className="syb-newsletter__form" onSubmit={handleNewsletterSubmit}>
              <EmailField
                id="syb-newsletter-email"
                value={newsletterEmail}
                onChange={(event) => setNewsletterEmail(event.target.value)}
                placeholder={t('sybLandingNewsletterPlaceholder')}
                disabled={newsletterSent}
              />
              <button
                type="submit"
                className="syb-bottom-btn"
                disabled={newsletterSent || !isValidEmail(newsletterEmail)}
              >
                {newsletterSent ? t('sybLandingNewsletterSuccess') : t('sybLandingNewsletterCta')}
              </button>
            </form>
          </div>

          <div className="syb-newsletter__visual" aria-hidden>
            {NEWSLETTER_FLOAT_CARDS.map((card) => (
              <article key={card.key} className={`syb-newsletter__float ${card.className}`}>
                <div className="syb-newsletter__float-media">
                  <img src={card.image} alt="" loading="lazy" decoding="async" />
                </div>
                <div className="syb-newsletter__float-body">
                  <p className="syb-newsletter__float-title">{t(card.titleKey)}</p>
                  <p className="syb-newsletter__float-excerpt">{t(card.excerptKey)}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal as="section" className="syb-questions" aria-labelledby="syb-questions-title" y={36}>
        <div className="syb-questions__inner">
          <ScrollReveal y={24}>
            <div className="syb-questions__contact">
            <h2 id="syb-questions-title" className="syb-questions__title">
              {t('sybLandingQuestionsTitle')}
            </h2>
            <p className="syb-questions__subtitle">{t('sybLandingQuestionsSubtitle')}</p>
            <form className="syb-questions__form" onSubmit={handleContactSubmit}>
              <EmailField
                id="syb-questions-email"
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
                placeholder={t('sybLandingQuestionsPlaceholder')}
                disabled={contactSent}
              />
              <button
                type="submit"
                className="syb-bottom-btn"
                disabled={contactSent || !isValidEmail(contactEmail)}
              >
                {contactSent ? t('sybLandingQuestionsSuccess') : t('sybLandingQuestionsCta')}
              </button>
            </form>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.06} y={28}>
            <div className="syb-questions__faq">
              <ul className="syb-questions__faq-list">
                {FAQ_ITEMS.map((item, index) => {
                  const isOpen = openFaqIndex === index
                  const triggerId = `syb-faq-q-${index}`
                  const panelId = `syb-faq-a-${index}`

                  return (
                    <li key={item.questionKey} className="syb-questions__faq-item">
                      <h3 className="syb-questions__faq-heading">
                        <button
                          type="button"
                          id={triggerId}
                          className={`syb-questions__faq-trigger${isOpen ? ' is-open' : ''}`}
                          aria-expanded={isOpen}
                          aria-controls={panelId}
                          onClick={() => toggleFaq(index)}
                        >
                          <span className="syb-questions__faq-question">{t(item.questionKey)}</span>
                          <span className="syb-questions__faq-icon" aria-hidden>
                            {isOpen ? <FiMinus size={18} /> : <FiPlus size={18} />}
                          </span>
                        </button>
                      </h3>
                      <div
                        id={panelId}
                        role="region"
                        aria-labelledby={triggerId}
                        className="syb-questions__faq-panel"
                        hidden={!isOpen}
                      >
                        <p className="syb-questions__faq-answer">{t(item.answerKey)}</p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          </ScrollReveal>
        </div>
      </ScrollReveal>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FiMail, FiMinus, FiPlus } from 'react-icons/fi'
import '../pages/InvestorHomePage.css'

const FAQ_KEYS = [
  ['investQuestions_faq1Q', 'investQuestions_faq1A'],
  ['investQuestions_faq2Q', 'investQuestions_faq2A'],
  ['investQuestions_faq3Q', 'investQuestions_faq3A'],
  ['investQuestions_faq4Q', 'investQuestions_faq4A'],
]

export default function InvestorQuestionsSection({ id = 'contact', idPrefix = 'invest' }) {
  const { t } = useTranslation()
  const [openFaq, setOpenFaq] = useState(0)
  const [contactEmail, setContactEmail] = useState('')
  const [contactMessage, setContactMessage] = useState('')
  const [formSent, setFormSent] = useState(false)

  const faqs = useMemo(
    () => FAQ_KEYS.map(([q, a]) => [t(q), t(a)]),
    [t],
  )

  const handleSubmit = (event) => {
    event.preventDefault()
    setFormSent(true)
    window.setTimeout(() => {
      setFormSent(false)
      setContactEmail('')
      setContactMessage('')
    }, 2400)
  }

  return (
    <section className="invest-questions" id={id} aria-labelledby={`${idPrefix}-questions-title`}>
      <div className="invest-shell invest-questions__inner">
        <div className="invest-questions__contact">
          <h2 id={`${idPrefix}-questions-title`} className="invest-questions__title">
            {t('investQuestions_titleBefore')}{' '}
            <span className="invest-questions__title-accent">{t('investQuestions_titleAccent')}</span>
          </h2>
          <p className="invest-questions__subtitle">
            {t('investQuestions_subtitle')}
          </p>
          <form className="invest-questions__form" onSubmit={handleSubmit}>
            <div className="invest-questions__fields">
              <div className="invest-questions__field">
                <FiMail className="invest-questions__field-icon" size={18} aria-hidden />
                <input
                  id={`${idPrefix}-contact-email`}
                  type="email"
                  className="invest-questions__input"
                  placeholder={t('investQuestions_emailPlaceholder')}
                  value={contactEmail}
                  onChange={(event) => setContactEmail(event.target.value)}
                  autoComplete="email"
                  required
                  disabled={formSent}
                />
              </div>
              <div className="invest-questions__field invest-questions__field--message">
                <textarea
                  id={`${idPrefix}-contact-message`}
                  className="invest-questions__textarea"
                  placeholder={t('investQuestions_messagePlaceholder')}
                  value={contactMessage}
                  onChange={(event) => setContactMessage(event.target.value)}
                  rows={4}
                  required
                  disabled={formSent}
                />
              </div>
            </div>
            <button className="invest-questions__btn" type="submit" disabled={formSent}>
              {formSent ? t('investQuestions_sent') : t('investQuestions_send')}
            </button>
          </form>
        </div>

        <div className="invest-questions__faq">
          <ul className="invest-questions__faq-list">
            {faqs.map(([question, answer], index) => {
              const isOpen = openFaq === index
              const triggerId = `${idPrefix}-faq-q-${index}`
              const panelId = `${idPrefix}-faq-a-${index}`

              return (
                <li key={FAQ_KEYS[index][0]} className="invest-questions__faq-item">
                  <h3 className="invest-questions__faq-heading">
                    <button
                      type="button"
                      id={triggerId}
                      className={`invest-questions__faq-trigger${isOpen ? ' is-open' : ''}`}
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setOpenFaq(isOpen ? -1 : index)}
                    >
                      <span className="invest-questions__faq-question">{question}</span>
                      <span className="invest-questions__faq-icon" aria-hidden>
                        {isOpen ? <FiMinus size={18} /> : <FiPlus size={18} />}
                      </span>
                    </button>
                  </h3>
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={triggerId}
                    className="invest-questions__faq-panel"
                    hidden={!isOpen}
                  >
                    <p className="invest-questions__faq-answer">{answer}</p>
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

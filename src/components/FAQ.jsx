import { useTranslation } from 'react-i18next'
import { MessageCircle, HelpCircle } from 'lucide-react'
import './FAQ.css'

const FAQ_KEYS = [
  { questionKey: 'faq1Question', answerKey: 'faq1Answer', avatar: '👩' },
  { questionKey: 'faq2Question', answerKey: 'faq2Answer', avatar: '👨‍💼' },
  { questionKey: 'faq3Question', answerKey: 'faq3Answer', avatar: '👨' },
  { questionKey: 'faq4Question', answerKey: 'faq4Answer', avatar: '👩‍💼' }
]

const FAQ = () => {
  const { t } = useTranslation()

  return (
    <section className="faq" aria-labelledby="faq-heading">
      <div className="faq-bg" aria-hidden>
        <span className="faq-bg__shape faq-bg__shape--1" />
        <span className="faq-bg__shape faq-bg__shape--2" />
        <span className="faq-bg__shape faq-bg__shape--3" />
        <span className="faq-bg__dot-pattern" aria-hidden />
      </div>
      <div className="faq-container">
        <div className="faq-title-wrap">
          <span className="faq-badge">FAQ</span>
          <h2 id="faq-heading" className="faq-title">
            {t('faqTitle')}
          </h2>
        </div>
        <div className="faq-grid">
          {FAQ_KEYS.map((item, index) => (
            <article key={index} className="faq-card">
              <span className="faq-card__number" aria-hidden>
                {String(index + 1).padStart(2, '0')}
              </span>
              <div className="faq-card__question">
                <span className="faq-card__avatar" aria-hidden>
                  {item.avatar}
                </span>
                <div className="faq-card__question-inner">
                  <span className="faq-card__q-label">
                    <HelpCircle size={14} strokeWidth={2.5} />
                    Q
                  </span>
                  <p className="faq-card__question-text">{t(item.questionKey)}</p>
                </div>
              </div>
              <div className="faq-card__answer">
                <span className="faq-card__answer-icon" aria-hidden>
                  <MessageCircle size={22} strokeWidth={2} />
                </span>
                <div className="faq-card__answer-inner">
                  <span className="faq-card__a-label">A</span>
                  <p className="faq-card__answer-text">{t(item.answerKey)}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default FAQ

import { useTranslation } from 'react-i18next'
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
    <section className="faq">
      <div className="faq-container">
        <h2 className="faq-title">{t('faqTitle')}</h2>
        <div className="faq-grid">
          {FAQ_KEYS.map((item, index) => (
            <div key={index} className="faq-item">
              <div className="faq-question">
                <div className="faq-avatar">{item.avatar}</div>
                <p>{t(item.questionKey)}</p>
              </div>
              <div className="faq-answer">
                <div className="faq-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="8" r="4" stroke="white" strokeWidth="2"/>
                    <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                    <circle cx="18" cy="12" r="2" fill="white"/>
                  </svg>
                </div>
                <p>{t(item.answerKey)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default FAQ






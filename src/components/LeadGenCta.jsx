import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { showNotification } from '@/utils/toastHelper'

/** Лид-форма главной — тот же блок, можно встроить на другие страницы (разделы и т.д.) */
export default function LeadGenCta() {
  const { t } = useTranslation()
  const [leadIntent, setLeadIntent] = useState('buy')
  const [leadPhone, setLeadPhone] = useState('')
  const [leadConsent, setLeadConsent] = useState(false)

  const handleLeadGenSubmit = (e) => {
    e.preventDefault()
    const digits = leadPhone.replace(/\D/g, '')
    if (digits.length < 10) {
      showNotification(t('leadGenPhoneInvalid'))
      return
    }
    if (!leadConsent) {
      showNotification(t('leadGenConsentRequired'))
      return
    }
    showNotification(t('leadGenThankYou'), 'success')
    setLeadPhone('')
    setLeadConsent(false)
  }

  return (
    <section className="lead-gen" aria-labelledby="lead-gen-heading">
      <div className="lead-gen__wrap">
        <div className="lead-gen__stack">
          <div className="lead-gen__card">
            <div className="lead-gen__topbar">
              <h2 id="lead-gen-heading" className="lead-gen__title">
                {leadIntent === 'buy' ? t('leadGenHeadingBuy') : t('leadGenHeadingSell')}
              </h2>
              <div
                className="lead-gen__segment"
                role="group"
                aria-label={t('leadGenSegmentAria')}
              >
                <button
                  type="button"
                  className={`lead-gen__segment-btn${leadIntent === 'buy' ? ' lead-gen__segment-btn--active' : ''}`}
                  aria-pressed={leadIntent === 'buy'}
                  onClick={() => setLeadIntent('buy')}
                >
                  {t('leadGenToggleBuy')}
                </button>
                <button
                  type="button"
                  className={`lead-gen__segment-btn${leadIntent === 'sell' ? ' lead-gen__segment-btn--active' : ''}`}
                  aria-pressed={leadIntent === 'sell'}
                  onClick={() => setLeadIntent('sell')}
                >
                  {t('leadGenToggleSell')}
                </button>
              </div>
            </div>
            <div className="lead-gen__grid">
              <div className="lead-gen__col lead-gen__col--copy">
                <p className="lead-gen__hint">
                  {leadIntent === 'buy' ? t('leadGenHintBuy') : t('leadGenHintSell')}
                </p>
              </div>
              <div className="lead-gen__col lead-gen__col--form">
                <form className="lead-gen__form" onSubmit={handleLeadGenSubmit} noValidate>
                  <input
                    type="tel"
                    name="leadPhone"
                    value={leadPhone}
                    onChange={(ev) => setLeadPhone(ev.target.value)}
                    className="lead-gen__input"
                    placeholder={t('leadGenPhonePlaceholder')}
                    autoComplete="tel"
                    aria-label={t('leadGenPhonePlaceholder')}
                  />
                  <button type="submit" className="lead-gen__submit">
                    {t('leadGenSubmit')}
                  </button>
                  <label className="lead-gen__consent">
                    <input
                      type="checkbox"
                      checked={leadConsent}
                      onChange={(ev) => setLeadConsent(ev.target.checked)}
                      className="lead-gen__checkbox"
                    />
                    <span className="lead-gen__consent-text">{t('leadGenMarketingConsent')}</span>
                  </label>
                  <p className="lead-gen__legal">{t('leadGenLegalDisclaimer')}</p>
                </form>
              </div>
            </div>
          </div>
          <div className="lead-gen__immediate">
            <p className="lead-gen__immediate-q">{t('leadGenCallNowPrompt')}</p>
            <div className="lead-gen__immediate-right">
              <a href={`tel:${t('leadGenPhoneHref')}`} className="lead-gen__immediate-phone">
                {t('leadGenPhoneDisplay')}
              </a>
              <p className="lead-gen__immediate-sub">{t('leadGenCallNowSub')}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

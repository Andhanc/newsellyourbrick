import { CalendarCheck, Gavel, RotateCcw, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import './DepositZeroState.css'

export default function DepositZeroState({ onTopUp }) {
  const { t } = useTranslation()

  const benefits = [
    { icon: Gavel, title: t('depositZeroBenefitBidsTitle'), copy: t('depositZeroBenefitBidsCopy') },
    { icon: CalendarCheck, title: t('depositZeroBenefitBookingTitle'), copy: t('depositZeroBenefitBookingCopy') },
    { icon: ShieldCheck, title: t('depositZeroBenefitControlTitle'), copy: t('depositZeroBenefitControlCopy') },
  ]

  return (
    <section className="deposit-zero" aria-labelledby="deposit-zero-title">
      <div className="deposit-zero__visual">
        <img
          src="/images/buyer-mobile/deposit-zero-wallet.webp"
          alt={t('depositZeroAlt')}
          width="1024"
          height="1536"
        />
        <span className="deposit-zero__visual-badge"><ShieldCheck size={14} aria-hidden /> {t('depositZeroBadge')}</span>
      </div>

      <div className="deposit-zero__copy">
        <span className="deposit-zero__eyebrow">{t('depositZeroEyebrow')}</span>
        <h1 id="deposit-zero-title">{t('depositZeroTitle')}</h1>
        <p className="deposit-zero__lead">
          {t('depositZeroLead')}
        </p>

        <button type="button" className="deposit-zero__primary" onClick={onTopUp}>
          {t('depositZeroCta')}
        </button>
        <p className="deposit-zero__footnote">{t('depositZeroFootnote')}</p>

        <div className="deposit-zero__benefits">
          {benefits.map(({ icon: Icon, title, copy }) => (
            <article key={title}>
              <span aria-hidden><Icon size={18} /></span>
              <div><h2>{title}</h2><p>{copy}</p></div>
            </article>
          ))}
        </div>

        <div className="deposit-zero__preview" aria-label={t('depositZeroPreviewAria')}>
          <span className="deposit-zero__preview-label">{t('depositZeroPreviewLabel')}</span>
          <div className="deposit-zero__preview--blurred" aria-hidden>
            <div><span>{t('depositZeroAvailable')}</span><strong>2 500 €</strong></div>
            <div><span>{t('depositZeroReserved')}</span><strong>500 €</strong></div>
          </div>
        </div>

        <div className="deposit-zero__refund">
          <RotateCcw size={18} aria-hidden />
          <p><strong>{t('depositZeroRefundTitle')}</strong> {t('depositZeroRefundText')}</p>
        </div>

      </div>
    </section>
  )
}

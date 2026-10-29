import { ArrowRight, CalendarDays, MapPin } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import './PurchasedPropertyHistoryCard.css'

const FALLBACK_IMAGE = '/images/external/photo-1560448204-e02f11c3d0e2-d2beb47285.jpg'

function formatPurchaseMoney(amount, currency, locale = 'en') {
  if (!Number.isFinite(Number(amount))) return '—'
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency || 'EUR',
      maximumFractionDigits: 0,
    }).format(Number(amount))
  } catch {
    return `${Number(amount).toLocaleString(locale, { maximumFractionDigits: 0 })} ${String(currency || 'EUR').toUpperCase()}`
  }
}

function formatPurchaseDate(raw, locale = 'en', unknownLabel = '—') {
  const date = raw ? new Date(raw) : null
  if (!date || !Number.isFinite(date.getTime())) return unknownLabel
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function PurchasedPropertyHistoryCard({ item, onOpenDetails }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language || 'en'
  const percent = Math.round(item.paymentPercent)

  return (
    <article className="purchased-property-card">
      <div className="purchased-property-card__media">
        <img
          src={item.imageSrc}
          alt={item.title}
          loading="lazy"
          decoding="async"
          onError={(event) => {
            event.currentTarget.onerror = null
            event.currentTarget.src = FALLBACK_IMAGE
          }}
        />
        <span className="purchased-property-card__channel">{t('headerMegaBuyNow')}</span>
        <span className="purchased-property-card__status">{t('purchasedHistoryPaidPercent', { percent: Math.round(item.paymentPercent) })}</span>
      </div>

      <div className="purchased-property-card__content">
        <div>
          <h5 className="purchased-property-card__title">{item.title}</h5>
          {item.location ? (
            <p className="purchased-property-card__location">
              <MapPin size={14} aria-hidden />
              <span>{item.location}</span>
            </p>
          ) : null}
        </div>

        <div className="purchased-property-card__finance">
          <div className="purchased-property-card__finance-head">
            <span>{t('purchasedHistoryPaidIn')}</span>
            <strong>
              {formatPurchaseMoney(item.paidAmount, item.currency, locale)} {t('purchasedHistoryOf')}{' '}
              {formatPurchaseMoney(item.totalAmount, item.currency, locale)}
            </strong>
          </div>
          <div
            className="purchased-property-card__progress"
            role="progressbar"
            aria-label={t('purchasedHistoryProgressAria')}
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow={percent}
          >
            <span style={{ width: `${percent}%` }} />
          </div>
        </div>

        <div className="purchased-property-card__footer">
          <span className="purchased-property-card__date">
            <CalendarDays size={15} aria-hidden />
            {formatPurchaseDate(item.purchaseDateRaw, locale, t('buyerCabinet_historyDateUnknown'))}
          </span>
          <button
            type="button"
            className="purchased-property-card__details"
            onClick={() => onOpenDetails(item)}
          >
            {t('createSiteAd_learnMore')}
            <ArrowRight size={17} aria-hidden />
          </button>
        </div>
      </div>
    </article>
  )
}

export { formatPurchaseDate, formatPurchaseMoney }

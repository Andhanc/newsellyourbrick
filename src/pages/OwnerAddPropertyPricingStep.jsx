import { useTranslation } from 'react-i18next'
import { Gavel, Lightbulb, DollarSign, Tag, Zap } from 'lucide-react'
import OapSelect from '../components/OapSelect'
import AuctionPeriodPicker from '../components/AuctionPeriodPicker'
import { PROPERTY_CURRENCIES, QUICK_LISTING_CURRENCY_CODES } from '../utils/currency'
import { formatMoneyInputDisplay, sanitizeMoneyInputRaw } from '../utils/moneyInputFormat'
import { OAP_PRICING_IMAGES } from './oapPricingImages'
import './OwnerAddPropertyPricingStep.css'

const LISTING_CURRENCY_OPTIONS = PROPERTY_CURRENCIES.filter((c) =>
  QUICK_LISTING_CURRENCY_CODES.includes(c.code),
).sort((a, b) => {
  if (a.code === 'EUR') return -1
  if (b.code === 'EUR') return 1
  return 0
})

const AUCTION_MODES = new Set(['auction', 'auction_buy_now', 'debt_auction'])
const BUY_NOW_MODES = new Set(['auction_buy_now', 'debt_auction'])

export default function OwnerAddPropertyPricingStep({
  embedded = false,
  listingMode,
  minimumSalePrice,
  price,
  debtAmount,
  auctionStartingPrice,
  auctionStartDate,
  auctionEndDate,
  currency = 'EUR',
  errors = {},
  onChangeField,
}) {
  const { t } = useTranslation()
  const isAuctionMode = AUCTION_MODES.has(listingMode)
  const showBuyNow = BUY_NOW_MODES.has(listingMode)
  const isShares = listingMode === 'shares'
  const isDebt = listingMode === 'debt'
  const isDebtAuction = listingMode === 'debt_auction'
  const currencyCode = currency || 'EUR'

  const title =
    isAuctionMode || isDebtAuction ? t('oap_pricingTitleAuction') : t('oap_pricingTitleDefault')
  const subtitle =
    isAuctionMode || isDebtAuction
      ? t('oap_pricingSubtitleAuction')
      : isShares
        ? t('oap_pricingSubtitleShares')
        : t('oap_pricingSubtitleDebt')

  const renderCurrencySelect = (id) => (
    <OapSelect
      id={id}
      className="oap-select--compact oap-pricing-step__currency"
      value={currencyCode}
      aria-label={t('oap_pricingCurrencyAria')}
      options={LISTING_CURRENCY_OPTIONS.map((item) => ({
        value: item.code,
        label: item.code,
      }))}
      onChange={(nextValue) => onChangeField('listingCurrency', nextValue)}
    />
  )

  const renderPriceField = ({
    fieldKey,
    label,
    value,
    icon: Icon,
    iconTone = 'primary',
    selectId,
    errorKey = fieldKey,
    hint,
  }) => (
    <label className="oap-pricing-step__field oap-pricing-step__field--compact" key={fieldKey}>
      <span className="oap-pricing-step__field-label">{label}</span>
      <div className="oap-pricing-step__field-control">
        <span
          className={`oap-pricing-step__field-icon oap-pricing-step__field-icon--${iconTone}`}
          aria-hidden
        >
          <Icon size={15} strokeWidth={2} />
        </span>
        <input
          type="text"
          inputMode="numeric"
          className={`oap-pricing-step__input oap-pricing-step__input--with-icon oap-pricing-step__input--with-currency${errors[errorKey] ? ' oap-pricing-step__input--error' : ''}`}
          placeholder={t('oap_pricingPricePlaceholder')}
          value={formatMoneyInputDisplay(value)}
          onChange={(e) => onChangeField(fieldKey, sanitizeMoneyInputRaw(e.target.value))}
        />
        {renderCurrencySelect(selectId)}
      </div>
      {hint && <span className="oap-pricing-step__field-hint">{hint}</span>}
      {errors[errorKey] && (
        <span className="oap-pricing-step__field-error">{errors[errorKey]}</span>
      )}
    </label>
  )

  const priceFields = (
    <>
      {isDebt &&
        renderPriceField({
          fieldKey: 'debtAmount',
          label: t('oap_pricingDebtAmount'),
          value: debtAmount,
          icon: DollarSign,
          iconTone: 'debt',
          selectId: 'oap-pricing-currency-debt',
        })}

      {isDebtAuction &&
        renderPriceField({
          fieldKey: 'debtAmount',
          label: t('oap_pricingDebtAmount'),
          value: debtAmount,
          icon: DollarSign,
          iconTone: 'debt',
          selectId: 'oap-pricing-currency-debt-auction',
        })}

      {isShares &&
        renderPriceField({
          fieldKey: 'price',
          label: t('oap_pricingTotalCost'),
          value: price,
          icon: DollarSign,
          iconTone: 'shares',
          selectId: 'oap-pricing-currency-shares',
        })}

      {isAuctionMode && (
        <div className="oap-pricing-step__prices-row">
          {renderPriceField({
            fieldKey: 'auctionStartingPrice',
            label: t('oap_pricingStartingBid'),
            value: auctionStartingPrice,
            icon: Gavel,
            iconTone: 'auction',
            selectId: 'oap-pricing-currency-starting',
          })}

          {renderPriceField({
            fieldKey: 'minimumSalePrice',
            label: t('oap_pricingMinimumSale'),
            value: minimumSalePrice,
            icon: Tag,
            iconTone: 'minimum',
            selectId: 'oap-pricing-currency-min',
            hint: t('oap_pricingMinimumSaleHint'),
          })}

          {showBuyNow &&
            renderPriceField({
              fieldKey: 'price',
              label: t('oap_pricingBuyNow'),
              value: price,
              icon: Zap,
              iconTone: 'buynow',
              selectId: 'oap-pricing-currency-buy-now',
            })}
        </div>
      )}
    </>
  )

  const auctionDates = isAuctionMode && (
    <div className="oap-pricing-step__auction-period">
      <AuctionPeriodPicker
        variant={embedded ? 'embedded' : 'default'}
        label={embedded ? undefined : t('oap_pricingAuctionPeriod')}
        startDate={auctionStartDate}
        endDate={auctionEndDate}
        onStartDateChange={(date) => onChangeField('auctionStartDate', date)}
        onEndDateChange={(date) => onChangeField('auctionEndDate', date)}
      />
      {errors.auctionEndDate && (
        <span className="oap-pricing-step__field-error">{errors.auctionEndDate}</span>
      )}
    </div>
  )

  if (embedded) {
    return (
      <section className="oap-pricing-step oap-pricing-step--embedded">
        <div className="oap-pricing-step__subsection">
          <h3 className="oap-pricing-step__subsection-title">{t('oap_pricingTitleDefault')}</h3>
          <div className="oap-pricing-step__card">{priceFields}</div>
        </div>

        {isAuctionMode && (
          <div className="oap-pricing-step__subsection">
            <h3 className="oap-pricing-step__subsection-title">{t('oap_pricingAuctionPeriod')}</h3>
            <div className="oap-pricing-step__card oap-pricing-step__card--dates">{auctionDates}</div>
          </div>
        )}
      </section>
    )
  }

  return (
    <section className="oap-pricing-step" aria-labelledby="oap-pricing-title">
      <div className="oap-pricing-step__layout">
        <div className="oap-pricing-step__main">
          <header className="oap-pricing-step__head">
            <h2 id="oap-pricing-title" className="oap-pricing-step__title">
              {title}
            </h2>
            <p className="oap-pricing-step__subtitle">{subtitle}</p>
          </header>

          <div className="oap-pricing-step__card">
            {priceFields}
            {!embedded && auctionDates}
          </div>
        </div>

        <aside className="oap-pricing-step__sidebar" aria-label={t('oap_wizardTipsTitle')}>
          <div className="oap-pricing-step__sidebar-head">
            <span className="oap-pricing-step__sidebar-icon" aria-hidden>
              <Lightbulb size={16} strokeWidth={2} />
            </span>
            <span className="oap-pricing-step__sidebar-title">{t('oap_wizardTipsTitle')}</span>
          </div>
          <p className="oap-pricing-step__sidebar-text">
            {isAuctionMode ? t('oap_pricingTipAuction') : t('oap_pricingTipDefault')}
          </p>
          <div className="oap-pricing-step__sidebar-illustration">
            <img
              src={OAP_PRICING_IMAGES.sidebarHero}
              alt=""
              className="oap-pricing-step__sidebar-img"
            />
          </div>
        </aside>
      </div>
    </section>
  )
}

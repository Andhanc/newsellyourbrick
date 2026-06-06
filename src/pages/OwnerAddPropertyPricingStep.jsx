import { Gavel, Lightbulb, DollarSign, Tag, Zap } from 'lucide-react'
import AuctionPeriodPicker from '../components/AuctionPeriodPicker'
import { PROPERTY_CURRENCIES, QUICK_LISTING_CURRENCY_CODES } from '../utils/currency'
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

function sanitizeMoneyInput(value) {
  return value.replace(/[^\d\s]/g, '')
}

export default function OwnerAddPropertyPricingStep({
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
  const isAuctionMode = AUCTION_MODES.has(listingMode)
  const showBuyNow = BUY_NOW_MODES.has(listingMode)
  const isShares = listingMode === 'shares'
  const isDebt = listingMode === 'debt'
  const isDebtAuction = listingMode === 'debt_auction'
  const currencyCode = currency || 'EUR'

  const title = isAuctionMode || isDebtAuction ? 'Цена и даты аукциона' : 'Цена объекта'
  const subtitle =
    isAuctionMode || isDebtAuction
      ? 'Укажите суммы торгов и параметры аукциона для публикации'
      : isShares
        ? 'Укажите общую стоимость объекта для публикации'
        : 'Укажите сумму долга для публикации'

  const renderCurrencySelect = (id) => (
    <select
      id={id}
      className="oap-pricing-step__currency"
      value={currencyCode}
      aria-label="Валюта"
      onChange={(e) => onChangeField('listingCurrency', e.target.value)}
    >
      {LISTING_CURRENCY_OPTIONS.map((item) => (
        <option key={item.code} value={item.code}>
          {item.code}
        </option>
      ))}
    </select>
  )

  const renderPriceField = ({
    fieldKey,
    label,
    value,
    icon: Icon,
    selectId,
    errorKey = fieldKey,
  }) => (
    <label className="oap-pricing-step__field oap-pricing-step__field--compact" key={fieldKey}>
      <span className="oap-pricing-step__field-label">{label}</span>
      <div className="oap-pricing-step__field-control">
        <span className="oap-pricing-step__field-icon" aria-hidden>
          <Icon size={16} strokeWidth={1.75} />
        </span>
        <input
          type="text"
          inputMode="numeric"
          className={`oap-pricing-step__input oap-pricing-step__input--with-icon oap-pricing-step__input--with-currency${errors[errorKey] ? ' oap-pricing-step__input--error' : ''}`}
          placeholder="Введите цену"
          value={value}
          onChange={(e) => onChangeField(fieldKey, sanitizeMoneyInput(e.target.value))}
        />
        {renderCurrencySelect(selectId)}
      </div>
      {errors[errorKey] && (
        <span className="oap-pricing-step__field-error">{errors[errorKey]}</span>
      )}
    </label>
  )

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
            {isDebt && (
              renderPriceField({
                fieldKey: 'debtAmount',
                label: 'Сумма долга',
                value: debtAmount,
                icon: DollarSign,
                selectId: 'oap-pricing-currency-debt',
              })
            )}

            {isDebtAuction &&
              renderPriceField({
                fieldKey: 'debtAmount',
                label: 'Сумма долга',
                value: debtAmount,
                icon: DollarSign,
                selectId: 'oap-pricing-currency-debt-auction',
              })}

            {isShares &&
              renderPriceField({
                fieldKey: 'price',
                label: 'Общая стоимость объекта',
                value: price,
                icon: DollarSign,
                selectId: 'oap-pricing-currency-shares',
              })}

            {isAuctionMode && (
              <div className="oap-pricing-step__prices-row">
                {renderPriceField({
                  fieldKey: 'minimumSalePrice',
                  label: 'Минимальная цена продажи',
                  value: minimumSalePrice,
                  icon: Tag,
                  selectId: 'oap-pricing-currency-min',
                })}

                {showBuyNow &&
                  renderPriceField({
                    fieldKey: 'price',
                    label: 'Продать сейчас',
                    value: price,
                    icon: Zap,
                    selectId: 'oap-pricing-currency-buy-now',
                  })}

                {renderPriceField({
                  fieldKey: 'auctionStartingPrice',
                  label: 'Стартовая сумма ставки',
                  value: auctionStartingPrice,
                  icon: Gavel,
                  selectId: 'oap-pricing-currency-starting',
                })}
              </div>
            )}

            {isAuctionMode && (
              <div className="oap-pricing-step__auction-block">
                <div className="oap-pricing-step__auction-period">
                  <AuctionPeriodPicker
                    label="Период проведения аукциона"
                    startDate={auctionStartDate}
                    endDate={auctionEndDate}
                    onStartDateChange={(date) => onChangeField('auctionStartDate', date)}
                    onEndDateChange={(date) => onChangeField('auctionEndDate', date)}
                  />
                  {errors.auctionEndDate && (
                    <span className="oap-pricing-step__field-error">{errors.auctionEndDate}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <aside className="oap-pricing-step__sidebar" aria-label="Совет">
          <div className="oap-pricing-step__sidebar-head">
            <span className="oap-pricing-step__sidebar-icon" aria-hidden>
              <Lightbulb size={16} strokeWidth={2} />
            </span>
            <span className="oap-pricing-step__sidebar-title">Совет</span>
          </div>
          <p className="oap-pricing-step__sidebar-text">
            {isAuctionMode
              ? 'Сначала укажите минимальную цену продажи, затем «Продать сейчас» (если доступно) и стартовую ставку. Реалистичные суммы и достаточный срок аукциона повышают доверие покупателей.'
              : 'Укажите реалистичную цену — это повышает доверие покупателей и шансы на успешную сделку.'}
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

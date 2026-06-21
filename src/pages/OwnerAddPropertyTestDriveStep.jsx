import { useTranslation } from 'react-i18next'
import { Video, DollarSign, Shield, Gavel, Lightbulb } from 'lucide-react'
import OapSelect from '../components/OapSelect'
import { PROPERTY_CURRENCIES, QUICK_LISTING_CURRENCY_CODES } from '../utils/currency'
import OapWizardSidebarImage from '../components/OapWizardSidebarImage'
import { OAP_TESTDRIVE_IMAGES } from './oapTestdriveImages'
import './OwnerAddPropertyTestDriveStep.css'

const TEST_DRIVE_CURRENCY_OPTIONS = PROPERTY_CURRENCIES.filter((c) =>
  QUICK_LISTING_CURRENCY_CODES.includes(c.code),
).sort((a, b) => {
  if (a.code === 'EUR') return -1
  if (b.code === 'EUR') return 1
  return 0
})

export default function OwnerAddPropertyTestDriveStep({
  embedded = false,
  journeyLayout = false,
  testDrive,
  pricePerDay,
  insuranceDeposit,
  currency = 'EUR',
  propertyTypeOption,
  errors = {},
  onSelectChoice,
  onChangeDetail,
}) {
  const { t } = useTranslation()
  const isEnabled = testDrive === 'yes'

  const handleToggle = () => {
    onSelectChoice?.(isEnabled ? 'no' : 'yes')
  }
  const currencyCode = currency || 'EUR'

  const renderCurrencySelect = (id) => (
    <OapSelect
      id={id}
      className="oap-select--compact oap-testdrive-step__price-currency"
      value={currencyCode}
      aria-label={t('oap_testDriveCurrencyAria')}
      options={TEST_DRIVE_CURRENCY_OPTIONS.map((item) => ({
        value: item.code,
        label: item.code,
      }))}
      onChange={(nextValue) => onChangeDetail?.('testDriveCurrency', nextValue)}
    />
  )

  const toggleRow = (
    <div className="oap-testdrive-step__toggle-row">
      <span className="oap-testdrive-step__toggle-icon" aria-hidden>
        <Video size={embedded ? 18 : 20} strokeWidth={1.75} />
      </span>
      <div className="oap-testdrive-step__toggle-copy">
        <span className="oap-testdrive-step__toggle-label">
          {embedded ? t('oap_testDriveAllow') : t('oap_testDriveAvailable')}
        </span>
        <span className="oap-testdrive-step__toggle-hint">
          {embedded
            ? t('oap_testDriveHint')
            : `${t('oap_testDriveHint')}${propertyTypeOption?.label ? ` · ${propertyTypeOption.label.toLowerCase()}` : ''}`}
        </span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={isEnabled}
        aria-label={embedded ? t('oap_testDriveAllow') : t('oap_testDriveAvailable')}
        className={`oap-testdrive-step__switch${isEnabled ? ' oap-testdrive-step__switch--on' : ''}`}
        onClick={handleToggle}
      >
        <span className="oap-testdrive-step__switch-thumb" />
      </button>
    </div>
  )

  const pricingBody = isEnabled && (
    <div className="oap-testdrive-step__body">
      <div className="oap-testdrive-step__section">
        <h3 className="oap-testdrive-step__section-title">{t('oap_tdPricingTitle')}</h3>
        <div className="oap-testdrive-step__pricing">
          <label className="oap-testdrive-step__price-card">
            <span className="oap-testdrive-step__price-icon" aria-hidden>
              <DollarSign size={18} strokeWidth={1.75} />
            </span>
            <span className="oap-testdrive-step__price-body">
              <span className="oap-testdrive-step__price-label">
                {t('oap_tdPricePerDay')}
                <span className="oap-testdrive-step__required">*</span>
              </span>
              <span className="oap-testdrive-step__price-hint">{t('oap_tdPricePerDayHint')}</span>
              <div className="oap-testdrive-step__price-input-wrap">
                <input
                  type="text"
                  inputMode="decimal"
                  className={`oap-testdrive-step__price-input${errors.pricePerDay ? ' oap-testdrive-step__price-input--error' : ''}`}
                  placeholder="0"
                  value={pricePerDay}
                  onChange={(e) =>
                    onChangeDetail(
                      'testDrivePricePerDay',
                      e.target.value.replace(/[^\d.,\s]/g, '')
                    )
                  }
                />
                {renderCurrencySelect('oap-testdrive-currency-day')}
              </div>
              {errors.pricePerDay && (
                <span className="oap-testdrive-step__field-error">{errors.pricePerDay}</span>
              )}
            </span>
          </label>

          <label className="oap-testdrive-step__price-card oap-testdrive-step__price-card--soft">
            <span
              className="oap-testdrive-step__price-icon oap-testdrive-step__price-icon--shield"
              aria-hidden
            >
              <Shield size={18} strokeWidth={1.75} />
            </span>
            <span className="oap-testdrive-step__price-body">
              <span className="oap-testdrive-step__price-label">{t('oap_tdInsuranceDeposit')}</span>
              <span className="oap-testdrive-step__price-hint">{t('oap_tdInsuranceDepositHint')}</span>
              <div className="oap-testdrive-step__price-input-wrap">
                <input
                  type="text"
                  inputMode="decimal"
                  className={`oap-testdrive-step__price-input${errors.insuranceDeposit ? ' oap-testdrive-step__price-input--error' : ''}`}
                  placeholder="0"
                  value={insuranceDeposit}
                  onChange={(e) =>
                    onChangeDetail(
                      'testDriveInsuranceDeposit',
                      e.target.value.replace(/[^\d.,\s]/g, '')
                    )
                  }
                />
                {renderCurrencySelect('oap-testdrive-currency-deposit')}
              </div>
              {errors.insuranceDeposit && (
                <span className="oap-testdrive-step__field-error">{errors.insuranceDeposit}</span>
              )}
            </span>
          </label>
        </div>
      </div>

      <div className="oap-testdrive-step__format-note" role="note">
        <span className="oap-testdrive-step__format-note-icon" aria-hidden>
          <Gavel size={16} strokeWidth={1.75} />
        </span>
        <div>
          <strong>{t('oap_tdFormatNoteTitle')}</strong>
          <p>{t('oap_tdFormatNoteBody')}</p>
        </div>
      </div>
    </div>
  )

  if (embedded) {
    return (
      <section
        className={`oap-testdrive-step oap-testdrive-step--embedded${journeyLayout ? ' oap-testdrive-step--journey' : ''}${isEnabled ? ' oap-testdrive-step--on' : ''}`}
      >
        {!journeyLayout ? <p className="oap-testdrive-step__embedded-hint">{t('oap_tdConfigureView')}</p> : null}
        {journeyLayout ? (
          <div className="oap-testdrive-step__journey-panel">
            {toggleRow}
            {pricingBody}
          </div>
        ) : (
          <div className="oap-testdrive-step__card">
            {toggleRow}
            {pricingBody}
          </div>
        )}
      </section>
    )
  }

  return (
    <section className="oap-testdrive-step" aria-labelledby="oap-testdrive-title">
      <div className="oap-testdrive-step__layout">
        <div className="oap-testdrive-step__main">
          <header className="oap-testdrive-step__head">
            <h2 id="oap-testdrive-title" className="oap-testdrive-step__title">
              {t('oap_tdConfigureViewShort')}
            </h2>
            <p className="oap-testdrive-step__subtitle">{t('oap_tdBuyersCanBook')}</p>
          </header>

          <div className="oap-testdrive-step__card">
            {toggleRow}
            {pricingBody}
          </div>
        </div>

        <aside className="oap-testdrive-step__sidebar" aria-label={t('oap_tdSidebarAria')}>
          <div className="oap-testdrive-step__sidebar-head">
            <span className="oap-testdrive-step__sidebar-icon" aria-hidden>
              <Lightbulb size={16} strokeWidth={2} />
            </span>
            <span className="oap-testdrive-step__sidebar-title">{t('oap_tdSidebarTitle')}</span>
          </div>
          <p className="oap-testdrive-step__sidebar-text">{t('oap_tdSidebarText')}</p>
          <div className="oap-testdrive-step__sidebar-illustration">
            <OapWizardSidebarImage
              src={OAP_TESTDRIVE_IMAGES.sidebarHero}
              className="oap-testdrive-step__sidebar-img"
            />
          </div>
        </aside>
      </div>
    </section>
  )
}

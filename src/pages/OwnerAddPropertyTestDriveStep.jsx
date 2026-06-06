import { Video, DollarSign, Shield, Gavel, Lightbulb } from 'lucide-react'
import { PROPERTY_CURRENCIES, QUICK_LISTING_CURRENCY_CODES } from '../utils/currency'
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
  testDrive,
  pricePerDay,
  insuranceDeposit,
  currency = 'EUR',
  propertyTypeOption,
  errors = {},
  onSelectChoice,
  onChangeDetail,
}) {
  const isEnabled = testDrive === 'yes'

  const handleToggle = () => {
    onSelectChoice?.(isEnabled ? 'no' : 'yes')
  }
  const currencyCode = currency || 'EUR'

  const renderCurrencySelect = (id) => (
    <select
      id={id}
      className="oap-testdrive-step__price-currency"
      value={currencyCode}
      aria-label="Валюта"
      onChange={(e) => onChangeDetail?.('testDriveCurrency', e.target.value)}
    >
      {TEST_DRIVE_CURRENCY_OPTIONS.map((item) => (
        <option key={item.code} value={item.code}>
          {item.code}
        </option>
      ))}
    </select>
  )

  return (
    <section className="oap-testdrive-step" aria-labelledby="oap-testdrive-title">
      <div className="oap-testdrive-step__layout">
        <div className="oap-testdrive-step__main">
          <header className="oap-testdrive-step__head">
            <h2 id="oap-testdrive-title" className="oap-testdrive-step__title">
              Настройте возможность просмотра
            </h2>
            <p className="oap-testdrive-step__subtitle">
              Покупатели смогут записаться на просмотр или краткое проживание вашего объекта
            </p>
          </header>

          <div className="oap-testdrive-step__card">
            <div className="oap-testdrive-step__toggle-row">
              <span className="oap-testdrive-step__toggle-icon" aria-hidden>
                <Video size={20} strokeWidth={1.75} />
              </span>
              <div className="oap-testdrive-step__toggle-copy">
                <span className="oap-testdrive-step__toggle-label">Доступен тест-драйв</span>
                <span className="oap-testdrive-step__toggle-hint">
                  Краткосрочный просмотр или проживание по записи
                  {propertyTypeOption?.label ? ` · ${propertyTypeOption.label.toLowerCase()}` : ''}
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isEnabled}
                aria-label="Доступен тест-драйв"
                className={`oap-testdrive-step__switch${isEnabled ? ' oap-testdrive-step__switch--on' : ''}`}
                onClick={handleToggle}
              >
                <span className="oap-testdrive-step__switch-thumb" />
              </button>
            </div>

            {isEnabled && (
              <div className="oap-testdrive-step__body">
                <div className="oap-testdrive-step__section">
                  <h3 className="oap-testdrive-step__section-title">Стоимость тест-драйва</h3>
                  <div className="oap-testdrive-step__pricing">
                    <label className="oap-testdrive-step__price-card">
                      <span className="oap-testdrive-step__price-icon" aria-hidden>
                        <DollarSign size={18} strokeWidth={1.75} />
                      </span>
                      <span className="oap-testdrive-step__price-body">
                        <span className="oap-testdrive-step__price-label">
                          Стоимость за сутки
                          <span className="oap-testdrive-step__required">*</span>
                        </span>
                        <span className="oap-testdrive-step__price-hint">
                          Цена одних суток просмотра или проживания
                        </span>
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
                        <span className="oap-testdrive-step__price-label">Страховой депозит</span>
                        <span className="oap-testdrive-step__price-hint">
                          Возвращается после осмотра, если нет повреждений
                        </span>
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
                          <span className="oap-testdrive-step__field-error">
                            {errors.insuranceDeposit}
                          </span>
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
                    <strong>Формат продажи</strong>
                    <p>
                      Тест-драйв сочетается только с вариантом «Аукцион + Продать сейчас»: торги и отдельная
                      цена мгновенной покупки. На следующем шаге будет доступен только этот формат.
                    </p>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>

        <aside className="oap-testdrive-step__sidebar" aria-label="Совет">
          <div className="oap-testdrive-step__sidebar-head">
            <span className="oap-testdrive-step__sidebar-icon" aria-hidden>
              <Lightbulb size={16} strokeWidth={2} />
            </span>
            <span className="oap-testdrive-step__sidebar-title">Совет</span>
          </div>
          <p className="oap-testdrive-step__sidebar-text">
            Тест-драйв позволяет привлечь больше заинтересованных покупателей — они смогут
            «примерить» объект перед сделкой и оценить атмосферу на месте.
          </p>
          <div className="oap-testdrive-step__sidebar-illustration">
            <img
              src={OAP_TESTDRIVE_IMAGES.sidebarHero}
              alt=""
              className="oap-testdrive-step__sidebar-img"
            />
          </div>
        </aside>
      </div>
    </section>
  )
}

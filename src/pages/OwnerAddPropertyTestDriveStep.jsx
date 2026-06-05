import { Car, Check, ArrowLeft, Info } from 'lucide-react'

export default function OwnerAddPropertyTestDriveStep({
  phase,
  testDrive,
  pricePerDay,
  insuranceDeposit,
  propertyTypeOption,
  errors = {},
  onSelectChoice,
  onChangeDetail,
  onBackToQuestion,
}) {
  const TypeIcon = propertyTypeOption?.Icon

  if (phase === 'details') {
    return (
      <section className="oap-testdrive-step" aria-labelledby="oap-testdrive-details-title">
        <header className="oap-testdrive-step__head">
          <span className="oap-testdrive-step__badge" aria-hidden>
            <Car size={22} strokeWidth={1.85} />
          </span>
          <div className="oap-testdrive-step__head-text">
            <h2 id="oap-testdrive-details-title" className="oap-testdrive-step__title">
              Настройки тест-драйва
            </h2>
            <p className="oap-testdrive-step__subtitle">
              Укажите стоимость за сутки и страховой депозит — покупатель увидит прозрачные условия
              перед записью
            </p>
          </div>
        </header>

        <div className="oap-testdrive-step__card">
          <div className="oap-testdrive-step__note" role="note">
            <Info size={18} aria-hidden />
            <div>
              <strong>Формат продажи</strong>
              <p>
                Тест-драйв сочетается только с вариантом «Аукцион + выкуп»: торги и отдельная цена
                мгновенной покупки. На следующем шаге будет доступен только этот формат.
              </p>
            </div>
          </div>

          <div className="oap-testdrive-step__fields">
            <label className="oap-field">
              <span className="oap-field__label">
                Стоимость за сутки
                <span className="oap-testdrive-step__required">*</span>
              </span>
              <div className="oap-field__suffix-wrap">
                <input
                  type="text"
                  inputMode="decimal"
                  className={`oap-field__input oap-field__input--suffix${errors.pricePerDay ? ' oap-field__input--error' : ''}`}
                  placeholder="0"
                  value={pricePerDay}
                  onChange={(e) =>
                    onChangeDetail('testDrivePricePerDay', e.target.value.replace(/[^\d.,\s]/g, ''))
                  }
                />
                <span className="oap-field__suffix">USD</span>
              </div>
              {errors.pricePerDay && (
                <span className="oap-field__error">{errors.pricePerDay}</span>
              )}
            </label>

            <label className="oap-field">
              <span className="oap-field__label">Страховой депозит</span>
              <div className="oap-field__suffix-wrap">
                <input
                  type="text"
                  inputMode="decimal"
                  className={`oap-field__input oap-field__input--suffix${errors.insuranceDeposit ? ' oap-field__input--error' : ''}`}
                  placeholder="0"
                  value={insuranceDeposit}
                  onChange={(e) =>
                    onChangeDetail(
                      'testDriveInsuranceDeposit',
                      e.target.value.replace(/[^\d.,\s]/g, '')
                    )
                  }
                />
                <span className="oap-field__suffix">USD</span>
              </div>
              {errors.insuranceDeposit && (
                <span className="oap-field__error">{errors.insuranceDeposit}</span>
              )}
            </label>
          </div>

          <button type="button" className="oap-testdrive-step__back-link" onClick={onBackToQuestion}>
            <ArrowLeft size={16} aria-hidden />
            Изменить ответ
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="oap-testdrive-step" aria-labelledby="oap-testdrive-question-title">
      <header className="oap-testdrive-step__head oap-testdrive-step__head--centered">
        {TypeIcon && (
          <span className="oap-testdrive-step__type-icon" aria-hidden>
            <TypeIcon size={36} strokeWidth={1.5} />
          </span>
        )}
        <div className="oap-testdrive-step__head-text">
          <h2 id="oap-testdrive-question-title" className="oap-testdrive-step__title">
            Будет ли доступен тест-драйв?
          </h2>
          <p className="oap-testdrive-step__subtitle">
            Тест-драйв — краткосрочный просмотр или проживание по записи: покупатель «примеряет»
            объект перед сделкой
            {propertyTypeOption?.label ? ` (${propertyTypeOption.label.toLowerCase()})` : ''}
          </p>
        </div>
      </header>

      <div className="oap-testdrive-step__card">
        <p className="oap-testdrive-step__hint">
          Если выберете «Да», объявление можно опубликовать только в формате «Аукцион + выкуп» — с
          торгами и отдельной ценой мгновенной покупки.
        </p>

        <div className="oap-testdrive-step__choices" role="group" aria-label="Тест-драйв">
          <button
            type="button"
            className={`oap-testdrive-step__choice oap-testdrive-step__choice--yes${testDrive === 'yes' ? ' oap-testdrive-step__choice--active' : ''}`}
            onClick={() => onSelectChoice('yes')}
          >
            <span className="oap-testdrive-step__choice-label">Да</span>
            <span className="oap-testdrive-step__choice-desc">
              Покупатель сможет записаться на просмотр или краткое проживание
            </span>
            {testDrive === 'yes' && (
              <span className="oap-testdrive-step__choice-check" aria-hidden>
                <Check size={16} />
              </span>
            )}
          </button>

          <button
            type="button"
            className={`oap-testdrive-step__choice oap-testdrive-step__choice--no${testDrive === 'no' ? ' oap-testdrive-step__choice--active' : ''}`}
            onClick={() => onSelectChoice('no')}
          >
            <span className="oap-testdrive-step__choice-label">Нет</span>
            <span className="oap-testdrive-step__choice-desc">
              Объект продаётся без тест-драйва — сразу переходим к формату публикации
            </span>
            {testDrive === 'no' && (
              <span className="oap-testdrive-step__choice-check" aria-hidden>
                <Check size={16} />
              </span>
            )}
          </button>
        </div>

        {errors.choice && <p className="oap-testdrive-step__error">{errors.choice}</p>}

        <p className="oap-testdrive-step__tip">
          Если объект сложно «почувствовать по фото» — вид, атмосфера, планировка — тест-драйв
          заметно повышает конверсию в сделку.
        </p>
      </div>
    </section>
  )
}

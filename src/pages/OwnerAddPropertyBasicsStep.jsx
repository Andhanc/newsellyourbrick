import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bath, Bed, Check } from 'lucide-react'
import OapSelect from '../components/OapSelect'
import OwnerAddPropertyLocationStep from './OwnerAddPropertyLocationStep'
import OwnerAddPropertyStepAside from '../components/OwnerAddPropertyStepAside'
import { OwnerAddPropertyWizardStepHead } from '../components/OwnerAddPropertyWizardStepLayout'
import { OAP_BASICS_ROW_ASIDES } from './oapWizardStepVisuals'
import './OwnerAddPropertyBasicsStep.css'
import '../components/OwnerAddPropertyStepAside.css'

const COUNT_PICKER_VALUES = ['1', '2', '3', '4', '5']

function normalizeCountPickerValue(value) {
  const n = parseInt(String(value).replace(/\D/g, ''), 10)
  if (!Number.isFinite(n) || n <= 0) return ''
  if (n >= 5) return '5'
  return String(n)
}

function BasicsSectionHead({ number, title, hint }) {
  return (
    <header className="oap-basics-step__section-head">
      <span className="oap-basics-step__section-num" aria-hidden>
        {String(number).padStart(2, '0')}
      </span>
      <div className="oap-basics-step__section-meta">
        <h3 className="oap-basics-step__section-title">{title}</h3>
        {hint ? <p className="oap-basics-step__section-hint">{hint}</p> : null}
      </div>
    </header>
  )
}

export default function OwnerAddPropertyBasicsStep({
  form,
  propertyTypeOptions,
  onTypeSelect,
  onFormPatch,
  onParamFieldChange,
  paramErrors = {},
  locationErrors = {},
  typeProfile,
  paramsSubtitle,
  paramOptions,
  mobileSection = 'all',
  hideWizardChrome = false,
}) {
  const { t } = useTranslation()
  const [exactFlashKeys, setExactFlashKeys] = useState({})
  const [exactUi, setExactUi] = useState({})
  const exactInputRefs = useRef({})
  const exactFlashTimers = useRef({})

  const clearExactUi = (key) => {
    setExactUi((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const openExactUi = (key, draft) => {
    setExactUi((prev) => ({ ...prev, [key]: { open: true, draft } }))
  }

  const flashExactInput = (key) => {
    if (exactFlashTimers.current[key]) {
      clearTimeout(exactFlashTimers.current[key])
    }
    setExactFlashKeys((prev) => ({ ...prev, [key]: Date.now() }))
    exactFlashTimers.current[key] = setTimeout(() => {
      setExactFlashKeys((prev) => {
        if (!prev[key]) return prev
        const next = { ...prev }
        delete next[key]
        return next
      })
      delete exactFlashTimers.current[key]
    }, 1800)
  }

  useEffect(() => {
    Object.keys(exactFlashKeys).forEach((key) => {
      const input = exactInputRefs.current[key]
      if (!input) return
      input.focus({ preventScroll: true })
      input.select()
    })
  }, [exactFlashKeys])

  useEffect(() => {
    return () => {
      Object.values(exactFlashTimers.current).forEach((timerId) => clearTimeout(timerId))
    }
  }, [])

  const {
    buildingTypeOptions,
    constructionTypeOptions,
    commercialTypeOptions,
    landPurposeOptions,
  } = paramOptions

  const fieldClassName = (key, { fullWidth = false } = {}) =>
    [
      'oap-basics-field',
      paramErrors[key] ? 'oap-basics-field--error' : '',
      fullWidth ? 'oap-basics-field--full' : '',
    ]
      .filter(Boolean)
      .join(' ')

  const renderFieldLabel = (label, { required } = {}) => (
    <span className="oap-basics-field__label-row">
      <span className="oap-basics-field__label">{label}</span>
      {required ? (
        <span className="oap-basics-field__req" title={t('oap_basicsRequiredField')} aria-hidden>
          *
        </span>
      ) : null}
    </span>
  )

  const renderNumberField = (
    key,
    label,
    { suffix = '', placeholder, required, fullWidth = false } = {}
  ) => (
    <label key={key} className={fieldClassName(key, { fullWidth })}>
      {renderFieldLabel(label, { required })}
      <div className="oap-basics-field__suffix-wrap">
        <input
          type="text"
          inputMode="decimal"
          className={`oap-basics-field__input${suffix ? ' oap-basics-field__input--suffix' : ''}`}
          placeholder={placeholder}
          value={form[key]}
          onChange={(e) => onParamFieldChange(key, e.target.value.replace(/[^\d.,]/g, ''))}
        />
        {suffix ? <span className="oap-basics-field__suffix">{suffix}</span> : null}
      </div>
      {paramErrors[key] && <span className="oap-basics-field__error">{paramErrors[key]}</span>}
    </label>
  )

  const renderSelectField = (
    key,
    label,
    options,
    { placeholder, required, fullWidth = false, hideLabel = false } = {}
  ) => (
    <div
      key={key}
      className={`${fieldClassName(key, { fullWidth })}${hideLabel ? ' oap-basics-field--infield-label' : ''}`}
    >
      {hideLabel ? null : renderFieldLabel(label, { required })}
      <OapSelect
        value={form[key]}
        placeholder={placeholder}
        options={options}
        onChange={(nextValue) => onParamFieldChange(key, nextValue)}
        aria-label={label}
      />
      {paramErrors[key] && <span className="oap-basics-field__error">{paramErrors[key]}</span>}
    </div>
  )

  const renderFloorCombinedField = () => (
    <label
      key="floor-combined"
      className={`${fieldClassName('floor')}${paramErrors.totalFloors && !paramErrors.floor ? ' oap-basics-field--error' : ''}`}
    >
      {renderFieldLabel(t('addPropertyDetailsFloorLabel'), { required: true })}
      <div className="oap-basics-field__floor-row">
        <input
          type="text"
          inputMode="numeric"
          className="oap-basics-field__input"
          placeholder="0"
          value={form.floor}
          onChange={(e) => onParamFieldChange('floor', e.target.value.replace(/[^\d]/g, ''))}
        />
        <span className="oap-basics-field__floor-sep">{t('oap_floorOf')}</span>
        <input
          type="text"
          inputMode="numeric"
          className="oap-basics-field__input"
          placeholder="0"
          value={form.totalFloors}
          onChange={(e) => onParamFieldChange('totalFloors', e.target.value.replace(/[^\d]/g, ''))}
        />
      </div>
      {(paramErrors.floor || paramErrors.totalFloors) && (
        <span className="oap-basics-field__error">{paramErrors.floor || paramErrors.totalFloors}</span>
      )}
    </label>
  )

  const renderCountPicker = (key, Icon, label, { required = true } = {}) => {
    const rawDigits = String(form[key] ?? '').replace(/\D/g, '')
    const numericValue = parseInt(rawDigits, 10)
    const exactState = exactUi[key]
    const isPlusMode =
      Boolean(exactState?.open) || (Number.isFinite(numericValue) && numericValue >= 5)
    const exactDisplay =
      exactState?.draft !== undefined ? exactState.draft : rawDigits
    const activeValue = normalizeCountPickerValue(form[key])

    return (
      <div
        key={key}
        className={`oap-basics-count-picker oap-basics-field--full${paramErrors[key] ? ' oap-basics-count-picker--error' : ''}${isPlusMode ? ' oap-basics-count-picker--exact' : ''}`}
      >
        <span className="oap-basics-count-picker__icon" aria-hidden>
          <Icon size={24} strokeWidth={1.75} />
        </span>
        <div className="oap-basics-count-picker__controls">
          <div
            className="oap-basics-count-picker__track"
            role="radiogroup"
            aria-label={label}
            aria-required={required}
          >
            {COUNT_PICKER_VALUES.map((value, index) => {
              const isPlusOption = index === COUNT_PICKER_VALUES.length - 1
              const isActive = isPlusOption ? isPlusMode : !isPlusMode && activeValue === value
              const displayLabel = isPlusOption ? '5+' : value

              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  className={`oap-basics-count-picker__option${isActive ? ' oap-basics-count-picker__option--active' : ''}${isPlusOption ? ' oap-basics-count-picker__option--plus' : ''}`}
                  onClick={() => {
                    if (isPlusOption) {
                      const nextValue =
                        Number.isFinite(numericValue) && numericValue >= 5 ? String(numericValue) : '5'
                      onParamFieldChange(key, nextValue)
                      openExactUi(key, nextValue)
                      flashExactInput(key)
                      return
                    }
                    clearExactUi(key)
                    onParamFieldChange(key, value)
                  }}
                >
                  {displayLabel}
                </button>
              )
            })}
          </div>
          {isPlusMode ? (
            <input
              ref={(node) => {
                if (node) exactInputRefs.current[key] = node
                else delete exactInputRefs.current[key]
              }}
              type="text"
              inputMode="numeric"
              className={`oap-basics-count-picker__exact${exactFlashKeys[key] ? ' oap-basics-count-picker__exact--flash' : ''}`}
              value={exactDisplay}
              placeholder="5"
              aria-label={`${label} (5+)`}
              onFocus={(e) => {
                openExactUi(key, exactDisplay)
                e.target.select()
              }}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 2)
                openExactUi(key, digits)
                if (!digits) return

                const nextValue = parseInt(digits, 10)
                if (!Number.isFinite(nextValue) || nextValue <= 0) return

                if (nextValue < 5) {
                  clearExactUi(key)
                  onParamFieldChange(key, String(nextValue))
                  return
                }

                onParamFieldChange(key, String(nextValue))
              }}
              onBlur={(e) => {
                const draftDigits = String(e.target.value ?? '').replace(/\D/g, '')
                const nextValue = parseInt(draftDigits, 10)

                if (!draftDigits || !Number.isFinite(nextValue) || nextValue <= 0) {
                  onParamFieldChange(key, '5')
                  openExactUi(key, '5')
                  return
                }

                if (nextValue < 5) {
                  clearExactUi(key)
                  onParamFieldChange(key, String(nextValue))
                  return
                }

                onParamFieldChange(key, String(nextValue))
                openExactUi(key, String(nextValue))
              }}
            />
          ) : null}
        </div>
        {paramErrors[key] ? (
          <span className="oap-basics-field__error oap-basics-count-picker__error">{paramErrors[key]}</span>
        ) : null}
      </div>
    )
  }

  const renderParamsFields = () => {
    if (typeProfile === 'apartment' || typeProfile === 'apartments') {
      if (isJourneyParamsScreen) {
        return (
          <>
            {renderNumberField('area', t('addPropertyDetailsAreaLabel'), {
              placeholder: '0',
              required: true,
              suffix: t('squareMeters'),
            })}
            {renderNumberField('livingArea', t('addPropertyDetailsLivingAreaLabel'), {
              placeholder: '0',
              required: true,
              suffix: t('squareMeters'),
            })}
            {renderNumberField('yearBuilt', t('addPropertyDetailsYearBuiltLabel'), {
              placeholder: String(new Date().getFullYear()),
              required: true,
            })}
            <div className="oap-basics-params__counts-row">
              {renderCountPicker('rooms', Bed, t('addPropertyDetailsRoomsLabel'))}
              {renderCountPicker('bathrooms', Bath, t('addPropertyDetailsBathroomsShortLabel'))}
            </div>
            {renderFloorCombinedField()}
            {renderSelectField('buildingType', t('addPropertyDetailsBuildingMaterialLabel'), buildingTypeOptions, {
              placeholder: t('oap_paramsMaterialPlaceholder'),
              required: true,
            })}
            {renderSelectField(
              'constructionType',
              t('addPropertyConstructionTypePlaceholder'),
              constructionTypeOptions,
              {
                placeholder: t('oap_paramsConstructionPlaceholder'),
              }
            )}
          </>
        )
      }

      return (
        <>
          {renderNumberField('area', t('addPropertyDetailsAreaLabel'), {
            placeholder: '0',
            required: true,
              suffix: t('squareMeters'),
            })}
          {renderNumberField('livingArea', t('addPropertyDetailsLivingAreaLabel'), {
            placeholder: '0',
            required: true,
              suffix: t('squareMeters'),
            })}
          {renderCountPicker('rooms', Bed, t('addPropertyDetailsRoomsLabel'))}
          {renderCountPicker('bathrooms', Bath, t('addPropertyDetailsBathroomsShortLabel'))}
          {renderFloorCombinedField()}
          {renderNumberField('yearBuilt', t('addPropertyDetailsYearBuiltLabel'), {
            placeholder: String(new Date().getFullYear()),
            required: true,
          })}
          {renderSelectField('buildingType', t('addPropertyDetailsBuildingMaterialLabel'), buildingTypeOptions, {
            placeholder: t('oap_paramsMaterialPlaceholder'),
            required: true,
          })}
          {renderSelectField(
            'constructionType',
            t('addPropertyConstructionTypePlaceholder'),
            constructionTypeOptions,
            {
              placeholder: t('oap_paramsConstructionPlaceholder'),
            }
          )}
        </>
      )
    }

    if (typeProfile === 'house' || typeProfile === 'villa') {
      if (isJourneyParamsScreen) {
        return (
          <>
            {renderNumberField('landArea', t('addPropertyDetailsLandAreaLabel'), {
              placeholder: '0',
              required: true,
              suffix: t('squareMeters'),
            })}
            {renderNumberField('area', t('oap_paramsHouseAreaTotal'), {
              placeholder: '0',
              required: true,
              suffix: t('squareMeters'),
            })}
            {renderNumberField('yearBuilt', t('addPropertyDetailsYearBuiltLabel'), {
              placeholder: String(new Date().getFullYear()),
              required: true,
            })}
            {renderNumberField('totalFloors', t('addPropertyDetailsFloorsCountLabel'), {
              placeholder: '0',
              required: true,
            })}
            <div className="oap-basics-params__counts-row">
              {renderCountPicker('bedrooms', Bed, t('addPropertyDetailsRoomsLabel'))}
              {renderCountPicker('bathrooms', Bath, t('addPropertyDetailsBathroomsShortLabel'))}
            </div>
            {renderSelectField('buildingType', t('addPropertyDetailsBuildingMaterialLabel'), buildingTypeOptions, {
              placeholder: t('oap_paramsMaterialPlaceholder'),
              required: true,
            })}
            {renderSelectField(
              'constructionType',
              t('addPropertyConstructionTypePlaceholder'),
              constructionTypeOptions,
              {
                placeholder: t('oap_paramsConstructionPlaceholder'),
              }
            )}
          </>
        )
      }

      return (
        <>
          {renderNumberField('landArea', t('addPropertyDetailsLandAreaLabel'), {
            placeholder: '0',
            required: true,
              suffix: t('squareMeters'),
            })}
          {renderNumberField('area', t('oap_paramsHouseAreaTotal'), {
            placeholder: '0',
            required: true,
              suffix: t('squareMeters'),
            })}
          {renderCountPicker('bedrooms', Bed, t('addPropertyDetailsRoomsLabel'))}
          {renderCountPicker('bathrooms', Bath, t('addPropertyDetailsBathroomsShortLabel'))}
          {renderNumberField('totalFloors', t('addPropertyDetailsFloorsCountLabel'), {
            placeholder: '0',
            required: true,
          })}
          {renderNumberField('yearBuilt', t('addPropertyDetailsYearBuiltLabel'), {
            placeholder: String(new Date().getFullYear()),
            required: true,
          })}
          {renderSelectField('buildingType', t('addPropertyDetailsBuildingMaterialLabel'), buildingTypeOptions, {
            placeholder: t('oap_paramsMaterialPlaceholder'),
            required: true,
          })}
          {renderSelectField(
            'constructionType',
            t('addPropertyConstructionTypePlaceholder'),
            constructionTypeOptions,
            {
              placeholder: t('oap_paramsConstructionPlaceholder'),
            }
          )}
        </>
      )
    }

    if (typeProfile === 'commercial') {
      return (
        <>
          {renderNumberField('area', t('addPropertyDetailsAreaLabelShort'), {
            placeholder: '0',
            required: true,
              suffix: t('squareMeters'),
            })}
          {renderNumberField('floor', t('oap_paramsFloorLevel'), { placeholder: '0' })}
          {renderNumberField('totalFloors', t('addPropertyDetailsTotalFloorsLabel'), { placeholder: '0' })}
          {renderSelectField('commercialType', t('oap_paramsCommercialType'), commercialTypeOptions, {
            placeholder: t('addPropertyDetailsSelectType'),
            required: true,
          })}
          {renderSelectField(
            'constructionType',
            t('addPropertyConstructionTypePlaceholder'),
            constructionTypeOptions,
            {
              placeholder: t('oap_paramsConstructionPlaceholder'),
            }
          )}
        </>
      )
    }

    if (typeProfile === 'land') {
      return (
        <>
          {renderNumberField('landArea', t('addPropertyDetailsLandAreaLabel'), {
            placeholder: '0',
            required: true,
              suffix: t('squareMeters'),
            })}
          {renderSelectField('commercialType', t('oap_paramsLandPurpose'), landPurposeOptions, {
            placeholder: t('oap_paramsSelectPurpose'),
            required: true,
          })}
        </>
      )
    }

    return null
  }

  const showTypeLocation = mobileSection === 'all' || mobileSection === 'type-location'
  const showParams = mobileSection === 'all' || mobileSection === 'params'
  const isJourneyTypeScreen = hideWizardChrome && mobileSection === 'type-location'
  const isJourneyParamsScreen = hideWizardChrome && mobileSection === 'params'

  return (
    <section className="oap-basics-step" aria-labelledby="oap-basics-step-title">
      {!hideWizardChrome ? (
        <OwnerAddPropertyWizardStepHead
          titleId="oap-basics-step-title"
          title={t('oap_basicsTitle')}
          subtitle={t('oap_basicsSubtitle')}
          subtitleShort={t('oap_basicsSubtitleShort')}
          stepNumber={1}
        />
      ) : null}

      <div className="oap-basics-step__rows">
        {showTypeLocation ? (
          <>
            <div
              className={`oap-basics-step__row oap-basics-step__row--split oap-basics-step__row--type${isJourneyTypeScreen ? ' oap-basics-step__row--type-journey' : ''}`}
            >
              <div
                className={`oap-basics-step__zone oap-basics-step__zone--type${isJourneyTypeScreen ? ' oap-basics-step__zone--type-journey' : ' oap-basics-step__card'}`}
              >
                {isJourneyTypeScreen ? (
                  <h2 className="oap-basics-step__journey-type-title">{t('oap_journeyTypeTitle')}</h2>
                ) : (
                  <BasicsSectionHead
                    number={1}
                    title={t('oap_basicsTypeTitle')}
                    hint={t('oap_basicsTypeHint')}
                  />
                )}
                <div className="oap-basics-type-grid" role="listbox" aria-label={t('oap_basicsTypeAria')}>
                  {propertyTypeOptions.map((type) => {
                    const isActive = form.propertyType === type.value
                    const TypeIcon = type.Icon
                    return (
                      <button
                        key={type.value}
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        className={`oap-basics-type-card${isActive ? ' oap-basics-type-card--active' : ''}`}
                        onClick={() => onTypeSelect(type.value)}
                      >
                        <span className="oap-basics-type-card__icon" aria-hidden>
                          {type.iconSrc ? (
                            <img src={type.iconSrc} alt="" draggable={false} />
                          ) : (
                            <TypeIcon size={24} strokeWidth={1.85} />
                          )}
                        </span>
                        <span className="oap-basics-type-card__body">
                          <span className="oap-basics-type-card__title">{type.label}</span>
                          <span className="oap-basics-type-card__desc">{type.description}</span>
                        </span>
                        <span className="oap-basics-type-card__check" aria-hidden>
                          <Check size={16} strokeWidth={2.75} />
                        </span>
                      </button>
                    )
                  })}
                </div>
                {locationErrors.propertyType && (
                  <span className="oap-basics-field__error">{locationErrors.propertyType}</span>
                )}
              </div>

              {!hideWizardChrome ? (
                <OwnerAddPropertyStepAside layout="inline" {...OAP_BASICS_ROW_ASIDES.type} />
              ) : null}
            </div>

            <div
              className={`oap-basics-step__row oap-basics-step__row--full oap-basics-step__row--address${isJourneyTypeScreen ? ' oap-basics-step__row--address-journey' : ''}`}
            >
              <div
                className={
                  isJourneyTypeScreen
                    ? 'oap-basics-step__zone oap-basics-step__zone--address-journey'
                    : 'oap-basics-step__card'
                }
              >
                {isJourneyTypeScreen ? (
                  <h2 className="oap-basics-step__journey-type-title">{t('oap_journeyAddressTitle')}</h2>
                ) : (
                  <BasicsSectionHead
                    number={2}
                    title={t('oap_basicsAddressTitle')}
                    hint={t('oap_basicsAddressHint')}
                  />
                )}
                <OwnerAddPropertyLocationStep
                  embedded
                  wide={!isJourneyTypeScreen}
                  journeyMapAside={isJourneyTypeScreen}
                  form={form}
                  onFormPatch={onFormPatch}
                  errors={locationErrors}
                />
              </div>
            </div>
          </>
        ) : null}

        {showParams && form.propertyType ? (
          <div
            className={`oap-basics-step__row oap-basics-step__row--split oap-basics-step__row--params${isJourneyParamsScreen ? ' oap-basics-step__row--params-journey' : ''}`}
          >
            {!hideWizardChrome ? (
              <OwnerAddPropertyStepAside layout="inline" {...OAP_BASICS_ROW_ASIDES.params} />
            ) : null}

            <div
              className={`oap-basics-step__zone oap-basics-step__zone--params${isJourneyParamsScreen ? ' oap-basics-step__zone--params-journey' : ' oap-basics-step__card'}`}
            >
              {isJourneyParamsScreen ? (
                <h2 className="oap-basics-step__journey-type-title">{t('oap_journeyParamsTitle')}</h2>
              ) : (
                <BasicsSectionHead
                  number={mobileSection === 'params' ? 1 : 3}
                  title={t('oap_basicsParamsTitle')}
                  hint={paramsSubtitle || t('oap_basicsParamsHintDefault')}
                />
              )}
              <div className={`oap-basics-params__grid oap-basics-params__grid--${typeProfile}`}>
                {renderParamsFields()}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}

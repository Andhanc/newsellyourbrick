import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import OapSelect from '../components/OapSelect'
import OwnerAddPropertyLocationStep from './OwnerAddPropertyLocationStep'
import OwnerAddPropertyStepAside from '../components/OwnerAddPropertyStepAside'
import { OwnerAddPropertyWizardStepHead } from '../components/OwnerAddPropertyWizardStepLayout'
import { OAP_BASICS_ROW_ASIDES } from './oapWizardStepVisuals'
import './OwnerAddPropertyBasicsStep.css'
import '../components/OwnerAddPropertyStepAside.css'

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
}) {
  const { t } = useTranslation()
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
    { placeholder, required, fullWidth = false } = {}
  ) => (
    <div key={key} className={fieldClassName(key, { fullWidth })}>
      {renderFieldLabel(label, { required })}
      <OapSelect
        value={form[key]}
        placeholder={placeholder}
        options={options}
        onChange={(nextValue) => onParamFieldChange(key, nextValue)}
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

  const renderParamsFields = () => {
    if (typeProfile === 'apartment' || typeProfile === 'apartments') {
      return (
        <>
          {renderNumberField('area', t('addPropertyDetailsAreaLabel'), {
            placeholder: '0',
            required: true,
          })}
          {renderNumberField('livingArea', t('addPropertyDetailsLivingAreaLabel'), {
            placeholder: '0',
            required: true,
          })}
          {renderNumberField('rooms', t('addPropertyDetailsRoomsLabel'), {
            placeholder: '0',
            required: true,
          })}
          {renderFloorCombinedField()}
          {renderNumberField('bathrooms', t('addPropertyDetailsBathroomsShortLabel'), {
            placeholder: '0',
            required: true,
          })}
          {renderNumberField('yearBuilt', t('addPropertyDetailsYearBuiltLabel'), {
            placeholder: String(new Date().getFullYear()),
            required: true,
          })}
          {renderSelectField('buildingType', t('addPropertyDetailsBuildingMaterialLabel'), buildingTypeOptions, {
            placeholder: t('addPropertyDetailsSelectMaterial'),
            required: true,
          })}
          {renderSelectField(
            'constructionType',
            t('addPropertyConstructionTypePlaceholder'),
            constructionTypeOptions,
            {
              placeholder: t('addPropertyConstructionTypePlaceholder'),
            }
          )}
        </>
      )
    }

    if (typeProfile === 'house' || typeProfile === 'villa') {
      return (
        <>
          {renderNumberField('landArea', t('addPropertyDetailsLandAreaLabel'), {
            placeholder: '0',
            required: true,
          })}
          {renderNumberField('area', t('oap_paramsHouseAreaTotal'), {
            placeholder: '0',
            required: true,
          })}
          {renderNumberField('livingArea', t('oap_paramsHouseAreaLiving'), {
            placeholder: '0',
            required: true,
          })}
          {renderNumberField('totalFloors', t('addPropertyDetailsFloorsCountLabel'), {
            placeholder: '0',
            required: true,
          })}
          {renderNumberField('bathrooms', t('addPropertyDetailsBathroomsShortLabel'), {
            placeholder: '0',
            required: true,
          })}
          {renderNumberField('yearBuilt', t('addPropertyDetailsYearBuiltLabel'), {
            placeholder: String(new Date().getFullYear()),
            required: true,
          })}
          {renderSelectField('buildingType', t('addPropertyDetailsBuildingMaterialLabel'), buildingTypeOptions, {
            placeholder: t('addPropertyDetailsSelectMaterial'),
            required: true,
          })}
          {renderSelectField(
            'constructionType',
            t('addPropertyConstructionTypePlaceholder'),
            constructionTypeOptions,
            {
              placeholder: t('addPropertyConstructionTypePlaceholder'),
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
              placeholder: t('addPropertyConstructionTypePlaceholder'),
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

  return (
    <section className="oap-basics-step" aria-labelledby="oap-basics-step-title">
      <OwnerAddPropertyWizardStepHead
        titleId="oap-basics-step-title"
        title={t('oap_basicsTitle')}
        subtitle={t('oap_basicsSubtitle')}
        subtitleShort={t('oap_basicsSubtitleShort')}
        stepNumber={1}
      />

      <div className="oap-basics-step__rows">
        <div className="oap-basics-step__row oap-basics-step__row--split oap-basics-step__row--type">
          <div className="oap-basics-step__zone oap-basics-step__zone--type oap-basics-step__card">
            <BasicsSectionHead
              number={1}
              title={t('oap_basicsTypeTitle')}
              hint={t('oap_basicsTypeHint')}
            />
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
                      <TypeIcon size={24} strokeWidth={1.85} />
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

          <OwnerAddPropertyStepAside layout="inline" {...OAP_BASICS_ROW_ASIDES.type} />
        </div>

        <div className="oap-basics-step__row oap-basics-step__row--full oap-basics-step__row--address">
          <div className="oap-basics-step__card">
            <BasicsSectionHead
              number={2}
              title={t('oap_basicsAddressTitle')}
              hint={t('oap_basicsAddressHint')}
            />
            <OwnerAddPropertyLocationStep
              embedded
              wide
              form={form}
              onFormPatch={onFormPatch}
              errors={locationErrors}
            />
          </div>
        </div>

        {form.propertyType ? (
          <div className="oap-basics-step__row oap-basics-step__row--split oap-basics-step__row--params">
            <OwnerAddPropertyStepAside layout="inline" {...OAP_BASICS_ROW_ASIDES.params} />

            <div className="oap-basics-step__zone oap-basics-step__zone--params oap-basics-step__card">
              <BasicsSectionHead
                number={3}
                title={t('oap_basicsParamsTitle')}
                hint={paramsSubtitle || t('oap_basicsParamsHintDefault')}
              />
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

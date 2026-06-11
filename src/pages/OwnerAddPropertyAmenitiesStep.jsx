import { useTranslation } from 'react-i18next'
import { Check, Lightbulb } from 'lucide-react'
import { getAmenityGroupsForProfile } from '../utils/oapAmenityGroups'
import { getAmenityIcon } from './oapAmenityIcons'
import { OAP_AMENITIES_IMAGES } from './oapAmenitiesImages'
import './OwnerAddPropertyAmenitiesStep.css'
import './oapStepSidebar.css'

function AmenityCard({ item, isActive, embedded, onToggle }) {
  const ItemIcon = getAmenityIcon(item.tzKey)

  return (
    <button
      type="button"
      className={`oap-amenity-card${isActive ? ' oap-amenity-card--active' : ''}`}
      aria-pressed={isActive}
      title={item.label}
      onClick={() => onToggle(item.tzKey)}
    >
      <span className="oap-amenity-card__icon-wrap" aria-hidden>
        <ItemIcon size={16} strokeWidth={1.85} />
      </span>
      <span className="oap-amenity-card__label">{item.label}</span>
      <span className="oap-amenity-card__check" aria-hidden>
        <Check size={embedded ? 10 : 11} strokeWidth={3} />
      </span>
    </button>
  )
}

export default function OwnerAddPropertyAmenitiesStep({
  embedded = false,
  typeProfile,
  additionalAmenities,
  selectedAmenities,
  onAdditionalChange,
  onToggleAmenity,
}) {
  const { t } = useTranslation()
  const groups = getAmenityGroupsForProfile(typeProfile)

  const GROUP_TITLE_KEYS = {
    'residential-parking': 'addPropertyAmenitiesGroupResidentialParkingStorage',
    'residential-security': 'addPropertyAmenitiesGroupResidentialSecurity',
    'residential-comfort': 'addPropertyAmenitiesGroupResidentialComfort',
    'residential-outdoor': 'addPropertyAmenitiesGroupResidentialOutdoor',
    'commercial-parking': 'addPropertyAmenitiesGroupCommercialParking',
    'commercial-tech': 'addPropertyAmenitiesGroupCommercialTech',
    'commercial-security': 'addPropertyAmenitiesGroupCommercialBuilding',
    'land-utilities': 'addPropertyAmenitiesGroupLandUtilities',
    'land-access': 'addPropertyAmenitiesGroupLandAccess',
    'hotel-guest': 'addPropertyAmenitiesGroupHotelGuest',
    'hotel-fb': 'addPropertyAmenitiesGroupHotelFood',
    'hotel-transport': 'addPropertyAmenitiesGroupHotelParking',
    'hotel-tech': 'addPropertyAmenitiesGroupHotelTech',
  }

  const getGroupTitle = (group) => {
    const key = GROUP_TITLE_KEYS[group.id]
    return key ? t(key) : group.title
  }

  const groupedAmenities = (
    <div className="oap-amenities-groups">
      {groups.map((group) => (
        <section key={group.id} className="oap-amenities-group" aria-labelledby={`oap-amenity-group-${group.id}`}>
          <h3 id={`oap-amenity-group-${group.id}`} className="oap-amenities-group__title">
            {getGroupTitle(group)}
          </h3>
          <div className="oap-amenities-grid" role="group" aria-label={getGroupTitle(group)}>
            {group.items.map((item) => (
              <AmenityCard
                key={item.tzKey}
                item={item}
                isActive={selectedAmenities.includes(item.tzKey)}
                embedded={embedded}
                onToggle={onToggleAmenity}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )

  const extraField = (
    <label className="oap-amenities-extra">
      <span className="oap-amenities-extra__label">{t('addPropertyAmenitiesOtherLabel')}</span>
      <textarea
        className="oap-amenities-extra__textarea"
        rows={embedded ? 3 : 4}
        placeholder={t('addPropertyAmenitiesOtherPlaceholder')}
        value={additionalAmenities}
        onChange={(e) => onAdditionalChange(e.target.value)}
      />
    </label>
  )

  if (embedded) {
    return (
      <section className="oap-amenities-step oap-amenities-step--embedded">
        <div className="oap-amenities-step__card">
          {groupedAmenities}
          {extraField}
        </div>
      </section>
    )
  }

  return (
    <section className="oap-amenities-step" aria-labelledby="oap-amenities-step-title">
      <div className="oap-amenities-step__layout">
        <div className="oap-amenities-step__main">
          <header className="oap-amenities-step__head">
            <h2 id="oap-amenities-step-title" className="oap-amenities-step__title">
              {t('addPropertyAmenitiesTitle')}
            </h2>
            <p className="oap-amenities-step__subtitle">{t('addPropertyAmenitiesGroupsIntro')}</p>
          </header>

          <div className="oap-amenities-step__card">
            {groupedAmenities}
            {extraField}
          </div>
        </div>

        <aside className="oap-step-sidebar" aria-label={t('oap_wizardTipsTitle')}>
          <div className="oap-step-sidebar__head">
            <span className="oap-step-sidebar__icon" aria-hidden>
              <Lightbulb size={16} strokeWidth={2} />
            </span>
            <span className="oap-step-sidebar__title">{t('oap_wizardTipsTitle')}</span>
          </div>
          <p className="oap-step-sidebar__text">{t('addPropertyAmenitiesHint2Text')}</p>
          <p className="oap-step-sidebar__text">{t('addPropertyAmenitiesHint1Item2')}</p>
          <ul className="oap-step-sidebar__tips">
            <li>{t('addPropertyAmenitiesHint1Item1')}</li>
            <li>{t('addPropertyAmenitiesHint1Item3')}</li>
            <li>{t('addPropertyAmenitiesOtherLabel')}</li>
          </ul>
          <div className="oap-step-sidebar__illustration">
            <img
              src={OAP_AMENITIES_IMAGES.sidebarInterior}
              alt=""
              className="oap-step-sidebar__img"
            />
          </div>
        </aside>
      </div>
    </section>
  )
}

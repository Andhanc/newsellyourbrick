import { Sparkles, Check } from 'lucide-react'
import { getAmenityGroupsForProfile } from '../utils/oapAmenityGroups'

const AMENITIES_SUBTITLES = {
  apartment: 'Парковка, безопасность, комфорт и территория — как в фильтрах каталога',
  apartments: 'Парковка, безопасность, комфорт и территория — как в фильтрах каталога',
  house: 'Парковка, технологии и зона отдыха для загородного объекта',
  villa: 'Парковка, технологии и зона отдыха для премиального объекта',
  commercial: 'Логистика, инженерия и безопасность коммерческого помещения',
  land: 'Коммуникации и подъезд к участку',
  other: 'Инфраструктура нестандартного или гостиничного формата',
}

export default function OwnerAddPropertyAmenitiesStep({
  propertyType,
  typeProfile,
  propertyTypeLabel,
  additionalAmenities,
  selectedAmenities,
  onAdditionalChange,
  onToggleAmenity,
}) {
  const groups = getAmenityGroupsForProfile(typeProfile)
  const selectedCount = selectedAmenities.length

  return (
    <section className="oap-amenities-step" aria-labelledby="oap-amenities-step-title">
      <header className="oap-amenities-step__head">
        <span className="oap-amenities-step__badge" aria-hidden>
          <Sparkles size={22} strokeWidth={1.85} />
        </span>
        <div className="oap-amenities-step__head-text">
          <h2 id="oap-amenities-step-title" className="oap-amenities-step__title">
            Описание и удобства
          </h2>
          <p className="oap-amenities-step__subtitle">
            {propertyTypeLabel
              ? `${propertyTypeLabel}: ${AMENITIES_SUBTITLES[typeProfile] || AMENITIES_SUBTITLES.apartment}`
              : 'Отметьте удобства и добавьте детали — так объявление лучше находят в фильтрах'}
          </p>
        </div>
        {selectedCount > 0 && (
          <span className="oap-amenities-step__counter">
            <Check size={14} aria-hidden />
            {selectedCount}
          </span>
        )}
      </header>

      <div className="oap-amenities-step__card">
        <label className="oap-amenities-extra">
          <span className="oap-amenities-extra__label">Дополнительное описание удобств</span>
          <span className="oap-amenities-extra__hint">
            Необязательно — укажите особенности, которых нет в списке ниже
          </span>
          <textarea
            className="oap-amenities-extra__textarea"
            rows={5}
            placeholder="Например: встроенная система умного дома, проектор, музыкальная система и т.д."
            value={additionalAmenities}
            onChange={(e) => onAdditionalChange(e.target.value)}
          />
        </label>

        <p className="oap-amenities-step__intro">
          Отметьте удобства по разделам — набор зависит от типа объекта
          {propertyType ? ` (${propertyTypeLabel?.toLowerCase() || propertyType})` : ''}.
        </p>

        <div className="oap-amenities-groups">
          {groups.map((group) => (
            <div key={group.id} className="oap-amenities-group">
              <h3 className="oap-amenities-group__title">{group.title}</h3>
              <div className="oap-amenities-group__chips">
                {group.items.map((item) => {
                  const isActive = selectedAmenities.includes(item.tzKey)
                  return (
                    <button
                      key={item.tzKey}
                      type="button"
                      className={`oap-amenity-chip${isActive ? ' oap-amenity-chip--active' : ''}`}
                      aria-pressed={isActive}
                      onClick={() => onToggleAmenity(item.tzKey)}
                    >
                      {isActive && <Check size={14} className="oap-amenity-chip__icon" aria-hidden />}
                      <span>{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="oap-amenities-step__tip">
        Точный список удобств повышает доверие покупателей и помогает объявлению попадать в
        релевантные фильтры поиска.
      </p>
    </section>
  )
}

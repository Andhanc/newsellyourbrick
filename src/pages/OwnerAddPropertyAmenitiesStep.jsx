import { Check, Lightbulb } from 'lucide-react'
import { getAmenityGroupsForProfile } from '../utils/oapAmenityGroups'
import { getAmenityIcon } from './oapAmenityIcons'
import { OAP_AMENITIES_IMAGES } from './oapAmenitiesImages'
import './OwnerAddPropertyAmenitiesStep.css'
import './oapStepSidebar.css'

export default function OwnerAddPropertyAmenitiesStep({
  typeProfile,
  additionalAmenities,
  selectedAmenities,
  onAdditionalChange,
  onToggleAmenity,
}) {
  const groups = getAmenityGroupsForProfile(typeProfile)
  const allItems = groups.flatMap((group) => group.items)

  return (
    <section className="oap-amenities-step" aria-labelledby="oap-amenities-step-title">
      <div className="oap-amenities-step__layout">
        <div className="oap-amenities-step__main">
          <header className="oap-amenities-step__head">
            <h2 id="oap-amenities-step-title" className="oap-amenities-step__title">
              Выберите удобства для объекта
            </h2>
            <p className="oap-amenities-step__subtitle">
              Отметьте все, что есть в вашем объекте
            </p>
          </header>

          <div className="oap-amenities-step__card">
            <div className="oap-amenities-grid" role="group" aria-label="Удобства объекта">
              {allItems.map((item) => {
                const isActive = selectedAmenities.includes(item.tzKey)
                const ItemIcon = getAmenityIcon(item.tzKey)
                return (
                  <button
                    key={item.tzKey}
                    type="button"
                    className={`oap-amenity-card${isActive ? ' oap-amenity-card--active' : ''}`}
                    aria-pressed={isActive}
                    title={item.label}
                    onClick={() => onToggleAmenity(item.tzKey)}
                  >
                    <span className="oap-amenity-card__icon-wrap" aria-hidden>
                      <ItemIcon size={16} strokeWidth={1.85} />
                    </span>
                    <span className="oap-amenity-card__label">{item.label}</span>
                    {isActive && (
                      <span className="oap-amenity-card__check" aria-hidden>
                        <Check size={11} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            <label className="oap-amenities-extra">
              <span className="oap-amenities-extra__label">Дополнительное описание удобств</span>
              <textarea
                className="oap-amenities-extra__textarea"
                rows={4}
                placeholder="Например: встроенная система умного дома, проектор, музыкальная система и т.д."
                value={additionalAmenities}
                onChange={(e) => onAdditionalChange(e.target.value)}
              />
            </label>
          </div>
        </div>

        <aside className="oap-step-sidebar" aria-label="Подсказка">
          <div className="oap-step-sidebar__head">
            <span className="oap-step-sidebar__icon" aria-hidden>
              <Lightbulb size={16} strokeWidth={2} />
            </span>
            <span className="oap-step-sidebar__title">Подсказка</span>
          </div>
          <p className="oap-step-sidebar__text">
            Выбранные удобства будут отображаться в карточке объекта и привлекут больше внимания
            покупателей.
          </p>
          <p className="oap-step-sidebar__text">
            Отмечайте только то, что реально есть у объекта — это повышает доверие и снижает число
            уточняющих вопросов на просмотре.
          </p>
          <ul className="oap-step-sidebar__tips">
            <li>Парковка, лифт и охрана — часто решают при выборе квартиры</li>
            <li>Бассейн, сад и терраса усиливают премиальное позиционирование</li>
            <li>В поле ниже можно добавить редкие опции, которых нет в списке</li>
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

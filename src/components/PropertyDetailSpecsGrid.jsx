import {
  Maximize2,
  LayoutTemplate,
  LandPlot,
  CookingPot,
  BedDouble,
  ShowerHead,
  Layers,
  CalendarCheck,
  DoorOpen,
  Building2,
  Paintbrush,
  ShieldCheck,
  Flame,
  Droplets,
  Waves,
  Store,
  Clock3,
  Ruler,
} from 'lucide-react'
import './PropertyDetailSpecsGrid.css'

const SPEC_ICONS = {
  area: Maximize2,
  'living-area': LayoutTemplate,
  'land-area': LandPlot,
  'kitchen-area': CookingPot,
  bedrooms: BedDouble,
  bathrooms: ShowerHead,
  floor: Layers,
  year: CalendarCheck,
  rooms: DoorOpen,
  building: Building2,
  'floors-count': Building2,
  renovation: Paintbrush,
  condition: ShieldCheck,
  heating: Flame,
  'water-supply': Droplets,
  sewerage: Waves,
  'commercial-type': Store,
  'business-hours': Clock3,
}

const SPEC_ICON_BY_KEY = {
  land_area: 'land-area',
  area: 'area',
  living_area: 'living-area',
  kitchen_area: 'kitchen-area',
  bedrooms: 'bedrooms',
  bathrooms: 'bathrooms',
  floor: 'floor',
  total_floors: 'floors-count',
  building_material: 'building',
  building_type: 'building',
  year_built: 'year',
  rooms: 'rooms',
  renovation: 'renovation',
  condition: 'condition',
  heating: 'heating',
  water_supply: 'water-supply',
  sewerage: 'sewerage',
  commercial_type: 'commercial-type',
  business_hours: 'business-hours',
}

function resolveSpecIconComponent(item) {
  const iconKey = item?.icon || SPEC_ICON_BY_KEY[item?.key]
  if (iconKey && SPEC_ICONS[iconKey]) {
    return SPEC_ICONS[iconKey]
  }
  return Ruler
}

export default function PropertyDetailSpecsGrid({
  items = [],
  className = '',
  title = null,
  collapseAfter = null,
  expanded = true,
  onExpand,
  moreLabel,
}) {
  if (!items.length) return null

  const canCollapse =
    collapseAfter != null && items.length > collapseAfter && typeof onExpand === 'function'
  const visibleItems = canCollapse && !expanded ? items.slice(0, collapseAfter) : items
  const hiddenCount = canCollapse && !expanded ? items.length - collapseAfter : 0

  return (
    <section
      className={`property-specs-grid${className ? ` ${className}` : ''}`}
      aria-label={title || undefined}
    >
      {title ? <h3 className="property-specs-grid__title">{title}</h3> : null}
      <div className="property-specs-grid__list" role="list">
        {visibleItems.map((item) => {
          const Icon = resolveSpecIconComponent(item)
          return (
            <div
              key={item.key}
              className={`property-specs-grid__item${
                item.wide ? ' property-specs-grid__item--wide' : ''
              }`}
              role="listitem"
            >
              <span className="property-specs-grid__icon-wrap" aria-hidden>
                <Icon className="property-specs-grid__icon" size={24} strokeWidth={1.5} />
              </span>
              <span className="property-specs-grid__copy">
                <span className="property-specs-grid__label">{item.label}</span>
                <span className="property-specs-grid__value">{item.value}</span>
              </span>
            </div>
          )
        })}
      </div>
      {hiddenCount > 0 && moreLabel ? (
        <button type="button" className="property-specs-grid__more" onClick={onExpand}>
          {moreLabel}
        </button>
      ) : null}
    </section>
  )
}

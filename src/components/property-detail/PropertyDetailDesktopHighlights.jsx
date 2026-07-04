import { Maximize2, Bed, Bath, Home, Calendar, MapPin } from 'lucide-react'
import './PropertyDetailDesktopHighlights.css'

const ICONS = {
  area: Maximize2,
  bedrooms: Bed,
  rooms: Bed,
  bathrooms: Bath,
  property_type: Home,
  year_built: Calendar,
  location: MapPin,
}

/**
 * Горизонтальная лента ключевых характеристик объекта (desktop editorial).
 * @param {{ items: Array<{ key: string, label: string, value: string | number }> }} props
 */
export default function PropertyDetailDesktopHighlights({ items = [] }) {
  if (!items.length) return null

  return (
    <div className="pd-desktop-highlights" role="list">
      {items.map((item, index) => {
        const Icon = ICONS[item.key] || Home
        return (
          <div
            key={item.key}
            className="pd-desktop-highlights__item"
            role="listitem"
          >
            <span className="pd-desktop-highlights__icon" aria-hidden>
              <Icon size={18} strokeWidth={2} />
            </span>
            <span className="pd-desktop-highlights__copy">
              <span className="pd-desktop-highlights__value">{item.value}</span>
              <span className="pd-desktop-highlights__label">{item.label}</span>
            </span>
            {index < items.length - 1 ? (
              <span className="pd-desktop-highlights__divider" aria-hidden />
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

import { useTranslation } from 'react-i18next'
import { MdMap, MdSatelliteAlt } from 'react-icons/md'
import {
  isYandexSatelliteType,
  toggleYandexMapType,
} from '../utils/yandexMapEngine'

export default function MapTypeSwitcherButton({
  mapType,
  onChange,
  className = '',
  iconSize = 16,
}) {
  const { t } = useTranslation()
  const isSatellite = isYandexSatelliteType(mapType)
  const label = isSatellite ? t('mapTypeShowMap') : t('mapTypeShowSatellite')

  return (
    <button
      type="button"
      className={className}
      onClick={() => onChange?.(toggleYandexMapType(mapType))}
      aria-label={label}
      title={label}
      aria-pressed={isSatellite}
    >
      {isSatellite
        ? <MdMap size={iconSize} aria-hidden />
        : <MdSatelliteAlt size={iconSize} aria-hidden />}
    </button>
  )
}

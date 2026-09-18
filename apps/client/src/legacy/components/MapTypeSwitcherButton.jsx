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
  overlayOpen = false,
  onOverlayOpen,
}) {
  const { t } = useTranslation()
  const opensOverlay = typeof onOverlayOpen === 'function'
  const isSatellite = isYandexSatelliteType(mapType)
  const label = opensOverlay
    ? t('mapTypeShowSatellite')
    : (isSatellite ? t('mapTypeShowMap') : t('mapTypeShowSatellite'))

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        if (opensOverlay) {
          onOverlayOpen()
          return
        }
        onChange?.(toggleYandexMapType(mapType))
      }}
      aria-label={label}
      title={label}
      aria-pressed={opensOverlay ? undefined : isSatellite}
      aria-haspopup={opensOverlay ? 'dialog' : undefined}
      aria-expanded={opensOverlay ? overlayOpen : undefined}
    >
      {opensOverlay || !isSatellite
        ? <MdSatelliteAlt size={iconSize} aria-hidden />
        : <MdMap size={iconSize} aria-hidden />}
    </button>
  )
}

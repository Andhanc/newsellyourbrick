import { useEffect, useMemo, useState } from 'react'
import { isDefaultMapCoordinates, parsePropertyCoordinates } from '../utils/parsePropertyCoordinates'

export function usePropertyMapCoordinates(property) {
  const baseCoordinates = useMemo(() => parsePropertyCoordinates(property), [property?.coordinates])
  const [mapCoordinates, setMapCoordinates] = useState(null)
  const [isGeocoding, setIsGeocoding] = useState(false)

  useEffect(() => {
    const geocodeAddress = async () => {
      const hasValidCoordinates =
        baseCoordinates &&
        !isDefaultMapCoordinates(baseCoordinates) &&
        !Number.isNaN(baseCoordinates[0]) &&
        !Number.isNaN(baseCoordinates[1])

      if (hasValidCoordinates) {
        setMapCoordinates(baseCoordinates)
        return
      }

      const address = property?.location || property?.address
      if (address && !mapCoordinates) {
        setIsGeocoding(true)
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&accept-language=ru&addressdetails=1`,
          )
          if (response.ok) {
            const data = await response.json()
            if (data?.length > 0) {
              const lat = parseFloat(data[0].lat)
              const lon = parseFloat(data[0].lon)
              if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
                setMapCoordinates([lat, lon])
                return
              }
            }
          }
          setMapCoordinates(baseCoordinates)
        } catch {
          setMapCoordinates(baseCoordinates)
        } finally {
          setIsGeocoding(false)
        }
      } else if (!address) {
        setMapCoordinates(baseCoordinates)
      }
    }

    setMapCoordinates(null)
    geocodeAddress()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [property?.location, property?.address, property?.coordinates])

  const finalCoordinates = mapCoordinates || baseCoordinates
  const hasRealMarker =
    finalCoordinates && !isDefaultMapCoordinates(finalCoordinates)

  return { finalCoordinates, hasRealMarker, isGeocoding, baseCoordinates }
}

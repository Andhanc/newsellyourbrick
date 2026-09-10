import { useEffect, useMemo, useState } from 'react'
import { isDefaultMapCoordinates, parsePropertyCoordinates } from '../utils/parsePropertyCoordinates'
import { fetchNominatimFirst } from '../utils/oapLocationGeocode'

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
          const hit = await fetchNominatimFirst(address)
          if (hit) {
            const lat = parseFloat(hit.lat)
            const lon = parseFloat(hit.lon)
            if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
              setMapCoordinates([lat, lon])
              return
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

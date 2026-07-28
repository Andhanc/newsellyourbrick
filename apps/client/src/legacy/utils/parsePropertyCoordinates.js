const DEFAULT_COORDINATES = [53.9045, 27.5615]

export function parsePropertyCoordinates(property) {
  let coordinates = [...DEFAULT_COORDINATES]
  if (!property?.coordinates) return coordinates
  try {
    if (typeof property.coordinates === 'string') {
      const parsed = JSON.parse(property.coordinates)
      if (Array.isArray(parsed) && parsed.length >= 2) {
        const lat = parseFloat(parsed[0])
        const lng = parseFloat(parsed[1])
        if (!Number.isNaN(lat) && !Number.isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          coordinates = [lat, lng]
        }
      }
    } else if (Array.isArray(property.coordinates) && property.coordinates.length >= 2) {
      const lat = parseFloat(property.coordinates[0])
      const lng = parseFloat(property.coordinates[1])
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        coordinates = [lat, lng]
      }
    }
  } catch {
    /* ignore */
  }
  return coordinates
}

export function isDefaultMapCoordinates(coords) {
  return coords?.[0] === DEFAULT_COORDINATES[0] && coords?.[1] === DEFAULT_COORDINATES[1]
}

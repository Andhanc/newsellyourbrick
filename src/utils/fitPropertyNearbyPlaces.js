// Keep the property and every POI inside the usable map area, above overlay cards.
export function fitPropertyNearbyPlaces(map, property, places, filtersElement) {
  if (!map || !places?.length) return

  const points = [property, ...places].filter(
    (point) => Number.isFinite(point?.lat) && Number.isFinite(point?.lng),
  )
  if (points.length < 2) return

  map.resize()
  const frame = map.getContainer().getBoundingClientRect()
  const filters = filtersElement?.getBoundingClientRect()
  const overlaps = filters && filters.top < frame.bottom && filters.bottom > frame.top
    && filters.left < frame.right && filters.right > frame.left
  const bottom = overlaps ? frame.bottom - Math.max(frame.top, filters.top) + 32 : 48

  map.fitBounds([
    [Math.min(...points.map((point) => point.lng)), Math.min(...points.map((point) => point.lat))],
    [Math.max(...points.map((point) => point.lng)), Math.max(...points.map((point) => point.lat))],
  ], {
    padding: {
      top: Math.min(52, frame.height * 0.15),
      bottom: Math.min(bottom, frame.height * 0.55),
      left: Math.min(40, frame.width * 0.15),
      right: Math.min(76, frame.width * 0.25),
    },
    maxZoom: Math.min(14, map.getZoom()),
    duration: 650,
  })
}

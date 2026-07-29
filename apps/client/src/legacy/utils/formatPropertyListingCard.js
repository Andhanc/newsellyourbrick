import { getPropertyListPrice } from './propertySearchLocation'

/** Нормализация объекта для PropertyListingCard (поиск, сравнение, избранное). */
export function formatPropertyForListingCard(prop) {
  if (!prop) return prop
  const isAuction =
    prop.isAuction === true ||
    prop.is_auction === 1 ||
    prop.is_auction === true ||
    prop.is_auction === '1'
  const price = getPropertyListPrice(prop) ?? prop.price ?? 0
  const area = prop.area ?? prop.sqft ?? prop.living_area ?? null
  const rooms = prop.rooms ?? prop.beds ?? prop.bedrooms ?? null
  const bathrooms = prop.bathrooms ?? prop.baths ?? null
  return {
    ...prop,
    isAuction,
    title: prop.title || prop.name || '',
    name: prop.name || prop.title || '',
    location: prop.location || '',
    price,
    rooms,
    bedrooms: prop.bedrooms ?? prop.rooms ?? prop.beds ?? null,
    bathrooms,
    baths: prop.baths ?? prop.bathrooms ?? null,
    area,
    sqft: area,
    living_area: prop.living_area ?? null,
    images: prop.images || (prop.image ? [prop.image] : []),
    image: prop.image || (prop.images && prop.images[0] ? prop.images[0] : null),
  }
}

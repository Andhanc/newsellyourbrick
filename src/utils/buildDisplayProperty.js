import { parsePropertyCoordinates } from './parsePropertyCoordinates'

/** Нормализация полей объекта для блоков «Подробная информация» / удобства на детальной странице */
export function buildDisplayProperty(property) {
  if (!property) return null
  const coordinates = parsePropertyCoordinates(property)
  const propertyType = property.property_type || property.propertyType

  return {
    ...property,
    name: property.title || property.name,
    sqft: property.area || property.sqft,
    area: property.area || property.sqft,
    living_area: property.living_area || property.livingArea || null,
    beds: property.rooms ?? property.beds,
    rooms: property.rooms ?? property.beds,
    bedrooms:
      propertyType === 'house' || propertyType === 'villa'
        ? property.bedrooms !== undefined && property.bedrooms !== null
          ? property.bedrooms
          : null
        : property.bedrooms !== undefined && property.bedrooms !== null
          ? property.bedrooms
          : property.rooms !== undefined && property.rooms !== null
            ? property.rooms
            : null,
    bathrooms: property.bathrooms || property.baths || 0,
    coordinates,
    floor: property.floor !== undefined && property.floor !== null ? property.floor : null,
    total_floors:
      propertyType === 'house' || propertyType === 'villa'
        ? property.floors !== undefined && property.floors !== null
          ? property.floors
          : property.total_floors !== undefined && property.total_floors !== null
            ? property.total_floors
            : null
        : property.total_floors !== undefined && property.total_floors !== null
          ? property.total_floors
          : null,
    year_built:
      property.year_built !== undefined && property.year_built !== null ? property.year_built : null,
    property_type: propertyType,
    building_type: property.building_type || property.buildingType,
    land_area: property.land_area,
    renovation: property.renovation,
    condition: property.condition,
    heating: property.heating,
    water_supply: property.water_supply,
    sewerage: property.sewerage,
    commercial_type: property.commercial_type,
    business_hours: property.business_hours,
    additional_amenities:
      property.additional_amenities || property.additionalAmenities || null,
    amenities: property.amenities,
  }
}

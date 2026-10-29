/** Группы удобств по типу объекта (как в AddProperty / TZ). Подписи — через labelKey/titleKey + t(). */

const BY_TYPE = {
  apartment: [
    {
      id: 'residential-parking',
      titleKey: 'addPropertyAmenitiesGroupResidentialParkingStorage',
      items: [
        { labelKey: 'addPropertyAmenityUndergroundParking', tzKey: 'underground_parking' },
        { labelKey: 'addPropertyAmenityCoveredParking', tzKey: 'covered_parking' },
        { labelKey: 'addPropertyAmenityBikeStorage', tzKey: 'bike_storage' },
        { labelKey: 'addPropertyAmenityStorageRoom', tzKey: 'storage_room' },
      ],
    },
    {
      id: 'residential-security',
      titleKey: 'addPropertyAmenitiesGroupResidentialSecurity',
      items: [
        { labelKey: 'addPropertyAmenitySecurity247', tzKey: 'security_24_7' },
        { labelKey: 'addPropertyAmenityCctv', tzKey: 'cctv' },
        { labelKey: 'addPropertyAmenityVideoIntercom', tzKey: 'video_intercom' },
        { labelKey: 'addPropertyAmenitiesElevator', tzKey: 'elevator' },
      ],
    },
    {
      id: 'residential-comfort',
      titleKey: 'addPropertyAmenitiesGroupResidentialComfort',
      items: [
        { labelKey: 'addPropertyAmenityAirConditioning', tzKey: 'air_conditioning' },
        { labelKey: 'addPropertyAmenityFireplace', tzKey: 'fireplace' },
        { labelKey: 'addPropertyAmenitySmartHome', tzKey: 'smart_home' },
        { labelKey: 'addPropertyAmenitySolarPanels', tzKey: 'solar_panels' },
        { labelKey: 'addPropertyAmenityFibreInternet', tzKey: 'fibre_internet' },
      ],
    },
    {
      id: 'residential-outdoor',
      titleKey: 'addPropertyAmenitiesGroupResidentialOutdoor',
      items: [
        { labelKey: 'addPropertyAmenityPoolCommunal', tzKey: 'pool_communal' },
        { labelKey: 'addPropertyAmenityGarden', tzKey: 'garden' },
        { labelKey: 'addPropertyAmenitiesBalcony', tzKey: 'balcony' },
        { labelKey: 'addPropertyAmenityRooftopTerrace', tzKey: 'rooftop_terrace' },
      ],
    },
  ],
  house: [
    {
      id: 'residential-parking',
      titleKey: 'addPropertyAmenitiesGroupResidentialParkingStorage',
      items: [
        { labelKey: 'addPropertyAmenityUndergroundParking', tzKey: 'underground_parking' },
        { labelKey: 'addPropertyAmenityPrivateGarage', tzKey: 'private_garage' },
        { labelKey: 'addPropertyAmenityOpenParking', tzKey: 'open_parking' },
        { labelKey: 'addPropertyAmenityStorageRoom', tzKey: 'storage_room' },
      ],
    },
    {
      id: 'residential-comfort',
      titleKey: 'addPropertyAmenitiesGroupResidentialComfort',
      items: [
        { labelKey: 'addPropertyAmenityAirConditioning', tzKey: 'air_conditioning' },
        { labelKey: 'addPropertyAmenityFireplace', tzKey: 'fireplace' },
        { labelKey: 'addPropertyAmenitySmartHome', tzKey: 'smart_home' },
        { labelKey: 'addPropertyAmenitySolarPanels', tzKey: 'solar_panels' },
        { labelKey: 'addPropertyAmenityFibreInternet', tzKey: 'fibre_internet' },
      ],
    },
    {
      id: 'residential-outdoor',
      titleKey: 'addPropertyAmenitiesGroupResidentialOutdoor',
      items: [
        { labelKey: 'addPropertyAmenityPoolPrivate', tzKey: 'pool_private' },
        { labelKey: 'addPropertyAmenityGarden', tzKey: 'garden' },
        { labelKey: 'addPropertyAmenitySauna', tzKey: 'sauna' },
        { labelKey: 'addPropertyAmenitySpa', tzKey: 'spa' },
        { labelKey: 'addPropertyAmenityRooftopTerrace', tzKey: 'rooftop_terrace' },
      ],
    },
  ],
  commercial: [
    {
      id: 'commercial-parking',
      titleKey: 'addPropertyAmenitiesGroupCommercialParking',
      items: [
        { labelKey: 'addPropertyAmenitySurfaceParking', tzKey: 'surface_parking' },
        { labelKey: 'addPropertyAmenityUndergroundParking', tzKey: 'underground_parking' },
        { labelKey: 'addPropertyAmenityEvCharging', tzKey: 'ev_charging' },
        { labelKey: 'addPropertyAmenityLoadingDock', tzKey: 'loading_dock' },
      ],
    },
    {
      id: 'commercial-tech',
      titleKey: 'addPropertyAmenitiesGroupCommercialTech',
      items: [
        { labelKey: 'addPropertyAmenityRaisedFloor', tzKey: 'raised_floor' },
        { labelKey: 'addPropertyAmenityHvacSystem', tzKey: 'hvac_system' },
        { labelKey: 'addPropertyAmenityThreePhasePower', tzKey: 'three_phase_power' },
        { labelKey: 'addPropertyAmenityBackupGenerator', tzKey: 'backup_generator' },
        { labelKey: 'addPropertyAmenityFibreInternet', tzKey: 'fibre_internet' },
      ],
    },
    {
      id: 'commercial-building',
      titleKey: 'addPropertyAmenitiesGroupCommercialBuilding',
      items: [
        { labelKey: 'addPropertyAmenitySecurity247', tzKey: 'security_24_7' },
        { labelKey: 'addPropertyAmenityCctv', tzKey: 'cctv' },
        { labelKey: 'addPropertyAmenityAccessControl', tzKey: 'access_control' },
        { labelKey: 'addPropertyAmenitiesElevator', tzKey: 'elevator' },
        { labelKey: 'addPropertyAmenityFreightElevator', tzKey: 'freight_elevator' },
      ],
    },
  ],
  land: [
    {
      id: 'land-utilities',
      titleKey: 'addPropertyAmenitiesGroupLandUtilities',
      items: [
        { labelKey: 'addPropertyAmenityElectricityConnected', tzKey: 'electricity_connected' },
        { labelKey: 'addPropertyAmenityInternetConnected', tzKey: 'internet_connected' },
        { labelKey: 'addPropertyAmenityWaterConnected', tzKey: 'water_connected' },
        { labelKey: 'addPropertyAmenityGasConnected', tzKey: 'gas_connected' },
        { labelKey: 'addPropertyAmenitySewageConnected', tzKey: 'sewage_connected' },
      ],
    },
    {
      id: 'land-access',
      titleKey: 'addPropertyAmenitiesGroupLandAccess',
      items: [
        { labelKey: 'addPropertyAmenityRoadAccessPaved', tzKey: 'road_access_paved' },
        { labelKey: 'addPropertyAmenityRoadAccessDirt', tzKey: 'road_access_dirt' },
        { labelKey: 'addPropertyAmenitySeaFrontage', tzKey: 'sea_frontage' },
        { labelKey: 'addPropertyAmenityTreesOnPlot', tzKey: 'trees_on_plot' },
        { labelKey: 'addPropertyAmenityExistingStructures', tzKey: 'existing_structures' },
      ],
    },
  ],
  other: [
    {
      id: 'hotel-guest',
      titleKey: 'addPropertyAmenitiesGroupHotelGuest',
      items: [
        { labelKey: 'addPropertyAmenityPoolOutdoor', tzKey: 'pool_outdoor' },
        { labelKey: 'addPropertyAmenityGym', tzKey: 'gym' },
        { labelKey: 'addPropertyAmenitySauna', tzKey: 'sauna' },
        { labelKey: 'addPropertyAmenitySpa', tzKey: 'spa_wellness' },
        { labelKey: 'addPropertyAmenityTennisCourt', tzKey: 'tennis_court' },
      ],
    },
    {
      id: 'hotel-fb',
      titleKey: 'addPropertyAmenitiesGroupHotelFood',
      items: [
        { labelKey: 'addPropertyAmenityRestaurant', tzKey: 'restaurant' },
        { labelKey: 'addPropertyAmenityBarLounge', tzKey: 'bar_lounge' },
      ],
    },
    {
      id: 'hotel-transport',
      titleKey: 'addPropertyAmenitiesGroupHotelParking',
      items: [
        { labelKey: 'addPropertyAmenityParkingOnsite', tzKey: 'parking_onsite' },
        { labelKey: 'addPropertyAmenityUndergroundParking', tzKey: 'underground_parking' },
        { labelKey: 'addPropertyAmenityEvCharging', tzKey: 'ev_charging' },
        { labelKey: 'addPropertyAmenityHelipad', tzKey: 'helipad' },
      ],
    },
    {
      id: 'hotel-tech',
      titleKey: 'addPropertyAmenitiesGroupHotelTech',
      items: [
        { labelKey: 'addPropertyAmenitySmartBuildingBms', tzKey: 'smart_building_bms' },
        { labelKey: 'addPropertyAmenitySolarPanels', tzKey: 'solar_panels' },
        { labelKey: 'addPropertyAmenityEnergyCertificate', tzKey: 'energy_certificate' },
        { labelKey: 'addPropertyAmenityBackupGenerator', tzKey: 'backup_generator' },
      ],
    },
  ],
}

BY_TYPE.apartments = BY_TYPE.apartment
BY_TYPE.villa = BY_TYPE.house

export function getAmenityGroupsForProfile(typeProfile) {
  return BY_TYPE[typeProfile] || BY_TYPE.apartment
}

export function getAmenityTzKeysForProfile(typeProfile) {
  return getAmenityGroupsForProfile(typeProfile).flatMap((group) =>
    group.items.map((item) => item.tzKey)
  )
}

/** Localized group title */
export function getAmenityGroupTitle(t, group) {
  if (!group) return ''
  if (group.titleKey && typeof t === 'function') {
    const translated = t(group.titleKey)
    if (translated && translated !== group.titleKey) return translated
  }
  return group.title || group.titleKey || ''
}

/** Localized amenity item label */
export function getAmenityItemLabel(t, item) {
  if (!item) return ''
  if (item.labelKey && typeof t === 'function') {
    const translated = t(item.labelKey)
    if (translated && translated !== item.labelKey) return translated
  }
  return item.label || item.labelKey || ''
}

/** Группы удобств по типу объекта (как в AddProperty / TZ) */

const BY_TYPE = {
  apartment: [
    {
      id: 'residential-parking',
      title: 'Парковка и хранение',
      items: [
        { label: 'Подземный паркинг', tzKey: 'underground_parking' },
        { label: 'Крытая парковка', tzKey: 'covered_parking' },
        { label: 'Велостоянка', tzKey: 'bike_storage' },
        { label: 'Кладовая', tzKey: 'storage_room' },
      ],
    },
    {
      id: 'residential-security',
      title: 'Здание и безопасность',
      items: [
        { label: 'Круглосуточная охрана', tzKey: 'security_24_7' },
        { label: 'Видеонаблюдение', tzKey: 'cctv' },
        { label: 'Видеодомофон', tzKey: 'video_intercom' },
        { label: 'Лифт', tzKey: 'elevator' },
      ],
    },
    {
      id: 'residential-comfort',
      title: 'Технологии и комфорт',
      items: [
        { label: 'Кондиционирование', tzKey: 'air_conditioning' },
        { label: 'Камин', tzKey: 'fireplace' },
        { label: 'Умный дом', tzKey: 'smart_home' },
        { label: 'Солнечные панели', tzKey: 'solar_panels' },
        { label: 'Оптоволоконный интернет', tzKey: 'fibre_internet' },
      ],
    },
    {
      id: 'residential-outdoor',
      title: 'Территория и отдых',
      items: [
        { label: 'Общий бассейн', tzKey: 'pool_communal' },
        { label: 'Сад / территория', tzKey: 'garden' },
        { label: 'Балкон', tzKey: 'balcony' },
        { label: 'Эксплуатируемая кровля', tzKey: 'rooftop_terrace' },
      ],
    },
  ],
  house: [
    {
      id: 'residential-parking',
      title: 'Парковка и хранение',
      items: [
        { label: 'Подземный паркинг', tzKey: 'underground_parking' },
        { label: 'Отдельный гараж', tzKey: 'private_garage' },
        { label: 'Открытая парковка', tzKey: 'open_parking' },
        { label: 'Кладовая', tzKey: 'storage_room' },
      ],
    },
    {
      id: 'residential-comfort',
      title: 'Технологии и комфорт',
      items: [
        { label: 'Кондиционирование', tzKey: 'air_conditioning' },
        { label: 'Камин', tzKey: 'fireplace' },
        { label: 'Умный дом', tzKey: 'smart_home' },
        { label: 'Солнечные панели', tzKey: 'solar_panels' },
        { label: 'Оптоволоконный интернет', tzKey: 'fibre_internet' },
      ],
    },
    {
      id: 'residential-outdoor',
      title: 'Территория и отдых',
      items: [
        { label: 'Частный бассейн', tzKey: 'pool_private' },
        { label: 'Сад / территория', tzKey: 'garden' },
        { label: 'Сауна', tzKey: 'sauna' },
        { label: 'SPA / велнес', tzKey: 'spa' },
        { label: 'Эксплуатируемая кровля', tzKey: 'rooftop_terrace' },
      ],
    },
  ],
  commercial: [
    {
      id: 'commercial-parking',
      title: 'Парковка и логистика',
      items: [
        { label: 'Наземная парковка', tzKey: 'surface_parking' },
        { label: 'Подземный паркинг', tzKey: 'underground_parking' },
        { label: 'Зарядка для электромобиля', tzKey: 'ev_charging' },
        { label: 'Погрузочная зона', tzKey: 'loading_dock' },
      ],
    },
    {
      id: 'commercial-tech',
      title: 'Технические характеристики',
      items: [
        { label: 'Фальшпол', tzKey: 'raised_floor' },
        { label: 'Система вентиляции и климата', tzKey: 'hvac_system' },
        { label: 'Трехфазная электросеть', tzKey: 'three_phase_power' },
        { label: 'Резервный генератор', tzKey: 'backup_generator' },
        { label: 'Оптоволоконный интернет', tzKey: 'fibre_internet' },
      ],
    },
    {
      id: 'commercial-building',
      title: 'Здание и безопасность',
      items: [
        { label: 'Круглосуточная охрана', tzKey: 'security_24_7' },
        { label: 'Видеонаблюдение', tzKey: 'cctv' },
        { label: 'Система контроля доступа', tzKey: 'access_control' },
        { label: 'Лифт', tzKey: 'elevator' },
        { label: 'Грузовой лифт', tzKey: 'freight_elevator' },
      ],
    },
  ],
  land: [
    {
      id: 'land-utilities',
      title: 'Подключенные коммуникации',
      items: [
        { label: 'Электричество подключено', tzKey: 'electricity_connected' },
        { label: 'Интернет подключен', tzKey: 'internet_connected' },
        { label: 'Водопровод подключен', tzKey: 'water_connected' },
        { label: 'Газ подключен', tzKey: 'gas_connected' },
        { label: 'Канализация подключена', tzKey: 'sewage_connected' },
      ],
    },
    {
      id: 'land-access',
      title: 'Подъезд и рельеф',
      items: [
        { label: 'Асфальтированный подъезд', tzKey: 'road_access_paved' },
        { label: 'Грунтовая дорога', tzKey: 'road_access_dirt' },
        { label: 'Выход к береговой линии', tzKey: 'sea_frontage' },
        { label: 'Деревья на участке', tzKey: 'trees_on_plot' },
        { label: 'Существующие постройки', tzKey: 'existing_structures' },
      ],
    },
  ],
  other: [
    {
      id: 'hotel-guest',
      title: 'Инфраструктура для гостей',
      items: [
        { label: 'Открытый бассейн', tzKey: 'pool_outdoor' },
        { label: 'Фитнес-центр', tzKey: 'gym' },
        { label: 'Сауна', tzKey: 'sauna' },
        { label: 'SPA / велнес', tzKey: 'spa_wellness' },
        { label: 'Теннисный корт', tzKey: 'tennis_court' },
      ],
    },
    {
      id: 'hotel-fb',
      title: 'Ресторанная инфраструктура',
      items: [
        { label: 'Ресторан', tzKey: 'restaurant' },
        { label: 'Бар / лаундж', tzKey: 'bar_lounge' },
      ],
    },
    {
      id: 'hotel-transport',
      title: 'Парковка и транспорт',
      items: [
        { label: 'Парковка на территории', tzKey: 'parking_onsite' },
        { label: 'Подземный паркинг', tzKey: 'underground_parking' },
        { label: 'Зарядка для электромобиля', tzKey: 'ev_charging' },
        { label: 'Вертолетная площадка', tzKey: 'helipad' },
      ],
    },
    {
      id: 'hotel-tech',
      title: 'Технологии и энергоэффективность',
      items: [
        { label: 'Система управления зданием (BMS)', tzKey: 'smart_building_bms' },
        { label: 'Солнечные панели', tzKey: 'solar_panels' },
        { label: 'Класс энергоэффективности', tzKey: 'energy_certificate' },
        { label: 'Резервный генератор', tzKey: 'backup_generator' },
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

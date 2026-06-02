/** Подписи удобств по TZ (ключи из tz.txt / AddProperty tzKey) */
export const TZ_AMENITY_LABELS_RU = {
  underground_parking: 'Подземный паркинг',
  private_garage: 'Отдельный гараж',
  covered_parking: 'Крытое парковочное место',
  open_parking: 'Открытое парковочное место',
  ev_charging: 'Зарядка для электромобиля',
  storage_room: 'Кладовая',
  bike_storage: 'Велостоянка',
  pool_private: 'Частный бассейн',
  pool_communal: 'Общий бассейн комплекса',
  jacuzzi: 'Джакузи / Hot tub',
  tennis_court: 'Теннисный корт',
  padel_court: 'Падел-корт',
  basketball_court: 'Баскетбольная площадка',
  garden: 'Сад / Придомовая территория',
  rooftop_terrace: 'Эксплуатируемая кровля',
  balcony: 'Балкон / Лоджия',
  bbq_area: 'Зона барбекю',
  beach_access: 'Прямой выход к пляжу',
  playground: 'Детская площадка',
  golf_course_on_site: 'Гольф-поле на территории',
  security_24_7: 'Круглосуточная охрана / Консьерж',
  cctv: 'Видеонаблюдение',
  video_intercom: 'Видеодомофон',
  gated_community: 'Закрытый охраняемый комплекс',
  elevator: 'Лифт',
  wheelchair_accessible: 'Доступность МГН',
  smart_home: 'Система умного дома',
  smart_lighting: 'Умное освещение',
  smart_climate: 'Умное управление климатом',
  smart_security: 'Умные замки / охранная система',
  solar_panels: 'Солнечные панели',
  fibre_internet: 'Оптоволокно',
  air_conditioning: 'Кондиционирование',
  central_heating: 'Центральное отопление',
  underfloor_heating: 'Тёплый пол',
  fireplace: 'Камин',
  double_glazing: 'Двойной стеклопакет',
  energy_certificate: 'Класс энергоэффективности',
  gym: 'Фитнес-зал',
  spa: 'SPA / Велнес-центр',
  sauna: 'Сауна',
  cinema_room: 'Домашний кинотеатр',
  wine_cellar: 'Винный погреб',
  sea_view: 'Вид на море',
  mountain_view: 'Вид на горы',
  golf_view: 'Вид на гольф-поле',
  city_view: 'Вид на город',
  garden_view: 'Вид на сад / парк',
  surface_parking: 'Наземная парковка',
  loading_dock: 'Погрузочный док',
  raised_floor: 'Фальшпол',
  suspended_ceiling: 'Подвесной потолок',
  three_phase_power: 'Трёхфазная электросеть',
  backup_generator: 'Резервный генератор',
  hvac_system: 'Система вентиляции / климат',
  reception_lobby: 'Ресепшн / Лобби',
  access_control: 'Система контроля доступа',
  freight_elevator: 'Грузовой лифт',
  conference_rooms: 'Переговорные комнаты',
  parking: 'Парковка',
  garage: 'Гараж',
  pool: 'Бассейн',
  electricity: 'Электричество',
  internet: 'Интернет',
  security: 'Охрана',
  furniture: 'Мебель',
}

const LEGACY_AMENITY_LABELS_RU = {
  balcony: 'Балкон',
  parking: 'Парковка',
  elevator: 'Лифт',
  garage: 'Гараж',
  pool: 'Бассейн',
  garden: 'Сад',
  electricity: 'Электричество',
  internet: 'Интернет',
  security: 'Охрана 24/7',
  furniture: 'Мебель',
  feature1: 'Подземная парковка',
  feature2: 'Ресторан',
  feature3: 'Стиральная машина',
  feature4: 'Бар / лаундж',
  feature5: 'Контроль доступа',
  feature6: 'Видеонаблюдение',
  feature7: 'Лоджия',
  feature8: 'Кладовая',
  feature9: 'Эксплуатируемая кровля / терраса',
  feature10: 'Фальшпол',
  feature11: 'Отдельный гараж',
  feature12: 'EV-зарядка / велостоянка',
  feature13: 'Фитнес-центр',
  feature14: 'Сауна',
  feature15: 'SPA / велнес',
  feature16: 'Видеодомофон',
  feature17: 'Круглосуточная охрана',
  feature18: 'Гардеробная',
  feature19: 'Камин',
  feature20: 'Система умного дома',
  feature21: 'Солнечные панели',
  feature22: 'Система вентиляции / HVAC',
  feature23: 'Центральное кондиционирование',
  feature24: 'Водопровод / энергоэффективность',
  feature25: 'Резервный генератор / loading dock',
  feature26: 'Грузовой лифт / канализация',
}

export function getAmenityLabelRu(key) {
  if (!key) return ''
  return TZ_AMENITY_LABELS_RU[key] || LEGACY_AMENITY_LABELS_RU[key] || String(key).replace(/_/g, ' ')
}

function parseJsonArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (value == null || value === '') return []
  if (typeof value !== 'string') return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter(Boolean) : []
  } catch {
    return []
  }
}

const LEGACY_BOOLEAN_KEYS = [
  'balcony',
  'parking',
  'elevator',
  'garage',
  'pool',
  'garden',
  'electricity',
  'internet',
  'security',
  'furniture',
]

/** Собирает уникальные ключи удобств из amenities[], tz_amenities_json и legacy-флагов */
export function collectAmenityKeys(property) {
  if (!property) return []
  const keys = new Set()

  parseJsonArray(property.amenities).forEach((k) => keys.add(k))

  parseJsonArray(property.tz_amenities_json).forEach((k) => keys.add(k))

  LEGACY_BOOLEAN_KEYS.forEach((key) => {
    const v = property[key]
    if (v === 1 || v === true || v === '1') keys.add(key)
  })

  for (let i = 1; i <= 26; i++) {
    const featureKey = `feature${i}`
    const v = property[featureKey]
    if (v === 1 || v === true || v === '1') keys.add(featureKey)
  }

  return Array.from(keys)
}

/** Человекочитаемые подписи для отображения в UI */
export function getResolvedAmenityLabels(property) {
  return collectAmenityKeys(property).map((key) => getAmenityLabelRu(key))
}

/**
 * Города и районы для калькулятора цены (slug'и для Fotocasa / Idealista / Pisos).
 * Район: keywords — фильтрация объявлений по тексту адреса, если портал отдал весь город.
 */

export const SPAIN_CITIES = [
  { value: 'barcelona', label: 'Барселона', region: 'Каталония', fotocasa: 'barcelona', idealista: 'barcelona', pisos: 'barcelona' },
  { value: 'madrid', label: 'Мадрид', region: 'Мадрид и регион', fotocasa: 'madrid', idealista: 'madrid', pisos: 'madrid' },
  { value: 'valencia', label: 'Валенсия', region: 'Валенсийское сообщество', fotocasa: 'valencia', idealista: 'valencia', pisos: 'valencia' },
  { value: 'sevilla', label: 'Севилья', region: 'Андалусия', fotocasa: 'sevilla', idealista: 'sevilla', pisos: 'sevilla' },
  { value: 'malaga', label: 'Малага', region: 'Андалусия', fotocasa: 'malaga', idealista: 'malaga', pisos: 'malaga' },
  { value: 'marbella', label: 'Марбелья', region: 'Андалусия', fotocasa: 'marbella', idealista: 'marbella', pisos: 'marbella' },
  { value: 'bilbao', label: 'Бильбао', region: 'Страна Басков', fotocasa: 'bilbao', idealista: 'bilbao', pisos: 'bilbao' },
  { value: 'alicante', label: 'Аликанте', region: 'Валенсийское сообщество', fotocasa: 'alicante', idealista: 'alicante', pisos: 'alicante' },
  { value: 'granada', label: 'Гранада', region: 'Андалусия', fotocasa: 'granada', idealista: 'granada', pisos: 'granada' },
  { value: 'murcia', label: 'Мурсия', region: 'Мурсия', fotocasa: 'murcia', idealista: 'murcia', pisos: 'murcia' },
  { value: 'castellon', label: 'Кастельон', region: 'Валенсийское сообщество', fotocasa: 'castellon', idealista: 'castellon', pisos: 'castellon-de-la-plana' },
  { value: 'torrevieja', label: 'Торревьеха', region: 'Валенсийское сообщество', fotocasa: 'torrevieja', idealista: 'torrevieja', pisos: 'torrevieja' },
  { value: 'benidorm', label: 'Бенидорм', region: 'Валенсийское сообщество', fotocasa: 'benidorm', idealista: 'benidorm', pisos: 'benidorm' },
  { value: 'denia', label: 'Дения', region: 'Валенсийское сообщество', fotocasa: 'denia', idealista: 'denia', pisos: 'denia' },
  { value: 'javea', label: 'Хавеа', region: 'Валенсийское сообщество', fotocasa: 'javea', idealista: 'javea', pisos: 'javea' },
  { value: 'calpe', label: 'Калпе', region: 'Валенсийское сообщество', fotocasa: 'calpe', idealista: 'calpe', pisos: 'calpe' },
  { value: 'altea', label: 'Альтеа', region: 'Валенсийское сообщество', fotocasa: 'altea', idealista: 'altea', pisos: 'altea' },
  { value: 'santa-pola', label: 'Санта-Пола', region: 'Валенсийское сообщество', fotocasa: 'santa-pola', idealista: 'santa-pola', pisos: 'santa-pola' },
  { value: 'villajoyosa', label: 'Виллахойоса', region: 'Валенсийское сообщество', fotocasa: 'villajoyosa', idealista: 'villajoyosa', pisos: 'villajoyosa' },
  { value: 'gandia', label: 'Гандия', region: 'Валенсийское сообщество', fotocasa: 'gandia', idealista: 'gandia', pisos: 'gandia' },
  { value: 'oliva', label: 'Олива', region: 'Валенсийское сообщество', fotocasa: 'oliva', idealista: 'oliva', pisos: 'oliva' },
  { value: 'piles', label: 'Пилес', region: 'Валенсийское сообщество', fotocasa: 'piles', idealista: 'piles', pisos: 'piles' },
  { value: 'zaragoza', label: 'Сарагоса', region: 'Арагон', fotocasa: 'zaragoza', idealista: 'zaragoza', pisos: 'zaragoza' },
  { value: 'palma-de-mallorca', label: 'Пальма (Мальорка)', region: 'Балеарские острова', fotocasa: 'palma-de-mallorca', idealista: 'palma-de-mallorca', pisos: 'palma-de-mallorca' },
  { value: 'ibiza', label: 'Ибица', region: 'Балеарские острова', fotocasa: 'eivissa', idealista: 'eivissa', pisos: 'eivissa' },
  { value: 'cordoba', label: 'Кордова', region: 'Андалусия', fotocasa: 'cordoba', idealista: 'cordoba', pisos: 'cordoba' },
  { value: 'vigo', label: 'Виго', region: 'Галисия', fotocasa: 'vigo', idealista: 'vigo', pisos: 'vigo' },
  { value: 'gijon', label: 'Хихон', region: 'Астурия', fotocasa: 'gijon', idealista: 'gijon', pisos: 'gijon' },
  { value: 'a-coruna', label: 'Ла-Корунья', region: 'Галисия', fotocasa: 'a-coruna', idealista: 'a-coruna', pisos: 'a-coruna' },
  { value: 'vitoria-gasteiz', label: 'Витория-Гастейс', region: 'Страна Басков', fotocasa: 'vitoria', idealista: 'vitoria-gasteiz', pisos: 'vitoria' },
  { value: 'oviedo', label: 'Овьедо', region: 'Астурия', fotocasa: 'oviedo', idealista: 'oviedo', pisos: 'oviedo' },
  { value: 'santander', label: 'Сантандер', region: 'Кантабрия', fotocasa: 'santander', idealista: 'santander', pisos: 'santander' },
  { value: 'pamplona', label: 'Памплона', region: 'Наварра', fotocasa: 'pamplona', idealista: 'pamplona', pisos: 'pamplona' },
  { value: 'logrono', label: 'Логроньо', region: 'Риоха', fotocasa: 'logrono', idealista: 'logrono', pisos: 'logrono' },
  { value: 'badajoz', label: 'Бадахос', region: 'Эстремадура', fotocasa: 'badajoz', idealista: 'badajoz', pisos: 'badajoz' },
  { value: 'cartagena', label: 'Картахена', region: 'Мурсия', fotocasa: 'cartagena', idealista: 'cartagena', pisos: 'cartagena' },
  { value: 'jerez-de-la-frontera', label: 'Херес-де-ла-Фронтера', region: 'Андалусия', fotocasa: 'jerez-de-la-frontera', idealista: 'jerez-de-la-frontera', pisos: 'jerez-de-la-frontera' },
  { value: 'cadiz', label: 'Кадис', region: 'Андалусия', fotocasa: 'cadiz', idealista: 'cadiz', pisos: 'cadiz' },
  { value: 'tarragona', label: 'Таррагона', region: 'Каталония', fotocasa: 'tarragona', idealista: 'tarragona', pisos: 'tarragona' },
  { value: 'lleida', label: 'Льейда', region: 'Каталония', fotocasa: 'lleida', idealista: 'lleida', pisos: 'lleida' },
  { value: 'salamanca', label: 'Саламанка', region: 'Кастилия и Леон', fotocasa: 'salamanca', idealista: 'salamanca', pisos: 'salamanca' },
  { value: 'toledo', label: 'Толедо', region: 'Кастилия — Ла-Манча', fotocasa: 'toledo', idealista: 'toledo', pisos: 'toledo' },
  { value: 'almeria', label: 'Альмерия', region: 'Андалусия', fotocasa: 'almeria', idealista: 'almeria', pisos: 'almeria' },
  { value: 'huelva', label: 'Уэльва', region: 'Андалусия', fotocasa: 'huelva', idealista: 'huelva', pisos: 'huelva' },
  { value: 'sabadell', label: 'Сабадель', region: 'Каталония', fotocasa: 'sabadell', idealista: 'barcelona', pisos: 'sabadell' },
  { value: 'mostoles', label: 'Мостолес', region: 'Мадрид и регион', fotocasa: 'mostoles', idealista: 'madrid', pisos: 'mostoles' },
  { value: 'alcorcon', label: 'Алькоркон', region: 'Мадрид и регион', fotocasa: 'alcorcon', idealista: 'madrid', pisos: 'alcorcon' },
  { value: 'fuenlabrada', label: 'Фуэнлабрада', region: 'Мадрид и регион', fotocasa: 'fuenlabrada', idealista: 'madrid', pisos: 'fuenlabrada' },
  { value: 'getafe', label: 'Хетафе', region: 'Мадрид и регион', fotocasa: 'getafe', idealista: 'madrid', pisos: 'getafe' },
  { value: 'leganes', label: 'Леганес', region: 'Мадрид и регион', fotocasa: 'leganes', idealista: 'madrid', pisos: 'leganes' },
  // Канарские острова — основные рынки вторички (муниципалитеты = slug’и порталов)
  {
    value: 'adeje',
    label: 'Адехе (Costa Adeje)',
    region: 'Канарские острова',
    fotocasa: 'adeje',
    idealista: 'adeje-santa-cruz-de-tenerife',
    pisos: 'adeje'
  },
  {
    value: 'arona',
    label: 'Арона (Playa de las Américas, Los Cristianos)',
    region: 'Канарские острова',
    fotocasa: 'arona',
    idealista: 'arona-santa-cruz-de-tenerife',
    pisos: 'arona'
  },
  {
    value: 'santa-cruz-de-tenerife',
    label: 'Санта-Крус-де-Тенерифе',
    region: 'Канарские острова',
    fotocasa: 'santa-cruz-de-tenerife',
    idealista: 'santa-cruz-de-tenerife-santa-cruz-de-tenerife',
    pisos: 'santa-cruz-de-tenerife'
  },
  {
    value: 'la-laguna',
    label: 'Ла-Лагуна (San Cristóbal de La Laguna)',
    region: 'Канарские острова',
    fotocasa: 'la-laguna',
    idealista: 'la-laguna-santa-cruz-de-tenerife',
    pisos: 'la-laguna'
  },
  {
    value: 'puerto-de-la-cruz',
    label: 'Пуэрто-де-ла-Крус',
    region: 'Канарские острова',
    fotocasa: 'puerto-de-la-cruz',
    idealista: 'puerto-de-la-cruz-santa-cruz-de-tenerife',
    pisos: 'puerto-de-la-cruz-de-tenerife'
  },
  {
    value: 'las-palmas-de-gran-canaria',
    label: 'Лас-Пальмас-де-Гран-Канария',
    region: 'Канарские острова',
    fotocasa: 'las-palmas-de-gran-canaria',
    idealista: 'las-palmas-de-gran-canaria-las-palmas',
    pisos: 'las_palmas_de_gran_canaria'
  },
  {
    value: 'san-bartolome-de-tirajana',
    label: 'Сан-Бартоломе-де-Тирахана (Maspalomas, Playa del Inglés)',
    region: 'Канарские острова',
    fotocasa: 'san-bartolome-de-tirajana',
    idealista: 'san-bartolome-de-tirajana-las-palmas',
    pisos: 'san_bartolome_de_tirajana'
  },
  {
    value: 'telde',
    label: 'Тельде',
    region: 'Канарские острова',
    fotocasa: 'telde',
    idealista: 'telde-las-palmas',
    pisos: 'telde'
  },
  {
    value: 'arrecife',
    label: 'Арресифе (Лансароте)',
    region: 'Канарские острова',
    fotocasa: 'arrecife',
    idealista: 'arrecife-las-palmas',
    pisos: 'arrecife'
  },
  {
    value: 'corralejo',
    label: 'Корральехо (Фуэртевентура)',
    region: 'Канарские острова',
    fotocasa: 'corralejo',
    idealista: 'corralejo-las-palmas',
    pisos: 'corralejo'
  }
]

/** Ключевые слова для фильтрации по городу (адрес объявления) */
export const CITY_KEYWORDS = {
  barcelona: ['barcelona', 'барселона', 'hospitalet', 'l\'hospitalet'],
  madrid: ['madrid', 'мадрид', 'fuenlabrada', 'getafe', 'leganes', 'mostoles', 'alcorcon', 'pozuelo'],
  valencia: ['valencia', 'валенсия'],
  sevilla: ['sevilla', 'севилья'],
  malaga: ['malaga', 'málaga', 'малага'],
  marbella: ['marbella', 'марбелья'],
  bilbao: ['bilbao', 'бильбао', 'vizcaya', 'bizkaia'],
  alicante: ['alicante', 'аликанте'],
  granada: ['granada', 'гранада'],
  murcia: ['murcia', 'мурсия'],
  castellon: ['castellon', 'castellón', 'кастельон'],
  torrevieja: ['torrevieja', 'торревьеха'],
  benidorm: ['benidorm', 'бенидорм'],
  denia: ['denia', 'dénia', 'дения'],
  javea: ['javea', 'xàbia', 'хавеа'],
  calpe: ['calpe', 'calp', 'калпе'],
  altea: ['altea', 'альтеа'],
  'santa-pola': ['santa pola', 'santapola', 'санта-пола'],
  villajoyosa: ['villajoyosa', 'vila joiosa', 'виллахойоса'],
  gandia: ['gandia', 'gandía', 'гандия'],
  oliva: ['oliva', 'олива'],
  piles: ['piles', 'пилес'],
  zaragoza: ['zaragoza', 'сарагоса'],
  'palma-de-mallorca': ['palma', 'mallorca', 'пальма'],
  ibiza: ['eivissa', 'ibiza', 'ивиса'],
  cordoba: ['cordoba', 'córdoba', 'кордова'],
  vigo: ['vigo', 'виго'],
  gijon: ['gijon', 'gijón', 'хихон'],
  'a-coruna': ['coruña', 'coruna', 'a coruña', 'корунья'],
  'vitoria-gasteiz': ['vitoria', 'gasteiz', 'витория'],
  oviedo: ['oviedo', 'овьедо'],
  santander: ['santander', 'сантандер'],
  pamplona: ['pamplona', 'iruña', 'памплона'],
  logrono: ['logroño', 'logrono', 'логроньо'],
  badajoz: ['badajoz', 'бадахос'],
  cartagena: ['cartagena', 'картахена'],
  'jerez-de-la-frontera': ['jerez', 'херес'],
  cadiz: ['cadiz', 'cádiz', 'кадис'],
  tarragona: ['tarragona', 'таррагона'],
  lleida: ['lleida', 'льейда'],
  salamanca: ['salamanca', 'саламанка'],
  toledo: ['toledo', 'толедо'],
  almeria: ['almeria', 'альмерия'],
  huelva: ['huelva', 'уэльва'],
  sabadell: ['sabadell', 'сабадель'],
  mostoles: ['móstoles', 'mostoles', 'мостолес'],
  alcorcon: ['alcorcón', 'alcorcon', 'алькоркон'],
  fuenlabrada: ['fuenlabrada', 'фуэнлабрада'],
  getafe: ['getafe', 'хетафе'],
  leganes: ['leganés', 'leganes', 'леганес'],
  adeje: [
    'adeje',
    'адехе',
    'costa adeje',
    'коста адехе',
    'costa de adeje'
  ],
  arona: [
    'arona',
    'арона',
    'playa de las americas',
    'playas de las americas',
    'las americas',
    'los cristianos',
    'кристианос',
    'америкас',
    'тенерифе',
    'tenerife',
    'тенерифы'
  ],
  'santa-cruz-de-tenerife': [
    'santa cruz',
    'santa cruz de tenerife',
    'санта-крус',
    'санта крус'
  ],
  'la-laguna': ['la laguna', 'ла лагуна', 'лагуна', 'laguna', 'san cristobal de la laguna'],
  'puerto-de-la-cruz': ['puerto de la cruz', 'пуэрто', 'puerto', 'port of the cross'],
  'las-palmas-de-gran-canaria': [
    'las palmas',
    'las palmas de gran canaria',
    'лас пальмас',
    'лас-пальмас',
    'gran canaria',
    'гран канария',
    'гран-канария',
    'grancanaria'
  ],
  'san-bartolome-de-tirajana': [
    'san bartolome',
    'san bartolomé',
    'maspalomas',
    'playa del ingles',
    'playa del inglés',
    'маспаломас',
    'инглес',
    'сан бартоломе'
  ],
  telde: ['telde', 'тельде'],
  arrecife: ['arrecife', 'арресифе', 'lanzarote', 'лансароте'],
  corralejo: ['corralejo', 'корральехо', 'fuerteventura', 'фуэртевентура']
}

/**
 * Районы: value — id; fotocasaZone — сегмент URL Fotocasa; keywords — для отбора по адресу с любых порталов
 */
export const DISTRICTS_BY_CITY = {
  barcelona: [
    { value: 'all', label: 'Весь город', fotocasaZone: 'todas-las-zonas', keywords: [] },
    { value: 'eixample', label: 'Эшампле (Eixample)', fotocasaZone: 'eixample', keywords: ['eixample', 'eixample esquerra', 'eixample dreta'] },
    { value: 'gracia', label: 'Грасия (Gràcia)', fotocasaZone: 'gracia', keywords: ['gràcia', 'gracia'] },
    { value: 'les-corts', label: 'Лес Кортс', fotocasaZone: 'les-corts', keywords: ['les corts', 'corts'] },
    { value: 'sarria', label: 'Саррия — Сан-Жерваси', fotocasaZone: 'sarria-sant-gervasi', keywords: ['sarrià', 'sarria', 'sant gervasi'] },
    { value: 'ciutat-vella', label: 'Старый город (Ciutat Vella)', fotocasaZone: 'ciutat-vella', keywords: ['ciutat vella', 'gòtic', 'gotic', 'born', 'raval'] },
    { value: 'sant-marti', label: 'Сант-Марти (22@)', fotocasaZone: 'sant-marti', keywords: ['sant martí', 'sant marti', 'poblenou', 'diagonal mar'] },
    { value: 'horta-guinardo', label: 'Орта — Гинардо', fotocasaZone: 'horta-guinardo', keywords: ['horta', 'guinardó', 'guinardo'] }
  ],
  madrid: [
    { value: 'all', label: 'Весь город', fotocasaZone: 'todas-las-zonas', keywords: [] },
    { value: 'salamanca', label: 'Саламанка', fotocasaZone: 'salamanca', keywords: ['salamanca', 'salamanca district'] },
    { value: 'centro', label: 'Центр (Sol, Palacio)', fotocasaZone: 'centro', keywords: ['centro', 'sol', 'palacio', 'malasaña', 'malasana', 'lavapiés', 'lavapies'] },
    { value: 'chamartin', label: 'Чамартин', fotocasaZone: 'chamartin', keywords: ['chamartín', 'chamartin', 'tetuán', 'tetuan'] },
    { value: 'retiro', label: 'Ретиро', fotocasaZone: 'retiro', keywords: ['retiro'] },
    { value: 'chamberi', label: 'Чамбери', fotocasaZone: 'chamberi', keywords: ['chamberí', 'chamberi'] },
    { value: 'moncloa', label: 'Монклоа — Аргуэльес', fotocasaZone: 'moncloa-aravaca', keywords: ['moncloa', 'argüelles', 'arguelles'] },
    { value: 'tetuan', label: 'Тетуан', fotocasaZone: 'tetuan', keywords: ['tetuán', 'tetuan', 'cuatro caminos'] }
  ],
  valencia: [
    { value: 'all', label: 'Весь город', fotocasaZone: 'todas-las-zonas', keywords: [] },
    { value: 'ciutat-vella', label: 'Старый город', fotocasaZone: 'ciutat-vella', keywords: ['ciutat vella', 'carmen', 'carme'] },
    { value: 'eixample', label: 'Энсанш (Eixample)', fotocasaZone: 'eixample', keywords: ['eixample', 'ensanche'] },
    { value: 'russafa', label: 'Русафа (Ruzafa)', fotocasaZone: 'russafa', keywords: ['russafa', 'ruzafa'] },
    { value: 'el-pla-del-real', label: 'Пла-дель-Реаль', fotocasaZone: 'el-pla-del-real', keywords: ['pla del real', 'mestalla'] },
    { value: 'campanar', label: 'Кампанар', fotocasaZone: 'campanar', keywords: ['campanar'] },
    { value: 'benimaclet', label: 'Бенимаклет', fotocasaZone: 'benimaclet', keywords: ['benimaclet'] }
  ],
  malaga: [
    { value: 'all', label: 'Весь город', fotocasaZone: 'todas-las-zonas', keywords: [] },
    { value: 'centro', label: 'Центр', fotocasaZone: 'centro', keywords: ['centro', 'centre'] },
    { value: 'malaga-este', label: 'Малага-Эсте', fotocasaZone: 'malaga-este', keywords: ['este', 'el palo', 'pedregalejo'] },
    { value: 'carretera-de-cadiz', label: 'Кадисское шоссе', fotocasaZone: 'carretera-de-cadiz', keywords: ['cadiz', 'huelin'] },
    { value: 'teatinos', label: 'Театинос — Университет', fotocasaZone: 'teatinos-universidad', keywords: ['teatinos', 'universidad'] }
  ],
  sevilla: [
    { value: 'all', label: 'Весь город', fotocasaZone: 'todas-las-zonas', keywords: [] },
    { value: 'casco-antiguo', label: 'Исторический центр', fotocasaZone: 'casco-antiguo', keywords: ['casco antiguo', 'centro', 'triana', 'alfalfa', 'santa cruz'] },
    { value: 'nervion', label: 'Нервион', fotocasaZone: 'nervion', keywords: ['nervión', 'nervion'] },
    { value: 'triana', label: 'Триана', fotocasaZone: 'triana', keywords: ['triana'] },
    { value: 'los-remedios', label: 'Лос-Ремедиос', fotocasaZone: 'los-remedios', keywords: ['remedios'] },
    { value: 'macarena', label: 'Макарена', fotocasaZone: 'macarena', keywords: ['macarena'] }
  ],
  alicante: [
    { value: 'all', label: 'Весь город', fotocasaZone: 'todas-las-zonas', keywords: [] },
    { value: 'centro', label: 'Центр', fotocasaZone: 'centro', keywords: ['centro', 'centre'] },
    { value: 'playa-san-juan', label: 'Пля Сан-Хуан', fotocasaZone: 'playa-de-san-juan', keywords: ['san juan', 'sant joan'] },
    { value: 'albufereta', label: 'Альбуферета', fotocasaZone: 'albufereta', keywords: ['albufereta'] },
    { value: 'campello', label: 'Эль-Кампельо (рядом)', fotocasaZone: 'el-campello', keywords: ['campello', 'campello'] }
  ]
}

export function getCityConfig(cityValue) {
  return SPAIN_CITIES.find((c) => c.value === cityValue) || null
}

export function getDistrictOptions(cityValue) {
  return DISTRICTS_BY_CITY[cityValue] || [{ value: 'all', label: 'Весь город', fotocasaZone: 'todas-las-zonas', keywords: [] }]
}

export function getDistrictRecord(cityValue, districtValue) {
  const list = getDistrictOptions(cityValue)
  return list.find((d) => d.value === districtValue) || list[0]
}

/**
 * Cities and districts for the price calculator (Fotocasa / Idealista / Pisos slugs).
 * District keywords filter listings by address text when a portal returns the whole city.
 */

export const SPAIN_CITIES = [
  { value: 'barcelona', label: 'Barcelona', region: 'Catalonia', fotocasa: 'barcelona', idealista: 'barcelona', pisos: 'barcelona' },
  { value: 'madrid', label: 'Madrid', region: 'Madrid region', fotocasa: 'madrid', idealista: 'madrid', pisos: 'madrid' },
  { value: 'valencia', label: 'Valencia', region: 'Valencian Community', fotocasa: 'valencia', idealista: 'valencia', pisos: 'valencia' },
  { value: 'sevilla', label: 'Seville', region: 'Andalusia', fotocasa: 'sevilla', idealista: 'sevilla', pisos: 'sevilla' },
  { value: 'malaga', label: 'Malaga', region: 'Andalusia', fotocasa: 'malaga', idealista: 'malaga', pisos: 'malaga' },
  { value: 'marbella', label: 'Marbella', region: 'Andalusia', fotocasa: 'marbella', idealista: 'marbella', pisos: 'marbella' },
  { value: 'bilbao', label: 'Bilbao', region: 'Basque Country', fotocasa: 'bilbao', idealista: 'bilbao', pisos: 'bilbao' },
  { value: 'alicante', label: 'Alicante', region: 'Valencian Community', fotocasa: 'alicante', idealista: 'alicante', pisos: 'alicante' },
  { value: 'granada', label: 'Granada', region: 'Andalusia', fotocasa: 'granada', idealista: 'granada', pisos: 'granada' },
  { value: 'murcia', label: 'Murcia', region: 'Murcia', fotocasa: 'murcia', idealista: 'murcia', pisos: 'murcia' },
  { value: 'castellon', label: 'Castellon', region: 'Valencian Community', fotocasa: 'castellon', idealista: 'castellon', pisos: 'castellon-de-la-plana' },
  { value: 'torrevieja', label: 'Torrevieja', region: 'Valencian Community', fotocasa: 'torrevieja', idealista: 'torrevieja', pisos: 'torrevieja' },
  { value: 'benidorm', label: 'Benidorm', region: 'Valencian Community', fotocasa: 'benidorm', idealista: 'benidorm', pisos: 'benidorm' },
  { value: 'denia', label: 'Denia', region: 'Valencian Community', fotocasa: 'denia', idealista: 'denia', pisos: 'denia' },
  { value: 'javea', label: 'Javea', region: 'Valencian Community', fotocasa: 'javea', idealista: 'javea', pisos: 'javea' },
  { value: 'calpe', label: 'Calpe', region: 'Valencian Community', fotocasa: 'calpe', idealista: 'calpe', pisos: 'calpe' },
  { value: 'altea', label: 'Altea', region: 'Valencian Community', fotocasa: 'altea', idealista: 'altea', pisos: 'altea' },
  { value: 'santa-pola', label: 'Santa Pola', region: 'Valencian Community', fotocasa: 'santa-pola', idealista: 'santa-pola', pisos: 'santa-pola' },
  { value: 'villajoyosa', label: 'Villajoyosa', region: 'Valencian Community', fotocasa: 'villajoyosa', idealista: 'villajoyosa', pisos: 'villajoyosa' },
  { value: 'gandia', label: 'Gandia', region: 'Valencian Community', fotocasa: 'gandia', idealista: 'gandia', pisos: 'gandia' },
  { value: 'oliva', label: 'Oliva', region: 'Valencian Community', fotocasa: 'oliva', idealista: 'oliva', pisos: 'oliva' },
  { value: 'piles', label: 'Piles', region: 'Valencian Community', fotocasa: 'piles', idealista: 'piles', pisos: 'piles' },
  { value: 'zaragoza', label: 'Zaragoza', region: 'Aragon', fotocasa: 'zaragoza', idealista: 'zaragoza', pisos: 'zaragoza' },
  { value: 'palma-de-mallorca', label: 'Palma (Mallorca)', region: 'Balearic Islands', fotocasa: 'palma-de-mallorca', idealista: 'palma-de-mallorca', pisos: 'palma-de-mallorca' },
  { value: 'ibiza', label: 'Ibiza', region: 'Balearic Islands', fotocasa: 'eivissa', idealista: 'eivissa', pisos: 'eivissa' },
  { value: 'cordoba', label: 'Cordoba', region: 'Andalusia', fotocasa: 'cordoba', idealista: 'cordoba', pisos: 'cordoba' },
  { value: 'vigo', label: 'Vigo', region: 'Galicia', fotocasa: 'vigo', idealista: 'vigo', pisos: 'vigo' },
  { value: 'gijon', label: 'Gijon', region: 'Asturias', fotocasa: 'gijon', idealista: 'gijon', pisos: 'gijon' },
  { value: 'a-coruna', label: 'A Coruna', region: 'Galicia', fotocasa: 'a-coruna', idealista: 'a-coruna', pisos: 'a-coruna' },
  { value: 'vitoria-gasteiz', label: 'Vitoria-Gasteiz', region: 'Basque Country', fotocasa: 'vitoria', idealista: 'vitoria-gasteiz', pisos: 'vitoria' },
  { value: 'oviedo', label: 'Oviedo', region: 'Asturias', fotocasa: 'oviedo', idealista: 'oviedo', pisos: 'oviedo' },
  { value: 'santander', label: 'Santander', region: 'Cantabria', fotocasa: 'santander', idealista: 'santander', pisos: 'santander' },
  { value: 'pamplona', label: 'Pamplona', region: 'Navarre', fotocasa: 'pamplona', idealista: 'pamplona', pisos: 'pamplona' },
  { value: 'logrono', label: 'Logrono', region: 'La Rioja', fotocasa: 'logrono', idealista: 'logrono', pisos: 'logrono' },
  { value: 'badajoz', label: 'Badajoz', region: 'Extremadura', fotocasa: 'badajoz', idealista: 'badajoz', pisos: 'badajoz' },
  { value: 'cartagena', label: 'Cartagena', region: 'Murcia', fotocasa: 'cartagena', idealista: 'cartagena', pisos: 'cartagena' },
  { value: 'jerez-de-la-frontera', label: 'Jerez de la Frontera', region: 'Andalusia', fotocasa: 'jerez-de-la-frontera', idealista: 'jerez-de-la-frontera', pisos: 'jerez-de-la-frontera' },
  { value: 'cadiz', label: 'Cadiz', region: 'Andalusia', fotocasa: 'cadiz', idealista: 'cadiz', pisos: 'cadiz' },
  { value: 'tarragona', label: 'Tarragona', region: 'Catalonia', fotocasa: 'tarragona', idealista: 'tarragona', pisos: 'tarragona' },
  { value: 'lleida', label: 'Lleida', region: 'Catalonia', fotocasa: 'lleida', idealista: 'lleida', pisos: 'lleida' },
  { value: 'salamanca', label: 'Salamanca', region: 'Castile and León', fotocasa: 'salamanca', idealista: 'salamanca', pisos: 'salamanca' },
  { value: 'toledo', label: 'Toledo', region: 'Castile-La Mancha', fotocasa: 'toledo', idealista: 'toledo', pisos: 'toledo' },
  { value: 'almeria', label: 'Almeria', region: 'Andalusia', fotocasa: 'almeria', idealista: 'almeria', pisos: 'almeria' },
  { value: 'huelva', label: 'Huelva', region: 'Andalusia', fotocasa: 'huelva', idealista: 'huelva', pisos: 'huelva' },
  { value: 'sabadell', label: 'Sabadell', region: 'Catalonia', fotocasa: 'sabadell', idealista: 'barcelona', pisos: 'sabadell' },
  { value: 'mostoles', label: 'Mostoles', region: 'Madrid region', fotocasa: 'mostoles', idealista: 'madrid', pisos: 'mostoles' },
  { value: 'alcorcon', label: 'Alcorcon', region: 'Madrid region', fotocasa: 'alcorcon', idealista: 'madrid', pisos: 'alcorcon' },
  { value: 'fuenlabrada', label: 'Fuenlabrada', region: 'Madrid region', fotocasa: 'fuenlabrada', idealista: 'madrid', pisos: 'fuenlabrada' },
  { value: 'getafe', label: 'Getafe', region: 'Madrid region', fotocasa: 'getafe', idealista: 'madrid', pisos: 'getafe' },
  { value: 'leganes', label: 'Leganes', region: 'Madrid region', fotocasa: 'leganes', idealista: 'madrid', pisos: 'leganes' },
  // Canary Islands — основные рынки вторички (муниципалитеты = slug’и порталов)
  {
    value: 'adeje',
    label: 'Adeje (Costa Adeje)',
    region: 'Canary Islands',
    fotocasa: 'adeje',
    idealista: 'adeje-santa-cruz-de-tenerife',
    pisos: 'adeje'
  },
  {
    value: 'arona',
    label: 'Arona (Playa de las Americas, Los Cristianos)',
    region: 'Canary Islands',
    fotocasa: 'arona',
    idealista: 'arona-santa-cruz-de-tenerife',
    pisos: 'arona'
  },
  {
    value: 'santa-cruz-de-tenerife',
    label: 'Santa Cruz de Tenerife',
    region: 'Canary Islands',
    fotocasa: 'santa-cruz-de-tenerife',
    idealista: 'santa-cruz-de-tenerife-santa-cruz-de-tenerife',
    pisos: 'santa-cruz-de-tenerife'
  },
  {
    value: 'la-laguna',
    label: 'La Laguna (San Cristobal de La Laguna)',
    region: 'Canary Islands',
    fotocasa: 'la-laguna',
    idealista: 'la-laguna-santa-cruz-de-tenerife',
    pisos: 'la-laguna'
  },
  {
    value: 'puerto-de-la-cruz',
    label: 'Puerto de la Cruz',
    region: 'Canary Islands',
    fotocasa: 'puerto-de-la-cruz',
    idealista: 'puerto-de-la-cruz-santa-cruz-de-tenerife',
    pisos: 'puerto-de-la-cruz-de-tenerife'
  },
  {
    value: 'las-palmas-de-gran-canaria',
    label: 'Las Palmas de Gran Canaria',
    region: 'Canary Islands',
    fotocasa: 'las-palmas-de-gran-canaria',
    idealista: 'las-palmas-de-gran-canaria-las-palmas',
    pisos: 'las_palmas_de_gran_canaria'
  },
  {
    value: 'san-bartolome-de-tirajana',
    label: 'San Bartolome de Tirajana (Maspalomas, Playa del Ingles)',
    region: 'Canary Islands',
    fotocasa: 'san-bartolome-de-tirajana',
    idealista: 'san-bartolome-de-tirajana-las-palmas',
    pisos: 'san_bartolome_de_tirajana'
  },
  {
    value: 'telde',
    label: 'Telde',
    region: 'Canary Islands',
    fotocasa: 'telde',
    idealista: 'telde-las-palmas',
    pisos: 'telde'
  },
  {
    value: 'arrecife',
    label: 'Arrecife (Lanzarote)',
    region: 'Canary Islands',
    fotocasa: 'arrecife',
    idealista: 'arrecife-las-palmas',
    pisos: 'arrecife'
  },
  {
    value: 'corralejo',
    label: 'Corralejo (Fuerteventura)',
    region: 'Canary Islands',
    fotocasa: 'corralejo',
    idealista: 'corralejo-las-palmas',
    pisos: 'corralejo'
  }
]

/** Keywords for city filtering (listing address) */
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
 * Districts: value — id; fotocasaZone — Fotocasa URL segment; keywords — address matching across portals
 */
export const DISTRICTS_BY_CITY = {
  barcelona: [
    { value: 'all', label: 'Entire city', fotocasaZone: 'todas-las-zonas', keywords: [] },
    { value: 'eixample', label: 'Eixample', fotocasaZone: 'eixample', keywords: ['eixample', 'eixample esquerra', 'eixample dreta'] },
    { value: 'gracia', label: 'Gracia', fotocasaZone: 'gracia', keywords: ['gràcia', 'gracia'] },
    { value: 'les-corts', label: 'Les Corts', fotocasaZone: 'les-corts', keywords: ['les corts', 'corts'] },
    { value: 'sarria', label: 'Sarria — Sant Gervasi', fotocasaZone: 'sarria-sant-gervasi', keywords: ['sarrià', 'sarria', 'sant gervasi'] },
    { value: 'ciutat-vella', label: 'Old Town (Ciutat Vella)', fotocasaZone: 'ciutat-vella', keywords: ['ciutat vella', 'gòtic', 'gotic', 'born', 'raval'] },
    { value: 'sant-marti', label: 'Sant Marti (22@)', fotocasaZone: 'sant-marti', keywords: ['sant martí', 'sant marti', 'poblenou', 'diagonal mar'] },
    { value: 'horta-guinardo', label: 'Horta — Guinardo', fotocasaZone: 'horta-guinardo', keywords: ['horta', 'guinardó', 'guinardo'] }
  ],
  madrid: [
    { value: 'all', label: 'Entire city', fotocasaZone: 'todas-las-zonas', keywords: [] },
    { value: 'salamanca', label: 'Salamanca', fotocasaZone: 'salamanca', keywords: ['salamanca', 'salamanca district'] },
    { value: 'centro', label: 'Centre (Sol, Palacio)', fotocasaZone: 'centro', keywords: ['centro', 'sol', 'palacio', 'malasaña', 'malasana', 'lavapiés', 'lavapies'] },
    { value: 'chamartin', label: 'Chamartin', fotocasaZone: 'chamartin', keywords: ['chamartín', 'chamartin', 'tetuán', 'tetuan'] },
    { value: 'retiro', label: 'Retiro', fotocasaZone: 'retiro', keywords: ['retiro'] },
    { value: 'chamberi', label: 'Chamberi', fotocasaZone: 'chamberi', keywords: ['chamberí', 'chamberi'] },
    { value: 'moncloa', label: 'Moncloa — Arguelles', fotocasaZone: 'moncloa-aravaca', keywords: ['moncloa', 'argüelles', 'arguelles'] },
    { value: 'tetuan', label: 'Tetuan', fotocasaZone: 'tetuan', keywords: ['tetuán', 'tetuan', 'cuatro caminos'] }
  ],
  valencia: [
    { value: 'all', label: 'Entire city', fotocasaZone: 'todas-las-zonas', keywords: [] },
    { value: 'ciutat-vella', label: 'Old Town', fotocasaZone: 'ciutat-vella', keywords: ['ciutat vella', 'carmen', 'carme'] },
    { value: 'eixample', label: 'Eixample (Ensanche)', fotocasaZone: 'eixample', keywords: ['eixample', 'ensanche'] },
    { value: 'russafa', label: 'Russafa (Ruzafa)', fotocasaZone: 'russafa', keywords: ['russafa', 'ruzafa'] },
    { value: 'el-pla-del-real', label: 'Pla del Real', fotocasaZone: 'el-pla-del-real', keywords: ['pla del real', 'mestalla'] },
    { value: 'campanar', label: 'Campanar', fotocasaZone: 'campanar', keywords: ['campanar'] },
    { value: 'benimaclet', label: 'Benimaclet', fotocasaZone: 'benimaclet', keywords: ['benimaclet'] }
  ],
  malaga: [
    { value: 'all', label: 'Entire city', fotocasaZone: 'todas-las-zonas', keywords: [] },
    { value: 'centro', label: 'Centre', fotocasaZone: 'centro', keywords: ['centro', 'centre'] },
    { value: 'malaga-este', label: 'Malaga East', fotocasaZone: 'malaga-este', keywords: ['este', 'el palo', 'pedregalejo'] },
    { value: 'carretera-de-cadiz', label: 'Cadiz Road', fotocasaZone: 'carretera-de-cadiz', keywords: ['cadiz', 'huelin'] },
    { value: 'teatinos', label: 'Teatinos — University', fotocasaZone: 'teatinos-universidad', keywords: ['teatinos', 'universidad'] }
  ],
  sevilla: [
    { value: 'all', label: 'Entire city', fotocasaZone: 'todas-las-zonas', keywords: [] },
    { value: 'casco-antiguo', label: 'Historic centre', fotocasaZone: 'casco-antiguo', keywords: ['casco antiguo', 'centro', 'triana', 'alfalfa', 'santa cruz'] },
    { value: 'nervion', label: 'Nervion', fotocasaZone: 'nervion', keywords: ['nervión', 'nervion'] },
    { value: 'triana', label: 'Triana', fotocasaZone: 'triana', keywords: ['triana'] },
    { value: 'los-remedios', label: 'Los Remedios', fotocasaZone: 'los-remedios', keywords: ['remedios'] },
    { value: 'macarena', label: 'Macarena', fotocasaZone: 'macarena', keywords: ['macarena'] }
  ],
  alicante: [
    { value: 'all', label: 'Entire city', fotocasaZone: 'todas-las-zonas', keywords: [] },
    { value: 'centro', label: 'Centre', fotocasaZone: 'centro', keywords: ['centro', 'centre'] },
    { value: 'playa-san-juan', label: 'San Juan Beach', fotocasaZone: 'playa-de-san-juan', keywords: ['san juan', 'sant joan'] },
    { value: 'albufereta', label: 'Albufereta', fotocasaZone: 'albufereta', keywords: ['albufereta'] },
    { value: 'campello', label: 'El Campello (nearby)', fotocasaZone: 'el-campello', keywords: ['campello', 'campello'] }
  ]
}

export function getCityConfig(cityValue) {
  return SPAIN_CITIES.find((c) => c.value === cityValue) || null
}

export function getDistrictOptions(cityValue) {
  return DISTRICTS_BY_CITY[cityValue] || [{ value: 'all', label: 'Entire city', fotocasaZone: 'todas-las-zonas', keywords: [] }]
}

export function getDistrictRecord(cityValue, districtValue) {
  const list = getDistrictOptions(cityValue)
  return list.find((d) => d.value === districtValue) || list[0]
}

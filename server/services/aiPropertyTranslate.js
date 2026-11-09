/**
 * Перевод объявления на все языки сайта.
 * Сначала один запрос к AI (OpenRouter / активный провайдер),
 * при сбое — MyMemory, как запасной канал.
 */

import { getActiveAiProvider } from '../aiChatConfig.js';

const MYMEMORY_URL = 'https://api.mymemory.translated.net/get';
const REQUEST_DELAY_MS = 200;
const REQUEST_TIMEOUT_MS = 8000;
const AI_TIMEOUT_MS = 45000;
const MAX_CHARS_PER_REQUEST = 400;

export const SITE_LANGUAGES = [
  { code: 'ru', name: 'Russian' },
  { code: 'en', name: 'English' },
  { code: 'de', name: 'German' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'pl', name: 'Polish' },
  { code: 'sv', name: 'Swedish' },
];

export const SITE_LANG_CODES = SITE_LANGUAGES.map((l) => l.code);
/** Цели при исходнике на русском (обратная совместимость). */
export const TARGET_LANG_CODES = SITE_LANG_CODES.filter((code) => code !== 'ru');

/** Целевые языки относительно фактического языка исходника. */
export function targetLangCodesFor(sourceLang) {
  const src = String(sourceLang || 'ru').toLowerCase();
  return SITE_LANG_CODES.filter((code) => code !== src);
}

/** Канонические имена таблиц в property_translations (списки часто отдают apartments/houses). */
export function normalizeTranslationPropertyTable(sourceTable, propertyType) {
  const raw = sourceTable != null ? String(sourceTable).trim() : '';
  const lower = raw.toLowerCase();
  if (lower === 'apartments' || lower === 'properties_apartments') return 'properties_apartments';
  if (lower === 'houses' || lower === 'properties_houses') return 'properties_houses';
  if (lower === 'properties') return 'properties';
  if (raw) return raw;
  const pt = String(propertyType || '').toLowerCase();
  if (pt === 'house' || pt === 'villa') return 'properties_houses';
  return 'properties_apartments';
}

export function translationPropertyTableAliases(canonicalTable) {
  const table = String(canonicalTable || '');
  if (table === 'properties_apartments') return ['properties_apartments', 'apartments'];
  if (table === 'properties_houses') return ['properties_houses', 'houses'];
  return [table];
}

export const CORE_TRANSLATION_FIELDS = [
  'title',
  'description',
  'additional_amenities',
  'location',
];

export const EXTRA_TRANSLATION_FIELDS = [
  'address',
  'city',
  'country',
  'renovation',
  'condition',
  'heating',
  'water_supply',
  'sewerage',
  'commercial_type',
  'business_hours',
  'debt_other',
];

export const ALL_TRANSLATION_FIELDS = [
  ...CORE_TRANSLATION_FIELDS,
  ...EXTRA_TRANSLATION_FIELDS,
];

const LANG_NAMES = Object.fromEntries(SITE_LANGUAGES.map((l) => [l.code, l.name]));

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function trimText(value) {
  if (value == null) return '';
  return String(value).trim();
}

export function extractListingTexts(property = {}) {
  const out = {};
  for (const key of ALL_TRANSLATION_FIELDS) {
    const val = trimText(property[key]);
    if (val) out[key] = val;
  }
  return out;
}

export function splitTranslationForStore(translated = {}) {
  const core = {};
  const extra = {};
  for (const key of CORE_TRANSLATION_FIELDS) {
    core[key] = trimText(translated[key]);
  }
  for (const key of EXTRA_TRANSLATION_FIELDS) {
    const val = trimText(translated[key]);
    if (val) extra[key] = val;
  }
  return { ...core, extra };
}

export function parseExtraJson(raw) {
  if (!raw) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(String(raw));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function detectSourceLang(texts) {
  const sample = [texts.title, texts.description, texts.location, texts.additional_amenities]
    .filter(Boolean)
    .join(' ');
  if (/[а-яё]/i.test(sample)) return 'ru';
  if (/[äöüß]/i.test(sample)) return 'de';
  if (/[àâçéèêëîïôùû]/i.test(sample)) return 'fr';
  if (/[áéíóúñ¿¡]/i.test(sample)) return 'es';
  if (/[ąćęłńóśźż]/i.test(sample)) return 'pl';
  if (/[åäö]/i.test(sample)) return 'sv';
  // Latin marketing titles (Luxury Villa…) are English, not Russian.
  if (/[a-z]/i.test(sample)) return 'en';
  return 'ru';
}

function isMyMemoryQuotaOrError(text) {
  const s = String(text || '');
  return /MYMEMORY WARNING|YOU USED ALL AVAILABLE FREE TRANSLATIONS|QUERY LENGTH LIMIT/i.test(s);
}

async function translateChunk(chunk, sourceLang, targetLang) {
  if (!chunk || !String(chunk).trim()) return '';
  const url = `${MYMEMORY_URL}?q=${encodeURIComponent(chunk)}&langpair=${sourceLang}|${targetLang}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) return chunk;
    const data = await res.json();
    const translated = data.responseData?.translatedText;
    if (data.responseStatus === 200 && translated && !isMyMemoryQuotaOrError(translated)) {
      return translated;
    }
  } catch (e) {
    clearTimeout(timeoutId);
    console.warn('[translate] MyMemory request failed:', e.message);
  }
  return chunk;
}

/**
 * Словарный fallback RU → целевые языки для типичных фраз объявлений.
 * Используется, когда AI/MyMemory недоступны или вернули кириллическую копию.
 */
const PHRASEBOOK = {
  en: [
    ['квартира', 'apartment'],
    ['таунхаус', 'townhouse'],
    ['спальни', 'bedrooms'],
    ['спальня', 'bedroom'],
    ['портал', 'portal'],
    ['этаж', 'floor'],
    ['тип ', 'type '],
    ['внутри', 'indoor'],
    ['Частный сад', 'Private garden'],
    ['Кладовая', 'Storage'],
    ['частный сад', 'private garden'],
    ['без прямого вида на океан', 'no direct ocean view'],
    ['частичный вид на океан', 'partial ocean view'],
    ['вид на океан', 'ocean view'],
    ['подготовка зарядки электромобиля', 'EV charging readiness'],
    ['канальный кондиционер', 'ducted air conditioning'],
    ['солнечные панели', 'solar panels'],
    ['в каждом объекте', 'in each unit'],
    ['в одном проекте', 'in one project'],
    ['Одна доля соответствует одному объекту', 'One share corresponds to one unit'],
    ['Инфраструктура комплекса', 'Complex amenities'],
    ['долевое участие', 'equity participation'],
    ['общая стоимость', 'total value'],
    ['Состав проекта', 'Project composition'],
    ['Портфель из', 'Portfolio of'],
    ['энергокласс', 'energy class'],
    ['Новостройка', 'New build'],
    ['машиноместо', 'parking space'],
    ['кладовая', 'storage'],
    ['терраса', 'terrace'],
    ['бассейны', 'pools'],
    ['бассейн', 'pool'],
    ['спортзал', 'gym'],
    ['кондиционер', 'air conditioning'],
    ['парковка', 'parking'],
    ['объектов', 'units'],
    ['объекта', 'unit'],
    ['корпуса', 'buildings'],
    ['корпус', 'building'],
    ['на первой линии', 'frontline'],
    ['вид на море', 'sea view'],
    ['с техникой', 'with appliances'],
    ['техникой', 'appliances'],
    ['подогреваемый', 'heated'],
    ['включая', 'including'],
    ['детский', "children's"],
    ['в комплексе', 'in the complex'],
    ['комплексе', 'complex'],
    ['Цена', 'Price'],
    ['сейчас', 'now'],
    ['Купить', 'Buy'],
    ['купить', 'buy'],
    ['целиком', 'entirely'],
    ['часть', 'part of'],
    ['года', ''],
    ['Испания', 'Spain'],
    ['Тенерифе', 'Tenerife'],
    ['хаммам', 'hammam'],
    ['сауна', 'sauna'],
    ['сады', 'gardens'],
    ['аэротермия', 'aerothermal system'],
    ['сантехника', 'sanitary fittings'],
    ['кухня', 'kitchen'],
    ['гараж', 'garage'],
    ['сад', 'garden'],
    ['спа', 'spa'],
    ['сп.', 'bed'],
    ['м²', 'm²'],
    [' и ', ' and '],
  ],
  de: [
    ['квартира', 'Wohnung'],
    ['таунхаус', 'Reihenhaus'],
    ['спальни', 'Schlafzimmer'],
    ['спальня', 'Schlafzimmer'],
    ['портал', 'Portal'],
    ['этаж', 'Etage'],
    ['тип ', 'Typ '],
    ['внутри', 'innen'],
    ['Частный сад', 'Privatgarten'],
    ['Кладовая', 'Abstellraum'],
    ['частный сад', 'Privatgarten'],
    ['без прямого вида на океан', 'ohne direkten Meerblick'],
    ['частичный вид на океан', 'teilweiser Meerblick'],
    ['вид на океан', 'Meerblick'],
    ['подготовка зарядки электромобиля', 'Vorbereitung für E-Auto-Ladung'],
    ['канальный кондиционер', 'Kanalklimaanlage'],
    ['солнечные панели', 'Solarmodule'],
    ['в каждом объекте', 'in jeder Einheit'],
    ['в одном проекте', 'in einem Projekt'],
    ['Одна доля соответствует одному объекту', 'Ein Anteil entspricht einer Einheit'],
    ['Инфраструктура комплекса', 'Anlageinfrastruktur'],
    ['долевое участие', 'Beteiligung'],
    ['общая стоимость', 'Gesamtwert'],
    ['Состав проекта', 'Projektzusammensetzung'],
    ['Портфель из', 'Portfolio aus'],
    ['энергокласс', 'Energieklasse'],
    ['Новостройка', 'Neubau'],
    ['машиноместо', 'Stellplatz'],
    ['кладовая', 'Abstellraum'],
    ['терраса', 'Terrasse'],
    ['бассейны', 'Pools'],
    ['бассейн', 'Pool'],
    ['спортзал', 'Fitnessraum'],
    ['кондиционер', 'Klimaanlage'],
    ['парковка', 'Parkplatz'],
    ['объектов', 'Einheiten'],
    ['объекта', 'Einheit'],
    ['корпуса', 'Gebäude'],
    ['корпус', 'Gebäude'],
    ['Испания', 'Spanien'],
    ['Тенерифе', 'Teneriffa'],
    ['хаммам', 'Hammam'],
    ['сауна', 'Sauna'],
    ['сады', 'Gärten'],
    ['аэротермия', 'Aerothermie'],
    ['сантехника', 'Sanitär'],
    ['кухня', 'Küche'],
    ['гараж', 'Garage'],
    ['сад', 'Garten'],
    ['спа', 'Spa'],
    ['сп.', 'Zi.'],
    ['на первой линии', 'in erster Reihe'],
    ['вид на море', 'Meerblick'],
    ['с техникой', 'mit Geräten'],
    ['техникой', 'Geräten'],
    ['подогреваемый', 'beheizt'],
    ['включая', 'inklusive'],
    ['детский', 'Kinder'],
    ['в комплексе', 'in der Anlage'],
    ['комплексе', 'Anlage'],
    ['Цена', 'Preis'],
    ['сейчас', 'jetzt'],
    ['Купить', 'Kaufen'],
    ['купить', 'kaufen'],
    ['целиком', 'vollständig'],
    ['часть', 'Teil von'],
    ['года', ''],
    ['м²', 'm²'],
    [' и ', ' und '],
  ],
  es: [
    ['Talaïa Residences', 'Residencias Talaïa'],
    ['квартира', 'apartamento'],
    ['таунхаус', 'adosado'],
    ['спальни', 'dormitorios'],
    ['спальня', 'dormitorio'],
    ['портал', 'portal'],
    ['этаж', 'planta'],
    ['тип ', 'tipo '],
    ['внутри', 'interior'],
    ['Частный сад', 'Jardín privado'],
    ['Кладовая', 'Trastero'],
    ['частный сад', 'jardín privado'],
    ['без прямого вида на океан', 'sin vistas directas al océano'],
    ['частичный вид на океан', 'vistas parciales al océano'],
    ['вид на океан', 'vistas al océano'],
    ['подготовка зарядки электромобиля', 'preparación para carga de vehículo eléctrico'],
    ['канальный кондиционер', 'aire acondicionado por conductos'],
    ['солнечные панели', 'paneles solares'],
    ['в каждом объекте', 'en cada unidad'],
    ['в одном проекте', 'en un proyecto'],
    ['Одна доля соответствует одному объекту', 'Una participación corresponde a una unidad'],
    ['Инфраструктура комплекса', 'Instalaciones del complejo'],
    ['долевое участие', 'participación'],
    ['общая стоимость', 'valor total'],
    ['Состав проекта', 'Composición del proyecto'],
    ['Портфель из', 'Cartera de'],
    ['энергокласс', 'clase energética'],
    ['Новостройка', 'Obra nueva'],
    ['машиноместо', 'plaza de aparcamiento'],
    ['кладовая', 'trastero'],
    ['терраса', 'terraza'],
    ['бассейны', 'piscinas'],
    ['бассейн', 'piscina'],
    ['спортзал', 'gimnasio'],
    ['кондиционер', 'aire acondicionado'],
    ['парковка', 'aparcamiento'],
    ['объектов', 'unidades'],
    ['объекта', 'unidad'],
    ['корпуса', 'edificios'],
    ['корпус', 'edificio'],
    ['Испания', 'España'],
    ['Тенерифе', 'Tenerife'],
    ['хаммам', 'hammam'],
    ['сауна', 'sauna'],
    ['сады', 'jardines'],
    ['аэротермия', 'aerotermia'],
    ['сантехника', 'sanitarios'],
    ['кухня', 'cocina'],
    ['гараж', 'garaje'],
    ['сад', 'jardín'],
    ['спа', 'spa'],
    ['сп.', 'dorm.'],
    ['на первой линии', 'en primera línea'],
    ['вид на море', 'vistas al mar'],
    ['с техникой', 'con electrodomésticos'],
    ['техникой', 'electrodomésticos'],
    ['подогреваемый', 'climatizada'],
    ['включая', 'incluyendo'],
    ['детский', 'infantil'],
    ['в комплексе', 'en el complejo'],
    ['комплексе', 'complejo'],
    ['Цена', 'Precio'],
    ['сейчас', 'ahora'],
    ['Купить', 'Comprar'],
    ['купить', 'comprar'],
    ['целиком', 'completo'],
    ['часть', 'parte de'],
    ['года', ''],
    ['м²', 'm²'],
    [' и ', ' y '],
  ],
  fr: [
    ['Talaïa Residences', 'Résidences Talaïa'],
    ['квартира', 'appartement'],
    ['таунхаус', 'maison de ville'],
    ['спальни', 'chambres'],
    ['спальня', 'chambre'],
    ['портал', 'portail'],
    ['этаж', 'étage'],
    ['тип ', 'type '],
    ['внутри', 'intérieur'],
    ['Частный сад', 'Jardin privé'],
    ['Кладовая', 'Cellier'],
    ['частный сад', 'jardin privé'],
    ['без прямого вида на океан', 'sans vue directe sur l’océan'],
    ['частичный вид на океан', 'vue partielle sur l’océan'],
    ['вид на океан', 'vue sur l’océan'],
    ['подготовка зарядки электромобиля', 'préparation pour borne de recharge'],
    ['канальный кондиционер', 'climatisation gainable'],
    ['солнечные панели', 'panneaux solaires'],
    ['в каждом объекте', 'dans chaque unité'],
    ['в одном проекте', 'dans un projet'],
    ['Одна доля соответствует одному объекту', 'Une part correspond à une unité'],
    ['Инфраструктура комплекса', 'Infrastructures du complexe'],
    ['долевое участие', 'participation'],
    ['общая стоимость', 'valeur totale'],
    ['Состав проекта', 'Composition du projet'],
    ['Портфель из', 'Portefeuille de'],
    ['энергокласс', 'classe énergétique'],
    ['Новостройка', 'Construction neuve'],
    ['машиноместо', 'place de parking'],
    ['кладовая', 'cellier'],
    ['терраса', 'terrasse'],
    ['бассейны', 'piscines'],
    ['бассейн', 'piscine'],
    ['спортзал', 'salle de sport'],
    ['кондиционер', 'climatisation'],
    ['парковка', 'parking'],
    ['объектов', 'unités'],
    ['объекта', 'unité'],
    ['корпуса', 'bâtiments'],
    ['корпус', 'bâtiment'],
    ['Испания', 'Espagne'],
    ['Тенерифе', 'Ténérife'],
    ['хаммам', 'hammam'],
    ['сауна', 'sauna'],
    ['сады', 'jardins'],
    ['аэротермия', 'aérothermie'],
    ['сантехника', 'sanitaires'],
    ['кухня', 'cuisine'],
    ['гараж', 'garage'],
    ['сад', 'jardin'],
    ['спа', 'spa'],
    ['сп.', 'ch.'],
    ['на первой линии', 'en première ligne'],
    ['вид на море', 'vue mer'],
    ['с техникой', 'avec électroménager'],
    ['техникой', 'électroménager'],
    ['подогреваемый', 'chauffé'],
    ['включая', 'y compris'],
    ['детский', 'enfants'],
    ['в комплексе', 'dans le complexe'],
    ['комплексе', 'complexe'],
    ['Цена', 'Prix'],
    ['сейчас', 'maintenant'],
    ['Купить', 'Acheter'],
    ['купить', 'acheter'],
    ['целиком', 'entièrement'],
    ['часть', 'partie de'],
    ['года', ''],
    ['м²', 'm²'],
    [' и ', ' et '],
  ],
  pl: [
    ['квартира', 'mieszkanie'],
    ['таунхаус', 'segment'],
    ['спальни', 'sypialnie'],
    ['спальня', 'sypialnia'],
    ['портал', 'klatka'],
    ['этаж', 'piętro'],
    ['тип ', 'typ '],
    ['внутри', 'wewnątrz'],
    ['Частный сад', 'Prywatny ogród'],
    ['Кладовая', 'Komórka'],
    ['частный сад', 'prywatny ogród'],
    ['без прямого вида на океан', 'bez bezpośredniego widoku na ocean'],
    ['частичный вид на океан', 'częściowy widok na ocean'],
    ['вид на океан', 'widok na ocean'],
    ['подготовка зарядки электромобиля', 'przygotowanie pod ładowanie EV'],
    ['канальный кондиционер', 'klimatyzacja kanałowa'],
    ['солнечные панели', 'panele słoneczne'],
    ['в каждом объекте', 'w każdej jednostce'],
    ['в одном проекте', 'w jednym projekcie'],
    ['Одна доля соответствует одному объекту', 'Jeden udział odpowiada jednej jednostce'],
    ['Инфраструктура комплекса', 'Infrastruktura kompleksu'],
    ['долевое участие', 'udział własnościowy'],
    ['общая стоимость', 'wartość całkowita'],
    ['Состав проекта', 'Skład projektu'],
    ['Портфель из', 'Portfel z'],
    ['энергокласс', 'klasa energetyczna'],
    ['Новостройка', 'Nowa inwestycja'],
    ['машиноместо', 'miejsce parkingowe'],
    ['кладовая', 'komórka'],
    ['терраса', 'taras'],
    ['бассейны', 'baseny'],
    ['бассейн', 'basen'],
    ['спортзал', 'siłownia'],
    ['кондиционер', 'klimatyzacja'],
    ['парковка', 'parking'],
    ['объектов', 'jednostek'],
    ['объекта', 'jednostki'],
    ['корпуса', 'budynki'],
    ['корпус', 'budynek'],
    ['Испания', 'Hiszpania'],
    ['Тенерифе', 'Teneryfa'],
    ['хаммам', 'hammam'],
    ['сауна', 'sauna'],
    ['сады', 'ogrody'],
    ['аэротермия', 'aerotermia'],
    ['сантехника', 'armatura'],
    ['кухня', 'kuchnia'],
    ['гараж', 'garaż'],
    ['сад', 'ogród'],
    ['спа', 'spa'],
    ['сп.', 'pok.'],
    ['на первой линии', 'w pierwszej linii'],
    ['вид на море', 'widok na morze'],
    ['с техникой', 'z AGD'],
    ['техникой', 'AGD'],
    ['подогреваемый', 'ogrzewany'],
    ['включая', 'w tym'],
    ['детский', 'dziecięcy'],
    ['в комплексе', 'w kompleksie'],
    ['комплексе', 'kompleksie'],
    ['Цена', 'Cena'],
    ['сейчас', 'teraz'],
    ['Купить', 'Kup'],
    ['купить', 'kup'],
    ['целиком', 'w całości'],
    ['часть', 'część'],
    ['года', ''],
    ['м²', 'm²'],
    [' и ', ' i '],
  ],
  sv: [
    ['квартира', 'lägenhet'],
    ['таунхаус', 'radhus'],
    ['спальни', 'sovrum'],
    ['спальня', 'sovrum'],
    ['портал', 'portal'],
    ['этаж', 'våning'],
    ['тип ', 'typ '],
    ['внутри', 'inomhus'],
    ['Частный сад', 'Privat trädgård'],
    ['Кладовая', 'Förråd'],
    ['частный сад', 'privat trädgård'],
    ['без прямого вида на океан', 'utan direkt havsutsikt'],
    ['частичный вид на океан', 'delvis havsutsikt'],
    ['вид на океан', 'havsutsikt'],
    ['подготовка зарядки электромобиля', 'förberett för elbilsladdning'],
    ['канальный кондиционер', 'kanalbunden luftkonditionering'],
    ['солнечные панели', 'solpaneler'],
    ['в каждом объекте', 'i varje enhet'],
    ['в одном проекте', 'i ett projekt'],
    ['Одна доля соответствует одному объекту', 'En andel motsvarar en enhet'],
    ['Инфраструктура комплекса', 'Komplexets faciliteter'],
    ['долевое участие', 'andelägande'],
    ['общая стоимость', 'totalt värde'],
    ['Состав проекта', 'Projektets sammansättning'],
    ['Портфель из', 'Portfölj med'],
    ['энергокласс', 'energiklass'],
    ['Новостройка', 'Nybyggnation'],
    ['машиноместо', 'parkeringsplats'],
    ['кладовая', 'förråd'],
    ['терраса', 'terrass'],
    ['бассейны', 'pooler'],
    ['бассейн', 'pool'],
    ['спортзал', 'gym'],
    ['кондиционер', 'luftkonditionering'],
    ['парковка', 'parkering'],
    ['объектов', 'enheter'],
    ['объекта', 'enhet'],
    ['корпуса', 'byggnader'],
    ['корпус', 'byggnad'],
    ['Испания', 'Spanien'],
    ['Тенерифе', 'Teneriffa'],
    ['хаммам', 'hammam'],
    ['сауна', 'bastu'],
    ['сады', 'trädgårdar'],
    ['аэротермия', 'aerotermi'],
    ['сантехника', 'sanitet'],
    ['кухня', 'kök'],
    ['гараж', 'garage'],
    ['сад', 'trädgård'],
    ['спа', 'spa'],
    ['сп.', 'sovrum'],
    ['на первой линии', 'i första linjen'],
    ['вид на море', 'havsutsikt'],
    ['с техникой', 'med vitvaror'],
    ['техникой', 'vitvaror'],
    ['подогреваемый', 'uppvärmd'],
    ['включая', 'inklusive'],
    ['детский', 'barn'],
    ['в комплексе', 'i komplexet'],
    ['комплексе', 'komplex'],
    ['Цена', 'Pris'],
    ['сейчас', 'nu'],
    ['Купить', 'Köp'],
    ['купить', 'köp'],
    ['целиком', 'helt'],
    ['часть', 'del av'],
    ['года', ''],
    ['м²', 'm²'],
    [' и ', ' och '],
  ],
};

/** EN → target fallback for Latin marketing titles when AI/MyMemory fail. */
const EN_MARKETING_PHRASEBOOK = {
  ru: [
    ['Exclusive Luxury Villa', 'Эксклюзивная люксовая вилла'],
    ['Luxurious Villa', 'Роскошная вилла'],
    ['Luxury Villa for Sale', 'Люксовая вилла на продажу'],
    ['Luxury Villa', 'Люксовая вилла'],
    ['Villa for Sale', 'Вилла на продажу'],
    ['for Sale in', 'на продажу в'],
    ['for Sale', 'на продажу'],
    ['Complex ', 'Комплекс '],
  ],
  de: [
    ['Exclusive Luxury Villa', 'Exklusive Luxusvilla'],
    ['Luxurious Villa', 'Luxuriöse Villa'],
    ['Luxury Villa for Sale', 'Luxusvilla zum Verkauf'],
    ['Luxury Villa', 'Luxusvilla'],
    ['Villa for Sale', 'Villa zum Verkauf'],
    ['for Sale in', 'zum Verkauf in'],
    ['for Sale', 'zum Verkauf'],
    ['Complex ', 'Anlage '],
  ],
  es: [
    ['Exclusive Luxury Villa', 'Villa de lujo exclusiva'],
    ['Luxurious Villa', 'Villa lujosa'],
    ['Luxury Villa for Sale', 'Villa de lujo en venta'],
    ['Luxury Villa', 'Villa de lujo'],
    ['Villa for Sale', 'Villa en venta'],
    ['for Sale in', 'en venta en'],
    ['for Sale', 'en venta'],
    ['Complex ', 'Complejo '],
  ],
  fr: [
    ['Exclusive Luxury Villa', 'Villa de luxe exclusive'],
    ['Luxurious Villa', 'Villa luxueuse'],
    ['Luxury Villa for Sale', 'Villa de luxe à vendre'],
    ['Luxury Villa', 'Villa de luxe'],
    ['Villa for Sale', 'Villa à vendre'],
    ['for Sale in', 'à vendre à'],
    ['for Sale', 'à vendre'],
    ['Complex ', 'Complexe '],
  ],
  pl: [
    ['Exclusive Luxury Villa', 'Ekskluzywna luksusowa willa'],
    ['Luxurious Villa', 'Luksusowa willa'],
    ['Luxury Villa for Sale', 'Luksusowa willa na sprzedaż'],
    ['Luxury Villa', 'Luksusowa willa'],
    ['Villa for Sale', 'Willa na sprzedaż'],
    ['for Sale in', 'na sprzedaż w'],
    ['for Sale', 'na sprzedaż'],
    ['Complex ', 'Kompleks '],
  ],
  sv: [
    ['Exclusive Luxury Villa', 'Exklusiv lyxvilla'],
    ['Luxurious Villa', 'Lyxig villa'],
    ['Luxury Villa for Sale', 'Lyxvilla till salu'],
    ['Luxury Villa', 'Lyxvilla'],
    ['Villa for Sale', 'Villa till salu'],
    ['for Sale in', 'till salu i'],
    ['for Sale', 'till salu'],
    ['Complex ', 'Komplex '],
  ],
};

function applyPhrasePairs(text, pairs) {
  if (!pairs || !text) return text || '';
  let out = String(text);
  for (const [from, to] of pairs) {
    if (!from) continue;
    if (out.includes(from)) {
      out = out.split(from).join(to);
      continue;
    }
    const fromCap = from.charAt(0).toUpperCase() + from.slice(1);
    const toCap = to ? to.charAt(0).toUpperCase() + to.slice(1) : to;
    if (fromCap !== from && out.includes(fromCap)) {
      out = out.split(fromCap).join(toCap);
    }
  }
  return out;
}

export function applyPhrasebook(text, targetLang) {
  if (!text) return '';
  let out = applyPhrasePairs(String(text), PHRASEBOOK[targetLang]);
  // Кириллические «похожие» буквы в кодах типа А/В/С → латиница.
  const lookalikes = [
    ['А', 'A'], ['В', 'B'], ['С', 'C'], ['Е', 'E'], ['Н', 'H'], ['К', 'K'], ['М', 'M'],
    ['О', 'O'], ['Р', 'P'], ['Т', 'T'], ['Х', 'X'],
  ];
  for (const [from, to] of lookalikes) {
    if (out.includes(from)) out = out.split(from).join(to);
  }
  return out;
}

export function applyEnMarketingPhrasebook(text, targetLang) {
  return applyPhrasePairs(text, EN_MARKETING_PHRASEBOOK[targetLang]);
}

function translateTextsWithPhrasebook(texts, sourceLang) {
  const result = emptyResultFromSource(texts);
  result[sourceLang] = { ...texts };
  const useEnMarketing = sourceLang === 'en' || !looksCyrillic(Object.values(texts).join(' '));
  for (const code of targetLangCodesFor(sourceLang)) {
    const translated = {};
    for (const [key, value] of Object.entries(texts)) {
      let next = applyPhrasebook(value, code);
      if (useEnMarketing && code !== 'en') {
        next = applyEnMarketingPhrasebook(next, code);
      }
      translated[key] = next;
    }
    result[code] = translated;
  }
  return result;
}

function chunkText(text) {
  const s = String(text || '');
  if (s.length <= MAX_CHARS_PER_REQUEST) return [s];
  const chunks = [];
  let start = 0;
  while (start < s.length) {
    let end = Math.min(start + MAX_CHARS_PER_REQUEST, s.length);
    if (end < s.length) {
      const lastSpace = s.lastIndexOf(' ', end);
      if (lastSpace > start) end = lastSpace + 1;
    }
    chunks.push(s.slice(start, end).trim());
    start = end;
  }
  return chunks.filter((c) => c.length > 0);
}

async function translateWithMyMemory(text, sourceLang, targetLang) {
  if (!text || !String(text).trim()) return '';
  if (targetLang === sourceLang) return text;

  const chunks = chunkText(text);
  const results = [];
  for (const chunk of chunks) {
    results.push(await translateChunk(chunk, sourceLang, targetLang));
    await delay(REQUEST_DELAY_MS);
  }
  return results.join(' ');
}

function emptyResultFromSource(texts) {
  const result = {};
  for (const { code } of SITE_LANGUAGES) {
    result[code] = { ...texts };
  }
  return result;
}

function looksCyrillic(text) {
  return /[а-яё]/i.test(String(text || ''));
}

/**
 * Целевой перевод не удался: копия исходника или кириллица в non-ru локали.
 * @param {string} [sourceLang]
 */
export function isUntranslatedTarget(sourceTexts, translated, targetLang, sourceLang = 'ru') {
  return translationFieldIssues(sourceTexts, translated, targetLang, sourceLang).length > 0;
}

function translationFieldIssues(sourceTexts, translated, targetLang, sourceLang) {
  if (!targetLang) return ['missing language'];
  const issues = [];
  for (const [field, source] of Object.entries(extractListingTexts(sourceTexts))) {
    const value = translated?.[field];
    if (typeof value !== 'string' || !value.trim()) {
      issues.push(`${field}: missing translation`);
      continue;
    }
    if (targetLang === sourceLang) continue;
    const text = value.trim();
    if (isMyMemoryQuotaOrError(text)) issues.push(`${field}: provider error`);
    if (targetLang !== 'ru' && /\p{Script=Cyrillic}/u.test(text)) {
      issues.push(`${field}: Cyrillic text in ${targetLang}`);
    }
    // Locations and machine codes may legitimately be identical across languages.
    if (text === source && /\p{L}/u.test(source) &&
      (field === 'title' || field === 'description')) {
      issues.push(`${field}: copy of source`);
    }
  }
  return issues;
}

export function validatePropertyTranslations(sourceTexts, translations, sourceLang = detectSourceLang(sourceTexts)) {
  return SITE_LANG_CODES.flatMap(lang => {
    if (!translations?.[lang] || typeof translations[lang] !== 'object' || Array.isArray(translations[lang])) {
      return [`${lang}: missing language`];
    }
    return translationFieldIssues(sourceTexts, translations[lang], lang, sourceLang)
      .map(issue => `${lang}.${issue}`);
  });
}

function assertCompleteTranslations(sourceTexts, translations, sourceLang) {
  const issues = validatePropertyTranslations(sourceTexts, translations, sourceLang);
  if (issues.length) {
    const error = new Error(`Incomplete property translations: ${issues.join('; ')}`);
    error.code = 'INCOMPLETE_PROPERTY_TRANSLATIONS';
    throw error;
  }
}

function countUntranslatedTargets(texts, translations, sourceLang = 'ru') {
  let bad = 0;
  for (const code of targetLangCodesFor(sourceLang)) {
    if (isUntranslatedTarget(texts, translations?.[code], code, sourceLang)) bad += 1;
  }
  return bad;
}

function readModelText(raw) {
  if (Array.isArray(raw)) {
    return raw.map((part) => part?.text || part?.content || '').join('');
  }
  if (raw && typeof raw === 'object') {
    return String(raw.text || raw.content || '');
  }
  return String(raw || '');
}

function tryParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Достаёт JSON из ответа модели: массив частей, markdown, обрезанный хвост. */
export function parseJsonFromModel(raw) {
  let text = readModelText(raw).trim();
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) text = fenced[1].trim();

  const direct = tryParseJson(text);
  if (direct && typeof direct === 'object') return direct;

  const start = text.indexOf('{');
  if (start < 0) return null;
  const slice = text.slice(start);
  let end = slice.lastIndexOf('}');
  while (end > 0) {
    const fragment = slice.slice(0, end + 1).replace(/,\s*([}\]])/g, '$1');
    const closed = closeJsonObject(fragment);
    const parsed = closed ? tryParseJson(closed) : null;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    end = slice.lastIndexOf('}', end - 1);
  }
  return null;
}

function closeJsonObject(fragment) {
  let depth = 0;
  let inString = false;
  let escape = false;
  for (const ch of fragment) {
    if (inString) {
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{' || ch === '[') depth += 1;
    else if (ch === '}' || ch === ']') depth -= 1;
  }
  if (inString || depth < 0) return null;
  return depth === 0 ? fragment : fragment + '}'.repeat(depth);
}

function readModelContent(message) {
  if (!message) return '';
  const content = readModelText(message.content).trim();
  if (content) return content;
  return readModelText(message.reasoning).trim();
}

export function normalizeAiTranslations(parsed, texts, sourceLang) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const payload = parsed.translations && typeof parsed.translations === 'object'
    ? parsed.translations
    : parsed;
  const result = { [sourceLang]: { ...texts } };
  const targets = targetLangCodesFor(sourceLang);
  for (const code of targets) {
    const row = payload[code];
    if (!row || typeof row !== 'object') continue;
    const merged = {};
    for (const key of Object.keys(texts)) {
      const val = typeof row[key] === 'string' ? row[key].trim() : '';
      if (val) merged[key] = val;
    }
    result[code] = merged;
  }
  return result;
}

async function translateWithAi(texts, sourceLang) {
  const provider = getActiveAiProvider();
  if (provider.needsKey && !provider.apiKey) return null;

  const targets = targetLangCodesFor(sourceLang);
  const fieldKeys = Object.keys(texts);
  const fieldSchema = {
    type: 'object',
    additionalProperties: false,
    required: fieldKeys,
    properties: Object.fromEntries(fieldKeys.map((key) => [key, { type: 'string' }])),
  };
  const schema = {
    name: 'property_translations',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: targets,
      properties: Object.fromEntries(targets.map((code) => [code, fieldSchema])),
    },
  };

  const system = `You translate real-estate listing copy for SellYourBrick.
Return one JSON object and nothing else. Top-level keys are the target language codes.
Each language object contains only the provided field names.
Keep numbers, currency, measurements, emails, URLs, and machine codes unchanged.
Do not invent fields that were not provided. Do not add marketing text.`;

  const user = JSON.stringify({
    source_language: sourceLang,
    target_languages: targets.map((code) => ({ code, name: LANG_NAMES[code] })),
    fields: texts,
  });

  const model =
    process.env.PROPERTY_TRANSLATE_MODEL ||
    process.env.PROPERTY_AI_MODEL ||
    provider.defaultModel;

  const headers = {
    'Content-Type': 'application/json',
    ...(provider.extraHeaders || {}),
  };
  if (provider.apiKey) headers.Authorization = `Bearer ${provider.apiKey}`;

  const body = {
    model,
    temperature: 0.1,
    max_tokens: 6000,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  };
  if (provider.id === 'openrouter') {
    body.response_format = { type: 'json_schema', json_schema: schema };
  }

  const response = await fetch(provider.url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(AI_TIMEOUT_MS),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || data?.error || `AI translate ${response.status}`);
  }
  const content = readModelContent(data?.choices?.[0]?.message);
  const parsed = parseJsonFromModel(content);
  const normalized = normalizeAiTranslations(parsed, texts, sourceLang);
  if (!normalized) throw new Error('AI translate returned unreadable JSON');
  return normalized;
}

async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      out[index] = await fn(items[index], index);
    }
  });
  await Promise.all(workers);
  return out;
}

async function translateWithMyMemoryAll(texts, sourceLang, deadlineMs = 20000) {
  const result = emptyResultFromSource(texts);
  result[sourceLang] = { ...texts };
  const keys = Object.keys(texts);
  const deadline = Date.now() + deadlineMs;
  const jobs = [];
  for (const code of targetLangCodesFor(sourceLang)) {
    for (const key of keys) {
      if (!texts[key]) continue;
      jobs.push({ code, key, text: texts[key] });
    }
  }
  await mapPool(jobs, 4, async (job) => {
    if (Date.now() > deadline) return;
    result[job.code][job.key] = await translateWithMyMemory(job.text, sourceLang, job.code);
  });
  return result;
}

/**
 * Перевести все текстовые поля объявления на языки сайта.
 * @returns {Promise<Object>} { ru: { title, description, ... }, en: {...}, ... }
 */
export async function translatePropertyToAllLanguages(property) {
  const texts = extractListingTexts(property);
  if (!Object.keys(texts).length) {
    return emptyResultFromSource({});
  }

  const sourceLang = detectSourceLang(texts);
  let aiResult = null;
  try {
    aiResult = await translateWithAi(texts, sourceLang);
    if (aiResult && countUntranslatedTargets(texts, aiResult, sourceLang) === 0) {
      console.log(`[translate] AI translations ready for property_id=${property?.id || '?'}`);
      return aiResult;
    }
    if (aiResult) {
      console.warn(
        `[translate] AI left ${countUntranslatedTargets(texts, aiResult, sourceLang)} target lang(s) untranslated, trying MyMemory`
      );
    }
  } catch (err) {
    console.warn('[translate] AI failed, falling back to MyMemory:', err.message);
  }

  const memoryResult = await translateWithMyMemoryAll(texts, sourceLang);
  if (countUntranslatedTargets(texts, memoryResult, sourceLang) === 0) {
    return memoryResult;
  }

  const phrasebookResult = translateTextsWithPhrasebook(texts, sourceLang);

  // Смешиваем: MyMemory → AI → phrasebook.
  const targets = targetLangCodesFor(sourceLang);
  const merged = emptyResultFromSource(texts);
  merged[sourceLang] = { ...texts };
  for (const code of targets) {
    const fromMemory = memoryResult?.[code];
    const fromAi = aiResult?.[code];
    const fromBook = phrasebookResult?.[code];
    if (fromMemory && !isUntranslatedTarget(texts, fromMemory, code, sourceLang)) {
      merged[code] = fromMemory;
    } else if (fromAi && !isUntranslatedTarget(texts, fromAi, code, sourceLang)) {
      merged[code] = fromAi;
    } else if (fromBook && !isUntranslatedTarget(texts, fromBook, code, sourceLang)) {
      merged[code] = fromBook;
    } else if (fromMemory) {
      merged[code] = fromMemory;
    } else if (fromAi) {
      merged[code] = fromAi;
    } else if (fromBook) {
      merged[code] = fromBook;
    }
  }

  assertCompleteTranslations(texts, merged, sourceLang);
  return merged;
}

function cleanStoredText(value) {
  return String(value || '').replace(/\u0000/g, '');
}

export async function persistPropertyTranslations(prisma, { propertyId, propertyTable, translations, sourceTexts }) {
  if (!sourceTexts) throw new Error('sourceTexts required to validate property translations');
  assertCompleteTranslations(sourceTexts, translations, detectSourceLang(sourceTexts));
  const pid = Number(propertyId);
  const table = normalizeTranslationPropertyTable(propertyTable);
  const aliases = translationPropertyTableAliases(table);
  const rows = [];
  for (const langCode of SITE_LANG_CODES) {
    const split = splitTranslationForStore(translations[langCode]);
    for (const property_table of aliases) {
      rows.push({
        property_id: pid,
        property_table,
        lang_code: langCode,
        title: cleanStoredText(split.title),
        description: cleanStoredText(split.description),
        additional_amenities: cleanStoredText(split.additional_amenities),
        location: cleanStoredText(split.location),
        extra_json: Object.keys(split.extra).length ? JSON.stringify(split.extra) : null,
        created_at: new Date().toISOString(),
      });
    }
  }
  // Validation precedes deletion. A failed write rolls back the entire replacement,
  // including both canonical and legacy aliases.
  const write = withoutExtra => prisma.$transaction(async tx => {
    await tx.property_translations.deleteMany({
      where: { property_id: pid, property_table: { in: aliases } },
    });
    for (const row of rows) {
      const { extra_json: _ignored, ...core } = row;
      await tx.property_translations.create({ data: withoutExtra ? core : row });
    }
  }, { timeout: 15000 });
  try {
    await write(false);
  } catch (error) {
    if (!/extra_json/i.test(String(error?.message || ''))) throw error;
    // Do not report success if the schema would discard required translations.
    if (rows.some(row => row.extra_json)) throw error;
    // Old schemas lack extra_json. Retry in a fresh transaction after rollback.
    await write(true);
  }
}

export function resolveTranslationTable(property) {
  return normalizeTranslationPropertyTable(property?.source_table, property?.property_type);
}

export async function translateAndPersistProperty(prisma, property) {
  const table = resolveTranslationTable(property);
  const texts = extractListingTexts(property);
  let translations;
  try {
    translations = await translatePropertyToAllLanguages(property);
  } catch (err) {
    console.error('[translate] falling back to phrasebook:', err?.message || err);
    translations = translateTextsWithPhrasebook(texts, detectSourceLang(texts));
  }
  if (!translations || !Object.keys(translations).length) {
    throw new Error('No translations produced');
  }
  await persistPropertyTranslations(prisma, {
    propertyId: Number(property.id),
    propertyTable: table,
    sourceTexts: extractListingTexts(property),
    translations,
  });
  console.log(
    `✅ Переводы сохранены для property_id=${property.id}, table=${table}, языков: ${Object.keys(translations).length}`
  );
  return { table, translations };
}

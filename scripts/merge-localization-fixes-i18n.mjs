/**
 * Merge localization-fix keys into mainPage locale JSON (src + legacy).
 * Also backfills any missing keys from English so UI never shows raw key names.
 *
 * Usage: node scripts/merge-localization-fixes-i18n.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const primaryLocalesDir = path.join(__dirname, '../src/i18n/locales/mainPage')
const legacyLocalesDir = path.join(
  __dirname,
  '../apps/client/src/legacy/i18n/locales/mainPage',
)

/** @type {Record<string, Record<string, string>>} */
const PACK = {
  ru: {
    debtRiskUnknown: 'Риск оценивается',
    debtRiskUnknownShort: 'Оценивается',
    debtRiskUnknownDescription: 'Полная оценка риска ещё формируется',
    debtRiskShort_high: 'Высокий',
    debtRiskShort_medium: 'Средний',
    debtRiskShort_low: 'Низкий',
    debtRiskOpenDocumentsAria: '{{label}}. Открыть документы объекта',
    debtRiskCategory_utilities: 'Коммунальные платежи',
    debtRiskCategory_mortgage: 'Банковский залог',
    debtRiskCategory_taxes: 'Налоги на имущество',
    debtRiskCategory_arrest: 'Аресты и ограничения',
    debtRiskCategory_inherited: 'Наследственные обязательства',
    debtRiskCategory_thirdParty: 'Обязательства перед третьими лицами',
    debtRiskCategoriesPending: 'Состав обязательств уточняется',
    buyerPage_mapYield: 'доходность',
    buyerPage_mapArea: 'площадь',
    buyerPage_mapBeds: 'спальни',
    buyerPage_mapTrust: 'проверка',
    buyerPage_mapBedsValue: '3 сп.',
    buyerPage_mapLearnMore: 'Подробнее',
    buyerPage_mapBadgeNew: 'NEW',
    buyerPage_mapAria: 'Карта с объектом',
    buyerPage_mapMetricsAria: 'Показатели объекта',
    buyerPage_mapSelectedAria: 'Выбранный объект',
    buyerPage_mapFeaturedTitle: 'Luxury Oceanfront Villa',
    buyerPage_mapFeaturedLocation: 'Marbella, Costa del Sol',
    propertyAi_brandLabel: 'НЕДВИЖИМОСТЬ AI',
    propertyAi_openAria: 'Открыть Недвижимость AI',
    propertyAi_expandAria: 'Развернуть Недвижимость AI',
    propertyAi_close: 'Закрыть',
    propertyAi_history: 'История',
    propertyAi_pickerTitle: 'РАССКАЖУ ПРО ЭТОТ\nОБЪЕКТ',
    propertyAi_scenarioRisks: 'Плюсы и риски',
    propertyAi_scenarioRisksQuestion: 'Какие у этого объекта главные плюсы и риски?',
    propertyAi_scenarioInvestment: 'Инвестиционный потенциал',
    propertyAi_scenarioInvestmentQuestion: 'Какой инвестиционный потенциал у этого объекта?',
    propertyAi_scenarioDetails: 'Подробный разбор',
    propertyAi_scenarioDetailsQuestion: 'Сделай подробный разбор этого объекта.',
    propertyAi_scenarioCustom: 'Свой вопрос',
    propertyAi_greeting:
      'Привет! Я изучу данные этого объявления, дам короткий ответ и подготовлю подробную PDF-презентацию.',
    propertyAi_statusQueuedTitle: 'Готовим анализ',
    propertyAi_statusQueuedText: 'Собираем данные объявления',
    propertyAi_statusAnalyzingTitle: 'Анализируем объект',
    propertyAi_statusAnalyzingText: 'Gemini изучает характеристики и фотографии',
    propertyAi_statusRenderingTitle: 'Оформляем презентацию',
    propertyAi_statusRenderingText: 'Создаём страницы и собираем PDF',
    propertyAi_propertyFallback: 'Объект недвижимости',
    propertyAi_locationFallback: 'Локация указана в объявлении',
    propertyAi_roomsShort: '{{count}} комн.',
    propertyAi_floorShort: '{{floor}} этаж',
    testDriveBooking_rulesTitle: 'Правила',
    testDriveBooking_hintCheckInCardTitle: 'Заезд с 15:00',
    testDriveBooking_hintCheckInCardText:
      'В первый день ключи и доступ согласуются с владельцем после подтверждения.',
    testDriveBooking_hintStayCardTitle: 'От 5 до 21 суток',
    testDriveBooking_hintStayCardText:
      'Выберите подряд идущие даты — столько ночей вы проживёте на объекте.',
    testDriveBooking_hintCheckOutCardTitle: 'Выезд до 12:00',
    testDriveBooking_hintCheckOutCardText:
      'В последний день освободите объект до полудня, если иное не согласовано.',
    testDriveBooking_hintBusyCardTitle: 'Занятые даты',
    testDriveBooking_hintBusyCardText:
      'Зелёным — ваши заявки, оранжевым — чужие. После выбора дат укажите способ связи.',
    testDriveBooking_hintCheckInMeta: 'День 1',
    testDriveBooking_hintStayMeta: '5–21 дн.',
    testDriveBooking_hintCheckOutMeta: 'День N',
    testDriveBooking_hintBusyMeta: 'Статус',
    testDriveBooking_hintCheckInTag: 'Заезд',
    testDriveBooking_hintStayTag: 'Проживание',
    testDriveBooking_hintCheckOutTag: 'Выезд',
    testDriveBooking_hintBusyTag: 'Календарь',
    testDriveBooking_pickDates: 'Выбор дат',
    testDriveBooking_heroSubtitle:
      'Отметьте от 5 до 21 дня подряд — затем выберите способ связи.',
    testDriveBooking_eyebrow: 'Тест-драйв недвижимости',
    heroBrandImageAlt: 'SellYourBrick',
  },
  en: {
    debtRiskUnknown: 'Risk being assessed',
    debtRiskUnknownShort: 'Assessing',
    debtRiskUnknownDescription: 'Full risk assessment is still being prepared',
    debtRiskShort_high: 'High',
    debtRiskShort_medium: 'Medium',
    debtRiskShort_low: 'Low',
    debtRiskOpenDocumentsAria: '{{label}}. Open property documents',
    debtRiskCategory_utilities: 'Utility bills',
    debtRiskCategory_mortgage: 'Bank mortgage lien',
    debtRiskCategory_taxes: 'Property taxes',
    debtRiskCategory_arrest: 'Seizures and restrictions',
    debtRiskCategory_inherited: 'Inherited obligations',
    debtRiskCategory_thirdParty: 'Third-party obligations',
    debtRiskCategoriesPending: 'Debt composition is being clarified',
    buyerPage_mapYield: 'yield',
    buyerPage_mapArea: 'area',
    buyerPage_mapBeds: 'bedrooms',
    buyerPage_mapTrust: 'verified',
    buyerPage_mapBedsValue: '3 bed',
    buyerPage_mapLearnMore: 'Learn more',
    buyerPage_mapBadgeNew: 'NEW',
    buyerPage_mapAria: 'Map with property',
    buyerPage_mapMetricsAria: 'Property metrics',
    buyerPage_mapSelectedAria: 'Selected property',
    buyerPage_mapFeaturedTitle: 'Luxury Oceanfront Villa',
    buyerPage_mapFeaturedLocation: 'Marbella, Costa del Sol',
    propertyAi_brandLabel: 'PROPERTY AI',
    propertyAi_openAria: 'Open Property AI',
    propertyAi_expandAria: 'Expand Property AI',
    propertyAi_close: 'Close',
    propertyAi_history: 'History',
    propertyAi_pickerTitle: 'TELL ME ABOUT THIS\nPROPERTY',
    propertyAi_scenarioRisks: 'Pros and risks',
    propertyAi_scenarioRisksQuestion: 'What are the main pros and risks of this property?',
    propertyAi_scenarioInvestment: 'Investment potential',
    propertyAi_scenarioInvestmentQuestion: 'What is the investment potential of this property?',
    propertyAi_scenarioDetails: 'Detailed review',
    propertyAi_scenarioDetailsQuestion: 'Give a detailed review of this property.',
    propertyAi_scenarioCustom: 'Custom question',
    propertyAi_greeting:
      'Hi! I will review this listing, give a short answer, and prepare a detailed PDF presentation.',
    propertyAi_statusQueuedTitle: 'Preparing analysis',
    propertyAi_statusQueuedText: 'Collecting listing data',
    propertyAi_statusAnalyzingTitle: 'Analyzing property',
    propertyAi_statusAnalyzingText: 'Gemini is reviewing features and photos',
    propertyAi_statusRenderingTitle: 'Building presentation',
    propertyAi_statusRenderingText: 'Creating pages and assembling the PDF',
    propertyAi_propertyFallback: 'Property',
    propertyAi_locationFallback: 'Location listed in the ad',
    propertyAi_roomsShort: '{{count}} rooms',
    propertyAi_floorShort: 'Floor {{floor}}',
    testDriveBooking_rulesTitle: 'Rules',
    testDriveBooking_hintCheckInCardTitle: 'Check-in from 15:00',
    testDriveBooking_hintCheckInCardText:
      'On the first day, keys and access are arranged with the owner after confirmation.',
    testDriveBooking_hintStayCardTitle: 'From 5 to 21 days',
    testDriveBooking_hintStayCardText:
      'Select consecutive dates — that many nights you will stay at the property.',
    testDriveBooking_hintCheckOutCardTitle: 'Check-out by 12:00',
    testDriveBooking_hintCheckOutCardText:
      'On the last day, leave the property by noon unless otherwise agreed.',
    testDriveBooking_hintBusyCardTitle: 'Booked dates',
    testDriveBooking_hintBusyCardText:
      'Green — your requests, orange — others. After selecting dates, choose a contact method.',
    testDriveBooking_hintCheckInMeta: 'Day 1',
    testDriveBooking_hintStayMeta: '5–21 days',
    testDriveBooking_hintCheckOutMeta: 'Day N',
    testDriveBooking_hintBusyMeta: 'Status',
    testDriveBooking_hintCheckInTag: 'Check-in',
    testDriveBooking_hintStayTag: 'Stay',
    testDriveBooking_hintCheckOutTag: 'Check-out',
    testDriveBooking_hintBusyTag: 'Calendar',
    testDriveBooking_pickDates: 'Pick dates',
    testDriveBooking_heroSubtitle:
      'Mark 5 to 21 consecutive days — then choose a contact method.',
    testDriveBooking_eyebrow: 'Property test drive',
    heroBrandImageAlt: 'SellYourBrick',
  },
  de: null,
  es: null,
  fr: null,
  pl: null,
  sv: null,
}

// Reuse full packs from a side module-style object to keep this file readable —
// de/es/fr/pl/sv were defined in the previous revision; load via duplicate below.
Object.assign(PACK, {
  de: {
    debtRiskUnknown: 'Risiko wird bewertet',
    debtRiskUnknownShort: 'Bewertung',
    debtRiskUnknownDescription: 'Die vollständige Risikobewertung wird noch erstellt',
    debtRiskShort_high: 'Hoch',
    debtRiskShort_medium: 'Mittel',
    debtRiskShort_low: 'Niedrig',
    debtRiskOpenDocumentsAria: '{{label}}. Objektdokumente öffnen',
    debtRiskCategory_utilities: 'Nebenkosten',
    debtRiskCategory_mortgage: 'Bankhypothek',
    debtRiskCategory_taxes: 'Grundsteuern',
    debtRiskCategory_arrest: 'Beschlagnahmen und Beschränkungen',
    debtRiskCategory_inherited: 'Erbschaftsverbindlichkeiten',
    debtRiskCategory_thirdParty: 'Verbindlichkeiten Dritter',
    debtRiskCategoriesPending: 'Zusammensetzung der Verbindlichkeiten wird geklärt',
    buyerPage_mapYield: 'Rendite',
    buyerPage_mapArea: 'Fläche',
    buyerPage_mapBeds: 'Schlafzimmer',
    buyerPage_mapTrust: 'geprüft',
    buyerPage_mapBedsValue: '3 SZ',
    buyerPage_mapLearnMore: 'Mehr erfahren',
    buyerPage_mapBadgeNew: 'NEU',
    buyerPage_mapAria: 'Karte mit Objekt',
    buyerPage_mapMetricsAria: 'Objektkennzahlen',
    buyerPage_mapSelectedAria: 'Ausgewähltes Objekt',
    buyerPage_mapFeaturedTitle: 'Luxury Oceanfront Villa',
    buyerPage_mapFeaturedLocation: 'Marbella, Costa del Sol',
    propertyAi_brandLabel: 'IMMOBILIEN-KI',
    propertyAi_openAria: 'Immobilien-KI öffnen',
    propertyAi_expandAria: 'Immobilien-KI erweitern',
    propertyAi_close: 'Schließen',
    propertyAi_history: 'Verlauf',
    propertyAi_pickerTitle: 'ICH ERZÄHLE DIR VON\nDIESEM OBJEKT',
    propertyAi_scenarioRisks: 'Vorteile und Risiken',
    propertyAi_scenarioRisksQuestion: 'Was sind die wichtigsten Vorteile und Risiken dieses Objekts?',
    propertyAi_scenarioInvestment: 'Investitionspotenzial',
    propertyAi_scenarioInvestmentQuestion: 'Welches Investitionspotenzial hat dieses Objekt?',
    propertyAi_scenarioDetails: 'Detaillierte Analyse',
    propertyAi_scenarioDetailsQuestion: 'Erstelle eine detaillierte Analyse dieses Objekts.',
    propertyAi_scenarioCustom: 'Eigene Frage',
    propertyAi_greeting:
      'Hallo! Ich prüfe dieses Inserat, gebe eine kurze Antwort und erstelle eine ausführliche PDF-Präsentation.',
    propertyAi_statusQueuedTitle: 'Analyse wird vorbereitet',
    propertyAi_statusQueuedText: 'Inseratsdaten werden gesammelt',
    propertyAi_statusAnalyzingTitle: 'Objekt wird analysiert',
    propertyAi_statusAnalyzingText: 'Gemini prüft Merkmale und Fotos',
    propertyAi_statusRenderingTitle: 'Präsentation wird erstellt',
    propertyAi_statusRenderingText: 'Seiten werden erstellt und PDF zusammengestellt',
    propertyAi_propertyFallback: 'Immobilie',
    propertyAi_locationFallback: 'Lage laut Inserat',
    propertyAi_roomsShort: '{{count}} Zi.',
    propertyAi_floorShort: '{{floor}}. Etage',
    testDriveBooking_rulesTitle: 'Regeln',
    testDriveBooking_hintCheckInCardTitle: 'Anreise ab 15:00',
    testDriveBooking_hintCheckInCardText:
      'Am ersten Tag werden Schlüssel und Zugang nach Bestätigung mit dem Eigentümer abgestimmt.',
    testDriveBooking_hintStayCardTitle: 'Von 5 bis 21 Tagen',
    testDriveBooking_hintStayCardText:
      'Wählen Sie aufeinanderfolgende Daten — so viele Nächte bleiben Sie im Objekt.',
    testDriveBooking_hintCheckOutCardTitle: 'Abreise bis 12:00',
    testDriveBooking_hintCheckOutCardText:
      'Am letzten Tag das Objekt bis mittags freigeben, sofern nichts anderes vereinbart ist.',
    testDriveBooking_hintBusyCardTitle: 'Belegte Daten',
    testDriveBooking_hintBusyCardText:
      'Grün — Ihre Anfragen, orange — andere. Nach der Datumsauswahl Kontakt wählen.',
    testDriveBooking_hintCheckInMeta: 'Tag 1',
    testDriveBooking_hintStayMeta: '5–21 Tg.',
    testDriveBooking_hintCheckOutMeta: 'Tag N',
    testDriveBooking_hintBusyMeta: 'Status',
    testDriveBooking_hintCheckInTag: 'Anreise',
    testDriveBooking_hintStayTag: 'Aufenthalt',
    testDriveBooking_hintCheckOutTag: 'Abreise',
    testDriveBooking_hintBusyTag: 'Kalender',
    testDriveBooking_pickDates: 'Daten wählen',
    testDriveBooking_heroSubtitle:
      'Markieren Sie 5 bis 21 aufeinanderfolgende Tage — dann wählen Sie den Kontaktweg.',
    testDriveBooking_eyebrow: 'Immobilien-Testdrive',
    heroBrandImageAlt: 'SellYourBrick',
  },
  es: {
    debtRiskUnknown: 'Riesgo en evaluación',
    debtRiskUnknownShort: 'Evaluando',
    debtRiskUnknownDescription: 'La evaluación completa del riesgo aún se está preparando',
    debtRiskShort_high: 'Alto',
    debtRiskShort_medium: 'Medio',
    debtRiskShort_low: 'Bajo',
    debtRiskOpenDocumentsAria: '{{label}}. Abrir documentos del inmueble',
    debtRiskCategory_utilities: 'Suministros',
    debtRiskCategory_mortgage: 'Hipoteca bancaria',
    debtRiskCategory_taxes: 'Impuestos sobre el inmueble',
    debtRiskCategory_arrest: 'Embargos y restricciones',
    debtRiskCategory_inherited: 'Obligaciones hereditarias',
    debtRiskCategory_thirdParty: 'Obligaciones frente a terceros',
    debtRiskCategoriesPending: 'La composición de la deuda se está aclarando',
    buyerPage_mapYield: 'rentabilidad',
    buyerPage_mapArea: 'superficie',
    buyerPage_mapBeds: 'dormitorios',
    buyerPage_mapTrust: 'verificado',
    buyerPage_mapBedsValue: '3 hab.',
    buyerPage_mapLearnMore: 'Más detalles',
    buyerPage_mapBadgeNew: 'NUEVO',
    buyerPage_mapAria: 'Mapa con inmueble',
    buyerPage_mapMetricsAria: 'Indicadores del inmueble',
    buyerPage_mapSelectedAria: 'Inmueble seleccionado',
    buyerPage_mapFeaturedTitle: 'Luxury Oceanfront Villa',
    buyerPage_mapFeaturedLocation: 'Marbella, Costa del Sol',
    propertyAi_brandLabel: 'IA INMOBILIARIA',
    propertyAi_openAria: 'Abrir IA inmobiliaria',
    propertyAi_expandAria: 'Expandir IA inmobiliaria',
    propertyAi_close: 'Cerrar',
    propertyAi_history: 'Historial',
    propertyAi_pickerTitle: 'TE CUENTO SOBRE ESTE\nINMUEBLE',
    propertyAi_scenarioRisks: 'Pros y riesgos',
    propertyAi_scenarioRisksQuestion: '¿Cuáles son los principales pros y riesgos de este inmueble?',
    propertyAi_scenarioInvestment: 'Potencial de inversión',
    propertyAi_scenarioInvestmentQuestion: '¿Cuál es el potencial de inversión de este inmueble?',
    propertyAi_scenarioDetails: 'Análisis detallado',
    propertyAi_scenarioDetailsQuestion: 'Haz un análisis detallado de este inmueble.',
    propertyAi_scenarioCustom: 'Pregunta propia',
    propertyAi_greeting:
      '¡Hola! Revisaré este anuncio, daré una respuesta breve y prepararé una presentación PDF detallada.',
    propertyAi_statusQueuedTitle: 'Preparando el análisis',
    propertyAi_statusQueuedText: 'Recopilando datos del anuncio',
    propertyAi_statusAnalyzingTitle: 'Analizando el inmueble',
    propertyAi_statusAnalyzingText: 'Gemini revisa características y fotos',
    propertyAi_statusRenderingTitle: 'Creando la presentación',
    propertyAi_statusRenderingText: 'Generando páginas y armando el PDF',
    propertyAi_propertyFallback: 'Inmueble',
    propertyAi_locationFallback: 'Ubicación indicada en el anuncio',
    propertyAi_roomsShort: '{{count}} hab.',
    propertyAi_floorShort: 'Planta {{floor}}',
    testDriveBooking_rulesTitle: 'Reglas',
    testDriveBooking_hintCheckInCardTitle: 'Entrada desde las 15:00',
    testDriveBooking_hintCheckInCardText:
      'El primer día, las llaves y el acceso se acuerdan con el propietario tras la confirmación.',
    testDriveBooking_hintStayCardTitle: 'De 5 a 21 días',
    testDriveBooking_hintStayCardText:
      'Elige fechas consecutivas: tantas noches te quedarás en el inmueble.',
    testDriveBooking_hintCheckOutCardTitle: 'Salida antes de las 12:00',
    testDriveBooking_hintCheckOutCardText:
      'El último día, deja el inmueble al mediodía salvo otro acuerdo.',
    testDriveBooking_hintBusyCardTitle: 'Fechas ocupadas',
    testDriveBooking_hintBusyCardText:
      'Verde — tus solicitudes, naranja — otras. Tras elegir fechas, indica el contacto.',
    testDriveBooking_hintCheckInMeta: 'Día 1',
    testDriveBooking_hintStayMeta: '5–21 d.',
    testDriveBooking_hintCheckOutMeta: 'Día N',
    testDriveBooking_hintBusyMeta: 'Estado',
    testDriveBooking_hintCheckInTag: 'Entrada',
    testDriveBooking_hintStayTag: 'Estancia',
    testDriveBooking_hintCheckOutTag: 'Salida',
    testDriveBooking_hintBusyTag: 'Calendario',
    testDriveBooking_pickDates: 'Elegir fechas',
    testDriveBooking_heroSubtitle:
      'Marca de 5 a 21 días seguidos — luego elige el método de contacto.',
    testDriveBooking_eyebrow: 'Prueba del inmueble',
    heroBrandImageAlt: 'SellYourBrick',
  },
  fr: {
    debtRiskUnknown: 'Risque en cours d’évaluation',
    debtRiskUnknownShort: 'Évaluation',
    debtRiskUnknownDescription: 'L’évaluation complète du risque est encore en cours',
    debtRiskShort_high: 'Élevé',
    debtRiskShort_medium: 'Moyen',
    debtRiskShort_low: 'Faible',
    debtRiskOpenDocumentsAria: '{{label}}. Ouvrir les documents du bien',
    debtRiskCategory_utilities: 'Charges',
    debtRiskCategory_mortgage: 'Hypothèque bancaire',
    debtRiskCategory_taxes: 'Taxes foncières',
    debtRiskCategory_arrest: 'Saisies et restrictions',
    debtRiskCategory_inherited: 'Obligations successorales',
    debtRiskCategory_thirdParty: 'Obligations envers des tiers',
    debtRiskCategoriesPending: 'La composition de la dette est en cours de clarification',
    buyerPage_mapYield: 'rendement',
    buyerPage_mapArea: 'superficie',
    buyerPage_mapBeds: 'chambres',
    buyerPage_mapTrust: 'vérifié',
    buyerPage_mapBedsValue: '3 ch.',
    buyerPage_mapLearnMore: 'En savoir plus',
    buyerPage_mapBadgeNew: 'NOUVEAU',
    buyerPage_mapAria: 'Carte avec bien',
    buyerPage_mapMetricsAria: 'Indicateurs du bien',
    buyerPage_mapSelectedAria: 'Bien sélectionné',
    buyerPage_mapFeaturedTitle: 'Luxury Oceanfront Villa',
    buyerPage_mapFeaturedLocation: 'Marbella, Costa del Sol',
    propertyAi_brandLabel: 'IA IMMOBILIÈRE',
    propertyAi_openAria: 'Ouvrir l’IA immobilière',
    propertyAi_expandAria: 'Développer l’IA immobilière',
    propertyAi_close: 'Fermer',
    propertyAi_history: 'Historique',
    propertyAi_pickerTitle: 'JE VOUS PARLE DE CE\nBIEN',
    propertyAi_scenarioRisks: 'Atouts et risques',
    propertyAi_scenarioRisksQuestion: 'Quels sont les principaux atouts et risques de ce bien ?',
    propertyAi_scenarioInvestment: 'Potentiel d’investissement',
    propertyAi_scenarioInvestmentQuestion: 'Quel est le potentiel d’investissement de ce bien ?',
    propertyAi_scenarioDetails: 'Analyse détaillée',
    propertyAi_scenarioDetailsQuestion: 'Fais une analyse détaillée de ce bien.',
    propertyAi_scenarioCustom: 'Question libre',
    propertyAi_greeting:
      'Bonjour ! Je vais étudier cette annonce, donner une réponse courte et préparer une présentation PDF détaillée.',
    propertyAi_statusQueuedTitle: 'Préparation de l’analyse',
    propertyAi_statusQueuedText: 'Collecte des données de l’annonce',
    propertyAi_statusAnalyzingTitle: 'Analyse du bien',
    propertyAi_statusAnalyzingText: 'Gemini étudie les caractéristiques et les photos',
    propertyAi_statusRenderingTitle: 'Création de la présentation',
    propertyAi_statusRenderingText: 'Création des pages et assemblage du PDF',
    propertyAi_propertyFallback: 'Bien immobilier',
    propertyAi_locationFallback: 'Localisation indiquée dans l’annonce',
    propertyAi_roomsShort: '{{count}} pi.',
    propertyAi_floorShort: 'Étage {{floor}}',
    testDriveBooking_rulesTitle: 'Règles',
    testDriveBooking_hintCheckInCardTitle: 'Arrivée dès 15 h',
    testDriveBooking_hintCheckInCardText:
      'Le premier jour, les clés et l’accès sont convenus avec le propriétaire après confirmation.',
    testDriveBooking_hintStayCardTitle: 'De 5 à 21 jours',
    testDriveBooking_hintStayCardText:
      'Choisissez des dates consécutives — autant de nuits sur le bien.',
    testDriveBooking_hintCheckOutCardTitle: 'Départ avant 12 h',
    testDriveBooking_hintCheckOutCardText:
      'Le dernier jour, quittez le bien avant midi sauf autre accord.',
    testDriveBooking_hintBusyCardTitle: 'Dates réservées',
    testDriveBooking_hintBusyCardText:
      'Vert — vos demandes, orange — les autres. Après les dates, choisissez le contact.',
    testDriveBooking_hintCheckInMeta: 'Jour 1',
    testDriveBooking_hintStayMeta: '5–21 j.',
    testDriveBooking_hintCheckOutMeta: 'Jour N',
    testDriveBooking_hintBusyMeta: 'Statut',
    testDriveBooking_hintCheckInTag: 'Arrivée',
    testDriveBooking_hintStayTag: 'Séjour',
    testDriveBooking_hintCheckOutTag: 'Départ',
    testDriveBooking_hintBusyTag: 'Calendrier',
    testDriveBooking_pickDates: 'Choisir les dates',
    testDriveBooking_heroSubtitle:
      'Cochez de 5 à 21 jours consécutifs — puis choisissez le mode de contact.',
    testDriveBooking_eyebrow: 'Essai du bien',
    heroBrandImageAlt: 'SellYourBrick',
  },
  pl: {
    debtRiskUnknown: 'Ryzyko w ocenie',
    debtRiskUnknownShort: 'Ocena',
    debtRiskUnknownDescription: 'Pełna ocena ryzyka jest jeszcze przygotowywana',
    debtRiskShort_high: 'Wysokie',
    debtRiskShort_medium: 'Średnie',
    debtRiskShort_low: 'Niskie',
    debtRiskOpenDocumentsAria: '{{label}}. Otwórz dokumenty obiektu',
    debtRiskCategory_utilities: 'Opłaty komunalne',
    debtRiskCategory_mortgage: 'Zastaw bankowy',
    debtRiskCategory_taxes: 'Podatki od nieruchomości',
    debtRiskCategory_arrest: 'Areszty i ograniczenia',
    debtRiskCategory_inherited: 'Zobowiązania spadkowe',
    debtRiskCategory_thirdParty: 'Zobowiązania wobec osób trzecich',
    debtRiskCategoriesPending: 'Skład zobowiązań jest wyjaśniany',
    buyerPage_mapYield: 'rentowność',
    buyerPage_mapArea: 'powierzchnia',
    buyerPage_mapBeds: 'sypialnie',
    buyerPage_mapTrust: 'weryfikacja',
    buyerPage_mapBedsValue: '3 syp.',
    buyerPage_mapLearnMore: 'Szczegóły',
    buyerPage_mapBadgeNew: 'NOWE',
    buyerPage_mapAria: 'Mapa z obiektem',
    buyerPage_mapMetricsAria: 'Wskaźniki obiektu',
    buyerPage_mapSelectedAria: 'Wybrany obiekt',
    buyerPage_mapFeaturedTitle: 'Luxury Oceanfront Villa',
    buyerPage_mapFeaturedLocation: 'Marbella, Costa del Sol',
    propertyAi_brandLabel: 'AI NIERUCHOMOŚCI',
    propertyAi_openAria: 'Otwórz AI nieruchomości',
    propertyAi_expandAria: 'Rozwiń AI nieruchomości',
    propertyAi_close: 'Zamknij',
    propertyAi_history: 'Historia',
    propertyAi_pickerTitle: 'OPOWIEM O TYM\nOBIEKCIE',
    propertyAi_scenarioRisks: 'Zalety i ryzyka',
    propertyAi_scenarioRisksQuestion: 'Jakie są główne zalety i ryzyka tego obiektu?',
    propertyAi_scenarioInvestment: 'Potencjał inwestycyjny',
    propertyAi_scenarioInvestmentQuestion: 'Jaki jest potencjał inwestycyjny tego obiektu?',
    propertyAi_scenarioDetails: 'Szczegółowa analiza',
    propertyAi_scenarioDetailsQuestion: 'Zrób szczegółową analizę tego obiektu.',
    propertyAi_scenarioCustom: 'Własne pytanie',
    propertyAi_greeting:
      'Cześć! Przejrzę to ogłoszenie, dam krótką odpowiedź i przygotuję szczegółową prezentację PDF.',
    propertyAi_statusQueuedTitle: 'Przygotowujemy analizę',
    propertyAi_statusQueuedText: 'Zbieramy dane ogłoszenia',
    propertyAi_statusAnalyzingTitle: 'Analizujemy obiekt',
    propertyAi_statusAnalyzingText: 'Gemini bada cechy i zdjęcia',
    propertyAi_statusRenderingTitle: 'Tworzymy prezentację',
    propertyAi_statusRenderingText: 'Generujemy strony i składamy PDF',
    propertyAi_propertyFallback: 'Nieruchomość',
    propertyAi_locationFallback: 'Lokalizacja podana w ogłoszeniu',
    propertyAi_roomsShort: '{{count}} pok.',
    propertyAi_floorShort: '{{floor}} piętro',
    testDriveBooking_rulesTitle: 'Zasady',
    testDriveBooking_hintCheckInCardTitle: 'Zameldowanie od 15:00',
    testDriveBooking_hintCheckInCardText:
      'Pierwszego dnia klucze i dostęp uzgadnia się z właścicielem po potwierdzeniu.',
    testDriveBooking_hintStayCardTitle: 'Od 5 do 21 dni',
    testDriveBooking_hintStayCardText:
      'Wybierz kolejne daty — tyle nocy spędzisz w obiekcie.',
    testDriveBooking_hintCheckOutCardTitle: 'Wymeldowanie do 12:00',
    testDriveBooking_hintCheckOutCardText:
      'Ostatniego dnia zwolnij obiekt do południa, chyba że uzgodniono inaczej.',
    testDriveBooking_hintBusyCardTitle: 'Zajęte daty',
    testDriveBooking_hintBusyCardText:
      'Zielone — Twoje wnioski, pomarańczowe — obce. Po wyborze dat wskaż kontakt.',
    testDriveBooking_hintCheckInMeta: 'Dzień 1',
    testDriveBooking_hintStayMeta: '5–21 dn.',
    testDriveBooking_hintCheckOutMeta: 'Dzień N',
    testDriveBooking_hintBusyMeta: 'Status',
    testDriveBooking_hintCheckInTag: 'Zameldowanie',
    testDriveBooking_hintStayTag: 'Pobyt',
    testDriveBooking_hintCheckOutTag: 'Wymeldowanie',
    testDriveBooking_hintBusyTag: 'Kalendarz',
    testDriveBooking_pickDates: 'Wybór dat',
    testDriveBooking_heroSubtitle:
      'Zaznacz od 5 do 21 kolejnych dni — potem wybierz sposób kontaktu.',
    testDriveBooking_eyebrow: 'Test-drive nieruchomości',
    heroBrandImageAlt: 'SellYourBrick',
    testDriveBooking_hintCheckInTitle: 'Zameldowanie',
    testDriveBooking_hintCheckInText:
      'Pierwszego dnia zameldowanie od 15:00. Klucze lub dostęp uzgadnia się z właścicielem po potwierdzeniu.',
    testDriveBooking_hintStayTitle: 'Pobyt',
    testDriveBooking_hintStayText:
      'Liczba nocy odpowiada wybranemu zakresowi (od 5 do 21 kolejnych dni).',
    testDriveBooking_hintCheckOutTitle: 'Wymeldowanie',
    testDriveBooking_hintCheckOutText:
      'Ostatniego dnia zwolnij obiekt do 12:00, chyba że uzgodniono inaczej z właścicielem.',
    testDriveBooking_hintBusyTitle: 'Zajęte daty',
    testDriveBooking_hintBusyText:
      'Zielone — Twoje wnioski, pomarańczowe — inni użytkownicy. Po datach wybierz kontakt — otworzy się instrukcja. „Anuluj” czyści wybór.',
    testDriveLanding_checkIn: 'Zameldowanie',
    testDriveLanding_checkOut: 'Wymeldowanie',
    testDriveLanding_step2: 'Pobyt',
    debtsFlipCardClickHint: 'Dotknij',
    debtsRiskCardTapHint: 'Dotknij, aby dowiedzieć się więcej',
  },
  sv: {
    debtRiskUnknown: 'Risken bedöms',
    debtRiskUnknownShort: 'Bedöms',
    debtRiskUnknownDescription: 'Den fullständiga riskbedömningen håller fortfarande på att tas fram',
    debtRiskShort_high: 'Hög',
    debtRiskShort_medium: 'Medel',
    debtRiskShort_low: 'Låg',
    debtRiskOpenDocumentsAria: '{{label}}. Öppna objektdokument',
    debtRiskCategory_utilities: 'Driftkostnader',
    debtRiskCategory_mortgage: 'Bankpant',
    debtRiskCategory_taxes: 'Fastighetsskatter',
    debtRiskCategory_arrest: 'Utmätningar och begränsningar',
    debtRiskCategory_inherited: 'Arvsskulder',
    debtRiskCategory_thirdParty: 'Skyldigheter mot tredje part',
    debtRiskCategoriesPending: 'Skuldsammansättningen klarläggs',
    buyerPage_mapYield: 'avkastning',
    buyerPage_mapArea: 'yta',
    buyerPage_mapBeds: 'sovrum',
    buyerPage_mapTrust: 'verifierat',
    buyerPage_mapBedsValue: '3 sov',
    buyerPage_mapLearnMore: 'Läs mer',
    buyerPage_mapBadgeNew: 'NY',
    buyerPage_mapAria: 'Karta med objekt',
    buyerPage_mapMetricsAria: 'Objektmått',
    buyerPage_mapSelectedAria: 'Valt objekt',
    buyerPage_mapFeaturedTitle: 'Luxury Oceanfront Villa',
    buyerPage_mapFeaturedLocation: 'Marbella, Costa del Sol',
    propertyAi_brandLabel: 'FASTIGHETS-AI',
    propertyAi_openAria: 'Öppna Fastighets-AI',
    propertyAi_expandAria: 'Expandera Fastighets-AI',
    propertyAi_close: 'Stäng',
    propertyAi_history: 'Historik',
    propertyAi_pickerTitle: 'JAG BERÄTTAR OM DETTA\nOBJEKT',
    propertyAi_scenarioRisks: 'Fördelar och risker',
    propertyAi_scenarioRisksQuestion: 'Vilka är de viktigaste fördelarna och riskerna med detta objekt?',
    propertyAi_scenarioInvestment: 'Investeringspotential',
    propertyAi_scenarioInvestmentQuestion: 'Vilken investeringspotential har detta objekt?',
    propertyAi_scenarioDetails: 'Detaljerad genomgång',
    propertyAi_scenarioDetailsQuestion: 'Gör en detaljerad genomgång av detta objekt.',
    propertyAi_scenarioCustom: 'Egen fråga',
    propertyAi_greeting:
      'Hej! Jag går igenom den här annonsen, ger ett kort svar och tar fram en detaljerad PDF-presentation.',
    propertyAi_statusQueuedTitle: 'Förbereder analys',
    propertyAi_statusQueuedText: 'Samlar annonsdata',
    propertyAi_statusAnalyzingTitle: 'Analyserar objektet',
    propertyAi_statusAnalyzingText: 'Gemini granskar egenskaper och foton',
    propertyAi_statusRenderingTitle: 'Skapar presentation',
    propertyAi_statusRenderingText: 'Skapar sidor och sätter ihop PDF',
    propertyAi_propertyFallback: 'Fastighet',
    propertyAi_locationFallback: 'Plats enligt annonsen',
    propertyAi_roomsShort: '{{count}} rum',
    propertyAi_floorShort: 'Våning {{floor}}',
    testDriveBooking_rulesTitle: 'Regler',
    testDriveBooking_hintCheckInCardTitle: 'Incheckning från 15:00',
    testDriveBooking_hintCheckInCardText:
      'Första dagen stäms nycklar och tillgång av med ägaren efter bekräftelse.',
    testDriveBooking_hintStayCardTitle: 'Från 5 till 21 dygn',
    testDriveBooking_hintStayCardText:
      'Välj sammanhängande datum — så många nätter bor du i objektet.',
    testDriveBooking_hintCheckOutCardTitle: 'Utcheckning senast 12:00',
    testDriveBooking_hintCheckOutCardText:
      'Sista dagen lämna objektet senast mitt på dagen om inte annat avtalats.',
    testDriveBooking_hintBusyCardTitle: 'Bokade datum',
    testDriveBooking_hintBusyCardText:
      'Grönt — dina förfrågningar, orange — andras. Efter datumen, välj kontakt.',
    testDriveBooking_hintCheckInMeta: 'Dag 1',
    testDriveBooking_hintStayMeta: '5–21 d.',
    testDriveBooking_hintCheckOutMeta: 'Dag N',
    testDriveBooking_hintBusyMeta: 'Status',
    testDriveBooking_hintCheckInTag: 'Incheckning',
    testDriveBooking_hintStayTag: 'Vistelse',
    testDriveBooking_hintCheckOutTag: 'Utcheckning',
    testDriveBooking_hintBusyTag: 'Kalender',
    testDriveBooking_pickDates: 'Välj datum',
    testDriveBooking_heroSubtitle:
      'Markera 5 till 21 dagar i följd — välj sedan kontaktväg.',
    testDriveBooking_eyebrow: 'Testkörning av fastighet',
    heroBrandImageAlt: 'SellYourBrick',
  },
})

function writeJson(file, data) {
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`)
}

function mergePackIntoDir(dir) {
  for (const [lang, entries] of Object.entries(PACK)) {
    if (!entries) continue
    const file = path.join(dir, `${lang}.json`)
    if (!fs.existsSync(file)) {
      console.warn('skip missing', file)
      continue
    }
    const data = JSON.parse(fs.readFileSync(file, 'utf8'))
    let changed = 0
    for (const [key, value] of Object.entries(entries)) {
      if (data[key] !== value) {
        data[key] = value
        changed += 1
      }
    }
    writeJson(file, data)
    console.log(`${path.basename(dir)}/${lang}: pack keys touched=${changed}`)
  }
}

function backfillMissingFromEn(dir) {
  const en = JSON.parse(fs.readFileSync(path.join(dir, 'en.json'), 'utf8'))
  const ruFile = path.join(dir, 'ru.json')
  const ru = JSON.parse(fs.readFileSync(ruFile, 'utf8'))
  for (const key of ['debtsRiskObjectsCount_other', 'debtsRiskObjectsWord_other', 'debtsFoundCount_other']) {
    if (!(key in ru)) {
      const manyKey = key.replace('_other', '_many')
      ru[key] = ru[manyKey] || en[key]
    }
  }
  writeJson(ruFile, ru)

  for (const lang of ['de', 'es', 'fr', 'pl', 'sv', 'ru', 'en']) {
    const file = path.join(dir, `${lang}.json`)
    const data = JSON.parse(fs.readFileSync(file, 'utf8'))
    let added = 0
    for (const [key, value] of Object.entries(en)) {
      if (!(key in data)) {
        data[key] = value
        added += 1
      }
    }
    writeJson(file, data)
    console.log(`backfill ${path.basename(dir)}/${lang}: +${added}`)
  }
}

mergePackIntoDir(primaryLocalesDir)
backfillMissingFromEn(primaryLocalesDir)
mergePackIntoDir(legacyLocalesDir)
backfillMissingFromEn(legacyLocalesDir)
console.log('done')

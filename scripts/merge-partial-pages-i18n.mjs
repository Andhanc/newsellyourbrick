/**
 * Merge remaining i18n keys for MapPage, SearchResults, InvestmentCalculator, TestPage (buyer cabinet).
 * Also fills trivial missing Home/Auction keys (bookingFeatureSoon, brokerChatFeatureSoon)
 * and fixes calcFinalValueYears / roomCount RU plurals.
 *
 * Usage: node scripts/merge-partial-pages-i18n.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

const LOCALE_DIRS = [
  path.join(ROOT, 'src/i18n/locales/mainPage'),
  path.join(ROOT, 'apps/client/src/legacy/i18n/locales/mainPage'),
]

/** @type {Record<string, Record<string, string>>} */
const PACK = {}

PACK.ru = {
  mapCollapseBtnAriaLabel: 'Вернуться к обычному виду карты',
  mapPage_clusterCountTitle: '{{count}} объектов',
  mapPage_showOnMap: 'Показать на карте',
  mapPage_collapseListAria: 'Свернуть список объектов',
  mapPage_expandListAria: 'Развернуть список объектов',
  mapPage_searching: 'Ищем объекты',
  mapPage_emptyEyebrow: 'Карта остаётся полезной',
  mapPage_emptyTitleLiked: 'Избранное ещё не отмечено',
  mapPage_emptyTitle: 'На карте пока пусто',
  mapPage_emptyDescSearch:
    'По этому запросу точек нет. Сбросим поиск и покажем все доступные объекты.',
  mapPage_emptyDescLiked:
    'Добавьте сердечком интересные объекты — они появятся здесь для быстрого сравнения районов.',
  mapPage_emptyDescFilters: 'Снимем фильтры и покажем весь доступный каталог с координатами.',
  mapPage_emptyPrimaryLiked: 'Показать все объекты',
  mapPage_emptyPrimaryReset: 'Сбросить параметры',
  mapPage_emptySecondaryCatalog: 'Открыть каталог',
  mapPage_expandTitle: 'Открыть карту целиком',
  mapPage_collapseTitle: 'Вернуться назад',
  mapPage_dismissHintAria: 'Скрыть подсказку',
  mapPage_hintLabel: 'Объект на карте',
  mapPage_openProperty: 'Открыть объект',
  mapPage_showCount: 'Показать · {{count}}',
  mapPage_filtersSheetTitle: 'Настройте подборку',
  mapPage_filtersSheetDesc:
    'Покажем только реальные объекты, которые подходят выбранным параметрам.',
  mapPage_noCoordsNotify: 'У объекта пока нет координат для отображения на карте',

  searchResults_loading: 'Поиск недвижимости...',
  searchResults_eyebrow: 'Каталог покупателя',
  searchResults_title: 'Найдите свой объект',
  searchResults_emptyCount: 'Подберём новые варианты',
  searchResults_mapAria: 'Открыть объекты на карте',
  searchResults_emptyEyebrow: 'Новый шанс для выбора',
  searchResults_emptyTitle: 'Подходящих объектов пока нет',
  searchResults_emptyDesc:
    'Снимем ограничения и снова покажем весь каталог — ваши параметры поиска не потеряются навсегда.',
  searchResults_emptyPrimary: 'Показать весь каталог',
  searchResults_emptySecondary: 'Все направления',

  calcCompareScenarioAria: 'Сценарий из сравнения',
  calcCompareScenarioTitle: 'Сценарий из сравнения · 2 объекта',
  calcCompareScenarioBody:
    'Открыт выбранный объект. Пара сохранена — его можно переключить ниже.',
  calcCompareScenarioReset: 'Сбросить',
  calcMobileHeadlineProfit: 'Итоговая прибыль',
  calcMobileHeadlineCashFlow: 'Денежный поток за период',
  calcMobileYieldPeriod: 'Доходность за период',
  calcMobileYieldAnnual: 'Доходность в год',
  calcMobileAssumptions: '{{years}} лет · рост {{growth}}% · расходы {{costs}}%',
  calcDefaultPropertyTitle: 'Инвестиционный объект',
  calcFinalValueYears: 'Стоимость через {{count}} лет',
  calcFinalValueYears_other: 'Стоимость через {{count}} лет',
  roomCount_other: '{{count}} комнат',

  buyerCabinet_statsAria: 'Статистика кабинета',
  buyerCabinet_statHistory: 'История',
  buyerCabinet_statBookings: 'Брони',
  buyerCabinet_statProfile: 'Профиль',
  buyerCabinet_subscriptionsLead:
    'Выберите тариф — доступ к торгам, аналитике и приоритетной поддержке.',
  buyerCabinet_profileCompleteTitle: 'Поздравляем!',
  buyerCabinet_profileCompleteText: 'Вы успешно зарегистрировали профиль.',
  buyerCabinet_profileCompleteCta: 'Перейти',
  buyerCabinet_directionsListAria: 'Ключевые направления',
  buyerCabinet_mobileActionsAria: 'Действия профиля',
  buyerCabinet_dataStepsAria: 'Шаги заполнения профиля',
  buyerCabinet_stepContacts: 'Контакты',
  buyerCabinet_stepDocuments: 'Документы',
  buyerCabinet_stepReview: 'Проверка',
  buyerCabinet_savedAria: 'Сохранено',
  buyerCabinet_next: 'Далее',
  buyerCabinet_countriesListAria: 'Список стран',
}

PACK.en = {
  mapCollapseBtnAriaLabel: 'Return to normal map view',
  mapPage_clusterCountTitle: '{{count}} properties',
  mapPage_showOnMap: 'Show on map',
  mapPage_collapseListAria: 'Collapse property list',
  mapPage_expandListAria: 'Expand property list',
  mapPage_searching: 'Searching properties',
  mapPage_emptyEyebrow: 'The map stays useful',
  mapPage_emptyTitleLiked: 'No favorites yet',
  mapPage_emptyTitle: 'Nothing on the map yet',
  mapPage_emptyDescSearch:
    'No pins match this search. We’ll clear it and show all available properties.',
  mapPage_emptyDescLiked:
    'Heart the listings you like — they’ll show up here for a quick area comparison.',
  mapPage_emptyDescFilters: 'We’ll clear filters and show the full catalog with coordinates.',
  mapPage_emptyPrimaryLiked: 'Show all properties',
  mapPage_emptyPrimaryReset: 'Reset filters',
  mapPage_emptySecondaryCatalog: 'Open catalog',
  mapPage_expandTitle: 'Open full map',
  mapPage_collapseTitle: 'Go back',
  mapPage_dismissHintAria: 'Dismiss hint',
  mapPage_hintLabel: 'Property on map',
  mapPage_openProperty: 'Open property',
  mapPage_showCount: 'Show · {{count}}',
  mapPage_filtersSheetTitle: 'Refine your selection',
  mapPage_filtersSheetDesc: 'We’ll show only real listings that match your chosen filters.',
  mapPage_noCoordsNotify: 'This property has no coordinates to show on the map yet',

  searchResults_loading: 'Searching properties...',
  searchResults_eyebrow: 'Buyer catalog',
  searchResults_title: 'Find your property',
  searchResults_emptyCount: 'We’ll find new options',
  searchResults_mapAria: 'Open properties on the map',
  searchResults_emptyEyebrow: 'A fresh chance to choose',
  searchResults_emptyTitle: 'No matching properties yet',
  searchResults_emptyDesc:
    'We’ll clear the limits and show the full catalog again — your search settings won’t be lost forever.',
  searchResults_emptyPrimary: 'Show full catalog',
  searchResults_emptySecondary: 'All sections',

  calcCompareScenarioAria: 'Scenario from compare',
  calcCompareScenarioTitle: 'Scenario from compare · 2 properties',
  calcCompareScenarioBody:
    'The selected property is open. The pair is saved — you can switch it below.',
  calcCompareScenarioReset: 'Reset',
  calcMobileHeadlineProfit: 'Total profit',
  calcMobileHeadlineCashFlow: 'Cash flow over period',
  calcMobileYieldPeriod: 'Return over period',
  calcMobileYieldAnnual: 'Annual yield',
  calcMobileAssumptions: '{{years}} yrs · growth {{growth}}% · costs {{costs}}%',
  calcDefaultPropertyTitle: 'Investment property',
  calcFinalValueYears: 'Value after {{count}} years',

  bookingFeatureSoon: 'Booking will be available soon.',
  brokerChatFeatureSoon: 'Broker chat will be available soon.',

  buyerCabinet_statsAria: 'Cabinet statistics',
  buyerCabinet_statHistory: 'History',
  buyerCabinet_statBookings: 'Bookings',
  buyerCabinet_statProfile: 'Profile',
  buyerCabinet_subscriptionsLead:
    'Choose a plan — access to auctions, analytics, and priority support.',
  buyerCabinet_profileCompleteTitle: 'Congratulations!',
  buyerCabinet_profileCompleteText: 'Your profile has been registered successfully.',
  buyerCabinet_profileCompleteCta: 'Continue',
  buyerCabinet_directionsListAria: 'Key directions',
  buyerCabinet_mobileActionsAria: 'Profile actions',
  buyerCabinet_dataStepsAria: 'Profile completion steps',
  buyerCabinet_stepContacts: 'Contacts',
  buyerCabinet_stepDocuments: 'Documents',
  buyerCabinet_stepReview: 'Review',
  buyerCabinet_savedAria: 'Saved',
  buyerCabinet_next: 'Next',
  buyerCabinet_countriesListAria: 'Country list',
}

PACK.de = {
  mapCollapseBtnAriaLabel: 'Zur normalen Kartenansicht zurückkehren',
  mapPage_clusterCountTitle: '{{count}} Objekte',
  mapPage_showOnMap: 'Auf Karte zeigen',
  mapPage_collapseListAria: 'Objektliste einklappen',
  mapPage_expandListAria: 'Objektliste ausklappen',
  mapPage_searching: 'Objekte werden gesucht',
  mapPage_emptyEyebrow: 'Die Karte bleibt nützlich',
  mapPage_emptyTitleLiked: 'Noch keine Favoriten',
  mapPage_emptyTitle: 'Noch nichts auf der Karte',
  mapPage_emptyDescSearch:
    'Keine Treffer für diese Suche. Wir setzen sie zurück und zeigen alle verfügbaren Objekte.',
  mapPage_emptyDescLiked:
    'Markieren Sie interessante Objekte mit dem Herz — sie erscheinen hier zum schnellen Gebietsvergleich.',
  mapPage_emptyDescFilters:
    'Wir setzen die Filter zurück und zeigen den gesamten Katalog mit Koordinaten.',
  mapPage_emptyPrimaryLiked: 'Alle Objekte zeigen',
  mapPage_emptyPrimaryReset: 'Parameter zurücksetzen',
  mapPage_emptySecondaryCatalog: 'Katalog öffnen',
  mapPage_expandTitle: 'Karte voll öffnen',
  mapPage_collapseTitle: 'Zurück',
  mapPage_dismissHintAria: 'Hinweis schließen',
  mapPage_hintLabel: 'Objekt auf der Karte',
  mapPage_openProperty: 'Objekt öffnen',
  mapPage_showCount: 'Zeigen · {{count}}',
  mapPage_filtersSheetTitle: 'Auswahl anpassen',
  mapPage_filtersSheetDesc:
    'Wir zeigen nur echte Objekte, die zu Ihren gewählten Parametern passen.',
  mapPage_noCoordsNotify: 'Dieses Objekt hat noch keine Koordinaten für die Karte',

  searchResults_loading: 'Immobiliensuche...',
  searchResults_eyebrow: 'Käuferkatalog',
  searchResults_title: 'Finden Sie Ihr Objekt',
  searchResults_emptyCount: 'Wir finden neue Optionen',
  searchResults_mapAria: 'Objekte auf der Karte öffnen',
  searchResults_emptyEyebrow: 'Neue Chance zur Auswahl',
  searchResults_emptyTitle: 'Noch keine passenden Objekte',
  searchResults_emptyDesc:
    'Wir heben die Einschränkungen auf und zeigen wieder den gesamten Katalog — Ihre Sucheinstellungen gehen nicht für immer verloren.',
  searchResults_emptyPrimary: 'Gesamten Katalog zeigen',
  searchResults_emptySecondary: 'Alle Bereiche',

  calcCompareScenarioAria: 'Szenario aus dem Vergleich',
  calcCompareScenarioTitle: 'Szenario aus dem Vergleich · 2 Objekte',
  calcCompareScenarioBody:
    'Das ausgewählte Objekt ist geöffnet. Das Paar ist gespeichert — Sie können es unten wechseln.',
  calcCompareScenarioReset: 'Zurücksetzen',
  calcMobileHeadlineProfit: 'Gesamtgewinn',
  calcMobileHeadlineCashFlow: 'Cashflow über den Zeitraum',
  calcMobileYieldPeriod: 'Rendite über den Zeitraum',
  calcMobileYieldAnnual: 'Jährliche Rendite',
  calcMobileAssumptions: '{{years}} J. · Wachstum {{growth}}% · Kosten {{costs}}%',
  calcDefaultPropertyTitle: 'Investitionsobjekt',
  calcFinalValueYears: 'Wert nach {{count}} Jahren',

  bookingFeatureSoon: 'Buchung wird bald verfügbar sein.',
  brokerChatFeatureSoon: 'Broker-Chat wird bald verfügbar sein.',

  buyerCabinet_statsAria: 'Kabinettsstatistik',
  buyerCabinet_statHistory: 'Verlauf',
  buyerCabinet_statBookings: 'Buchungen',
  buyerCabinet_statProfile: 'Profil',
  buyerCabinet_subscriptionsLead:
    'Wählen Sie einen Tarif — Zugang zu Auktionen, Analysen und Preferenz-Support.',
  buyerCabinet_profileCompleteTitle: 'Glückwunsch!',
  buyerCabinet_profileCompleteText: 'Ihr Profil wurde erfolgreich registriert.',
  buyerCabinet_profileCompleteCta: 'Weiter',
  buyerCabinet_directionsListAria: 'Wichtige Bereiche',
  buyerCabinet_mobileActionsAria: 'Profilaktionen',
  buyerCabinet_dataStepsAria: 'Schritte zur Profilvervollständigung',
  buyerCabinet_stepContacts: 'Kontakte',
  buyerCabinet_stepDocuments: 'Dokumente',
  buyerCabinet_stepReview: 'Prüfung',
  buyerCabinet_savedAria: 'Gespeichert',
  buyerCabinet_next: 'Weiter',
  buyerCabinet_countriesListAria: 'Länderliste',
}

PACK.es = {
  mapCollapseBtnAriaLabel: 'Volver a la vista normal del mapa',
  mapPage_clusterCountTitle: '{{count}} objetos',
  mapPage_showOnMap: 'Mostrar en el mapa',
  mapPage_collapseListAria: 'Contraer lista de objetos',
  mapPage_expandListAria: 'Expandir lista de objetos',
  mapPage_searching: 'Buscando objetos',
  mapPage_emptyEyebrow: 'El mapa sigue siendo útil',
  mapPage_emptyTitleLiked: 'Aún no hay favoritos',
  mapPage_emptyTitle: 'El mapa está vacío por ahora',
  mapPage_emptyDescSearch:
    'No hay puntos para esta búsqueda. La restableceremos y mostraremos todos los objetos disponibles.',
  mapPage_emptyDescLiked:
    'Marque con el corazón los objetos que le interesen: aparecerán aquí para comparar zonas rápidamente.',
  mapPage_emptyDescFilters:
    'Quitaremos los filtros y mostraremos todo el catálogo con coordenadas.',
  mapPage_emptyPrimaryLiked: 'Mostrar todos los objetos',
  mapPage_emptyPrimaryReset: 'Restablecer parámetros',
  mapPage_emptySecondaryCatalog: 'Abrir catálogo',
  mapPage_expandTitle: 'Abrir mapa completo',
  mapPage_collapseTitle: 'Volver',
  mapPage_dismissHintAria: 'Ocultar sugerencia',
  mapPage_hintLabel: 'Objeto en el mapa',
  mapPage_openProperty: 'Abrir objeto',
  mapPage_showCount: 'Mostrar · {{count}}',
  mapPage_filtersSheetTitle: 'Ajuste la selección',
  mapPage_filtersSheetDesc:
    'Mostraremos solo objetos reales que coincidan con los parámetros elegidos.',
  mapPage_noCoordsNotify: 'Este objeto aún no tiene coordenadas para mostrarlo en el mapa',

  searchResults_loading: 'Buscando inmuebles...',
  searchResults_eyebrow: 'Catálogo del comprador',
  searchResults_title: 'Encuentre su objeto',
  searchResults_emptyCount: 'Encontraremos nuevas opciones',
  searchResults_mapAria: 'Abrir objetos en el mapa',
  searchResults_emptyEyebrow: 'Una nueva oportunidad para elegir',
  searchResults_emptyTitle: 'Aún no hay objetos adecuados',
  searchResults_emptyDesc:
    'Quitaremos las restricciones y volveremos a mostrar todo el catálogo: sus parámetros de búsqueda no se perderán para siempre.',
  searchResults_emptyPrimary: 'Mostrar todo el catálogo',
  searchResults_emptySecondary: 'Todas las secciones',

  calcCompareScenarioAria: 'Escenario desde comparación',
  calcCompareScenarioTitle: 'Escenario desde comparación · 2 objetos',
  calcCompareScenarioBody:
    'Se ha abierto el objeto seleccionado. El par se ha guardado: puede cambiarlo abajo.',
  calcCompareScenarioReset: 'Restablecer',
  calcMobileHeadlineProfit: 'Beneficio total',
  calcMobileHeadlineCashFlow: 'Flujo de caja del periodo',
  calcMobileYieldPeriod: 'Rentabilidad del periodo',
  calcMobileYieldAnnual: 'Rentabilidad anual',
  calcMobileAssumptions: '{{years}} años · crecimiento {{growth}}% · gastos {{costs}}%',
  calcDefaultPropertyTitle: 'Objeto de inversión',
  calcFinalValueYears: 'Valor en {{count}} años',

  bookingFeatureSoon: 'La reserva estará disponible pronto.',
  brokerChatFeatureSoon: 'El chat con el bróker estará disponible pronto.',

  buyerCabinet_statsAria: 'Estadísticas del gabinete',
  buyerCabinet_statHistory: 'Historial',
  buyerCabinet_statBookings: 'Reservas',
  buyerCabinet_statProfile: 'Perfil',
  buyerCabinet_subscriptionsLead:
    'Elija un plan: acceso a subastas, análisis y soporte prioritario.',
  buyerCabinet_profileCompleteTitle: '¡Enhorabuena!',
  buyerCabinet_profileCompleteText: 'Ha registrado su perfil correctamente.',
  buyerCabinet_profileCompleteCta: 'Continuar',
  buyerCabinet_directionsListAria: 'Direcciones clave',
  buyerCabinet_mobileActionsAria: 'Acciones del perfil',
  buyerCabinet_dataStepsAria: 'Pasos para completar el perfil',
  buyerCabinet_stepContacts: 'Contactos',
  buyerCabinet_stepDocuments: 'Documentos',
  buyerCabinet_stepReview: 'Revisión',
  buyerCabinet_savedAria: 'Guardado',
  buyerCabinet_next: 'Siguiente',
  buyerCabinet_countriesListAria: 'Lista de países',
}

PACK.fr = {
  mapCollapseBtnAriaLabel: 'Revenir à la vue normale de la carte',
  mapPage_clusterCountTitle: '{{count}} objets',
  mapPage_showOnMap: 'Afficher sur la carte',
  mapPage_collapseListAria: 'Réduire la liste des objets',
  mapPage_expandListAria: 'Développer la liste des objets',
  mapPage_searching: 'Recherche d’objets',
  mapPage_emptyEyebrow: 'La carte reste utile',
  mapPage_emptyTitleLiked: 'Pas encore de favoris',
  mapPage_emptyTitle: 'Rien sur la carte pour l’instant',
  mapPage_emptyDescSearch:
    'Aucun point pour cette recherche. Nous la réinitialiserons et afficherons tous les objets disponibles.',
  mapPage_emptyDescLiked:
    'Ajoutez un cœur aux objets intéressants — ils apparaîtront ici pour comparer rapidement les quartiers.',
  mapPage_emptyDescFilters:
    'Nous retirerons les filtres et afficherons tout le catalogue avec coordonnées.',
  mapPage_emptyPrimaryLiked: 'Afficher tous les objets',
  mapPage_emptyPrimaryReset: 'Réinitialiser les paramètres',
  mapPage_emptySecondaryCatalog: 'Ouvrir le catalogue',
  mapPage_expandTitle: 'Ouvrir la carte en entier',
  mapPage_collapseTitle: 'Retour',
  mapPage_dismissHintAria: 'Masquer l’indication',
  mapPage_hintLabel: 'Objet sur la carte',
  mapPage_openProperty: 'Ouvrir l’objet',
  mapPage_showCount: 'Afficher · {{count}}',
  mapPage_filtersSheetTitle: 'Affinez la sélection',
  mapPage_filtersSheetDesc:
    'Nous n’afficherons que de vrais objets correspondant aux paramètres choisis.',
  mapPage_noCoordsNotify: 'Cet objet n’a pas encore de coordonnées pour la carte',

  searchResults_loading: 'Recherche de biens...',
  searchResults_eyebrow: 'Catalogue acheteur',
  searchResults_title: 'Trouvez votre bien',
  searchResults_emptyCount: 'Nous trouverons de nouvelles options',
  searchResults_mapAria: 'Ouvrir les objets sur la carte',
  searchResults_emptyEyebrow: 'Une nouvelle chance de choisir',
  searchResults_emptyTitle: 'Aucun objet correspondant pour l’instant',
  searchResults_emptyDesc:
    'Nous lèverons les restrictions et réafficherons tout le catalogue — vos paramètres de recherche ne seront pas perdus pour toujours.',
  searchResults_emptyPrimary: 'Afficher tout le catalogue',
  searchResults_emptySecondary: 'Toutes les sections',

  calcCompareScenarioAria: 'Scénario depuis la comparaison',
  calcCompareScenarioTitle: 'Scénario depuis la comparaison · 2 objets',
  calcCompareScenarioBody:
    'L’objet sélectionné est ouvert. La paire est enregistrée — vous pouvez la changer ci-dessous.',
  calcCompareScenarioReset: 'Réinitialiser',
  calcMobileHeadlineProfit: 'Profit total',
  calcMobileHeadlineCashFlow: 'Flux de trésorerie sur la période',
  calcMobileYieldPeriod: 'Rendement sur la période',
  calcMobileYieldAnnual: 'Rendement annuel',
  calcMobileAssumptions: '{{years}} ans · croissance {{growth}}% · frais {{costs}}%',
  calcDefaultPropertyTitle: 'Bien d’investissement',
  calcFinalValueYears: 'Valeur dans {{count}} ans',

  bookingFeatureSoon: 'La réservation sera bientôt disponible.',
  brokerChatFeatureSoon: 'Le chat avec le courtier sera bientôt disponible.',

  buyerCabinet_statsAria: 'Statistiques du cabinet',
  buyerCabinet_statHistory: 'Historique',
  buyerCabinet_statBookings: 'Réservations',
  buyerCabinet_statProfile: 'Profil',
  buyerCabinet_subscriptionsLead:
    'Choisissez une offre — accès aux enchères, analyses et support prioritaire.',
  buyerCabinet_profileCompleteTitle: 'Félicitations !',
  buyerCabinet_profileCompleteText: 'Votre profil a été enregistré avec succès.',
  buyerCabinet_profileCompleteCta: 'Continuer',
  buyerCabinet_directionsListAria: 'Directions clés',
  buyerCabinet_mobileActionsAria: 'Actions du profil',
  buyerCabinet_dataStepsAria: 'Étapes de complétion du profil',
  buyerCabinet_stepContacts: 'Contacts',
  buyerCabinet_stepDocuments: 'Documents',
  buyerCabinet_stepReview: 'Vérification',
  buyerCabinet_savedAria: 'Enregistré',
  buyerCabinet_next: 'Suivant',
  buyerCabinet_countriesListAria: 'Liste des pays',
}

PACK.sv = {
  mapCollapseBtnAriaLabel: 'Tillbaka till normal kartvy',
  mapPage_clusterCountTitle: '{{count}} objekt',
  mapPage_showOnMap: 'Visa på kartan',
  mapPage_collapseListAria: 'Fäll ihop objektlistan',
  mapPage_expandListAria: 'Expandera objektlistan',
  mapPage_searching: 'Söker objekt',
  mapPage_emptyEyebrow: 'Kartan förblir användbar',
  mapPage_emptyTitleLiked: 'Inga favoriter ännu',
  mapPage_emptyTitle: 'Inget på kartan ännu',
  mapPage_emptyDescSearch:
    'Inga punkter för den här sökningen. Vi nollställer den och visar alla tillgängliga objekt.',
  mapPage_emptyDescLiked:
    'Hjärtmarkera intressanta objekt — de visas här för snabb områdesjämförelse.',
  mapPage_emptyDescFilters: 'Vi tar bort filtren och visar hela katalogen med koordinater.',
  mapPage_emptyPrimaryLiked: 'Visa alla objekt',
  mapPage_emptyPrimaryReset: 'Återställ parametrar',
  mapPage_emptySecondaryCatalog: 'Öppna katalog',
  mapPage_expandTitle: 'Öppna hela kartan',
  mapPage_collapseTitle: 'Tillbaka',
  mapPage_dismissHintAria: 'Dölj tips',
  mapPage_hintLabel: 'Objekt på kartan',
  mapPage_openProperty: 'Öppna objekt',
  mapPage_showCount: 'Visa · {{count}}',
  mapPage_filtersSheetTitle: 'Anpassa urvalet',
  mapPage_filtersSheetDesc: 'Vi visar bara verkliga objekt som matchar valda parametrar.',
  mapPage_noCoordsNotify: 'Objektet har ännu inga koordinater att visa på kartan',

  searchResults_loading: 'Söker fastigheter...',
  searchResults_eyebrow: 'Köparkatalog',
  searchResults_title: 'Hitta ditt objekt',
  searchResults_emptyCount: 'Vi hittar nya alternativ',
  searchResults_mapAria: 'Öppna objekt på kartan',
  searchResults_emptyEyebrow: 'En ny chans att välja',
  searchResults_emptyTitle: 'Inga matchande objekt ännu',
  searchResults_emptyDesc:
    'Vi tar bort begränsningarna och visar hela katalogen igen — dina sökparametrar försvinner inte för alltid.',
  searchResults_emptyPrimary: 'Visa hela katalogen',
  searchResults_emptySecondary: 'Alla sektioner',

  calcCompareScenarioAria: 'Scenario från jämförelse',
  calcCompareScenarioTitle: 'Scenario från jämförelse · 2 objekt',
  calcCompareScenarioBody:
    'Det valda objektet är öppet. Paret är sparat — du kan byta det nedan.',
  calcCompareScenarioReset: 'Återställ',
  calcMobileHeadlineProfit: 'Total vinst',
  calcMobileHeadlineCashFlow: 'Kassaflöde över perioden',
  calcMobileYieldPeriod: 'Avkastning över perioden',
  calcMobileYieldAnnual: 'Årlig avkastning',
  calcMobileAssumptions: '{{years}} år · tillväxt {{growth}}% · kostnader {{costs}}%',
  calcDefaultPropertyTitle: 'Investeringsobjekt',
  calcFinalValueYears: 'Värde efter {{count}} år',

  bookingFeatureSoon: 'Bokning kommer snart att vara tillgänglig.',
  brokerChatFeatureSoon: 'Chatt med mäklare kommer snart att vara tillgänglig.',

  buyerCabinet_statsAria: 'Kabinettsstatistik',
  buyerCabinet_statHistory: 'Historik',
  buyerCabinet_statBookings: 'Bokningar',
  buyerCabinet_statProfile: 'Profil',
  buyerCabinet_subscriptionsLead:
    'Välj en plan — tillgång till auktioner, analys och prioritetsstöd.',
  buyerCabinet_profileCompleteTitle: 'Grattis!',
  buyerCabinet_profileCompleteText: 'Du har registrerat din profil.',
  buyerCabinet_profileCompleteCta: 'Fortsätt',
  buyerCabinet_directionsListAria: 'Viktiga riktningar',
  buyerCabinet_mobileActionsAria: 'Profilåtgärder',
  buyerCabinet_dataStepsAria: 'Steg för att fylla i profilen',
  buyerCabinet_stepContacts: 'Kontakter',
  buyerCabinet_stepDocuments: 'Dokument',
  buyerCabinet_stepReview: 'Granskning',
  buyerCabinet_savedAria: 'Sparat',
  buyerCabinet_next: 'Nästa',
  buyerCabinet_countriesListAria: 'Lista över länder',
}

PACK.pl = { ...PACK.en }

function mergeIntoDir(localesDir, langs, label) {
  if (!fs.existsSync(localesDir)) {
    console.warn(`[${label}] skip missing dir`, localesDir)
    return
  }
  for (const lang of langs) {
    const filePath = path.join(localesDir, `${lang}.json`)
    if (!fs.existsSync(filePath)) {
      console.warn(`[${label}] skip missing`, lang)
      continue
    }
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    const extra = PACK[lang]
    if (!extra) throw new Error(`Missing PACK for lang=${lang}`)
    for (const [k, v] of Object.entries(extra)) {
      data[k] = v
    }
    fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
    console.log(`[${label}] merged`, lang, Object.keys(extra).length, 'keys')
  }
}

const primaryLangs = ['ru', 'en', 'de', 'es', 'fr', 'sv', 'pl']
const legacyLangs = ['ru', 'en', 'de', 'es', 'fr', 'sv']

for (const dir of LOCALE_DIRS) {
  const label = dir.includes('legacy') ? 'legacy' : 'mainPage'
  mergeIntoDir(dir, label === 'legacy' ? legacyLangs : primaryLangs, label)
}

const ruCount = Object.keys(PACK.ru).length
console.log('---')
console.log('ru pack keys:', ruCount)
for (const lang of primaryLangs) {
  const n = Object.keys(PACK[lang]).length
  // en/de/... also have bookingFeatureSoon keys; ru already had them so pack.ru is smaller
  console.log(`${lang}: ${n} keys`)
}

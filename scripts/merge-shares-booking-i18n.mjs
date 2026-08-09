import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const primaryLocalesDir = path.join(__dirname, '../src/i18n/locales/mainPage')
const legacyLocalesDir = path.join(__dirname, '../apps/client/src/legacy/i18n/locales/mainPage')

const PACK = {
  ru: {
    sharesPage_heroTitle: 'Доли в недвижимость',
    sharesPage_heroLead:
      'Инвестируйте в проверенные объекты частями: условия, доступность и прогноз доходности видны до покупки. Доходность не гарантируется.',
    sharesPage_heroCta: 'Смотреть объекты',
    sharesPage_scrollToCatalogAria: 'Перейти к каталогу',
    sharesPage_searchPlaceholder: 'Город или объект',
    sharesPage_searchAria: 'Поиск по городу или объекту',
    sharesPage_filters: 'Фильтры',
    sharesPage_filtersDrawerTitle: 'Фильтры объектов',
    sharesPage_filtersSetup: 'Настройте выбор',
    sharesPage_reset: 'Сбросить',
    sharesPage_showObjects: 'Показать {{count}} объектов',
    sharesPage_loadingAria: 'Загрузка объектов',
    sharesPage_loadError: 'Не удалось загрузить объекты',
    sharesPage_loadErrorDesc:
      'Проверьте соединение и попробуйте позже — или посмотрите другие предложения на платформе.',
    sharesPage_seeOtherObjects: 'Смотреть другие объекты',
    sharesPage_emptyFilteredTitle: 'По этим условиям объектов нет',
    sharesPage_emptyCatalogTitle: 'Сейчас нет открытых объектов',
    sharesPage_emptyFilteredDesc:
      'Сбросьте фильтры или расширьте поиск — покажем только реальные доступные предложения.',
    sharesPage_emptyCatalogDesc:
      'Каталог обновится, когда появятся новые предложения с долями. А пока можно посмотреть другие объекты.',
    sharesPage_sortDefault: 'По умолчанию',
    sharesPage_sortYield: 'По прогнозу доходности',
    sharesPage_sortCollected: 'По заполнению сбора',
    sharesPage_sortPrice: 'Сначала доступные доли',
    sharesPage_sortLabel: 'Сортировка',
    sharesPage_statusTitle: 'Статус сбора',
    sharesPage_statusOpen: 'Сбор открыт',
    sharesPage_statusAlmostFull: 'Почти собрано',
    sharesPage_statusCompleted: 'Сбор завершён',
    sharesPage_yieldForecast: 'Прогноз доходности',
    sharesPage_yieldFrom0: 'от 0%',
    sharesPage_yieldUpTo: 'до {{value}}%',
    sharesPage_pricePerShare: 'Цена одной доли',
    sharesPage_priceFrom0: 'от €0',

    testDriveBooking_back: 'Назад',
    testDriveBooking_title: 'Тест-драйв: {{title}}',
    testDriveBooking_subtitle:
      'Выберите от 5 до 21 дня подряд и способ связи — сразу откроется инструкция. Кнопка ниже — если вы закрыли окно. Занятые даты видны всем пользователям.',
    testDriveBooking_saving: 'Отправка заявки…',
    testDriveBooking_selected: 'Выбрано:',
    testDriveBooking_contact: 'Связь',
    testDriveBooking_change: 'Изменить',
    testDriveBooking_cancel: 'Отменить',
    testDriveBooking_request: 'Запросить тест-драйв',
    testDriveBooking_hintCheckInTitle: 'Заезд',
    testDriveBooking_hintCheckInText:
      'В первый день заезд с 15:00. Ключи или доступ согласуются с владельцем после подтверждения.',
    testDriveBooking_hintStayTitle: 'Проживание',
    testDriveBooking_hintStayText:
      'Количество ночей совпадает с выбранным диапазоном (от 5 до 21 суток подряд).',
    testDriveBooking_hintCheckOutTitle: 'Выезд',
    testDriveBooking_hintCheckOutText:
      'В последний день освободите объект до 12:00, если иное не согласовано с владельцем.',
    testDriveBooking_hintBusyTitle: 'Занятые даты',
    testDriveBooking_hintBusyText:
      'Зелёным — ваши заявки, оранжевым — другие пользователи. После дат выберите связь — откроется инструкция. «Отменить» сбрасывает выбор.',
    testDriveBooking_contactTitle: 'Как с вами связаться?',
    testDriveBooking_contactSubtitle:
      'Выберите удобный канал — так владелец поймёт, куда писать или звонить для согласования заезда.',
    testDriveBooking_contactTelegram: 'Telegram',
    testDriveBooking_contactTelegramHint: 'Напишем вам в Telegram',
    testDriveBooking_contactWhatsapp: 'WhatsApp',
    testDriveBooking_contactWhatsappHint: 'Свяжемся через WhatsApp',
    testDriveBooking_contactEmail: 'Почта',
    testDriveBooking_contactEmailHint: 'Отправим письмо на email',
    testDriveBooking_close: 'Закрыть',
    testDriveBooking_payStep1Title: 'Инструкция и правила тест-драйва',
    testDriveBooking_payStep2Title: 'Шаг 2: оплата тест-драйва',
    testDriveBooking_payIntro:
      'Оплата проходит одним платежом: отдельно сумма за выбранные сутки проживания и страховой депозит (если он задан для объекта). После оплаты бронирование сразу отобразится у вас, у продавца и в админ-панели.',
    testDriveBooking_rule1: 'Заезд в первый день с 15:00, выезд в последний день до 12:00.',
    testDriveBooking_rule2: 'Соблюдайте правила объекта и бережно относитесь к имуществу.',
    testDriveBooking_rule3:
      'Страховой депозит: при отсутствии нарушений после проживания он возвращается на вашу карту в течение одной недели с момента выезда (срок зачисления может зависеть от банка).',
    testDriveBooking_days: 'Суток',
    testDriveBooking_dailyPrice: 'Стоимость за сутки',
    testDriveBooking_stayTotal: 'Проживание',
    testDriveBooking_deposit: 'Страховой депозит',
    testDriveBooking_depositNote:
      'Депозит удерживается вместе с оплатой суток. Если правила проживания не нарушались, в течение недели после выезда сумма депозита возвращается на ту же карту.',
    testDriveBooking_total: 'Итого к оплате',
    testDriveBooking_calculating: 'Расчет суммы...',
    testDriveBooking_goToPayment: 'Перейти к оплате',
    testDriveBooking_redirecting: 'Переход к оплате...',
    testDriveBooking_pay: 'Оплатить',
    testDriveBooking_previewTitle: 'Вилла с бассейном у Средиземного моря',
    testDriveBooking_toastConfirmFail: 'Не удалось подтвердить оплату',
    testDriveBooking_toastConfirmError: 'Ошибка подтверждения оплаты',
    testDriveBooking_toastQuoteFail: 'Не удалось рассчитать стоимость',
    testDriveBooking_toastPickContact: 'Выберите способ связи: Telegram, WhatsApp или почту',
    testDriveBooking_toastCalcError: 'Ошибка расчета',
    testDriveBooking_toastCheckoutFail: 'Не удалось создать оплату',
    testDriveBooking_toastNetwork: 'Ошибка сети',
  },

  en: {
    sharesPage_heroTitle: 'Property shares',
    sharesPage_heroLead:
      'Invest in vetted properties in parts: terms, availability, and yield forecast are visible before you buy. Yield is not guaranteed.',
    sharesPage_heroCta: 'Browse properties',
    sharesPage_scrollToCatalogAria: 'Go to catalog',
    sharesPage_searchPlaceholder: 'City or property',
    sharesPage_searchAria: 'Search by city or property',
    sharesPage_filters: 'Filters',
    sharesPage_filtersDrawerTitle: 'Property filters',
    sharesPage_filtersSetup: 'Refine your selection',
    sharesPage_reset: 'Reset',
    sharesPage_showObjects: 'Show {{count}} properties',
    sharesPage_loadingAria: 'Loading properties',
    sharesPage_loadError: 'Couldn’t load properties',
    sharesPage_loadErrorDesc:
      'Check your connection and try again later — or browse other offers on the platform.',
    sharesPage_seeOtherObjects: 'See other properties',
    sharesPage_emptyFilteredTitle: 'No properties match these filters',
    sharesPage_emptyCatalogTitle: 'No open properties right now',
    sharesPage_emptyFilteredDesc:
      'Reset the filters or broaden your search — we’ll only show real available offers.',
    sharesPage_emptyCatalogDesc:
      'The catalog will update when new share offers appear. Meanwhile, you can browse other properties.',
    sharesPage_sortDefault: 'Default',
    sharesPage_sortYield: 'By yield forecast',
    sharesPage_sortCollected: 'By funding progress',
    sharesPage_sortPrice: 'Most affordable shares first',
    sharesPage_sortLabel: 'Sort',
    sharesPage_statusTitle: 'Funding status',
    sharesPage_statusOpen: 'Funding open',
    sharesPage_statusAlmostFull: 'Almost funded',
    sharesPage_statusCompleted: 'Funding closed',
    sharesPage_yieldForecast: 'Yield forecast',
    sharesPage_yieldFrom0: 'from 0%',
    sharesPage_yieldUpTo: 'up to {{value}}%',
    sharesPage_pricePerShare: 'Price per share',
    sharesPage_priceFrom0: 'from €0',

    testDriveBooking_back: 'Back',
    testDriveBooking_title: 'Test drive: {{title}}',
    testDriveBooking_subtitle:
      'Pick 5 to 21 consecutive days and a contact method — instructions open right away. Use the button below if you closed the window. Booked dates are visible to everyone.',
    testDriveBooking_saving: 'Submitting request…',
    testDriveBooking_selected: 'Selected:',
    testDriveBooking_contact: 'Contact',
    testDriveBooking_change: 'Change',
    testDriveBooking_cancel: 'Cancel',
    testDriveBooking_request: 'Request test drive',
    testDriveBooking_hintCheckInTitle: 'Check-in',
    testDriveBooking_hintCheckInText:
      'On the first day, check-in from 15:00. Keys or access are arranged with the owner after confirmation.',
    testDriveBooking_hintStayTitle: 'Stay',
    testDriveBooking_hintStayText:
      'The number of nights matches your selected range (5 to 21 consecutive days).',
    testDriveBooking_hintCheckOutTitle: 'Check-out',
    testDriveBooking_hintCheckOutText:
      'On the last day, leave the property by 12:00 unless otherwise agreed with the owner.',
    testDriveBooking_hintBusyTitle: 'Booked dates',
    testDriveBooking_hintBusyText:
      'Green — your requests, orange — other users. After picking dates, choose a contact method — instructions open. “Cancel” clears the selection.',
    testDriveBooking_contactTitle: 'How should we reach you?',
    testDriveBooking_contactSubtitle:
      'Pick a convenient channel so the owner knows where to write or call to arrange check-in.',
    testDriveBooking_contactTelegram: 'Telegram',
    testDriveBooking_contactTelegramHint: 'We’ll message you on Telegram',
    testDriveBooking_contactWhatsapp: 'WhatsApp',
    testDriveBooking_contactWhatsappHint: 'We’ll contact you via WhatsApp',
    testDriveBooking_contactEmail: 'Email',
    testDriveBooking_contactEmailHint: 'We’ll send an email',
    testDriveBooking_close: 'Close',
    testDriveBooking_payStep1Title: 'Test-drive instructions and rules',
    testDriveBooking_payStep2Title: 'Step 2: pay for the test drive',
    testDriveBooking_payIntro:
      'Payment is a single charge: the stay amount for your selected nights plus an insurance deposit (if set for the property). After payment, the booking appears for you, the seller, and in the admin panel.',
    testDriveBooking_rule1: 'Check-in on the first day from 15:00; check-out on the last day by 12:00.',
    testDriveBooking_rule2: 'Follow the property rules and treat the home with care.',
    testDriveBooking_rule3:
      'Insurance deposit: if there are no violations after the stay, it is returned to your card within one week of check-out (bank transfer timing may vary).',
    testDriveBooking_days: 'Days',
    testDriveBooking_dailyPrice: 'Price per day',
    testDriveBooking_stayTotal: 'Stay',
    testDriveBooking_deposit: 'Insurance deposit',
    testDriveBooking_depositNote:
      'The deposit is held with the stay payment. If the stay rules were followed, the deposit is returned to the same card within a week after check-out.',
    testDriveBooking_total: 'Total due',
    testDriveBooking_calculating: 'Calculating amount…',
    testDriveBooking_goToPayment: 'Continue to payment',
    testDriveBooking_redirecting: 'Redirecting to payment…',
    testDriveBooking_pay: 'Pay',
    testDriveBooking_previewTitle: 'Villa with a pool by the Mediterranean',
    testDriveBooking_toastConfirmFail: 'Couldn’t confirm payment',
    testDriveBooking_toastConfirmError: 'Payment confirmation error',
    testDriveBooking_toastQuoteFail: 'Couldn’t calculate the price',
    testDriveBooking_toastPickContact: 'Choose a contact method: Telegram, WhatsApp, or email',
    testDriveBooking_toastCalcError: 'Calculation error',
    testDriveBooking_toastCheckoutFail: 'Couldn’t create payment',
    testDriveBooking_toastNetwork: 'Network error',
  },
}

PACK.de = {
  sharesPage_heroTitle: 'Anteile an Immobilien',
  sharesPage_heroLead:
    'Investieren Sie in geprüfte Objekte in Anteilen: Konditionen, Verfügbarkeit und Renditeprognose sind vor dem Kauf sichtbar. Die Rendite ist nicht garantiert.',
  sharesPage_heroCta: 'Objekte ansehen',
  sharesPage_scrollToCatalogAria: 'Zum Katalog',
  sharesPage_searchPlaceholder: 'Stadt oder Objekt',
  sharesPage_searchAria: 'Suche nach Stadt oder Objekt',
  sharesPage_filters: 'Filter',
  sharesPage_filtersDrawerTitle: 'Objektfilter',
  sharesPage_filtersSetup: 'Auswahl verfeinern',
  sharesPage_reset: 'Zurücksetzen',
  sharesPage_showObjects: '{{count}} Objekte anzeigen',
  sharesPage_loadingAria: 'Objekte werden geladen',
  sharesPage_loadError: 'Objekte konnten nicht geladen werden',
  sharesPage_loadErrorDesc:
    'Prüfen Sie die Verbindung und versuchen Sie es später erneut — oder sehen Sie andere Angebote auf der Plattform.',
  sharesPage_seeOtherObjects: 'Andere Objekte ansehen',
  sharesPage_emptyFilteredTitle: 'Keine Objekte für diese Filter',
  sharesPage_emptyCatalogTitle: 'Derzeit keine offenen Objekte',
  sharesPage_emptyFilteredDesc:
    'Setzen Sie die Filter zurück oder erweitern Sie die Suche — wir zeigen nur echte verfügbare Angebote.',
  sharesPage_emptyCatalogDesc:
    'Der Katalog wird aktualisiert, sobald neue Anteilsangebote erscheinen. Bis dahin können Sie andere Objekte ansehen.',
  sharesPage_sortDefault: 'Standard',
  sharesPage_sortYield: 'Nach Renditeprognose',
  sharesPage_sortCollected: 'Nach Finanzierungsfortschritt',
  sharesPage_sortPrice: 'Günstigste Anteile zuerst',
  sharesPage_sortLabel: 'Sortierung',
  sharesPage_statusTitle: 'Finanzierungsstatus',
  sharesPage_statusOpen: 'Finanzierung offen',
  sharesPage_statusAlmostFull: 'Fast finanziert',
  sharesPage_statusCompleted: 'Finanzierung geschlossen',
  sharesPage_yieldForecast: 'Renditeprognose',
  sharesPage_yieldFrom0: 'ab 0%',
  sharesPage_yieldUpTo: 'bis {{value}}%',
  sharesPage_pricePerShare: 'Preis pro Anteil',
  sharesPage_priceFrom0: 'ab €0',

  testDriveBooking_back: 'Zurück',
  testDriveBooking_title: 'Probefahrt: {{title}}',
  testDriveBooking_subtitle:
    'Wählen Sie 5 bis 21 aufeinanderfolgende Tage und einen Kontaktweg — die Anleitung öffnet sich sofort. Nutzen Sie die Schaltfläche unten, falls Sie das Fenster geschlossen haben. Belegte Daten sind für alle sichtbar.',
  testDriveBooking_saving: 'Anfrage wird gesendet…',
  testDriveBooking_selected: 'Ausgewählt:',
  testDriveBooking_contact: 'Kontakt',
  testDriveBooking_change: 'Ändern',
  testDriveBooking_cancel: 'Abbrechen',
  testDriveBooking_request: 'Probefahrt anfragen',
  testDriveBooking_hintCheckInTitle: 'Anreise',
  testDriveBooking_hintCheckInText:
    'Am ersten Tag Check-in ab 15:00. Schlüssel oder Zugang werden nach Bestätigung mit dem Eigentümer abgestimmt.',
  testDriveBooking_hintStayTitle: 'Aufenthalt',
  testDriveBooking_hintStayText:
    'Die Anzahl der Nächte entspricht dem gewählten Zeitraum (5 bis 21 aufeinanderfolgende Tage).',
  testDriveBooking_hintCheckOutTitle: 'Abreise',
  testDriveBooking_hintCheckOutText:
    'Am letzten Tag das Objekt bis 12:00 verlassen, sofern nichts anderes mit dem Eigentümer vereinbart ist.',
  testDriveBooking_hintBusyTitle: 'Belegte Daten',
  testDriveBooking_hintBusyText:
    'Grün — Ihre Anfragen, orange — andere Nutzer. Nach den Daten Kontakt wählen — Anleitung öffnet sich. „Abbrechen“ setzt die Auswahl zurück.',
  testDriveBooking_contactTitle: 'Wie erreichen wir Sie?',
  testDriveBooking_contactSubtitle:
    'Wählen Sie einen Kanal — so weiß der Eigentümer, wohin er schreiben oder anrufen soll.',
  testDriveBooking_contactTelegram: 'Telegram',
  testDriveBooking_contactTelegramHint: 'Wir schreiben Ihnen auf Telegram',
  testDriveBooking_contactWhatsapp: 'WhatsApp',
  testDriveBooking_contactWhatsappHint: 'Wir melden uns per WhatsApp',
  testDriveBooking_contactEmail: 'E-Mail',
  testDriveBooking_contactEmailHint: 'Wir senden eine E-Mail',
  testDriveBooking_close: 'Schließen',
  testDriveBooking_payStep1Title: 'Anleitung und Regeln der Probefahrt',
  testDriveBooking_payStep2Title: 'Schritt 2: Probefahrt bezahlen',
  testDriveBooking_payIntro:
    'Die Zahlung erfolgt in einem Betrag: Aufenthaltskosten für die gewählten Nächte plus Versicherungsdepot (falls für das Objekt hinterlegt). Nach der Zahlung erscheint die Buchung bei Ihnen, beim Verkäufer und in der Admin-Oberfläche.',
  testDriveBooking_rule1: 'Anreise am ersten Tag ab 15:00, Abreise am letzten Tag bis 12:00.',
  testDriveBooking_rule2: 'Halten Sie die Objektregeln ein und gehen Sie schonend mit dem Eigentum um.',
  testDriveBooking_rule3:
    'Versicherungsdepot: ohne Verstöße nach dem Aufenthalt Rückzahlung auf Ihre Karte innerhalb einer Woche nach Abreise (Banklaufzeiten können variieren).',
  testDriveBooking_days: 'Tage',
  testDriveBooking_dailyPrice: 'Preis pro Tag',
  testDriveBooking_stayTotal: 'Aufenthalt',
  testDriveBooking_deposit: 'Versicherungsdepot',
  testDriveBooking_depositNote:
    'Das Depot wird zusammen mit der Aufenthaltszahlung einbehalten. Bei Einhaltung der Regeln wird es innerhalb einer Woche nach Abreise auf dieselbe Karte zurückerstattet.',
  testDriveBooking_total: 'Gesamtbetrag',
  testDriveBooking_calculating: 'Betrag wird berechnet…',
  testDriveBooking_goToPayment: 'Zur Zahlung',
  testDriveBooking_redirecting: 'Weiterleitung zur Zahlung…',
  testDriveBooking_pay: 'Bezahlen',
  testDriveBooking_previewTitle: 'Villa mit Pool am Mittelmeer',
  testDriveBooking_toastConfirmFail: 'Zahlung konnte nicht bestätigt werden',
  testDriveBooking_toastConfirmError: 'Fehler bei der Zahlungsbestätigung',
  testDriveBooking_toastQuoteFail: 'Preis konnte nicht berechnet werden',
  testDriveBooking_toastPickContact: 'Kontaktweg wählen: Telegram, WhatsApp oder E-Mail',
  testDriveBooking_toastCalcError: 'Berechnungsfehler',
  testDriveBooking_toastCheckoutFail: 'Zahlung konnte nicht erstellt werden',
  testDriveBooking_toastNetwork: 'Netzwerkfehler',
}

PACK.es = {
  sharesPage_heroTitle: 'Participaciones inmobiliarias',
  sharesPage_heroLead:
    'Invierte en inmuebles verificados por partes: condiciones, disponibilidad y previsión de rentabilidad visibles antes de comprar. La rentabilidad no está garantizada.',
  sharesPage_heroCta: 'Ver inmuebles',
  sharesPage_scrollToCatalogAria: 'Ir al catálogo',
  sharesPage_searchPlaceholder: 'Ciudad o inmueble',
  sharesPage_searchAria: 'Buscar por ciudad o inmueble',
  sharesPage_filters: 'Filtros',
  sharesPage_filtersDrawerTitle: 'Filtros de inmuebles',
  sharesPage_filtersSetup: 'Ajusta la selección',
  sharesPage_reset: 'Restablecer',
  sharesPage_showObjects: 'Mostrar {{count}} inmuebles',
  sharesPage_loadingAria: 'Cargando inmuebles',
  sharesPage_loadError: 'No se pudieron cargar los inmuebles',
  sharesPage_loadErrorDesc:
    'Comprueba la conexión e inténtalo más tarde — o mira otras ofertas en la plataforma.',
  sharesPage_seeOtherObjects: 'Ver otros inmuebles',
  sharesPage_emptyFilteredTitle: 'No hay inmuebles con estos filtros',
  sharesPage_emptyCatalogTitle: 'No hay inmuebles abiertos ahora',
  sharesPage_emptyFilteredDesc:
    'Restablece los filtros o amplía la búsqueda — solo mostraremos ofertas reales disponibles.',
  sharesPage_emptyCatalogDesc:
    'El catálogo se actualizará cuando haya nuevas ofertas de participaciones. Mientras tanto, puedes ver otros inmuebles.',
  sharesPage_sortDefault: 'Por defecto',
  sharesPage_sortYield: 'Por previsión de rentabilidad',
  sharesPage_sortCollected: 'Por avance de la recaudación',
  sharesPage_sortPrice: 'Participaciones más asequibles primero',
  sharesPage_sortLabel: 'Ordenar',
  sharesPage_statusTitle: 'Estado de la recaudación',
  sharesPage_statusOpen: 'Recaudación abierta',
  sharesPage_statusAlmostFull: 'Casi recaudado',
  sharesPage_statusCompleted: 'Recaudación cerrada',
  sharesPage_yieldForecast: 'Previsión de rentabilidad',
  sharesPage_yieldFrom0: 'desde 0%',
  sharesPage_yieldUpTo: 'hasta {{value}}%',
  sharesPage_pricePerShare: 'Precio por participación',
  sharesPage_priceFrom0: 'desde €0',

  testDriveBooking_back: 'Atrás',
  testDriveBooking_title: 'Prueba: {{title}}',
  testDriveBooking_subtitle:
    'Elige de 5 a 21 días seguidos y un canal de contacto — las instrucciones se abren de inmediato. Usa el botón de abajo si cerraste la ventana. Las fechas ocupadas son visibles para todos.',
  testDriveBooking_saving: 'Enviando solicitud…',
  testDriveBooking_selected: 'Seleccionado:',
  testDriveBooking_contact: 'Contacto',
  testDriveBooking_change: 'Cambiar',
  testDriveBooking_cancel: 'Cancelar',
  testDriveBooking_request: 'Solicitar prueba',
  testDriveBooking_hintCheckInTitle: 'Entrada',
  testDriveBooking_hintCheckInText:
    'El primer día, entrada a partir de las 15:00. Las llaves o el acceso se acuerdan con el propietario tras la confirmación.',
  testDriveBooking_hintStayTitle: 'Estancia',
  testDriveBooking_hintStayText:
    'El número de noches coincide con el rango elegido (de 5 a 21 días seguidos).',
  testDriveBooking_hintCheckOutTitle: 'Salida',
  testDriveBooking_hintCheckOutText:
    'El último día, deja el inmueble antes de las 12:00, salvo otro acuerdo con el propietario.',
  testDriveBooking_hintBusyTitle: 'Fechas ocupadas',
  testDriveBooking_hintBusyText:
    'Verde — tus solicitudes, naranja — otros usuarios. Tras las fechas, elige el contacto — se abren las instrucciones. «Cancelar» borra la selección.',
  testDriveBooking_contactTitle: '¿Cómo te contactamos?',
  testDriveBooking_contactSubtitle:
    'Elige un canal cómodo para que el propietario sepa dónde escribir o llamar para coordinar la entrada.',
  testDriveBooking_contactTelegram: 'Telegram',
  testDriveBooking_contactTelegramHint: 'Te escribiremos por Telegram',
  testDriveBooking_contactWhatsapp: 'WhatsApp',
  testDriveBooking_contactWhatsappHint: 'Te contactaremos por WhatsApp',
  testDriveBooking_contactEmail: 'Correo',
  testDriveBooking_contactEmailHint: 'Te enviaremos un email',
  testDriveBooking_close: 'Cerrar',
  testDriveBooking_payStep1Title: 'Instrucciones y normas de la prueba',
  testDriveBooking_payStep2Title: 'Paso 2: pagar la prueba',
  testDriveBooking_payIntro:
    'El pago es un solo cargo: el importe de la estancia por las noches elegidas más el depósito del seguro (si está definido). Tras el pago, la reserva aparece para ti, el vendedor y en el panel de administración.',
  testDriveBooking_rule1: 'Entrada el primer día desde las 15:00; salida el último día antes de las 12:00.',
  testDriveBooking_rule2: 'Respeta las normas del inmueble y cuida la propiedad.',
  testDriveBooking_rule3:
    'Depósito del seguro: si no hay infracciones tras la estancia, se devuelve a tu tarjeta en una semana desde la salida (el plazo bancario puede variar).',
  testDriveBooking_days: 'Días',
  testDriveBooking_dailyPrice: 'Precio por día',
  testDriveBooking_stayTotal: 'Estancia',
  testDriveBooking_deposit: 'Depósito del seguro',
  testDriveBooking_depositNote:
    'El depósito se retiene con el pago de la estancia. Si se respetaron las normas, se devuelve a la misma tarjeta en una semana tras la salida.',
  testDriveBooking_total: 'Total a pagar',
  testDriveBooking_calculating: 'Calculando el importe…',
  testDriveBooking_goToPayment: 'Ir al pago',
  testDriveBooking_redirecting: 'Redirigiendo al pago…',
  testDriveBooking_pay: 'Pagar',
  testDriveBooking_previewTitle: 'Villa con piscina junto al Mediterráneo',
  testDriveBooking_toastConfirmFail: 'No se pudo confirmar el pago',
  testDriveBooking_toastConfirmError: 'Error al confirmar el pago',
  testDriveBooking_toastQuoteFail: 'No se pudo calcular el precio',
  testDriveBooking_toastPickContact: 'Elige un canal: Telegram, WhatsApp o correo',
  testDriveBooking_toastCalcError: 'Error de cálculo',
  testDriveBooking_toastCheckoutFail: 'No se pudo crear el pago',
  testDriveBooking_toastNetwork: 'Error de red',
}

PACK.fr = {
  sharesPage_heroTitle: 'Parts immobilières',
  sharesPage_heroLead:
    'Investissez dans des biens vérifiés par fractions : conditions, disponibilité et prévision de rendement visibles avant l’achat. Le rendement n’est pas garanti.',
  sharesPage_heroCta: 'Voir les biens',
  sharesPage_scrollToCatalogAria: 'Aller au catalogue',
  sharesPage_searchPlaceholder: 'Ville ou bien',
  sharesPage_searchAria: 'Rechercher par ville ou bien',
  sharesPage_filters: 'Filtres',
  sharesPage_filtersDrawerTitle: 'Filtres des biens',
  sharesPage_filtersSetup: 'Affinez votre sélection',
  sharesPage_reset: 'Réinitialiser',
  sharesPage_showObjects: 'Afficher {{count}} biens',
  sharesPage_loadingAria: 'Chargement des biens',
  sharesPage_loadError: 'Impossible de charger les biens',
  sharesPage_loadErrorDesc:
    'Vérifiez la connexion et réessayez plus tard — ou parcourez d’autres offres sur la plateforme.',
  sharesPage_seeOtherObjects: 'Voir d’autres biens',
  sharesPage_emptyFilteredTitle: 'Aucun bien pour ces filtres',
  sharesPage_emptyCatalogTitle: 'Aucun bien ouvert pour le moment',
  sharesPage_emptyFilteredDesc:
    'Réinitialisez les filtres ou élargissez la recherche — nous n’affichons que des offres réellement disponibles.',
  sharesPage_emptyCatalogDesc:
    'Le catalogue se mettra à jour dès que de nouvelles offres de parts apparaîtront. En attendant, parcourez d’autres biens.',
  sharesPage_sortDefault: 'Par défaut',
  sharesPage_sortYield: 'Par prévision de rendement',
  sharesPage_sortCollected: 'Par avancement de la collecte',
  sharesPage_sortPrice: 'Parts les plus accessibles d’abord',
  sharesPage_sortLabel: 'Tri',
  sharesPage_statusTitle: 'Statut de la collecte',
  sharesPage_statusOpen: 'Collecte ouverte',
  sharesPage_statusAlmostFull: 'Presque collecté',
  sharesPage_statusCompleted: 'Collecte terminée',
  sharesPage_yieldForecast: 'Prévision de rendement',
  sharesPage_yieldFrom0: 'à partir de 0 %',
  sharesPage_yieldUpTo: 'jusqu’à {{value}} %',
  sharesPage_pricePerShare: 'Prix d’une part',
  sharesPage_priceFrom0: 'à partir de 0 €',

  testDriveBooking_back: 'Retour',
  testDriveBooking_title: 'Essai : {{title}}',
  testDriveBooking_subtitle:
    'Choisissez de 5 à 21 jours consécutifs et un canal de contact — les instructions s’ouvrent aussitôt. Utilisez le bouton ci-dessous si vous avez fermé la fenêtre. Les dates réservées sont visibles par tous.',
  testDriveBooking_saving: 'Envoi de la demande…',
  testDriveBooking_selected: 'Sélectionné :',
  testDriveBooking_contact: 'Contact',
  testDriveBooking_change: 'Modifier',
  testDriveBooking_cancel: 'Annuler',
  testDriveBooking_request: 'Demander un essai',
  testDriveBooking_hintCheckInTitle: 'Arrivée',
  testDriveBooking_hintCheckInText:
    'Le premier jour, arrivée à partir de 15 h. Les clés ou l’accès sont convenus avec le propriétaire après confirmation.',
  testDriveBooking_hintStayTitle: 'Séjour',
  testDriveBooking_hintStayText:
    'Le nombre de nuits correspond à la plage choisie (5 à 21 jours consécutifs).',
  testDriveBooking_hintCheckOutTitle: 'Départ',
  testDriveBooking_hintCheckOutText:
    'Le dernier jour, quittez le bien avant 12 h, sauf autre accord avec le propriétaire.',
  testDriveBooking_hintBusyTitle: 'Dates réservées',
  testDriveBooking_hintBusyText:
    'Vert — vos demandes, orange — les autres utilisateurs. Après les dates, choisissez le contact — les instructions s’ouvrent. « Annuler » efface la sélection.',
  testDriveBooking_contactTitle: 'Comment vous joindre ?',
  testDriveBooking_contactSubtitle:
    'Choisissez un canal pratique pour que le propriétaire sache où écrire ou appeler pour organiser l’arrivée.',
  testDriveBooking_contactTelegram: 'Telegram',
  testDriveBooking_contactTelegramHint: 'Nous vous écrivons sur Telegram',
  testDriveBooking_contactWhatsapp: 'WhatsApp',
  testDriveBooking_contactWhatsappHint: 'Nous vous contactons via WhatsApp',
  testDriveBooking_contactEmail: 'E-mail',
  testDriveBooking_contactEmailHint: 'Nous envoyons un e-mail',
  testDriveBooking_close: 'Fermer',
  testDriveBooking_payStep1Title: 'Instructions et règles de l’essai',
  testDriveBooking_payStep2Title: 'Étape 2 : payer l’essai',
  testDriveBooking_payIntro:
    'Le paiement est unique : montant du séjour pour les nuits choisies plus dépôt d’assurance (s’il est défini). Après paiement, la réservation apparaît chez vous, chez le vendeur et dans le panneau d’administration.',
  testDriveBooking_rule1: 'Arrivée le premier jour à partir de 15 h ; départ le dernier jour avant 12 h.',
  testDriveBooking_rule2: 'Respectez les règles du bien et prenez soin du logement.',
  testDriveBooking_rule3:
    'Dépôt d’assurance : sans manquement après le séjour, restitution sur votre carte sous une semaine après le départ (délais bancaires possibles).',
  testDriveBooking_days: 'Jours',
  testDriveBooking_dailyPrice: 'Prix par jour',
  testDriveBooking_stayTotal: 'Séjour',
  testDriveBooking_deposit: 'Dépôt d’assurance',
  testDriveBooking_depositNote:
    'Le dépôt est retenu avec le paiement du séjour. Si les règles ont été respectées, il est remboursé sur la même carte sous une semaine après le départ.',
  testDriveBooking_total: 'Total à payer',
  testDriveBooking_calculating: 'Calcul du montant…',
  testDriveBooking_goToPayment: 'Passer au paiement',
  testDriveBooking_redirecting: 'Redirection vers le paiement…',
  testDriveBooking_pay: 'Payer',
  testDriveBooking_previewTitle: 'Villa avec piscine en Méditerranée',
  testDriveBooking_toastConfirmFail: 'Impossible de confirmer le paiement',
  testDriveBooking_toastConfirmError: 'Erreur de confirmation du paiement',
  testDriveBooking_toastQuoteFail: 'Impossible de calculer le prix',
  testDriveBooking_toastPickContact: 'Choisissez un canal : Telegram, WhatsApp ou e-mail',
  testDriveBooking_toastCalcError: 'Erreur de calcul',
  testDriveBooking_toastCheckoutFail: 'Impossible de créer le paiement',
  testDriveBooking_toastNetwork: 'Erreur réseau',
}

PACK.sv = {
  sharesPage_heroTitle: 'Andelar i fastigheter',
  sharesPage_heroLead:
    'Investera i granskade objekt i andelar: villkor, tillgänglighet och avkastningsprognos syns före köp. Avkastning garanteras inte.',
  sharesPage_heroCta: 'Se objekt',
  sharesPage_scrollToCatalogAria: 'Gå till katalogen',
  sharesPage_searchPlaceholder: 'Stad eller objekt',
  sharesPage_searchAria: 'Sök efter stad eller objekt',
  sharesPage_filters: 'Filter',
  sharesPage_filtersDrawerTitle: 'Objektfilter',
  sharesPage_filtersSetup: 'Finjustera urvalet',
  sharesPage_reset: 'Återställ',
  sharesPage_showObjects: 'Visa {{count}} objekt',
  sharesPage_loadingAria: 'Laddar objekt',
  sharesPage_loadError: 'Kunde inte ladda objekt',
  sharesPage_loadErrorDesc:
    'Kontrollera anslutningen och försök igen senare — eller se andra erbjudanden på plattformen.',
  sharesPage_seeOtherObjects: 'Se andra objekt',
  sharesPage_emptyFilteredTitle: 'Inga objekt matchar filtren',
  sharesPage_emptyCatalogTitle: 'Inga öppna objekt just nu',
  sharesPage_emptyFilteredDesc:
    'Återställ filtren eller bredda sökningen — vi visar bara verkliga tillgängliga erbjudanden.',
  sharesPage_emptyCatalogDesc:
    'Katalogen uppdateras när nya andelserbjudanden dyker upp. Under tiden kan du se andra objekt.',
  sharesPage_sortDefault: 'Standard',
  sharesPage_sortYield: 'Efter avkastningsprognos',
  sharesPage_sortCollected: 'Efter finansieringsstatus',
  sharesPage_sortPrice: 'Billigaste andelar först',
  sharesPage_sortLabel: 'Sortering',
  sharesPage_statusTitle: 'Insamlingsstatus',
  sharesPage_statusOpen: 'Insamling öppen',
  sharesPage_statusAlmostFull: 'Nästan fulltecknad',
  sharesPage_statusCompleted: 'Insamling avslutad',
  sharesPage_yieldForecast: 'Avkastningsprognos',
  sharesPage_yieldFrom0: 'från 0%',
  sharesPage_yieldUpTo: 'upp till {{value}}%',
  sharesPage_pricePerShare: 'Pris per andel',
  sharesPage_priceFrom0: 'från €0',

  testDriveBooking_back: 'Tillbaka',
  testDriveBooking_title: 'Testdrive: {{title}}',
  testDriveBooking_subtitle:
    'Välj 5 till 21 dagar i följd och en kontaktväg — instruktionerna öppnas direkt. Använd knappen nedan om du stängde fönstret. Bokade datum syns för alla.',
  testDriveBooking_saving: 'Skickar förfrågan…',
  testDriveBooking_selected: 'Valt:',
  testDriveBooking_contact: 'Kontakt',
  testDriveBooking_change: 'Ändra',
  testDriveBooking_cancel: 'Avbryt',
  testDriveBooking_request: 'Begär testdrive',
  testDriveBooking_hintCheckInTitle: 'Incheckning',
  testDriveBooking_hintCheckInText:
    'Första dagen checkar du in från 15:00. Nycklar eller tillgång överenskommes med ägaren efter bekräftelse.',
  testDriveBooking_hintStayTitle: 'Vistelse',
  testDriveBooking_hintStayText:
    'Antalet nätter matchar det valda intervallet (5 till 21 dagar i följd).',
  testDriveBooking_hintCheckOutTitle: 'Utcheckning',
  testDriveBooking_hintCheckOutText:
    'Sista dagen lämna objektet senast 12:00 om inte annat avtalats med ägaren.',
  testDriveBooking_hintBusyTitle: 'Bokade datum',
  testDriveBooking_hintBusyText:
    'Grönt — dina förfrågningar, orange — andra användare. Efter datumen, välj kontakt — instruktionerna öppnas. ”Avbryt” rensar valet.',
  testDriveBooking_contactTitle: 'Hur når vi dig?',
  testDriveBooking_contactSubtitle:
    'Välj en smidig kanal så ägaren vet var hen ska skriva eller ringa för att ordna incheckning.',
  testDriveBooking_contactTelegram: 'Telegram',
  testDriveBooking_contactTelegramHint: 'Vi skriver till dig på Telegram',
  testDriveBooking_contactWhatsapp: 'WhatsApp',
  testDriveBooking_contactWhatsappHint: 'Vi kontaktar dig via WhatsApp',
  testDriveBooking_contactEmail: 'E-post',
  testDriveBooking_contactEmailHint: 'Vi skickar ett e-postmeddelande',
  testDriveBooking_close: 'Stäng',
  testDriveBooking_payStep1Title: 'Instruktioner och regler för testdrive',
  testDriveBooking_payStep2Title: 'Steg 2: betala testdrive',
  testDriveBooking_payIntro:
    'Betalningen är en enda debitering: vistelsebeloppet för valda nätter plus försäkringsdeposition (om den är satt). Efter betalning syns bokningen hos dig, säljaren och i adminpanelen.',
  testDriveBooking_rule1: 'Incheckning första dagen från 15:00; utcheckning sista dagen senast 12:00.',
  testDriveBooking_rule2: 'Följ objektets regler och behandla hemmet varsamt.',
  testDriveBooking_rule3:
    'Försäkringsdeposition: utan överträdelser efter vistelsen återbetalas den till ditt kort inom en vecka efter utcheckning (bankens tid kan variera).',
  testDriveBooking_days: 'Dagar',
  testDriveBooking_dailyPrice: 'Pris per dag',
  testDriveBooking_stayTotal: 'Vistelse',
  testDriveBooking_deposit: 'Försäkringsdeposition',
  testDriveBooking_depositNote:
    'Depositionen hålls tillsammans med vistelsebetalningen. Om reglerna följts återbetalas den till samma kort inom en vecka efter utcheckning.',
  testDriveBooking_total: 'Totalt att betala',
  testDriveBooking_calculating: 'Beräknar belopp…',
  testDriveBooking_goToPayment: 'Gå till betalning',
  testDriveBooking_redirecting: 'Omdirigerar till betalning…',
  testDriveBooking_pay: 'Betala',
  testDriveBooking_previewTitle: 'Villa med pool vid Medelhavet',
  testDriveBooking_toastConfirmFail: 'Kunde inte bekräfta betalningen',
  testDriveBooking_toastConfirmError: 'Fel vid betalningsbekräftelse',
  testDriveBooking_toastQuoteFail: 'Kunde inte beräkna priset',
  testDriveBooking_toastPickContact: 'Välj kontaktväg: Telegram, WhatsApp eller e-post',
  testDriveBooking_toastCalcError: 'Beräkningsfel',
  testDriveBooking_toastCheckoutFail: 'Kunde inte skapa betalning',
  testDriveBooking_toastNetwork: 'Nätverksfel',
}

PACK.pl = { ...PACK.en }

function mergeIntoDir(localesDir, langs, label) {
  for (const lang of langs) {
    const filePath = path.join(localesDir, `${lang}.json`)
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    const extra = PACK[lang]
    if (!extra) {
      throw new Error(`Missing PACK for lang=${lang}`)
    }
    for (const [k, v] of Object.entries(extra)) {
      data[k] = v
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8')
    console.log(`[${label}] merged`, lang, Object.keys(extra).length, 'keys')
  }
}

const primaryLangs = ['ru', 'en', 'de', 'es', 'fr', 'sv', 'pl']
const legacyLangs = ['ru', 'en', 'de', 'es', 'fr', 'sv']

mergeIntoDir(primaryLocalesDir, primaryLangs, 'mainPage')
mergeIntoDir(legacyLocalesDir, legacyLangs, 'legacy')

const ruCount = Object.keys(PACK.ru).length
const prefixes = {
  sharesPage_: Object.keys(PACK.ru).filter((k) => k.startsWith('sharesPage_')).length,
  testDriveBooking_: Object.keys(PACK.ru).filter((k) => k.startsWith('testDriveBooking_')).length,
}
console.log('---')
console.log('ru total keys:', ruCount)
console.log('by prefix:', prefixes)
for (const lang of primaryLangs) {
  const n = Object.keys(PACK[lang]).length
  if (n !== ruCount) {
    console.warn(`key count mismatch: ${lang}=${n} vs ru=${ruCount}`)
  }
}

/**
 * Curated routing index for Spanish property-sale legal questions.
 *
 * This file deliberately stores topic names and source routing, not bespoke
 * legal conclusions. The assistant may only state a changing number or rule
 * when it is present in VERIFIED_FACTS or in a freshly fetched official source.
 */

export const SPAIN_LEGAL_SOURCES = Object.freeze({
  boeCivilCode: {
    authority: 'Boletín Oficial del Estado (BOE)',
    title: 'Código Civil — texto consolidado',
    url: 'https://www.boe.es/buscar/act.php?id=BOE-A-1889-4763',
    kind: 'law',
  },
  boeMortgageLaw: {
    authority: 'Boletín Oficial del Estado (BOE)',
    title: 'Ley Hipotecaria — texto consolidado',
    url: 'https://www.boe.es/buscar/act.php?id=BOE-A-1946-2453',
    kind: 'law',
  },
  boeHorizontalProperty: {
    authority: 'Boletín Oficial del Estado (BOE)',
    title: 'Ley 49/1960 de Propiedad Horizontal — texto consolidado',
    url: 'https://www.boe.es/buscar/act.php?id=BOE-A-1960-10906',
    kind: 'law',
  },
  boeUrbanLeases: {
    authority: 'Boletín Oficial del Estado (BOE)',
    title: 'Ley 29/1994 de Arrendamientos Urbanos — texto consolidado',
    url: 'https://www.boe.es/buscar/act.php?id=BOE-A-1994-26003',
    kind: 'law',
  },
  boeMortgageCredit: {
    authority: 'Boletín Oficial del Estado (BOE)',
    title: 'Ley 5/2019 reguladora de los contratos de crédito inmobiliario',
    url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2019-3814',
    kind: 'law',
  },
  boeGoldenVisaRepeal: {
    authority: 'Boletín Oficial del Estado (BOE)',
    title: 'Ley Orgánica 1/2025 — derogación del régimen de inversores',
    url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2025-76',
    kind: 'law',
  },
  ugeInvestors: {
    authority: 'Ministerio de Inclusión, Seguridad Social y Migraciones',
    title: 'UGE — régimen transitorio de inversores',
    url: 'https://ciudadaniaexterior.inclusion.gob.es/web/unidadgrandesempresas/inversores',
    kind: 'official-guidance',
  },
  taxSale: {
    authority: 'Agencia Tributaria',
    title: 'Qué ocurre cuando vendo un inmueble',
    url: 'https://sede.agenciatributaria.gob.es/Sede/vivienda-otros-inmuebles/que-ocurre-cuando-vendo-inmueble.html',
    kind: 'official-guidance',
  },
  taxNonResidentSale: {
    authority: 'Agencia Tributaria',
    title: 'Ganancias por venta de inmuebles de no residentes',
    url: 'https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/manual-tributacion-no-residentes/capitulo-03-tributacion-rentas-comunes-nr/ganancias-patrimoniales/ganancias-patrimoniales-derivadas-venta-inmuebles.html',
    kind: 'official-guidance',
  },
  taxReinvestment: {
    authority: 'Agencia Tributaria',
    title: 'Exención por reinversión en vivienda habitual',
    url: 'https://sede.agenciatributaria.gob.es/Sede/vivienda-otros-inmuebles/que-ocurre-cuando-vendo-inmueble/transmision-vivienda-habitual-reinversion.html',
    kind: 'official-guidance',
  },
  registrars: {
    authority: 'Colegio de Registradores de España',
    title: 'Registro de la Propiedad: nota simple, certificaciones y cargas',
    url: 'https://sede.registradores.org/site/propiedad?lang=es',
    kind: 'official-procedure',
  },
  cadastre: {
    authority: 'Dirección General del Catastro',
    title: 'Sede Electrónica del Catastro',
    url: 'https://www.sedecatastro.gob.es/',
    kind: 'official-procedure',
  },
  notaries: {
    authority: 'Consejo General del Notariado',
    title: 'Portal Notarial del Ciudadano',
    url: 'https://www.portalnotarial.es/',
    kind: 'official-procedure',
  },
  bdeMortgageTable: {
    authority: 'Banco de España',
    title: 'Tipos oficiales de referencia del mercado hipotecario',
    url: 'https://clientebancario.bde.es/pcb/es/menu-horizontal/productosservici/relacionados/tiposinteres/guia-textual/tiposinteresrefe/tabla_tipos_referencia_oficiales_mercado_hipotecario.html',
    kind: 'live-data',
  },
  bdeStatisticsApi: {
    authority: 'Banco de España',
    title: 'API oficial de estadísticas',
    url: 'https://www.bde.es/webbe/es/estadisticas/recursos/api-estadisticas-bde.html',
    kind: 'live-data',
  },
  bdeMortgageGuide: {
    authority: 'Banco de España — Portal del Cliente Bancario',
    title: 'Hipoteca fija, variable o mixta',
    url: 'https://clientebancario.bde.es/pcb/es/menu-horizontal/productosservici/financiacion/hipotecas/guia-textual/primerospasoscon/Hipoteca_a_tipo_2ada24e53ab1d51.html',
    kind: 'official-guidance',
  },
  caixaBankMortgage: {
    authority: 'CaixaBank',
    title: 'Hipoteca CasaFácil — oferta oficial del banco',
    url: 'https://www.caixabank.es/particular/hipotecas/casafacil.html',
    kind: 'live-bank-offer',
  },
  santanderMortgage: {
    authority: 'Banco Santander',
    title: 'Hipoteca fija — oferta oficial del banco',
    url: 'https://www.bancosantander.es/particulares/hipotecas/hipoteca-fija/',
    kind: 'live-bank-offer',
  },
  sabadellMortgage: {
    authority: 'Banco Sabadell',
    title: 'Hipoteca fija — oferta oficial del banco',
    url: 'https://www.bancsabadell.com/bsnacional/es/particulares/hipotecas/hipoteca-fija/',
    kind: 'live-bank-offer',
  },
  boeEnergyCertificate: {
    authority: 'Boletín Oficial del Estado (BOE)',
    title: 'Real Decreto 390/2021 — certificación energética',
    url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2021-9176',
    kind: 'law',
  },
  boeCoasts: {
    authority: 'Boletín Oficial del Estado (BOE)',
    title: 'Ley 22/1988 de Costas — texto consolidado',
    url: 'https://www.boe.es/buscar/act.php?id=BOE-A-1988-18762',
    kind: 'law',
  },
  boeAml: {
    authority: 'Boletín Oficial del Estado (BOE)',
    title: 'Ley 10/2010 de prevención del blanqueo de capitales',
    url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2010-6737',
    kind: 'law',
  },
})

export const VERIFIED_FACTS = Object.freeze([
  {
    id: 'golden-visa-ended',
    text: 'Покупка недвижимости больше не даёт право подать новую заявку на испанскую Golden Visa: режим инвесторов отменён с 3 апреля 2025 года. Для заявлений, поданных раньше, действует переходный режим.',
    effectiveDate: '2025-04-03',
    sourceIds: ['boeGoldenVisaRepeal', 'ugeInvestors'],
  },
  {
    id: 'non-resident-retention',
    text: 'При покупке испанской недвижимости у продавца-нерезидента покупатель удерживает 3% согласованной цены как платёж в счёт налога продавца и перечисляет его по Modelo 211.',
    sourceIds: ['taxNonResidentSale'],
  },
  {
    id: 'modelo-211-deadline',
    text: 'Agencia Tributaria указывает для Modelo 211 срок один месяц с даты передачи недвижимости.',
    sourceIds: ['taxNonResidentSale'],
  },
  {
    id: 'reinvestment-window',
    text: 'Для возможного освобождения прибыли от продажи основного жилья при реинвестировании общий срок составляет два года до или после продажи; применимость зависит от выполнения всех условий.',
    sourceIds: ['taxReinvestment'],
  },
  {
    id: 'community-certificate',
    text: 'При нотариальной передаче объекта продавец заявляет о долгах перед comunidad и предоставляет подтверждающий сертификат, если покупатель прямо не освободил его от этой обязанности.',
    sourceIds: ['boeHorizontalProperty'],
  },
  {
    id: 'community-certificate-period',
    text: 'Закон о горизонтальной собственности предусматривает выдачу сертификата о долгах comunidad в течение семи календарных дней после запроса.',
    sourceIds: ['boeHorizontalProperty'],
  },
  {
    id: 'nota-simple-scope',
    text: 'Nota Simple показывает описание объекта, зарегистрированных правообладателей, права, ограничения и обременения, но имеет информационный характер; доказательственную силу публичного документа имеет certificación registral.',
    sourceIds: ['registrars'],
  },
  {
    id: 'mortgage-rate-policy',
    text: 'Нельзя называть «ставку по ипотеке в Испании» одним числом. Нужно отдельно показывать официальный индекс Banco de España и конкретные TIN/TAE, срок, LTV, условия скидки и срок действия предложения выбранного банка.',
    sourceIds: ['bdeMortgageTable', 'bdeMortgageGuide'],
  },
  {
    id: 'regional-values-policy',
    text: 'Региональные налоги, VPO, cédula de habitabilidad и туристические лицензии зависят от автономного сообщества, а plusvalía municipal и часть процедур — от муниципалитета. Без точной локации числовой ответ запрещён.',
    sourceIds: ['cadastre'],
  },
])

const CATEGORIES = [
  {
    id: 'preparation_registry',
    sourceIds: ['registrars', 'cadastre', 'boeMortgageLaw', 'boeEnergyCertificate'],
    topics: [
      'Проверка права собственности продавца', 'Получение выписки Nota Simple', 'Проверка данных объекта в Registro de la Propiedad', 'Проверка совпадения данных реестра и кадастра', 'Исправление расхождений площади объекта', 'Исправление кадастровых ошибок', 'Проверка границ земельного участка', 'Регистрация незарегистрированной части дома', 'Легализация пристройки', 'Легализация перепланировки', 'Проверка законности строительства', 'Declaración de Obra Nueva', 'Получение кадастровой справки', 'Получение кадастрового номера', 'Проверка назначения недвижимости', 'Изменение назначения помещения', 'Проверка статуса земельного участка', 'Продажа объекта на сельской земле', 'Продажа недостроенного объекта', 'Продажа объекта после реконструкции',
    ],
  },
  {
    id: 'seller_documents',
    sourceIds: ['registrars', 'cadastre', 'notaries', 'boeEnergyCertificate', 'boeHorizontalProperty'],
    topics: [
      'NIE продавца', 'Паспорт и удостоверение личности продавца', 'Испанский налоговый номер', 'Документы иностранного продавца', 'Документы налогового резидента Испании', 'Документы налогового нерезидента', 'Escritura Pública de Compraventa', 'Предыдущий нотариальный договор покупки', 'Nota Simple', 'Certificado Catastral', 'Последняя квитанция IBI', 'Certificado de Eficiencia Energética', 'Cédula de Habitabilidad', 'Licencia de Primera Ocupación', 'Справка об отсутствии долгов перед comunidad', 'Квитанции за коммунальные услуги', 'Документы на проведённый ремонт', 'Технический паспорт здания', 'Informe de Evaluación del Edificio', 'Страховой полис недвижимости',
    ],
  },
  {
    id: 'owners_capacity',
    sourceIds: ['boeCivilCode', 'registrars', 'notaries'],
    topics: [
      'Продажа объекта одним собственником', 'Продажа объекта несколькими собственниками', 'Продажа совместной собственности супругов', 'Продажа недвижимости после развода', 'Согласие супруга на продажу', 'Продажа семейного жилья', 'Продажа доли в недвижимости', 'Преимущественное право покупки доли', 'Продажа объекта несовершеннолетнего', 'Продажа объекта недееспособного собственника', 'Продажа по доверенности', 'Проверка иностранной доверенности', 'Апостиль на доверенности', 'Присяжный перевод документов', 'Отзыв доверенности', 'Продажа недвижимости компанией', 'Продажа объекта иностранной компанией', 'Проверка полномочий директора компании', 'Продажа объекта фондом или юридическим лицом', 'Определение конечного бенефициара',
    ],
  },
  {
    id: 'inheritance_gifts',
    sourceIds: ['boeCivilCode', 'registrars', 'taxSale'],
    topics: [
      'Продажа унаследованной недвижимости', 'Принятие наследства перед продажей', 'Регистрация наследников в реестре', 'Продажа объекта несколькими наследниками', 'Отсутствующий наследник', 'Спор между наследниками', 'Наследственный налог перед продажей', 'Международное наследство', 'Иностранное завещание', 'Продажа подаренной недвижимости', 'Налоговые последствия дарения', 'Продажа объекта с правом узуфрукта', 'Согласие владельца узуфрукта', 'Прекращение узуфрукта', 'Продажа bare ownership — nuda propiedad',
    ],
  },
  {
    id: 'charges_restrictions',
    sourceIds: ['registrars', 'boeMortgageLaw', 'boeCoasts', 'boeHorizontalProperty'],
    topics: [
      'Продажа объекта с ипотекой', 'Погашение ипотеки при продаже', 'Снятие ипотеки из реестра', 'Банковская справка об остатке долга', 'Cancelación Registral de Hipoteca', 'Продажа объекта с арестом', 'Продажа объекта с судебным запретом', 'Продажа объекта с налоговым долгом', 'Продажа объекта с залогом', 'Проверка сервитутов', 'Право прохода через участок', 'Ограничения на использование объекта', 'Право преимущественной покупки', 'Retracto — право обратного выкупа', 'Ограничения для социального жилья VPO', 'Продажа недвижимости VPO', 'Объект в охраняемой исторической зоне', 'Прибрежные ограничения Ley de Costas', 'Ограничения на сельскохозяйственную землю', 'Незаконное занятие объекта — okupas',
    ],
  },
  {
    id: 'tenants_occupants',
    sourceIds: ['boeUrbanLeases', 'boeCivilCode', 'registrars'],
    topics: [
      'Продажа квартиры с арендатором', 'Права арендатора при продаже', 'Уведомление арендатора о продаже', 'Преимущественное право покупки арендатора', 'Продажа с действующим договором аренды', 'Передача депозита арендатора новому владельцу', 'Расторжение аренды перед продажей', 'Выселение арендатора перед продажей', 'Продажа объекта с неоплатой аренды', 'Краткосрочная аренда перед продажей', 'Туристическая лицензия при продаже', 'Передача туристической лицензии покупателю', 'Зарегистрированные жильцы — empadronamiento', 'Снятие жильцов с регистрации', 'Продажа объекта с пожизненным проживанием',
    ],
  },
  {
    id: 'contracts_closing',
    sourceIds: ['boeCivilCode', 'notaries', 'registrars'],
    topics: [
      'Договор с агентством недвижимости', 'Эксклюзивный договор с агентом', 'Комиссия агентства', 'Расторжение договора с агентством', 'Ответственность агента', 'Резервационный договор', 'Contrato de Reserva', 'Задаток Arras', 'Arras penitenciales', 'Arras confirmatorias', 'Arras penales', 'Возврат задатка', 'Отказ продавца от сделки', 'Отказ покупателя от сделки', 'Штраф за срыв сделки', 'Предварительный договор купли-продажи', 'Условия завершения сделки', 'Сделка под условием получения ипотеки', 'Сделка под условием юридической проверки', 'Подписание сделки у нотариуса',
    ],
  },
  {
    id: 'price_payments_aml',
    sourceIds: ['boeAml', 'notaries', 'taxSale', 'cadastre'],
    topics: [
      'Определение цены в договоре', 'Нельзя занижать цену сделки', 'Кадастровая стоимость объекта', 'Valor de Referencia Catastral', 'Подтверждение источника средств покупателя', 'Банковский чек на сделке', 'Банковский перевод продавцу', 'Разделение платежей между собственниками', 'Валютный контроль иностранного продавца', 'Получение денег на иностранный счёт', 'Блокировка платежа банком', 'Подтверждение происхождения недвижимости', 'Предотвращение отмывания денег', 'Идентификация сторон сделки', 'Расчёт через нотариальный депозит',
    ],
  },
  {
    id: 'seller_taxes',
    sourceIds: ['taxSale', 'taxNonResidentSale', 'taxReinvestment', 'cadastre'],
    topics: [
      'Налог на прирост капитала', 'Расчёт налогооблагаемой прибыли', 'Расходы, уменьшающие налоговую базу', 'Учёт стоимости покупки объекта', 'Учёт затрат на ремонт', 'Учёт нотариальных расходов', 'Учёт комиссии агентства', 'Налог продавца-нерезидента', 'Удержание 3% у нерезидента', 'Возврат излишне удержанного налога', 'Декларация Modelo 210', 'Муниципальный налог Plusvalía Municipal', 'Расчёт Plusvalía Municipal', 'Освобождение от налога для основного жилья', 'Реинвестирование средств в новое основное жильё', 'Льготы для продавцов старше 65 лет', 'Продажа объекта с убытком', 'Налоговая декларация после продажи', 'Налогообложение иностранной компании', 'Риск двойного налогообложения',
    ],
  },
  {
    id: 'community_administration',
    sourceIds: ['boeHorizontalProperty', 'cadastre', 'registrars'],
    topics: [
      'Долги по IBI', 'Долги перед comunidad de propietarios', 'Специальные взносы comunidad — derramas', 'Уже утверждённые будущие ремонтные взносы', 'Долги за электричество', 'Долги за воду', 'Передача коммунальных договоров покупателю', 'Снятие показаний счётчиков', 'Передача ключей', 'Передача сигнализации', 'Передача интернет-контракта', 'Муниципальные штрафы по объекту', 'Лицензии на ремонт', 'Незакрытые строительные разрешения', 'Проверка градостроительных нарушений',
    ],
  },
  {
    id: 'special_transactions',
    sourceIds: ['boeCivilCode', 'registrars', 'notaries', 'taxSale'],
    topics: [
      'Срочная продажа недвижимости', 'Продажа ниже рыночной стоимости', 'Продажа родственнику', 'Продажа между супругами', 'Продажа объекта банку', 'Продажа недвижимости на аукционе', 'Судебный аукцион недвижимости', 'Продажа проблемной недвижимости', 'Продажа объекта с долгами', 'Продажа права требования по долгу', 'Продажа доли инвестору', 'Продажа объекта с правом обратного выкупа', 'Продажа с рассрочкой платежа', 'Аренда с последующим выкупом', 'Продажа новостройки застройщиком', 'Продажа коммерческой недвижимости', 'Продажа земельного участка', 'Продажа гаража или парковочного места', 'Продажа кладовой отдельно от квартиры', 'Продажа туристических апартаментов',
    ],
  },
  {
    id: 'foreigners_residence',
    sourceIds: ['boeGoldenVisaRepeal', 'ugeInvestors', 'taxNonResidentSale', 'notaries'],
    topics: [
      'Продажа недвижимости нерезидентом Испании', 'Продажа недвижимости гражданином ЕС', 'Продажа гражданином страны вне ЕС', 'Получение NIE для проведения сделки', 'Налоговый представитель нерезидента', 'Подписание сделки без приезда в Испанию', 'Дистанционная продажа по доверенности', 'Оформление доверенности в консульстве Испании', 'Апостилирование иностранных документов', 'Присяжный перевод документов', 'Проверка семейного положения иностранца', 'Иностранный брачный договор', 'Продажа после смены налогового резидентства', 'Перевод денег за пределы Испании', 'Влияние продажи на действующий ВНЖ', 'Влияние продажи на подтверждение финансовых средств', 'Закрытие вопроса прежней Golden Visa', 'Продажа объекта владельцем инвестиционного ВНЖ', 'Сохранение резидентского статуса после продажи', 'Налоговое резидентство в год продажи',
    ],
  },
  {
    id: 'mortgage',
    sourceIds: ['bdeMortgageTable', 'bdeStatisticsApi', 'bdeMortgageGuide', 'boeMortgageCredit', 'caixaBankMortgage', 'santanderMortgage', 'sabadellMortgage'],
    topics: [
      'Покупка объекта покупателем с ипотекой', 'Оценка недвижимости банком', 'Условия ипотечного одобрения', 'Задаток при отказе банка в ипотеке', 'Ипотечная оговорка в договоре Arras', 'Одновременное погашение ипотеки продавца', 'Замена должника по ипотеке', 'Subrogación hipotecaria', 'Продажа при отрицательном капитале', 'Недостаточная цена для погашения ипотеки', 'Комиссия банка за досрочное погашение', 'Расходы на снятие ипотеки', 'Проверка скрытой зарегистрированной ипотеки', 'Вторичная ипотека на объекте', 'Продажа объекта с несколькими залогами',
    ],
  },
  {
    id: 'risks_disputes',
    sourceIds: ['boeCivilCode', 'boeMortgageLaw', 'registrars'],
    topics: [
      'Скрытые дефекты недвижимости', 'Ответственность продавца за дефекты', 'Ответственность за неверное описание объекта', 'Недостоверная площадь в объявлении', 'Незаявленные строительные работы', 'Проблемы после передачи ключей', 'Покупатель не оплатил остаток цены', 'Продавец не освободил объект', 'Спор о мебели и оборудовании', 'Спор о границах участка', 'Спор с comunidad', 'Судебный спор по праву собственности', 'Мошенничество при продаже недвижимости', 'Поддельная доверенность', 'Поддельный банковский чек', 'Расторжение сделки через суд', 'Возмещение убытков', 'Медиация между продавцом и покупателем', 'Срок исковой давности', 'Юридическая проверка до подписания Arras',
    ],
  },
]

export const SPAIN_LEGAL_TOPICS = Object.freeze(
  CATEGORIES.flatMap((category) =>
    category.topics.map((title) => Object.freeze({ title, category: category.id, sourceIds: category.sourceIds })),
  ),
)

export const SPAIN_LEGAL_REVIEWED_AT = '2026-09-04'

const STOP_WORDS = new Set(['как', 'что', 'для', 'это', 'при', 'или', 'мне', 'нужен', 'нужна', 'объект', 'недвижимость', 'продажа', 'испания', 'испанский'])

function tokens(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
}

export function isSpainPropertyLegalQuery(query = '') {
  const text = String(query).toLowerCase()
  return /(\bnie\b|\bibi\b|\bvpo\b|arras|catastro|catastral|nota\s+simple|escritura|notari|registro\s+de\s+la\s+propiedad|comunidad|derramas|usufruct|nuda\s+propiedad|modelo\s+21[01]|plusval[ií]a|\birnr\b|hipoteca|eur[ií]bor|\btin\b|\btae\b|visa|visado|виза|внж|нерезидент|ипотек|налог|нотари|кадастр|реестр|собственник|супруг|развод|несовершеннолет|недееспособ|арендатор|арендн.*договор|выселен|наслед|дарен|завещан|доверен|апостил|обремен|арест|сервитут|залог|задат|лицензи|перепланиров|узуфрукт|коммун|агентств|комисси.*агент|резервацион|предварительн.*договор|срыв.*сделк|рассрочк|аукцион.*суд|отмыван|происхождени.*средств|скрыт.*дефект|возмещени.*убыт|исков.*давност|юрид|документ.*продаж|legal|seller|tenant|inherit|power\s+of\s+attorney)/i.test(text)
}

export function selectSpainLegalKnowledge(query = '', limit = 8) {
  const queryTokens = tokens(query)
  const raw = String(query || '').toLowerCase()
  const categoryBoosts = new Map()
  const boost = (category, score = 60) => categoryBoosts.set(category, score)
  if (/ипотек|ставк|процент|eur[ií]bor|\btin\b|\btae\b|mortgage|hipoteca/i.test(raw)) boost('mortgage', 100)
  if (/golden|внж|виза|visa|visado|residen|нерезидент|non.?resident/i.test(raw)) boost('foreigners_residence', 100)
  if (/налог|plusval[ií]a|modelo\s+21[01]|irnr|retenci[oó]n|удержан/i.test(raw)) boost('seller_taxes', 90)
  if (/nota\s+simple|реестр|registr|catastro|кадастр|площад|границ/i.test(raw)) boost('preparation_registry', 80)
  if (/документ|сертификат|паспорт|\bnie\b|escritura|ibi/i.test(raw)) boost('seller_documents', 70)
  if (/арендатор|арендн|tenant|alquiler|турист.*лицензи/i.test(raw)) boost('tenants_occupants', 90)
  if (/наслед|дарен|завещан|inherit|herencia|donaci[oó]n/i.test(raw)) boost('inheritance_gifts', 90)
  if (/обремен|арест|сервитут|залог|vpo|costas|okupa/i.test(raw)) boost('charges_restrictions', 90)
  if (/arras|задат|резервацион|предварительн.*договор|нотариус|notario/i.test(raw)) boost('contracts_closing', 80)
  if (/собственник|супруг|развод|несовершеннолет|доверен|апостил|компани/i.test(raw)) boost('owners_capacity', 80)
  const ranked = SPAIN_LEGAL_TOPICS.map((topic) => {
    const title = tokens(topic.title)
    let score = 0
    for (const token of queryTokens) {
      if (title.includes(token)) score += 8
      else if (title.some((candidate) => candidate.includes(token) || token.includes(candidate))) score += 3
    }
    score += categoryBoosts.get(topic.category) || 0
    return { ...topic, score }
  })
    .filter((topic) => topic.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'ru'))
    .slice(0, Math.max(1, limit))

  const matched = ranked.length
    ? ranked
    : SPAIN_LEGAL_TOPICS.filter((topic) => topic.category === 'contracts_closing').slice(0, 4)
  const preferredSourceIds = []
  const prefer = (...ids) => preferredSourceIds.push(...ids)
  if (/golden|внж|виза|visa|visado|residen/i.test(raw)) prefer('boeGoldenVisaRepeal', 'ugeInvestors')
  if (/нерезидент|non.?resident|no\s+residente|modelo\s+21[01]|удерж|retenci[oó]n|3\s*%/i.test(raw)) prefer('taxNonResidentSale')
  if (/реинвест|reinvest/i.test(raw)) prefer('taxReinvestment', 'taxSale')
  if (/ипотек|ставк|процент|eur[ií]bor|\btin\b|\btae\b|mortgage|hipoteca/i.test(raw)) prefer('bdeMortgageTable', 'bdeStatisticsApi', 'bdeMortgageGuide')
  if (/nota\s+simple|реестр|registr|обремен|carga/i.test(raw)) prefer('registrars', 'boeMortgageLaw')
  if (/comunidad|деррам|derram|долг.*сообществ/i.test(raw)) prefer('boeHorizontalProperty')
  const sourceIds = [...new Set([...preferredSourceIds, ...matched.flatMap((topic) => topic.sourceIds)])]
  const sources = sourceIds.map((id) => ({ id, ...SPAIN_LEGAL_SOURCES[id] })).filter((item) => item.url)
  const factIds = new Set()
  if (/golden|внж|виза|visa|visado|residen/i.test(raw)) factIds.add('golden-visa-ended')
  if (/нерезидент|non.?resident|no\s+residente|modelo\s+21[01]|удерж|retenci[oó]n|3\s*%/i.test(raw)) {
    factIds.add('non-resident-retention')
    factIds.add('modelo-211-deadline')
  }
  if (/реинвест|reinvest/i.test(raw)) factIds.add('reinvestment-window')
  if (/comunidad|деррам|derram|долг.*сообществ/i.test(raw)) {
    factIds.add('community-certificate')
    factIds.add('community-certificate-period')
  }
  if (/nota\s+simple|реестр|registr|обремен|carga/i.test(raw)) factIds.add('nota-simple-scope')
  if (/ипотек|ставк|процент|eur[ií]bor|\btin\b|\btae\b|mortgage|hipoteca/i.test(raw)) factIds.add('mortgage-rate-policy')
  if (/vpo|турист|лицензи|c[eé]dula|plusval[ií]a|муницип|регион/i.test(raw)) factIds.add('regional-values-policy')
  const relevantFacts = VERIFIED_FACTS.filter((fact) => factIds.has(fact.id))

  return {
    jurisdiction: 'Spain only',
    asOf: SPAIN_LEGAL_REVIEWED_AT,
    coverage: { topicCount: SPAIN_LEGAL_TOPICS.length, matchedTopics: matched.map((topic) => topic.title) },
    verifiedFacts: relevantFacts,
    sources,
    rules: [
      'Отвечай только о продаже или покупке недвижимости в Испании; не добавляй Дубай и другие юрисдикции.',
      'Меняющиеся проценты, лимиты, сроки и банковские условия называй только из VERIFIED FACTS или LIVE OFFICIAL DATA с датой.',
      'Точный правовой вывод давай только когда он прямо подтверждён VERIFIED FACTS или релевантным фрагментом LIVE OFFICIAL DATA; иначе дай безопасный чек-лист и обозначь, что норму нужно проверить.',
      'Для ипотечной ставки обязательно различай TIN, TAE, официальный индекс, банковскую надбавку, bonificación, срок и LTV.',
      'Если банковское предложение истекло либо дата действия не найдена, не выдавай его за действующее.',
      'Для регионального или муниципального правила сначала запроси автономное сообщество и муниципалитет.',
      'Для индивидуального вывода по документам, спору, VPO, наследству или налогам предложи проверку испанским abogado/gestor/notario.',
      'В конце юридического ответа укажи 1–3 использованных официальных источника с прямыми URL.',
    ],
  }
}

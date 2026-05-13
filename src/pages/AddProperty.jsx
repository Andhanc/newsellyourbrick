import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  FiUpload, 
  FiX, 
  FiChevronLeft, 
  FiChevronRight,
  FiEye,
  FiDollarSign,
  FiHome,
  FiMapPin,
  FiLoader,
  FiChevronDown,
  FiLink,
  FiVideo,
  FiFileText,
  FiCheck,
  FiFile,
  FiThumbsUp,
  FiClock,
  FiPieChart,
  FiCreditCard,
  FiGift,
  FiLayers,
  FiTrendingUp,
  FiShield,
  FiZap,
  FiTarget
} from 'react-icons/fi'
import { PiBuildingApartment, PiBuildings, PiWarehouse } from 'react-icons/pi'

const ADD_PROPERTY_NAME_PLACEHOLDER_I18N_KEYS = {
  apartment: 'addPropertyNamePlaceholderApartment',
  house: 'addPropertyNamePlaceholderHouse',
  villa: 'addPropertyNamePlaceholderVilla',
  commercial: 'addPropertyNamePlaceholderCommercial'
}

const PROPERTY_TYPE_OPTIONS = [
  { id: 'house', backendType: 'house', title: 'Дом', description: 'Частный дом, таунхаус или коттедж', icon: 'house' },
  { id: 'villa', backendType: 'villa', title: 'Вилла', description: 'Премиальная загородная недвижимость', icon: 'villa' },
  { id: 'apartments', backendType: 'apartment', title: 'Аппартаменты', description: 'Сервисные или инвестиционные апартаменты', icon: 'apartments' },
  { id: 'apartment', backendType: 'apartment', title: 'Квартира', description: 'Квартира в многоквартирном доме', icon: 'apartment' },
  { id: 'commercial', backendType: 'commercial', title: 'Коммерческая недвижимость', description: 'Офис, магазин, склад или другое помещение', icon: 'commercial' },
  { id: 'land', backendType: 'house', title: 'Земля', description: 'Участок под застройку, ферму или бизнес', icon: 'land' },
  { id: 'other', backendType: 'commercial', title: 'Другое', description: 'Нестандартный объект, смешанный формат', icon: 'other' },
]

const LISTING_MODE_OPTIONS = [
  {
    id: 'auction',
    title: 'Аукцион',
    description: 'Максимизирует рыночную цену за счет конкуренции между покупателями',
    icon: 'auction',
    tone: 'teal',
    detail: {
      howTitle: 'Как проходит продажа',
      howLead:
        'Вы задаёте стартовую цену и срок приёма ставок. Покупатели повышают ставки в открытой конкуренции; по окончании периода лидер получает право на сделку по итоговой сумме.',
      howSteps: [
        'Публикуете объект и параметры аукциона (старт, шаг, дата окончания).',
        'Участники делают ставки — вы видите динамику спроса в реальном времени.',
        'После завершения торгов фиксируется победитель и переходите к оформлению сделки по правилам платформы.',
      ],
      fitTitle: 'Кому подходит',
      fitText:
        'Когда объект востребован на рынке и вы хотите «проверить» справедливую цену через конкуренцию, а не полагаться на одну оценку или случайного покупателя.',
      prosTitle: 'Преимущества',
      pros: [
        'Потенциально более высокая итоговая цена за счёт борьбы покупателей.',
        'Прозрачная механика и понятный дедлайн принятия решений.',
        'Снижение риска занижения цены при сильном интересе к объекту.',
      ],
    },
  },
  {
    id: 'auction_buy_now',
    title: 'Аукцион + Продать сейчас',
    description: 'Дает два сценария сразу: борьба ставок и быстрая сделка по фиксированной цене',
    icon: 'flash',
    tone: 'violet',
    detail: {
      howTitle: 'Как проходит продажа',
      howLead:
        'Параллельно работают два канала: классические торги и цена «Продать сейчас». Если покупатель согласен на фикс — он может закрыть сделку без ожидания финала аукциона.',
      howSteps: [
        'Указываете старт аукциона и (отдельно) цену мгновенной покупки.',
        'Покупатели либо повышают ставки, либо активируют «Продать сейчас».',
        'При срабатывании фиксированной цены торги завершаются в пользу этого покупателя — дальше стандартное оформление сделки.',
      ],
      fitTitle: 'Кому подходит',
      fitText:
        'Когда важны и время, и доходность: часть аудитории готова переплатить за скорость, другая — выторговать лучшую цену.',
      prosTitle: 'Преимущества',
      pros: [
        'Гибкость: охватываете и «торгашей», и тех, кто хочет купить сразу.',
        'Меньше риска «зависнуть» в долгих переговорах без обязательств.',
        'Часто быстрее выход к реальной сделке по сравнению с чистым аукционом без фикса.',
      ],
    },
  },
  {
    id: 'shares',
    title: 'Доли',
    description: 'Расширяет круг покупателей за счет входа с меньшим бюджетом',
    icon: 'shares',
    tone: 'blue',
    detail: {
      howTitle: 'Как проходит продажа',
      howLead:
        'Вы задаёте оценку всего объекта и делите его на доли. На платформе отображается цена входа за одну долю; инвесторы приобретают части согласно вашим условиям и регламенту сделки.',
      howSteps: [
        'Указываете общую стоимость объекта и количество долей.',
        'Система показывает покупателям цену одной доли и условия участия.',
        'После набора интереса оформляется сделка по выбранной вами модели (полная продажа долей, пул инвесторов и т.д. — в рамках договорённостей).',
      ],
      fitTitle: 'Кому подходит',
      fitText:
        'Дорогая недвижимость, объекты для совместных инвестиций или ситуации, когда удобнее продать частями, чем искать одного покупателя на весь лот.',
      prosTitle: 'Преимущества',
      pros: [
        'Ниже порог входа для покупателей — шире воронка интереса.',
        'Возможность частично остаться в активе или привлечь нескольких партнёров.',
        'Удобно для презентации инвестиционного кейса с понятной математикой.',
      ],
    },
  },
  {
    id: 'debt',
    title: 'Долги',
    description: 'Подходит для сложных кейсов: помогает быстрее найти целевого инвестора',
    icon: 'debt',
    tone: 'amber',
    detail: {
      howTitle: 'Как проходит продажа',
      howLead:
        'Акцент на сумме обязательств и условиях актива. Публикация ориентирована на инвесторов и стратегических покупателей, которые принимают объект «как есть» и готовы работать с юридико-финансовой структурой.',
      howSteps: [
        'Заполняете блок по долгу и прикладываете требуемые документы.',
        'Целевая аудитория видит ключевые цифры и ограничения без «воды».',
        'Переговоры ведутся с отфильтрованными откликами — быстрее выход к серьёзному покупателю.',
      ],
      fitTitle: 'Кому подходит',
      fitText:
        'Обременения, срочность, нестандартный актив или необходимость найти не розничного, а профессионального контрагента.',
      prosTitle: 'Преимущества',
      pros: [
        'Меньше случайных просмотров — выше доля релевантных обращений.',
        'Экономия времени за счёт честного описания сложности сделки.',
        'Фокус на инвесторах, которые умеют закрывать такие истории.',
      ],
    },
  },
  {
    id: 'debt_auction',
    title: 'Долги + Аукцион',
    description: 'Ускоряет продажу проблемного актива и повышает шанс на лучшую цену через торги',
    icon: 'target',
    tone: 'slate',
    detail: {
      howTitle: 'Как проходит продажа',
      howLead:
        'Сочетание долгового профиля и аукционной механики: ставки помогают обнаружить рыночную цену при сохранении понятного срока и прозрачной процедуры отбора покупателя.',
      howSteps: [
        'Размещаете актив с параметрами долга и правилами торгов.',
        'Участники конкурируют ставками с учётом рисков и обременений.',
        'По завершении периода фиксируется победитель — переходите к сделке с пониманием итоговых условий.',
      ],
      fitTitle: 'Кому подходит',
      fitText:
        'Когда нельзя просто назначить одну цену «с потолка», но нужно ускорить выход актива на рынок и получить сигнал спроса через торги.',
      prosTitle: 'Преимущества',
      pros: [
        'Конкуренция ставок снижает риск продешевить при неочевидном активе.',
        'Фиксированный горизонт торгов дисциплинирует процесс.',
        'Баланс между скоростью сделки и попыткой выжать максимум при сложном кейсе.',
      ],
    },
  },
]

/** Раскрывающаяся инструкция по формату продажи (общая разметка для single-page и мастера) */
function ListingModeInstructionPanel({ mode, layout = 'stack' }) {
  const d = mode.detail
  if (!d) return null
  return (
    <div className={`lm-instruction lm-instruction--${layout} lm-instruction--tone-${mode.tone}`}>
      <div className="lm-instruction__section">
        <h4 className="lm-instruction__title">{d.howTitle}</h4>
        <p className="lm-instruction__lead">{d.howLead}</p>
        {d.howSteps?.length > 0 && (
          <ol className="lm-instruction__steps">
            {d.howSteps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        )}
      </div>
      <div className="lm-instruction__section lm-instruction__section--accent">
        <h4 className="lm-instruction__title">{d.fitTitle}</h4>
        <p className="lm-instruction__p">{d.fitText}</p>
      </div>
      <div className="lm-instruction__section">
        <h4 className="lm-instruction__title">{d.prosTitle}</h4>
        <ul className="lm-instruction__pros">
          {d.pros.map((line, i) => (
            <li key={i}>
              <FiCheck className="lm-instruction__pro-icon" aria-hidden />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

const LISTING_MODE_THEME_STAGES = ['aurora', 'sunset', 'midnight']

/** Значения поля «Тип конструкции» (единый список для квартир, домов и коммерции); подписи — i18n addPropertyConstructionType* */
const CONSTRUCTION_TYPE_FORM_VALUES = ['monolithic', 'brick', 'panel', 'frame']

const CONSTRUCTION_TYPE_I18N_KEYS = {
  monolithic: 'addPropertyConstructionTypeMonolithic',
  brick: 'addPropertyConstructionTypeBrick',
  panel: 'addPropertyConstructionTypePanel',
  frame: 'addPropertyConstructionTypeFrame',
}

const CONSTRUCTION_TYPE_ALLOWED = new Set(CONSTRUCTION_TYPE_FORM_VALUES)

/** При редактировании: привести устаревшие коды к новому списку или очистить */
function normalizeConstructionTypeForForm(raw) {
  if (raw == null || raw === '') return ''
  const v = String(raw)
  if (CONSTRUCTION_TYPE_ALLOWED.has(v)) return v
  if (v === 'monolithic_frame') return 'monolithic'
  if (v === 'panel_frame') return 'panel'
  return ''
}

/** Single-page поток включён (используется в эффектах до объявления переменной внутри компонента) */
const USE_ADD_PROPERTY_SINGLE_PAGE = true

/** Тексты инструкций и боковой колонки для single-page потока */
const SINGLE_PAGE_SECTION_HELP = {
  type: {
    title: 'Тип объекта',
    lead: 'Выберите категорию, которая совпадает с документом и тем, как объект продаётся.',
    tips: [
      'От типа зависят поля на шаге «Параметры» (комнаты, площадь и т.д.)',
      'Если сомневаетесь между «Квартира» и «Апартаменты», ориентируйтесь на правовой статус помещения',
    ],
    recommend: 'Для большинства жилых лотов подходит «Квартира» или «Дом».',
  },
  address: {
    title: 'Адрес на карте',
    lead: 'Страна и город — из списка с поиском. Улицу лучше выбрать из подсказок, затем уточните точку маркером.',
    tips: [
      'Сначала выберите страну, затем начните вводить город — появятся подсказки',
      'Перетащите маркер на карте — адрес и координаты обновятся автоматически',
    ],
    recommend: 'Точная точка на карте повышает доверие покупателей и снижает вопросы по локации.',
  },
  details: {
    title: 'Параметры',
    lead: 'Укажите реальные цифры из выписки или планировки.',
    tips: [
      'Площадь лучше указать как в документе (общая / жилая — что измеряете)',
      'Материал дома помогает фильтрам и ожиданиям по качеству',
    ],
    recommend: 'Честные цифры снижают количество отказов после просмотра.',
  },
  amenities: {
    title: 'Описание и удобства',
    lead: 'Соберите “витрину” объекта: живое описание + удобства, которые действительно важны покупателю.',
    tips: [
      'Пишите по формуле: локация → состояние → преимущества → для кого подходит',
      'Лучше 4 конкретных факта, чем длинный общий текст без деталей',
    ],
    recommend: 'Описание должно отвечать на вопрос покупателя: “Почему именно этот объект стоит посмотреть первым?”.',
  },
  media: {
    title: 'Фото и видео',
    lead: 'Добавьте светлые кадры разных ракурсов и короткое видео объекта.',
    tips: [
      'Первые кадры — фасад, гостиная, кухня, вид из окна',
      'Видео до 1 минуты: обход по комнатам без ускоренной «моталки»',
    ],
    recommend: 'Минимум 5 качественных фото заметно повышают отклик.',
  },
  documents: {
    title: 'Документы',
    lead: 'Загрузите обязательные файлы и при необходимости добавьте подтверждающие документы.',
    tips: [
      'PDF или скан хорошего разрешения, чтобы был читаем текст',
      'Дополнительно можно приложить выписку ЕГРН, план и т.п. (до 5 файлов)',
    ],
    recommend: 'Полный пакет ускоряет модерацию и проверку покупателем.',
  },
  testdrive: {
    title: 'Тест-драйв',
    lead: 'Тест-драйв — это краткосрочный просмотр/проживание по записи: покупатель “примеряет” объект перед решением о сделке.',
    tips: [
      'Зачем это нужно: повышает доверие, снижает страх покупки и ускоряет принятие решения',
      'Укажите прозрачные условия: цена за сутки, депозит и базовые правила пользования',
    ],
    recommend: 'Если объект “сложно почувствовать по фото” (вид, атмосфера, планировка) — тест-драйв заметно повышает конверсию в сделку.',
  },
  listing: {
    title: 'Формат продажи',
    lead: 'Выберите стратегию продажи под вашу цель: максимальная цена, скорость сделки, гибкий вход для покупателя или работа со сложным активом.',
    tips: [
      'Аукцион — когда хотите раскрыть рыночный спрос и получить лучшую ставку',
      '«Продать сейчас» — когда важны и скорость, и контроль цены одновременно',
      'Для долей и долгов появятся отдельные поля на шаге «Цена»',
    ],
    recommend: 'Если не уверены, начните с «Аукцион + Продать сейчас»: это самый гибкий формат с балансом скорости и доходности.',
  },
  calculator: {
    title: 'Оценка рынка',
    lead: 'Запустите калькулятор по параметрам объекта и адресу — получите ориентир по цене и похожие объявления. Суммы затем подставятся в блок цен, их можно изменить.',
    tips: [
      'Чем точнее адрес и район, тем ближе выборка к вашему объекту',
      'Если мало объявлений — попробуйте «Весь город» или соседний район',
      'Расчёт может занять до минуты: собираются данные с нескольких площадок',
    ],
    recommend: 'После расчёта откройте следующий шаг и при необходимости скорректируйте минимальную цену, «Продать сейчас» и старт торгов.',
  },
  price: {
    title: 'Цена и сроки аукциона',
    lead: 'Суммы вводятся по шагам справа: сначала минимальная цена продажи, затем при необходимости «Продать сейчас», затем стартовая ставка. Слева укажите даты аукциона.',
    tips: [
      'Даты аукциона должны быть в будущем и логично отстоять друг от друга',
      'Стартовая цена — это вход в торги, не финальная продажа',
    ],
    recommend: 'Короткий аукцион (7–14 дней) часто даёт более горячий интерес.',
  },
}

/** Boolean-поля удобств на одностраничном шаге (совпадают с buildSinglePageAmenityGroups и submit) */
const SINGLE_PAGE_AMENITY_FORM_KEYS = [
  'parking',
  'feature1',
  'feature12',
  'feature2',
  'furniture',
  'feature3',
  'feature4',
  'electricity',
  'feature18',
  'internet',
  'security',
  'feature5',
  'feature6',
  'feature16',
  'feature17',
  'balcony',
  'feature7',
  'feature8',
  'elevator',
  'pool',
  'garden',
]

function getSinglePageTypeProfile(propertyTypeUi, propertyType) {
  if (propertyTypeUi) {
    if (propertyTypeUi === 'apartments') return 'apartments'
    if (propertyTypeUi === 'apartment') return 'apartment'
    if (propertyTypeUi === 'house') return 'house'
    if (propertyTypeUi === 'villa') return 'villa'
    if (propertyTypeUi === 'commercial') return 'commercial'
    if (propertyTypeUi === 'land') return 'land'
    if (propertyTypeUi === 'other') return 'other'
  }
  if (propertyType === 'house') return 'house'
  if (propertyType === 'villa') return 'villa'
  if (propertyType === 'commercial') return 'commercial'
  return 'apartment'
}

function buildSinglePageAmenityGroups(t, typeProfile) {
  const allGroups = [
    {
      id: 'parking',
      title: t('addPropertyAmenitiesCategoryParking'),
      items: [
        { key: 'parking', label: t('addPropertyAmenitiesParkingSpace') },
        { key: 'feature1', label: t('addPropertyAmenitiesUndergroundParking') },
        { key: 'feature12', label: t('addPropertyAmenitiesBikeParking') },
      ],
    },
    {
      id: 'furniture',
      title: t('addPropertyAmenitiesCategoryFurniture'),
      items: [
        { key: 'feature2', label: t('addPropertyAmenitiesKitchenFurniture') },
        { key: 'furniture', label: t('addPropertyAmenitiesBuiltInFurniture') },
        { key: 'feature3', label: t('addPropertyAmenitiesWashingMachine') },
        { key: 'feature4', label: t('addPropertyAmenitiesDishwasher') },
        { key: 'electricity', label: t('addPropertyAmenitiesAirConditioning') },
        { key: 'feature18', label: t('addPropertyAmenitiesWardrobe') },
      ],
    },
    {
      id: 'security',
      title: t('addPropertyAmenitiesCategorySecurity'),
      items: [
        { key: 'internet', label: t('addPropertyAmenitiesInternet') },
        { key: 'security', label: t('addPropertyAmenitiesSecurity') },
        { key: 'feature5', label: t('addPropertyAmenitiesIntercom') },
        { key: 'feature6', label: t('addPropertyAmenitiesCctv') },
        { key: 'feature16', label: t('addPropertyAmenitiesVideoIntercom') },
        { key: 'feature17', label: t('addPropertyAmenitiesConcierge') },
      ],
    },
    {
      id: 'rooms',
      title: t('addPropertyAmenitiesCategoryRooms'),
      items: [
        { key: 'balcony', label: t('addPropertyAmenitiesBalcony') },
        { key: 'feature7', label: t('addPropertyAmenitiesLoggia') },
        { key: 'feature8', label: t('addPropertyAmenitiesStorage') },
        { key: 'elevator', label: t('addPropertyAmenitiesElevator') },
      ],
    },
    {
      id: 'outdoor',
      title: t('addPropertyAmenitiesCategoryOutdoor'),
      items: [
        { key: 'pool', label: t('propertyDetailAmenityPool') },
        { key: 'garden', label: t('propertyDetailAmenityGarden') },
      ],
    },
  ]

  if (typeProfile === 'land') {
    return [
      {
        id: 'land-infra',
        title: 'Инфраструктура участка',
        items: [
          { key: 'parking', label: 'Подъезд для автомобиля' },
          { key: 'electricity', label: 'Электричество рядом/подключено' },
          { key: 'internet', label: 'Интернет рядом/подключен' },
          { key: 'security', label: 'Охраняемая территория' },
        ],
      },
    ]
  }

  if (typeProfile === 'house' || typeProfile === 'villa') {
    return allGroups.filter((group) => ['parking', 'furniture', 'security', 'outdoor'].includes(group.id))
  }

  if (typeProfile === 'commercial') {
    return allGroups
      .filter((group) => ['parking', 'security', 'furniture'].includes(group.id))
      .map((group) => {
        if (group.id !== 'furniture') return group
        return {
          ...group,
          title: 'Инженерия и оснащение',
          items: [
            { key: 'internet', label: t('addPropertyAmenitiesInternet') },
            { key: 'electricity', label: 'Электричество / мощность' },
            { key: 'feature3', label: t('addPropertyAmenitiesWashingMachine') },
            { key: 'feature4', label: t('addPropertyAmenitiesDishwasher') },
          ],
        }
      })
  }

  if (typeProfile === 'other') {
    return allGroups.filter((group) => ['parking', 'security', 'outdoor'].includes(group.id))
  }

  // apartment / apartments
  return allGroups.filter((group) => ['parking', 'furniture', 'security', 'rooms'].includes(group.id))
}

function getAddPropertyNamePlaceholderKey(propertyType) {
  return ADD_PROPERTY_NAME_PLACEHOLDER_I18N_KEYS[propertyType] || ADD_PROPERTY_NAME_PLACEHOLDER_I18N_KEYS.apartment
}

function getListingModeIcon(icon) {
  switch (icon) {
    case 'auction':
      return <FiTrendingUp size={20} />
    case 'flash':
      return <FiZap size={20} />
    case 'shares':
      return <FiPieChart size={20} />
    case 'debt':
      return <FiShield size={20} />
    case 'target':
      return <FiTarget size={20} />
    default:
      return <FiLayers size={20} />
  }
}

function getValidCoordsForPreview(coords) {
  if (!coords) return null
  const tuple = Array.isArray(coords) ? coords : [coords.lat, coords.lng]
  if (!Array.isArray(tuple) || tuple.length !== 2) return null
  const lat = Number(tuple[0])
  const lng = Number(tuple[1])
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return [lat, lng]
}
import { MdBed, MdOutlineBathtub, MdLightbulb } from 'react-icons/md'
import { BiArea } from 'react-icons/bi'
import LocationMap from '../components/LocationMap'
import AuctionPeriodPicker from '../components/AuctionPeriodPicker'
import SellerVerificationModal from '../components/SellerVerificationModal'
import PropertyCalculatorModal from '../components/PropertyCalculatorModal'
import CountrySelect from '../components/CountrySelect'
import { getUserData } from '../services/authService'
import { generateListingDescription } from '../services/aiService'
import { showNotification } from '../utils/toastHelper'
import { requestOpenLoginModal } from '../utils/requestOpenLoginModal'
import { notifyBonusSubmissionsChanged } from '../utils/bonusSubmissionsSync'
import { scrollMainTo } from '../utils/mainScroll'
import {
  confirmListingPublicationFeeSession,
  startListingPublicationCheckout,
} from '../utils/subscriptionCheckout'
import AnimatedGenerateButton from '../components/ui/animated-generate-button-shadcn-tailwind'
import AddPropertyProgress from '../components/AddPropertyProgress'
import './AddProperty.css'

const DRAFT_KEY = 'addPropertyDraft'
const DRAFT_SAVE_DEBOUNCE_MS = 600
const INITIAL_FORM_DATA = {
  propertyType: '',
  propertyTypeUi: '',
  listingMode: '',
  testDrive: null,
  testDrivePricePerDay: '',
  testDriveInsuranceDeposit: '',
  title: '',
  description: '',
  price: '',
  isAuction: true,
  auctionStartDate: '',
  auctionEndDate: '',
  auctionStartingPrice: '',
  minimumSalePrice: '',
  area: '',
  livingArea: '',
  buildingType: '',
  constructionType: '',
  rooms: '',
  bedrooms: '',
  bathrooms: '',
  floor: '',
  totalFloors: '',
  yearBuilt: '',
  location: '',
  address: '',
  apartment: '',
  cadastralNumber: '',
  country: '',
  city: '',
  coordinates: null,
  balcony: false,
  parking: false,
  elevator: false,
  landArea: '',
  pool: false,
  garden: false,
  commercialType: '',
  businessHours: '',
  renovation: '',
  condition: '',
  heating: '',
  waterSupply: '',
  sewerage: '',
  electricity: false,
  internet: false,
  security: false,
  furniture: false,
  feature1: false,
  feature2: false,
  feature3: false,
  feature4: false,
  feature5: false,
  feature6: false,
  feature7: false,
  feature8: false,
  feature9: false,
  feature10: false,
  feature11: false,
  feature12: false,
  feature13: false,
  feature14: false,
  feature15: false,
  feature16: false,
  feature17: false,
  feature18: false,
  feature19: false,
  feature20: false,
  feature21: false,
  feature22: false,
  feature23: false,
  feature24: false,
  feature25: false,
  feature26: false,
  additionalAmenities: '',
  debtUtilities: false,
  debtBankPledge: false,
  debtPropertyTaxes: false,
  debtArrest: false,
  debtInherited: false,
  debtThirdParty: false,
  debtOther: '',
  debtAmount: '',
  isShareProperty: false,
  isDebtProperty: false,
  totalShares: ''
}

function loadDraft(draftKey = DRAFT_KEY) {
  try {
    const raw = localStorage.getItem(draftKey)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveDraftPayload(payload, draftKey = DRAFT_KEY) {
  try {
    localStorage.setItem(draftKey, JSON.stringify(payload))
  } catch (e) {
    if (e?.name === 'QuotaExceededError') {
      try {
        const withoutMedia = {
          ...payload,
          photos: [],
          videos: [],
          additionalDocuments: [],
          requiredDocuments: { ownership: null, noDebts: null },
          debtDocumentsByCategory: {},
        }
        localStorage.setItem(draftKey, JSON.stringify(withoutMedia))
      } catch {
        // ignore
      }
    }
  }
}

/** Сохранение File в черновик (localStorage) — после возврата со Stripe страница перезагружается. */
async function draftDocToSerializable(doc) {
  if (!doc) return null
  if (doc instanceof File) {
    const dataUrl = await new Promise((resolve, reject) => {
      const r = new FileReader()
      r.onloadend = () => resolve(r.result)
      r.onerror = () => reject(r.error || new Error('read'))
      r.readAsDataURL(doc)
    })
    return { name: doc.name, type: doc.type || 'application/pdf', dataUrl }
  }
  if (typeof doc.dataUrl === 'string' && doc.dataUrl.startsWith('data:')) {
    return { name: doc.name || 'document', type: doc.type || 'application/pdf', dataUrl: doc.dataUrl }
  }
  return null
}

async function draftSerializableToFile(doc, fallbackName = 'document.pdf') {
  if (!doc) return null
  if (doc instanceof File) return doc
  if (doc.isExisting) return null
  if (typeof doc.dataUrl === 'string' && doc.dataUrl.startsWith('data:')) {
    const blob = await (await fetch(doc.dataUrl)).blob()
    return new File([blob], doc.name || fallbackName, { type: doc.type || blob.type || 'application/pdf' })
  }
  return null
}

const DEBT_DRAFT_CATEGORY_KEYS = ['cat1', 'cat2', 'cat3', 'cat4', 'cat5', 'cat6']

async function serializeDebtDocsForDraft(debtDocumentsByCategory) {
  const out = {}
  for (const key of DEBT_DRAFT_CATEGORY_KEYS) {
    out[key] = {}
    for (const [idx, f] of Object.entries(debtDocumentsByCategory[key] || {})) {
      const ser = await draftDocToSerializable(f)
      if (ser) out[key][idx] = ser
    }
  }
  return out
}

function clearDraft(draftKey = DRAFT_KEY) {
  try {
    localStorage.removeItem(draftKey)
  } catch {
    // ignore
  }
}

const AddProperty = ({
  adminOwnerId = null,
  adminMode = false,
  onAdminBack = null,
  onAdminComplete = null
} = {}) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { id } = useParams() // ID объекта для редактирования
  const isEditMode = !!id // Режим редактирования
  const propertyTypeFromNavState = location?.state?.property_type || null
  const adminAddedFromNavState = location?.state?.admin_added === true
  const [isAdminAddedProperty, setIsAdminAddedProperty] = useState(() => adminMode || adminAddedFromNavState)
  const draftKey = adminMode ? 'admin_addPropertyDraft' : DRAFT_KEY
  const fileInputRef = useRef(null)
  const videoInputRef = useRef(null)
  const documentInputRef = useRef(null)
  const ownershipInputRef = useRef(null)
  const noDebtsInputRef = useRef(null)

  // 6 блоков документов по долгу (категории) — названия через i18n
  const DEBT_DOC_CATEGORIES = [
    { key: 'cat1', titleKey: 'addPropertyDebtDocCat1Title' },
    { key: 'cat2', titleKey: 'addPropertyDebtDocCat2Title' },
    { key: 'cat3', titleKey: 'addPropertyDebtDocCat3Title' },
    { key: 'cat4', titleKey: 'addPropertyDebtDocCat4Title' },
    { key: 'cat5', titleKey: 'addPropertyDebtDocCat5Title' },
    { key: 'cat6', titleKey: 'addPropertyDebtDocCat6Title' }
  ]

  // Ключи i18n для названий документов по категориям (то же количество элементов, что и в DEBT_DOC_CATEGORY_DOCS)
  const DEBT_DOC_CATEGORY_DOCS_KEYS = {
    cat1: ['addPropertyDebtDocCat1_0', 'addPropertyDebtDocCat1_1', 'addPropertyDebtDocCat1_2', 'addPropertyDebtDocCat1_3', 'addPropertyDebtDocCat1_4', 'addPropertyDebtDocCat1_5', 'addPropertyDebtDocCat1_6'],
    cat2: ['addPropertyDebtDocCat2_0', 'addPropertyDebtDocCat2_1', 'addPropertyDebtDocCat2_2', 'addPropertyDebtDocCat2_3', 'addPropertyDebtDocCat2_4', 'addPropertyDebtDocCat2_5', 'addPropertyDebtDocCat2_6', 'addPropertyDebtDocCat2_7'],
    cat3: ['addPropertyDebtDocCat3_0', 'addPropertyDebtDocCat3_1', 'addPropertyDebtDocCat3_2', 'addPropertyDebtDocCat3_3', 'addPropertyDebtDocCat3_4'],
    cat4: ['addPropertyDebtDocCat4_0', 'addPropertyDebtDocCat4_1', 'addPropertyDebtDocCat4_2', 'addPropertyDebtDocCat4_3'],
    cat5: ['addPropertyDebtDocCat5_0', 'addPropertyDebtDocCat5_1', 'addPropertyDebtDocCat5_2', 'addPropertyDebtDocCat5_3', 'addPropertyDebtDocCat5_4'],
    cat6: ['addPropertyDebtDocCat6_0', 'addPropertyDebtDocCat6_1', 'addPropertyDebtDocCat6_2', 'addPropertyDebtDocCat6_3', 'addPropertyDebtDocCat6_4']
  }

  // Списки конкретных документов по каждой категории (из файла "тест.txt") — отображение через DEBT_DOC_CATEGORY_DOCS_KEYS + t()
  const DEBT_DOC_CATEGORY_DOCS = {
    cat1: [
      'Кредитный договор (Loan Agreement)',
      'Все дополнительные соглашения к кредитному договору',
      'График платежей по кредиту',
      'Подтверждение текущей задолженности (Debt Statement / Outstanding Balance)',
      'История платежей заемщика',
      'Документы о дефолте (уведомления о просрочке, default notice)',
      'Договор уступки долга (если долг уже перепродавался ранее)'
    ],
    cat2: [
      'Нотариальный договор ипотеки',
      'Выписка из реестра недвижимости — Registro de la Propiedad',
      'Nota Simple (актуальная выписка по объекту)',
      'Оценка недвижимости (Appraisal / Tasación)',
      'Кадастровые данные — Catastro',
      'Фотографии объекта',
      'Адрес и описание объекта',
      'Наличие других обременений или ипотек'
    ],
    cat3: [
      'Документы по судебному процессу (если он уже начат)',
      'Номер судебного дела',
      'Статус процедуры взыскания',
      'Решения суда (если есть)',
      'Документы по исполнительному производству'
    ],
    cat4: [
      'Информация о заемщике (паспорт / регистрация компании)',
      'Финансовое состояние заемщика',
      'Контактные данные',
      'Наличие других долгов или банкротства'
    ],
    cat5: [
      'Loan Sale Agreement / NPL Sale Agreement',
      'Договор уступки права требования (Assignment Agreement)',
      'Подтверждение права фонда продавать долг',
      'Нотариальная передача прав требования',
      'Письмо-уведомление должнику о смене кредитора'
    ],
    cat6: [
      'Legal Due Diligence от юристов',
      'Valuation report',
      'Strategy memo (план взыскания)',
      'Оценка сроков судебного взыскания',
      'Расчет потенциальной доходности'
    ]
  }

  const debtDocItemInputRefs = useRef({}) // { 'cat1_0': inputEl, 'cat1_1': inputEl, ... }
  const [debtDocumentsByCategory, setDebtDocumentsByCategory] = useState(() => {
    const init = {}
    DEBT_DOC_CATEGORIES.forEach(({ key }) => {
      init[key] = {} // { docIndex: File }
    })
    return init
  })
  const [selectedDebtDocCategory, setSelectedDebtDocCategory] = useState(null)
  const [missingRequiredDebtDocs, setMissingRequiredDebtDocs] = useState([])
  // Для долгов: сначала шаг с 7 обязательными документами, затем — блок с 6 категориями (без этих 7)
  const [debtDocumentsStep, setDebtDocumentsStep] = useState('required')

  // Обязательные документы (логические пункты) и их категории — label через i18n (labelKey)
  const REQUIRED_DEBT_DOCS = [
    { id: 'credit_agreement', labelKey: 'addPropertyDebtRequired_credit_agreement',    categoryKey: 'cat1', docIndex: 0 },
    { id: 'notary_mortgage',  labelKey: 'addPropertyDebtRequired_notary_mortgage',      categoryKey: 'cat2', docIndex: 0 },
    { id: 'registro_extract', labelKey: 'addPropertyDebtRequired_registro_extract',    categoryKey: 'cat2', docIndex: 1 },
    { id: 'nota_simple',      labelKey: 'addPropertyDebtRequired_nota_simple',         categoryKey: 'cat2', docIndex: 2 },
    { id: 'debt_amount',      labelKey: 'addPropertyDebtRequired_debt_amount',         categoryKey: 'cat1', docIndex: 3 },
    { id: 'appraisal',        labelKey: 'addPropertyDebtRequired_appraisal',           categoryKey: 'cat2', docIndex: 3 },
    { id: 'court_status',     labelKey: 'addPropertyDebtRequired_court_status',         categoryKey: 'cat3', docIndex: 2 }
  ]
  
  const [photos, setPhotos] = useState([])
  const [videos, setVideos] = useState([])
  const [additionalDocuments, setAdditionalDocuments] = useState([])
  const [requiredDocuments, setRequiredDocuments] = useState({
    ownership: null,
    noDebts: null
  })
  const [requiredDocumentPreviews, setRequiredDocumentPreviews] = useState({
    ownership: '',
    noDebts: '',
  })
  const [uploadedDocuments, setUploadedDocuments] = useState({
    ownership: false,
    noDebts: false
  })
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0)
  const [showCarousel, setShowCarousel] = useState(false)
  const [mediaItems, setMediaItems] = useState([]) // Объединенный массив фото и видео
  const [photosMediaIndex, setPhotosMediaIndex] = useState(0) // Индекс для карусели на странице загрузки фотографий
  const [showVerificationModal, setShowVerificationModal] = useState(false)
  const [isCalculatorModalOpen, setIsCalculatorModalOpen] = useState(false)
  /** Ориентировочные суммы из калькулятора подставлены в поля цены; показываем подсказки на шаге расчёта и на шаге сумм */
  const [calculatorGuidanceApplied, setCalculatorGuidanceApplied] = useState(false)
  const [showListingFeeModal, setShowListingFeeModal] = useState(false)
  const [showPromoInputInFeeModal, setShowPromoInputInFeeModal] = useState(false)
  const [listingFeePromoCode, setListingFeePromoCode] = useState('')
  const [listingFeePromoError, setListingFeePromoError] = useState(null)
  const [listingFeePromoLoading, setListingFeePromoLoading] = useState(false)
  const [listingFeeStripeLoading, setListingFeeStripeLoading] = useState(false)
  const listingFeeCheckoutHandledRef = useRef(null)
  const [userId, setUserId] = useState(null)
  /** После успешного промо/«оплаты» объявление уже отправлено — не дублировать POST после привязки карты */
  const listingPublishedAfterFeeRef = useRef(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showVideoLinkModal, setShowVideoLinkModal] = useState(false)
  const [videoLink, setVideoLink] = useState('')
  const [showVideoSourceModal, setShowVideoSourceModal] = useState(false)
  const [videoLinkType, setVideoLinkType] = useState('any')
  const [showPhotoLinkModal, setShowPhotoLinkModal] = useState(false)
  const [photoLink, setPhotoLink] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(null) // 'price' или 'auction' или null
  /** Подшаг ввода сумм на шаге 10 (single-page): 0 — мин. цена, далее «Продать сейчас» (если есть), стартовая ставка */
  const [spAuctionAmountStepIndex, setSpAuctionAmountStepIndex] = useState(0)
  const [showSpEnteredAmountsModal, setShowSpEnteredAmountsModal] = useState(false)
  const [currentStep, setCurrentStep] = useState('type-selection') // wizard steps through 'price' (legacy final form removed)
  const [showHint1, setShowHint1] = useState(true)
  const [showHint2, setShowHint2] = useState(true)
  // Состояния для подсказок на каждом шаге
  const [showHints, setShowHints] = useState({
    'type-selection': true,
    'test-drive-question': true,
    'property-name': true, // уже используется showHint1 и showHint2
    'location': true,
    'details': true,
    'amenities': true,
    'photos': true,
    'documents': true,
    'price': true
  })
  const [addressSearch, setAddressSearch] = useState('')
  const [addressSuggestions, setAddressSuggestions] = useState([])
  const [bedrooms, setBedrooms] = useState([
    { id: 1, name: 'Спальня 1', beds: [] },
    { id: 2, name: 'Гостиная', beds: [] },
    { id: 3, name: 'Другие помещения', beds: [] }
  ])
  const [guests, setGuests] = useState(0)
  const [areaUnit, setAreaUnit] = useState('square_meters')
  const [selectedBedroom, setSelectedBedroom] = useState(null)
  const [showBedModal, setShowBedModal] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedCoordinates, setSelectedCoordinates] = useState(null)
  const [mapCenter, setMapCenter] = useState(null) // Будет установлен при загрузке данных или выборе адреса
  /** Явный зум карты по шагам: страна → город → улица → дом (null = как в прежней логике) */
  const [locationMapZoom, setLocationMapZoom] = useState(null)
  const [citySearch, setCitySearch] = useState('')
  const [citySuggestions, setCitySuggestions] = useState([])
  const [showCitySuggestions, setShowCitySuggestions] = useState(false)
  const citySearchRef = useRef(null)
  const citySearchTimeoutRef = useRef(null)
  const [houseSuggestions, setHouseSuggestions] = useState([])
  const [showHouseSuggestions, setShowHouseSuggestions] = useState(false)
  const houseSearchTimeoutRef = useRef(null)
  const [isCitySearching, setIsCitySearching] = useState(false)
  const [isAddressSearching, setIsAddressSearching] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})
  const [highlightedField, setHighlightedField] = useState(null)
  const [isLoadingProperty, setIsLoadingProperty] = useState(false)
  const [originalPropertyId, setOriginalPropertyId] = useState(null) // ID оригинального объекта при редактировании
  const [originalPropertyData, setOriginalPropertyData] = useState(null) // Оригинальные данные объекта для сравнения
  const [showChangesModal, setShowChangesModal] = useState(false) // Модальное окно с изменениями
  const [savedLocationData, setSavedLocationData] = useState(null) // Сохраняем данные о местоположении для восстановления
  const [isEditingLocation, setIsEditingLocation] = useState(false) // Флаг для режима редактирования адреса
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false)
  const [showDescriptionCompareModal, setShowDescriptionCompareModal] = useState(false)
  const [descriptionCompareDraft, setDescriptionCompareDraft] = useState('')
  const [descriptionCompareAi, setDescriptionCompareAi] = useState('')
  const [showTestDriveInfoModal, setShowTestDriveInfoModal] = useState(false)
  const [showListingModePicker, setShowListingModePicker] = useState(false)
  const [listingModeThemeStage, setListingModeThemeStage] = useState(0)
  const [expandedListingModeId, setExpandedListingModeId] = useState(null)
  const [spActiveSection, setSpActiveSection] = useState('type')
  /** Single-page: после заполнения секция сворачивается; развернуть — по заголовку или стрелке */
  const [spSectionUserExpanded, setSpSectionUserExpanded] = useState({})
  const listingModeScrollRef = useRef(null)
  const listingModeWheelAccumulatorRef = useRef(0)
  const singlePagePriceSectionRef = useRef(null)
  const singlePageCalculatorSectionRef = useRef(null)
  const handleResetAll = () => {
    const confirmed = window.confirm('Сбросить всю заполненную информацию? Это действие нельзя отменить.')
    if (!confirmed) return

    setFormData(INITIAL_FORM_DATA)
    setPhotos([])
    setVideos([])
    setAdditionalDocuments([])
    setRequiredDocuments({ ownership: null, noDebts: null })
    setUploadedDocuments({ ownership: false, noDebts: false })
    setCurrentStep('type-selection')
    setShowListingModePicker(false)
    setExpandedListingModeId(null)
    setValidationErrors({})
    setAddressSearch('')
    setAddressSuggestions([])
    setShowSuggestions(false)
    setCitySearch('')
    setCitySuggestions([])
    setShowCitySuggestions(false)
    setHouseSuggestions([])
    setShowHouseSuggestions(false)
    setSelectedCoordinates(null)
    setMapCenter(null)
    setLocationMapZoom(null)
    setMediaItems([])
    setPhotosMediaIndex(0)
    setCurrentMediaIndex(0)
    setDebtDocumentsStep('required')
    setSelectedDebtDocCategory(null)
    setMissingRequiredDebtDocs([])
    setDebtDocumentsByCategory(() => {
      const init = {}
      DEBT_DOC_CATEGORIES.forEach(({ key }) => {
        init[key] = {}
      })
      return init
    })
    clearDraft(draftKey)
    setCalculatorGuidanceApplied(false)
    showNotification('Все поля формы очищены', 'success')
  }

  const currencies = [
    { code: 'USD', symbol: '$', name: 'Доллар США' },
    { code: 'EUR', symbol: '€', name: 'Евро' },
    { code: 'RUB', symbol: '₽', name: 'Российский рубль' },
    { code: 'GBP', symbol: '£', name: 'Фунт стерлингов' }
  ]
  const quickCurrencies = currencies.filter((curr) => ['USD', 'EUR', 'GBP'].includes(curr.code))
  
  const [formData, setFormData] = useState(INITIAL_FORM_DATA)

  useEffect(() => {
    if (currentStep !== 'listing-type') return
    const node = listingModeScrollRef.current
    if (!node) return
    node.scrollTo({ top: 0, behavior: 'auto' })
    setListingModeThemeStage(0)
  }, [currentStep])

  // Закрытие выпадающего списка валют при клике вне его
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showCurrencyDropdown && !event.target.closest('.currency-selector')) {
        setShowCurrencyDropdown(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showCurrencyDropdown])

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files)
    const remainingSlots = 10 - photos.length
    
    if (files.length > remainingSlots) {
      showNotification(`Можно загрузить максимум ${remainingSlots} фото`)
      return
    }

    files.forEach((file, index) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onloadend = () => {
          setPhotos(prev => [...prev, {
            id: Date.now() + Math.random() + index,
            url: reader.result,
            file: file
          }])
        }
        reader.readAsDataURL(file)
      }
    })
    e.target.value = ''
  }

  const handleRemovePhoto = (id) => {
    setPhotos(photos.filter(photo => photo.id !== id))
  }

  // Функция для получения YouTube ID из URL
  const getYouTubeVideoId = (url) => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ]
    
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    return null
  }

  // Функция для получения Google Drive ID из URL
  const getGoogleDriveVideoId = (url) => {
    const patterns = [
      /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
      /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/
    ]
    
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    return null
  }

  const closeVideoLinkModal = useCallback(() => {
    setShowVideoLinkModal(false)
    setVideoLink('')
    setVideoLinkType('any')
  }, [])

  const openVideoSourceModal = useCallback(() => {
    if (videos.length >= 3) {
      showNotification('Можно загрузить максимум 3 видео')
      return
    }
    setShowVideoSourceModal(true)
  }, [videos.length])

  const handleVideoSourceSelect = useCallback((source) => {
    setShowVideoSourceModal(false)
    if (source === 'device') {
      videoInputRef.current?.click()
      return
    }

    if (source === 'youtube' || source === 'googledrive') {
      setVideoLinkType(source)
      setShowVideoLinkModal(true)
    }
  }, [])

  // Функция для проверки и обработки ссылки на видео
  const handleVideoLinkSubmit = () => {
    if (!videoLink.trim()) {
      showNotification('Пожалуйста, введите ссылку')
      return
    }

    const youtubeId = getYouTubeVideoId(videoLink)
    const googleDriveId = getGoogleDriveVideoId(videoLink)
    const isYoutubeMode = videoLinkType === 'youtube'
    const isDriveMode = videoLinkType === 'googledrive'

    if ((isYoutubeMode && youtubeId) || (!isDriveMode && youtubeId)) {
      const newVideo = {
        id: Date.now() + Math.random(),
        type: 'youtube',
        url: videoLink,
        videoId: youtubeId,
        thumbnail: `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`
      }
      setVideos(prev => [...prev, newVideo])
      closeVideoLinkModal()
    } else if ((isDriveMode && googleDriveId) || (!isYoutubeMode && googleDriveId)) {
      const newVideo = {
        id: Date.now() + Math.random(),
        type: 'googledrive',
        url: videoLink,
        videoId: googleDriveId,
        embedUrl: `https://drive.google.com/file/d/${googleDriveId}/preview`
      }
      setVideos(prev => [...prev, newVideo])
      closeVideoLinkModal()
    } else {
      if (isYoutubeMode) {
        showNotification('Пожалуйста, введите корректную ссылку на YouTube')
      } else if (isDriveMode) {
        showNotification('Пожалуйста, введите корректную ссылку на Google Drive')
      } else {
        showNotification('Пожалуйста, введите корректную ссылку на YouTube или Google Drive')
      }
    }
  }

  // Обработчик загрузки видео с компьютера
  const handleVideoUpload = (e) => {
    const files = Array.from(e.target.files)
    const remainingSlots = 3 - videos.length
    
    if (files.length > remainingSlots) {
      showNotification(`Можно загрузить максимум ${remainingSlots} видео`)
      e.target.value = ''
      return
    }

    files.forEach((file, index) => {
      if (!file.type.startsWith('video/')) {
        showNotification(`Файл ${file.name} не является видео`)
        return
      }

      // Проверка длительности видео (максимум 1 минута = 60 секунд)
      const video = document.createElement('video')
      video.preload = 'metadata'
      const objectUrl = URL.createObjectURL(file)
      
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(objectUrl)
        const duration = video.duration
        
        if (duration > 60) {
          showNotification(`Видео "${file.name}" превышает максимальную длительность (1 минута). Текущая длительность: ${Math.round(duration)} секунд`)
          return
        }

        const reader = new FileReader()
        reader.onloadend = () => {
          setVideos(prev => [...prev, {
            id: Date.now() + Math.random(),
            type: 'file',
            url: reader.result,
            file: file,
            duration: duration
          }])
        }
        reader.onerror = () => {
          showNotification(`Ошибка при чтении файла "${file.name}"`)
        }
        reader.readAsDataURL(file)
      }

      video.onerror = () => {
        window.URL.revokeObjectURL(objectUrl)
        showNotification(`Ошибка при чтении видео "${file.name}"`)
      }

      video.src = objectUrl
    })
    
    e.target.value = ''
  }

  const handleRemoveVideo = (id) => {
    setVideos(videos.filter(video => video.id !== id))
  }

  // Обработчик загрузки дополнительных документов
  const handleDocumentUpload = (e) => {
    const files = Array.from(e.target.files)
    const MAX_DOCUMENTS = 5
    
    // Проверяем лимит документов
    if (additionalDocuments.length >= MAX_DOCUMENTS) {
      showNotification(`Максимальное количество дополнительных документов: ${MAX_DOCUMENTS}`)
      e.target.value = ''
      return
    }
    
    const remainingSlots = MAX_DOCUMENTS - additionalDocuments.length
    const filesToAdd = files.slice(0, remainingSlots)
    
    if (files.length > remainingSlots) {
      showNotification(`Можно загрузить еще ${remainingSlots} документ(ов). Остальные файлы не будут добавлены.`)
    }
    
    filesToAdd.forEach((file) => {
      // Проверяем, что файл - это PDF или изображение
      const isPDF = file.type === 'application/pdf'
      const isImage = file.type.startsWith('image/')
      
      if (!isPDF && !isImage) {
        showNotification(`Файл ${file.name} не поддерживается. Разрешены только PDF и изображения.`)
        return
      }

      const reader = new FileReader()
      reader.onloadend = () => {
        setAdditionalDocuments(prev => {
          if (prev.length >= MAX_DOCUMENTS) {
            return prev
          }
          return [...prev, {
            id: Date.now() + Math.random(),
            name: file.name,
            url: reader.result,
            file: file,
            type: isPDF ? 'pdf' : 'image'
          }]
        })
      }
      reader.onerror = () => {
        showNotification(`Ошибка при чтении файла "${file.name}"`)
      }
      reader.readAsDataURL(file)
    })
    
    e.target.value = ''
  }

  const handleRemoveDocument = (id) => {
    setAdditionalDocuments(additionalDocuments.filter(doc => doc.id !== id))
  }

  // Функция для форматирования числа с запятыми
  const formatNumberWithCommas = (value) => {
    // Убираем все нецифровые символы
    const numericValue = value.toString().replace(/\D/g, '')
    if (!numericValue) return ''
    // Форматируем с запятыми каждые 3 цифры
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }

  // Функция для удаления запятых из числа
  const removeCommas = (value) => {
    return value.toString().replace(/,/g, '')
  }

  /** Если задана цена «Купить сейчас», стартовая ставка не может превышать 30% от неё. */
  const getAuctionStartingVsBuyNowError = useCallback((buyNowRaw, startingRaw) => {
    const buyNow = Number(removeCommas(String(buyNowRaw ?? '')))
    const startingStr = String(startingRaw ?? '')
    const startingDigits = startingStr.replace(/\D/g, '')
    if (!buyNow || buyNow <= 0) return null
    if (!startingDigits) return null
    const starting = Number(removeCommas(startingStr))
    if (!Number.isFinite(starting) || starting <= 0) return null
    const maxAllowed = buyNow * 0.3
    if (starting > maxAllowed + 1e-9) {
      return t('addPropertyPriceStartingBidMaxBuyNowPercent')
    }
    return null
  }, [t])

  /**
   * Если задана цена «Продать сейчас»: минимальная цена продажи не выше этой суммы
   * и не выше 90% от неё.
   */
  const getMinimumSaleVsBuyNowError = useCallback((minRaw, buyNowRaw) => {
    const min = Number(removeCommas(String(minRaw ?? '')))
    const buyNow = Number(removeCommas(String(buyNowRaw ?? '')))
    if (!buyNow || buyNow <= 0 || !min || min <= 0) return null
    if (min > buyNow + 1e-9) return t('addPropertyPriceMinimumSaleExceedsBuyNow')
    if (min > buyNow * 0.9 + 1e-9) return t('addPropertyPriceMinimumSaleExceedsBuyNowPercent')
    return null
  }, [t])

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  // Обработчик для поля цены с форматированием
  const handlePriceChange = (e) => {
    const value = e.target.value
    // Сохраняем числовое значение без запятых
    const numericValue = removeCommas(value)
    setFormData(prev => ({
      ...prev,
      price: numericValue
    }))

    const err = getAuctionStartingVsBuyNowError(numericValue, formData.auctionStartingPrice)
    if (err) {
      setValidationErrors(prev => ({ ...prev, auctionStartingPrice: err }))
    } else {
      setValidationErrors(prev => {
        const next = { ...prev }
        delete next.auctionStartingPrice
        return next
      })
    }
    const minVsBuyErr = getMinimumSaleVsBuyNowError(formData.minimumSalePrice, numericValue)
    if (minVsBuyErr) {
      setValidationErrors(prev => ({ ...prev, minimumSalePrice: minVsBuyErr }))
    } else {
      setValidationErrors(prev => {
        const next = { ...prev }
        delete next.minimumSalePrice
        return next
      })
    }
  }

  const handleMinimumSalePriceChange = (e) => {
    const value = e.target.value
    const numericValue = removeCommas(value)
    setFormData((prev) => ({ ...prev, minimumSalePrice: numericValue }))
    const minVsBuyErr = getMinimumSaleVsBuyNowError(numericValue, formData.price)
    if (minVsBuyErr) {
      setValidationErrors((prev) => ({ ...prev, minimumSalePrice: minVsBuyErr }))
    } else {
      setValidationErrors((prev) => {
        const next = { ...prev }
        delete next.minimumSalePrice
        return next
      })
    }
  }

  // Обработчик для стартовой цены аукциона с форматированием
  const handleAuctionPriceChange = (e) => {
    const value = e.target.value
    // Сохраняем числовое значение без запятых
    const numericValue = removeCommas(value)
    setFormData(prev => ({
      ...prev,
      auctionStartingPrice: numericValue
    }))

    const err = getAuctionStartingVsBuyNowError(formData.price, numericValue)
    if (err) {
      setValidationErrors(prev => ({ ...prev, auctionStartingPrice: err }))
    } else {
      setValidationErrors(prev => {
        const next = { ...prev }
        delete next.auctionStartingPrice
        return next
      })
    }
  }

  const handleDetailChange = (field, value) => {
    // Валидация для числовых полей
    let validatedValue = value
    
    // Проверка на тип данных - только числа
    if (['rooms', 'bathrooms', 'area', 'livingArea', 'floor', 'totalFloors', 'yearBuilt', 'bedrooms'].includes(field)) {
      // Разрешаем пустую строку
      if (value === '') {
        validatedValue = value
        // Убираем ошибку при очистке поля
        setValidationErrors(prev => {
          const newErrors = { ...prev }
          delete newErrors[field]
          return newErrors
        })
      } else {
        // Проверяем, что это число (не допускаем минус)
        if (value.startsWith('-')) {
          setValidationErrors(prev => ({
            ...prev,
            [field]: 'Значение не может быть отрицательным'
          }))
          return
        }
        
        const numValue = parseFloat(value)
        if (isNaN(numValue)) {
          // Если не число, не обновляем значение
          return
        }
        
        // Проверка на отрицательные числа
        if (numValue < 0) {
          setValidationErrors(prev => ({
            ...prev,
            [field]: 'Значение не может быть отрицательным'
          }))
          // Не обновляем значение, если оно отрицательное
          return
        }
        
        validatedValue = String(numValue)
        
        // Специфичные проверки для каждого поля
        const currentYear = new Date().getFullYear()
        
        if (field === 'yearBuilt') {
          // Год постройки не может быть больше текущего года
          if (numValue > currentYear) {
            setValidationErrors(prev => ({
              ...prev,
              [field]: `Год постройки не может быть больше ${currentYear}`
            }))
            // Не блокируем ввод, но показываем ошибку
          } else {
            // Убираем ошибку, если год валиден
            setValidationErrors(prev => {
              const newErrors = { ...prev }
              delete newErrors[field]
              return newErrors
            })
          }
        }
        
        if (field === 'floor') {
          // Этаж не может быть больше этажности
          const totalFloors = parseFloat(formData.totalFloors) || 0
          if (totalFloors > 0 && numValue > totalFloors) {
            setValidationErrors(prev => ({
              ...prev,
              [field]: `Этаж не может быть больше этажности (${totalFloors})`
            }))
            return
          }
        }
        
        if (field === 'totalFloors') {
          // Если этажность изменилась, проверяем этаж
          const floor = parseFloat(formData.floor) || 0
          if (floor > 0 && numValue > 0 && floor > numValue) {
            setValidationErrors(prev => ({
              ...prev,
              floor: `Этаж (${floor}) не может быть больше этажности (${numValue})`
            }))
          } else {
            // Убираем ошибку этажа, если она была связана с этажностью
            setValidationErrors(prev => {
              const newErrors = { ...prev }
              if (newErrors.floor && newErrors.floor.includes('этажности')) {
                delete newErrors.floor
              }
              return newErrors
            })
          }
        }
        
        // Убираем ошибку для этого поля, если валидация прошла
        setValidationErrors(prev => {
          const newErrors = { ...prev }
          delete newErrors[field]
          return newErrors
        })
      }
    }
    
    // Логируем для bedrooms
    if (field === 'bedrooms') {
      console.log('🔍 handleDetailChange - bedrooms:', {
        value,
        validatedValue,
        type: typeof validatedValue,
        numValue: field === 'bedrooms' ? parseFloat(value) : null
      });
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: validatedValue
    }))
  }

  const handlePublish = async (options = {}) => {
    const { skipSuccessModal = false } = options
    if (!formData.title || photos.length === 0) {
      showNotification('Пожалуйста, заполните заголовок и загрузите хотя бы одно фото')
      return false
    }
    const resolvedOwnershipDoc = await draftSerializableToFile(
      requiredDocuments.ownership,
      'ownership.pdf'
    )
    const resolvedNoDebtsDoc = await draftSerializableToFile(requiredDocuments.noDebts, 'no-debts.pdf')

    if (!formData.isDebtProperty) {
      if (!resolvedOwnershipDoc || !resolvedNoDebtsDoc) {
        showNotification('Пожалуйста, загрузите все необходимые документы')
        return false
      }
    }
    if (!userId) {
      requestOpenLoginModal({ wizard: true })
      return false
    }

    setIsSubmitting(true)
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

      /** Загружает одно фото на сервер; на проде нельзя слать base64 в поле photos — лимит тела запроса у прокси. */
      const uploadOneListingPhoto = async (photo) => {
        const u = photo?.url
        if (typeof u === 'string' && (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('/uploads/'))) {
          return u
        }
        if (typeof u === 'string' && u.startsWith('uploads/')) {
          return `/${u}`
        }
        let file = photo?.file
        if (!file && typeof u === 'string' && u.startsWith('data:')) {
          const blobRes = await fetch(u)
          const blob = await blobRes.blob()
          file = new File([blob], 'photo.jpg', { type: blob.type || 'image/jpeg' })
        }
        if (!(file instanceof File)) {
          throw new Error('Не удалось подготовить фото для загрузки. Загрузите изображения ещё раз.')
        }
        const fd = new FormData()
        fd.append('photo', file)
        const response = await fetch(`${API_BASE_URL}/properties/upload-photo`, { method: 'POST', body: fd })
        if (!response.ok) {
          const text = await response.text()
          throw new Error(text || `Ошибка загрузки фото (${response.status})`)
        }
        const data = await response.json()
        if (!data.success || !data.data?.url) {
          throw new Error(data.error || 'Сервер не вернул URL фото')
        }
        return data.data.url
      }

      let photoUrlsForSubmit
      try {
        photoUrlsForSubmit = await Promise.all(photos.map((p) => uploadOneListingPhoto(p)))
      } catch (uploadErr) {
        setIsSubmitting(false)
        showNotification(uploadErr.message || 'Ошибка загрузки фотографий')
        return false
      }
      
      // Загружаем данные пользователя из профиля
      let userProfileData = null
      try {
        const userResponse = await fetch(`${API_BASE_URL}/users/${userId}`)
        if (userResponse.ok) {
          const userData = await userResponse.json()
          if (userData.success && userData.data) {
            userProfileData = userData.data
            console.log('✅ Данные пользователя загружены из профиля:', userProfileData)
          }
        }
      } catch (userError) {
        console.warn('⚠️ Не удалось загрузить данные пользователя из профиля:', userError)
      }

      // Проверяем заполненность обязательных полей профиля
      if (userProfileData) {
        const missingFields = []
        
        if (!userProfileData.first_name || userProfileData.first_name.trim() === '') {
          missingFields.push('Имя')
        }
        if (!userProfileData.last_name || userProfileData.last_name.trim() === '') {
          missingFields.push('Фамилия')
        }
        if (!userProfileData.country || userProfileData.country.trim() === '') {
          missingFields.push('Страна')
        }
        if (!userProfileData.email || userProfileData.email.trim() === '') {
          missingFields.push('Почта')
        }
        if (!userProfileData.phone_number || userProfileData.phone_number.trim() === '') {
          missingFields.push('WhatsApp')
        }
        
        // Проверяем пароль - если пользователь зарегистрирован через email, пароль должен быть установлен
        // Для WhatsApp пользователей пароль может отсутствовать
        const userData = getUserData()
        const isEmailUser = userData && userData.loginMethod === 'email'
        if (isEmailUser && (!userProfileData.password || userProfileData.password.trim() === '')) {
          // Для email пользователей проверяем, что пароль установлен
          // Но в БД пароль хранится в хешированном виде, поэтому проверяем через другой способ
          // Если пользователь может войти, значит пароль установлен
        }
        
        if (missingFields.length > 0) {
          setIsSubmitting(false)
          showNotification(
            `Для публикации объекта необходимо заполнить все обязательные поля профиля. Не заполнены следующие поля: ${missingFields.join(', ')}. Пожалуйста, перейдите в профиль и заполните недостающие данные.`
          )
          // Перенаправляем в кабинет продавца, чтобы пользователь мог заполнить профиль
          if (!adminMode) navigate('/owner/dashboard')
          return false
        }
      } else {
        // Если не удалось загрузить данные пользователя, все равно проверяем через localStorage
        const userData = getUserData()
        if (userData) {
          const missingFields = []
          
          if (!userData.firstName || !userData.firstName.trim()) {
            missingFields.push('Имя')
          }
          if (!userData.lastName || !userData.lastName.trim()) {
            missingFields.push('Фамилия')
          }
          if (!userData.country || !userData.country.trim()) {
            missingFields.push('Страна')
          }
          if (!userData.email || !userData.email.trim()) {
            missingFields.push('Почта')
          }
          if (!userData.phone && !userData.phoneFormatted) {
            missingFields.push('WhatsApp')
          }
          
          if (missingFields.length > 0) {
            setIsSubmitting(false)
            showNotification(
              `Для публикации объекта необходимо заполнить все обязательные поля профиля. Не заполнены следующие поля: ${missingFields.join(', ')}. Пожалуйста, перейдите в профиль и заполните недостающие данные.`
            )
            if (!adminMode) navigate('/owner/dashboard')
            return false
          }
        }
      }
      
      // Подготавливаем данные для отправки
      const formDataToSend = new FormData()
      
      // Проверяем и преобразуем userId в число
      if (!userId) {
        setIsSubmitting(false)
        requestOpenLoginModal({ wizard: true })
        return false
      }
      
      const numericUserId = typeof userId === 'string' ? parseInt(userId, 10) : Number(userId)
      if (isNaN(numericUserId) || numericUserId <= 0) {
        setIsSubmitting(false)
        showNotification('Ошибка: Неверный формат ID пользователя. Ожидается положительное число')
        return false
      }
      
      // Основные данные
      formDataToSend.append('user_id', String(numericUserId))
      formDataToSend.append('property_type', formData.propertyType)
      formDataToSend.append('title', formData.title)
      if (adminMode) {
        // Флаг для бэкенда/аналитики: объект создан администратором для продавца.
        // Если бэкенд не поддерживает — будет просто проигнорировано.
        formDataToSend.append('created_by_admin', '1')
      }
      
      // Данные пользователя из профиля (если загружены)
      // НЕ добавляем address и country из профиля, чтобы использовать только адрес объекта недвижимости
      if (userProfileData) {
        if (userProfileData.first_name) formDataToSend.append('first_name', userProfileData.first_name)
        if (userProfileData.last_name) formDataToSend.append('last_name', userProfileData.last_name)
        if (userProfileData.email) formDataToSend.append('email', userProfileData.email)
        if (userProfileData.phone_number) formDataToSend.append('phone_number', userProfileData.phone_number)
        // Убрано: адрес и страна из профиля пользователя не должны перезаписывать адрес объекта
        // if (userProfileData.country) formDataToSend.append('country', userProfileData.country)
        // if (userProfileData.address) formDataToSend.append('address', userProfileData.address)
        if (userProfileData.passport_series) formDataToSend.append('passport_series', userProfileData.passport_series)
        if (userProfileData.passport_number) formDataToSend.append('passport_number', userProfileData.passport_number)
        if (userProfileData.identification_number) formDataToSend.append('identification_number', userProfileData.identification_number)
      }
      formDataToSend.append('description', formData.description || '')
      if (formData.price) formDataToSend.append('price', String(formData.price))
      formDataToSend.append('currency', currency)
      const listingMode = formData.listingMode || 'auction'
      const isShare = listingMode === 'shares'
      const isDebt = listingMode === 'debt' || listingMode === 'debt_auction'
      const isAuctionMode = listingMode === 'auction' || listingMode === 'auction_buy_now' || listingMode === 'debt_auction'
      formDataToSend.append('listing_mode', listingMode)
      formDataToSend.append('is_share', isShare ? '1' : '0')
      formDataToSend.append('is_debt', isDebt ? '1' : '0')
      if (isShare) {
        formDataToSend.append('is_auction', '0')
        formDataToSend.append('test_drive', '0')
        formDataToSend.append('sale_type', 'share')
        if (formData.totalShares) formDataToSend.append('total_shares', String(formData.totalShares))
      } else if (isDebt && listingMode === 'debt') {
        formDataToSend.append('is_auction', '0')
        formDataToSend.append('test_drive', '0')
        formDataToSend.append('sale_type', 'debt')
      } else if (isDebt && listingMode === 'debt_auction') {
        formDataToSend.append('is_auction', '1')
        formDataToSend.append('test_drive', '0')
        formDataToSend.append('sale_type', 'debt')
      } else {
        formDataToSend.append('is_auction', '1')
        formDataToSend.append('sale_type', 'auction')
        const testDriveValue = (formData.testDrive === true || formData.testDrive === 1) ? '1' : '0'
        console.log('🔍 Отправка test_drive на сервер:', { formData_testDrive: formData.testDrive, testDriveValue })
        formDataToSend.append('test_drive', testDriveValue)
        if (testDriveValue === '1') {
          formDataToSend.append(
            'test_drive_data',
            JSON.stringify({
              price_per_day: Number(formData.testDrivePricePerDay) || 0,
              insurance_deposit: Number(formData.testDriveInsuranceDeposit) || 0,
            })
          )
        }
      }

      // Минимальная цена продажи не выше «Продать сейчас» и не выше 90% от неё (если задана)
      if (!isShare && isAuctionMode) {
        const publishMinErr = getMinimumSaleVsBuyNowError(formData.minimumSalePrice, formData.price)
        if (publishMinErr) {
          setIsSubmitting(false)
          setValidationErrors(prev => ({ ...prev, minimumSalePrice: publishMinErr }))
          showNotification(publishMinErr)
          return false
        }
      }
      // Правило 30% от «Купить сейчас» для стартовой ставки: при любой положительной цене buy now (аукцион + buy now, долг на аукционе и т.д.)
      const publishBuyNowNum = Number(removeCommas(String(formData.price || '')))
      if (!isShare && isAuctionMode && publishBuyNowNum > 0) {
        const publishBuyNowErr = getAuctionStartingVsBuyNowError(formData.price, formData.auctionStartingPrice)
        if (publishBuyNowErr) {
          setIsSubmitting(false)
          setValidationErrors(prev => ({ ...prev, auctionStartingPrice: publishBuyNowErr }))
          showNotification(publishBuyNowErr)
          return false
        }
      }
      if (isAuctionMode && formData.auctionStartDate) formDataToSend.append('auction_start_date', formData.auctionStartDate)
      if (isAuctionMode && formData.auctionEndDate) formDataToSend.append('auction_end_date', formData.auctionEndDate)
      if (isAuctionMode && formData.auctionStartingPrice) formDataToSend.append('auction_starting_price', String(formData.auctionStartingPrice))
      if (isAuctionMode && formData.minimumSalePrice) {
        formDataToSend.append('minimum_sale_price', String(removeCommas(String(formData.minimumSalePrice))))
      }
      
      // Общие характеристики
      if (formData.area) formDataToSend.append('area', String(formData.area))
      if (formData.livingArea) formDataToSend.append('living_area', String(formData.livingArea))
      if (formData.buildingType) formDataToSend.append('building_type', formData.buildingType)
      if (formData.constructionType) formDataToSend.append('construction_type', formData.constructionType)
      
      // Для квартир/апартаментов отправляем rooms, для домов/вилл - bedrooms.
      // Для земли/другого комнатные параметры не отправляем.
      const submitTypeProfile = getSinglePageTypeProfile(formData.propertyTypeUi, formData.propertyType)
      const isApartmentOrCommercial = submitTypeProfile === 'apartment' || submitTypeProfile === 'apartments'
      const isHouseOrVilla = submitTypeProfile === 'house' || submitTypeProfile === 'villa'
      
      // ВАЖНО: отправляем всегда, даже если пустое, чтобы сервер мог корректно обработать
      // Важно: проверяем на undefined/null/пустую строку, а не на truthiness, чтобы 0 отправлялся как '0'
      if (isApartmentOrCommercial) {
        formDataToSend.append('rooms', (formData.rooms !== undefined && formData.rooms !== null && formData.rooms !== '') ? String(formData.rooms) : '')
      }
      if (isHouseOrVilla) {
        // Как в рабочем проекте, но с поддержкой значения 0
        // Проверяем на undefined/null/пустую строку, но НЕ на truthiness, чтобы 0 отправлялся
        const bedroomsValue = (formData.bedrooms !== undefined && formData.bedrooms !== null && formData.bedrooms !== '') 
          ? String(formData.bedrooms) 
          : '';
        console.log('🔍🔍🔍 AddProperty - ОТПРАВКА bedrooms:', {
          formDataBedrooms: formData.bedrooms,
          bedroomsValue,
          type: typeof formData.bedrooms,
          isHouseOrVilla
        });
        formDataToSend.append('bedrooms', bedroomsValue);
      }
      // Для прочих профилей (земля/коммерция/другое) комнатные параметры не отправляем.
      
      if (formData.bathrooms) formDataToSend.append('bathrooms', String(formData.bathrooms))
      if (formData.floor) formDataToSend.append('floor', String(formData.floor))
      if (formData.totalFloors) formDataToSend.append('total_floors', String(formData.totalFloors))
      if (formData.yearBuilt) formDataToSend.append('year_built', String(formData.yearBuilt))
      // Если location указан, используем только его, чтобы избежать дублирования
      if (formData.location) {
        formDataToSend.append('location', formData.location)
        // Не отправляем отдельные поля, если location уже содержит полный адрес
      } else {
        // Если location не указан, отправляем отдельные поля
        if (formData.address) formDataToSend.append('address', formData.address)
        if (formData.apartment) formDataToSend.append('apartment', formData.apartment)
        if (formData.country) formDataToSend.append('country', formData.country)
        if (formData.city) formDataToSend.append('city', formData.city)
      }
      if (formData.coordinates) {
        formDataToSend.append('coordinates', JSON.stringify(formData.coordinates))
      }
      if (formData.cadastralNumber) formDataToSend.append('cadastral_number', formData.cadastralNumber)
      
      // Дополнительные поля
      formDataToSend.append('balcony', formData.balcony ? '1' : '0')
      formDataToSend.append('parking', formData.parking ? '1' : '0')
      formDataToSend.append('elevator', formData.elevator ? '1' : '0')
      if (formData.landArea) formDataToSend.append('land_area', String(formData.landArea))
      formDataToSend.append('pool', formData.pool ? '1' : '0')
      formDataToSend.append('garden', formData.garden ? '1' : '0')
      if (formData.commercialType) formDataToSend.append('commercial_type', formData.commercialType)
      if (formData.businessHours) formDataToSend.append('business_hours', formData.businessHours)
      if (formData.renovation) formDataToSend.append('renovation', formData.renovation)
      if (formData.condition) formDataToSend.append('condition', formData.condition)
      if (formData.heating) formDataToSend.append('heating', formData.heating)
      if (formData.waterSupply) formDataToSend.append('water_supply', formData.waterSupply)
      if (formData.sewerage) formDataToSend.append('sewerage', formData.sewerage)
      formDataToSend.append('electricity', formData.electricity ? '1' : '0')
      formDataToSend.append('internet', formData.internet ? '1' : '0')
      formDataToSend.append('security', formData.security ? '1' : '0')
      formDataToSend.append('furniture', formData.furniture ? '1' : '0')
      
      // Дополнительные удобства (feature поля)
      for (let i = 1; i <= 26; i++) {
        const featureKey = `feature${i}`
        formDataToSend.append(featureKey, formData[featureKey] ? '1' : '0')
      }

      // Детализация долгов - только для объектов с долгами
      if (formData.isDebtProperty) {
        formDataToSend.append('debt_utilities', formData.debtUtilities ? '1' : '0')
        formDataToSend.append('debt_mortgage_pledge', formData.debtBankPledge ? '1' : '0')
        formDataToSend.append('debt_property_taxes', formData.debtPropertyTaxes ? '1' : '0')
        formDataToSend.append('debt_arrest', formData.debtArrest ? '1' : '0')
        formDataToSend.append('debt_inherited', formData.debtInherited ? '1' : '0')
        formDataToSend.append('debt_third_party', formData.debtThirdParty ? '1' : '0')
        if (formData.debtOther) {
          formDataToSend.append('debt_other', formData.debtOther)
        }
        if (formData.debtAmount) {
          const normalizedDebtAmount = removeCommas(String(formData.debtAmount))
          formDataToSend.append('debt_amount', normalizedDebtAmount)
        }
      }
      
      // Дополнительные удобства (текстовое поле)
      if (formData.additionalAmenities) {
        formDataToSend.append('additional_amenities', formData.additionalAmenities)
      }
      
      // Медиа (JSON) — только URL на сервере, без base64 (иначе POST не проходит лимиты прокси на проде)
      formDataToSend.append('photos', JSON.stringify(photoUrlsForSubmit))
      formDataToSend.append('videos', JSON.stringify(videos))
      formDataToSend.append('additional_documents', JSON.stringify(additionalDocuments.map(doc => ({
        name: doc.name,
        url: doc.url,
        type: doc.type
      }))))
      
      // Документы (File или восстановленные из черновика после Stripe)
      if (resolvedOwnershipDoc) {
        formDataToSend.append('ownership_document', resolvedOwnershipDoc)
      } else if (requiredDocuments.ownership?.isExisting && isEditMode) {
        console.log('📄 Документ о праве собственности уже загружен, пропускаем')
      }
      if (!formData.isDebtProperty && resolvedNoDebtsDoc) {
        formDataToSend.append('no_debts_document', resolvedNoDebtsDoc)
      } else if (!formData.isDebtProperty && requiredDocuments.noDebts?.isExisting && isEditMode) {
        console.log('📄 Справка об отсутствии обременений уже загружена, пропускаем')
      }
      // Документы по долгу — 6 категорий (cat1..cat6)
      if (formData.isDebtProperty) {
        for (const { key } of DEBT_DOC_CATEGORIES) {
          for (const [, raw] of Object.entries(debtDocumentsByCategory[key] || {})) {
            const f = await draftSerializableToFile(raw, `debt-${key}.pdf`)
            if (f instanceof File) {
              formDataToSend.append(`debt_doc_${key}`, f)
            }
          }
        }
      }
      
      console.log('📤 Отправка объявления на сервер...')
      
      // Если это режим редактирования, добавляем пометку и отправляем PUT запрос
      if (isEditMode && originalPropertyId) {
        formDataToSend.append('is_edit', '1')
        formDataToSend.append('original_property_id', String(originalPropertyId))
      }
      
      const url = isEditMode && originalPropertyId 
        ? `${API_BASE_URL}/properties/${originalPropertyId}?property_type=${encodeURIComponent(formData.propertyType || propertyTypeFromNavState || '')}`
        : `${API_BASE_URL}/properties`
      
      const response = await fetch(url, {
        method: isEditMode && originalPropertyId ? 'PUT' : 'POST',
        body: formDataToSend
      })
      
      console.log('📥 Ответ сервера:', response.status, response.statusText)
      
      if (!response.ok) {
        let errorText = 'Неизвестная ошибка'
        try {
          errorText = await response.text()
          console.error('❌ Ошибка сервера:', errorText)
        } catch (e) {
          console.error('❌ Не удалось прочитать ответ сервера')
        }
        throw new Error(`Ошибка сервера: ${response.status} - ${errorText}`)
      }
      
      const data = await response.json()
      console.log('✅ Данные от сервера:', data)
      console.log('📋 Проверка данных:', {
        success: data.success,
        hasData: !!data.data,
        dataId: data.data?.id,
        dataTitle: data.data?.title,
        dataPropertyType: data.data?.property_type,
        dataModerationStatus: data.data?.moderation_status,
        message: data.message
      })
      
      if (data.success) {
        // Проверяем, что данные действительно пришли
        if (!data.data) {
          console.warn('⚠️ Внимание: объект создан, но данные не возвращены в ответе')
        } else {
          console.log('✅ Объект успешно создан:', {
            id: data.data.id,
            title: data.data.title,
            property_type: data.data.property_type,
            moderation_status: data.data.moderation_status
          })
        }
        
        // Данные успешно отправлены на сервер
        // НЕ сохраняем данные в localStorage, так как они уже на сервере
        // Это предотвращает ошибку QuotaExceededError из-за больших файлов (фото в base64)
        // Все данные уже сохранены на сервере через API
        
        // Закрываем модальное окно верификации
        setShowVerificationModal(false)
        
        // Показываем модальное окно об успешной отправке и стираем черновик
        setIsSubmitting(false)
        clearDraft(draftKey)
        if (adminMode && typeof onAdminComplete === 'function') {
          onAdminComplete()
          return true
        }
        if (!skipSuccessModal) {
          setShowSuccessModal(true)
        }
        
        return true
      } else {
        throw new Error(data.error || 'Ошибка при отправке объявления')
      }
    } catch (error) {
      console.error('❌ Ошибка при отправке объявления:', error)
      setIsSubmitting(false)
      // Показываем более детальное сообщение об ошибке
      if (error.message.includes('Field value too long')) {
        showNotification('Ошибка: Размер данных слишком большой. Попробуйте уменьшить количество фото или размер файлов.')
      } else if (error.message.includes('ERR_CONNECTION_RESET') || error.message.includes('Failed to fetch')) {
        showNotification('Ошибка соединения с сервером. Проверьте, что сервер запущен и попробуйте еще раз.')
      } else {
        showNotification(`Произошла ошибка при отправке объявления: ${error.message}`)
      }
      return false
    }
  }

  // Получаем userId при монтировании компонента
  useEffect(() => {
    if (adminMode && adminOwnerId) {
      setUserId(adminOwnerId)
      return
    }

    const userData = getUserData()
    if (userData.isLoggedIn && userData.id) {
      setUserId(userData.id)
    }
  }, [adminMode, adminOwnerId])

  // Загружаем данные объекта при редактировании
  useEffect(() => {
    if (isEditMode && id) {
      loadPropertyData(id)
    }
  }, [isEditMode, id])

  // Восстановление черновика только для нового объекта (не редактирование)
  const draftRestoredRef = useRef(false)
  useEffect(() => {
    if (isEditMode || draftRestoredRef.current) return
    const draft = loadDraft(draftKey)
    if (!draft) return
    draftRestoredRef.current = true
    if (draft.formData) setFormData(draft.formData)
    if (draft.currentStep) {
      setCurrentStep(draft.currentStep === 'form' ? 'price' : draft.currentStep)
    }
    if (Array.isArray(draft.photos) && draft.photos.length > 0) setPhotos(draft.photos)
    if (Array.isArray(draft.videos)) setVideos(draft.videos)
    if (Array.isArray(draft.bedrooms)) setBedrooms(draft.bedrooms)
    if (typeof draft.guests === 'number') setGuests(draft.guests)
    if (draft.addressSearch !== undefined) setAddressSearch(draft.addressSearch)
    if (draft.selectedCoordinates) setSelectedCoordinates(draft.selectedCoordinates)
    if (draft.mapCenter) setMapCenter(draft.mapCenter)
    if (typeof draft.locationMapZoom === 'number') setLocationMapZoom(draft.locationMapZoom)
    if (draft.citySearch !== undefined) setCitySearch(draft.citySearch)
    if (draft.currency) setCurrency(draft.currency)
    if (draft.areaUnit) setAreaUnit(draft.areaUnit)
    if (draft.savedLocationData) setSavedLocationData(draft.savedLocationData)
    if (draft.showHints) setShowHints(draft.showHints)
    if (typeof draft.showHint1 === 'boolean') setShowHint1(draft.showHint1)
    if (typeof draft.showHint2 === 'boolean') setShowHint2(draft.showHint2)
    if (Array.isArray(draft.additionalDocuments)) setAdditionalDocuments(draft.additionalDocuments)
    if (draft.requiredDocuments && typeof draft.requiredDocuments === 'object') {
      const own = draft.requiredDocuments.ownership || null
      const nd = draft.requiredDocuments.noDebts || null
      setRequiredDocuments({ ownership: own, noDebts: nd })
      setUploadedDocuments({
        ownership: !!own,
        noDebts: !!nd,
      })
    }
    if (draft.debtDocumentsByCategory && typeof draft.debtDocumentsByCategory === 'object') {
      setDebtDocumentsByCategory((prev) => {
        const next = { ...prev }
        for (const key of Object.keys(draft.debtDocumentsByCategory)) {
          next[key] = { ...(prev[key] || {}), ...draft.debtDocumentsByCategory[key] }
        }
        return next
      })
    }
    if (draft.debtDocumentsStep === 'required' || draft.debtDocumentsStep === 'categories') {
      setDebtDocumentsStep(draft.debtDocumentsStep)
    }
  }, [isEditMode])

  // Сохранение черновика в localStorage (с дебаунсом), только для нового объекта
  const saveDraftTimeoutRef = useRef(null)
  useEffect(() => {
    if (isEditMode) return
    if (saveDraftTimeoutRef.current) clearTimeout(saveDraftTimeoutRef.current)
    saveDraftTimeoutRef.current = setTimeout(() => {
      void (async () => {
        saveDraftTimeoutRef.current = null
        const [ownSer, ndSer] = await Promise.all([
          draftDocToSerializable(requiredDocuments.ownership),
          draftDocToSerializable(requiredDocuments.noDebts),
        ])
        const debtSer = await serializeDebtDocsForDraft(debtDocumentsByCategory)
        const payload = {
          formData,
          currentStep,
          photos: photos.map(p => ({ id: p.id, url: p.url })),
          videos: videos.map(v => ({ ...v })),
          bedrooms,
          guests,
          addressSearch,
          selectedCoordinates,
          mapCenter,
          locationMapZoom,
          citySearch,
          currency,
          areaUnit,
          savedLocationData,
          showHints,
          showHint1,
          showHint2,
          additionalDocuments: additionalDocuments.map(d => ({ name: d.name, url: d.url, type: d.type })),
          requiredDocuments: { ownership: ownSer, noDebts: ndSer },
          debtDocumentsByCategory: debtSer,
          debtDocumentsStep,
        }
        saveDraftPayload(payload, draftKey)
      })()
    }, DRAFT_SAVE_DEBOUNCE_MS)
    return () => {
      if (saveDraftTimeoutRef.current) clearTimeout(saveDraftTimeoutRef.current)
    }
  }, [
    isEditMode,
    draftKey,
    formData,
    currentStep,
    photos,
    videos,
    bedrooms,
    guests,
    addressSearch,
    selectedCoordinates,
    mapCenter,
    locationMapZoom,
    citySearch,
    currency,
    areaUnit,
    savedLocationData,
    showHints,
    showHint1,
    showHint2,
    additionalDocuments,
    requiredDocuments,
    debtDocumentsByCategory,
    debtDocumentsStep,
  ])

  // Функция геокодирования адреса при редактировании
  const geocodeAddressForEdit = async (address) => {
    if (!address || address.trim().length === 0) return
    
    try {
      console.log('🌍 Геокодируем адрес для редактирования:', address)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&accept-language=ru&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'PropertyListingApp/1.0'
          }
        }
      )
      
      if (!response.ok) {
        console.warn('⚠️ Ошибка геокодирования:', response.status)
        return
      }
      
      const data = await response.json()
      
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat)
        const lon = parseFloat(data[0].lon)
        
        if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
          const coords = [lat, lon]
          console.log('✅ Адрес геокодирован:', address, '->', coords)
          
          // Устанавливаем координаты
          setSelectedCoordinates(coords)
          setMapCenter(coords)
          setFormData(prev => ({ ...prev, coordinates: coords }))
          
          // Обновляем savedLocationData с новыми координатами
          setSavedLocationData(prev => {
            if (prev) {
              return { ...prev, coordinates: coords }
            }
            return {
              country: formData.country || '',
              city: formData.city || '',
              address: address,
              location: address,
              coordinates: coords,
              citySearch: formData.city || '',
              addressSearch: address
            }
          })
        } else {
          console.warn('⚠️ Невалидные координаты после геокодирования:', { lat, lon })
        }
      } else {
        console.warn('⚠️ Геокодирование не дало результатов для адреса:', address)
      }
    } catch (error) {
      console.warn('❌ Ошибка геокодирования адреса:', error)
    }
  }

  // Восстанавливаем данные о местоположении при переходе на шаг location в режиме редактирования
  useEffect(() => {
    if (isEditMode && currentStep === 'location' && savedLocationData && !isEditingLocation) {
      console.log('📍 Восстанавливаем данные о местоположении:', savedLocationData)
      console.log('📍 Координаты в savedLocationData:', savedLocationData.coordinates, 'тип:', typeof savedLocationData.coordinates)
      // Используем задержку, чтобы убедиться, что компонент полностью отрендерился
      const timer = setTimeout(() => {
        // Восстанавливаем адрес (приоритет: address > location) только если пользователь не редактирует
        const addressToRestore = savedLocationData.address || savedLocationData.location || ''
        if (addressToRestore && !addressSearch) {
          console.log('📍 Устанавливаем адрес:', addressToRestore)
          setFormData(prev => ({ 
            ...prev, 
            address: savedLocationData.address || '',
            location: savedLocationData.location || savedLocationData.address || ''
          }))
          setAddressSearch(addressToRestore)
        }
        // Восстанавливаем координаты для карты
        if (savedLocationData.coordinates) {
          let coordsToSet = savedLocationData.coordinates
          console.log('📍 Обрабатываем координаты для восстановления:', coordsToSet, 'тип:', typeof coordsToSet)
          
          // Убеждаемся, что координаты - массив
          if (!Array.isArray(coordsToSet)) {
            if (typeof coordsToSet === 'string') {
              try {
                if (coordsToSet.startsWith('[') || coordsToSet.startsWith('{')) {
                  coordsToSet = JSON.parse(coordsToSet)
                  console.log('📍 Координаты распарсены из JSON:', coordsToSet)
                } else {
                  const parts = coordsToSet.split(',')
                  if (parts.length >= 2) {
                    coordsToSet = [parseFloat(parts[0].trim()), parseFloat(parts[1].trim())]
                    console.log('📍 Координаты распарсены из строки:', coordsToSet)
                  }
                }
              } catch (e) {
                console.warn('❌ Ошибка парсинга координат при восстановлении:', e)
                coordsToSet = null
              }
            } else {
              console.warn('⚠️ Координаты не массив и не строка:', coordsToSet)
              coordsToSet = null
            }
          }
          
          if (Array.isArray(coordsToSet) && coordsToSet.length >= 2) {
            let lat = parseFloat(coordsToSet[0])
            let lng = parseFloat(coordsToSet[1])
            console.log('📍 Парсим координаты:', { lat, lng, исходные: coordsToSet })
            
            // Проверяем, не перепутаны ли координаты местами
            if ((lat > 90 || lat < -90) && (lng >= -90 && lng <= 90)) {
              console.warn('⚠️ Координаты перепутаны местами при восстановлении, исправляем:', [lat, lng], '->', [lng, lat])
              [lat, lng] = [lng, lat]
            }
            
            if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
              console.log('✅ Устанавливаем координаты на карту:', [lat, lng])
              // Обновляем координаты
              setSelectedCoordinates([lat, lng])
              setMapCenter([lat, lng])
              // Обновляем formData с координатами
              setFormData(prev => ({ ...prev, coordinates: [lat, lng] }))
              console.log('✅ Координаты установлены в selectedCoordinates, mapCenter и formData')
            } else {
              console.warn('⚠️ Координаты невалидны:', [lat, lng])
            }
          } else {
            console.warn('⚠️ Координаты не в правильном формате после обработки:', coordsToSet)
          }
        } else {
          console.warn('⚠️ Координаты отсутствуют в savedLocationData. Проверяем formData.coordinates...')
          // Пытаемся использовать координаты из formData, если они есть
          if (formData.coordinates && Array.isArray(formData.coordinates) && formData.coordinates.length >= 2) {
            console.log('📍 Найдены координаты в formData:', formData.coordinates)
            const lat = parseFloat(formData.coordinates[0])
            const lng = parseFloat(formData.coordinates[1])
            if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
              console.log('✅ Используем координаты из formData:', [lat, lng])
              setSelectedCoordinates([lat, lng])
              setMapCenter([lat, lng])
            }
          } else {
            // Если координат нет, пытаемся геокодировать адрес
            const addressToGeocode = savedLocationData.address || savedLocationData.location || ''
            if (addressToGeocode) {
              console.log('📍 Координаты отсутствуют, пытаемся геокодировать адрес:', addressToGeocode)
              geocodeAddressForEdit(addressToGeocode)
            }
          }
        }
      }, 200) // Задержка для корректного рендеринга
      
      return () => clearTimeout(timer)
    }
  }, [currentStep, isEditMode, savedLocationData, formData.coordinates, isEditingLocation, addressSearch])

  // Функция загрузки данных объекта для редактирования
  const loadPropertyData = async (propertyId) => {
    setIsLoadingProperty(true)
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'
      // В некоторых случаях бэкенд требует property_type, чтобы однозначно найти запись по id (при пересечении id между таблицами).
      const propertyTypeHint = propertyTypeFromNavState ? `?property_type=${encodeURIComponent(propertyTypeFromNavState)}` : ''
      let response = await fetch(`${API_BASE_URL}/properties/${propertyId}${propertyTypeHint}`)
      if (!response.ok && propertyTypeFromNavState) {
        // fallback: пробуем без подсказки
        response = await fetch(`${API_BASE_URL}/properties/${propertyId}`)
      }
      
      if (!response.ok) {
        throw new Error('Не удалось загрузить данные объекта')
      }
      
      const result = await response.json()
      if (result.success && result.data) {
        const property = result.data
        const adminAddedFlag =
          property?.created_by_admin === true ||
          property?.created_by_admin === 1 ||
          property?.added_by_admin === true ||
          property?.added_by_admin === 1 ||
          property?.admin_created === true ||
          property?.admin_created === 1 ||
          property?.is_admin_created === true ||
          property?.is_admin_created === 1 ||
          adminAddedFromNavState
        setIsAdminAddedProperty(adminMode || adminAddedFlag)
        setOriginalPropertyId(propertyId)
        // Сохраняем оригинальные данные для сравнения
        setOriginalPropertyData(JSON.parse(JSON.stringify(property)))
        
        // Парсим JSON поля
        let photosArray = []
        let videosArray = []
        let additionalDocsArray = []
        
        try {
          if (property.photos && typeof property.photos === 'string') {
            photosArray = JSON.parse(property.photos)
          } else if (Array.isArray(property.photos)) {
            photosArray = property.photos
          }
          
          if (property.videos && typeof property.videos === 'string') {
            videosArray = JSON.parse(property.videos)
          } else if (Array.isArray(property.videos)) {
            videosArray = property.videos
          }
          
          if (property.additional_documents && typeof property.additional_documents === 'string') {
            additionalDocsArray = JSON.parse(property.additional_documents)
          } else if (Array.isArray(property.additional_documents)) {
            additionalDocsArray = property.additional_documents
          }
        } catch (parseError) {
          console.warn('Ошибка парсинга JSON полей:', parseError)
        }
        
        // Преобразуем фото в формат компонента
        const formattedPhotos = photosArray.map((photo, index) => ({
          id: `photo-${index}`,
          url: typeof photo === 'string' ? photo : photo.url || photo
        }))
        setPhotos(formattedPhotos)
        
        // Преобразуем видео в формат компонента
        const formattedVideos = videosArray.map((video, index) => ({
          id: `video-${index}`,
          url: typeof video === 'string' ? video : video.url || video.embedUrl || video.videoId,
          type: typeof video === 'object' ? (video.type || 'youtube') : 'youtube',
          videoId: typeof video === 'object' ? video.videoId : null,
          thumbnail: typeof video === 'object' ? video.thumbnail : null
        }))
        setVideos(formattedVideos)
        
        // Преобразуем дополнительные документы
        const formattedDocs = additionalDocsArray.map((doc, index) => ({
          id: `doc-${index}`,
          name: typeof doc === 'object' ? doc.name : `Документ ${index + 1}`,
          url: typeof doc === 'string' ? doc : doc.url,
          type: typeof doc === 'object' ? doc.type : 'other'
        }))
        setAdditionalDocuments(formattedDocs)
        
        // Парсим координаты (API уже возвращает их как массив, но проверяем на всякий случай)
        let parsedCoordinates = null
        console.log('📍 Исходные координаты из API:', property.coordinates, 'тип:', typeof property.coordinates)
        
        if (property.coordinates) {
          try {
            if (Array.isArray(property.coordinates)) {
              // Уже массив - используем как есть
              parsedCoordinates = property.coordinates
              console.log('📍 Координаты уже массив:', parsedCoordinates)
            } else if (typeof property.coordinates === 'string') {
              // Строка - парсим
              if (property.coordinates.startsWith('[') || property.coordinates.startsWith('{')) {
                parsedCoordinates = JSON.parse(property.coordinates)
                console.log('📍 Координаты распарсены из JSON строки:', parsedCoordinates)
              } else {
                // Строка вида "lat,lng"
                const parts = property.coordinates.split(',')
                if (parts.length >= 2) {
                  parsedCoordinates = [parseFloat(parts[0].trim()), parseFloat(parts[1].trim())]
                  console.log('📍 Координаты распарсены из строки с запятой:', parsedCoordinates)
                }
              }
            }
          } catch (e) {
            console.warn('❌ Ошибка парсинга координат:', e)
            parsedCoordinates = null
          }
        } else {
          console.warn('⚠️ Координаты отсутствуют в данных объекта')
        }
        
        // Парсим test_drive_data
        let testDriveData = null
        if (property.test_drive_data) {
          try {
            testDriveData = typeof property.test_drive_data === 'string'
              ? JSON.parse(property.test_drive_data)
              : property.test_drive_data
          } catch (e) {
            console.warn('Ошибка парсинга test_drive_data:', e)
          }
        }
        
        // Предзаполняем форму данными объекта
        setFormData({
          propertyType: property.property_type || '',
          testDrive: property.test_drive !== undefined && property.test_drive !== null ? (property.test_drive === 1 || property.test_drive === true) : null,
          testDrivePricePerDay: testDriveData?.price_per_day ? String(testDriveData.price_per_day) : '',
          testDriveInsuranceDeposit: testDriveData?.insurance_deposit ? String(testDriveData.insurance_deposit) : '',
          title: property.title || '',
          description: property.description || '',
          price: property.price ? String(property.price) : '',
          minimumSalePrice:
            property.minimum_sale_price != null && property.minimum_sale_price !== ''
              ? String(property.minimum_sale_price)
              : '',
          isShareProperty: !!(property.is_shared_ownership === 1 || property.is_shared_ownership === true),
          isDebtProperty: !!(property.is_debt === 1 || property.is_debt === true || property.sale_type === 'debt' || property.has_debt === 1 || property.has_debt === true),
          totalShares: (property.total_shares != null && property.total_shares !== '') ? String(property.total_shares) : '',
          isAuction: (property.is_auction === 1 || property.is_auction === true),
          auctionStartDate: property.auction_start_date || '',
          auctionEndDate: property.auction_end_date || '',
          auctionStartingPrice: property.auction_starting_price ? String(property.auction_starting_price) : '',
          area: property.area ? String(property.area) : '',
          livingArea: property.living_area ? String(property.living_area) : '',
          buildingType: property.building_type || '',
          constructionType: normalizeConstructionTypeForForm(property.construction_type),
          rooms: (property.rooms !== undefined && property.rooms !== null && property.rooms !== '') ? String(property.rooms) : '',
          bedrooms: (property.bedrooms !== undefined && property.bedrooms !== null && property.bedrooms !== '') ? String(property.bedrooms) : '',
          bathrooms: (property.bathrooms !== undefined && property.bathrooms !== null && property.bathrooms !== '') ? String(property.bathrooms) : '',
          floor: property.floor ? String(property.floor) : '',
          // Для домов/вилл используем floors, для квартир/апартаментов - total_floors
          totalFloors: (property.property_type === 'house' || property.property_type === 'villa') 
            ? (property.floors ? String(property.floors) : '')
            : (property.total_floors ? String(property.total_floors) : ''),
          yearBuilt: property.year_built ? String(property.year_built) : '',
          location: property.location || '',
          address: property.address || '',
          apartment: property.apartment || '',
          cadastralNumber: property.cadastral_number || '',
          country: property.country || '',
          city: property.city || '',
          coordinates: parsedCoordinates || null, // Устанавливаем координаты сразу после парсинга
          balcony: property.balcony === 1 || property.balcony === true,
          parking: property.parking === 1 || property.parking === true,
          elevator: property.elevator === 1 || property.elevator === true,
          landArea: property.land_area ? String(property.land_area) : '',
          pool: property.pool === 1 || property.pool === true,
          garden: property.garden === 1 || property.garden === true,
          commercialType: property.commercial_type || '',
          businessHours: property.business_hours || '',
          renovation: property.renovation || '',
          condition: property.condition || '',
          heating: property.heating || '',
          waterSupply: property.water_supply || '',
          sewerage: property.sewerage || '',
          electricity: property.electricity === 1 || property.electricity === true,
          internet: property.internet === 1 || property.internet === true,
          security: property.security === 1 || property.security === true,
          furniture: property.furniture === 1 || property.furniture === true,
          feature1: property.feature1 === 1 || property.feature1 === true,
          feature2: property.feature2 === 1 || property.feature2 === true,
          feature3: property.feature3 === 1 || property.feature3 === true,
          feature4: property.feature4 === 1 || property.feature4 === true,
          feature5: property.feature5 === 1 || property.feature5 === true,
          feature6: property.feature6 === 1 || property.feature6 === true,
          feature7: property.feature7 === 1 || property.feature7 === true,
          feature8: property.feature8 === 1 || property.feature8 === true,
          feature9: property.feature9 === 1 || property.feature9 === true,
          feature10: property.feature10 === 1 || property.feature10 === true,
          feature11: property.feature11 === 1 || property.feature11 === true,
          feature12: property.feature12 === 1 || property.feature12 === true,
          feature13: property.feature13 === 1 || property.feature13 === true,
          feature14: property.feature14 === 1 || property.feature14 === true,
          feature15: property.feature15 === 1 || property.feature15 === true,
          feature16: property.feature16 === 1 || property.feature16 === true,
          feature17: property.feature17 === 1 || property.feature17 === true,
          feature18: property.feature18 === 1 || property.feature18 === true,
          feature19: property.feature19 === 1 || property.feature19 === true,
          feature20: property.feature20 === 1 || property.feature20 === true,
          feature21: property.feature21 === 1 || property.feature21 === true,
          feature22: property.feature22 === 1 || property.feature22 === true,
          feature23: property.feature23 === 1 || property.feature23 === true,
          feature24: property.feature24 === 1 || property.feature24 === true,
          feature25: property.feature25 === 1 || property.feature25 === true,
          feature26: property.feature26 === 1 || property.feature26 === true,
          additionalAmenities: property.additional_amenities || ''
        })
        
        // Устанавливаем валюту
        if (property.currency) {
          setCurrency(property.currency)
        }
        
        // Валидируем и нормализуем уже распарсенные координаты
        if (parsedCoordinates && Array.isArray(parsedCoordinates) && parsedCoordinates.length >= 2) {
          let lat = parseFloat(parsedCoordinates[0])
          let lng = parseFloat(parsedCoordinates[1])
          
          // Проверяем, не перепутаны ли координаты местами
          // Если lat выходит за диапазон, но lng в диапазоне lat, то координаты перепутаны
          if ((lat > 90 || lat < -90) && (lng >= -90 && lng <= 90)) {
            console.warn('⚠️ Координаты перепутаны местами, исправляем:', [lat, lng], '->', [lng, lat])
            [lat, lng] = [lng, lat]
          }
          
          if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            // Нормализуем координаты
            parsedCoordinates = [lat, lng]
            console.log('✅ Валидные координаты (lat, lng):', [lat, lng])
            console.log('📍 Для Минска ожидаем примерно: [53.9045, 27.5615]')
            // Обновляем formData с правильными координатами
            setFormData(prev => ({ ...prev, coordinates: [lat, lng] }))
            // Устанавливаем координаты для карты
            setSelectedCoordinates([lat, lng])
            setMapCenter([lat, lng])
            console.log('✅ Координаты установлены в selectedCoordinates и mapCenter')
          } else {
            console.warn('⚠️ Координаты невалидны (вне диапазона):', [lat, lng])
            parsedCoordinates = null
            setFormData(prev => ({ ...prev, coordinates: null }))
          }
        } else if (parsedCoordinates) {
          console.warn('⚠️ Координаты не в формате массива:', parsedCoordinates)
          parsedCoordinates = null
          setFormData(prev => ({ ...prev, coordinates: null }))
        }
        
        // Сохраняем данные о местоположении для восстановления при переходе на шаг location
        // Сохраняем координаты вместе с остальными данными о местоположении
        setSavedLocationData(prev => {
          const locationData = {
            country: property.country || '',
            city: property.city || '',
            address: property.address || '',
            location: property.location || '',
            coordinates: parsedCoordinates || prev?.coordinates || null, // Приоритет: новые координаты > старые > null
            citySearch: property.city || '',
            addressSearch: property.address || property.location || ''
          }
          console.log('💾 Сохраняем данные о местоположении:', locationData)
          console.log('💾 Координаты в locationData:', locationData.coordinates)
          return locationData
        })
        
        // Устанавливаем город для поиска
        if (property.city) {
          setCitySearch(property.city)
        }
        
        // Устанавливаем адрес для поиска (приоритет: location > address)
        // Если location содержит полный адрес, используем его, иначе используем address
        let addressToSet = ''
        if (property.location) {
          // Если location содержит полный адрес, извлекаем только улицу
          // Или используем location как есть, если address пустой
          addressToSet = property.address || property.location
        } else if (property.address) {
          addressToSet = property.address
        }
        if (addressToSet) {
          setAddressSearch(addressToSet)
        }
        
        // Устанавливаем документы как загруженные (если они есть)
        if (property.ownership_document) {
          // Создаем объект-заглушку для уже загруженного документа
          const ownershipDocName = property.ownership_document_name || 
            (property.ownership_document.includes('/') 
              ? property.ownership_document.split('/').pop() 
              : 'Документ о праве собственности')
          setRequiredDocuments(prev => ({
            ...prev,
            ownership: {
              name: ownershipDocName,
              url: property.ownership_document,
              isExisting: true // Флаг, что это уже загруженный документ
            }
          }))
          setUploadedDocuments(prev => ({ ...prev, ownership: true }))
        }
        if (property.no_debts_document) {
          // Создаем объект-заглушку для уже загруженного документа
          const noDebtsDocName = property.no_debts_document_name || 
            (property.no_debts_document.includes('/') 
              ? property.no_debts_document.split('/').pop() 
              : 'Справка об отсутствии обременений')
          setRequiredDocuments(prev => ({
            ...prev,
            noDebts: {
              name: noDebtsDocName,
              url: property.no_debts_document,
              isExisting: true // Флаг, что это уже загруженный документ
            }
          }))
          setUploadedDocuments(prev => ({ ...prev, noDebts: true }))
        }
        // После загрузки: правило 30% от «Купить сейчас» для стартовой ставки
        if (property.price && property.auction_starting_price) {
          const loadErr = getAuctionStartingVsBuyNowError(
            String(property.price),
            String(property.auction_starting_price)
          )
          if (loadErr) {
            setValidationErrors(prev => ({ ...prev, auctionStartingPrice: loadErr }))
          } else {
            setValidationErrors(prev => {
              const next = { ...prev }
              delete next.auctionStartingPrice
              return next
            })
          }
        }
        if (property.minimum_sale_price != null && property.price) {
          const loadMinErr = getMinimumSaleVsBuyNowError(
            String(property.minimum_sale_price),
            String(property.price)
          )
          if (loadMinErr) {
            setValidationErrors((prev) => ({ ...prev, minimumSalePrice: loadMinErr }))
          } else {
            setValidationErrors((prev) => {
              const next = { ...prev }
              delete next.minimumSalePrice
              return next
            })
          }
        }
        
        // Начинаем пошаговый процесс редактирования:
        // для долей и долгов сразу переходим к названию, для остальных — к вопросу о тест-драйве
        const isShare = property.is_shared_ownership === 1 || property.is_shared_ownership === true
        const isDebt =
          property.is_debt === 1 ||
          property.is_debt === true ||
          property.sale_type === 'debt' ||
          property.has_debt === 1 ||
          property.has_debt === true
        setCurrentStep(isShare || isDebt ? 'property-name' : 'test-drive-question')
      } else {
        throw new Error('Данные объекта не найдены')
      }
    } catch (error) {
      console.error('Ошибка загрузки данных объекта:', error)
      showNotification('Не удалось загрузить данные объекта для редактирования')
      navigate('/owner')
    } finally {
      setIsLoadingProperty(false)
    }
  }

  // Функция для сравнения изменений
  const getPropertyChanges = () => {
    if (!originalPropertyData) return []
    
    const changes = []
    const fieldLabels = {
      title: 'Название',
      description: 'Описание',
      price: 'Цена',
      currency: 'Валюта',
      area: 'Площадь',
      rooms: 'Комнаты',
      bedrooms: 'Спальни',
      bathrooms: 'Ванные',
      floor: 'Этаж',
      total_floors: 'Всего этажей',
      year_built: 'Год постройки',
      construction_type: t('addPropertyConstructionTypePlaceholder'),
      location: 'Местоположение',
      cadastral_number: 'Кадастровый номер',
      land_area: 'Площадь участка',
      commercial_type: 'Тип коммерческой',
      business_hours: 'Часы работы',
      renovation: 'Ремонт',
      condition: 'Состояние',
      heating: 'Отопление',
      water_supply: 'Водоснабжение',
      sewerage: 'Канализация',
      is_auction: 'Аукцион',
      auction_start_date: 'Дата начала аукциона',
      auction_end_date: 'Дата окончания аукциона',
      auction_starting_price: 'Стартовая цена аукциона',
      balcony: 'Балкон',
      parking: 'Парковка',
      elevator: 'Лифт',
      garage: 'Гараж',
      pool: 'Бассейн',
      garden: 'Сад',
      electricity: 'Электричество',
      internet: 'Интернет',
      security: 'Охрана',
      furniture: 'Мебель'
    }
    
    // Сравниваем основные поля
    Object.keys(fieldLabels).forEach(key => {
      const oldValue = originalPropertyData[key]
      // Маппинг полей формы к полям базы данных
      const formDataMapping = {
        'title': 'title',
        'description': 'description',
        'price': 'price',
        'currency': 'currency',
        'area': 'area',
        'rooms': 'rooms',
        'bedrooms': 'bedrooms',
        'bathrooms': 'bathrooms',
        'floor': 'floor',
        'total_floors': 'totalFloors',
        'year_built': 'yearBuilt',
        'construction_type': 'constructionType',
        'location': 'location',
        'cadastral_number': 'cadastralNumber',
        'land_area': 'landArea',
        'commercial_type': 'commercialType',
        'business_hours': 'businessHours',
        'renovation': 'renovation',
        'condition': 'condition',
        'heating': 'heating',
        'water_supply': 'waterSupply',
        'sewerage': 'sewerage',
        'is_auction': 'isAuction',
        'auction_start_date': 'auctionStartDate',
        'auction_end_date': 'auctionEndDate',
        'auction_starting_price': 'auctionStartingPrice',
        'balcony': 'balcony',
        'parking': 'parking',
        'elevator': 'elevator',
        'garage': 'garage',
        'pool': 'pool',
        'garden': 'garden',
        'electricity': 'electricity',
        'internet': 'internet',
        'security': 'security',
        'furniture': 'furniture'
      }
      
      const formDataKey = formDataMapping[key] || key
      let newValue = formData[formDataKey]
      
      // Обработка булевых значений
      if (key === 'is_auction') {
        newValue = formData.isAuction
        const oldBool = oldValue === 1 || oldValue === true
        if (oldBool !== newValue) {
          changes.push({
            field: fieldLabels[key],
            old: oldBool ? 'Да' : 'Нет',
            new: newValue ? 'Да' : 'Нет'
          })
        }
        return
      }
      
      // Обработка булевых полей удобств
      if (['balcony', 'parking', 'elevator', 'garage', 'pool', 'garden', 'electricity', 'internet', 'security', 'furniture'].includes(key)) {
        const oldBool = oldValue === 1 || oldValue === true
        const newBool = newValue === true || newValue === 1
        if (oldBool !== newBool) {
          changes.push({
            field: fieldLabels[key],
            old: oldBool ? 'Да' : 'Нет',
            new: newBool ? 'Да' : 'Нет'
          })
        }
        return
      }
      
      // Обработка числовых значений
      if (['price', 'area', 'land_area', 'auction_starting_price'].includes(key)) {
        const oldNum = oldValue ? Number(oldValue) : null
        const newNum = newValue ? Number(newValue) : null
        if (oldNum !== newNum) {
          changes.push({
            field: fieldLabels[key],
            old: oldNum !== null ? oldNum.toLocaleString('ru-RU') : 'Не указано',
            new: newNum !== null ? newNum.toLocaleString('ru-RU') : 'Не указано'
          })
        }
        return
      }
      
      // Обработка location - может быть в formData.location или formData.address
      if (key === 'location') {
        const newLocation = formData.location || formData.address || savedLocationData?.location || savedLocationData?.address
        if (oldValue !== newLocation && (oldValue || newLocation)) {
          changes.push({
            field: fieldLabels[key],
            old: oldValue || 'Не указано',
            new: newLocation || 'Не указано'
          })
        }
        return
      }
      
      // Обработка строковых значений
      if (oldValue !== newValue && (oldValue || newValue)) {
        changes.push({
          field: fieldLabels[key],
          old: oldValue || 'Не указано',
          new: newValue || 'Не указано'
        })
      }
    })
    
    // Сравниваем фотографии
    const oldPhotos = originalPropertyData.photos ? 
      (typeof originalPropertyData.photos === 'string' ? JSON.parse(originalPropertyData.photos) : originalPropertyData.photos) : []
    const newPhotos = photos.map(p => p.url || p)
    if (JSON.stringify(oldPhotos) !== JSON.stringify(newPhotos)) {
      changes.push({
        field: 'Фотографии',
        old: `${oldPhotos.length} фото`,
        new: `${newPhotos.length} фото`
      })
    }
    
    return changes
  }

  const handleVerificationComplete = async () => {
    localStorage.setItem('verificationSubmitted', 'true')
    setShowVerificationModal(false)
    const success = await handlePublish()
    if (success) {
      localStorage.removeItem('verificationSubmitted')
      listingPublishedAfterFeeRef.current = true
    }
    return true
  }

  const handleRequiredDocumentChange = (type, e) => {
    const file = e.target.files[0]
    if (file) {
      setRequiredDocumentPreviews((prev) => {
        const next = { ...prev }
        if (next[type] && next[type].startsWith('blob:')) {
          URL.revokeObjectURL(next[type])
        }
        next[type] = file.type.startsWith('image/') ? URL.createObjectURL(file) : ''
        return next
      })
      setRequiredDocuments(prev => ({
        ...prev,
        [type]: file
      }))
      setUploadedDocuments(prev => ({
        ...prev,
        [type]: true
      }))
    }
    e.target.value = ''
  }

  const handleRemoveRequiredDocument = (type) => {
    setRequiredDocumentPreviews((prev) => {
      const next = { ...prev }
      if (next[type] && next[type].startsWith('blob:')) {
        URL.revokeObjectURL(next[type])
      }
      next[type] = ''
      return next
    })
    setRequiredDocuments(prev => ({
      ...prev,
      [type]: null
    }))
    setUploadedDocuments(prev => ({
      ...prev,
      [type]: false
    }))
  }

  // Обновляем объединенный массив медиа при изменении фото или видео
  useEffect(() => {
    const items = [
      ...photos.map(photo => ({ ...photo, mediaType: 'photo' })),
      ...videos.map(video => ({ ...video, mediaType: 'video' }))
    ]
    setMediaItems(items)
  }, [photos, videos])

  useEffect(() => {
    return () => {
      Object.values(requiredDocumentPreviews).forEach((url) => {
        if (typeof url === 'string' && url.startsWith('blob:')) {
          URL.revokeObjectURL(url)
        }
      })
    }
  }, [requiredDocumentPreviews])

  const nextMedia = () => {
    setCurrentMediaIndex((prev) => (prev + 1) % mediaItems.length)
  }

  const prevMedia = () => {
    setCurrentMediaIndex((prev) => (prev - 1 + mediaItems.length) % mediaItems.length)
  }

  // Функция для получения иконки типа недвижимости
  const getPropertyTypeIcon = (type) => {
    switch (type) {
      case 'house':
        return <FiHome size={64} />
      case 'apartment':
        return <PiBuildingApartment size={64} />
      case 'apartments':
        return <PiBuildingApartment size={64} />
      case 'villa':
        return <PiBuildings size={64} />
      case 'commercial':
        return <PiWarehouse size={64} />
      case 'land':
        return <FiMapPin size={64} />
      case 'other':
        return <FiLayers size={64} />
      default:
        return <FiHome size={64} />
    }
  }

  // Функция для получения названия типа недвижимости
  const getPropertyTypeName = (type) => {
    switch (type) {
      case 'house':
        return 'Дом'
      case 'apartment':
        return 'Квартира'
      case 'apartments':
        return 'Аппартаменты'
      case 'villa':
        return 'Вилла'
      case 'commercial':
        return 'Коммерческая недвижимость'
      case 'land':
        return 'Земля'
      case 'other':
        return 'Другое'
      default:
        return 'Недвижимость'
    }
  }

  // Выбор типа объекта в новом каталоге.
  const handlePropertyTypeSelect = (typeId) => {
    const selectedOption = PROPERTY_TYPE_OPTIONS.find(item => item.id === typeId)
    const backendType = selectedOption?.backendType || 'apartment'
    const typeProfile = getSinglePageTypeProfile(typeId, backendType)
    const typeSpecificReset = {
      rooms: '',
      bedrooms: '',
      bathrooms: '',
      floor: '',
      totalFloors: '',
      yearBuilt: '',
      buildingType: '',
      constructionType: '',
      area: '',
      livingArea: '',
      landArea: '',
      commercialType: '',
      cadastralNumber: '',
      parking: false,
      feature1: false,
      feature12: false,
      feature2: false,
      furniture: false,
      feature3: false,
      feature4: false,
      electricity: false,
      feature18: false,
      internet: false,
      security: false,
      feature5: false,
      feature6: false,
      feature16: false,
      feature17: false,
      balcony: false,
      feature7: false,
      feature8: false,
      elevator: false,
      pool: false,
      garden: false,
      additionalAmenities: '',
    }
    
    setFormData(prev => ({
      ...prev,
      ...typeSpecificReset,
      propertyType: backendType,
      propertyTypeUi: typeId,
      listingMode: '',
      isShareProperty: false,
      isDebtProperty: false,
      totalShares: '',
      debtAmount: '',
      // Для "земли" и "другого" оставляем единый backend type, но UI-логика идет по profile.
      // Значения type-specific уже очищены в typeSpecificReset.
      commercialType: typeProfile === 'land' ? 'residential' : '',
    }))
    setCurrentStep('property-name')
  }

  // Обработчик выбора типа недвижимости для объявления \"Долги\"
  const handleDebtPropertyTypeSelect = (type) => {
    const isApartmentOrCommercial = type === 'apartment' || type === 'commercial'
    const isHouseOrVilla = type === 'house' || type === 'villa'

    setFormData(prev => ({
      ...prev,
      propertyType: type,
      isShareProperty: false,
      isDebtProperty: true,
      isAuction: true,
      testDrive: false,
      bedrooms: isApartmentOrCommercial ? '' : prev.bedrooms,
      rooms: isHouseOrVilla ? '' : prev.rooms
    }))

    // Для долгов: без тест-драйва — сразу к названию
    setCurrentStep('property-name')
  }

  const handleListingModeSelect = (mode, options = {}) => {
    const { skipStepTransition = false, smoothScrollToPrice = false } = options
    setExpandedListingModeId(null)
    setFormData(prev => ({
      ...prev,
      listingMode: mode,
      isShareProperty: mode === 'shares',
      isDebtProperty: mode === 'debt' || mode === 'debt_auction',
      isAuction: mode === 'auction' || mode === 'auction_buy_now' || mode === 'debt_auction',
      testDrive: (mode === 'shares' || mode === 'debt' || mode === 'debt_auction') ? false : prev.testDrive,
    }))
    setShowListingModePicker(false)
    if (!skipStepTransition) {
      setCurrentStep('price-calculator')
      return
    }

    if (smoothScrollToPrice) {
      requestAnimationFrame(() => {
        singlePagePriceSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }

  const handleListingModeThemeScroll = (event) => {
    const node = event.currentTarget
    const maxScroll = Math.max(node.scrollHeight - node.clientHeight, 1)
    const progress = node.scrollTop / maxScroll
    const nextStage = Math.min(
      LISTING_MODE_THEME_STAGES.length - 1,
      Math.floor(progress * LISTING_MODE_THEME_STAGES.length)
    )
    setListingModeThemeStage(prev => (prev === nextStage ? prev : nextStage))
  }

  const handleListingModeThemeWheel = (event) => {
    const threshold = 80
    listingModeWheelAccumulatorRef.current += event.deltaY
    if (Math.abs(listingModeWheelAccumulatorRef.current) < threshold) return
    const direction = listingModeWheelAccumulatorRef.current > 0 ? 1 : -1
    listingModeWheelAccumulatorRef.current = 0
    setListingModeThemeStage(prev => {
      const next = Math.max(0, Math.min(LISTING_MODE_THEME_STAGES.length - 1, prev + direction))
      return next
    })
  }

  // Обработчик ответа на вопрос о тест-драйве
  const handleTestDriveAnswer = (answer) => {
    console.log('🔍 handleTestDriveAnswer вызван с answer:', answer, 'тип:', typeof answer)
    setFormData(prev => {
      const newData = { ...prev, testDrive: answer }
      console.log('🔍 Обновленный formData.testDrive:', newData.testDrive)
      return newData
    })
    setCurrentStep(answer ? 'test-drive-pricing' : 'listing-type')
  }

  const handleGenerateDescription = async () => {
    const draft = (formData.description || '').trim()
    if (!draft) {
      showNotification(t('addPropertyGenerateDescriptionEmpty'), 'warning', 5000)
      return
    }
    setIsGeneratingDescription(true)
    try {
      const text = await generateListingDescription(draft, formData.title?.trim() || '')
      setDescriptionCompareDraft(draft)
      setDescriptionCompareAi(text)
      setShowDescriptionCompareModal(true)
    } catch (e) {
      console.error(e)
      const msg =
        e?.message === 'GENERATE_LISTING_INVALID_API_KEY'
          ? t('addPropertyGenerateDescriptionInvalidApiKey')
          : t('addPropertyGenerateDescriptionError')
      showNotification(msg, 'error', e?.message === 'GENERATE_LISTING_INVALID_API_KEY' ? 9000 : 5000)
    } finally {
      setIsGeneratingDescription(false)
    }
  }

  const handleAcceptDescriptionCompare = () => {
    setFormData((prev) => ({ ...prev, description: descriptionCompareAi }))
    setShowDescriptionCompareModal(false)
    setDescriptionCompareDraft('')
    setDescriptionCompareAi('')
    showNotification(t('addPropertyGenerateDescriptionSuccess'), 'success', 4000)
  }

  const handleRejectDescriptionCompare = () => {
    setShowDescriptionCompareModal(false)
    setDescriptionCompareDraft('')
    setDescriptionCompareAi('')
    showNotification(t('addPropertyDescriptionCompareKeptYours'), 'info', 3500)
  }

  // Обработчик перехода к форме после заполнения названия
  const handlePropertyNameContinue = () => {
    if (!formData.title) {
      showNotification('Пожалуйста, введите название объекта')
      return
    }
    setCurrentStep('location')
  }

  /** Первый результат Nominatim (для карты по стране/городу) */
  const fetchNominatimFirst = async (query) => {
    if (!query || !String(query).trim()) return null
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(String(query).trim())}&limit=1&accept-language=ru&addressdetails=1`,
        { headers: { 'User-Agent': 'PropertyListingApp/1.0' } }
      )
      if (!response.ok) return null
      const data = await response.json()
      return data[0] || null
    } catch {
      return null
    }
  }

  // Поиск адреса через Nominatim API с учетом города
  // options.autoSelect = true — автоматически выбираем лучший результат и двигаем карту
  const searchAddress = async (query, { autoSelect = false } = {}) => {
    if (!query || query.length < 2) {
      setAddressSuggestions([])
      setShowSuggestions(false)
      setIsAddressSearching(false)
      return
    }

    setIsAddressSearching(true)
    try {
      let searchQuery = query.trim()
      
      // Если указан город, добавляем его в запрос
      if (formData.city) {
        const cityName = formData.city.split(',')[0].trim() // Берем только название города
        searchQuery = `${query.trim()}, ${cityName}`
        
        // Если также указана страна, добавляем и её
        if (formData.country) {
          searchQuery = `${query.trim()}, ${cityName}, ${formData.country}`
        }
      } else if (formData.country) {
        // Если указана только страна
        searchQuery = `${query.trim()}, ${formData.country}`
      }
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=10&accept-language=ru&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'PropertyListingApp/1.0'
          }
        }
      )
      
      if (!response.ok) {
        console.error('Ошибка API:', response.status)
        return
      }
      
      const data = await response.json()
      
      // Фильтруем результаты по городу, если город указан
      let addresses = data
      if (formData.city) {
        const cityName = formData.city.split(',')[0].trim().toLowerCase()
        addresses = data.filter(item => {
          const address = item.address || {}
          const displayName = item.display_name || ''
          
          // Проверяем город в адресе или в display_name
          const itemCity = (address.city || address.town || address.village || '').toLowerCase()
          const itemCityInName = displayName.toLowerCase().includes(cityName)
          
          return itemCity === cityName || itemCityInName
        })
        
        // Если после фильтрации нет результатов, показываем все
        if (addresses.length === 0 && data.length > 0) {
          addresses = data
        }
      }
      
      // Сортируем по важности
      addresses.sort((a, b) => (b.importance || 0) - (a.importance || 0))
      
      // Ограничиваем до 10 результатов
      addresses = addresses.slice(0, 10)
      
      setAddressSuggestions(addresses)
      setShowSuggestions(addresses.length > 0)

      // При необходимости автоматически выбираем лучший результат
      if (autoSelect && addresses.length > 0) {
        const best = addresses[0]
        const fullAddress = best.display_name
        const shortAddress = formatShortAddress(best)
        const lat = parseFloat(best.lat)
        const lng = parseFloat(best.lon)
        const coords = [lat, lng]

        const addressParts = best.address || {}
        const country = addressParts.country || ''
        const city = addressParts.city || addressParts.town || addressParts.village || ''

        // В инпуте показываем только короткий адрес
        setAddressSearch(shortAddress)
        // НЕ обновляем карту здесь - карта обновится только после выбора номера дома
        // setSelectedCoordinates(coords)
        // setMapCenter(coords)

        // Формируем адрес в правильном формате: страна, город, улица
        const formattedAddress = country && city 
          ? `${country}, ${city}, ${shortAddress}`
          : shortAddress

        setFormData(prev => ({
          ...prev,
          // address — короткий (улица), location — полный в правильном формате
          address: shortAddress,
          location: formattedAddress,
          // НЕ устанавливаем coordinates здесь - они установятся только после выбора номера дома
          // coordinates: coords,
          country: prev.country || country,
          city: prev.city || city
        }))
      }
      // Сбрасываем загрузку только после установки результатов
      setTimeout(() => {
        setIsAddressSearching(false)
      }, 100)
    } catch (error) {
      console.error('Ошибка поиска адреса:', error)
      setAddressSuggestions([])
      setShowSuggestions(false)
      setIsAddressSearching(false)
    }
  }

  // Debounce для поиска адреса
  useEffect(() => {
    if (addressSearch.length < 3 || !formData.city) {
      setAddressSuggestions([])
      setShowSuggestions(false)
      setIsAddressSearching(false)
      return
    }

    const timeoutId = setTimeout(() => {
      searchAddress(addressSearch)
    }, 700)

    return () => clearTimeout(timeoutId)
  }, [addressSearch, formData.city, formData.country])

  // Поиск городов через Nominatim API
  const searchCity = async (query, country = '') => {
    if (!query || query.length < 2) {
      setCitySuggestions([])
      setShowCitySuggestions(false)
      setIsCitySearching(false)
      return
    }

    setIsCitySearching(true)
    try {
      let searchQuery = query.trim()
      let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=20&accept-language=ru&addressdetails=1`
      
      // Если выбрана страна, добавляем её в запрос
      if (country) {
        searchQuery = `${query.trim()}, ${country}`
        url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=20&accept-language=ru&addressdetails=1`
      }
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'PropertyListingApp/1.0'
        }
      })
      
      if (!response.ok) {
        console.error('Ошибка API:', response.status)
        return
      }
      
      const data = await response.json()
      
      if (!data || data.length === 0) {
        setCitySuggestions([])
        setShowCitySuggestions(false)
        return
      }
      
      // Более мягкая фильтрация - принимаем все результаты, которые похожи на города
      let cities = data.filter(item => {
        const type = item.type || ''
        const classType = item.class || ''
        const importance = item.importance || 0
        
        // Проверяем, что это город или населенный пункт (более широкий список)
        const isCity = type === 'city' || 
                      type === 'town' || 
                      type === 'administrative' ||
                      classType === 'place' ||
                      type === 'village' ||
                      type === 'hamlet' ||
                      type === 'locality' ||
                      type === 'suburb'
        
        // Очень мягкий порог важности
        return isCity && importance > 0.05
      })
      
      // Если после фильтрации нет результатов, используем все данные
      if (cities.length === 0) {
        cities = data
      }
      
      // Если выбрана страна, дополнительно фильтруем по стране в адресе (более мягкая проверка)
      if (country && cities.length > 0) {
        const filteredByCountry = cities.filter(item => {
          const address = item.address || {}
          const itemCountry = address.country || ''
          const displayName = item.display_name || ''
          
          // Проверяем страну в адресе или в display_name
          return itemCountry.toLowerCase().includes(country.toLowerCase()) || 
                 country.toLowerCase().includes(itemCountry.toLowerCase()) ||
                 displayName.toLowerCase().includes(country.toLowerCase())
        })
        
        // Если есть результаты с фильтрацией по стране, используем их, иначе используем все
        if (filteredByCountry.length > 0) {
          cities = filteredByCountry
        }
      }
      
      // Сортируем по важности (более важные города первыми)
      cities.sort((a, b) => (b.importance || 0) - (a.importance || 0))
      
      // Ограничиваем до 10 результатов
      cities = cities.slice(0, 10)
      
      setCitySuggestions(cities)
      setShowCitySuggestions(cities.length > 0)
      // Сбрасываем загрузку только после установки результатов
      setTimeout(() => {
        setIsCitySearching(false)
      }, 100)
    } catch (error) {
      console.error('Ошибка поиска города:', error)
      setCitySuggestions([])
      setShowCitySuggestions(false)
      setIsCitySearching(false)
    }
  }

  // Обновление поиска при изменении страны (основной поиск в onChange)
  useEffect(() => {
    // Обновляем поиск только при изменении страны, если уже есть введенный текст
    if (citySearch && citySearch.length >= 2 && formData.country) {
      const timeoutId = setTimeout(() => {
        searchCity(citySearch, formData.country)
      }, 100)
      return () => clearTimeout(timeoutId)
    }
  }, [formData.country])

  // Карта: при вводе города подстраиваем центр под первый геокод (не только по клику в подсказке)
  useEffect(() => {
    if (!(USE_ADD_PROPERTY_SINGLE_PAGE || currentStep === 'location') || !formData.country) return
    const cityToken = (citySearch || '').split(',')[0].trim()
    if (cityToken.length < 2) return
    // Улица уже вводится/выбрана — не перебиваем точку на карте отложенным геокодом города
    if (addressSearch && addressSearch.trim().length > 0) return

    const timeoutId = setTimeout(async () => {
      const item = await fetchNominatimFirst(`${cityToken}, ${formData.country}`)
      if (!item) return
      const lat = parseFloat(item.lat)
      const lng = parseFloat(item.lon)
      if (isNaN(lat) || isNaN(lng)) return
      setMapCenter([lat, lng])
      setSelectedCoordinates([lat, lng])
      setLocationMapZoom(10)
    }, 750)

    return () => clearTimeout(timeoutId)
  }, [citySearch, formData.country, currentStep, addressSearch])

  // Обработчик выбора города
  const handleCitySelect = (city) => {
    // Заполняем поле полным адресом из подсказки
    const fullAddress = city.display_name
    setCitySearch(fullAddress)
    // Сохраняем только название города в formData.city
    const cityName = fullAddress.split(',')[0].trim()
    setFormData(prev => ({ ...prev, city: cityName }))
    const lat = parseFloat(city.lat)
    const lng = parseFloat(city.lon)
    if (!isNaN(lat) && !isNaN(lng)) {
      setMapCenter([lat, lng])
      setSelectedCoordinates([lat, lng])
      setLocationMapZoom(11)
    }
    setShowCitySuggestions(false)
    setIsCitySearching(false) // Сбрасываем состояние загрузки
    // Устанавливаем подсказки, чтобы показать галочку
    setCitySuggestions([city])
  }

  // Синхронизация citySearch с formData.city при изменении извне (только если citySearch пустой)
  useEffect(() => {
    if (!citySearch && formData.city) {
      setCitySearch(formData.city)
    }
  }, [])

  // Функция для форматирования короткого адреса (только улица и район)
  const formatShortAddress = (suggestion) => {
    const address = suggestion.address || {}
    // Пробуем разные поля для названия улицы
    const road = address.road || address.street || ''
    const suburb = address.suburb || ''
    const cityDistrict = address.city_district || ''
    const district = address.district || ''
    const neighbourhood = address.neighbourhood || ''
    
    // Определяем район (приоритет: suburb > city_district > district > neighbourhood)
    const districtName = suburb || cityDistrict || district || neighbourhood || ''
    
    // Формируем короткий адрес
    let shortAddress = ''
    if (road) {
      // Проверяем, есть ли уже префикс "улица" или "ул." в названии
      const roadLower = road.toLowerCase().trim()
      const hasStreetPrefix = roadLower.startsWith('улица') || 
                              roadLower.startsWith('ул.') || 
                              roadLower.startsWith('ул ')
      
      if (hasStreetPrefix) {
        shortAddress = road
      } else {
        shortAddress = `улица ${road}`
      }
      
      // Добавляем район, если есть
      if (districtName) {
        shortAddress += `, ${districtName}`
      }
    } else {
      // Если нет улицы в структурированных данных, пытаемся извлечь из display_name
      const displayName = suggestion.display_name || ''
      const parts = displayName.split(',').map(p => p.trim())
      
      // Ищем улицу в display_name (обычно содержит "улица", "ул.", "street" и т.д.)
      let foundStreet = ''
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i].toLowerCase()
        if (part.includes('улица') || part.includes('ул.') || 
            part.includes('ул ') || part.includes('street') ||
            part.includes('проспект') || part.includes('пр.') ||
            part.includes('проспект ') || part.includes('пр ')) {
          foundStreet = parts[i]
          break
        }
      }
      
      if (foundStreet) {
        shortAddress = foundStreet
        // Пытаемся найти район (обычно следующий элемент после улицы или содержит "район")
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i].toLowerCase()
          if (part.includes('район') || part.includes('district') || 
              part.includes('suburb') || part.includes('neighbourhood')) {
            if (shortAddress) {
              shortAddress += `, ${parts[i]}`
            }
            break
          }
        }
      }
    }
    
    // НИКОГДА не возвращаем display_name - только сформированный адрес или пустую строку
    return shortAddress
  }

  // Получение уникальных подсказок по короткому адресу (улица + район)
  const getUniqueAddressSuggestions = () => {
    const seenLabels = new Set()
    const unique = []

    addressSuggestions.forEach((suggestion) => {
      const label = formatShortAddress(suggestion)
      if (!label) return

      if (!seenLabels.has(label)) {
        seenLabels.add(label)
        unique.push({ suggestion, label })
      }
    })

    return unique
  }

  // Обработчик выбора адреса из предложений
  const handleAddressSelect = (suggestion) => {
    const shortAddress = formatShortAddress(suggestion)
    const lat = parseFloat(suggestion.lat)
    const lng = parseFloat(suggestion.lon)
    const coords = [lat, lng]
    
    // В поле ввода и в formData.address записываем короткий адрес (улица + район)
    setAddressSearch(shortAddress)
    // Сохраняем координаты для отображения на карте
    setSelectedCoordinates(coords)
    setMapCenter(coords)
    setLocationMapZoom(15)
    setShowSuggestions(false)
    setIsAddressSearching(false) // Сбрасываем состояние загрузки
    // Устанавливаем подсказки, чтобы показать галочку (храним исходный объект)
    setAddressSuggestions([suggestion])
    
    // Извлекаем страну и город из адреса
    const addressParts = suggestion.address || {}
    const country = addressParts.country || ''
    const city = addressParts.city || addressParts.town || addressParts.village || ''
    
    // Формируем адрес в правильном формате: страна, город, улица
    const formattedAddress = country && city 
      ? `${country}, ${city}, ${shortAddress}`
      : shortAddress
    
    setFormData(prev => ({
      ...prev,
      // Краткий вариант для отображения и отправки в поле "address"
      address: shortAddress,
      // Сохраняем адрес в правильном формате
      location: formattedAddress,
      coordinates: coords, // Сохраняем координаты для отображения на карте
      country: country,
      city: city,
      apartment: '',
    }))
  }

  const handleSinglePageMarkerDragEnd = useCallback(async ({ lat, lng }) => {
    const coords = [lat, lng]
    setSelectedCoordinates(coords)
    setMapCenter(coords)
    setLocationMapZoom(16)
    setFormData(prev => ({ ...prev, coordinates: coords }))
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&accept-language=ru&addressdetails=1`
      const response = await fetch(url, {
        headers: { 'User-Agent': 'PropertyListingApp/1.0' },
      })
      if (!response.ok) return
      const data = await response.json()
      const a = data.address || {}
      const country = a.country || ''
      const city =
        a.city || a.town || a.village || a.municipality || a.county || a.state || ''
      const road = a.road || ''
      const hn = a.house_number || ''
      const streetLine = [road, hn].filter(Boolean).join(', ')
      const display = typeof data.display_name === 'string' ? data.display_name : ''
      const shortAddr =
        streetLine ||
        display.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 2).join(', ')
      const formatted = country && city && shortAddr ? `${country}, ${city}, ${shortAddr}` : display || shortAddr

      setFormData((prev) => ({
        ...prev,
        country: country || prev.country,
        city: city || prev.city,
        address: shortAddr || prev.address,
        location: formatted || prev.location,
        coordinates: coords,
        apartment: hn || prev.apartment,
      }))
      if (city) setCitySearch(city)
      if (shortAddr) setAddressSearch(shortAddr)
    } catch (e) {
      console.warn('reverse geocode', e)
    }
  }, [])

  // Поиск домов (номер дома) на основе выбранной улицы
  const searchHouse = async (houseValue) => {
    if (!houseValue || !addressSearch || !formData.city) {
      setHouseSuggestions([])
      setShowHouseSuggestions(false)
      return
    }

    try {
      const streetPart = addressSearch.split(',')[0].trim()
      const searchQuery = `${streetPart} ${houseValue}, ${formData.city}, ${formData.country}`.trim()

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=10&accept-language=ru&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'PropertyListingApp/1.0'
          }
        }
      )

      if (!response.ok) {
        console.error('Ошибка поиска дома:', response.status)
        setHouseSuggestions([])
        setShowHouseSuggestions(false)
        return
      }

      const data = await response.json()
      
      // Фильтруем результаты: оставляем только те, где есть конкретный номер дома
      const filteredHouses = data.filter(item => {
        const address = item.address || {}
        const houseNumber = address.house_number || ''
        const displayName = item.display_name || ''
        
        // Проверяем наличие номера дома в address.house_number
        if (houseNumber && houseNumber.toString().toLowerCase().includes(houseValue.toLowerCase())) {
          return true
        }
        
        // Проверяем наличие номера дома в начале display_name (формат: "66 к1, улица..." или "улица ... 66")
        const houseRegex = new RegExp(`\\b${houseValue}\\b`, 'i')
        if (houseRegex.test(displayName)) {
          // Убеждаемся, что это не просто индекс или часть другого адреса
          // Проверяем, что номер дома находится в начале или после названия улицы
          const streetPart = addressSearch.split(',')[0].trim().toLowerCase()
          const displayLower = displayName.toLowerCase()
          
          // Если номер дома в начале адреса (например "66 к1, улица...") или после названия улицы
          if (displayLower.startsWith(houseValue.toLowerCase()) || 
              (displayLower.includes(streetPart) && displayLower.includes(houseValue.toLowerCase()))) {
            return true
          }
        }
        
        return false
      })
      
      setHouseSuggestions(filteredHouses)
      setShowHouseSuggestions(filteredHouses.length > 0)

      // Сразу обновляем маркер на наиболее релевантный дом, чтобы не требовался
      // повторный фокус/клик по полю улицы для корректной постановки точки.
      if (filteredHouses.length > 0) {
        const normalizedInput = String(houseValue || '').trim().toLowerCase()
        const exactMatch = filteredHouses.find((item) => {
          const hn = String(item?.address?.house_number || '').trim().toLowerCase()
          return hn && normalizedInput && hn === normalizedInput
        })
        const bestMatch = exactMatch || filteredHouses[0]
        applyHouseSelection(bestMatch, { closeSuggestions: false })
      }
    } catch (error) {
      console.error('Ошибка поиска дома:', error)
      setHouseSuggestions([])
      setShowHouseSuggestions(false)
    }
  }

  // Функция для форматирования адреса в формате: страна, город, улица, номер дома
  const formatShortAddressWithHouse = (suggestion) => {
    const address = suggestion.address || {}
    const country = address.country || ''
    const city = address.city || address.town || address.village || ''
    const houseNumber = address.house_number || ''
    const road = address.road || address.street || ''
    
    const parts = []
    
    // Страна (первым элементом)
    if (country) {
      parts.push(country)
    }
    
    // Город (вторым элементом)
    if (city) {
      parts.push(city)
    }
    
    // Улица (третьим элементом)
    if (road) {
      const roadLower = road.toLowerCase().trim()
      const hasStreetPrefix = roadLower.startsWith('улица') || 
                              roadLower.startsWith('ул.') || 
                              roadLower.startsWith('ул ')
      
      if (hasStreetPrefix) {
        parts.push(road)
      } else {
        parts.push(`улица ${road}`)
      }
    }
    
    // Номер дома (четвертым элементом)
    if (houseNumber) {
      parts.push(houseNumber)
    }
    
    // Если не удалось собрать адрес из структурированных данных, формируем из display_name
    if (parts.length === 0) {
      const displayName = suggestion.display_name || ''
      // Парсим display_name и берем только нужные части
      const displayParts = displayName.split(',').map(p => p.trim())
      
      // Ищем страну, город, улицу и номер дома в display_name
      // Обычно формат: номер, улица, район, город, индекс, страна
      // Нам нужно: страна, город, улица, номер
      
      // Ищем страну (обычно последний элемент или содержит название страны)
      let foundCountry = ''
      for (let i = displayParts.length - 1; i >= 0; i--) {
        const part = displayParts[i].toLowerCase()
        if (part.includes('беларусь') || part.includes('belarus') || 
            part.includes('россия') || part.includes('russia') ||
            part.includes('украина') || part.includes('ukraine') ||
            part.includes('казахстан') || part.includes('kazakhstan')) {
          foundCountry = displayParts[i]
          break
        }
      }
      if (foundCountry) {
        parts.push(foundCountry)
      }
      
      // Ищем город (обычно перед страной, содержит название крупного города)
      let foundCity = ''
      const countryIndex = foundCountry ? displayParts.indexOf(foundCountry) : displayParts.length
      for (let i = countryIndex - 1; i >= 0; i--) {
        const part = displayParts[i].toLowerCase()
        // Пропускаем индексы и районы
        if (!/^\d+$/.test(displayParts[i]) && 
            !part.includes('район') && 
            !part.includes('district') &&
            !part.includes('область') &&
            !part.includes('region')) {
          foundCity = displayParts[i]
          break
        }
      }
      if (foundCity) {
        parts.push(foundCity)
      }
      
      // Ищем улицу (обычно содержит "улица" или "ул." или "street")
      let foundStreet = ''
      for (let i = 0; i < displayParts.length; i++) {
        const part = displayParts[i].toLowerCase()
        if (part.includes('улица') || part.includes('ул.') || 
            part.includes('ул ') || part.includes('street') ||
            part.includes('проспект') || part.includes('пр.') ||
            part.includes('проспект ') || part.includes('пр ')) {
          foundStreet = displayParts[i]
          break
        }
      }
      if (foundStreet) {
        parts.push(foundStreet)
      }
      
      // Ищем номер дома (обычно первый элемент или число перед/после улицы)
      let foundHouse = ''
      if (foundStreet) {
        const streetIndex = displayParts.indexOf(foundStreet)
        // Ищем число рядом с улицей
        for (let i = Math.max(0, streetIndex - 1); i <= Math.min(displayParts.length - 1, streetIndex + 1); i++) {
          if (/^\d+/.test(displayParts[i]) && displayParts[i] !== foundStreet) {
            foundHouse = displayParts[i]
            break
          }
        }
      } else {
        // Если улицу не нашли, берем первое число
        for (let i = 0; i < displayParts.length; i++) {
          if (/^\d+/.test(displayParts[i])) {
            foundHouse = displayParts[i]
            break
          }
        }
      }
      if (foundHouse) {
        parts.push(foundHouse)
      }
    }
    
    // Если все еще пусто, пытаемся извлечь хотя бы страну и город из display_name
    if (parts.length === 0) {
      const displayName = suggestion.display_name || ''
      const displayParts = displayName.split(',').map(p => p.trim())
      
      // Ищем страну (обычно последний элемент)
      let foundCountry = ''
      for (let i = displayParts.length - 1; i >= 0; i--) {
        const part = displayParts[i].toLowerCase()
        if (part.includes('беларусь') || part.includes('belarus') || 
            part.includes('россия') || part.includes('russia') ||
            part.includes('украина') || part.includes('ukraine') ||
            part.includes('казахстан') || part.includes('kazakhstan')) {
          foundCountry = displayParts[i]
          break
        }
      }
      
      // Ищем город
      let foundCity = ''
      const countryIndex = foundCountry ? displayParts.indexOf(foundCountry) : displayParts.length
      for (let i = countryIndex - 1; i >= 0; i--) {
        const part = displayParts[i].toLowerCase()
        if (!/^\d+$/.test(displayParts[i]) && 
            !part.includes('район') && 
            !part.includes('district') &&
            !part.includes('область') &&
            !part.includes('region')) {
          foundCity = displayParts[i]
          break
        }
      }
      
      if (foundCountry && foundCity) {
        return `${foundCountry}, ${foundCity}`
      } else if (foundCountry) {
        return foundCountry
      } else if (foundCity) {
        return foundCity
      }
      
      // Если ничего не нашли, возвращаем пустую строку вместо display_name
      return ''
    }
    
    return parts.join(', ')
  }

  const applyHouseSelection = (suggestion, options = {}) => {
    const { closeSuggestions = true } = options
    const lat = parseFloat(suggestion.lat)
    const lng = parseFloat(suggestion.lon)
    if (isNaN(lat) || isNaN(lng)) return
    const coords = [lat, lng]

    const addressParts = suggestion.address || {}
    const country = addressParts.country || formData.country || ''
    const city = addressParts.city || addressParts.town || addressParts.village || formData.city || ''
    const houseNumber = String(addressParts.house_number || formData.apartment || '').trim()

    const streetShort =
      formatShortAddress(suggestion) || addressSearch.split(',')[0].trim()
    const formattedLocation =
      formatShortAddressWithHouse(suggestion) ||
      [country, city, streetShort, houseNumber].filter(Boolean).join(', ')

    setAddressSearch(streetShort)
    setSelectedCoordinates(coords)
    setMapCenter(coords)
    setLocationMapZoom(17)
    if (closeSuggestions) {
      setHouseSuggestions([])
      setShowHouseSuggestions(false)
    }

    setFormData(prev => ({
      ...prev,
      address: streetShort,
      location: formattedLocation,
      coordinates: coords,
      country: country || prev.country,
      city: city || prev.city,
      apartment: houseNumber
    }))
  }

  // Обработчик выбора дома из подсказок
  const handleHouseSelect = (suggestion) => {
    applyHouseSelection(suggestion, { closeSuggestions: true })
  }

  // Компонент для обновления центра карты
  const MapUpdater = ({ center, zoom = 15 }) => {
    const map = useMap()
    useEffect(() => {
      if (center && center.length === 2 && !isNaN(center[0]) && !isNaN(center[1])) {
        map.setView(center, zoom, { animate: true, duration: 0.5 })
      }
    }, [center, zoom, map])
    return null
  }

  // Обработчик перехода к подробной информации после заполнения местоположения
  const handleLocationContinue = () => {
    // Проверяем адрес в разных местах: formData.address, formData.location, addressSearch, savedLocationData
    const hasAddress = formData.address || 
                      formData.location || 
                      addressSearch || 
                      savedLocationData?.address || 
                      savedLocationData?.location
    
    if (!hasAddress || (typeof hasAddress === 'string' && hasAddress.trim().length === 0)) {
      showNotification('Пожалуйста, введите адрес')
      return
    }
    
    // Если адрес есть только в addressSearch или savedLocationData, но не в formData, сохраняем его
    if (!formData.address && !formData.location) {
      const addressToSave = addressSearch || savedLocationData?.address || savedLocationData?.location
      if (addressToSave) {
        setFormData(prev => ({
          ...prev,
          address: addressToSave,
          location: addressToSave
        }))
      }
    }
    
    setCurrentStep('details')
  }

  // Обработчик перехода к удобствам после заполнения подробной информации
  const handleDetailsContinue = () => {
    // Валидация всех полей
    const errors = {}
    const currentYear = new Date().getFullYear()
    const detailsTypeProfile = getSinglePageTypeProfile(formData.propertyTypeUi, formData.propertyType)
    
    // Проверка для квартиры и апартаментов
    if (detailsTypeProfile === 'apartment' || detailsTypeProfile === 'apartments') {
      // Проверка обязательных полей
      if (!formData.rooms || formData.rooms === '' || parseFloat(formData.rooms) <= 0) {
        errors.rooms = 'Укажите количество комнат'
      }
      if (!formData.bathrooms || formData.bathrooms === '' || parseFloat(formData.bathrooms) <= 0) {
        errors.bathrooms = 'Укажите количество ванных комнат'
      }
      if (!formData.area || formData.area === '' || parseFloat(formData.area) <= 0) {
        errors.area = 'Укажите общую площадь'
      }
      if (!formData.livingArea || formData.livingArea === '' || parseFloat(formData.livingArea) <= 0) {
        errors.livingArea = 'Укажите жилую площадь'
      }
      if (!formData.floor || formData.floor === '' || parseFloat(formData.floor) < 0) {
        errors.floor = 'Укажите этаж'
      }
      if (!formData.totalFloors || formData.totalFloors === '' || parseFloat(formData.totalFloors) <= 0) {
        errors.totalFloors = 'Укажите этажность'
      }
      if (!formData.yearBuilt || formData.yearBuilt === '' || parseFloat(formData.yearBuilt) <= 0) {
        errors.yearBuilt = 'Укажите год постройки'
      }
      if (!formData.buildingType || formData.buildingType === '') {
        errors.buildingType = 'Выберите тип дома/здания'
      }
      
      // Проверка года постройки - только что год не больше текущего
      const yearBuilt = parseFloat(formData.yearBuilt)
      if (yearBuilt > currentYear) {
        errors.yearBuilt = `Год постройки не может быть больше ${currentYear}`
      }
      
      // Проверка этажа и этажности
      const floor = parseFloat(formData.floor)
      const totalFloors = parseFloat(formData.totalFloors)
      if (floor > totalFloors) {
        errors.floor = `Этаж не может быть больше этажности (${totalFloors})`
      }
    }
    
    // Проверка для коммерческой недвижимости
    if (detailsTypeProfile === 'commercial') {
      if (!formData.area || formData.area === '' || parseFloat(formData.area) <= 0) {
        errors.area = 'Укажите площадь помещения'
      }
      if (!formData.commercialType || formData.commercialType === '') {
        errors.commercialType = 'Выберите тип коммерческого объекта'
      }
    }

    // Проверка для дома и виллы
    if (detailsTypeProfile === 'house' || detailsTypeProfile === 'villa') {
      // Проверка обязательных полей
      if (!formData.landArea || formData.landArea === '' || parseFloat(formData.landArea) <= 0) {
        errors.landArea = 'Укажите площадь участка'
      }
      if (!formData.area || formData.area === '' || parseFloat(formData.area) <= 0) {
        errors.area = 'Укажите площадь дома (общую)'
      }
      if (!formData.livingArea || formData.livingArea === '' || parseFloat(formData.livingArea) <= 0) {
        errors.livingArea = 'Укажите площадь дома (жилую)'
      }
      if (!formData.totalFloors || formData.totalFloors === '' || parseFloat(formData.totalFloors) <= 0) {
        errors.totalFloors = 'Укажите количество этажей'
      }
      // Важно: проверяем на undefined/null/пустую строку, но разрешаем 0 как валидное значение
      if (formData.bedrooms === undefined || formData.bedrooms === null || formData.bedrooms === '' || (formData.bedrooms !== '0' && parseFloat(formData.bedrooms) <= 0)) {
        errors.bedrooms = 'Укажите количество спален'
      }
      if (!formData.bathrooms || formData.bathrooms === '' || parseFloat(formData.bathrooms) <= 0) {
        errors.bathrooms = 'Укажите количество ванных комнат'
      }
      if (!formData.yearBuilt || formData.yearBuilt === '' || parseFloat(formData.yearBuilt) <= 0) {
        errors.yearBuilt = 'Укажите год постройки'
      }
      if (!formData.buildingType || formData.buildingType === '') {
        errors.buildingType = 'Выберите материал постройки'
      }
      
      // Проверка года постройки - только что год не больше текущего
      const yearBuilt = parseFloat(formData.yearBuilt)
      if (yearBuilt > currentYear) {
        errors.yearBuilt = `Год постройки не может быть больше ${currentYear}`
      }
    }

    // Проверка для земельного участка
    if (detailsTypeProfile === 'land') {
      if (!formData.landArea || formData.landArea === '' || parseFloat(formData.landArea) <= 0) {
        errors.landArea = 'Укажите площадь участка'
      }
      if (!formData.commercialType || formData.commercialType === '') {
        errors.commercialType = 'Выберите назначение участка'
      }
    }

    // Проверка для "другого"
    if (detailsTypeProfile === 'other') {
      if (!formData.area || formData.area === '' || parseFloat(formData.area) <= 0) {
        errors.area = 'Укажите площадь объекта'
      }
    }
    
    // Если есть ошибки, показываем их и не переходим дальше
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      // Прокручиваем к первому полю с ошибкой
      setTimeout(() => {
        const firstErrorField = Object.keys(errors)[0]
        // Ищем поле по имени или по классу с ошибкой
        let errorElement = document.querySelector(`input[type="number"][value*="${formData[firstErrorField]}"]`)
        if (!errorElement) {
          // Пытаемся найти по классу и значению
          const allInputs = document.querySelectorAll('.detail-form-input')
          for (let input of allInputs) {
            if (input.value === String(formData[firstErrorField] || '')) {
              errorElement = input
              break
            }
          }
        }
        // Если не нашли по значению, ищем select для buildingType
        if (!errorElement && firstErrorField === 'buildingType') {
          errorElement = document.querySelector('select.detail-form-select')
        }
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
          errorElement.focus()
        } else {
          // Если не нашли конкретное поле, прокручиваем к первому блоку с ошибкой
          const errorMessage = document.querySelector('.detail-form-error')
          if (errorMessage) {
            errorMessage.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }
      }, 100)
      return
    }
    
    // Очищаем ошибки
    setValidationErrors({})
    
    // Сохраняем данные о спальнях в formData
    // ВАЖНО: для домов/вилл НЕ перезаписываем bedrooms, если оно уже было введено в простое поле
    const isHouseOrVilla = detailsTypeProfile === 'house' || detailsTypeProfile === 'villa'
    setFormData(prev => {
      // Для домов/вилл сохраняем значение из простого поля ввода, если оно есть
      if (isHouseOrVilla && prev.bedrooms !== undefined && prev.bedrooms !== null && prev.bedrooms !== '') {
        return {
          ...prev,
          // Не перезаписываем bedrooms для домов/вилл
        }
      }
      // Для квартир/апартаментов вычисляем из массива спален
      return {
        ...prev,
        bedrooms: bedrooms.filter(b => getTotalBedsCount(b.beds) > 0).length
      }
    })
    setCurrentStep(formData.isDebtProperty ? 'photos' : 'amenities')
  }

  // Обработчик перехода к загрузке фотографий после заполнения удобств
  const handleAmenitiesContinue = () => {
    setCurrentStep('photos')
    // Обновляем объединенный массив медиа при переходе на страницу фотографий
    updateMediaItems()
  }

  // Функция для обновления объединенного массива медиа
  const updateMediaItems = () => {
    const allMedia = [
      ...photos.map(photo => ({ ...photo, mediaType: 'photo' })),
      ...videos.map(video => ({ ...video, mediaType: 'video' }))
    ]
    setMediaItems(allMedia)
    if (allMedia.length > 0 && photosMediaIndex >= allMedia.length) {
      setPhotosMediaIndex(0)
    }
  }

  // Обновляем mediaItems при изменении photos или videos
  useEffect(() => {
    if (currentStep === 'photos') {
      const allMedia = [
        ...photos.map(photo => ({ ...photo, mediaType: 'photo' })),
        ...videos.map(video => ({ ...video, mediaType: 'video' }))
      ]
      setMediaItems(allMedia)
      // Корректируем индекс, если он выходит за границы
      if (allMedia.length > 0) {
        setPhotosMediaIndex(prev => {
          if (prev >= allMedia.length) {
            return allMedia.length - 1
          }
          // Если индекс валидный, оставляем его, иначе переходим на последний элемент
          return prev < 0 ? 0 : prev
        })
      } else {
        setPhotosMediaIndex(0)
      }
    }
  }, [photos, videos, currentStep])

  // Навигация по карусели на странице фотографий
  const handleNextMedia = () => {
    const allMedia = [
      ...photos.map(photo => ({ ...photo, mediaType: 'photo' })),
      ...videos.map(video => ({ ...video, mediaType: 'video' }))
    ]
    if (allMedia.length > 0) {
      setPhotosMediaIndex((prev) => (prev + 1) % allMedia.length)
    }
  }

  const handlePrevMedia = () => {
    const allMedia = [
      ...photos.map(photo => ({ ...photo, mediaType: 'photo' })),
      ...videos.map(video => ({ ...video, mediaType: 'video' }))
    ]
    if (allMedia.length > 0) {
      setPhotosMediaIndex((prev) => (prev - 1 + allMedia.length) % allMedia.length)
    }
  }

  // Обработчик перехода к форме после загрузки фотографий
  const handlePhotosContinue = () => {
    if (photos.length === 0) {
      showNotification('Пожалуйста, загрузите хотя бы одно фото')
      return
    }
    setCurrentStep('documents')
    if (formData.isDebtProperty) setDebtDocumentsStep('required')
  }

  // Навигация к полю из виджета прогресса: переходим на нужный шаг и подсвечиваем поле
  const handleGoToField = (step, fieldId) => {
    setCurrentStep(step)
    setHighlightedField(fieldId)
    setTimeout(() => {
      const el = document.getElementById(fieldId)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.classList.add('ap-field-highlight')
        el.focus?.()
        setTimeout(() => el.classList.remove('ap-field-highlight'), 2000)
      }
      setHighlightedField(null)
    }, 150)
  }

  // Навигация к обязательному документу из виджета прогресса: показываем шаг с 7 обязательными
  const handleGoToDoc = (categoryKey, docId) => {
    setCurrentStep('documents')
    setDebtDocumentsStep('required')
    setSelectedDebtDocCategory(null)
    setMissingRequiredDebtDocs([])

    setTimeout(() => {
      const target = document.getElementById(`debt-required-${docId}`)
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' })
        target.classList.add('ap-doc-highlight')
        setTimeout(() => target.classList.remove('ap-doc-highlight'), 2200)
      }
    }, 300)
  }

  // Обработчик перехода к тест-драйву после загрузки документов
  const handleDocumentsContinue = () => {
    if (formData.isDebtProperty) {
      const missing = REQUIRED_DEBT_DOCS.filter(req =>
        !debtDocumentsByCategory[req.categoryKey]?.[req.docIndex]
      )

      // Шаг 1: только 7 обязательных — проверяем и переходим к шагу с 6 категориями
      if (debtDocumentsStep === 'required') {
        if (missing.length > 0) {
          setMissingRequiredDebtDocs(missing)
          const missingLabels = missing.map(m => `• ${t(m.labelKey)}`).join('\n')
          showNotification(
            `${t('addPropertyDebtUploadRequiredNotification')}:\n${missingLabels}`
          )
          return
        }
        setDebtDocumentsStep('categories')
        setMissingRequiredDebtDocs([])
        return
      }

      // Шаг 2: блок с 6 категориями — проверяем обязательные ещё раз и идём к цене
      if (missing.length > 0) {
        setMissingRequiredDebtDocs(missing)
        const missingLabels = missing.map(m => `• ${t(m.labelKey)}`).join('\n')
        showNotification(
          `${t('addPropertyDebtUploadRequiredNotification')}:\n${missingLabels}`
        )
        return
      }
    }

    setCurrentStep('test-drive-question')
  }

  // Обработчик перехода к форме после указания цены
  const handlePriceContinue = async () => {
    const mode = formData.listingMode || 'auction'
    const isShareMode = mode === 'shares'
    const isDebtMode = mode === 'debt'
    const isDebtAuctionMode = mode === 'debt_auction'
    const isAuctionMode = mode === 'auction' || mode === 'auction_buy_now' || mode === 'debt_auction'

    if (isShareMode) {
      // Для доли: обязательны общая цена и количество долей
      const priceNum = Number(removeCommas(String(formData.price || '')))
      const totalSharesNum = parseInt(formData.totalShares, 10)
      if (!formData.price || priceNum <= 0) {
        showNotification('Укажите общую стоимость объекта')
        return
      }
      if (!formData.totalShares || isNaN(totalSharesNum) || totalSharesNum <= 0) {
        showNotification('Укажите количество долей (целое число больше 0)')
        return
      }
    } else if (isDebtMode || isDebtAuctionMode) {
      // Для долгов: обязательна сумма долга, а в режиме debt_auction еще и аукционные поля.
      const debtAmountNum = Number(removeCommas(String(formData.debtAmount || '')))
      if (!formData.debtAmount || !Number.isFinite(debtAmountNum) || debtAmountNum <= 0) {
        showNotification('Укажите сумму долга')
        return
      }
      if (isDebtAuctionMode && (!formData.auctionStartDate || !formData.auctionEndDate)) {
        showNotification('Пожалуйста, укажите период проведения аукциона')
        return
      }
      const startingNumContinue = Number(removeCommas(String(formData.auctionStartingPrice || '0')))
      if (isDebtAuctionMode && (!formData.auctionStartingPrice || !Number.isFinite(startingNumContinue) || startingNumContinue <= 0)) {
        showNotification('Пожалуйста, укажите стартовую цену аукциона')
        return
      }
      if (isDebtAuctionMode) {
        const minNum = Number(removeCommas(String(formData.minimumSalePrice || '')))
        if (!formData.minimumSalePrice || !Number.isFinite(minNum) || minNum <= 0) {
          showNotification(t('addPropertyPriceMinimumSaleRequired'))
          return
        }
        const minVsBuyDebt = getMinimumSaleVsBuyNowError(formData.minimumSalePrice, formData.price)
        if (minVsBuyDebt) {
          setValidationErrors((prev) => ({ ...prev, minimumSalePrice: minVsBuyDebt }))
          showNotification(minVsBuyDebt)
          return
        }
      }
      const buyNowRuleErr = getAuctionStartingVsBuyNowError(formData.price, formData.auctionStartingPrice)
      if (isDebtAuctionMode && buyNowRuleErr) {
        setValidationErrors(prev => ({ ...prev, auctionStartingPrice: buyNowRuleErr }))
        showNotification(buyNowRuleErr)
        return
      }
    } else {
      // Для аукционных режимов: проверяем поля аукциона.
      if (isAuctionMode && (!formData.auctionStartDate || !formData.auctionEndDate)) {
        showNotification('Пожалуйста, укажите период проведения аукциона')
        return
      }
      const startingNumContinue = Number(removeCommas(String(formData.auctionStartingPrice || '')))
      if (isAuctionMode && (!formData.auctionStartingPrice || !Number.isFinite(startingNumContinue) || startingNumContinue <= 0)) {
        showNotification('Пожалуйста, укажите стартовую цену аукциона')
        return
      }
      const minSaleNumContinue = Number(removeCommas(String(formData.minimumSalePrice || '')))
      if (isAuctionMode && (!formData.minimumSalePrice || !Number.isFinite(minSaleNumContinue) || minSaleNumContinue <= 0)) {
        showNotification(t('addPropertyPriceMinimumSaleRequired'))
        return
      }
      const buyNowRuleErr = getAuctionStartingVsBuyNowError(mode === 'auction_buy_now' ? formData.price : '', formData.auctionStartingPrice)
      if (mode === 'auction_buy_now' && buyNowRuleErr) {
        setValidationErrors(prev => ({ ...prev, auctionStartingPrice: buyNowRuleErr }))
        showNotification(buyNowRuleErr)
        return
      }
      if (mode === 'auction_buy_now') {
        const buyNowNum = Number(removeCommas(String(formData.price || '')))
        if (!formData.price || !Number.isFinite(buyNowNum) || buyNowNum <= 0) {
          showNotification('Для режима "Аукцион + Продать сейчас" укажите цену "Продать сейчас"')
          return
        }
        const minVsBuy = getMinimumSaleVsBuyNowError(formData.minimumSalePrice, formData.price)
        if (minVsBuy) {
          setValidationErrors((prev) => ({ ...prev, minimumSalePrice: minVsBuy }))
          showNotification(minVsBuy)
          return
        }
      }
    }

    // Для редактирования повторная оплата публикации не требуется.
    // Сразу отправляем изменения на модерацию/обновление.
    if (isEditMode) {
      await handlePublish()
      return
    }

    // Пока модалка оплаты открыта — остаёмся на шаге цены, чтобы фон оставался узнаваемым
    // Шаг «Публикация» (форма) — только после успешного промокода / оплаты
    setShowListingFeeModal(true)
    setShowPromoInputInFeeModal(false)
    setListingFeePromoCode('')
    setListingFeePromoError(null)
  }

  // После успешной «оплаты» (промокод и т.д.): публикация или окно KYC.
  // Статус берём из API (is_verified / pending-документы), а не из localStorage cardBound — иначе у Clerk/Google
  // модалка не открывалась из‑за чужого/устаревшего флага в браузере.
  const handleAfterListingFeeSuccess = async () => {
    if (!userId) {
      setShowListingFeeModal(false)
      requestOpenLoginModal({ wizard: true })
      return
    }

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'
    let canPublishWithoutSellerKyc = false

    try {
      const res = await fetch(`${API_BASE_URL}/users/${userId}/verification-status`)
      const data = await res.json().catch(() => ({}))
      if (data.success && data.data) {
        const { isVerified, hasDocuments } = data.data
        if (isVerified === true || hasDocuments === true) {
          canPublishWithoutSellerKyc = true
        }
      }
    } catch (e) {
      console.warn('AddProperty: не удалось загрузить verification-status', e)
    }

    setShowListingFeeModal(false)

    if (canPublishWithoutSellerKyc) {
      const success = await handlePublish()
      if (success) {
        listingPublishedAfterFeeRef.current = true
      }
    } else {
      setShowVerificationModal(true)
    }
  }

  const handleListingFeePayCard = async () => {
    if (!userId) {
      requestOpenLoginModal({ wizard: true })
      return
    }
    const uid = String(userId).trim()
    if (!/^\d+$/.test(uid)) {
      showNotification(
        'Для оплаты нужен числовой id пользователя в базе. Подождите синхронизацию после входа или обновите страницу.',
        'error'
      )
      return
    }
    setListingFeeStripeLoading(true)
    try {
      // Сразу сохранить черновик с документами (до редиректа debounce мог не успеть)
      const [ownSer, ndSer] = await Promise.all([
        draftDocToSerializable(requiredDocuments.ownership),
        draftDocToSerializable(requiredDocuments.noDebts),
      ])
      const debtSer = await serializeDebtDocsForDraft(debtDocumentsByCategory)
      saveDraftPayload(
        {
          formData,
          currentStep,
          photos: photos.map((p) => ({ id: p.id, url: p.url })),
          videos: videos.map((v) => ({ ...v })),
          bedrooms,
          guests,
          addressSearch,
          selectedCoordinates,
          mapCenter,
          locationMapZoom,
          citySearch,
          currency,
          areaUnit,
          savedLocationData,
          showHints,
          showHint1,
          showHint2,
          additionalDocuments: additionalDocuments.map((d) => ({ name: d.name, url: d.url, type: d.type })),
          requiredDocuments: { ownership: ownSer, noDebts: ndSer },
          debtDocumentsByCategory: debtSer,
          debtDocumentsStep,
        },
        draftKey
      )

      const ud = getUserData()
      const customerEmail = ud?.email || undefined
      const result = await startListingPublicationCheckout({
        userId: uid,
        customerEmail,
        returnPath: location.pathname || '/owner/property/new',
      })
      if (!result.ok) {
        showNotification(result.error || 'Не удалось перейти к оплате', 'error')
      }
    } catch (e) {
      showNotification(e?.message || 'Ошибка при запуске оплаты', 'error')
    } finally {
      setListingFeeStripeLoading(false)
    }
  }

  const handleApplyListingFeePromo = async () => {
    const code = (listingFeePromoCode || '').trim()
    if (!code) {
      setListingFeePromoError('Введите промокод')
      return
    }
    if (!userId) {
      requestOpenLoginModal({ wizard: true })
      return
    }
    setListingFeePromoError(null)
    setListingFeePromoLoading(true)
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'
      const res = await fetch(`${API_BASE_URL}/bonus-submissions/use-promo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, promo_code: code }),
      })
      const data = await res.json()
      if (data.success) {
        notifyBonusSubmissionsChanged()
        setShowListingFeeModal(false)
        setShowPromoInputInFeeModal(false)
        setListingFeePromoCode('')
        setListingFeePromoError(null)
        await handleAfterListingFeeSuccess()
      } else {
        if (data.reason === 'used') {
          setListingFeePromoError('Этот промокод уже был использован')
        } else {
          setListingFeePromoError(data.message || 'Промокод не найден или не подходит')
        }
      }
    } catch (e) {
      setListingFeePromoError('Ошибка сети. Попробуйте позже.')
    } finally {
      setListingFeePromoLoading(false)
    }
  }

  // При возврате со страницы бонусов — снова открыть модалку оплаты публикации
  useEffect(() => {
    if (isEditMode) return
    if (location.state?.openListingFeeModal) {
      setCurrentStep('price')
      setShowListingFeeModal(true)
      setShowPromoInputInFeeModal(false)
      setListingFeePromoCode('')
      setListingFeePromoError(null)
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [isEditMode, location.state?.openListingFeeModal, location.pathname, navigate])

  // Возврат с Stripe после оплаты публикации (как резерв «Купить сейчас»)
  useEffect(() => {
    const checkout = searchParams.get('listing_fee_checkout')
    const sessionId = searchParams.get('session_id')

    if (checkout === 'canceled') {
      const next = new URLSearchParams(searchParams)
      next.delete('listing_fee_checkout')
      next.delete('session_id')
      setSearchParams(next, { replace: true })
      if (!isEditMode) {
        setCurrentStep('price')
        setShowListingFeeModal(true)
        setShowPromoInputInFeeModal(false)
        setListingFeePromoCode('')
        setListingFeePromoError(null)
      }
      return
    }

    if (checkout !== 'success' || !sessionId || !sessionId.startsWith('cs_')) return
    if (!userId) return
    if (listingFeeCheckoutHandledRef.current === sessionId) return

    let cancelled = false
    const run = async () => {
      listingFeeCheckoutHandledRef.current = sessionId
      try {
        const result = await confirmListingPublicationFeeSession(sessionId, String(userId))
        if (cancelled) return
        if (result.ok) {
          if (result.data?.already) {
            showNotification('Оплата публикации уже была учтена ранее.')
          } else {
            showNotification('Оплата получена. Продолжаем публикацию.')
          }
          const next = new URLSearchParams(searchParams)
          next.delete('listing_fee_checkout')
          next.delete('session_id')
          setSearchParams(next, { replace: true })
          await handleAfterListingFeeSuccess()
        } else {
          showNotification(result.error || 'Не удалось подтвердить оплату', 'error')
          listingFeeCheckoutHandledRef.current = null
        }
      } catch (e) {
        if (!cancelled) {
          showNotification(e?.message || 'Ошибка подтверждения оплаты', 'error')
          listingFeeCheckoutHandledRef.current = null
        }
      }
    }
    run()
    return () => {
      cancelled = true
    }
    // handleAfterListingFeeSuccess меняется каждый рендер — намеренно не в deps (как PropertyDetail + Stripe)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, userId, setSearchParams, isEditMode])

  // Единый скролл для страницы добавления объекта:
  // прокрутка должна идти через глобальный .app-layout, без локального скролла блока формы.
  useEffect(() => {
    const appLayoutEl = document.querySelector('.app-layout')
    if (!appLayoutEl) return undefined

    appLayoutEl.classList.add('app-layout--add-property-single-scroll')
    return () => {
      appLayoutEl.classList.remove('app-layout--add-property-single-scroll')
    }
  }, [])

  // Обработчик drag and drop для фотографий
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    if (imageFiles.length > 0) {
      const remainingSlots = 10 - photos.length
      if (imageFiles.length > remainingSlots) {
        showNotification(`Можно загрузить максимум ${remainingSlots} фото`)
        return
      }
      imageFiles.forEach(file => {
        const reader = new FileReader()
        reader.onloadend = () => {
          setPhotos(prev => [...prev, {
            id: Date.now() + Math.random(),
            url: reader.result,
            file: file
          }])
        }
        reader.readAsDataURL(file)
      })
    }
  }

  // Функция для получения текста типа кровати
  const getBedTypeLabel = (bedType) => {
    const labels = {
      'twin': 'односпальная кровать',
      'full': 'двуспальная кровать',
      'queen': 'кровать размера queen',
      'king': 'кровать размера king',
      'sofa': 'диван',
      'none': 'кроватей'
    }
    return labels[bedType] || 'кровать'
  }

  // Функция для получения размера кровати
  const getBedSize = (bedType) => {
    const sizes = {
      'twin': '35-51 дюймов шириной',
      'full': '52-59 дюймов шириной',
      'queen': '60-70 дюймов шириной',
      'king': '71-81 дюймов шириной'
    }
    return sizes[bedType] || ''
  }

  // Подсчет общего количества кроватей в спальне
  const getTotalBedsCount = (beds) => {
    return beds.reduce((total, bed) => total + bed.count, 0)
  }

  // Получение текста для отображения кроватей
  const getBedsDisplayText = (beds) => {
    const total = getTotalBedsCount(beds)
    if (total === 0) return '0 кроватей'
    
    const bedTypes = beds.filter(b => b.count > 0)
    if (bedTypes.length === 1) {
      const bed = bedTypes[0]
      return `${bed.count} ${getBedTypeLabel(bed.type)}`
    }
    return `${total} кроватей`
  }

  // Открытие модального окна для редактирования кроватей
  const handleEditBedroom = (bedroom) => {
    setSelectedBedroom(bedroom)
    setShowBedModal(true)
  }

  // Сохранение изменений кроватей
  const handleSaveBeds = (bedroomId, beds) => {
    setBedrooms(bedrooms.map(b => 
      b.id === bedroomId ? { ...b, beds: beds } : b
    ))
    setShowBedModal(false)
    setSelectedBedroom(null)
  }

  // Изменение количества кроватей определенного типа
  const handleBedCountChange = (bedType, delta) => {
    if (!selectedBedroom) return
    
    const currentBeds = [...selectedBedroom.beds]
    const bedIndex = currentBeds.findIndex(b => b.type === bedType)
    
    if (bedIndex >= 0) {
      const newCount = Math.max(0, currentBeds[bedIndex].count + delta)
      if (newCount === 0) {
        currentBeds.splice(bedIndex, 1)
      } else {
        currentBeds[bedIndex].count = newCount
      }
    } else if (delta > 0) {
      currentBeds.push({ type: bedType, count: 1 })
    }
    
    setSelectedBedroom({ ...selectedBedroom, beds: currentBeds })
  }

  // Получение количества кроватей определенного типа
  const getBedCount = (bedType) => {
    if (!selectedBedroom) return 0
    const bed = selectedBedroom.beds.find(b => b.type === bedType)
    return bed ? bed.count : 0
  }

  // Добавление новой спальни
  const handleAddBedroom = () => {
    const bedroomNumber = bedrooms.filter(b => b.name.startsWith('Спальня')).length + 1
    const newBedroom = {
      id: Date.now(),
      name: `Спальня ${bedroomNumber}`,
      beds: []
    }
    setBedrooms([...bedrooms, newBedroom])
  }

  // Удаление спальни
  const handleRemoveBedroom = (id) => {
    setBedrooms(bedrooms.filter(b => b.id !== id))
  }

  // Компонент для отображения подсказок
  const HintCard = ({ icon: Icon, iconColor, title, content, onClose, show }) => {
    if (!show) return null;
    
    return (
      <div className="property-name-hint-card">
        <div className="property-name-hint-header">
          <div className={`property-name-hint-icon ${iconColor || 'property-name-hint-icon--thumbs'}`}>
            {Icon && <Icon size={20} />}
          </div>
          <h3 className="property-name-hint-title">{title}</h3>
          <button
            type="button"
            className="property-name-hint-close"
            onClick={onClose}
          >
            <FiX size={18} />
          </button>
        </div>
        {Array.isArray(content) ? (
          <ul className="property-name-hint-list">
            {content.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        ) : (
          <p className="property-name-hint-text">{content}</p>
        )}
      </div>
    );
  };

  /* Пока открыта оплата публикации — под модалкой всегда экран цены (не форма публикации) */
  const wizardRenderStep = showListingFeeModal ? 'price' : currentStep
  const useSinglePageFlow = USE_ADD_PROPERTY_SINGLE_PAGE

  const singlePageTypeProfile = useMemo(
    () => getSinglePageTypeProfile(formData.propertyTypeUi, formData.propertyType),
    [formData.propertyTypeUi, formData.propertyType]
  )

  const hasType = !!formData.propertyType
  const hasPropertyName = !!((formData.title || '').trim() && (formData.description || '').trim())
  const hasAddress = !!((formData.location || formData.address || '').trim())
  const hasDetails = (() => {
    if (!hasType) return false
    if (singlePageTypeProfile === 'apartment' || singlePageTypeProfile === 'apartments') {
      return Number(formData.rooms) > 0 && Number(formData.area) > 0
    }
    if (singlePageTypeProfile === 'house' || singlePageTypeProfile === 'villa') {
      return Number(formData.landArea) > 0 && Number(formData.area) > 0
    }
    if (singlePageTypeProfile === 'commercial') {
      return Number(formData.area) > 0 && !!(formData.commercialType || '').trim()
    }
    if (singlePageTypeProfile === 'land') {
      return Number(formData.landArea) > 0 && !!(formData.commercialType || '').trim()
    }
    if (singlePageTypeProfile === 'other') {
      return Number(formData.area) > 0
    }
    return Number(formData.area) > 0
  })()
  const hasAmenities = !!(
    (formData.additionalAmenities || '').trim() ||
    SINGLE_PAGE_AMENITY_FORM_KEYS.some((key) => formData[key])
  )

  const singlePageAmenityGroups = useMemo(
    () => buildSinglePageAmenityGroups(t, singlePageTypeProfile),
    [t, singlePageTypeProfile]
  )
  const hasMedia = photos.length > 0 || videos.length > 0
  const hasDocuments = !!(
    requiredDocuments.ownership ||
    requiredDocuments.noDebts ||
    (additionalDocuments && additionalDocuments.length > 0)
  )
  const singlePageMapCoords =
    getValidCoordsForPreview(selectedCoordinates) ||
    getValidCoordsForPreview(mapCenter) ||
    getValidCoordsForPreview(formData.coordinates)
  const hasTestDrive = formData.testDrive === false || (formData.testDrive === true && Number(formData.testDrivePricePerDay) > 0)
  const hasListingType = !!formData.listingMode
  const hasPrice = (() => {
    const mode = formData.listingMode || 'auction'
    if (mode === 'shares') return Number(removeCommas(String(formData.price || ''))) > 0 && Number(formData.totalShares) > 0
    if (mode === 'debt') return Number(removeCommas(String(formData.debtAmount || ''))) > 0
    if (mode === 'debt_auction') {
      return (
        Number(removeCommas(String(formData.debtAmount || ''))) > 0 &&
        Number(removeCommas(String(formData.auctionStartingPrice || ''))) > 0 &&
        Number(removeCommas(String(formData.minimumSalePrice || ''))) > 0
      )
    }
    if (mode === 'auction_buy_now') {
      return (
        Number(removeCommas(String(formData.minimumSalePrice || ''))) > 0 &&
        Number(removeCommas(String(formData.price || ''))) > 0 &&
        Number(removeCommas(String(formData.auctionStartingPrice || ''))) > 0
      )
    }
    if (mode === 'auction') {
      return (
        Number(removeCommas(String(formData.minimumSalePrice || ''))) > 0 &&
        Number(removeCommas(String(formData.auctionStartingPrice || ''))) > 0
      )
    }
    return Number(removeCommas(String(formData.auctionStartingPrice || ''))) > 0
  })()

  const spAuctionAmountStepIds = useMemo(() => {
    const m = formData.listingMode
    if (m === 'auction') return ['minimum_sale', 'starting']
    if (m === 'auction_buy_now' || m === 'debt_auction') return ['minimum_sale', 'buy_now', 'starting']
    return []
  }, [formData.listingMode])

  const spCurAuctionAmountStepId = spAuctionAmountStepIds[spAuctionAmountStepIndex] ?? null

  const spEnteredAmountSummaryRows = useMemo(() => {
    const sym = quickCurrencies.find((c) => c.code === currency)?.symbol || '$'
    const fmt = (raw) => {
      const digits = String(raw ?? '').replace(/\D/g, '')
      if (!digits) return null
      return `${sym}${formatNumberWithCommas(digits)}`
    }
    const rows = []
    for (const sid of spAuctionAmountStepIds) {
      if (sid === 'minimum_sale') {
        rows.push({ key: 'minimum_sale', label: t('addPropertyPriceStepMinTitle'), value: fmt(formData.minimumSalePrice) })
      } else if (sid === 'buy_now') {
        rows.push({ key: 'buy_now', label: t('addPropertyPriceStepBuyNowTitle'), value: fmt(formData.price) })
      } else if (sid === 'starting') {
        rows.push({ key: 'starting', label: t('addPropertyPriceStartingBidLabel'), value: fmt(formData.auctionStartingPrice) })
      }
    }
    return rows
  }, [spAuctionAmountStepIds, formData.minimumSalePrice, formData.price, formData.auctionStartingPrice, currency, t])

  useEffect(() => {
    if (['auction', 'auction_buy_now', 'debt_auction'].includes(formData.listingMode)) {
      setSpAuctionAmountStepIndex(0)
    }
  }, [formData.listingMode])

  const handleSpAuctionAmountStepNext = () => {
    const stepIds = spAuctionAmountStepIds
    const cur = stepIds[spAuctionAmountStepIndex]
    if (!cur) return
    if (cur === 'minimum_sale') {
      const n = Number(removeCommas(String(formData.minimumSalePrice || '')))
      if (!formData.minimumSalePrice || !Number.isFinite(n) || n <= 0) {
        showNotification(t('addPropertyPriceMinimumSaleRequired'))
        return
      }
    }
    if (cur === 'buy_now') {
      if (formData.listingMode === 'auction_buy_now') {
        const n = Number(removeCommas(String(formData.price || '')))
        if (!formData.price || !Number.isFinite(n) || n <= 0) {
          showNotification(t('addPropertyPriceBuyNowRequired'))
          return
        }
      }
      const minVs = getMinimumSaleVsBuyNowError(formData.minimumSalePrice, formData.price)
      if (minVs) {
        showNotification(minVs)
        setValidationErrors((prev) => ({ ...prev, minimumSalePrice: minVs }))
        return
      }
      setValidationErrors((prev) => {
        const next = { ...prev }
        delete next.minimumSalePrice
        return next
      })
    }
    if (cur === 'starting') {
      const n = Number(removeCommas(String(formData.auctionStartingPrice || '')))
      if (!formData.auctionStartingPrice || !Number.isFinite(n) || n <= 0) {
        showNotification(t('addPropertyPriceStartingBidRequired'))
        return
      }
      const startErr = getAuctionStartingVsBuyNowError(
        formData.listingMode === 'auction' ? '' : formData.price,
        formData.auctionStartingPrice
      )
      if (startErr) {
        showNotification(startErr)
        setValidationErrors((prev) => ({ ...prev, auctionStartingPrice: startErr }))
        return
      }
      setValidationErrors((prev) => {
        const next = { ...prev }
        delete next.auctionStartingPrice
        return next
      })
    }
    if (spAuctionAmountStepIndex < stepIds.length - 1) {
      setSpAuctionAmountStepIndex((i) => i + 1)
    }
  }

  const handleApplyCalculatedPrice = useCallback((recommendedPrice) => {
    const rec = Math.max(0, Math.round(Number(recommendedPrice) || 0))
    if (!rec) return

    /** От рекомендации: −15% → «Продать сейчас»; от неё −10% → минимум; старт ≤30% от «Продать сейчас». */
    const buyNowFromRec = Math.round(rec * 0.85)
    const minSaleFromRec = Math.round(buyNowFromRec * 0.9)
    const startingFromRec = Math.round(buyNowFromRec * 0.3)

    setFormData((prev) => {
      const mode = prev.listingMode || 'auction'

      if (mode === 'shares') {
        return { ...prev, price: String(rec) }
      }
      if (mode === 'debt') {
        return { ...prev, debtAmount: String(rec) }
      }

      if (mode === 'auction_buy_now' || mode === 'debt_auction') {
        return {
          ...prev,
          price: String(buyNowFromRec),
          minimumSalePrice: String(minSaleFromRec),
          auctionStartingPrice: String(startingFromRec)
        }
      }

      if (mode === 'auction') {
        return {
          ...prev,
          minimumSalePrice: String(minSaleFromRec),
          auctionStartingPrice: String(startingFromRec)
        }
      }

      const next = { ...prev, auctionStartingPrice: String(startingFromRec) }
      if (!prev.price || Number(removeCommas(String(prev.price))) <= 0) {
        next.price = String(buyNowFromRec || rec)
      }
      return next
    })

    setValidationErrors((prev) => {
      const next = { ...prev }
      delete next.minimumSalePrice
      delete next.auctionStartingPrice
      delete next.price
      return next
    })

    // Не закрываем модалку: пользователь видит рекомендацию, похожие объявления и источники; закрытие — «Закрыть» / крестик.
    setCalculatorGuidanceApplied(true)
    showNotification(t('addPropertyCalculatorAppliedFromRecommended'), 'success')
  }, [t])

  /** Single-page: шаг «Оценка» — расчёт или уже введённые суммы (чтобы прогресс не блокировался) */
  const hasPriceCalculatorStepDone = calculatorGuidanceApplied || hasPrice

  const singlePageSections = [
    hasType,
    hasPropertyName,
    hasAddress,
    hasDetails,
    hasAmenities,
    hasMedia,
    hasDocuments,
    hasTestDrive,
    hasListingType,
    hasPriceCalculatorStepDone,
    hasPrice,
  ]
  const completedSinglePageSections = singlePageSections.filter(Boolean).length
  const singlePageProgress = Math.round((completedSinglePageSections / singlePageSections.length) * 100)
  const stepFlow = [
    { id: 'type-selection', label: 'Тип' },
    { id: 'property-name', label: 'Описание' },
    { id: 'location', label: 'Адрес' },
    { id: 'details', label: 'Параметры' },
    { id: 'amenities', label: 'Удобства' },
    { id: 'photos', label: 'Фото/видео' },
    { id: 'documents', label: 'Документы' },
    { id: 'test-drive-question', label: 'Тест-драйв' },
    { id: 'listing-type', label: 'Размещение' },
    { id: 'price-calculator', label: 'Оценка' },
    { id: 'price', label: 'Цена' },
  ]
  const currentStepForProgress = wizardRenderStep === 'test-drive-pricing' ? 'test-drive-question' : wizardRenderStep
  const currentStepIndex = Math.max(0, stepFlow.findIndex(step => step.id === currentStepForProgress))
  const progressPercent = useSinglePageFlow
    ? singlePageProgress
    : Math.round((currentStepIndex / stepFlow.length) * 100)
  const remainingSteps = Math.max(0, stepFlow.length - (currentStepIndex + 1))
  const singlePageStepDoneMap = {
    'type-selection': hasType,
    'property-name': hasPropertyName,
    'location': hasAddress,
    'details': hasDetails,
    'amenities': hasAmenities,
    'photos': hasMedia,
    'documents': hasDocuments,
    'test-drive-question': hasTestDrive,
    'listing-type': hasListingType,
    'price-calculator': hasPriceCalculatorStepDone,
    'price': hasPrice,
  }

  const singlePageSpSectionDone = useMemo(
    () => ({
      type: hasType,
      'property-name': hasPropertyName,
      address: hasAddress,
      details: hasDetails,
      amenities: hasAmenities,
      media: hasMedia,
      documents: hasDocuments,
      testdrive: hasTestDrive,
      listing: hasListingType,
      calculator: hasPriceCalculatorStepDone,
      price: hasPrice,
    }),
    [
      hasType,
      hasPropertyName,
      hasAddress,
      hasDetails,
      hasAmenities,
      hasMedia,
      hasDocuments,
      hasTestDrive,
      hasListingType,
      hasPriceCalculatorStepDone,
      hasPrice,
    ]
  )

  const isSpSectionBodyVisible = (sectionId) => {
    if (!useSinglePageFlow) return true
    const done = singlePageSpSectionDone[sectionId]
    if (!done) return true
    return spSectionUserExpanded[sectionId] === true
  }

  const toggleSpSectionCollapse = (sectionId) => {
    if (!useSinglePageFlow) return
    if (!singlePageSpSectionDone[sectionId]) return
    setSpSectionUserExpanded((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }))
  }

  const applyListingModeFromSinglePage = (mode) => {
    setExpandedListingModeId(null)
    setSpAuctionAmountStepIndex(0)
    setCalculatorGuidanceApplied(false)
    setFormData((prev) => ({
      ...prev,
      listingMode: mode,
      isShareProperty: mode === 'shares',
      isDebtProperty: mode === 'debt' || mode === 'debt_auction',
      isAuction: mode === 'auction' || mode === 'auction_buy_now' || mode === 'debt_auction',
      testDrive:
        mode === 'shares' || mode === 'debt' || mode === 'debt_auction' ? false : prev.testDrive,
    }))
    setShowListingModePicker(false)
  }

  const spGuideCopy =
    SINGLE_PAGE_SECTION_HELP[spActiveSection] || SINGLE_PAGE_SECTION_HELP.type

  useEffect(() => {
    if (!useSinglePageFlow) return
    let observer
    const timer = window.setTimeout(() => {
      const sections = document.querySelectorAll('[data-sp-section]')
      if (!sections.length) return
      observer = new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter((e) => e.isIntersecting && e.intersectionRatio >= 0.18)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
          const id = visible[0]?.target?.getAttribute('data-sp-section')
          if (id) setSpActiveSection(id)
        },
        { root: null, threshold: [0.18, 0.35, 0.55], rootMargin: '-10% 0px -38% 0px' }
      )
      sections.forEach((el) => observer.observe(el))
    }, 80)
    return () => {
      window.clearTimeout(timer)
      if (observer) observer.disconnect()
    }
  }, [
    useSinglePageFlow,
    formData.propertyType,
    formData.listingMode,
    formData.city,
    hasType,
    hasAddress,
    hasDetails,
    hasAmenities,
    hasMedia,
    hasDocuments,
    hasTestDrive,
    hasListingType,
  ])

  // Чтобы при переходе между шагами страница/контейнер начинались сверху,
  // а не с позиции скролла, на которой пользователь выбрал прошлый пункт.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        scrollMainTo(0, 0, 'auto')
      } catch {
        scrollMainTo(0, 0)
      }
    }

    // Дополнительно сбрасываем скролл у внутренних областей (если они используются на шагах).
    try {
      const scrollables = document.querySelectorAll(
        '.property-details-content-scrollable, .details-content-scrollable'
      )
      scrollables.forEach((el) => {
        el.scrollTop = 0
      })
    } catch {
      // ignore
    }
  }, [wizardRenderStep])

  return (
    <div className="add-property-page">
      <div className="add-property-container">
        <div className="add-property-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              className="back-btn"
              onClick={() => {
                if (showListingFeeModal) {
                  setShowListingFeeModal(false)
                  setShowPromoInputInFeeModal(false)
                  setListingFeePromoCode('')
                  setListingFeePromoError(null)
                  return
                }

                // В админке “Назад” на первом шаге возвращает к выбору владельца,
                // а не редиректит на чужой URL.
                if (adminMode && currentStep === 'type-selection') {
                  if (typeof onAdminBack === 'function') onAdminBack()
                  return
                }

                if (currentStep === 'test-drive-question') {
                  setCurrentStep('documents')
                } else if (currentStep === 'share-type-selection' || currentStep === 'debt-type-selection') {
                  setCurrentStep('type-selection')
                  setFormData(prev => ({ ...prev, propertyType: '', propertyTypeUi: '', listingMode: '', isShareProperty: false, isDebtProperty: false }))
                } else if (currentStep === 'property-name') {
                  setCurrentStep('type-selection')
                } else if (currentStep === 'test-drive-pricing') {
                  setCurrentStep('test-drive-question')
                } else if (currentStep === 'listing-type') {
                  if (formData.testDrive === true) {
                    setCurrentStep('test-drive-pricing')
                  } else {
                    setCurrentStep('test-drive-question')
                  }
                } else if (currentStep === 'location') {
                  setCurrentStep('property-name')
                } else if (currentStep === 'details') {
                  setCurrentStep('location')
                } else if (currentStep === 'amenities') {
                  setCurrentStep('details')
                } else if (currentStep === 'photos') {
                  setCurrentStep(formData.isDebtProperty ? 'details' : 'amenities')
                } else if (currentStep === 'documents') {
                  if (formData.isDebtProperty && debtDocumentsStep === 'categories') {
                    setDebtDocumentsStep('required')
                    setSelectedDebtDocCategory(null)
                  } else {
                    setCurrentStep('photos')
                  }
                } else if (currentStep === 'price-calculator') {
                  setCurrentStep('listing-type')
                } else if (currentStep === 'price') {
                  setCurrentStep('price-calculator')
                } else if (currentStep === 'form') {
                  setCurrentStep('price')
                } else {
                  if (adminMode && typeof onAdminBack === 'function') onAdminBack()
                  else navigate('/owner')
                }
              }}
            >
              <FiChevronLeft size={20} />
              {t('addPropertyBack')}
            </button>
            <h1 className="page-title">
              {isEditMode ? t('addPropertyTitleEdit') : t('addPropertyTitleNew')}
            </h1>
          </div>
          <button
            type="button"
            className="add-property-reset-btn"
            onClick={handleResetAll}
          >
            Сбросить
          </button>
        </div>
        <div className="add-property-wizard-progress">
          <div className="add-property-wizard-progress__top">
            <span>Шаг {currentStepIndex + 1} из {stepFlow.length}</span>
            <span>{progressPercent}% заполнено</span>
          </div>
          <div className="add-property-wizard-progress__track">
            <div
              className="add-property-wizard-progress__fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="add-property-wizard-progress__labels">
            {stepFlow.map((step, index) => (
              <span
                key={step.id}
                className={`add-property-wizard-progress__label ${
                  useSinglePageFlow
                    ? (singlePageStepDoneMap[step.id] ? 'is-done' : '')
                    : (index <= currentStepIndex ? 'is-done' : '')
                }`}
              >
                {step.label}
              </span>
            ))}
          </div>
          <p className="add-property-wizard-progress__hint">
            {remainingSteps > 0 ? `Осталось шагов: ${remainingSteps}` : 'Последний шаг перед проверкой и публикацией'}
          </p>
        </div>

        {useSinglePageFlow ? (
          <div className="single-page-add-flow single-page-add-flow--studio">
            <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handlePhotoUpload} />
            <input ref={videoInputRef} type="file" accept="video/*" multiple style={{ display: 'none' }} onChange={handleVideoUpload} />
            <input ref={documentInputRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" multiple style={{ display: 'none' }} onChange={handleDocumentUpload} />
            <input id="sp-ownership-input" ref={ownershipInputRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={(e) => handleRequiredDocumentChange('ownership', e)} />
            <input id="sp-no-debts-input" ref={noDebtsInputRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={(e) => handleRequiredDocumentChange('noDebts', e)} />

            <div className="single-page-add-flow__layout">
              <div className="single-page-add-flow__main">
                <div className="sp-studio-toolbar">
                  <div className="sp-studio-toolbar__title">
                    <span className="sp-studio-toolbar__eyebrow">Мастер публикации</span>
                    <h2 className="sp-studio-toolbar__heading">Добавление объекта</h2>
                  </div>
                </div>

                <section
                  data-sp-section="type"
                  className={`sp-card sp-card--enter${singlePageSpSectionDone.type && !isSpSectionBodyVisible('type') ? ' sp-card--section-collapsed' : ''}`}
                >
                  <header
                    className={`sp-card__head${singlePageSpSectionDone.type ? ' sp-card__head--collapsible' : ''}`}
                    onClick={singlePageSpSectionDone.type ? () => toggleSpSectionCollapse('type') : undefined}
                  >
                    <div className="sp-card__head-maincol">
                      <span className="sp-card__step">Шаг 1</span>
                      <h3 className="sp-card__title">Тип недвижимости</h3>
                      {(!singlePageSpSectionDone.type || isSpSectionBodyVisible('type')) && (
                        <p className="sp-card__lead">{SINGLE_PAGE_SECTION_HELP.type.lead}</p>
                      )}
                    </div>
                    {singlePageSpSectionDone.type ? (
                      <span className="sp-card__head-toggle" aria-hidden="true">
                        <FiChevronDown className={isSpSectionBodyVisible('type') ? 'is-expanded' : ''} size={22} />
                      </span>
                    ) : null}
                  </header>
                  <div
                    className={`sp-card__collapsible-panel${isSpSectionBodyVisible('type') ? ' is-open' : ''}`}
                    aria-hidden={!isSpSectionBodyVisible('type')}
                  >
                    <div className="sp-card__collapsible-body">
                      <div className="sp-radio-stack" role="radiogroup" aria-label="Тип объекта">
                        {PROPERTY_TYPE_OPTIONS.map((option) => (
                          <label
                            key={option.id}
                            className={`sp-radio-row ${formData.propertyTypeUi === option.id ? 'is-selected' : ''}`}
                          >
                            <input
                              type="radio"
                              name="sp-property-type"
                              checked={formData.propertyTypeUi === option.id}
                              onChange={() => handlePropertyTypeSelect(option.id)}
                            />
                            <span className="sp-radio-row__icon" aria-hidden="true">{getPropertyTypeIcon(option.icon)}</span>
                            <span className="sp-radio-row__text">
                              <span className="sp-radio-row__title">{option.title}</span>
                              <span className="sp-radio-row__desc">{option.description}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                {hasType && (
                  <section
                    data-sp-section="property-name"
                    className={`sp-card sp-card--enter${singlePageSpSectionDone['property-name'] && !isSpSectionBodyVisible('property-name') ? ' sp-card--section-collapsed' : ''}`}
                  >
                    <header
                      className={`sp-card__head${singlePageSpSectionDone['property-name'] ? ' sp-card__head--collapsible' : ''}`}
                      onClick={
                        singlePageSpSectionDone['property-name']
                          ? () => toggleSpSectionCollapse('property-name')
                          : undefined
                      }
                    >
                      <div className="sp-card__head-maincol">
                        <span className="sp-card__step">Шаг 2</span>
                        <h3 className="sp-card__title">Название и описание</h3>
                        {(!singlePageSpSectionDone['property-name'] || isSpSectionBodyVisible('property-name')) && (
                          <p className="sp-card__lead">
                            Создайте первое впечатление: лаконичное название и описание, которое подчеркивает ценность объекта. ИИ поможет сделать текст сильнее.
                          </p>
                        )}
                      </div>
                      {singlePageSpSectionDone['property-name'] ? (
                        <span className="sp-card__head-toggle" aria-hidden="true">
                          <FiChevronDown
                            className={isSpSectionBodyVisible('property-name') ? 'is-expanded' : ''}
                            size={22}
                          />
                        </span>
                      ) : null}
                    </header>
                    <div
                      className={`sp-card__collapsible-panel${isSpSectionBodyVisible('property-name') ? ' is-open' : ''}`}
                      aria-hidden={!isSpSectionBodyVisible('property-name')}
                    >
                      <div className="sp-card__collapsible-body">
                        <div className="sp-property-name-full-row">
                          <input
                            type="text"
                            value={formData.title || ''}
                            onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                            className="property-name-input sp-property-name-full-input"
                            placeholder={t(getAddPropertyNamePlaceholderKey(formData.propertyType || 'apartment'))}
                          />
                        </div>
                        <div className="sp-property-name-full-row">
                          <textarea
                            value={formData.description || ''}
                            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                            className="property-name-textarea sp-property-name-full-input"
                            placeholder={t('addPropertyDescriptionPlaceholder')}
                            rows={8}
                          />
                        </div>
                        <div className="property-name-generate-row">
                          <AnimatedGenerateButton
                            labelIdle={t('addPropertyGenerateDescriptionButton')}
                            labelActive={t('addPropertyGeneratingDescription')}
                            generating={isGeneratingDescription}
                            highlightHueDeg={210}
                            onClick={handleGenerateDescription}
                            disabled={isGeneratingDescription || !(formData.description || '').trim()}
                            ariaLabel={t('addPropertyGenerateDescriptionButton')}
                            className="property-name-generate-btn-wrap"
                          />
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                {hasPropertyName && (
                  <section
                    data-sp-section="address"
                    className={`sp-card sp-card--enter sp-card--accent${singlePageSpSectionDone.address && !isSpSectionBodyVisible('address') ? ' sp-card--section-collapsed' : ''}`}
                  >
                    <header
                      className={`sp-card__head${singlePageSpSectionDone.address ? ' sp-card__head--collapsible' : ''}`}
                      onClick={singlePageSpSectionDone.address ? () => toggleSpSectionCollapse('address') : undefined}
                    >
                      <div className="sp-card__head-maincol">
                        <span className="sp-card__step">Шаг 4</span>
                        <h3 className="sp-card__title">Адрес и карта</h3>
                        {(!singlePageSpSectionDone.address || isSpSectionBodyVisible('address')) && (
                          <p className="sp-card__lead">{SINGLE_PAGE_SECTION_HELP.address.lead}</p>
                        )}
                      </div>
                      {singlePageSpSectionDone.address ? (
                        <span className="sp-card__head-toggle" aria-hidden="true">
                          <FiChevronDown className={isSpSectionBodyVisible('address') ? 'is-expanded' : ''} size={22} />
                        </span>
                      ) : null}
                    </header>

                    <div
                      className={`sp-card__collapsible-panel${isSpSectionBodyVisible('address') ? ' is-open' : ''}`}
                      aria-hidden={!isSpSectionBodyVisible('address')}
                    >
                      <div className="sp-card__collapsible-body">
                    <div className="property-location-input-group">
                      <label className="property-location-label">{t('addPropertyLocationCountryLabel')}</label>
                      <CountrySelect
                        value={formData.country}
                        onChange={async (countryName) => {
                          setFormData((prev) => ({ ...prev, country: countryName }))
                          if (citySearch) searchCity(citySearch, countryName)
                          if (!countryName || !String(countryName).trim()) {
                            setLocationMapZoom(null)
                            return
                          }
                          const item = await fetchNominatimFirst(countryName)
                          if (!item) return
                          const lat = parseFloat(item.lat)
                          const lng = parseFloat(item.lon)
                          if (isNaN(lat) || isNaN(lng)) return
                          setMapCenter([lat, lng])
                          setSelectedCoordinates([lat, lng])
                          setLocationMapZoom(6)
                        }}
                        placeholder={t('addPropertyLocationCountryPlaceholder')}
                        className="property-location-country-select"
                      />
                    </div>

                    <div className="property-location-input-group">
                      <label className="property-location-label">{t('addPropertyLocationCityLabel')}</label>
                      <div className="property-location-search-wrapper">
                        <input
                          type="text"
                          ref={citySearchRef}
                          value={citySearch}
                          onChange={(e) => {
                            const value = e.target.value
                            setCitySearch(value)
                            const cityName = value.split(',')[0].trim()
                            setFormData((prev) => ({ ...prev, city: cityName }))
                            if (citySearchTimeoutRef.current) clearTimeout(citySearchTimeoutRef.current)
                            if (value.length >= 2) {
                              citySearchTimeoutRef.current = setTimeout(() => {
                                searchCity(value, formData.country)
                              }, 700)
                            } else {
                              setCitySuggestions([])
                              setShowCitySuggestions(false)
                              setIsCitySearching(false)
                              setLocationMapZoom(null)
                            }
                          }}
                          onFocus={() => {
                            if (citySuggestions.length > 0) setShowCitySuggestions(true)
                            if (citySearch && citySearch.length >= 2 && citySuggestions.length === 0) {
                              searchCity(citySearch, formData.country)
                            }
                          }}
                          onBlur={() => setTimeout(() => setShowCitySuggestions(false), 200)}
                          className="property-location-input property-location-input--with-icon"
                          placeholder={t('addPropertyLocationCityPlaceholder')}
                        />
                        <div className="property-location-input-icon">
                          {isCitySearching ? (
                            <FiLoader className="spinner" size={18} />
                          ) : citySearch.length >= 2 && (citySuggestions.length > 0 || citySearch.includes(',')) ? (
                            <FiCheck size={18} />
                          ) : citySearch.length >= 2 && citySuggestions.length === 0 && !citySearch.includes(',') ? (
                            <FiLoader className="spinner" size={18} />
                          ) : null}
                        </div>
                        {showCitySuggestions && citySuggestions.length > 0 && (
                          <div className="property-location-suggestions">
                            {citySuggestions.map((city, index) => (
                              <div
                                key={index}
                                className="property-location-suggestion-item"
                                onClick={() => handleCitySelect(city)}
                              >
                                <FiMapPin size={16} />
                                <span>{city.display_name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="property-location-input-group">
                      <label className="property-location-label">{t('addPropertyLocationStreetLabel')}</label>
                      <div className="property-location-search-wrapper">
                        <input
                          id="sp-address-search-input"
                          type="text"
                          value={addressSearch}
                          onChange={(e) => {
                            const value = e.target.value
                            setAddressSearch(value)
                            if (!value.trim()) {
                              setAddressSuggestions([])
                              setShowSuggestions(false)
                              setIsAddressSearching(false)
                              setSelectedCoordinates(null)
                              setMapCenter(null)
                              setLocationMapZoom(null)
                              setFormData((prev) => ({
                                ...prev,
                                address: '',
                                location: '',
                                coordinates: null,
                                apartment: '',
                              }))
                              return
                            }
                            if (value.length < 3 || !formData.city) {
                              setAddressSuggestions([])
                              setShowSuggestions(false)
                              setIsAddressSearching(false)
                            }
                          }}
                          onFocus={() => {
                            if (addressSuggestions.length > 0) setShowSuggestions(true)
                            else if (addressSearch && addressSearch.length >= 2 && formData.city) {
                              searchAddress(addressSearch)
                            }
                          }}
                          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                          className="property-location-input property-location-input--with-icon"
                          placeholder={
                            formData.city
                              ? t('addPropertyLocationStreetPlaceholder')
                              : t('addPropertyLocationStreetPlaceholderNoCity')
                          }
                          disabled={!formData.city}
                        />
                        {formData.city && (
                          <div className="property-location-input-icon">
                            {isAddressSearching ? (
                              <FiLoader className="spinner" size={18} />
                            ) : addressSearch.length >= 2 &&
                              (addressSuggestions.length > 0 || addressSearch.includes(',')) ? (
                              <FiCheck size={18} />
                            ) : addressSearch.length >= 2 &&
                              addressSuggestions.length === 0 &&
                              !addressSearch.includes(',') ? (
                              <FiLoader className="spinner" size={18} />
                            ) : null}
                          </div>
                        )}
                        {showSuggestions && addressSuggestions.length > 0 && (
                          <div className="property-location-suggestions">
                            {getUniqueAddressSuggestions().map(({ suggestion, label }, index) => (
                              <div
                                key={index}
                                className="property-location-suggestion-item"
                                onClick={() => handleAddressSelect(suggestion)}
                              >
                                <FiMapPin size={16} />
                                <span>{label}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="property-location-input-group">
                      <label className="property-location-label">{t('addPropertyLocationHouseNumberLabel')}</label>
                      <div className="property-location-search-wrapper">
                        <input
                          type="text"
                          name="apartment"
                          value={formData.apartment}
                          onChange={(e) => {
                            const value = e.target.value
                            setFormData((prev) => {
                              const streetLine = (addressSearch || prev.address || '').trim()
                              const c = prev.country || ''
                              const cityName = prev.city || ''
                              const tail = [streetLine, value.trim()].filter(Boolean).join(', ')
                              const location =
                                c && cityName && tail ? `${c}, ${cityName}, ${tail}` : tail || prev.location
                              return { ...prev, apartment: value, location }
                            })
                            if (houseSearchTimeoutRef.current) {
                              clearTimeout(houseSearchTimeoutRef.current)
                            }
                            if (value && addressSearch && formData.city) {
                              houseSearchTimeoutRef.current = setTimeout(() => {
                                searchHouse(value)
                              }, 600)
                            } else {
                              setHouseSuggestions([])
                              setShowHouseSuggestions(false)
                            }
                          }}
                          onFocus={() => {
                            if (houseSuggestions.length > 0) setShowHouseSuggestions(true)
                          }}
                          onBlur={() => setTimeout(() => setShowHouseSuggestions(false), 200)}
                          className="property-location-input"
                          placeholder={t('addPropertyLocationHouseNumberPlaceholder')}
                          disabled={!formData.city || !addressSearch?.trim()}
                        />
                        {showHouseSuggestions && houseSuggestions.length > 0 && (
                          <div className="property-location-suggestions">
                            {houseSuggestions.map((suggestion, index) => (
                              <div
                                key={index}
                                className="property-location-suggestion-item"
                                onClick={() => handleHouseSelect(suggestion)}
                              >
                                <FiMapPin size={16} />
                                <span>{formatShortAddressWithHouse(suggestion)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="property-location-input-group">
                      <label className="property-location-label">Кадастровый номер (опционально)</label>
                      <input
                        type="text"
                        value={formData.cadastralNumber || ''}
                        onChange={(e) => setFormData((prev) => ({ ...prev, cadastralNumber: e.target.value }))}
                        className="property-location-input"
                        placeholder="Например: 77:01:0004012:3456"
                      />
                    </div>

                    <p className="sp-map-hint">
                      {singlePageMapCoords
                        ? 'Перетащите маркер на карте — адрес и координаты обновятся автоматически (геокодинг).'
                        : 'Выберите город и улицу из подсказок — на карте появится маркер.'}
                    </p>
                    <div className="sp-map-wrap">
                      <LocationMap
                        center={singlePageMapCoords || [55, 20]}
                        zoom={singlePageMapCoords ? (locationMapZoom ?? 15) : 4}
                        marker={singlePageMapCoords}
                        markerDraggable={!!singlePageMapCoords}
                        onMarkerDragEnd={handleSinglePageMarkerDragEnd}
                      />
                    </div>
                      </div>
                    </div>
                  </section>
                )}

                {hasAddress && (
                  <section data-sp-section="details" className="sp-card sp-card--enter">
                    <header className="sp-card__head">
                      <span className="sp-card__step">Шаг 3</span>
                      <h3 className="sp-card__title">Параметры</h3>
                      <p className="sp-card__lead">{SINGLE_PAGE_SECTION_HELP.details.lead}</p>
                    </header>
                    <div className="single-page-add-flow__grid">
                      {(singlePageTypeProfile === 'apartment' || singlePageTypeProfile === 'apartments') && (
                        <>
                          <input
                            type="number"
                            value={formData.rooms}
                            onChange={(e) => setFormData((prev) => ({ ...prev, rooms: e.target.value }))}
                            className="property-name-input"
                            placeholder="Комнат"
                          />
                          <input
                            type="number"
                            value={formData.bedrooms}
                            onChange={(e) => setFormData((prev) => ({ ...prev, bedrooms: e.target.value }))}
                            className="property-name-input"
                            placeholder="Спален"
                          />
                          <input
                            type="number"
                            value={formData.bathrooms}
                            onChange={(e) => setFormData((prev) => ({ ...prev, bathrooms: e.target.value }))}
                            className="property-name-input"
                            placeholder="Ванных"
                          />
                          <input
                            type="number"
                            value={formData.area}
                            onChange={(e) => setFormData((prev) => ({ ...prev, area: e.target.value }))}
                            className="property-name-input"
                            placeholder="Площадь, м²"
                          />
                          <input
                            type="number"
                            value={formData.floor}
                            onChange={(e) => setFormData((prev) => ({ ...prev, floor: e.target.value }))}
                            className="property-name-input"
                            placeholder="Этаж"
                          />
                          <input
                            type="number"
                            value={formData.totalFloors}
                            onChange={(e) => setFormData((prev) => ({ ...prev, totalFloors: e.target.value }))}
                            className="property-name-input"
                            placeholder="Этажей в здании"
                          />
                          <select
                            value={formData.buildingType}
                            onChange={(e) => setFormData((prev) => ({ ...prev, buildingType: e.target.value }))}
                            className="property-name-input"
                          >
                            <option value="">Материал / тип</option>
                            <option value="brick">Кирпич</option>
                            <option value="monolithic">Монолит</option>
                            <option value="panel">Панель</option>
                            <option value="wood">Дерево</option>
                            <option value="other">Другое</option>
                          </select>
                          <select
                            value={formData.constructionType || ''}
                            onChange={(e) => setFormData((prev) => ({ ...prev, constructionType: e.target.value }))}
                            className="property-name-input"
                          >
                            <option value="">{t('addPropertyConstructionTypePlaceholder')}</option>
                            {CONSTRUCTION_TYPE_FORM_VALUES.map((value) => (
                              <option key={value} value={value}>{t(CONSTRUCTION_TYPE_I18N_KEYS[value])}</option>
                            ))}
                          </select>
                        </>
                      )}

                      {(singlePageTypeProfile === 'house' || singlePageTypeProfile === 'villa') && (
                        <>
                          <input
                            type="number"
                            value={formData.landArea}
                            onChange={(e) => setFormData((prev) => ({ ...prev, landArea: e.target.value }))}
                            className="property-name-input"
                            placeholder="Площадь участка, м²"
                          />
                          <input
                            type="number"
                            value={formData.area}
                            onChange={(e) => setFormData((prev) => ({ ...prev, area: e.target.value }))}
                            className="property-name-input"
                            placeholder="Площадь дома, м²"
                          />
                          <input
                            type="number"
                            value={formData.bedrooms}
                            onChange={(e) => setFormData((prev) => ({ ...prev, bedrooms: e.target.value }))}
                            className="property-name-input"
                            placeholder="Спален"
                          />
                          <input
                            type="number"
                            value={formData.bathrooms}
                            onChange={(e) => setFormData((prev) => ({ ...prev, bathrooms: e.target.value }))}
                            className="property-name-input"
                            placeholder="Ванных"
                          />
                          <input
                            type="number"
                            value={formData.totalFloors}
                            onChange={(e) => setFormData((prev) => ({ ...prev, totalFloors: e.target.value }))}
                            className="property-name-input"
                            placeholder="Этажей"
                          />
                          <select
                            value={formData.buildingType}
                            onChange={(e) => setFormData((prev) => ({ ...prev, buildingType: e.target.value }))}
                            className="property-name-input"
                          >
                            <option value="">Материал / тип</option>
                            <option value="brick">Кирпич</option>
                            <option value="monolithic">Монолит</option>
                            <option value="panel">Панель</option>
                            <option value="wood">Дерево</option>
                            <option value="other">Другое</option>
                          </select>
                          <select
                            value={formData.constructionType || ''}
                            onChange={(e) => setFormData((prev) => ({ ...prev, constructionType: e.target.value }))}
                            className="property-name-input"
                          >
                            <option value="">{t('addPropertyConstructionTypePlaceholder')}</option>
                            {CONSTRUCTION_TYPE_FORM_VALUES.map((value) => (
                              <option key={value} value={value}>{t(CONSTRUCTION_TYPE_I18N_KEYS[value])}</option>
                            ))}
                          </select>
                        </>
                      )}

                      {singlePageTypeProfile === 'commercial' && (
                        <>
                          <input
                            type="number"
                            value={formData.area}
                            onChange={(e) => setFormData((prev) => ({ ...prev, area: e.target.value }))}
                            className="property-name-input"
                            placeholder="Площадь помещения, м²"
                          />
                          <input
                            type="number"
                            value={formData.floor}
                            onChange={(e) => setFormData((prev) => ({ ...prev, floor: e.target.value }))}
                            className="property-name-input"
                            placeholder="Этаж / уровень"
                          />
                          <input
                            type="number"
                            value={formData.totalFloors}
                            onChange={(e) => setFormData((prev) => ({ ...prev, totalFloors: e.target.value }))}
                            className="property-name-input"
                            placeholder="Этажей в здании"
                          />
                          <select
                            value={formData.commercialType}
                            onChange={(e) => setFormData((prev) => ({ ...prev, commercialType: e.target.value }))}
                            className="property-name-input"
                          >
                            <option value="">Тип коммерческого объекта</option>
                            <option value="office">Офис</option>
                            <option value="shop">Магазин</option>
                            <option value="warehouse">Склад</option>
                            <option value="other">Другое</option>
                          </select>
                          <select
                            value={formData.constructionType || ''}
                            onChange={(e) => setFormData((prev) => ({ ...prev, constructionType: e.target.value }))}
                            className="property-name-input"
                          >
                            <option value="">{t('addPropertyConstructionTypePlaceholder')}</option>
                            {CONSTRUCTION_TYPE_FORM_VALUES.map((value) => (
                              <option key={value} value={value}>{t(CONSTRUCTION_TYPE_I18N_KEYS[value])}</option>
                            ))}
                          </select>
                        </>
                      )}

                      {singlePageTypeProfile === 'land' && (
                        <>
                          <input
                            type="number"
                            value={formData.landArea}
                            onChange={(e) => setFormData((prev) => ({ ...prev, landArea: e.target.value }))}
                            className="property-name-input"
                            placeholder="Площадь участка, м²"
                          />
                          <select
                            value={formData.commercialType}
                            onChange={(e) => setFormData((prev) => ({ ...prev, commercialType: e.target.value }))}
                            className="property-name-input"
                          >
                            <option value="">Назначение участка</option>
                            <option value="residential">Под жилую застройку</option>
                            <option value="commercial">Под бизнес/коммерцию</option>
                            <option value="agricultural">Сельхоз назначение</option>
                            <option value="industrial">Промышленное назначение</option>
                            <option value="other">Другое</option>
                          </select>
                        </>
                      )}

                      {singlePageTypeProfile === 'other' && (
                        <>
                          <input
                            type="number"
                            value={formData.area}
                            onChange={(e) => setFormData((prev) => ({ ...prev, area: e.target.value }))}
                            className="property-name-input"
                            placeholder="Площадь, м²"
                          />
                          <select
                            value={formData.commercialType}
                            onChange={(e) => setFormData((prev) => ({ ...prev, commercialType: e.target.value }))}
                            className="property-name-input"
                          >
                            <option value="">Тип объекта</option>
                            <option value="mixed">Смешанный</option>
                            <option value="special">Специального назначения</option>
                            <option value="other">Другое</option>
                          </select>
                        </>
                      )}
                    </div>
                  </section>
                )}

                {hasDetails && (
                  <section data-sp-section="amenities" className="sp-card sp-card--enter">
                    <header className="sp-card__head">
                      <span className="sp-card__step">Шаг 5</span>
                      <h3 className="sp-card__title">Описание и удобства</h3>
                      <p className="sp-card__lead">{SINGLE_PAGE_SECTION_HELP.amenities.lead}</p>
                    </header>
                    <div className="sp-amenity-desc">
                      <label className="sp-amenity-desc__label" htmlFor="sp-additional-amenities">
                        {t('addPropertyAmenitiesOtherLabel')}
                      </label>
                      <textarea
                        id="sp-additional-amenities"
                        value={formData.additionalAmenities || ''}
                        onChange={(e) => setFormData((prev) => ({ ...prev, additionalAmenities: e.target.value }))}
                        className="property-name-textarea sp-amenity-textarea"
                        placeholder={t('addPropertyAmenitiesOtherPlaceholder')}
                        rows={7}
                      />
                    </div>
                    <p className="sp-amenity-groups-intro">{t('addPropertyAmenitiesGroupsIntro')}</p>
                    <div className="sp-amenity-groups">
                      {singlePageAmenityGroups.map((group) => (
                        <div key={group.id} className="sp-amenity-group">
                          <h4 className="sp-amenity-group__title">{group.title}</h4>
                          <div className="sp-amenity-group__chips single-page-add-flow__chips sp-chips">
                            {group.items.map(({ key, label }) => (
                              <button
                                key={key}
                                type="button"
                                className={`single-page-add-flow__chip ${formData[key] ? 'active' : ''}`}
                                onClick={() => setFormData((prev) => ({ ...prev, [key]: !prev[key] }))}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {hasAmenities && (
                  <section data-sp-section="media" className="sp-card sp-card--enter">
                    <header className="sp-card__head">
                      <span className="sp-card__step">Шаг 6</span>
                      <h3 className="sp-card__title">Фото и видео</h3>
                      <p className="sp-card__lead">{SINGLE_PAGE_SECTION_HELP.media.lead}</p>
                    </header>
                    <div className="single-page-add-flow__stats sp-stats">
                      <span>Фото: {photos.length}/10</span>
                      <span>Видео: {videos.length}/3</span>
                    </div>
                    <div className="single-page-add-flow__upload-row sp-actions">
                      <button type="button" className="sp-btn sp-btn--primary" onClick={() => fileInputRef.current?.click()}>
                        Выбрать фотографии
                      </button>
                      <button type="button" className="sp-btn sp-btn--ghost" onClick={openVideoSourceModal}>
                        Загрузить видео
                      </button>
                    </div>
                    {(photos.length > 0 || videos.length > 0) && (
                      <div className="single-page-add-flow__media-grid sp-media-grid">
                        {photos.map((photo) => (
                          <div key={photo.id} className="sp-media-tile">
                            <img src={photo.url} alt="" />
                            <button type="button" className="sp-media-tile__remove" onClick={() => handleRemovePhoto(photo.id)} aria-label="Удалить фото">
                              <FiX size={16} />
                            </button>
                          </div>
                        ))}
                        {videos.map((video) => (
                          <div key={video.id} className="sp-media-tile sp-media-tile--video">
                            {video.type === 'file' ? (
                              <video src={video.url} controls preload="metadata" />
                            ) : (
                              <div className="single-page-add-flow__media-video-placeholder">
                                <FiVideo size={20} />
                                <span>Ссылка</span>
                              </div>
                            )}
                            <button type="button" className="sp-media-tile__remove" onClick={() => handleRemoveVideo(video.id)} aria-label="Удалить видео">
                              <FiX size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {hasMedia && (
                  <section data-sp-section="documents" className="sp-card sp-card--enter">
                    <header className="sp-card__head">
                      <span className="sp-card__step">Шаг 7</span>
                      <h3 className="sp-card__title">Документы</h3>
                      <p className="sp-card__lead">{SINGLE_PAGE_SECTION_HELP.documents.lead}</p>
                    </header>
                    <div className="sp-doc-actions-simple">
                      <div className="sp-doc-action-card">
                        <button
                          type="button"
                          className="sp-btn sp-btn--ghost sp-btn--wide"
                          onClick={() => {
                            if (ownershipInputRef.current) ownershipInputRef.current.click()
                            else document.getElementById('sp-ownership-input')?.click()
                          }}
                        >
                          Документ собственности
                        </button>
                        {!requiredDocuments.ownership ? (
                          <div className="sp-doc-action-status">Файл пока не загружен</div>
                        ) : (
                          <div className="sp-doc-required-preview">
                            {requiredDocumentPreviews.ownership ? (
                              <img src={requiredDocumentPreviews.ownership} alt={requiredDocuments.ownership.name} className="sp-doc-required-preview__thumb" />
                            ) : (
                              <div className="sp-doc-required-preview__thumb sp-doc-required-preview__thumb--file">
                                <FiFileText size={20} />
                              </div>
                            )}
                            <div className="sp-doc-required-preview__meta">
                              <span>{requiredDocuments.ownership.name}</span>
                              <button type="button" onClick={() => handleRemoveRequiredDocument('ownership')} aria-label="Удалить документ собственности">
                                <FiX size={14} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="sp-doc-action-card">
                        <button
                          type="button"
                          className="sp-btn sp-btn--ghost sp-btn--wide"
                          onClick={() => {
                            if (noDebtsInputRef.current) noDebtsInputRef.current.click()
                            else document.getElementById('sp-no-debts-input')?.click()
                          }}
                        >
                          Справка об отсутствии обременений
                        </button>
                        {!requiredDocuments.noDebts ? (
                          <div className="sp-doc-action-status">Файл пока не загружен</div>
                        ) : (
                          <div className="sp-doc-required-preview">
                            {requiredDocumentPreviews.noDebts ? (
                              <img src={requiredDocumentPreviews.noDebts} alt={requiredDocuments.noDebts.name} className="sp-doc-required-preview__thumb" />
                            ) : (
                              <div className="sp-doc-required-preview__thumb sp-doc-required-preview__thumb--file">
                                <FiFileText size={20} />
                              </div>
                            )}
                            <div className="sp-doc-required-preview__meta">
                              <span>{requiredDocuments.noDebts.name}</span>
                              <button type="button" onClick={() => handleRemoveRequiredDocument('noDebts')} aria-label="Удалить справку об отсутствии обременений">
                                <FiX size={14} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="sp-doc-action-card">
                        <button type="button" className="sp-btn sp-btn--ghost sp-btn--wide" onClick={() => documentInputRef.current?.click()}>
                          Дополнительные документы
                        </button>
                        <div className={`sp-doc-action-status ${additionalDocuments.length > 0 ? 'is-ready' : ''}`}>
                          {additionalDocuments.length > 0
                            ? `Загружено файлов: ${additionalDocuments.length}`
                            : 'Файлы пока не загружены'}
                        </div>
                        {additionalDocuments.length > 0 && (
                          <div className="sp-doc-action-files">
                            {additionalDocuments.map((doc) => (
                              <div key={doc.id} className="sp-doc-action-file">
                                <span>{doc.name}</span>
                                <button type="button" onClick={() => handleRemoveDocument(doc.id)} aria-label="Удалить документ">
                                  <FiX size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                )}

                {hasDocuments && (
                  <section data-sp-section="testdrive" className="sp-card sp-card--enter">
                    <header className="sp-card__head">
                      <span className="sp-card__step">Шаг 8</span>
                      <div className="sp-card__head-row">
                        <h3 className="sp-card__title">Тест-драйв</h3>
                        <button
                          type="button"
                          className="sp-head-info-btn"
                          onClick={() => setShowTestDriveInfoModal(true)}
                        >
                          Подробнее
                        </button>
                      </div>
                      <p className="sp-card__lead">{SINGLE_PAGE_SECTION_HELP.testdrive.lead}</p>
                    </header>
                    <div className="single-page-add-flow__chips sp-chips">
                      <button type="button" className={`single-page-add-flow__chip ${formData.testDrive === true ? 'active' : ''}`} onClick={() => setFormData((prev) => ({ ...prev, testDrive: true }))}>
                        Да
                      </button>
                      <button type="button" className={`single-page-add-flow__chip ${formData.testDrive === false ? 'active' : ''}`} onClick={() => setFormData((prev) => ({ ...prev, testDrive: false }))}>
                        Нет
                      </button>
                    </div>
                    {formData.testDrive === true && (
                      <div className="single-page-add-flow__grid">
                        <input
                          type="number"
                          className="property-name-input"
                          placeholder="Стоимость за сутки"
                          value={formData.testDrivePricePerDay || ''}
                          onChange={(e) => setFormData((prev) => ({ ...prev, testDrivePricePerDay: e.target.value }))}
                        />
                        <input
                          type="number"
                          className="property-name-input"
                          placeholder="Страховой депозит"
                          value={formData.testDriveInsuranceDeposit || ''}
                          onChange={(e) => setFormData((prev) => ({ ...prev, testDriveInsuranceDeposit: e.target.value }))}
                        />
                      </div>
                    )}
                  </section>
                )}

                {hasTestDrive && (
                  <section data-sp-section="listing" className="sp-card sp-card--enter">
                    <header className="sp-card__head">
                      <span className="sp-card__step">Шаг 9</span>
                      <h3 className="sp-card__title">Формат продажи</h3>
                      <p className="sp-card__lead">{SINGLE_PAGE_SECTION_HELP.listing.lead}</p>
                    </header>
                    <div className="sp-listing-mode-stack" role="radiogroup" aria-label="Тип размещения">
                      {LISTING_MODE_OPTIONS.map((mode) => {
                        const isOpen = expandedListingModeId === mode.id
                        return (
                          <div
                            key={mode.id}
                            className={`sp-listing-accordion sp-radio-row sp-radio-row--listing sp-radio-row--${mode.tone} ${formData.listingMode === mode.id ? 'is-selected' : ''} ${isOpen ? 'is-expanded' : ''}`}
                          >
                            <div className="sp-listing-accordion__top">
                              <label className="sp-listing-accordion__label">
                                <input
                                  type="radio"
                                  name="sp-listing-mode"
                                  checked={formData.listingMode === mode.id}
                                  onChange={() => applyListingModeFromSinglePage(mode.id)}
                                />
                                <span className="sp-radio-row__icon" aria-hidden="true">
                                  {getListingModeIcon(mode.icon)}
                                </span>
                                <span className="sp-radio-row__text">
                                  <span className="sp-radio-row__title">{mode.title}</span>
                                  <span className="sp-radio-row__desc">{mode.description}</span>
                                </span>
                              </label>
                              <button
                                type="button"
                                className="sp-listing-accordion__toggle"
                                aria-expanded={isOpen}
                                aria-controls={`listing-mode-help-${mode.id}`}
                                id={`listing-mode-trigger-${mode.id}`}
                                onClick={() =>
                                  setExpandedListingModeId((prev) => (prev === mode.id ? null : mode.id))
                                }
                              >
                                <FiChevronDown className={`sp-listing-accordion__chev ${isOpen ? 'is-open' : ''}`} aria-hidden />
                                <span className="sp-listing-accordion__toggle-text">
                                  {isOpen ? 'Свернуть' : 'Как это работает'}
                                </span>
                              </button>
                            </div>
                            {isOpen && (
                              <div
                                className="sp-listing-accordion__panel"
                                id={`listing-mode-help-${mode.id}`}
                                role="region"
                                aria-labelledby={`listing-mode-trigger-${mode.id}`}
                              >
                                <ListingModeInstructionPanel mode={mode} layout="stack" />
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </section>
                )}

                {hasListingType && (
                  <section
                    ref={singlePageCalculatorSectionRef}
                    data-sp-section="calculator"
                    className="sp-card sp-card--enter sp-card--calculator"
                  >
                    <header className="sp-card__head">
                      <span className="sp-card__step">Шаг 10</span>
                      <h3 className="sp-card__title">Автоматический расчёт стоимости</h3>
                      <p className="sp-card__lead">{SINGLE_PAGE_SECTION_HELP.calculator.lead}</p>
                    </header>
                    <div className="sp-calculator-embed">
                      <PropertyCalculatorModal
                        isOpen
                        variant="embedded"
                        onClose={() =>
                          singlePagePriceSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        }
                        lockFields
                        initialPropertyData={{
                          propertyType: formData.propertyType,
                          area: formData.area,
                          rooms: formData.rooms,
                          bedrooms: formData.bedrooms,
                          city: formData.city,
                          country: formData.country,
                          address: formData.address,
                          location: formData.location
                        }}
                        onApplyRecommendedPrice={handleApplyCalculatedPrice}
                      />
                    </div>
                  </section>
                )}

                {hasListingType && (
                  <section ref={singlePagePriceSectionRef} data-sp-section="price" className="sp-card sp-card--enter sp-card--price">
                    <header className="sp-card__head">
                      <span className="sp-card__step">Шаг 11</span>
                      <h3 className="sp-card__title">Цена, долги и сроки аукциона</h3>
                      <p className="sp-card__lead">{t('addPropertyPriceSectionLead')}</p>
                    </header>

                    {formData.listingMode === 'shares' && (
                      <div className="single-page-add-flow__grid sp-price-block">
                        <label className="sp-field-label">{t('addPropertyPriceSharesTotalLabel')}</label>
                        <input
                          type="text"
                          className="property-name-input"
                          value={formData.price ? formatNumberWithCommas(formData.price) : ''}
                          onChange={handlePriceChange}
                          inputMode="numeric"
                        />
                        <label className="sp-field-label">{t('addPropertyPriceSharesCountLabel')}</label>
                        <input
                          type="number"
                          min={1}
                          className="property-name-input"
                          value={formData.totalShares}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              totalShares: e.target.value.replace(/\D/g, ''),
                            }))
                          }
                          placeholder={t('addPropertyPriceSharesCountPlaceholder')}
                        />
                      </div>
                    )}

                    {(formData.listingMode === 'debt' || formData.listingMode === 'debt_auction') && (
                      <div className="single-page-add-flow__grid sp-price-block">
                        <label className="sp-field-label">{t('addPropertyPriceDebtAmountLabel')}</label>
                        <input
                          type="text"
                          className="property-name-input"
                          inputMode="numeric"
                          value={formData.debtAmount ? formatNumberWithCommas(formData.debtAmount) : ''}
                          onChange={(e) => {
                            const raw = removeCommas(e.target.value.replace(/[^\d,]/g, ''))
                            setFormData((prev) => ({ ...prev, debtAmount: raw }))
                          }}
                        />
                      </div>
                    )}

                    {(formData.listingMode === 'auction' ||
                      formData.listingMode === 'auction_buy_now' ||
                      formData.listingMode === 'debt_auction') && (
                      <div className="sp-auction-layout">
                        <div className="sp-auction-block">
                          <div className="auction-fields-section sp-auction-picker">
                            <AuctionPeriodPicker
                              label={t('addPropertyPriceAuctionPeriodLabel')}
                              startDate={formData.auctionStartDate}
                              endDate={formData.auctionEndDate}
                              onStartDateChange={(date) => setFormData((prev) => ({ ...prev, auctionStartDate: date }))}
                              onEndDateChange={(date) => setFormData((prev) => ({ ...prev, auctionEndDate: date }))}
                              disableMinConstraints={adminMode || isAdminAddedProperty || isEditMode}
                            />
                          </div>
                        </div>

                        <div className="sp-auction-layout__side">
                          <div className="sp-amount-stepper-panel">
                            <div className="sp-amount-stepper__meta" aria-live="polite">
                              <span className="sp-amount-stepper__badge">
                                {t('addPropertyPriceStepIndicator', {
                                  current: spAuctionAmountStepIndex + 1,
                                  total: spAuctionAmountStepIds.length,
                                })}
                              </span>
                              <div className="sp-amount-stepper__track" role="list">
                                {spAuctionAmountStepIds.map((sid, idx) => (
                                  <span
                                    key={sid}
                                    role="listitem"
                                    className={`sp-amount-stepper__dot ${idx === spAuctionAmountStepIndex ? 'is-current' : ''} ${idx < spAuctionAmountStepIndex ? 'is-done' : ''}`}
                                    title={
                                      sid === 'minimum_sale'
                                        ? t('addPropertyPriceStepMinTitle')
                                        : sid === 'buy_now'
                                          ? t('addPropertyPriceStepBuyNowTitle')
                                          : t('addPropertyPriceStepStartingTitle')
                                    }
                                  />
                                ))}
                              </div>
                            </div>

                            {spCurAuctionAmountStepId === 'minimum_sale' && (
                              <>
                                <h4 className="sp-amount-stepper__title">{t('addPropertyPriceStepMinTitle')}</h4>
                                <div className="sp-amount-stepper__desc">{t('addPropertyPriceStepMinDesc')}</div>
                                <div className={`sp-currency-input-wrap currency-selector ${showCurrencyDropdown === 'sp-min-sale' ? 'is-open' : ''}`}>
                                  <button
                                    type="button"
                                    className="sp-currency-button"
                                    onClick={() => setShowCurrencyDropdown(showCurrencyDropdown === 'sp-min-sale' ? null : 'sp-min-sale')}
                                  >
                                    <span>{quickCurrencies.find((c) => c.code === currency)?.symbol || '$'}</span>
                                    <FiChevronDown className="sp-currency-chevron" size={14} aria-hidden />
                                  </button>
                                  {showCurrencyDropdown === 'sp-min-sale' && (
                                    <div className="sp-currency-dropdown">
                                      {quickCurrencies.map((curr) => (
                                        <button
                                          key={curr.code}
                                          type="button"
                                          className={`sp-currency-option ${currency === curr.code ? 'is-active' : ''}`}
                                          onClick={() => {
                                            setCurrency(curr.code)
                                            setShowCurrencyDropdown(null)
                                          }}
                                        >
                                          <span>{curr.symbol}</span>
                                          <span>{curr.code}</span>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                  <input
                                    type="text"
                                    className="property-name-input sp-price-input-with-currency"
                                    aria-label={t('addPropertyPriceMinimumSaleLabel')}
                                    value={formData.minimumSalePrice ? formatNumberWithCommas(formData.minimumSalePrice) : ''}
                                    onChange={handleMinimumSalePriceChange}
                                    inputMode="numeric"
                                  />
                                </div>
                                {validationErrors.minimumSalePrice && (
                                  <p className="sp-amount-stepper__error">{validationErrors.minimumSalePrice}</p>
                                )}
                              </>
                            )}

                            {spCurAuctionAmountStepId === 'buy_now' && (
                              <>
                                <h4 className="sp-amount-stepper__title">{t('addPropertyPriceStepBuyNowTitle')}</h4>
                                <div className="sp-amount-stepper__desc">{t('addPropertyPriceStepBuyNowDesc')}</div>
                                <label className="sp-field-label sp-amount-stepper__field-label">
                                  {formData.listingMode === 'auction_buy_now'
                                    ? t('addPropertyPriceBuyNowFieldLabelRequired')
                                    : t('addPropertyPriceBuyNowFieldLabelOptional')}
                                </label>
                                <div className={`sp-currency-input-wrap currency-selector ${showCurrencyDropdown === 'sp-price' ? 'is-open' : ''}`}>
                                  <button
                                    type="button"
                                    className="sp-currency-button"
                                    onClick={() => setShowCurrencyDropdown(showCurrencyDropdown === 'sp-price' ? null : 'sp-price')}
                                  >
                                    <span>{quickCurrencies.find((c) => c.code === currency)?.symbol || '$'}</span>
                                    <FiChevronDown className="sp-currency-chevron" size={14} aria-hidden />
                                  </button>
                                  {showCurrencyDropdown === 'sp-price' && (
                                    <div className="sp-currency-dropdown">
                                      {quickCurrencies.map((curr) => (
                                        <button
                                          key={curr.code}
                                          type="button"
                                          className={`sp-currency-option ${currency === curr.code ? 'is-active' : ''}`}
                                          onClick={() => {
                                            setCurrency(curr.code)
                                            setShowCurrencyDropdown(null)
                                          }}
                                        >
                                          <span>{curr.symbol}</span>
                                          <span>{curr.code}</span>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                  <input
                                    type="text"
                                    className="property-name-input sp-price-input-with-currency"
                                    value={formData.price ? formatNumberWithCommas(formData.price) : ''}
                                    onChange={handlePriceChange}
                                    inputMode="numeric"
                                  />
                                </div>
                                {validationErrors.minimumSalePrice && (
                                  <p className="sp-amount-stepper__error">{validationErrors.minimumSalePrice}</p>
                                )}
                              </>
                            )}

                            {spCurAuctionAmountStepId === 'starting' && (
                              <>
                                <h4 className="sp-amount-stepper__title">{t('addPropertyPriceStepStartingTitle')}</h4>
                                <div className="sp-amount-stepper__desc">
                                  {formData.listingMode === 'auction'
                                    ? t('addPropertyPriceStepStartingDescAuctionOnly')
                                    : t('addPropertyPriceStepStartingDescWithBuyNow')}
                                </div>
                                <label className="sp-field-label sp-amount-stepper__field-label">{t('addPropertyPriceStartingBidLabel')}</label>
                                <div className={`sp-currency-input-wrap currency-selector ${showCurrencyDropdown === 'sp-auction' ? 'is-open' : ''}`}>
                                  <button
                                    type="button"
                                    className="sp-currency-button"
                                    onClick={() => setShowCurrencyDropdown(showCurrencyDropdown === 'sp-auction' ? null : 'sp-auction')}
                                  >
                                    <span>{quickCurrencies.find((c) => c.code === currency)?.symbol || '$'}</span>
                                    <FiChevronDown className="sp-currency-chevron" size={14} aria-hidden />
                                  </button>
                                  {showCurrencyDropdown === 'sp-auction' && (
                                    <div className="sp-currency-dropdown">
                                      {quickCurrencies.map((curr) => (
                                        <button
                                          key={curr.code}
                                          type="button"
                                          className={`sp-currency-option ${currency === curr.code ? 'is-active' : ''}`}
                                          onClick={() => {
                                            setCurrency(curr.code)
                                            setShowCurrencyDropdown(null)
                                          }}
                                        >
                                          <span>{curr.symbol}</span>
                                          <span>{curr.code}</span>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                  <input
                                    type="text"
                                    className="property-name-input sp-price-input-with-currency"
                                    value={formData.auctionStartingPrice ? formatNumberWithCommas(formData.auctionStartingPrice) : ''}
                                    onChange={handleAuctionPriceChange}
                                    inputMode="numeric"
                                  />
                                </div>
                                {validationErrors.auctionStartingPrice && (
                                  <p className="sp-amount-stepper__error">{validationErrors.auctionStartingPrice}</p>
                                )}
                              </>
                            )}

                            <div className="sp-amount-stepper__nav">
                              <button
                                type="button"
                                className="sp-btn sp-btn--ghost"
                                disabled={spAuctionAmountStepIndex <= 0}
                                onClick={() => setSpAuctionAmountStepIndex((i) => Math.max(0, i - 1))}
                              >
                                {t('addPropertyPriceStepBack')}
                              </button>
                              {spAuctionAmountStepIndex < spAuctionAmountStepIds.length - 1 ? (
                                <button type="button" className="sp-btn sp-btn--primary" onClick={handleSpAuctionAmountStepNext}>
                                  {t('addPropertyPriceStepNext')}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="sp-btn sp-btn--amount-summary"
                                  onClick={() => setShowSpEnteredAmountsModal(true)}
                                >
                                  {t('addPropertyPriceEnteredAmountsButton')}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="sp-submit-row">
                      <button type="button" className="sp-btn sp-btn--primary sp-btn--wide" disabled={!hasPrice || isSubmitting} onClick={handlePriceContinue}>
                        {isSubmitting ? 'Отправка...' : 'Оплата и верификация'}
                      </button>
                    </div>
                  </section>
                )}
              </div>

              <aside className="single-page-add-flow__aside" aria-label="Прогресс и подсказки">
                <div className="sp-aside-stack">
                  <div className="sp-aside-progress-card">
                    <p className="sp-aside-progress-card__eyebrow">Заполнение анкеты</p>
                    <div
                      className="single-page-add-flow__progress-circle sp-aside-progress-ring"
                      aria-label={`Заполнено ${singlePageProgress}%`}
                    >
                      <svg viewBox="0 0 42 42">
                        <circle cx="21" cy="21" r="16" className="single-page-add-flow__progress-bg" />
                        <circle
                          cx="21"
                          cy="21"
                          r="16"
                          className="single-page-add-flow__progress-fg"
                          style={{ strokeDasharray: `${(singlePageProgress / 100) * 100.53} 100.53` }}
                        />
                      </svg>
                      <span>{singlePageProgress}%</span>
                    </div>
                    <p className="sp-aside-progress-card__hint">
                      {singlePageProgress >= 100 ? 'Можно переходить к оплате' : 'Заполните блоки слева — подсказки обновляются при прокрутке'}
                    </p>
                  </div>
                  <div className="sp-aside-card">
                    <div className="sp-aside-card__kicker">Советы</div>
                    <h4 className="sp-aside-card__title">{spGuideCopy.title}</h4>
                    <p className="sp-aside-card__lead">{spGuideCopy.lead}</p>
                    <ul className="sp-aside-card__list">
                      {spGuideCopy.tips.map((tip, i) => (
                        <li key={i}>{tip}</li>
                      ))}
                    </ul>
                    <div className="sp-aside-card__rec">
                      <strong>Рекомендация.</strong> {spGuideCopy.recommend}
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        ) : wizardRenderStep === 'type-selection' ? (
          /* Экран выбора типа недвижимости */
          <div className="property-type-selection-screen">
            <div className="property-type-selection-header">
              <h2 className="property-type-selection-title">
                {t('addPropertyTypeTitle')}
              </h2>
              <p className="property-type-selection-subtitle">
                {t('addPropertyTypeSubtitle')}
              </p>
            </div>
            
            <div className="property-type-cards-container">
              {PROPERTY_TYPE_OPTIONS.map((option) => (
                <div
                  key={option.id}
                  className="property-type-card-large"
                  onClick={() => handlePropertyTypeSelect(option.id)}
                >
                  <div className="property-type-card-icon">
                    {getPropertyTypeIcon(option.icon)}
                  </div>
                  <h3 className="property-type-card-title">{option.title}</h3>
                  <p className="property-type-card-description">{option.description}</p>
                  <button
                    type="button"
                    className="property-type-card-button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handlePropertyTypeSelect(option.id)
                    }}
                  >
                    Продолжить
                  </button>
                </div>
              ))}
            </div>

     
          </div>
        ) : wizardRenderStep === 'share-type-selection' ? (
          /* Выбор типа объекта для доли (те же 4 типа) */
          <div className="property-type-selection-screen">
            <div className="property-type-selection-header">
              <h2 className="property-type-selection-title">
                {t('addPropertyShareTypeTitle')}
              </h2>
              <p className="property-type-selection-subtitle">
                {t('addPropertyShareTypeSubtitle')}
              </p>
            </div>
            <div className="property-type-cards-container">
              <div className="property-type-card-large" onClick={() => handlePropertyTypeSelect('house', true)}>
                <div className="property-type-card-icon"><FiHome size={48} /></div>
                <h3 className="property-type-card-title">{t('addPropertyTypeHouseTitle')}</h3>
                <p className="property-type-card-description">{t('addPropertyTypeHouseDescription')}</p>
                <button type="button" className="property-type-card-button" onClick={(e) => { e.stopPropagation(); handlePropertyTypeSelect('house', true) }}>{t('addPropertyTypeContinue')}</button>
              </div>
              <div className="property-type-card-large" onClick={() => handlePropertyTypeSelect('apartment', true)}>
                <div className="property-type-card-icon"><PiBuildingApartment size={48} /></div>
                <h3 className="property-type-card-title">{t('addPropertyTypeApartmentTitle')}</h3>
                <p className="property-type-card-description">{t('addPropertyTypeApartmentDescription')}</p>
                <button type="button" className="property-type-card-button" onClick={(e) => { e.stopPropagation(); handlePropertyTypeSelect('apartment', true) }}>{t('addPropertyTypeContinue')}</button>
              </div>
              <div className="property-type-card-large" onClick={() => handlePropertyTypeSelect('villa', true)}>
                <div className="property-type-card-icon"><PiBuildings size={48} /></div>
                <h3 className="property-type-card-title">{t('addPropertyTypeVillaTitle')}</h3>
                <p className="property-type-card-description">{t('addPropertyTypeVillaDescription')}</p>
                <button type="button" className="property-type-card-button" onClick={(e) => { e.stopPropagation(); handlePropertyTypeSelect('villa', true) }}>{t('addPropertyTypeContinue')}</button>
              </div>
              <div className="property-type-card-large" onClick={() => handlePropertyTypeSelect('commercial', true)}>
                <div className="property-type-card-icon"><PiWarehouse size={48} /></div>
                <h3 className="property-type-card-title">{t('addPropertyTypeApartmentsTitle')}</h3>
                <p className="property-type-card-description">{t('addPropertyTypeApartmentsDescription')}</p>
                <button type="button" className="property-type-card-button" onClick={(e) => { e.stopPropagation(); handlePropertyTypeSelect('commercial', true) }}>{t('addPropertyTypeContinue')}</button>
              </div>
            </div>
          </div>
        ) : wizardRenderStep === 'debt-type-selection' ? (
          /* Выбор типа объекта для продажи долгов (те же 4 типа) */
          <div className="property-type-selection-screen">
            <div className="property-type-selection-header">
              <h2 className="property-type-selection-title">
                {t('addPropertyDebtTypeTitle')}
              </h2>
              <p className="property-type-selection-subtitle">
                {t('addPropertyDebtTypeSubtitle')}
              </p>
            </div>
            <div className="property-type-cards-container">
              <div className="property-type-card-large" onClick={() => handleDebtPropertyTypeSelect('house')}>
                <div className="property-type-card-icon"><FiHome size={48} /></div>
                <h3 className="property-type-card-title">{t('addPropertyTypeHouseTitle')}</h3>
                <p className="property-type-card-description">{t('addPropertyTypeHouseDescription')}</p>
                <button type="button" className="property-type-card-button" onClick={(e) => { e.stopPropagation(); handleDebtPropertyTypeSelect('house') }}>{t('addPropertyTypeContinue')}</button>
              </div>
              <div className="property-type-card-large" onClick={() => handleDebtPropertyTypeSelect('apartment')}>
                <div className="property-type-card-icon"><PiBuildingApartment size={48} /></div>
                <h3 className="property-type-card-title">{t('addPropertyTypeApartmentTitle')}</h3>
                <p className="property-type-card-description">{t('addPropertyTypeApartmentDescription')}</p>
                <button type="button" className="property-type-card-button" onClick={(e) => { e.stopPropagation(); handleDebtPropertyTypeSelect('apartment') }}>{t('addPropertyTypeContinue')}</button>
              </div>
              <div className="property-type-card-large" onClick={() => handleDebtPropertyTypeSelect('villa')}>
                <div className="property-type-card-icon"><PiBuildings size={48} /></div>
                <h3 className="property-type-card-title">{t('addPropertyTypeVillaTitle')}</h3>
                <p className="property-type-card-description">{t('addPropertyTypeVillaDescription')}</p>
                <button type="button" className="property-type-card-button" onClick={(e) => { e.stopPropagation(); handleDebtPropertyTypeSelect('villa') }}>{t('addPropertyTypeContinue')}</button>
              </div>
              <div className="property-type-card-large" onClick={() => handleDebtPropertyTypeSelect('commercial')}>
                <div className="property-type-card-icon"><PiWarehouse size={48} /></div>
                <h3 className="property-type-card-title">{t('addPropertyTypeApartmentsTitle')}</h3>
                <p className="property-type-card-description">{t('addPropertyTypeApartmentsDescription')}</p>
                <button type="button" className="property-type-card-button" onClick={(e) => { e.stopPropagation(); handleDebtPropertyTypeSelect('commercial') }}>{t('addPropertyTypeContinue')}</button>
              </div>
            </div>
          </div>
        ) : wizardRenderStep === 'test-drive-question' ? (
          /* Экран вопроса о тест-драйве */
          <div className="test-drive-question-screen">
            <div className="test-drive-question-content">
              <div className="test-drive-property-icon">
                {getPropertyTypeIcon(formData.propertyType)}
              </div>
              <h2 className="test-drive-question-title">
                {t('addPropertyTestDriveTitle')}
              </h2>
              <p className="test-drive-question-description">
                {t('addPropertyTestDriveSubtitle')}
              </p>
              <div className="test-drive-buttons">
                <button
                  type="button"
                  className="test-drive-button test-drive-button--yes"
                  onClick={() => handleTestDriveAnswer(true)}
                >
                  {t('addPropertyTestDriveYes')}
                </button>
                <button
                  type="button"
                  className="test-drive-button test-drive-button--no"
                  onClick={() => handleTestDriveAnswer(false)}
                >
                  {t('addPropertyTestDriveNo')}
                </button>
              </div>
            </div>


          </div>
        ) : wizardRenderStep === 'test-drive-pricing' ? (
          <div className="property-name-screen">
            <div className="property-name-main">
              <h2 className="property-name-title">Настройки тест-драйва</h2>
              <p className="property-name-subtitle" style={{ marginBottom: 18 }}>
                Укажите стоимость за сутки и страховой депозит для клиента.
              </p>
              <div className="property-name-input-group">
                <label className="property-name-label">Стоимость за сутки</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.testDrivePricePerDay || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      testDrivePricePerDay: e.target.value,
                    }))
                  }
                  className="property-name-input"
                  placeholder="0"
                />
              </div>
              <div className="property-name-input-group">
                <label className="property-name-label">Страховой депозит</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.testDriveInsuranceDeposit || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      testDriveInsuranceDeposit: e.target.value,
                    }))
                  }
                  className="property-name-input"
                  placeholder="0"
                />
              </div>
              <div className="property-name-actions">
                <button
                  type="button"
                  className="property-name-back-btn"
                  onClick={() => setCurrentStep('test-drive-question')}
                >
                  <FiChevronLeft size={16} />
                  {t('addPropertyBack')}
                </button>
                <button
                  type="button"
                  className="property-name-continue-btn"
                  onClick={() => {
                    const price = Number(formData.testDrivePricePerDay)
                    const deposit = Number(formData.testDriveInsuranceDeposit)
                    if (!(price > 0)) {
                      showNotification('Укажите стоимость за сутки больше 0')
                      return
                    }
                    if (deposit < 0) {
                      showNotification('Страховой депозит не может быть отрицательным')
                      return
                    }
                    setCurrentStep('listing-type')
                  }}
                >
                  {t('addPropertyContinue')}
                  <FiChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        ) : wizardRenderStep === 'property-name' ? (
          /* Экран ввода названия и описания */
          <div className="property-name-screen">
            <div className="property-name-main">
              <h2 className="property-name-title">
                {t('addPropertyNameTitle')}
              </h2>
              
              <div className="property-name-input-group">
                <label className="property-name-label">{t('addPropertyNameLabelTitle')}</label>
                <input
                  type="text"
                  id="add-property-title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="property-name-input"
                  placeholder={t(getAddPropertyNamePlaceholderKey(formData.propertyType))}
                />
              </div>

              <div className="property-name-input-group">
                <label className="property-name-label" htmlFor="add-property-description">
                  {t('addPropertyNameLabelDescription')}
                </label>
                <textarea
                  id="add-property-description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="property-name-textarea"
                  placeholder={t('addPropertyNamePlaceholderDescription')}
                  rows="6"
                />
                <div className="property-name-generate-row">
                  <AnimatedGenerateButton
                    labelIdle={t('addPropertyGenerateDescriptionButton')}
                    labelActive={t('addPropertyGeneratingDescription')}
                    generating={isGeneratingDescription}
                    highlightHueDeg={210}
                    onClick={handleGenerateDescription}
                    disabled={isGeneratingDescription}
                    ariaLabel={t('addPropertyGenerateDescriptionButton')}
                    className="property-name-generate-btn-wrap"
                  />
                </div>
              </div>

              <div className="property-name-actions">
                <button
                  type="button"
                  className="property-name-back-btn"
                  onClick={() => setCurrentStep('test-drive-question')}
                >
                  <FiChevronLeft size={16} />
                  {t('addPropertyBack')}
                </button>
                <button
                  type="button"
                  className="property-name-continue-btn"
                  onClick={handlePropertyNameContinue}
                >
                  {t('addPropertyTypeContinue')}
                </button>
              </div>
            </div>

            <div className="property-name-hints">
              {showHint1 && (
                <div className="property-name-hint-card">
                  <div className="property-name-hint-header">
                    <div className="property-name-hint-icon property-name-hint-icon--thumbs">
                      <FiThumbsUp size={20} />
                    </div>
                    <h3 className="property-name-hint-title">
                      {t('addPropertyNameHint1Title')}
                    </h3>
                    <button
                      type="button"
                      className="property-name-hint-close"
                      onClick={() => setShowHint1(false)}
                    >
                      <FiX size={18} />
                    </button>
                  </div>
                  <ul className="property-name-hint-list">
                    <li>{t('addPropertyNameHint1Item1')}</li>
                    <li>{t('addPropertyNameHint1Item2')}</li>
                    <li>{t('addPropertyNameHint1Item3')}</li>
                  </ul>
                </div>
              )}

              {showHint2 && (
                <div className="property-name-hint-card">
                  <div className="property-name-hint-header">
                    <div className="property-name-hint-icon property-name-hint-icon--bulb">
                      <MdLightbulb size={20} />
                    </div>
                    <h3 className="property-name-hint-title">
                      {t('addPropertyNameHint2Title')}
                    </h3>
                    <button
                      type="button"
                      className="property-name-hint-close"
                      onClick={() => setShowHint2(false)}
                    >
                      <FiX size={18} />
                    </button>
                  </div>
                  <p className="property-name-hint-text">
                    {t('addPropertyNameHint2Text')}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : wizardRenderStep === 'location' ? (
          /* Экран ввода местоположения */
          <div className="property-location-screen">
            <div className="property-location-main">
              <h2 className="property-location-title">
                {t('addPropertyLocationTitle')}
              </h2>
              
              {/* Упрощенный режим для редактирования - только поле Адрес */}
              {isEditMode && !isEditingLocation && (formData.address || formData.location) ? (
                <div className="property-location-input-group">
                  <label className="property-location-label">
                    {t('addPropertyLocationSimpleAddressLabel')}
                  </label>
                  <div className="property-location-search-wrapper">
                    <input
                      type="text"
                      value={addressSearch || ''}
                      onChange={(e) => {
                        const value = e.target.value
                        // Сразу обновляем addressSearch, чтобы поле реагировало на изменения
                        setAddressSearch(value)
                        
                        // Если поле очищено, переключаемся на полную форму
                        if (!value.trim()) {
                          // Устанавливаем флаг редактирования ПЕРЕД очисткой данных
                          setIsEditingLocation(true)
                          // Очищаем все данные
                          setFormData(prev => ({
                            ...prev,
                            address: '',
                            location: '',
                            coordinates: null
                          }))
                          setSelectedCoordinates(null)
                          setMapCenter(null)
                          setAddressSuggestions([])
                          setShowSuggestions(false)
                          // Явно устанавливаем пустую строку, чтобы предотвратить восстановление
                          setAddressSearch('')
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            address: value,
                            location: value
                          }))
                        }
                      }}
                      className="property-location-input"
                      placeholder={t('addPropertyLocationSimpleAddressPlaceholder')}
                    />
                  </div>
                  <p className="property-location-hint" style={{ marginTop: '8px', fontSize: '14px', color: '#666' }}>
                    {t('addPropertyLocationSimpleHint')}
                  </p>
                </div>
              ) : (
                <>
                  {/* Полная форма для добавления или редактирования */}
                  <div className="property-location-input-group">
                    <label className="property-location-label">
                      {t('addPropertyLocationCountryLabel')}
                    </label>
                    <CountrySelect
                      value={formData.country}
                      onChange={async (countryName) => {
                        setFormData(prev => ({ ...prev, country: countryName }))
                        if (citySearch) {
                          searchCity(citySearch, countryName)
                        }
                        if (!countryName || !String(countryName).trim()) {
                          setLocationMapZoom(null)
                          return
                        }
                        const item = await fetchNominatimFirst(countryName)
                        if (!item) return
                        const lat = parseFloat(item.lat)
                        const lng = parseFloat(item.lon)
                        if (isNaN(lat) || isNaN(lng)) return
                        setMapCenter([lat, lng])
                        setSelectedCoordinates([lat, lng])
                        setLocationMapZoom(6)
                      }}
                      placeholder={t('addPropertyLocationCountryPlaceholder')}
                      className="property-location-country-select"
                    />
                  </div>

              <div className="property-location-input-group">
                <label className="property-location-label">
                  {t('addPropertyLocationCityLabel')}
                </label>
                <div className="property-location-search-wrapper">
                  <input
                    type="text"
                    ref={citySearchRef}
                    value={citySearch}
                    onChange={(e) => {
                      const value = e.target.value
                      setCitySearch(value)
                      // Сохраняем только название города в formData.city
                      const cityName = value.split(',')[0].trim()
                      setFormData(prev => ({ ...prev, city: cityName }))
                      
                      // Очищаем предыдущий timeout
                      if (citySearchTimeoutRef.current) {
                        clearTimeout(citySearchTimeoutRef.current)
                      }
                      
                      // Если введено 2+ символа, запускаем поиск после паузы
                      if (value.length >= 2) {
                        citySearchTimeoutRef.current = setTimeout(() => {
                          searchCity(value, formData.country)
                        }, 700)
                      } else {
                        setCitySuggestions([])
                        setShowCitySuggestions(false)
                        setIsCitySearching(false)
                        setLocationMapZoom(null)
                      }
                    }}
                    onFocus={() => {
                      // Всегда показываем подсказки, если они есть
                      if (citySuggestions.length > 0) {
                        setShowCitySuggestions(true)
                      }
                      // Если есть текст, но нет подсказок, запускаем поиск
                      if (citySearch && citySearch.length >= 2 && citySuggestions.length === 0) {
                        searchCity(citySearch, formData.country)
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowCitySuggestions(false), 200)
                    }}
                    className="property-location-input property-location-input--with-icon"
                    placeholder={t('addPropertyLocationCityPlaceholder')}
                  />
                  <div className="property-location-input-icon">
                    {isCitySearching ? (
                      <FiLoader className="spinner" size={18} />
                    ) : (citySearch.length >= 2 && (citySuggestions.length > 0 || citySearch.includes(','))) ? (
                      <FiCheck size={18} />
                    ) : (citySearch.length >= 2 && citySuggestions.length === 0 && !citySearch.includes(',')) ? (
                      <FiLoader className="spinner" size={18} />
                    ) : null}
                  </div>
                  {showCitySuggestions && citySuggestions.length > 0 && (
                    <div className="property-location-suggestions">
                      {citySuggestions.map((city, index) => (
                        <div
                          key={index}
                          className="property-location-suggestion-item"
                          onClick={() => handleCitySelect(city)}
                        >
                          <FiMapPin size={16} />
                          <span>{city.display_name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="property-location-input-group">
                <label className="property-location-label">
                  {t('addPropertyLocationStreetLabel')}
                </label>
                <div className="property-location-search-wrapper">
                  <input
                    id="address-search-input"
                    type="text"
                    value={addressSearch}
                    onChange={(e) => {
                      const value = e.target.value
                      setAddressSearch(value)
                      // Если адрес очистили — очищаем номер дома и связанные данные
                      if (!value.trim()) {
                        setAddressSuggestions([])
                        setShowSuggestions(false)
                        setIsAddressSearching(false)
                        setHouseSuggestions([])
                        setShowHouseSuggestions(false)
                        setSelectedCoordinates(null)
                        setMapCenter(null)
                        setLocationMapZoom(null)
                        setFormData(prev => ({
                          ...prev,
                          address: '',
                          location: '',
                          coordinates: null,
                          apartment: ''
                        }))
                        return
                      }

                      // Пока введено меньше 3 символов или не выбран город — не ищем
                      if (value.length < 3 || !formData.city) {
                        setAddressSuggestions([])
                        setShowSuggestions(false)
                        setIsAddressSearching(false)
                      }
                    }}
                    onFocus={() => {
                      if (addressSuggestions.length > 0) {
                        setShowSuggestions(true)
                      } else if (addressSearch && addressSearch.length >= 2 && formData.city) {
                        // Если есть текст, но нет подсказок, запускаем поиск
                        searchAddress(addressSearch)
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowSuggestions(false), 200)
                    }}
                    className="property-location-input property-location-input--with-icon"
                    placeholder={
                      formData.city
                        ? t('addPropertyLocationStreetPlaceholder')
                        : t('addPropertyLocationStreetPlaceholderNoCity')
                    }
                    disabled={!formData.city}
                  />
                  {formData.city && (
                    <div className="property-location-input-icon">
                      {isAddressSearching ? (
                        <FiLoader className="spinner" size={18} />
                      ) : (addressSearch.length >= 2 && (addressSuggestions.length > 0 || addressSearch.includes(','))) ? (
                        <FiCheck size={18} />
                      ) : (addressSearch.length >= 2 && addressSuggestions.length === 0 && !addressSearch.includes(',')) ? (
                        <FiLoader className="spinner" size={18} />
                      ) : null}
                    </div>
                  )}
                  {showSuggestions && addressSuggestions.length > 0 && (
                    <div className="property-location-suggestions">
                      {getUniqueAddressSuggestions().map(({ suggestion, label }, index) => (
                        <div
                          key={index}
                          className="property-location-suggestion-item"
                          onClick={() => handleAddressSelect(suggestion)}
                        >
                          <FiMapPin size={16} />
                          <span>{label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="property-location-input-group">
              <label className="property-location-label">
                {t('addPropertyLocationHouseNumberLabel')}
              </label>
                <div className="property-location-search-wrapper">
                  <input
                    type="text"
                    name="apartment"
                    value={formData.apartment}
                    onChange={(e) => {
                      handleInputChange(e)
                      const value = e.target.value

                      if (houseSearchTimeoutRef.current) {
                        clearTimeout(houseSearchTimeoutRef.current)
                      }

                      if (value && addressSearch && formData.city) {
                        houseSearchTimeoutRef.current = setTimeout(() => {
                          searchHouse(value)
                        }, 600)
                      } else {
                        setHouseSuggestions([])
                        setShowHouseSuggestions(false)
                      }
                    }}
                    onFocus={() => {
                      if (houseSuggestions.length > 0) {
                        setShowHouseSuggestions(true)
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowHouseSuggestions(false), 200)
                    }}
                    className="property-location-input"
                    placeholder={t('addPropertyLocationHouseNumberPlaceholder')}
                  />
                  {showHouseSuggestions && houseSuggestions.length > 0 && (
                    <div className="property-location-suggestions">
                      {houseSuggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          className="property-location-suggestion-item"
                          onClick={() => handleHouseSelect(suggestion)}
                        >
                          <FiMapPin size={16} />
                          <span>{formatShortAddressWithHouse(suggestion)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
                </>
              )}

              <div className="property-location-actions">
                <button
                  type="button"
                  className="property-location-back-btn"
                  onClick={() => setCurrentStep('property-name')}
                >
                  <FiChevronLeft size={16} />
                  {t('addPropertyBack')}
                </button>
                <button
                  type="button"
                  className="property-location-continue-btn"
                  onClick={handleLocationContinue}
                >
                  {t('addPropertyTypeContinue')}
                </button>
              </div>
            </div>

            <div className="property-location-map">
              {typeof window !== 'undefined' && (() => {
                // Определяем координаты для карты
                // Для нового объекта используем дефолтные координаты без маркера
                // Для редактирования используем координаты из данных
                let mapCoords = [55, 20] // Дефолтные координаты (вид над Европой) [lat, lng]
                let hasValidCoords = false
                let shouldShowMarker = false // Флаг для отображения маркера
                
                // Функция для валидации и нормализации координат
                const validateAndNormalizeCoords = (coords) => {
                  if (!coords || !Array.isArray(coords) || coords.length < 2) return null
                  
                  let lat = parseFloat(coords[0])
                  let lng = parseFloat(coords[1])
                  
                  // Проверяем, не перепутаны ли координаты (если lat > 90 или lat < -90, но lng в диапазоне lat)
                  // Это может означать, что координаты перепутаны местами
                  if ((lat > 90 || lat < -90) && (lng >= -90 && lng <= 90)) {
                    // Координаты перепутаны, меняем местами
                    console.warn('⚠️ Координаты перепутаны местами, исправляем:', [lat, lng], '->', [lng, lat])
                    [lat, lng] = [lng, lat]
                  }
                  
                  if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                    return [lat, lng]
                  }
                  return null
                }
                
                // Для нового объекта (не редактирование) проверяем координаты из выбранного адреса
                if (!isEditMode) {
                  // Проверяем координаты в порядке приоритета
                  if (selectedCoordinates) {
                    const validated = validateAndNormalizeCoords(selectedCoordinates)
                    if (validated) {
                      mapCoords = validated
                      hasValidCoords = true
                      shouldShowMarker = true // Показываем маркер, если есть выбранный адрес
                      console.log('📍 Новый объект: используем selectedCoordinates:', mapCoords)
                    }
                  }
                  
                  if (!hasValidCoords && mapCenter && Array.isArray(mapCenter)) {
                    const validated = validateAndNormalizeCoords(mapCenter)
                    if (validated) {
                      mapCoords = validated
                      hasValidCoords = true
                      shouldShowMarker = true
                      console.log('📍 Новый объект: используем mapCenter:', mapCoords)
                    }
                  }
                  
                  if (!hasValidCoords && formData.coordinates) {
                    const validated = validateAndNormalizeCoords(formData.coordinates)
                    if (validated) {
                      mapCoords = validated
                      hasValidCoords = true
                      shouldShowMarker = true
                      console.log('📍 Новый объект: используем formData.coordinates:', mapCoords)
                    }
                  }
                  
                  // Если координаты не найдены, используем дефолтные без маркера
                  if (!hasValidCoords) {
                    const validated = validateAndNormalizeCoords(mapCoords)
                    if (validated) {
                      mapCoords = validated
                      hasValidCoords = true
                      shouldShowMarker = false
                      console.log('📍 Новый объект: используем дефолтные координаты без маркера:', mapCoords)
                    }
                  }
                } else {
                  // Для редактирования проверяем координаты в порядке приоритета
                  if (selectedCoordinates) {
                    const validated = validateAndNormalizeCoords(selectedCoordinates)
                    if (validated) {
                      mapCoords = validated
                      hasValidCoords = true
                      shouldShowMarker = true
                      console.log('📍 Редактирование: используем selectedCoordinates:', mapCoords)
                    }
                  }
                  
                  if (!hasValidCoords && mapCenter && Array.isArray(mapCenter)) {
                    const validated = validateAndNormalizeCoords(mapCenter)
                    if (validated) {
                      mapCoords = validated
                      hasValidCoords = true
                      shouldShowMarker = true
                      console.log('📍 Редактирование: используем mapCenter:', mapCoords)
                    }
                  }
                  
                  if (!hasValidCoords && formData.coordinates) {
                    const validated = validateAndNormalizeCoords(formData.coordinates)
                    if (validated) {
                      mapCoords = validated
                      hasValidCoords = true
                      shouldShowMarker = true
                      console.log('📍 Редактирование: используем formData.coordinates:', mapCoords)
                    }
                  }
                  
                  if (!hasValidCoords && savedLocationData?.coordinates) {
                    const validated = validateAndNormalizeCoords(savedLocationData.coordinates)
                    if (validated) {
                      mapCoords = validated
                      hasValidCoords = true
                      shouldShowMarker = true
                      console.log('📍 Редактирование: используем savedLocationData.coordinates:', mapCoords)
                      // Устанавливаем координаты для использования
                      setSelectedCoordinates(validated)
                      setMapCenter(validated)
                      setFormData(prev => ({ ...prev, coordinates: validated }))
                    }
                  }
                  
                  // Если координаты не найдены, используем дефолтные, но без маркера
                  if (!hasValidCoords) {
                    const validated = validateAndNormalizeCoords(mapCoords)
                    if (validated) {
                      mapCoords = validated
                      hasValidCoords = true
                      shouldShowMarker = false
                      console.log('📍 Редактирование: координаты не найдены, используем дефолтные без маркера:', mapCoords)
                    }
                  }
                }
                
                console.log('🗺️ Передаем координаты в LocationMap:', {
                  selectedCoordinates,
                  mapCenter,
                  formDataCoordinates: formData.coordinates,
                  savedLocationDataCoords: savedLocationData?.coordinates,
                  finalCoords: mapCoords,
                  hasValidCoords,
                  isEditMode,
                  shouldShowMarker,
                  center: hasValidCoords ? mapCoords : null,
                  marker: (hasValidCoords && shouldShowMarker) ? mapCoords : null,
                  zoom: hasValidCoords ? (shouldShowMarker ? 15 : 10) : 10
                })
                
                // Передаем координаты для центра карты
                // Маркер показываем только если shouldShowMarker = true (т.е. для редактирования с валидными координатами)
                const finalMapCoords = hasValidCoords ? mapCoords : (mapCoords && Array.isArray(mapCoords) && mapCoords.length === 2 ? mapCoords : null)
                
                // Зум: явный по шагам (страна/город/улица/дом) или 15 при точке без своего zoom
                const finalZoom =
                  locationMapZoom != null
                    ? locationMapZoom
                    : (hasValidCoords && shouldShowMarker ? 15 : undefined)

                return (
                  <LocationMap
                    center={finalMapCoords}
                    zoom={finalZoom}
                    marker={hasValidCoords && shouldShowMarker ? finalMapCoords : null}
                  />
                )
              })()}
            </div>

     
          </div>
        ) : wizardRenderStep === 'details' ? (
          /* Экран подробной информации */
          <div className="property-details-screen">
            <div className="property-details-main">
              <h2 className="property-details-title">
                {t('addPropertyDetailsTitle')}
              </h2>
              
              <div className="property-details-content-scrollable">
                {/* Новая форма для квартир и апартаментов */}
                {(formData.propertyType === 'apartment' || formData.propertyType === 'commercial') ? (
                  <div className="property-details-form">
                    {/* Строка 1: Количество комнат | Количество ванных комнат */}
                    <div className="detail-form-field detail-form-field--split">
                      <div className="detail-form-field-half">
                        <label className="detail-form-label">
                          <span className="detail-form-label-text">{t('addPropertyDetailsRoomsLabel')}</span>
                        </label>
                        <input
                          type="number"
                          value={formData.rooms}
                          onChange={(e) => handleDetailChange('rooms', e.target.value)}
                          onWheel={(e) => e.target.blur()}
                          className={`detail-form-input detail-form-input--narrow ${validationErrors.rooms ? 'detail-form-input--error' : ''}`}
                          placeholder="0"
                          min="0"
                        />
                        {validationErrors.rooms && (
                          <span className="detail-form-error">{validationErrors.rooms}</span>
                        )}
                      </div>
                      <div className="detail-form-field-half">
                        <label className="detail-form-label">
                          <span className="detail-form-label-text">{t('addPropertyDetailsBathroomsLabel')}</span>
                        </label>
                        <input
                          type="number"
                          value={formData.bathrooms}
                          onChange={(e) => handleDetailChange('bathrooms', e.target.value)}
                          onWheel={(e) => e.target.blur()}
                          className={`detail-form-input detail-form-input--narrow ${validationErrors.bathrooms ? 'detail-form-input--error' : ''}`}
                          placeholder="0"
                          min="0"
                        />
                        {validationErrors.bathrooms && (
                          <span className="detail-form-error">{validationErrors.bathrooms}</span>
                        )}
                      </div>
                    </div>

                    {/* Строка 2: Площадь объекта | Площадь жилая */}
                    <div className="detail-form-field detail-form-field--split">
                      <div className="detail-form-field-half">
                        <label className="detail-form-label">
                          <span className="detail-form-label-text detail-form-label-text--desktop">
                            {t('addPropertyDetailsAreaLabel')}
                          </span>
                          <span className="detail-form-label-text detail-form-label-text--mobile">
                            {t('addPropertyDetailsAreaLabelShort')}
                          </span>
                        </label>
                        <input
                          type="number"
                          value={formData.area}
                          onChange={(e) => handleDetailChange('area', e.target.value)}
                          onWheel={(e) => e.target.blur()}
                          className={`detail-form-input detail-form-input--narrow ${validationErrors.area ? 'detail-form-input--error' : ''}`}
                          placeholder="0"
                          min="0"
                          step="0.01"
                        />
                        {validationErrors.area && (
                          <span className="detail-form-error">{validationErrors.area}</span>
                        )}
                      </div>
                      <div className="detail-form-field-half">
                        <label className="detail-form-label">
                          <span className="detail-form-label-text">{t('addPropertyDetailsLivingAreaLabel')}</span>
                        </label>
                        <input
                          type="number"
                          value={formData.livingArea}
                          onChange={(e) => handleDetailChange('livingArea', e.target.value)}
                          onWheel={(e) => e.target.blur()}
                          className={`detail-form-input detail-form-input--narrow ${validationErrors.livingArea ? 'detail-form-input--error' : ''}`}
                          placeholder="0"
                          min="0"
                          step="0.01"
                        />
                        {validationErrors.livingArea && (
                          <span className="detail-form-error">{validationErrors.livingArea}</span>
                        )}
                      </div>
                    </div>

                    {/* Переключатель единиц измерения */}
                    <div className="detail-form-field detail-form-field--centered">
                      <label className="detail-form-label">
                        <span className="detail-form-label-text">{t('addPropertyDetailsUnitsLabel')}</span>
                      </label>
                      <div className="area-unit-toggle">
                        <button
                          type="button"
                          className={`area-unit-toggle-btn ${areaUnit === 'square_meters' ? 'active' : ''}`}
                          onClick={() => setAreaUnit('square_meters')}
                        >
                          {t('addPropertyDetailsUnitSqm')}
                        </button>
                        <button
                          type="button"
                          className={`area-unit-toggle-btn ${areaUnit === 'square_feet' ? 'active' : ''}`}
                          onClick={() => setAreaUnit('square_feet')}
                        >
                          {t('addPropertyDetailsUnitSqft')}
                        </button>
                      </div>
                    </div>

                    {/* Строка 3: Этаж | Этажность */}
                    <div className="detail-form-field detail-form-field--split">
                      <div className="detail-form-field-half">
                        <label className="detail-form-label">
                          <span className="detail-form-label-text">{t('addPropertyDetailsFloorLabel')}</span>
                        </label>
                        <input
                          type="number"
                          value={formData.floor}
                          onChange={(e) => handleDetailChange('floor', e.target.value)}
                          onWheel={(e) => e.target.blur()}
                          className={`detail-form-input detail-form-input--narrow ${validationErrors.floor ? 'detail-form-input--error' : ''}`}
                          placeholder="0"
                          min="0"
                        />
                        {validationErrors.floor && (
                          <span className="detail-form-error">{validationErrors.floor}</span>
                        )}
                      </div>
                      <div className="detail-form-field-half">
                        <label className="detail-form-label">
                          <span className="detail-form-label-text">{t('addPropertyDetailsTotalFloorsLabel')}</span>
                        </label>
                        <input
                          type="number"
                          value={formData.totalFloors}
                          onChange={(e) => handleDetailChange('totalFloors', e.target.value)}
                          onWheel={(e) => e.target.blur()}
                          className={`detail-form-input detail-form-input--narrow ${validationErrors.totalFloors ? 'detail-form-input--error' : ''}`}
                          placeholder="0"
                          min="0"
                        />
                        {validationErrors.totalFloors && (
                          <span className="detail-form-error">{validationErrors.totalFloors}</span>
                        )}
                      </div>
                    </div>

                    {/* Строка 4: Год постройки | Тип дома/здания */}
                    <div className="detail-form-field detail-form-field--split">
                      <div className="detail-form-field-half">
                        <label className="detail-form-label">
                          <span className="detail-form-label-text">{t('addPropertyDetailsYearBuiltLabel')}</span>
                        </label>
                        <input
                          type="number"
                          value={formData.yearBuilt}
                          onChange={(e) => handleDetailChange('yearBuilt', e.target.value)}
                          onWheel={(e) => e.target.blur()}
                          className={`detail-form-input detail-form-input--narrow ${validationErrors.yearBuilt ? 'detail-form-input--error' : ''}`}
                          placeholder="2025"
                          max={new Date().getFullYear()}
                        />
                        {validationErrors.yearBuilt && (
                          <span className="detail-form-error">{validationErrors.yearBuilt}</span>
                        )}
                      </div>
                      <div className="detail-form-field-half">
                        <label className="detail-form-label">
                          <span className="detail-form-label-text">{t('addPropertyDetailsBuildingTypeLabel')}</span>
                        </label>
                        <select
                          value={formData.buildingType}
                          onChange={(e) => handleDetailChange('buildingType', e.target.value)}
                          className={`detail-form-input detail-form-input--narrow detail-form-select ${validationErrors.buildingType ? 'detail-form-input--error' : ''}`}
                        >
                          <option value="">{t('addPropertyDetailsSelectType')}</option>
                          <option value="monolithic">{t('addPropertyDetailsBuildingMonolithic')}</option>
                          <option value="brick">{t('addPropertyDetailsBuildingBrick')}</option>
                          <option value="panel">{t('addPropertyDetailsBuildingPanel')}</option>
                          <option value="block">{t('addPropertyDetailsBuildingBlock')}</option>
                          <option value="wood">{t('addPropertyDetailsBuildingWood')}</option>
                          <option value="frame">{t('addPropertyDetailsBuildingFrame')}</option>
                          <option value="aerated_concrete">{t('addPropertyDetailsBuildingAerated')}</option>
                          <option value="foam_concrete">{t('addPropertyDetailsBuildingFoam')}</option>
                          <option value="other">{t('addPropertyDetailsBuildingOther')}</option>
                        </select>
                        {validationErrors.buildingType && (
                          <span className="detail-form-error">{validationErrors.buildingType}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (formData.propertyType === 'house' || formData.propertyType === 'villa') ? (
                  /* Форма для дома и виллы */
                  <div className="property-details-form">
                    {/* Переключатель единиц измерения */}
                    <div className="detail-form-field detail-form-field--centered">
                      <label className="detail-form-label">
                        <span className="detail-form-label-text">{t('addPropertyDetailsUnitsLabel')}</span>
                      </label>
                      <div className="area-unit-toggle">
                        <button
                          type="button"
                          className={`area-unit-toggle-btn ${areaUnit === 'square_meters' ? 'active' : ''}`}
                          onClick={() => setAreaUnit('square_meters')}
                        >
                          {t('addPropertyDetailsUnitSqm')}
                        </button>
                        <button
                          type="button"
                          className={`area-unit-toggle-btn ${areaUnit === 'square_feet' ? 'active' : ''}`}
                          onClick={() => setAreaUnit('square_feet')}
                        >
                          {t('addPropertyDetailsUnitSqft')}
                        </button>
                      </div>
                    </div>

                    {/* Строка: Площадь участка | Площадь объекта */}
                    <div className="detail-form-field detail-form-field--split">
                      <div className="detail-form-field-half">
                        <label className="detail-form-label">
                          <span className="detail-form-label-text">{t('addPropertyDetailsLandAreaLabel')}</span>
                        </label>
                        <input
                          type="number"
                          value={formData.landArea}
                          onChange={(e) => handleDetailChange('landArea', e.target.value)}
                          onWheel={(e) => e.target.blur()}
                          className={`detail-form-input detail-form-input--narrow ${validationErrors.landArea ? 'detail-form-input--error' : ''}`}
                          placeholder="0"
                          min="0"
                          step="0.01"
                        />
                        {validationErrors.landArea && (
                          <span className="detail-form-error">{validationErrors.landArea}</span>
                        )}
                      </div>
                      <div className="detail-form-field-half">
                        <label className="detail-form-label">
                          <span className="detail-form-label-text detail-form-label-text--desktop">
                            {t('addPropertyDetailsAreaLabel')}
                          </span>
                          <span className="detail-form-label-text detail-form-label-text--mobile">
                            {t('addPropertyDetailsAreaLabelShort')}
                          </span>
                        </label>
                        <input
                          type="number"
                          value={formData.area}
                          onChange={(e) => handleDetailChange('area', e.target.value)}
                          onWheel={(e) => e.target.blur()}
                          className={`detail-form-input detail-form-input--narrow ${validationErrors.area ? 'detail-form-input--error' : ''}`}
                          placeholder="0"
                          min="0"
                          step="0.01"
                        />
                        {validationErrors.area && (
                          <span className="detail-form-error">{validationErrors.area}</span>
                        )}
                      </div>
                    </div>

                    {/* Строка: Площадь жилая | Количество этажей */}
                    <div className="detail-form-field detail-form-field--split">
                      <div className="detail-form-field-half">
                        <label className="detail-form-label">
                          <span className="detail-form-label-text">{t('addPropertyDetailsLivingAreaLabel')}</span>
                        </label>
                        <input
                          type="number"
                          value={formData.livingArea}
                          onChange={(e) => handleDetailChange('livingArea', e.target.value)}
                          onWheel={(e) => e.target.blur()}
                          className={`detail-form-input detail-form-input--narrow ${validationErrors.livingArea ? 'detail-form-input--error' : ''}`}
                          placeholder="0"
                          min="0"
                          step="0.01"
                        />
                        {validationErrors.livingArea && (
                          <span className="detail-form-error">{validationErrors.livingArea}</span>
                        )}
                      </div>
                      <div className="detail-form-field-half">
                        <label className="detail-form-label">
                          <span className="detail-form-label-text">{t('addPropertyDetailsFloorsCountLabel')}</span>
                        </label>
                        <input
                          type="number"
                          value={formData.totalFloors}
                          onChange={(e) => handleDetailChange('totalFloors', e.target.value)}
                          onWheel={(e) => e.target.blur()}
                          className={`detail-form-input detail-form-input--narrow ${validationErrors.totalFloors ? 'detail-form-input--error' : ''}`}
                          placeholder="0"
                          min="0"
                        />
                        {validationErrors.totalFloors && (
                          <span className="detail-form-error">{validationErrors.totalFloors}</span>
                        )}
                      </div>
                    </div>

                    {/* Строка: Кол-во спален | Кол-во ванных */}
                    <div className="detail-form-field detail-form-field--split">
                      <div className="detail-form-field-half">
                        <label className="detail-form-label">
                          <span className="detail-form-label-text">{t('addPropertyDetailsBedroomsLabel')}</span>
                        </label>
                        <input
                          type="number"
                          value={formData.bedrooms}
                          onChange={(e) => handleDetailChange('bedrooms', e.target.value)}
                          onWheel={(e) => e.target.blur()}
                          className={`detail-form-input detail-form-input--narrow ${validationErrors.bedrooms ? 'detail-form-input--error' : ''}`}
                          placeholder="0"
                          min="0"
                        />
                        {validationErrors.bedrooms && (
                          <span className="detail-form-error">{validationErrors.bedrooms}</span>
                        )}
                      </div>
                      <div className="detail-form-field-half">
                        <label className="detail-form-label">
                          <span className="detail-form-label-text">{t('addPropertyDetailsBathroomsShortLabel')}</span>
                        </label>
                        <input
                          type="number"
                          value={formData.bathrooms}
                          onChange={(e) => handleDetailChange('bathrooms', e.target.value)}
                          onWheel={(e) => e.target.blur()}
                          className={`detail-form-input detail-form-input--narrow ${validationErrors.bathrooms ? 'detail-form-input--error' : ''}`}
                          placeholder="0"
                          min="0"
                        />
                        {validationErrors.bathrooms && (
                          <span className="detail-form-error">{validationErrors.bathrooms}</span>
                        )}
                      </div>
                    </div>

                    {/* Строка: Год постройки | Материал постройки */}
                    <div className="detail-form-field detail-form-field--split">
                      <div className="detail-form-field-half">
                        <label className="detail-form-label">
                          <span className="detail-form-label-text">{t('addPropertyDetailsYearBuiltLabel')}</span>
                        </label>
                        <input
                          type="number"
                          value={formData.yearBuilt}
                          onChange={(e) => handleDetailChange('yearBuilt', e.target.value)}
                          onWheel={(e) => e.target.blur()}
                          className={`detail-form-input detail-form-input--narrow ${validationErrors.yearBuilt ? 'detail-form-input--error' : ''}`}
                          placeholder="2025"
                          max={new Date().getFullYear()}
                        />
                        {validationErrors.yearBuilt && (
                          <span className="detail-form-error">{validationErrors.yearBuilt}</span>
                        )}
                      </div>
                      <div className="detail-form-field-half">
                        <label className="detail-form-label">
                          <span className="detail-form-label-text">{t('addPropertyDetailsBuildingMaterialLabel')}</span>
                        </label>
                        <select
                          value={formData.buildingType}
                          onChange={(e) => handleDetailChange('buildingType', e.target.value)}
                          className={`detail-form-input detail-form-input--narrow detail-form-select ${validationErrors.buildingType ? 'detail-form-input--error' : ''}`}
                        >
                          <option value="">{t('addPropertyDetailsSelectMaterial')}</option>
                          <option value="monolithic">{t('addPropertyDetailsBuildingMonolithic')}</option>
                          <option value="brick">{t('addPropertyDetailsBuildingBrick')}</option>
                          <option value="panel">{t('addPropertyDetailsBuildingPanel')}</option>
                          <option value="block">{t('addPropertyDetailsBuildingBlock')}</option>
                          <option value="wood">{t('addPropertyDetailsBuildingWood')}</option>
                          <option value="frame">{t('addPropertyDetailsBuildingFrame')}</option>
                          <option value="aerated_concrete">{t('addPropertyDetailsBuildingAerated')}</option>
                          <option value="foam_concrete">{t('addPropertyDetailsBuildingFoam')}</option>
                          <option value="other">{t('addPropertyDetailsBuildingOther')}</option>
                        </select>
                        {validationErrors.buildingType && (
                          <span className="detail-form-error">{validationErrors.buildingType}</span>
                        )}
                      </div>
                    </div>

                  </div>
                ) : formData.propertyType === 'land' ? (
                  <div className="property-details-form">
                    {/* Переключатель единиц измерения */}
                    <div className="detail-form-field detail-form-field--centered">
                      <label className="detail-form-label">
                        <span className="detail-form-label-text">{t('addPropertyDetailsUnitsLabel')}</span>
                      </label>
                      <div className="area-unit-toggle">
                        <button
                          type="button"
                          className={`area-unit-toggle-btn ${areaUnit === 'square_meters' ? 'active' : ''}`}
                          onClick={() => setAreaUnit('square_meters')}
                        >
                          {t('addPropertyDetailsUnitSqm')}
                        </button>
                        <button
                          type="button"
                          className={`area-unit-toggle-btn ${areaUnit === 'square_feet' ? 'active' : ''}`}
                          onClick={() => setAreaUnit('square_feet')}
                        >
                          {t('addPropertyDetailsUnitSqft')}
                        </button>
                      </div>
                    </div>

                    {/* Площадь участка */}
                    <div className="detail-form-field">
                      <label className="detail-form-label">
                        <span className="detail-form-label-text">{t('addPropertyDetailsLandAreaLabel')}</span>
                      </label>
                      <input
                        type="number"
                        value={formData.landArea}
                        onChange={(e) => handleDetailChange('landArea', e.target.value)}
                        onWheel={(e) => e.target.blur()}
                        className={`detail-form-input detail-form-input--narrow ${validationErrors.landArea ? 'detail-form-input--error' : ''}`}
                        placeholder="0"
                        min="0"
                        step="0.01"
                      />
                      {validationErrors.landArea && (
                        <span className="detail-form-error">{validationErrors.landArea}</span>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Старая форма для других типов недвижимости */
                  <>
                    {/* Блок "Where can people sleep?" */}
                    <div className="sleep-areas-section">
                      <h3 className="sleep-areas-title">Где могут спать люди?</h3>
                      <div className="sleep-areas-list">
                        {bedrooms.map((bedroom, index) => (
                          <div 
                            key={bedroom.id} 
                            className="sleep-area-item"
                            onClick={() => handleEditBedroom(bedroom)}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="sleep-area-content">
                              <div className="sleep-area-name">{bedroom.name}</div>
                              <div className="sleep-area-beds">
                                {getBedsDisplayText(bedroom.beds)}
                              </div>
                            </div>
                            {bedroom.name.startsWith('Спальня') && (
                              <button
                                type="button"
                                className="sleep-area-remove-btn"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleRemoveBedroom(bedroom.id)
                                }}
                              >
                                <FiX size={18} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="add-bedroom-btn"
                        onClick={handleAddBedroom}
                      >
                        <span className="add-bedroom-icon">+</span>
                        Добавить спальню
                      </button>
                    </div>

                    {/* Блок "Количество этажей" */}
                    <div className="floors-section">
                      <h3 className="floors-title">Количество этажей</h3>
                      <div className="number-input-control">
                        <button
                          type="button"
                          className="number-input-btn number-input-btn--minus"
                          onClick={() => handleDetailChange('totalFloors', Math.max(0, (formData.totalFloors || 0) - 1))}
                          disabled={(formData.totalFloors || 0) === 0}
                        >
                          <span className="number-input-icon">−</span>
                        </button>
                        <span className="number-input-value">{formData.totalFloors || 0}</span>
                        <button
                          type="button"
                          className="number-input-btn number-input-btn--plus"
                          onClick={() => handleDetailChange('totalFloors', (formData.totalFloors || 0) + 1)}
                        >
                          <span className="number-input-icon">+</span>
                        </button>
                      </div>
                    </div>

                    {/* Блок "How many bathrooms are there?" */}
                    <div className="bathrooms-section">
                      <h3 className="bathrooms-title">Сколько ванных комнат?</h3>
                      <div className="number-input-control">
                        <button
                          type="button"
                          className="number-input-btn number-input-btn--minus"
                          onClick={() => handleDetailChange('bathrooms', Math.max(0, (formData.bathrooms || 0) - 1))}
                          disabled={(formData.bathrooms || 0) === 0}
                        >
                          <span className="number-input-icon">−</span>
                        </button>
                        <span className="number-input-value">{formData.bathrooms || 0}</span>
                        <button
                          type="button"
                          className="number-input-btn number-input-btn--plus"
                          onClick={() => handleDetailChange('bathrooms', (formData.bathrooms || 0) + 1)}
                        >
                          <span className="number-input-icon">+</span>
                        </button>
                      </div>
                    </div>

                    {/* Блок "How big is this apartment?" */}
                    <div className="apartment-size-section">
                      <h3 className="apartment-size-title">Какой размер у этой квартиры?</h3>
                      <label className="apartment-size-label">Размер квартиры – необязательно</label>
                      <div className="apartment-size-input-group">
                        <input
                          type="number"
                          value={formData.area}
                          onChange={(e) => handleDetailChange('area', e.target.value)}
                          onWheel={(e) => e.target.blur()}
                          className="apartment-size-input"
                          placeholder="0"
                          min="0"
                        />
                        <select
                          value={areaUnit}
                          onChange={(e) => setAreaUnit(e.target.value)}
                          className="apartment-size-unit"
                        >
                          <option value="square_meters">квадратные метры</option>
                          <option value="square_feet">квадратные футы</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="property-details-actions">
                <button
                  type="button"
                  className="property-details-back-btn"
                  onClick={() => setCurrentStep('location')}
                >
                  <FiChevronLeft size={16} />
                  {t('addPropertyBack')}
                </button>
                <button
                  type="button"
                  className="property-details-continue-btn"
                  onClick={handleDetailsContinue}
                >
                  {t('addPropertyTypeContinue')}
                </button>
              </div>
            </div>

            {/* Модальное окно для редактирования кроватей */}
            {showBedModal && selectedBedroom && (
              <div className="bed-modal-overlay" onClick={() => setShowBedModal(false)}>
                <div className="bed-modal-content" onClick={(e) => e.stopPropagation()}>
                  <div className="bed-modal-header">
                    <h3 className="bed-modal-title">Какие кровати есть в этом помещении?</h3>
                    <button
                      type="button"
                      className="bed-modal-close"
                      onClick={() => setShowBedModal(false)}
                    >
                      <FiX size={20} />
                    </button>
                  </div>
                  
                  <div className="bed-types-list">
                    {['twin', 'full', 'queen', 'king'].map((bedType) => (
                      <div key={bedType} className="bed-type-item">
                        <div className="bed-type-info">
                          <MdBed size={24} className="bed-type-icon" />
                          <div className="bed-type-details">
                            <div className="bed-type-name">
                              {bedType === 'twin' ? 'Односпальная кровать' :
                               bedType === 'full' ? 'Двуспальная кровать' :
                               bedType === 'queen' ? 'Кровать размера Queen' :
                               'Кровать размера King'}
                            </div>
                            <div className="bed-type-size">{getBedSize(bedType)}</div>
                          </div>
                        </div>
                        <div className="bed-type-control">
                          <button
                            type="button"
                            className="bed-count-btn bed-count-btn--minus"
                            onClick={() => handleBedCountChange(bedType, -1)}
                            disabled={getBedCount(bedType) === 0}
                          >
                            <span className="bed-count-icon">−</span>
                          </button>
                          <span className="bed-count-value">{getBedCount(bedType)}</span>
                          <button
                            type="button"
                            className="bed-count-btn bed-count-btn--plus"
                            onClick={() => handleBedCountChange(bedType, 1)}
                          >
                            <span className="bed-count-icon">+</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bed-modal-footer">
                    <button
                      type="button"
                      className="bed-modal-save-btn"
                      onClick={() => handleSaveBeds(selectedBedroom.id, selectedBedroom.beds)}
                    >
                      Сохранить
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="property-name-hints" style={{ marginLeft: '150px' , marginTop: '75px'}}>
              <HintCard
                icon={MdBed}
                iconColor="property-name-hint-icon--thumbs"
                title={t('addPropertyDetailsHint1Title')}
                content={[
                  t('addPropertyDetailsHint1Item1'),
                  t('addPropertyDetailsHint1Item2'),
                  t('addPropertyDetailsHint1Item3')
                ]}
                show={showHints['details']}
                onClose={() => setShowHints(prev => ({ ...prev, 'details': false }))}
              />
              <HintCard
                icon={MdLightbulb}
                iconColor="property-name-hint-icon--bulb"
                title={t('addPropertyDetailsHint2Title')}
                content={t('addPropertyDetailsHint2Text')}
                show={showHints['details']}
                onClose={() => setShowHints(prev => ({ ...prev, 'details': false }))}
              />
            </div>
          </div>
        ) : wizardRenderStep === 'amenities' ? (
          /* Экран удобств / долговых обязательств */
          formData.isDebtProperty ? (
            <div className="property-amenities-screen">
              <div className="property-amenities-main">
                <h2 className="property-amenities-title">
                  Долговые обязательства по объекту
                </h2>

                <div className="property-amenities-content-scrollable">
                  {/* Сумма долга */}
                  <div className="amenities-category">
                    <h4 className="amenities-category-title">
                      <span className="amenities-category-icon">💰</span>
                      Сумма долга
                    </h4>
                    <div className="price-input-section">
                      <label className="price-input-label">
                        Общая сумма задолженности по объекту
                      </label>
                      <div className="price-input-wrapper-large">
                        <div className="currency-selector">
                          <button
                            type="button"
                            className="currency-button"
                            onClick={() =>
                              setShowCurrencyDropdown(
                                showCurrencyDropdown === 'debt_amount' ? null : 'debt_amount'
                              )
                            }
                          >
                            <span className="currency-symbol">
                              {currencies.find(c => c.code === currency)?.symbol || '$'}
                            </span>
                            <FiChevronDown className="currency-chevron" size={14} />
                          </button>
                          {showCurrencyDropdown === 'debt_amount' && (
                            <div className="currency-dropdown">
                              {currencies.map(c => (
                                <button
                                  key={c.code}
                                  type="button"
                                  className={`currency-option ${
                                    c.code === currency ? 'currency-option--active' : ''
                                  }`}
                                  onClick={() => {
                                    setCurrency(c.code)
                                    setShowCurrencyDropdown(null)
                                  }}
                                >
                                  <span className="currency-option-symbol">{c.symbol}</span>
                                  <span className="currency-option-name">{c.name}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <input
                          id="debt-amount-input"
                          type="text"
                          className="price-input-large price-input-large--debt"
                          placeholder="Введите сумму долга"
                          value={formData.debtAmount || ''}
                          onChange={(e) => handleDetailChange('debtAmount', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="property-amenities-actions">
                  <button
                    type="button"
                    className="property-amenities-back-btn"
                    onClick={() => setCurrentStep('details')}
                  >
                    <FiChevronLeft size={16} />
                    Назад
                  </button>
                  <button
                    type="button"
                    className="property-amenities-continue-btn"
                    onClick={handleAmenitiesContinue}
                  >
                    Продолжить
                  </button>
                </div>
              </div>

              <div className="property-name-hints" style={{ marginLeft: '150px' , marginTop: '75px'}}>
                <HintCard
                  icon={MdLightbulb}
                  iconColor="property-name-hint-icon--thumbs"
                  title="Сумма долга"
                  content={[
                    "Укажите ориентировочную общую сумму задолженности по объекту",
                    "Чем прозрачнее информация, тем выше доверие покупателей"
                  ]}
                  show={showHints['amenities']}
                  onClose={() => setShowHints(prev => ({ ...prev, 'amenities': false }))}
                />
              </div>
            </div>
          ) : (
            <div className="property-amenities-screen">
              <div className="property-amenities-main">
                <h2 className="property-amenities-title">
                  {t('addPropertyAmenitiesTitle')}
                </h2>
                
                <div className="property-amenities-content-scrollable">
                  {/* Парковка */}
                  <div className="amenities-category">
                    <h4 className="amenities-category-title">
                      <span className="amenities-category-icon">🚗</span>
                      {t('addPropertyAmenitiesCategoryParking')}
                    </h4>
                    <div className="amenities-list">
                      <label className="amenity-item">
                        <input
                          type="checkbox"
                          checked={formData.parking || false}
                          onChange={(e) => handleDetailChange('parking', e.target.checked)}
                          className="amenity-checkbox"
                        />
                        <span className="amenity-label">{t('addPropertyAmenitiesParkingSpace')}</span>
                      </label>
                      <label className="amenity-item">
                        <input
                          type="checkbox"
                          checked={formData.feature1 || false}
                          onChange={(e) => handleDetailChange('feature1', e.target.checked)}
                          className="amenity-checkbox"
                        />
                        <span className="amenity-label">{t('addPropertyAmenitiesUndergroundParking')}</span>
                      </label>
                      <label className="amenity-item">
                        <input
                          type="checkbox"
                          checked={formData.feature12 || false}
                          onChange={(e) => handleDetailChange('feature12', e.target.checked)}
                          className="amenity-checkbox"
                        />
                        <span className="amenity-label">{t('addPropertyAmenitiesBikeParking')}</span>
                      </label>
                    </div>
                  </div>

                  {/* Мебель и техника */}
                  <div className="amenities-category">
                    <h4 className="amenities-category-title">
                      <span className="amenities-category-icon">🛋️</span>
                      {t('addPropertyAmenitiesCategoryFurniture')}
                    </h4>
                    <div className="amenities-list">
                      <label className="amenity-item">
                        <input
                          type="checkbox"
                          checked={formData.feature2 || false}
                          onChange={(e) => handleDetailChange('feature2', e.target.checked)}
                          className="amenity-checkbox"
                        />
                        <span className="amenity-label">{t('addPropertyAmenitiesKitchenFurniture')}</span>
                      </label>
                      <label className="amenity-item">
                        <input
                          type="checkbox"
                          checked={formData.furniture || false}
                          onChange={(e) => handleDetailChange('furniture', e.target.checked)}
                          className="amenity-checkbox"
                        />
                        <span className="amenity-label">{t('addPropertyAmenitiesBuiltInFurniture')}</span>
                      </label>
                      <label className="amenity-item">
                        <input
                          type="checkbox"
                          checked={formData.feature3 || false}
                          onChange={(e) => handleDetailChange('feature3', e.target.checked)}
                          className="amenity-checkbox"
                        />
                        <span className="amenity-label">{t('addPropertyAmenitiesWashingMachine')}</span>
                      </label>
                      <label className="amenity-item">
                        <input
                          type="checkbox"
                          checked={formData.feature4 || false}
                          onChange={(e) => handleDetailChange('feature4', e.target.checked)}
                          className="amenity-checkbox"
                        />
                        <span className="amenity-label">{t('addPropertyAmenitiesDishwasher')}</span>
                      </label>
                      <label className="amenity-item">
                        <input
                          type="checkbox"
                          checked={formData.electricity || false}
                          onChange={(e) => handleDetailChange('electricity', e.target.checked)}
                          className="amenity-checkbox"
                        />
                        <span className="amenity-label">{t('addPropertyAmenitiesAirConditioning')}</span>
                      </label>
                      <label className="amenity-item">
                        <input
                          type="checkbox"
                          checked={formData.feature18 || false}
                          onChange={(e) => handleDetailChange('feature18', e.target.checked)}
                          className="amenity-checkbox"
                        />
                        <span className="amenity-label">{t('addPropertyAmenitiesWardrobe')}</span>
                      </label>
                    </div>
                  </div>

                  {/* Коммуникации и безопасность */}
                  <div className="amenities-category">
                    <h4 className="amenities-category-title">
                      <span className="amenities-category-icon">🔒</span>
                      {t('addPropertyAmenitiesCategorySecurity')}
                    </h4>
                    <div className="amenities-list">
                      <label className="amenity-item">
                        <input
                          type="checkbox"
                          checked={formData.internet || false}
                          onChange={(e) => handleDetailChange('internet', e.target.checked)}
                          className="amenity-checkbox"
                        />
                        <span className="amenity-label">{t('addPropertyAmenitiesInternet')}</span>
                      </label>
                      <label className="amenity-item">
                        <input
                          type="checkbox"
                          checked={formData.security || false}
                          onChange={(e) => handleDetailChange('security', e.target.checked)}
                          className="amenity-checkbox"
                        />
                        <span className="amenity-label">{t('addPropertyAmenitiesSecurity')}</span>
                      </label>
                      <label className="amenity-item">
                        <input
                          type="checkbox"
                          checked={formData.feature5 || false}
                          onChange={(e) => handleDetailChange('feature5', e.target.checked)}
                          className="amenity-checkbox"
                        />
                        <span className="amenity-label">{t('addPropertyAmenitiesIntercom')}</span>
                      </label>
                      <label className="amenity-item">
                        <input
                          type="checkbox"
                          checked={formData.feature6 || false}
                          onChange={(e) => handleDetailChange('feature6', e.target.checked)}
                          className="amenity-checkbox"
                        />
                        <span className="amenity-label">{t('addPropertyAmenitiesCctv')}</span>
                      </label>
                      <label className="amenity-item">
                        <input
                          type="checkbox"
                          checked={formData.feature16 || false}
                          onChange={(e) => handleDetailChange('feature16', e.target.checked)}
                          className="amenity-checkbox"
                        />
                        <span className="amenity-label">{t('addPropertyAmenitiesVideoIntercom')}</span>
                      </label>
                      <label className="amenity-item">
                        <input
                          type="checkbox"
                          checked={formData.feature17 || false}
                          onChange={(e) => handleDetailChange('feature17', e.target.checked)}
                          className="amenity-checkbox"
                        />
                        <span className="amenity-label">{t('addPropertyAmenitiesConcierge')}</span>
                      </label>
                    </div>
                  </div>

                  {/* Дополнительные помещения */}
                  <div className="amenities-category">
                    <h4 className="amenities-category-title">
                      <span className="amenities-category-icon">🏠</span>
                      {t('addPropertyAmenitiesCategoryRooms')}
                    </h4>
                    <div className="amenities-list">
                      <label className="amenity-item">
                        <input
                          type="checkbox"
                          checked={formData.balcony || false}
                          onChange={(e) => handleDetailChange('balcony', e.target.checked)}
                          className="amenity-checkbox"
                        />
                        <span className="amenity-label">{t('addPropertyAmenitiesBalcony')}</span>
                      </label>
                      <label className="amenity-item">
                        <input
                          type="checkbox"
                          checked={formData.feature7 || false}
                          onChange={(e) => handleDetailChange('feature7', e.target.checked)}
                          className="amenity-checkbox"
                        />
                        <span className="amenity-label">{t('addPropertyAmenitiesLoggia')}</span>
                      </label>
                      <label className="amenity-item">
                        <input
                          type="checkbox"
                          checked={formData.feature8 || false}
                          onChange={(e) => handleDetailChange('feature8', e.target.checked)}
                          className="amenity-checkbox"
                        />
                        <span className="amenity-label">{t('addPropertyAmenitiesStorage')}</span>
                      </label>
                      <label className="amenity-item">
                        <input
                          type="checkbox"
                          checked={formData.elevator || false}
                          onChange={(e) => handleDetailChange('elevator', e.target.checked)}
                          className="amenity-checkbox"
                        />
                        <span className="amenity-label">{t('addPropertyAmenitiesElevator')}</span>
                      </label>
                    </div>
                  </div>

                  {/* Дополнительно */}
                  <div className="amenities-category">
                    <h4 className="amenities-category-title">
                      <span className="amenities-category-icon">➕</span>
                      {t('addPropertyAmenitiesCategoryOther')}
                    </h4>
                    <div className="amenities-additional-field">
                      <label className="amenities-additional-label">
                        {t('addPropertyAmenitiesOtherLabel')}
                      </label>
                      <textarea
                        className="amenities-additional-textarea"
                        placeholder={t('addPropertyAmenitiesOtherPlaceholder')}
                        value={formData.additionalAmenities || ''}
                        onChange={(e) => handleDetailChange('additionalAmenities', e.target.value)}
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                <div className="property-amenities-actions">
                  <button
                    type="button"
                    className="property-amenities-back-btn"
                    onClick={() => setCurrentStep('details')}
                  >
                    <FiChevronLeft size={16} />
                    {t('addPropertyBack')}
                  </button>
                  <button
                    type="button"
                    className="property-amenities-continue-btn"
                    onClick={handleAmenitiesContinue}
                  >
                    {t('addPropertyTypeContinue')}
                  </button>
                </div>
              </div>

              <div className="property-name-hints" style={{ marginLeft: '150px' , marginTop: '75px'}}>
                <HintCard
                  icon={MdLightbulb}
                  iconColor="property-name-hint-icon--thumbs"
                  title={t('addPropertyAmenitiesHint1Title')}
                  content={[
                    t('addPropertyAmenitiesHint1Item1'),
                    t('addPropertyAmenitiesHint1Item2'),
                    t('addPropertyAmenitiesHint1Item3')
                  ]}
                  show={showHints['amenities']}
                  onClose={() => setShowHints(prev => ({ ...prev, 'amenities': false }))}
                />
                <HintCard
                  icon={FiThumbsUp}
                  iconColor="property-name-hint-icon--bulb"
                  title={t('addPropertyAmenitiesHint2Title')}
                  content={t('addPropertyAmenitiesHint2Text')}
                  show={showHints['amenities']}
                  onClose={() => setShowHints(prev => ({ ...prev, 'amenities': false }))}
                />
              </div>
            </div>
          )
        ) : wizardRenderStep === 'photos' ? (
          /* Экран загрузки фотографий */
          <div className="property-photos-screen">
            <div className="property-photos-main">
              <h2 className="property-photos-title">
                {t('addPropertyPhotosTitle')}
              </h2>
              
              <p className="property-photos-description">
                {t('addPropertyPhotosDescription')}
              </p>

              {/* Большой блок для drag and drop и отображения медиа */}
              <div 
                className={`photos-upload-area ${isDragging ? 'photos-upload-area--dragging' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {mediaItems.length === 0 ? (
                  <div className="photos-upload-placeholder">
                    <div className="photos-upload-icon">
                      <FiUpload size={48} />
                    </div>
                    <p className="photos-upload-text">{t('addPropertyPhotosDragText')}</p>
                    <button
                      type="button"
                      className="photos-upload-btn"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <FiUpload size={20} />
                      {t('addPropertyPhotosUploadBtn')}
                    </button>
                    <p className="photos-upload-hint">{t('addPropertyPhotosFormatHint')}</p>
                  </div>
                ) : (
                  <div className="photos-carousel-container">
                    {/* Кнопка назад */}
                    {mediaItems.length > 1 && (
                      <button
                        type="button"
                        className="photos-carousel-nav photos-carousel-nav--prev"
                        onClick={handlePrevMedia}
                      >
                        <FiChevronLeft size={24} />
                      </button>
                    )}

                    {/* Текущее медиа */}
                    {mediaItems.length > 0 && photosMediaIndex >= 0 && photosMediaIndex < mediaItems.length && mediaItems[photosMediaIndex] && (
                      <div className="photos-carousel-item">
                        {(() => {
                          const currentMedia = mediaItems[photosMediaIndex]
                          if (!currentMedia) return null
                          
                          if (currentMedia.mediaType === 'photo') {
                            return (
                              <img 
                                src={currentMedia.url} 
                                alt={`Фото ${photosMediaIndex + 1}`}
                                className="photos-carousel-image"
                              />
                            )
                          } else if (currentMedia.type === 'youtube' && currentMedia.videoId) {
                            return (
                              <iframe
                                src={`https://www.youtube.com/embed/${currentMedia.videoId}`}
                                title={`YouTube видео ${photosMediaIndex + 1}`}
                                className="photos-carousel-video"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            )
                          } else if (currentMedia.type === 'googledrive') {
                            return (
                              <div className="photos-carousel-video-placeholder">
                                <FiVideo size={48} />
                                <span className="video-type-badge">Google Drive</span>
                              </div>
                            )
                          } else {
                            return (
                              <video 
                                src={currentMedia.url} 
                                className="photos-carousel-video"
                                controls
                              />
                            )
                          }
                        })()}
                        
                        {/* Кнопка удаления */}
                        {mediaItems[photosMediaIndex] && (
                          <button
                            type="button"
                            className="photos-carousel-remove"
                            onClick={() => {
                              const currentItem = mediaItems[photosMediaIndex]
                              if (!currentItem) return
                              
                              if (currentItem.mediaType === 'photo') {
                                handleRemovePhoto(currentItem.id)
                              } else {
                                handleRemoveVideo(currentItem.id)
                              }
                              // Индекс будет автоматически скорректирован в useEffect
                            }}
                          >
                            <FiX size={20} />
                          </button>
                        )}

                        {/* Номер медиа */}
                        <div className="photos-carousel-number">
                          {photosMediaIndex + 1} / {mediaItems.length}
                        </div>
                      </div>
                    )}

                    {/* Кнопка вперед */}
                    {mediaItems.length > 1 && (
                      <button
                        type="button"
                        className="photos-carousel-nav photos-carousel-nav--next"
                        onClick={handleNextMedia}
                      >
                        <FiChevronRight size={24} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Кнопки для загрузки фото, видео и ссылок */}
              <div className="photos-additional-options">
                {photos.length < 10 && (
                  <button
                    type="button"
                    className="photos-option-btn photos-option-btn--photo"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FiUpload size={20} />
                    {t('addPropertyPhotosAddPhoto')}
                    <span className="photos-option-count">{photos.length}/10</span>
                  </button>
                )}
                {videos.length < 3 && (
                  <>
                    <button
                      type="button"
                      className="photos-option-btn photos-option-btn--video"
                      onClick={openVideoSourceModal}
                    >
                      <FiVideo size={20} />
                      {t('addPropertyPhotosUploadVideo')}
                      <span className="photos-option-hint">{t('addPropertyPhotosVideoDuration')}</span>
                      <span className="photos-option-count">{videos.length}/3</span>
                    </button>
                    <button
                      type="button"
                      className="photos-option-btn photos-option-btn--link"
                      onClick={openVideoSourceModal}
                    >
                      <FiLink size={20} />
                      {t('addPropertyPhotosAddLink')}
                      <span className="photos-option-hint">{t('addPropertyPhotosLinkHint')}</span>
                    </button>
                  </>
                )}
              </div>

              <div className="property-photos-actions">
                <button
                  type="button"
                  className="property-photos-back-btn"
                  onClick={() => setCurrentStep(formData.isDebtProperty ? 'details' : 'amenities')}
                >
                  <FiChevronLeft size={16} />
                  {t('addPropertyBack')}
                </button>
                <button
                  type="button"
                  className="property-photos-continue-btn"
                  onClick={handlePhotosContinue}
                  disabled={photos.length === 0}
                >
                  {t('addPropertyTypeContinue')}
                </button>
              </div>

              {/* Скрытые input для загрузки файлов */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoUpload}
                accept="image/jpeg,image/jpg,image/png"
                multiple
                style={{ display: 'none' }}
              />
              <input
                type="file"
                ref={videoInputRef}
                onChange={handleVideoUpload}
                accept="video/*"
                multiple
                style={{ display: 'none' }}
              />

              {/* Модальное окно для добавления ссылки на видео */}
              {showVideoLinkModal && (
                <div className="video-link-modal-overlay" onClick={closeVideoLinkModal}>
                  <div className="video-link-modal" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="video-link-modal-close"
                      onClick={closeVideoLinkModal}
                    >
                      <FiX size={20} />
                    </button>
                    <h3 className="video-link-modal-title">
                      {videoLinkType === 'youtube' ? 'YouTube' : videoLinkType === 'googledrive' ? 'Google Drive' : t('addPropertyPhotosVideoLinkTitle')}
                    </h3>
                    <p className="video-link-modal-subtitle">
                      {videoLinkType === 'youtube'
                        ? 'Вставьте ссылку на видео с YouTube'
                        : videoLinkType === 'googledrive'
                          ? 'Вставьте ссылку на видео из Google Drive'
                          : t('addPropertyPhotosVideoLinkSubtitle')}
                    </p>
                    <input
                      type="text"
                      className="video-link-input"
                      placeholder={
                        videoLinkType === 'youtube'
                          ? 'https://youtube.com/watch?v=...'
                          : videoLinkType === 'googledrive'
                            ? 'https://drive.google.com/file/d/...'
                            : t('addPropertyPhotosVideoLinkPlaceholder')
                      }
                      value={videoLink}
                      onChange={(e) => setVideoLink(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleVideoLinkSubmit()
                        }
                      }}
                    />
                    <div className="video-link-modal-actions">
                      <button
                        type="button"
                        className="video-link-modal-cancel"
                        onClick={() => {
                          closeVideoLinkModal()
                        }}
                      >
                        {t('addPropertyPhotosVideoLinkCancel')}
                      </button>
                      <button
                        type="button"
                        className="video-link-modal-submit"
                        onClick={handleVideoLinkSubmit}
                      >
                        {t('addPropertyPhotosVideoLinkSubmit')}
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>

            <div className="property-name-hints" style={{ marginLeft: '150px' , marginTop: '75px'}}>
              <HintCard
                icon={FiUpload}
                iconColor="property-name-hint-icon--thumbs"
                title={t('addPropertyPhotosHint1Title')}
                content={[
                  t('addPropertyPhotosHint1Item1'),
                  t('addPropertyPhotosHint1Item2'),
                  t('addPropertyPhotosHint1Item3')
                ]}
                show={showHints['photos']}
                onClose={() => setShowHints(prev => ({ ...prev, 'photos': false }))}
              />
              <HintCard
                icon={MdLightbulb}
                iconColor="property-name-hint-icon--bulb"
                title={t('addPropertyPhotosHint2Title')}
                content={t('addPropertyPhotosHint2Text')}
                show={showHints['photos']}
                onClose={() => setShowHints(prev => ({ ...prev, 'photos': false }))}
              />
            </div>
          </div>
        ) : wizardRenderStep === 'documents' ? (
          /* Экран загрузки документов: для долга — 6 блоков в сетке 2×3 */
          <div className="property-documents-screen">
            <div className="property-documents-main">
              <h2 className="property-documents-title">
                {formData.isDebtProperty ? t('addPropertyDocumentsTitleDebt') : t('addPropertyDocumentsTitle')}
              </h2>
              
              <p className="property-documents-description">
                {formData.isDebtProperty
                  ? t('addPropertyDocumentsDescriptionDebt')
                  : t('addPropertyDocumentsDescription')}
              </p>

              {formData.isDebtProperty ? (
                <>
                  {/* Шаг 1: только 7 обязательных документов */}
                  {debtDocumentsStep === 'required' && (
                    <div className="documents-debt-required-step">
                      <h3 className="documents-section-title">{t('addPropertyDebtSaleStepRequiredTitle')}</h3>
                      <p className="property-documents-description" style={{ marginTop: 8, marginBottom: 20 }}>
                        {t('addPropertyDocumentsDescriptionDebt')}
                      </p>
                      <div className="documents-debt-required-list">
                        {REQUIRED_DEBT_DOCS.map((req) => {
                          const uploadedFile = debtDocumentsByCategory[req.categoryKey]?.[req.docIndex]
                          const refKey = `${req.categoryKey}_${req.docIndex}`
                          return (
                            <div key={req.id} id={`debt-required-${req.id}`} className="document-upload-item">
                              <div className="document-upload-info">
                                <div className="document-upload-icon">
                                  <FiFileText size={24} />
                                </div>
                                <div className="document-upload-text">
                                  <h4 className="document-upload-title">{t(req.labelKey)}</h4>
                                  <p className="document-upload-hint">{t('addPropertyDocumentsFormatHint')}</p>
                                </div>
                              </div>
                              <div className="document-upload-action">
                                {uploadedFile ? (
                                  <div className="document-uploaded">
                                    <FiCheck size={20} />
                                    <span title={uploadedFile.name}>{uploadedFile.name}</span>
                                    <button
                                      type="button"
                                      className="document-remove-btn"
                                      onClick={() => {
                                        setDebtDocumentsByCategory(prev => {
                                          const updated = { ...(prev[req.categoryKey] || {}) }
                                          delete updated[req.docIndex]
                                          return { ...prev, [req.categoryKey]: updated }
                                        })
                                      }}
                                    >
                                      <FiX size={16} />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    className="document-upload-btn"
                                    onClick={() => debtDocItemInputRefs.current[refKey]?.click()}
                                  >
                                    <FiUpload size={18} />
                                    {t('addPropertyDocumentsSelectBtn')}
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Шаг 2: 6 категорий документов (без 7 обязательных — они уже загружены на шаге 1) */}
                  {debtDocumentsStep === 'categories' && (
                    <>
                      {!selectedDebtDocCategory && (
                        <>
                          <div className="documents-debt-categories-step">
                            <h3 className="documents-section-title">{t('addPropertyDebtSaleStepAdditionalTitle')}</h3>
                          </div>
                          <div id="documents-debt-grid" className="documents-debt-grid">
                            {DEBT_DOC_CATEGORIES.map(({ key, titleKey }) => {
                              const requiredIndices = new Set(
                                REQUIRED_DEBT_DOCS.filter(r => r.categoryKey === key).map(r => r.docIndex)
                              )
                              const uploadedOptional = Object.keys(debtDocumentsByCategory[key] || {}).filter(
                                i => !requiredIndices.has(Number(i))
                              ).length
                              return (
                                <button
                                  key={key}
                                  id={`doc-category-${key}`}
                                  type="button"
                                  className="documents-debt-grid-item"
                                  onClick={() => setSelectedDebtDocCategory(key)}
                                >
                                  <h4 className="documents-debt-grid-item-title">{t(titleKey)}</h4>
                                  <div className="documents-debt-grid-upload">
                                    <FiFileText size={28} />
                                    <span className="documents-debt-grid-upload-text">{t('addPropertyDocumentsSelectBtn')}</span>
                                    <span className="documents-debt-grid-upload-hint">{t('addPropertyDocumentsSelectHint')}</span>
                                  </div>
                                  {uploadedOptional > 0 && (
                                    <ul className="documents-debt-grid-list">
                                      {Object.entries(debtDocumentsByCategory[key] || {}).filter(([i]) => !requiredIndices.has(Number(i))).map(([_, file]) => (
                                        <li key={_} className="documents-debt-grid-list-item">
                                          <span title={file.name}>{file.name}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        </>
                      )}

                      {selectedDebtDocCategory && (
                        <div id="debt-doc-details" className="documents-debt-details">
                          <div className="documents-debt-details-header">
                            <button
                              type="button"
                              className="documents-debt-back-btn"
                              onClick={() => setSelectedDebtDocCategory(null)}
                            >
                              <FiChevronLeft size={16} />
                              {t('addPropertyDocumentsAllCategories')}
                            </button>
                            <h3 className="documents-debt-details-title">
                              {DEBT_DOC_CATEGORIES.find(c => c.key === selectedDebtDocCategory)?.titleKey
                                ? t(DEBT_DOC_CATEGORIES.find(c => c.key === selectedDebtDocCategory).titleKey)
                                : ''}
                            </h3>
                          </div>

                          <div className="documents-debt-details-list">
                            {(DEBT_DOC_CATEGORY_DOCS_KEYS[selectedDebtDocCategory] || []).map((docKey, index) => {
                              const isRequired = REQUIRED_DEBT_DOCS.some(
                                r => r.categoryKey === selectedDebtDocCategory && r.docIndex === index
                              )
                              if (isRequired) return null
                              const uploadedFile = debtDocumentsByCategory[selectedDebtDocCategory]?.[index]
                              return (
                                <div key={index} className="document-upload-item">
                                  <div className="document-upload-info">
                                    <div className="document-upload-icon">
                                      <FiFileText size={24} />
                                    </div>
                                    <div className="document-upload-text">
                                      <h4 className="document-upload-title">{t(docKey)}</h4>
                                      <p className="document-upload-hint">{t('addPropertyDocumentsFormatHint')}</p>
                                    </div>
                                  </div>
                                  <div className="document-upload-action">
                                    {uploadedFile ? (
                                      <div className="document-uploaded">
                                        <FiCheck size={20} />
                                        <span title={uploadedFile.name}>{uploadedFile.name}</span>
                                        <button
                                          type="button"
                                          className="document-remove-btn"
                                          onClick={() => {
                                            setDebtDocumentsByCategory(prev => {
                                              const updated = { ...prev[selectedDebtDocCategory] }
                                              delete updated[index]
                                              return { ...prev, [selectedDebtDocCategory]: updated }
                                            })
                                          }}
                                        >
                                          <FiX size={16} />
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        className="document-upload-btn"
                                        onClick={() => debtDocItemInputRefs.current[`${selectedDebtDocCategory}_${index}`]?.click()}
                                      >
                                        <FiUpload size={18} />
                                        {t('addPropertyDocumentsUploadBtn')}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              ) : (
              <>
              {/* Блок для обязательных документов (не долг) */}
              <div className="documents-required-section">
                <h3 className="documents-section-title">{t('addPropertyDocumentsRequiredTitle')}</h3>
                
                <div className="document-upload-item">
                  <div className="document-upload-info">
                    <div className="document-upload-icon">
                      <FiFileText size={24} />
                    </div>
                    <div className="document-upload-text">
                      <h4 className="document-upload-title">{t('addPropertyDocumentsDocOwnership')}</h4>
                      <p className="document-upload-hint">{t('addPropertyDocumentsFormatHint')}</p>
                    </div>
                  </div>
                  <div className="document-upload-action">
                    {requiredDocuments.ownership ? (
                      <div className="document-uploaded">
                        <FiCheck size={20} />
                        <span>{requiredDocuments.ownership.name}</span>
                        <button
                          type="button"
                          className="document-remove-btn"
                          onClick={() => {
                            setRequiredDocuments(prev => ({ ...prev, ownership: null }))
                            setUploadedDocuments(prev => ({ ...prev, ownership: false }))
                          }}
                        >
                          <FiX size={16} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="document-upload-btn"
                        onClick={() => ownershipInputRef.current?.click()}
                      >
                        <FiUpload size={18} />
                        {t('addPropertyDocumentsUploadBtn')}
                      </button>
                    )}
                  </div>
                </div>

                <div className="document-upload-item">
                  <div className="document-upload-info">
                    <div className="document-upload-icon">
                      <FiFileText size={24} />
                    </div>
                    <div className="document-upload-text">
                      <h4 className="document-upload-title">{t('addPropertyDocumentsDocNoDebts')}</h4>
                      <p className="document-upload-hint">{t('addPropertyDocumentsFormatHint')}</p>
                    </div>
                  </div>
                  <div className="document-upload-action">
                    {requiredDocuments.noDebts ? (
                      <div className="document-uploaded">
                        <FiCheck size={20} />
                        <span>{requiredDocuments.noDebts.name}</span>
                        <button
                          type="button"
                          className="document-remove-btn"
                          onClick={() => {
                            setRequiredDocuments(prev => ({ ...prev, noDebts: null }))
                            setUploadedDocuments(prev => ({ ...prev, noDebts: false }))
                          }}
                        >
                          <FiX size={16} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="document-upload-btn"
                        onClick={() => noDebtsInputRef.current?.click()}
                      >
                        <FiUpload size={18} />
                        {t('addPropertyDocumentsUploadBtn')}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Блок для дополнительных документов */}
              <div className="documents-additional-section">
                <h3 className="documents-section-title">{t('addPropertyDocumentsAdditionalTitle')}</h3>
                <p className="documents-section-hint">{t('addPropertyDocumentsAdditionalHint')}</p>
                
                {/* Drag and drop область для дополнительных документов */}
                <div 
                  className={`documents-upload-area ${isDragging ? 'documents-upload-area--dragging' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => {
                    e.preventDefault()
                    setIsDragging(false)
                    const files = Array.from(e.dataTransfer.files)
                    const validFiles = files.filter(file => 
                      file.type === 'application/pdf' || file.type.startsWith('image/')
                    )
                    if (validFiles.length > 0) {
                      handleDocumentUpload({ target: { files: validFiles } })
                    }
                  }}
                >
                  {additionalDocuments.length === 0 ? (
                    <div className="documents-upload-placeholder">
                      <div className="documents-upload-icon">
                        <FiFileText size={48} />
                      </div>
                      <p className="documents-upload-text">{t('addPropertyDocumentsDragText')}</p>
                      <button
                        type="button"
                        className="documents-upload-btn"
                        onClick={() => documentInputRef.current?.click()}
                      >
                        <FiUpload size={20} />
                        {t('addPropertyDocumentsUploadDocumentsBtn')}
                      </button>
                      <p className="documents-upload-hint">{t('addPropertyDocumentsFormatHintPlural')}</p>
                    </div>
                  ) : (
                    <div className="documents-list-horizontal">
                      {additionalDocuments.map((doc) => (
                        <div key={doc.id} className="document-preview-item">
                          {doc.type === 'pdf' ? (
                            <div className="document-preview-pdf">
                              <FiFileText size={32} />
                              <span className="document-type-badge">PDF</span>
                            </div>
                          ) : (
                            <img src={doc.url} alt={doc.name} className="document-preview-image" />
                          )}
                          <button
                            type="button"
                            className="document-preview-remove"
                            onClick={() => handleRemoveDocument(doc.id)}
                          >
                            <FiX size={16} />
                          </button>
                          <div className="document-preview-name" title={doc.name}>
                            {doc.name}
                          </div>
                        </div>
                      ))}
                      {additionalDocuments.length < 5 && (
                        <div
                          className="document-preview-add"
                          onClick={() => documentInputRef.current?.click()}
                        >
                          <FiUpload size={24} />
                          <span>{t('addPropertyDocumentsAddBtn')}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              </>
              )}

              {/* Скрытые input для загрузки документов */}
              <input
                type="file"
                multiple
                accept="application/pdf,image/jpeg,image/jpg,image/png"
                style={{ display: 'none' }}
                ref={el => {
                  if (!el) return
                  // этот инпут-резерв не используется, категории ниже
                }}
              />

              {/* Скрытые input для категорий документов по долгу */}
              {DEBT_DOC_CATEGORIES.map(({ key }) =>
                DEBT_DOC_CATEGORY_DOCS[key]?.map((_, docIndex) => (
                  <input
                    key={`${key}_${docIndex}`}
                    type="file"
                    ref={el => { if (el) debtDocItemInputRefs.current[`${key}_${docIndex}`] = el }}
                    accept="application/pdf,image/jpeg,image/jpg,image/png"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setDebtDocumentsByCategory(prev => ({
                          ...prev,
                          [key]: { ...prev[key], [docIndex]: file }
                        }))
                      }
                      e.target.value = ''
                    }}
                    style={{ display: 'none' }}
                  />
                ))
              )}

              <input
                type="file"
                ref={ownershipInputRef}
                accept="application/pdf,image/jpeg,image/jpg,image/png"
                onChange={(e) => {
                  const file = e.target.files[0]
                  if (file) {
                    setRequiredDocuments(prev => ({ ...prev, ownership: file }))
                    setUploadedDocuments(prev => ({ ...prev, ownership: true }))
                  }
                  e.target.value = ''
                }}
                style={{ display: 'none' }}
              />
              <input
                type="file"
                ref={noDebtsInputRef}
                accept="application/pdf,image/jpeg,image/jpg,image/png"
                onChange={(e) => {
                  const file = e.target.files[0]
                  if (file) {
                    setRequiredDocuments(prev => ({ ...prev, noDebts: file }))
                    setUploadedDocuments(prev => ({ ...prev, noDebts: true }))
                  }
                  e.target.value = ''
                }}
                style={{ display: 'none' }}
              />
              <input
                type="file"
                ref={documentInputRef}
                multiple
                accept="application/pdf,image/*"
                onChange={handleDocumentUpload}
                style={{ display: 'none' }}
              />

              <div className="property-documents-actions">
                <button
                  type="button"
                  className="property-documents-back-btn"
                  onClick={() => {
                    if (formData.isDebtProperty && debtDocumentsStep === 'categories') {
                      if (selectedDebtDocCategory) {
                        setSelectedDebtDocCategory(null)
                      } else {
                        setDebtDocumentsStep('required')
                      }
                    } else {
                      setCurrentStep('photos')
                    }
                  }}
                >
                  <FiChevronLeft size={16} />
                  {t('addPropertyBack')}
                </button>
                <button
                  type="button"
                  className="property-documents-continue-btn"
                  onClick={handleDocumentsContinue}
                >
                  {t('addPropertyTypeContinue')}
                </button>
              </div>
            </div>

            <div className="property-name-hints" style={{ marginLeft: '150px' , marginTop: '75px'}}>
              <AddPropertyProgress
                debtDocumentsByCategory={debtDocumentsByCategory}
                requiredDebtDocs={REQUIRED_DEBT_DOCS.map(d => ({ ...d, label: t(d.labelKey) }))}
                onGoToDoc={handleGoToDoc}
                isDebtProperty={formData.isDebtProperty}
              />
              <HintCard
                icon={FiFileText}
                iconColor="property-name-hint-icon--thumbs"
                title={formData.isDebtProperty ? t('addPropertyDocumentsDebtHint1Title') : t('addPropertyDocumentsHint1Title')}
                content={formData.isDebtProperty
                  ? [
                      t('addPropertyDocumentsDebtHint1Item1'),
                      t('addPropertyDocumentsDebtHint1Item2')
                    ]
                  : [
                      t('addPropertyDocumentsHint1Item1'),
                      t('addPropertyDocumentsHint1Item2'),
                      t('addPropertyDocumentsHint1Item3')
                    ]}
                show={showHints['documents']}
                onClose={() => setShowHints(prev => ({ ...prev, 'documents': false }))}
              />
              <HintCard
                icon={MdLightbulb}
                iconColor="property-name-hint-icon--bulb"
                title={t('addPropertyDocumentsHint2Title')}
                content={formData.isDebtProperty
                  ? t('addPropertyDocumentsDebtHint2Text')
                  : t('addPropertyDocumentsHint2Text')}
                show={showHints['documents']}
                onClose={() => setShowHints(prev => ({ ...prev, 'documents': false }))}
              />
            </div>
          </div>
        ) : wizardRenderStep === 'listing-type' ? (
          <div className={`listing-mode-stage listing-mode-stage--${LISTING_MODE_THEME_STAGES[listingModeThemeStage]}`}>
            <div className="listing-mode-stage__glow listing-mode-stage__glow--left" aria-hidden="true" />
            <div className="listing-mode-stage__glow listing-mode-stage__glow--right" aria-hidden="true" />
            <div className="listing-mode-stage__hero">
              <span className="listing-mode-stage__pill">
                Шаг {stepFlow.findIndex((s) => s.id === 'listing-type') + 1} из {stepFlow.length}
              </span>
              <h2>Выберите тип размещения</h2>
              <p>
                Откройте «Инструкцию» у формата, чтобы увидеть, как проходит продажа, кому он подходит и какие у него
                преимущества. Затем нажмите «Выбрать». Фон шага меняется при прокрутке.
              </p>
            </div>
            <div
              ref={listingModeScrollRef}
              className="listing-mode-stage__scroller"
              onScroll={handleListingModeThemeScroll}
              onWheel={handleListingModeThemeWheel}
            >
              <div className="listing-mode-stage__cards">
                {LISTING_MODE_OPTIONS.map((mode, index) => {
                  const isOpen = expandedListingModeId === mode.id
                  return (
                    <div key={mode.id} className="listing-mode-stage__card-wrap" style={{ animationDelay: `${index * 70}ms` }}>
                      <div
                        className={`listing-mode-stage__card listing-mode-stage__card--${mode.tone} ${formData.listingMode === mode.id ? 'listing-mode-stage__card--active' : ''}`}
                      >
                        <div className="listing-mode-stage__card-top">
                          <span className="listing-mode-stage__card-icon">{getListingModeIcon(mode.icon)}</span>
                          <span className="listing-mode-stage__card-content">
                            <strong>{mode.title}</strong>
                            <small>{mode.description}</small>
                          </span>
                        </div>
                        <div className="listing-mode-stage__card-actions">
                          <button
                            type="button"
                            className="listing-mode-stage__btn listing-mode-stage__btn--ghost"
                            aria-expanded={isOpen}
                            onClick={() =>
                              setExpandedListingModeId((prev) => (prev === mode.id ? null : mode.id))
                            }
                          >
                            <FiChevronDown className={`listing-mode-stage__btn-chev ${isOpen ? 'is-open' : ''}`} aria-hidden />
                            {isOpen ? 'Свернуть' : 'Инструкция'}
                          </button>
                          <button
                            type="button"
                            className="listing-mode-stage__btn listing-mode-stage__btn--primary"
                            onClick={() => handleListingModeSelect(mode.id)}
                          >
                            Выбрать
                          </button>
                        </div>
                      </div>
                      {isOpen && (
                        <div className={`listing-mode-stage__detail listing-mode-stage__detail--${mode.tone}`}>
                          <ListingModeInstructionPanel mode={mode} layout="compact" />
                        </div>
                      )}
                    </div>
                  )
                })}
                <div className="listing-mode-stage__scroll-tip">
                  <FiChevronDown size={18} />
                  <span>Скролл и колесо мыши переключают тему оформления</span>
                </div>
              </div>
            </div>
            <div className="property-name-actions listing-mode-stage__actions">
              <button
                type="button"
                className="property-name-back-btn"
                onClick={() => setCurrentStep('documents')}
              >
                <FiChevronLeft size={16} />
                {t('addPropertyBack')}
              </button>
            </div>
          </div>
        ) : wizardRenderStep === 'price-calculator' ? (
          <div className="add-property-price-calculator-step">
            <div className="add-property-price-calculator-step__header">
              <span className="add-property-price-calculator-step__eyebrow">Шаг {currentStepIndex + 1} из {stepFlow.length}</span>
              <h2 className="add-property-price-calculator-step__title">Автоматический расчёт стоимости</h2>
              <p className="add-property-price-calculator-step__lead">
                Оценка по похожим объявлениям с площадок. После расчёта ориентировочные суммы можно скорректировать на следующем шаге.
              </p>
            </div>
            <PropertyCalculatorModal
              isOpen
              variant="embedded"
              onClose={() => setCurrentStep('listing-type')}
              lockFields
              initialPropertyData={{
                propertyType: formData.propertyType,
                area: formData.area,
                rooms: formData.rooms,
                bedrooms: formData.bedrooms,
                city: formData.city,
                country: formData.country,
                address: formData.address,
                location: formData.location
              }}
              onApplyRecommendedPrice={handleApplyCalculatedPrice}
            />
            <div className="property-price-actions add-property-price-calculator-step__actions">
              <button
                type="button"
                className="property-price-back-btn"
                onClick={() => setCurrentStep('listing-type')}
              >
                <FiChevronLeft size={16} />
                {t('addPropertyBack')}
              </button>
              <button
                type="button"
                className="property-price-continue-btn"
                onClick={() => setCurrentStep('price')}
              >
                {t('addPropertyTypeContinue')}
              </button>
            </div>
          </div>
        ) : wizardRenderStep === 'price' ? (
          /* Экран цены:
             - для доли — только общая цена и количество долей
             - для долгов — только фиксированная сумма продажи без аукциона
             - для обычных объектов — аукцион + опциональная цена "Купить сейчас" */
          <div className="property-price-screen">
            <div className="property-price-main">
              <h2 className="property-price-title">
                {formData.listingMode === 'shares'
                  ? t('addPropertyPriceTitleShares')
                  : (formData.listingMode === 'debt' || formData.listingMode === 'debt_auction')
                    ? t('addPropertyPriceTitleDebt')
                    : t('addPropertyPriceTitle')}
              </h2>
              
              {formData.listingMode === 'shares' ? (
                <p className="property-price-description">
                  {t('addPropertyPriceDescriptionShares')}
                </p>
              ) : (formData.listingMode === 'debt' || formData.listingMode === 'debt_auction') ? (
                <p className="property-price-description">
                  {t('addPropertyPriceDescriptionDebt')}
                </p>
              ) : (
                <p className="property-price-description">
                  {t('addPropertyPriceDescriptionAuction')}
                </p>
              )}

              {/* Для доли: общая цена + количество долей + цена за долю */}
              {formData.listingMode === 'shares' && (
                <>
                  <div className="price-input-section">
                    <label className="price-input-label">{t('addPropertyPriceSharesTotalLabel')}</label>
                    <div className="price-input-wrapper-large">
                      <div className="currency-selector">
                        <button type="button" className="currency-button" onClick={() => setShowCurrencyDropdown(showCurrencyDropdown === 'price' ? null : 'price')}>
                          <span className="currency-symbol">{currencies.find(c => c.code === currency)?.symbol || '$'}</span>
                          <FiChevronDown className="currency-chevron" size={14} />
                        </button>
                        {showCurrencyDropdown === 'price' && (
                          <div className="currency-dropdown">
                            {currencies.map((curr) => (
                              <button key={curr.code} type="button" className={`currency-option ${currency === curr.code ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrency(curr.code); setShowCurrencyDropdown(null) }}>
                                <span className="currency-option-symbol">{curr.symbol}</span>
                                <span className="currency-option-name">{curr.name}</span>
                                <span className="currency-option-code">({curr.code})</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <input type="text" name="price" value={formData.price ? formatNumberWithCommas(formData.price) : ''} onChange={handlePriceChange} className="price-input-large" placeholder="0" inputMode="numeric" />
                    </div>
                  </div>
                 <div className="price-input-section" style={{ marginTop: '20px' }}>
                    <label className="price-input-label">{t('addPropertyPriceSharesCountLabel')}</label>
                    <div className="price-input-wrapper-large price-input-wrapper-shares">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        name="totalShares"
                        value={formData.totalShares}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            totalShares: e.target.value.replace(/\D/g, ''),
                          }))
                        }
                        className="price-input-large"
                        placeholder={t('addPropertyPriceSharesCountPlaceholder')}
                        inputMode="numeric"
                      />
                    </div>
                    <p style={{ fontSize: '14px', color: '#64748b', marginTop: '8px' }}>
                      {t('addPropertyPriceSharesDescription')}
                    </p>
                  </div>
                  {formData.price && formData.totalShares && parseInt(formData.totalShares, 10) > 0 && (
                    <div className="share-price-per-unit" style={{ marginTop: '16px', padding: '16px', background: 'rgba(10, 186, 181, 0.1)', borderRadius: '12px', border: '1px solid rgba(10, 186, 181, 0.25)' }}>
                      <strong>{t('addPropertyPriceSharesPerUnit')}</strong>{' '}
                      <span>{currencies.find(c => c.code === currency)?.symbol || '$'}{(Number(removeCommas(String(formData.price))) / parseInt(formData.totalShares, 10)).toLocaleString('en-US')}</span>
                    </div>
                  )}
                </>
              )}

              {/* Для долгов: сумма долга + фиксированная цена продажи */}
              {(formData.listingMode === 'debt' || formData.listingMode === 'debt_auction') && (
                <>
                <div className="price-input-section">
                  <label className="price-input-label">{t('addPropertyPriceDebtAmountLabel')}</label>
                  <div className="price-input-wrapper-large">
                    <div className="currency-selector">
                      <button
                        type="button"
                        className="currency-button"
                        onClick={() =>
                          setShowCurrencyDropdown(
                            showCurrencyDropdown === 'debt_amount' ? null : 'debt_amount'
                          )
                        }
                      >
                        <span className="currency-symbol">
                          {currencies.find(c => c.code === currency)?.symbol || '$'}
                        </span>
                        <FiChevronDown className="currency-chevron" size={14} />
                      </button>
                      {showCurrencyDropdown === 'debt_amount' && (
                        <div className="currency-dropdown">
                          {currencies.map(c => (
                            <button
                              key={c.code}
                              type="button"
                              className={`currency-option ${c.code === currency ? 'currency-option--active' : ''}`}
                              onClick={() => { setCurrency(c.code); setShowCurrencyDropdown(null) }}
                            >
                              <span className="currency-option-symbol">{c.symbol}</span>
                              <span className="currency-option-name">{c.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <input
                      id="debt-amount-input"
                      type="text"
                      className="price-input-large"
                      placeholder="0"
                      inputMode="numeric"
                      value={formData.debtAmount ? formatNumberWithCommas(formData.debtAmount) : ''}
                      onChange={(e) => {
                        const raw = removeCommas(e.target.value.replace(/[^\d,]/g, ''))
                        setFormData(prev => ({ ...prev, debtAmount: raw }))
                      }}
                    />
                  </div>
                </div>
                </>
              )}

              {(formData.listingMode === 'auction' ||
                formData.listingMode === 'auction_buy_now' ||
                formData.listingMode === 'debt_auction') && (
                <>
              <div className="price-input-section">
                <label className="price-input-label">{t('addPropertyPriceMinimumSaleLabel')}</label>
                <div className="price-input-wrapper-large">
                  <div className="currency-selector">
                    <button
                      type="button"
                      className="currency-button"
                      onClick={() => setShowCurrencyDropdown(showCurrencyDropdown === 'min_sale' ? null : 'min_sale')}
                    >
                      <span className="currency-symbol">{currencies.find(c => c.code === currency)?.symbol || '$'}</span>
                      <FiChevronDown className="currency-chevron" size={14} />
                    </button>
                    {showCurrencyDropdown === 'min_sale' && (
                      <div className="currency-dropdown">
                        {currencies.map((curr) => (
                          <button
                            key={curr.code}
                            type="button"
                            className={`currency-option ${currency === curr.code ? 'active' : ''}`}
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setCurrency(curr.code)
                              setShowCurrencyDropdown(null)
                            }}
                          >
                            <span className="currency-option-symbol">{curr.symbol}</span>
                            <span className="currency-option-name">{curr.name}</span>
                            <span className="currency-option-code">({curr.code})</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    className={`price-input-large ${validationErrors.minimumSalePrice ? 'error' : ''}`}
                    value={formData.minimumSalePrice ? formatNumberWithCommas(formData.minimumSalePrice) : ''}
                    onChange={handleMinimumSalePriceChange}
                    placeholder="0"
                    inputMode="numeric"
                  />
                </div>
                {validationErrors.minimumSalePrice && (
                  <div className="validation-error" style={{ marginTop: '8px', color: '#ff4444', fontSize: '14px' }}>
                    {validationErrors.minimumSalePrice}
                  </div>
                )}
              </div>

              {(formData.listingMode === 'auction_buy_now' || formData.listingMode === 'debt_auction') && (
              <div className="price-input-section">
                <label className="price-input-label">
                  Продать сейчас {formData.listingMode === 'auction_buy_now' ? '(обязательно)' : '(опционально)'}
                </label>
                <p style={{ fontSize: '14px', color: '#666', marginTop: '4px', marginBottom: '12px' }}>
                  {formData.listingMode === 'auction_buy_now'
                    ? 'Для этого типа размещения нужно указать цену мгновенной покупки.'
                    : 'Укажите цену, за которую вы готовы мгновенно продать объект. Если не укажете, объект будет только на аукционе.'}
                </p>
                <div className="price-input-wrapper-large">
                  <div className="currency-selector">
                    <button
                      type="button"
                      className="currency-button"
                      onClick={() => setShowCurrencyDropdown(showCurrencyDropdown === 'price' ? null : 'price')}
                    >
                      <span className="currency-symbol">{currencies.find(c => c.code === currency)?.symbol || '$'}</span>
                      <FiChevronDown className="currency-chevron" size={14} />
                    </button>
                    {showCurrencyDropdown === 'price' && (
                      <div className="currency-dropdown">
                        {currencies.map((curr) => (
                          <button
                            key={curr.code}
                            type="button"
                            className={`currency-option ${currency === curr.code ? 'active' : ''}`}
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setCurrency(curr.code)
                              setShowCurrencyDropdown(null)
                            }}
                          >
                            <span className="currency-option-symbol">{curr.symbol}</span>
                            <span className="currency-option-name">{curr.name}</span>
                            <span className="currency-option-code">({curr.code})</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    name="price"
                    value={formData.price ? formatNumberWithCommas(formData.price) : ''}
                    onChange={handlePriceChange}
                    className="price-input-large"
                    placeholder="0"
                    inputMode="numeric"
                    required={formData.listingMode === 'auction_buy_now'}
                  />
                </div>
              </div>
              )}

              {/* Информация об аукционе */}
              <div className="auction-info-section" style={{ marginTop: '24px', padding: '16px', background: '#f0f9ff', borderRadius: '12px', border: '1px solid #bae6fd' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <FiDollarSign size={20} color="#0ea5e9" />
                  <div>
                    <div style={{ fontWeight: '600', color: '#0c4a6e', marginBottom: '4px' }}>{t('addPropertyPriceAuctionObjectTitle')}</div>
                    <div style={{ fontSize: '14px', color: '#075985' }}>{t('addPropertyPriceAuctionObjectDesc')}</div>
                  </div>
                </div>
              </div>

              {/* Поля аукциона (всегда видны, так как все объекты аукционные) */}
              <div className="auction-fields-section">
                <div className="auction-date-range">
                  <AuctionPeriodPicker
                    label={t('addPropertyPriceAuctionPeriodLabel')}
                    startDate={formData.auctionStartDate}
                    endDate={formData.auctionEndDate}
                    onStartDateChange={(date) => setFormData(prev => ({ ...prev, auctionStartDate: date }))}
                    onEndDateChange={(date) => setFormData(prev => ({ ...prev, auctionEndDate: date }))}
                    disableMinConstraints={adminMode || isAdminAddedProperty || isEditMode}
                  />
                </div>
                
                <div className="auction-starting-price">
                  <label className="auction-starting-price-label">
                    {t('addPropertyPriceStartingBidLabel')}
                  </label>
                  {Number(removeCommas(String(formData.price || ''))) > 0 && (
                    <p className="auction-starting-price-hint">{t('addPropertyPriceBuyNowStartingBidHint')}</p>
                  )}
                  <div className="bid-step-input-wrapper-large">
                    <div className="currency-selector">
                      <button
                        type="button"
                        className="currency-button"
                        onClick={() => setShowCurrencyDropdown(showCurrencyDropdown === 'auction' ? null : 'auction')}
                      >
                        <span className="currency-symbol">{currencies.find(c => c.code === currency)?.symbol || '$'}</span>
                        <FiChevronDown className="currency-chevron" size={14} />
                      </button>
                      {showCurrencyDropdown === 'auction' && (
                        <div className="currency-dropdown">
                          {currencies.map((curr) => (
                            <button
                              key={curr.code}
                              type="button"
                              className={`currency-option ${currency === curr.code ? 'active' : ''}`}
                              onClick={() => {
                                setCurrency(curr.code)
                                setShowCurrencyDropdown(null)
                              }}
                            >
                              <span className="currency-option-symbol">{curr.symbol}</span>
                              <span className="currency-option-name">{curr.name}</span>
                              <span className="currency-option-code">({curr.code})</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <input
                      type="text"
                      name="auctionStartingPrice"
                      value={formData.auctionStartingPrice ? formatNumberWithCommas(formData.auctionStartingPrice) : ''}
                      onChange={handleAuctionPriceChange}
                      className={`price-input-large ${validationErrors.auctionStartingPrice ? 'error' : ''}`}
                      placeholder="0"
                      inputMode="numeric"
                      required
                    />
                  </div>
                  {validationErrors.auctionStartingPrice && (
                    <div className="validation-error" style={{ marginTop: '8px', color: '#ff4444', fontSize: '14px' }}>
                      {validationErrors.auctionStartingPrice}
                    </div>
                  )}
                </div>
              </div>

                </>
              )}

              <div className="property-price-actions">
                <button
                  type="button"
                  className="property-price-back-btn"
                  onClick={() => setCurrentStep('price-calculator')}
                >
                  <FiChevronLeft size={16} />
                  {t('addPropertyBack')}
                </button>
                <button
                  type="button"
                  className="property-price-continue-btn"
                  onClick={handlePriceContinue}
                >
                  {t('addPropertyTypeContinue')}
                </button>
              </div>
            </div>

              <div className="property-name-hints" style={{ marginLeft: '150px'}}>
                <HintCard
                  icon={FiDollarSign}
                  iconColor="property-name-hint-icon--thumbs"
                  title={t('addPropertyPriceHint1Title')}
                  content={[
                    t('addPropertyPriceHint1Item1'),
                    t('addPropertyPriceHint1Item2'),
                    t('addPropertyPriceHint1Item3')
                  ]}
                  show={showHints['price']}
                  onClose={() => setShowHints(prev => ({ ...prev, 'price': false }))}
                />
                <HintCard
                  icon={MdLightbulb}
                  iconColor="property-name-hint-icon--bulb"
                  title={t('addPropertyPriceHint2Title')}
                  content={t('addPropertyPriceHint2Text')}
                  show={showHints['price']}
                  onClose={() => setShowHints(prev => ({ ...prev, 'price': false }))}
                />
              </div>
          </div>
        ) : null}
      </div>
      {showCarousel && mediaItems.length > 0 && (
        <div className="carousel-overlay" onClick={() => setShowCarousel(false)}>
          <div className="carousel-container" onClick={(e) => e.stopPropagation()}>
            <button 
              className="carousel-close"
              onClick={() => setShowCarousel(false)}
            >
              <FiX size={24} />
            </button>
            {mediaItems.length > 1 && (
              <>
                <button 
                  className="carousel-nav carousel-nav--prev"
                  onClick={prevMedia}
                >
                  <FiChevronLeft size={24} />
                </button>
                <button 
                  className="carousel-nav carousel-nav--next"
                  onClick={nextMedia}
                >
                  <FiChevronRight size={24} />
                </button>
              </>
            )}
            <div className="carousel-media-wrapper">
              {mediaItems[currentMediaIndex].mediaType === 'photo' ? (
                <>
                  <div className="carousel-image-wrapper">
                    <img 
                      src={mediaItems[currentMediaIndex].url} 
                      alt={`Фото ${currentMediaIndex + 1}`}
                      className="carousel-image"
                    />
                  </div>
                  <div className="carousel-counter">
                    {currentMediaIndex + 1} / {mediaItems.length}
                  </div>
                </>
              ) : (
                <>
                  <div className="carousel-video-wrapper">
                    {mediaItems[currentMediaIndex].type === 'youtube' && mediaItems[currentMediaIndex].videoId ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${mediaItems[currentMediaIndex].videoId}`}
                        title={`YouTube видео ${currentMediaIndex + 1}`}
                        className="carousel-video"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : mediaItems[currentMediaIndex].type === 'googledrive' && mediaItems[currentMediaIndex].videoId ? (
                      <iframe
                        src={`https://drive.google.com/file/d/${mediaItems[currentMediaIndex].videoId}/preview`}
                        title={`Google Drive видео ${currentMediaIndex + 1}`}
                        className="carousel-video"
                        frameBorder="0"
                        allowFullScreen
                      />
                    ) : mediaItems[currentMediaIndex].type === 'file' && mediaItems[currentMediaIndex].url ? (
                      <video
                        src={mediaItems[currentMediaIndex].url}
                        controls
                        className="carousel-video-file"
                        autoPlay
                      >
                        Ваш браузер не поддерживает воспроизведение видео.
                      </video>
                    ) : null}
                  </div>
                  <div className="carousel-counter">
                    {currentMediaIndex + 1} / {mediaItems.length}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно для добавления ссылки на видео */}
      {showVideoSourceModal && (
        <div className="video-link-modal-overlay" onClick={() => setShowVideoSourceModal(false)}>
          <div className="video-source-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="video-link-modal-close"
              onClick={() => setShowVideoSourceModal(false)}
            >
              <FiX size={20} />
            </button>
            <h3 className="video-link-modal-title">Выберите источник видео</h3>
            <p className="video-link-modal-subtitle">Добавьте видео одним из трёх способов.</p>
            <div className="video-source-modal__actions">
              <button type="button" className="video-source-modal__btn" onClick={() => handleVideoSourceSelect('device')}>
                Устройство
              </button>
              <button type="button" className="video-source-modal__btn" onClick={() => handleVideoSourceSelect('youtube')}>
                YouTube
              </button>
              <button type="button" className="video-source-modal__btn" onClick={() => handleVideoSourceSelect('googledrive')}>
                Google Drive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно для добавления ссылки на видео */}
      {showVideoLinkModal && (
        <div className="video-link-modal-overlay" onClick={closeVideoLinkModal}>
          <div className="video-link-modal" onClick={(e) => e.stopPropagation()}>
            <button 
              className="video-link-modal-close"
              onClick={closeVideoLinkModal}
            >
              <FiX size={20} />
            </button>
            <h3 className="video-link-modal-title">
              {videoLinkType === 'youtube' ? 'YouTube' : videoLinkType === 'googledrive' ? 'Google Drive' : t('addPropertyPhotosVideoLinkTitle')}
            </h3>
            <p className="video-link-modal-subtitle">
              {videoLinkType === 'youtube'
                ? 'Вставьте ссылку на видео с YouTube'
                : videoLinkType === 'googledrive'
                  ? 'Вставьте ссылку на видео из Google Drive'
                  : t('addPropertyPhotosVideoLinkSubtitle')}
            </p>
            <input
              type="text"
              className="video-link-input"
              placeholder={
                videoLinkType === 'youtube'
                  ? 'https://youtube.com/watch?v=...'
                  : videoLinkType === 'googledrive'
                    ? 'https://drive.google.com/file/d/...'
                    : t('addPropertyPhotosVideoLinkPlaceholder')
              }
              value={videoLink}
              onChange={(e) => setVideoLink(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleVideoLinkSubmit()}
            />
            <div className="video-link-modal-actions">
              <button
                type="button"
                className="video-link-modal-cancel"
                onClick={() => {
                  closeVideoLinkModal()
                }}
              >
                {t('addPropertyPhotosVideoLinkCancel')}
              </button>
              <button
                type="button"
                className="video-link-modal-submit"
                onClick={handleVideoLinkSubmit}
              >
                {t('addPropertyPhotosVideoLinkSubmit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSpEnteredAmountsModal && (
        <div
          className="sp-amount-summary-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sp-amount-summary-modal-title"
          onClick={() => setShowSpEnteredAmountsModal(false)}
        >
          <div className="sp-amount-summary-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="sp-amount-summary-modal__close"
              onClick={() => setShowSpEnteredAmountsModal(false)}
              aria-label={t('addPropertyPriceEnteredAmountsCloseAria')}
            >
              <FiX size={22} />
            </button>
            <h2 id="sp-amount-summary-modal-title" className="sp-amount-summary-modal__title">
              {t('addPropertyPriceEnteredAmountsModalTitle')}
            </h2>
            <ul className="sp-amount-summary-modal__list">
              {spEnteredAmountSummaryRows.map((row) => (
                <li key={row.key} className="sp-amount-summary-modal__row">
                  <span className="sp-amount-summary-modal__label">{row.label}</span>
                  <span className="sp-amount-summary-modal__value">
                    {row.value ?? t('addPropertyPriceSummaryValueEmpty')}
                  </span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="sp-btn sp-btn--primary sp-amount-summary-modal__ok"
              onClick={() => setShowSpEnteredAmountsModal(false)}
            >
              {t('addPropertyPriceEnteredAmountsClose')}
            </button>
          </div>
        </div>
      )}

      <PropertyCalculatorModal
        isOpen={isCalculatorModalOpen && wizardRenderStep !== 'price-calculator'}
        onClose={() => setIsCalculatorModalOpen(false)}
        lockFields={true}
        initialPropertyData={{
          propertyType: formData.propertyType,
          area: formData.area,
          rooms: formData.rooms,
          bedrooms: formData.bedrooms,
          city: formData.city,
          country: formData.country,
          address: formData.address,
          location: formData.location
        }}
        onApplyRecommendedPrice={handleApplyCalculatedPrice}
      />

      <SellerVerificationModal
        isOpen={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        userId={userId}
        onComplete={handleVerificationComplete}
      />

      {/* Модальное окно оплаты публикации (29 € / промокод) */}
      {showListingFeeModal && (
        <div
          className="listing-fee-modal-overlay"
          onClick={() => {
            if (!showPromoInputInFeeModal) setShowListingFeeModal(false)
          }}
        >
          <div
            className={`listing-fee-modal ${showPromoInputInFeeModal ? 'listing-fee-modal--promo' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="listing-fee-modal__close"
              onClick={() => {
                setShowListingFeeModal(false)
                setShowPromoInputInFeeModal(false)
                setListingFeePromoCode('')
                setListingFeePromoError(null)
              }}
              aria-label="Закрыть"
            >
              <FiX size={22} />
            </button>
            {!showPromoInputInFeeModal ? (
              <>
                <div className="listing-fee-modal__icon">
                  <FiDollarSign size={32} />
                </div>
                <h2 className="listing-fee-modal__title">Оплата публикации объекта</h2>
                <p className="listing-fee-modal__text">
                  Чтобы выложить объект, необходимо оплатить <strong>29 €</strong> за размещение на платформе.
                </p>
                <div className="listing-fee-modal__options">
                  <button
                    type="button"
                    className="listing-fee-modal__option listing-fee-modal__option--card"
                    onClick={handleListingFeePayCard}
                    disabled={listingFeeStripeLoading}
                  >
                    <FiCreditCard size={24} aria-hidden />
                    <span>{listingFeeStripeLoading ? 'Переход к оплате…' : 'Карта (Stripe)'}</span>
                    <span className="listing-fee-modal__option-badge listing-fee-modal__option-badge--price">
                      29 €
                    </span>
                  </button>
                  <button
                    type="button"
                    className="listing-fee-modal__option"
                    onClick={() => setShowPromoInputInFeeModal(true)}
                  >
                    <FiGift size={24} />
                    <span>Есть промокод</span>
                  </button>
                </div>
                <p className="listing-fee-modal__get-promo">
                  <button
                    type="button"
                    className="listing-fee-modal__get-promo-link"
                    onClick={() => {
                      setShowListingFeeModal(false)
                      setShowPromoInputInFeeModal(false)
                      setListingFeePromoCode('')
                      setListingFeePromoError(null)
                      navigate('/bonuses?tab=seller', { state: { fromListingFee: true, returnPath: location.pathname } })
                    }}
                  >
                    получить промокод
                  </button>
                </p>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="listing-fee-modal__back"
                  onClick={() => {
                    setShowPromoInputInFeeModal(false)
                    setListingFeePromoCode('')
                    setListingFeePromoError(null)
                  }}
                >
                  <FiChevronLeft size={18} /> Назад
                </button>
                <div className="listing-fee-modal__icon listing-fee-modal__icon--promo">
                  <FiGift size={32} />
                </div>
                <h2 className="listing-fee-modal__title">Введите промокод</h2>
                <p className="listing-fee-modal__text">
                  Промокод из бонусных заданий для продавцов позволяет бесплатно опубликовать объект.
                </p>
                <div className="listing-fee-modal__promo-row">
                  <input
                    type="text"
                    className="listing-fee-modal__input"
                    placeholder="Например: BONUS-SELLER-INSTA-10"
                    value={listingFeePromoCode}
                    onChange={(e) => {
                      setListingFeePromoCode(e.target.value)
                      setListingFeePromoError(null)
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleApplyListingFeePromo()}
                    disabled={listingFeePromoLoading}
                  />
                  <button
                    type="button"
                    className="listing-fee-modal__apply"
                    onClick={handleApplyListingFeePromo}
                    disabled={listingFeePromoLoading}
                  >
                    {listingFeePromoLoading ? <FiLoader size={20} className="listing-fee-modal__spinner" /> : 'Применить'}
                  </button>
                </div>
                {listingFeePromoError && (
                  <p className="listing-fee-modal__error" role="alert">
                    {listingFeePromoError}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {showDescriptionCompareModal && (
        <div
          className="description-compare-modal-overlay"
          onClick={handleRejectDescriptionCompare}
          role="presentation"
        >
          <div
            className="description-compare-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="description-compare-title"
          >
            <button
              type="button"
              className="description-compare-modal__close"
              onClick={handleRejectDescriptionCompare}
              aria-label={t('closeModalAria')}
            >
              <FiX size={20} />
            </button>
            <h2 id="description-compare-title" className="description-compare-modal__title">
              {t('addPropertyDescriptionCompareTitle')}
            </h2>
            <p className="description-compare-modal__subtitle">
              {t('addPropertyDescriptionCompareSubtitle')}
            </p>
            <div className="description-compare-grid">
              <div className="description-compare-card description-compare-card--yours">
                <div className="description-compare-card__head">
                  <span className="description-compare-card__badge">{t('addPropertyDescriptionCompareYours')}</span>
                </div>
                <div className="description-compare-card__body">
                  {descriptionCompareDraft}
                </div>
              </div>
              <div className="description-compare-card description-compare-card--ai">
                <div className="description-compare-card__head">
                  <span className="description-compare-card__badge description-compare-card__badge--ai">
                    {t('addPropertyDescriptionCompareAi')}
                  </span>
                </div>
                <div className="description-compare-card__body">
                  {descriptionCompareAi}
                </div>
              </div>
            </div>
            <div className="description-compare-modal__actions">
              <button
                type="button"
                className="description-compare-btn description-compare-btn--reject"
                onClick={handleRejectDescriptionCompare}
              >
                {t('addPropertyDescriptionReject')}
              </button>
              <button
                type="button"
                className="description-compare-btn description-compare-btn--accept"
                onClick={handleAcceptDescriptionCompare}
              >
                <FiCheck size={18} strokeWidth={2.5} />
                {t('addPropertyDescriptionAccept')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showTestDriveInfoModal && (
        <div
          className="testdrive-info-modal-overlay"
          onClick={() => setShowTestDriveInfoModal(false)}
          role="presentation"
        >
          <div
            className="testdrive-info-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="testdrive-info-title"
          >
            <button
              type="button"
              className="testdrive-info-modal__close"
              onClick={() => setShowTestDriveInfoModal(false)}
              aria-label={t('closeModalAria')}
            >
              <FiX size={20} />
            </button>
            <h2 id="testdrive-info-title" className="testdrive-info-modal__title">
              Как работает тест-драйв
            </h2>
            <p className="testdrive-info-modal__lead">
              Это безопасный формат предварительного проживания/просмотра, который помогает покупателю принять решение, а вам — быстрее выйти на сделку.
            </p>
            <div className="testdrive-info-modal__list">
              <div className="testdrive-info-modal__item">
                <span className="testdrive-info-modal__index">1</span>
                <p>Вы указываете стоимость тест-драйва и страховой депозит в карточке объекта.</p>
              </div>
              <div className="testdrive-info-modal__item">
                <span className="testdrive-info-modal__index">2</span>
                <p>Покупатель выбирает удобную дату, и вам приходит уведомление с запросом на подтверждение.</p>
              </div>
              <div className="testdrive-info-modal__item">
                <span className="testdrive-info-modal__index">3</span>
                <p>После подтверждения клиент получает инструкции: правила проживания и максимальный срок тест-драйва (до 3 суток).</p>
              </div>
              <div className="testdrive-info-modal__item">
                <span className="testdrive-info-modal__index">4</span>
                <p>Если покупатель затем оплачивает дом, стоимость тест-драйва засчитывается в общую сумму сделки.</p>
              </div>
            </div>
            <div className="testdrive-info-modal__note">
              Такой формат снижает число «случайных» показов и повышает доверие к объекту.
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно об успешной отправке */}
      {showSuccessModal && (
        <div className="success-modal-overlay" onClick={() => {
          setShowSuccessModal(false)
          if (!adminMode) navigate('/owner')
        }}>
          <div className="success-modal" onClick={(e) => e.stopPropagation()}>
            <div className="success-modal__icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#0ABAB5" strokeWidth="2"/>
                <path d="M8 12L11 15L16 9" stroke="#0ABAB5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="success-modal__title">Ваш объект отправлен на модерацию</h2>
            <p className="success-modal__message">
              <FiClock style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              Ожидайте ответ в течение 48 часов
            </p>
            <button
              className="success-modal__button"
              onClick={() => {
                setShowSuccessModal(false)
                if (!adminMode) navigate('/owner')
              }}
            >
              Понятно
            </button>
          </div>
        </div>
      )}

      {/* Модальное окно с изменениями */}
      {showChangesModal && (
        <div 
          className="changes-modal-overlay"
          onClick={() => setShowChangesModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}
        >
          <div 
            className="changes-modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '2rem',
              maxWidth: '800px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600', color: '#111827' }}>
                Изменения в объявлении
              </h2>
              <button
                onClick={() => setShowChangesModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '0.25rem'
                }}
              >
                <FiX size={24} />
              </button>
            </div>
            
            {getPropertyChanges().length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {getPropertyChanges().map((change, index) => (
                  <div 
                    key={index}
                    style={{
                      padding: '1rem',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}
                  >
                    <div style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#111827' }}>
                      {change.field}
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Было:</div>
                        <div style={{ 
                          padding: '0.5rem', 
                          backgroundColor: '#fee2e2', 
                          borderRadius: '4px',
                          color: '#991b1b',
                          textDecoration: 'line-through'
                        }}>
                          {change.old}
                        </div>
                      </div>
                      <div style={{ fontSize: '1.5rem', color: '#0ABAB5' }}>→</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Стало:</div>
                        <div style={{ 
                          padding: '0.5rem', 
                          backgroundColor: '#d1fae5', 
                          borderRadius: '4px',
                          color: '#065f46',
                          fontWeight: '500'
                        }}>
                          {change.new}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ 
                padding: '2rem', 
                textAlign: 'center', 
                color: '#6b7280',
                backgroundColor: '#f9fafb',
                borderRadius: '8px'
              }}>
                Изменений не обнаружено
              </div>
            )}
            
            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowChangesModal(false)}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#0ABAB5',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '0.875rem'
                }}
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default AddProperty

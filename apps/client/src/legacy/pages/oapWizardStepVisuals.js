import {
  Building2,
  MapPin,
  FileText,
  Sparkles,
  Car,
  Gavel,
  TrendingUp,
  Lightbulb,
  Lock,
  CalendarCheck,
} from 'lucide-react'
import { OAP_PARAMS_IMAGES } from './oapParamsImages'
import { OAP_DESCRIPTION_IMAGES } from './oapDescriptionImages'
import { OAP_AMENITIES_IMAGES } from './oapAmenitiesImages'
import { OAP_LISTING_IMAGES } from './oapListingImages'
import { OAP_TESTDRIVE_IMAGES } from './oapTestdriveImages'
import { OAP_CALCULATOR_IMAGES } from './oapCalculatorImages'
import { OAP_DOCUMENT_IMAGES } from './oapDocumentImages'

export const OAP_WIZARD_STEP_VISUALS = {
  1: {
    accent: 'teal',
    image: OAP_PARAMS_IMAGES.sidebarHero,
    stepLabel: 'Шаг 1 из 5',
    eyebrow: 'Объект и адрес',
    lead: 'Точные параметры и адрес помогают покупателям быстрее найти ваше объявление и повышают доверие к сделке.',
    tipsTitle: 'На что обратить внимание',
    tips: [
      {
        Icon: Building2,
        tone: 'tiffany',
        title: 'Точный тип объекта',
        text: 'От категории зависят поля параметров, удобства и доступные форматы продажи.',
      },
      {
        Icon: MapPin,
        tone: 'tiffany-soft',
        title: 'Адрес на карте',
        text: 'Укажите город и улицу — объект появится в нужном районе на карте платформы.',
      },
    ],
  },
}

export const OAP_BASICS_ROW_ASIDES = {
  type: {
    accent: 'teal',
    image: OAP_PARAMS_IMAGES.sidebarHero,
    stepLabel: 'Шаг 1 из 5',
    eyebrow: 'Объект и адрес',
    lead: OAP_WIZARD_STEP_VISUALS[1].lead,
    tipsTitle: 'На что обратить внимание',
    tips: [OAP_WIZARD_STEP_VISUALS[1].tips[0]],
  },
  params: {
    accent: 'teal',
    image: OAP_PARAMS_IMAGES.characteristicsHero,
    eyebrow: 'Характеристики',
    lead: 'Заполните параметры — они появятся в карточке объявления и помогут покупателям сравнить объект с аналогами.',
    tipsTitle: 'Совет',
    tips: [
      {
        Icon: Building2,
        tone: 'tiffany',
        title: 'Точные параметры',
        text: 'Площадь, комнаты и год постройки помогают покупателям быстрее оценить объект.',
      },
    ],
  },
}

const OAP_PRESENTATION_COPY_ASIDE = {
  accent: 'violet',
  image: OAP_DESCRIPTION_IMAGES.sidebarHero,
  eyebrow: 'Подача объекта',
  lead: 'Сильная презентация — это название, которое цепляет, описание с деталями и качественные фото объекта.',
  tipsTitle: 'Как выделить объявление',
  tips: [
    {
      Icon: Sparkles,
      tone: 'tiffany',
      title: 'Цепляющее название',
      text: 'Укажите тип, локацию и главное преимущество — так карточку чаще открывают.',
    },
  ],
}

export const OAP_PRESENTATION_ROW_ASIDES = {
  copy: OAP_PRESENTATION_COPY_ASIDE,
  amenities: {
    accent: 'violet',
    image: OAP_AMENITIES_IMAGES.sidebarInterior,
    eyebrow: 'Удобства объекта',
    lead: 'Отметьте то, что есть в объекте или рядом — покупатели часто фильтруют по этим параметрам.',
    tipsTitle: 'Совет',
    tips: [
      {
        Icon: Sparkles,
        tone: 'tiffany',
        title: 'Фильтры покупателей',
        text: 'Чем точнее список удобств, тем чаще объект попадает в подборку по фильтрам.',
      },
      {
        Icon: Lightbulb,
        tone: 'tiffany-soft',
        title: 'Дополните вручную',
        text: 'Не нашли нужное в списке — напишите в поле «Дополнительное описание удобств».',
      },
    ],
  },
}

const OAP_FINANCE_STEP_ASIDE = {
  accent: 'teal',
  image: OAP_CALCULATOR_IMAGES.sidebarHero,
  stepLabel: 'Шаг 4 из 5',
  highlights: ['Оценка рынка', '2 раздела'],
  eyebrow: 'Финансы и цена',
  lead: 'Оценка по рынку даёт ориентир, а финальные суммы и даты аукциона вы контролируете сами.',
  tipsTitle: 'Финансовые ориентиры',
  tips: [
    {
      Icon: TrendingUp,
      tone: 'tiffany',
      title: 'Оценка рынка',
      text: 'Калькулятор сравнивает объект с похожими предложениями в выбранном городе.',
    },
    {
      Icon: Lightbulb,
      tone: 'tiffany-soft',
      title: 'Вы задаёте цену',
      text: 'Расчёт — стартовая точка. Итоговые суммы можно скорректировать перед публикацией.',
    },
  ],
}

export const OAP_FINANCE_ROW_ASIDES = {
  calculator: {
    accent: 'teal',
    image: OAP_CALCULATOR_IMAGES.sidebarHero,
    eyebrow: 'Оценка рынка',
    lead: 'Автоматический расчёт по похожим объявлениям — результат можно подставить в поля цены.',
    tipsTitle: 'Совет',
    tips: [OAP_FINANCE_STEP_ASIDE.tips[0]],
  },
  pricing: {
    accent: 'teal',
    image: OAP_CALCULATOR_IMAGES.pricingPublicationHero,
    eyebrow: 'Цена и публикация',
    lead: 'Итоговые суммы и даты аукциона вы контролируете сами — расчёт служит ориентиром.',
    tipsTitle: 'Советы',
    tips: [
      {
        Icon: Lightbulb,
        tone: 'tiffany',
        title: 'Вы задаёте цену',
        text: 'Расчёт — стартовая точка. Итоговые суммы можно скорректировать перед публикацией.',
      },
      {
        Icon: CalendarCheck,
        tone: 'tiffany-soft',
        title: 'Срок аукциона',
        text: 'Достаточный период торгов даёт больше шансов собрать конкурентные ставки.',
      },
    ],
  },
}

const OAP_STRATEGY_STEP_ASIDE = {
  accent: 'amber',
  image: OAP_LISTING_IMAGES.sidebarHero,
  stepLabel: 'Шаг 3 из 5',
  highlights: ['5 форматов', 'Тест-драйв'],
  eyebrow: 'Стратегия продажи',
  lead: 'Выберите формат продажи под ваш объект: аукцион, фиксированная цена, доли или работа с долгом.',
  tipsTitle: 'Стратегия, которая работает',
  tips: [
    {
      Icon: Car,
      tone: 'tiffany',
      title: 'Тест-драйв',
      text: 'Просмотр или пробное проживание повышает доверие и ускоряет принятие решения.',
    },
    {
      Icon: Gavel,
      tone: 'tiffany-soft',
      title: 'Формат размещения',
      text: 'Аукцион с выкупом ускоряет сделку — покупатель может забрать объект сразу.',
    },
  ],
}

export const OAP_STRATEGY_ROW_ASIDES = {
  testdrive: {
    accent: 'teal',
    image: OAP_TESTDRIVE_IMAGES.sidebarHero,
    eyebrow: 'Тест-драйв',
    lead: 'Просмотр или пробное проживание повышает доверие и ускоряет принятие решения.',
    tipsTitle: 'Совет',
    tips: [OAP_STRATEGY_STEP_ASIDE.tips[0]],
  },
}

Object.assign(OAP_WIZARD_STEP_VISUALS, {
  2: OAP_PRESENTATION_COPY_ASIDE,
  3: OAP_STRATEGY_STEP_ASIDE,
  4: OAP_FINANCE_STEP_ASIDE,
  5: {
    accent: 'teal',
    image: OAP_DOCUMENT_IMAGES.sidebarHero,
    stepLabel: 'Шаг 5 из 5',
    highlights: ['Модерация', 'Безопасно'],
    eyebrow: 'Проверка документов',
    lead: 'Полный пакет документов ускоряет модерацию и даёт покупателям уверенность в прозрачности сделки.',
    tipsTitle: 'Перед загрузкой',
    tips: [
      {
        Icon: FileText,
        tone: 'tiffany',
        title: 'Читаемые сканы',
        text: 'PDF или чёткие фото — текст на всех страницах должен быть виден без бликов.',
      },
      {
        Icon: CalendarCheck,
        tone: 'tiffany-soft',
        title: 'Быстрая модерация',
        text: 'Чем полнее пакет, тем быстрее объект пройдёт проверку и выйдет в каталог.',
      },
      {
        Icon: Lock,
        tone: 'tiffany-muted',
        title: 'Конфиденциальность',
        text: 'Файлы доступны только модераторам и проверенным покупателям.',
      },
    ],
    help: {
      title: 'Нужна помощь?',
      text: 'Если возникли вопросы по документам или загрузке — напишите в поддержку.',
    },
  },
})

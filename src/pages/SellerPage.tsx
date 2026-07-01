import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { animate, motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  ArrowRight,
  BadgeDollarSign,
  BarChart3,
  Check,
  CircleDollarSign,
  Gauge,
  Home,
  LineChart,
  Megaphone,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react'
import { publicAsset } from '@/utils/publicAsset'
import { scrollMainTo } from '@/utils/mainScroll'
import Header from '@/components/Header'
import './SellerPage.css'

type SellerCard = {
  title: string
  metric: string
  image: string
  logo: string
}

type StatCard = {
  label: string
  countTo: number
  prefix?: string
  suffix?: string
  icon: ReactNode
}

type ProcessStep = {
  title: string
  copy: string
  visual: 'discover' | 'generate' | 'launch' | 'optimize'
}

type Plan = {
  title: string
  price: string
  tag?: string
  cta: string
  features: string[]
}

const HERO_CARDS: SellerCard[] = [
  {
    title: 'Вилла у моря',
    metric: '148 в избранном',
    image: 'images/external/photo-1600585154526-990dced4db0d-06b654a393.jpg',
    logo: 'ВМ',
  },
  {
    title: 'Резиденция «Палм»',
    metric: '32 целевые заявки',
    image: 'images/external/photo-1512917774080-9991f1c4c750-82ecd9c8d5.jpg',
    logo: 'РП',
  },
  {
    title: 'Лофт «Марина»',
    metric: 'резерв €1.2M',
    image: 'images/external/photo-1560448204-e02f11c3d0e2-d2972f440a.jpg',
    logo: 'ЛМ',
  },
  {
    title: 'Дом на скале',
    metric: '9 активных ставок',
    image: 'images/external/photo-1600596542815-ffad4c1539a9-ee898bce64.jpg',
    logo: 'ДС',
  },
  {
    title: 'Садовая студия',
    metric: 'запуск за 24 ч',
    image: 'images/external/photo-1522708323590-d24dbb6b0267-cf542d6d64.jpg',
    logo: 'СС',
  },
  {
    title: 'Пентхаус «Азур»',
    metric: '3.4K просмотров',
    image: 'images/external/photo-1600566753190-17f0baa2a6c3-fadfb56f04.jpg',
    logo: 'ПА',
  },
]

const STATS: StatCard[] = [
  {
    label: 'Заявок от продавцов',
    countTo: 12,
    suffix: 'K+',
    icon: <Users size={18} />,
  },
  {
    label: 'Объём объектов',
    countTo: 480,
    prefix: '€',
    suffix: 'M+',
    icon: <BadgeDollarSign size={18} />,
  },
  {
    label: 'Средний запуск',
    countTo: 24,
    suffix: ' ч',
    icon: <Gauge size={18} />,
  },
]

const STEPS: ProcessStep[] = [
  {
    title: 'Анализ',
    copy:
      'Сравните похожие виллы, квартиры, аукционы и объекты с фиксированной ценой. Мы покажем ценовые диапазоны, спрос покупателей и угол, который выделит ваш объект.',
    visual: 'discover',
  },
  {
    title: 'Подготовка',
    copy:
      'Соберите готовый пакет продавца из одного брифа объекта: продающее описание, ключевые преимущества, чек-лист для съёмки и презентацию для запуска.',
    visual: 'generate',
  },
  {
    title: 'Запуск',
    copy:
      'Публикуйте сразу в форматы SellYourBrick: аукцион, покупка сейчас, доли, долги, закрытый клуб и таргетированные кампании для покупателей.',
    visual: 'launch',
  },
  {
    title: 'Аналитика',
    copy:
      'Следите за добавлениями в избранное, заявками, показами и качеством предложений в одном дашборде. Меняйте резервную цену, продвижение и тайминг без пересборки объявления.',
    visual: 'optimize',
  },
]

const TESTIMONIALS = [
  {
    quote: 'План запуска был готов в тот же день. Список покупателей выглядел подобранным, а не случайным трафиком.',
    name: 'Елена',
    role: 'Владелица виллы',
    avatar: 'images/external/photo-1494790108377-be9c29b29330-89f0c4a88f.jpg',
  },
  {
    quote: 'Диапазон оценки и презентация сэкономили команде неделю переписки до выхода объекта в продажу.',
    name: 'Матео',
    role: 'Партнёр-агентство',
    avatar: 'images/external/photo-1472099645785-5658abf4ff4e-066a8445b1.jpg',
  },
  {
    quote: 'Я видела, кто из покупателей настроен серьёзно, ещё до показов. Это изменило всю сделку.',
    name: 'Надя',
    role: 'Продавец квартиры',
    avatar: 'images/external/photo-1525134479668-1bee5c7c6845-966b578ed7.jpg',
  },
  {
    quote: 'Резерв на аукционе стал понятнее, бриф для съёмки — точнее, а объявление выглядело премиально.',
    name: 'Артур',
    role: 'Частный продавец',
    avatar: 'images/external/photo-1507003211169-0a1dd7228f2d-94d7ce3808.jpg',
  },
  {
    quote: 'Система ловила детали, которые мы обычно теряем: пробелы в планировке, документы и вопросы инвесторов.',
    name: 'Прия',
    role: 'Управляющий портфелем',
    avatar: 'images/external/photo-1494790108377-be9c29b29330-e7e855964a.jpg',
  },
  {
    quote: 'Вместо «разместил и жди» мы вышли с историей объекта, аналогами и реальной воронкой покупателей.',
    name: 'Джон',
    role: 'Владелец, Тенерифе',
    avatar: 'images/external/photo-1506794778202-cad84cf45f1d-7fea972b45.jpg',
  },
  {
    quote: 'Через закрытый клуб мы нашли покупателя, до которого не дотянулись бы через обычные порталы.',
    name: 'Рамона',
    role: 'Консультант по недвижимости',
    avatar: 'images/external/photo-1522771739844-6a9f6d5f14af-c11365faed.jpg',
  },
  {
    quote: 'У каждого документа, фото и решения по цене был следующий шаг. Никаких хаотичных таблиц для запуска.',
    name: 'Алекс',
    role: 'Продавец пентхауса',
    avatar: 'images/external/photo-1502672260266-1c1ef2d93688-97c7b765e8.jpg',
  },
  {
    quote: 'Аналитика ясно показывала, когда продвигать объект, а когда держать цену.',
    name: 'Мира',
    role: 'Совладелец',
    avatar: 'images/external/photo-1525134479668-1bee5c7c6845-966b578ed7.jpg',
  },
]

const PLANS: Plan[] = [
  {
    title: 'Бесплатный',
    price: '€0/мес',
    cta: 'Начать',
    features: [
      '1 рабочее пространство продавца',
      'Базовый чек-лист объявления',
      'Черновик аукциона или продажи сейчас',
      'Проверка готовности документов',
      'Водяной знак на экспортах',
    ],
  },
  {
    title: 'Профи',
    price: '€49/мес',
    tag: 'Популярный',
    cta: 'Выбрать Профи',
    features: [
      'Безлимит пакетов продавца',
      'AI-история оценки',
      'Премиум-таргетинг покупателей',
      'Подготовка к закрытому клубу',
      'Дашборд аналитики',
      'До 5 участников команды',
      'Экспорт без водяных знаков',
    ],
  },
  {
    title: 'Старт',
    price: '€33/мес',
    cta: 'Выбрать Старт',
    features: [
      '3 запуска объектов',
      'Чек-лист медиа и документов',
      'Конструктор презентации продавца',
      'Отслеживание качества предложений',
      'Приоритетная проверка перед публикацией',
      'Поддержка объявлений на нескольких языках',
    ],
  },
]

const FAQS = [
  {
    question: 'Что именно делает страница продавца?',
    answer:
      'Она превращает бриф объекта в план запуска: позиционирование объявления, документы, контекст по цене, чек-лист медиа, схему публикации и работу с покупателями.',
  },
  {
    question: 'Нужен ли опыт в маркетинге недвижимости?',
    answer:
      'Нет. Сценарий рассчитан на владельцев и команды, которым нужны понятные шаги, и при этом даёт опытным продавцам достаточно деталей для тонкой настройки запуска.',
  },
  {
    question: 'Какие форматы продажи можно создать?',
    answer:
      'Из одного рабочего пространства объекта можно подготовить аукцион, продажу сейчас, продажу долей, долги и запуск в закрытом клубе.',
  },
  {
    question: 'Можно ли публиковать прямо с платформы?',
    answer:
      'Да. Страница направляет каждый запуск в нужный поток SellYourBrick, включая публикацию из кабинета владельца и инструменты продвижения.',
  },
  {
    question: 'Есть ли возможность попробовать бесплатно?',
    answer:
      'Да. Бесплатный тариф позволяет собрать базовое рабочее пространство продавца и подготовить первый чек-лист объявления до выбора платного плана.',
  },
  {
    question: 'Как работает таргетинг покупателей?',
    answer:
      'Мы сопоставляем тип объекта, ценовой диапазон, локацию, профиль доходности и сигналы намерений покупателей, чтобы подобрать сильнейшую аудиторию для запуска.',
  },
  {
    question: 'Как быстро можно выйти в продажу?',
    answer:
      'Готовый объект можно подготовить за день. Недостающие документы или медиа подсвечиваются заранее, чтобы вы знали, что блокирует запуск.',
  },
  {
    question: 'Какие языки поддерживаются?',
    answer:
      'Сценарий продавца рассчитан на мультиязычные объявления и общение с покупателями на тех же языках, что и SellYourBrick.',
  },
]

function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.22 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

function AnimatedStatValue({
  countTo,
  prefix = '',
  suffix = '',
}: {
  countTo: number
  prefix?: string
  suffix?: string
}) {
  const ref = useRef<HTMLParagraphElement | null>(null)
  const [isInView, setIsInView] = useState(false)
  const [value, setValue] = useState(0)

  useEffect(() => {
    const node = ref.current
    if (!node || isInView) return undefined

    const root = document.querySelector('.app-layout')
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        setIsInView(true)
        observer.disconnect()
      },
      {
        root,
        threshold: 0.55,
      },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [isInView])

  useEffect(() => {
    if (!isInView) return undefined

    const controls = animate(0, countTo, {
      duration: 1.55,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setValue(latest),
    })

    return () => controls.stop()
  }, [countTo, isInView])

  return (
    <motion.p
      ref={ref}
      className="seller-stat-card__value"
      initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
      animate={isInView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : undefined}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      {prefix}
      {Math.round(value)}
      {suffix}
    </motion.p>
  )
}

function SectionHeader({
  eyebrow,
  title,
  accent,
  copy,
}: {
  eyebrow: string
  title: string
  accent?: string
  copy?: string
}) {
  return (
    <Reveal className="seller-section-header">
      <span className="seller-eyebrow seller-glass">
        {eyebrow}
      </span>
      <h2 className="seller-section-title">
        {title}
        {accent ? (
          <>
            {' '}
            <span className="seller-gradient-text">
              {accent}
            </span>
          </>
        ) : null}
      </h2>
      {copy ? <p className="seller-section-copy">{copy}</p> : null}
    </Reveal>
  )
}

function VerifiedDot() {
  return (
    <span className="seller-verified">
      <Check size={9} strokeWidth={3} />
    </span>
  )
}

function SellerHeroCard({ card }: { card: SellerCard }) {
  return (
    <article className="seller-hero-card">
      <img
        src={publicAsset(card.image)}
        alt=""
        width={520}
        height={640}
        className="seller-hero-card__image"
        loading="lazy"
        decoding="async"
      />
      <span className="seller-hero-card__badge">
        Готов к продаже
      </span>
      <div className="seller-hero-card__meta">
        <div className="seller-hero-card__logo">
          {card.logo}
        </div>
        <div className="min-w-0">
          <div className="seller-hero-card__title-line">
            <p className="seller-hero-card__title">{card.title}</p>
            <VerifiedDot />
          </div>
          <p className="seller-hero-card__metric">{card.metric}</p>
        </div>
      </div>
    </article>
  )
}

function HeroCarousel() {
  const reduceMotion = useReducedMotion()
  const doubled = useMemo(() => [...HERO_CARDS, ...HERO_CARDS, ...HERO_CARDS], [])

  return (
    <div className="seller-carousel">
      <motion.div
        className="seller-carousel__track"
        animate={reduceMotion ? undefined : { x: ['-33.333%', '-66.666%'] }}
        transition={reduceMotion ? undefined : { repeat: Infinity, duration: 34, ease: 'linear' }}
      >
        {doubled.map((card, index) => (
          <SellerHeroCard key={`${card.title}-${index}`} card={card} />
        ))}
      </motion.div>
    </div>
  )
}

function HeroSection() {
  return (
    <section className="seller-hero">
      <Reveal className="seller-hero__copy">
        <span className="seller-eyebrow seller-glass mb-4">Платформа для продавца</span>
        <h1 className="seller-hero__title">
          Продайте объект{' '}
          <span className="seller-gradient-text italic">
            по реальной цене.
          </span>
        </h1>
        <p className="seller-hero__subtitle">
          Превратите любой объект в премиальный пакет для продажи за считанные минуты — умная оценка, сценарии запуска, спрос покупателей и доступ к верифицированным инвесторам.
        </p>
        <Link
          to="/owner/property/new"
          onClick={() => scrollMainTo(0, 0, 'instant')}
          className="seller-cta seller-primary seller-hero__cta"
        >
          Начать продавать бесплатно
        </Link>
        <div className="seller-hero__note">
          <span className="seller-hero__note-icon seller-primary">
            <Check size={10} strokeWidth={3} />
          </span>
          Без оплаты на старте
        </div>
      </Reveal>
      <HeroCarousel />
    </section>
  )
}

function StatsSection() {
  return (
    <section className="seller-section">
      <SectionHeader
        eyebrow="Статистика платформы"
        title="Основано на данных."
        accent="Доказано результатом."
        copy="Наш движок продаж учится на реальных объявлениях, поведении покупателей и итогах сделок, чтобы делать кампании точнее."
      />
      <div className="seller-content seller-stats">
        {STATS.map((stat, index) => (
          <Reveal key={stat.label} delay={index * 0.08}>
            <div className="seller-stat-card">
              <span className="seller-stat-card__icon seller-primary">
                {stat.icon}
              </span>
              <p className="seller-stat-card__label">{stat.label}</p>
              <AnimatedStatValue countTo={stat.countTo} prefix={stat.prefix} suffix={stat.suffix} />
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

function BrowserListVisual() {
  const rows = [
    { image: 'images/external/photo-1600585154340-be6161a56a0c-08c1b1d59d.jpg', w1: '82%', w2: '62%' },
    { image: 'images/external/photo-1560448204-e02f11c3d0e2-5b957100f2.jpg', w1: '68%', w2: '43%' },
    { image: 'images/external/photo-1522771739844-6a9f6d5f14af-afc86ce7ca.jpg', w1: '74%', w2: '58%' },
    { image: 'images/external/photo-1600607687939-ce8a6c25118c-9791198f05.jpg', w1: '61%', w2: '48%' },
  ]

  return (
    <div className="seller-visual seller-visual--discover">
      <h4 className="seller-visual__title">Анализ <span className="seller-text-accent-soft">спроса</span></h4>
      <div className="seller-search">
        <Search size={14} className="ml-2 seller-text-muted-icon" />
        <span className="seller-search__placeholder">Поиск спроса покупателей</span>
        <span className="seller-search__button seller-primary">Найти</span>
      </div>
      <div className="seller-list">
        {rows.map((row, index) => (
          <div key={row.image} className="seller-list__row">
            <img src={publicAsset(row.image)} alt="" loading="lazy" decoding="async" />
            <div className="seller-list__lines">
              <span className="seller-line" style={{ width: row.w1 }} />
              <span className="seller-line" style={{ width: row.w2, opacity: 0.75 }} />
            </div>
            <span className="seller-list__rank">{index + 1}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function GenerateVisual() {
  return (
    <div className="seller-visual seller-visual--generate">
      <div className="seller-generate__blur-text">
        <span>Соберите пакет продавца</span>
        <span>AI-описание объекта</span>
      </div>
      <motion.div
        className="seller-generate__button"
        animate={{ y: [0, -5, 0] }}
        transition={{ repeat: Infinity, duration: 3.4, ease: 'easeInOut' }}
      >
        <Sparkles size={23} className="mr-3" />
        <strong>Собрать</strong>
        <span>
          <Home size={17} />
        </span>
      </motion.div>
    </div>
  )
}

function LaunchVisual() {
  return (
    <div className="seller-visual seller-visual--launch">
      <div className="seller-launch__rows">
        {['Закрытый клуб', 'Аукцион', 'Купить сейчас'].map((label, index) => (
          <div key={label} className="seller-launch__row">
            <span className="seller-launch__row-label">{label}</span>
            <span className="seller-launch__row-icon seller-primary">
              {index === 0 ? <ShieldCheck size={22} /> : index === 1 ? <Megaphone size={22} /> : <CircleDollarSign size={22} />}
            </span>
          </div>
        ))}
      </div>
      <div className="seller-launch__button seller-primary">
        <Send size={25} />
        <strong>Запуск</strong>
      </div>
    </div>
  )
}

function OptimizeVisual() {
  return (
    <div className="seller-visual seller-visual--optimize">
      <div className="seller-optimize__panel">
        <div className="seller-optimize__head">
          <span>Эффективность</span>
          <LineChart size={22} className="seller-text-accent" />
        </div>
        <div className="seller-chart">
          {[42, 58, 38, 74, 64, 88, 78].map((height, index) => (
            <motion.span
              key={index}
              className="seller-chart__bar flex-1 rounded-t-[10px]"
              initial={{ height: 18 }}
              whileInView={{ height }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.65, delay: index * 0.05 }}
            />
          ))}
        </div>
      </div>
      <div className="seller-optimize__metrics">
        {['Избранное', 'Заявки', 'Оферты'].map((label, index) => (
          <div key={label} className="seller-optimize__metric">
            <p>{label}</p>
            <strong>{[148, 32, 9][index]}</strong>
          </div>
        ))}
      </div>
    </div>
  )
}

function StepVisual({ visual }: { visual: ProcessStep['visual'] }) {
  if (visual === 'discover') return <BrowserListVisual />
  if (visual === 'generate') return <GenerateVisual />
  if (visual === 'launch') return <LaunchVisual />
  return <OptimizeVisual />
}

function ProcessSection() {
  return (
    <section className="seller-section">
      <SectionHeader
        eyebrow="Как это работает"
        title="4 шага"
        accent="до продажи"
        copy="От пустого брифа объекта до живой кампании продажи — без десятка разных инструментов."
      />
      <div className="seller-content seller-steps">
        {STEPS.map((step, index) => (
          <motion.article
            key={step.title}
            className={`seller-step seller-glass ${index % 2 === 1 ? 'seller-step--reverse' : ''}`}
            style={{ zIndex: 10 + index }}
            initial={{ opacity: 0, y: 140, scale: 0.965, filter: 'blur(10px)' }}
            whileInView={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            viewport={{ once: false, amount: 0.32 }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="seller-step__copy">
              <span className="seller-step__number seller-primary">
                {index + 1}
              </span>
              <h3 className="seller-step__title">{step.title}</h3>
              <p className="seller-step__text">{step.copy}</p>
            </div>
            <div className="seller-step__visual">
              <StepVisual visual={step.visual} />
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  )
}

function TestimonialsSection() {
  const columns = [
    TESTIMONIALS.filter((_, index) => index % 3 === 0),
    TESTIMONIALS.filter((_, index) => index % 3 === 1),
    TESTIMONIALS.filter((_, index) => index % 3 === 2),
  ]

  return (
    <section className="seller-section">
      <SectionHeader
        eyebrow="Отзывы"
        title="Что говорят наши"
        accent="продавцы"
        copy="Присоединяйтесь к владельцам и агентствам, которые уже запускают более чистые кампании продаж с SellYourBrick."
      />
      <div className="seller-content seller-testimonials">
        <div className="seller-testimonials__columns">
          {columns.map((items, columnIndex) => {
            const direction = columnIndex === 1 ? 'up' : 'down'
            return (
              <div
                key={direction + columnIndex}
                className={`seller-testimonials__column seller-testimonials__column--${direction} seller-testimonials__column--${columnIndex + 1}`}
              >
                <div className="seller-testimonials__track">
                  {[...items, ...items, ...items].map((item, index) => (
                    <article key={`${item.name}-${columnIndex}-${index}`} className="seller-testimonial seller-glass">
                      <p className="seller-testimonial__quote-mark">”</p>
                      <p className="seller-testimonial__text">{item.quote}</p>
                      <div className="seller-testimonial__person">
                        <img
                          src={publicAsset(item.avatar)}
                          alt=""
                          width={44}
                          height={44}
                          loading="lazy"
                          decoding="async"
                        />
                        <div>
                          <strong>{item.name}</strong>
                          <span>{item.role}</span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function PricingSection() {
  return (
    <section className="seller-section">
      <SectionHeader
        eyebrow="Тарифы"
        title="Выберите свой"
        accent="тариф"
        copy="Без скрытых платежей. Повышайте, понижайте тариф или отменяйте в любой момент."
      />
      <div className="seller-content seller-plans">
        {PLANS.map((plan, index) => (
          <Reveal key={plan.title} delay={index * 0.08}>
            <article className={`seller-plan seller-glass ${plan.tag ? 'seller-plan--popular' : ''}`}>
              {plan.tag ? (
                <div className="seller-plan__tag seller-primary">
                  {plan.tag}
                </div>
              ) : null}
              <p className="seller-plan__price">{plan.price}</p>
              <p className="seller-plan__title">{plan.title}</p>
              <div className="seller-plan__rule" />
              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <span className="seller-plan__check seller-primary">
                      <Check size={12} strokeWidth={3} />
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/owner/property/new"
                onClick={() => scrollMainTo(0, 0, 'instant')}
                className="seller-cta seller-primary seller-plan__cta"
              >
                {plan.cta}
              </Link>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section className="seller-section">
      <SectionHeader
        eyebrow="Вопросы"
        title="Остались"
        accent="вопросы?"
        copy="Здесь ответы на самые частые из них."
      />
      <div className="seller-content seller-faq seller-glass">
        {FAQS.map((item, index) => {
          const isOpen = openIndex === index
          return (
            <div key={item.question} className="seller-faq__item">
              <button
                type="button"
                className="seller-faq__button"
                onClick={() => setOpenIndex(isOpen ? null : index)}
                aria-expanded={isOpen}
              >
                <span>{item.question}</span>
                <span className={`seller-faq__plus seller-primary ${isOpen ? 'seller-faq__plus--open' : ''}`}>
                  <Plus size={17} />
                </span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease: 'easeOut' }}
                    className="seller-faq__answer"
                  >
                    <p>{item.answer}</p>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function BottomCTA() {
  return (
    <section className="seller-bottom">
      <Reveal>
        <div className="seller-bottom__panel">
          <span className="seller-bottom__icon">
            <BarChart3 size={22} />
          </span>
          <span className="seller-bottom__eyebrow">Старт за пару минут</span>
          <h2 className="seller-bottom__title">
            Продавайте объект легко
          </h2>
          <p className="seller-bottom__subtitle">
            Соберите пакет продавца, выберите формат сделки и откройте объект верифицированным инвесторам.
          </p>
          <Link
            to="/owner/property/new"
            onClick={() => scrollMainTo(0, 0, 'instant')}
            className="seller-cta seller-bottom__cta"
          >
            Стать продавцом
            <ArrowRight size={16} />
          </Link>
        </div>
      </Reveal>
    </section>
  )
}

export default function SellerPage() {
  useEffect(() => {
    const layout = document.querySelector('.app-layout')
    layout?.classList.add('app-layout--seller-page')
    scrollMainTo(0, 0, 'instant')

    return () => {
      layout?.classList.remove('app-layout--seller-page')
    }
  }, [])

  return (
    <main className="seller-page">
      <Header />
      <HeroSection />
      <StatsSection />
      <ProcessSection />
      <TestimonialsSection />
      <PricingSection />
      <FAQSection />
      <BottomCTA />
    </main>
  )
}

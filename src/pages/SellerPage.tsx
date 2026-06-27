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
    title: 'Ocean Villa',
    metric: '148 buyer saves',
    image: 'images/external/photo-1600585154526-990dced4db0d-06b654a393.jpg',
    logo: 'OV',
  },
  {
    title: 'Palm Residence',
    metric: '32 qualified leads',
    image: 'images/external/photo-1512917774080-9991f1c4c750-82ecd9c8d5.jpg',
    logo: 'PR',
  },
  {
    title: 'Marina Loft',
    metric: '€1.2M reserve',
    image: 'images/external/photo-1560448204-e02f11c3d0e2-d2972f440a.jpg',
    logo: 'ML',
  },
  {
    title: 'Cliff House',
    metric: '9 active offers',
    image: 'images/external/photo-1600596542815-ffad4c1539a9-ee898bce64.jpg',
    logo: 'CH',
  },
  {
    title: 'Garden Suite',
    metric: '24h launch',
    image: 'images/external/photo-1522708323590-d24dbb6b0267-cf542d6d64.jpg',
    logo: 'GS',
  },
  {
    title: 'Azure Penthouse',
    metric: '3.4K views',
    image: 'images/external/photo-1600566753190-17f0baa2a6c3-fadfb56f04.jpg',
    logo: 'AP',
  },
]

const STATS: StatCard[] = [
  {
    label: 'Seller Requests',
    countTo: 12,
    suffix: 'K+',
    icon: <Users size={18} />,
  },
  {
    label: 'Listed Value',
    countTo: 480,
    prefix: '€',
    suffix: 'M+',
    icon: <BadgeDollarSign size={18} />,
  },
  {
    label: 'Avg. Launch',
    countTo: 24,
    suffix: 'h',
    icon: <Gauge size={18} />,
  },
]

const STEPS: ProcessStep[] = [
  {
    title: 'Discover',
    copy:
      'Compare similar villas, apartments, auctions, and buy-now listings. We surface price bands, buyer intent, and the angle that makes your property stand out.',
    visual: 'discover',
  },
  {
    title: 'Generate',
    copy:
      'Create a polished seller pack from one property brief: listing copy, buyer highlights, media checklist, and a launch-ready presentation.',
    visual: 'generate',
  },
  {
    title: 'Launch',
    copy:
      'Publish directly into SellYourBrick flows: auction, buy now, shares, debts, private club, and targeted buyer campaigns.',
    visual: 'launch',
  },
  {
    title: 'Optimize',
    copy:
      'Watch saves, inquiries, visits, and offer quality in one dashboard. Adjust reserve price, promotion, and timing without rebuilding the listing.',
    visual: 'optimize',
  },
]

const TESTIMONIALS = [
  {
    quote: 'We had a clean launch plan the same day. The buyer list felt curated instead of random traffic.',
    name: 'Elena',
    role: 'Villa owner',
    avatar: 'images/external/photo-1494790108377-be9c29b29330-89f0c4a88f.jpg',
  },
  {
    quote: 'The valuation range and presentation saved our team a week of back-and-forth before going live.',
    name: 'Mateo',
    role: 'Agency partner',
    avatar: 'images/external/photo-1472099645785-5658abf4ff4e-066a8445b1.jpg',
  },
  {
    quote: 'I could see which buyers were serious before accepting viewings. That changed the whole sale.',
    name: 'Nadia',
    role: 'Apartment seller',
    avatar: 'images/external/photo-1525134479668-1bee5c7c6845-966b578ed7.jpg',
  },
  {
    quote: 'Our auction reserve was clearer, the media brief was sharper, and the listing looked premium.',
    name: 'Arthur',
    role: 'Private seller',
    avatar: 'images/external/photo-1507003211169-0a1dd7228f2d-94d7ce3808.jpg',
  },
  {
    quote: 'The system caught details we normally lose: floor plan gaps, proof docs, and investor questions.',
    name: 'Priya',
    role: 'Portfolio manager',
    avatar: 'images/external/photo-1494790108377-be9c29b29330-e7e855964a.jpg',
  },
  {
    quote: 'Instead of listing and waiting, we launched with a story, comparables, and a real buyer funnel.',
    name: 'Jon',
    role: 'Owner, Tenerife',
    avatar: 'images/external/photo-1506794778202-cad84cf45f1d-7fea972b45.jpg',
  },
  {
    quote: 'The private club route found a buyer we would never have reached through standard portals.',
    name: 'Ramona',
    role: 'Estate advisor',
    avatar: 'images/external/photo-1522771739844-6a9f6d5f14af-c11365faed.jpg',
  },
  {
    quote: 'Every document, photo, and price decision had a next step. No messy launch spreadsheet.',
    name: 'Alex',
    role: 'Penthouse seller',
    avatar: 'images/external/photo-1502672260266-1c1ef2d93688-97c7b765e8.jpg',
  },
  {
    quote: 'The analytics made it obvious when to promote and when to hold firm on the offer.',
    name: 'Mira',
    role: 'Co-owner',
    avatar: 'images/external/photo-1525134479668-1bee5c7c6845-966b578ed7.jpg',
  },
]

const PLANS: Plan[] = [
  {
    title: 'Free',
    price: '€0/mo',
    cta: 'Get Started',
    features: [
      '1 seller workspace',
      'Basic listing checklist',
      'Auction or buy-now draft',
      'Document readiness scan',
      'Watermark on exports',
    ],
  },
  {
    title: 'Pro',
    price: '€49/mo',
    tag: 'Most Popular',
    cta: 'Choose Pro',
    features: [
      'Unlimited seller packs',
      'AI valuation narrative',
      'Premium buyer targeting',
      'Private club preparation',
      'Analytics dashboard',
      'Team seats up to 5 members',
      'Watermark-free exports',
    ],
  },
  {
    title: 'Starter',
    price: '€33/mo',
    cta: 'Choose Starter',
    features: [
      '3 property launches',
      'Media and docs checklist',
      'Seller presentation builder',
      'Offer quality tracking',
      'Priority publishing review',
      'Multilingual listing support',
    ],
  },
]

const FAQS = [
  {
    question: 'What exactly does the seller page do?',
    answer:
      'It turns a property brief into a launch plan: listing positioning, documents, pricing context, media checklist, publishing flow, and buyer follow-up.',
  },
  {
    question: 'Do I need real estate marketing experience?',
    answer:
      'No. The flow is built for owners and teams who want clear next steps, while still giving experienced sellers enough detail to tune the launch.',
  },
  {
    question: 'Which sale formats can I create?',
    answer:
      'You can prepare auction, buy-now, share-sale, debt, and private club launches from the same property workspace.',
  },
  {
    question: 'Can I publish directly from the platform?',
    answer:
      'Yes. The page routes each launch into the right SellYourBrick flow, including owner cabinet publishing and promotion tools.',
  },
  {
    question: 'Is there a way to try it for free?',
    answer:
      'Yes. The free plan lets you build a basic seller workspace and prepare the first listing checklist before choosing a paid plan.',
  },
  {
    question: 'How does buyer targeting work?',
    answer:
      'We match property type, price range, location, yield profile, and buyer intent signals to suggest the strongest audience for launch.',
  },
  {
    question: 'How fast can I go live?',
    answer:
      'A complete property can be prepared within a day. Missing documents or media are flagged early so you know what blocks launch.',
  },
  {
    question: 'Which languages are supported?',
    answer:
      'The seller flow is designed for multilingual listings and buyer communication across the same languages used by SellYourBrick.',
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

function SellerNav() {
  return (
    <div className="seller-nav-wrap">
      <div className="seller-nav seller-glass">
        <Link to="/" onClick={() => scrollMainTo(0, 0, 'instant')} className="seller-nav__brand">
          SELLYOURBRICK
        </Link>
        <Link
          to="/owner/property/new"
          onClick={() => scrollMainTo(0, 0, 'instant')}
          aria-label="Create seller listing"
          className="seller-nav__plus seller-primary"
        >
          <Plus size={18} strokeWidth={2.5} />
        </Link>
      </div>
    </div>
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
        Seller-ready
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
        <span className="seller-eyebrow seller-glass mb-4">AI Seller Engine</span>
        <h1 className="seller-hero__title">
          Sell Property That{' '}
          <span className="seller-gradient-text italic">
            Moves.
          </span>
        </h1>
        <p className="seller-hero__subtitle">
          Turn any property into a premium seller pack in minutes — powered by smart pricing, launch scripts, buyer intent, and proven sale frameworks.
        </p>
        <Link
          to="/owner/property/new"
          onClick={() => scrollMainTo(0, 0, 'instant')}
          className="seller-cta seller-primary seller-hero__cta"
        >
          Start Selling for Free
        </Link>
        <div className="seller-hero__note">
          <span className="seller-hero__note-icon seller-primary">
            <Check size={10} strokeWidth={3} />
          </span>
          No upfront fee required
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
        eyebrow="Platform Stats"
        title="Built on Seller Data."
        accent="Proven by Results."
        copy="Our seller engine learns from live listings, buyer behavior, and launch outcomes to create sharper property campaigns."
      />
      <div className="seller-content seller-stats">
        {STATS.map((stat, index) => (
          <Reveal key={stat.label} delay={index * 0.08}>
            <div className="seller-stat-card seller-glass">
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
      <h4 className="seller-visual__title">Discover <span className="seller-text-accent-soft">Demand</span></h4>
      <div className="seller-search">
        <Search size={14} className="ml-2 seller-text-muted-icon" />
        <span className="seller-search__placeholder">Search buyer demand</span>
        <span className="seller-search__button seller-primary">Search</span>
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
        <span>Create studio-quality seller pack</span>
        <span>AI Listing Narrative</span>
      </div>
      <motion.div
        className="seller-generate__button"
        animate={{ y: [0, -5, 0] }}
        transition={{ repeat: Infinity, duration: 3.4, ease: 'easeInOut' }}
      >
        <Sparkles size={23} className="mr-3" />
        <strong>Generate</strong>
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
        {['Private Club', 'Auction', 'Buy Now'].map((label, index) => (
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
        <strong>Launch</strong>
      </div>
    </div>
  )
}

function OptimizeVisual() {
  return (
    <div className="seller-visual seller-visual--optimize">
      <div className="seller-optimize__panel">
        <div className="seller-optimize__head">
          <span>Performance</span>
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
        {['Saves', 'Leads', 'Offers'].map((label, index) => (
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
        eyebrow="How It Works"
        title="Your Seller Engine in"
        accent="Four Steps"
        copy="Go from blank property brief to live sale campaign without juggling a dozen tools."
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
        eyebrow="Wall of Love"
        title="What Our Sellers Are"
        accent="Saying"
        copy="Join owners and agency teams already launching cleaner property campaigns with SellYourBrick."
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
        eyebrow="Pricing"
        title="Pick Your"
        accent="Plan"
        copy="No hidden fees. Upgrade, downgrade, or cancel anytime."
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
        eyebrow="FAQ"
        title="Got"
        accent="Questions?"
        copy="Here are the answers to the most common ones."
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
        <div className="seller-bottom__panel seller-glass">
          <span className="seller-bottom__icon seller-primary">
            <BarChart3 size={22} />
          </span>
          <h2 className="seller-bottom__title">
            Ready to turn your property into a live sale campaign?
          </h2>
          <Link
            to="/owner/property/new"
            onClick={() => scrollMainTo(0, 0, 'instant')}
            className="seller-cta seller-primary seller-bottom__cta"
          >
            Create Seller Pack
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
      <SellerNav />
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

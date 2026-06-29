import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import {
  RiArrowRightLine,
  RiBarChartGroupedLine,
  RiCheckLine,
  RiCloseLine,
  RiCustomerService2Line,
  RiLockLine,
  RiMenuLine,
  RiMessage3Line,
  RiNotification3Line,
  RiPlayCircleLine,
  RiShieldCheckLine,
  RiTeamLine,
  RiTimerFlashLine,
  RiUserStarLine,
  RiVipDiamondLine,
  RiWechatLine,
} from 'react-icons/ri'
import { SiTelegram, SiWhatsapp } from 'react-icons/si'
import PrivateClubVipGate from '../components/PrivateClubVipGate'
import PrivateClubVipCelebrationModal from '../components/PrivateClubVipCelebrationModal'
import { getUserData } from '../services/authService'
import { isSiteUserSignedIn } from '../utils/siteAuthGate'
import { requestOpenLoginModal } from '../utils/requestOpenLoginModal'
import './PrivateClub.css'

const HERO_IMAGE = '/images/vip-club/vip-hero-card.png'
const WHATSAPP_IMAGE = '/images/vip-club/vip-whatsapp-community.png'
const CTA_IMAGE = '/images/vip-club/vip-cta-villa.png'

const navItems = [
  { label: 'Аукционы', href: '/auctions' },
  { label: 'Доли в объектах', href: '/shares' },
  { label: 'Долговые объекты', href: '/debts' },
  { label: 'VIP клуб', href: '/private-club', active: true },
]

const stats = [
  { value: '500+', label: 'участников клуба', icon: RiTeamLine },
  { value: '200+', label: 'премиальных объектов', icon: RiVipDiamondLine },
  { value: '95%', label: 'успешных сделок', icon: RiBarChartGroupedLine },
  { value: '24/7', label: 'поддержка и сопровождение', icon: RiTimerFlashLine },
]

const benefits = [
  {
    title: 'Премиальные объекты',
    text: 'Доступ к закрытым лотам, которых нет в общем доступе. Только проверенные и перспективные предложения.',
    icon: RiVipDiamondLine,
  },
  {
    title: 'Персональный менеджер',
    text: 'Индивидуальное сопровождение на всех этапах. Поможем найти лучшие варианты и провести сделку под ключ.',
    icon: RiUserStarLine,
  },
  {
    title: 'Закрытый чат в WhatsApp',
    text: 'Общение с участниками клуба, обмен опытом, инсайты и ответы на вопросы в закрытом сообществе.',
    icon: RiWechatLine,
  },
  {
    title: 'Ранний доступ к новостям',
    text: 'Первыми получайте информацию о новых объектах, изменениях на рынке и специальных предложениях.',
    icon: RiNotification3Line,
  },
]

const planFeatures = [
  'Доступ ко всем премиальным объектам',
  'Персональный менеджер',
  'Закрытый чат в WhatsApp',
  'Ранний доступ к новостям и уведомлениям',
  'Приоритетная поддержка 24/7',
]

const afterPayItems = [
  'Доступ в закрытый чат VIP клуба',
  'Контакты персонального менеджера',
  'Инструкцию по использованию привилегий',
]

const testimonials = [
  {
    name: 'Алексей В.',
    role: 'Инвестор',
    text: 'VIP клуб дал мне доступ к объектам, которых нет на рынке. Уже через месяц окупил подписку в несколько раз!',
    avatar: '/images/external/photo-1472099645785-5658abf4ff4e-066a8445b1.jpg',
  },
  {
    name: 'Мария С.',
    role: 'Инвестор',
    text: 'Персональный менеджер - это огромная экономия времени и гарантия безопасности сделки.',
    avatar: '/images/external/photo-1494790108377-be9c29b29330-89f0c4a88f.jpg',
  },
  {
    name: 'Игорь П.',
    role: 'Инвестор',
    text: 'Закрытый чат - это настоящая находка. Только полезная информация и живое общение с экспертами.',
    avatar: '/images/external/photo-1507003211169-0a1dd7228f2d-94d7ce3808.jpg',
  },
  {
    name: 'Ольга Н.',
    role: 'Инвестор',
    text: 'Очень нравится, что новые возможности приходят раньше публичных объявлений. Решения принимаются быстрее.',
    avatar: '/images/external/photo-1525134479668-1bee5c7c6845-966b578ed7.jpg',
  },
  {
    name: 'Дмитрий К.',
    role: 'Инвестор',
    text: 'Формат клуба помогает держать фокус: меньше шума, больше качественных предложений и быстрых ответов.',
    avatar: '/images/external/photo-1506794778202-cad84cf45f1d-7fea972b45.jpg',
  },
]

const footerGroups = [
  {
    title: 'Аукционы',
    links: ['Все аукционы', 'Как участвовать', 'Помощь'],
  },
  {
    title: 'Инвестиции',
    links: ['Доли в объектах', 'Долговые объекты', 'Преимущества'],
  },
  {
    title: 'VIP клуб',
    links: ['О клубе', 'Преимущества', 'Тарифы'],
  },
  {
    title: 'Компания',
    links: ['О нас', 'Контакты', 'Документы'],
  },
]

function AukcionLogo({ compact = false }) {
  return (
    <Link to="/" className={`vip-club-logo${compact ? ' vip-club-logo--compact' : ''}`} aria-label="Aukcion">
      <span className="vip-club-logo__mark">A</span>
      <span className="vip-club-logo__word">Aukcion</span>
    </Link>
  )
}

export default function PrivateClub() {
  const { user, isLoaded: clerkLoaded } = useUser()
  const [vipGateOpen, setVipGateOpen] = useState(false)
  const [vipCelebrationOpen, setVipCelebrationOpen] = useState(false)
  const [billingCycle, setBillingCycle] = useState('month')
  const [testimonialIndex, setTestimonialIndex] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [numericUserId, setNumericUserId] = useState(() => {
    const raw = getUserData()?.id ?? localStorage.getItem('userId')
    return raw && /^\d+$/.test(String(raw)) ? parseInt(String(raw), 10) : null
  })

  useEffect(() => {
    const raw = getUserData()?.id ?? localStorage.getItem('userId')
    if (raw && /^\d+$/.test(String(raw))) {
      setNumericUserId(parseInt(String(raw), 10))
    } else {
      setNumericUserId(null)
    }
  }, [user, clerkLoaded])

  const openJoinGate = () => {
    if (!isSiteUserSignedIn(user, clerkLoaded)) {
      requestOpenLoginModal({ wizard: true })
      return
    }
    setVipGateOpen(true)
  }

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setMobileMenuOpen(false)
  }

  const visibleTestimonials = [
    testimonials[testimonialIndex % testimonials.length],
    testimonials[(testimonialIndex + 1) % testimonials.length],
    testimonials[(testimonialIndex + 2) % testimonials.length],
  ]

  const price = billingCycle === 'month' ? '9 990 ₽' : '95 900 ₽'
  const priceCaption = billingCycle === 'month' ? '/ месяц' : '/ год'

  return (
    <div className="vip-club-page">
      <PrivateClubVipGate
        open={vipGateOpen}
        onClose={() => setVipGateOpen(false)}
        userId={numericUserId}
        onPrivateClubActivated={() => {
          setVipGateOpen(false)
          setVipCelebrationOpen(true)
        }}
      />
      <PrivateClubVipCelebrationModal open={vipCelebrationOpen} onClose={() => setVipCelebrationOpen(false)} />

      <header className="vip-club-header">
        <div className="vip-club-shell vip-club-header__inner">
          <AukcionLogo />
          <nav className="vip-club-nav" aria-label="Основная навигация">
            {navItems.map((item) => (
              <Link
                key={item.label}
                to={item.href}
                className={`vip-club-nav__link${item.active ? ' vip-club-nav__link--active' : ''}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <button type="button" className="vip-club-header__login" onClick={() => requestOpenLoginModal({ wizard: true })}>
            Войти / Регистрация
          </button>
          <button
            type="button"
            className="vip-club-header__menu"
            onClick={() => setMobileMenuOpen((value) => !value)}
            aria-label={mobileMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <RiCloseLine /> : <RiMenuLine />}
          </button>
        </div>
        <div className={`vip-club-mobile-nav${mobileMenuOpen ? ' vip-club-mobile-nav--open' : ''}`}>
          {navItems.map((item) => (
            <Link key={item.label} to={item.href} onClick={() => setMobileMenuOpen(false)}>
              {item.label}
            </Link>
          ))}
          <button type="button" onClick={() => requestOpenLoginModal({ wizard: true })}>
            Войти / Регистрация
          </button>
        </div>
      </header>

      <main>
        <section className="vip-club-hero">
          <div className="vip-club-shell vip-club-hero__inner">
            <div className="vip-club-hero__copy">
              <span className="vip-club-pill">Премиальное сообщество</span>
              <h1>
                VIP клуб Aukcion -{' '}
                <span>
                  ваш доступ
                  <br />к лучшим возможностям
                </span>
              </h1>
              <p>Закрытые объекты, персональный сервис и сильное окружение инвесторов</p>
              <div className="vip-club-hero__actions">
                <button type="button" className="vip-club-btn vip-club-btn--primary" onClick={openJoinGate}>
                  Стать VIP участником
                </button>
                <button type="button" className="vip-club-learn" onClick={() => scrollToSection('vip-club-about')}>
                  <span>Узнать больше</span>
                  <RiPlayCircleLine aria-hidden />
                </button>
              </div>
            </div>
            <div className="vip-club-hero__visual" aria-hidden>
              <img src={HERO_IMAGE} alt="" decoding="async" />
            </div>
          </div>
          <div className="vip-club-shell">
            <div className="vip-club-stats" aria-label="Показатели VIP клуба">
              {stats.map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="vip-club-stat">
                    <span className="vip-club-stat__icon">
                      <Icon aria-hidden />
                    </span>
                    <span className="vip-club-stat__value">{item.value}</span>
                    <span className="vip-club-stat__label">{item.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section className="vip-club-section vip-club-about" id="vip-club-about">
          <div className="vip-club-shell">
            <div className="vip-club-section-head">
              <span className="vip-club-pill">Что такое VIP клуб?</span>
              <h2>VIP клуб - это особый уровень доступа и персонального сервиса</h2>
              <p>
                Мы объединили лучших инвесторов и экспертов на одной платформе, чтобы вы могли получать больше
                возможностей и выше доходность.
              </p>
            </div>
            <div className="vip-club-benefits">
              {benefits.map((item) => {
                const Icon = item.icon
                return (
                  <article key={item.title} className="vip-club-benefit">
                    <span className="vip-club-benefit__icon">
                      <Icon aria-hidden />
                    </span>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        <section className="vip-club-section vip-club-pricing" id="vip-club-pricing">
          <div className="vip-club-shell">
            <div className="vip-club-section-head">
              <span className="vip-club-pill">Станьте частью премиального сообщества</span>
              <h2>Выберите подписку и получите доступ ко всем привилегиям клуба</h2>
            </div>
            <div className="vip-club-toggle" role="tablist" aria-label="Период подписки">
              <button
                type="button"
                className={billingCycle === 'month' ? 'is-active' : ''}
                onClick={() => setBillingCycle('month')}
                role="tab"
                aria-selected={billingCycle === 'month'}
              >
                Месяц
              </button>
              <button
                type="button"
                className={billingCycle === 'year' ? 'is-active' : ''}
                onClick={() => setBillingCycle('year')}
                role="tab"
                aria-selected={billingCycle === 'year'}
              >
                Год <span>-20%</span>
              </button>
            </div>
            <div className="vip-club-subscription">
              <article className="vip-club-plan">
                <h3>VIP подписка</h3>
                <div className="vip-club-plan__price">
                  {price} <span>{priceCaption}</span>
                </div>
                <ul>
                  {planFeatures.map((feature) => (
                    <li key={feature}>
                      <RiCheckLine aria-hidden />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button type="button" className="vip-club-plan__btn" onClick={openJoinGate}>
                  Купить подписку
                </button>
              </article>
              <aside className="vip-club-afterpay">
                <h3>После оплаты вы получите</h3>
                <ul>
                  {afterPayItems.map((item, index) => (
                    <li key={item}>
                      {index === 0 ? <RiMessage3Line aria-hidden /> : <RiShieldCheckLine aria-hidden />}
                      {item}
                      {index === 0 ? <RiLockLine className="vip-club-afterpay__lock" aria-hidden /> : null}
                    </li>
                  ))}
                </ul>
              </aside>
            </div>
          </div>
        </section>

        <section className="vip-club-whatsapp" aria-labelledby="vip-club-whatsapp-title">
          <div className="vip-club-shell">
            <div className="vip-club-whatsapp__card">
              <img src={WHATSAPP_IMAGE} alt="" className="vip-club-whatsapp__bg" loading="lazy" decoding="async" />
              <div className="vip-club-whatsapp__content">
                <h2 id="vip-club-whatsapp-title">Закрытое сообщество в WhatsApp</h2>
                <p>Общайтесь с участниками клуба, задавайте вопросы, делитесь опытом и получайте рекомендации от экспертов и инвесторов.</p>
              </div>
              <div className="vip-club-chat-card">
                <h3>
                  VIP чат клуба <RiLockLine aria-hidden />
                </h3>
                <p>Только для участников клуба</p>
                <div className="vip-club-chat-card__avatars" aria-hidden>
                  {testimonials.slice(0, 4).map((item) => (
                    <img key={item.name} src={item.avatar} alt="" />
                  ))}
                  <span>+127</span>
                </div>
                <button type="button" disabled>
                  Перейти в чат
                </button>
              </div>
              <div className="vip-club-whatsapp__note" aria-hidden>
                <RiArrowRightLine />
                <span>Доступ откроется после покупки подписки</span>
              </div>
            </div>
          </div>
        </section>

        <section className="vip-club-section vip-club-testimonials" aria-labelledby="vip-club-testimonials-title">
          <div className="vip-club-shell">
            <span className="vip-club-pill">Отзывы участников</span>
            <div className="vip-club-testimonials__top">
              <h2 id="vip-club-testimonials-title">Что говорят наши участники</h2>
              <div className="vip-club-testimonials__arrows" aria-label="Навигация по отзывам">
                <button
                  type="button"
                  onClick={() => setTestimonialIndex((value) => (value - 1 + testimonials.length) % testimonials.length)}
                  aria-label="Предыдущие отзывы"
                >
                  <RiArrowRightLine aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => setTestimonialIndex((value) => (value + 1) % testimonials.length)}
                  aria-label="Следующие отзывы"
                >
                  <RiArrowRightLine aria-hidden />
                </button>
              </div>
            </div>
            <div className="vip-club-testimonial-grid">
              {visibleTestimonials.map((item) => (
                <article key={item.name} className="vip-club-testimonial">
                  <div className="vip-club-testimonial__person">
                    <img src={item.avatar} alt="" loading="lazy" decoding="async" />
                    <div>
                      <strong>{item.name}</strong>
                      <span>{item.role}</span>
                    </div>
                  </div>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
            <div className="vip-club-dots" aria-label="Выбор набора отзывов">
              {testimonials.map((item, index) => (
                <button
                  key={item.name}
                  type="button"
                  className={index === testimonialIndex ? 'is-active' : ''}
                  onClick={() => setTestimonialIndex(index)}
                  aria-label={`Показать отзывы ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="vip-club-final">
          <div className="vip-club-shell">
            <div className="vip-club-final__banner">
              <img src={CTA_IMAGE} alt="" loading="lazy" decoding="async" />
              <div className="vip-club-final__copy">
                <h2>Готовы к новым возможностям?</h2>
                <p>Присоединяйтесь к VIP клубу Aukcion и инвестируйте выгодно вместе с профессионалами.</p>
                <button type="button" className="vip-club-btn vip-club-btn--light" onClick={openJoinGate}>
                  Стать VIP участником
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="vip-club-footer">
        <div className="vip-club-shell vip-club-footer__inner">
          <div className="vip-club-footer__brand">
            <AukcionLogo compact />
            <p>Платформа для инвестиций в недвижимость на аукционах</p>
            <span>© 2024 Aukcion. Все права защищены</span>
          </div>
          <div className="vip-club-footer__links">
            {footerGroups.map((group) => (
              <div key={group.title}>
                <h3>{group.title}</h3>
                {group.links.map((link) => (
                  <a href="#vip-club-about" key={link}>
                    {link}
                  </a>
                ))}
              </div>
            ))}
          </div>
          <div className="vip-club-footer__contacts">
            <a href="tel:+78001234567">8 800 123-45-67</a>
            <a href="mailto:info@aukcion.ru">info@aukcion.ru</a>
            <div className="vip-club-footer__socials">
              <a href="https://t.me/" target="_blank" rel="noreferrer" aria-label="Telegram">
                <SiTelegram aria-hidden />
              </a>
              <a href="https://wa.me/447700183959" target="_blank" rel="noreferrer" aria-label="WhatsApp">
                <SiWhatsapp aria-hidden />
              </a>
            </div>
          </div>
        </div>
        <div className="vip-club-shell vip-club-footer__legal">
          <a href="#vip-club-about">Политика конфиденциальности</a>
          <a href="#vip-club-about">Пользовательское соглашение</a>
        </div>
      </footer>
    </div>
  )
}

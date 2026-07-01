import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import {
  RiArrowRightLine,
  RiCloseLine,
  RiLockLine,
  RiMenuLine,
  RiNotification3Line,
  RiUserStarLine,
  RiVipDiamondLine,
  RiWechatLine,
} from 'react-icons/ri'
import PrivateClubVipGate from '../components/PrivateClubVipGate'
import PrivateClubVipCelebrationModal from '../components/PrivateClubVipCelebrationModal'
import { getUserData } from '../services/authService'
import { isSiteUserSignedIn } from '../utils/siteAuthGate'
import { requestOpenLoginModal } from '../utils/requestOpenLoginModal'
import './PrivateClub.css'

const HERO_IMAGE = '/images/vip-club/vip-hero-phone.png?v=3'
const WHATSAPP_IMAGE = '/images/vip-club/vip-whatsapp-community.png'

const chatAvatars = [
  '/images/external/photo-1472099645785-5658abf4ff4e-066a8445b1.jpg',
  '/images/external/photo-1494790108377-be9c29b29330-89f0c4a88f.jpg',
  '/images/external/photo-1507003211169-0a1dd7228f2d-94d7ce3808.jpg',
  '/images/external/photo-1525134479668-1bee5c7c6845-966b578ed7.jpg',
]

const infoCards = [
  {
    image: '/images/vip-club/vip-info-portfolio.png',
    title: 'Инвестируйте от €100*',
    text: 'Начните формировать портфель недвижимости с любой суммы — VIP-клуб открывает доступ к долям и закрытым лотам.',
  },
  {
    image: '/images/vip-club/vip-info-income.png',
    title: 'Доход, пока вы отдыхаете',
    text: 'Получайте выплаты от аренды и роста стоимости объектов — портфель работает без вашего постоянного участия.',
  },
]

const navItems = [
  { label: 'Аукционы', href: '/auctions' },
  { label: 'Доли в объектах', href: '/shares' },
  { label: 'Долговые объекты', href: '/debts' },
  { label: 'VIP клуб', href: '/private-club', active: true },
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

const storyCards = [
  {
    image: '/images/vip-club/vip-story-premium.png',
    title: 'Премиальные объекты',
    text: 'Доступ к закрытым лотам, которых нет в открытом каталоге — только проверенные и перспективные предложения.',
  },
  {
    image: '/images/vip-club/vip-story-manager.png',
    title: 'Персональный менеджер',
    text: 'Индивидуальное сопровождение на всех этапах: подбор, переговоры и сделка под ключ.',
  },
  {
    image: '/images/vip-club/vip-story-community.png',
    title: 'Закрытый чат в WhatsApp',
    text: 'Живое сообщество инвесторов, обмен опытом и быстрые ответы от экспертов клуба.',
  },
  {
    image: '/images/vip-club/vip-story-access.png',
    title: 'Ранний доступ к новостям',
    text: 'Первыми узнавайте о новых объектах, изменениях на рынке и специальных предложениях.',
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
  const [storyIndex, setStoryIndex] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const storyCardRefs = useRef([])
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

  const scrollStory = (direction) => {
    const next = (storyIndex + direction + storyCards.length) % storyCards.length
    setStoryIndex(next)
    storyCardRefs.current[next]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }

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
        <div className="vip-club-fold">
        <section className="vip-club-hero">
          <div className="vip-club-shell vip-club-hero__stack">
            <div className="vip-club-hero__intro">
              <h1>
                VIP клуб Aukcion — простой доступ
                <br />
                к закрытым объектам и сделкам
              </h1>
              <p>
                Закрытые лоты, персональный менеджер и сообщество инвесторов — всё в одном кабинете.
                Безопасный доступ к премиальным предложениям, которых нет в открытом каталоге.
              </p>
              <div className="vip-club-hero__actions">
                <button type="button" className="vip-club-btn vip-club-btn--dark" onClick={openJoinGate}>
                  <span>Стать VIP участником</span>
                  <span className="vip-club-btn__arrow" aria-hidden>
                    <RiArrowRightLine />
                  </span>
                </button>
                <button type="button" className="vip-club-btn vip-club-btn--soft" onClick={() => scrollToSection('vip-club-about')}>
                  Узнать больше
                </button>
              </div>
            </div>
            <div className="vip-club-hero__stage">
              <div className="vip-club-hero__backdrop" aria-hidden>
                <div className="vip-club-hero__glow" />
                <div className="vip-club-hero__rings" />
              </div>
              <figure className="vip-club-hero-figure">
                <img
                  src={HERO_IMAGE}
                  alt="VIP Club — телефон с закрытыми объектами, аналитикой и карточками портфеля"
                  decoding="async"
                  draggable={false}
                />
              </figure>
            </div>
          </div>
        </section>
        </div>

        <section className="vip-club-section vip-club-about" id="vip-club-about">
          <div className="vip-club-shell">
            <div className="vip-club-section-head">
              <span className="vip-club-pill">Что такое VIP клуб?</span>
              <h2>VIP клуб — особый уровень доступа и персонального сервиса</h2>
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
                  {chatAvatars.map((avatar) => (
                    <img key={avatar} src={avatar} alt="" />
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

        <section className="vip-club-info-cards" aria-label="Преимущества инвестирования">
          <div className="vip-club-shell">
            <div className="vip-club-info-cards__grid">
              {infoCards.map((card) => (
                <article key={card.title} className="vip-club-info-card">
                  <div className="vip-club-info-card__visual">
                    <img src={card.image} alt="" loading="lazy" decoding="async" />
                  </div>
                  <div className="vip-club-info-card__copy">
                    <h3>{card.title}</h3>
                    <p>{card.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="vip-club-stories">
          <div className="vip-club-shell vip-club-stories__layout">
            <div className="vip-club-stories__aside">
              <span className="vip-club-stories__label">Истории участников</span>
              <h2>VIP — ваше преимущество на рынке недвижимости</h2>
              <p className="vip-club-stories__lead">
                Реальные сценарии: закрытые объекты, персональный сервис и сообщество, которое помогает принимать
                решения быстрее.
              </p>
              <div className="vip-club-stories__nav" aria-label="Навигация по карточкам">
                <span className="vip-club-stories__counter">
                  {storyIndex + 1}/{storyCards.length}
                </span>
                <button
                  type="button"
                  className="vip-club-stories__arrow"
                  onClick={() => scrollStory(-1)}
                  aria-label="Предыдущая карточка"
                >
                  <RiArrowRightLine aria-hidden />
                </button>
                <button
                  type="button"
                  className="vip-club-stories__arrow vip-club-stories__arrow--next"
                  onClick={() => scrollStory(1)}
                  aria-label="Следующая карточка"
                >
                  <RiArrowRightLine aria-hidden />
                </button>
              </div>
            </div>
            <div className="vip-club-stories__viewport">
              <div className="vip-club-stories__track">
                {storyCards.map((card, index) => (
                  <article
                    key={card.title}
                    ref={(node) => {
                      storyCardRefs.current[index] = node
                    }}
                    className="vip-club-story-card"
                  >
                    <div className="vip-club-story-card__visual">
                      <img src={card.image} alt="" loading="lazy" decoding="async" />
                    </div>
                    <div className="vip-club-story-card__body">
                      <h3>{card.title}</h3>
                      <p>{card.text}</p>
                      <button type="button" className="vip-club-story-card__cta" onClick={openJoinGate}>
                        Подробнее
                        <RiArrowRightLine aria-hidden />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

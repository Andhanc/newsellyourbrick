import { useEffect, useRef, useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import {
  RiArrowRightLine,
  RiLockLine,
  RiNotification3Line,
  RiUserStarLine,
  RiVipDiamondLine,
  RiWechatLine,
} from 'react-icons/ri'
import Header from '../components/Header'
import PrivateClubVipGate from '../components/PrivateClubVipGate'
import PrivateClubVipCelebrationModal from '../components/PrivateClubVipCelebrationModal'
import { getUserData } from '../services/authService'
import { isSiteUserSignedIn } from '../utils/siteAuthGate'
import { requestOpenLoginModal } from '../utils/requestOpenLoginModal'
import './PrivateClub.css'

const HERO_IMAGE = '/images/vip-club/vip-hero-monex-transparent.png?v=2'
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
    text: 'Собирайте портфель недвижимости с любой суммы и получайте доступ к закрытым лотам.',
  },
  {
    image: '/images/vip-club/vip-info-income.png',
    title: 'Доход, пока вы отдыхаете',
    text: 'Получайте доход от аренды и роста стоимости — без постоянного участия.',
  },
]

const benefits = [
  {
    title: 'Премиальные объекты',
    text: 'Проверенные закрытые лоты, которых нет в общем каталоге.',
    icon: RiVipDiamondLine,
  },
  {
    title: 'Персональный менеджер',
    text: 'Личное сопровождение: от подбора объекта до завершения сделки.',
    icon: RiUserStarLine,
  },
  {
    title: 'Закрытый чат в WhatsApp',
    text: 'Обмен опытом, инсайты и ответы экспертов в закрытом сообществе.',
    icon: RiWechatLine,
  },
  {
    title: 'Ранний доступ к новостям',
    text: 'Новые объекты и специальные предложения раньше других.',
    icon: RiNotification3Line,
  },
]

const storyCards = [
  {
    image: '/images/vip-club/vip-story-premium.png',
    title: 'Премиальные объекты',
    text: 'Проверенные закрытые лоты с сильным инвестиционным потенциалом.',
  },
  {
    image: '/images/vip-club/vip-story-manager.png',
    title: 'Персональный менеджер',
    text: 'Подбор, переговоры и сопровождение сделки под ключ.',
  },
  {
    image: '/images/vip-club/vip-story-community.png',
    title: 'Закрытый чат в WhatsApp',
    text: 'Обмен опытом и быстрые ответы экспертов клуба.',
    visualFill: true,
  },
  {
    image: '/images/vip-club/vip-story-access.png',
    title: 'Ранний доступ к новостям',
    text: 'Новые объекты и специальные предложения раньше других.',
  },
]

export default function PrivateClub() {
  const { user, isLoaded: clerkLoaded } = useUser()
  const [vipGateOpen, setVipGateOpen] = useState(false)
  const [vipCelebrationOpen, setVipCelebrationOpen] = useState(false)
  const [storyIndex, setStoryIndex] = useState(0)
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

  const scrollStory = (direction) => {
    const next = (storyIndex + direction + storyCards.length) % storyCards.length
    setStoryIndex(next)
    storyCardRefs.current[next]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }

  return (
    <>
      <Header />
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

      <main>
        <div className="vip-club-fold">
          <section className="vip-club-hero">
            <div className="vip-club-shell vip-club-hero__stack">
              <div className="vip-club-hero__intro">
                <h1>
                  <span>Закрытый клуб</span>
                  <span>премиальных сделок.</span>
                </h1>
                <p>
                  Закрытые лоты, личный менеджер и сообщество инвесторов — всё для быстрых и уверенных сделок.
                </p>
              </div>
              <div className="vip-club-hero__stage">
                <div className="vip-club-hero__backdrop" aria-hidden>
                  <div className="vip-club-hero__glow" />
                </div>
                <div className="vip-club-hero__scene">
                  <figure className="vip-club-hero-figure">
                    <img
                      src={HERO_IMAGE}
                      alt="Закрытый VIP-клуб — телефон с премиальными объектами, доходностью и карточками аналитики"
                      decoding="async"
                      draggable={false}
                    />
                  </figure>
                </div>
              </div>
              <div className="vip-club-hero__actions">
                <button type="button" className="vip-club-btn vip-club-btn--dark" onClick={openJoinGate}>
                  Стать VIP участником
                </button>
              </div>
            </div>
          </section>
        </div>

        <section className="vip-club-section vip-club-about" id="vip-club-about">
          <div className="vip-club-shell">
            <div className="vip-club-section-head">
              <span className="vip-club-pill">Что такое VIP клуб?</span>
              <h2>
                <span>Больше возможностей</span>
                <span>с VIP-доступом</span>
              </h2>
              <p>Закрытые возможности, экспертиза и личное сопровождение — для уверенных решений.</p>
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
              <div className="vip-club-whatsapp__layout">
                <div className="vip-club-whatsapp__content">
                  <h2 id="vip-club-whatsapp-title">Закрытое сообщество в WhatsApp</h2>
                  <p>Общайтесь с инвесторами и получайте рекомендации экспертов клуба.</p>
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
              <h2>
                <span>Ваше преимущество</span>
                <span>на рынке недвижимости</span>
              </h2>
              <p className="vip-club-stories__lead">
                Закрытые объекты, личный сервис и сильное сообщество — чтобы решать быстрее.
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
                    <div
                      className={`vip-club-story-card__visual${
                        card.visualFill ? ' vip-club-story-card__visual--fill' : ''
                      }`}
                    >
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

        <section className="vip-club-join" aria-label="Вступить в VIP клуб">
          <div className="vip-club-shell">
            <div className="vip-club-join-panel">
              <div className="vip-club-join-panel__copy">
                <span>Закрытый доступ</span>
                <strong>VIP клуб Aukcion</strong>
                <p>Закрытые объекты, личный менеджер и сообщество инвесторов — в одном кабинете.</p>
              </div>
              <button type="button" className="vip-club-join-panel__cta" onClick={openJoinGate}>
                <RiVipDiamondLine aria-hidden />
                Стать VIP участником
              </button>
            </div>
          </div>
        </section>
      </main>
      </div>
    </>
  )
}

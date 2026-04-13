import { useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import {
  FiHash,
  FiShield,
  FiDatabase,
  FiClock,
  FiCalendar,
  FiCreditCard,
  FiLayers,
  FiMessageCircle,
  FiAlertCircle,
  FiHome,
  FiPieChart,
  FiFileText,
  FiBookOpen,
  FiArrowRight,
  FiCheckCircle,
  FiTrendingUp,
  FiStar,
} from 'react-icons/fi'
import { getUserData } from '../services/authService'
import { isSiteUserSignedIn } from '../utils/siteAuthGate'
import { requestOpenLoginModal } from '../utils/requestOpenLoginModal'
import './TestPage.css'

const MAIN_CARDS = [
  {
    title: 'Данные',
    description: 'Личные данные и документы',
    to: '/data',
    icon: FiDatabase,
  },
  {
    title: 'История',
    description: 'История операций и действий',
    to: '/history',
    icon: FiClock,
  },
  {
    title: 'Мои бронирования',
    description: 'Просмотр текущих и завершенных',
    to: '/profile/bookings',
    icon: FiCalendar,
  },
  {
    title: 'Кошелек',
    description: 'Баланс, пополнения и выводы',
    to: '/wallet',
    icon: FiCreditCard,
  },
  {
    title: 'Подписки',
    description: 'Управление планами и лимитами',
    to: '/subscriptions',
    icon: FiLayers,
  },
  {
    title: 'Чат',
    description: 'Связь с поддержкой и менеджером',
    to: '/chat?manager=1',
    icon: FiMessageCircle,
  },
]

const QUICK_LINKS = [
  { title: 'Долги', subtitle: 'Контроль задолженностей', to: '/debts', icon: FiAlertCircle },
  { title: 'Аукцион', subtitle: 'Торги и быстрые покупки', to: '/auction', icon: FiHome },
  { title: 'Доли', subtitle: 'Инвестиции в объекты', to: '/shares', icon: FiPieChart },
]

const TRANSACTIONS = [
  { id: 'TRX-9213', action: 'Покупка доли', amount: '€1,250', status: 'Завершено' },
  { id: 'TRX-9180', action: 'Пополнение кошелька', amount: '€600', status: 'Завершено' },
  { id: 'TRX-9151', action: 'Комиссия аукциона', amount: '€49', status: 'Обработано' },
]

const DASHBOARD_METRICS = [
  { label: 'Активных сценариев', value: '6+', icon: FiStar },
  { label: 'Переходов в 1 клик', value: '11', icon: FiTrendingUp },
  { label: 'Статус аккаунта', value: 'OK', icon: FiCheckCircle },
]

function TestPage() {
  const navigate = useNavigate()
  const { user, isLoaded } = useUser()

  useEffect(() => {
    if (!isLoaded) return
    if (!isSiteUserSignedIn(user, isLoaded)) {
      requestOpenLoginModal({ wizard: true })
      navigate('/', { replace: true })
    }
  }, [isLoaded, user, navigate])

  const userData = useMemo(() => getUserData(), [])
  const fullName =
    user?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    userData.name ||
    'Пользователь'
  const userId = localStorage.getItem('userId') || userData.id || '—'
  const roleRaw = userData.role || localStorage.getItem('userRole') || 'buyer'
  const roleLabel = roleRaw === 'seller' || roleRaw === 'owner' ? 'Продавец' : 'Покупатель'
  const subscriptionName = 'Starter'

  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  return (
    <div className="test-page">
      <div className="test-page__orb test-page__orb--one" aria-hidden="true" />
      <div className="test-page__orb test-page__orb--two" aria-hidden="true" />
      <div className="test-page__container">
        <section className="test-hero">
          <div className="test-hero__profile">
            <div className="test-avatar" aria-hidden="true">
              {initials || 'U'}
            </div>
            <div className="test-hero__meta">
              <p className="test-kicker">Личный кабинет</p>
              <h1>{fullName}</h1>
              <div className="test-hero__tags">
                <span>
                  <FiHash size={14} />
                  ID: {userId}
                </span>
                <span>
                  <FiShield size={14} />
                  Роль: {roleLabel}
                </span>
              </div>
            </div>
          </div>
          <div className="test-subscription">
            <p className="test-subscription__label">Текущая подписка</p>
            <strong>{subscriptionName}</strong>
            <p className="test-subscription__hint">Базовый доступ ко всем ключевым функциям платформы</p>
            <Link to="/subscriptions" className="test-subscription__link">
              Управлять подпиской <FiArrowRight size={14} />
            </Link>
          </div>
        </section>

        <section className="test-metrics">
          {DASHBOARD_METRICS.map((metric) => {
            const Icon = metric.icon
            return (
              <article key={metric.label} className="test-metric-card">
                <div className="test-metric-card__icon">
                  <Icon size={16} />
                </div>
                <div>
                  <p>{metric.label}</p>
                  <strong>{metric.value}</strong>
                </div>
              </article>
            )
          })}
        </section>

        <section className="test-section">
          <h2>Быстрые разделы</h2>
          <p className="test-section__subtitle">Основные задачи и действия в удобных акцентных карточках</p>
          <div className="test-cards-grid">
            {MAIN_CARDS.map((card) => {
              const Icon = card.icon
              return (
                <Link key={card.title} to={card.to} className="test-card">
                  <div className="test-card__icon">
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3>{card.title}</h3>
                    <p>{card.description}</p>
                  </div>
                  <FiArrowRight size={16} className="test-card__arrow" />
                </Link>
              )
            })}
          </div>
        </section>

        <section className="test-section">
          <h2>Переходы по направлениям</h2>
          <p className="test-section__subtitle">Ключевые инвестиционные направления и операционные разделы</p>
          <div className="test-quick-grid">
            {QUICK_LINKS.map((link) => {
              const Icon = link.icon
              return (
                <Link key={link.title} to={link.to} className="test-quick-card">
                  <Icon size={18} />
                  <div>
                    <strong>{link.title}</strong>
                    <p>{link.subtitle}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        <section className="test-section">
          <h2>История транзакций</h2>
          <p className="test-section__subtitle">Последние финансовые операции аккаунта</p>
          <div className="test-transactions">
            {TRANSACTIONS.map((item) => (
              <article key={item.id} className="test-transaction">
                <div>
                  <p className="test-transaction__id">{item.id}</p>
                  <p className="test-transaction__action">{item.action}</p>
                </div>
                <div className="test-transaction__right">
                  <strong>{item.amount}</strong>
                  <span>
                    <FiCheckCircle size={13} />
                    {item.status}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="test-section">
          <h2>Документы и соглашения</h2>
          <p className="test-section__subtitle">Доступ к юридическим и пользовательским документам</p>
          <div className="test-docs-grid">
            <Link to="/data#data-section-documents" className="test-doc-card">
              <FiFileText size={18} />
              <div>
                <strong>Документация пользователя</strong>
                <p>Паспортные данные, статусы и загруженные файлы</p>
              </div>
            </Link>
            <Link to="/data#data-section-main" className="test-doc-card">
              <FiBookOpen size={18} />
              <div>
                <strong>Политика и соглашение</strong>
                <p>Правила сервиса, обработка данных и условия использования</p>
              </div>
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}

export default TestPage

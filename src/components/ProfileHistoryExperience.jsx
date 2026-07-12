import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  FiActivity,
  FiArrowLeft,
  FiArrowRight,
  FiArrowUpRight,
  FiChevronDown,
  FiClock,
  FiLayers,
  FiMapPin,
  FiSearch,
  FiShoppingBag,
  FiTrendingUp,
} from 'react-icons/fi'
import { buildProfileHistoryDashboard } from '../utils/profileCabinetPresentation'
import './ProfileHistoryExperience.css'

const CATEGORY_ICONS = {
  bids: FiTrendingUp,
  properties: FiShoppingBag,
  shares: FiLayers,
  debts: FiActivity,
}

function compactMoney(value, currency, locale) {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value)
  } catch {
    return `${Math.round(value).toLocaleString(locale)} ${currency}`
  }
}

function HistoryCard({ item, categoryKey, onOpenPurchased, onClose }) {
  const canOpenDrawer = Boolean(item.purchaseChannel && onOpenPurchased)
  const action = canOpenDrawer ? (
    <button
      type="button"
      className="profile-history-card__action"
      aria-label={`Подробнее: ${item.title}`}
      onClick={() => onOpenPurchased(item)}
    >
      <FiArrowRight size={14} aria-hidden />
    </button>
  ) : item.href ? (
    <Link
      className="profile-history-card__action"
      to={item.href}
      aria-label={`Открыть: ${item.title}`}
      onClick={onClose}
    >
      <FiArrowRight size={14} aria-hidden />
    </Link>
  ) : null

  return (
    <article className={`profile-history-card profile-history-card--${categoryKey}`}>
      <div className="profile-history-card__media">
        <img src={item.imageSrc} alt="" loading="lazy" decoding="async" />
      </div>
      <div className="profile-history-card__content">
        <time className="profile-history-card__date" dateTime={item.dayKey || undefined}>
          <FiClock size={12} aria-hidden />
          {item.purchaseDate || 'Дата не указана'}
        </time>
        <h5 className="profile-history-card__title">{item.title}</h5>
        {item.location ? (
          <p className="profile-history-card__location">
            <FiMapPin size={13} aria-hidden />
            <span>{item.location}</span>
          </p>
        ) : null}
        <div className="profile-history-card__amount">
          <span>{categoryKey === 'bids' ? 'Ставка' : 'Покупка'}</span>
          <strong>{item.amount || '—'}</strong>
        </div>
      </div>
      <div className="profile-history-card__aside">{action}</div>
    </article>
  )
}

export default function ProfileHistoryExperience({
  sections,
  loading,
  query,
  onQueryChange,
  onClose,
  onOpenPurchased,
  locale = 'ru-RU',
}) {
  const dashboard = useMemo(() => buildProfileHistoryDashboard(sections), [sections])
  const normalizedQuery = String(query || '').trim().toLowerCase()
  const categories = useMemo(
    () =>
      dashboard.categories.map((category) => ({
        ...category,
        items: normalizedQuery
          ? category.items.filter((item) =>
              `${item.title || ''} ${item.subtitle || ''} ${item.location || ''}`
                .toLowerCase()
                .includes(normalizedQuery),
            )
          : category.items,
      })),
    [dashboard.categories, normalizedQuery],
  )
  const investedEntries = Object.entries(dashboard.analytics.investedByCurrency)
  const invested = investedEntries.length
    ? investedEntries.map(([currency, value]) => compactMoney(value, currency, locale)).join(' + ')
    : '—'

  return (
    <div className="profile-history-experience">
      <div className="profile-history-experience__toolbar">
        <button type="button" className="profile-history-experience__back" onClick={onClose}>
          <FiArrowLeft size={18} aria-hidden />
          <span>Назад</span>
        </button>
        <div>
          <span className="profile-history-experience__eyebrow">Финансовый журнал</span>
          <h3 className="profile-history-experience__title">История операций</h3>
        </div>
      </div>

      {loading ? (
        <div className="profile-history-experience__loading" aria-busy="true">
          Загружаем историю…
        </div>
      ) : (
        <>
          <div className="profile-history-insights" aria-label="Краткая аналитика">
            <div className="profile-history-insight profile-history-insight--accent">
              <div><span>Вложено</span><i><FiArrowUpRight size={16} /></i></div>
              <strong>{invested}</strong>
              <small>Общий объём</small>
            </div>
            <div className="profile-history-insight">
              <div><span>Операции</span><i><FiArrowUpRight size={16} /></i></div>
              <strong>{dashboard.analytics.operations}</strong>
              <small>Всего</small>
            </div>
            <div className="profile-history-insight">
              <div><span>Покупки</span><i><FiArrowUpRight size={16} /></i></div>
              <strong>{dashboard.analytics.purchases}</strong>
              <small>Активов</small>
            </div>
            <div className="profile-history-insight">
              <div><span>Ставки</span><i><FiArrowUpRight size={16} /></i></div>
              <strong>{dashboard.analytics.activeBids}</strong>
              <small>Аукцион</small>
            </div>
          </div>

          <label className="profile-history-search">
            <FiSearch size={17} aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Найти объект или операцию"
              autoComplete="off"
            />
          </label>

          <div className="profile-history-categories">
            {categories.map((category, index) => {
              const Icon = CATEGORY_ICONS[category.key]
              const count = category.items.length
              return (
                <details
                  key={category.key}
                  className={`profile-history-category profile-history-category--${category.key}`}
                  defaultOpen={index === 0 && count > 0}
                >
                  <summary className="profile-history-category__summary">
                    <span className="profile-history-category__icon" aria-hidden>
                      <Icon size={18} />
                    </span>
                    <span className="profile-history-category__copy">
                      <strong>{category.title}</strong>
                      <small>{category.eyebrow}</small>
                    </span>
                    <span className="profile-history-category__count">{count}</span>
                    <FiChevronDown className="profile-history-category__chevron" size={18} aria-hidden />
                  </summary>
                  <div className="profile-history-category__body">
                    {count ? (
                      <div className="profile-history-category__rail">
                        {category.items.map((item) => (
                          <HistoryCard
                            key={item.id}
                            item={item}
                            categoryKey={category.key}
                            onOpenPurchased={onOpenPurchased}
                            onClose={onClose}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="profile-history-category__empty">
                        {normalizedQuery ? 'В этой категории совпадений нет' : 'Пока здесь нет операций'}
                      </p>
                    )}
                  </div>
                </details>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

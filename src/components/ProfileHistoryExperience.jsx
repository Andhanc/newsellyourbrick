import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FiActivity,
  FiArrowRight,
  FiCheck,
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

const CATEGORY_LABELS = {
  bids: 'СТАВКА',
  properties: 'ОБЪЕКТ',
  shares: 'ДОЛЯ',
  debts: 'ДОЛГ',
}

function HistoryListCard({ item, categoryKey, onOpenPurchased, onClose }) {
  const canOpenDrawer = Boolean(item.purchaseChannel && onOpenPurchased)
  const meta = CATEGORY_LABELS[categoryKey] || 'ИСТОРИЯ'
  const open = () => {
    if (canOpenDrawer) onOpenPurchased(item)
  }

  const body = (
    <>
      <div className="profile-history-list-card__media">
        <img src={item.imageSrc} alt="" loading="lazy" decoding="async" />
        <span className="profile-history-list-card__badge">
          <FiCheck size={11} aria-hidden />
          {meta}
        </span>
      </div>
      <div className="profile-history-list-card__copy">
        <span className="profile-history-list-card__meta">
          {meta}
          {item.purchaseDate ? ` • ${item.purchaseDate}` : ''}
        </span>
        <strong className="profile-history-list-card__title">{item.title}</strong>
        {item.location ? (
          <p className="profile-history-list-card__desc">
            <FiMapPin size={13} aria-hidden />
            <span>{item.location}</span>
          </p>
        ) : item.subtitle ? (
          <p className="profile-history-list-card__desc">{item.subtitle}</p>
        ) : null}
        <div className="profile-history-list-card__stats">
          <span>{categoryKey === 'bids' ? 'Ставка' : 'Сумма'}</span>
          <strong>{item.amount || '—'}</strong>
          {item.purchaseDate ? (
            <>
              <span className="profile-history-list-card__dot" aria-hidden>
                •
              </span>
              <span className="profile-history-list-card__date">
                <FiClock size={12} aria-hidden />
                {item.purchaseDate}
              </span>
            </>
          ) : null}
        </div>
      </div>
      <span className="profile-history-list-card__chev" aria-hidden>
        <FiArrowRight size={16} />
      </span>
    </>
  )

  if (canOpenDrawer) {
    return (
      <button type="button" className="profile-history-list-card" onClick={open}>
        {body}
      </button>
    )
  }

  if (item.href) {
    return (
      <Link className="profile-history-list-card" to={item.href} onClick={onClose}>
        {body}
      </Link>
    )
  }

  return <article className="profile-history-list-card profile-history-list-card--static">{body}</article>
}

export default function ProfileHistoryExperience({
  sections,
  loading,
  query,
  onQueryChange,
  onClose,
  onOpenPurchased,
  locale = 'ru-RU',
  embedded = false,
}) {
  const dashboard = useMemo(() => buildProfileHistoryDashboard(sections), [sections])
  const [activeCategory, setActiveCategory] = useState('all')
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

  const allItems = useMemo(
    () =>
      categories.flatMap((category) =>
        category.items.map((item) => ({
          ...item,
          categoryKey: category.key,
          categoryTitle: category.title,
        })),
      ),
    [categories],
  )

  const visibleItems = useMemo(() => {
    if (activeCategory === 'all') return allItems
    return allItems.filter((item) => item.categoryKey === activeCategory)
  }, [activeCategory, allItems])

  const isEmpty = !loading && allItems.length === 0 && !normalizedQuery

  return (
    <div
      className={`profile-history-experience profile-history-experience--fullscreen${
        embedded ? ' profile-history-experience--embedded' : ''
      }`}
    >
      <div className="profile-history-hero">
        <img
          className="profile-history-hero__image"
          src="/images/profile/history-hero-man.png"
          alt=""
          decoding="async"
        />
      </div>

      <div className="profile-history-panel">
        <div className="profile-history-panel__intro">
          <h2 id="profile-history-sheet-title" className="profile-history-panel__title">
            История операций
          </h2>
          <p className="profile-history-panel__lead">
            Покупки, доли и ставки — в одном списке. Откройте карточку, чтобы продолжить.
          </p>
        </div>

        {loading ? (
          <div className="profile-history-experience__loading" aria-busy="true">
            Загружаем историю…
          </div>
        ) : isEmpty ? (
          <div className="profile-history-empty">
            <p className="profile-history-empty__text">
              Пока нет операций. Начните с торгов — подходящие объекты появятся в истории.
            </p>
            <Link to="/auction" className="profile-history-empty__cta" onClick={onClose}>
              Перейти к торгам
              <FiArrowRight size={16} aria-hidden />
            </Link>
          </div>
        ) : (
          <>
            <div className="profile-history-categories-rail" aria-label="Категории истории">
              <button
                type="button"
                className={`profile-history-cat-chip${
                  activeCategory === 'all' ? ' profile-history-cat-chip--active' : ''
                }`}
                onClick={() => setActiveCategory('all')}
                aria-label={`Все, ${allItems.length}`}
              >
                <span className="profile-history-cat-chip__icon-wrap">
                  <span className="profile-history-cat-chip__icon" aria-hidden>
                    <FiLayers size={18} />
                  </span>
                  <span className="profile-history-cat-chip__count">{allItems.length}</span>
                </span>
                <span className="profile-history-cat-chip__label">Все</span>
              </button>
              {categories.map((category) => {
                const Icon = CATEGORY_ICONS[category.key]
                return (
                  <button
                    key={category.key}
                    type="button"
                    className={`profile-history-cat-chip${
                      activeCategory === category.key ? ' profile-history-cat-chip--active' : ''
                    }`}
                    onClick={() => setActiveCategory(category.key)}
                    aria-label={`${category.title}, ${category.items.length}`}
                  >
                    <span className="profile-history-cat-chip__icon-wrap">
                      <span className="profile-history-cat-chip__icon" aria-hidden>
                        <Icon size={18} />
                      </span>
                      <span className="profile-history-cat-chip__count">{category.items.length}</span>
                    </span>
                    <span className="profile-history-cat-chip__label">
                      {category.chipTitle || category.title}
                    </span>
                  </button>
                )
              })}
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

            <div className="profile-history-list" aria-label="Список истории">
              {visibleItems.length ? (
                visibleItems.map((item) => (
                  <HistoryListCard
                    key={`${item.categoryKey}-${item.id}`}
                    item={item}
                    categoryKey={item.categoryKey}
                    onOpenPurchased={onOpenPurchased}
                    onClose={onClose}
                  />
                ))
              ) : (
                <p className="profile-history-category__empty">
                  {normalizedQuery ? 'Совпадений не найдено' : 'В этой категории пока пусто'}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

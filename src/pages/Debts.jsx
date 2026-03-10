import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiPieChart, FiSearch } from 'react-icons/fi'
import Header from '../components/Header'
import './Shares.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

const Debts = () => {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [apiDebts, setApiDebts] = useState([])
  const [loadingDebts, setLoadingDebts] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE}/properties/approved`)
      .then((res) => (res.ok ? res.json() : { success: false, data: [] }))
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          const onlyDebts = json.data.filter(
            (p) =>
              p &&
              (p.sale_type === 'debt' ||
                p.is_debt === 1 ||
                p.is_debt === true ||
                p.has_debt === 1 ||
                p.has_debt === true)
          )

          const mapped = onlyDebts.map((p) => {
            const photos =
              (p.photos &&
                (Array.isArray(p.photos)
                  ? p.photos
                  : typeof p.photos === 'string'
                    ? (() => {
                        try {
                          return JSON.parse(p.photos)
                        } catch (e) {
                          return []
                        }
                      })()
                    : [])) ||
              []

            const firstPhoto = photos[0]
            const image =
              typeof firstPhoto === 'string'
                ? firstPhoto
                : firstPhoto && firstPhoto.url
                  ? firstPhoto.url
                  : null

            const location =
              p.location ||
              [p.city, p.country].filter(Boolean).join(', ') ||
              ''

            const priceNumber =
              p.price != null && p.price !== ''
                ? Number(p.price)
                : 0

            return {
              id: p.id,
              title: p.title || p.name || '',
              location,
              image,
              totalPrice: priceNumber,
              area: p.area || p.sqft || 0,
              rooms: p.rooms || p.bedrooms || 0,
              isAuction:
                p.isAuction === true ||
                p.is_auction === 1 ||
                p.is_auction === true,
            }
          })

          setApiDebts(mapped)
        }
      })
      .catch(() => setApiDebts([]))
      .finally(() => setLoadingDebts(false))
  }, [])

  const filtered = apiDebts.filter(
    (obj) =>
      !searchQuery ||
      (obj.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (obj.location || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatPrice = (n) => {
    if (!n || Number.isNaN(Number(n))) return '—'
    if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
    return `$${Number(n).toLocaleString('en-US')}`
  }

  return (
    <div className="shares-page">
      <Header />
      <div className="shares-page__bg" />
      <main className="shares-container">
        <div className="shares-intro">
          <div className="shares-intro__icon">
            <FiPieChart size={28} />
          </div>
          <div className="shares-intro__body">
            <span className="shares-intro__label">Продажа долгов</span>
            <h1 className="shares-intro__title">Долги по недвижимости</h1>
            <p className="shares-intro__lead">
              Покупайте объекты с долгами по привлекательной цене и зарабатывайте на их последующей продаже или аренде.
            </p>
            <p className="shares-intro__text">
              Здесь собраны объекты, по которым есть задолженности: ипотека, коммунальные платежи и другие обязательства.
              Вы можете выкупить такой объект и урегулировать долг на выгодных для себя условиях.
            </p>
            <p className="shares-intro__text shares-intro__text--muted">
              Выберите объект ниже → откройте карточку → изучите детали долга и условия сделки на странице объекта.
            </p>
          </div>
        </div>

        <div className="shares-search-bar">
          <FiSearch className="shares-search-bar__icon" size={20} />
          <input
            type="text"
            className="shares-search-bar__input"
            placeholder="Поиск по названию или адресу..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="shares-search-bar__clear"
              onClick={() => setSearchQuery('')}
              aria-label="Очистить"
            >
              ×
            </button>
          )}
        </div>

        <div className="shares-grid">
          {loadingDebts && (
            <div className="shares-no-results">
              <p>Загружаем объекты с долгами...</p>
            </div>
          )}

          {!loadingDebts && filtered.length === 0 && (
            <div className="shares-no-results">
              <p>Пока нет объектов с долгами по вашему запросу.</p>
            </div>
          )}

          {!loadingDebts &&
            filtered.length > 0 &&
            filtered.map((obj) => (
              <article
                key={obj.id}
                className="share-card"
                onClick={() => navigate(`/property/${obj.id}`)}
              >
                <div className="share-card__badge">
                  {obj.isAuction ? 'Аукцион (с долгом)' : 'Долг'}
                </div>
                <div className="share-card__image-wrap">
                  <img
                    src={
                      obj.image ||
                      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80'
                    }
                    alt={obj.title}
                    className="share-card__image"
                  />
                </div>
                <div className="share-card__content">
                  <h2 className="share-card__title">{obj.title}</h2>
                  <p className="share-card__location">{obj.location}</p>
                  {obj.area && (
                    <p className="share-card__specs">
                      {obj.area} м²{obj.rooms ? ` · ${obj.rooms} комн.` : ''}
                    </p>
                  )}
                  <div className="share-card__prices">
                    <div className="share-card__price-total">
                      Стоимость объекта: <strong>{formatPrice(obj.totalPrice)}</strong>
                    </div>
                  </div>
                  <div className="share-card__footer">
                    <span className="share-card__sold">
                      Тип сделки: продажа объекта с долгом
                    </span>
                  </div>
                </div>
              </article>
            ))}
        </div>
      </main>
    </div>
  )
}

export default Debts


import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiSearch } from 'react-icons/fi'
import Header from '../components/Header'
import { ServiceCard } from '../components/ui/service-card'
import './Shares.css'

// Карточки-блоки описания доли в недвижимости (как в примере: заголовок + «Узнать больше»)
const SHARES_SERVICE_CARDS = [
  {
    title: 'Долевая собственность',
    href: '#shares-grid',
    linkLabel: 'УЗНАТЬ БОЛЬШЕ',
    imgSrc: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=400&q=85',
    imgAlt: 'Ключи от недвижимости',
    variant: 'red',
  },
  {
    title: 'Доходность',
    href: '#shares-grid',
    linkLabel: 'УЗНАТЬ БОЛЬШЕ',
    imgSrc: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=400&q=85',
    imgAlt: 'График роста доходности',
    variant: 'default',
  },
  {
    title: 'Прозрачность',
    href: '#shares-grid',
    linkLabel: 'УЗНАТЬ БОЛЬШЕ',
    imgSrc: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=400&q=85',
    imgAlt: 'Документы и безопасность',
    variant: 'gray',
  },
  {
    title: 'Выбрать объект',
    href: '#shares-grid',
    linkLabel: 'УЗНАТЬ БОЛЬШЕ',
    imgSrc: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=400&q=85',
    imgAlt: 'Дом',
    variant: 'blue',
  },
]

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

// Демо-объекты долей (показываются вместе с объектами из API)
const DEMO_SHARE_OBJECTS = [
  {
    id: 'share-demo-1',
    title: 'Квартира в центре, 2-комн.',
    location: 'Минск, ул. Примерная, 10',
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80',
    totalPrice: 120000,
    pricePerShare: 6000,
    totalShares: 20,
    sharesSold: 8,
    myShares: 0,
    area: 65,
    rooms: 2,
  },
  {
    id: 'share-demo-2',
    title: 'Апартаменты с видом на море',
    location: 'Барселона, Eixample',
    image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80',
    totalPrice: 250000,
    pricePerShare: 12500,
    totalShares: 20,
    sharesSold: 15,
    myShares: 2,
    area: 95,
    rooms: 3,
  },
  {
    id: 'share-demo-3',
    title: 'Студия в историческом центре',
    location: 'Вена, 1-й район',
    image: 'https://images.unsplash.com/photo-1502672023488-70e25813eb80?auto=format&fit=crop&w=800&q=80',
    totalPrice: 180000,
    pricePerShare: 9000,
    totalShares: 20,
    sharesSold: 20,
    myShares: 0,
    area: 42,
    rooms: 1,
  },
]

const Shares = () => {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [apiShares, setApiShares] = useState([])
  const [loadingShares, setLoadingShares] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE}/properties/shares`)
      .then((res) => res.ok ? res.json() : { success: false, data: [] })
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setApiShares(json.data.map((p) => ({
            ...p,
            id: p.shareId || `${p.property_type}-${p.id}`,
            image: p.image || (Array.isArray(p.photos) && p.photos[0] ? (typeof p.photos[0] === 'string' ? p.photos[0] : p.photos[0].url) : null)
          })))
        }
      })
      .catch(() => setApiShares([]))
      .finally(() => setLoadingShares(false))
  }, [])

  const allShareObjects = [...DEMO_SHARE_OBJECTS, ...apiShares]
  const filtered = allShareObjects.filter(
    (obj) =>
      !searchQuery ||
      (obj.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (obj.location || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatPrice = (n) => {
    if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
    return `$${Number(n).toLocaleString('en-US')}`
  }

  return (
    <div className="shares-page">
      <Header />
      <div className="shares-page__bg" />
      <main className="shares-container">
        <div className="shares-cards-grid">
          <div className="shares-cards-grid__header">
            <span className="shares-cards-grid__label">Долевая собственность</span>
            <h1 className="shares-cards-grid__title">Доли в недвижимости</h1>
          </div>
          <div className="shares-cards-grid__grid">
            {SHARES_SERVICE_CARDS.map((card) => (
              <ServiceCard
                key={card.title}
                title={card.title}
                href={card.href}
                linkLabel={card.linkLabel}
                imgSrc={card.imgSrc}
                imgAlt={card.imgAlt}
                variant={card.variant}
                className="min-h-[200px] sm:min-h-[220px]"
              />
            ))}
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

        <div id="shares-grid" className="shares-grid">
          {filtered.length === 0 ? (
            <div className="shares-no-results">
              <p>По вашему запросу ничего не найдено.</p>
            </div>
          ) : (
            filtered.map((obj) => {
              const soldPercent = (obj.totalShares > 0) ? Math.round((obj.sharesSold / obj.totalShares) * 100) : 0
              const isSoldOut = obj.sharesSold >= obj.totalShares
              return (
              <article
                key={obj.id}
                className={`share-card ${isSoldOut ? 'share-card--sold-out' : ''}`}
                onClick={() => navigate(`/shares/${obj.id}`, { state: { shareObject: obj } })}
              >
                <div className="share-card__badge">
                  {isSoldOut ? 'Sold out' : 'Доля'}
                </div>
                <div className="share-card__image-wrap">
                  <img
                    src={obj.image || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80'}
                    alt={obj.title}
                    className="share-card__image"
                  />
                  <div
                    className="share-card__sold-overlay"
                    style={{ height: `${soldPercent}%` }}
                    aria-hidden
                  >
                    {!isSoldOut && soldPercent > 0 && (
                      <span className="share-card__sold-percent">{soldPercent}% продано</span>
                    )}
                  </div>
                  {isSoldOut && (
                    <div className="share-card__sold-out-label">Sold out</div>
                  )}
                </div>
                <div className="share-card__content">
                  <h2 className="share-card__title">{obj.title}</h2>
                  <p className="share-card__location">{obj.location}</p>
                  {obj.area && (
                    <p className="share-card__specs">
                      {obj.area} м² · {obj.rooms} комн.
                    </p>
                  )}
                  <div className="share-card__prices">
                    <div className="share-card__price-total">
                      Общая стоимость: <strong>{formatPrice(obj.totalPrice)}</strong>
                    </div>
                    <div className="share-card__price-per-share">
                      За 1 долю: <strong>{formatPrice(obj.pricePerShare)}</strong>
                    </div>
                  </div>
                  <div className="share-card__footer">
                    <span className="share-card__sold">
                      {isSoldOut ? 'Все доли проданы' : `Продано долей: ${obj.sharesSold} из ${obj.totalShares}`}
                    </span>
                  </div>
                </div>
              </article>
              )
            })
          )}
        </div>
      </main>
    </div>
  )
}

export default Shares

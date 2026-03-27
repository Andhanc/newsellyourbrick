import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { FiPlus, FiArrowLeft } from 'react-icons/fi'
import Header from '../components/Header'
import './ShareDetailPage.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

const DEMO_SHARE_OBJECTS = [
  {
    id: 'share-demo-1',
    title: 'Квартира в центре, 2-комн.',
    location: 'Минск, ул. Примерная, 10',
    description: 'Уютная двухкомнатная квартира в центре города. Ремонт, балкон, паркинг во дворе.',
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
    description: 'Просторные апартаменты с панорамным видом. Терраса, консьерж.',
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
    description: 'Компактная студия в самом центре Вены. Полная меблировка, вид во двор.',
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

const ShareDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const fromState = location.state?.shareObject

  const [shareObject, setShareObject] = useState(() => {
    if (fromState) return fromState
    return DEMO_SHARE_OBJECTS.find((o) => o.id === id) || null
  })
  const [buyCount, setBuyCount] = useState(1)
  const [loadingShare, setLoadingShare] = useState(false)

  // Загрузка объекта из API по shareId (формат: apartment-123 или house-456)
  useEffect(() => {
    if (shareObject || !id) return
    const match = id.match(/^(apartment|commercial|house|villa)-(\d+)$/)
    if (!match) return
    const [, propertyType, propertyId] = match
    setLoadingShare(true)
    fetch(`${API_BASE}/properties/${propertyId}?property_type=${propertyType}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Not found'))))
      .then((json) => {
        const p = json.data || json
        const photos = (p.photos && (Array.isArray(p.photos) ? p.photos : (typeof p.photos === 'string' ? (() => { try { return JSON.parse(p.photos); } catch (e) { return []; } })() : []))) || []
        const firstPhoto = photos[0]
        const image = typeof firstPhoto === 'string' ? firstPhoto : (firstPhoto && firstPhoto.url) ? firstPhoto.url : null
        const totalShares = p.total_shares != null ? Number(p.total_shares) : 20
        const sharesSold = p.shares_sold != null ? Number(p.shares_sold) : 0
        const price = p.price != null ? Number(p.price) : 0
        setShareObject({
          id: p.id,
          shareId: `${p.property_type}-${p.id}`,
          title: p.title,
          location: p.location || '',
          description: p.description || '',
          image: image || null,
          totalPrice: price,
          pricePerShare: totalShares > 0 ? price / totalShares : 0,
          totalShares,
          sharesSold,
          myShares: 0,
          area: p.area,
          rooms: p.rooms,
          bedrooms: p.bedrooms,
          ...p
        })
      })
      .catch(() => setShareObject(null))
      .finally(() => setLoadingShare(false))
  }, [id, shareObject])

  if (loadingShare) {
    return (
      <div className="share-detail-page">
        <Header />
        <div className="share-detail-page__container">
          <p>Загрузка...</p>
          <button type="button" className="share-detail-page__back" onClick={() => navigate('/shares')}>
            <FiArrowLeft size={20} /> Назад к долевым объектам
          </button>
        </div>
      </div>
    )
  }

  if (!shareObject) {
    return (
      <div className="share-detail-page">
        <Header />
        <div className="share-detail-page__container">
          <p>Объект не найден.</p>
          <button type="button" onClick={() => navigate('/shares')}>
            Назад к долевым объектам
          </button>
        </div>
      </div>
    )
  }

  const totalShares = shareObject.totalShares || 20
  const sharesSold = shareObject.sharesSold || 0
  const myShares = shareObject.myShares || 0
  const availableToBuy = totalShares - sharesSold
  const othersSold = sharesSold - myShares
  const isSoldOut = sharesSold >= totalShares

  // Превью при выборе количества: как будет выглядеть распределение после покупки
  const previewMyShares = myShares + Math.min(buyCount, availableToBuy)
  const previewAvailable = Math.max(0, availableToBuy - buyCount)
  const previewSold = sharesSold + Math.min(buyCount, availableToBuy)

  const pctOthers = totalShares > 0 ? (othersSold / totalShares) * 100 : 0
  const pctMyShares = totalShares > 0 ? (previewMyShares / totalShares) * 100 : 0
  const pctAvailable = totalShares > 0 ? (previewAvailable / totalShares) * 100 : 0

  const formatPrice = (n) => {
    if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
    return `$${Number(n).toLocaleString('en-US')}`
  }

  const handleBuyShares = () => {
    const count = Math.min(Math.max(1, buyCount), availableToBuy)
    if (count > availableToBuy) return
    setShareObject((prev) => ({
      ...prev,
      sharesSold: prev.sharesSold + count,
      myShares: prev.myShares + count,
    }))
  }

  return (
    <div className={`share-detail-page ${isSoldOut ? 'share-detail-page--sold-out' : ''}`}>
      <Header />
      <div className="share-detail-page__bg" />
      <div className="share-detail-page__container">
        <button
          type="button"
          className="share-detail-page__back"
          onClick={() => navigate('/shares')}
        >
          <FiArrowLeft size={20} /> Назад к долевым объектам
        </button>

        <div className={`share-detail__badge ${isSoldOut ? 'share-detail__badge--sold-out' : ''}`}>
          {isSoldOut ? 'Sold out' : 'Доля'}
        </div>

        <div className="share-detail__layout">
          {/* Левая колонка — фото и информация об объекте */}
          <div className="share-detail__info">
            <div className="share-detail__hero">
              <div className="share-detail__image-wrap">
                <img src={shareObject.image} alt={shareObject.title} className="share-detail__image" />
                {isSoldOut && <div className="share-detail__hero-sold-overlay" aria-hidden />}
              </div>
            </div>
            <h1 className="share-detail__title">{shareObject.title}</h1>
            <p className="share-detail__location">{shareObject.location}</p>
            {shareObject.description && (
              <p className="share-detail__description">{shareObject.description}</p>
            )}
            {shareObject.area && (
              <p className="share-detail__specs">
                {shareObject.area} м² · {shareObject.rooms} комн.
              </p>
            )}
            <div className="share-detail__prices-block">
              <div className="share-detail__price-row">
                Общая стоимость: <strong>{formatPrice(shareObject.totalPrice)}</strong>
              </div>
              <div className="share-detail__price-row">
                Цена за 1 долю: <strong>{formatPrice(shareObject.pricePerShare)}</strong>
              </div>
            </div>
          </div>

          {/* Правая колонка — график и покупка или блок Sold out */}
          <div className="share-detail__sidebar">
            {isSoldOut ? (
              <div className="share-detail__sold-out-block">
                <div className="share-detail__sold-out-icon" aria-hidden>
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <h3 className="share-detail__sold-out-title">Все доли проданы</h3>
                <p className="share-detail__sold-out-text">
                  Этот объект полностью выкуплен. Все {totalShares} долей находятся у совладельцев.
                </p>
                <p className="share-detail__sold-out-hint">
                  Следите за новыми объектами — они появляются регулярно.
                </p>
                <button
                  type="button"
                  className="share-detail__sold-out-btn"
                  onClick={() => navigate('/shares')}
                >
                  Смотреть другие объекты
                </button>
              </div>
            ) : (
              <>
                <div className="share-detail__chart-section">
                  <h3 className="share-detail__chart-title">Распределение долей</h3>
                  {buyCount > 0 && availableToBuy > 0 && (
                    <p className="share-detail__chart-preview-hint">
                      Превью: как будет после покупки {buyCount} {buyCount === 1 ? 'доли' : 'долей'}
                    </p>
                  )}
                  <div className="share-detail__chart-wrap">
                    <div
                      className="share-detail__pie"
                      style={{
                        background: `conic-gradient(
                          #5b6ee1 0% ${pctOthers}%,
                          #0ABAB5 ${pctOthers}% ${pctOthers + pctMyShares}%,
                          #dff7ff ${pctOthers + pctMyShares}% 100%
                        )`,
                      }}
                    />
                    <div className="share-detail__pie-center">
                      <span className="share-detail__pie-value">{buyCount > 0 && availableToBuy > 0 ? previewSold : sharesSold}</span>
                      <span className="share-detail__pie-label">из {totalShares}</span>
                      {buyCount > 0 && availableToBuy > 0 && (
                        <span className="share-detail__pie-sublabel">после покупки</span>
                      )}
                    </div>
                  </div>
                  <div className="share-detail__legend">
                    <div className="share-detail__legend-item share-detail__legend-item--gray">
                      <span className="share-detail__legend-dot" /> Можно купить: {buyCount > 0 && availableToBuy > 0 ? previewAvailable : availableToBuy}
                    </div>
                    <div className="share-detail__legend-item share-detail__legend-item--teal">
                      <span className="share-detail__legend-dot" /> Ваши доли: {buyCount > 0 && availableToBuy > 0 ? previewMyShares : myShares}
                    </div>
                    {othersSold > 0 && (
                      <div className="share-detail__legend-item share-detail__legend-item--dark">
                        <span className="share-detail__legend-dot" /> У других: {othersSold}
                      </div>
                    )}
                  </div>
                </div>

                <div className="share-detail__buy-block">
                  <div className="share-detail__buy-controls">
                    <label className="share-detail__buy-label">Количество долей:</label>
                    <div className="share-detail__buy-stepper">
                      <button
                        type="button"
                        className="share-detail__stepper-btn"
                        onClick={() => setBuyCount((c) => Math.max(1, c - 1))}
                        disabled={buyCount <= 1}
                      >
                        −
                      </button>
                      <span className="share-detail__buy-count">{buyCount}</span>
                      <button
                        type="button"
                        className="share-detail__stepper-btn"
                        onClick={() => setBuyCount((c) => Math.min(availableToBuy, c + 1))}
                        disabled={buyCount >= availableToBuy}
                      >
                        +
                      </button>
                    </div>
                    <span className="share-detail__buy-hint">
                      Итого: {formatPrice(shareObject.pricePerShare * buyCount)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="share-detail__buy-btn"
                    onClick={handleBuyShares}
                    disabled={availableToBuy <= 0}
                  >
                    <FiPlus size={22} /> Купить долю{buyCount > 1 ? ` (${buyCount})` : ''}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ShareDetailPage

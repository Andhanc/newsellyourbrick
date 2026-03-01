import { useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { FiPlus, FiArrowLeft } from 'react-icons/fi'
import Header from '../components/Header'
import './ShareDetailPage.css'

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
    <div className="share-detail-page">
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

        <div className="share-detail__badge">Доля</div>

        <div className="share-detail__layout">
          {/* Левая колонка — фото и информация об объекте */}
          <div className="share-detail__info">
            <div className="share-detail__hero">
              <div className="share-detail__image-wrap">
                <img src={shareObject.image} alt={shareObject.title} className="share-detail__image" />
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

          {/* Правая колонка — график и покупка */}
          <div className="share-detail__sidebar">
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
                      #6b7280 0% ${pctOthers}%,
                      #0ABAB5 ${pctOthers}% ${pctOthers + pctMyShares}%,
                      #e5e7eb ${pctOthers + pctMyShares}% 100%
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
          </div>
        </div>
      </div>
    </div>
  )
}

export default ShareDetailPage

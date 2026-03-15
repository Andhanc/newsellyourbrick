import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiSearch } from 'react-icons/fi'
import Header from '../components/Header'
import FlipCard from '../components/ui/FlipCard'
import { useLazyLoad } from '../hooks/useLazyLoad'
import './Shares.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

const Debts = () => {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [apiDebts, setApiDebts] = useState([])
  const [loadingDebts, setLoadingDebts] = useState(true)

  const loadDebts = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/properties/approved`)
      const json = await (res.ok ? res.json() : { success: false, data: [] })
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
          const photos = (p.photos && (Array.isArray(p.photos) ? p.photos : typeof p.photos === 'string' ? (() => { try { return JSON.parse(p.photos) } catch (e) { return [] } })() : [])) || []
          const firstPhoto = photos[0]
          const image = typeof firstPhoto === 'string' ? firstPhoto : firstPhoto && firstPhoto.url ? firstPhoto.url : null
          const location = p.location || [p.city, p.country].filter(Boolean).join(', ') || ''
          const priceNumber = p.price != null && p.price !== '' ? Number(p.price) : 0
          const debtAmount = p.debt_amount != null && p.debt_amount !== '' ? Number(p.debt_amount) : null
          return {
            id: p.id,
            title: p.title || p.name || '',
            location,
            image,
            totalPrice: priceNumber,
            debt_amount: debtAmount,
            area: p.area || p.sqft || 0,
            rooms: p.rooms || p.bedrooms || 0,
            isAuction: p.isAuction === true || p.is_auction === 1 || p.is_auction === true,
          }
        })
        setApiDebts(mapped)
      }
    } catch (_) {
      setApiDebts([])
    } finally {
      setLoadingDebts(false)
    }
  }, [])

  const [debtsSectionRef] = useLazyLoad(loadDebts, { rootMargin: '200px' })

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
      <main ref={debtsSectionRef} className="shares-container">
        <div className="shares-flip-cards">
          <FlipCard
            color="#DC2626"
            title="Высокий риск"
            subtitle="Красный — сложные и существенные задолженности"
            description="Объекты с серьёзными долгами: ипотека, просрочки, судебные споры. Требуют глубокой юридической и финансовой проверки. Подходят для опытных инвесторов."
            features={[
              'Глубокая юридическая проверка',
              'Финансовый аудит обязателен',
              'Серьёзные задолженности',
              'Высокий потенциал при оценке',
            ]}
            ctaText="🔥 Высокий шанс заработать"
          />
          <FlipCard
            color="#CA8A04"
            title="Средний риск"
            subtitle="Жёлтый — часть вопросов потребует времени и расходов"
            description="Долги средней тяжести: вопросы решаемы дополнительными расходами и временем. Ситуации, как правило, прозрачны и поддаются урегулированию при сделке."
            features={[
              'Вопросы решаемы при сделке',
              'Возможны доп. расходы',
              'Предсказуемые сроки',
              'Умеренные риски',
            ]}
            ctaText="📈 Средний шанс заработать"
          />
          <FlipCard
            color="#16A34A"
            title="Низкий риск"
            subtitle="Зелёный — технические и процедурные моменты"
            description="Лёгкая тяжесть долгов: технические и процедурные вопросы, которые закрываются стандартными действиями при сделке. Минимальные риски для покупателя."
            features={[
              'Стандартные действия при сделке',
              'Технические моменты',
              'Минимальные риски',
              'Быстрое урегулирование',
            ]}
            ctaText="✅ Стабильный шанс заработать"
          />
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
                    {obj.debt_amount != null &&
                      obj.debt_amount !== '' &&
                      !Number.isNaN(Number(obj.debt_amount)) && (
                        <div className="share-card__price-total" style={{ marginTop: 4 }}>
                          Сумма долга:{' '}
                          <span className="share-card__price" style={{ fontWeight: 700 }}>
                            {formatPrice(obj.debt_amount)}
                          </span>
                        </div>
                      )}
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


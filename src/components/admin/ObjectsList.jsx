import React, { useState, useMemo, useEffect } from 'react';
import { FiSearch, FiSliders } from 'react-icons/fi';
import { MdBed, MdOutlineBathtub } from 'react-icons/md';
import { BiArea } from 'react-icons/bi';
import PropertyTimer from '../PropertyTimer';
import BiddingHistoryModal from '../BiddingHistoryModal';
import './ObjectsList.css';
import { getApiBaseUrlSync } from '../../utils/apiConfig';

const API_BASE_URL = getApiBaseUrlSync();

const ObjectsList = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priceRange, setPriceRange] = useState('all');
  const [saleTypeFilter, setSaleTypeFilter] = useState('all');
  const [displayedCount, setDisplayedCount] = useState(9);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedAuctionForHistory, setSelectedAuctionForHistory] = useState(null);

  const formatPrice = (price) => {
    if (price == null) return '—';
    const value = Number(price) || 0;
    return `$${value.toLocaleString('ru-RU')}`;
  };

  const getCategory = (property) => {
    const isShare =
      property?.is_share === 1 ||
      property?.is_share === true ||
      property?.is_shared_ownership === 1 ||
      property?.is_shared_ownership === true ||
      property?.is_shared === 1 ||
      property?.is_shared === true;

    const isDebt =
      property?.sale_type === 'debt' ||
      property?.is_debt === 1 ||
      property?.is_debt === true ||
      property?.has_debt === 1 ||
      property?.has_debt === true;

    if (isShare) return 'share';
    if (isDebt) return 'debt';

    const isAuction = property?.isAuction === true;
    if (!isAuction) return 'buy_now';

    const price = Number(property?.price || 0);
    const start = Number(
      property?.auction_starting_price ??
        property?.auction_starting_price ??
        property?.auctionStartingPrice ??
        0
    );

    // Если цена "купить сейчас" больше старта — считаем buy_now, иначе чистый аукцион
    if (start > 0 && price > start) return 'buy_now';
    if (price > 0 && start === 0) return 'buy_now';
    return 'auction';
  };

  // Загрузка всех объектов для админки: одобренные + аукционы + долги
  useEffect(() => {
    const loadProperties = async () => {
      try {
        setLoading(true);
        setError(null);

        const lang = (localStorage.getItem('i18nextLng') || 'ru').split('-')[0];
        const [approvedRes, auctionsRes, debtsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/properties/approved?lang=${lang}`),
          fetch(`${API_BASE_URL}/properties/auctions?lang=${lang}`),
          fetch(`${API_BASE_URL}/properties/debts`)
        ]);

        let approved = [];
        let auctions = [];
        let debts = [];

        if (approvedRes.ok) {
          const data = await approvedRes.json();
          if (data?.success && Array.isArray(data.data)) {
            approved = data.data;
          }
        } else {
          console.warn('Ошибка загрузки обычных объявлений:', approvedRes.status, approvedRes.statusText);
        }

        if (auctionsRes.ok) {
          const data = await auctionsRes.json();
          if (data?.success && Array.isArray(data.data)) {
            auctions = data.data;
          }
        } else {
          console.warn('Ошибка загрузки аукционных объявлений:', auctionsRes.status, auctionsRes.statusText);
        }

        if (debtsRes.ok) {
          const data = await debtsRes.json();
          if (data?.success && Array.isArray(data.data)) {
            debts = data.data;
          }
        } else {
          console.warn('Ошибка загрузки объектов с долгами:', debtsRes.status, debtsRes.statusText);
        }

        const normalizeProperty = (prop, options = {}) => {
          const { forceAuction = null } = options;
          const isAuction =
            forceAuction !== null
              ? forceAuction
              : (prop.isAuction === true || prop.is_auction === 1 || prop.is_auction === true);
          const priceNumber = prop.price != null && prop.price !== '' ? Number(prop.price) : 0;
          const auctionStartingPrice =
            prop.auction_starting_price != null && prop.auction_starting_price !== ''
              ? Number(prop.auction_starting_price)
              : (prop.auctionStartingPrice != null && prop.auctionStartingPrice !== '' ? Number(prop.auctionStartingPrice) : null);
          return {
            ...prop,
            isAuction,
            title: prop.title || prop.name || '',
            name: prop.name || prop.title || '',
            image:
              prop.image ||
              (Array.isArray(prop.images) && prop.images[0]
                ? (typeof prop.images[0] === 'string' ? prop.images[0] : prop.images[0].url)
                : null),
            images: Array.isArray(prop.images) ? prop.images : (prop.image ? [prop.image] : []),
            price: priceNumber,
            auction_starting_price: auctionStartingPrice,
            currentBid: prop.currentBid || prop.auction_current_bid || prop.auctionCurrentBid || null,
            endTime:
              prop.endTime ||
              prop.auction_end_time ||
              prop.auctionEndTime ||
              prop.auction_end_date ||
              prop.auctionEndDate ||
              prop.test_timer_end_date ||
              null,
            beds: prop.beds || prop.rooms || prop.bedrooms || 0,
            baths: prop.baths || prop.bathrooms || 0,
            sqft: prop.sqft || prop.area || 0
          };
        };

        const byId = new Map();
        approved.map((p) => normalizeProperty(p)).forEach((p) => { if (p && p.id != null) byId.set(p.id, p); });
        auctions.map((p) => normalizeProperty(p, { forceAuction: true })).forEach((p) => { if (p && p.id != null) byId.set(p.id, p); });
        debts.map((p) => normalizeProperty(p)).forEach((p) => { if (p && p.id != null) byId.set(p.id, p); });

        setProperties(Array.from(byId.values()));
      } catch (e) {
        console.error('Ошибка при загрузке объявлений для админ-объектов:', e);
        setError('Не удалось загрузить объявления. Попробуйте обновить страницу.');
      } finally {
        setLoading(false);
      }
    };

    loadProperties();
  }, []);

  const filteredProperties = useMemo(() => {
    return properties.filter(property => {
      const matchesSearch = 
        (property.name || property.title || '')
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (property.location || '')
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

      const matchesCategory =
        categoryFilter === 'all' || getCategory(property) === categoryFilter;

      const matchesType = 
        typeFilter === 'all' || 
        (property.property_type &&
          property.property_type.toLowerCase() === typeFilter.toLowerCase());

      let matchesPrice = true;
      if (priceRange === 'low') {
        matchesPrice = property.price < 500000;
      } else if (priceRange === 'medium') {
        matchesPrice = property.price >= 500000 && property.price < 1000000;
      } else if (priceRange === 'high') {
        matchesPrice = property.price >= 1000000;
      }

      let matchesSaleType = true;
      if (saleTypeFilter === 'auction') {
        matchesSaleType = property.isAuction === true;
      } else if (saleTypeFilter === 'sale') {
        matchesSaleType = property.isAuction === false;
      }

      return (
        matchesSearch &&
        matchesCategory &&
        matchesType &&
        matchesPrice &&
        matchesSaleType
      );
    });
  }, [properties, searchQuery, categoryFilter, typeFilter, priceRange, saleTypeFilter]);

  const displayedProperties = filteredProperties.slice(0, displayedCount);
  const hasMore = displayedCount < filteredProperties.length;

  const handleLoadMore = () => {
    setDisplayedCount(prev => prev + 9);
  };

  if (loading && properties.length === 0) {
    return (
      <div className="objects-list-container">
        <p style={{ padding: '1.5rem' }}>Загрузка объектов...</p>
      </div>
    );
  }

  if (error && properties.length === 0) {
    return (
      <div className="objects-list-container">
        <p style={{ padding: '1.5rem', color: 'red' }}>{error}</p>
      </div>
    );
  }

  return (
    <div className="objects-list-container">
      <div className="objects-list__filters">
        <div className="objects-list__search">
          <FiSearch size={20} />
          <input
            type="text"
            placeholder="Поиск по названию или локации..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="objects-list__filter-group">
          <div className="objects-list__filter">
            <label>Категория:</label>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="all">Все</option>
              <option value="auction">Аукцион</option>
              <option value="buy_now">Купить сейчас</option>
              <option value="debt">Долги</option>
              <option value="share">Доли</option>
            </select>
          </div>

          <div className="objects-list__filter">
            <FiSliders size={18} />
            <label>Тип:</label>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">Все типы</option>
              <option value="house">Дома</option>
              <option value="apartment">Квартиры</option>
              <option value="villa">Виллы</option>
              <option value="commercial">Апартаменты/коммерческая</option>
            </select>
          </div>

          <div className="objects-list__filter">
            <label>Цена:</label>
            <select value={priceRange} onChange={(e) => setPriceRange(e.target.value)}>
              <option value="all">Все цены</option>
              <option value="low">До 500 000 $</option>
              <option value="medium">500 000 - 1 000 000 $</option>
              <option value="high">От 1 000 000 $</option>
            </select>
          </div>

          <div className="objects-list__filter">
            <label>Тип продажи:</label>
            <select value={saleTypeFilter} onChange={(e) => setSaleTypeFilter(e.target.value)}>
              <option value="all">Все</option>
              <option value="auction">Аукционные</option>
              <option value="sale">Продажа</option>
            </select>
          </div>
        </div>
      </div>

      <div className="objects-list__grid">
        {displayedProperties.map((property) => (
          <article
            key={property.id}
            className="property-card"
            style={{ cursor: 'pointer' }}
          >
            <div className="property-card__image">
              <img
                src={property.image || (property.images && property.images[0]) || '/images/external/photo-1560448204-e02f11c3d0e2-54a1e4fab4.jpg'}
                alt={property.name || property.title}
              />
            </div>

            <div className="property-card__content">
              {property.isAuction && property.endTime && (
                <div className="property-card__timer-inline">
                  <PropertyTimer endTime={property.endTime} compact={true} />
                </div>
              )}
              <span className="property-card__badge">{property.title || property.name}</span>

              {/* Информация о владельце: сначала имя+фамилия, если нет — email */}
              {(() => {
                const owner = property.owner || {};
                const fullName = `${owner.firstName || ''} ${owner.lastName || ''}`.trim();
                const email = owner.email || property.email || '';
                const display = fullName || email;
                return display ? (
                  <p className="property-card__owner">Продавец: {display}</p>
                ) : null;
              })()}
              <div className="property-card__info">
                <div className="property-card__info-item">
                  <MdBed size={16} />
                  <span>{property.beds || 0}</span>
                </div>
                <div className="property-card__info-item">
                  <MdOutlineBathtub size={16} />
                  <span>{property.baths || 0}</span>
                </div>
                <div className="property-card__info-item">
                  <BiArea size={16} />
                  <span>{property.sqft || 0} м²</span>
                </div>
              </div>
              <p className="property-card__location">{property.location}</p>

              <div className="property-card__price">
                {(() => {
                  if (property.isAuction) {
                    // Стартовая сумма ставки - из auction_starting_price
                    const startingPrice =
                      property.auctionStartingPrice ??
                      property.auction_starting_price ??
                      property.currentBid ??
                      null;
                    
                    // Минимальная цена продажи - из price (не должна браться из startingPrice!)
                    const regularPrice =
                      property.originalPrice ??
                      property.minSalePrice ??
                      (property.price && property.price !== startingPrice ? property.price : null);

                    return (
                      <>
                        <span className="property-card__price-label">
                          Минимальная цена продажи: {regularPrice ? formatPrice(regularPrice) : '—'}
                        </span>
                        <span className="property-card__price-label">
                          Стартовая сумма ставки: {startingPrice ? formatPrice(startingPrice) : '—'}
                        </span>
                        <button
                          type="button"
                          className="property-card__history-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAuctionForHistory(property);
                          }}
                        >
                          История ставок
                        </button>
                      </>
                    );
                  }

                  return (
                    <span className="property-card__price-amount">
                      {formatPrice(property.price)}
                    </span>
                  );
                })()}
              </div>
              <div className="property-card__link-wrapper">
                <a
                  href={`/property/${property.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="property-card__link"
                  onClick={(e) => e.stopPropagation()}
                >
                  Перейти к объекту
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>

      {hasMore && (
        <div className="objects-list__load-more">
          <button className="objects-list__load-more-btn" onClick={handleLoadMore}>
            Смотреть еще
          </button>
        </div>
      )}

      {selectedAuctionForHistory && (
        <BiddingHistoryModal
          isOpen={!!selectedAuctionForHistory}
          onClose={() => setSelectedAuctionForHistory(null)}
          property={{
            title: selectedAuctionForHistory.title || selectedAuctionForHistory.name,
            id: selectedAuctionForHistory.id,
            start_date:
              selectedAuctionForHistory.auction_start_date ||
              selectedAuctionForHistory.auctionStartDate ||
              null,
            end_date:
              selectedAuctionForHistory.auction_end_date ||
              selectedAuctionForHistory.auctionEndDate ||
              selectedAuctionForHistory.endTime ||
              null,
            auction_starting_price:
              selectedAuctionForHistory.auction_starting_price ||
              selectedAuctionForHistory.auctionStartingPrice ||
              null
          }}
        />
      )}
    </div>
  );
};

export default ObjectsList;



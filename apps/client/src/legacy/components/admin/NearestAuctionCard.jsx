import React, { useState, useEffect } from 'react';
import './NearestAuctionCard.css';

const NearestAuctionCard = ({ auction }) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const end = new Date(auction.end_date).getTime();
      const difference = end - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [auction.end_date]);

  const days = timeLeft.days;

  let statusClass = 'timer-short';
  if (days > 28) {
    statusClass = 'timer-long';
  } else if (days > 14) {
    statusClass = 'timer-medium';
  }

  const isCritical = days < 7;

  const getTypeLabel = (type) => {
    const types = {
      apartment: 'Квартира',
      villa: 'Вилла',
      house: 'Дом'
    };
    return types[type] || type;
  };

  return (
    <div className="nearest-auction-card">
      <div className="nearest-auction-header">
        <div className="nearest-auction-title">Самый ближайший аукцион</div>
        <div className={`nearest-auction-timer ${statusClass} ${isCritical ? 'timer-critical' : ''}`}>
          <div className="timer-item">
            <div className="timer-value">{String(timeLeft.days).padStart(2, '0')}</div>
            <div className="timer-label">дней</div>
          </div>
          <div className="timer-separator">:</div>
          <div className="timer-item">
            <div className="timer-value">{String(timeLeft.hours).padStart(2, '0')}</div>
            <div className="timer-label">часов</div>
          </div>
          <div className="timer-separator">:</div>
          <div className="timer-item">
            <div className="timer-value">{String(timeLeft.minutes).padStart(2, '0')}</div>
            <div className="timer-label">мин</div>
          </div>
          <div className="timer-separator">:</div>
          <div className="timer-item">
            <div className="timer-value">{String(timeLeft.seconds).padStart(2, '0')}</div>
            <div className="timer-label">сек</div>
          </div>
        </div>
      </div>
      <div className="nearest-auction-content">
        <div className="nearest-auction-image">
          <img src={auction.image_url} alt={auction.object_title} />
        </div>
        <div className="nearest-auction-info">
          <div className="nearest-auction-object-title">{auction.object_title}</div>
          <div className="nearest-auction-object-type">{getTypeLabel(auction.object_type)}</div>
          <div className="nearest-auction-object-location">{auction.object_location}</div>
          <div className="nearest-auction-price">
            <div className="price-label">Текущая ставка:</div>
            <div className="price-value">${auction.current_bid.toLocaleString('ru-RU')}</div>
          </div>
          <div className="nearest-auction-start-price">
            <div className="price-label">Стартовая цена:</div>
            <div className="price-value">${auction.object_price.toLocaleString('ru-RU')}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NearestAuctionCard;



import { useState, useEffect } from 'react';
import './CircularTimer.css';
import { countries } from './CountrySelect';

// Объект с маппингом кодов стран к флагам
const countryFlags = {};
if (countries && countries.length > 0) {
  countries.forEach(country => {
    if (country.code && country.flag) {
      countryFlags[country.code] = country.flag;
    }
  });
  console.log('🏳️ Создан маппинг флагов. Всего стран:', Object.keys(countryFlags).length);
  console.log('🏳️ Примеры флагов:', {
    DE: countryFlags['DE'],
    RU: countryFlags['RU'],
    BY: countryFlags['BY'],
    US: countryFlags['US']
  });
} else {
  console.error('❌ ОШИБКА: Массив countries пуст или не загружен!');
}

// Также создаем маппинг по названиям стран (в нижнем регистре)
const countryNamesMap = {};
countries.forEach(country => {
  countryNamesMap[country.name.toLowerCase()] = country.flag;
});

// Функция для получения emoji флага по коду или названию страны
const getCountryFlag = (countryValue) => {
  if (!countryValue) {
    console.warn('⚠️ Пустое значение страны');
    return '🌍'; // Fallback флаг
  }
  
  const value = countryValue.trim();
  console.log('🔍 Поиск флага для:', value);
  
  // Если значение уже является emoji флагом, возвращаем как есть
  const flagRegex = /[\u{1F1E6}-\u{1F1FF}]{2}/u;
  if (flagRegex.test(value)) {
    console.log('✅ Значение уже является флагом:', value);
    return value;
  }
  
  // Ищем по коду страны (2 буквы, верхний регистр)
  const upperValue = value.toUpperCase();
  if (upperValue.length === 2) {
    const flag = countryFlags[upperValue];
    if (flag) {
      console.log('✅ Найден флаг по коду:', upperValue, '->', flag);
      // Убеждаемся, что возвращаем именно флаг (emoji), а не код
      if (flag.length > 2 || /[\u{1F1E6}-\u{1F1FF}]/u.test(flag)) {
        return flag;
      } else {
        console.error('❌ ОШИБКА: В маппинге хранится не флаг, а код!', upperValue, '->', flag);
      }
    } else {
      console.warn('⚠️ Код страны не найден в маппинге:', upperValue, 'Доступные коды:', Object.keys(countryFlags).slice(0, 10));
    }
  }
  
  // Ищем по названию страны (в нижнем регистре)
  const lowerValue = value.toLowerCase();
  if (countryNamesMap[lowerValue]) {
    console.log('✅ Найден флаг по названию:', lowerValue, '->', countryNamesMap[lowerValue]);
    return countryNamesMap[lowerValue];
  }
  
  // Если не нашли, возвращаем fallback флаг
  console.warn('⚠️ Флаг не найден для:', value, 'используется fallback');
  return '🌍';
};

const CircularTimer = ({ endTime, size = 120, strokeWidth = 6, originalDuration = null, isUserLeader = false, bidInfo = null }) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const end = new Date(endTime).getTime();
      const difference = end - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        return { 
          days, 
          hours, 
          minutes, 
          seconds
        };
      }
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    };

    const update = calculateTimeLeft();
    setTimeLeft(update);

    const timer = setInterval(() => {
      const update = calculateTimeLeft();
      setTimeLeft(update);
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime]);
  
  // Вычисляем прогресс для оранжевой обводки (основной прогресс)
  const calculateProgress = () => {
    // Для оранжевой обводки всегда показываем полный круг (100%)
    // Она служит фоном для красной обводки
    return 100;
  };
  
  // Вычисляем прогресс для красной обводки (показывает сколько времени прошло от начала)
  const calculateRedProgress = () => {
    const now = new Date().getTime();
    const end = new Date(endTime).getTime();
    const totalTime = end - now;
    
    if (totalTime <= 0) return 100; // Таймер истек - красная обводка полная
    
    // Если есть исходная длительность, используем её для расчета прогресса
    if (originalDuration && originalDuration > 0) {
      // Вычисляем сколько времени прошло от начала
      const elapsed = originalDuration - totalTime;
      const progress = Math.max(0, Math.min(100, (elapsed / originalDuration) * 100));
      return progress;
    }
    
    // Fallback: если исходная длительность неизвестна, используем приблизительную оценку
    // Предполагаем максимальное время тестового таймера - 2 часа
    const maxTime = 2 * 60 * 60 * 1000; // 2 часа в миллисекундах
    
    // Если текущее оставшееся время больше максимального, считаем что прошло 0%
    if (totalTime >= maxTime) return 0;
    
    // Прогресс = сколько времени прошло от максимального времени
    const elapsed = maxTime - totalTime;
    return Math.max(0, Math.min(100, (elapsed / maxTime) * 100));
  };
  
  const progressValue = calculateProgress();
  const redProgressValue = calculateRedProgress();

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progressValue / 100) * circumference;
  const redOffset = circumference - (redProgressValue / 100) * circumference;

  // Определяем цвета в зависимости от того, является ли пользователь лидером
  const isLeader = isUserLeader;

  // Форматируем время для отображения в формате MM:SS или HH:MM:SS
  const formatTime = () => {
    const totalSeconds = timeLeft.days * 86400 + timeLeft.hours * 3600 + timeLeft.minutes * 60 + timeLeft.seconds;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    } else {
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
  };

  const centerRadius = radius - strokeWidth + 2;

  return (
    <div className={`circular-timer ${isLeader ? 'circular-timer--leader' : ''}`} style={{ width: size, height: size }}>
      <svg className="circular-timer-svg" width={size} height={size} style={{ overflow: 'visible' }}>
        <defs>
          {/* Градиенты для обводки с 3D эффектом (более контрастные для объёма) */}
          <linearGradient id="orangeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffb366" stopOpacity="1" />
            <stop offset="30%" stopColor="#ff8c42" stopOpacity="1" />
            <stop offset="60%" stopColor="#ff6b35" stopOpacity="1" />
            <stop offset="100%" stopColor="#ff4500" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="redGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff6666" stopOpacity="1" />
            <stop offset="30%" stopColor="#ff4444" stopOpacity="1" />
            <stop offset="60%" stopColor="#dc2626" stopOpacity="1" />
            <stop offset="100%" stopColor="#991b1b" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="greenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#86efac" stopOpacity="1" />
            <stop offset="30%" stopColor="#6ee7b7" stopOpacity="1" />
            <stop offset="60%" stopColor="#34d399" stopOpacity="1" />
            <stop offset="100%" stopColor="#059669" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="grayGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d1d5db" stopOpacity="1" />
            <stop offset="30%" stopColor="#9ca3af" stopOpacity="1" />
            <stop offset="60%" stopColor="#6b7280" stopOpacity="1" />
            <stop offset="100%" stopColor="#374151" stopOpacity="1" />
          </linearGradient>
          
          {/* Радиальные градиенты для объемного центра (красный) */}
          <radialGradient id="centerOrangeRadial" cx="35%" cy="35%">
            <stop offset="0%" stopColor="#ff6666" stopOpacity="1" />
            <stop offset="30%" stopColor="#ff4444" stopOpacity="1" />
            <stop offset="60%" stopColor="#dc2626" stopOpacity="1" />
            <stop offset="100%" stopColor="#b91c1c" stopOpacity="1" />
          </radialGradient>
          
          {/* Радиальные градиенты для объемного центра (зеленый для лидера) */}
          <radialGradient id="centerGreenRadial" cx="35%" cy="35%">
            <stop offset="0%" stopColor="#a7f3d0" stopOpacity="1" />
            <stop offset="40%" stopColor="#6ee7b7" stopOpacity="1" />
            <stop offset="70%" stopColor="#34d399" stopOpacity="1" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="1" />
          </radialGradient>
          
          {/* Фильтры для теней */}
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="4"/>
            <feOffset dx="0" dy="4" result="offsetblur"/>
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.5"/>
            </feComponentTransfer>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          <filter id="innerShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
            <feOffset dx="0" dy="-2" result="offsetblur"/>
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.3"/>
            </feComponentTransfer>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Фоновый круг - того же цвета что и прогресс для единообразия */}
        <circle
          className="circular-timer-bg"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isLeader ? "url(#grayGradient)" : "url(#orangeGradient)"}
          strokeWidth={strokeWidth + 2}
          fill="none"
          opacity="0.4"
        />
        
        {/* Прогресс круг с 3D эффектом */}
        <circle
          className="circular-timer-progress"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isLeader ? "url(#grayGradient)" : "url(#orangeGradient)"}
          strokeWidth={strokeWidth + 2}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{
            transition: 'stroke-dashoffset 0.5s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.3s ease'
          }}
        />
        
        {/* Обводка окончания с 3D эффектом */}
        <circle
          className="circular-timer-red-progress"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isLeader ? "url(#greenGradient)" : "url(#redGradient)"}
          strokeWidth={strokeWidth + 4}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={redOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{
            transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.3s ease',
            opacity: redProgressValue > 0 ? 1 : 0
          }}
        />
        
        {/* Основной центр */}
        <circle
          className="circular-timer-center"
          cx={size / 2}
          cy={size / 2}
          r={centerRadius}
          fill={isLeader ? "url(#centerGreenRadial)" : "url(#centerOrangeRadial)"}
        />
        
      </svg>
      <div className="circular-timer-content">
        {bidInfo ? (
          <div className="circular-timer-bid-info">
            <div className="circular-timer-flag">
              {(() => {
                const flag = getCountryFlag(bidInfo.country);
                console.log('🏳️ Отображение флага. Входное значение:', bidInfo.country, 'Результат:', flag);
                // Убеждаемся, что возвращаем именно флаг, а не код
                if (!flag || flag.length === 2) {
                  console.error('❌ ОШИБКА: Возвращается не флаг, а код!', flag);
                  return '🌍';
                }
                return flag;
              })()}
            </div>
            <div className="circular-timer-user-number">{bidInfo.userIdNumber}</div>
          </div>
        ) : (
          <div className="circular-timer-time">{formatTime()}</div>
        )}
      </div>
    </div>
  );
};

export default CircularTimer;

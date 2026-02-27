import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { FiCalendar } from 'react-icons/fi';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { getApiBaseUrl } from '../../utils/apiConfig';
import './Statistics.css';
import StatCard from './StatCard';
import NearestAuctionsSlider from './NearestAuctionsSlider';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const Statistics = ({ businessInfo, onShowUsers }) => {
  const [timeFilter, setTimeFilter] = useState('all');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [tempStartDate, setTempStartDate] = useState(null);
  const [tempEndDate, setTempEndDate] = useState(null);
  const calendarRef = useRef(null);
  const [usersCount, setUsersCount] = useState(null); // Реальное количество пользователей из БД
  const [isLoadingUsersCount, setIsLoadingUsersCount] = useState(true);
  const [countryStats, setCountryStats] = useState([]); // Статистика по странам
  const [roleStats, setRoleStats] = useState({ sellers: 0, buyers: 0 }); // Статистика по ролям
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [realAuctions, setRealAuctions] = useState([]); // Реальные аукционные объявления из БД
  const [isLoadingAuctions, setIsLoadingAuctions] = useState(true);
  const [propertiesCount, setPropertiesCount] = useState(null); // Количество объектов из БД
  const [auctionsCount, setAuctionsCount] = useState(null); // Количество аукционов из БД
  const [isLoadingCounts, setIsLoadingCounts] = useState(true);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setIsCalendarOpen(false);
      }
    };

    if (isCalendarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCalendarOpen]);

  // Загружаем реальное количество пользователей из БД
  useEffect(() => {
    const fetchUsersCount = async () => {
      try {
        setIsLoadingUsersCount(true);
        const API_BASE_URL = await getApiBaseUrl();
        const response = await fetch(`${API_BASE_URL}/admin/users/count`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setUsersCount(data.count);
          } else {
            console.warn('⚠️ Не удалось получить количество пользователей:', data.error);
            // Используем значение по умолчанию из businessInfo
            setUsersCount(businessInfo.stats.clients_count);
          }
        } else {
          console.warn('⚠️ Ошибка при получении количества пользователей:', response.status);
          // Используем значение по умолчанию из businessInfo
          setUsersCount(businessInfo.stats.clients_count);
        }
      } catch (error) {
        console.error('❌ Ошибка при загрузке количества пользователей:', error);
        // Используем значение по умолчанию из businessInfo
        setUsersCount(businessInfo.stats.clients_count);
      } finally {
        setIsLoadingUsersCount(false);
      }
    };

    fetchUsersCount();
  }, [businessInfo.stats.clients_count]);

  // Загружаем статистику по странам и ролям
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoadingStats(true);
        const API_BASE_URL = await getApiBaseUrl();
        
        // Загружаем статистику по странам
        const countryResponse = await fetch(`${API_BASE_URL}/admin/users/country-stats`);
        if (countryResponse.ok) {
          const countryData = await countryResponse.json();
          if (countryData.success && countryData.data) {
            setCountryStats(countryData.data);
          }
        }

        // Загружаем статистику по ролям
        const roleResponse = await fetch(`${API_BASE_URL}/admin/users/role-stats`);
        if (roleResponse.ok) {
          const roleData = await roleResponse.json();
          if (roleData.success && roleData.data) {
            const sellers = roleData.data.find(item => item.role === 'seller')?.count || 0;
            const buyers = roleData.data.find(item => item.role === 'buyer')?.count || 0;
            setRoleStats({ sellers, buyers });
          }
        }
      } catch (error) {
        console.error('❌ Ошибка при загрузке статистики:', error);
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchStats();
  }, []);

  // Загружаем количество объектов и аукционов из API
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        setIsLoadingCounts(true);
        const API_BASE_URL = await getApiBaseUrl();
        
        // Загружаем количество одобренных объектов
        let approvedCount = 0;
        try {
          const approvedResponse = await fetch(`${API_BASE_URL}/properties/approved`);
          if (approvedResponse.ok) {
            const approvedData = await approvedResponse.json();
            console.log('📊 Ответ /properties/approved:', approvedData);
            if (approvedData.success && Array.isArray(approvedData.data)) {
              approvedCount = approvedData.data.length;
            } else {
              console.warn('⚠️ Неверный формат ответа /properties/approved:', approvedData);
            }
          } else {
            console.warn('⚠️ Ошибка HTTP при загрузке одобренных объектов:', approvedResponse.status, approvedResponse.statusText);
            const errorText = await approvedResponse.text();
            console.warn('⚠️ Текст ошибки:', errorText);
          }
        } catch (error) {
          console.error('❌ Ошибка при загрузке одобренных объектов:', error);
        }

        // Загружаем количество аукционных объявлений по всем типам
        const types = ['commercial', 'villa', 'apartment', 'house'];
        let totalAuctionsCount = 0;
        
        for (const type of types) {
          try {
            const response = await fetch(`${API_BASE_URL}/properties/auctions?type=${type}`);
            if (response.ok) {
              const data = await response.json();
              console.log(`📊 Ответ /properties/auctions?type=${type}:`, data);
              if (data.success && Array.isArray(data.data)) {
                totalAuctionsCount += data.data.length;
              } else {
                console.warn(`⚠️ Неверный формат ответа для типа ${type}:`, data);
              }
            } else {
              console.warn(`⚠️ Ошибка HTTP при загрузке аукционов типа ${type}:`, response.status, response.statusText);
            }
          } catch (error) {
            console.error(`❌ Ошибка загрузки аукционных объявлений типа ${type}:`, error);
          }
        }

        console.log('✅ Итоговые данные - объектов:', approvedCount, 'аукционов:', totalAuctionsCount);
        setPropertiesCount(approvedCount);
        setAuctionsCount(totalAuctionsCount);
      } catch (error) {
        console.error('❌ Критическая ошибка при загрузке количества объектов и аукционов:', error);
        // Устанавливаем 0, чтобы показать, что данные не загрузились
        setPropertiesCount(0);
        setAuctionsCount(0);
      } finally {
        setIsLoadingCounts(false);
      }
    };

    fetchCounts();
  }, []);

  // Загружаем реальные аукционные объявления из API
  useEffect(() => {
    const fetchAuctions = async () => {
      try {
        setIsLoadingAuctions(true);
        const API_BASE_URL = await getApiBaseUrl();
        
        // Загружаем все типы аукционных объявлений
        const types = ['commercial', 'villa', 'apartment', 'house'];
        const allAuctions = [];

        for (const type of types) {
          try {
            const response = await fetch(`${API_BASE_URL}/properties/auctions?type=${type}`);
            if (response.ok) {
              const data = await response.json();
              if (data.success && data.data && Array.isArray(data.data)) {
                allAuctions.push(...data.data);
              }
            }
          } catch (error) {
            console.error(`Ошибка загрузки аукционных объявлений типа ${type}:`, error);
          }
        }

        // Форматируем данные для слайдера
        const formattedAuctions = allAuctions.map(auction => ({
          id: auction.id,
          object_title: auction.title || auction.name || 'Без названия',
          description: auction.description || '',
          object_location: auction.location || 'Не указано',
          image_url: auction.image || (auction.images && auction.images[0]) || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80',
          starting_price: auction.auction_starting_price || auction.price || 0,
          auction_starting_price: auction.auction_starting_price || auction.price || 0,
          current_bid: auction.currentBid || auction.auction_starting_price || auction.price || 0,
          end_date: auction.auction_end_date || auction.endTime || null,
          bedrooms: auction.bedrooms || auction.rooms || auction.beds || 0,
          bathrooms: auction.bathrooms || 0,
          area: auction.area || auction.sqft || 0,
          object_type: auction.property_type || 'apartment',
        }));

        setRealAuctions(formattedAuctions);
        console.log('✅ Загружено аукционных объявлений для слайдера:', formattedAuctions.length);
      } catch (error) {
        console.error('❌ Ошибка при загрузке аукционных объявлений:', error);
      } finally {
        setIsLoadingAuctions(false);
      }
    };

    fetchAuctions();
  }, []);

  const getTimeMultiplier = (period, customStartDate = null, customEndDate = null) => {
    if (customStartDate && customEndDate) {
      const daysDiff = Math.ceil((customEndDate - customStartDate) / (1000 * 60 * 60 * 24));
      const baseMultiplier = Math.min(1.0, daysDiff / 30);
      return Math.max(0.3, baseMultiplier);
    }

    const multipliers = {
      'month': 1.0,
      '3months': 0.85,
      '6months': 0.70,
      'year': 0.55,
      'all': 0.40
    };
    return multipliers[period] || 1.0;
  };

  const getChangePercent = (basePercent, period) => {
    const adjustments = {
      'month': 0,
      '3months': -5,
      '6months': -10,
      'year': -15,
      'all': -20
    };
    const base = parseFloat(basePercent);
    const adjustment = adjustments[period] || 0;
    const newValue = base + adjustment;
    return newValue >= 0 ? `+${newValue.toFixed(1)}%` : `${newValue.toFixed(1)}%`;
  };

  // Функция для определения типа изменения на основе процента
  const getChangeType = (changeString) => {
    // Извлекаем числовое значение из строки (например, "+12.5%" или "-2.5%")
    const match = changeString.match(/([+-]?\d+\.?\d*)/);
    if (match) {
      const value = parseFloat(match[1]);
      return value >= 0 ? 'positive' : 'negative';
    }
    return 'positive'; // По умолчанию положительное
  };

  const multiplier = useMemo(() => {
    if (startDate && endDate) {
      return getTimeMultiplier(null, startDate, endDate);
    }
    return getTimeMultiplier(timeFilter);
  }, [timeFilter, startDate, endDate]);

  const generateCalendar = (year, month) => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    for (let i = 0; i < offset; i++) {
      days.push(null);
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const calendarDays = useMemo(() => generateCalendar(calendarYear, calendarMonth), [calendarYear, calendarMonth]);

  const handleDateClick = (date) => {
    if (!date) return;
    
    if (!tempStartDate || (tempStartDate && tempEndDate)) {
      setTempStartDate(date);
      setTempEndDate(null);
    } else if (date < tempStartDate) {
      setTempStartDate(date);
      setTempEndDate(null);
    } else {
      setTempEndDate(date);
    }
  };

  const applyDateRange = () => {
    if (tempStartDate && tempEndDate) {
      setStartDate(tempStartDate);
      setEndDate(tempEndDate);
      setTimeFilter('custom');
      setIsCalendarOpen(false);
    }
  };

  const clearDateRange = () => {
    setStartDate(null);
    setEndDate(null);
    setTempStartDate(null);
    setTempEndDate(null);
    setTimeFilter('all');
    setIsCalendarOpen(false);
  };

  const formatDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const isDateInRange = (date) => {
    if (!date) return false;
    if (tempStartDate && tempEndDate) {
      return date >= tempStartDate && date <= tempEndDate;
    }
    if (tempStartDate) {
      return date.getTime() === tempStartDate.getTime();
    }
    return false;
  };

  const isDateSelected = (date) => {
    if (!date) return false;
    if (tempStartDate && date.getTime() === tempStartDate.getTime()) return true;
    if (tempEndDate && date.getTime() === tempEndDate.getTime()) return true;
    return false;
  };


  // Данные для графика национальности пользователей (реальные данные из БД)
  const weekdayData = useMemo(() => {
    if (isLoadingStats || countryStats.length === 0) {
      // Показываем заглушку во время загрузки
      return {
        labels: ['Загрузка...'],
        datasets: [{
          label: 'Доля регистраций, %',
          data: [0],
          backgroundColor: ['#4361ee'],
          borderRadius: 6,
          borderWidth: 0
        }]
      };
    }

    // Вычисляем общее количество пользователей
    const total = countryStats.reduce((sum, item) => sum + item.count, 0);
    
    // Сортируем по количеству и берем топ-7, остальные объединяем в "Остальные"
    const sorted = [...countryStats].sort((a, b) => b.count - a.count);
    const topCountries = sorted.slice(0, 6);
    const othersCount = sorted.slice(6).reduce((sum, item) => sum + item.count, 0);
    
    const labels = topCountries.map(item => item.country);
    const data = topCountries.map(item => ((item.count / total) * 100).toFixed(1));
    
    if (othersCount > 0) {
      labels.push('Остальные');
      data.push(((othersCount / total) * 100).toFixed(1));
    }

    const colors = [
      '#4361ee',
      '#4895ef',
      '#3f37c9',
      '#4cc9f0',
      '#f8961e',
      '#f72585',
      '#10b981'
    ];

    return {
      labels: labels,
      datasets: [{
        label: 'Доля регистраций, %',
        data: data.map(val => parseFloat(val)),
        backgroundColor: colors.slice(0, labels.length),
        borderRadius: 6,
        borderWidth: 0
      }]
    };
  }, [countryStats, isLoadingStats]);

  // Данные для диаграммы пользователей по дням недели
  const usersByWeekdayData = useMemo(() => {
    // Дефолтные значения для Пн-Вс
    const baseData = [120, 145, 135, 160, 180, 200, 150];
    const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    
    return {
      labels: dayNames,
      datasets: [{
        label: 'Количество пользователей',
        data: baseData,
        borderColor: '#4361ee',
        backgroundColor: 'rgba(67, 97, 238, 0.1)',
        fill: true,
        tension: 0.4
      }]
    };
  }, []);

  const propertyCategoriesData = useMemo(() => ({
    labels: ['Виллы', 'Дома', 'Квартиры', 'Апартаменты', 'Земля'],
    datasets: [{
      label: 'Процент',
      data: [15, 20, 35, 18, 12],
      backgroundColor: [
        '#4361ee',
        '#4895ef',
        '#3f37c9',
        '#4cc9f0',
        '#10b981'
      ],
      borderRadius: 6
    }]
  }), []);

  const userRoleData = useMemo(() => {
    // Используем реальные данные из БД, если они загружены
    const sellers = isLoadingStats ? 0 : roleStats.sellers;
    const buyers = isLoadingStats ? 0 : roleStats.buyers;
    const total = sellers + buyers;
    
    // Если нет данных, используем значения по умолчанию
    const sellersValue = total > 0 ? sellers : Math.round((businessInfo.user_role_stats?.sellers || 45) * multiplier);
    const buyersValue = total > 0 ? buyers : Math.round((businessInfo.user_role_stats?.buyers || 55) * multiplier);

    return {
      labels: ['Продавцы', 'Покупатели'],
      datasets: [{
        data: [sellersValue, buyersValue],
        backgroundColor: [
          '#4361ee',
          '#f72585'
        ],
        borderWidth: 0
      }]
    };
  }, [roleStats, isLoadingStats, businessInfo.user_role_stats, multiplier]);

  const weekdayChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            const value = context.parsed.y ?? 0;
            return `${value.toFixed(1)}%`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 10,
          callback: function (value) {
            return value + '%';
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  const usersByWeekdayChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            const value = context.parsed.y ?? 0;
            return `${value} пользователей`;
          }
        }
      }
    },
    elements: {
      line: {
        tension: 0.4, // Плавность линии
        borderWidth: 3,
        borderColor: '#4361ee'
      },
      point: {
        radius: 6,
        hoverRadius: 8,
        backgroundColor: '#4361ee',
        borderColor: '#ffffff',
        borderWidth: 2,
        hoverBorderWidth: 3
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 50,
          callback: function (value) {
            return value;
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  const propertyCategoriesOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const value = context.parsed.y;
            return `${value}%`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: function(value) {
            return value + '%';
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 15,
          font: {
            size: 14
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };


  const activeAuctions = useMemo(() => {
    // Используем только реальные данные из API, без fallback на моковые данные
    if (!realAuctions || realAuctions.length === 0) return [];
    const now = new Date();
    return realAuctions
      .filter(auction => {
        const endDate = auction.end_date || auction.auction_end_date;
        return endDate && new Date(endDate) > now;
      })
      .sort((a, b) => {
        const dateA = new Date(a.end_date || a.auction_end_date);
        const dateB = new Date(b.end_date || b.auction_end_date);
        return dateA - dateB;
      })
      .slice(0, 10); // Берем первые 10 ближайших
  }, [realAuctions]);

  const stats = useMemo(() => {
    // Используем реальное количество пользователей из БД, если оно загружено
    // Для реального количества не применяем multiplier, так как это реальные данные из БД
    const baseUsersCount = usersCount !== null ? usersCount : businessInfo.stats.clients_count;
    const totalUsers = usersCount !== null ? usersCount : Math.round(baseUsersCount * multiplier);
    const buyersCount = Math.round((businessInfo.user_role_stats?.buyers || 55) / 100 * totalUsers);
    const sellersCount = Math.round((businessInfo.user_role_stats?.sellers || 45) / 100 * totalUsers);
    
    const statsData = [
      {
        title: 'Всего пользователей',
        value: isLoadingUsersCount ? '...' : totalUsers,
        changePercent: '12.5',
        icon: 'fas fa-users',
        iconClass: 'blue'
      },
      {
        title: 'Количество Покупателей',
        value: buyersCount,
        changePercent: '8.3',
        icon: 'fas fa-shopping-cart',
        iconClass: 'green'
      },
      {
        title: 'Количество Продавцов',
        value: sellersCount,
        changePercent: '10.2',
        icon: 'fas fa-store',
        iconClass: 'purple'
      },
      {
        title: 'Выставленные Объекты',
        value: isLoadingCounts ? '...' : (propertiesCount !== null && propertiesCount !== undefined ? propertiesCount : 0),
        changePercent: '15.2',
        icon: 'fas fa-building',
        iconClass: 'orange'
      },
      {
        title: 'Количество Аукционов',
        value: isLoadingCounts ? '...' : (auctionsCount !== null && auctionsCount !== undefined ? auctionsCount : 0),
        changePercent: '18.4',
        icon: 'fas fa-gavel',
        iconClass: 'blue'
      },
      {
        title: 'Прибыль',
        value: `$${Math.round(businessInfo.stats.total_profit * multiplier).toLocaleString('ru-RU')}`,
        changePercent: '22.7',
        icon: 'fas fa-wallet',
        iconClass: 'green'
      },
      {
        title: 'Онлайн',
        value: Math.round((businessInfo.stats.online_users || 42) * multiplier),
        changePercent: '5.3',
        icon: 'fas fa-circle',
        iconClass: 'red'
      },
      {
        title: 'Оборот',
        value: `$${Math.round((businessInfo.stats.turnover || 2500000) * multiplier).toLocaleString('ru-RU')}`,
        changePercent: '18.9',
        icon: 'fas fa-exchange-alt',
        iconClass: 'orange'
      }
    ];

    return statsData.map(stat => {
      // При фильтре "Все время" не показываем проценты, только абсолютные значения
      if (timeFilter === 'all') {
        return {
          ...stat,
          change: null, // Не показываем изменение
          changeType: null
        };
      }
      
      const changeString = getChangePercent(stat.changePercent, timeFilter);
      return {
        ...stat,
        change: changeString + ' за период',
        changeType: getChangeType(changeString)
      };
    });
  }, [businessInfo, multiplier, timeFilter, usersCount, isLoadingUsersCount]);

  const timeFilterOptions = [
    { value: 'all', label: 'Все время' },
    { value: 'month', label: 'Месяц' },
    { value: '3months', label: '3 месяца' },
    { value: '6months', label: 'Полгода' },
    { value: 'year', label: 'Год' }
  ];

  return (
    <div className="content-section" id="statistics-section">
      <div className="statistics-header">
        <h2 className="statistics-title">Статистика</h2>
        <div className="time-filter-container">
          <div className="time-filter">
            {timeFilterOptions.map(option => (
              <button
                key={option.value}
                className={`time-filter-btn ${timeFilter === option.value && !startDate && !endDate ? 'active' : ''}`}
                onClick={() => {
                  setTimeFilter(option.value);
                  setStartDate(null);
                  setEndDate(null);
                  setTempStartDate(null);
                  setTempEndDate(null);
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="calendar-wrapper" ref={calendarRef}>
            <button
              className={`calendar-icon-btn ${startDate && endDate ? 'active' : ''}`}
              onClick={() => setIsCalendarOpen(!isCalendarOpen)}
              title="Выбрать диапазон дат"
            >
              <FiCalendar size={20} />
              {startDate && endDate && (
                <span className="calendar-date-range">
                  {formatDate(startDate)} - {formatDate(endDate)}
                </span>
              )}
            </button>
            {isCalendarOpen && (
              <div className="calendar-popup">
                <div className="calendar-header">
                  <button
                    className="calendar-nav-btn"
                    onClick={() => {
                      if (calendarMonth === 0) {
                        setCalendarMonth(11);
                        setCalendarYear(calendarYear - 1);
                      } else {
                        setCalendarMonth(calendarMonth - 1);
                      }
                    }}
                  >
                    ‹
                  </button>
                  <div className="calendar-month-year">
                    {new Date(calendarYear, calendarMonth).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
                  </div>
                  <button
                    className="calendar-nav-btn"
                    onClick={() => {
                      if (calendarMonth === 11) {
                        setCalendarMonth(0);
                        setCalendarYear(calendarYear + 1);
                      } else {
                        setCalendarMonth(calendarMonth + 1);
                      }
                    }}
                  >
                    ›
                  </button>
                </div>
                <div className="calendar-grid">
                  <div className="calendar-weekdays">
                    {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
                      <div key={day} className="calendar-weekday">{day}</div>
                    ))}
                  </div>
                  <div className="calendar-days">
                    {calendarDays.map((date, index) => (
                      <button
                        key={index}
                        className={`calendar-day ${!date ? 'empty' : ''} ${isDateInRange(date) ? 'in-range' : ''} ${isDateSelected(date) ? 'selected' : ''}`}
                        onClick={() => handleDateClick(date)}
                        disabled={!date}
                      >
                        {date ? date.getDate() : ''}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="calendar-footer">
                  {tempStartDate && tempEndDate && (
                    <div className="calendar-selected-range">
                      Выбрано: {formatDate(tempStartDate)} - {formatDate(tempEndDate)}
                    </div>
                  )}
                  <div className="calendar-actions">
                    <button className="calendar-action-btn" onClick={clearDateRange}>
                      Очистить
                    </button>
                    <button
                      className="calendar-action-btn calendar-action-btn-primary"
                      onClick={applyDateRange}
                      disabled={!tempStartDate || !tempEndDate}
                    >
                      Применить
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="stats-grid">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {isLoadingAuctions ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
          Загрузка аукционов...
        </div>
      ) : activeAuctions.length > 0 ? (
        <NearestAuctionsSlider auctions={activeAuctions} />
      ) : null}

      <div className="charts-row">
        <div className="chart-container">
          <div className="chart-header">
            <h3 className="chart-title">Национальность пользователей</h3>
            <div className="chart-actions">
              <button className="chart-btn active">Все дни</button>
            </div>
          </div>
          <div className="chart-wrapper">
            <Bar data={weekdayData} options={weekdayChartOptions} />
          </div>
        </div>

        <div className="chart-container">
          <div className="chart-header">
            <h3 className="chart-title-small">Пользователей по дням</h3>
          </div>
          <div className="chart-wrapper">
            <Line 
              data={usersByWeekdayData} 
              options={usersByWeekdayChartOptions} 
            />
          </div>
        </div>
      </div>

      <div className="demographics-grid">
        <div className="chart-container">
          <div className="chart-header">
            <h3 className="chart-title">Категории недвижимости</h3>
          </div>
          <div className="chart-wrapper">
            <Bar data={propertyCategoriesData} options={propertyCategoriesOptions} />
          </div>
        </div>

        <div className="chart-container">
          <div className="chart-header">
            <h3 className="chart-title">Соотношение продавцов и покупателей</h3>
          </div>
          <div className="chart-wrapper">
            <Pie data={userRoleData} options={pieOptions} />
          </div>
        </div>
      </div>

      <div className="users-section">
        <div className="users-header">
          <h3 className="users-title">Информация о пользователях</h3>
          <button className="users-toggle" onClick={onShowUsers}>
            <i className="fas fa-users"></i> Показать всех пользователей
          </button>
        </div>
        <p>Нажмите кнопку, чтобы просмотреть подробную информацию о клиентах, включая их покупки, бонусные баллы и другую статистику.</p>
      </div>
    </div>
  );
};

export default Statistics;


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
import PaymentsModal from './PaymentsModal';

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
  const [usersByDayWeekOffset, setUsersByDayWeekOffset] = useState(0); // 0 = текущая неделя, -1 = прошлая и т.д.
  const [usersByDayData, setUsersByDayData] = useState([]); // { date, count }[] за выбранную неделю
  const [usersByDayWeekRange, setUsersByDayWeekRange] = useState({ weekStart: null, weekEnd: null });
  const [isLoadingUsersByDay, setIsLoadingUsersByDay] = useState(true);
  const [usersByDayLoadError, setUsersByDayLoadError] = useState(false);
  const [categoryViewMode, setCategoryViewMode] = useState('type'); // 'type' | 'sections'
  const [categoryStats, setCategoryStats] = useState({ byType: [], bySection: [] });
  const [isLoadingCategoryStats, setIsLoadingCategoryStats] = useState(true);
  const [onlineCount, setOnlineCount] = useState(null); // количество посетителей онлайн
  const [isLoadingOnlineCount, setIsLoadingOnlineCount] = useState(true);
  const [stripePaymentsCount, setStripePaymentsCount] = useState(null);
  const [isLoadingStripePaymentsCount, setIsLoadingStripePaymentsCount] = useState(true);
  const [paymentsModalOpen, setPaymentsModalOpen] = useState(false);

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

  // Загружаем регистрации по дням за выбранную неделю
  useEffect(() => {
    const getMondayForWeekOffset = (offset) => {
      const now = new Date();
      const day = now.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      const monday = new Date(now);
      monday.setDate(now.getDate() + mondayOffset + offset * 7);
      return monday.toISOString().slice(0, 10);
    };

    const fetchRegistrationsByDay = async () => {
      try {
        setIsLoadingUsersByDay(true);
        const API_BASE_URL = await getApiBaseUrl();
        const weekStart = getMondayForWeekOffset(usersByDayWeekOffset);
        const start = new Date(weekStart);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        const weekEnd = end.toISOString().slice(0, 10);
        setUsersByDayWeekRange({ weekStart, weekEnd });
        setUsersByDayLoadError(false);
        const response = await fetch(`${API_BASE_URL}/admin/users/registrations-by-day?weekStart=${weekStart}`);
        if (response.ok) {
          const json = await response.json();
          if (json.success && Array.isArray(json.data)) {
            setUsersByDayData(json.data);
            setUsersByDayWeekRange({ weekStart: json.weekStart, weekEnd: json.weekEnd });
          } else {
            setUsersByDayData(Array(7).fill(0).map((_, i) => ({ date: new Date(start.getTime() + i * 86400000).toISOString().slice(0, 10), count: 0 })));
          }
        } else {
          setUsersByDayLoadError(true);
          setUsersByDayData(Array(7).fill(0).map((_, i) => ({ date: new Date(start.getTime() + i * 86400000).toISOString().slice(0, 10), count: 0 })));
        }
      } catch (error) {
        console.error('Ошибка загрузки регистраций по дням:', error);
        setUsersByDayLoadError(true);
        const weekStart = getMondayForWeekOffset(usersByDayWeekOffset);
        const start = new Date(weekStart);
        setUsersByDayData(Array(7).fill(0).map((_, i) => ({ date: new Date(start.getTime() + i * 86400000).toISOString().slice(0, 10), count: 0 })));
      } finally {
        setIsLoadingUsersByDay(false);
      }
    };

    fetchRegistrationsByDay();
  }, [usersByDayWeekOffset]);

  // Загружаем количество объектов и аукционов из API (лёгкий эндпоинт счётчиков)
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        setIsLoadingCounts(true);
        const API_BASE_URL = await getApiBaseUrl();
        const response = await fetch(`${API_BASE_URL}/admin/stats/counts`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setPropertiesCount(data.propertiesCount ?? 0);
            setAuctionsCount(data.auctionsCount ?? 0);
          }
        }
      } catch (error) {
        console.error('Ошибка загрузки счётчиков объектов и аукционов:', error);
        setPropertiesCount(0);
        setAuctionsCount(0);
      } finally {
        setIsLoadingCounts(false);
      }
    };
    fetchCounts();
  }, []);

  // Загружаем и периодически обновляем количество посетителей онлайн
  useEffect(() => {
    const fetchOnlineCount = async () => {
      try {
        const API_BASE_URL = await getApiBaseUrl();
        const response = await fetch(`${API_BASE_URL}/admin/online-count`, {
          cache: 'no-store'
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success && typeof data.count === 'number') {
            setOnlineCount(data.count);
          }
        }
      } catch (error) {
        console.error('Ошибка загрузки online count:', error);
      } finally {
        setIsLoadingOnlineCount(false);
      }
    };
    fetchOnlineCount();
    const interval = setInterval(fetchOnlineCount, 30000);
    const onFocus = () => fetchOnlineCount();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  useEffect(() => {
    const fetchStripePaymentsCount = async () => {
      try {
        setIsLoadingStripePaymentsCount(true);
        const API_BASE_URL = await getApiBaseUrl();
        const response = await fetch(`${API_BASE_URL}/admin/stripe-payments`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data && typeof data.data.totalCount === 'number') {
            setStripePaymentsCount(data.data.totalCount);
          } else {
            setStripePaymentsCount(0);
          }
        } else {
          setStripePaymentsCount(0);
        }
      } catch (e) {
        console.error('Ошибка загрузки счётчика платежей:', e);
        setStripePaymentsCount(0);
      } finally {
        setIsLoadingStripePaymentsCount(false);
      }
    };
    fetchStripePaymentsCount();
  }, []);

  // Загружаем статистику категорий недвижимости (по типу и по разделам)
  useEffect(() => {
    const fetchCategoryStats = async () => {
      try {
        setIsLoadingCategoryStats(true);
        const API_BASE_URL = await getApiBaseUrl();
        const response = await fetch(`${API_BASE_URL}/admin/properties/category-stats`);
        if (response.ok) {
          const json = await response.json();
          if (json.success) {
            setCategoryStats({ byType: json.byType || [], bySection: json.bySection || [] });
          }
        }
      } catch (error) {
        console.error('Ошибка загрузки статистики категорий:', error);
      } finally {
        setIsLoadingCategoryStats(false);
      }
    };
    fetchCategoryStats();
  }, []);

  // Загружаем реальные аукционные объявления из API
  useEffect(() => {
    const fetchAuctions = async (silent = false) => {
      try {
        if (!silent) setIsLoadingAuctions(true);
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

        // Форматируем данные для слайдера (без учета ставок)
        const formattedAuctionsBase = allAuctions.map(auction => ({
          id: auction.id,
          object_title: auction.title || auction.name || 'Без названия',
          description: auction.description || '',
          object_location: auction.location || 'Не указано',
          image_url: auction.image || (auction.images && auction.images[0]) || '/images/external/photo-1560448204-e02f11c3d0e2-54a1e4fab4.jpg',
          starting_price: auction.auction_starting_price || auction.price || 0,
          auction_starting_price: auction.auction_starting_price || auction.price || 0,
          // Пока используем стартовую цену, актуальную ставку подставим ниже после загрузки истории торгов
          current_bid: auction.currentBid || auction.auction_starting_price || auction.price || 0,
          // Как на карточке объекта (CircularTimer): приоритет у test_timer_end_date, иначе список не считает аукцион завершённым
          end_date:
            auction.test_timer_end_date ||
            auction.endTime ||
            auction.auction_end_date ||
            null,
          bedrooms: auction.bedrooms || auction.rooms || auction.beds || 0,
          bathrooms: auction.bathrooms || 0,
          area: auction.area || auction.sqft || 0,
          object_type: auction.property_type || 'apartment',
        }));

        // Для каждой аукционной карточки подтягиваем ставки и, для уже завершённых, победителя
        const formattedAuctionsWithBids = await Promise.all(
          formattedAuctionsBase.map(async (auction) => {
            let enriched = { ...auction };
            try {
              const bidsResponse = await fetch(`${API_BASE_URL}/bids/property/${auction.id}`);
              if (bidsResponse.ok) {
                const bidsData = await bidsResponse.json();
                if (bidsData.success && Array.isArray(bidsData.data) && bidsData.data.length > 0) {
                  const maxBid = Math.max(...bidsData.data.map(b => Number(b.bid_amount) || 0));
                  enriched = {
                    ...enriched,
                    current_bid: maxBid || enriched.current_bid || enriched.auction_starting_price || enriched.starting_price || 0,
                  };
                }
              }
            } catch (e) {
              console.warn(`⚠️ Не удалось загрузить ставки для аукциона ${auction.id}:`, e);
            }

            const endDate = enriched.end_date;
            if (endDate && new Date(endDate) <= new Date()) {
              try {
                const winRes = await fetch(`${API_BASE_URL}/auction-winners/property/${auction.id}`);
                if (winRes.ok) {
                  const winJson = await winRes.json();
                  if (winJson.success && winJson.data && winJson.data.user_id != null) {
                    enriched.winner_user_id = winJson.data.user_id;
                  }
                }
              } catch (_) {
                /* ignore */
              }
            }

            return enriched;
          })
        );

        setRealAuctions(formattedAuctionsWithBids);
        console.log('✅ Загружено аукционных объявлений для слайдера:', formattedAuctionsWithBids.length);
      } catch (error) {
        console.error('❌ Ошибка при загрузке аукционных объявлений:', error);
      } finally {
        if (!silent) setIsLoadingAuctions(false);
      }
    };

    fetchAuctions(false);
    const refreshId = setInterval(() => {
      fetchAuctions(true);
    }, 45000);
    return () => clearInterval(refreshId);
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
      '#0099A9'
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

  // Данные для диаграммы пользователей по дням недели (реальные регистрации за выбранную неделю)
  const usersByWeekdayData = useMemo(() => {
    const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const data = usersByDayData.length === 7
      ? usersByDayData.map((d) => d.count)
      : Array(7).fill(0);
    return {
      labels: dayNames,
      datasets: [{
        label: 'Регистраций',
        data,
        borderColor: '#4361ee',
        backgroundColor: 'rgba(67, 97, 238, 0.1)',
        fill: true,
        tension: 0.4
      }]
    };
  }, [usersByDayData]);

  const typeLabels = { villa: 'Виллы', house: 'Дома', apartment: 'Квартиры', commercial: 'Апартаменты' };
  const sectionLabels = { auction: 'Аукцион', buy_now: 'Купить сейчас', share: 'Доли', debt: 'Долги' };
  const propertyCategoriesData = useMemo(() => {
    const isType = categoryViewMode === 'type';
    const list = isType ? categoryStats.byType : categoryStats.bySection;
    const labelKey = isType ? 'type' : 'section';
    const labels = list.map((item) => (isType ? typeLabels[item.type] : sectionLabels[item.section]) || item[labelKey]);
    const data = list.map((item) => item.count);
    const colors = ['#4361ee', '#4895ef', '#3f37c9', '#4cc9f0', '#0099A9'];
    return {
      labels: labels.length ? labels : (isType ? ['Виллы', 'Дома', 'Квартиры', 'Апартаменты'] : ['Аукцион', 'Купить сейчас', 'Доли', 'Долги']),
      datasets: [{
        label: isType ? 'По типу' : 'По разделам',
        data: data.length ? data : (isType ? [0, 0, 0, 0] : [0, 0, 0, 0]),
        backgroundColor: colors.slice(0, Math.max(data.length, 1)),
        borderRadius: 6
      }]
    };
  }, [categoryStats, categoryViewMode]);

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
            return `${value} регистраций`;
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
            return `${value} объектов`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          callback: function(value) {
            return Number.isInteger(value) ? value : value;
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
    if (!realAuctions || realAuctions.length === 0) return [];
    const now = new Date();
    const withEnd = realAuctions.filter((auction) => {
      const endDate = auction.end_date || auction.auction_end_date;
      return Boolean(endDate);
    });
    const active = withEnd
      .filter((auction) => new Date(auction.end_date || auction.auction_end_date) > now)
      .sort(
        (a, b) =>
          new Date(a.end_date || a.auction_end_date) - new Date(b.end_date || b.auction_end_date)
      );
    const ended = withEnd
      .filter((auction) => new Date(auction.end_date || auction.auction_end_date) <= now)
      .sort(
        (a, b) =>
          new Date(b.end_date || b.auction_end_date) - new Date(a.end_date || a.auction_end_date)
      );
    // Сначала идущие аукционы, завершённые — в конце списка
    return [...active, ...ended].slice(0, 20);
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
        title: 'Аукционов',
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
        value: isLoadingOnlineCount ? '...' : (onlineCount !== null && onlineCount !== undefined ? onlineCount : 0),
        changePercent: '5.3',
        icon: 'fas fa-circle',
        iconClass: 'red'
      },
      {
        title: 'Платежи (Stripe)',
        value: isLoadingStripePaymentsCount ? '...' : (stripePaymentsCount !== null ? stripePaymentsCount : 0),
        changePercent: '0',
        icon: 'fas fa-credit-card',
        iconClass: 'green',
        onCardClick: () => setPaymentsModalOpen(true),
        ariaLabel: 'Открыть список платежей Stripe'
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
  }, [
    businessInfo,
    multiplier,
    timeFilter,
    usersCount,
    isLoadingUsersCount,
    propertiesCount,
    auctionsCount,
    isLoadingCounts,
    onlineCount,
    isLoadingOnlineCount,
    stripePaymentsCount,
    isLoadingStripePaymentsCount,
  ]);

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
          <StatCard
            key={index}
            title={stat.title}
            value={stat.value}
            change={stat.change}
            changeType={stat.changeType}
            icon={stat.icon}
            iconClass={stat.iconClass}
            onClick={stat.onCardClick}
            ariaLabel={stat.ariaLabel}
          />
        ))}
      </div>

      <PaymentsModal isOpen={paymentsModalOpen} onClose={() => setPaymentsModalOpen(false)} />

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
            <div className="chart-actions">
              <button
                type="button"
                className="chart-btn"
                onClick={() => setUsersByDayWeekOffset((o) => o - 1)}
                disabled={isLoadingUsersByDay}
                title="Предыдущая неделя"
              >
                ←
              </button>
              <span className="chart-week-label">
                {usersByDayWeekRange.weekStart && usersByDayWeekRange.weekEnd
                  ? (() => {
                      const fmt = (s) => {
                        const d = new Date(s + 'T12:00:00');
                        const months = 'янв фев мар апр май июн июл авг сен окт ноя дек'.split(' ');
                        return `${d.getDate()} ${months[d.getMonth()]}`;
                      };
                      return `${fmt(usersByDayWeekRange.weekStart)} – ${fmt(usersByDayWeekRange.weekEnd)} ${new Date(usersByDayWeekRange.weekStart + 'T12:00:00').getFullYear()}`;
                    })()
                  : 'Загрузка...'}
              </span>
              <button
                type="button"
                className="chart-btn"
                onClick={() => setUsersByDayWeekOffset((o) => o + 1)}
                disabled={isLoadingUsersByDay || usersByDayWeekOffset >= 0}
                title="Следующая неделя"
              >
                →
              </button>
            </div>
          </div>
          <div className="chart-wrapper">
            {isLoadingUsersByDay ? (
              <div className="chart-loading">Загрузка...</div>
            ) : (
              <>
                <Line 
                  data={usersByWeekdayData} 
                  options={usersByWeekdayChartOptions} 
                />
                {usersByDayLoadError && (
                  <p className="chart-error-hint">
                    Не удалось загрузить данные. Запустите сервер: <code>npm run server</code> или <code>npm start</code>.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="demographics-grid">
        <div className="chart-container">
          <div className="chart-header">
            <h3 className="chart-title">Категории недвижимости</h3>
            <div className="chart-actions">
              <button
                type="button"
                className={`chart-btn ${categoryViewMode === 'type' ? 'active' : ''}`}
                onClick={() => setCategoryViewMode('type')}
                disabled={isLoadingCategoryStats}
              >
                Тип
              </button>
              <button
                type="button"
                className={`chart-btn ${categoryViewMode === 'sections' ? 'active' : ''}`}
                onClick={() => setCategoryViewMode('sections')}
                disabled={isLoadingCategoryStats}
              >
                Разделы
              </button>
            </div>
          </div>
          <div className="chart-wrapper">
            {isLoadingCategoryStats ? (
              <div className="chart-loading">Загрузка...</div>
            ) : (
              <Bar data={propertyCategoriesData} options={propertyCategoriesOptions} />
            )}
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


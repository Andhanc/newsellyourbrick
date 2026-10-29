import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FiSearch, FiClock, FiX } from 'react-icons/fi';
import { getApiBaseUrlSync } from '../../utils/apiConfig';
import './Testing.css';

const API_BASE_URL = getApiBaseUrlSync();

// Логируем API URL при загрузке компонента
console.log('🔧 Testing component - API_BASE_URL:', API_BASE_URL);

const Testing = () => {
  const { t, i18n } = useTranslation();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [timerMinutes, setTimerMinutes] = useState('');
  const [timerSeconds, setTimerSeconds] = useState('');
  const [saving, setSaving] = useState(false);
  const [testProperties, setTestProperties] = useState([]);

  const dateLocale = (i18n.language || 'ru').startsWith('ru') ? 'ru-RU' : (i18n.language || 'en');

  // Загрузка всех объявлений
  useEffect(() => {
    const loadProperties = async () => {
      try {
        setLoading(true);
        setError(null);

        const [approvedRes, auctionsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/properties/approved`),
          fetch(`${API_BASE_URL}/properties/auctions`)
        ]);

        let approved = [];
        let auctions = [];

        if (approvedRes.ok) {
          const data = await approvedRes.json();
          if (data?.success && Array.isArray(data.data)) {
            approved = data.data;
          }
        }

        if (auctionsRes.ok) {
          const data = await auctionsRes.json();
          if (data?.success && Array.isArray(data.data)) {
            auctions = data.data;
          }
        }

        const combined = [...approved, ...auctions];
        setProperties(combined);
      } catch (e) {
        console.error('Ошибка при загрузке объявлений:', e);
        setError(t('admin_testing_loadError'));
      } finally {
        setLoading(false);
      }
    };

    loadProperties();
    loadTestProperties();
  }, [t]);

  // Загрузка объявлений с тестовыми таймерами
  const loadTestProperties = async () => {
    try {
      const url = `${API_BASE_URL}/properties/test-timers`;
      console.log('📤 Загрузка тестовых объявлений:', url);
      console.log('📤 API_BASE_URL:', API_BASE_URL);
      
      const response = await fetch(url);
      console.log('📥 Ответ сервера:', response.status, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📥 Данные тестовых объявлений:', data);
        if (data?.success && Array.isArray(data.data)) {
          setTestProperties(data.data);
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Ошибка загрузки тестовых объявлений:', response.status, errorText);
      }
    } catch (e) {
      console.error('❌ Ошибка при загрузке тестовых объявлений:', e);
    }
  };

  // Фильтрация объявлений
  const filteredProperties = properties.filter(property => {
    const matchesSearch = 
      (property.name || property.title || '')
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      (property.location || '')
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Выбор объявления
  const handleSelectProperty = (property) => {
    setSelectedProperty(property);
    // Если у объявления уже есть тестовый таймер, вычисляем оставшееся время
    const testProp = testProperties.find(p => p.id === property.id);
    if (testProp && testProp.test_timer_end_date) {
      const endDate = new Date(testProp.test_timer_end_date);
      const now = new Date();
      const diff = Math.max(0, endDate - now);
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimerMinutes(String(minutes));
      setTimerSeconds(String(seconds));
    } else {
      setTimerMinutes('');
      setTimerSeconds('');
    }
  };

  // Сохранение тестового таймера
  const handleSaveTimer = async () => {
    if (!selectedProperty) {
      alert('admin_testing_selectListing');
      return;
    }

    const minutes = parseInt(timerMinutes) || 0;
    const seconds = parseInt(timerSeconds) || 0;

    if (minutes === 0 && seconds === 0) {
      alert('admin_testing_specifyTimer');
      return;
    }

    if (minutes < 0 || seconds < 0 || seconds >= 60) {
      alert('admin_testing_invalidTime');
      return;
    }

    // Вычисляем дату окончания: текущее время + указанные минуты и секунды
    const now = new Date();
    const duration = minutes * 60000 + seconds * 1000; // Длительность в миллисекундах
    const endDateTime = new Date(now.getTime() + duration);

    try {
      setSaving(true);
      console.log('📤 Отправка запроса на установку таймера:', {
        propertyId: selectedProperty.id,
        minutes,
        seconds,
        duration,
        endDateTime: endDateTime.toISOString()
      });

      const response = await fetch(`${API_BASE_URL}/properties/${selectedProperty.id}/test-timer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          test_timer_end_date: endDateTime.toISOString(),
          test_timer_duration: duration // Сохраняем исходную длительность
        })
      });

      console.log('📥 Ответ сервера:', response.status, response.statusText);

      const data = await response.json().catch(() => ({}));
      console.log('📥 Данные ответа:', data);

      if (response.ok && data.success) {
        alert('admin_testing_timerSet');
        setSelectedProperty(null);
        setTimerMinutes('');
        setTimerSeconds('');
        loadTestProperties();
      } else {
        const errorMessage = data.error || data.message || t('admin_testing_timerSaveFail');
        console.error('❌ Ошибка сохранения таймера:', errorMessage);
        alert(t('admin_errorPrefix') + errorMessage);
      }
    } catch (e) {
      console.error('❌ Ошибка при сохранении таймера:', e);
      alert(t('admin_testing_timerSaveError', { message: e.message || t('admin_unknownError') }));
    } finally {
      setSaving(false);
    }
  };

  // Удаление тестового таймера
  const handleDeleteTimer = async (propertyId) => {
    if (!confirm(t('admin_testing_confirmDeleteTimer'))) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/properties/${propertyId}/test-timer`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          alert('admin_testing_timerDeleted');
          loadTestProperties();
          if (selectedProperty && selectedProperty.id === propertyId) {
            setSelectedProperty(null);
            setTimerMinutes('');
            setTimerSeconds('');
          }
        } else {
          alert(t('admin_errorPrefix') + (data.error || t('admin_testing_timerDeleteFail')));
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(t('admin_errorPrefix') + (errorData.error || t('admin_testing_timerDeleteFail')));
      }
    } catch (e) {
      console.error('Ошибка при удалении таймера:', e);
      alert('admin_testing_timerDeleteError');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString(dateLocale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="testing-container">
      <div className="testing-header">
        <h2>{t('admin_testing_title')}</h2>
        <p>{t('admin_testing_subtitle')}</p>
      </div>

      <div className="testing-content">
        <div className="testing-left">
          <div className="testing-search">
            <FiSearch size={20} />
            <input
              type="text"
              placeholder={t('admin_testing_searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="testing-loading">{t('admin_testing_loadingListings')}</div>
          ) : error ? (
            <div className="testing-error">{error}</div>
          ) : (
            <div className="testing-properties-list">
              {filteredProperties.map((property) => {
                const hasTestTimer = testProperties.some(p => p.id === property.id && p.test_timer_end_date);
                return (
                  <div
                    key={property.id}
                    className={`testing-property-item ${selectedProperty?.id === property.id ? 'selected' : ''} ${hasTestTimer ? 'has-timer' : ''}`}
                    onClick={() => handleSelectProperty(property)}
                  >
                    <div className="testing-property-info">
                      <h4>{property.title || property.name || t('admin_untitled')}</h4>
                      <p>{property.location || t('admin_locationUnspecified')}</p>
                      {hasTestTimer && (
                        <div className="testing-timer-badge">
                          <FiClock size={14} />
                          <span>{t('admin_testing_timerSetBadge')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="testing-right">
          {selectedProperty ? (
            <div className="testing-selected">
              <div className="testing-selected-header">
                <h3>{t('admin_testing_selectedListing')}</h3>
                <button
                  className="testing-close-btn"
                  onClick={() => {
                    setSelectedProperty(null);
                    setTimerMinutes('');
                    setTimerSeconds('');
                  }}
                >
                  <FiX size={20} />
                </button>
              </div>

              <div className="testing-selected-info">
                <h4>{selectedProperty.title || selectedProperty.name || t('admin_untitled')}</h4>
                <p>{selectedProperty.location || t('admin_locationUnspecified')}</p>
              </div>

              <div className="testing-timer-form">
                <label>
                  <FiClock size={18} />
                  {t('admin_testing_minutes')}
                </label>
                <input
                  type="number"
                  min="0"
                  max="999"
                  placeholder="0"
                  value={timerMinutes}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || (parseInt(val) >= 0 && parseInt(val) <= 999)) {
                      setTimerMinutes(val);
                    }
                  }}
                />
              </div>

              <div className="testing-timer-form">
                <label>
                  <FiClock size={18} />
                  {t('admin_testing_seconds')}
                </label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  placeholder="0"
                  value={timerSeconds}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || (parseInt(val) >= 0 && parseInt(val) <= 59)) {
                      setTimerSeconds(val);
                    }
                  }}
                />
              </div>

              {(timerMinutes || timerSeconds) && (
                <div className="testing-timer-preview">
                  <p className="testing-timer-preview-label">{t('admin_testing_timerEndsIn')}</p>
                  <p className="testing-timer-preview-value">
                    {t('admin_testing_minSec', { min: parseInt(timerMinutes) || 0, sec: parseInt(timerSeconds) || 0 })}
                  </p>
                  <p className="testing-timer-preview-time">
                    ({new Date(Date.now() + (parseInt(timerMinutes) || 0) * 60000 + (parseInt(timerSeconds) || 0) * 1000).toLocaleString(dateLocale)})
                  </p>
                </div>
              )}

              <button
                className="testing-save-btn"
                onClick={handleSaveTimer}
                disabled={saving}
              >
                {saving ? t('admin_saving') : t('admin_testing_setTimer')}
              </button>
            </div>
          ) : (
            <div className="testing-placeholder">
              <FiClock size={48} />
              <p>{t('admin_testing_placeholder')}</p>
            </div>
          )}
        </div>
      </div>

      {testProperties.length > 0 && (
        <div className="testing-active-timers">
          <h3>{t('admin_testing_activeTimers')}</h3>
          <div className="testing-timers-list">
            {testProperties
              .filter(p => p.test_timer_end_date)
              .map((property) => (
                <div key={property.id} className="testing-timer-item">
                  <div className="testing-timer-item-info">
                    <h4>{property.title || property.name || t('admin_untitled')}</h4>
                    <p>{property.location || t('admin_locationUnspecified')}</p>
                    <span className="testing-timer-date">
                      {t('admin_testing_endsAt', { date: formatDate(property.test_timer_end_date) })}
                    </span>
                  </div>
                  <button
                    className="testing-delete-btn"
                    onClick={() => handleDeleteTimer(property.id)}
                  >
                    <FiX size={18} />
                    {t('admin_delete')}
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Testing;

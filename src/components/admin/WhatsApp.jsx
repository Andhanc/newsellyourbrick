import React, { useState, useMemo, useEffect, useRef } from 'react';
import { FiSearch, FiSend, FiUsers, FiFilter, FiCheck, FiX, FiRefreshCw } from 'react-icons/fi';
import { getApiBaseUrl } from '../../utils/apiConfig';
import './WhatsApp.css';

// Функция для получения названия языка по коду
const LEAD_TYPE_LABELS = {
  hot: 'Горячий',
  warm: 'Тёплый',
  cold: 'Холодный'
};

const LEAD_TYPE_CLASS = {
  hot: 'lead-type--hot',
  warm: 'lead-type--warm',
  cold: 'lead-type--cold'
};

const getLanguageName = (langCode) => {
  const names = {
    'ru': 'Русский',
    'en': 'Английский',
    'es': 'Испанский',
    'de': 'Немецкий',
    'fr': 'Французский',
    'it': 'Итальянский',
    'pt': 'Португальский',
    'pl': 'Польский',
    'tr': 'Турецкий',
    'uk': 'Украинский'
  };
  return names[langCode] || langCode || 'Не указан';
};

const WhatsApp = () => {
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [whatsappStatus, setWhatsappStatus] = useState({ ready: false, state: 'UNKNOWN' });
  const [qrTimestamp, setQrTimestamp] = useState(Date.now());
  const [qrAvailable, setQrAvailable] = useState(false);
  const qrRefreshRef = useRef(null);

  // Загрузка WhatsApp пользователей с сервера
  useEffect(() => {
    loadUsers();
    checkWhatsAppStatus();
    const statusInterval = setInterval(checkWhatsAppStatus, 30000);
    const onFocus = () => checkWhatsAppStatus();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(statusInterval);
      window.removeEventListener('focus', onFocus);
      if (qrRefreshRef.current) clearInterval(qrRefreshRef.current);
    };
  }, []);

  // Когда статус меняется — управляем обновлением QR
  useEffect(() => {
    if (qrRefreshRef.current) clearInterval(qrRefreshRef.current);

    if (!whatsappStatus.ready) {
      checkQrAvailability();
      qrRefreshRef.current = setInterval(() => {
        setQrTimestamp(Date.now());
        checkQrAvailability();
      }, 20000);
    } else {
      setQrAvailable(false);
    }
  }, [whatsappStatus.ready]);

  const checkQrAvailability = async () => {
    try {
      const res = await fetch('/api/whatsapp/qr', { method: 'HEAD' });
      setQrAvailable(res.ok);
    } catch {
      setQrAvailable(false);
    }
  };

  const checkWhatsAppStatus = async () => {
    try {
      const response = await fetch('/api/whatsapp/status');
      const data = await response.json();
      if (data.success) {
        setWhatsappStatus({
          ready: data.ready,
          state: data.state,
          message: data.message
        });
      }
    } catch (err) {
      console.error('Ошибка проверки статуса WhatsApp:', err);
    }
  };

  const handleRefreshQr = () => {
    setQrTimestamp(Date.now());
    checkQrAvailability();
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const API_BASE_URL = await getApiBaseUrl();
      const response = await fetch(`${API_BASE_URL}/whatsapp/users?limit=1000`);
      const data = await response.json();
      
      if (data.success) {
        setUsers(data.data || []);
      } else {
        setError(data.error || 'Ошибка загрузки пользователей');
      }
    } catch (err) {
      console.error('Ошибка загрузки WhatsApp пользователей:', err);
      setError('Не удалось загрузить пользователей');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    let filtered = users;

    // Поиск по имени, фамилии, email или телефону
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user => {
        const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
        const email = user.email.toLowerCase();
        const phone = user.phone.replace(/\s/g, '');
        return fullName.includes(query) || email.includes(query) || phone.includes(query);
      });
    }

    // Фильтр по роли
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Фильтр по статусу
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => user.status === statusFilter);
    }

    return filtered;
  }, [users, searchQuery, roleFilter, statusFilter]);

  const handleSelectUser = (userId) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
    setSelectAll(newSelected.size === filteredUsers.length && filteredUsers.length > 0);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedUsers(new Set());
      setSelectAll(false);
    } else {
      const allIds = new Set(filteredUsers.map(user => user.id));
      setSelectedUsers(allIds);
      setSelectAll(true);
    }
  };

  const handleDeselectAll = () => {
    setSelectedUsers(new Set());
    setSelectAll(false);
  };

  const selectedCount = selectedUsers.size;
  const totalCount = filteredUsers.length;

  // Функция отправки рассылки
  const handleSendBroadcast = async () => {
    if (!message.trim() || selectedCount === 0) {
      return;
    }

    setSending(true);
    setSendResult(null);
    setError(null);

    try {
      // Получаем номера телефонов выбранных пользователей
      const selectedPhoneNumbers = filteredUsers
        .filter(user => selectedUsers.has(user.id))
        .map(user => {
          // Используем phoneFull (с @c.us) если есть, иначе phone, иначе создаем из phone
          if (user.phoneFull) {
            return user.phoneFull;
          }
          if (user.phone) {
            // Если phone не содержит @c.us, добавляем его
            const digits = String(user.phone).replace(/\D/g, '');
            return digits ? `${digits}@c.us` : '';
          }
          return '';
        })
        .filter(phone => phone); // Убираем пустые значения

      const API_BASE_URL = await getApiBaseUrl();
      const response = await fetch(`${API_BASE_URL}/whatsapp/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message.trim(),
          phoneNumbers: selectedPhoneNumbers
        })
      });

      const data = await response.json();

      if (data.success) {
        setSendResult({
          success: true,
          message: data.message || 'Рассылка успешно отправлена',
          results: data.results
        });
        // Очищаем выбранных пользователей и сообщение после успешной отправки
        setSelectedUsers(new Set());
        setSelectAll(false);
        setMessage('');
      } else {
        setSendResult({
          success: false,
          message: data.error || 'Ошибка при отправке рассылки',
          results: data.results
        });
      }
    } catch (err) {
      console.error('Ошибка отправки рассылки:', err);
      setSendResult({
        success: false,
        message: 'Не удалось отправить рассылку. Проверьте подключение к серверу.'
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="whatsapp-container">
      <div className="whatsapp-header">
        <h2 className="whatsapp-title">
          <FiSend className="whatsapp-title-icon" />
          WhatsApp Рассылка
        </h2>
        <p className="whatsapp-subtitle">Отправка сообщений выбранным пользователям</p>
        {!whatsappStatus.ready && (
          <div className="whatsapp-status-warning">
            <div className="whatsapp-warning-top">
              <div>
                <span style={{ color: '#ef4444', fontWeight: '600' }}>⚠️ WhatsApp клиент не подключён</span>
                <p style={{ margin: '6px 0 0 0', fontSize: '0.9rem', color: '#6b7280' }}>
                  {qrAvailable
                    ? 'Отсканируйте QR-код телефоном через WhatsApp → Настройки → Связанные устройства → Привязать устройство'
                    : (whatsappStatus.message || 'QR-код ещё генерируется, подождите...')}
                </p>
              </div>
              <div className="whatsapp-warning-actions">
                <button onClick={handleRefreshQr} className="btn-qr-refresh" title="Обновить QR-код">
                  <FiRefreshCw />
                  Обновить QR
                </button>
                <button onClick={checkWhatsAppStatus} className="btn-qr-refresh" title="Проверить статус">
                  <FiRefreshCw />
                  Проверить статус
                </button>
              </div>
            </div>
            {qrAvailable && (
              <div className="whatsapp-qr-block">
                <img
                  src={`/api/whatsapp/qr?t=${qrTimestamp}`}
                  alt="WhatsApp QR-код"
                  className="whatsapp-qr-image"
                  onError={() => setQrAvailable(false)}
                />
                <p className="whatsapp-qr-hint">QR-код обновляется автоматически каждые 20 секунд</p>
              </div>
            )}
          </div>
        )}
        {whatsappStatus.ready && (
          <div className="whatsapp-status-success">
            <span style={{ color: '#10b981', fontWeight: '600' }}>✅ WhatsApp клиент готов</span>
          </div>
        )}
      </div>

      <div className="whatsapp-content">
        {/* Левая колонка - Сообщение и статистика */}
        <div className="whatsapp-left">
          <div className="message-section">
            <label className="message-label">
              <FiSend className="label-icon" />
              Сообщение для рассылки
            </label>
            <textarea
              className="message-textarea"
              placeholder="Введите текст сообщения, которое будет отправлено выбранным пользователям..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={12}
            />
            <div className="message-footer">
              <span className="message-counter">
                {message.length} / 1000 символов
              </span>
              <button 
                className="btn-send" 
                disabled={!message.trim() || selectedCount === 0 || sending || !whatsappStatus.ready}
                onClick={handleSendBroadcast}
                title={!whatsappStatus.ready ? 'WhatsApp клиент не готов. Проверьте статус выше.' : ''}
              >
                {sending ? (
                  <>
                    <FiRefreshCw style={{ animation: 'spin 1s linear infinite' }} />
                    Отправка...
                  </>
                ) : (
                  <>
                    <FiSend />
                    Отправить ({selectedCount})
                  </>
                )}
              </button>
            </div>
            {sendResult && (
              <div className={`send-result ${sendResult.success ? 'send-result--success' : 'send-result--error'}`}>
                <p>{sendResult.message}</p>
                {sendResult.results && (
                  <p style={{ fontSize: '0.9rem', marginTop: '8px' }}>
                    Отправлено: {sendResult.results.sent} из {sendResult.results.total}
                    {sendResult.results.failed > 0 && `, Ошибок: ${sendResult.results.failed}`}
                  </p>
                )}
                <button 
                  onClick={() => setSendResult(null)}
                  style={{ 
                    marginTop: '8px', 
                    padding: '4px 8px', 
                    background: 'transparent', 
                    border: '1px solid currentColor', 
                    borderRadius: '4px', 
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  Закрыть
                </button>
              </div>
            )}
          </div>

          <div className="stats-section">
            <div className="stat-card">
              <div className="stat-icon stat-icon--selected">
                <FiUsers />
              </div>
              <div className="stat-info">
                <div className="stat-value">{selectedCount}</div>
                <div className="stat-label">Выбрано пользователей</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon--total">
                <FiUsers />
              </div>
              <div className="stat-info">
                <div className="stat-value">{totalCount}</div>
                <div className="stat-label">Всего в списке</div>
              </div>
            </div>
          </div>
        </div>

        {/* Правая колонка - Список пользователей и фильтры */}
        <div className="whatsapp-right">
          <div className="users-section">
            <div className="users-header">
              <h3 className="users-title">Выбор получателей</h3>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button 
                  className="btn-clear-selection" 
                  onClick={loadUsers}
                  title="Обновить список"
                  style={{ padding: '8px', background: '#f0f0f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  <FiRefreshCw />
                </button>
                {selectedCount > 0 && (
                  <button className="btn-clear-selection" onClick={handleDeselectAll}>
                    <FiX />
                    Снять выделение
                  </button>
                )}
              </div>
            </div>

            {/* Фильтры */}
            <div className="users-filters">
              <div className="filter-search">
                <FiSearch className="search-icon" />
                <input
                  type="text"
                  className="filter-input"
                  placeholder="Поиск по имени, email или телефону..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button className="clear-search" onClick={() => setSearchQuery('')}>
                    <FiX />
                  </button>
                )}
              </div>

              <div className="filter-buttons">
                <div className="filter-group">
                  <span className="filter-label">
                    <FiFilter />
                    Роль:
                  </span>
                  <div className="filter-options">
                    <button
                      className={`filter-btn ${roleFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setRoleFilter('all')}
                    >
                      Все
                    </button>
                    <button
                      className={`filter-btn ${roleFilter === 'buyer' ? 'active' : ''}`}
                      onClick={() => setRoleFilter('buyer')}
                    >
                      Покупатели
                    </button>
                    <button
                      className={`filter-btn ${roleFilter === 'seller' ? 'active' : ''}`}
                      onClick={() => setRoleFilter('seller')}
                    >
                      Продавцы
                    </button>
                  </div>
                </div>

                <div className="filter-group">
                  <span className="filter-label">
                    <FiFilter />
                    Статус:
                  </span>
                  <div className="filter-options">
                    <button
                      className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setStatusFilter('all')}
                    >
                      Все
                    </button>
                    <button
                      className={`filter-btn ${statusFilter === 'active' ? 'active' : ''}`}
                      onClick={() => setStatusFilter('active')}
                    >
                      Активные
                    </button>
                    <button
                      className={`filter-btn ${statusFilter === 'pending' ? 'active' : ''}`}
                      onClick={() => setStatusFilter('pending')}
                    >
                      Ожидают
                    </button>
                    <button
                      className={`filter-btn ${statusFilter === 'blocked' ? 'active' : ''}`}
                      onClick={() => setStatusFilter('blocked')}
                    >
                      Заблокированы
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Список пользователей */}
            <div className="users-list-container">
              <div className="users-list-header">
                <label className="checkbox-select-all">
                  <input
                    type="checkbox"
                    checked={selectAll && filteredUsers.length > 0}
                    onChange={handleSelectAll}
                  />
                  <span>Выбрать всех ({filteredUsers.length})</span>
                </label>
              </div>

              <div className="users-list">
                {loading ? (
                  <div className="users-empty">
                    <FiRefreshCw className="empty-icon" style={{ animation: 'spin 1s linear infinite' }} />
                    <p>Загрузка пользователей...</p>
                  </div>
                ) : error ? (
                  <div className="users-empty">
                    <FiUsers className="empty-icon" />
                    <p>Ошибка загрузки</p>
                    <span>{error}</span>
                    <button onClick={loadUsers} style={{ marginTop: '10px', padding: '8px 16px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                      Попробовать снова
                    </button>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="users-empty">
                    <FiUsers className="empty-icon" />
                    <p>Пользователи не найдены</p>
                    <span>Попробуйте изменить параметры фильтрации</span>
                  </div>
                ) : (
                  filteredUsers.map(user => {
                    const isSelected = selectedUsers.has(user.id);
                    return (
                      <div
                        key={user.id}
                        className={`user-card ${isSelected ? 'user-card--selected' : ''} ${user.status === 'blocked' ? 'user-card--blocked' : ''}`}
                        onClick={() => handleSelectUser(user.id)}
                      >
                        <div className="user-card-checkbox">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectUser(user.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div className="user-card-avatar">
                          {user.firstName && user.lastName ? (
                            <div className="avatar-placeholder">
                              {user.firstName[0]}{user.lastName[0]}
                            </div>
                          ) : (
                            <div className="avatar-placeholder">
                              <FiUsers />
                            </div>
                          )}
                        </div>
                        <div className="user-card-info">
                          <div className="user-card-name">
                            <h4>
                              {user.firstName} {user.lastName}
                              <span
                                className={`lead-type-badge ${LEAD_TYPE_CLASS[user.leadType || 'cold'] || ''}`}
                                title="Оценка по переписке в WhatsApp"
                              >
                                {LEAD_TYPE_LABELS[user.leadType || 'cold'] || user.leadType}
                              </span>
                            </h4>
                            {user.verified && (
                              <span className="verified-badge">
                                <FiCheck />
                                Верифицирован
                              </span>
                            )}
                          </div>
                          <div className="user-card-details">
                            {user.email && (
                              <span className="user-detail">
                                <strong>Email:</strong> {user.email}
                              </span>
                            )}
                            <span className="user-detail">
                              <strong>Телефон:</strong> {user.phone || user.phoneFull || 'Не указан'}
                            </span>
                            {user.country && (
                              <span className="user-detail">
                                <strong>Страна:</strong> {user.country}
                              </span>
                            )}
                            {user.language && (
                              <span className="user-detail">
                                <strong>Язык:</strong> {getLanguageName(user.language)}
                              </span>
                            )}
                            <span className={`user-role user-role--${user.role}`}>
                              {user.role === 'buyer' ? 'Покупатель' : 'Продавец'}
                            </span>
                            <span className={`user-status user-status--${user.status}`}>
                              {user.status === 'active' ? 'Активен' : user.status === 'pending' ? 'Ожидает' : 'Заблокирован'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsApp;


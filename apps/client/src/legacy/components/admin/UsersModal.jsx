import React, { useState, useEffect } from 'react';
import { FiSearch, FiUser, FiMail, FiPhone, FiMapPin, FiCalendar, FiShield, FiShieldOff } from 'react-icons/fi';
import { getApiBaseUrl, getApiBaseUrlSync } from '../../utils/apiConfig';
import './UsersModal.css';

// Константа для базового URL без /api (для изображений)
const API_BASE_URL_WITHOUT_API = getApiBaseUrlSync().replace('/api', '');

const UsersModal = ({ isOpen, onClose, businessInfo }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const API_BASE_URL = await getApiBaseUrl();
      const response = await fetch(`${API_BASE_URL}/users?limit=1000`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setUsers(result.data);
        } else {
          setError('Не удалось загрузить пользователей');
        }
      } else {
        setError('Ошибка при загрузке пользователей');
      }
    } catch (error) {
      console.error('Ошибка при загрузке пользователей:', error);
      setError('Ошибка при загрузке пользователей');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getFullName = (user) => {
    const firstName = user.first_name || '';
    const lastName = user.last_name || '';
    return `${firstName} ${lastName}`.trim() || 'Не указано';
  };

  const filteredUsers = users.filter(user => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const fullName = getFullName(user).toLowerCase();
    const email = (user.email || '').toLowerCase();
    const phone = (user.phone_number || '').toLowerCase();
    const country = (user.country || '').toLowerCase();
    return (
      fullName.includes(term) ||
      email.includes(term) ||
      phone.includes(term) ||
      country.includes(term) ||
      (user.telegram_id && user.telegram_id.toString().includes(term))
    );
  });

  return (
    <div className="users-modal-overlay" onClick={(e) => e.target.classList.contains('users-modal-overlay') && onClose()}>
      <div className="users-modal-content">
        <div className="users-modal-header">
          <h3 className="users-modal-title">
            <FiUser className="users-modal-title-icon" />
            Все пользователи
          </h3>
          <button className="users-modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="users-modal-search">
          <div className="users-modal-search-wrapper">
            <FiSearch className="users-modal-search-icon" />
            <input
              type="text"
              className="users-modal-search-input"
              placeholder="Поиск по имени, email, телефону, стране..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="users-modal-stats">
            <span className="users-modal-stats-text">
              {isLoading ? 'Загрузка...' : searchTerm ? `Найдено: ${filteredUsers.length} из ${users.length}` : `Всего: ${users.length}`}
            </span>
          </div>
        </div>

        <div className="users-modal-body">
          {isLoading ? (
            <div className="users-modal-loading">
              <div className="users-modal-spinner"></div>
              <p>Загрузка пользователей...</p>
            </div>
          ) : error ? (
            <div className="users-modal-error">
              <p>{error}</p>
              <button onClick={fetchUsers} className="users-modal-retry-btn">Попробовать снова</button>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="users-modal-empty">
              <FiUser className="users-modal-empty-icon" />
              <p>{searchTerm ? 'Пользователи не найдены' : 'Нет зарегистрированных пользователей'}</p>
            </div>
          ) : (
            <div className="users-modal-table-wrapper">
              <table className="users-modal-table">
                <thead>
                  <tr>
                    <th>Пользователь</th>
                    <th>Контакт</th>
                    <th>Страна</th>
                    <th>Роль</th>
                    <th>Статус</th>
                    <th>Дата регистрации</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(user => (
                    <tr key={user.id} className={user.is_blocked ? 'users-modal-row-blocked' : ''}>
                      <td>
                        <div className="users-modal-user-info">
                          {user.user_photo ? (
                            <img 
                              src={user.user_photo.startsWith('http') ? user.user_photo : `${API_BASE_URL_WITHOUT_API}${user.user_photo}`}
                              alt={getFullName(user)}
                              className="users-modal-avatar"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div className="users-modal-avatar-placeholder" style={{ display: user.user_photo ? 'none' : 'flex' }}>
                            <FiUser />
                          </div>
                          <div className="users-modal-user-details">
                            <span className="users-modal-user-name">{getFullName(user)}</span>
                            {user.telegram_id && (
                              <span className="users-modal-user-telegram">ID: {user.telegram_id}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="users-modal-contact">
                          {user.email && (
                            <div className="users-modal-contact-item">
                              <FiMail className="users-modal-contact-icon" />
                              <span>{user.email}</span>
                            </div>
                          )}
                          {user.phone_number && (
                            <div className="users-modal-contact-item">
                              <FiPhone className="users-modal-contact-icon" />
                              <span>{user.phone_number}</span>
                            </div>
                          )}
                          {!user.email && !user.phone_number && <span className="users-modal-no-contact">-</span>}
                        </div>
                      </td>
                      <td>
                        {user.country ? (
                          <div className="users-modal-country">
                            <FiMapPin className="users-modal-country-icon" />
                            <span>{user.country}</span>
                          </div>
                        ) : (
                          <span className="users-modal-no-data">Не указано</span>
                        )}
                      </td>
                      <td>
                        <span className={`users-modal-role users-modal-role-${user.role || 'buyer'}`}>
                          {user.role === 'seller' ? 'Продавец' : 'Покупатель'}
                        </span>
                      </td>
                      <td>
                        <div className="users-modal-status">
                          {user.is_blocked ? (
                            <>
                              <FiShieldOff className="users-modal-status-icon users-modal-status-blocked" />
                              <span>Заблокирован</span>
                            </>
                          ) : user.is_verified ? (
                            <>
                              <FiShield className="users-modal-status-icon users-modal-status-verified" />
                              <span>Верифицирован</span>
                            </>
                          ) : (
                            <>
                              <FiShield className="users-modal-status-icon users-modal-status-pending" />
                              <span>На модерации</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="users-modal-date">
                          <FiCalendar className="users-modal-date-icon" />
                          <span>{formatDate(user.created_at)}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UsersModal;



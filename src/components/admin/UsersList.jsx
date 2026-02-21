import React, { useState, useMemo, useEffect } from 'react';
import { FiSearch, FiUser, FiUserCheck, FiShield, FiShieldOff, FiX } from 'react-icons/fi';
import UserDetailModal from './UserDetailModal';
import { getApiBaseUrl, getApiBaseUrlSync } from '../../utils/apiConfig';
import { showNotification } from '../../utils/toastHelper';
import './UsersList.css';

// Константа для базового URL без /api (для изображений)
const API_BASE_URL_WITHOUT_API = getApiBaseUrlSync().replace('/api', '');

const UsersList = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Загружаем реальных пользователей из БД
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const API_BASE_URL = await getApiBaseUrl();
        const response = await fetch(`${API_BASE_URL}/users?limit=1000`);
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            // Преобразуем данные из БД в формат, который ожидает компонент
            const transformedUsers = result.data.map(user => {
              // Формируем URL для аватара, если есть user_photo
              let avatarUrl = null;
              if (user.user_photo) {
                if (user.user_photo.startsWith('http')) {
                  avatarUrl = user.user_photo;
                } else {
                  avatarUrl = `${API_BASE_URL_WITHOUT_API}${user.user_photo}`;
                }
              }
              
              return {
                id: user.id,
                firstName: user.first_name || '',
                lastName: user.last_name || '',
                avatar: avatarUrl,
                role: user.role || 'buyer', // 'buyer' или 'seller'
                moderationStatus: user.is_verified ? 'approved' : 'pending',
                isBlocked: user.is_blocked === 1, // Читаем из БД
                email: user.email || '',
                phone: user.phone_number || '',
                registrationDate: user.created_at || new Date().toISOString(),
                objectsCount: 0 // Пока нет связи с объектами, используем 0
              };
            });
            
            setUsers(transformedUsers);
          } else {
            setError('Не удалось загрузить пользователей');
          }
        } else {
          setError('Ошибка при загрузке пользователей');
        }
      } catch (err) {
        console.error('❌ Ошибка при загрузке пользователей:', err);
        setError('Произошла ошибка при загрузке пользователей');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    if (!searchQuery && roleFilter === 'all' && statusFilter === 'all') {
      return users;
    }
    
    return users.filter(user => {
      // Поиск по имени, фамилии или email
      const matchesSearch = !searchQuery || (() => {
        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase().trim();
        const email = (user.email || '').toLowerCase();
        const searchLower = searchQuery.toLowerCase();
        return fullName.includes(searchLower) || email.includes(searchLower);
      })();
      
      // Фильтр по роли
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      
      // Фильтр по статусу
      let matchesStatus = true;
      if (statusFilter === 'blocked') {
        matchesStatus = user.isBlocked === true;
      } else if (statusFilter === 'pending' || statusFilter === 'approved') {
        matchesStatus = !user.isBlocked && user.moderationStatus === statusFilter;
      } else if (statusFilter === 'all') {
        matchesStatus = true;
      }
      
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [searchQuery, roleFilter, statusFilter, users]);

  const handleBlock = async (userId) => {
    const user = users.find(u => u.id === userId);
    const action = user?.isBlocked ? 'разблокировать' : 'заблокировать';
    
    if (window.confirm(`Вы уверены, что хотите ${action} этого пользователя?`)) {
      try {
        const API_BASE_URL = await getApiBaseUrl();
        const endpoint = user?.isBlocked 
          ? `${API_BASE_URL}/users/${userId}/unblock`
          : `${API_BASE_URL}/users/${userId}/block`;
        
        const response = await fetch(endpoint, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            // Обновляем локальное состояние
            setUsers(users.map(user => 
              user.id === userId ? { ...user, isBlocked: !user.isBlocked } : user
            ));
            
            // Показываем сообщение об успехе
            showNotification(`Пользователь успешно ${action === 'заблокировать' ? 'заблокирован' : 'разблокирован'}`);
          } else {
            showNotification(`Ошибка: ${result.error || 'Не удалось изменить статус блокировки'}`);
          }
        } else {
          const errorData = await response.json();
          showNotification(`Ошибка: ${errorData.error || 'Не удалось изменить статус блокировки'}`);
        }
      } catch (error) {
        console.error('Ошибка при изменении статуса блокировки:', error);
        showNotification('Произошла ошибка при изменении статуса блокировки');
      }
    }
  };

  const getRoleLabel = (role) => {
    return role === 'buyer' ? 'Покупатель' : 'Продавец';
  };

  const getRoleIcon = (role) => {
    return role === 'buyer' ? <FiUser size={18} /> : <FiUserCheck size={18} />;
  };

  const getStatusLabel = (status) => {
    return status === 'approved' ? 'Одобрен' : 'На модерации';
  };

  const getStatusBadgeClass = (status) => {
    return status === 'approved' ? 'status-badge--approved' : 'status-badge--pending';
  };

  return (
    <div className="users-list-container">
      <div className="users-filter">
        <div className="filter-search">
          <FiSearch className="search-icon" size={20} />
          <input
            type="text"
            placeholder="Поиск по имени, фамилии или email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="filter-input"
          />
          {searchQuery && (
            <button 
              className="clear-search"
              onClick={() => setSearchQuery('')}
              aria-label="Очистить поиск"
            >
              <FiX size={18} />
            </button>
          )}
        </div>
        
        <div className="filter-buttons">
          <div className="filter-group">
            <label className="filter-label">Роль:</label>
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
            <label className="filter-label">Статус:</label>
            <div className="filter-options">
              <button
                className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                Все
              </button>
              <button
                className={`filter-btn ${statusFilter === 'pending' ? 'active' : ''}`}
                onClick={() => setStatusFilter('pending')}
              >
                На модерации
              </button>
              <button
                className={`filter-btn ${statusFilter === 'approved' ? 'active' : ''}`}
                onClick={() => setStatusFilter('approved')}
              >
                Одобрены
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

      {isLoading ? (
        <div className="users-loading">
          <p>Загрузка пользователей...</p>
        </div>
      ) : error ? (
        <div className="users-error">
          <p>Ошибка: {error}</p>
          <button onClick={() => window.location.reload()}>Попробовать снова</button>
        </div>
      ) : (
        <div className="users-list">
          {filteredUsers.length === 0 ? (
            <div className="users-empty">
              <p>Пользователи не найдены</p>
            </div>
          ) : (
            filteredUsers.map(user => (
            <div 
              key={user.id} 
              className={`user-card ${user.isBlocked ? 'user-card--blocked' : ''}`}
              onClick={() => {
                setSelectedUserId(user.id);
                setIsDetailModalOpen(true);
              }}
              style={{ cursor: 'pointer' }}
            >
              <div className="user-card__avatar">
                {user.avatar ? (
                  <img 
                    src={user.avatar} 
                    alt={`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User'} 
                    className="user-card__avatar-image"
                    onError={(e) => {
                      // Если фото не загрузилось, показываем стандартный аватар
                      e.target.style.display = 'none';
                      const placeholder = e.target.nextSibling;
                      if (placeholder) {
                        placeholder.style.display = 'flex';
                      }
                    }}
                  />
                ) : null}
                <div 
                  className="user-card__avatar-placeholder"
                  style={{ display: user.avatar ? 'none' : 'flex' }}
                >
                  <FiUser size={20} />
                </div>
              </div>
              
              <div className="user-card__info">
                <div className="user-card__name">
                  <h3>
                    {`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Без имени'}
                  </h3>
                  {user.isBlocked && (
                    <span className="blocked-badge">Заблокирован</span>
                  )}
                </div>
                <p className="user-card__email">{user.email || user.phone || 'Нет контактов'}</p>
                
                <div className="user-card__meta">
                  <div className="user-meta-item">
                    <span className="meta-label">Роль:</span>
                    <span className={`meta-value meta-value--role meta-value--${user.role}`}>
                      {getRoleIcon(user.role)}
                      {getRoleLabel(user.role)}
                    </span>
                  </div>
                  
                  <div className="user-meta-item">
                    <span className="meta-label">Регистрация:</span>
                    <span className="meta-value">
                      {user.registrationDate 
                        ? (() => {
                            try {
                              return new Date(user.registrationDate).toLocaleDateString('ru-RU');
                            } catch (e) {
                              return 'Не указано';
                            }
                          })()
                        : 'Не указано'}
                    </span>
                  </div>
                  
                  <div className="user-meta-item">
                    <span className="meta-label">
                      {user.role === 'buyer' ? 'Куплено объектов:' : 'Выставлено объектов:'}
                    </span>
                    <span className="meta-value meta-value--objects">{user.objectsCount || 0}</span>
                  </div>
                </div>
              </div>
              
              <div className="user-card__actions" onClick={(e) => e.stopPropagation()}>
                <button
                  className={`btn-action ${user.isBlocked ? 'btn-action--unblock' : 'btn-action--block'}`}
                  onClick={() => handleBlock(user.id)}
                  title={user.isBlocked ? 'Разблокировать' : 'Заблокировать'}
                >
                  {user.isBlocked ? 'Разблокировать' : 'Заблокировать'}
                </button>
              </div>
              </div>
            ))
          )}
        </div>
      )}

      {!isLoading && !error && (
        <div className="users-stats">
          <div className="stat-item">
            <span className="stat-label">Всего пользователей:</span>
            <span className="stat-value">{users.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Найдено:</span>
            <span className="stat-value">{filteredUsers.length}</span>
          </div>
          </div>
        )}

      <UserDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedUserId(null);
        }}
        userId={selectedUserId}
      />
    </div>
  );
};

export default UsersList;



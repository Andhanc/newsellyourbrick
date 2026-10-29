import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FiSearch, FiUser, FiUserCheck, FiShield, FiShieldOff, FiX } from 'react-icons/fi';
import UserDetailModal from './UserDetailModal';
import { getApiBaseUrl, getApiBaseUrlSync } from '../../utils/apiConfig';
import { showNotification } from '../../utils/toastHelper';
import './UsersList.css';
import { getUiIntlLocale } from '../../utils/uiIntlLocale'

// Константа для базового URL без /api (для изображений)
const API_BASE_URL_WITHOUT_API = getApiBaseUrlSync().replace('/api', '');

const UsersList = () => {
  const { t } = useTranslation();
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
                role: user.role || 'buyer', // buyer | seller
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
            setError(t('admin_usersLoadFail'));
          }
        } else {
          setError(t('admin_usersLoadError'));
        }
      } catch (err) {
        console.error('❌ Ошибка при загрузке пользователей:', err);
        setError(t('admin_usersLoadErrorGeneric'));
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
    const confirmMsg = user?.isBlocked
      ? t('admin_user_confirmUnblock')
      : t('admin_user_confirmBlock');
    
    if (window.confirm(confirmMsg)) {
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
            setUsers(users.map(user => 
              user.id === userId ? { ...user, isBlocked: !user.isBlocked } : user
            ));
            
            showNotification(
              user?.isBlocked ? t('admin_user_unblockedOk') : t('admin_user_blockedOk')
            );
          } else {
            showNotification(
              `${t('admin_error')}: ${result.error || t('admin_user_blockStatusChangeFail')}`
            );
          }
        } else {
          const errorData = await response.json();
          showNotification(
            `${t('admin_error')}: ${errorData.error || t('admin_user_blockStatusChangeFail')}`
          );
        }
      } catch (error) {
        console.error('Block status change error:', error);
        showNotification(t('admin_panel_blockStatusError'));
      }
    }
  };

  const getRoleLabel = (role) => {
    return role === 'buyer' ? t('admin_buyer') : t('admin_seller');
  };

  const getRoleIcon = (role) => {
    return role === 'buyer' ? <FiUser size={18} /> : <FiUserCheck size={18} />;
  };

  const getStatusLabel = (status) => {
    return status === 'approved' ? t('admin_odobren_0a0f1509') : t('admin_na_moderacii_29c1e27e');
  };

  const getStatusBadgeClass = (status) => {
    return status === 'approved' ? 'status-badge--approved' : 'status-badge--pending';
  };

  return (
    <div className="admin-users-list-container">
      <div className="users-filter">
        <div className="filter-search">
          <FiSearch className="search-icon" size={20} />
          <input
            type="text"
            placeholder={t('admin_searchNameLastEmail')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="filter-input"
          />
          {searchQuery && (
            <button 
              className="clear-search"
              onClick={() => setSearchQuery('')}
              aria-label={t('admin_clearSearch')}
            >
              <FiX size={18} />
            </button>
          )}
        </div>
        
        <div className="filter-buttons">
          <div className="filter-group">
            <label className="filter-label">{t('admin_rol_86bc8f1a')}</label>
            <div className="filter-options">
              <button
                className={`filter-btn ${roleFilter === 'all' ? 'active' : ''}`}
                onClick={() => setRoleFilter('all')}
              >
                {t('admin_all')}
              </button>
              <button
                className={`filter-btn ${roleFilter === 'buyer' ? 'active' : ''}`}
                onClick={() => setRoleFilter('buyer')}
              >
                {t('admin_pokupateli_c6e3359b')}
              </button>
              <button
                className={`filter-btn ${roleFilter === 'seller' ? 'active' : ''}`}
                onClick={() => setRoleFilter('seller')}
              >
                {t('admin_prodavcy_013f28e0')}
              </button>
            </div>
          </div>

          <div className="filter-group">
            <label className="filter-label">{t('admin_status_b90462b6')}</label>
            <div className="filter-options">
              <button
                className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                {t('admin_all')}
              </button>
              <button
                className={`filter-btn ${statusFilter === 'pending' ? 'active' : ''}`}
                onClick={() => setStatusFilter('pending')}
              >
                {t('admin_na_moderacii_29c1e27e')}
              </button>
              <button
                className={`filter-btn ${statusFilter === 'approved' ? 'active' : ''}`}
                onClick={() => setStatusFilter('approved')}
              >
                {t('admin_odobreny_f6815dc8')}
              </button>
              <button
                className={`filter-btn ${statusFilter === 'blocked' ? 'active' : ''}`}
                onClick={() => setStatusFilter('blocked')}
              >
                {t('admin_zablokirovany_862c58ba')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="users-loading">
          <p>{t('admin_zagruzka_polzovateley_983713a1')}</p>
        </div>
      ) : error ? (
        <div className="users-error">
          <p>{t('admin_errorPrefix')}{error}</p>
          <button onClick={() => window.location.reload()}>{t('admin_tryAgain')}</button>
        </div>
      ) : (
        <div className="admin-users-list">
          {filteredUsers.length === 0 ? (
            <div className="users-empty">
              <p>{t('admin_polzovateli_ne_naydeny_942d94c3')}</p>
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
                    {`${user.firstName || ''} ${user.lastName || ''}`.trim() || t('admin_bez_imeni_cdf641f2')}
                  </h3>
                  {user.isBlocked && (
                    <span className="blocked-badge">{t('admin_zablokirovan_2c998bfc')}</span>
                  )}
                </div>
                <p className="user-card__email">{user.email || user.phone || t('admin_net_kontaktov_19c1e680')}</p>
                
                <div className="user-card__meta">
                  <div className="user-meta-item">
                    <span className="meta-label">{t('admin_rol_86bc8f1a')}</span>
                    <span className={`meta-value meta-value--role meta-value--${user.role}`}>
                      {getRoleIcon(user.role)}
                      {getRoleLabel(user.role)}
                    </span>
                  </div>
                  
                  <div className="user-meta-item">
                    <span className="meta-label">{t('admin_registraciya_fa3af185')}</span>
                    <span className="meta-value">
                      {user.registrationDate 
                        ? (() => {
                            try {
                              return new Date(user.registrationDate).toLocaleDateString(getUiIntlLocale());
                            } catch (e) {
                              return t('admin_notSpecified');
                            }
                          })()
                        : t('admin_notSpecified')}
                    </span>
                  </div>
                  
                  <div className="user-meta-item">
                    <span className="meta-label">
                      {user.role === 'buyer' ? t('admin_kupleno_obektov_40df0f0a') : t('admin_vystavleno_obektov_8ddd6156')}
                    </span>
                    <span className="meta-value meta-value--objects">{user.objectsCount || 0}</span>
                  </div>
                </div>
              </div>
              
              <div className="user-card__actions" onClick={(e) => e.stopPropagation()}>
                <button
                  className={`btn-action ${user.isBlocked ? 'btn-action--unblock' : 'btn-action--block'}`}
                  onClick={() => handleBlock(user.id)}
                  title={user.isBlocked ? t('admin_unblock') : t('admin_block')}
                >
                  {user.isBlocked ? t('admin_unblock') : t('admin_block')}
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
            <span className="stat-label">{t('admin_vsego_polzovateley_9aefbeab')}</span>
            <span className="stat-value">{users.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">{t('admin_naydeno_df119811')}</span>
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



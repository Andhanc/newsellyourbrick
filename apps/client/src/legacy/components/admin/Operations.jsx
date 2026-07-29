import React, { useState } from 'react';
import './Operations.css';

const Operations = ({ businessInfo }) => {
  const [activeFilter, setActiveFilter] = useState('all-users');

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('ru-RU').format(value);
  };

  const getBadgeClass = (levelName) => {
    if (!levelName) return 'bronze';
    return levelName.toLowerCase();
  };

  return (
    <div className="content-section" id="operations-section">
      <div className="operations-header">
        <h2 className="page-title">История операций</h2>
        <div className="header-actions">
          <div className="filter-buttons" style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className={`btn ${activeFilter === 'all-users' ? 'btn-primary active' : 'btn-outline'} filter-btn`}
              onClick={() => setActiveFilter('all-users')}
            >
              <i className="fas fa-users"></i> Все пользователи
            </button>
            <button
              className={`btn ${activeFilter === 'promo-history' ? 'btn-primary active' : 'btn-outline'} filter-btn`}
              onClick={() => setActiveFilter('promo-history')}
            >
              <i className="fas fa-history"></i> История акций
            </button>
            <button
              className={`btn ${activeFilter === 'purchases' ? 'btn-primary active' : 'btn-outline'} filter-btn`}
              onClick={() => setActiveFilter('purchases')}
            >
              <i className="fas fa-shopping-cart"></i> Покупки
            </button>
          </div>
        </div>
      </div>

      <div className="operations-table-container">
        {activeFilter === 'all-users' && (
          <table className="operations-table">
            <thead>
              <tr>
                <th>Имя</th>
                <th>Username</th>
                <th>Telegram ID</th>
                <th>Дата регистрации</th>
                <th>Всего баллов</th>
              </tr>
            </thead>
            <tbody>
              {businessInfo.all_users && businessInfo.all_users.length > 0 ? (
                businessInfo.all_users.map(user => (
                  <tr key={user.id}>
                    <td>{user.full_name || 'Не указано'}</td>
                    <td>@{user.username || '-'}</td>
                    <td>{user.telegram_id}</td>
                    <td>{formatDate(user.registration_date)}</td>
                    <td>{user.total_points}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '30px' }}>
                    Нет зарегистрированных пользователей
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {activeFilter === 'promo-history' && (
          <table className="operations-table">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Действие</th>
                <th>Акция</th>
                <th>Детали</th>
                <th>Пользователь</th>
              </tr>
            </thead>
            <tbody>
              {businessInfo.promo_history && businessInfo.promo_history.length > 0 ? (
                businessInfo.promo_history.map(history => (
                  <tr key={history.id}>
                    <td>{formatDate(history.action_date)}</td>
                    <td>
                      {history.action === 'created' && <span style={{ color: 'green' }}>Создана</span>}
                      {history.action === 'updated' && <span style={{ color: 'blue' }}>Обновлена</span>}
                      {history.action === 'deleted' && <span style={{ color: 'red' }}>Удалена</span>}
                      {!['created', 'updated', 'deleted'].includes(history.action) && history.action}
                    </td>
                    <td>{history.promotion_title || 'N/A'}</td>
                    <td>{history.details || ''}</td>
                    <td>{history.user_name || 'Администратор'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '30px' }}>
                    Нет истории операций с акциями
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {activeFilter === 'purchases' && (
          <table className="operations-table">
            <thead>
              <tr>
                <th>Дата покупки</th>
                <th>Клиент</th>
                <th>Уровень</th>
                <th>Потрачено баллов</th>
                <th>Сумма покупки</th>
              </tr>
            </thead>
            <tbody>
              {businessInfo.purchases && businessInfo.purchases.length > 0 ? (
                businessInfo.purchases.map(purchase => (
                  <tr key={purchase.id}>
                    <td>{formatDate(purchase.created_at)}</td>
                    <td>{purchase.full_name || 'Не указано'} ({purchase.username || purchase.telegram_id})</td>
                    <td>
                      <span className={`badge ${getBadgeClass(purchase.level_name)}`}>
                        {purchase.level_name || 'Bronze'}
                      </span>
                    </td>
                    <td>{purchase.points_used || 0}</td>
                    <td>{formatCurrency(purchase.amount)} Byn</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '30px' }}>
                    Нет операций покупок
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Operations;



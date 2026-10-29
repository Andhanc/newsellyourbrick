import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './Operations.css';
import { getUiIntlLocale } from '../../utils/uiIntlLocale'

const Operations = ({ businessInfo }) => {
  const { t } = useTranslation();
  const [activeFilter, setActiveFilter] = useState('all-users');

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString(getUiIntlLocale(), {
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
        <h2 className="page-title">{t('admin_istoriya_operaciy_634dc2b7')}</h2>
        <div className="header-actions">
          <div className="filter-buttons" style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className={`btn ${activeFilter === 'all-users' ? 'btn-primary active' : 'btn-outline'} filter-btn`}
              onClick={() => setActiveFilter('all-users')}
            >
              <i className="fas fa-users"></i> {t('admin_vse_polzovateli_13f05419')}
            </button>
            <button
              className={`btn ${activeFilter === 'promo-history' ? 'btn-primary active' : 'btn-outline'} filter-btn`}
              onClick={() => setActiveFilter('promo-history')}
            >
              <i className="fas fa-history"></i> {t('admin_istoriya_akciy_cc9f86b2')}
            </button>
            <button
              className={`btn ${activeFilter === 'purchases' ? 'btn-primary active' : 'btn-outline'} filter-btn`}
              onClick={() => setActiveFilter('purchases')}
            >
              <i className="fas fa-shopping-cart"></i> {t('admin_pokupki_42426008')}
            </button>
          </div>
        </div>
      </div>

      <div className="operations-table-container">
        {activeFilter === 'all-users' && (
          <table className="operations-table">
            <thead>
              <tr>
                <th>{t('admin_imya_aee78fe8')}</th>
                <th>Username</th>
                <th>Telegram ID</th>
                <th>{t('admin_data_registracii_6bf93f9b')}</th>
                <th>{t('admin_vsego_ballov_dda228cb')}</th>
              </tr>
            </thead>
            <tbody>
              {businessInfo.all_users && businessInfo.all_users.length > 0 ? (
                businessInfo.all_users.map(user => (
                  <tr key={user.id}>
                    <td>{user.full_name || t('admin_notSpecified')}</td>
                    <td>@{user.username || '-'}</td>
                    <td>{user.telegram_id}</td>
                    <td>{formatDate(user.registration_date)}</td>
                    <td>{user.total_points}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '30px' }}>
                    {t('admin_net_zaregistrirovannyh_polzovateley_d6cddc4c')}
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
                <th>{t('admin_data_a5b49d2e')}</th>
                <th>{t('admin_deystvie_4fe9c067')}</th>
                <th>{t('admin_akciya_b45e3d76')}</th>
                <th>{t('admin_detali_85a76a73')}</th>
                <th>{t('admin_polzovatel_51aff185')}</th>
              </tr>
            </thead>
            <tbody>
              {businessInfo.promo_history && businessInfo.promo_history.length > 0 ? (
                businessInfo.promo_history.map(history => (
                  <tr key={history.id}>
                    <td>{formatDate(history.action_date)}</td>
                    <td>
                      {history.action === 'created' && <span style={{ color: 'green' }}>{t('admin_sozdana_2ca3cb47')}</span>}
                      {history.action === 'updated' && <span style={{ color: 'blue' }}>{t('admin_obnovlena_52de146a')}</span>}
                      {history.action === 'deleted' && <span style={{ color: 'red' }}>{t('admin_udalena_6cf10cfc')}</span>}
                      {!['created', 'updated', 'deleted'].includes(history.action) && history.action}
                    </td>
                    <td>{history.promotion_title || 'N/A'}</td>
                    <td>{history.details || ''}</td>
                    <td>{history.user_name || t('admin_administrator_36d00fd7')}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '30px' }}>
                    {t('admin_net_istorii_operaciy_s_5dd7aebd')}
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
                <th>{t('admin_data_pokupki_0f147408')}</th>
                <th>{t('admin_sa_client')}</th>
                <th>{t('admin_uroven_d9f964d7')}</th>
                <th>{t('admin_potracheno_ballov_b8bdc134')}</th>
                <th>{t('admin_summa_pokupki_9d68cda1')}</th>
              </tr>
            </thead>
            <tbody>
              {businessInfo.purchases && businessInfo.purchases.length > 0 ? (
                businessInfo.purchases.map(purchase => (
                  <tr key={purchase.id}>
                    <td>{formatDate(purchase.created_at)}</td>
                    <td>{purchase.full_name || t('admin_notSpecified')} ({purchase.username || purchase.telegram_id})</td>
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
                    {t('admin_net_operaciy_pokupok_14df3eb8')}
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



import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FiExternalLink, FiCheck, FiX, FiGift } from 'react-icons/fi';
import { getApiBaseUrl } from '../../utils/apiConfig';
import { notifyBonusSubmissionsChanged } from '../../utils/bonusSubmissionsSync';
import { requestAdminSidebarBadgesRefresh } from '../../utils/adminSidebarBadges';
import { showNotification } from '../../utils/toastHelper';
import './BonusesSubmissions.css';

const TASK_LABELS = {
  1: t('admin_post_v_nstagram_sellyoubrick_96e64ecc'),
  2: t('admin_video_v_ikok_sellyoubrick_cebaed41'),
  3: t('admin_ssylka_v_opisanii_profilya_65be6a39'),
  4: t('admin_ssylka_v_poste_v_cb5b413a'),
};

const BonusesSubmissions = ({ onAdminSectionBadgeRefresh }) => {
  const { t } = useTranslation();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);

  const fetchPending = async () => {
    try {
      setLoading(true);
      const API_BASE_URL = await getApiBaseUrl();
      const res = await fetch(`${API_BASE_URL}/bonus-submissions/pending`);
      const data = await res.json();
      if (data.success && data.data) {
        setList(data.data);
        void onAdminSectionBadgeRefresh?.();
      }
    } catch (e) {
      console.error(e);
      showNotification(t('admin_bonus_loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleApprove = async (id) => {
    setActionId(id);
    try {
      const API_BASE_URL = await getApiBaseUrl();
      const res = await fetch(`${API_BASE_URL}/bonus-submissions/${id}/approve`, { method: 'PUT' });
      const data = await res.json();
      if (data.success) {
        showNotification(t('admin_bonus_approved'));
        notifyBonusSubmissionsChanged();
        const nextCount = Math.max(0, list.length - 1);
        requestAdminSidebarBadgesRefresh({ patch: { bonuses: nextCount } });
        await fetchPending();
      } else {
        showNotification(data.message || t('admin_error'), 'error');
      }
    } catch (e) {
      showNotification(t('admin_networkError'), 'error');
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (id) => {
    setActionId(id);
    try {
      const API_BASE_URL = await getApiBaseUrl();
      const res = await fetch(`${API_BASE_URL}/bonus-submissions/${id}/reject`, { method: 'PUT' });
      const data = await res.json();
      if (data.success) {
        showNotification(t('admin_bonus_rejected'));
        notifyBonusSubmissionsChanged();
        const nextCount = Math.max(0, list.length - 1);
        requestAdminSidebarBadgesRefresh({ patch: { bonuses: nextCount } });
        await fetchPending();
      } else {
        showNotification(data.message || t('admin_error'), 'error');
      }
    } catch (e) {
      showNotification(t('admin_networkError'), 'error');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="bonuses-submissions-admin">
      <div className="bonuses-submissions-admin__header">
        <FiGift size={24} />
        <h2>{t('admin_panel_bonuses')}</h2>
        <p>{t('admin_proverte_ssylki_polzovateley_i_276b9df3')}</p>
      </div>

      {loading ? (
        <div className="bonuses-submissions-admin__loading">{t('admin_loading')}</div>
      ) : list.length === 0 ? (
        <div className="bonuses-submissions-admin__empty">{t('admin_net_zayavok_na_proverke_9a94be21')}</div>
      ) : (
        <div className="bonuses-submissions-admin__list">
          {list.map((item) => (
            <div key={item.id} className="bonuses-submissions-admin__card">
              <div className="bonuses-submissions-admin__card-row">
                <span className="bonuses-submissions-admin__task">
                  {t('admin_zadanie_id_label_bfa0da70', { id: item.task_id, label: TASK_LABELS[item.task_id] || t('admin_zadanie_id_84be8fdf', { id: item.task_id }) })}
                </span>
                <span className="bonuses-submissions-admin__user">User ID: {item.user_id}</span>
              </div>
              <div className="bonuses-submissions-admin__link-row">
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bonuses-submissions-admin__link"
                >
                  <FiExternalLink size={16} /> {t('admin_otkryt_ssylku_768854fe')}
                </a>
              </div>
              <div className="bonuses-submissions-admin__actions">
                <button
                  type="button"
                  className="bonuses-submissions-admin__btn bonuses-submissions-admin__btn--approve"
                  disabled={actionId === item.id}
                  onClick={() => handleApprove(item.id)}
                >
                  {actionId === item.id ? '...' : <><FiCheck size={16} /> {t('admin_approve')}</>}
                </button>
                <button
                  type="button"
                  className="bonuses-submissions-admin__btn bonuses-submissions-admin__btn--reject"
                  disabled={actionId === item.id}
                  onClick={() => handleReject(item.id)}
                >
                  {actionId === item.id ? '...' : <><FiX size={16} /> {t('admin_reject')}</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BonusesSubmissions;

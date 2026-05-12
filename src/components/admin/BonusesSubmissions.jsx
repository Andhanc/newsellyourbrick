import React, { useState, useEffect } from 'react';
import { FiExternalLink, FiCheck, FiX, FiGift } from 'react-icons/fi';
import { getApiBaseUrl } from '../../utils/apiConfig';
import { notifyBonusSubmissionsChanged } from '../../utils/bonusSubmissionsSync';
import { showNotification } from '../../utils/toastHelper';
import './BonusesSubmissions.css';

const TASK_LABELS = {
  1: 'Пост в Instagram #sellyoubrick',
  2: 'Видео в TikTok #sellyoubrick',
  3: 'Ссылка в описании профиля',
  4: 'Ссылка в посте в Instagram',
};

const BonusesSubmissions = ({ onAdminSectionBadgeRefresh }) => {
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
      showNotification('Ошибка загрузки заявок');
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
        showNotification('Заявка одобрена');
        notifyBonusSubmissionsChanged();
        await fetchPending();
      } else {
        showNotification(data.message || 'Ошибка', 'error');
      }
    } catch (e) {
      showNotification('Ошибка сети', 'error');
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
        showNotification('Заявка отклонена');
        notifyBonusSubmissionsChanged();
        await fetchPending();
      } else {
        showNotification(data.message || 'Ошибка', 'error');
      }
    } catch (e) {
      showNotification('Ошибка сети', 'error');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="bonuses-submissions-admin">
      <div className="bonuses-submissions-admin__header">
        <FiGift size={24} />
        <h2>Бонусные задания</h2>
        <p>Проверьте ссылки пользователей и одобрите или отклоните заявки.</p>
      </div>

      {loading ? (
        <div className="bonuses-submissions-admin__loading">Загрузка...</div>
      ) : list.length === 0 ? (
        <div className="bonuses-submissions-admin__empty">Нет заявок на проверке.</div>
      ) : (
        <div className="bonuses-submissions-admin__list">
          {list.map((item) => (
            <div key={item.id} className="bonuses-submissions-admin__card">
              <div className="bonuses-submissions-admin__card-row">
                <span className="bonuses-submissions-admin__task">
                  Задание {item.task_id}: {TASK_LABELS[item.task_id] || `Задание ${item.task_id}`}
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
                  <FiExternalLink size={16} /> Открыть ссылку
                </a>
              </div>
              <div className="bonuses-submissions-admin__actions">
                <button
                  type="button"
                  className="bonuses-submissions-admin__btn bonuses-submissions-admin__btn--approve"
                  disabled={actionId === item.id}
                  onClick={() => handleApprove(item.id)}
                >
                  {actionId === item.id ? '...' : <><FiCheck size={16} /> Одобрить</>}
                </button>
                <button
                  type="button"
                  className="bonuses-submissions-admin__btn bonuses-submissions-admin__btn--reject"
                  disabled={actionId === item.id}
                  onClick={() => handleReject(item.id)}
                >
                  {actionId === item.id ? '...' : <><FiX size={16} /> Отклонить</>}
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

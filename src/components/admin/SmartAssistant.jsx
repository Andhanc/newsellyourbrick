import React, { useState, useEffect } from 'react';
import { FiMessageCircle, FiUser, FiPhone, FiMail, FiMapPin, FiHome, FiX, FiRefreshCw } from 'react-icons/fi';
import { getApiBaseUrl } from '../../utils/apiConfig';
import './SmartAssistant.css';

const LEAD_TYPE_LABELS = {
  hot: 'Горячий клиент',
  warm: 'Тёплый клиент',
  cold: 'Холодный клиент'
};

const LEAD_TYPE_CLASS = {
  hot: 'lead-type--hot',
  warm: 'lead-type--warm',
  cold: 'lead-type--cold'
};

const SmartAssistant = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [selectedLead, setSelectedLead] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      setError(null);
      const base = await getApiBaseUrl();
      const res = await fetch(`${base}/assistant-leads`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setLeads(data.data);
      } else {
        setError('Не удалось загрузить список лидов');
      }
    } catch (err) {
      console.error('SmartAssistant fetchLeads:', err);
      setError('Ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const openDetail = async (id) => {
    setDetailLoading(true);
    setSelectedLead(null);
    try {
      const base = await getApiBaseUrl();
      const res = await fetch(`${base}/assistant-leads/${id}`);
      const data = await res.json();
      if (data.success && data.data) {
        setSelectedLead(data.data);
      }
    } catch (err) {
      console.error('SmartAssistant getById:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const filteredLeads = filterType === 'all'
    ? leads
    : leads.filter((l) => l.lead_type === filterType);

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return '—';
    }
  };

  const getMessagesExcerpt = (messagesJson) => {
    if (!messagesJson) return [];
    try {
      const arr = typeof messagesJson === 'string' ? JSON.parse(messagesJson) : messagesJson;
      return Array.isArray(arr) ? arr.slice(-20) : [];
    } catch (e) {
      return [];
    }
  };

  return (
    <div className="smart-assistant-container">
      <div className="smart-assistant-header">
        <h2 className="smart-assistant-title">
          <FiMessageCircle className="smart-assistant-title-icon" />
          Умный помощник
        </h2>
        <p className="smart-assistant-subtitle">
          Клиенты, которые общались с ботом. Тип лида определяется автоматически по диалогу.
        </p>
        <div className="smart-assistant-filters">
          <button
            className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            Все
          </button>
          <button
            className={`filter-btn ${filterType === 'hot' ? 'active' : ''}`}
            onClick={() => setFilterType('hot')}
          >
            Горячие
          </button>
          <button
            className={`filter-btn ${filterType === 'warm' ? 'active' : ''}`}
            onClick={() => setFilterType('warm')}
          >
            Тёплые
          </button>
          <button
            className={`filter-btn ${filterType === 'cold' ? 'active' : ''}`}
            onClick={() => setFilterType('cold')}
          >
            Холодные
          </button>
          <button className="refresh-btn" onClick={fetchLeads} disabled={loading} title="Обновить">
            <FiRefreshCw size={18} />
            Обновить
          </button>
        </div>
      </div>

      {loading ? (
        <div className="smart-assistant-loading">
          <p>Загрузка лидов...</p>
        </div>
      ) : error ? (
        <div className="smart-assistant-error">
          <p>{error}</p>
          <button onClick={fetchLeads}>Попробовать снова</button>
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="smart-assistant-empty">
          <FiMessageCircle size={48} />
          <p>Нет лидов по выбранному фильтру</p>
          <p className="smart-assistant-empty-hint">Клиенты появятся после общения с ботом на сайте</p>
        </div>
      ) : (
        <div className="smart-assistant-grid">
          {filteredLeads.map((lead) => (
            <div
              key={lead.id}
              className="smart-assistant-card"
              onClick={() => openDetail(lead.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && openDetail(lead.id)}
            >
              <div className="smart-assistant-card__top">
                <span className={`lead-type-badge ${LEAD_TYPE_CLASS[lead.lead_type] || ''}`}>
                  {LEAD_TYPE_LABELS[lead.lead_type] || lead.lead_type}
                </span>
                <span className="smart-assistant-card__date">{formatDate(lead.updated_at)}</span>
              </div>
              <p className="smart-assistant-card__summary">
                {lead.summary || 'Нет выжимки'}
              </p>
              {(lead.country || lead.region || lead.property_type) && (
                <div className="smart-assistant-card__meta">
                  {lead.country && <span>{lead.country}</span>}
                  {lead.region && lead.region !== lead.country && <span>{lead.region}</span>}
                  {lead.property_type && <span>{lead.property_type}</span>}
                </div>
              )}
              {(lead.email || lead.phone) && (
                <div className="smart-assistant-card__contacts">
                  {lead.email && <FiMail size={14} />}
                  {lead.phone && <FiPhone size={14} />}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && !error && (
        <div className="smart-assistant-stats">
          <span>Всего: {leads.length}</span>
          <span>Горячих: {leads.filter((l) => l.lead_type === 'hot').length}</span>
          <span>Тёплых: {leads.filter((l) => l.lead_type === 'warm').length}</span>
          <span>Холодных: {leads.filter((l) => l.lead_type === 'cold').length}</span>
        </div>
      )}

      {/* Модалка карточки клиента */}
      {(selectedLead !== null || detailLoading) && (
        <div
          className="smart-assistant-modal-overlay"
          onClick={() => !detailLoading && setSelectedLead(null)}
          role="presentation"
        >
          <div className="smart-assistant-modal" onClick={(e) => e.stopPropagation()}>
            <div className="smart-assistant-modal__header">
              <h3>Карточка клиента</h3>
              <button
                type="button"
                className="smart-assistant-modal__close"
                onClick={() => setSelectedLead(null)}
                disabled={detailLoading}
                aria-label="Закрыть"
              >
                <FiX size={24} />
              </button>
            </div>
            {detailLoading ? (
              <div className="smart-assistant-modal__loading">Загрузка...</div>
            ) : selectedLead ? (
              <div className="smart-assistant-modal__body">
                <div className="modal-section">
                  <span className={`lead-type-badge ${LEAD_TYPE_CLASS[selectedLead.lead_type] || ''}`}>
                    {LEAD_TYPE_LABELS[selectedLead.lead_type] || selectedLead.lead_type}
                  </span>
                  <p className="modal-summary">{selectedLead.summary || '—'}</p>
                </div>

                <div className="modal-section">
                  <h4>Контакты</h4>
                  <div className="modal-contacts">
                    {selectedLead.email ? (
                      <div className="modal-contact-item">
                        <FiMail size={18} />
                        <a href={`mailto:${selectedLead.email}`}>{selectedLead.email}</a>
                      </div>
                    ) : (
                      <div className="modal-contact-item modal-contact-item--empty">
                        <FiMail size={18} />
                        <span>Почта не указана</span>
                      </div>
                    )}
                    {selectedLead.phone ? (
                      <div className="modal-contact-item">
                        <FiPhone size={18} />
                        <a href={`tel:${selectedLead.phone}`}>{selectedLead.phone}</a>
                      </div>
                    ) : (
                      <div className="modal-contact-item modal-contact-item--empty">
                        <FiPhone size={18} />
                        <span>Телефон не указан</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="modal-section">
                  <h4>Информация для менеджера</h4>
                  <div className="modal-info-grid">
                    {selectedLead.country && (
                      <div className="modal-info-item">
                        <FiMapPin size={16} />
                        <span className="label">Страна:</span>
                        <span className="value">{selectedLead.country}</span>
                      </div>
                    )}
                    {selectedLead.region && (
                      <div className="modal-info-item">
                        <FiMapPin size={16} />
                        <span className="label">Регион:</span>
                        <span className="value">{selectedLead.region}</span>
                      </div>
                    )}
                    {selectedLead.property_type && (
                      <div className="modal-info-item">
                        <FiHome size={16} />
                        <span className="label">Тип объекта:</span>
                        <span className="value">{selectedLead.property_type}</span>
                      </div>
                    )}
                    {selectedLead.session_id && (
                      <div className="modal-info-item">
                        <FiUser size={16} />
                        <span className="label">ID сессии:</span>
                        <span className="value value--mono">{selectedLead.session_id}</span>
                      </div>
                    )}
                    {(selectedLead.updated_at || selectedLead.created_at) && (
                      <div className="modal-info-item">
                        <span className="label">Обновлено:</span>
                        <span className="value">{formatDate(selectedLead.updated_at || selectedLead.created_at)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="modal-section">
                  <h4>Выжимка диалога</h4>
                  <div className="modal-dialogue">
                    {getMessagesExcerpt(selectedLead.messages).map((msg, idx) => (
                      <div
                        key={msg.id || idx}
                        className={`dialogue-msg dialogue-msg--${msg.sender === 'user' ? 'user' : 'bot'}`}
                      >
                        <span className="dialogue-msg__role">{msg.sender === 'user' ? 'Клиент' : 'Бот'}</span>
                        <span className="dialogue-msg__text">{msg.text || '—'}</span>
                      </div>
                    ))}
                    {getMessagesExcerpt(selectedLead.messages).length === 0 && (
                      <p className="modal-dialogue-empty">Нет сообщений</p>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartAssistant;

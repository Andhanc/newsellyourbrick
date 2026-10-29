import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FiMessageCircle, FiUser, FiPhone, FiMail, FiMapPin, FiHome, FiX, FiRefreshCw, FiHeadphones } from 'react-icons/fi';
import { getApiBaseUrl } from '../../utils/apiConfig';
import './SmartAssistant.css';

const LEAD_TYPE_CLASS = {
  hot: 'lead-type--hot',
  warm: 'lead-type--warm',
  cold: 'lead-type--cold'
};

const SmartAssistant = () => {
  const { t, i18n } = useTranslation();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [selectedLead, setSelectedLead] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const dateLocale = (i18n.language || 'ru').startsWith('ru') ? 'ru-RU' : (i18n.language || 'en');

  const leadTypeLabels = {
    hot: t('admin_sa_hotLead'),
    warm: t('admin_sa_warmLead'),
    cold: t('admin_sa_coldLead')
  };

  const preferredContactLabels = {
    phone: t('admin_phone'),
    email: 'E-mail',
    whatsapp: 'WhatsApp'
  };

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
        setError(t('admin_sa_loadLeadsFail'));
      }
    } catch (err) {
      console.error('SmartAssistant fetchLeads:', err);
      setError(t('admin_sa_loadDataError'));
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

  const filteredLeads =
    filterType === 'all'
      ? leads
      : filterType === 'manager'
        ? leads.filter((l) => Number(l.manager_contact_requested) === 1)
        : leads.filter((l) => l.lead_type === filterType);

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleString(dateLocale, {
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
          {t('admin_sa_title')}
        </h2>
        <p className="smart-assistant-subtitle">
          {t('admin_sa_subtitle')}
        </p>
        <div className="smart-assistant-filters">
          <button
            className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            {t('admin_all')}
          </button>
          <button
            className={`filter-btn ${filterType === 'hot' ? 'active' : ''}`}
            onClick={() => setFilterType('hot')}
          >
            {t('admin_sa_hot')}
          </button>
          <button
            className={`filter-btn ${filterType === 'warm' ? 'active' : ''}`}
            onClick={() => setFilterType('warm')}
          >
            {t('admin_sa_warm')}
          </button>
          <button
            className={`filter-btn ${filterType === 'cold' ? 'active' : ''}`}
            onClick={() => setFilterType('cold')}
          >
            {t('admin_sa_cold')}
          </button>
          <button
            className={`filter-btn ${filterType === 'manager' ? 'active' : ''}`}
            onClick={() => setFilterType('manager')}
          >
            {t('admin_sa_managerRequest')}
          </button>
          <button className="refresh-btn" onClick={fetchLeads} disabled={loading} title={t('admin_sa_refresh')}>
            <FiRefreshCw size={18} />
            {t('admin_sa_refresh')}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="smart-assistant-loading">
          <p>{t('admin_sa_loadingLeads')}</p>
        </div>
      ) : error ? (
        <div className="smart-assistant-error">
          <p>{error}</p>
          <button onClick={fetchLeads}>{t('admin_tryAgain')}</button>
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="smart-assistant-empty">
          <FiMessageCircle size={48} />
          <p>{t('admin_sa_noLeads')}</p>
          <p className="smart-assistant-empty-hint">{t('admin_sa_emptyHint')}</p>
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
                <div className="smart-assistant-card__badges">
                  <span className={`lead-type-badge ${LEAD_TYPE_CLASS[lead.lead_type] || ''}`}>
                    {leadTypeLabels[lead.lead_type] || lead.lead_type}
                  </span>
                  {Number(lead.manager_contact_requested) === 1 && (
                    <span className="smart-assistant-card__manager-badge" title={t('admin_sa_managerContactTitle')}>
                      <FiHeadphones size={14} aria-hidden />
                      {t('admin_sa_manager')}
                    </span>
                  )}
                </div>
                <span className="smart-assistant-card__date">{formatDate(lead.updated_at)}</span>
              </div>
              <p className="smart-assistant-card__summary">
                {lead.summary || t('admin_sa_noSummary')}
              </p>
              {lead.preferred_contact && preferredContactLabels[lead.preferred_contact] && (
                <p className="smart-assistant-card__contact-pref">
                  {t('admin_sa_contactVia', { channel: preferredContactLabels[lead.preferred_contact] })}
                </p>
              )}
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
          <span>{t('admin_sa_total', { count: leads.length })}</span>
          <span>{t('admin_sa_hotCount', { count: leads.filter((l) => l.lead_type === 'hot').length })}</span>
          <span>{t('admin_sa_warmCount', { count: leads.filter((l) => l.lead_type === 'warm').length })}</span>
          <span>{t('admin_sa_coldCount', { count: leads.filter((l) => l.lead_type === 'cold').length })}</span>
          <span>{t('admin_sa_managerCount', { count: leads.filter((l) => Number(l.manager_contact_requested) === 1).length })}</span>
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
              <h3>{t('admin_sa_clientCard')}</h3>
              <button
                type="button"
                className="smart-assistant-modal__close"
                onClick={() => setSelectedLead(null)}
                disabled={detailLoading}
                aria-label={t('admin_close')}
              >
                <FiX size={24} />
              </button>
            </div>
            {detailLoading ? (
              <div className="smart-assistant-modal__loading">{t('admin_loading')}</div>
            ) : selectedLead ? (
              <div className="smart-assistant-modal__body">
                <div className="modal-section">
                  <span className={`lead-type-badge ${LEAD_TYPE_CLASS[selectedLead.lead_type] || ''}`}>
                    {leadTypeLabels[selectedLead.lead_type] || selectedLead.lead_type}
                  </span>
                  <p className="modal-summary">{selectedLead.summary || '—'}</p>
                </div>

                {Number(selectedLead.manager_contact_requested) === 1 && (
                  <div className="modal-section modal-section--manager">
                    <h4>
                      <FiHeadphones size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                      {t('admin_sa_managerContact')}
                    </h4>
                    <p className="modal-manager-hint">
                      {t('admin_sa_managerHint')}
                      {selectedLead.preferred_contact
                        ? t('admin_sa_preferredChannel', {
                            channel: preferredContactLabels[selectedLead.preferred_contact] || selectedLead.preferred_contact,
                          })
                        : t('admin_sa_clarifyContact')}
                      .
                    </p>
                  </div>
                )}

                <div className="modal-section">
                  <h4>{t('admin_sa_contacts')}</h4>
                  <div className="modal-contacts">
                    {selectedLead.email ? (
                      <div className="modal-contact-item">
                        <FiMail size={18} />
                        <a href={`mailto:${selectedLead.email}`}>{selectedLead.email}</a>
                      </div>
                    ) : (
                      <div className="modal-contact-item modal-contact-item--empty">
                        <FiMail size={18} />
                        <span>{t('admin_emailNotSpecified')}</span>
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
                        <span>{t('admin_phoneNotSpecified')}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="modal-section">
                  <h4>{t('admin_sa_managerInfo')}</h4>
                  <div className="modal-info-grid">
                    {selectedLead.country && (
                      <div className="modal-info-item">
                        <FiMapPin size={16} />
                        <span className="label">{t('admin_sa_countryLabel')}</span>
                        <span className="value">{selectedLead.country}</span>
                      </div>
                    )}
                    {selectedLead.region && (
                      <div className="modal-info-item">
                        <FiMapPin size={16} />
                        <span className="label">{t('admin_sa_regionLabel')}</span>
                        <span className="value">{selectedLead.region}</span>
                      </div>
                    )}
                    {selectedLead.property_type && (
                      <div className="modal-info-item">
                        <FiHome size={16} />
                        <span className="label">{t('admin_sa_propertyTypeLabel')}</span>
                        <span className="value">{selectedLead.property_type}</span>
                      </div>
                    )}
                    {selectedLead.session_id && (
                      <div className="modal-info-item">
                        <FiUser size={16} />
                        <span className="label">{t('admin_sa_sessionIdLabel')}</span>
                        <span className="value value--mono">{selectedLead.session_id}</span>
                      </div>
                    )}
                    {(selectedLead.updated_at || selectedLead.created_at) && (
                      <div className="modal-info-item">
                        <span className="label">{t('admin_sa_updatedLabel')}</span>
                        <span className="value">{formatDate(selectedLead.updated_at || selectedLead.created_at)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="modal-section">
                  <h4>{t('admin_sa_dialogueSummary')}</h4>
                  <div className="modal-dialogue">
                    {getMessagesExcerpt(selectedLead.messages).map((msg, idx) => (
                      <div
                        key={msg.id || idx}
                        className={`dialogue-msg dialogue-msg--${msg.sender === 'user' ? 'user' : 'bot'}`}
                      >
                        <span className="dialogue-msg__role">{msg.sender === 'user' ? t('admin_sa_client') : t('admin_sa_bot')}</span>
                        <span className="dialogue-msg__text">{msg.text || '—'}</span>
                      </div>
                    ))}
                    {getMessagesExcerpt(selectedLead.messages).length === 0 && (
                      <p className="modal-dialogue-empty">{t('admin_sa_noMessages')}</p>
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

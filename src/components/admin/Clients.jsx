import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiSend, FiPhone, FiMessageSquare, FiColumns, FiMenu } from 'react-icons/fi';
import PhoneInput from '../PhoneInput';
import { getApiBaseUrl } from '../../utils/apiConfig';
import CrmBoard from './CrmBoard';
import './Clients.css';

const ClientsWhatsApp = () => {
  const { t } = useTranslation();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [error, setError] = useState(null);

  const handlePhoneChange = (e) => {
    setPhoneNumber(e.target.value);
    setError(null);
  };

  const handleMessageChange = (e) => {
    const value = e.target.value;
    if (value.length <= 1000) {
      setMessage(value);
      setError(null);
    }
  };

  const handleSend = async () => {
    if (!phoneNumber.trim()) {
      setError(t('admin_clients_phoneRequired'));
      return;
    }

    if (!message.trim()) {
      setError(t('admin_clients_messageRequired'));
      return;
    }

    const digits = phoneNumber.replace(/\D/g, '');
    if (!digits || digits.length < 10) {
      setError(t('admin_clients_phoneInvalid'));
      return;
    }

    setSending(true);
    setError(null);
    setSendResult(null);

    try {
      const API_BASE_URL = await getApiBaseUrl();

      const response = await fetch(`${API_BASE_URL}/whatsapp/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: digits,
          message: message.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSendResult({
          success: true,
          message: data.message || t('admin_clients_sendOk'),
          contact: data.contact,
        });

        setPhoneNumber('');
        setMessage('');
      } else {
        if (response.status === 503) {
          setSendResult({
            success: false,
            message:
              data.error ||
              t('admin_clients_waUnavailable'),
          });
          setError(data.error || t('admin_clients_waDown'));
        } else {
          setSendResult({
            success: false,
            message: data.error || t('admin_clients_sendFail'),
          });
          setError(data.error || t('admin_clients_sendFailShort'));
        }
      }
    } catch (err) {
      console.error('Ошибка отправки сообщения через WhatsApp:', err);
      setSendResult({
        success: false,
        message: t('admin_clients_sendFailCheck'),
      });
      setError(t('admin_clients_connectionError'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="clients-content">
      <div className="clients-form">
        <div className="form-group">
          <label className="form-label">
            <FiPhone className="label-icon" />
            {t('admin_nomer_telefona_4a276534')}
          </label>
          <PhoneInput
            value={phoneNumber}
            onChange={handlePhoneChange}
            error={error && !phoneNumber.trim() ? error : null}
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            <FiMessageSquare className="label-icon" />
            {t('admin_soobschenie_dc72346a')}
          </label>
          <textarea
            className="message-textarea"
            placeholder={t('admin_clients_messagePlaceholder')}
            value={message}
            onChange={handleMessageChange}
            rows={10}
            maxLength={1000}
          />
          <div className="message-counter">
            {message.length} / 1000 {t('admin_simvolov_7fbc31ec')}
          </div>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {sendResult && (
          <div className={`send-result ${sendResult.success ? 'send-result--success' : 'send-result--error'}`}>
            <p>{sendResult.message}</p>
            {sendResult.contact && sendResult.contact.name && (
              <p style={{ fontSize: '0.9rem', marginTop: '0.5rem', opacity: 0.8 }}>
                {t('admin_poluchatel_ae1b56fa')} {sendResult.contact.name}
              </p>
            )}
            {sendResult.warning && (
              <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', fontStyle: 'italic', opacity: 0.9 }}>
                {sendResult.warning}
              </p>
            )}
            <button
              type="button"
              onClick={() => setSendResult(null)}
              className="close-result-btn"
            >
              {t('admin_close')}
            </button>
          </div>
        )}

        <div className="form-actions">
          <button
            type="button"
            className="btn-send"
            disabled={!phoneNumber.trim() || !message.trim() || sending}
            onClick={handleSend}
          >
            {sending ? (
              <>
                <FiSend style={{ animation: 'spin 1s linear infinite' }} />
                {t('admin_otpravka_9b476aa9')}
              </>
            ) : (
              <>
                <FiSend />
                {t('admin_otpravit_76dcf737')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const Clients = ({ onOpenAdminNav }) => {
  const [tab, setTab] = useState('crm');

  return (
    <div className="clients-container">
      <div className="clients-header">
        <div className="clients-header-row">
          <h2 className="clients-title">
            <FiColumns className="clients-title-icon" />
            {t('admin_klienty__i_messendzhery_8b508de7')}
          </h2>
          {typeof onOpenAdminNav === 'function' && (
            <button
              type="button"
              className="clients-admin-nav-btn"
              onClick={onOpenAdminNav}
              aria-label={t('admin_openAdminSectionsMenu')}
            >
              <FiMenu aria-hidden />
              <span>{t('admin_menyu_razdelov_7801f84e')}</span>
            </button>
          )}
        </div>
        <p className="clients-subtitle">
          {t('admin_vse_zaregistrirovannye_polzovateli_p_4947103e')}
        </p>
      </div>

      <div className="clients-tabs">
        <button
          type="button"
          className={`clients-tab ${tab === 'crm' ? 'clients-tab--active' : ''}`}
          onClick={() => setTab('crm')}
        >
          <FiColumns />
          {t('admin__voronka_14967c67')}
        </button>
        <button
          type="button"
          className={`clients-tab ${tab === 'whatsapp' ? 'clients-tab--active' : ''}`}
          onClick={() => setTab('whatsapp')}
        >
          <FiMessageSquare />
          WhatsApp
        </button>
      </div>

      {tab === 'crm' && <CrmBoard />}
      {tab === 'whatsapp' && <ClientsWhatsApp />}
    </div>
  );
};

export default Clients;

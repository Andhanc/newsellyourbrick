import React, { useState } from 'react';
import { FiSend, FiPhone, FiMessageSquare, FiColumns } from 'react-icons/fi';
import PhoneInput from '../PhoneInput';
import { getApiBaseUrl } from '../../utils/apiConfig';
import CrmBoard from './CrmBoard';
import './Clients.css';

const ClientsWhatsApp = () => {
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
      setError('Пожалуйста, введите номер телефона');
      return;
    }

    if (!message.trim()) {
      setError('Пожалуйста, введите сообщение');
      return;
    }

    const digits = phoneNumber.replace(/\D/g, '');
    if (!digits || digits.length < 10) {
      setError('Пожалуйста, введите корректный номер телефона');
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
          message: data.message || 'Сообщение успешно отправлено в WhatsApp',
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
              'WhatsApp сервис временно недоступен. Пожалуйста, подождите несколько секунд и попробуйте снова.',
          });
          setError(data.error || 'WhatsApp сервис недоступен');
        } else {
          setSendResult({
            success: false,
            message: data.error || 'Ошибка при отправке сообщения. Попробуйте еще раз.',
          });
          setError(data.error || 'Не удалось отправить сообщение');
        }
      }
    } catch (err) {
      console.error('Ошибка отправки сообщения через WhatsApp:', err);
      setSendResult({
        success: false,
        message: 'Не удалось отправить сообщение. Проверьте подключение к серверу.',
      });
      setError('Ошибка подключения к серверу');
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
            Номер телефона
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
            Сообщение
          </label>
          <textarea
            className="message-textarea"
            placeholder="Введите текст сообщения для клиента..."
            value={message}
            onChange={handleMessageChange}
            rows={10}
            maxLength={1000}
          />
          <div className="message-counter">
            {message.length} / 1000 символов
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
                Получатель: {sendResult.contact.name}
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
              Закрыть
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
                Отправка...
              </>
            ) : (
              <>
                <FiSend />
                Отправить
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const Clients = () => {
  const [tab, setTab] = useState('crm');

  return (
    <div className="clients-container">
      <div className="clients-header">
        <h2 className="clients-title">
          <FiColumns className="clients-title-icon" />
          Клиенты: CRM и мессенджеры
        </h2>
        <p className="clients-subtitle">
          Воронка продаж, касания и письма; отдельно — WhatsApp для быстрых сообщений
        </p>
      </div>

      <div className="clients-tabs">
        <button
          type="button"
          className={`clients-tab ${tab === 'crm' ? 'clients-tab--active' : ''}`}
          onClick={() => setTab('crm')}
        >
          <FiColumns />
          CRM воронка
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

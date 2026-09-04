import React, { useState, useMemo, useEffect, useRef } from 'react';
import { FiSearch, FiSend, FiUsers, FiFilter, FiCheck, FiX, FiRefreshCw } from 'react-icons/fi';
import { getApiBaseUrl, getApiBaseUrlSync } from '../../utils/apiConfig';
import './WhatsApp.css';

// Функция для получения названия языка по коду
const LEAD_TYPE_LABELS = {
  hot: 'Горячий',
  warm: 'Тёплый',
  cold: 'Холодный'
};

const LEAD_TYPE_CLASS = {
  hot: 'lead-type--hot',
  warm: 'lead-type--warm',
  cold: 'lead-type--cold'
};

const getLanguageName = (langCode) => {
  const names = {
    'ru': 'Русский',
    'en': 'Английский',
    'es': 'Испанский',
    'de': 'Немецкий',
    'fr': 'Французский',
    'it': 'Итальянский',
    'pt': 'Португальский',
    'pl': 'Польский',
    'tr': 'Турецкий',
    'uk': 'Украинский'
  };
  return names[langCode] || langCode || 'Не указан';
};

const WhatsApp = () => {
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [whatsappStatus, setWhatsappStatus] = useState({
    ready: false,
    state: 'UNKNOWN',
    hasQr: false,
    canRestartPairing: false,
    pairingResetRequiresSecret: false,
    waDiag: null,
    pairingCodeRaw: null,
  });
  const [pairingSecret, setPairingSecret] = useState('');
  const [pairingResetBusy, setPairingResetBusy] = useState(false);
  const [pairingNotice, setPairingNotice] = useState(null);
  const [qrTimestamp, setQrTimestamp] = useState(Date.now());
  /** Пока грузится PNG после того как статус сообщил, что QR уже есть */
  const [qrImageLoading, setQrImageLoading] = useState(false);
  const qrRefreshRef = useRef(null);
  const whatsappStatusRef = useRef(whatsappStatus);
  const prevHasQrRef = useRef(false);
  whatsappStatusRef.current = whatsappStatus;

  // Загрузка WhatsApp пользователей с сервера
  useEffect(() => {
    loadUsers();
    checkWhatsAppStatus();
    const statusInterval = setInterval(checkWhatsAppStatus, 30000);
    const onFocus = () => checkWhatsAppStatus();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(statusInterval);
      window.removeEventListener('focus', onFocus);
      if (qrRefreshRef.current) clearInterval(qrRefreshRef.current);
    };
  }, []);

  // Пока ждём QR — опрос чаще (2 с), чтобы поймать событие сразу после генерации
  useEffect(() => {
    if (qrRefreshRef.current) clearInterval(qrRefreshRef.current);

    if (!whatsappStatus.ready) {
      void checkWhatsAppStatus();
      const pollMs = whatsappStatus.hasQr ? 4000 : 2000;
      qrRefreshRef.current = setInterval(() => {
        setQrTimestamp(Date.now());
        void checkWhatsAppStatus();
      }, pollMs);
    } else {
      setQrImageLoading(false);
    }
  }, [whatsappStatus.ready, whatsappStatus.hasQr]);

  /** Первый раз, когда API сообщил hasQr — показать лоадер поверх до img.onLoad (не дублировать при каждом poll). */
  useEffect(() => {
    if (whatsappStatus.ready) {
      prevHasQrRef.current = whatsappStatus.hasQr;
      return;
    }
    const had = prevHasQrRef.current;
    const has = whatsappStatus.hasQr;
    if (has && !had) {
      setQrImageLoading(true);
    }
    prevHasQrRef.current = has;
  }, [whatsappStatus.hasQr, whatsappStatus.ready]);

  /** Если onLoad не сработал (редко), не блокируем UI бесконечно */
  useEffect(() => {
    if (!whatsappStatus.hasQr || !qrImageLoading) return undefined;
    const timer = window.setTimeout(() => setQrImageLoading(false), 12000);
    return () => window.clearTimeout(timer);
  }, [whatsappStatus.hasQr, qrImageLoading, qrTimestamp]);

  const checkWhatsAppStatus = async () => {
    try {
      const API_BASE_URL = await getApiBaseUrl();
      const response = await fetch(`${String(API_BASE_URL).replace(/\/$/, '')}/whatsapp/status`);
      if (!response.ok) {
        let hint =
          response.status === 502 || response.status === 503
            ? 'Backend недоступен. Запустите API: npm run server (порт 3000 или SERVER_PORT), либо npm run dev:all.'
            : response.status === 404
              ? 'Маршрут API не найден (404). Часто это vite preview без прокси — используйте npm run dev или npm run dev:all с запущенным server.'
              : `Запрос статуса WhatsApp: HTTP ${response.status}`;
        try {
          const errBody = await response.json();
          if (errBody?.error && typeof errBody.error === 'string') {
            hint = errBody.error;
          }
        } catch {
          /* ignore */
        }
        setWhatsappStatus({
          ready: false,
          state: 'HTTP_ERROR',
          message: hint,
          hasQr: false,
          canRestartPairing: false,
          pairingResetRequiresSecret: false,
          waDiag: null,
          pairingCodeRaw: null,
        });
        setQrImageLoading(false);
        return;
      }
      const data = await response.json();
      if (data.ready) {
        setWhatsappStatus({
          ready: true,
          state: data.state || 'READY',
          message: data.message || 'WhatsApp клиент готов к работе',
          hasQr: Boolean(data.hasQr),
          canRestartPairing: Boolean(data.canRestartPairing),
          pairingResetRequiresSecret: Boolean(data.pairingResetRequiresSecret),
          waDiag: data.waDiag ?? null,
          pairingCodeRaw: data.pairingCodeRaw ?? null,
        });
        setQrImageLoading(false);
      } else {
        setWhatsappStatus({
          ready: false,
          state: data.state || 'NOT_READY',
          message: data.message || 'WhatsApp клиент не готов',
          hasQr: Boolean(data.hasQr),
          canRestartPairing: Boolean(data.canRestartPairing),
          pairingResetRequiresSecret: Boolean(data.pairingResetRequiresSecret),
          waDiag: data.waDiag ?? null,
          pairingCodeRaw: data.pairingCodeRaw ?? null,
        });
        const hasQr = Boolean(data.hasQr);
        if (!hasQr) {
          setQrImageLoading(false);
        }
      }
    } catch (err) {
      console.error('Ошибка проверки статуса WhatsApp:', err);
      setQrImageLoading(false);
    }
  };

  const handleRefreshQr = () => {
    setQrImageLoading(true);
    setQrTimestamp(Date.now());
    void checkWhatsAppStatus();
  };

  const handleRestartPairing = async () => {
    if (!whatsappStatus.canRestartPairing) return;
    if (whatsappStatus.pairingResetRequiresSecret && !pairingSecret.trim()) {
      setPairingNotice({ type: 'error', text: 'Укажите секрет WA_PAIRING_RESET_SECRET в поле ниже.' });
      return;
    }
    setPairingResetBusy(true);
    setPairingNotice(null);
    try {
      const API_BASE_URL = await getApiBaseUrl();
      const base = String(API_BASE_URL).replace(/\/$/, '');
      const headers = { 'Content-Type': 'application/json' };
      if (whatsappStatus.pairingResetRequiresSecret && pairingSecret.trim()) {
        headers['X-WA-Pairing-Reset'] = pairingSecret.trim();
      }
      const res = await fetch(`${base}/whatsapp/restart-pairing`, {
        method: 'POST',
        headers,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPairingNotice({ type: 'error', text: data.error || `Ошибка ${res.status}` });
        return;
      }
      setPairingNotice({ type: 'success', text: data.message || 'Сессия сброшена, ждём новый QR…' });
      setQrImageLoading(true);
      void checkWhatsAppStatus();
    } catch (err) {
      setPairingNotice({ type: 'error', text: err?.message || String(err) });
    } finally {
      setPairingResetBusy(false);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const API_BASE_URL = await getApiBaseUrl();
      const response = await fetch(`${API_BASE_URL}/whatsapp/users?limit=1000`);
      const data = await response.json();
      
      if (data.success) {
        setUsers(data.data || []);
      } else {
        setError(data.error || 'Ошибка загрузки пользователей');
      }
    } catch (err) {
      console.error('Ошибка загрузки WhatsApp пользователей:', err);
      setError('Не удалось загрузить пользователей');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    let filtered = users;

    // Поиск по имени, фамилии, email или телефону
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user => {
        const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
        const email = user.email.toLowerCase();
        const phone = user.phone.replace(/\s/g, '');
        return fullName.includes(query) || email.includes(query) || phone.includes(query);
      });
    }

    // Фильтр по роли
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Фильтр по статусу
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => user.status === statusFilter);
    }

    return filtered;
  }, [users, searchQuery, roleFilter, statusFilter]);

  const handleSelectUser = (userId) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
    setSelectAll(newSelected.size === filteredUsers.length && filteredUsers.length > 0);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedUsers(new Set());
      setSelectAll(false);
    } else {
      const allIds = new Set(filteredUsers.map(user => user.id));
      setSelectedUsers(allIds);
      setSelectAll(true);
    }
  };

  const handleDeselectAll = () => {
    setSelectedUsers(new Set());
    setSelectAll(false);
  };

  const selectedCount = selectedUsers.size;
  const totalCount = filteredUsers.length;

  // Функция отправки рассылки
  const handleSendBroadcast = async () => {
    if (!message.trim() || selectedCount === 0) {
      return;
    }

    setSending(true);
    setSendResult(null);
    setError(null);

    try {
      // Получаем номера телефонов выбранных пользователей
      const selectedPhoneNumbers = filteredUsers
        .filter(user => selectedUsers.has(user.id))
        .map(user => {
          // Используем phoneFull (с @c.us) если есть, иначе phone, иначе создаем из phone
          if (user.phoneFull) {
            return user.phoneFull;
          }
          if (user.phone) {
            // Если phone не содержит @c.us, добавляем его
            const digits = String(user.phone).replace(/\D/g, '');
            return digits ? `${digits}@c.us` : '';
          }
          return '';
        })
        .filter(phone => phone); // Убираем пустые значения

      const API_BASE_URL = await getApiBaseUrl();
      const response = await fetch(`${API_BASE_URL}/whatsapp/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message.trim(),
          phoneNumbers: selectedPhoneNumbers
        })
      });

      const data = await response.json();

      if (data.success) {
        setSendResult({
          success: true,
          message: data.message || 'Рассылка успешно отправлена',
          results: data.results
        });
        // Очищаем выбранных пользователей и сообщение после успешной отправки
        setSelectedUsers(new Set());
        setSelectAll(false);
        setMessage('');
      } else {
        setSendResult({
          success: false,
          message: data.error || 'Ошибка при отправке рассылки',
          results: data.results
        });
      }
    } catch (err) {
      console.error('Ошибка отправки рассылки:', err);
      setSendResult({
        success: false,
        message: 'Не удалось отправить рассылку. Проверьте подключение к серверу.'
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="whatsapp-container">
      <div className="whatsapp-header">
        <h2 className="whatsapp-title">
          <FiSend className="whatsapp-title-icon" />
          WhatsApp Рассылка
        </h2>
        <p className="whatsapp-subtitle">
          Подключите номер, с которого уходят рассылки (в том числе опросы тест-драйва): отсканируйте QR ниже.
        </p>
        {!whatsappStatus.ready && (
          <div className="whatsapp-status-warning">
            <div className="whatsapp-warning-top">
              <div>
                <span style={{ color: '#ef4444', fontWeight: '600' }}>⚠️ WhatsApp не подключён к серверу</span>
                <p style={{ margin: '6px 0 0 0', fontSize: '0.9rem', color: '#6b7280' }}>
                  {whatsappStatus.hasQr
                    ? 'Откройте WhatsApp → Настройки → Связанные устройства → Привязать устройство и сразу наведите камеру на QR (код живёт ~20–40 секунд).'
                    : whatsappStatus.message ||
                      'Сервер запрашивает QR у WhatsApp Web… Это может занять до минуты после перезапуска backend.'}
                </p>
                {whatsappStatus.waDiag && !whatsappStatus.ready && whatsappStatus.waDiag.lastQrAt && !whatsappStatus.waDiag.qrFresh ? (
                  <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem', color: '#b45309' }}>
                    Последний QR уже протух
                    {typeof whatsappStatus.waDiag.qrAgeMs === 'number'
                      ? ` (~${Math.round(whatsappStatus.waDiag.qrAgeMs / 1000)} с назад)`
                      : ''}
                    . Нажмите «Запросить новый QR» и сканируйте сразу, как появится картинка.
                  </p>
                ) : null}
                {whatsappStatus.pairingResetRequiresSecret ? (
                  <label style={{ display: 'block', marginTop: '10px', fontSize: '0.85rem', color: '#374151' }}>
                    Секрет сброса (WA_PAIRING_RESET_SECRET):
                    <input
                      type="password"
                      value={pairingSecret}
                      onChange={(e) => setPairingSecret(e.target.value)}
                      autoComplete="off"
                      style={{
                        display: 'block',
                        marginTop: '4px',
                        width: '100%',
                        maxWidth: '320px',
                        padding: '8px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                      }}
                      placeholder="Только для сервера с переменной окружения"
                    />
                  </label>
                ) : null}
                {pairingNotice ? (
                  <p
                    style={{
                      margin: '8px 0 0 0',
                      fontSize: '0.85rem',
                      color: pairingNotice.type === 'success' ? '#007d8a' : '#dc2626',
                    }}
                  >
                    {pairingNotice.text}
                  </p>
                ) : null}
                {!whatsappStatus.ready && whatsappStatus.waDiag ? (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '10px',
                      fontSize: '0.78rem',
                      lineHeight: 1.45,
                      color: '#374151',
                      background: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    }}
                  >
                    <strong style={{ fontFamily: 'inherit' }}>Диагностика WhatsApp Web (с сервера)</strong>
                    {whatsappStatus.waDiag.lastError ? (
                      <div style={{ color: '#b91c1c', marginTop: '6px' }}>
                        Ошибка: {whatsappStatus.waDiag.lastError}
                      </div>
                    ) : null}
                    <div style={{ marginTop: '6px' }}>
                      Состояние: {whatsappStatus.waDiag.connectionState ?? '—'} · Попыток init:{' '}
                      {whatsappStatus.waDiag.initAttempts ?? '—'} · Длина кода пары:{' '}
                      {whatsappStatus.waDiag.pairingCodeLength ?? 0}
                    </div>
                    <div style={{ marginTop: '4px' }}>
                      Загрузка WA Web:{' '}
                      {typeof whatsappStatus.waDiag.loadingPercent === 'number'
                        ? `${whatsappStatus.waDiag.loadingPercent}%`
                        : '—'}
                      {whatsappStatus.waDiag.loadingMessage
                        ? ` (${whatsappStatus.waDiag.loadingMessage})`
                        : ''}
                      {typeof whatsappStatus.waDiag.qrWaitMs === 'number'
                        ? ` · ждём QR ~${Math.round(whatsappStatus.waDiag.qrWaitMs / 1000)} с`
                        : ''}
                      {typeof whatsappStatus.waDiag.qrStuckMs === 'number'
                        ? ` (автосброс с ~${Math.round(whatsappStatus.waDiag.qrStuckMs / 1000)} с)`
                        : ''}
                    </div>
                    {typeof whatsappStatus.waDiag.autoRecoverCount === 'number' &&
                    whatsappStatus.waDiag.autoRecoverCount > 0 ? (
                      <div style={{ marginTop: '4px', color: '#b45309' }}>
                        Автосбросов сессии без QR: {whatsappStatus.waDiag.autoRecoverCount}
                      </div>
                    ) : null}
                    <div style={{ marginTop: '4px' }}>
                      Puppeteer:{' '}
                      {whatsappStatus.waDiag.chromeExecutable
                        ? whatsappStatus.waDiag.chromeExecutable
                        : whatsappStatus.waDiag.puppeteerChannel
                          ? `channel "${whatsappStatus.waDiag.puppeteerChannel}"`
                          : 'встроенный Chrome из кэша (при ошибке: npm run puppeteer:install)'}
                    </div>
                    <div style={{ marginTop: '4px' }}>
                      Папка сессии (.wwebjs_auth):{' '}
                      {whatsappStatus.waDiag.sessionFolderExists ? 'есть' : 'нет'} · Кэш версии WA:{' '}
                      {whatsappStatus.waDiag.remoteWebCache ?? '—'}
                    </div>
                    {whatsappStatus.waDiag.lastQrAt ? (
                      <div style={{ marginTop: '4px', color: whatsappStatus.waDiag.qrFresh ? '#007d8a' : '#b45309' }}>
                        Последний QR на сервере:{' '}
                        {new Date(whatsappStatus.waDiag.lastQrAt).toLocaleString()}
                        {typeof whatsappStatus.waDiag.qrAgeMs === 'number'
                          ? ` (возраст ~${Math.round(whatsappStatus.waDiag.qrAgeMs / 1000)} с`
                          : ''}
                        {typeof whatsappStatus.waDiag.qrMaxAgeMs === 'number'
                          ? `, лимит ${Math.round(whatsappStatus.waDiag.qrMaxAgeMs / 1000)} с)`
                          : typeof whatsappStatus.waDiag.qrAgeMs === 'number'
                            ? ')'
                            : ''}
                        {whatsappStatus.waDiag.qrFresh === false ? ' — протух' : ''}
                      </div>
                    ) : (
                      <div style={{ marginTop: '6px', color: '#92400e' }}>
                        Событие QR ещё не приходило — обычно 30–90 с после старта Chrome. Сервер сам сбросит
                        битую сессию, если QR не появится. Лог:{' '}
                        <code style={{ fontSize: '0.85em' }}>npm run server</code>. При конфликте процессов:{' '}
                        <code style={{ fontSize: '0.85em' }}>WHATSAPP_SKIP_BOT_STATUS=1</code>.
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
              <div className="whatsapp-warning-actions">
                <button type="button" onClick={handleRefreshQr} className="btn-qr-refresh" title="Обновить QR-код">
                  <FiRefreshCw />
                  Обновить QR
                </button>
                <button type="button" onClick={() => void checkWhatsAppStatus()} className="btn-qr-refresh" title="Проверить статус">
                  <FiRefreshCw />
                  Проверить статус
                </button>
                {whatsappStatus.canRestartPairing ? (
                  <button
                    type="button"
                    onClick={() => void handleRestartPairing()}
                    className="btn-qr-refresh"
                    disabled={pairingResetBusy}
                    title="Сбросить сессию WhatsApp Web и запросить новый QR"
                  >
                    <FiRefreshCw style={pairingResetBusy ? { animation: 'spin 1s linear infinite' } : undefined} />
                    Запросить новый QR
                  </button>
                ) : null}
              </div>
            </div>
            <div className="whatsapp-qr-block">
              <div className="whatsapp-qr-frame">
                {!whatsappStatus.hasQr ? (
                  <div className="whatsapp-qr-loading" role="status" aria-live="polite">
                    <div className="whatsapp-qr-spinner" aria-hidden />
                    <p className="whatsapp-qr-loading-text">
                      Генерируем QR-код…
                      {typeof whatsappStatus.waDiag?.loadingPercent === 'number'
                        ? ` ${whatsappStatus.waDiag.loadingPercent}%`
                        : ''}
                    </p>
                    <span className="whatsapp-qr-loading-hint">
                      Обычно 30–90 секунд (холодный старт Chrome). Страница обновляет статус каждые 2 с.
                      {typeof whatsappStatus.waDiag?.qrWaitMs === 'number'
                        ? ` Уже ждём ~${Math.round(whatsappStatus.waDiag.qrWaitMs / 1000)} с.`
                        : ''}
                      {whatsappStatus.canRestartPairing && !whatsappStatus.hasQr
                        ? ' Если дольше ~2 минут — «Запросить новый QR».'
                        : ''}
                    </span>
                  </div>
                ) : (
                  <>
                    {qrImageLoading ? (
                      <div className="whatsapp-qr-loading whatsapp-qr-loading--overlay" role="status" aria-live="polite">
                        <div className="whatsapp-qr-spinner" aria-hidden />
                        <p className="whatsapp-qr-loading-text">Загружаем QR…</p>
                      </div>
                    ) : null}
                    <img
                      src={`${String(getApiBaseUrlSync()).replace(/\/$/, '')}/whatsapp/qr?t=${qrTimestamp}`}
                      alt="WhatsApp QR-код для привязки аккаунта рассылки"
                      className={`whatsapp-qr-image ${qrImageLoading ? 'whatsapp-qr-image--hidden' : ''}`}
                      decoding="async"
                      onLoad={() => setQrImageLoading(false)}
                      onError={() => {
                        setQrImageLoading(false);
                      }}
                    />
                  </>
                )}
              </div>
              {whatsappStatus.waDiag?.lastQrAt && whatsappStatus.hasQr ? (
                <p className="whatsapp-qr-hint" style={{ color: '#007d8a' }}>
                  QR готов — сканируйте сейчас.
                  {typeof whatsappStatus.waDiag.qrAgeMs === 'number'
                    ? ` Возраст: ~${Math.max(0, Math.round(whatsappStatus.waDiag.qrAgeMs / 1000))} с`
                    : ''}
                  {typeof whatsappStatus.waDiag.qrMaxAgeMs === 'number'
                    ? ` (храним до ~${Math.round(whatsappStatus.waDiag.qrMaxAgeMs / 1000)} с).`
                    : '.'}
                </p>
              ) : null}
              <p className="whatsapp-qr-hint">
                «Обновить QR» только перезагружает картинку. Если телефон пишет ошибку — код истёк:
                «Запросить новый QR» и сканируйте сразу.
              </p>
            </div>
          </div>
        )}
        {whatsappStatus.ready && (
          <div className="whatsapp-status-success">
            <span style={{ color: '#0099A9', fontWeight: '600' }}>✅ WhatsApp клиент готов</span>
          </div>
        )}
      </div>

      <div className="whatsapp-content">
        {/* Левая колонка - Сообщение и статистика */}
        <div className="whatsapp-left">
          <div className="message-section">
            <label className="message-label">
              <FiSend className="label-icon" />
              Сообщение для рассылки
            </label>
            <textarea
              className="message-textarea"
              placeholder="Введите текст сообщения, которое будет отправлено выбранным пользователям..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={12}
            />
            <div className="message-footer">
              <span className="message-counter">
                {message.length} / 1000 символов
              </span>
              <button 
                className="btn-send" 
                disabled={!message.trim() || selectedCount === 0 || sending || !whatsappStatus.ready}
                onClick={handleSendBroadcast}
                title={!whatsappStatus.ready ? 'WhatsApp клиент не готов. Проверьте статус выше.' : ''}
              >
                {sending ? (
                  <>
                    <FiRefreshCw style={{ animation: 'spin 1s linear infinite' }} />
                    Отправка...
                  </>
                ) : (
                  <>
                    <FiSend />
                    Отправить ({selectedCount})
                  </>
                )}
              </button>
            </div>
            {sendResult && (
              <div className={`send-result ${sendResult.success ? 'send-result--success' : 'send-result--error'}`}>
                <p>{sendResult.message}</p>
                {sendResult.results && (
                  <p style={{ fontSize: '0.9rem', marginTop: '8px' }}>
                    Отправлено: {sendResult.results.sent} из {sendResult.results.total}
                    {sendResult.results.failed > 0 && `, Ошибок: ${sendResult.results.failed}`}
                  </p>
                )}
                <button 
                  onClick={() => setSendResult(null)}
                  style={{ 
                    marginTop: '8px', 
                    padding: '4px 8px', 
                    background: 'transparent', 
                    border: '1px solid currentColor', 
                    borderRadius: '4px', 
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  Закрыть
                </button>
              </div>
            )}
          </div>

          <div className="stats-section">
            <div className="stat-card">
              <div className="stat-icon stat-icon--selected">
                <FiUsers />
              </div>
              <div className="stat-info">
                <div className="stat-value">{selectedCount}</div>
                <div className="stat-label">Выбрано пользователей</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon--total">
                <FiUsers />
              </div>
              <div className="stat-info">
                <div className="stat-value">{totalCount}</div>
                <div className="stat-label">Всего в списке</div>
              </div>
            </div>
          </div>
        </div>

        {/* Правая колонка - Список пользователей и фильтры */}
        <div className="whatsapp-right">
          <div className="users-section">
            <div className="users-header">
              <h3 className="users-title">Выбор получателей</h3>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button 
                  className="btn-clear-selection" 
                  onClick={loadUsers}
                  title="Обновить список"
                  style={{ padding: '8px', background: '#f0f0f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  <FiRefreshCw />
                </button>
                {selectedCount > 0 && (
                  <button className="btn-clear-selection" onClick={handleDeselectAll}>
                    <FiX />
                    Снять выделение
                  </button>
                )}
              </div>
            </div>

            {/* Фильтры */}
            <div className="users-filters">
              <div className="filter-search">
                <FiSearch className="search-icon" />
                <input
                  type="text"
                  className="filter-input"
                  placeholder="Поиск по имени, email или телефону..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button className="clear-search" onClick={() => setSearchQuery('')}>
                    <FiX />
                  </button>
                )}
              </div>

              <div className="filter-buttons">
                <div className="filter-group">
                  <span className="filter-label">
                    <FiFilter />
                    Роль:
                  </span>
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
                  <span className="filter-label">
                    <FiFilter />
                    Статус:
                  </span>
                  <div className="filter-options">
                    <button
                      className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setStatusFilter('all')}
                    >
                      Все
                    </button>
                    <button
                      className={`filter-btn ${statusFilter === 'active' ? 'active' : ''}`}
                      onClick={() => setStatusFilter('active')}
                    >
                      Активные
                    </button>
                    <button
                      className={`filter-btn ${statusFilter === 'pending' ? 'active' : ''}`}
                      onClick={() => setStatusFilter('pending')}
                    >
                      Ожидают
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

            {/* Список пользователей */}
            <div className="users-list-container">
              <div className="users-list-header">
                <label className="checkbox-select-all">
                  <input
                    type="checkbox"
                    checked={selectAll && filteredUsers.length > 0}
                    onChange={handleSelectAll}
                  />
                  <span>Выбрать всех ({filteredUsers.length})</span>
                </label>
              </div>

              <div className="users-list">
                {loading ? (
                  <div className="users-empty">
                    <FiRefreshCw className="empty-icon" style={{ animation: 'spin 1s linear infinite' }} />
                    <p>Загрузка пользователей...</p>
                  </div>
                ) : error ? (
                  <div className="users-empty">
                    <FiUsers className="empty-icon" />
                    <p>Ошибка загрузки</p>
                    <span>{error}</span>
                    <button onClick={loadUsers} style={{ marginTop: '10px', padding: '8px 16px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                      Попробовать снова
                    </button>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="users-empty">
                    <FiUsers className="empty-icon" />
                    <p>Пользователи не найдены</p>
                    <span>Попробуйте изменить параметры фильтрации</span>
                  </div>
                ) : (
                  filteredUsers.map(user => {
                    const isSelected = selectedUsers.has(user.id);
                    return (
                      <div
                        key={user.id}
                        className={`user-card ${isSelected ? 'user-card--selected' : ''} ${user.status === 'blocked' ? 'user-card--blocked' : ''}`}
                        onClick={() => handleSelectUser(user.id)}
                      >
                        <div className="user-card-checkbox">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectUser(user.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div className="user-card-avatar">
                          {user.firstName && user.lastName ? (
                            <div className="avatar-placeholder">
                              {user.firstName[0]}{user.lastName[0]}
                            </div>
                          ) : (
                            <div className="avatar-placeholder">
                              <FiUsers />
                            </div>
                          )}
                        </div>
                        <div className="user-card-info">
                          <div className="user-card-name">
                            <h4>
                              {user.firstName} {user.lastName}
                              <span
                                className={`lead-type-badge ${LEAD_TYPE_CLASS[user.leadType || 'cold'] || ''}`}
                                title="Оценка по переписке в WhatsApp"
                              >
                                {LEAD_TYPE_LABELS[user.leadType || 'cold'] || user.leadType}
                              </span>
                            </h4>
                            {user.verified && (
                              <span className="verified-badge">
                                <FiCheck />
                                Верифицирован
                              </span>
                            )}
                          </div>
                          <div className="user-card-details">
                            {user.email && (
                              <span className="user-detail">
                                <strong>Email:</strong> {user.email}
                              </span>
                            )}
                            <span className="user-detail">
                              <strong>Телефон:</strong> {user.phone || user.phoneFull || 'Не указан'}
                            </span>
                            {user.country && (
                              <span className="user-detail">
                                <strong>Страна:</strong> {user.country}
                              </span>
                            )}
                            {user.language && (
                              <span className="user-detail">
                                <strong>Язык:</strong> {getLanguageName(user.language)}
                              </span>
                            )}
                            <span className={`user-role user-role--${user.role}`}>
                              {user.role === 'buyer' ? 'Покупатель' : 'Продавец'}
                            </span>
                            <span className={`user-status user-status--${user.status}`}>
                              {user.status === 'active' ? 'Активен' : user.status === 'pending' ? 'Ожидает' : 'Заблокирован'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsApp;


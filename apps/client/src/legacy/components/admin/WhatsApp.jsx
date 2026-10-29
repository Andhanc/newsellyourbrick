import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FiSearch, FiSend, FiUsers, FiFilter, FiCheck, FiX, FiRefreshCw } from 'react-icons/fi';
import { getApiBaseUrl, getApiBaseUrlSync } from '../../utils/apiConfig';
import './WhatsApp.css';

// Функция для получения названия языка по коду
const LEAD_TYPE_LABEL_KEYS = {
  hot: 'admin_sa_hot',
  warm: 'admin_sa_warm',
  cold: 'admin_sa_cold'
};

const LEAD_TYPE_CLASS = {
  hot: 'lead-type--hot',
  warm: 'lead-type--warm',
  cold: 'lead-type--cold'
};

const getLanguageName = (langCode, t) => {
  const keys = {
    ru: 'admin_russian',
    en: 'admin_english',
    es: 'admin_spanish',
    de: 'admin_german',
    fr: 'admin_french',
    it: 'admin_italian',
    pt: 'admin_portuguese',
    pl: 'admin_polish',
    tr: 'admin_turkish',
    uk: 'admin_ukrainian',
  };
  const key = keys[langCode];
  if (key) return t(key);
  return langCode || t('admin_notSpecified');
};

const WhatsApp = () => {
  const { t } = useTranslation();
  const LEAD_TYPE_LABELS = {
    hot: t(LEAD_TYPE_LABEL_KEYS.hot),
    warm: t(LEAD_TYPE_LABEL_KEYS.warm),
    cold: t(LEAD_TYPE_LABEL_KEYS.cold),
  };
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
            ? t('admin_ackend_nedostupen_zapustite__d02706cd')
            : response.status === 404
              ? t('admin_marshrut__ne_nayden_24df4536')
              : t('admin_zapros_statusa_hatspp__03530c70', { status: response.status });
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
          message: data.message || t('admin_hatspp_klient_gotov_k_3712c461'),
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
          message: data.message || t('admin_hatspp_klient_ne_gotov_ff6a7a6e'),
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
      setPairingNotice({ type: 'error', text: t('admin_ukazhite_sekret___17b6b9a8') });
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
        setPairingNotice({ type: 'error', text: data.error || t('admin_errorStatus_tmpl', { status: res.status }) });
        return;
      }
      setPairingNotice({ type: 'success', text: data.message || t('admin_sessiya_sbroshena_zhdem_novyy_6d02dd28') });
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
        setError(data.error || t('admin_oshibka_zagruzki_polzovateley_221df448'));
      }
    } catch (err) {
      console.error('Ошибка загрузки WhatsApp пользователей:', err);
      setError(t('admin_ne_udalos_zagruzit_polzovateley_fd1f6be1'));
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
          message: data.message || t('admin_rassylka_uspeshno_otpravlena_37f0bbb4'),
          results: data.results
        });
        // Очищаем выбранных пользователей и сообщение после успешной отправки
        setSelectedUsers(new Set());
        setSelectAll(false);
        setMessage('');
      } else {
        setSendResult({
          success: false,
          message: data.error || t('admin_oshibka_pri_otpravke_rassylki_9d690430'),
          results: data.results
        });
      }
    } catch (err) {
      console.error('Ошибка отправки рассылки:', err);
      setSendResult({
        success: false,
        message: t('admin_ne_udalos_otpravit_rassylku_3299ffc7')
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
          {t('admin_hatspp_rassylka_5406edf2')}
        </h2>
        <p className="whatsapp-subtitle">
          {t('admin_podklyuchite_nomer_s_kotorogo_26a94973')}
        </p>
        {!whatsappStatus.ready && (
          <div className="whatsapp-status-warning">
            <div className="whatsapp-warning-top">
              <div>
                <span style={{ color: '#ef4444', fontWeight: '600' }}>{t('admin_hatspp_ne_podklyuchen_k_ef4528b8')}</span>
                <p style={{ margin: '6px 0 0 0', fontSize: '0.9rem', color: '#6b7280' }}>
                  {whatsappStatus.hasQr
                    ? t('admin_otkroyte_hatspp_nastroyki_svyazann_abf140f9')
                    : whatsappStatus.message ||
                      t('admin_server_zaprashivaet__u_dcf156c7')}
                </p>
                {whatsappStatus.waDiag && !whatsappStatus.ready && whatsappStatus.waDiag.lastQrAt && !whatsappStatus.waDiag.qrFresh ? (
                  <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem', color: '#b45309' }}>
                    {t('admin_posledniy__uzhe_protuh_6f4be2a6')}
                    {typeof whatsappStatus.waDiag.qrAgeMs === 'number'
                      ? t('admin_sec_s_nazad_88c2d851', { sec: Math.round(whatsappStatus.waDiag.qrAgeMs / 1000) })
                      : ''}
                    {t('admin_nazhmite_zaprosit_novyy__81220350')}
                  </p>
                ) : null}
                {whatsappStatus.pairingResetRequiresSecret ? (
                  <label style={{ display: 'block', marginTop: '10px', fontSize: '0.85rem', color: '#374151' }}>
                    {t('admin_sekret_sbrosa___b6ed3a99')}
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
                      placeholder={t('admin_tolko_dlya_servera_s_e40e281c')}
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
                    <strong style={{ fontFamily: 'inherit' }}>{t('admin_diagnostika_hatspp_eb_s_e48e849a')}</strong>
                    {whatsappStatus.waDiag.lastError ? (
                      <div style={{ color: '#b91c1c', marginTop: '6px' }}>
                        {t('admin_errorPrefix')}{whatsappStatus.waDiag.lastError}
                      </div>
                    ) : null}
                    <div style={{ marginTop: '6px' }}>
                      {t('admin_wa_state_attempts', { state: whatsappStatus.waDiag.connectionState ?? '—' })}{' '}
                      {t('admin_wa_init_pair_len', { n: whatsappStatus.waDiag.initAttempts ?? '—' })}{' '}
                      {whatsappStatus.waDiag.pairingCodeLength ?? 0}
                    </div>
                    <div style={{ marginTop: '4px' }}>
                      {t('admin_zagruzka__eb_53b891a2')}{' '}
                      {typeof whatsappStatus.waDiag.loadingPercent === 'number'
                        ? `${whatsappStatus.waDiag.loadingPercent}%`
                        : '—'}
                      {whatsappStatus.waDiag.loadingMessage
                        ? ` (${whatsappStatus.waDiag.loadingMessage})`
                        : ''}
                      {typeof whatsappStatus.waDiag.qrWaitMs === 'number'
                        ? t('admin_zhdem__sec_s_4de50ca4', { sec: Math.round(whatsappStatus.waDiag.qrWaitMs / 1000) })
                        : ''}
                      {typeof whatsappStatus.waDiag.qrStuckMs === 'number'
                        ? t('admin_avtosbros_s_sec_s_dfaaea44', { sec: Math.round(whatsappStatus.waDiag.qrStuckMs / 1000) })
                        : ''}
                    </div>
                    {typeof whatsappStatus.waDiag.autoRecoverCount === 'number' &&
                    whatsappStatus.waDiag.autoRecoverCount > 0 ? (
                      <div style={{ marginTop: '4px', color: '#b45309' }}>
                        {t('admin_wa_auto_recover', { n: whatsappStatus.waDiag.autoRecoverCount })}
                      </div>
                    ) : null}
                    <div style={{ marginTop: '4px' }}>
                      Puppeteer:{' '}
                      {whatsappStatus.waDiag.chromeExecutable
                        ? whatsappStatus.waDiag.chromeExecutable
                        : whatsappStatus.waDiag.puppeteerChannel
                          ? `channel "${whatsappStatus.waDiag.puppeteerChannel}"`
                          : t('admin_vstroennyy_hrome_iz_kesha_f8227e9a')}
                    </div>
                    <div style={{ marginTop: '4px' }}>
                      {t('admin_papka_sessii_wwebjs_auth_f2a2ab54')}{' '}
                      {whatsappStatus.waDiag.sessionFolderExists ? t('admin_est_3d510503') : t('admin_net_ced07fd1')}  · {t('admin_kesh_versii__4e803749')}{' '}
                      {whatsappStatus.waDiag.remoteWebCache ?? '—'}
                    </div>
                    {whatsappStatus.waDiag.lastQrAt ? (
                      <div style={{ marginTop: '4px', color: whatsappStatus.waDiag.qrFresh ? '#007d8a' : '#b45309' }}>
                        {t('admin_posledniy__na_servere_3ea40b77')}{' '}
                        {new Date(whatsappStatus.waDiag.lastQrAt).toLocaleString()}
                        {typeof whatsappStatus.waDiag.qrAgeMs === 'number'
                          ? t('admin_vozrast_sec_s_177d3017', { sec: Math.round(whatsappStatus.waDiag.qrAgeMs / 1000) })
                          : ''}
                        {typeof whatsappStatus.waDiag.qrMaxAgeMs === 'number'
                          ? t('admin_limit_sec_s_8b8f54ef', { sec: Math.round(whatsappStatus.waDiag.qrMaxAgeMs / 1000) })
                          : typeof whatsappStatus.waDiag.qrAgeMs === 'number'
                            ? ')'
                            : ''}
                        {whatsappStatus.waDiag.qrFresh === false ? t('admin_protuh_5ca07fbc') : ''}
                      </div>
                    ) : (
                      <div style={{ marginTop: '6px', color: '#92400e' }}>
                        {t('admin_sobytie__esche_ne_6b6048c1')}{' '}
                        <code style={{ fontSize: '0.85em' }}>npm run server</code> {t('admin_pri_konflikte_processov_b65d5375')}{' '}
                        <code style={{ fontSize: '0.85em' }}>WHATSAPP_SKIP_BOT_STATUS=1</code>.
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
              <div className="whatsapp-warning-actions">
                <button type="button" onClick={handleRefreshQr} className="btn-qr-refresh" title={t('admin_obnovit__kod_c4a9d293')}>
                  <FiRefreshCw />
                  {t('admin_sa_refresh')} QR
                </button>
                <button type="button" onClick={() => void checkWhatsAppStatus()} className="btn-qr-refresh" title={t('admin_proverit_status_b8bcfbbb')}>
                  <FiRefreshCw />
                  {t('admin_proverit_status_b8bcfbbb')}
                </button>
                {whatsappStatus.canRestartPairing ? (
                  <button
                    type="button"
                    onClick={() => void handleRestartPairing()}
                    className="btn-qr-refresh"
                    disabled={pairingResetBusy}
                    title={t('admin_sbrosit_sessiyu_hatspp_eb_3dc1481b')}
                  >
                    <FiRefreshCw style={pairingResetBusy ? { animation: 'spin 1s linear infinite' } : undefined} />
                    {t('admin_zaprosit_novyy__51a74c02')}
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
                      {t('admin_generiruem__kod_c448c753')}
                      {typeof whatsappStatus.waDiag?.loadingPercent === 'number'
                        ? ` ${whatsappStatus.waDiag.loadingPercent}%`
                        : ''}
                    </p>
                    <span className="whatsapp-qr-loading-hint">
                      {t('admin_obychno_30_90_sekund_889b9b97')}
                      {typeof whatsappStatus.waDiag?.qrWaitMs === 'number'
                        ? t('admin_uzhe_zhdem_sec_s_2ac9095f', { sec: Math.round(whatsappStatus.waDiag.qrWaitMs / 1000) })
                        : ''}
                      {whatsappStatus.canRestartPairing && !whatsappStatus.hasQr
                        ? t('admin_esli_dolshe_2_minut_96ecbc66')
                        : ''}
                    </span>
                  </div>
                ) : (
                  <>
                    {qrImageLoading ? (
                      <div className="whatsapp-qr-loading whatsapp-qr-loading--overlay" role="status" aria-live="polite">
                        <div className="whatsapp-qr-spinner" aria-hidden />
                        <p className="whatsapp-qr-loading-text">{t('admin_zagruzhaem__cf461e89')}</p>
                      </div>
                    ) : null}
                    <img
                      src={`${String(getApiBaseUrlSync()).replace(/\/$/, '')}/whatsapp/qr?t=${qrTimestamp}`}
                      alt={t('admin_hatspp__kod_dlya_58f766ff')}
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
                  {t('admin__gotov_skaniruyte_seychas_bf34b31f')}
                  {typeof whatsappStatus.waDiag.qrAgeMs === 'number'
                    ? t('admin_vozrast_sec_s_90967fc4', { sec: Math.max(0, Math.round(whatsappStatus.waDiag.qrAgeMs / 1000)) })
                    : ''}
                  {typeof whatsappStatus.waDiag.qrMaxAgeMs === 'number'
                    ? t('admin_hranim_do_sec_s_305aa418', { sec: Math.round(whatsappStatus.waDiag.qrMaxAgeMs / 1000) })
                    : '.'}
                </p>
              ) : null}
              <p className="whatsapp-qr-hint">
                {t('admin_wa_refresh_qr_hint', { action: t('admin_zaprosit_novyy__51a74c02') })}
              </p>
            </div>
          </div>
        )}
        {whatsappStatus.ready && (
          <div className="whatsapp-status-success">
            <span style={{ color: '#0099A9', fontWeight: '600' }}>{t('admin_hatspp_klient_gotov_ed5e3d75')}</span>
          </div>
        )}
      </div>

      <div className="whatsapp-content">
        {/* Левая колонка - Сообщение и статистика */}
        <div className="whatsapp-left">
          <div className="message-section">
            <label className="message-label">
              <FiSend className="label-icon" />
              {t('admin_soobschenie_dlya_rassylki_7365754b')}
            </label>
            <textarea
              className="message-textarea"
              placeholder={t('admin_vvedite_tekst_soobscheniya_kotoroe_0fd34bc0')}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={12}
            />
            <div className="message-footer">
              <span className="message-counter">
                {message.length} / 1000 {t('admin_simvolov_7fbc31ec')}
              </span>
              <button 
                className="btn-send" 
                disabled={!message.trim() || selectedCount === 0 || sending || !whatsappStatus.ready}
                onClick={handleSendBroadcast}
                title={!whatsappStatus.ready ? t('admin_hatspp_klient_ne_gotov_641940b7') : ''}
              >
                {sending ? (
                  <>
                    <FiRefreshCw style={{ animation: 'spin 1s linear infinite' }} />
                    {t('admin_otpravka_9b476aa9')}
                  </>
                ) : (
                  <>
                    <FiSend />
                    {t('admin_otpravit_e3c48319')}{selectedCount})
                  </>
                )}
              </button>
            </div>
            {sendResult && (
              <div className={`send-result ${sendResult.success ? 'send-result--success' : 'send-result--error'}`}>
                <p>{sendResult.message}</p>
                {sendResult.results && (
                  <p style={{ fontSize: '0.9rem', marginTop: '8px' }}>
                    {t('admin_otpravleno_sent_iz_total_9c95f654', { sent: sendResult.results.sent, total: sendResult.results.total })}
                    {sendResult.results.failed > 0 && t('admin_oshibok_n_59f72501', { n: sendResult.results.failed })}
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
                  {t('admin_close')}
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
                <div className="stat-label">{t('admin_vybrano_polzovateley_00b22e37')}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon--total">
                <FiUsers />
              </div>
              <div className="stat-info">
                <div className="stat-value">{totalCount}</div>
                <div className="stat-label">{t('admin_vsego_v_spiske_601e57c4')}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Правая колонка - Список пользователей и фильтры */}
        <div className="whatsapp-right">
          <div className="users-section">
            <div className="users-header">
              <h3 className="users-title">{t('admin_vybor_poluchateley_6e57d5ff')}</h3>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button 
                  className="btn-clear-selection" 
                  onClick={loadUsers}
                  title={t('admin_obnovit_spisok_0cd9c0df')}
                  style={{ padding: '8px', background: '#f0f0f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  <FiRefreshCw />
                </button>
                {selectedCount > 0 && (
                  <button className="btn-clear-selection" onClick={handleDeselectAll}>
                    <FiX />
                    {t('admin_snyat_vydelenie_91471074')}
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
                  placeholder={t('admin_poisk_po_imeni_email_8fc3fac5')}
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
                    {t('admin_rol_86bc8f1a')}
                  </span>
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
                  <span className="filter-label">
                    <FiFilter />
                    {t('admin_status_b90462b6')}
                  </span>
                  <div className="filter-options">
                    <button
                      className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setStatusFilter('all')}
                    >
                      {t('admin_all')}
                    </button>
                    <button
                      className={`filter-btn ${statusFilter === 'active' ? 'active' : ''}`}
                      onClick={() => setStatusFilter('active')}
                    >
                      {t('admin_aktivnye_6009f6cb')}
                    </button>
                    <button
                      className={`filter-btn ${statusFilter === 'pending' ? 'active' : ''}`}
                      onClick={() => setStatusFilter('pending')}
                    >
                      {t('admin_ozhidayut_9cf13148')}
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

            {/* Список пользователей */}
            <div className="users-list-container">
              <div className="users-list-header">
                <label className="checkbox-select-all">
                  <input
                    type="checkbox"
                    checked={selectAll && filteredUsers.length > 0}
                    onChange={handleSelectAll}
                  />
                  <span>{t('admin_vybrat_vseh_f12debc9')}{filteredUsers.length})</span>
                </label>
              </div>

              <div className="users-list">
                {loading ? (
                  <div className="users-empty">
                    <FiRefreshCw className="empty-icon" style={{ animation: 'spin 1s linear infinite' }} />
                    <p>{t('admin_zagruzka_polzovateley_983713a1')}</p>
                  </div>
                ) : error ? (
                  <div className="users-empty">
                    <FiUsers className="empty-icon" />
                    <p>{t('admin_loadError')}</p>
                    <span>{error}</span>
                    <button onClick={loadUsers} style={{ marginTop: '10px', padding: '8px 16px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                      {t('admin_tryAgain')}
                    </button>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="users-empty">
                    <FiUsers className="empty-icon" />
                    <p>{t('admin_polzovateli_ne_naydeny_942d94c3')}</p>
                    <span>{t('admin_poprobuyte_izmenit_parametry_filtrac_a88b2d1a')}</span>
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
                                title={t('admin_ocenka_po_perepiske_v_c77c2672')}
                              >
                                {LEAD_TYPE_LABELS[user.leadType || 'cold'] || user.leadType}
                              </span>
                            </h4>
                            {user.verified && (
                              <span className="verified-badge">
                                <FiCheck />
                                {t('admin_verificirovan_d027fb34')}
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
                              <strong>{t('admin_telefon_0e41c7c4')}</strong> {user.phone || user.phoneFull || t('admin_ne_ukazan_3b3c4f15')}
                            </span>
                            {user.country && (
                              <span className="user-detail">
                                <strong>{t('admin_sa_countryLabel')}</strong> {user.country}
                              </span>
                            )}
                            {user.language && (
                              <span className="user-detail">
                                <strong>{t('admin_yazyk_e1357f63')}</strong> {getLanguageName(user.language, t)}
                              </span>
                            )}
                            <span className={`user-role user-role--${user.role}`}>
                              {user.role === 'buyer' ? t('admin_buyer') : t('admin_seller')}
                            </span>
                            <span className={`user-status user-status--${user.status}`}>
                              {user.status === 'active' ? t('admin_aktiven_667904ef') : user.status === 'pending' ? t('admin_pending') : t('admin_zablokirovan_2c998bfc')}
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


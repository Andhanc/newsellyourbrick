import React, { useState, useEffect } from 'react';
import { FiX, FiCreditCard, FiUser, FiMail, FiCalendar } from 'react-icons/fi';
import { getApiBaseUrl } from '../../utils/apiConfig';
import { formatBillingReasonForUi } from '../../utils/formatBillingReason';
import './PaymentsModal.css';

function formatMoney(cents, currency) {
  if (cents == null) return '—';
  const cur = (currency || 'eur').toUpperCase();
  const amount = cents / 100;
  try {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: cur }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${cur}`;
  }
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

const PaymentsModal = ({ isOpen, onClose }) => {
  const [tab, setTab] = useState('all');
  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [resRows, setResRows] = useState([]);
  const [surveyRows, setSurveyRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const API_BASE_URL = await getApiBaseUrl();
        const [allRes, resRes, surveyRes] = await Promise.all([
          fetch(`${API_BASE_URL}/admin/stripe-payments`),
          fetch(`${API_BASE_URL}/admin/reservation-purchases`),
          fetch(`${API_BASE_URL}/admin/test-drive/survey-financial`),
        ]);
        const allJson = await allRes.json().catch(() => ({}));
        const resJson = await resRes.json().catch(() => ({}));
        const surveyJson = await surveyRes.json().catch(() => ({}));
        if (!allRes.ok || !allJson.success) {
          throw new Error(allJson.error || 'Не удалось загрузить платежи');
        }
        if (!cancelled) {
          setRows(allJson.data?.payments || []);
          setTotalCount(allJson.data?.totalCount ?? 0);
          setResRows(resJson.success && Array.isArray(resJson.data) ? resJson.data : []);
          if (surveyRes.ok && surveyJson.success && Array.isArray(surveyJson.data)) {
            setSurveyRows(surveyJson.data);
          } else {
            setSurveyRows([]);
          }
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'Ошибка загрузки');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const getName = (p) => {
    const fn = p.first_name || '';
    const ln = p.last_name || '';
    const s = `${fn} ${ln}`.trim();
    return s || '—';
  };

  return (
    <div className="payments-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="payments-modal-title">
      <div className="payments-modal">
        <div className="payments-modal__header">
          <div className="payments-modal__title-wrap">
            <FiCreditCard className="payments-modal__title-icon" aria-hidden />
            <h2 id="payments-modal-title" className="payments-modal__title">
              Платежи Stripe
            </h2>
            <span className="payments-modal__badge">{totalCount} записей</span>
          </div>
          <button type="button" className="payments-modal__close" onClick={onClose} aria-label="Закрыть">
            <FiX size={22} />
          </button>
        </div>
        <div className="payments-modal__tabs">
          <button
            type="button"
            className={`payments-modal__tab ${tab === 'all' ? 'payments-modal__tab--active' : ''}`}
            onClick={() => setTab('all')}
          >
            Все платежи
          </button>
          <button
            type="button"
            className={`payments-modal__tab ${tab === 'reservations' ? 'payments-modal__tab--active' : ''}`}
            onClick={() => setTab('reservations')}
          >
            Резерв 10% ({resRows.length})
          </button>
          <button
            type="button"
            className={`payments-modal__tab ${tab === 'td_surveys' ? 'payments-modal__tab--active' : ''}`}
            onClick={() => setTab('td_surveys')}
          >
            Тест-драйв · опросы ({surveyRows.length})
          </button>
        </div>
        <div className="payments-modal__body">
          {loading && <div className="payments-modal__hint">Загрузка…</div>}
          {error && <div className="payments-modal__error">{error}</div>}
          {!loading && !error && tab === 'all' && rows.length === 0 && (
            <div className="payments-modal__empty">Пока нет платежей</div>
          )}
          {!loading && !error && tab === 'all' && rows.length > 0 && (
            <div className="payments-modal__table-wrap">
              <table className="payments-modal__table">
                <thead>
                  <tr>
                    <th>Дата оплаты</th>
                    <th>Сумма</th>
                    <th>План</th>
                    <th>Пользователь</th>
                    <th>Email</th>
                    <th>Причина</th>
                    <th>Invoice / Session</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <span className="payments-modal__cell-muted">
                          <FiCalendar className="payments-modal__inline-icon" aria-hidden />
                          {formatDate(p.paid_at)}
                        </span>
                      </td>
                      <td className="payments-modal__amount">{formatMoney(p.amount_cents, p.currency)}</td>
                      <td>{(p.plan_key || 'pro').toUpperCase()}</td>
                      <td>
                        <span className="payments-modal__cell-user">
                          <FiUser className="payments-modal__inline-icon" aria-hidden />
                          {getName(p)} <span className="payments-modal__uid">#{p.user_id}</span>
                        </span>
                      </td>
                      <td>
                        <span className="payments-modal__cell-email">
                          <FiMail className="payments-modal__inline-icon" aria-hidden />
                          {p.email || p.customer_email || '—'}
                        </span>
                      </td>
                      <td className="payments-modal__cell-muted">
                        {formatBillingReasonForUi(p.billing_reason) || '—'}
                      </td>
                      <td className="payments-modal__cell-mono">
                        {p.stripe_invoice_id || p.stripe_checkout_session_id || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading && !error && tab === 'reservations' && resRows.length === 0 && (
            <div className="payments-modal__empty">Нет резервов 10%</div>
          )}
          {!loading && !error && tab === 'reservations' && resRows.length > 0 && (
            <div className="payments-modal__table-wrap">
              <table className="payments-modal__table">
                <thead>
                  <tr>
                    <th>Дата</th>
                    <th>Покупатель</th>
                    <th>Объект</th>
                    <th>Мин. цена</th>
                    <th>Карта</th>
                    <th>Депозит €</th>
                    <th>Осталось</th>
                    <th>Session</th>
                  </tr>
                </thead>
                <tbody>
                  {resRows.map((p) => {
                    const b = p.billing || {};
                    return (
                      <tr key={p.id}>
                        <td>{formatDate(p.paid_at)}</td>
                        <td>
                          {getName(p)} <span className="payments-modal__uid">#{p.user_id}</span>
                          <div className="payments-modal__cell-muted">{p.email || p.customer_email || ''}</div>
                        </td>
                        <td>#{b.property_id ?? '—'}</td>
                        <td>
                          {b.minimum_sale_price != null
                            ? formatMoney(Math.round(b.minimum_sale_price * 100), p.currency)
                            : '—'}
                        </td>
                        <td>{formatMoney(p.amount_cents, p.currency)}</td>
                        <td>{b.wallet_eur_applied ? `€${b.wallet_eur_applied}` : '—'}</td>
                        <td>
                          {b.remaining_to_full_purchase != null
                            ? formatMoney(Math.round(b.remaining_to_full_purchase * 100), p.currency)
                            : '—'}
                        </td>
                        <td className="payments-modal__cell-mono">{p.stripe_checkout_session_id || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {!loading && !error && tab === 'td_surveys' && surveyRows.length === 0 && (
            <div className="payments-modal__empty">Нет платежей тест-драйва с опросами</div>
          )}
          {!loading && !error && tab === 'td_surveys' && surveyRows.length > 0 && (
            <div className="payments-modal__table-wrap">
              <table className="payments-modal__table">
                <thead>
                  <tr>
                    <th>Оплата</th>
                    <th>Сумма</th>
                    <th>Покупатель</th>
                    <th>Бронь / объект</th>
                    <th>WA рассылка</th>
                    <th>Опрос</th>
                    <th>Ответы (кратко)</th>
                  </tr>
                </thead>
                <tbody>
                  {surveyRows.map((s) => (
                    <tr key={`${s.booking_id}-${s.paid_at}`}>
                      <td>{formatDate(s.paid_at)}</td>
                      <td className="payments-modal__amount">{formatMoney(s.amount_cents, s.currency)}</td>
                      <td>
                        {[s.first_name, s.last_name].filter(Boolean).join(' ') || '—'}{' '}
                        <span className="payments-modal__uid">#{s.user_id}</span>
                        {s.email ? <div className="payments-modal__survey-email">{s.email}</div> : null}
                      </td>
                      <td>
                        #{s.booking_id}
                        <div className="payments-modal__survey-email">
                          {s.property_table} · #{s.property_id}
                        </div>
                      </td>
                      <td>
                        <span
                          className={
                            String(s.survey_whatsapp_status || '').toLowerCase() === 'sent'
                              ? 'payments-modal__pill payments-modal__pill--ok'
                              : 'payments-modal__pill payments-modal__pill--wait'
                          }
                        >
                          {String(s.survey_whatsapp_status || '').toLowerCase() === 'sent'
                            ? 'отправлено'
                            : 'ожидает'}
                        </span>
                        <div className="payments-modal__cell-muted">
                          {s.survey_whatsapp_sent_at ? formatDate(s.survey_whatsapp_sent_at) : ''}
                        </div>
                      </td>
                      <td>{s.survey_completed ? 'да' : 'нет'}</td>
                      <td className="payments-modal__cell-muted" style={{ maxWidth: 280 }}>
                        {s.answers_summary || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentsModal;

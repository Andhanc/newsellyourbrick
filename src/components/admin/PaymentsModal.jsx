import React, { useState, useEffect } from 'react';
import { FiX, FiCreditCard, FiUser, FiMail, FiCalendar } from 'react-icons/fi';
import { getApiBaseUrl } from '../../utils/apiConfig';
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
  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
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
        const res = await fetch(`${API_BASE_URL}/admin/stripe-payments`);
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Не удалось загрузить');
        }
        if (!cancelled) {
          setRows(json.data?.payments || []);
          setTotalCount(json.data?.totalCount ?? 0);
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
        <div className="payments-modal__body">
          {loading && <div className="payments-modal__hint">Загрузка…</div>}
          {error && <div className="payments-modal__error">{error}</div>}
          {!loading && !error && rows.length === 0 && (
            <div className="payments-modal__empty">Пока нет платежей</div>
          )}
          {!loading && !error && rows.length > 0 && (
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
                      <td className="payments-modal__cell-muted">{p.billing_reason || '—'}</td>
                      <td className="payments-modal__cell-mono">
                        {p.stripe_invoice_id || p.stripe_checkout_session_id || '—'}
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

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FiX, FiCreditCard, FiUser, FiMail, FiCalendar } from 'react-icons/fi';
import { getApiBaseUrl } from '../../utils/apiConfig';
import { formatBillingReasonForUi } from '../../utils/formatBillingReason';
import './PaymentsModal.css';
import { getUiIntlLocale } from '../../utils/uiIntlLocale'

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
    return new Date(iso).toLocaleString(getUiIntlLocale(), {
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
  const { t } = useTranslation();
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
          throw new Error(allJson.error || t('admin_paymentsLoadFail'));
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
        if (!cancelled) setError(e.message || t('admin_loadError'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, t]);

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
              {t('admin_platezhi_tripe_5fb031b0')}
            </h2>
            <span className="payments-modal__badge">{t('admin_n_zapisey_345c996f', { n: totalCount })}</span>
          </div>
          <button type="button" className="payments-modal__close" onClick={onClose} aria-label={t('admin_close')}>
            <FiX size={22} />
          </button>
        </div>
        <div className="payments-modal__tabs">
          <button
            type="button"
            className={`payments-modal__tab ${tab === 'all' ? 'payments-modal__tab--active' : ''}`}
            onClick={() => setTab('all')}
          >
            {t('admin_vse_platezhi_6ea32dba')}
          </button>
          <button
            type="button"
            className={`payments-modal__tab ${tab === 'reservations' ? 'payments-modal__tab--active' : ''}`}
            onClick={() => setTab('reservations')}
          >
            {t('admin_rezerv_10_n_08288823', { n: resRows.length })}
          </button>
          <button
            type="button"
            className={`payments-modal__tab ${tab === 'td_surveys' ? 'payments-modal__tab--active' : ''}`}
            onClick={() => setTab('td_surveys')}
          >
            {t('admin_test_drayv_oprosy_n_20050360', { n: surveyRows.length })}
          </button>
        </div>
        <div className="payments-modal__body">
          {loading && <div className="payments-modal__hint">{t('admin_loadingEllipsis')}</div>}
          {error && <div className="payments-modal__error">{error}</div>}
          {!loading && !error && tab === 'all' && rows.length === 0 && (
            <div className="payments-modal__empty">{t('admin_poka_net_platezhey_b082e1e6')}</div>
          )}
          {!loading && !error && tab === 'all' && rows.length > 0 && (
            <div className="payments-modal__table-wrap">
              <table className="payments-modal__table">
                <thead>
                  <tr>
                    <th>{t('admin_data_oplaty_4123512f')}</th>
                    <th>{t('admin_summa_99d74083')}</th>
                    <th>{t('admin_plan_3146141c')}</th>
                    <th>{t('admin_polzovatel_51aff185')}</th>
                    <th>Email</th>
                    <th>{t('admin_prichina_4a9ea52c')}</th>
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
            <div className="payments-modal__empty">{t('admin_net_rezervov_10_e12a1304')}</div>
          )}
          {!loading && !error && tab === 'reservations' && resRows.length > 0 && (
            <div className="payments-modal__table-wrap">
              <table className="payments-modal__table">
                <thead>
                  <tr>
                    <th>{t('admin_data_a5b49d2e')}</th>
                    <th>{t('admin_buyer')}</th>
                    <th>{t('admin_pr_property')}</th>
                    <th>{t('admin_min_cena_31615d37')}</th>
                    <th>{t('admin_karta_5736d0ca')}</th>
                    <th>{t('admin_depozit_ef36b180')}</th>
                    <th>{t('admin_ostalos_76a8eb13')}</th>
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
            <div className="payments-modal__empty">{t('admin_net_platezhey_test_drayva_0a602b45')}</div>
          )}
          {!loading && !error && tab === 'td_surveys' && surveyRows.length > 0 && (
            <div className="payments-modal__table-wrap">
              <table className="payments-modal__table">
                <thead>
                  <tr>
                    <th>{t('admin_oplata_f076d3b3')}</th>
                    <th>{t('admin_summa_99d74083')}</th>
                    <th>{t('admin_buyer')}</th>
                    <th>{t('admin_bron_obekt_e30985b0')}</th>
                    <th>{t('admin__rassylka_107ff098')}</th>
                    <th>{t('admin_opros_24574ad6')}</th>
                    <th>{t('admin_otvety_kratko_f8d3d71b')}</th>
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
                            ? t('admin_otpravleno_c333d1a6')
                            : t('admin_ozhidaet_e837624f')}
                        </span>
                        <div className="payments-modal__cell-muted">
                          {s.survey_whatsapp_sent_at ? formatDate(s.survey_whatsapp_sent_at) : ''}
                        </div>
                      </td>
                      <td>{s.survey_completed ? t('admin_da_d4f57dba') : t('admin_net_ced07fd1')}</td>
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

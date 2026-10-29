import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiMail, FiPlus, FiRefreshCw, FiUserPlus } from 'react-icons/fi';
import { getApiBaseUrl } from '../../utils/apiConfig';
import { sendCrmEmailFromBrowser } from '../../utils/crmClientEmail';
import { showNotification } from '../../utils/toastHelper';
import { useDrawerDismiss } from '../../hooks/useDrawerDismiss';
import './CrmBoard.css';
import { getUiIntlLocale } from '../../utils/uiIntlLocale'

function adminLabel() {
  try {
    const p = JSON.parse(localStorage.getItem('adminPermissions') || '{}');
    return p.username || p.email || 'admin';
  } catch {
    return 'admin';
  }
}

function dropIndexFromEvent(e, columnEl, draggingId) {
  const cards = [...columnEl.querySelectorAll('[data-crm-card]')].filter(
    (el) => parseInt(el.dataset.leadId, 10) !== draggingId
  );
  let idx = 0;
  for (let i = 0; i < cards.length; i++) {
    const rect = cards[i].getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    if (e.clientY > mid) idx = i + 1;
    else break;
  }
  return idx;
}

const TEMP_CLASS = {
  cold: 'crm-board__temp--cold',
  warm: 'crm-board__temp--warm',
  hot: 'crm-board__temp--hot',
};

function fmtCrmShortDate(s) {
  if (s == null || s === '') return '—';
  const d = new Date(String(s).replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return String(s).slice(0, 16);
  return d.toLocaleString(getUiIntlLocale(), {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function sourceRu(src, t) {
  const m = {
    manual: t('admin_manual'),
    user_import: t('admin_import'),
    assistant_import: t('admin_assistant'),
    auto_user_sync: t('admin_userBase'),
  };
  return m[src] || src || '—';
}

function clip(s, n) {
  if (s == null || s === '') return '—';
  const t = String(s).trim();
  return t.length <= n ? t : `${t.slice(0, n)}…`;
}

export default function CrmBoard() {
  const { t } = useTranslation();
  const [board, setBoard] = useState({ stages: [], leadsByStage: {} });
  const [loading, setLoading] = useState(true);
  const [dragOverStage, setDragOverStage] = useState(null);
  const skipCardClickRef = useRef(false);

  const [drawerLeadId, setDrawerLeadId] = useState(null);
  const isDrawerOpen = Boolean(drawerLeadId);
  const { visible: drawerVisible, isClosing: drawerClosing, requestClose: closeDrawer } =
    useDrawerDismiss(isDrawerOpen, () => setDrawerLeadId(null));
  const [detail, setDetail] = useState(null);
  const [activities, setActivities] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const [showNewModal, setShowNewModal] = useState(false);
  const [newForm, setNewForm] = useState({
    display_name: '',
    email: '',
    phone: '',
    temperature: 'warm',
  });

  const [userQuery, setUserQuery] = useState('');
  const [userHits, setUserHits] = useState([]);
  const [assistantLeads, setAssistantLeads] = useState([]);

  /** Тема и текст письма в карточке лида (контролируемые — то же уходит в EmailJS). */
  const [emailCompose, setEmailCompose] = useState({ subject: '', body: '' });

  const loadBoard = useCallback(async () => {
    setLoading(true);
    try {
      const base = await getApiBaseUrl();
      const res = await fetch(`${base}/admin/crm/board`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || t('admin_loadError'));
      setBoard(json.data);
    } catch (err) {
      console.error(err);
      showNotification(err.message || t('admin_ne_udalos_zagruzit__7d8bda4d'), 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  useEffect(() => {
    (async () => {
      try {
        const base = await getApiBaseUrl();
        const res = await fetch(`${base}/admin/crm/assistant-leads`);
        const json = await res.json();
        if (json.success) setAssistantLeads(json.data || []);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (userQuery.trim().length < 2) {
        setUserHits([]);
        return;
      }
      try {
        const base = await getApiBaseUrl();
        const res = await fetch(
          `${base}/admin/crm/user-search?q=${encodeURIComponent(userQuery.trim())}`
        );
        const json = await res.json();
        if (json.success) setUserHits(json.data || []);
      } catch {
        setUserHits([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [userQuery]);

  useEffect(() => {
    const id = detail?.lead?.id;
    if (!id) return;
    setEmailCompose({
      subject: t('admin_personalnoe_predlozhenie_ellyourbri_7dd4cf48'),
      body: '',
    });
  }, [detail?.lead?.id]);

  const openDrawer = async (leadId) => {
    setDrawerLeadId(leadId);
    setDetailLoading(true);
    setDetail(null);
    setActivities([]);
    try {
      const base = await getApiBaseUrl();
      const [r1, r2] = await Promise.all([
        fetch(`${base}/admin/crm/leads/${leadId}`),
        fetch(`${base}/admin/crm/leads/${leadId}/activities`),
      ]);
      const j1 = await r1.json();
      const j2 = await r2.json();
      if (j1.success) setDetail(j1.data);
      else throw new Error(j1.error);
      if (j2.success) setActivities(j2.data || []);
    } catch (err) {
      showNotification(err.message || t('admin_error'), 'error');
      setDrawerLeadId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const saveLeadPatch = async (patch) => {
    if (!drawerLeadId) return;
    try {
      const base = await getApiBaseUrl();
      const res = await fetch(`${base}/admin/crm/leads/${drawerLeadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      const r1 = await fetch(`${base}/admin/crm/leads/${drawerLeadId}`);
      const j1 = await r1.json();
      if (j1.success) {
        setDetail((d) => ({
          ...d,
          lead: j1.data.lead,
          userSummary: j1.data.userSummary ?? d?.userSummary,
          touchCount: j1.data.touchCount,
          activityCount: j1.data.activityCount,
        }));
      } else {
        setDetail((d) => ({ ...d, lead: json.data }));
      }
      loadBoard();
      showNotification(t('admin_sohraneno_f0dff5ab'), 'success');
    } catch (err) {
      showNotification(err.message || t('admin_oshibka_sohraneniya_c628b585'), 'error');
    }
  };

  const addActivity = async (kind, title, body) => {
    if (!drawerLeadId) return;
    try {
      const base = await getApiBaseUrl();
      const res = await fetch(`${base}/admin/crm/leads/${drawerLeadId}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          title,
          body,
          createdBy: adminLabel(),
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      const r2 = await fetch(`${base}/admin/crm/leads/${drawerLeadId}/activities`);
      const j2 = await r2.json();
      if (j2.success) setActivities(j2.data || []);
      const r1 = await fetch(`${base}/admin/crm/leads/${drawerLeadId}`);
      const j1 = await r1.json();
      if (j1.success) setDetail(j1.data);
      loadBoard();
    } catch (err) {
      showNotification(err.message || t('admin_error'), 'error');
    }
  };

  const sendEmail = async () => {
    if (!drawerLeadId) return;
    const lead = detail?.lead;
    const toEmail = lead?.email && String(lead.email).trim();
    if (!toEmail) {
      showNotification(t('admin_u_lida_net_email_1e5d635b'), 'error');
      return;
    }
    const subj =
      emailCompose.subject != null && String(emailCompose.subject).trim()
        ? String(emailCompose.subject).trim()
        : t('admin_soobschenie_ot_ellyourbrick_63109ae4');
    const text = emailCompose.body != null ? String(emailCompose.body) : '';
    try {
      await sendCrmEmailFromBrowser({
        toEmail,
        subject: subj,
        messageBody: text,
        fromName: lead.display_name ? `Sellyourbrick · ${lead.display_name}` : 'Sellyourbrick',
      });
      showNotification(t('admin_pismo_otpravleno_8eaa0627'), 'success');
      await addActivity('email_sent', subj, text.slice(0, 4000));
    } catch (err) {
      const msg = String(err?.message || '')
      const translated =
        msg === 'crmEmailErr_missingKeys'
          ? t('crmEmailErr_missingKeys')
          : msg === 'crmEmailErr_missingTemplate'
            ? t('crmEmailErr_missingTemplate')
            : msg.startsWith('crmEmailErr_status:')
              ? t('crmEmailErr_status', { status: msg.split(':')[1] })
              : msg || t('admin_oshibka_otpravki_4cf77bf2')
      showNotification(translated, 'error');
    }
  };

  const handleDrop = async (e, stageId) => {
    e.preventDefault();
    setDragOverStage(null);
    const leadId = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (!Number.isFinite(leadId)) return;
    const idx = dropIndexFromEvent(e, e.currentTarget, leadId);
    try {
      const base = await getApiBaseUrl();
      const res = await fetch(`${base}/admin/crm/leads/${leadId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageId, index: idx }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      await loadBoard();
    } catch (err) {
      showNotification(err.message || t('admin_ne_udalos_peremestit_c3c44d8e'), 'error');
    }
  };

  const createLead = async () => {
    if (!newForm.display_name.trim()) {
      showNotification(t('admin_ukazhite_imya_d82e9634'), 'error');
      return;
    }
    try {
      const base = await getApiBaseUrl();
      const res = await fetch(`${base}/admin/crm/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: newForm.display_name.trim(),
          email: newForm.email.trim() || null,
          phone: newForm.phone.trim() || null,
          temperature: newForm.temperature,
          source: 'manual',
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setShowNewModal(false);
      setNewForm({ display_name: '', email: '', phone: '', temperature: 'warm' });
      await loadBoard();
      openDrawer(json.data.id);
    } catch (err) {
      showNotification(err.message || t('admin_error'), 'error');
    }
  };

  const importUser = async (userId) => {
    try {
      const base = await getApiBaseUrl();
      const res = await fetch(`${base}/admin/crm/import-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, createdBy: adminLabel() }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setUserHits([]);
      setUserQuery('');
      await loadBoard();
      openDrawer(json.data.id);
      showNotification(json.message || t('admin_dobavleno_158599b9'), 'success');
    } catch (err) {
      showNotification(err.message || t('admin_error'), 'error');
    }
  };

  const importAssistant = async (assistantLeadId) => {
    if (!assistantLeadId) return;
    try {
      const base = await getApiBaseUrl();
      const res = await fetch(`${base}/admin/crm/import-assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assistantLeadId, createdBy: adminLabel() }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      await loadBoard();
      openDrawer(json.data.id);
      showNotification(json.message || t('admin_dobavleno_158599b9'), 'success');
    } catch (err) {
      showNotification(err.message || t('admin_error'), 'error');
    }
  };

  const lead = detail?.lead;

  return (
    <div className="crm-board">
      <div className="crm-board__toolbar">
        <div className="crm-board__toolbar-group">
          <label>{t('admin_novyy_lid_711dc83d')}</label>
          <button type="button" className="crm-board__btn crm-board__btn--primary" onClick={() => setShowNewModal(true)}>
            <FiPlus /> {t('admin_dobavit_vruchnuyu_c5e9147e')}
          </button>
        </div>
        <div className="crm-board__toolbar-group crm-board__search-wrap">
          <label>{t('admin_import_polzovatelya_180d466f')}</label>
          <input
            type="search"
            placeholder={t('admin_poisk_po_email_imeni_b4fbc243')}
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
          />
          {userHits.length > 0 && (
            <div className="crm-board__search-results">
              {userHits.map((u) => (
                <div
                  key={u.id}
                  className="crm-board__search-item"
                  role="button"
                  tabIndex={0}
                  onClick={() => importUser(u.id)}
                  onKeyDown={(e) => e.key === 'Enter' && importUser(u.id)}
                >
                  <strong>
                    {[u.first_name, u.last_name].filter(Boolean).join(' ') || '—'}
                  </strong>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                    {u.email || t('admin_net_email_7b7bc727')} · ID {u.id}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="crm-board__toolbar-group">
          <label>{t('admin_iz_umnogo_pomoschnika_2f02bdc8')}</label>
          <select
            defaultValue=""
            onChange={(e) => {
              const v = e.target.value;
              e.target.value = '';
              if (v) importAssistant(parseInt(v, 10));
            }}
          >
            <option value="">{t('admin_vyberite_lid_chata_3e1d4851')}</option>
            {assistantLeads.map((a) => (
              <option key={a.id} value={a.id}>
                #{a.id} {a.summary ? a.summary.slice(0, 40) : a.email || a.phone || t('admin_bez_kontakta_c43b86a4')}
              </option>
            ))}
          </select>
        </div>
        <div className="crm-board__toolbar-group">
          <label>&nbsp;</label>
          <button type="button" className="crm-board__btn crm-board__btn--ghost" onClick={loadBoard} disabled={loading}>
            <FiRefreshCw /> {t('admin_sa_refresh')}
          </button>
        </div>
      </div>

      {loading && <div className="crm-board__empty">{t('admin_zagruzka_voronki_031ba10c')}</div>}

      {!loading && (
        <div className="crm-board__kanban">
          {board.stages.map((stage) => {
            const leads = board.leadsByStage[stage.id] || [];
            return (
              <div key={stage.id} className="crm-board__column">
                <div className="crm-board__column-header">
                  <span>{stage.label}</span>
                  <span className="crm-board__column-count">{leads.length}</span>
                </div>
                <div
                  className={`crm-board__column-body ${dragOverStage === stage.id ? 'crm-board__column-body--drag' : ''}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    setDragOverStage(stage.id);
                  }}
                  onDragLeave={() => setDragOverStage(null)}
                  onDrop={(e) => handleDrop(e, stage.id)}
                >
                  {leads.length === 0 && <div className="crm-board__empty">{t('admin_peretaschite_syuda_kartochku_154e1a32')}</div>}
                  {leads.map((L) => (
                    <div
                      key={L.id}
                      className="crm-board__card"
                      data-crm-card
                      data-lead-id={L.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', String(L.id));
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragEnd={() => {
                        skipCardClickRef.current = true;
                        window.setTimeout(() => {
                          skipCardClickRef.current = false;
                        }, 200);
                        setDragOverStage(null);
                      }}
                      onClick={() => {
                        if (skipCardClickRef.current) return;
                        openDrawer(L.id);
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && openDrawer(L.id)}
                    >
                      <div className="crm-board__card-top">
                        <p className="crm-board__card-title">{L.display_name}</p>
                        {L.off_schedule ? (
                          <span className="crm-board__risk" title={(L.off_schedule_labels || []).join('\n')}>
                            {t('admin_ne_v_srok_6576310b')}
                          </span>
                        ) : null}
                      </div>
                      <dl className="crm-board__card-dl">
                        <div>
                          <dt>{t('admin_etap_73557e69')}</dt>
                          <dd>{stage.label}</dd>
                        </div>
                        <div>
                          <dt>Email</dt>
                          <dd>{L.email || '—'}</dd>
                        </div>
                        <div>
                          <dt>{t('admin_phone')}</dt>
                          <dd>{L.phone || '—'}</dd>
                        </div>
                        <div>
                          <dt>{t('admin_istochnik_8290a3db')}</dt>
                          <dd>{sourceRu(L.source, t)}</dd>
                        </div>
                        <div>
                          <dt>{t('admin_v_sisteme_73a78588')}</dt>
                          <dd>{fmtCrmShortDate(L.created_at)}</dd>
                        </div>
                        <div>
                          <dt>{t('admin_sled_kontakt_40c1a86a')}</dt>
                          <dd
                            className={
                              L.crm_next_contact_overdue ? 'crm-board__card-dd--warn' : undefined
                            }
                          >
                            {fmtCrmShortDate(L.next_action_at)}
                          </dd>
                        </div>
                        <div>
                          <dt>{t('admin_sled_shag_118840f5')}</dt>
                          <dd title={L.next_action || ''}>{clip(L.next_action, 48)}</dd>
                        </div>
                        <div>
                          <dt>{t('admin_sdelka_86019125')}</dt>
                          <dd>
                            {L.deal_value != null && String(L.deal_value).trim() !== ''
                              ? `${L.deal_value} ${L.currency || 'EUR'}`
                              : '—'}
                          </dd>
                        </div>
                      </dl>
                      <span
                        className={`crm-board__temp ${TEMP_CLASS[L.temperature] || TEMP_CLASS.warm}`}
                      >
                        {L.temperature === 'hot'
                          ? t('admin_goryachiy_51d92db1')
                          : L.temperature === 'cold'
                            ? t('admin_cold')
                            : t('admin_warm')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showNewModal && (
        <div
          className="crm-board__modal-backdrop"
          role="presentation"
          onClick={() => setShowNewModal(false)}
        >
          <div className="crm-board__modal" role="dialog" onClick={(e) => e.stopPropagation()}>
            <h4>{t('admin_novyy_lid_711dc83d')}</h4>
            <div className="crm-board__field">
              <label>{t('admin_imya_kompaniya_02e102c4')}</label>
              <input
                value={newForm.display_name}
                onChange={(e) => setNewForm((f) => ({ ...f, display_name: e.target.value }))}
              />
            </div>
            <div className="crm-board__field">
              <label>Email</label>
              <input
                type="email"
                value={newForm.email}
                onChange={(e) => setNewForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="crm-board__field">
              <label>{t('admin_phone')}</label>
              <input
                value={newForm.phone}
                onChange={(e) => setNewForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="crm-board__field">
              <label>{t('admin_interes_595b0c9b')}</label>
              <select
                value={newForm.temperature}
                onChange={(e) => setNewForm((f) => ({ ...f, temperature: e.target.value }))}
              >
                <option value="cold">{t('admin_cold')}</option>
                <option value="warm">{t('admin_warm')}</option>
                <option value="hot">{t('admin_goryachiy_51d92db1')}</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button type="button" className="crm-board__btn crm-board__btn--primary" onClick={createLead}>
                {t('admin_sozdat_84370a20')}
              </button>
              <button type="button" className="crm-board__btn crm-board__btn--ghost" onClick={() => setShowNewModal(false)}>
                {t('admin_otmena_0ec753be')}
              </button>
            </div>
          </div>
        </div>
      )}

      {drawerVisible && (
        <div
          className={`crm-board__overlay${drawerClosing ? ' drawer-dismiss-backdrop--closing' : ''}`}
          role="presentation"
          onClick={() => closeDrawer()}
        >
          <div
            className={`crm-board__drawer${drawerClosing ? ' drawer-dismiss-from-right--closing' : ''}`}
            role="dialog"
            onClick={(e) => e.stopPropagation()}
          >
            {detailLoading && <p>{t('admin_loadingEllipsis')}</p>}
            {!detailLoading && lead && (
              <>
                <div className="crm-board__drawer-head">
                  <div>
                    <h3>{lead.display_name}</h3>
                    <div className="crm-board__stats">
                      <span>
                        {t('admin_kasaniy_deystviya_e6d54426')} <strong>{detail.activityCount ?? 0}</strong>
                      </span>
                      <span>
                        {t('admin_v_prodazhah_d122c30e')} <strong>{detail.touchCount ?? 0}</strong>
                      </span>
                    </div>
                  </div>
                  <button type="button" className="crm-board__drawer-close" onClick={() => closeDrawer()}>
                    ×
                  </button>
                </div>

                {detail.userSummary && (
                  <div className="crm-board__hint">
                    <FiUserPlus size={14} style={{ verticalAlign: 'middle' }} /> {t('admin_svyazan_s_polzovatelem_id_c9d5cb44', { id: detail.userSummary.id })}{' '}
                    {detail.userSummary.favorites_count != null && (
                      <>{t('admin_izbrannyh_obektov_39771b39')} {detail.userSummary.favorites_count}. </>
                    )}
                    {detail.userSummary.role}, {detail.userSummary.country || t('admin_strana_ne_ukazana_f19757be')}
                  </div>
                )}

                {lead.off_schedule ? (
                  <div className="crm-board__schedule-alert" role="status">
                    <strong>{t('admin_ne_v_srok_6576310b')}</strong>
                    <ul>
                      {(lead.off_schedule_labels || []).map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="crm-board__schedule-ok">{t('admin_sroki_po_dannym_platformy_612cda26')}</div>
                )}

                <div className="crm-board__detail-grid">
                  <div className="crm-board__detail-item">
                    <span className="crm-board__detail-k">{t('admin_istochnik_lida_f9b990e0')}</span>
                    <span className="crm-board__detail-v">{sourceRu(lead.source, t)}</span>
                  </div>
                  <div className="crm-board__detail-item">
                    <span className="crm-board__detail-k">User ID</span>
                    <span className="crm-board__detail-v">{lead.user_id ?? '—'}</span>
                  </div>
                  <div className="crm-board__detail-item">
                    <span className="crm-board__detail-k">{t('admin_sozdan_33415c6a')}</span>
                    <span className="crm-board__detail-v">{fmtCrmShortDate(lead.created_at)}</span>
                  </div>
                  <div className="crm-board__detail-item">
                    <span className="crm-board__detail-k">{t('admin_obnovlen_05df0b42')}</span>
                    <span className="crm-board__detail-v">{fmtCrmShortDate(lead.updated_at)}</span>
                  </div>
                  <div className="crm-board__detail-item">
                    <span className="crm-board__detail-k">{t('admin_pomoschnik_lid_01990459')}</span>
                    <span className="crm-board__detail-v">{lead.assistant_lead_id ?? '—'}</span>
                  </div>
                  <div className="crm-board__detail-item">
                    <span className="crm-board__detail-k">{t('admin_prosrochen_kontakt_ff7233a7')}</span>
                    <span className="crm-board__detail-v">
                      {lead.crm_next_contact_overdue ? t('admin_yes') : t('admin_no')}
                    </span>
                  </div>
                </div>

                <div className="crm-board__field crm-board__field--row2">
                  <div>
                    <label>{t('admin_summa_sdelki_5196b01a')}</label>
                    <input
                      type="number"
                      step="0.01"
                      defaultValue={lead.deal_value != null ? String(lead.deal_value) : ''}
                      key={`dv-${lead.id}-${lead.deal_value}`}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        saveLeadPatch({ deal_value: v === '' ? null : Number(v) });
                      }}
                    />
                  </div>
                  <div>
                    <label>{t('admin_currency')}</label>
                    <input
                      defaultValue={lead.currency || 'EUR'}
                      key={`cur-${lead.id}-${lead.currency}`}
                      maxLength={8}
                      onBlur={(e) => saveLeadPatch({ currency: e.target.value.trim() || 'EUR' })}
                    />
                  </div>
                </div>

                <div className="crm-board__field">
                  <label>{t('admin_temperatura_56f7653b')}</label>
                  <select
                    value={lead.temperature || 'warm'}
                    onChange={(e) => saveLeadPatch({ temperature: e.target.value })}
                  >
                    <option value="cold">{t('admin_cold')}</option>
                    <option value="warm">{t('admin_warm')}</option>
                    <option value="hot">{t('admin_goryachiy_51d92db1')}</option>
                  </select>
                </div>

                <div className="crm-board__field">
                  <label>{t('admin_interesy_tegi_cherez_zapyatuyu_bd738415')}</label>
                  <input
                    defaultValue={(lead.interests || []).join(', ')}
                    key={lead.id + (lead.interests || []).join(',')}
                    onBlur={(e) => {
                      const tags = e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean);
                      saveLeadPatch({ interests: tags });
                    }}
                  />
                </div>

                <div className="crm-board__field">
                  <label>{t('admin_sleduyuschiy_shag_3164c0ab')}</label>
                  <input
                    defaultValue={lead.next_action || ''}
                    key={`na-${lead.id}-${lead.next_action}`}
                    onBlur={(e) => saveLeadPatch({ next_action: e.target.value || null })}
                  />
                </div>
                <div className="crm-board__field">
                  <label>{t('admin_data_sleduyuschego_kontakta_da5cb5e3')}</label>
                  <input
                    type="datetime-local"
                    defaultValue={
                      lead.next_action_at
                        ? String(lead.next_action_at).replace(' ', 'T').slice(0, 16)
                        : ''
                    }
                    key={`nat-${lead.id}`}
                    onBlur={(e) => saveLeadPatch({ next_action_at: e.target.value || null })}
                  />
                </div>

                <div className="crm-board__field">
                  <label>{t('admin_vnutrennie_zametki_972e3f0b')}</label>
                  <textarea
                    defaultValue={lead.internal_notes || ''}
                    key={`notes-${lead.id}`}
                    onBlur={(e) => saveLeadPatch({ internal_notes: e.target.value || null })}
                  />
                </div>

                <div className="crm-board__field">
                  <label>
                    <FiMail style={{ verticalAlign: 'middle' }} /> {t('admin_pismo_klientu_mail_iz_a8217a12')}
                  </label>
                  <p className="crm-board__hint" style={{ marginTop: 0 }}>
                    {t('admin_crm_emailjs_hint_env')} <code>VITE_EMAILJS_CRM_TEMPLATE_ID=template_nky2m4i</code>.
                    {t('admin_crm_emailjs_hint_to')}{' '}
                    <code>{'{{to_email}}'}</code> {t('admin_crm_emailjs_hint_to_note')}
                    {t('admin_crm_emailjs_hint_subject')} <code>{'{{subject}}'}</code>{t('admin_telo_a896f5c5')} <code>{'{{message}}'}</code> {t('admin_crm_emailjs_hint_or')}{' '}
                    <code>{'{{full_message}}'}</code>{t('admin_dlya_preseta_ontact_s_ce28669f')} <code>{'{{name}}'}</code>,{' '}
                    <code>{'{{time}}'}</code>.
                  </p>
                  <input
                    placeholder={t('admin_tema_pisma_b75bb30a')}
                    value={emailCompose.subject}
                    onChange={(e) => setEmailCompose((c) => ({ ...c, subject: e.target.value }))}
                  />
                  <textarea
                    style={{ marginTop: '0.5rem' }}
                    placeholder={t('admin_tekst_pisma_e68f1a4e')}
                    rows={5}
                    value={emailCompose.body}
                    onChange={(e) => setEmailCompose((c) => ({ ...c, body: e.target.value }))}
                  />
                  <button
                    type="button"
                    className="crm-board__btn crm-board__btn--primary"
                    style={{ marginTop: '0.5rem' }}
                    disabled={!lead.email}
                    onClick={() => sendEmail()}
                  >
                    {t('admin_otpravit_na_256e9589')} {lead.email || '—'}
                  </button>
                  {!lead.email && (
                    <p className="crm-board__hint">{t('admin_ukazhite_email_u_lida_ecf2ecf6')}</p>
                  )}
                </div>

                <div className="crm-board__field">
                  <label>{t('admin_bystroe_kasanie_a249333c')}</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="crm-board__btn crm-board__btn--ghost"
                      onClick={() => {
                        const t = window.prompt(t('admin_crm_prompt_call'));
                        if (t != null) addActivity('call', t || t('admin_zvonok_534d2a33'), '');
                      }}
                    >
                      {t('admin_zvonok_534d2a33')}
                    </button>
                    <button
                      type="button"
                      className="crm-board__btn crm-board__btn--ghost"
                      onClick={() => {
                        const t = window.prompt(t('admin_crm_prompt_note'));
                        if (t != null) addActivity('note', t('admin_zametka_917b5836'), t);
                      }}
                    >
                      {t('admin_zametka_917b5836')}
                    </button>
                    <button
                      type="button"
                      className="crm-board__btn crm-board__btn--ghost"
                      onClick={() => {
                        const t = window.prompt(t('admin_crm_prompt_messenger'));
                        if (t != null) addActivity('whatsapp', t('admin_kontakt_62f220e3'), t);
                      }}
                    >
                      {t('admin_messendzher_138c8006')}
                    </button>
                  </div>
                </div>

                <h4 style={{ margin: '1.25rem 0 0.5rem', fontSize: '1rem' }}>{t('admin_history')}</h4>
                {activities.length === 0 && <p className="crm-board__hint">{t('admin_poka_net_zapisey_5d9c52da')}</p>}
                {activities.map((a) => (
                  <div key={a.id} className="crm-board__activity">
                    <div className="crm-board__activity-date">
                      {a.created_at} {a.created_by ? `· ${a.created_by}` : ''}
                    </div>
                    <div className="crm-board__activity-kind">{a.kind}</div>
                    {a.title && <div>{a.title}</div>}
                    {a.body && <div style={{ whiteSpace: 'pre-wrap' }}>{a.body}</div>}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

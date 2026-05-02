import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FiMail, FiPlus, FiRefreshCw, FiUserPlus } from 'react-icons/fi';
import { getApiBaseUrl } from '../../utils/apiConfig';
import { sendCrmEmailFromBrowser } from '../../utils/crmClientEmail';
import { showNotification } from '../../utils/toastHelper';
import './CrmBoard.css';

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
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function sourceRu(src) {
  const m = {
    manual: 'Вручную',
    user_import: 'Импорт',
    assistant_import: 'Помощник',
    auto_user_sync: 'База пользователей',
  };
  return m[src] || src || '—';
}

function clip(s, n) {
  if (s == null || s === '') return '—';
  const t = String(s).trim();
  return t.length <= n ? t : `${t.slice(0, n)}…`;
}

export default function CrmBoard() {
  const [board, setBoard] = useState({ stages: [], leadsByStage: {} });
  const [loading, setLoading] = useState(true);
  const [dragOverStage, setDragOverStage] = useState(null);
  const skipCardClickRef = useRef(false);

  const [drawerLeadId, setDrawerLeadId] = useState(null);
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
      if (!json.success) throw new Error(json.error || 'Ошибка загрузки');
      setBoard(json.data);
    } catch (err) {
      console.error(err);
      showNotification(err.message || 'Не удалось загрузить CRM', 'error');
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
      subject: 'Персональное предложение Sellyourbrick',
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
      showNotification(err.message || 'Ошибка', 'error');
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
      showNotification('Сохранено', 'success');
    } catch (err) {
      showNotification(err.message || 'Ошибка сохранения', 'error');
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
      showNotification(err.message || 'Ошибка', 'error');
    }
  };

  const sendEmail = async () => {
    if (!drawerLeadId) return;
    const lead = detail?.lead;
    const toEmail = lead?.email && String(lead.email).trim();
    if (!toEmail) {
      showNotification('У лида нет email', 'error');
      return;
    }
    const subj =
      emailCompose.subject != null && String(emailCompose.subject).trim()
        ? String(emailCompose.subject).trim()
        : 'Сообщение от Sellyourbrick';
    const text = emailCompose.body != null ? String(emailCompose.body) : '';
    try {
      await sendCrmEmailFromBrowser({
        toEmail,
        subject: subj,
        messageBody: text,
        fromName: lead.display_name ? `Sellyourbrick · ${lead.display_name}` : 'Sellyourbrick',
      });
      showNotification('Письмо отправлено', 'success');
      await addActivity('email_sent', subj, text.slice(0, 4000));
    } catch (err) {
      showNotification(err.message || 'Ошибка отправки', 'error');
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
      showNotification(err.message || 'Не удалось переместить', 'error');
    }
  };

  const createLead = async () => {
    if (!newForm.display_name.trim()) {
      showNotification('Укажите имя', 'error');
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
      showNotification(err.message || 'Ошибка', 'error');
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
      showNotification(json.message || 'Добавлено', 'success');
    } catch (err) {
      showNotification(err.message || 'Ошибка', 'error');
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
      showNotification(json.message || 'Добавлено', 'success');
    } catch (err) {
      showNotification(err.message || 'Ошибка', 'error');
    }
  };

  const lead = detail?.lead;

  return (
    <div className="crm-board">
      <div className="crm-board__toolbar">
        <div className="crm-board__toolbar-group">
          <label>Новый лид</label>
          <button type="button" className="crm-board__btn crm-board__btn--primary" onClick={() => setShowNewModal(true)}>
            <FiPlus /> Добавить вручную
          </button>
        </div>
        <div className="crm-board__toolbar-group crm-board__search-wrap">
          <label>Импорт пользователя</label>
          <input
            type="search"
            placeholder="Поиск по email, имени, телефону…"
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
                    {u.email || 'нет email'} · ID {u.id}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="crm-board__toolbar-group">
          <label>Из умного помощника</label>
          <select
            defaultValue=""
            onChange={(e) => {
              const v = e.target.value;
              e.target.value = '';
              if (v) importAssistant(parseInt(v, 10));
            }}
          >
            <option value="">Выберите лид чата…</option>
            {assistantLeads.map((a) => (
              <option key={a.id} value={a.id}>
                #{a.id} {a.summary ? a.summary.slice(0, 40) : a.email || a.phone || 'без контакта'}
              </option>
            ))}
          </select>
        </div>
        <div className="crm-board__toolbar-group">
          <label>&nbsp;</label>
          <button type="button" className="crm-board__btn crm-board__btn--ghost" onClick={loadBoard} disabled={loading}>
            <FiRefreshCw /> Обновить
          </button>
        </div>
      </div>

      {loading && <div className="crm-board__empty">Загрузка воронки…</div>}

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
                  {leads.length === 0 && <div className="crm-board__empty">Перетащите сюда карточку</div>}
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
                            Не в срок
                          </span>
                        ) : null}
                      </div>
                      <dl className="crm-board__card-dl">
                        <div>
                          <dt>Этап</dt>
                          <dd>{stage.label}</dd>
                        </div>
                        <div>
                          <dt>Email</dt>
                          <dd>{L.email || '—'}</dd>
                        </div>
                        <div>
                          <dt>Телефон</dt>
                          <dd>{L.phone || '—'}</dd>
                        </div>
                        <div>
                          <dt>Источник</dt>
                          <dd>{sourceRu(L.source)}</dd>
                        </div>
                        <div>
                          <dt>В системе</dt>
                          <dd>{fmtCrmShortDate(L.created_at)}</dd>
                        </div>
                        <div>
                          <dt>След. контакт</dt>
                          <dd
                            className={
                              L.crm_next_contact_overdue ? 'crm-board__card-dd--warn' : undefined
                            }
                          >
                            {fmtCrmShortDate(L.next_action_at)}
                          </dd>
                        </div>
                        <div>
                          <dt>След. шаг</dt>
                          <dd title={L.next_action || ''}>{clip(L.next_action, 48)}</dd>
                        </div>
                        <div>
                          <dt>Сделка</dt>
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
                          ? 'Горячий'
                          : L.temperature === 'cold'
                            ? 'Холодный'
                            : 'Тёплый'}
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
            <h4>Новый лид</h4>
            <div className="crm-board__field">
              <label>Имя / компания *</label>
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
              <label>Телефон</label>
              <input
                value={newForm.phone}
                onChange={(e) => setNewForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="crm-board__field">
              <label>Интерес</label>
              <select
                value={newForm.temperature}
                onChange={(e) => setNewForm((f) => ({ ...f, temperature: e.target.value }))}
              >
                <option value="cold">Холодный</option>
                <option value="warm">Тёплый</option>
                <option value="hot">Горячий</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button type="button" className="crm-board__btn crm-board__btn--primary" onClick={createLead}>
                Создать
              </button>
              <button type="button" className="crm-board__btn crm-board__btn--ghost" onClick={() => setShowNewModal(false)}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {drawerLeadId && (
        <div className="crm-board__overlay" role="presentation" onClick={() => setDrawerLeadId(null)}>
          <div className="crm-board__drawer" role="dialog" onClick={(e) => e.stopPropagation()}>
            {detailLoading && <p>Загрузка…</p>}
            {!detailLoading && lead && (
              <>
                <div className="crm-board__drawer-head">
                  <div>
                    <h3>{lead.display_name}</h3>
                    <div className="crm-board__stats">
                      <span>
                        Касаний (действия): <strong>{detail.activityCount ?? 0}</strong>
                      </span>
                      <span>
                        В «продажах»: <strong>{detail.touchCount ?? 0}</strong>
                      </span>
                    </div>
                  </div>
                  <button type="button" className="crm-board__drawer-close" onClick={() => setDrawerLeadId(null)}>
                    ×
                  </button>
                </div>

                {detail.userSummary && (
                  <div className="crm-board__hint">
                    <FiUserPlus size={14} style={{ verticalAlign: 'middle' }} /> Связан с пользователем #{detail.userSummary.id}:{' '}
                    {detail.userSummary.favorites_count != null && (
                      <>избранных объектов: {detail.userSummary.favorites_count}. </>
                    )}
                    {detail.userSummary.role}, {detail.userSummary.country || 'страна не указана'}
                  </div>
                )}

                {lead.off_schedule ? (
                  <div className="crm-board__schedule-alert" role="status">
                    <strong>Не в срок</strong>
                    <ul>
                      {(lead.off_schedule_labels || []).map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="crm-board__schedule-ok">Сроки по данным платформы и CRM — без отклонений</div>
                )}

                <div className="crm-board__detail-grid">
                  <div className="crm-board__detail-item">
                    <span className="crm-board__detail-k">Источник лида</span>
                    <span className="crm-board__detail-v">{sourceRu(lead.source)}</span>
                  </div>
                  <div className="crm-board__detail-item">
                    <span className="crm-board__detail-k">User ID</span>
                    <span className="crm-board__detail-v">{lead.user_id ?? '—'}</span>
                  </div>
                  <div className="crm-board__detail-item">
                    <span className="crm-board__detail-k">Создан</span>
                    <span className="crm-board__detail-v">{fmtCrmShortDate(lead.created_at)}</span>
                  </div>
                  <div className="crm-board__detail-item">
                    <span className="crm-board__detail-k">Обновлён</span>
                    <span className="crm-board__detail-v">{fmtCrmShortDate(lead.updated_at)}</span>
                  </div>
                  <div className="crm-board__detail-item">
                    <span className="crm-board__detail-k">Помощник (лид)</span>
                    <span className="crm-board__detail-v">{lead.assistant_lead_id ?? '—'}</span>
                  </div>
                  <div className="crm-board__detail-item">
                    <span className="crm-board__detail-k">Просрочен контакт</span>
                    <span className="crm-board__detail-v">
                      {lead.crm_next_contact_overdue ? 'Да' : 'Нет'}
                    </span>
                  </div>
                </div>

                <div className="crm-board__field crm-board__field--row2">
                  <div>
                    <label>Сумма сделки</label>
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
                    <label>Валюта</label>
                    <input
                      defaultValue={lead.currency || 'EUR'}
                      key={`cur-${lead.id}-${lead.currency}`}
                      maxLength={8}
                      onBlur={(e) => saveLeadPatch({ currency: e.target.value.trim() || 'EUR' })}
                    />
                  </div>
                </div>

                <div className="crm-board__field">
                  <label>Температура</label>
                  <select
                    value={lead.temperature || 'warm'}
                    onChange={(e) => saveLeadPatch({ temperature: e.target.value })}
                  >
                    <option value="cold">Холодный</option>
                    <option value="warm">Тёплый</option>
                    <option value="hot">Горячий</option>
                  </select>
                </div>

                <div className="crm-board__field">
                  <label>Интересы (теги через запятую)</label>
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
                  <label>Следующий шаг</label>
                  <input
                    defaultValue={lead.next_action || ''}
                    key={`na-${lead.id}-${lead.next_action}`}
                    onBlur={(e) => saveLeadPatch({ next_action: e.target.value || null })}
                  />
                </div>
                <div className="crm-board__field">
                  <label>Дата следующего контакта</label>
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
                  <label>Внутренние заметки</label>
                  <textarea
                    defaultValue={lead.internal_notes || ''}
                    key={`notes-${lead.id}`}
                    onBlur={(e) => saveLeadPatch({ internal_notes: e.target.value || null })}
                  />
                </div>

                <div className="crm-board__field">
                  <label>
                    <FiMail style={{ verticalAlign: 'middle' }} /> Письмо клиенту (EmailJS из браузера)
                  </label>
                  <p className="crm-board__hint" style={{ marginTop: 0 }}>
                    В .env укажите шаблон CRM, например: <code>VITE_EMAILJS_CRM_TEMPLATE_ID=template_nky2m4i</code>.
                    В EmailJS в поле «To Email» должно быть{' '}
                    <code>{'{{to_email}}'}</code> — не личный адрес; иначе письма не приходят на email лида.
                    Тема: <code>{'{{subject}}'}</code>, тело: <code>{'{{message}}'}</code> или{' '}
                    <code>{'{{full_message}}'}</code>. Для пресета Contact Us: <code>{'{{name}}'}</code>,{' '}
                    <code>{'{{time}}'}</code>.
                  </p>
                  <input
                    placeholder="Тема письма"
                    value={emailCompose.subject}
                    onChange={(e) => setEmailCompose((c) => ({ ...c, subject: e.target.value }))}
                  />
                  <textarea
                    style={{ marginTop: '0.5rem' }}
                    placeholder="Текст письма…"
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
                    Отправить на {lead.email || '—'}
                  </button>
                  {!lead.email && (
                    <p className="crm-board__hint">Укажите email у лида или привяжите пользователя с email.</p>
                  )}
                </div>

                <div className="crm-board__field">
                  <label>Быстрое касание</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="crm-board__btn crm-board__btn--ghost"
                      onClick={() => {
                        const t = window.prompt('Тема звонка / результат');
                        if (t != null) addActivity('call', t || 'Звонок', '');
                      }}
                    >
                      Звонок
                    </button>
                    <button
                      type="button"
                      className="crm-board__btn crm-board__btn--ghost"
                      onClick={() => {
                        const t = window.prompt('Текст заметки');
                        if (t != null) addActivity('note', 'Заметка', t);
                      }}
                    >
                      Заметка
                    </button>
                    <button
                      type="button"
                      className="crm-board__btn crm-board__btn--ghost"
                      onClick={() => {
                        const t = window.prompt('WhatsApp / мессенджер');
                        if (t != null) addActivity('whatsapp', 'Контакт', t);
                      }}
                    >
                      Мессенджер
                    </button>
                  </div>
                </div>

                <h4 style={{ margin: '1.25rem 0 0.5rem', fontSize: '1rem' }}>История</h4>
                {activities.length === 0 && <p className="crm-board__hint">Пока нет записей</p>}
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

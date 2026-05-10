import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FiExternalLink, FiCalendar, FiChevronLeft, FiChevronRight, FiSend } from 'react-icons/fi';
import { getApiBaseUrlSync } from '../../utils/apiConfig';
import './AdminTestDrive.css';

const API_BASE_URL = getApiBaseUrlSync();

const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTH_LABELS = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];
const QUALITY_QUESTION_LABELS = {
  property_expectations: 'Объект vs ожидания покупателя',
  property_feedback: 'Развёрнутый отзыв об объекте',
  amenities_ok: 'Удобства в объекте соответствуют описанию?',
  defects_state: 'Есть ли дефекты/проблемы в объекте?',
  listing_info_clear: 'Понятны ли из объявления цена и информация об объекте?',
  ready_to_stay: 'Готовность к проживанию (старая версия опроса)',
};

/** В анкете поля комментариев названы не как `${вопрос}_comment` — маппинг для админки */
const COMMENT_STORAGE_KEY = {
  amenities_ok: 'amenities_comment',
  defects_state: 'defects_comment',
  listing_info_clear: 'listing_info_comment',
  ready_to_stay: 'ready_to_stay_comment',
};

const BUYER_CONTACT_LABELS = {
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
  email: 'Почта',
};

function formatBuyerContactChannel(ch) {
  const k = String(ch || '').toLowerCase();
  return BUYER_CONTACT_LABELS[k] || (ch ? String(ch) : '—');
}

function adminCancelSeenStorageKey(sel) {
  if (!sel?.property_id || !sel?.property_table) return null;
  return `admin_test_drive_cancel_seen_at:${sel.property_table}:${sel.property_id}`;
}

function parseYmdLocal(ymd) {
  if (!ymd || typeof ymd !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) return null;
  return dt;
}

/** Все календарные дни между start и end включительно (локальное время). */
function expandNightRangeKeys(startStr, endStr) {
  const a = parseYmdLocal(startStr);
  const b = parseYmdLocal(endStr);
  if (!a || !b) return [];
  const keys = [];
  const cur = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const end = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  while (cur <= end) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    keys.push(`${y}-${m}-${d}`);
    cur.setDate(cur.getDate() + 1);
  }
  return keys;
}

function ymdFromDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function statusTone(st) {
  const s = String(st || '').toLowerCase();
  if (s === 'approved') return 'approved';
  if (s === 'paid') return 'paid';
  if (s === 'rejected') return 'rejected';
  if (s === 'cancelled') return 'cancelled';
  return 'pending';
}

function parseCheckInReport(raw) {
  if (raw == null || raw === '') return null;
  let payload = raw;
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer && Buffer.isBuffer(payload)) {
    payload = payload.toString('utf8');
  }
  if (typeof payload === 'object' && payload !== null && !Array.isArray(payload)) {
    return payload;
  }
  if (typeof payload !== 'string') return null;
  try {
    const parsed = JSON.parse(payload);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

/** Есть ли сохранённые ответы опроса (не пустой объект из БД) */
function surveyReportHasContent(report) {
  if (!report || typeof report !== 'object') return false;
  if (report.submitted_at) return true;
  const keys = [
    'property_expectations',
    'property_feedback',
    'amenities_ok',
    'defects_state',
    'listing_info_clear',
    'ready_to_stay',
  ];
  return keys.some((k) => {
    const v = report[k];
    if (v == null) return false;
    return typeof v !== 'string' || v.trim() !== '';
  });
}

/** Оценка 1–5 после выезда (exit_feedback_report JSON) */
function exitFeedbackReportHasContent(report) {
  if (!report || typeof report !== 'object') return false;
  const r = Number(report.rating);
  return Number.isFinite(r) && r >= 1 && r <= 5 && Boolean(report.submitted_at);
}

function answerTone(value, key) {
  const v = String(value || '').toLowerCase();
  if (key === 'property_expectations') {
    if (v === 'exceeded' || v === 'matched') return 'positive';
    if (v === 'below') return 'negative';
    if (v === 'partially') return 'neutral';
    return 'neutral';
  }
  if (v === 'yes' || v === 'ok') return 'positive';
  if (v === 'no' || v === 'issues') return 'negative';
  if (key === 'defects_state' && v) return v === 'ok' ? 'positive' : 'negative';
  if (key === 'property_feedback') return 'neutral';
  return 'neutral';
}

function formatAnswer(value, key) {
  const v = String(value || '').toLowerCase();
  if (key === 'listing_info_clear') {
    if (v === 'yes') return 'Цена и объявление: понятно';
    if (v === 'no') return 'Цена и объявление: неясно';
  }
  if (key === 'ready_to_stay') {
    if (v === 'yes') return 'Проживание устраивает (старый опрос)';
    if (v === 'no') return 'Есть замечания по проживанию (старый опрос)';
  }
  if (v === 'exceeded') return 'Превзошёл ожидания';
  if (v === 'matched') return 'Совпал с ожиданиями';
  if (v === 'partially') return 'Частично совпал';
  if (v === 'below') return 'Ниже ожиданий';
  if (v === 'yes') return 'Да';
  if (v === 'no') return 'Нет';
  if (v === 'ok') return 'Все в порядке';
  if (v === 'issues') return 'Есть проблемы';
  return value ? String(value) : '—';
}

function formatBroadcastDt(iso) {
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
    return String(iso);
  }
}

export default function AdminTestDrive() {
  const [rows, setRows] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState(null);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [bookLoading, setBookLoading] = useState(false);
  const [bookError, setBookError] = useState(null);
  const [ownerContact, setOwnerContact] = useState(null);
  const [activeTab, setActiveTab] = useState('calendar');
  const [cancelSeenAt, setCancelSeenAt] = useState('');
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [broadcastBookings, setBroadcastBookings] = useState([]);
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [broadcastError, setBroadcastError] = useState(null);
  const [broadcastSendBusy, setBroadcastSendBusy] = useState(null);
  const [broadcastSubTab, setBroadcastSubTab] = useState('survey');
  const [exitSendBusy, setExitSendBusy] = useState(null);

  const loadList = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/test-drive/properties`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setListError(json.error || 'Не удалось загрузить список');
        setRows([]);
        return;
      }
      setRows(Array.isArray(json.data) ? json.data : []);
    } catch (e) {
      setListError(e.message || 'Сеть недоступна');
      setRows([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    const k = adminCancelSeenStorageKey(selected);
    if (!k) {
      setCancelSeenAt('');
      return;
    }
    try {
      const raw = localStorage.getItem(k);
      setCancelSeenAt(raw ? String(raw) : '');
    } catch {
      setCancelSeenAt('');
    }
  }, [selected]);

  useEffect(() => {
    setActiveTab('calendar');
    setBroadcastSubTab('survey');
  }, [selected?.property_id, selected?.property_table]);

  const loadPropertyBookings = useCallback(async () => {
    if (!selected) return;
    setBookLoading(true);
    setBookError(null);
    try {
      const q = new URLSearchParams({
        property_id: String(selected.property_id),
        property_table: String(selected.property_table),
      });
      const res = await fetch(`${API_BASE_URL}/admin/test-drive/property-bookings?${q.toString()}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setBookError(json.error || 'Не удалось загрузить бронирования');
        setBookings([]);
        return;
      }
      setBookings(Array.isArray(json.data) ? json.data : []);
    } catch (e) {
      setBookError(e.message || 'Сеть недоступна');
      setBookings([]);
    } finally {
      setBookLoading(false);
    }
  }, [selected]);

  useEffect(() => {
    if (!selected) {
      setBookings([]);
      setBookError(null);
      setOwnerContact(null);
      return;
    }
    void loadPropertyBookings();
  }, [selected, loadPropertyBookings]);

  useEffect(() => {
    if (!selected?.owner_user_id) {
      setOwnerContact(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/users/${selected.owner_user_id}`);
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok || !json.success || !json.data) {
          setOwnerContact(null);
          return;
        }
        setOwnerContact({
          id: json.data.id,
          first_name: json.data.first_name || '',
          last_name: json.data.last_name || '',
          email: json.data.email || '',
          phone_number: json.data.phone_number || '',
        });
      } catch {
        if (!cancelled) setOwnerContact(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected?.owner_user_id]);

  const filteredRows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const hay = `${r.title || ''} ${r.location_line || ''} ${r.property_id} ${r.property_table}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, filter]);

  const bookedKeysInMonth = useMemo(() => {
    const y = viewMonth.getFullYear();
    const m = viewMonth.getMonth();
    const set = new Set();
    for (const b of bookings) {
      if (String(b.status || '').toLowerCase() === 'cancelled') continue;
      for (const k of expandNightRangeKeys(b.start_date, b.end_date)) {
        const d = parseYmdLocal(k);
        if (d && d.getFullYear() === y && d.getMonth() === m) set.add(k);
      }
    }
    return set;
  }, [bookings, viewMonth]);

  const calendarCells = useMemo(() => {
    const y = viewMonth.getFullYear();
    const m = viewMonth.getMonth();
    const firstDow = new Date(y, m, 1).getDay();
    const mondayBased = firstDow === 0 ? 6 : firstDow - 1;
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < mondayBased; i += 1) cells.push({ type: 'pad' });
    const todayKey = ymdFromDate(new Date());
    for (let d = 1; d <= daysInMonth; d += 1) {
      const key = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dow = new Date(y, m, d).getDay();
      const weekend = dow === 0 || dow === 6;
      cells.push({
        type: 'day',
        day: d,
        key,
        booked: bookedKeysInMonth.has(key),
        today: key === todayKey,
        weekend,
      });
    }
    while (cells.length % 7 !== 0) cells.push({ type: 'pad' });
    return cells;
  }, [viewMonth, bookedKeysInMonth]);

  const shiftMonth = (delta) => {
    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const buyerName = (buyer) => {
    if (!buyer) return '—';
    const n = [buyer.first_name, buyer.last_name].filter(Boolean).join(' ').trim();
    return n || `ID ${buyer.id}`;
  };

  const qualityCards = useMemo(() => {
    return bookings
      .map((b) => {
        const report = parseCheckInReport(b.check_in_report);
        const roleRaw = String(b.buyer?.role || '').toLowerCase();
        const hasSellerRole = /(owner|seller|admin|agent|manager|moderator)/.test(roleRaw);
        const answers = Object.entries(QUALITY_QUESTION_LABELS)
          .map(([key, label]) => {
            const value = report?.[key];
            const tone = answerTone(value, key);
            const commentKey = COMMENT_STORAGE_KEY[key] || `${key}_comment`;
            const comment = report?.[commentKey];
            return {
              key,
              label,
              value: formatAnswer(value, key),
              rawValue: value,
              tone,
              comment: typeof comment === 'string' ? comment.trim() : '',
            };
          })
          .filter((item) => item.rawValue != null && String(item.rawValue).trim() !== '');

        const positiveCount = answers.filter((a) => a.tone === 'positive').length;
        const negativeCount = answers.filter((a) => a.tone === 'negative').length;
        const hasNegative = negativeCount > 0;
        const amenitiesPhotoCount = Array.isArray(report?.amenities_photos)
          ? report.amenities_photos.length
          : 0;
        const defectsPhotoCount = Array.isArray(report?.defects_photos) ? report.defects_photos.length : 0;
        return {
          bookingId: b.id,
          buyer: b.buyer || null,
          buyerDisplayName: buyerName(b.buyer),
          buyerEmail: b.buyer?.email || '',
          buyerPhone: b.buyer?.phone_number || '',
          buyerContactChannel: b.buyer_contact_channel ?? null,
          hasSellerRole,
          checkInStatus: b.check_in_status || '—',
          submittedAt: report?.submitted_at || b.created_at || null,
          answers,
          positiveCount,
          negativeCount,
          hasNegative,
          amenitiesPhotoCount,
          defectsPhotoCount,
          hasReport: surveyReportHasContent(report),
        };
      })
      .filter((card) => card.hasReport);
  }, [bookings]);

  const exitFeedbackCards = useMemo(() => {
    return bookings
      .map((b) => {
        const report = parseCheckInReport(b.exit_feedback_report);
        if (!exitFeedbackReportHasContent(report)) return null;
        return {
          bookingId: b.id,
          buyerDisplayName: buyerName(b.buyer),
          buyerEmail: b.buyer?.email || '',
          buyerPhone: b.buyer?.phone_number || '',
          rating: Number(report.rating),
          comment: String(report.comment || '').trim(),
          submittedAt: report.submitted_at || null,
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        const ta = a.submittedAt ? Date.parse(a.submittedAt) : 0;
        const tb = b.submittedAt ? Date.parse(b.submittedAt) : 0;
        return tb - ta;
      });
  }, [bookings]);

  const cancelCards = useMemo(() => {
    return bookings
      .filter((b) => String(b.status || '').toLowerCase() === 'cancelled')
      .map((b) => ({
        id: b.id,
        start_date: b.start_date,
        end_date: b.end_date,
        cancelled_by: b.cancelled_by || null,
        cancellation_reason: b.cancellation_reason || b.cancellation_reason_code || '—',
        cancelled_at: b.cancelled_at || null,
        created_at: b.created_at || null,
        buyer: b.buyer || null,
      }))
      .sort((a, b) => {
        const at = a.cancelled_at ? Date.parse(a.cancelled_at) : a.created_at ? Date.parse(a.created_at) : 0;
        const bt = b.cancelled_at ? Date.parse(b.cancelled_at) : b.created_at ? Date.parse(b.created_at) : 0;
        return bt - at;
      });
  }, [bookings]);

  const unseenCancelCount = useMemo(() => {
    if (!cancelCards.length) return 0;
    const rawSeen = (cancelSeenAt || '').trim();
    const seenMs = rawSeen ? Date.parse(rawSeen) : NaN;
    const hasWatermark = Number.isFinite(seenMs);

    const cancelEventMs = (c) => {
      if (c.cancelled_at) {
        const x = Date.parse(c.cancelled_at);
        if (Number.isFinite(x)) return x;
      }
      if (c.created_at) {
        const y = Date.parse(c.created_at);
        if (Number.isFinite(y)) return y;
      }
      return NaN;
    };

    return cancelCards.filter((c) => {
      const t = cancelEventMs(c);
      if (!hasWatermark) return true;
      if (!Number.isFinite(t)) return true;
      return t > seenMs;
    }).length;
  }, [cancelCards, cancelSeenAt]);

  const markCancelsAsViewed = () => {
    const k = adminCancelSeenStorageKey(selected);
    if (!k) return;
    const nowIso = new Date().toISOString();
    setCancelSeenAt(nowIso);
    try {
      localStorage.setItem(k, nowIso);
    } catch {
      // ignore storage errors
    }
  };

  const propertyBroadcasts = useMemo(() => {
    if (!selected) return [];
    const pid = Number(selected.property_id);
    const pt = String(selected.property_table || '');
    return broadcastBookings.filter(
      (b) => Number(b.property_id) === pid && String(b.property_table || '') === pt,
    );
  }, [broadcastBookings, selected]);

  /** Рассылка WA после выезда по броням текущего объекта (токен создан при оплате/из админки). */
  const propertyExitBroadcasts = useMemo(() => {
    if (!selected) return [];
    const pid = Number(selected.property_id);
    const pt = String(selected.property_table || '');
    return bookings.filter(
      (b) =>
        Number(b.property_id) === pid &&
        String(b.property_table || '') === pt &&
        ['paid', 'approved'].includes(String(b.status || '').toLowerCase()) &&
        String(b.exit_feedback_token || '').trim(),
    );
  }, [bookings, selected]);

  useEffect(() => {
    if (!selected || activeTab !== 'broadcasts') return;
    let cancelled = false;
    void (async () => {
      setBroadcastLoading(true);
      setBroadcastError(null);
      try {
        const res = await fetch(`${API_BASE_URL}/admin/test-drive/broadcasts`);
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok || !json.success) {
          setBroadcastError(json.error || 'Не удалось загрузить объявления');
          setBroadcastBookings([]);
          return;
        }
        setBroadcastBookings(Array.isArray(json.data) ? json.data : []);
      } catch (e) {
        if (!cancelled) {
          setBroadcastError(e.message || 'Сеть недоступна');
          setBroadcastBookings([]);
        }
      } finally {
        if (!cancelled) setBroadcastLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected, activeTab]);

  const sendSurveyBroadcastNow = useCallback(async (bookingId) => {
    const id = Number(bookingId);
    if (!Number.isFinite(id) || id <= 0) return;
    setBroadcastSendBusy(id);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/test-drive/broadcasts/${id}/send`, {
        method: 'POST',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        window.alert(json.error || 'Не удалось отправить');
        return;
      }
      const r2 = await fetch(`${API_BASE_URL}/admin/test-drive/broadcasts`);
      const j2 = await r2.json().catch(() => ({}));
      if (r2.ok && j2.success && Array.isArray(j2.data)) {
        setBroadcastBookings(j2.data);
      }
    } catch (e) {
      window.alert(e.message || 'Ошибка сети');
    } finally {
      setBroadcastSendBusy(null);
    }
  }, []);

  const sendExitBroadcastNow = useCallback(
    async (bookingId) => {
      const id = Number(bookingId);
      if (!Number.isFinite(id) || id <= 0) return;
      setExitSendBusy(id);
      try {
        const res = await fetch(`${API_BASE_URL}/admin/test-drive/exit-feedback-broadcasts/${id}/send`, {
          method: 'POST',
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.success) {
          window.alert(json.error || 'Не удалось отправить');
          return;
        }
        await loadPropertyBookings();
      } catch (e) {
        window.alert(e.message || 'Ошибка сети');
      } finally {
        setExitSendBusy(null);
      }
    },
    [loadPropertyBookings],
  );

  return (
    <div className="admin-test-drive">
      <p className="admin-test-drive__intro">
        Объекты с активным тест-драйвом и объекты, по которым есть бронирования. Выберите строку —
        календарь и таблица с данными бронирующих.
      </p>

      <div className="admin-test-drive__layout">
        <section className="admin-test-drive__panel">
          <div className="admin-test-drive__panel-head">
            <h2 className="admin-test-drive__panel-title">Объекты</h2>
            <input
              type="search"
              className="admin-test-drive__search"
              placeholder="Поиск по названию, адресу, ID…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          {listError ? <div className="admin-test-drive__error">{listError}</div> : null}
          {listLoading ? (
            <div className="admin-test-drive__loading">Загрузка списка…</div>
          ) : (
            <div className="admin-test-drive__list">
              {filteredRows.length === 0 ? (
                <div className="admin-test-drive__detail-empty">Ничего не найдено.</div>
              ) : (
                filteredRows.map((r) => {
                  const active =
                    selected &&
                    selected.property_id === r.property_id &&
                    selected.property_table === r.property_table;
                  return (
                    <button
                      key={`${r.property_table}-${r.property_id}`}
                      type="button"
                      className={`admin-test-drive__row${active ? ' admin-test-drive__row--active' : ''}`}
                      onClick={() => setSelected(r)}
                    >
                      {r.cover_url ? (
                        <img className="admin-test-drive__thumb" src={r.cover_url} alt="" />
                      ) : (
                        <div className="admin-test-drive__thumb-fallback">нет фото</div>
                      )}
                      <div className="admin-test-drive__row-main">
                        <div className="admin-test-drive__row-title">{r.title || `Объект #${r.property_id}`}</div>
                        <div className="admin-test-drive__row-meta">
                          {r.property_table === 'properties_houses' ? 'Дом / вилла' : 'Квартира'} · ID{' '}
                          {r.property_id}
                          <br />
                          {r.location_line}
                          {Number(r.test_drive) === 1 ? '' : ' · тест-драйв выключен'}
                        </div>
                      </div>
                      <span
                        className={`admin-test-drive__badge${r.booking_count ? '' : ' admin-test-drive__badge--muted'}`}
                      >
                        {r.booking_count || 0}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </section>

        <section className="admin-test-drive__panel">
          {!selected ? (
            <div className="admin-test-drive__detail-empty">Выберите объект слева.</div>
          ) : (
            <div className="admin-test-drive__detail">
              <div className="admin-test-drive__detail-top">
                {selected.cover_url ? (
                  <img className="admin-test-drive__detail-thumb" src={selected.cover_url} alt="" />
                ) : (
                  <div className="admin-test-drive__detail-thumb-fallback" />
                )}
                <div className="admin-test-drive__detail-heading">
                  <h3>{selected.title || `Объект #${selected.property_id}`}</h3>
                  <div className="admin-test-drive__detail-links">
                    <a
                      className="admin-test-drive__link-btn admin-test-drive__link-btn--primary"
                      href={`/property/${selected.property_id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Страница объекта <FiExternalLink size={14} aria-hidden />
                    </a>
                    <a
                      className="admin-test-drive__link-btn"
                      href={`/property/${selected.property_id}/test-drive?table=${encodeURIComponent(selected.property_table)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Календарь записи <FiCalendar size={14} aria-hidden />
                    </a>
                  </div>
                  <p className="admin-test-drive__detail-sub">
                    Таблица: {selected.property_table} · владелец user_id {selected.owner_user_id} · бронирований:{' '}
                    {selected.booking_count ?? 0}
                  </p>
                </div>
              </div>

              <div className="admin-test-drive__cal-wrap">
                <div className="admin-test-drive__tabs" role="tablist" aria-label="Тест-драйв вкладки">
                  <button
                    type="button"
                    className={`admin-test-drive__tab-btn${activeTab === 'calendar' ? ' admin-test-drive__tab-btn--active' : ''}`}
                    role="tab"
                    aria-selected={activeTab === 'calendar'}
                    onClick={() => setActiveTab('calendar')}
                  >
                    Календарь
                  </button>
                  <button
                    type="button"
                    className={`admin-test-drive__tab-btn${activeTab === 'quality' ? ' admin-test-drive__tab-btn--active' : ''}`}
                    role="tab"
                    aria-selected={activeTab === 'quality'}
                    onClick={() => setActiveTab('quality')}
                  >
                    Проверка качества
                  </button>
                  <button
                    type="button"
                    className={`admin-test-drive__tab-btn${activeTab === 'broadcasts' ? ' admin-test-drive__tab-btn--active' : ''}`}
                    role="tab"
                    aria-selected={activeTab === 'broadcasts'}
                    onClick={() => setActiveTab('broadcasts')}
                  >
                    Объявления
                  </button>
                  <button
                    type="button"
                    className={`admin-test-drive__tab-btn${activeTab === 'cancellations' ? ' admin-test-drive__tab-btn--active' : ''}`}
                    role="tab"
                    aria-selected={activeTab === 'cancellations'}
                    onClick={() => setActiveTab('cancellations')}
                  >
                    Отмены
                    <span
                      className={`admin-test-drive__tab-count${
                        unseenCancelCount > 0 ? '' : ' admin-test-drive__tab-count--muted'
                      }`}
                    >
                      {unseenCancelCount}
                    </span>
                  </button>
                </div>

                {activeTab === 'calendar' ? (
                  <>
                    <div className="admin-test-drive__cal-card-inner">
                      <div className="admin-test-drive__cal-head">
                        <div className="admin-test-drive__cal-month" aria-live="polite">
                          <span className="admin-test-drive__cal-month-name">
                            {MONTH_LABELS[viewMonth.getMonth()]}
                          </span>
                          <span className="admin-test-drive__cal-month-year">{viewMonth.getFullYear()}</span>
                        </div>
                        <div className="admin-test-drive__cal-nav" role="group" aria-label="Навигация по месяцам">
                          <button type="button" aria-label="Предыдущий месяц" onClick={() => shiftMonth(-1)}>
                            <FiChevronLeft size={18} aria-hidden />
                          </button>
                          <button type="button" aria-label="Следующий месяц" onClick={() => shiftMonth(1)}>
                            <FiChevronRight size={18} aria-hidden />
                          </button>
                        </div>
                      </div>
                      <div className="admin-test-drive__weekdays" role="row">
                        {WEEKDAY_LABELS.map((w) => (
                          <span key={w} className="admin-test-drive__weekday-cell">
                            {w}
                          </span>
                        ))}
                      </div>
                      <div className="admin-test-drive__cal-grid" role="grid" aria-readonly="true">
                        {calendarCells.map((cell, idx) => {
                          if (cell.type === 'pad') {
                            return (
                              <div key={`p-${idx}`} className="admin-test-drive__cal-cell admin-test-drive__cal-cell--pad" />
                            );
                          }
                          return (
                            <div
                              key={cell.key}
                              className={[
                                'admin-test-drive__cal-cell',
                                cell.booked ? 'admin-test-drive__cal-cell--booked' : '',
                                cell.today ? 'admin-test-drive__cal-cell--today' : '',
                                cell.weekend && !cell.booked ? 'admin-test-drive__cal-cell--weekend' : '',
                              ]
                                .filter(Boolean)
                                .join(' ')}
                            >
                              <span className="admin-test-drive__cal-day-num">{cell.day}</span>
                              {cell.booked ? <span className="admin-test-drive__cal-book-dot" aria-hidden /> : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="admin-test-drive__cal-legend">
                      <span className="admin-test-drive__cal-legend-item">
                        <span className="admin-test-drive__cal-legend-swatch admin-test-drive__cal-legend-swatch--booked" />{' '}
                        Занято
                      </span>
                      <span className="admin-test-drive__cal-legend-item">
                        <span className="admin-test-drive__cal-legend-swatch admin-test-drive__cal-legend-swatch--today" />{' '}
                        Сегодня
                      </span>
                      <span className="admin-test-drive__cal-legend-caption">
                        Подсвечены все даты внутри интервала брони (включительно).
                      </span>
                    </div>
                  </>
                ) : activeTab === 'quality' ? (
                  <div className="admin-test-drive__quality admin-test-drive__quality--split">
                    {bookLoading ? (
                      <div className="admin-test-drive__loading">Загрузка анкет качества…</div>
                    ) : (
                      <>
                        <h4 className="admin-test-drive__quality-section-title">Анкета при проживании</h4>
                        {qualityCards.length === 0 ? (
                          <div className="admin-test-drive__detail-empty admin-test-drive__detail-empty--tight">
                            Нет заполненных анкет по этому объекту.
                          </div>
                        ) : (
                          qualityCards.map((card) => (
                            <details
                              key={`quality-${card.bookingId}`}
                              className={`admin-test-drive__quality-card${card.hasNegative ? ' admin-test-drive__quality-card--alert' : ''}`}
                            >
                              <summary className="admin-test-drive__quality-summary">
                                <div className="admin-test-drive__quality-head">
                                  <div className="admin-test-drive__quality-name">
                                    user #{card.buyer?.id}: {card.buyerDisplayName}
                                  </div>
                                  <div className="admin-test-drive__quality-meta">
                                    <span className="admin-test-drive__quality-badge">Покупатель</span>
                                    <span
                                      className={`admin-test-drive__quality-badge${card.hasSellerRole ? '' : ' admin-test-drive__quality-badge--muted'}`}
                                    >
                                      Продавец
                                    </span>
                                    <span className="admin-test-drive__quality-booking">Бронь #{card.bookingId}</span>
                                  </div>
                                </div>
                                <div className="admin-test-drive__quality-stats">
                                  <span className="admin-test-drive__quality-chip admin-test-drive__quality-chip--positive">
                                    Положительных: {card.positiveCount}
                                  </span>
                                  <span className="admin-test-drive__quality-chip admin-test-drive__quality-chip--negative">
                                    Отрицательных: {card.negativeCount}
                                  </span>
                                </div>
                              </summary>
                              <div className="admin-test-drive__quality-body">
                                <div className="admin-test-drive__quality-subhead">
                                  Статус check-in: {card.checkInStatus} · отправлено: {card.submittedAt || '—'}
                                </div>
                                <div className="admin-test-drive__quality-contact">
                                  <div className="admin-test-drive__quality-contact-title">Связь с покупателем</div>
                                  <div className="admin-test-drive__quality-contact-row">
                                    <span className="admin-test-drive__muted">Предпочтительный канал:</span>{' '}
                                    {formatBuyerContactChannel(card.buyerContactChannel)}
                                  </div>
                                  <div className="admin-test-drive__quality-contact-row">
                                    <span className="admin-test-drive__muted">Email:</span>{' '}
                                    {card.buyerEmail ? (
                                      <a href={`mailto:${card.buyerEmail}`}>{card.buyerEmail}</a>
                                    ) : (
                                      '—'
                                    )}
                                  </div>
                                  <div className="admin-test-drive__quality-contact-row">
                                    <span className="admin-test-drive__muted">Телефон:</span>{' '}
                                    {card.buyerPhone ? (
                                      <a href={`tel:${String(card.buyerPhone).replace(/\s+/g, '')}`}>
                                        {card.buyerPhone}
                                      </a>
                                    ) : (
                                      '—'
                                    )}
                                  </div>
                                </div>
                                {card.amenitiesPhotoCount > 0 || card.defectsPhotoCount > 0 ? (
                                  <div className="admin-test-drive__quality-photos-note">
                                    {card.amenitiesPhotoCount > 0 ? (
                                      <span>
                                        Фото по удобствам: <strong>{card.amenitiesPhotoCount}</strong>
                                      </span>
                                    ) : null}
                                    {card.amenitiesPhotoCount > 0 && card.defectsPhotoCount > 0 ? ' · ' : null}
                                    {card.defectsPhotoCount > 0 ? (
                                      <span>
                                        Фото по дефектам: <strong>{card.defectsPhotoCount}</strong>
                                      </span>
                                    ) : null}
                                  </div>
                                ) : null}
                                <div className="admin-test-drive__quality-list">
                                  {card.answers.map((a) => (
                                    <div key={`${card.bookingId}-${a.key}`} className="admin-test-drive__quality-item">
                                      <div className="admin-test-drive__quality-question">{a.label}</div>
                                      <div
                                        className={`admin-test-drive__quality-answer admin-test-drive__quality-answer--${a.tone}`}
                                      >
                                        {a.value}
                                      </div>
                                      {a.comment ? (
                                        <div className="admin-test-drive__quality-comment">{a.comment}</div>
                                      ) : null}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </details>
                          ))
                        )}
                        <h4 className="admin-test-drive__quality-section-title">После проживания (оценка звёздами)</h4>
                        {exitFeedbackCards.length === 0 ? (
                          <div className="admin-test-drive__detail-empty admin-test-drive__detail-empty--tight">
                            Пока нет оценок после выезда по этому объекту.
                          </div>
                        ) : (
                          exitFeedbackCards.map((ef) => {
                            const stars = Math.min(5, Math.max(1, Math.round(Number(ef.rating) || 1)));
                            return (
                            <details key={`exit-feedback-${ef.bookingId}`} className="admin-test-drive__quality-card">
                              <summary className="admin-test-drive__quality-summary">
                                <div className="admin-test-drive__quality-head">
                                  <div className="admin-test-drive__quality-name">
                                    Бронь #{ef.bookingId}: {ef.buyerDisplayName}
                                  </div>
                                  <div className="admin-test-drive__quality-meta">
                                    <span className="admin-test-drive__quality-booking">
                                      {'★'.repeat(stars)}
                                      {'☆'.repeat(5 - stars)}
                                    </span>
                                  </div>
                                </div>
                              </summary>
                              <div className="admin-test-drive__quality-body">
                                <div className="admin-test-drive__quality-subhead">
                                  Отправлено: {ef.submittedAt ? formatBroadcastDt(ef.submittedAt) : '—'}
                                </div>
                                <div className="admin-test-drive__quality-contact">
                                  <div className="admin-test-drive__quality-contact-title">Связь с покупателем</div>
                                  <div className="admin-test-drive__quality-contact-row">
                                    <span className="admin-test-drive__muted">Email:</span>{' '}
                                    {ef.buyerEmail ? (
                                      <a href={`mailto:${ef.buyerEmail}`}>{ef.buyerEmail}</a>
                                    ) : (
                                      '—'
                                    )}
                                  </div>
                                  <div className="admin-test-drive__quality-contact-row">
                                    <span className="admin-test-drive__muted">Телефон:</span>{' '}
                                    {ef.buyerPhone ? (
                                      <a href={`tel:${String(ef.buyerPhone).replace(/\s+/g, '')}`}>{ef.buyerPhone}</a>
                                    ) : (
                                      '—'
                                    )}
                                  </div>
                                </div>
                                <div className="admin-test-drive__quality-item">
                                  <div className="admin-test-drive__quality-question">Комментарий</div>
                                  <div className="admin-test-drive__quality-comment" style={{ marginTop: 6 }}>
                                    {ef.comment}
                                  </div>
                                </div>
                              </div>
                            </details>
                            );
                          })
                        )}
                      </>
                    )}
                  </div>
                ) : activeTab === 'broadcasts' ? (
                  <div className="admin-test-drive__broadcasts">
                    <div className="admin-test-drive__broadcast-subtabs" role="tablist" aria-label="Рассылки объявлений">
                      <button
                        type="button"
                        role="tab"
                        className={`admin-test-drive__broadcast-subtab${broadcastSubTab === 'survey' ? ' admin-test-drive__broadcast-subtab--active' : ''}`}
                        aria-selected={broadcastSubTab === 'survey'}
                        onClick={() => setBroadcastSubTab('survey')}
                      >
                        Опрос при проживании
                      </button>
                      <button
                        type="button"
                        role="tab"
                        className={`admin-test-drive__broadcast-subtab${broadcastSubTab === 'exit' ? ' admin-test-drive__broadcast-subtab--active' : ''}`}
                        aria-selected={broadcastSubTab === 'exit'}
                        onClick={() => setBroadcastSubTab('exit')}
                      >
                        Завершение брони
                      </button>
                    </div>
                    {broadcastSubTab === 'survey' ? (
                      <>
                        {broadcastLoading ? (
                          <div className="admin-test-drive__loading">Загрузка рассылок…</div>
                        ) : broadcastError ? (
                          <div className="admin-test-drive__error">{broadcastError}</div>
                        ) : propertyBroadcasts.length === 0 ? (
                          <div className="admin-test-drive__detail-empty">
                            Нет подтверждённых броней с рассылкой опроса по этому объекту (статус «Подтверждено» у
                            владельца).
                          </div>
                        ) : (
                          <div className="admin-test-drive__broadcast-list">
                            {propertyBroadcasts.map((br) => {
                              const sent = String(br.survey_whatsapp_status || '').toLowerCase() === 'sent';
                              const buyerLabel = [br.buyer_first_name, br.buyer_last_name]
                                .filter(Boolean)
                                .join(' ')
                                .trim();
                              return (
                                <div key={br.id} className="admin-test-drive__broadcast-card">
                                  <div className="admin-test-drive__broadcast-card-head">
                                    <div>
                                      <div className="admin-test-drive__broadcast-title">
                                        Бронь #{br.id} · {br.start_date} — {br.end_date}
                                      </div>
                                      <div className="admin-test-drive__muted">
                                        {buyerLabel || `user #${br.user_id}`}
                                        {br.buyer_phone ? ` · ${br.buyer_phone}` : ''}
                                      </div>
                                    </div>
                                    <span
                                      className={`admin-test-drive__broadcast-status${
                                        sent ? ' admin-test-drive__broadcast-status--sent' : ''
                                      }`}
                                    >
                                      {sent ? 'Отправлено' : 'Ожидает'}
                                    </span>
                                  </div>
                                  <div className="admin-test-drive__broadcast-meta">
                                    <span>Автоотправка (план): {formatBroadcastDt(br.survey_scheduled_at)}</span>
                                    <span>
                                      Факт WA: {sent ? formatBroadcastDt(br.survey_whatsapp_sent_at) : '—'}
                                    </span>
                                  </div>
                                  {!sent ? (
                                    <button
                                      type="button"
                                      className="admin-test-drive__broadcast-send"
                                      disabled={broadcastSendBusy === Number(br.id)}
                                      onClick={() => sendSurveyBroadcastNow(br.id)}
                                    >
                                      <FiSend size={16} aria-hidden />
                                      {broadcastSendBusy === Number(br.id) ? 'Отправка…' : 'Отправить сейчас'}
                                    </button>
                                  ) : (
                                    <p className="admin-test-drive__muted admin-test-drive__broadcast-note">
                                      Сообщение с ссылкой на опрос уже отправлено в WhatsApp.
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {bookLoading ? (
                          <div className="admin-test-drive__loading">Загрузка броней…</div>
                        ) : propertyExitBroadcasts.length === 0 ? (
                          <div className="admin-test-drive__detail-empty">
                            Нет броней с токеном пост-отзыва по этому объекту (оплаченные / подтверждённые появятся после
                            синхронизации).
                          </div>
                        ) : (
                          <div className="admin-test-drive__broadcast-list">
                            {propertyExitBroadcasts.map((br) => {
                              const sent = String(br.exit_feedback_whatsapp_status || '').toLowerCase() === 'sent';
                              const buyerLabel = [br.buyer?.first_name, br.buyer?.last_name]
                                .filter(Boolean)
                                .join(' ')
                                .trim();
                              return (
                                <div key={`exit-br-${br.id}`} className="admin-test-drive__broadcast-card">
                                  <div className="admin-test-drive__broadcast-card-head">
                                    <div>
                                      <div className="admin-test-drive__broadcast-title">
                                        Бронь #{br.id} · выезд {br.end_date}
                                      </div>
                                      <div className="admin-test-drive__muted">
                                        {buyerLabel || `user #${br.user_id}`}
                                        {br.buyer?.phone_number ? ` · ${br.buyer.phone_number}` : ''}
                                      </div>
                                    </div>
                                    <span
                                      className={`admin-test-drive__broadcast-status${
                                        sent ? ' admin-test-drive__broadcast-status--sent' : ''
                                      }`}
                                    >
                                      {sent ? 'Отправлено' : 'Ожидает'}
                                    </span>
                                  </div>
                                  <div className="admin-test-drive__broadcast-meta">
                                    <span>План WA после выезда: {formatBroadcastDt(br.exit_feedback_scheduled_at)}</span>
                                    <span>
                                      Факт WA: {sent ? formatBroadcastDt(br.exit_feedback_whatsapp_sent_at) : '—'}
                                    </span>
                                  </div>
                                  {!sent ? (
                                    <button
                                      type="button"
                                      className="admin-test-drive__broadcast-send"
                                      disabled={exitSendBusy === Number(br.id)}
                                      onClick={() => sendExitBroadcastNow(br.id)}
                                    >
                                      <FiSend size={16} aria-hidden />
                                      {exitSendBusy === Number(br.id) ? 'Отправка…' : 'Отправить сейчас'}
                                    </button>
                                  ) : (
                                    <p className="admin-test-drive__muted admin-test-drive__broadcast-note">
                                      Сообщение с ссылкой на оценку после проживания уже отправлено в WhatsApp.
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="admin-test-drive__cancellations">
                    <div className="admin-test-drive__cancel-actions">
                      <div className="admin-test-drive__cancel-stats">
                        Непросмотренных отмен: <strong>{unseenCancelCount}</strong>
                      </div>
                      <button
                        type="button"
                        className="admin-test-drive__cancel-viewed-btn"
                        onClick={markCancelsAsViewed}
                        disabled={unseenCancelCount === 0}
                      >
                        Просмотрено
                      </button>
                    </div>

                    {bookLoading ? (
                      <div className="admin-test-drive__loading">Загрузка отмен…</div>
                    ) : cancelCards.length === 0 ? (
                      <div className="admin-test-drive__detail-empty">По этому объекту пока нет отмененных броней.</div>
                    ) : (
                      <div className="admin-test-drive__cancel-list">
                        {cancelCards.map((c) => (
                          <div key={`cancel-${c.id}`} className="admin-test-drive__cancel-card">
                            <div className="admin-test-drive__cancel-head">
                              <div className="admin-test-drive__cancel-title">Бронь #{c.id}</div>
                              <span className="admin-test-drive__status admin-test-drive__status--cancelled">
                                cancelled
                              </span>
                            </div>
                            <div className="admin-test-drive__cancel-meta">
                              {c.start_date} — {c.end_date}
                            </div>
                            <div className="admin-test-drive__cancel-meta">
                              user #{c.buyer?.id}: {buyerName(c.buyer)}
                            </div>
                            <div className="admin-test-drive__cancel-contact-block">
                              <div className="admin-test-drive__cancel-contact-title">Контакты покупателя</div>
                              <div className="admin-test-drive__cancel-contact-row">
                                {c.buyer?.email || 'email: —'}
                              </div>
                              <div className="admin-test-drive__cancel-contact-row">
                                {c.buyer?.phone_number || 'телефон: —'}
                              </div>
                            </div>
                            <div className="admin-test-drive__cancel-contact-block">
                              <div className="admin-test-drive__cancel-contact-title">
                                Контакты продавца (user #{selected.owner_user_id || '—'})
                              </div>
                              <div className="admin-test-drive__cancel-contact-row">
                                {ownerContact
                                  ? `${[ownerContact.first_name, ownerContact.last_name]
                                      .filter(Boolean)
                                      .join(' ')
                                      .trim() || '—'}`
                                  : '—'}
                              </div>
                              <div className="admin-test-drive__cancel-contact-row">
                                {ownerContact?.email || 'email: —'}
                              </div>
                              <div className="admin-test-drive__cancel-contact-row">
                                {ownerContact?.phone_number || 'телефон: —'}
                              </div>
                            </div>
                            <div className="admin-test-drive__cancel-meta">
                              Отменил: {c.cancelled_by === 'owner' ? 'продавец' : 'покупатель'}
                            </div>
                            <div className="admin-test-drive__cancel-reason">{c.cancellation_reason}</div>
                            <div className="admin-test-drive__muted">
                              {c.cancelled_at ? `Время отмены: ${c.cancelled_at}` : ''}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {bookError ? <div className="admin-test-drive__error">{bookError}</div> : null}
              {activeTab === 'calendar' && bookLoading ? (
                <div className="admin-test-drive__loading">Загрузка бронирований…</div>
              ) : activeTab === 'calendar' ? (
                <div className="admin-test-drive__table-wrap">
                  <table className="admin-test-drive__table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Период</th>
                        <th>Статус</th>
                        <th>Покупатель</th>
                        <th>Предпочт. связь</th>
                        <th>Контакты</th>
                        <th>Заселение</th>
                        <th>Отмена</th>
                        <th>Комментарий владельца</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="admin-test-drive__muted" style={{ textAlign: 'center', padding: '1.25rem' }}>
                            Нет бронирований.
                          </td>
                        </tr>
                      ) : (
                        bookings.map((b) => (
                          <tr key={b.id}>
                            <td>{b.id}</td>
                            <td>
                              {b.start_date} — {b.end_date}
                              <div className="admin-test-drive__muted">Создано: {b.created_at || '—'}</div>
                            </td>
                            <td>
                              <span className={`admin-test-drive__status admin-test-drive__status--${statusTone(b.status)}`}>
                                {b.status || '—'}
                              </span>
                            </td>
                            <td>
                              user #{b.buyer?.id}: {buyerName(b.buyer)}
                              <div className="admin-test-drive__muted">{b.buyer?.role || ''}</div>
                            </td>
                            <td>{formatBuyerContactChannel(b.buyer_contact_channel)}</td>
                            <td>
                              {b.buyer?.email || '—'}
                              <br />
                              {b.buyer?.phone_number || '—'}
                            </td>
                            <td>{b.check_in_status || '—'}</td>
                            <td style={{ maxWidth: 260 }}>
                              {String(b.status || '').toLowerCase() === 'cancelled' ? (
                                <>
                                  <span className="admin-test-drive__cancel-source">
                                    {b.cancelled_by === 'owner' ? 'Отменил продавец' : 'Отменил покупатель'}
                                  </span>
                                  <div>{b.cancellation_reason || b.cancellation_reason_code || '—'}</div>
                                  <div className="admin-test-drive__muted">
                                    {b.cancelled_at ? `Время: ${b.cancelled_at}` : ''}
                                  </div>
                                </>
                              ) : (
                                <span className="admin-test-drive__muted">—</span>
                              )}
                            </td>
                            <td style={{ maxWidth: 220 }}>
                              {b.owner_comment ? (
                                <span title={b.owner_comment}>
                                  {b.owner_comment.length > 120 ? `${b.owner_comment.slice(0, 120)}…` : b.owner_comment}
                                </span>
                              ) : (
                                <span className="admin-test-drive__muted">—</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

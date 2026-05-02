import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FiExternalLink, FiCalendar, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
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
  entered_object: 'Удалось попасть в объект?',
  amenities_ok: 'Удобства в объекте соответствуют описанию?',
  defects_state: 'Есть ли дефекты/проблемы в объекте?',
  ready_to_stay: 'Готовы заселиться прямо сейчас?',
};

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
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  if (typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function answerTone(value, key) {
  const v = String(value || '').toLowerCase();
  if (v === 'yes' || v === 'ok') return 'positive';
  if (v === 'no' || v === 'issues') return 'negative';
  if (key === 'defects_state' && v) return v === 'ok' ? 'positive' : 'negative';
  return 'neutral';
}

function formatAnswer(value) {
  const v = String(value || '').toLowerCase();
  if (v === 'yes') return 'Да';
  if (v === 'no') return 'Нет';
  if (v === 'ok') return 'Все в порядке';
  if (v === 'issues') return 'Есть проблемы';
  return value ? String(value) : '—';
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
  }, [selected?.property_id, selected?.property_table]);

  useEffect(() => {
    if (!selected) {
      setBookings([]);
      setBookError(null);
      setOwnerContact(null);
      return;
    }
    let cancelled = false;
    ;(async () => {
      setBookLoading(true);
      setBookError(null);
      try {
        const q = new URLSearchParams({
          property_id: String(selected.property_id),
          property_table: String(selected.property_table),
        });
        const res = await fetch(`${API_BASE_URL}/admin/test-drive/property-bookings?${q.toString()}`);
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok || !json.success) {
          setBookError(json.error || 'Не удалось загрузить бронирования');
          setBookings([]);
          return;
        }
        setBookings(Array.isArray(json.data) ? json.data : []);
      } catch (e) {
        if (!cancelled) {
          setBookError(e.message || 'Сеть недоступна');
          setBookings([]);
        }
      } finally {
        if (!cancelled) setBookLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected]);

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
            const comment = report?.[`${key}_comment`];
            return {
              key,
              label,
              value: formatAnswer(value),
              rawValue: value,
              tone,
              comment: typeof comment === 'string' ? comment.trim() : '',
            };
          })
          .filter((item) => item.rawValue != null && String(item.rawValue).trim() !== '');

        const positiveCount = answers.filter((a) => a.tone === 'positive').length;
        const negativeCount = answers.filter((a) => a.tone === 'negative').length;
        const hasNegative = negativeCount > 0;
        return {
          bookingId: b.id,
          buyer: b.buyer || null,
          buyerDisplayName: buyerName(b.buyer),
          hasSellerRole,
          checkInStatus: b.check_in_status || '—',
          submittedAt: report?.submitted_at || b.created_at || null,
          answers,
          positiveCount,
          negativeCount,
          hasNegative,
          hasReport: Boolean(report),
        };
      })
      .filter((card) => card.hasReport);
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
                  <div className="admin-test-drive__quality">
                    {bookLoading ? (
                      <div className="admin-test-drive__loading">Загрузка анкет качества…</div>
                    ) : qualityCards.length === 0 ? (
                      <div className="admin-test-drive__detail-empty">
                        Пока нет заполненных анкет проверки качества по этому объекту.
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
                        <th>Контакты</th>
                        <th>Заселение</th>
                        <th>Отмена</th>
                        <th>Комментарий владельца</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="admin-test-drive__muted" style={{ textAlign: 'center', padding: '1.25rem' }}>
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

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiExternalLink, FiCalendar, FiChevronLeft, FiChevronRight, FiSend } from 'react-icons/fi';
import { getApiBaseUrlSync } from '../../utils/apiConfig';
import {
  markTestDriveAllCancellationsViewed,
  requestAdminSidebarBadgesRefresh,
  testDriveMergedCancelSeenMs,
  testDrivePerPropertySeenKey,
} from '../../utils/adminSidebarBadges';
import './AdminTestDrive.css';
import { getUiIntlLocale } from '../../utils/uiIntlLocale'

const API_BASE_URL = getApiBaseUrlSync();

const WEEKDAY_LABEL_KEYS = ['admin_mo', 'admin_tu', 'admin_we', 'admin_th', 'admin_fr', 'admin_sa', 'admin_su'];
const MONTH_LABEL_KEYS = [
  'admin_january',
  'admin_february',
  'admin_march',
  'admin_april',
  'admin_may',
  'admin_june',
  'admin_july',
  'admin_august',
  'admin_september',
  'admin_october',
  'admin_november',
  'admin_december',
];
const QUALITY_QUESTION_LABEL_KEYS = {
  property_expectations: 'admin_td_q_propertyExpectations',
  property_feedback: 'admin_td_q_propertyFeedback',
  amenities_ok: 'admin_td_q_amenitiesOk',
  defects_state: 'admin_td_q_defectsState',
  price_acceptable: 'admin_td_q_priceAcceptable',
  listing_info_clear: 'admin_td_q_listingInfoClear',
  ready_to_stay: 'admin_td_q_readyToStay',
};

/** В анкете поля комментариев названы не как `${вопрос}_comment` — маппинг для админки */
const COMMENT_STORAGE_KEY = {
  amenities_ok: 'amenities_comment',
  defects_state: 'defects_comment',
  listing_info_clear: 'listing_info_comment',
  price_acceptable: 'price_acceptable_comment',
  ready_to_stay: 'ready_to_stay_comment',
};

const BUYER_CONTACT_LABEL_KEYS = {
  telegram: null, // Telegram
  whatsapp: null, // WhatsApp
  email: 'admin_td_mail',
};

function formatBuyerContactChannel(ch, t) {
  const k = String(ch || '').toLowerCase();
  if (k === 'telegram') return 'Telegram';
  if (k === 'whatsapp') return 'WhatsApp';
  if (k === 'email') return t('admin_td_mail');
  return ch ? String(ch) : '—';
}

function adminCancelSeenStorageKey(sel) {
  if (!sel?.property_id || !sel?.property_table) return null;
  return testDrivePerPropertySeenKey(sel.property_table, sel.property_id);
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
  if (Number(report.survey_version) === 2) return true;
  const v2Keys = ['first_impression', 'comfort', 'price_impression', 'purchase_intent'];
  if (v2Keys.some((k) => report[k] != null && String(report[k]).trim() !== '')) return true;
  if (Array.isArray(report.highlights) && report.highlights.length > 0) return true;
  const keys = [
    'property_expectations',
    'property_feedback',
    'amenities_ok',
    'defects_state',
    'price_acceptable',
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

function formatAnswer(value, key, t) {
  const v = String(value || '').toLowerCase();
  if (key === 'price_acceptable') {
    if (v === 'yes') return t('admin_td_priceOk');
    if (v === 'no') return t('admin_td_priceNotOk');
  }
  if (key === 'listing_info_clear') {
    if (v === 'yes') return t('admin_td_listingClear');
    if (v === 'no') return t('admin_td_listingUnclear');
  }
  if (key === 'ready_to_stay') {
    if (v === 'yes') return t('admin_td_stayOk');
    if (v === 'no') return t('admin_td_stayNotes');
  }
  if (v === 'exceeded') return t('admin_td_exceeded');
  if (v === 'matched') return t('admin_td_matched');
  if (v === 'partially') return t('admin_td_partial');
  if (v === 'below') return t('admin_td_below');
  if (v === 'yes') return t('admin_yes');
  if (v === 'no') return t('admin_no');
  if (v === 'ok') return t('admin_td_allGood');
  if (v === 'issues') return t('admin_td_hasIssues');
  return value ? String(value) : '—';
}

function formatBroadcastDt(iso) {
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
    return String(iso);
  }
}

function isLikelySurveyImageUrl(s) {
  const t = String(s || '').trim();
  return t.startsWith('data:image/') || /^https?:\/\//i.test(t);
}

/** Группы фото из анкеты (v1: удобства/дефекты; v2: comfort_photos). */
function collectSurveyPhotoGroups(report, t) {
  if (!report || typeof report !== 'object') return [];
  const out = [];
  const add = (title, arr) => {
    if (!Array.isArray(arr)) return;
    const urls = arr.filter(isLikelySurveyImageUrl);
    if (urls.length) out.push({ title, urls });
  };
  add(t('admin_td_photosAmenities'), report.amenities_photos);
  add(t('admin_td_photosDefects'), report.defects_photos);
  add(t('admin_td_photosComfort'), report.comfort_photos);
  return out;
}

function isSurveyReportV2(report) {
  return Boolean(
    report &&
      typeof report === 'object' &&
      (Number(report.survey_version) === 2 || String(report.first_impression || '').trim()),
  );
}

const V2_HIGHLIGHT_LABEL_KEYS = {
  interior: 'admin_td_hl_interior',
  bed: 'admin_td_hl_bed',
  price: 'admin_td_hl_price',
  kitchen: 'admin_td_hl_kitchen',
  location: 'admin_td_hl_location',
};

function buildV2QualityAnswers(report, t) {
  const answers = [];
  const push = (key, label, displayValue, tone, extraComment) => {
    const val = String(displayValue || '').trim();
    if (!val) return;
    const com = typeof extraComment === 'string' ? extraComment.trim() : '';
    const valueVariant = val.length > 100 || val.includes('\n') ? 'text' : 'pill';
    answers.push({
      key,
      label,
      value: val,
      rawValue: displayValue,
      tone: tone || 'neutral',
      comment: com,
      valueVariant,
    });
  };

  const fi = String(report.first_impression || '').trim().toLowerCase();
  const fiLabel = {
    better: t('admin_td_fi_better'),
    as_photos: t('admin_td_fi_asPhotos'),
    slightly_off: t('admin_td_fi_slightlyOff'),
  }[fi];
  const fiTone = fi === 'slightly_off' ? 'negative' : 'positive';
  if (fiLabel) push('v2_fi', t('admin_td_fi_q'), fiLabel, fiTone, report.first_impression_comment);

  const cm = String(report.comfort || '').trim().toLowerCase();
  const cmLabel = {
    great: t('admin_td_cm_great'),
    mostly_but_missing: t('admin_td_cm_mostly'),
  }[cm];
  const cmTone = cm === 'mostly_but_missing' ? 'negative' : 'positive';
  if (cmLabel) push('v2_comfort', t('admin_td_comfort'), cmLabel, cmTone, report.comfort_missing_comment);

  const hl = Array.isArray(report.highlights) ? report.highlights.map(String) : [];
  if (hl.length) {
    const lines = hl.map((k) => (V2_HIGHLIGHT_LABEL_KEYS[k] ? t(V2_HIGHLIGHT_LABEL_KEYS[k]) : k)).join(', ');
    push('v2_hl', t('admin_strengths'), lines, 'positive', report.highlights_comment);
  } else if (String(report.highlights_comment || '').trim()) {
    push('v2_hl', t('admin_strengths'), '—', 'neutral', report.highlights_comment);
  }

  const pi = String(report.price_impression || '').trim().toLowerCase();
  const piLabel = {
    great_value: t('admin_td_pi_great'),
    fair: t('admin_td_pi_fair'),
    expensive: t('admin_td_pi_expensive'),
  }[pi];
  const piTone = pi === 'expensive' ? 'negative' : 'positive';
  if (piLabel) push('v2_price', t('admin_td_price_q'), piLabel, piTone, report.price_improve_comment);

  const pur = String(report.purchase_intent || '').trim().toLowerCase();
  const purLabel = {
    definitely_yes: t('admin_td_pur_yes'),
    rather_yes: t('admin_td_pur_ratherYes'),
    rather_no: t('admin_td_pur_ratherNo'),
  }[pur];
  const purTone = pur === 'rather_no' ? 'negative' : pur === 'definitely_yes' ? 'positive' : 'neutral';
  if (purLabel) push('v2_pur', t('admin_td_purchase_q'), purLabel, purTone, report.purchase_comment);

  const rating = Number(report.overall_rating);
  if (Number.isFinite(rating) && rating >= 1 && rating <= 5) {
    const stars = '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
    const ratingTone = rating >= 4 ? 'positive' : rating <= 2 ? 'negative' : 'neutral';
    push('v2_rating', t('admin_td_rating'), `${stars} (${Math.round(rating)}/5)`, ratingTone);
  }

  return answers;
}

function buildLegacyQualityAnswers(report, t) {
  return Object.entries(QUALITY_QUESTION_LABEL_KEYS)
    .map(([key, labelKey]) => {
      const value = report?.[key];
      if (value == null || (typeof value === 'string' && value.trim() === '')) return null;
      const tone = answerTone(value, key);
      const commentKey = COMMENT_STORAGE_KEY[key] || `${key}_comment`;
      const comment = report?.[commentKey];
      const displayVal = formatAnswer(value, key, t);
      const valueVariant =
        key === 'property_feedback' ||
        String(displayVal).length > 100 ||
        String(displayVal).includes('\n')
          ? 'text'
          : 'pill';
      return {
        key,
        label: t(labelKey),
        value: displayVal,
        rawValue: value,
        tone,
        comment: typeof comment === 'string' ? comment.trim() : '',
        valueVariant,
      };
    })
    .filter(Boolean);
}

function buildCheckInQualityAnswers(report, t) {
  if (isSurveyReportV2(report)) return buildV2QualityAnswers(report, t);
  return buildLegacyQualityAnswers(report, t);
}

export default function AdminTestDrive({
  adminBadgeTick = 0,
  onAdminSectionBadgeRefresh,
  testDriveMenuBadge = 0,
  testDriveTotalCancelledInDb = null,
}) {
  const { t } = useTranslation();
  const WEEKDAY_LABELS = WEEKDAY_LABEL_KEYS.map((k) => t(k));
  const MONTH_LABELS = MONTH_LABEL_KEYS.map((k) => t(k));
  const QUALITY_QUESTION_LABELS = Object.fromEntries(
    Object.entries(QUALITY_QUESTION_LABEL_KEYS).map(([k, key]) => [k, t(key)])
  );
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
  const [allCancelsSeenTick, setAllCancelsSeenTick] = useState(0);

  const loadList = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/test-drive/properties`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setListError(json.error || t('admin_ne_udalos_zagruzit_spisok_25dc1014'));
        setRows([]);
        return;
      }
      setRows(Array.isArray(json.data) ? json.data : []);
    } catch (e) {
      setListError(e.message || t('admin_networkUnavailable'));
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
        setBookError(json.error || t('admin_ne_udalos_zagruzit_bronirovaniya_56d0e24b'));
        setBookings([]);
        return;
      }
      setBookings(Array.isArray(json.data) ? json.data : []);
    } catch (e) {
      setBookError(e.message || t('admin_networkUnavailable'));
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
        const answers = buildCheckInQualityAnswers(report, t);
        const photoGroups = collectSurveyPhotoGroups(report, t);
        const photoTotal = photoGroups.reduce((acc, g) => acc + g.urls.length, 0);

        const positiveCount = answers.filter((a) => a.tone === 'positive').length;
        const negativeCount = answers.filter((a) => a.tone === 'negative').length;
        const hasNegative = negativeCount > 0;
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
          photoGroups,
          photoTotal,
          positiveCount,
          negativeCount,
          hasNegative,
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
    if (!cancelCards.length || !selected) return 0;
    const mergedSeen = testDriveMergedCancelSeenMs(selected.property_table, selected.property_id);
    const seenMs = Number.isFinite(mergedSeen) ? mergedSeen : NaN;
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
  }, [cancelCards, selected, cancelSeenAt, adminBadgeTick, allCancelsSeenTick]);

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
    void onAdminSectionBadgeRefresh?.();
    requestAdminSidebarBadgesRefresh({ patch: { test_drive: 0 } });
  };

  const markAllTestDriveCancellationsViewed = () => {
    markTestDriveAllCancellationsViewed();
    setAllCancelsSeenTick((x) => x + 1);
    requestAdminSidebarBadgesRefresh({ patch: { test_drive: 0 } });
    void onAdminSectionBadgeRefresh?.();
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
          setBroadcastError(json.error || t('admin_ne_udalos_zagruzit_obyavleniya_3b997c4e'));
          setBroadcastBookings([]);
          return;
        }
        setBroadcastBookings(Array.isArray(json.data) ? json.data : []);
      } catch (e) {
        if (!cancelled) {
          setBroadcastError(e.message || t('admin_networkUnavailable'));
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
        window.alert(json.error || t('admin_failedToSend'));
        return;
      }
      const r2 = await fetch(`${API_BASE_URL}/admin/test-drive/broadcasts`);
      const j2 = await r2.json().catch(() => ({}));
      if (r2.ok && j2.success && Array.isArray(j2.data)) {
        setBroadcastBookings(j2.data);
      }
    } catch (e) {
      window.alert(e.message || t('admin_networkError'));
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
          window.alert(json.error || t('admin_failedToSend'));
          return;
        }
        await loadPropertyBookings();
      } catch (e) {
        window.alert(e.message || t('admin_networkError'));
      } finally {
        setExitSendBusy(null);
      }
    },
    [loadPropertyBookings],
  );

  return (
    <div className="admin-test-drive">
      <div className="admin-test-drive__intro-row">
        <div className="admin-test-drive__intro-stack">
          <p className="admin-test-drive__intro">
            {t('admin_obekty_s_aktivnym_test_f2e18bee')}
          </p>
          <p className="admin-test-drive__intro-note">
            {t('admin_badge_skolko_otmen_bronirovaniya_b513c5c0', { badge: t('admin_v_levom_menyu_338b13b1') })}{' '}
            <strong>{testDriveMenuBadge}</strong>
            {typeof testDriveTotalCancelledInDb === 'number' ? (
              <>
                {' '}
                {t('admin_iz_count_otmenennyh_broney_2bad78ea', { count: testDriveTotalCancelledInDb })}
              </>
            ) : (
              '.'
            )}{' '}
            {t('admin_label_vsego_bronirovaniy_lyuboy_7ff330c4', { label: t('admin_chislo_sprava_u_obekta_aaf57e1b') })}
          </p>
        </div>
        <button
          type="button"
          className="admin-test-drive__mark-all-read"
          onClick={markAllTestDriveCancellationsViewed}
        >
          {t('admin_vse_prosmotreno_03ec7f17')}
        </button>
      </div>

      <div className="admin-test-drive__layout">
        <section className="admin-test-drive__panel">
          <div className="admin-test-drive__panel-head">
            <h2 className="admin-test-drive__panel-title">{t('admin_obekty_99ec3879')}</h2>
            <input
              type="search"
              className="admin-test-drive__search"
              placeholder={t('admin_poisk_po_nazvaniyu_adresu_e4b3b180')}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          {listError ? <div className="admin-test-drive__error">{listError}</div> : null}
          {listLoading ? (
            <div className="admin-test-drive__loading">{t('admin_zagruzka_spiska_f0f62b89')}</div>
          ) : (
            <div className="admin-test-drive__list">
              {filteredRows.length === 0 ? (
                <div className="admin-test-drive__detail-empty">{t('admin_nichego_ne_naydeno_40de4aab')}</div>
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
                        <div className="admin-test-drive__thumb-fallback">{t('admin_net_foto_65908105')}</div>
                      )}
                      <div className="admin-test-drive__row-main">
                        <div className="admin-test-drive__row-title">{r.title || t('admin_objectNum_tmpl', { id: r.property_id })}</div>
                        <div className="admin-test-drive__row-meta">
                          {r.property_table === 'properties_houses' ? t('admin_dom_villa_3a6f0ae3') : t('admin_apartment')} · ID{' '}
                          {r.property_id}
                          <br />
                          {r.location_line}
                          {Number(r.test_drive) === 1 ? '' : t('admin_test_drayv_vyklyuchen_9e71db07')}
                        </div>
                      </div>
                      <span
                        className={`admin-test-drive__badge${r.booking_count ? '' : ' admin-test-drive__badge--muted'}`}
                        title={t('admin_vsego_zapisey_bronirovaniya_lyuboy_b1bd0bfc')}
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
            <div className="admin-test-drive__detail-empty">{t('admin_vyberite_obekt_sleva_a0988be1')}</div>
          ) : (
            <div className="admin-test-drive__detail">
              <div className="admin-test-drive__detail-top">
                {selected.cover_url ? (
                  <img className="admin-test-drive__detail-thumb" src={selected.cover_url} alt="" />
                ) : (
                  <div className="admin-test-drive__detail-thumb-fallback" />
                )}
                <div className="admin-test-drive__detail-heading">
                  <h3>{selected.title || t('admin_objectNum_tmpl', { id: selected.property_id })}</h3>
                  <div className="admin-test-drive__detail-links">
                    <a
                      className="admin-test-drive__link-btn admin-test-drive__link-btn--primary"
                      href={`/property/${selected.property_id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t('admin_property_page')} <FiExternalLink size={14} aria-hidden />
                    </a>
                    <a
                      className="admin-test-drive__link-btn"
                      href={`/property/${selected.property_id}/test-drive?table=${encodeURIComponent(selected.property_table)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t('admin_booking_calendar')} <FiCalendar size={14} aria-hidden />
                    </a>
                  </div>
                  <p className="admin-test-drive__detail-sub">
                    {t('admin_tablica_table_vladelec_user_f61555a9', { table: selected.property_table, owner: selected.owner_user_id })}{' '}
                    {selected.booking_count ?? 0}
                  </p>
                </div>
              </div>

              <div className="admin-test-drive__cal-wrap">
                <div className="admin-test-drive__tabs" role="tablist" aria-label={t('admin_test_drayv_vkladki_eaf101eb')}>
                  <button
                    type="button"
                    className={`admin-test-drive__tab-btn${activeTab === 'calendar' ? ' admin-test-drive__tab-btn--active' : ''}`}
                    role="tab"
                    aria-selected={activeTab === 'calendar'}
                    onClick={() => setActiveTab('calendar')}
                  >
                    {t('admin_kalendar_fa3a2f17')}
                  </button>
                  <button
                    type="button"
                    className={`admin-test-drive__tab-btn${activeTab === 'quality' ? ' admin-test-drive__tab-btn--active' : ''}`}
                    role="tab"
                    aria-selected={activeTab === 'quality'}
                    onClick={() => setActiveTab('quality')}
                  >
                    {t('admin_proverka_kachestva_d14cb1f4')}
                  </button>
                  <button
                    type="button"
                    className={`admin-test-drive__tab-btn${activeTab === 'broadcasts' ? ' admin-test-drive__tab-btn--active' : ''}`}
                    role="tab"
                    aria-selected={activeTab === 'broadcasts'}
                    onClick={() => setActiveTab('broadcasts')}
                  >
                    {t('admin_obyavleniya_5c38d87a')}
                  </button>
                  <button
                    type="button"
                    className={`admin-test-drive__tab-btn${activeTab === 'cancellations' ? ' admin-test-drive__tab-btn--active' : ''}`}
                    role="tab"
                    aria-selected={activeTab === 'cancellations'}
                    onClick={() => setActiveTab('cancellations')}
                  >
                    {t('admin_otmeny_87735831')}
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
                        <div className="admin-test-drive__cal-nav" role="group" aria-label={t('admin_navigaciya_po_mesyacam_a9ce6802')}>
                          <button type="button" aria-label={t('admin_predyduschiy_mesyac_b4fde607')} onClick={() => shiftMonth(-1)}>
                            <FiChevronLeft size={18} aria-hidden />
                          </button>
                          <button type="button" aria-label={t('admin_sleduyuschiy_mesyac_b36ebe72')} onClick={() => shiftMonth(1)}>
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
                        {t('admin_zanyato_ba8daf5d')}
                      </span>
                      <span className="admin-test-drive__cal-legend-item">
                        <span className="admin-test-drive__cal-legend-swatch admin-test-drive__cal-legend-swatch--today" />{' '}
                        {t('admin_segodnya_5d5d2ea2')}
                      </span>
                      <span className="admin-test-drive__cal-legend-caption">
                        {t('admin_podsvecheny_vse_daty_vnutri_20aa2014')}
                      </span>
                    </div>
                  </>
                ) : activeTab === 'quality' ? (
                  <div className="admin-test-drive__quality admin-test-drive__quality--split">
                    {bookLoading ? (
                      <div className="admin-test-drive__loading">{t('admin_zagruzka_anket_kachestva_20d9a538')}</div>
                    ) : (
                      <>
                        <h4 className="admin-test-drive__quality-section-title">{t('admin_anketa_pri_prozhivanii_804be98e')}</h4>
                        {qualityCards.length === 0 ? (
                          <div className="admin-test-drive__detail-empty admin-test-drive__detail-empty--tight">
                            {t('admin_net_zapolnennyh_anket_po_9b72c97c')}
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
                                    <span className="admin-test-drive__quality-badge">{t('admin_buyer')}</span>
                                    <span
                                      className={`admin-test-drive__quality-badge${card.hasSellerRole ? '' : ' admin-test-drive__quality-badge--muted'}`}
                                    >
                                      {t('admin_seller')}
                                    </span>
                                    <span className="admin-test-drive__quality-booking">{t('admin_bookingNum_tmpl', { id: card.bookingId })}</span>
                                  </div>
                                </div>
                                <div className="admin-test-drive__quality-stats">
                                  <span className="admin-test-drive__quality-chip admin-test-drive__quality-chip--positive">
                                    {t('admin_td_positive_count', { count: card.positiveCount })}
                                  </span>
                                  <span className="admin-test-drive__quality-chip admin-test-drive__quality-chip--negative">
                                    {t('admin_td_negative_count', { count: card.negativeCount })}
                                  </span>
                                </div>
                              </summary>
                              <div className="admin-test-drive__quality-body">
                                <div className="admin-test-drive__quality-subhead">
                                  {t('admin_td_checkin_status', { status: card.checkInStatus })}{' '}
                                  {card.submittedAt ? formatBroadcastDt(card.submittedAt) : '—'}
                                  {card.photoTotal > 0 ? (
                                    <>
                                      {' '}
                                      {t('admin_td_photos_attached', { n: card.photoTotal })}
                                    </>
                                  ) : null}
                                </div>
                                <div className="admin-test-drive__quality-contact">
                                  <div className="admin-test-drive__quality-contact-title">{t('admin_svyaz_s_pokupatelem_f944dcb3')}</div>
                                  <div className="admin-test-drive__quality-contact-row">
                                    <span className="admin-test-drive__muted">{t('admin_predpochtitelnyy_kanal_d84f2b43')}</span>{' '}
                                    {formatBuyerContactChannel(card.buyerContactChannel, t)}
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
                                    <span className="admin-test-drive__muted">{t('admin_telefon_0e41c7c4')}</span>{' '}
                                    {card.buyerPhone ? (
                                      <a href={`tel:${String(card.buyerPhone).replace(/\s+/g, '')}`}>
                                        {card.buyerPhone}
                                      </a>
                                    ) : (
                                      '—'
                                    )}
                                  </div>
                                </div>
                                {card.photoGroups?.length ? (
                                  <div className="admin-test-drive__quality-photo-sections">
                                    {card.photoGroups.map((g, gi) => (
                                      <div key={`${card.bookingId}-ph-${gi}`} className="admin-test-drive__quality-photo-section">
                                        <div className="admin-test-drive__quality-photo-section-title">{g.title}</div>
                                        <div className="admin-test-drive__quality-photo-grid">
                                          {g.urls.map((src, i) => (
                                            <a
                                              key={`${card.bookingId}-img-${gi}-${i}`}
                                              href={src}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="admin-test-drive__quality-photo-link"
                                            >
                                              <img
                                                src={src}
                                                alt=""
                                                className="admin-test-drive__quality-photo-thumb"
                                                loading="lazy"
                                              />
                                            </a>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : null}
                                <div className="admin-test-drive__quality-list">
                                  {card.answers.map((a) => (
                                    <div key={`${card.bookingId}-${a.key}`} className="admin-test-drive__quality-item">
                                      <div className="admin-test-drive__quality-question">{a.label}</div>
                                      {a.valueVariant === 'text' ? (
                                        <div
                                          className={`admin-test-drive__quality-answer-text admin-test-drive__quality-answer-text--${a.tone}`}
                                        >
                                          {a.value}
                                        </div>
                                      ) : (
                                        <div
                                          className={`admin-test-drive__quality-answer admin-test-drive__quality-answer--${a.tone}`}
                                        >
                                          {a.value}
                                        </div>
                                      )}
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
                        <h4 className="admin-test-drive__quality-section-title">{t('admin_posle_prozhivaniya_ocenka_zvezdami_88ab98f7')}</h4>
                        {exitFeedbackCards.length === 0 ? (
                          <div className="admin-test-drive__detail-empty admin-test-drive__detail-empty--tight">
                            {t('admin_poka_net_ocenok_posle_cd313619')}
                          </div>
                        ) : (
                          exitFeedbackCards.map((ef) => {
                            const stars = Math.min(5, Math.max(1, Math.round(Number(ef.rating) || 1)));
                            return (
                            <details key={`exit-feedback-${ef.bookingId}`} className="admin-test-drive__quality-card">
                              <summary className="admin-test-drive__quality-summary">
                                <div className="admin-test-drive__quality-head">
                                  <div className="admin-test-drive__quality-name">
                                    {t('admin_td_booking_buyer', { id: ef.bookingId, name: ef.buyerDisplayName })}
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
                                  {t('admin_td_sent_at', { at: ef.submittedAt ? formatBroadcastDt(ef.submittedAt) : '—' })}
                                </div>
                                <div className="admin-test-drive__quality-contact">
                                  <div className="admin-test-drive__quality-contact-title">{t('admin_svyaz_s_pokupatelem_f944dcb3')}</div>
                                  <div className="admin-test-drive__quality-contact-row">
                                    <span className="admin-test-drive__muted">Email:</span>{' '}
                                    {ef.buyerEmail ? (
                                      <a href={`mailto:${ef.buyerEmail}`}>{ef.buyerEmail}</a>
                                    ) : (
                                      '—'
                                    )}
                                  </div>
                                  <div className="admin-test-drive__quality-contact-row">
                                    <span className="admin-test-drive__muted">{t('admin_telefon_0e41c7c4')}</span>{' '}
                                    {ef.buyerPhone ? (
                                      <a href={`tel:${String(ef.buyerPhone).replace(/\s+/g, '')}`}>{ef.buyerPhone}</a>
                                    ) : (
                                      '—'
                                    )}
                                  </div>
                                </div>
                                <div className="admin-test-drive__quality-item">
                                  <div className="admin-test-drive__quality-question">{t('admin_kommentariy_829038c9')}</div>
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
                    <div className="admin-test-drive__broadcast-subtabs" role="tablist" aria-label={t('admin_rassylki_obyavleniy_5a70fea8')}>
                      <button
                        type="button"
                        role="tab"
                        className={`admin-test-drive__broadcast-subtab${broadcastSubTab === 'survey' ? ' admin-test-drive__broadcast-subtab--active' : ''}`}
                        aria-selected={broadcastSubTab === 'survey'}
                        onClick={() => setBroadcastSubTab('survey')}
                      >
                        {t('admin_opros_pri_prozhivanii_9ecb4bdd')}
                      </button>
                      <button
                        type="button"
                        role="tab"
                        className={`admin-test-drive__broadcast-subtab${broadcastSubTab === 'exit' ? ' admin-test-drive__broadcast-subtab--active' : ''}`}
                        aria-selected={broadcastSubTab === 'exit'}
                        onClick={() => setBroadcastSubTab('exit')}
                      >
                        {t('admin_zavershenie_broni_517c95fd')}
                      </button>
                    </div>
                    {broadcastSubTab === 'survey' ? (
                      <>
                        {broadcastLoading ? (
                          <div className="admin-test-drive__loading">{t('admin_zagruzka_rassylok_d1dae98f')}</div>
                        ) : broadcastError ? (
                          <div className="admin-test-drive__error">{broadcastError}</div>
                        ) : propertyBroadcasts.length === 0 ? (
                          <div className="admin-test-drive__detail-empty">
                            {t('admin_net_podtverzhdennyh_broney_s_ff8e75f1')}
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
                                        {t('admin_td_booking_range', { id: br.id, start: br.start_date, end: br.end_date })}
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
                                      {sent ? t('admin_sent') : t('admin_pending')}
                                    </span>
                                  </div>
                                  <div className="admin-test-drive__broadcast-meta">
                                    <span>{t('admin_avtootpravka_plan_95979567')} {formatBroadcastDt(br.survey_scheduled_at)}</span>
                                    <span>
                                      {t('admin_fakt__dcd47481')} {sent ? formatBroadcastDt(br.survey_whatsapp_sent_at) : '—'}
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
                                      {broadcastSendBusy === Number(br.id) ? t('admin_sending') : t('admin_sendNow')}
                                    </button>
                                  ) : (
                                    <p className="admin-test-drive__muted admin-test-drive__broadcast-note">
                                      {t('admin_soobschenie_s_ssylkoy_na_2c5b19bd')}
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
                          <div className="admin-test-drive__loading">{t('admin_zagruzka_broney_e60b527c')}</div>
                        ) : propertyExitBroadcasts.length === 0 ? (
                          <div className="admin-test-drive__detail-empty">
                            {t('admin_net_broney_s_tokenom_ffef9771')}
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
                                        {t('admin_td_booking_checkout', { id: br.id, end: br.end_date })}
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
                                      {sent ? t('admin_sent') : t('admin_pending')}
                                    </span>
                                  </div>
                                  <div className="admin-test-drive__broadcast-meta">
                                    <span>{t('admin_plan__posle_vyezda_f4af9128')} {formatBroadcastDt(br.exit_feedback_scheduled_at)}</span>
                                    <span>
                                      {t('admin_fakt__dcd47481')} {sent ? formatBroadcastDt(br.exit_feedback_whatsapp_sent_at) : '—'}
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
                                      {exitSendBusy === Number(br.id) ? t('admin_sending') : t('admin_sendNow')}
                                    </button>
                                  ) : (
                                    <p className="admin-test-drive__muted admin-test-drive__broadcast-note">
                                      {t('admin_soobschenie_s_ssylkoy_na_ed538388')}
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
                        {t('admin_td_unseen_cancels', { count: unseenCancelCount })}
                      </div>
                      <button
                        type="button"
                        className="admin-test-drive__cancel-viewed-btn"
                        onClick={markCancelsAsViewed}
                        disabled={unseenCancelCount === 0}
                      >
                        {t('admin_prosmotreno_0dbf26a5')}
                      </button>
                    </div>

                    {bookLoading ? (
                      <div className="admin-test-drive__loading">{t('admin_zagruzka_otmen_0f838f28')}</div>
                    ) : cancelCards.length === 0 ? (
                      <div className="admin-test-drive__detail-empty">{t('admin_po_etomu_obektu_poka_32f1bbb6')}</div>
                    ) : (
                      <div className="admin-test-drive__cancel-list">
                        {cancelCards.map((c) => (
                          <div key={`cancel-${c.id}`} className="admin-test-drive__cancel-card">
                            <div className="admin-test-drive__cancel-head">
                              <div className="admin-test-drive__cancel-title">{t('admin_bookingNum_tmpl', { id: c.id })}</div>
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
                              <div className="admin-test-drive__cancel-contact-title">{t('admin_kontakty_pokupatelya_0a9677d4')}</div>
                              <div className="admin-test-drive__cancel-contact-row">
                                {c.buyer?.email || 'email: —'}
                              </div>
                              <div className="admin-test-drive__cancel-contact-row">
                                {c.buyer?.phone_number || t('admin_telefon_0360f013')}
                              </div>
                            </div>
                            <div className="admin-test-drive__cancel-contact-block">
                              <div className="admin-test-drive__cancel-contact-title">
                                {t('admin_kontakty_prodavca_user_id_10bf4d64', { id: selected.owner_user_id || '—' })}
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
                                {ownerContact?.phone_number || t('admin_telefon_0360f013')}
                              </div>
                            </div>
                            <div className="admin-test-drive__cancel-meta">
                              {t('admin_otmenil_who_74d6b7c0', { who: c.cancelled_by === 'owner' ? t('admin_prodavec_4ada6871') : t('admin_pokupatel_38479427') })}
                            </div>
                            <div className="admin-test-drive__cancel-reason">{c.cancellation_reason}</div>
                            <div className="admin-test-drive__muted">
                              {c.cancelled_at ? t('admin_cancelTime_tmpl', { at: c.cancelled_at }) : ''}
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
                <div className="admin-test-drive__loading">{t('admin_zagruzka_bronirovaniy_58dd1a3d')}</div>
              ) : activeTab === 'calendar' ? (
                <div className="admin-test-drive__table-wrap">
                  <table className="admin-test-drive__table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>{t('admin_period_b2822e2b')}</th>
                        <th>{t('admin_status_f7f293b5')}</th>
                        <th>{t('admin_buyer')}</th>
                        <th>{t('admin_predpocht_svyaz_f509a145')}</th>
                        <th>{t('admin_sa_contacts')}</th>
                        <th>{t('admin_zaselenie_4d9613e9')}</th>
                        <th>{t('admin_otmena_0ec753be')}</th>
                        <th>{t('admin_kommentariy_vladelca_7a8d4918')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="admin-test-drive__muted" style={{ textAlign: 'center', padding: '1.25rem' }}>
                            {t('admin_net_bronirovaniy_eaa85c9f')}
                          </td>
                        </tr>
                      ) : (
                        bookings.map((b) => (
                          <tr key={b.id}>
                            <td>{b.id}</td>
                            <td>
                              {b.start_date} — {b.end_date}
                              <div className="admin-test-drive__muted">{t('admin_td_created', { at: b.created_at || '—' })}</div>
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
                            <td>{formatBuyerContactChannel(b.buyer_contact_channel, t)}</td>
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
                                    {b.cancelled_by === 'owner' ? t('admin_otmenil_prodavec_9a74eb2d') : t('admin_otmenil_pokupatel_0f47f7f2')}
                                  </span>
                                  <div>{b.cancellation_reason || b.cancellation_reason_code || '—'}</div>
                                  <div className="admin-test-drive__muted">
                                    {b.cancelled_at ? t('admin_timeAt_tmpl', { at: b.cancelled_at }) : ''}
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

/** Ключи localStorage для счётчиков в боковом меню админки */

export const LS_TEST_DRIVE_GLOBAL_CANCEL_SEEN = 'admin_test_drive_global_cancel_seen_at';
export const LS_LIVE_CHAT_ALL_READ = 'admin_live_chat_all_messages_read_at';
export const LS_PURCHASE_REQUESTS_SEEN = 'admin_purchase_requests_mark_seen_at';

export function readAdminLs(key) {
  if (typeof localStorage === 'undefined') return null;
  try {
    const v = localStorage.getItem(key);
    return v && String(v).trim() ? String(v).trim() : null;
  } catch {
    return null;
  }
}

export function writeAdminLs(key, iso) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, iso);
  } catch {
    /* ignore */
  }
}

export function testDrivePerPropertySeenKey(propertyTable, propertyId) {
  const pt = String(propertyTable || '').trim();
  const pid = Number(propertyId);
  const idPart = Number.isFinite(pid) ? String(pid) : String(propertyId ?? '');
  return `admin_test_drive_cancel_seen_at:${pt}:${idPart}`;
}

export function cancelEventTimeMs(c) {
  if (c.cancelled_at) {
    const x = Date.parse(c.cancelled_at);
    if (Number.isFinite(x)) return x;
  }
  if (c.created_at) {
    const y = Date.parse(c.created_at);
    if (Number.isFinite(y)) return y;
  }
  return NaN;
}

/** Эффективная отметка просмотра отмен для объекта: max(глобальная, по объекту) */
export function testDriveMergedCancelSeenMs(propertyTable, propertyId) {
  const pt = String(propertyTable || '').trim();
  const pid = Number(propertyId);
  const idPart = Number.isFinite(pid) ? pid : propertyId;
  const gRaw = readAdminLs(LS_TEST_DRIVE_GLOBAL_CANCEL_SEEN);
  const pRaw = readAdminLs(testDrivePerPropertySeenKey(pt, idPart));
  const gMs = gRaw ? Date.parse(gRaw) : NaN;
  const pMs = pRaw ? Date.parse(pRaw) : NaN;
  if (!Number.isFinite(gMs) && !Number.isFinite(pMs)) return NaN;
  return Math.max(Number.isFinite(gMs) ? gMs : -Infinity, Number.isFinite(pMs) ? pMs : -Infinity);
}

/**
 * @param {Array<{ property_id: number, property_table: string, cancelled_at?: string, created_at?: string }>} cancellations
 */
export function countUnseenTestDriveCancellations(cancellations) {
  if (!Array.isArray(cancellations) || cancellations.length === 0) return 0;
  return cancellations.filter((c) => {
    const pt = String(c.property_table || '').trim();
    const pid = Number(c.property_id);
    const idPart = Number.isFinite(pid) ? pid : c.property_id;
    const t = cancelEventTimeMs(c);
    const seenMs = testDriveMergedCancelSeenMs(pt, idPart);
    if (!Number.isFinite(seenMs)) return true;
    if (!Number.isFinite(t)) return true;
    return t > seenMs;
  }).length;
}

export function markTestDriveAllCancellationsViewed() {
  writeAdminLs(LS_TEST_DRIVE_GLOBAL_CANCEL_SEEN, new Date().toISOString());
}

export function markLiveChatAllViewed() {
  writeAdminLs(LS_LIVE_CHAT_ALL_READ, new Date().toISOString());
}

export function markPurchaseRequestsViewed() {
  writeAdminLs(LS_PURCHASE_REQUESTS_SEEN, new Date().toISOString());
}

/** Запросы со статусом pending, созданные после последней отметки «просмотрено» */
export function countUnseenPurchasePending(requests) {
  if (!Array.isArray(requests)) return 0;
  const seenRaw = readAdminLs(LS_PURCHASE_REQUESTS_SEEN);
  const seenMs = seenRaw ? Date.parse(seenRaw) : NaN;
  return requests.filter((r) => {
    if (String(r.status || '').toLowerCase() !== 'pending') return false;
    const createdRaw = r.created_at || r.updated_at;
    const created = createdRaw ? Date.parse(createdRaw) : NaN;
    if (!Number.isFinite(seenMs)) return true;
    if (!Number.isFinite(created)) return true;
    return created > seenMs;
  }).length;
}

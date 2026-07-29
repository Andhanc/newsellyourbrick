import { getApiBaseUrl } from './apiConfig';
import {
  countUnseenPurchaseActionable,
  countUnseenTestDriveCancellations,
  readAdminLs,
  LS_LIVE_CHAT_ALL_READ,
} from './adminSidebarBadges';

export const ADMIN_SIDEBAR_BADGE_IDS = [
  'statistics',
  'users',
  'private_club',
  'moderation',
  'chat',
  'smart_assistant',
  'addition',
  'objects',
  'auctions',
  'test_drive',
  'debt_reasons',
  'debt_documents',
  'whatsapp',
  'clients',
  'purchase_requests',
  'bonuses',
  'seo',
  'testing',
  'access_management',
  'storage',
];

export function createEmptyAdminSidebarBadges() {
  return Object.fromEntries(ADMIN_SIDEBAR_BADGE_IDS.map((id) => [id, 0]));
}

function pendingPropertiesCount(rows) {
  if (!Array.isArray(rows)) return 0;
  return rows.filter((p) => {
    const st = p.moderation_status || p.moderationStatus;
    return st === 'pending' || st == null || st === undefined;
  }).length;
}

function pendingVerificationUsersCount(docs) {
  if (!Array.isArray(docs)) return 0;
  const ids = new Set();
  for (const doc of docs) {
    if ((doc.verification_status || 'pending') === 'pending' && doc.user_id != null) {
      ids.add(doc.user_id);
    }
  }
  return ids.size;
}

function isTimerActive(endRaw) {
  if (endRaw == null || endRaw === '') return false;
  const t = Date.parse(endRaw);
  return Number.isFinite(t) && t > Date.now();
}

function isAuctionLive(prop) {
  if (!prop) return false;
  const end = prop.test_timer_end_date || prop.auction_end_date || prop.endTime;
  return isTimerActive(end);
}

/**
 * @returns {Promise<{ badges: Record<string, number>, meta: { testDriveTotalCancelled: number|null } }>}
 */
export async function fetchAdminSidebarBadges() {
  const base = await getApiBaseUrl();
  const badges = createEmptyAdminSidebarBadges();
  let testDriveTotalCancelled = null;

  const [
    testDriveRes,
    pendingDocsRes,
    pendingPropsRes,
    unreviewedRes,
    chatRes,
    purchaseRes,
    bonusesRes,
    assistantRes,
    auctionsRes,
    testTimersRes,
    crmRes,
    whatsappRes,
  ] = await Promise.all([
    fetch(`${base}/admin/test-drive/cancellations-badge`).catch(() => null),
    fetch(`${base}/documents/pending`).catch(() => null),
    fetch(`${base}/properties/pending`).catch(() => null),
    fetch(`${base}/documents/unreviewed`).catch(() => null),
    (async () => {
      const sinceRaw = readAdminLs(LS_LIVE_CHAT_ALL_READ);
      const since = sinceRaw || '1970-01-01T00:00:00.000Z';
      return fetch(
        `${base}/admin/live-chat/user-messages-since?since=${encodeURIComponent(since)}`,
      ).catch(() => null);
    })(),
    fetch(`${base}/purchase-requests?limit=1000`).catch(() => null),
    fetch(`${base}/bonus-submissions/pending`).catch(() => null),
    fetch(`${base}/assistant-leads`).catch(() => null),
    fetch(`${base}/properties/auctions`).catch(() => null),
    fetch(`${base}/properties/test-timers`).catch(() => null),
    fetch(`${base}/admin/crm/board`).catch(() => null),
    fetch(`${base}/whatsapp/users?limit=500`).catch(() => null),
  ]);

  if (testDriveRes?.ok) {
    const j = await testDriveRes.json().catch(() => ({}));
    if (j.success && Array.isArray(j.data)) {
      testDriveTotalCancelled =
        j.meta && typeof j.meta.total_cancelled === 'number' ? j.meta.total_cancelled : j.data.length;
      badges.test_drive = countUnseenTestDriveCancellations(j.data);
    }
  }

  let pendingUsersN = 0;
  let pendingPropsN = 0;
  if (pendingDocsRes?.ok) {
    const j1 = await pendingDocsRes.json().catch(() => ({}));
    pendingUsersN = pendingVerificationUsersCount(j1.data);
  }
  if (pendingPropsRes?.ok) {
    const j2 = await pendingPropsRes.json().catch(() => ({}));
    pendingPropsN = pendingPropertiesCount(j2.data);
  }
  badges.moderation = pendingUsersN + pendingPropsN;
  badges.objects = pendingPropsN;
  badges.addition = pendingPropsN;

  if (unreviewedRes?.ok) {
    const j = await unreviewedRes.json().catch(() => ({}));
    badges.users = Array.isArray(j.data) ? j.data.length : 0;
  }

  if (chatRes?.ok) {
    const j = await chatRes.json().catch(() => ({}));
    if (j.success && j.data && typeof j.data.count === 'number') {
      badges.chat = j.data.count;
    }
  }

  if (purchaseRes?.ok) {
    const j = await purchaseRes.json().catch(() => ({}));
    if (j.success && Array.isArray(j.data)) {
      badges.purchase_requests = countUnseenPurchaseActionable(j.data);
    }
  }

  if (bonusesRes?.ok) {
    const j = await bonusesRes.json().catch(() => ({}));
    if (j.success && Array.isArray(j.data)) {
      badges.bonuses = j.data.length;
    }
  }

  if (assistantRes?.ok) {
    const j = await assistantRes.json().catch(() => ({}));
    if (j.success && Array.isArray(j.data)) {
      badges.smart_assistant = j.data.filter(
        (lead) =>
          lead.manager_contact_requested === 1 ||
          lead.manager_contact_requested === true ||
          String(lead.lead_type || '').toLowerCase() === 'hot',
      ).length;
    }
  }

  if (auctionsRes?.ok) {
    const j = await auctionsRes.json().catch(() => ({}));
    if (j.success && Array.isArray(j.data)) {
      badges.auctions = j.data.filter(isAuctionLive).length;
    }
  }

  if (testTimersRes?.ok) {
    const j = await testTimersRes.json().catch(() => ({}));
    if (j.success && Array.isArray(j.data)) {
      badges.testing = j.data.filter((p) => isTimerActive(p.test_timer_end_date)).length;
    }
  }

  if (crmRes?.ok) {
    const j = await crmRes.json().catch(() => ({}));
    if (j.success && j.data?.stages && j.data?.leadsByStage) {
      const newStage = j.data.stages.find((s) => s.slug === 'new');
      if (newStage) {
        const leads = j.data.leadsByStage[newStage.id] || [];
        badges.clients = leads.length;
      }
    }
  }

  if (whatsappRes?.ok) {
    const j = await whatsappRes.json().catch(() => ({}));
    const users = Array.isArray(j.data) ? j.data : [];
    badges.whatsapp = users.filter((u) => String(u.leadType || u.lead_type || '').toLowerCase() === 'hot')
      .length;
  }

  badges.statistics = badges.moderation + badges.purchase_requests + badges.chat + badges.bonuses;

  return { badges, meta: { testDriveTotalCancelled } };
}

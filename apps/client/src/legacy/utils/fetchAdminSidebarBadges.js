import { getApiBaseUrl } from './apiConfig';
import { fetchDedupe } from './fetchDedupe';
import {
  countUnseenPurchaseActionable,
  countUnseenTestDriveCancellations,
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

/**
 * @returns {Promise<{ badges: Record<string, number>, meta: { testDriveTotalCancelled: number|null } }>}
 */
export async function fetchAdminSidebarBadges() {
  const base = await getApiBaseUrl();
  const badges = createEmptyAdminSidebarBadges();
  let testDriveTotalCancelled = null;

  const res = await fetchDedupe(`${base}/admin/sidebar-badges`).catch(() => null);
  if (!res?.ok) return { badges, meta: { testDriveTotalCancelled } };

  const json = await res.json().catch(() => ({}));
  if (!json?.success) return { badges, meta: { testDriveTotalCancelled } };

  if (json.badges && typeof json.badges === 'object') {
    for (const id of ADMIN_SIDEBAR_BADGE_IDS) {
      if (json.badges[id] != null) badges[id] = Number(json.badges[id]) || 0;
    }
  }

  if (json.meta && typeof json.meta.testDriveTotalCancelled === 'number') {
    testDriveTotalCancelled = json.meta.testDriveTotalCancelled;
  }

  if (Array.isArray(json.testDriveCancellations)) {
    badges.test_drive = countUnseenTestDriveCancellations(json.testDriveCancellations);
  }
  if (Array.isArray(json.purchaseRequests)) {
    badges.purchase_requests = countUnseenPurchaseActionable(json.purchaseRequests);
  }

  badges.statistics =
    badges.moderation + badges.purchase_requests + badges.chat + badges.bonuses;

  return { badges, meta: { testDriveTotalCancelled } };
}

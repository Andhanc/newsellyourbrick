import { getApiBaseUrl } from '../utils/apiConfig';

export function liveChatStorageKey(assistantSessionId) {
  return `liveChatToken_${assistantSessionId || 'guest'}`;
}

export function normalizeLiveChatRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => ({
    id: r.id,
    text: r.body,
    sender:
      r.sender_role === 'system' ? 'system' : r.sender_role === 'manager' ? 'manager' : 'user',
    timestamp: r.created_at ? new Date(r.created_at) : new Date(),
  }));
}

/**
 * Проверяет сохранённый токен; при необходимости создаёт сессию на сервере.
 */
export async function ensureLiveChatSession({ assistantSessionId, userId, waitMessage }) {
  const base = await getApiBaseUrl();
  const storageKey = liveChatStorageKey(assistantSessionId);
  let token = typeof localStorage !== 'undefined' ? localStorage.getItem(storageKey) : null;

  if (token) {
    try {
      const res = await fetch(`${base}/live-chat/sessions/${encodeURIComponent(token)}/messages`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return { token, messages: json.data, storageKey };
        }
      }
    } catch (_) {
      /* fall through */
    }
    localStorage.removeItem(storageKey);
    token = null;
  }

  const res = await fetch(`${base}/live-chat/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      assistantSessionId: assistantSessionId || null,
      userId: userId != null ? Number(userId) : null,
      waitMessage: waitMessage || null,
    }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'live chat');
  const newToken = json.data.token;
  if (typeof localStorage !== 'undefined') localStorage.setItem(storageKey, newToken);
  return {
    token: newToken,
    messages: json.data.messages || [],
    storageKey,
  };
}

export async function fetchLiveChatMessagesSince(token, sinceId = 0) {
  const base = await getApiBaseUrl();
  const q = sinceId ? `?since=${encodeURIComponent(String(sinceId))}` : '';
  const res = await fetch(`${base}/live-chat/sessions/${encodeURIComponent(token)}/messages${q}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'messages');
  return json.data;
}

export async function sendLiveChatUserMessage(token, text) {
  const base = await getApiBaseUrl();
  const res = await fetch(`${base}/live-chat/sessions/${encodeURIComponent(token)}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'send');
  return json.data;
}

export async function fetchAdminLiveChatSessions() {
  const base = await getApiBaseUrl();
  const res = await fetch(`${base}/admin/live-chat/sessions`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'list');
  return json.data;
}

export async function fetchAdminLiveChatMessages(sessionId) {
  const base = await getApiBaseUrl();
  const res = await fetch(`${base}/admin/live-chat/sessions/${sessionId}/messages`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'messages');
  return json.data;
}

export async function sendAdminLiveChatMessage(sessionId, text) {
  const base = await getApiBaseUrl();
  const res = await fetch(`${base}/admin/live-chat/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'send');
  return json.data;
}

/** Кнопки выбора способа связи с менеджером (умный помощник). */
export function getManagerContactButtons(t) {
  return [
    { type: 'contact_pref', value: 'phone', label: t('managerContactPrefPhone') },
    { type: 'contact_pref', value: 'email', label: t('managerContactPrefEmail') },
    { type: 'contact_pref', value: 'whatsapp', label: t('managerContactPrefWhatsapp') },
    { type: 'contact_pref', value: 'telegram', label: t('managerContactPrefTelegram') },
    { type: 'contact_pref', value: 'live_chat', label: t('managerContactPrefLiveChat') },
  ];
}

/**
 * Синхронизация сессии чата с умным помощником на сервер (для раздела «Умный помощник» в админке).
 */
import { getApiBaseUrl } from '../utils/apiConfig';

/**
 * Отправляет текущие сообщения и предпочтения на сервер.
 * @param {string} sessionId - идентификатор сессии (getChatUserId)
 * @param {Array} messages - массив сообщений { id, text, sender, timestamp, ... }
 * @param {Object} preferences - предпочтения пользователя (purpose, budget, location, propertyType, rooms, area, other)
 * @param {{ id?: string|number, email?: string, phone?: string }} [userData] - данные пользователя если авторизован
 */
export async function syncAssistantLead(sessionId, messages, preferences, userData = null) {
  if (!sessionId || !messages || !Array.isArray(messages) || messages.length === 0) return;
  try {
    const base = await getApiBaseUrl();
    const body = {
      sessionId,
      userId: userData?.id ? Number(userData.id) : null,
      messages: messages.map((m) => ({
        id: m.id,
        text: m.text,
        sender: m.sender,
        timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp
      })),
      preferences: preferences || {},
      email: (userData?.email && String(userData.email).trim()) || null,
      phone: (userData?.phone && String(userData.phone).replace(/\D/g, '')) || (userData?.phone_number && String(userData.phone_number).replace(/\D/g, '')) || null
    };
    await fetch(`${base}/assistant-leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('syncAssistantLead:', err.message);
    }
  }
}

import { getPrisma } from '../database/prismaClient.js';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_TOKEN_RE = /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/;
const MAX_BATCH_SIZE = 100;

function positiveInt(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function isExpoPushToken(value) {
  return EXPO_TOKEN_RE.test(String(value || '').trim());
}

export async function registerExpoPushToken({ userId, token, platform, deviceId = null }) {
  const uid = positiveInt(userId);
  const normalizedToken = String(token || '').trim();
  const normalizedPlatform = String(platform || '').trim().toLowerCase();

  if (!uid) throw new Error('invalid_user_id');
  if (!isExpoPushToken(normalizedToken)) throw new Error('invalid_expo_push_token');
  if (!['android', 'ios'].includes(normalizedPlatform)) throw new Error('invalid_platform');

  const prisma = getPrisma();
  const user = await prisma.users.findUnique({ where: { id: uid }, select: { id: true } });
  if (!user) throw new Error('user_not_found');

  return prisma.push_notification_tokens.upsert({
    where: { token: normalizedToken },
    create: {
      user_id: uid,
      token: normalizedToken,
      platform: normalizedPlatform,
      device_id: deviceId ? String(deviceId).slice(0, 200) : null,
      enabled: 1,
    },
    update: {
      user_id: uid,
      platform: normalizedPlatform,
      device_id: deviceId ? String(deviceId).slice(0, 200) : null,
      enabled: 1,
      updated_at: new Date(),
    },
    select: { id: true, user_id: true, platform: true, enabled: true },
  });
}

export async function unregisterExpoPushToken({ userId, token }) {
  const uid = positiveInt(userId);
  const normalizedToken = String(token || '').trim();
  if (!uid || !normalizedToken) return { count: 0 };

  return getPrisma().push_notification_tokens.updateMany({
    where: { user_id: uid, token: normalizedToken },
    data: { enabled: 0, updated_at: new Date() },
  });
}

function chunks(values, size) {
  const result = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

function pushHeaders() {
  const headers = {
    Accept: 'application/json',
    'Accept-Encoding': 'gzip, deflate',
    'Content-Type': 'application/json',
  };
  const accessToken = String(process.env.EXPO_ACCESS_TOKEN || '').trim();
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  return headers;
}

async function postExpoBatch(messages, attempt = 0) {
  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: pushHeaders(),
    body: JSON.stringify(messages),
    signal: AbortSignal.timeout(15000),
  });

  if ((response.status === 429 || response.status >= 500) && attempt < 2) {
    await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
    return postExpoBatch(messages, attempt + 1);
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(`expo_push_http_${response.status}`);
    error.body = body;
    throw error;
  }
  return body;
}

/**
 * Sends an Expo remote push to every active installation associated with a user.
 * Business flows must remain successful even if the external push provider is down.
 */
export async function sendPushToUser(userId, { title, body, data = {}, channelId = 'transactions' }) {
  const uid = positiveInt(userId);
  if (!uid) return { sent: 0, skipped: 'invalid_user_id' };

  const prisma = getPrisma();
  const installations = await prisma.push_notification_tokens.findMany({
    where: { user_id: uid, enabled: 1 },
    select: { token: true },
  });
  if (installations.length === 0) return { sent: 0, skipped: 'no_tokens' };

  let accepted = 0;
  const disabledTokens = [];
  for (const batch of chunks(installations, MAX_BATCH_SIZE)) {
    const messages = batch.map(({ token }) => ({
      to: token,
      title: String(title || 'Sellyourbrick').slice(0, 160),
      body: String(body || '').slice(0, 1000),
      data,
      sound: 'default',
      priority: 'high',
      channelId,
    }));
    const result = await postExpoBatch(messages.length === 1 ? messages[0] : messages);
    const tickets = Array.isArray(result?.data) ? result.data : result?.data ? [result.data] : [];
    tickets.forEach((ticket, index) => {
      if (ticket?.status === 'ok') accepted += 1;
      if (ticket?.details?.error === 'DeviceNotRegistered' && batch[index]?.token) {
        disabledTokens.push(batch[index].token);
      }
    });
  }

  if (disabledTokens.length > 0) {
    await prisma.push_notification_tokens.updateMany({
      where: { token: { in: disabledTokens } },
      data: { enabled: 0, updated_at: new Date() },
    });
  }

  return { sent: accepted, devices: installations.length, disabled: disabledTokens.length };
}

export async function sendPushToUserSafely(userId, payload, context = 'push') {
  try {
    return await sendPushToUser(userId, payload);
  } catch (error) {
    console.warn(`[${context}] Push notification failed:`, error?.message || error);
    return { sent: 0, error: error?.message || String(error) };
  }
}

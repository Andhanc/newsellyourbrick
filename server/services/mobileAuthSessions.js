import crypto from 'crypto';

import { getPrisma } from '../database/prismaClient.js';

const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000;

function tokenHash(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

export async function issueMobileAuthSession(userId) {
  const uid = Number(userId);
  if (!Number.isInteger(uid) || uid < 1) throw new Error('invalid_user_id');

  const prisma = getPrisma();
  const now = new Date();
  await prisma.mobile_auth_sessions.deleteMany({
    where: { user_id: uid, expires_at: { lte: now } },
  });

  const token = crypto.randomBytes(32).toString('base64url');
  await prisma.mobile_auth_sessions.create({
    data: {
      user_id: uid,
      token_hash: tokenHash(token),
      expires_at: new Date(now.getTime() + SESSION_TTL_MS),
    },
  });
  return token;
}

export function bearerTokenFromRequest(req) {
  const header = String(req?.headers?.authorization || '').trim();
  const match = /^Bearer\s+([^\s]+)$/i.exec(header);
  return match?.[1] || null;
}

export async function authenticateMobileRequest(req) {
  const token = bearerTokenFromRequest(req);
  if (!token) return null;

  const prisma = getPrisma();
  const session = await prisma.mobile_auth_sessions.findUnique({
    where: { token_hash: tokenHash(token) },
    select: { id: true, user_id: true, expires_at: true },
  });
  if (!session) return null;
  if (session.expires_at.getTime() <= Date.now()) {
    await prisma.mobile_auth_sessions.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  return { sessionId: session.id, userId: session.user_id };
}

export async function revokeMobileAuthSession(req) {
  const token = bearerTokenFromRequest(req);
  if (!token) return { count: 0 };
  return getPrisma().mobile_auth_sessions.deleteMany({
    where: { token_hash: tokenHash(token) },
  });
}

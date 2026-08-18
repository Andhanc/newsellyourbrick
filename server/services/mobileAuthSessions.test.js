import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { bearerTokenFromRequest } from './mobileAuthSessions.js';

test('extracts a strict Bearer token from a request', () => {
  assert.equal(
    bearerTokenFromRequest({ headers: { authorization: 'Bearer mobile-session-token' } }),
    'mobile-session-token',
  );
  assert.equal(bearerTokenFromRequest({ headers: { authorization: 'Basic abc' } }), null);
  assert.equal(bearerTokenFromRequest({ headers: {} }), null);
});

test('session helpers require a generated Prisma mobile_auth_sessions model', async () => {
  const source = await readFile(new URL('./mobileAuthSessions.js', import.meta.url), 'utf8');
  assert.match(source, /Prisma client is missing mobile_auth_sessions/);
  assert.match(source, /function mobileAuthSessions\(/);
});

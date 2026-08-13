import assert from 'node:assert/strict';
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

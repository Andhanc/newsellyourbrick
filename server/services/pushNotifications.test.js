import assert from 'node:assert/strict';
import test from 'node:test';

import { isExpoPushToken } from './pushNotifications.js';

test('accepts Expo push tokens and rejects arbitrary identifiers', () => {
  assert.equal(isExpoPushToken('ExponentPushToken[abc_DEF-123]'), true);
  assert.equal(isExpoPushToken('ExpoPushToken[abc_DEF-123]'), true);
  assert.equal(isExpoPushToken('user-123'), false);
  assert.equal(isExpoPushToken(''), false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildVerificationApprovedCopy,
} from './verificationApprovedNotify.js';

test('buildVerificationApprovedCopy includes site url and success text', () => {
  const { subject, emailBody, whatsappBody } = buildVerificationApprovedCopy({
    siteUrl: 'https://example.com',
  });
  assert.match(subject, /пройдена/i);
  assert.match(emailBody, /одобрены/i);
  assert.match(emailBody, /https:\/\/example\.com/);
  assert.match(whatsappBody, /Верификация пройдена/i);
  assert.match(whatsappBody, /https:\/\/example\.com/);
});

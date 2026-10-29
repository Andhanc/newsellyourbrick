import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildVerificationApprovedCopy,
} from './verificationApprovedNotify.js';

test('buildVerificationApprovedCopy includes site url and success text', () => {
  const { subject, emailBody, whatsappBody } = buildVerificationApprovedCopy({
    siteUrl: 'https://example.com',
  });
  assert.match(subject, /approved/i);
  assert.match(emailBody, /approved/i);
  assert.match(emailBody, /https:\/\/example\.com/);
  assert.match(whatsappBody, /Verification approved/i);
  assert.match(whatsappBody, /https:\/\/example\.com/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildVerificationRejectedCopy,
} from './verificationRejectedNotify.js';

test('buildVerificationRejectedCopy includes reason and site url', () => {
  const { subject, emailBody, whatsappBody } = buildVerificationRejectedCopy('Blurry passport photo', {
    siteUrl: 'https://example.com',
  });
  assert.match(subject, /rejected/i);
  assert.match(emailBody, /Blurry passport photo/);
  assert.match(emailBody, /https:\/\/example\.com/);
  assert.match(whatsappBody, /Blurry passport photo/);
  assert.match(whatsappBody, /https:\/\/example\.com/);
});

test('buildVerificationRejectedCopy works without reason', () => {
  const { emailBody, whatsappBody } = buildVerificationRejectedCopy(null, {
    siteUrl: 'https://example.com',
  });
  assert.doesNotMatch(emailBody, /Reason:/);
  assert.match(emailBody, /again/i);
  assert.match(whatsappBody, /again/i);
});

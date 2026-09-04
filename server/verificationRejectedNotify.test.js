import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildVerificationRejectedCopy,
} from './verificationRejectedNotify.js';

test('buildVerificationRejectedCopy includes reason and site url', () => {
  const { subject, emailBody, whatsappBody } = buildVerificationRejectedCopy('Blurry passport photo', {
    siteUrl: 'https://example.com',
  });
  assert.match(subject, /отклонена/i);
  assert.match(emailBody, /Blurry passport photo/);
  assert.match(emailBody, /https:\/\/example\.com/);
  assert.match(whatsappBody, /Blurry passport photo/);
  assert.match(whatsappBody, /https:\/\/example\.com/);
});

test('buildVerificationRejectedCopy works without reason', () => {
  const { emailBody, whatsappBody } = buildVerificationRejectedCopy(null, {
    siteUrl: 'https://example.com',
  });
  assert.doesNotMatch(emailBody, /Причина:/);
  assert.match(emailBody, /повторно/i);
  assert.match(whatsappBody, /повторно/i);
});

import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildVipClubWelcomeEmail,
  shouldSendVipClubWelcomeEmail,
} from './vipClubWelcomeEmail.js'
import {
  normalizeWhatsAppChatDigits,
  buildWhatsAppChatUrl,
} from './whatsappOutbound.js'

test('VIP welcome email includes WhatsApp chat link', () => {
  const { subject, body } = buildVipClubWelcomeEmail({
    firstName: 'Anna',
    whatsappUrl: 'https://wa.me/447700183959?text=hello',
  })
  assert.equal(subject, 'Welcome to the VIP private club — Sellyourbrick')
  assert.match(body, /Hello, Anna/)
  assert.match(body, /VIP private club subscription is now active/)
  assert.match(body, /WhatsApp/)
  assert.match(body, /https:\/\/wa\.me\/447700183959\?text=hello/)
})

test('VIP welcome email works without first name or WhatsApp url', () => {
  const { body } = buildVipClubWelcomeEmail({ firstName: '', whatsappUrl: '' })
  assert.match(body, /^Hello!/)
  assert.match(body, /A manager will contact you/)
})

test('welcome email is sent only on the first new VIP payment', () => {
  assert.equal(
    shouldSendVipClubWelcomeEmail({ planKey: 'vip', isNewPayment: true, vipPaymentCount: 1 }),
    true,
  )
  assert.equal(
    shouldSendVipClubWelcomeEmail({ planKey: 'vip', isNewPayment: false, vipPaymentCount: 1 }),
    false,
  )
  assert.equal(
    shouldSendVipClubWelcomeEmail({ planKey: 'pro', isNewPayment: true, vipPaymentCount: 1 }),
    false,
  )
  assert.equal(
    shouldSendVipClubWelcomeEmail({ planKey: 'vip', isNewPayment: true, vipPaymentCount: 2 }),
    false,
  )
})

test('normalizeWhatsAppChatDigits keeps phone numbers and drops LIDs', () => {
  assert.equal(normalizeWhatsAppChatDigits('+44 7700 183959'), '447700183959')
  assert.equal(normalizeWhatsAppChatDigits('123456789012345678'), '')
  assert.equal(normalizeWhatsAppChatDigits('123'), '')
})

test('buildWhatsAppChatUrl encodes prefill text', () => {
  const url = buildWhatsAppChatUrl('447700183959', 'Hello! I subscribed to the VIP private club.')
  assert.equal(url.startsWith('https://wa.me/447700183959?text='), true)
  assert.match(url, /Hello/)
})

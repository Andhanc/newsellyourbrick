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
    firstName: 'Анна',
    whatsappUrl: 'https://wa.me/447700183959?text=hello',
  })
  assert.equal(subject, 'Добро пожаловать в закрытый клуб VIP — Sellyourbrick')
  assert.match(body, /Здравствуйте, Анна/)
  assert.match(body, /подписка VIP закрытого клуба активирована/)
  assert.match(body, /WhatsApp/)
  assert.match(body, /https:\/\/wa\.me\/447700183959\?text=hello/)
})

test('VIP welcome email works without first name or WhatsApp url', () => {
  const { body } = buildVipClubWelcomeEmail({ firstName: '', whatsappUrl: '' })
  assert.match(body, /^Здравствуйте!/)
  assert.match(body, /Менеджер свяжется с вами/)
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
  const url = buildWhatsAppChatUrl('447700183959', 'Здравствуйте! Я оформил подписку VIP закрытого клуба.')
  assert.equal(url.startsWith('https://wa.me/447700183959?text='), true)
  assert.match(url, /%D0%97%D0%B4%D1%80%D0%B0%D0%B2%D1%81%D1%82%D0%B2%D1%83%D0%B9%D1%82%D0%B5/)
})

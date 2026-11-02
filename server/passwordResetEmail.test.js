import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import {
  PASSWORD_RESET_LOCALES,
  buildPasswordResetEmail,
  normalizeResetLocale,
} from './passwordResetEmail.js'
import { hashPassword } from './passwordHash.js'

test('password reset email is localized and explains how to set a new password', () => {
  const expectations = {
    ru: /Как придумать новый пароль/,
    en: /How to create a new password/,
    de: /So legen Sie ein neues Passwort fest/,
    es: /Cómo crear una contraseña nueva/,
    fr: /Comment créer un nouveau mot de passe/,
    pl: /Jak ustawić nowe hasło/,
    sv: /Så skapar du ett nytt lösenord/,
  }
  for (const locale of PASSWORD_RESET_LOCALES) {
    const { subject, body } = buildPasswordResetEmail({
      code: '4821',
      locale,
      siteUrl: 'https://example.test',
    })
    assert.ok(subject.length > 8, locale)
    assert.match(body, /4821/)
    assert.match(body, expectations[locale])
    assert.match(body, /10/)
    assert.match(body, /https:\/\/example\.test/)
    assert.match(body, /1\. /)
    assert.match(body, /5\. /)
  }
})

test('unknown locale falls back to English instructions', () => {
  assert.equal(normalizeResetLocale('pt-BR'), 'en')
  assert.equal(normalizeResetLocale('RU'), 'ru')
  const { body } = buildPasswordResetEmail({ code: '1000', locale: 'zh-CN' })
  assert.match(body, /How to create a new password/)
})

test('reset hash matches the login digest', () => {
  const password = 'NewPass1!'
  const expected = crypto.createHash('sha256').update(password).digest('hex')
  assert.equal(hashPassword(password), expected)
  assert.notEqual(hashPassword(password), hashPassword('OtherPass1!'))
})

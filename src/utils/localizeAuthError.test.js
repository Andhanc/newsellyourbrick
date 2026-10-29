import test from 'node:test'
import assert from 'node:assert/strict'
import { localizeAuthError } from './localizeAuthError.js'

const DICT = {
  invalidCode: 'Invalid code. Please try again.',
  authError_codeExpired: 'Code expired. Request a new code.',
  authError_userBlocked: 'User is blocked',
  authError_networkError: 'Network error. Please try again later.',
  invalidEmailOrPassword: 'Invalid email or password',
  passwordMinLength: 'Password must contain at least 6 characters',
  nameMinLength: 'Name must contain at least 2 characters',
  genericError: 'Something went wrong. Please try again.',
  forgotPassword_saveError: 'Could not save password',
}

const t = (key) => DICT[key] || key

test('maps short codes', () => {
  assert.equal(localizeAuthError('invalid_code', t), DICT.invalidCode)
  assert.equal(localizeAuthError('code_expired', t), DICT.authError_codeExpired)
  assert.equal(localizeAuthError('user_blocked', t), DICT.authError_userBlocked)
  assert.equal(localizeAuthError('network_error', t), DICT.authError_networkError)
})

test('maps English authService messages', () => {
  assert.equal(localizeAuthError('Invalid email or password', t), DICT.invalidEmailOrPassword)
  assert.equal(localizeAuthError('Password must contain at least 6 characters', t), DICT.passwordMinLength)
  assert.equal(localizeAuthError('Name must contain at least 2 characters', t), DICT.nameMinLength)
})

test('maps legacy Russian messages', () => {
  assert.equal(localizeAuthError('Неверный код', t), DICT.invalidCode)
  assert.equal(localizeAuthError('Пользователь заблокирован', t), DICT.authError_userBlocked)
  assert.equal(localizeAuthError('Не удалось сохранить пароль', t), DICT.forgotPassword_saveError)
})

test('returns non-Cyrillic original when unmapped', () => {
  assert.equal(localizeAuthError('Some custom API error', t), 'Some custom API error')
})

test('falls back to genericError for unmapped Cyrillic', () => {
  assert.equal(localizeAuthError('Совсем неизвестная ошибка', t), DICT.genericError)
})

test('accepts Error and result-shaped objects', () => {
  assert.equal(localizeAuthError(new Error('user_blocked'), t), DICT.authError_userBlocked)
  assert.equal(localizeAuthError({ error: 'Invalid code' }, t), DICT.invalidCode)
  assert.equal(localizeAuthError({ code: 'NEED_REGISTER', error: 'x' }, t), 'authError_needRegister')
})

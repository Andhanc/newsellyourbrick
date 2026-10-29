import test from 'node:test'
import assert from 'node:assert/strict'
import {
  formatPasswordValidationMessage,
  normalizePasswordReqToken,
} from './passwordValidationMessage.js'

const tEs = (key, opts = {}) => {
  const map = {
    passwordValidationFailed: `La contraseña no cumple los requisitos. Añada: ${opts.missing}.`,
    passwordValidationPresent: `Ya tiene: ${opts.present}.`,
    passwordMeetsRequirements: 'La contraseña cumple todos los requisitos',
    roleSwitch_passwordRequirementUpper: 'Una mayúscula',
    roleSwitch_passwordRequirementSpecial: 'Un carácter especial',
    roleSwitch_passwordRequirementDigit: 'Un número',
  }
  return map[key] || opts.defaultValue || key
}

test('normalizes legacy Russian labels and stable keys', () => {
  assert.equal(normalizePasswordReqToken('upper'), 'upper')
  assert.equal(normalizePasswordReqToken('заглавную букву'), 'upper')
  assert.equal(normalizePasswordReqToken('спецсимвол'), 'special')
  assert.equal(normalizePasswordReqToken('цифру'), 'digit')
})

test('formats password validation message in UI language', () => {
  const msg = formatPasswordValidationMessage(
    { valid: false, missing: ['upper', 'special', 'digit'], present: [] },
    tEs,
  )
  assert.match(msg, /Añada:/)
  assert.match(msg, /mayúscula/)
  assert.match(msg, /carácter especial/)
  assert.match(msg, /número/)
  assert.doesNotMatch(msg, /[А-Яа-яЁё]/)
})

test('formats legacy Russian API tokens into localized labels', () => {
  const msg = formatPasswordValidationMessage(
    {
      valid: false,
      missing: ['заглавную букву', 'цифру'],
      present: ['спецсимвол'],
    },
    tEs,
  )
  assert.match(msg, /mayúscula/)
  assert.match(msg, /número/)
  assert.match(msg, /Ya tiene:.*carácter especial/)
})

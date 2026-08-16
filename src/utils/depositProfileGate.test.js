import test from 'node:test'
import assert from 'node:assert/strict'
import { isBuyerProfileCompleteForDeposit } from './depositProfileGate.js'

test('incomplete buyer profile blocks deposit', () => {
  assert.equal(
    isBuyerProfileCompleteForDeposit({
      first_name: 'And',
      last_name: 'Hantsevich',
      email: 'a@b.com',
      phone_number: '',
      country: 'Беларусь',
      address: '',
      passport_number: '',
      identification_number: '',
    }),
    false,
  )
})

test('complete buyer profile allows deposit', () => {
  assert.equal(
    isBuyerProfileCompleteForDeposit({
      first_name: 'And',
      last_name: 'Hantsevich',
      email: 'a@b.com',
      phone_number: '+375291234567',
      country: 'Беларусь',
      address: 'Minsk',
      passport_number: 'AB1234567',
      identification_number: '1234567A123PB1',
    }),
    true,
  )
})

test('short phone is not enough', () => {
  assert.equal(
    isBuyerProfileCompleteForDeposit({
      first_name: 'And',
      last_name: 'Hantsevich',
      email: 'a@b.com',
      phone_number: '123',
      country: 'Беларусь',
      address: 'Minsk',
      passport_number: 'AB1234567',
      identification_number: '1234567A123PB1',
    }),
    false,
  )
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { buildTestDriveSurveyInviteEmail, buildTestDriveSurveyInviteWhatsApp } from './testDriveSurveyEmail.js'

test('survey invite email matches in-app notification copy', () => {
  const { subject, body } = buildTestDriveSurveyInviteEmail({
    firstName: 'Анна',
    propertyTitle: 'Вилла на берегу залива',
    surveyUrl: 'https://example.com/test-drive/survey/abc',
  })
  assert.equal(subject, 'Пройдите опрос по тест-драйву')
  assert.match(body, /Здравствуйте, Анна/)
  assert.match(body, /Вилла на берегу залива/)
  assert.match(body, /Пройти опрос/)
  assert.match(body, /https:\/\/example.com\/test-drive\/survey\/abc/)
})

test('survey invite WhatsApp includes title and survey link', () => {
  const text = buildTestDriveSurveyInviteWhatsApp({
    firstName: 'Анна',
    propertyTitle: 'Вилла на берегу залива',
    surveyUrl: 'https://example.com/test-drive/survey/abc',
  })
  assert.match(text, /Пройдите опрос по тест-драйву/)
  assert.match(text, /Вилла на берегу залива/)
  assert.match(text, /https:\/\/example.com\/test-drive\/survey\/abc/)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  CLARITY_PROJECT_ID,
  RECORDING_CONSENT_KEY,
  RECORDING_CONSENT_MAX_AGE,
  readRecordingConsent,
  saveRecordingConsent,
  startSessionRecording,
  revokeSessionRecording,
} from './sessionRecording.js'

function browserFixture(hostname = 'sellyourbrick.com') {
  const values = new Map()
  const scripts = []
  let reloads = 0
  const browser = {
    location: { hostname, reload() { reloads += 1 } },
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    },
    document: {
      getElementById: (id) => scripts.find((script) => script.id === id),
      createElement: () => ({ remove() { scripts.splice(scripts.indexOf(this), 1) } }),
      head: { appendChild: (script) => scripts.push(script) },
    },
  }
  return { browser, scripts, values, reloads: () => reloads }
}

test('consent must be valid, recent and specific to session recording', () => {
  const { browser, values } = browserFixture()
  const now = Date.now()
  assert.equal(readRecordingConsent(browser), null)
  values.set('syb_cookie_consent_v1', 'accept')
  assert.equal(readRecordingConsent(browser), null)
  values.set(RECORDING_CONSENT_KEY, '{broken')
  assert.equal(readRecordingConsent(browser), null)
  for (const saved of [
    { choice: 'other', at: now },
    { choice: 'accept', at: now + 1 },
    { choice: 'accept', at: now - RECORDING_CONSENT_MAX_AGE },
    { choice: 'accept' },
  ]) {
    values.set(RECORDING_CONSENT_KEY, JSON.stringify(saved))
    assert.equal(readRecordingConsent(browser, now), null)
  }
  for (const choice of ['accept', 'decline']) {
    saveRecordingConsent(choice, browser)
    assert.equal(readRecordingConsent(browser), choice)
  }
})

test('unavailable localStorage does not break the page', () => {
  const browser = { get localStorage() { throw new Error('blocked') } }
  assert.equal(readRecordingConsent(browser), null)
  assert.doesNotThrow(() => saveRecordingConsent('accept', browser))
  assert.equal(readRecordingConsent(undefined), null)
})

test('the production loader grants analytics only and survives repeated React effects', () => {
  const { browser, scripts } = browserFixture()
  assert.equal(startSessionRecording(browser), true)
  assert.equal(startSessionRecording(browser), true)
  assert.equal(scripts.length, 1)
  assert.equal(scripts[0].src, `https://www.clarity.ms/tag/${CLARITY_PROJECT_ID}`)
  assert.equal(scripts[0].async, true)
  const calls = browser.clarity.q.map((args) => [...args])
  assert.deepEqual(calls, [['consentv2', { analytics_Storage: 'granted', ad_Storage: 'denied' }]])
})

test('local, native and preview hosts never send data to the production Clarity project', () => {
  for (const host of ['localhost', '127.0.0.1', 'preview.up.railway.app', '']) {
    const { browser, scripts } = browserFixture(host)
    assert.equal(startSessionRecording(browser), false)
    assert.equal(scripts.length, 0)
    assert.equal(browser.clarity, undefined)
  }
  assert.equal(startSessionRecording(undefined), false)
  assert.equal(startSessionRecording({}), false)
})

test('a failed script can be retried without adding duplicate tags', () => {
  const { browser, scripts } = browserFixture()
  startSessionRecording(browser)
  scripts[0].onerror()
  assert.equal(scripts.length, 0)
  startSessionRecording(browser)
  assert.equal(scripts.length, 1)
})

test('withdrawing consent clears the Clarity consent and reloads to stop all recording', () => {
  const fixture = browserFixture()
  revokeSessionRecording(fixture.browser)
  assert.equal(fixture.reloads(), 0)
  startSessionRecording(fixture.browser)
  saveRecordingConsent('decline', fixture.browser)
  revokeSessionRecording(fixture.browser)
  assert.equal(readRecordingConsent(fixture.browser), 'decline')
  assert.equal(fixture.reloads(), 1)
  assert.deepEqual([...fixture.browser.clarity.q.at(-1)], [
    'consentv2', { analytics_Storage: 'denied', ad_Storage: 'denied' },
  ])
})

test('the recording code and all consent translations stay synchronized with legacy', () => {
  for (const path of ['App.jsx', 'components/Footer.jsx', 'components/SessionRecording.jsx', 'components/SessionRecording.css', 'utils/sessionRecording.js']) {
    assert.equal(
      readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'),
      readFileSync(new URL(`../../apps/client/src/legacy/${path}`, import.meta.url), 'utf8'),
      path,
    )
  }
  const component = readFileSync(new URL('../components/SessionRecording.jsx', import.meta.url), 'utf8')
  assert.match(component, /if \(choice === 'accept'\) startSessionRecording\(\)/)
  for (const locale of ['ru', 'en', 'de', 'es', 'fr', 'pl', 'sv']) {
    const primary = JSON.parse(readFileSync(new URL(`../i18n/locales/mainPage/${locale}.json`, import.meta.url)))
    const legacy = JSON.parse(readFileSync(new URL(`../../apps/client/src/legacy/i18n/locales/mainPage/${locale}.json`, import.meta.url)))
    for (const key of ['recordingConsentTitle', 'recordingConsentBody', 'recordingConsentSettings', 'recordingConsentAccept', 'recordingConsentDecline']) {
      assert.ok(primary[key]?.length, `${locale}: ${key}`)
      assert.equal(primary[key], legacy[key])
    }
  }
})

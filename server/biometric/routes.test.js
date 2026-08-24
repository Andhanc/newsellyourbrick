import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveWebAuthnContext } from './routes.js'

function requestWithOrigin(origin) {
  return { get: (name) => (String(name).toLowerCase() === 'origin' ? origin : '') }
}

function withEnv(values, run) {
  const previous = {}
  for (const [key, value] of Object.entries(values)) {
    previous[key] = process.env[key]
    if (value == null) delete process.env[key]
    else process.env[key] = value
  }
  try {
    return run()
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value == null) delete process.env[key]
      else process.env[key] = value
    }
  }
}

test('allows the WebAuthn localhost secure-context exception in development', () => {
  withEnv(
    { NODE_ENV: 'development', WEBAUTHN_ORIGIN: null, WEBAUTHN_RP_ID: null },
    () => {
      assert.deepEqual(resolveWebAuthnContext(requestWithOrigin('http://localhost:5173')), {
        origin: 'http://localhost:5173',
        rpID: 'localhost',
      })
    },
  )
})

test('rejects plain HTTP on a LAN address', () => {
  withEnv(
    { NODE_ENV: 'development', WEBAUTHN_ORIGIN: null, WEBAUTHN_RP_ID: null },
    () => {
      assert.throws(
        () => resolveWebAuthnContext(requestWithOrigin('http://192.168.1.23:5173')),
        /secure_context_required/,
      )
    },
  )
})

test('production requires an exact configured origin and RP ID', () => {
  withEnv(
    {
      NODE_ENV: 'production',
      WEBAUTHN_ORIGIN: 'https://sellyourbrick.com',
      WEBAUTHN_RP_ID: 'sellyourbrick.com',
    },
    () => {
      assert.equal(
        resolveWebAuthnContext(requestWithOrigin('https://sellyourbrick.com')).rpID,
        'sellyourbrick.com',
      )
      assert.throws(
        () => resolveWebAuthnContext(requestWithOrigin('https://evil.example')),
        /origin_not_allowed/,
      )
    },
  )
})

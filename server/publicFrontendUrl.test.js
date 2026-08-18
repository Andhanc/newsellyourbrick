import assert from 'node:assert/strict'
import test from 'node:test'
import { resolvePublicFrontendBase } from './publicFrontendUrl.js'

test('keeps an absolute FRONTEND_URL', () => {
  assert.equal(
    resolvePublicFrontendBase({ FRONTEND_URL: 'https://sellyourbrick.com/' }),
    'https://sellyourbrick.com',
  )
})

test('adds https when Railway domain has no scheme', () => {
  assert.equal(
    resolvePublicFrontendBase({
      FRONTEND_URL: 'newsellyourbrick-production-a69c.up.railway.app',
    }),
    'https://newsellyourbrick-production-a69c.up.railway.app',
  )
})

test('falls back to RAILWAY_PUBLIC_DOMAIN', () => {
  assert.equal(
    resolvePublicFrontendBase({ RAILWAY_PUBLIC_DOMAIN: 'example.up.railway.app' }),
    'https://example.up.railway.app',
  )
})

test('uses request host when env is empty', () => {
  assert.equal(
    resolvePublicFrontendBase(
      { NODE_ENV: 'production' },
      { headers: { 'x-forwarded-proto': 'https', host: 'app.example.com' } },
    ),
    'https://app.example.com',
  )
})

test('keeps localhost on http', () => {
  assert.equal(resolvePublicFrontendBase({ FRONTEND_URL: 'localhost:5173' }), 'http://localhost:5173')
  assert.equal(resolvePublicFrontendBase({}), 'http://localhost:5173')
})

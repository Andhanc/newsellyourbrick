import test from 'node:test'
import assert from 'node:assert/strict'
import { registerAuthSessionRoutes } from './authSessionRoutes.js'

async function request({ session = { userId: 7 }, user = { id: 7, role: 'seller', email: 'test@example.test', password: 'never-expose' }, fail = false } = {}) {
  let handler
  let loadedId
  registerAuthSessionRoutes({ get: (path, fn) => {
    assert.equal(path, '/api/auth/mobile/session')
    handler = fn
  } }, {
    authenticateMobileRequest: async () => {
      if (fail) throw new Error('private database diagnostics')
      return session
    },
    getUserById: async id => { loadedId = id; return user },
  })
  const result = { status: 200, headers: {} }
  const res = {
    status: value => { result.status = value; return res },
    json: value => { result.body = value; return res },
    set: (key, value) => { result.headers[key] = value; return res },
  }
  await handler({ query: { userId: 999 } }, res)
  return { ...result, loadedId }
}

test('session verification resolves identity from the token and exposes only public session fields', async () => {
  const result = await request()
  assert.equal(result.status, 200)
  assert.equal(result.loadedId, 7)
  assert.deepEqual(result.body, { success: true, user: { id: 7, role: 'seller', email: 'test@example.test' } })
  assert.equal(result.headers['Cache-Control'], 'no-store')
})

test('missing or expired tokens are rejected without looking up a client-supplied identity', async () => {
  const result = await request({ session: null })
  assert.equal(result.status, 401)
  assert.equal(result.loadedId, undefined)
})

test('deleted accounts cannot resume an old session', async () => {
  assert.equal((await request({ user: null })).status, 401)
})

test('blocked accounts cannot confirm a role switch', async () => {
  assert.equal((await request({ user: { id: 7, is_blocked: 1 } })).status, 403)
})

test('verification fails closed without exposing internal errors', async () => {
  const result = await request({ fail: true })
  assert.equal(result.status, 503)
  assert.doesNotMatch(JSON.stringify(result.body), /private database/)
})

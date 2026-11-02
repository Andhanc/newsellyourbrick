import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { parse } from '@babel/parser'

const source = await readFile(new URL('./authService.js', import.meta.url), 'utf8')
const ast = parse(source, { sourceType: 'module' })
function loadFunction(name, dependencies) {
  const declaration = ast.program.body.find(node => node.type === 'ExportNamedDeclaration' &&
    node.declaration?.declarations?.some(item => item.id.name === name))
  const fn = declaration.declaration.declarations.find(item => item.id.name === name).init
  return new Function(...Object.keys(dependencies), `return (${source.slice(fn.start, fn.end)})`)(...Object.values(dependencies))
}

test('staged password authentication does not change storage or publish the new session', async () => {
  const user = { id: 7, email: 'test@example.test', role: 'seller' }
  const login = loadFunction('loginWithEmail', {
    API_BASE_URL: '/api', console: { log() {}, error() {} },
    fetch: async (_url, options) => {
      assert.equal(options.signal, signal)
      return { ok: true, json: async () => ({ success: true, user, authToken: 'new-token' }) }
    },
    saveUserData: () => assert.fail('must stage credentials before committing'),
    rememberMobileAuthToken: () => assert.fail('must not replace the source token yet'),
  })
  const signal = new AbortController().signal
  const result = await login('test@example.test', 'test-password', 'seller', { persist: false, signal })
  assert.equal(result.success, true)
  assert.deepEqual(result.user, user)
  assert.equal(result.authToken, 'new-token')
})

test('a late 404 for the old account cannot clear the newly selected session', async () => {
  let user = { id: '7', role: 'seller', isLoggedIn: true }
  let respond
  const validate = loadFunction('validateSession', {
    getUserData: () => user,
    readRoleSwitchTransition: () => null,
    getApiBaseUrl: async () => '/api',
    localStorage: { getItem: () => '7' },
    fetch: () => new Promise(resolve => { respond = resolve }),
    clearUserData: () => assert.fail('a stale account response must not clear the new session'),
  })
  const pending = validate()
  await Promise.resolve()
  user = { id: '6', role: 'buyer', isLoggedIn: true }
  respond({ status: 404 })
  const result = await pending
  assert.equal(result.valid, true)
  assert.equal(result.superseded, true)
  assert.equal(result.user.id, '6')
})

test('session validation defers while a role transaction owns the handoff', async () => {
  const user = { id: '7', role: 'seller', isLoggedIn: true }
  const validate = loadFunction('validateSession', {
    getUserData: () => user,
    readRoleSwitchTransition: () => ({ phase: 'authenticating' }),
    getApiBaseUrl: () => assert.fail('must not start a competing validator'),
  })
  assert.deepEqual(await validate(), { valid: true, user })
})

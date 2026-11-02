import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { parse } from '@babel/parser'
import { beginRoleSwitchTransition, captureCabinetSession, clearCabinetSessionFields, clearRoleSwitchTransition, commitRoleSwitchTransition, readRoleSwitchTransition, restoreCabinetSession, roleSwitchSessionMatches, ROLE_SWITCH_TIMEOUT_MS } from './roleSwitchTransition.js'
import { ROLE_SWITCH_ARRIVAL_KEY, clearRoleSwitchArrival, readRoleSwitchArrival, storeRoleSwitchArrival } from './roleSwitchArrival.js'

function storage(t) {
  const values = new Map()
  const previous = globalThis.sessionStorage
  globalThis.sessionStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
  }
  t.after(() => {
    if (previous === undefined) delete globalThis.sessionStorage
    else globalThis.sessionStorage = previous
  })
  return values
}

test('arrival survives navigation and belongs to the authenticated account and role', t => {
  storage(t)
  storeRoleSwitchArrival({ role: 'owner', userId: 42 })
  assert.equal(readRoleSwitchArrival({ role: 'seller', userId: '42' })?.role, 'seller')
  assert.equal(readRoleSwitchArrival({ role: 'buyer', userId: 42 }), null)
  assert.equal(readRoleSwitchArrival({ role: 'seller', userId: 42 }), null)
  storeRoleSwitchArrival({ role: 'buyer', userId: 17 })
  assert.equal(readRoleSwitchArrival({ role: 'client', userId: 17 })?.role, 'buyer')
  assert.equal(readRoleSwitchArrival({ role: 'buyer', userId: 18 }), null)
})

test('expired, future and malformed arrivals are removed', t => {
  const values = storage(t)
  for (const createdAt of [Date.now() - 121000, Date.now() + 60000, 'invalid']) {
    values.set(ROLE_SWITCH_ARRIVAL_KEY, JSON.stringify({ role: 'buyer', userId: '17', createdAt }))
    assert.equal(readRoleSwitchArrival({ role: 'buyer', userId: 17 }), null)
    assert.equal(values.has(ROLE_SWITCH_ARRIVAL_KEY), false)
  }
  values.set(ROLE_SWITCH_ARRIVAL_KEY, '{broken')
  assert.equal(readRoleSwitchArrival({ role: 'buyer', userId: 17 }), null)
  storeRoleSwitchArrival({ role: 'admin', userId: 17 })
  assert.equal(values.has(ROLE_SWITCH_ARRIVAL_KEY), false)
})

test('dismissal prevents replay and unavailable storage does not break sign-in', t => {
  storage(t)
  storeRoleSwitchArrival({ role: 'buyer', userId: 17 })
  clearRoleSwitchArrival()
  assert.equal(readRoleSwitchArrival({ role: 'buyer', userId: 17 }), null)
  globalThis.sessionStorage = {
    getItem() { throw new Error('disabled') },
    setItem() { throw new Error('disabled') },
    removeItem() { throw new Error('disabled') },
  }
  assert.doesNotThrow(() => storeRoleSwitchArrival({ role: 'buyer', userId: 17 }))
  assert.equal(readRoleSwitchArrival({ role: 'buyer', userId: 17 }), null)
})

const source = await readFile(new URL('../hooks/useRoleSwitchFlow.js', import.meta.url), 'utf8')
const ast = parse(source, { sourceType: 'module' })
const hook = ast.program.body.find(node => node.type === 'ExportNamedDeclaration' && node.declaration?.id?.name === 'useRoleSwitchFlow').declaration
const switchDeclaration = hook.body.body.find(node => node.type === 'VariableDeclaration' && node.declarations[0].id.name === 'switchToRole')
const callback = switchDeclaration.declarations[0].init.arguments[0]
const callbackSource = source.slice(callback.start, callback.end)

async function runSwitch(t, role, result, options = {}) {
  const values = storage(t)
  const local = new Map()
  const previousLocal = globalThis.localStorage
  globalThis.localStorage = {
    getItem: key => local.get(key) ?? null,
    setItem: (key, value) => local.set(key, String(value)),
    removeItem: key => local.delete(key),
  }
  t.after(() => {
    if (previousLocal === undefined) delete globalThis.localStorage
    else globalThis.localStorage = previousLocal
  })
  const email = 'switch-test@example.test'
  const source = { id: 7, email, role: role === 'buyer' ? 'seller' : 'buyer' }
  localStorage.setItem('userData', JSON.stringify(source))
  localStorage.setItem('userId', '7')
  localStorage.setItem('userRole', source.role)
  localStorage.setItem('isLoggedIn', 'true')
  localStorage.setItem('userPicture', 'old-profile-photo')
  sessionStorage.setItem('syb.mobileAuthToken', 'old-session')
  const navigations = []
  const errors = []
  let calls = 0
  const user = result.user ? { ...result.user, email } : null
  const dependencies = {
    getUserData: () => JSON.parse(localStorage.getItem('userData') || '{}'),
    getMobileAuthToken: () => sessionStorage.getItem('syb.mobileAuthToken'),
    rememberMobileAuthToken: token => sessionStorage.setItem('syb.mobileAuthToken', token),
    saveUserData: value => {
      localStorage.setItem('userId', value.id)
      if (options.failSave) throw new Error('quota')
      localStorage.setItem('userData', JSON.stringify(value))
      localStorage.setItem('userRole', value.role)
      localStorage.setItem('isLoggedIn', 'true')
    },
    switchingRef: { current: false },
    linkedStatus: null,
    t: key => key,
    setError: value => errors.push(value),
    setLoading: () => {},
    setSwitching: () => {},
    AbortController, setTimeout, clearTimeout,
    sessionStorage: globalThis.sessionStorage,
    clearRoleSwitchArrival, readRoleSwitchArrival, storeRoleSwitchArrival,
    beginRoleSwitchTransition, captureCabinetSession, clearCabinetSessionFields,
    clearRoleSwitchTransition, commitRoleSwitchTransition, readRoleSwitchTransition,
    restoreCabinetSession, roleSwitchSessionMatches, ROLE_SWITCH_TIMEOUT_MS,
    signOut: () => assert.fail('Role switching must not sign out the Clerk identity'),
    loginWithEmail: async (_email, _password, selectedRole, settings) => {
      calls++
      assert.equal(settings.persist, false, 'credentials must not overwrite the source session')
      assert.equal(selectedRole, role)
      if (options.beforeLoginResult) await options.beforeLoginResult()
      return { ...result, user, authToken: result.success ? 'verified-session' : null }
    },
    fetch: async (_url, init) => {
      assert.equal(init.headers.Authorization, 'Bearer verified-session')
      if (options.failVerify) throw new Error('network unavailable')
      return { ok: true, json: async () => ({ success: true, user: options.verifiedUser || user }) }
    },
    readPendingSellPurchasedProperty: () => null,
    promotePendingPurchasedPropertyToSellerArrival: () => {},
    invalidateUserByIdCache: () => {},
    PROFILE_API_BASE: '/api',
    window: { location: { replace: path => {
      if (options.failNavigate) throw new Error('navigation failed')
      navigations.push({ path, arrival: JSON.parse(values.get(ROLE_SWITCH_ARRIVAL_KEY) || 'null') })
    } } },
  }
  const execute = new Function(...Object.keys(dependencies), `return (${callbackSource})`)(...Object.values(dependencies))
  const pending = execute(role, 'test-password')
  const duplicate = options.duplicate ? await execute(role, 'test-password') : null
  const ok = await pending
  return { ok, navigations, errors, values, local, calls, duplicate }
}

const success = role => ({ success: true, user: { id: role === 'buyer' ? 17 : 42, role } })

test('buyer transition verifies the token and navigates straight to the buyer profile', async t => {
  const run = await runSwitch(t, 'buyer', success('buyer'))
  assert.equal(run.ok, true)
  assert.equal(run.navigations[0].path, '/profile')
  assert.equal(run.navigations[0].arrival.role, 'buyer')
  assert.equal(run.navigations[0].arrival.userId, '17')
  assert.equal(run.values.get('syb.mobileAuthToken'), 'verified-session')
  assert.equal(run.local.has('userPicture'), false, 'old profile data must not leak')
})

test('seller transition verifies the token and navigates straight to the seller profile', async t => {
  const run = await runSwitch(t, 'seller', success('seller'))
  assert.equal(run.ok, true)
  assert.equal(run.navigations[0].path, '/owner-test/profile')
  assert.equal(run.navigations[0].arrival.userId, '42')
})

test('a rejected password leaves the old cabinet and server token intact', async t => {
  const run = await runSwitch(t, 'seller', { success: false, error: 'wrong password' })
  assert.equal(run.ok, false)
  assert.deepEqual(run.navigations, [])
  assert.equal(run.values.has(ROLE_SWITCH_ARRIVAL_KEY), false)
  assert.equal(run.values.get('syb.mobileAuthToken'), 'old-session')
  assert.equal(run.local.get('userId'), '7')
  assert.equal(run.errors.at(-1), 'wrong password')
})

test('a different authenticated role never overwrites the source account', async t => {
  const run = await runSwitch(t, 'buyer', success('seller'))
  assert.equal(run.ok, false)
  assert.deepEqual(run.navigations, [])
  assert.equal(run.local.get('userId'), '7')
  assert.equal(run.values.get('syb.mobileAuthToken'), 'old-session')
})

test('failed server verification preserves the source account', async t => {
  const run = await runSwitch(t, 'buyer', success('buyer'), { failVerify: true })
  assert.equal(run.ok, false)
  assert.equal(run.local.get('userId'), '7')
  assert.equal(run.values.get('syb.mobileAuthToken'), 'old-session')
})

test('a token belonging to another account is rejected', async t => {
  const run = await runSwitch(t, 'buyer', success('buyer'), {
    verifiedUser: { id: 99, role: 'buyer', email: 'switch-test@example.test' },
  })
  assert.equal(run.ok, false)
  assert.equal(run.errors.at(-1), 'roleSwitch_sessionVerificationFailed')
  assert.equal(run.local.get('userId'), '7')
})

for (const failure of ['failSave', 'failNavigate']) {
  test(`${failure}: restores the entire old session after a partial commit`, async t => {
    const run = await runSwitch(t, 'buyer', success('buyer'), { [failure]: true })
    assert.equal(run.ok, false)
    assert.equal(run.local.get('userId'), '7')
    assert.equal(run.local.get('userRole'), 'seller')
    assert.equal(run.local.get('userPicture'), 'old-profile-photo')
    assert.equal(run.values.get('syb.mobileAuthToken'), 'old-session')
    assert.equal(run.values.has(ROLE_SWITCH_ARRIVAL_KEY), false)
    assert.equal(readRoleSwitchTransition(), null)
  })
}

test('double submission sends only one credential request', async t => {
  const run = await runSwitch(t, 'buyer', success('buyer'), { duplicate: true })
  assert.equal(run.ok, true)
  assert.equal(run.duplicate, false)
  assert.equal(run.calls, 1)
  assert.equal(run.navigations.length, 1)
})

test('a changed source session cancels the transition without overwriting the other account', async t => {
  const run = await runSwitch(t, 'buyer', success('buyer'), { beforeLoginResult: () => {
    localStorage.setItem('userData', JSON.stringify({ id: 99, role: 'seller' }))
    localStorage.setItem('userId', '99')
  } })
  assert.equal(run.ok, false)
  assert.equal(run.local.get('userId'), '99')
  assert.equal(run.errors.at(-1), 'roleSwitch_sessionChanged')
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = (relative) => readFile(new URL(relative, import.meta.url), 'utf8')

test('clerk sync keeps the active seller cabinet instead of switching to the linked buyer', async () => {
  const resolver = await read('./resolveCabinetUserByEmail.js')
  const routes = await read('./cabinetRoutes.js')
  const sync = await read('../components/ClerkAuthSync.jsx')
  const handler = await read('../components/ClerkAuthHandler.jsx')
  const header = await read('../components/Header.jsx')
  const mainPage = await read('../pages/MainPage.jsx')

  assert.match(resolver, /export function resolveClerkSyncCabinetRole/)
  assert.match(resolver, /if \(hasLocalSession\) return normalizeOAuthCabinetRole\(storedRole\)/)
  assert.match(routes, /export function hasActiveCabinetSession/)
  assert.match(routes, /export function getHeaderAccountPath/)

  assert.match(sync, /hasActiveCabinetSession\(\)/)
  assert.match(sync, /resolveClerkSyncCabinetRole/)
  assert.match(handler, /!isOAuthCompletionContext && hasActiveCabinetSession\(\)/)
  assert.match(handler, /resolveClerkSyncCabinetRole/)

  assert.match(header, /getHeaderAccountPath\(role\)/)
  assert.match(header, /readStoredUserRole\(\)/)
  assert.doesNotMatch(header, /navigate\(getCabinetProfilePath\(\)\)/)
  assert.match(mainPage, /getHeaderAccountPath\(role\)/)
})

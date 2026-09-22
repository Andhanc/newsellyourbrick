import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const webUrl = new URL('./TestDriveSection.jsx', import.meta.url)
const legacyUrl = new URL(
  '../../apps/client/src/legacy/components/TestDriveSection.jsx',
  import.meta.url,
)

test('test-drive eligibility is fetched once via shared cache, not polled', async () => {
  const web = await readFile(webUrl, 'utf8')
  const legacy = await readFile(legacyUrl, 'utf8')
  assert.equal(legacy, web)
  assert.match(web, /fetchTestDriveEligibility/)
  assert.match(web, /syb-testdrive-refresh/)
  assert.doesNotMatch(web, /setInterval/)
  assert.doesNotMatch(web, /addEventListener\('focus'/)
})

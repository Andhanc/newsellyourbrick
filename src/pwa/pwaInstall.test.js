import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

test('footer store buttons share one home-screen install handler', () => {
  const footer = readFileSync(join(root, 'src/components/Footer.jsx'), 'utf8')
  assert.match(footer, /requestPwaInstall/)
  assert.match(footer, /handleStoreInstall/)
  assert.equal((footer.match(/onClick=\{handleStoreInstall\}/g) || []).length, 2)
  assert.doesNotMatch(footer, /footer__store-btn--pwa/)
  assert.doesNotMatch(footer, /openStoreComingSoon/)
  assert.match(footer, /\/icons\/icon-192\.png/)
})

test('legacy footer stays in parity for store install', () => {
  const footer = readFileSync(
    join(root, 'apps/client/src/legacy/components/Footer.jsx'),
    'utf8',
  )
  assert.match(footer, /requestPwaInstall/)
  assert.match(footer, /handleStoreInstall/)
  assert.equal((footer.match(/onClick=\{handleStoreInstall\}/g) || []).length, 2)
})

test('PWA icons come from Expo brand asset sizes', () => {
  const icon192 = readFileSync(join(root, 'public/icons/icon-192.png'))
  // Brand PNG is much larger than the old favicon-derived house icon (~2KB).
  assert.ok(icon192.byteLength > 10_000)
})

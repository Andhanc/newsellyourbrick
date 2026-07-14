import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('./DepositRedirect.jsx', import.meta.url), 'utf8')

test('deposit redirect preserves confirmed checkout query and navigation context', () => {
  assert.match(source, /useLocation/)
  assert.match(source, /search:\s*location\.search/)
  assert.match(source, /state=\{location\.state\}/)
  assert.match(source, /replace/)
})

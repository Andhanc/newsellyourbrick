import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const viteConfig = await readFile(new URL('./vite.config.js', import.meta.url), 'utf8')
const pkg = JSON.parse(await readFile(new URL('./package.json', import.meta.url), 'utf8'))
const ensurePort = await readFile(new URL('./scripts/ensure-vite-port.mjs', import.meta.url), 'utf8')

test('Vite stays on 5173 instead of falling back to 5174', () => {
  assert.match(viteConfig, /const vitePort = parseInt\(process\.env\.VITE_PORT \|\| '5173', 10\)/)
  assert.match(viteConfig, /strictPort:\s*true/)
  assert.doesNotMatch(viteConfig, /strictPort:\s*false,\s*\/\/ НЕ строгий порт/)
  assert.doesNotMatch(viteConfig, /clientPort:\s*vitePort/)
})

test('npm run dev frees leftover Vite ports before starting', () => {
  assert.match(pkg.scripts.dev, /ensure-vite-port\.mjs/)
  assert.match(pkg.scripts['dev:force'], /ensure-vite-port\.mjs/)
  assert.match(ensurePort, /VITE_PORT \|\| '5173'/)
  assert.match(ensurePort, /vitePort \+ 1/)
})

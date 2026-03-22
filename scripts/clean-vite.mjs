/**
 * Удаляет кэш pre-bundle Vite (node_modules/.vite).
 * При 404 на /node_modules/.vite/deps/chunk-*.js — запустите: npm run clean:vite && npm run dev:force
 */
import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const viteCache = join(__dirname, '..', 'node_modules', '.vite')

try {
  fs.rmSync(viteCache, { recursive: true, force: true })
  console.log('Removed:', viteCache)
} catch (e) {
  console.warn('clean-vite:', e.message || e)
}

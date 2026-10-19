import assert from 'node:assert/strict'
import test from 'node:test'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

test('web app manifest is standalone and references existing icons', () => {
  const manifestPath = join(root, 'public/manifest.webmanifest')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))

  assert.equal(manifest.display, 'standalone')
  assert.equal(manifest.start_url, '/')
  assert.equal(manifest.scope, '/')
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 2)

  for (const icon of manifest.icons) {
    const relative = String(icon.src || '').replace(/^\//, '')
    assert.ok(existsSync(join(root, 'public', relative)), `missing icon ${icon.src}`)
  }

  assert.ok(existsSync(join(root, 'public/sw.js')))
  assert.ok(existsSync(join(root, 'public/icons/apple-touch-icon.png')))
})

test('index.html links manifest and iOS install meta', () => {
  const html = readFileSync(join(root, 'index.html'), 'utf8')
  assert.match(html, /rel="manifest"\s+href="\/manifest\.webmanifest"/)
  assert.match(html, /apple-mobile-web-app-capable"\s+content="yes"/)
  assert.match(html, /apple-touch-icon"\s+href="\/icons\/apple-touch-icon\.png"/)
})

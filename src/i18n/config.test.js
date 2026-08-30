import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('./config.js', import.meta.url), 'utf8')

test('defaults the site language to English', () => {
  assert.match(source, /export const DEFAULT_APP_LANGUAGE = 'en'/)
  assert.match(source, /String\(lng \|\| DEFAULT_APP_LANGUAGE\)/)
  assert.match(source, /if \(!stored\) return DEFAULT_APP_LANGUAGE/)
})

test('keeps explicit language choices and ignores browser auto-detection', () => {
  assert.match(source, /order:\s*\['localStorage'\]/)
  assert.doesNotMatch(source, /navigator/)
})

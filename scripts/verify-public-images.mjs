#!/usr/bin/env node
/**
 * Проверяет, что все /images/... из src/ есть в public/images/...
 * Запуск: node scripts/verify-public-images.mjs
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'
import { fileURLToPath } from 'url'

const root = join(fileURLToPath(import.meta.url), '../..')
const publicRoot = join(root, 'public')
const srcRoot = join(root, 'src')

const IMAGE_REF = /['"`]\/images\/[^'"`?]+/g

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, files)
    else if (/\.(jsx?|tsx?|css)$/.test(name)) files.push(full)
  }
  return files
}

const refs = new Set()
for (const file of walk(srcRoot)) {
  const text = readFileSync(file, 'utf8')
  for (const match of text.matchAll(IMAGE_REF)) {
    refs.add(match[0].slice(1).split('?')[0])
  }
}

const missing = []
for (const ref of [...refs].sort()) {
  const disk = join(publicRoot, ref.replace(/^\//, ''))
  if (!existsSync(disk)) missing.push({ ref, disk: relative(root, disk) })
}

if (missing.length) {
  console.error(`Missing ${missing.length} public image(s):\n`)
  missing.forEach(({ ref, disk }) => console.error(`  ${ref}\n    → ${disk}`))
  process.exit(1)
}

console.log(`OK: ${refs.size} /images/ references resolve under public/`)
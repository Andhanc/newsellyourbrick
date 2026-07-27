#!/usr/bin/env node
/**
 * Конвертирует тяжёлые PNG боковых иллюстраций мастера OAP в WebP.
 * Запуск: node scripts/optimize-oap-sidebar-images.mjs
 */
import sharp from 'sharp'
import { readdirSync, statSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'

const root = join(fileURLToPath(import.meta.url), '../..')

const dirs = [
  'public/images/oap-parameters',
  'public/images/oap-description',
  'public/images/oap-amenities',
  'public/images/oap-calculator',
  'public/images/oap-listing',
  'public/images/oap-testdrive',
  'public/images/oap-documents',
  'public/images/oap-pricing',
  'public/images/oap-params',
]

const shouldConvert = (name) =>
  name.endsWith('.png') &&
  (name.includes('sidebar') ||
    name.includes('params') ||
    name.includes('pricing') ||
    name.includes('interior') ||
    name.includes('hero'))

let converted = 0

for (const dir of dirs) {
  const absDir = join(root, dir)
  let names = []
  try {
    names = readdirSync(absDir)
  } catch {
    continue
  }

  for (const name of names) {
    if (!shouldConvert(name)) continue
    const input = join(absDir, name)
    const output = input.replace(/\.png$/i, '.webp')
    const before = statSync(input).size
    await sharp(input).webp({ quality: 82, effort: 4 }).toFile(output)
    const after = statSync(output).size
    converted += 1
    console.log(`${input.replace(`${root}/`, '')} → ${Math.round(after / 1024)}KB (was ${Math.round(before / 1024)}KB)`)
  }
}

console.log(`Done: ${converted} WebP file(s).`)

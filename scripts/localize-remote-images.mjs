import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const OUT_DIR = path.join(ROOT, 'public', 'images', 'external')
const SCAN_DIRS = ['src', 'server', 'public']
const SKIP_DIRS = new Set([
  '.git',
  'dist',
  'node_modules',
  '.next',
  'build',
  'coverage',
  'public/images/external',
])
const SCAN_EXTENSIONS = new Set([
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.css',
  '.json',
  '.html',
])

const IMAGE_HOSTS = [
  'images.unsplash.com',
  'static.cdn-cian.ru',
  't4.ftcdn.net',
  'cdn-icons-png.flaticon.com',
  'tochka.com',
  'www.magazindomov.ru',
  'upload.wikimedia.org',
  'pechater.ru',
  'www.computerra.ru',
  'placehold.co',
]

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'])

function isSkippedDir(absPath) {
  const rel = path.relative(ROOT, absPath).split(path.sep).join('/')
  return SKIP_DIRS.has(rel) || rel.split('/').some((part) => SKIP_DIRS.has(part))
}

async function walk(dir, files = []) {
  const absDir = path.join(ROOT, dir)
  const entries = await fs.readdir(absDir, { withFileTypes: true }).catch(() => [])
  for (const entry of entries) {
    const abs = path.join(absDir, entry.name)
    if (entry.isDirectory()) {
      if (!isSkippedDir(abs)) await walk(path.relative(ROOT, abs), files)
      continue
    }
    if (entry.isFile() && SCAN_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(abs)
    }
  }
  return files
}

function cleanUrl(raw) {
  return String(raw || '')
    .replace(/[),.;\]}]+$/g, '')
    .replace(/&amp;/g, '&')
}

function isLocalizableImageUrl(raw) {
  let url
  try {
    url = new URL(cleanUrl(raw))
  } catch {
    return false
  }

  const host = url.hostname.toLowerCase()
  if (!IMAGE_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))) {
    return false
  }

  if (host.includes('youtube.com') || host.includes('ytimg.com')) return false

  const ext = path.extname(url.pathname).toLowerCase()
  return IMAGE_EXTENSIONS.has(ext) || host === 'images.unsplash.com' || host === 'placehold.co'
}

function extensionFromContentType(contentType) {
  const ct = String(contentType || '').toLowerCase()
  if (ct.includes('svg')) return '.svg'
  if (ct.includes('png')) return '.png'
  if (ct.includes('webp')) return '.webp'
  if (ct.includes('gif')) return '.gif'
  if (ct.includes('jpeg') || ct.includes('jpg')) return '.jpg'
  return ''
}

function extensionFromUrl(url) {
  const ext = path.extname(new URL(url).pathname).toLowerCase()
  return IMAGE_EXTENSIONS.has(ext) ? (ext === '.jpeg' ? '.jpg' : ext) : ''
}

function fileBaseName(url) {
  const parsed = new URL(url)
  const rawName = path.basename(parsed.pathname).replace(/\.[a-z0-9]+$/i, '')
  const slug =
    rawName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 42) || parsed.hostname.replace(/[^a-z0-9]+/gi, '-').toLowerCase()
  const hash = createHash('sha1').update(url).digest('hex').slice(0, 10)
  return `${slug}-${hash}`
}

async function collectUrls(files) {
  const urlRegex = /https?:\/\/[^\s"'`<>]+/g
  const byUrl = new Map()

  for (const file of files) {
    const text = await fs.readFile(file, 'utf8')
    const matches = text.match(urlRegex) || []
    for (const raw of matches) {
      const url = cleanUrl(raw)
      if (!isLocalizableImageUrl(url)) continue
      if (!byUrl.has(url)) byUrl.set(url, new Set())
      byUrl.get(url).add(file)
    }
  }

  return byUrl
}

async function download(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; SellYourBrick asset localizer)',
      accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  const contentType = response.headers.get('content-type') || ''
  const bytes = Buffer.from(await response.arrayBuffer())
  const ext = extensionFromContentType(contentType) || extensionFromUrl(url) || '.jpg'
  const filename = `${fileBaseName(url)}${ext}`
  await fs.writeFile(path.join(OUT_DIR, filename), bytes)
  return `/images/external/${filename}`
}

async function replaceUrls(replacements) {
  const files = await Promise.all(SCAN_DIRS.map((dir) => walk(dir)))
  const uniqueFiles = [...new Set(files.flat())]
  let touched = 0

  for (const file of uniqueFiles) {
    let text = await fs.readFile(file, 'utf8')
    let next = text
    for (const [from, to] of replacements) {
      next = next.split(from).join(to)
    }
    if (next !== text) {
      await fs.writeFile(file, next)
      touched += 1
    }
  }

  return touched
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true })

  const files = (await Promise.all(SCAN_DIRS.map((dir) => walk(dir)))).flat()
  const byUrl = await collectUrls(files)
  const replacements = new Map()
  const failed = []

  for (const url of byUrl.keys()) {
    try {
      const localPath = await download(url)
      replacements.set(url, localPath)
      console.log(`OK ${url} -> ${localPath}`)
    } catch (error) {
      failed.push({ url, error: error?.message || String(error) })
      console.warn(`SKIP ${url} (${error?.message || error})`)
    }
  }

  const touched = await replaceUrls(replacements)

  console.log(
    JSON.stringify(
      {
        found: byUrl.size,
        localized: replacements.size,
        failed: failed.length,
        touchedFiles: touched,
        outDir: path.relative(ROOT, OUT_DIR),
      },
      null,
      2
    )
  )

  if (failed.length) {
    await fs.writeFile(
      path.join(OUT_DIR, 'failed-downloads.json'),
      JSON.stringify(failed, null, 2)
    )
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

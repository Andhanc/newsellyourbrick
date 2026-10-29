import fs from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', 'data')
const DATA_FILE = join(DATA_DIR, 'site-ads.json')

const VALID_TYPES = new Set(['modal', 'block'])
const VALID_PAGES = new Set(['home', 'auction', 'shares', 'debts'])
const VALID_ICONS = new Set([
  'megaphone', 'gift', 'percent', 'star', 'home',
  'trending', 'zap', 'heart', 'tag', 'building',
])
const DEFAULT_ICON = 'megaphone'

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ ads: [] }, null, 2), 'utf8')
  }
}

function readStore() {
  ensureDataFile()
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed?.ads) ? parsed : { ads: [] }
  } catch {
    return { ads: [] }
  }
}

function writeStore(data) {
  ensureDataFile()
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8')
}

function normalizePages(pages) {
  if (!Array.isArray(pages)) return []
  return [...new Set(pages.filter((p) => VALID_PAGES.has(p)))]
}

function normalizeIcon(icon) {
  const id = String(icon || '').trim()
  return VALID_ICONS.has(id) ? id : DEFAULT_ICON
}

function normalizeButtonUrl(raw) {
  const url = String(raw || '').trim()
  if (!url) return ''
  if (url.startsWith('/')) return url
  if (/^https?:\/\//i.test(url)) return url
  return `https://${url}`
}

function validateAdPayload(payload, { partial = false } = {}) {
  const errors = []
  const type = payload?.type != null ? String(payload.type).trim() : ''
  const title = payload?.title != null ? String(payload.title).trim() : ''
  const description = payload?.description != null ? String(payload.description).trim() : ''
  const pages = normalizePages(payload?.pages)
  const icon = normalizeIcon(payload?.icon)
  const rawButtonUrl = String(payload?.buttonUrl || '').trim()
  const buttonEnabled = Boolean(payload?.buttonEnabled) || Boolean(rawButtonUrl)
  let buttonUrl = ''
  const buttonLabel = String(payload?.buttonLabel || 'Learn more').trim().slice(0, 40) || 'Learn more'

  if (!partial || payload?.type != null) {
    if (!VALID_TYPES.has(type)) errors.push('Specify type: modal or block')
  }
  if (!partial || payload?.title != null) {
    if (!title) errors.push('Title is required')
    if (title.length > 120) errors.push('Title must be at most 120 characters')
  }
  if (!partial || payload?.description != null) {
    if (!description) errors.push('Description is required')
    if (description.length > 500) errors.push('Description must be at most 500 characters')
  }
  if (!partial || payload?.pages != null) {
    if (!pages.length) errors.push('Select at least one page')
  }
  if (buttonEnabled || rawButtonUrl) {
    buttonUrl = normalizeButtonUrl(rawButtonUrl)
    if (!buttonUrl) errors.push('Provide a button link')
    else if (buttonUrl.length > 500) errors.push('Link must be at most 500 characters')
  }

  return { errors, type, title, description, pages, icon, buttonEnabled: Boolean(buttonUrl) || buttonEnabled, buttonUrl, buttonLabel }
}

export function listAllAds() {
  const { ads } = readStore()
  return [...ads].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
}

export function listActiveAds() {
  return listAllAds()
}

export function createAd(payload) {
  const { errors, type, title, description, pages, icon, buttonEnabled, buttonUrl, buttonLabel } = validateAdPayload(payload)
  if (errors.length) {
    const err = new Error(errors[0])
    err.statusCode = 400
    throw err
  }

  const now = new Date().toISOString()
  const ad = {
    id: crypto.randomUUID(),
    type,
    title,
    description,
    pages,
    icon,
    buttonEnabled,
    buttonUrl: buttonEnabled ? buttonUrl : '',
    buttonLabel: buttonEnabled ? buttonLabel : '',
    createdAt: now,
    updatedAt: now,
  }

  const store = readStore()
  store.ads.unshift(ad)
  writeStore(store)
  return ad
}

export function deleteAd(id) {
  const store = readStore()
  const before = store.ads.length
  store.ads = store.ads.filter((a) => a.id !== id)
  writeStore(store)
  return store.ads.length < before
}

export function toPublicAd(ad) {
  const buttonUrl = String(ad.buttonUrl || '').trim()
  const buttonEnabled = Boolean(ad.buttonEnabled) || Boolean(buttonUrl)

  return {
    id: ad.id,
    type: ad.type,
    title: ad.title,
    description: ad.description,
    pages: ad.pages,
    icon: normalizeIcon(ad.icon),
    buttonEnabled,
    buttonUrl: buttonEnabled ? buttonUrl : '',
    buttonLabel: String(ad.buttonLabel || 'Learn more').trim() || 'Learn more',
    createdAt: ad.createdAt,
  }
}

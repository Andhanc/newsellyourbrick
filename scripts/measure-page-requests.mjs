#!/usr/bin/env node
/**
 * Замер сетевых запросов по всем страницам/вкладкам.
 * Usage:
 *   node scripts/measure-page-requests.mjs --phase=before --out=/tmp/syb-requests-before.json
 */
import { writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import puppeteer from 'puppeteer'

const ORIGIN = process.env.APP_ORIGIN || 'http://localhost:5173'
const API_ORIGIN = process.env.API_ORIGIN || 'http://127.0.0.1:3000'
const PHASE = (process.argv.find((a) => a.startsWith('--phase=')) || '--phase=adhoc').slice(8)
const OUT =
  (process.argv.find((a) => a.startsWith('--out=')) || '').slice(6) ||
  `/tmp/syb-requests-${PHASE}-${Date.now()}.json`
const SETTLE_MS = Number(process.env.MEASURE_SETTLE_MS || 2800)

const BUYER_EMAIL = 'request-audit-buyer@sellyourbrick.test'
const SELLER_EMAIL = 'request-audit-seller@sellyourbrick.test'
const PASSWORD = 'RequestAudit2026!'

function classify(url) {
  const u = String(url || '')
  if (u.includes('/api/images/resize')) return 'asset'
  if (u.includes('/api/')) return 'api'
  if (u.includes('react-icons') || u.includes('/fa/') || u.includes('/fa6/') || u.includes('/pi/')) {
    return 'iconPack'
  }
  if (u.includes('/locales/') || u.includes('/i18n/')) return 'i18n'
  if (u.includes('clerk') || u.includes('accounts.dev')) return 'clerk'
  if (
    u.includes('node_modules') ||
    u.includes('/@fs/') ||
    u.includes('/src/') ||
    u.includes('/@vite/') ||
    u.includes('/@react-refresh') ||
    u.includes('/@id/')
  ) {
    return 'viteModule'
  }
  if (/\.(png|jpe?g|webp|gif|svg|ico|avif|woff2?|ttf)(\?|$)/i.test(u)) return 'asset'
  return 'other'
}

function apiPath(url) {
  try {
    const u = new URL(url)
    const idx = u.pathname.indexOf('/api/')
    if (idx === -1) return null
    return `${u.pathname}${u.search}`
  } catch {
    const m = String(url).match(/\/api\/[^?#]*/)
    return m ? m[0] : null
  }
}

async function jsonFetch(url, init) {
  const res = await fetch(url, init)
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}

async function loginEmail(email, role) {
  const { ok, status, data } = await jsonFetch(`${API_ORIGIN}/api/auth/email/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD, role }),
  })
  if (!ok || !data?.success || !data.user) {
    throw new Error(`login ${email} failed: ${status} ${JSON.stringify(data)}`)
  }
  return data.user
}

async function loginAdmin() {
  const { ok, status, data } = await jsonFetch(`${API_ORIGIN}/api/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin' }),
  })
  if (!ok || !data?.success || !data.admin) {
    throw new Error(`admin login failed: ${status} ${JSON.stringify(data)}`)
  }
  return data.admin
}

async function loginMarketer() {
  const { ok, status, data } = await jsonFetch(`${API_ORIGIN}/api/news/marketer/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login: 'manager', password: 'manager' }),
  })
  if (!ok || !data?.token) {
    throw new Error(`marketer login failed: ${status} ${JSON.stringify(data)}`)
  }
  return data.token
}

function userSession(user) {
  const id = String(user.id)
  const role = user.role || 'buyer'
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Request Audit'
  const stored = {
    id,
    email: user.email,
    name,
    role,
    isLoggedIn: true,
    firstName: user.first_name,
    lastName: user.last_name,
  }
  return {
    localStorage: {
      isLoggedIn: 'true',
      loginMethod: 'email',
      userId: id,
      userEmail: user.email || '',
      userName: name,
      userRole: role,
      userData: JSON.stringify(stored),
      ...(role === 'seller' || role === 'owner' ? { isOwnerLoggedIn: 'true' } : {}),
    },
    sessionStorage: {},
  }
}

function adminSession(admin) {
  return {
    localStorage: {
      isLoggedIn: 'true',
      isAdminLoggedIn: 'true',
      userRole: 'admin',
      adminPermissions: JSON.stringify(admin),
    },
    sessionStorage: {},
  }
}

function marketerSession(token) {
  return {
    localStorage: {},
    sessionStorage: {
      marketer_panel_token: token,
    },
  }
}

async function applySession(page, session) {
  await page.evaluateOnNewDocument((s) => {
    try {
      for (const [k, v] of Object.entries(s.localStorage || {})) {
        window.localStorage.setItem(k, v)
      }
      for (const [k, v] of Object.entries(s.sessionStorage || {})) {
        window.sessionStorage.setItem(k, v)
      }
    } catch {
      /* ignore */
    }
  }, session)
}

async function measureUrl(browser, { role, path, session, waitFor }) {
  const context = await browser.createBrowserContext()
  const page = await context.newPage()
  const requests = []
  const client = await page.createCDPSession()
  await client.send('Network.enable')
  await client.send('Network.setCacheDisabled', { cacheDisabled: true })
  client.on('Network.requestWillBeSent', (evt) => {
    if (!evt?.request?.url) return
    if (evt.type === 'Preflight') return
    requests.push({
      url: evt.request.url,
      method: evt.request.method,
      type: evt.type,
      ts: evt.timestamp,
    })
  })

  if (session) await applySession(page, session)

  const started = Date.now()
  let navError = null
  try {
    await page.goto(`${ORIGIN}${path}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    if (waitFor) {
      await page.waitForSelector(waitFor, { timeout: 15000 }).catch(() => null)
    }
    await new Promise((r) => setTimeout(r, SETTLE_MS))
  } catch (err) {
    navError = String(err?.message || err)
  }

  const title = await page.title().catch(() => '')
  const finalUrl = page.url()
  await context.close()

  const buckets = {
    api: 0,
    iconPack: 0,
    i18n: 0,
    clerk: 0,
    viteModule: 0,
    asset: 0,
    other: 0,
  }
  const apiPaths = []
  for (const req of requests) {
    const bucket = classify(req.url)
    buckets[bucket] += 1
    if (bucket !== 'api') continue
    const p = apiPath(req.url)
    if (p) apiPaths.push(`${req.method} ${p}`)
  }
  const uniqueApi = [...new Set(apiPaths)].sort()

  return {
    role,
    path,
    finalUrl,
    title,
    navError,
    elapsedMs: Date.now() - started,
    total: requests.length,
    unique: new Set(requests.map((r) => r.url)).size,
    buckets,
    uniqueApi,
    apiCount: apiPaths.length,
    uniqueApiCount: uniqueApi.length,
  }
}

async function sampleSlugs() {
  const out = { property: '1', share: '1', news: null, debt: null, auction: null }
  const approved = await jsonFetch(`${API_ORIGIN}/api/properties/approved?lang=ru`)
  const rows = Array.isArray(approved.data?.data) ? approved.data.data : []
  const first = rows.find((p) => p?.slug || p?.id)
  if (first) out.property = String(first.slug || first.id)
  const auctions = await jsonFetch(`${API_ORIGIN}/api/properties/auctions?lang=ru`)
  const arows = Array.isArray(auctions.data?.data) ? auctions.data.data : []
  if (arows[0]) out.auction = String(arows[0].slug || arows[0].id)
  const debts = await jsonFetch(`${API_ORIGIN}/api/properties/debts`)
  const drows = Array.isArray(debts.data?.data) ? debts.data.data : []
  if (drows[0]) out.debt = String(drows[0].slug || drows[0].id)
  const shares = await jsonFetch(`${API_ORIGIN}/api/properties/shares?lang=ru`)
  const srows = Array.isArray(shares.data?.data) ? shares.data.data : []
  if (srows[0]) out.share = String(srows[0].slug || srows[0].id)
  const news = await jsonFetch(`${API_ORIGIN}/api/news/articles`)
  const articles = news.data?.articles || []
  if (articles[0]?.slug) out.news = articles[0].slug
  return out
}

function inventory(slugs) {
  const property = `/property/${encodeURIComponent(slugs.property)}`
  const share = `/co-investment/${encodeURIComponent(slugs.share)}`
  const news = slugs.news ? `/news/${encodeURIComponent(slugs.news)}` : '/news'
  const auctionProp = slugs.auction
    ? `/auction/property/${encodeURIComponent(slugs.auction)}`
    : property
  const debtProp = slugs.debt ? `/debts/property/${encodeURIComponent(slugs.debt)}` : property

  return {
    guest: [
      '/',
      '/auction',
      '/auction/buy-now',
      '/debts',
      '/co-investment',
      '/test-drive',
      '/search-results',
      '/map',
      '/about',
      '/news',
      news,
      '/app',
      '/buyer',
      '/seller',
      '/private-club',
      '/lottery',
      '/calculator',
      '/bonuses',
      '/favorites',
      '/compare',
      '/chat',
      '/wallet',
      '/profile',
      property,
      auctionProp,
      debtProp,
      share,
      '/mobile-showcase',
      '/sections',
    ],
    buyer: [
      '/profile',
      '/profile?data=1',
      '/profile?subscriptions=1',
      '/profile?history=1',
      '/profile?bookings=1',
      '/wallet',
      '/favorites',
      '/compare',
      '/bonuses',
      '/subscriptions',
      '/chat',
      '/chat?manager=1',
      '/calculator',
      '/map',
      '/private-club',
      property,
    ],
    seller: [
      '/owner-test',
      '/owner-test/properties',
      '/owner-test/test-drive',
      '/owner-test/wallet',
      '/owner-test/subscriptions',
      '/owner-test/profile',
      '/owner-test/profile?tab=statistics',
      '/owner-test/profile?tab=settings',
      '/owner-test/add-property',
    ],
    admin: ADMIN_SECTIONS.map((section) => `/admin#${section}`),
    marketer: ['/marketer'],
  }
}

const ADMIN_SECTIONS = [
  'statistics',
  'users',
  'private_club',
  'moderation',
  'chat',
  'smart_assistant',
  'addition',
  'objects',
  'auctions',
  'test_drive',
  'debt_reasons',
  'debt_documents',
  'whatsapp',
  'clients',
  'purchase_requests',
  'bonuses',
  'seo',
  'testing',
  'access_management',
  'storage',
]

function printTable(rows) {
  const sorted = [...rows].sort((a, b) => b.total - a.total)
  console.log('\npath\trole\ttotal\tapi\tvite\ticons\tuniqueApi')
  for (const r of sorted) {
    console.log(
      `${r.path}\t${r.role}\t${r.total}\t${r.apiCount}\t${r.buckets.viteModule}\t${r.buckets.iconPack}\t${r.uniqueApiCount}`,
    )
  }
}

async function main() {
  console.log(JSON.stringify({ phase: PHASE, origin: ORIGIN, out: OUT }))
  const slugs = await sampleSlugs()
  const buyer = await loginEmail(BUYER_EMAIL, 'buyer')
  const seller = await loginEmail(SELLER_EMAIL, 'seller')
  const admin = await loginAdmin()
  const marketerToken = await loginMarketer()

  const sessions = {
    guest: null,
    buyer: userSession(buyer),
    seller: userSession(seller),
    admin: adminSession(admin),
    marketer: marketerSession(marketerToken),
  }

  const paths = inventory(slugs)
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  })

  const results = []
  try {
    for (const path of paths.guest) {
      const row = await measureUrl(browser, { role: 'guest', path, session: null })
      results.push(row)
      process.stdout.write(`  guest ${path} total=${row.total} api=${row.apiCount}\n`)
    }
    for (const path of paths.buyer) {
      const row = await measureUrl(browser, { role: 'buyer', path, session: sessions.buyer })
      results.push(row)
      process.stdout.write(`  buyer ${path} total=${row.total} api=${row.apiCount}\n`)
    }
    for (const path of paths.seller) {
      const row = await measureUrl(browser, { role: 'seller', path, session: sessions.seller })
      results.push(row)
      process.stdout.write(`  seller ${path} total=${row.total} api=${row.apiCount}\n`)
    }
    const adminRows = []
    for (const path of paths.admin) {
      const section = String(path).split('#')[1] || 'statistics'
      const row = await measureUrl(browser, {
        role: 'admin',
        path,
        session: sessions.admin,
        waitFor: `[data-admin-section="${section}"]`,
      })
      adminRows.push(row)
      process.stdout.write(`  admin ${path} total=${row.total} api=${row.apiCount}\n`)
    }
    results.push(...adminRows)
    for (const path of paths.marketer) {
      const row = await measureUrl(browser, { role: 'marketer', path, session: sessions.marketer })
      results.push(row)
      process.stdout.write(`  marketer ${path} total=${row.total} api=${row.apiCount}\n`)
    }
  } finally {
    await browser.close()
  }

  const summary = {
    phase: PHASE,
    measuredAt: new Date().toISOString(),
    origin: ORIGIN,
    screens: results.length,
    totals: {
      avgTotal: Math.round(results.reduce((s, r) => s + r.total, 0) / Math.max(results.length, 1)),
      avgApi: Math.round(results.reduce((s, r) => s + r.apiCount, 0) / Math.max(results.length, 1)),
      maxTotal: Math.max(...results.map((r) => r.total)),
      maxApi: Math.max(...results.map((r) => r.apiCount)),
    },
    users: {
      buyer: { id: buyer.id, email: BUYER_EMAIL },
      seller: { id: seller.id, email: SELLER_EMAIL },
    },
    slugs,
    results,
  }

  await writeFile(OUT, JSON.stringify(summary, null, 2))
  printTable(results)
  console.log(`\nWrote ${OUT}`)
  console.log(
    `screens=${summary.screens} avgTotal=${summary.totals.avgTotal} avgApi=${summary.totals.avgApi} maxTotal=${summary.totals.maxTotal} maxApi=${summary.totals.maxApi}`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

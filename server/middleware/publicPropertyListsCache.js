/**
 * Короткий in-memory кэш + склейка параллельных in-flight GET одного URL.
 */

const CACHE_TTL_MS = 10000
const MAX_KEYS = 56

const cache = new Map()
/** @type {Map<string, Promise<{ statusCode: number, body: string, cacheControl?: string }>>} */
const inflight = new Map()

function trimCache() {
  while (cache.size > MAX_KEYS) {
    const first = cache.keys().next().value
    if (first === undefined) break
    cache.delete(first)
  }
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function publicPropertyListsCache(req, res, next) {
  if (req.method !== 'GET') return next()

  const paths = new Set([
    '/api/properties/approved',
    '/api/properties/auctions',
    '/api/properties/debts',
    '/api/properties/test-timers',
  ])
  if (!paths.has(req.path)) return next()

  const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''
  const cacheKey = req.path + qs

  const hit = cache.get(cacheKey)
  if (hit && hit.expires > Date.now()) {
    res.setHeader('X-SYB-List-Cache', 'HIT')
    if (hit.cacheControl) res.setHeader('Cache-Control', hit.cacheControl)
    res.type('application/json').send(hit.body)
    return
  }

  const pending = inflight.get(cacheKey)
  if (pending) {
    pending
      .then(({ statusCode, body, cacheControl }) => {
        res.setHeader('X-SYB-List-Cache', 'JOIN')
        if (cacheControl) res.setHeader('Cache-Control', cacheControl)
        res.status(statusCode).type('application/json').send(body)
      })
      .catch(() => next())
    return
  }

  let settled = false
  const promise = new Promise((resolve, reject) => {
    const origJson = res.json.bind(res)
    res.json = function cacheAwareJson(payload) {
      res.json = origJson
      const statusCode = res.statusCode
      let body
      try {
        body = JSON.stringify(payload)
      } catch {
        body = '{}'
      }
      const ccRaw = res.getHeader('Cache-Control')
      const cacheControl = typeof ccRaw === 'string' ? ccRaw : undefined

      if (
        !settled &&
        statusCode >= 200 &&
        statusCode < 300 &&
        payload &&
        payload.success === true
      ) {
        cache.set(cacheKey, {
          expires: Date.now() + CACHE_TTL_MS,
          body,
          cacheControl,
        })
        trimCache()
      }

      if (!settled) {
        settled = true
        resolve({ statusCode, body, cacheControl })
        inflight.delete(cacheKey)
      }
      return origJson(payload)
    }

    res.once('close', () => {
      if (settled) return
      settled = true
      inflight.delete(cacheKey)
      reject(new Error('closed before json'))
    })
  })

  inflight.set(cacheKey, promise)
  next()
}

/**
 * Один in-flight GET на URL: параллельные вызовы делят один fetch (prefetch + страница, React StrictMode и т.д.).
 */

const inFlight = new Map()

/**
 * @param {string} url
 * @param {RequestInit} [init]
 * @returns {Promise<Response>}
 */
export function fetchDedupe(url, init = {}) {
  const method = (init.method || 'GET').toUpperCase()
  if (method !== 'GET') {
    return fetch(url, init)
  }
  const key = url
  let p = inFlight.get(key)
  if (p) return p

  p = fetch(url, { ...init, method: 'GET' }).finally(() => {
    queueMicrotask(() => {
      if (inFlight.get(key) === p) inFlight.delete(key)
    })
  })
  inFlight.set(key, p)
  return p
}

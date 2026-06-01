/**
 * Один in-flight GET на URL: параллельные вызовы делят один fetch (prefetch + страница, React StrictMode и т.д.).
 * Каждый вызов получает свой Response с непрочитанным телом (из общего arrayBuffer).
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
  let shared = inFlight.get(key)
  if (!shared) {
    shared = fetch(url, { ...init, method: 'GET' })
      .then(async (response) => {
        const buffer = await response.arrayBuffer()
        return {
          buffer,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        }
      })
      .finally(() => {
        queueMicrotask(() => {
          if (inFlight.get(key) === shared) inFlight.delete(key)
        })
      })
    inFlight.set(key, shared)
  }

  return shared.then(({ buffer, status, statusText, headers }) =>
    new Response(buffer, { status, statusText, headers }),
  )
}

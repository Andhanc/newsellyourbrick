/**
 * In dev, checks /health once. If the backend is down — logs a console hint.
 * No effect in production.
 */
let ran = false

export function runDevBackendHintOnce() {
  if (ran || typeof import.meta === 'undefined' || !import.meta.env?.DEV) return
  ran = true
  fetch('/health', { method: 'GET' })
    .then((r) => {
      if (!r.ok) {
        console.warn(
          '[Dev] GET /health:',
          r.status,
          '— check that the API is running on the vite proxy port (usually 3000).',
        )
      }
    })
    .catch(() => {
      console.warn(
        '[Dev] Backend is not responding (Failed to fetch). Start it in a separate terminal: npm run server\n' +
          '   Or run frontend + API together: npm run dev:all',
      )
    })
}

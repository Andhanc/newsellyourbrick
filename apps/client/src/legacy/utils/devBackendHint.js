/**
 * В dev один раз проверяет /health. Если бэкенд не поднят — подсказка в консоль.
 * Не влияет на production.
 */
let ran = false

export function runDevBackendHintOnce() {
  if (ran || typeof import.meta === 'undefined' || !import.meta.env?.DEV) return
  ran = true
  fetch('/health', { method: 'GET' })
    .then((r) => {
      if (!r.ok) {
        console.warn('[Dev] GET /health:', r.status, '— проверьте, что API запущен на порту из vite proxy (обычно 3000).')
      }
    })
    .catch(() => {
      console.warn(
        '[Dev] Бэкенд не отвечает (Failed to fetch). Запустите в отдельном терминале: npm run server\n' +
          '   Или фронт и API вместе: npm run dev:all'
      )
    })
}

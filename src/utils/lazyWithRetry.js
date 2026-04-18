import { lazy } from 'react'

const CHUNK_RELOAD_KEY = 'syb_chunk_reload_once'

/**
 * Обёртка над React.lazy: при 404/сетевой ошибке чанка — повтор через короткую задержку,
 * затем одна принудительная перезагрузка вкладки (после деплоя подтянется свежий index.html).
 */
export function lazyWithRetry(importFn) {
  return lazy(async () => {
    const load = () => importFn()
    try {
      const m = await load()
      sessionStorage.removeItem(CHUNK_RELOAD_KEY)
      return m
    } catch {
      try {
        await new Promise((r) => setTimeout(r, 400))
        const m = await load()
        sessionStorage.removeItem(CHUNK_RELOAD_KEY)
        return m
      } catch (second) {
        if (sessionStorage.getItem(CHUNK_RELOAD_KEY) !== '1') {
          sessionStorage.setItem(CHUNK_RELOAD_KEY, '1')
          window.location.reload()
          return new Promise(() => {})
        }
        sessionStorage.removeItem(CHUNK_RELOAD_KEY)
        throw second
      }
    }
  })
}

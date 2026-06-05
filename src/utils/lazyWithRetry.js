import { lazy } from 'react'

const CHUNK_RELOAD_KEY_PREFIX = 'syb_chunk_reload_'

function chunkReloadKey(importFn, chunkId) {
  if (chunkId) return `${CHUNK_RELOAD_KEY_PREFIX}${chunkId}`
  const src = importFn.toString()
  let hash = 0
  for (let i = 0; i < src.length; i += 1) {
    hash = ((hash << 5) - hash + src.charCodeAt(i)) | 0
  }
  return `${CHUNK_RELOAD_KEY_PREFIX}${hash}`
}

/**
 * Обёртка над React.lazy: при 404/сетевой ошибке чанка — повтор через короткую задержку,
 * затем одна принудительная перезагрузка вкладки (после деплоя подтянется свежий index.html).
 * @param {() => Promise<{ default: React.ComponentType }>} importFn
 * @param {string} [chunkId] — уникальный id чанка (иначе хеш importFn)
 */
export function lazyWithRetry(importFn, chunkId) {
  const reloadKey = chunkReloadKey(importFn, chunkId)

  return lazy(async () => {
    const load = () => importFn()
    try {
      const m = await load()
      sessionStorage.removeItem(reloadKey)
      return m
    } catch {
      try {
        await new Promise((r) => setTimeout(r, 400))
        const m = await load()
        sessionStorage.removeItem(reloadKey)
        return m
      } catch (second) {
        if (sessionStorage.getItem(reloadKey) !== '1') {
          sessionStorage.setItem(reloadKey, '1')
          window.location.reload()
          return new Promise(() => {})
        }
        sessionStorage.removeItem(reloadKey)
        throw second
      }
    }
  })
}

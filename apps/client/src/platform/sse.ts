/**
 * Lightweight SSE helper for Expo (web EventSource; native polling fallback).
 * Use for auction bid updates without pulling in a heavy realtime stack yet.
 */
import { Platform } from 'react-native'
import { getApiBaseUrl } from '../api/client'

export type SseHandlers = {
  onMessage?: (data: unknown) => void
  onError?: (err: unknown) => void
}

export function subscribeAuctionUpdates(handlers: SseHandlers): () => void {
  const url = `${getApiBaseUrl()}/events/auction-updates`
  if (Platform.OS === 'web' && typeof EventSource !== 'undefined') {
    const es = new EventSource(url)
    es.onmessage = (ev) => {
      try {
        handlers.onMessage?.(JSON.parse(ev.data))
      } catch {
        handlers.onMessage?.(ev.data)
      }
    }
    es.onerror = (err) => handlers.onError?.(err)
    return () => es.close()
  }

  let stopped = false
  const tick = async () => {
    if (stopped) return
    try {
      // Native: short poll until native EventSource/SSE polyfill is added
      const res = await fetch(url, { headers: { Accept: 'text/event-stream' } })
      if (!res.ok) throw new Error(`SSE HTTP ${res.status}`)
    } catch (err) {
      handlers.onError?.(err)
    }
    if (!stopped) setTimeout(tick, 15000)
  }
  void tick()
  return () => {
    stopped = true
  }
}

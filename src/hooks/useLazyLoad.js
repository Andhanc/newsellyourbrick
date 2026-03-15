import { useEffect, useRef, useState, useCallback } from 'react'
import { useInView } from './useInView'

/**
 * Загружает данные только когда секция попадает во вьюпорт (ленивая загрузка).
 * Убирает лишние запросы при первом открытии страницы.
 * @param {() => Promise<void>} fetchFn - асинхронная функция загрузки (вызывается один раз при появлении в viewport)
 * @param {Object} options - { rootMargin: '200px', threshold: 0.01, runOnce: true }
 * @returns [sectionRef, { loaded, loading, error, reload }]
 */
export function useLazyLoad(fetchFn, options = {}) {
  const { rootMargin = '200px', threshold = 0.01, runOnce = true } = options
  const [sectionRef, isInView] = useInView({ rootMargin, threshold })
  const [state, setState] = useState({ loaded: false, loading: false, error: null })
  const hasRun = useRef(false)

  const run = useCallback(async () => {
    if (!fetchFn || (runOnce && hasRun.current)) return
    hasRun.current = true
    setState(s => ({ ...s, loading: true, error: null }))
    try {
      await fetchFn()
      setState(s => ({ ...s, loaded: true, loading: false, error: null }))
    } catch (err) {
      setState(s => ({ ...s, loading: false, error: err.message || err }))
      hasRun.current = false
    }
  }, [fetchFn, runOnce])

  useEffect(() => {
    if (isInView) run()
  }, [isInView, run])

  const reload = useCallback(() => {
    hasRun.current = false
    run()
  }, [run])

  return [sectionRef, { loaded: state.loaded, loading: state.loading, error: state.error, reload }]
}

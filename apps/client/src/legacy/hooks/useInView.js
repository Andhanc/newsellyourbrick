import { useEffect, useRef, useState } from 'react'
import { getMainScrollEl } from '@/utils/mainScroll'

/**
 * Элемент в зоне видимости (Intersection Observer).
 * @param {Object} options
 * @param {string} [options.rootMargin='200px']
 * @param {number|number[]} [options.threshold=0.01]
 * @param {boolean} [options.once=false] — после первого попадания во view остаётся true
 * @param {boolean} [options.useMainScrollRoot=false] — root = `.app-layout`
 * @returns {[import('react').RefObject<HTMLElement>, boolean]}
 */
export function useInView(options = {}) {
  const {
    rootMargin = '200px',
    threshold = 0.01,
    once = false,
    useMainScrollRoot = false,
  } = options
  const ref = useRef(null)
  const [isInView, setIsInView] = useState(false)
  const latchedRef = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const root = useMainScrollRoot ? getMainScrollEl() : null

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          latchedRef.current = true
          setIsInView(true)
          if (once) observer.disconnect()
          return
        }

        if (!once && !latchedRef.current) {
          setIsInView(false)
        }
      },
      { root, rootMargin, threshold },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [rootMargin, threshold, once, useMainScrollRoot])

  return [ref, isInView]
}
